//! Retry History Model

use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(schema_name = "hr_public", table_name = "retry_history")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: Uuid,
    pub failed_operation_id: Uuid,
    pub retry_number: i32,
    pub status: String,
    pub error_message: Option<String>,
    pub error_details: Option<Json>,
    pub backoff_duration: Option<i32>,
    pub duration_ms: Option<i32>,
    pub created_at: DateTimeWithTimeZone,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::failed_operations::Entity",
        from = "Column::FailedOperationId",
        to = "super::failed_operations::Column::Id"
    )]
    FailedOperation,
}

impl Related<super::failed_operations::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::FailedOperation.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}

/// Retry attempt status
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum RetryStatus {
    Success,
    Failed,
    Skipped,
}

impl RetryStatus {
    pub fn as_str(&self) -> &str {
        match self {
            RetryStatus::Success => "success",
            RetryStatus::Failed => "failed",
            RetryStatus::Skipped => "skipped",
        }
    }
}
