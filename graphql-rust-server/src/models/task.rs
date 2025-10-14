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
    pub task_type_id: Option<Uuid>,
    pub status: TaskStatus,
    pub priority: TaskPriority,
    pub due_date: Option<DateTime<Utc>>,
    pub completed_at: Option<DateTime<Utc>>,
    pub estimated_hours: Option<i32>,
    pub actual_hours: Option<i32>,
    pub tags: Option<Vec<String>>,
    pub department_id: Option<Uuid>,
    pub created_by: Uuid,
    pub assignee_id: Option<Uuid>,
    pub parent_task_id: Option<Uuid>,
    pub requires_manual_reassignment: Option<bool>,
    pub archived: bool,
    pub archived_at: Option<DateTime<Utc>>,
    pub archived_by: Option<Uuid>,
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

    /// Task type ID for categorization
    async fn task_type_id(&self) -> Option<Uuid> {
        self.task_type_id
    }

    /// Whether task requires manual reassignment approval
    async fn requires_manual_reassignment(&self) -> Option<bool> {
        self.requires_manual_reassignment
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

    /// User ID assigned to the task
    async fn assignee_id(&self) -> Option<Uuid> {
        self.assignee_id
    }

    /// Parent task ID (for subtasks)
    async fn parent_task_id(&self) -> Option<Uuid> {
        self.parent_task_id
    }

    /// Whether task is archived
    async fn archived(&self) -> bool {
        self.archived
    }

    /// Timestamp when task was archived
    async fn archived_at(&self) -> Option<DateTime<Utc>> {
        self.archived_at
    }

    /// User ID who archived the task
    async fn archived_by(&self) -> Option<Uuid> {
        self.archived_by
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
            SELECT id, email, first_name, last_name, display_name, full_name, role,
                   phone_number, alternate_phone, job_title, status,
                   department_id, manager_id, hire_date,
                   is_active, created_at, updated_at
            FROM hr_public.users
            WHERE id = $1 AND is_active = true
            "#,
        )
        .bind(self.created_by)
        .fetch_optional(pool)
        .await?;

        Ok(user)
    }

    /// User assigned to the task
    async fn assignee(&self, ctx: &Context<'_>) -> GqlResult<Option<super::user::User>> {
        if let Some(assignee_id) = self.assignee_id {
            let pool = ctx.data::<PgPool>()?;

            let user = sqlx::query_as::<_, super::user::User>(
                r#"
                SELECT id, email, first_name, last_name, display_name, full_name, role,
                       phone_number, alternate_phone, job_title, status,
                       department_id, manager_id, hire_date,
                       is_active, created_at, updated_at
                FROM hr_public.users
                WHERE id = $1 AND is_active = true
                "#,
            )
            .bind(assignee_id)
            .fetch_optional(pool)
            .await?;

            Ok(user)
        } else {
            Ok(None)
        }
    }

    /// Parent task (for subtasks)
    async fn parent_task(&self, ctx: &Context<'_>) -> GqlResult<Option<Task>> {
        if let Some(parent_id) = self.parent_task_id {
            let pool = ctx.data::<PgPool>()?;

            let task = sqlx::query_as::<_, Task>(
                r#"
                SELECT id, title, description, task_type_id, status, priority, due_date,
                       completed_at, estimated_hours, actual_hours, tags, department_id,
                       created_by, assignee_id, parent_task_id, requires_manual_reassignment,
                       archived, archived_at, archived_by,
                       created_at, updated_at, deleted_at
                FROM hr_public.tasks
                WHERE id = $1 AND deleted_at IS NULL
                "#,
            )
            .bind(parent_id)
            .fetch_optional(pool)
            .await?;

            Ok(task)
        } else {
            Ok(None)
        }
    }

    /// User who archived the task
    async fn archived_by_user(&self, ctx: &Context<'_>) -> GqlResult<Option<super::user::User>> {
        if let Some(archived_by_id) = self.archived_by {
            let pool = ctx.data::<PgPool>()?;

            let user = sqlx::query_as::<_, super::user::User>(
                r#"
                SELECT id, email, first_name, last_name, display_name, full_name, role,
                       phone_number, alternate_phone, job_title, status,
                       department_id, manager_id, hire_date,
                       is_active, created_at, updated_at
                FROM hr_public.users
                WHERE id = $1 AND is_active = true
                "#,
            )
            .bind(archived_by_id)
            .fetch_optional(pool)
            .await?;

            Ok(user)
        } else {
            Ok(None)
        }
    }

    /// Department if task is department-specific
    async fn department(&self, ctx: &Context<'_>) -> GqlResult<Option<super::department::Department>> {
        if let Some(dept_id) = self.department_id {
            let pool = ctx.data::<PgPool>()?;

            let dept = sqlx::query_as::<_, super::department::Department>(
                r#"
                SELECT id, name, code, description, manager_id,
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

    /// Task type for categorization
    async fn task_type(&self, ctx: &Context<'_>) -> GqlResult<Option<super::tasks::TaskType>> {
        if let Some(type_id) = self.task_type_id {
            let pool = ctx.data::<PgPool>()?;

            let task_type = sqlx::query_as::<_, super::tasks::TaskType>(
                r#"
                SELECT id, name, description, color, icon,
                       created_at, updated_at
                FROM hr_public.task_types
                WHERE id = $1
                "#,
            )
            .bind(type_id)
            .fetch_optional(pool)
            .await?;

            Ok(task_type)
        } else {
            Ok(None)
        }
    }

    /// Child tasks (subtasks) of this task
    async fn subtasks(&self, ctx: &Context<'_>) -> GqlResult<Vec<Task>> {
        let pool = ctx.data::<PgPool>()?;

        let subtasks = sqlx::query_as::<_, Task>(
            r#"
            SELECT id, title, description, task_type_id, status, priority, due_date,
                   completed_at, estimated_hours, actual_hours, tags, department_id,
                   created_by, assignee_id, parent_task_id, requires_manual_reassignment,
                   archived, archived_at, archived_by,
                   created_at, updated_at, deleted_at
            FROM hr_public.tasks
            WHERE parent_task_id = $1 AND deleted_at IS NULL
            ORDER BY created_at ASC
            "#,
        )
        .bind(self.id)
        .fetch_all(pool)
        .await?;

        Ok(subtasks)
    }

    /// Tasks that this task blocks (dependencies where this is the blocking task)
    async fn blocks_tasks(&self, ctx: &Context<'_>) -> GqlResult<Vec<Task>> {
        let pool = ctx.data::<PgPool>()?;

        let blocked_tasks = sqlx::query_as::<_, Task>(
            r#"
            SELECT t.id, t.title, t.description, t.task_type_id, t.status, t.priority, t.due_date,
                   t.completed_at, t.estimated_hours, t.actual_hours, t.tags, t.department_id,
                   t.created_by, t.assignee_id, t.parent_task_id, t.requires_manual_reassignment,
                   t.archived, t.archived_at, t.archived_by,
                   t.created_at, t.updated_at, t.deleted_at
            FROM hr_public.tasks t
            INNER JOIN hr_public.task_dependencies td ON t.id = td.task_id
            WHERE td.depends_on_task_id = $1 AND t.deleted_at IS NULL AND td.deleted_at IS NULL
            ORDER BY td.created_at ASC
            "#,
        )
        .bind(self.id)
        .fetch_all(pool)
        .await?;

        Ok(blocked_tasks)
    }

    /// Tasks that block this task (dependencies where this task depends on another)
    async fn blocked_by_tasks(&self, ctx: &Context<'_>) -> GqlResult<Vec<Task>> {
        let pool = ctx.data::<PgPool>()?;

        let blocking_tasks = sqlx::query_as::<_, Task>(
            r#"
            SELECT t.id, t.title, t.description, t.task_type_id, t.status, t.priority, t.due_date,
                   t.completed_at, t.estimated_hours, t.actual_hours, t.tags, t.department_id,
                   t.created_by, t.assignee_id, t.parent_task_id, t.requires_manual_reassignment,
                   t.archived, t.archived_at, t.archived_by,
                   t.created_at, t.updated_at, t.deleted_at
            FROM hr_public.tasks t
            INNER JOIN hr_public.task_dependencies td ON t.id = td.depends_on_task_id
            WHERE td.task_id = $1 AND t.deleted_at IS NULL AND td.deleted_at IS NULL
            ORDER BY td.created_at ASC
            "#,
        )
        .bind(self.id)
        .fetch_all(pool)
        .await?;

        Ok(blocking_tasks)
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
    pub task_type_id: Option<Uuid>,
    pub status: Option<TaskStatus>,
    pub priority: TaskPriority,
    pub due_date: Option<DateTime<Utc>>,
    pub estimated_hours: Option<i32>,
    pub tags: Option<Vec<String>>,
    pub department_id: Option<Uuid>,
    pub assignee_id: Option<Uuid>,
    pub parent_task_id: Option<Uuid>,
    pub requires_manual_reassignment: Option<bool>,
}

/// Task update input
#[derive(Debug, Clone, InputObject)]
pub struct UpdateTaskInput {
    pub title: Option<String>,
    pub description: Option<String>,
    pub task_type_id: Option<Uuid>,
    pub status: Option<TaskStatus>,
    pub priority: Option<TaskPriority>,
    pub due_date: Option<DateTime<Utc>>,
    pub estimated_hours: Option<i32>,
    pub actual_hours: Option<i32>,
    pub tags: Option<Vec<String>>,
    pub department_id: Option<Uuid>,
    pub assignee_id: Option<Uuid>,
    pub parent_task_id: Option<Uuid>,
    pub requires_manual_reassignment: Option<bool>,
    pub archived: Option<bool>,
}

/// Task status change input
#[derive(Debug, Clone, InputObject)]
pub struct ChangeTaskStatusInput {
    pub task_id: Uuid,
    pub status: TaskStatus,
    pub comment: Option<String>,
}

/// Task filter input for querying tasks
#[derive(Debug, Clone, InputObject)]
pub struct TaskFilter {
    pub status: Option<TaskStatus>,
    pub priority: Option<TaskPriority>,
    pub assignee_id: Option<Uuid>,
    pub created_by: Option<Uuid>,
    pub department_id: Option<Uuid>,
    pub task_type_id: Option<Uuid>,
    pub parent_task_id: Option<Uuid>,
    pub archived: Option<bool>,
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
            task_type_id: Some(Uuid::new_v4()),
            status: TaskStatus::InProgress,
            priority: TaskPriority::High,
            due_date: Some(Utc::now()),
            completed_at: None,
            estimated_hours: Some(40),
            actual_hours: Some(20),
            tags: Some(vec!["api".to_string(), "graphql".to_string()]),
            department_id: None,
            created_by: Uuid::new_v4(),
            assignee_id: Some(Uuid::new_v4()),
            parent_task_id: None,
            requires_manual_reassignment: Some(false),
            archived: false,
            archived_at: None,
            archived_by: None,
            created_at: Utc::now(),
            updated_at: Utc::now(),
            deleted_at: None,
        };

        assert_eq!(task.status, TaskStatus::InProgress);
        assert_eq!(task.priority, TaskPriority::High);
        assert_eq!(task.archived, false);
        assert_eq!(task.requires_manual_reassignment, Some(false));
    }
}
