//! TaskAuditEntry domain model with GraphQL integration
//!
//! Represents audit trail entries for task changes and history tracking.

use async_graphql::{Context, Enum, Object, Result as GqlResult};
use chrono::{DateTime, Utc};
use sea_orm::{entity::prelude::*, FromQueryResult, Related};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::{database::get_db_from_context, error::AppError, models::generated::prelude::*};

/// Action type for audit entries
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Enum)]
pub enum AuditAction {
    Created,
    Updated,
    StatusChanged,
    Assigned,
    Unassigned,
    Commented,
    Completed,
    Reopened,
    Deleted,
}

/// TaskAuditEntry entity - maps to hr_public.task_audit_entries table
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "task_audit_entries", schema_name = "hr_public")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub task_id: Uuid,
    pub user_id: Uuid,
    pub action: String, // Using string to match database enum
    pub field_name: Option<String>,
    #[sea_orm(column_type = "Json")]
    pub old_value: Option<serde_json::Value>,
    #[sea_orm(column_type = "Json")]
    pub new_value: Option<serde_json::Value>,
    pub comment: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::task::Entity",
        from = "Column::TaskId",
        to = "super::task::Column::Id"
    )]
    Task,
    #[sea_orm(
        belongs_to = "super::user::Entity",
        from = "Column::UserId",
        to = "super::user::Column::Id"
    )]
    User,
}

impl Related<super::task::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Task.def().rev()
    }
}

impl Related<super::user::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::User.def().rev()
    }
}

impl ActiveModelBehavior for ActiveModel {}

/// GraphQL Object implementation for TaskAuditEntry
#[Object(name = "task_audit_entry_Model")]
impl Model {
    /// Unique audit entry identifier
    async fn id(&self) -> Uuid {
        self.id
    }

    /// Task ID (foreign key)
    async fn task_id(&self) -> Uuid {
        self.task_id
    }

    /// User ID who performed the action
    async fn user_id(&self) -> Uuid {
        self.user_id
    }

    /// Type of action performed
    async fn action(&self) -> AuditAction {
        match self.action.as_str() {
            "created" => AuditAction::Created,
            "updated" => AuditAction::Updated,
            "status_changed" => AuditAction::StatusChanged,
            "assigned" => AuditAction::Assigned,
            "unassigned" => AuditAction::Unassigned,
            "commented" => AuditAction::Commented,
            "completed" => AuditAction::Completed,
            "reopened" => AuditAction::Reopened,
            "deleted" => AuditAction::Deleted,
            _ => AuditAction::Updated, // Default fallback
        }
    }

    /// Field that was changed (optional)
    async fn field_name(&self) -> Option<&str> {
        self.field_name.as_deref()
    }

    /// Previous value of the field (as JSON string)
    async fn old_value(&self) -> Option<String> {
        self.old_value.as_ref().map(|v| v.to_string())
    }

    /// New value of the field (as JSON string)
    async fn new_value(&self) -> Option<String> {
        self.new_value.as_ref().map(|v| v.to_string())
    }

    /// Comment or note about the change
    async fn comment(&self) -> Option<&str> {
        self.comment.as_deref()
    }

    /// When the action was performed
    async fn created_at(&self) -> DateTime<Utc> {
        self.created_at
    }

    /// Task associated with this audit entry
    async fn task(&self, ctx: &Context<'_>) -> GqlResult<Option<super::task::Model>> {
        let db = get_db_from_context(ctx)?;
        let task = super::task::Entity::find_by_id(self.task_id).one(&db).await?;
        Ok(task)
    }

    /// User who performed the action
    async fn user(&self, ctx: &Context<'_>) -> GqlResult<Option<super::user::Model>> {
        let db = get_db_from_context(ctx)?;
        let user = super::user::Entity::find_by_id(self.user_id).one(&db).await?;
        Ok(user)
    }

    /// Human-readable description of the change
    async fn description(&self) -> String {
        match self.action.as_str() {
            "created" => "Task created".to_string(),
            "updated" => {
                if let Some(field) = &self.field_name {
                    format!("Updated {}", field)
                } else {
                    "Task updated".to_string()
                }
            }
            "status_changed" => {
                if let (Some(old), Some(new)) = (&self.old_value, &self.new_value) {
                    // Extract string values from JSON
                    let old_str = old.as_str().unwrap_or("unknown");
                    let new_str = new.as_str().unwrap_or("unknown");
                    format!("Status changed from {} to {}", old_str, new_str)
                } else {
                    "Status changed".to_string()
                }
            }
            "assigned" => "User assigned to task".to_string(),
            "unassigned" => "User unassigned from task".to_string(),
            "commented" => "Comment added".to_string(),
            "completed" => "Task completed".to_string(),
            "reopened" => "Task reopened".to_string(),
            "deleted" => "Task deleted".to_string(),
            _ => "Task modified".to_string(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_task_audit_entry_model_compiles() {
        let entry = Model {
            id: Uuid::new_v4(),
            task_id: Uuid::new_v4(),
            user_id: Uuid::new_v4(),
            action: "status_changed".to_string(),
            field_name: Some("status".to_string()),
            old_value: serde_json::to_value("todo").ok(),
            new_value: serde_json::to_value("in_progress").ok(),
            comment: None,
            created_at: Utc::now(),
        };

        assert_eq!(entry.action, "status_changed");
    }
}
