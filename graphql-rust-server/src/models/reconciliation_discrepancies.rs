//! Reconciliation Discrepancies Model

use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(schema_name = "hr_public", table_name = "reconciliation_discrepancies")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: Uuid,
    pub report_id: Uuid,
    pub entity_type: String,
    pub entity_id: String,
    pub discrepancy_type: String,
    pub severity: String,
    pub field_name: Option<String>,
    pub local_value: Option<String>,
    pub remote_value: Option<String>,
    pub description: String,
    pub suggested_action: Option<String>,
    pub is_resolved: bool,
    pub resolved_at: Option<DateTimeWithTimeZone>,
    pub resolved_by: Option<Uuid>,
    pub resolution_notes: Option<String>,
    pub metadata: Option<Json>,
    pub created_at: DateTimeWithTimeZone,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::reconciliation_reports::Entity",
        from = "Column::ReportId",
        to = "super::reconciliation_reports::Column::Id"
    )]
    Report,
}

impl Related<super::reconciliation_reports::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Report.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}

/// Discrepancy type enumeration
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum DiscrepancyType {
    MissingInLocal,
    MissingInRemote,
    DataMismatch,
    IdMismatch,
    SyncConflict,
    OrphanedRecord,
}

impl DiscrepancyType {
    pub fn as_str(&self) -> &str {
        match self {
            DiscrepancyType::MissingInLocal => "missing_in_local",
            DiscrepancyType::MissingInRemote => "missing_in_remote",
            DiscrepancyType::DataMismatch => "data_mismatch",
            DiscrepancyType::IdMismatch => "id_mismatch",
            DiscrepancyType::SyncConflict => "sync_conflict",
            DiscrepancyType::OrphanedRecord => "orphaned_record",
        }
    }
}

/// Severity level enumeration
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Severity {
    Low,
    Medium,
    High,
    Critical,
}

impl Severity {
    pub fn as_str(&self) -> &str {
        match self {
            Severity::Low => "low",
            Severity::Medium => "medium",
            Severity::High => "high",
            Severity::Critical => "critical",
        }
    }
}
