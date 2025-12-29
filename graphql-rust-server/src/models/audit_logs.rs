//! Audit Logs Model
//!
//! Comprehensive audit trail for all system activities

use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(schema_name = "hr_public", table_name = "audit_logs")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: Uuid,
    pub event_type: String,
    pub event_category: String,
    pub entity_type: Option<String>,
    pub entity_id: Option<String>,
    pub user_id: Option<Uuid>,
    pub user_email: Option<String>,
    pub action: String,
    pub description: String,
    pub old_values: Option<Json>,
    pub new_values: Option<Json>,
    pub changes_summary: Option<Json>,
    pub ip_address: Option<String>,
    pub user_agent: Option<String>,
    pub session_id: Option<Uuid>,
    pub sync_direction: Option<String>,
    pub sync_job_id: Option<Uuid>,
    pub source: String,
    pub status: String,
    pub error_message: Option<String>,
    pub metadata: Option<Json>,
    pub created_at: DateTimeWithTimeZone,
    // Tamper detection fields
    pub audit_id: Option<String>,
    pub previous_audit_id: Option<String>,
    pub audit_hash: Option<String>,
    pub entity_name: Option<String>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}

/// Event category enumeration
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum EventCategory {
    Sync,
    Auth,
    DataChange,
    System,
    UserAction,
    ApiCall,
}

impl EventCategory {
    pub fn as_str(&self) -> &str {
        match self {
            EventCategory::Sync => "sync",
            EventCategory::Auth => "auth",
            EventCategory::DataChange => "data_change",
            EventCategory::System => "system",
            EventCategory::UserAction => "user_action",
            EventCategory::ApiCall => "api_call",
        }
    }
}

/// Action type enumeration
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Action {
    Create,
    Update,
    Delete,
    Read,
    Sync,
    Login,
    Logout,
    FailedLogin,
    Export,
    Import,
    Approve,
    Reject,
}

impl Action {
    pub fn as_str(&self) -> &str {
        match self {
            Action::Create => "create",
            Action::Update => "update",
            Action::Delete => "delete",
            Action::Read => "read",
            Action::Sync => "sync",
            Action::Login => "login",
            Action::Logout => "logout",
            Action::FailedLogin => "failed_login",
            Action::Export => "export",
            Action::Import => "import",
            Action::Approve => "approve",
            Action::Reject => "reject",
        }
    }
}

/// Audit status enumeration
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum AuditStatus {
    Success,
    Failed,
    Partial,
    Pending,
}

impl AuditStatus {
    pub fn as_str(&self) -> &str {
        match self {
            AuditStatus::Success => "success",
            AuditStatus::Failed => "failed",
            AuditStatus::Partial => "partial",
            AuditStatus::Pending => "pending",
        }
    }
}

/// Source type enumeration
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Source {
    WebUi,
    Api,
    SyncJob,
    Webhook,
    ScheduledTask,
    System,
}

impl Source {
    pub fn as_str(&self) -> &str {
        match self {
            Source::WebUi => "web_ui",
            Source::Api => "api",
            Source::SyncJob => "sync_job",
            Source::Webhook => "webhook",
            Source::ScheduledTask => "scheduled_task",
            Source::System => "system",
        }
    }
}
