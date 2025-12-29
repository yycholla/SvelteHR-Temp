//! Compliance Reports Model
//!
//! Automated generation of compliance-ready reports for regulatory requirements

use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(schema_name = "hr_public", table_name = "compliance_reports")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: Uuid,
    pub report_type: String,
    pub period_start: DateTimeWithTimeZone,
    pub period_end: DateTimeWithTimeZone,
    pub generated_at: DateTimeWithTimeZone,
    pub generated_by: Uuid,
    pub report_data: Option<Json>,
    pub pdf_path: Option<String>,
    pub csv_path: Option<String>,
    pub status: String,
    pub findings: Option<Json>,
    pub error_message: Option<String>,
    pub created_at: DateTimeWithTimeZone,
    pub updated_at: DateTimeWithTimeZone,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "crate::models::user::Entity",
        from = "Column::GeneratedBy",
        to = "crate::models::user::Column::Id"
    )]
    GeneratedBy,
}

impl ActiveModelBehavior for ActiveModel {}

/// Compliance report type
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ComplianceReportType {
    Sox,           // Sarbanes-Oxley controls
    Gdpr,          // Data access and modifications
    Soc2,          // Security and availability controls
    DataChanges,   // All data modifications
    UserActivity,  // User actions summary
    AccessLog,     // Who accessed what, when
}

impl ComplianceReportType {
    pub fn as_str(&self) -> &str {
        match self {
            ComplianceReportType::Sox => "sox",
            ComplianceReportType::Gdpr => "gdpr",
            ComplianceReportType::Soc2 => "soc2",
            ComplianceReportType::DataChanges => "data_changes",
            ComplianceReportType::UserActivity => "user_activity",
            ComplianceReportType::AccessLog => "access_log",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s.to_lowercase().as_str() {
            "sox" => Some(ComplianceReportType::Sox),
            "gdpr" => Some(ComplianceReportType::Gdpr),
            "soc2" => Some(ComplianceReportType::Soc2),
            "data_changes" => Some(ComplianceReportType::DataChanges),
            "user_activity" => Some(ComplianceReportType::UserActivity),
            "access_log" => Some(ComplianceReportType::AccessLog),
            _ => None,
        }
    }
}

/// Report status
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ReportStatus {
    Pending,
    Generating,
    Completed,
    Failed,
}

impl ReportStatus {
    pub fn as_str(&self) -> &str {
        match self {
            ReportStatus::Pending => "pending",
            ReportStatus::Generating => "generating",
            ReportStatus::Completed => "completed",
            ReportStatus::Failed => "failed",
        }
    }
}
