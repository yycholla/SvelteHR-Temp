//! Reconciliation Reports Model

use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(schema_name = "hr_public", table_name = "reconciliation_reports")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: Uuid,
    pub entity_type: String,
    pub status: String,
    pub total_local: i32,
    pub total_remote: i32,
    pub total_matched: i32,
    pub total_discrepancies: i32,
    pub missing_in_local: i32,
    pub missing_in_remote: i32,
    pub data_mismatches: i32,
    pub triggered_by: Option<Uuid>,
    pub triggered_by_email: Option<String>,
    pub duration_ms: Option<i32>,
    pub error_message: Option<String>,
    pub summary: Option<Json>,
    pub metadata: Option<Json>,
    pub started_at: DateTimeWithTimeZone,
    pub completed_at: Option<DateTimeWithTimeZone>,
    pub created_at: DateTimeWithTimeZone,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(has_many = "super::reconciliation_discrepancies::Entity")]
    Discrepancies,
}

impl Related<super::reconciliation_discrepancies::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Discrepancies.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}

/// Report status enumeration
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ReportStatus {
    Running,
    Completed,
    Failed,
    Cancelled,
}

impl ReportStatus {
    pub fn as_str(&self) -> &str {
        match self {
            ReportStatus::Running => "running",
            ReportStatus::Completed => "completed",
            ReportStatus::Failed => "failed",
            ReportStatus::Cancelled => "cancelled",
        }
    }
}

/// Entity type for reconciliation
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ReconciliationEntityType {
    Employee,
    Department,
    All,
}

impl ReconciliationEntityType {
    pub fn as_str(&self) -> &str {
        match self {
            ReconciliationEntityType::Employee => "employee",
            ReconciliationEntityType::Department => "department",
            ReconciliationEntityType::All => "all",
        }
    }
}
