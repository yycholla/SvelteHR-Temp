//! Rollback Operations Model

use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(schema_name = "hr_public", table_name = "rollback_operations")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: Uuid,
    pub snapshot_id: Uuid,
    pub sync_log_id: Option<Uuid>,
    pub rollback_type: String,
    pub status: String,
    pub affected_entities: i32,
    pub successful_rollbacks: i32,
    pub failed_rollbacks: i32,
    pub reason: String,
    pub triggered_by: Uuid,
    pub triggered_by_email: String,
    pub error_message: Option<String>,
    pub rollback_details: Option<Json>,
    pub validation_results: Option<Json>,
    pub started_at: Option<DateTimeWithTimeZone>,
    pub completed_at: Option<DateTimeWithTimeZone>,
    pub duration_ms: Option<i32>,
    pub created_at: DateTimeWithTimeZone,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::sync_snapshots::Entity",
        from = "Column::SnapshotId",
        to = "super::sync_snapshots::Column::Id"
    )]
    SyncSnapshot,
    #[sea_orm(
        belongs_to = "super::intuit_sync_log::Entity",
        from = "Column::SyncLogId",
        to = "super::intuit_sync_log::Column::Id"
    )]
    IntuitSyncLog,
}

impl Related<super::sync_snapshots::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::SyncSnapshot.def()
    }
}

impl Related<super::intuit_sync_log::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::IntuitSyncLog.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}

/// Rollback type enumeration
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum RollbackType {
    Full,
    Partial,
    SingleEntity,
}

impl RollbackType {
    pub fn as_str(&self) -> &str {
        match self {
            RollbackType::Full => "full",
            RollbackType::Partial => "partial",
            RollbackType::SingleEntity => "single_entity",
        }
    }
}

/// Rollback status enumeration
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum RollbackStatus {
    Pending,
    Validating,
    InProgress,
    Completed,
    Failed,
    Cancelled,
}

impl RollbackStatus {
    pub fn as_str(&self) -> &str {
        match self {
            RollbackStatus::Pending => "pending",
            RollbackStatus::Validating => "validating",
            RollbackStatus::InProgress => "in_progress",
            RollbackStatus::Completed => "completed",
            RollbackStatus::Failed => "failed",
            RollbackStatus::Cancelled => "cancelled",
        }
    }
}
