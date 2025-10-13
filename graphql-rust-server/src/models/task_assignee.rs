//! TaskAssignee domain model with GraphQL integration
//!
//! Represents the many-to-many relationship between tasks and users (assignees).

use async_graphql::{Context, Enum, InputObject, Object, Result as GqlResult};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

/// Assignee role in the task
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Enum, sqlx::Type)]
#[sqlx(type_name = "assignee_role", rename_all = "lowercase")]
pub enum AssigneeRole {
    Owner,
    Assignee,
    Reviewer,
    Collaborator,
}

/// TaskAssignee model - maps to hr_public.task_assignees table
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct TaskAssignee {
    pub id: Uuid,
    pub task_id: Uuid,
    pub user_id: Uuid,
    pub role: AssigneeRole,
    pub assigned_at: DateTime<Utc>,
    pub assigned_by: Uuid,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub deleted_at: Option<DateTime<Utc>>,
}

/// GraphQL Object implementation for TaskAssignee
#[Object]
impl TaskAssignee {
    /// Unique task assignee identifier
    async fn id(&self) -> Uuid {
        self.id
    }

    /// Task ID (foreign key)
    async fn task_id(&self) -> Uuid {
        self.task_id
    }

    /// User ID (foreign key)
    async fn user_id(&self) -> Uuid {
        self.user_id
    }

    /// Role of the assignee in this task
    async fn role(&self) -> AssigneeRole {
        self.role
    }

    /// When the user was assigned to the task
    async fn assigned_at(&self) -> DateTime<Utc> {
        self.assigned_at
    }

    /// User ID who made the assignment
    async fn assigned_by(&self) -> Uuid {
        self.assigned_by
    }

    /// Record creation timestamp
    async fn created_at(&self) -> DateTime<Utc> {
        self.created_at
    }

    /// Record last update timestamp
    async fn updated_at(&self) -> DateTime<Utc> {
        self.updated_at
    }

    /// Soft delete timestamp (NULL if not deleted)
    async fn deleted_at(&self) -> Option<DateTime<Utc>> {
        self.deleted_at
    }

    /// Task associated with this assignment
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

    /// User assigned to the task
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

    /// User who made the assignment
    async fn assigner(&self, ctx: &Context<'_>) -> GqlResult<Option<super::user::User>> {
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
        .bind(self.assigned_by)
        .fetch_optional(pool)
        .await?;

        Ok(user)
    }

    /// Whether this is the task owner
    async fn is_owner(&self) -> bool {
        self.role == AssigneeRole::Owner
    }
}

/// TaskAssignee creation input
#[derive(Debug, Clone, InputObject)]
pub struct AssignTaskInput {
    pub task_id: Uuid,
    pub user_id: Uuid,
    pub role: AssigneeRole,
}

/// TaskAssignee update input
#[derive(Debug, Clone, InputObject)]
pub struct UpdateTaskAssigneeInput {
    pub role: Option<AssigneeRole>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_task_assignee_model_compiles() {
        let assignee = TaskAssignee {
            id: Uuid::new_v4(),
            task_id: Uuid::new_v4(),
            user_id: Uuid::new_v4(),
            role: AssigneeRole::Assignee,
            assigned_at: Utc::now(),
            assigned_by: Uuid::new_v4(),
            created_at: Utc::now(),
            updated_at: Utc::now(),
            deleted_at: None,
        };

        assert_eq!(assignee.role, AssigneeRole::Assignee);
    }
}
