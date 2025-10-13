//! TaskAuditEntry domain model with GraphQL integration
//!
//! Represents audit trail entries for task changes and history tracking.

use async_graphql::{Context, Enum, Object, Result as GqlResult};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

/// Action type for audit entries
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Enum, sqlx::Type)]
#[sqlx(type_name = "audit_action", rename_all = "lowercase")]
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

/// TaskAuditEntry model - maps to hr_public.task_audit_entries table
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct TaskAuditEntry {
    pub id: Uuid,
    pub task_id: Uuid,
    pub user_id: Uuid,
    pub action: AuditAction,
    pub field_name: Option<String>,
    pub old_value: Option<String>,
    pub new_value: Option<String>,
    pub comment: Option<String>,
    pub created_at: DateTime<Utc>,
}

/// GraphQL Object implementation for TaskAuditEntry
#[Object]
impl TaskAuditEntry {
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
        self.action
    }

    /// Field that was changed (optional)
    async fn field_name(&self) -> Option<&str> {
        self.field_name.as_deref()
    }

    /// Previous value of the field
    async fn old_value(&self) -> Option<&str> {
        self.old_value.as_deref()
    }

    /// New value of the field
    async fn new_value(&self) -> Option<&str> {
        self.new_value.as_deref()
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
    async fn task(&self, ctx: &Context<'_>) -> GqlResult<Option<super::task::Task>> {
        let pool = ctx.data::<PgPool>()?;

        let task = sqlx::query_as::<_, super::task::Task>(
            r#"
            SELECT id, title, description, status, priority, due_date, start_date,
                   completed_at, estimated_hours, actual_hours, tags, department_id,
                   created_by, created_at, updated_at, deleted_at
            FROM hr_public.tasks
            WHERE id = $1 AND deleted_at IS NULL
            "#,
        )
        .bind(self.task_id)
        .fetch_optional(pool)
        .await?;

        Ok(task)
    }

    /// User who performed the action
    async fn user(&self, ctx: &Context<'_>) -> GqlResult<Option<super::user::User>> {
        let pool = ctx.data::<PgPool>()?;

        let user = sqlx::query_as::<_, super::user::User>(
            r#"
            SELECT id, email, first_name, last_name, full_name, phone,
                   department_id, manager_id, hire_date, termination_date,
                   status, created_at, updated_at, deleted_at
            FROM hr_public.users
            WHERE id = $1 AND deleted_at IS NULL
            "#,
        )
        .bind(self.user_id)
        .fetch_optional(pool)
        .await?;

        Ok(user)
    }

    /// Human-readable description of the change
    async fn description(&self) -> String {
        match self.action {
            AuditAction::Created => "Task created".to_string(),
            AuditAction::Updated => {
                if let Some(field) = &self.field_name {
                    format!("Updated {}", field)
                } else {
                    "Task updated".to_string()
                }
            }
            AuditAction::StatusChanged => {
                if let (Some(old), Some(new)) = (&self.old_value, &self.new_value) {
                    format!("Status changed from {} to {}", old, new)
                } else {
                    "Status changed".to_string()
                }
            }
            AuditAction::Assigned => "User assigned to task".to_string(),
            AuditAction::Unassigned => "User unassigned from task".to_string(),
            AuditAction::Commented => "Comment added".to_string(),
            AuditAction::Completed => "Task completed".to_string(),
            AuditAction::Reopened => "Task reopened".to_string(),
            AuditAction::Deleted => "Task deleted".to_string(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_task_audit_entry_model_compiles() {
        let entry = TaskAuditEntry {
            id: Uuid::new_v4(),
            task_id: Uuid::new_v4(),
            user_id: Uuid::new_v4(),
            action: AuditAction::StatusChanged,
            field_name: Some("status".to_string()),
            old_value: Some("todo".to_string()),
            new_value: Some("in_progress".to_string()),
            comment: None,
            created_at: Utc::now(),
        };

        assert_eq!(entry.action, AuditAction::StatusChanged);
    }
}
