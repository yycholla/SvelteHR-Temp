//! Sync Permission Audit Log Model
//!
//! Tracks all permission checks for sync operations for compliance and debugging.

use async_graphql::{Object, SimpleObject};
use chrono::{DateTime, Utc};
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Sync Permission Audit entity - maps to hr_public.sync_permission_audit table
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "sync_permission_audit", schema_name = "hr_public")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub user_id: Uuid,
    pub permission_name: String,
    pub action: String,
    pub granted: bool,
    pub reason: Option<String>,
    pub checked_at: DateTime<Utc>,
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

/// GraphQL Object implementation for SyncPermissionAudit
#[Object(name = "sync_permission_audit_Model")]
impl Model {
    /// Unique audit entry identifier
    async fn id(&self) -> Uuid {
        self.id
    }

    /// User who was checked
    async fn user_id(&self) -> Uuid {
        self.user_id
    }

    /// Permission that was checked (e.g., "sync:trigger_employee")
    async fn permission_name(&self) -> &str {
        &self.permission_name
    }

    /// Action context (e.g., "check:Sync Operations")
    async fn action(&self) -> &str {
        &self.action
    }

    /// Whether the permission was granted
    async fn granted(&self) -> bool {
        self.granted
    }

    /// Reason for the decision
    async fn reason(&self) -> Option<&str> {
        self.reason.as_deref()
    }

    /// When the check occurred
    async fn checked_at(&self) -> DateTime<Utc> {
        self.checked_at
    }
}

/// GraphQL response type for permission audit entries
#[derive(SimpleObject, Clone, Debug)]
pub struct PermissionAuditEntry {
    pub id: String,
    pub user_id: String,
    pub permission_name: String,
    pub action: String,
    pub granted: bool,
    pub reason: Option<String>,
    pub checked_at: DateTime<Utc>,
}

impl From<Model> for PermissionAuditEntry {
    fn from(model: Model) -> Self {
        Self {
            id: model.id.to_string(),
            user_id: model.user_id.to_string(),
            permission_name: model.permission_name,
            action: model.action,
            granted: model.granted,
            reason: model.reason,
            checked_at: model.checked_at,
        }
    }
}
