//! Sync Snapshots Model

use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(schema_name = "hr_public", table_name = "sync_snapshots")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: Uuid,
    pub sync_log_id: Option<Uuid>,
    pub entity_type: String,
    pub entity_id: Uuid,
    pub operation_type: String,
    pub snapshot_type: String,
    pub data_snapshot: Json,
    pub related_snapshots: Option<Json>,
    pub quickbooks_id: Option<String>,
    pub can_rollback: bool,
    pub rollback_reason: Option<String>,
    pub expires_at: Option<DateTimeWithTimeZone>,
    pub metadata: Option<Json>,
    pub created_at: DateTimeWithTimeZone,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::intuit_sync_log::Entity",
        from = "Column::SyncLogId",
        to = "super::intuit_sync_log::Column::Id"
    )]
    IntuitSyncLog,
}

impl Related<super::intuit_sync_log::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::IntuitSyncLog.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}

/// Snapshot operation type enumeration
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum SnapshotOperationType {
    Create,
    Update,
    Delete,
    Sync,
}

impl SnapshotOperationType {
    pub fn as_str(&self) -> &str {
        match self {
            SnapshotOperationType::Create => "create",
            SnapshotOperationType::Update => "update",
            SnapshotOperationType::Delete => "delete",
            SnapshotOperationType::Sync => "sync",
        }
    }
}

/// Snapshot type enumeration
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum SnapshotType {
    Before,
    After,
}

impl SnapshotType {
    pub fn as_str(&self) -> &str {
        match self {
            SnapshotType::Before => "before",
            SnapshotType::After => "after",
        }
    }
}
