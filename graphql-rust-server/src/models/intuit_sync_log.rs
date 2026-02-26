//! Intuit QuickBooks sync log model for audit trail and debugging

use chrono::Utc;
use sea_orm::entity::prelude::*;
use sea_orm::Set;
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use uuid::Uuid;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "intuit_sync_log", schema_name = "hr_public")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: Uuid,
    pub user_id: Option<Uuid>,
    pub sync_type: String,
    pub direction: String,
    pub status: String,
    pub error_message: Option<String>,
    pub payload: Option<JsonValue>,

    // Enhanced tracking fields
    pub change_direction: Option<String>,
    pub conflict_detected: bool,
    pub conflict_resolution: Option<String>,
    pub pushed_count: i32,
    pub pulled_count: i32,
    pub updated_count: i32,
    pub skipped_count: i32,
    pub retry_count: i32,
    pub next_retry_at: Option<DateTimeWithTimeZone>,
    pub quickbooks_metadata: Option<JsonValue>,

    // Incremental sync tracking fields (Feature 3)
    pub sync_mode: String,
    pub changes_detected: i32,
    pub changes_processed: i32,
    pub sync_duration_ms: Option<i32>,

    pub created_at: DateTimeWithTimeZone,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::user::Entity",
        from = "Column::UserId",
        to = "super::user::Column::Id"
    )]
    User,
}

impl Related<super::user::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::User.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}

/// Helper for creating sync log entries
impl ActiveModel {
    /// Create a new sync log entry
    pub fn new(user_id: Option<Uuid>, sync_type: &str, direction: &str, status: &str) -> Self {
        Self {
            id: Set(Uuid::new_v4()),
            user_id: Set(user_id),
            sync_type: Set(sync_type.to_string()),
            direction: Set(direction.to_string()),
            status: Set(status.to_string()),
            error_message: Set(None),
            payload: Set(None),
            change_direction: Set(None),
            conflict_detected: Set(false),
            conflict_resolution: Set(None),
            pushed_count: Set(0),
            pulled_count: Set(0),
            updated_count: Set(0),
            skipped_count: Set(0),
            retry_count: Set(0),
            next_retry_at: Set(None),
            quickbooks_metadata: Set(None),
            sync_mode: Set("full".to_string()),
            changes_detected: Set(0),
            changes_processed: Set(0),
            sync_duration_ms: Set(None),
            created_at: Set(Utc::now().into()),
        }
    }
}
