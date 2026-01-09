//! Batch Operations Model

use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(schema_name = "hr_public", table_name = "batch_operations")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: Uuid,
    pub operation_type: String,
    pub entity_type: String,
    pub direction: String,
    pub status: String,
    pub total_items: i32,
    pub processed_items: i32,
    pub successful_items: i32,
    pub failed_items: i32,
    pub skipped_items: i32,
    pub progress_percentage: Decimal,
    pub estimated_time_remaining: Option<i32>,
    pub triggered_by: Option<Uuid>,
    pub triggered_by_email: Option<String>,
    pub error_message: Option<String>,
    pub error_summary: Option<Json>,
    pub configuration: Option<Json>,
    pub metadata: Option<Json>,
    pub started_at: Option<DateTimeWithTimeZone>,
    pub completed_at: Option<DateTimeWithTimeZone>,
    pub duration_ms: Option<i32>,
    pub created_at: DateTimeWithTimeZone,
    pub updated_at: DateTimeWithTimeZone,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(has_many = "super::batch_operation_items::Entity")]
    BatchOperationItems,
}

impl Related<super::batch_operation_items::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::BatchOperationItems.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}

/// Batch operation status enumeration
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum BatchOperationStatus {
    Pending,
    Running,
    Paused,
    Completed,
    Failed,
    Cancelled,
}

impl BatchOperationStatus {
    pub fn as_str(&self) -> &str {
        match self {
            BatchOperationStatus::Pending => "pending",
            BatchOperationStatus::Running => "running",
            BatchOperationStatus::Paused => "paused",
            BatchOperationStatus::Completed => "completed",
            BatchOperationStatus::Failed => "failed",
            BatchOperationStatus::Cancelled => "cancelled",
        }
    }
}

/// Batch operation type enumeration
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum BatchOperationType {
    Sync,
    Import,
    Export,
    Update,
    Delete,
    Validate,
}

impl BatchOperationType {
    pub fn as_str(&self) -> &str {
        match self {
            BatchOperationType::Sync => "sync",
            BatchOperationType::Import => "import",
            BatchOperationType::Export => "export",
            BatchOperationType::Update => "update",
            BatchOperationType::Delete => "delete",
            BatchOperationType::Validate => "validate",
        }
    }
}

/// Batch direction enumeration
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum BatchDirection {
    Push,
    Pull,
    Bidirectional,
}

impl BatchDirection {
    pub fn as_str(&self) -> &str {
        match self {
            BatchDirection::Push => "push",
            BatchDirection::Pull => "pull",
            BatchDirection::Bidirectional => "bidirectional",
        }
    }
}
