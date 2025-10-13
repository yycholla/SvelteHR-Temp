//! Task domain model with GraphQL integration
//!
//! Represents tasks in the HR system with status tracking, assignments, and dependencies.

use async_graphql::{Context, Enum, InputObject, Object, Result as GqlResult};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

/// Task status
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Enum, sqlx::Type)]
#[sqlx(type_name = "task_status", rename_all = "lowercase")]
pub enum TaskStatus {
    Todo,
    InProgress,
    Blocked,
    Review,
    Done,
    Cancelled,
}

/// Task priority
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Enum, sqlx::Type)]
#[sqlx(type_name = "task_priority", rename_all = "lowercase")]
pub enum TaskPriority {
    Low,
    Medium,
    High,
    Urgent,
}

/// Task model - maps to hr_public.tasks table
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Task {
    pub id: Uuid,
    pub title: String,
    pub description: Option<String>,
    pub status: TaskStatus,
    pub priority: TaskPriority,
    pub due_date: Option<DateTime<Utc>>,
    pub start_date: Option<DateTime<Utc>>,
    pub completed_at: Option<DateTime<Utc>>,
    pub estimated_hours: Option<i32>,
    pub actual_hours: Option<i32>,
    pub tags: Option<Vec<String>>,
    pub department_id: Option<Uuid>,
    pub created_by: Uuid,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub deleted_at: Option<DateTime<Utc>>,
}

/// GraphQL Object implementation for Task
#[Object]
impl Task {
    /// Unique task identifier
    async fn id(&self) -> Uuid {
        self.id
    }

    /// Task title
    async fn title(&self) -> &str {
        &self.title
    }

    /// Task description
    async fn description(&self) -> Option<&str> {
        self.description.as_deref()
    }

    /// Current task status
    async fn status(&self) -> TaskStatus {
        self.status
    }

    /// Task priority level
    async fn priority(&self) -> TaskPriority {
        self.priority
    }

    /// Task due date
    async fn due_date(&self) -> Option<DateTime<Utc>> {
        self.due_date
    }

    /// Task start date
    async fn start_date(&self) -> Option<DateTime<Utc>> {
        self.start_date
    }

    /// Task completion timestamp
    async fn completed_at(&self) -> Option<DateTime<Utc>> {
        self.completed_at
    }

    /// Estimated hours to complete
    async fn estimated_hours(&self) -> Option<i32> {
        self.estimated_hours
    }

    /// Actual hours spent
    async fn actual_hours(&self) -> Option<i32> {
        self.actual_hours
    }

    /// Task tags for categorization
    async fn tags(&self) -> Option<Vec<String>> {
        self.tags.clone()
    }

    /// Department ID if task is department-specific
    async fn department_id(&self) -> Option<Uuid> {
        self.department_id
    }

    /// User ID who created the task
    async fn created_by(&self) -> Uuid {
        self.created_by
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

    /// User who created the task
    async fn creator(&self, ctx: &Context<'_>) -> GqlResult<Option<super::user::User>> {
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
        .bind(self.created_by)
        .fetch_optional(pool)
        .await?;

        Ok(user)
    }

    /// Department if task is department-specific
    async fn department(&self, ctx: &Context<'_>) -> GqlResult<Option<super::department::Department>> {
        if let Some(dept_id) = self.department_id {
            let pool = ctx.data::<PgPool>()?;

            let dept = sqlx::query_as::<_, super::department::Department>(
                r#"
                SELECT id, name, code, description, manager_id, parent_department_id,
                       created_at, updated_at, deleted_at
                FROM hr_public.departments
                WHERE id = $1 AND deleted_at IS NULL
                "#,
            )
            .bind(dept_id)
            .fetch_optional(pool)
            .await?;

            Ok(dept)
        } else {
            Ok(None)
        }
    }

    /// Whether task is overdue
    async fn is_overdue(&self) -> bool {
        if let Some(due) = self.due_date {
            if self.status != TaskStatus::Done && self.status != TaskStatus::Cancelled {
                return Utc::now() > due;
            }
        }
        false
    }

    /// Whether task is completed
    async fn is_completed(&self) -> bool {
        self.status == TaskStatus::Done
    }

    /// Whether task is blocked
    async fn is_blocked(&self) -> bool {
        self.status == TaskStatus::Blocked
    }

    /// Time remaining until due date (in hours)
    async fn hours_until_due(&self) -> Option<i64> {
        if let Some(due) = self.due_date {
            if self.status != TaskStatus::Done && self.status != TaskStatus::Cancelled {
                let now = Utc::now();
                if due > now {
                    let duration = due - now;
                    return Some(duration.num_hours());
                }
            }
        }
        None
    }

    /// Progress percentage (based on estimated vs actual hours)
    async fn progress_percentage(&self) -> Option<i32> {
        if let (Some(estimated), Some(actual)) = (self.estimated_hours, self.actual_hours) {
            if estimated > 0 {
                let progress = (actual as f32 / estimated as f32 * 100.0).min(100.0);
                return Some(progress as i32);
            }
        }
        None
    }

    /// Count of assignees for this task
    async fn assignee_count(&self, ctx: &Context<'_>) -> GqlResult<i64> {
        let pool = ctx.data::<PgPool>()?;

        let count: (i64,) = sqlx::query_as(
            r#"
            SELECT COUNT(*)::bigint
            FROM hr_public.task_assignees
            WHERE task_id = $1 AND deleted_at IS NULL
            "#,
        )
        .bind(self.id)
        .fetch_one(pool)
        .await?;

        Ok(count.0)
    }

    /// Count of dependencies for this task
    async fn dependency_count(&self, ctx: &Context<'_>) -> GqlResult<i64> {
        let pool = ctx.data::<PgPool>()?;

        let count: (i64,) = sqlx::query_as(
            r#"
            SELECT COUNT(*)::bigint
            FROM hr_public.task_dependencies
            WHERE task_id = $1 AND deleted_at IS NULL
            "#,
        )
        .bind(self.id)
        .fetch_one(pool)
        .await?;

        Ok(count.0)
    }

    /// Count of linked resources (attachments)
    async fn resource_count(&self, ctx: &Context<'_>) -> GqlResult<i64> {
        let pool = ctx.data::<PgPool>()?;

        let count: (i64,) = sqlx::query_as(
            r#"
            SELECT COUNT(*)::bigint
            FROM hr_public.linked_resources
            WHERE task_id = $1 AND deleted_at IS NULL
            "#,
        )
        .bind(self.id)
        .fetch_one(pool)
        .await?;

        Ok(count.0)
    }
}

/// Task creation input
#[derive(Debug, Clone, InputObject)]
pub struct CreateTaskInput {
    pub title: String,
    pub description: Option<String>,
    pub priority: TaskPriority,
    pub due_date: Option<DateTime<Utc>>,
    pub start_date: Option<DateTime<Utc>>,
    pub estimated_hours: Option<i32>,
    pub tags: Option<Vec<String>>,
    pub department_id: Option<Uuid>,
}

/// Task update input
#[derive(Debug, Clone, InputObject)]
pub struct UpdateTaskInput {
    pub title: Option<String>,
    pub description: Option<String>,
    pub status: Option<TaskStatus>,
    pub priority: Option<TaskPriority>,
    pub due_date: Option<DateTime<Utc>>,
    pub start_date: Option<DateTime<Utc>>,
    pub estimated_hours: Option<i32>,
    pub actual_hours: Option<i32>,
    pub tags: Option<Vec<String>>,
    pub department_id: Option<Uuid>,
}

/// Task status change input
#[derive(Debug, Clone, InputObject)]
pub struct ChangeTaskStatusInput {
    pub task_id: Uuid,
    pub status: TaskStatus,
    pub comment: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_task_model_compiles() {
        let task = Task {
            id: Uuid::new_v4(),
            title: "Complete GraphQL API".to_string(),
            description: Some("Implement all mutations and queries".to_string()),
            status: TaskStatus::InProgress,
            priority: TaskPriority::High,
            due_date: Some(Utc::now()),
            start_date: Some(Utc::now()),
            completed_at: None,
            estimated_hours: Some(40),
            actual_hours: Some(20),
            tags: Some(vec!["api".to_string(), "graphql".to_string()]),
            department_id: None,
            created_by: Uuid::new_v4(),
            created_at: Utc::now(),
            updated_at: Utc::now(),
            deleted_at: None,
        };

        assert_eq!(task.status, TaskStatus::InProgress);
        assert_eq!(task.priority, TaskPriority::High);
    }
}
