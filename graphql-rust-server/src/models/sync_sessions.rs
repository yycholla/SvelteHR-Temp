//! Sync Sessions Model
//!
//! Groups sync operations into sessions for better tracking and analytics

use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(schema_name = "hr_public", table_name = "sync_sessions")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: Uuid,
    pub started_at: DateTimeWithTimeZone,
    pub completed_at: Option<DateTimeWithTimeZone>,
    pub user_id: Option<Uuid>,
    pub sync_direction: Option<String>,
    pub entity_type: Option<String>,
    pub status: String,
    pub total_records: i32,
    pub successful_records: i32,
    pub failed_records: i32,
    pub conflicts_detected: i32,
    pub duration_ms: Option<i32>,
    pub error_message: Option<String>,
    pub metadata: Option<Json>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}

/// Sync session status
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum SessionStatus {
    Running,
    Completed,
    Failed,
    Cancelled,
}

impl SessionStatus {
    pub fn as_str(&self) -> &str {
        match self {
            SessionStatus::Running => "running",
            SessionStatus::Completed => "completed",
            SessionStatus::Failed => "failed",
            SessionStatus::Cancelled => "cancelled",
        }
    }
}
