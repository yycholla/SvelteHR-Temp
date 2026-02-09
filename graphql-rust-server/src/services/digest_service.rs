//! Email Digest Service
//!
//! Generates and sends automated email summaries of sync activity, conflicts, and system health

use crate::models::{
    email_digest_log, email_digests, intuit_sync_log, reconciliation_reports,
    sync_health_metrics, user,
};
use crate::services::email_service::{EmailService, EmployeeInfo};
use anyhow::Result;
use chrono::{DateTime, Datelike, Duration, Utc};
use sea_orm::{
    ActiveModelTrait, ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter,
    QueryOrder, QuerySelect, Set,
};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::sync::Arc;
use uuid::Uuid;

/// Email digest service for automated summaries
pub struct DigestService {
    db: Arc<DatabaseConnection>,
    email_service: Option<Arc<EmailService>>,
}

/// Content included in digest email
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DigestContent {
    pub period_start: DateTime<Utc>,
    pub period_end: DateTime<Utc>,
    pub total_syncs: i32,
    pub successful_syncs: i32,
    pub failed_syncs: i32,
    pub conflicts_detected: i32,
    pub conflicts_resolved: i32,
    pub new_employees: Vec<EmployeeInfo>,
    pub updated_employees: Vec<EmployeeInfo>,
    pub data_quality_score: f64,
    pub uptime_percentage: f64,
    pub avg_sync_duration_ms: i32,
}

/// Digest generation result
#[derive(Debug, Clone)]
pub struct DigestResult {
    pub digest_id: Uuid,
    pub log_id: Uuid,
    pub recipients_count: usize,
    pub success: bool,
    pub error_message: Option<String>,
}

impl DigestService {
    pub fn new(db: Arc<DatabaseConnection>) -> Self {
        Self {
            db,
            email_service: None,
        }
    }

    pub fn with_email_service(db: Arc<DatabaseConnection>, email_service: Arc<EmailService>) -> Self {
        Self {
            db,
            email_service: Some(email_service),
        }
    }

    /// Generate digest content for a time period
    pub async fn generate_digest_content(
        &self,
        period_start: DateTime<Utc>,
        period_end: DateTime<Utc>,
        include_sync_summary: bool,
        include_conflicts: bool,
        include_health_metrics: bool,
        include_new_employees: bool,
    ) -> Result<DigestContent> {
        let mut content = DigestContent {
            period_start,
            period_end,
            total_syncs: 0,
            successful_syncs: 0,
            failed_syncs: 0,
            conflicts_detected: 0,
            conflicts_resolved: 0,
            new_employees: Vec::new(),
            updated_employees: Vec::new(),
            data_quality_score: 0.0,
            uptime_percentage: 0.0,
            avg_sync_duration_ms: 0,
        };

        // Fetch sync summary if requested
        if include_sync_summary {
            let sync_logs = intuit_sync_log::Entity::find()
                .filter(intuit_sync_log::Column::CreatedAt.gte(period_start))
                .filter(intuit_sync_log::Column::CreatedAt.lte(period_end))
                .all(&*self.db)
                .await?;

            content.total_syncs = sync_logs.len() as i32;
            content.successful_syncs = sync_logs.iter().filter(|s| s.status == "success").count() as i32;
            content.failed_syncs = sync_logs.iter().filter(|s| s.status == "failed").count() as i32;

            // Calculate average sync duration
            let total_duration: i64 = sync_logs
                .iter()
                .filter_map(|s| s.sync_duration_ms)
                .map(|d| d as i64)
                .sum();

            if !sync_logs.is_empty() {
                content.avg_sync_duration_ms = (total_duration / sync_logs.len() as i64) as i32;
            }
        }

        // Fetch conflict statistics if requested
        if include_conflicts {
            let conflict_reports = reconciliation_reports::Entity::find()
                .filter(reconciliation_reports::Column::StartedAt.gte(period_start))
                .filter(reconciliation_reports::Column::StartedAt.lte(period_end))
                .all(&*self.db)
                .await?;

            content.conflicts_detected = conflict_reports.iter().map(|r| r.total_discrepancies).sum();

            // Count resolved conflicts (those with completed status)
            content.conflicts_resolved = conflict_reports
                .iter()
                .filter(|r| r.status == "completed")
                .map(|r| r.total_discrepancies)
                .sum();
        }

        // Fetch health metrics if requested
        if include_health_metrics {
            let health_metrics = sync_health_metrics::Entity::find()
                .filter(sync_health_metrics::Column::RecordedAt.gte(period_start))
                .filter(sync_health_metrics::Column::RecordedAt.lte(period_end))
                .order_by_desc(sync_health_metrics::Column::RecordedAt)
                .one(&*self.db)
                .await?;

            if let Some(metrics) = health_metrics {
                // Use success_rate as a proxy for both uptime and data quality
                content.uptime_percentage = metrics.success_rate.unwrap_or(0.0) * 100.0;
                content.data_quality_score = metrics.success_rate.unwrap_or(0.0) * 100.0;
            }
        }

        // Fetch new employees if requested
        if include_new_employees {
            let new_users = user::Entity::find()
                .filter(user::Column::CreatedAt.gte(period_start))
                .filter(user::Column::CreatedAt.lte(period_end))
                .filter(user::Column::DeletedAt.is_null())
                .all(&*self.db)
                .await?;

            content.new_employees = new_users
                .iter()
                .map(|u| EmployeeInfo {
                    name: format!("{} {}", u.first_name, u.last_name),
                    email: u.email.clone(),
                })
                .collect();

            // Fetch updated employees (excluding new ones)
            let updated_users = user::Entity::find()
                .filter(user::Column::UpdatedAt.gte(period_start))
                .filter(user::Column::UpdatedAt.lte(period_end))
                .filter(user::Column::CreatedAt.lt(period_start))
                .filter(user::Column::DeletedAt.is_null())
                .all(&*self.db)
                .await?;

            content.updated_employees = updated_users
                .iter()
                .map(|u| EmployeeInfo {
                    name: format!("{} {}", u.first_name, u.last_name),
                    email: u.email.clone(),
                })
                .collect();
        }

        Ok(content)
    }

    /// Send digest email
    pub async fn send_digest(
        &self,
        digest_id: Uuid,
        digest_name: String,
        recipients: Vec<String>,
        content: DigestContent,
        include_sync_summary: bool,
        include_conflicts: bool,
        include_health_metrics: bool,
        include_new_employees: bool,
    ) -> Result<DigestResult> {
        let log_id = Uuid::new_v4();

        // Format period label
        let period_label = format!(
            "{} - {}",
            content.period_start.format("%b %d, %Y"),
            content.period_end.format("%b %d, %Y")
        );

        // Create email subject
        let subject = format!(
            "{} - {} Digest",
            digest_name,
            period_label
        );

        let (success, error_message) = if let Some(email_service) = &self.email_service {
            // Create email data
            let email_data = email_service.create_email_data(
                digest_name.clone(),
                period_label,
                include_sync_summary,
                content.total_syncs,
                content.successful_syncs,
                content.failed_syncs,
                include_conflicts,
                content.conflicts_detected,
                content.conflicts_resolved,
                include_health_metrics,
                content.uptime_percentage,
                content.data_quality_score,
                include_new_employees,
                content.new_employees.len() as i32,
                content.updated_employees.len() as i32,
                content.new_employees.clone(),
            );

            // Send the email
            match email_service.send_digest(recipients.clone(), subject, email_data).await {
                Ok(send_result) => {
                    if send_result.failed_count == 0 {
                        tracing::info!(
                            "Successfully sent digest to {} recipients",
                            send_result.sent_count
                        );
                        (true, None)
                    } else {
                        let err_msg = format!(
                            "Failed to send to {} recipients: {}",
                            send_result.failed_count,
                            send_result.errors.join(", ")
                        );
                        tracing::warn!(
                            "Partial delivery: {} succeeded, {} failed",
                            send_result.sent_count,
                            send_result.failed_count
                        );
                        (false, Some(err_msg))
                    }
                }
                Err(e) => {
                    tracing::error!("Failed to send digest email: {}", e);
                    (false, Some(format!("Email sending failed: {}", e)))
                }
            }
        } else {
            // Email service not configured - log as warning
            tracing::warn!(
                "Email service not configured. Digest prepared but not sent to {} recipients",
                recipients.len()
            );
            (false, Some("Email service not configured".to_string()))
        };

        // Create digest log entry
        let log_entry = email_digest_log::ActiveModel {
            id: Set(log_id),
            digest_id: Set(digest_id),
            sent_at: Set(Utc::now().into()),
            recipients: Set(recipients.clone()),
            success: Set(success),
            error_message: Set(error_message.clone()),
            period_start: Set(Some(content.period_start.into())),
            period_end: Set(Some(content.period_end.into())),
            content_summary: Set(Some(json!({
                "total_syncs": content.total_syncs,
                "successful_syncs": content.successful_syncs,
                "failed_syncs": content.failed_syncs,
                "conflicts_detected": content.conflicts_detected,
                "conflicts_resolved": content.conflicts_resolved,
                "new_employees": content.new_employees.len(),
                "updated_employees": content.updated_employees.len(),
                "data_quality_score": content.data_quality_score,
            }))),
        };

        log_entry.insert(&*self.db).await?;

        // Update digest's last_sent_at timestamp if successful
        if success {
            if let Some(digest) = email_digests::Entity::find_by_id(digest_id)
                .one(&*self.db)
                .await?
            {
                let mut active_digest: email_digests::ActiveModel = digest.into();
                active_digest.last_sent_at = Set(Some(Utc::now().into()));
                active_digest.updated_at = Set(Utc::now().into());
                active_digest.update(&*self.db).await?;
            }
        }

        Ok(DigestResult {
            digest_id,
            log_id,
            recipients_count: recipients.len(),
            success,
            error_message,
        })
    }

    /// Get digest configuration by ID
    pub async fn get_digest(
        &self,
        digest_id: Uuid,
    ) -> Result<Option<email_digests::Model>> {
        Ok(email_digests::Entity::find_by_id(digest_id)
            .one(&*self.db)
            .await?)
    }

    /// Get all active digests
    pub async fn get_active_digests(&self) -> Result<Vec<email_digests::Model>> {
        Ok(email_digests::Entity::find()
            .filter(email_digests::Column::Enabled.eq(true))
            .order_by_asc(email_digests::Column::Name)
            .all(&*self.db)
            .await?)
    }

    /// Get digests that are due to be sent
    pub async fn get_pending_digests(&self) -> Result<Vec<email_digests::Model>> {
        let now = Utc::now();

        Ok(email_digests::Entity::find()
            .filter(email_digests::Column::Enabled.eq(true))
            .filter(
                email_digests::Column::NextSendAt
                    .lte(now)
                    .or(email_digests::Column::NextSendAt.is_null())
            )
            .all(&*self.db)
            .await?)
    }

    /// Get delivery logs for a digest
    pub async fn get_digest_logs(
        &self,
        digest_id: Uuid,
        limit: u64,
    ) -> Result<Vec<email_digest_log::Model>> {
        Ok(email_digest_log::Entity::find()
            .filter(email_digest_log::Column::DigestId.eq(digest_id))
            .order_by_desc(email_digest_log::Column::SentAt)
            .limit(limit)
            .all(&*self.db)
            .await?)
    }

    /// Calculate next send time based on cron schedule
    /// This is a placeholder - in production, use a cron parsing library
    pub fn calculate_next_send_time(
        &self,
        cron_expression: &str,
        after: DateTime<Utc>,
    ) -> Option<DateTime<Utc>> {
        // TODO: Implement proper cron parsing
        // For now, simple heuristics:
        match cron_expression {
            "0 9 * * *" => {
                // Daily at 9 AM - next occurrence
                let mut next = after.date_naive().and_hms_opt(9, 0, 0)?;
                if after.time() >= chrono::NaiveTime::from_hms_opt(9, 0, 0)? {
                    next = (after + Duration::days(1)).date_naive().and_hms_opt(9, 0, 0)?;
                }
                Some(DateTime::from_naive_utc_and_offset(next, Utc))
            }
            "0 9 * * 1" => {
                // Weekly Monday at 9 AM
                let current_day = after.weekday().num_days_from_monday();
                let days_until_monday = if current_day == 0 {
                    // It's Monday - check if before or after 9 AM
                    if after.time() < chrono::NaiveTime::from_hms_opt(9, 0, 0)? {
                        0 // Today at 9 AM
                    } else {
                        7 // Next Monday
                    }
                } else {
                    // Days until next Monday
                    7 - current_day
                };
                let next_monday = after + Duration::days(days_until_monday as i64);
                let next = next_monday.date_naive().and_hms_opt(9, 0, 0)?;
                Some(DateTime::from_naive_utc_and_offset(next, Utc))
            }
            "0 9 1 * *" => {
                // Monthly on 1st at 9 AM
                let next_month = if after.day() >= 1 {
                    (after + Duration::days(32)).date_naive()
                        .with_day(1)?
                } else {
                    after.date_naive().with_day(1)?
                };
                let next = next_month.and_hms_opt(9, 0, 0)?;
                Some(DateTime::from_naive_utc_and_offset(next, Utc))
            }
            _ => None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::{TimeZone, Timelike};
    use crate::testing::TestContext;

    #[tokio::test]
    async fn test_calculate_next_send_time_daily() {
        let ctx = TestContext::new().await.expect("Failed to create test context");
        let service = DigestService::new(Arc::new(ctx.connection().clone()));

        // Test daily cron at 9 AM
        let cron = "0 9 * * *";

        // If current time is before 9 AM, next send should be today at 9 AM
        let now = Utc.with_ymd_and_hms(2025, 1, 15, 8, 0, 0).unwrap();
        let next = service.calculate_next_send_time(cron, now);
        assert!(next.is_some());
        let next_time = next.unwrap();
        assert_eq!(next_time.hour(), 9);
        assert_eq!(next_time.day(), 15);

        // If current time is after 9 AM, next send should be tomorrow at 9 AM
        let now = Utc.with_ymd_and_hms(2025, 1, 15, 10, 0, 0).unwrap();
        let next = service.calculate_next_send_time(cron, now);
        assert!(next.is_some());
        let next_time = next.unwrap();
        assert_eq!(next_time.hour(), 9);
        assert_eq!(next_time.day(), 16);
    }

    #[tokio::test]
    async fn test_calculate_next_send_time_weekly() {
        let ctx = TestContext::new().await.expect("Failed to create test context");
        let service = DigestService::new(Arc::new(ctx.connection().clone()));

        // Test weekly Monday at 9 AM
        let cron = "0 9 * * 1";

        // From Friday, next Monday
        let now = Utc.with_ymd_and_hms(2025, 1, 17, 10, 0, 0).unwrap(); // Friday
        let next = service.calculate_next_send_time(cron, now);
        assert!(next.is_some());
        let next_time = next.unwrap();
        assert_eq!(next_time.weekday(), chrono::Weekday::Mon);
        assert_eq!(next_time.hour(), 9);
    }

    #[tokio::test]
    async fn test_calculate_next_send_time_monthly() {
        let ctx = TestContext::new().await.expect("Failed to create test context");
        let service = DigestService::new(Arc::new(ctx.connection().clone()));

        // Test monthly on 1st at 9 AM
        let cron = "0 9 1 * *";

        // From mid-month, next occurrence should be next month
        let now = Utc.with_ymd_and_hms(2025, 1, 15, 10, 0, 0).unwrap();
        let next = service.calculate_next_send_time(cron, now);
        assert!(next.is_some());
        let next_time = next.unwrap();
        assert_eq!(next_time.day(), 1);
        assert_eq!(next_time.month(), 2); // February
        assert_eq!(next_time.hour(), 9);
    }

    #[tokio::test]
    async fn test_calculate_next_send_time_invalid_cron() {
        let ctx = TestContext::new().await.expect("Failed to create test context");
        let service = DigestService::new(Arc::new(ctx.connection().clone()));

        // Test invalid/unknown cron expression
        let cron = "invalid";
        let now = Utc::now();
        let next = service.calculate_next_send_time(cron, now);
        assert!(next.is_none());
    }

    #[tokio::test]
    async fn test_digest_content_structure() {
        // This test verifies the structure of DigestContent
        let content = DigestContent {
            period_start: Utc::now() - Duration::days(7),
            period_end: Utc::now(),
            total_syncs: 10,
            successful_syncs: 8,
            failed_syncs: 2,
            conflicts_detected: 5,
            conflicts_resolved: 3,
            new_employees: vec![
                EmployeeInfo {
                    name: "John Doe".to_string(),
                    email: "john@example.com".to_string(),
                },
            ],
            updated_employees: vec![],
            data_quality_score: 95.5,
            uptime_percentage: 99.9,
            avg_sync_duration_ms: 1500,
        };

        assert_eq!(content.total_syncs, 10);
        assert_eq!(content.successful_syncs, 8);
        assert_eq!(content.failed_syncs, 2);
        assert_eq!(content.conflicts_detected, 5);
        assert_eq!(content.conflicts_resolved, 3);
        assert_eq!(content.new_employees.len(), 1);
        assert_eq!(content.new_employees[0].name, "John Doe");
        assert_eq!(content.data_quality_score, 95.5);
        assert_eq!(content.uptime_percentage, 99.9);
        assert_eq!(content.avg_sync_duration_ms, 1500);
    }

    #[tokio::test]
    async fn test_digest_result_structure() {
        // Test DigestResult structure
        let result = DigestResult {
            digest_id: Uuid::new_v4(),
            log_id: Uuid::new_v4(),
            recipients_count: 5,
            success: true,
            error_message: None,
        };

        assert_eq!(result.recipients_count, 5);
        assert!(result.success);
        assert!(result.error_message.is_none());

        // Test with error
        let error_result = DigestResult {
            digest_id: Uuid::new_v4(),
            log_id: Uuid::new_v4(),
            recipients_count: 5,
            success: false,
            error_message: Some("SMTP connection failed".to_string()),
        };

        assert_eq!(error_result.recipients_count, 5);
        assert!(!error_result.success);
        assert!(error_result.error_message.is_some());
        assert_eq!(
            error_result.error_message.unwrap(),
            "SMTP connection failed"
        );
    }
}
