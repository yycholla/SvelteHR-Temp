//! Compliance Report Service
//!
//! Generates compliance-ready reports for regulatory requirements

use crate::models::{audit_logs, compliance_reports, report_schedules};
use chrono::{DateTime, Utc};
use sea_orm::{
    ActiveModelTrait, ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter, QueryOrder, QuerySelect, Set,
};
use serde_json::json;
use std::sync::Arc;
use uuid::Uuid;

/// Compliance report service
pub struct ComplianceReportService {
    db: Arc<DatabaseConnection>,
}

/// Report generation result
#[derive(Debug, Clone)]
pub struct ReportGenerationResult {
    pub report_id: Uuid,
    pub total_records: usize,
    pub findings_count: usize,
    pub status: String,
}

impl ComplianceReportService {
    pub fn new(db: Arc<DatabaseConnection>) -> Self {
        Self { db }
    }

    /// Generate a SOX compliance report
    pub async fn generate_sox_report(
        &self,
        period_start: DateTime<Utc>,
        period_end: DateTime<Utc>,
        generated_by: Uuid,
    ) -> Result<ReportGenerationResult, Box<dyn std::error::Error>> {
        let report_id = Uuid::new_v4();

        // Create report record
        let report = compliance_reports::ActiveModel {
            id: Set(report_id),
            report_type: Set("sox".to_string()),
            period_start: Set(period_start.into()),
            period_end: Set(period_end.into()),
            generated_at: Set(Utc::now().into()),
            generated_by: Set(generated_by),
            report_data: Set(None),
            pdf_path: Set(None),
            csv_path: Set(None),
            status: Set("generating".to_string()),
            findings: Set(None),
            error_message: Set(None),
            created_at: Set(Utc::now().into()),
            updated_at: Set(Utc::now().into()),
        };

        let report_model = report.insert(&*self.db).await?;

        // Fetch relevant audit logs for SOX compliance
        let audit_logs = audit_logs::Entity::find()
            .filter(audit_logs::Column::CreatedAt.gte(period_start))
            .filter(audit_logs::Column::CreatedAt.lte(period_end))
            .filter(
                audit_logs::Column::EventCategory
                    .is_in(["data_change", "auth", "system"])
            )
            .order_by_asc(audit_logs::Column::CreatedAt)
            .all(&*self.db)
            .await?;

        // Analyze audit logs for findings
        let mut findings = Vec::new();
        for log in &audit_logs {
            // Check for unauthorized access attempts
            if log.status == "failed" && log.event_category == "auth" {
                findings.push(json!({
                    "type": "unauthorized_access_attempt",
                    "severity": "high",
                    "description": format!("Failed authentication attempt for {}", log.user_email.as_deref().unwrap_or("unknown")),
                    "timestamp": log.created_at,
                }));
            }

            // Check for critical data changes without proper tracking
            if log.event_category == "data_change" && log.old_values.is_none() {
                findings.push(json!({
                    "type": "incomplete_audit_trail",
                    "severity": "medium",
                    "description": "Data change recorded without old values",
                    "timestamp": log.created_at,
                }));
            }
        }

        // Build report data
        let report_data = json!({
            "period": {
                "start": period_start,
                "end": period_end,
            },
            "summary": {
                "total_events": audit_logs.len(),
                "auth_events": audit_logs.iter().filter(|l| l.event_category == "auth").count(),
                "data_changes": audit_logs.iter().filter(|l| l.event_category == "data_change").count(),
                "failed_attempts": audit_logs.iter().filter(|l| l.status == "failed").count(),
            },
            "compliance_status": if findings.is_empty() { "compliant" } else { "review_required" },
        });

        // Update report with results
        let mut active_report: compliance_reports::ActiveModel = report_model.into();
        active_report.status = Set("completed".to_string());
        active_report.report_data = Set(Some(report_data));
        active_report.findings = Set(Some(json!(findings)));
        active_report.updated_at = Set(Utc::now().into());
        active_report.update(&*self.db).await?;

        Ok(ReportGenerationResult {
            report_id,
            total_records: audit_logs.len(),
            findings_count: findings.len(),
            status: "completed".to_string(),
        })
    }

    /// Generate a GDPR compliance report
    pub async fn generate_gdpr_report(
        &self,
        period_start: DateTime<Utc>,
        period_end: DateTime<Utc>,
        generated_by: Uuid,
    ) -> Result<ReportGenerationResult, Box<dyn std::error::Error>> {
        let report_id = Uuid::new_v4();

        // Create report record
        let report = compliance_reports::ActiveModel {
            id: Set(report_id),
            report_type: Set("gdpr".to_string()),
            period_start: Set(period_start.into()),
            period_end: Set(period_end.into()),
            generated_at: Set(Utc::now().into()),
            generated_by: Set(generated_by),
            report_data: Set(None),
            pdf_path: Set(None),
            csv_path: Set(None),
            status: Set("generating".to_string()),
            findings: Set(None),
            error_message: Set(None),
            created_at: Set(Utc::now().into()),
            updated_at: Set(Utc::now().into()),
        };

        let report_model = report.insert(&*self.db).await?;

        // Fetch personal data access logs
        let audit_logs = audit_logs::Entity::find()
            .filter(audit_logs::Column::CreatedAt.gte(period_start))
            .filter(audit_logs::Column::CreatedAt.lte(period_end))
            .filter(
                audit_logs::Column::EntityType
                    .is_in(["employee", "user"])
            )
            .order_by_asc(audit_logs::Column::CreatedAt)
            .all(&*self.db)
            .await?;

        // Build report data
        let report_data = json!({
            "period": {
                "start": period_start,
                "end": period_end,
            },
            "summary": {
                "total_personal_data_access": audit_logs.len(),
                "read_operations": audit_logs.iter().filter(|l| l.action == "read").count(),
                "update_operations": audit_logs.iter().filter(|l| l.action == "update").count(),
                "delete_operations": audit_logs.iter().filter(|l| l.action == "delete").count(),
            },
            "compliance_status": "compliant",
        });

        // Update report
        let mut active_report: compliance_reports::ActiveModel = report_model.into();
        active_report.status = Set("completed".to_string());
        active_report.report_data = Set(Some(report_data));
        active_report.findings = Set(Some(json!([])));
        active_report.updated_at = Set(Utc::now().into());
        active_report.update(&*self.db).await?;

        Ok(ReportGenerationResult {
            report_id,
            total_records: audit_logs.len(),
            findings_count: 0,
            status: "completed".to_string(),
        })
    }

    /// Get a compliance report by ID
    pub async fn get_report(
        &self,
        report_id: Uuid,
    ) -> Result<Option<compliance_reports::Model>, sea_orm::DbErr> {
        compliance_reports::Entity::find_by_id(report_id)
            .one(&*self.db)
            .await
    }

    /// Get recent compliance reports
    pub async fn get_recent_reports(
        &self,
        report_type: Option<String>,
        limit: u64,
    ) -> Result<Vec<compliance_reports::Model>, sea_orm::DbErr> {
        let mut query = compliance_reports::Entity::find();

        if let Some(rt) = report_type {
            query = query.filter(compliance_reports::Column::ReportType.eq(rt));
        }

        query
            .order_by_desc(compliance_reports::Column::CreatedAt)
            .limit(limit)
            .all(&*self.db)
            .await
    }

    /// Create a report schedule
    pub async fn create_schedule(
        &self,
        report_type: String,
        schedule_cron: String,
        recipients: Vec<String>,
        created_by: Uuid,
    ) -> Result<Uuid, sea_orm::DbErr> {
        let schedule_id = Uuid::new_v4();

        let schedule = report_schedules::ActiveModel {
            id: Set(schedule_id),
            report_type: Set(report_type),
            schedule_cron: Set(schedule_cron),
            recipients: Set(recipients),
            enabled: Set(true),
            last_run_at: Set(None),
            next_run_at: Set(None),
            created_by: Set(created_by),
            created_at: Set(Utc::now().into()),
            updated_at: Set(Utc::now().into()),
        };

        schedule.insert(&*self.db).await?;
        Ok(schedule_id)
    }

    /// Get active report schedules
    pub async fn get_active_schedules(
        &self,
    ) -> Result<Vec<report_schedules::Model>, sea_orm::DbErr> {
        report_schedules::Entity::find()
            .filter(report_schedules::Column::Enabled.eq(true))
            .all(&*self.db)
            .await
    }
}
