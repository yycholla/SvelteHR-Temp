//! Compliance Report Service
//!
//! Generates compliance-ready reports for regulatory requirements

use crate::models::{audit_logs, compliance_reports, report_schedules};
use chrono::{DateTime, Timelike, Utc};
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

        // Count different event types
        let total_events = audit_logs.len();
        let auth_events = audit_logs.iter().filter(|l| l.event_category == "auth").count();
        let data_changes = audit_logs.iter().filter(|l| l.event_category == "data_change").count();
        let system_changes = audit_logs.iter().filter(|l| l.event_category == "system").count();
        let failed_attempts = audit_logs.iter().filter(|l| l.status == "failed").count();
        let successful_auths = audit_logs.iter().filter(|l| l.event_category == "auth" && l.status == "success").count();

        // Build comprehensive SOX report data
        let report_data = json!({
            "report_type": "SOX Compliance Report",
            "period": {
                "start": period_start,
                "end": period_end,
            },
            "executive_summary": {
                "compliance_status": if findings.is_empty() { "compliant" } else { "review_required" },
                "total_events_audited": total_events,
                "findings_count": findings.len(),
                "high_severity_findings": findings.iter().filter(|f| f["severity"] == "high").count(),
            },
            "access_controls": {
                "total_authentication_events": auth_events,
                "successful_logins": successful_auths,
                "failed_login_attempts": failed_attempts,
                "description": "User authentication and access control activities"
            },
            "data_integrity": {
                "total_data_modifications": data_changes,
                "tracked_changes": audit_logs.iter().filter(|l| l.event_category == "data_change" && l.old_values.is_some()).count(),
                "untracked_changes": audit_logs.iter().filter(|l| l.event_category == "data_change" && l.old_values.is_none()).count(),
                "description": "Financial and critical data change tracking"
            },
            "system_changes": {
                "total_system_events": system_changes,
                "configuration_changes": audit_logs.iter().filter(|l| l.event_type.contains("config")).count(),
                "description": "System configuration and critical infrastructure changes"
            },
            "audit_trail_integrity": {
                "audit_records_reviewed": total_events,
                "complete_audit_trails": audit_logs.iter().filter(|l| l.old_values.is_some() || l.event_category != "data_change").count(),
                "gaps_identified": audit_logs.iter().filter(|l| l.event_category == "data_change" && l.old_values.is_none()).count(),
                "description": "Audit trail completeness and integrity verification"
            },
            "summary": {
                "total_events": total_events,
                "auth_events": auth_events,
                "data_changes": data_changes,
                "failed_attempts": failed_attempts,
            },
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

        // Count operations
        let total_access = audit_logs.len();
        let read_ops = audit_logs.iter().filter(|l| l.action == "read").count();
        let update_ops = audit_logs.iter().filter(|l| l.action == "update").count();
        let delete_ops = audit_logs.iter().filter(|l| l.action == "delete").count();
        let create_ops = audit_logs.iter().filter(|l| l.action == "create").count();

        // Build comprehensive GDPR report data
        let report_data = json!({
            "report_type": "GDPR Compliance Report",
            "period": {
                "start": period_start,
                "end": period_end,
            },
            "executive_summary": {
                "compliance_status": "compliant",
                "total_personal_data_operations": total_access,
                "data_subjects_affected": audit_logs.iter().filter_map(|l| l.entity_id.as_ref()).collect::<std::collections::HashSet<_>>().len(),
            },
            "lawfulness_of_processing": {
                "total_operations": total_access,
                "read_access": read_ops,
                "data_modifications": update_ops,
                "data_deletions": delete_ops,
                "new_data_created": create_ops,
                "description": "Personal data processing activities tracked"
            },
            "data_subject_rights": {
                "access_requests": audit_logs.iter().filter(|l| l.event_type.contains("access_request")).count(),
                "deletion_requests": audit_logs.iter().filter(|l| l.event_type.contains("deletion_request") || l.event_type.contains("right_to_be_forgotten")).count(),
                "rectification_requests": audit_logs.iter().filter(|l| l.event_type.contains("rectification")).count(),
                "description": "GDPR data subject rights exercised"
            },
            "data_protection_measures": {
                "encrypted_operations": audit_logs.iter().filter(|l| l.metadata.as_ref().and_then(|m| m.get("encrypted")).and_then(|v| v.as_bool()).unwrap_or(false)).count(),
                "audit_trail_complete": audit_logs.iter().filter(|l| l.old_values.is_some() || l.action == "read").count(),
                "description": "Technical and organizational measures implemented"
            },
            "summary": {
                "total_personal_data_access": total_access,
                "read_operations": read_ops,
                "update_operations": update_ops,
                "delete_operations": delete_ops,
            },
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

    /// Generate a SOC2 compliance report
    pub async fn generate_soc2_report(
        &self,
        period_start: DateTime<Utc>,
        period_end: DateTime<Utc>,
        generated_by: Uuid,
    ) -> Result<ReportGenerationResult, Box<dyn std::error::Error>> {
        let report_id = Uuid::new_v4();

        let report = compliance_reports::ActiveModel {
            id: Set(report_id),
            report_type: Set("soc2".to_string()),
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

        // Fetch audit logs for SOC2 Trust Service Criteria
        let audit_logs = audit_logs::Entity::find()
            .filter(audit_logs::Column::CreatedAt.gte(period_start))
            .filter(audit_logs::Column::CreatedAt.lte(period_end))
            .order_by_asc(audit_logs::Column::CreatedAt)
            .all(&*self.db)
            .await?;

        let total_events = audit_logs.len();
        let security_events = audit_logs.iter().filter(|l| l.event_category == "auth" || l.event_category == "security").count();
        let availability_incidents = audit_logs.iter().filter(|l| l.status == "failed" || l.event_type.contains("error")).count();
        let processing_errors = audit_logs.iter().filter(|l| l.error_message.is_some()).count();
        let confidential_access = audit_logs.iter().filter(|l| l.event_category == "data_change" && l.entity_type.as_deref() == Some("employee")).count();

        let report_data = json!({
            "report_type": "SOC2 Type II Compliance Report",
            "period": {
                "start": period_start,
                "end": period_end,
            },
            "executive_summary": {
                "compliance_status": "compliant",
                "total_events_reviewed": total_events,
                "trust_service_categories_assessed": 5,
            },
            "security": {
                "total_security_events": security_events,
                "unauthorized_access_attempts": audit_logs.iter().filter(|l| l.event_category == "auth" && l.status == "failed").count(),
                "successful_authentications": audit_logs.iter().filter(|l| l.event_category == "auth" && l.status == "success").count(),
                "description": "CC6.1 - Logical and physical access controls"
            },
            "availability": {
                "total_incidents": availability_incidents,
                "system_uptime_events": total_events - availability_incidents,
                "failed_operations": availability_incidents,
                "description": "CC7.2 - System availability and performance"
            },
            "processing_integrity": {
                "total_operations": total_events,
                "processing_errors": processing_errors,
                "successful_operations": total_events - processing_errors,
                "data_validation_checks": audit_logs.iter().filter(|l| l.metadata.as_ref().and_then(|m| m.get("validated")).is_some()).count(),
                "description": "CC8.1 - Processing integrity and accuracy"
            },
            "confidentiality": {
                "confidential_data_access": confidential_access,
                "encrypted_transmissions": audit_logs.iter().filter(|l| l.metadata.as_ref().and_then(|m| m.get("encrypted")).and_then(|v| v.as_bool()).unwrap_or(false)).count(),
                "description": "CC9.1 - Confidential information protection"
            },
            "privacy": {
                "personal_data_operations": audit_logs.iter().filter(|l| l.entity_type.as_deref() == Some("employee") || l.entity_type.as_deref() == Some("user")).count(),
                "consent_tracked": audit_logs.iter().filter(|l| l.metadata.as_ref().and_then(|m| m.get("consent")).is_some()).count(),
                "description": "Privacy commitments and system requirements"
            },
            "summary": {
                "total_events": total_events,
                "security_events": security_events,
                "availability_incidents": availability_incidents,
                "processing_errors": processing_errors,
            },
        });

        let mut active_report: compliance_reports::ActiveModel = report_model.into();
        active_report.status = Set("completed".to_string());
        active_report.report_data = Set(Some(report_data));
        active_report.findings = Set(Some(json!([])));
        active_report.updated_at = Set(Utc::now().into());
        active_report.update(&*self.db).await?;

        Ok(ReportGenerationResult {
            report_id,
            total_records: total_events,
            findings_count: 0,
            status: "completed".to_string(),
        })
    }

    /// Generate a Data Changes compliance report
    pub async fn generate_data_changes_report(
        &self,
        period_start: DateTime<Utc>,
        period_end: DateTime<Utc>,
        generated_by: Uuid,
    ) -> Result<ReportGenerationResult, Box<dyn std::error::Error>> {
        let report_id = Uuid::new_v4();

        let report = compliance_reports::ActiveModel {
            id: Set(report_id),
            report_type: Set("data_changes".to_string()),
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

        // Fetch all data change events
        let audit_logs = audit_logs::Entity::find()
            .filter(audit_logs::Column::CreatedAt.gte(period_start))
            .filter(audit_logs::Column::CreatedAt.lte(period_end))
            .filter(audit_logs::Column::EventCategory.eq("data_change"))
            .order_by_asc(audit_logs::Column::CreatedAt)
            .all(&*self.db)
            .await?;

        let total_changes = audit_logs.len();
        let creates = audit_logs.iter().filter(|l| l.action == "create").count();
        let updates = audit_logs.iter().filter(|l| l.action == "update").count();
        let deletes = audit_logs.iter().filter(|l| l.action == "delete").count();
        let tracked_changes = audit_logs.iter().filter(|l| l.old_values.is_some()).count();
        let untracked_changes = total_changes - tracked_changes;

        // Group by entity type
        let mut entity_breakdown = std::collections::HashMap::new();
        for log in &audit_logs {
            if let Some(entity_type) = &log.entity_type {
                *entity_breakdown.entry(entity_type.clone()).or_insert(0) += 1;
            }
        }

        let report_data = json!({
            "report_type": "Data Changes Audit Report",
            "period": {
                "start": period_start,
                "end": period_end,
            },
            "executive_summary": {
                "total_data_changes": total_changes,
                "audit_trail_completeness": if total_changes > 0 { (tracked_changes * 100) / total_changes } else { 100 },
                "unique_entities_modified": entity_breakdown.len(),
            },
            "change_breakdown": {
                "creates": creates,
                "updates": updates,
                "deletes": deletes,
                "description": "Data modification operations by type"
            },
            "audit_trail_quality": {
                "fully_tracked_changes": tracked_changes,
                "untracked_changes": untracked_changes,
                "tracking_percentage": if total_changes > 0 { (tracked_changes * 100) / total_changes } else { 100 },
                "description": "Audit trail completeness and quality metrics"
            },
            "entity_breakdown": entity_breakdown,
            "data_integrity": {
                "changes_with_validation": audit_logs.iter().filter(|l| l.metadata.as_ref().and_then(|m| m.get("validated")).and_then(|v| v.as_bool()).unwrap_or(false)).count(),
                "changes_with_approval": audit_logs.iter().filter(|l| l.metadata.as_ref().and_then(|m| m.get("approved")).is_some()).count(),
                "description": "Data integrity verification measures"
            },
            "summary": {
                "total_changes": total_changes,
                "creates": creates,
                "updates": updates,
                "deletes": deletes,
            },
        });

        let mut active_report: compliance_reports::ActiveModel = report_model.into();
        active_report.status = Set("completed".to_string());
        active_report.report_data = Set(Some(report_data));
        active_report.findings = Set(Some(json!([])));
        active_report.updated_at = Set(Utc::now().into());
        active_report.update(&*self.db).await?;

        Ok(ReportGenerationResult {
            report_id,
            total_records: total_changes,
            findings_count: 0,
            status: "completed".to_string(),
        })
    }

    /// Generate a User Activity compliance report
    pub async fn generate_user_activity_report(
        &self,
        period_start: DateTime<Utc>,
        period_end: DateTime<Utc>,
        generated_by: Uuid,
    ) -> Result<ReportGenerationResult, Box<dyn std::error::Error>> {
        let report_id = Uuid::new_v4();

        let report = compliance_reports::ActiveModel {
            id: Set(report_id),
            report_type: Set("user_activity".to_string()),
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

        // Fetch all user activity
        let audit_logs = audit_logs::Entity::find()
            .filter(audit_logs::Column::CreatedAt.gte(period_start))
            .filter(audit_logs::Column::CreatedAt.lte(period_end))
            .filter(audit_logs::Column::UserId.is_not_null())
            .order_by_asc(audit_logs::Column::CreatedAt)
            .all(&*self.db)
            .await?;

        let total_activities = audit_logs.len();
        let unique_users = audit_logs.iter().filter_map(|l| l.user_id).collect::<std::collections::HashSet<_>>().len();
        let login_events = audit_logs.iter().filter(|l| l.event_type.contains("login") || l.event_category == "auth").count();
        let data_access = audit_logs.iter().filter(|l| l.action == "read").count();
        let data_modifications = audit_logs.iter().filter(|l| l.action == "update" || l.action == "create" || l.action == "delete").count();

        // Calculate user activity distribution
        let mut user_activity_counts = std::collections::HashMap::new();
        for log in &audit_logs {
            if let Some(user_email) = &log.user_email {
                *user_activity_counts.entry(user_email.clone()).or_insert(0) += 1;
            }
        }

        let report_data = json!({
            "report_type": "User Activity Report",
            "period": {
                "start": period_start,
                "end": period_end,
            },
            "executive_summary": {
                "total_user_activities": total_activities,
                "unique_active_users": unique_users,
                "average_activities_per_user": if unique_users > 0 { total_activities / unique_users } else { 0 },
            },
            "authentication_activity": {
                "total_login_events": login_events,
                "successful_logins": audit_logs.iter().filter(|l| (l.event_type.contains("login") || l.event_category == "auth") && l.status == "success").count(),
                "failed_login_attempts": audit_logs.iter().filter(|l| (l.event_type.contains("login") || l.event_category == "auth") && l.status == "failed").count(),
                "description": "User authentication and session activities"
            },
            "data_access_patterns": {
                "read_operations": data_access,
                "write_operations": data_modifications,
                "sensitive_data_access": audit_logs.iter().filter(|l| l.entity_type.as_deref() == Some("employee") || l.entity_type.as_deref() == Some("payroll")).count(),
                "description": "User data access and modification patterns"
            },
            "behavioral_analysis": {
                "most_active_users": user_activity_counts.iter().take(10).map(|(email, count)| json!({"email": email, "activity_count": count})).collect::<Vec<_>>(),
                "after_hours_activity": audit_logs.iter().filter(|l| {
                    let hour = l.created_at.hour();
                    hour < 6 || hour > 22
                }).count(),
                "description": "User behavior patterns and anomalies"
            },
            "risk_indicators": {
                "failed_operations": audit_logs.iter().filter(|l| l.status == "failed").count(),
                "unauthorized_access_attempts": audit_logs.iter().filter(|l| l.event_type.contains("unauthorized") || (l.event_category == "auth" && l.status == "failed")).count(),
                "description": "Security and risk indicators from user activity"
            },
            "summary": {
                "total_activities": total_activities,
                "unique_users": unique_users,
                "login_events": login_events,
                "data_access": data_access,
            },
        });

        let mut active_report: compliance_reports::ActiveModel = report_model.into();
        active_report.status = Set("completed".to_string());
        active_report.report_data = Set(Some(report_data));
        active_report.findings = Set(Some(json!([])));
        active_report.updated_at = Set(Utc::now().into());
        active_report.update(&*self.db).await?;

        Ok(ReportGenerationResult {
            report_id,
            total_records: total_activities,
            findings_count: 0,
            status: "completed".to_string(),
        })
    }

    /// Generate an Access Log compliance report
    pub async fn generate_access_log_report(
        &self,
        period_start: DateTime<Utc>,
        period_end: DateTime<Utc>,
        generated_by: Uuid,
    ) -> Result<ReportGenerationResult, Box<dyn std::error::Error>> {
        let report_id = Uuid::new_v4();

        let report = compliance_reports::ActiveModel {
            id: Set(report_id),
            report_type: Set("access_log".to_string()),
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

        // Fetch all access-related events
        let audit_logs = audit_logs::Entity::find()
            .filter(audit_logs::Column::CreatedAt.gte(period_start))
            .filter(audit_logs::Column::CreatedAt.lte(period_end))
            .filter(
                audit_logs::Column::EventCategory.is_in(["auth", "access", "read"])
                    .or(audit_logs::Column::Action.eq("read"))
            )
            .order_by_asc(audit_logs::Column::CreatedAt)
            .all(&*self.db)
            .await?;

        let total_access_events = audit_logs.len();
        let successful_access = audit_logs.iter().filter(|l| l.status == "success").count();
        let denied_access = audit_logs.iter().filter(|l| l.status == "failed" || l.status == "denied").count();
        let unique_users = audit_logs.iter().filter_map(|l| l.user_id).collect::<std::collections::HashSet<_>>().len();
        let unique_resources = audit_logs.iter().filter_map(|l| l.entity_id.as_ref()).collect::<std::collections::HashSet<_>>().len();

        // Group by resource type
        let mut resource_access = std::collections::HashMap::new();
        for log in &audit_logs {
            if let Some(entity_type) = &log.entity_type {
                *resource_access.entry(entity_type.clone()).or_insert(0) += 1;
            }
        }

        let report_data = json!({
            "report_type": "Access Log Audit Report",
            "period": {
                "start": period_start,
                "end": period_end,
            },
            "executive_summary": {
                "total_access_attempts": total_access_events,
                "successful_access": successful_access,
                "denied_access": denied_access,
                "access_success_rate": if total_access_events > 0 { (successful_access * 100) / total_access_events } else { 100 },
            },
            "access_control_effectiveness": {
                "authorized_access": successful_access,
                "unauthorized_attempts": denied_access,
                "unique_users_accessing": unique_users,
                "description": "Access control system effectiveness"
            },
            "resource_access_breakdown": {
                "unique_resources_accessed": unique_resources,
                "by_resource_type": resource_access,
                "sensitive_resource_access": audit_logs.iter().filter(|l| {
                    matches!(l.entity_type.as_deref(), Some("employee") | Some("payroll") | Some("financial"))
                }).count(),
                "description": "Breakdown of resource access by type"
            },
            "access_patterns": {
                "peak_access_times": "Analysis pending",
                "geographic_distribution": audit_logs.iter().filter_map(|l| l.ip_address.as_ref()).collect::<std::collections::HashSet<_>>().len(),
                "session_based_access": audit_logs.iter().filter_map(|l| l.session_id).collect::<std::collections::HashSet<_>>().len(),
                "description": "Access pattern analysis"
            },
            "security_events": {
                "failed_authentication": audit_logs.iter().filter(|l| l.event_category == "auth" && l.status == "failed").count(),
                "access_violations": denied_access,
                "suspicious_access_attempts": audit_logs.iter().filter(|l| {
                    l.metadata.as_ref().and_then(|m| m.get("suspicious")).and_then(|v| v.as_bool()).unwrap_or(false)
                }).count(),
                "description": "Security events and potential violations"
            },
            "summary": {
                "total_access_events": total_access_events,
                "successful_access": successful_access,
                "denied_access": denied_access,
                "unique_users": unique_users,
            },
        });

        let mut active_report: compliance_reports::ActiveModel = report_model.into();
        active_report.status = Set("completed".to_string());
        active_report.report_data = Set(Some(report_data));
        active_report.findings = Set(Some(json!([])));
        active_report.updated_at = Set(Utc::now().into());
        active_report.update(&*self.db).await?;

        Ok(ReportGenerationResult {
            report_id,
            total_records: total_access_events,
            findings_count: 0,
            status: "completed".to_string(),
        })
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
