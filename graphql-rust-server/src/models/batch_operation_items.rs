//! Batch Operation Items Model

use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(schema_name = "hr_public", table_name = "batch_operation_items")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: Uuid,
    pub batch_operation_id: Uuid,
    pub entity_id: String,
    pub entity_name: Option<String>,
    pub status: String,
    pub attempt_count: i32,
    pub error_message: Option<String>,
    pub error_details: Option<Json>,
    pub input_data: Option<Json>,
    pub output_data: Option<Json>,
    pub processed_at: Option<DateTimeWithTimeZone>,
    pub duration_ms: Option<i32>,
    pub created_at: DateTimeWithTimeZone,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::batch_operations::Entity",
        from = "Column::BatchOperationId",
        to = "super::batch_operations::Column::Id"
    )]
    BatchOperation,
}

impl Related<super::batch_operations::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::BatchOperation.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}

/// Batch item status enumeration
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum BatchItemStatus {
    Pending,
    Processing,
    Success,
    Failed,
    Skipped,
}

impl BatchItemStatus {
    pub fn as_str(&self) -> &str {
        match self {
            BatchItemStatus::Pending => "pending",
            BatchItemStatus::Processing => "processing",
            BatchItemStatus::Success => "success",
            BatchItemStatus::Failed => "failed",
            BatchItemStatus::Skipped => "skipped",
        }
    }
}
