//! TaskDependency domain model with GraphQL integration
//!
//! Represents dependencies between tasks (predecessor-successor relationships).

use async_graphql::{Context, Enum, InputObject, Object, Result as GqlResult};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

/// Dependency type
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Enum, sqlx::Type)]
#[sqlx(type_name = "dependency_type", rename_all = "lowercase")]
pub enum DependencyType {
    /// Task must finish before dependent task can start
    FinishToStart,
    /// Task must finish before dependent task can finish
    FinishToFinish,
    /// Task must start before dependent task can start
    StartToStart,
    /// Task must start before dependent task can finish
    StartToFinish,
}

/// TaskDependency model - maps to hr_public.task_dependencies table
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct TaskDependency {
    pub id: Uuid,
    pub task_id: Uuid,
    pub depends_on_task_id: Uuid,
    pub dependency_type: DependencyType,
    pub lag_days: Option<i32>,
    pub created_by: Uuid,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub deleted_at: Option<DateTime<Utc>>,
}

/// GraphQL Object implementation for TaskDependency
#[Object]
impl TaskDependency {
    /// Unique task dependency identifier
    async fn id(&self) -> Uuid {
        self.id
    }

    /// Task ID (the dependent task)
    async fn task_id(&self) -> Uuid {
        self.task_id
    }

    /// Task ID that this task depends on (the prerequisite)
    async fn depends_on_task_id(&self) -> Uuid {
        self.depends_on_task_id
    }

    /// Type of dependency relationship
    async fn dependency_type(&self) -> DependencyType {
        self.dependency_type
    }

    /// Lag time in days (positive for delay, negative for overlap)
    async fn lag_days(&self) -> Option<i32> {
        self.lag_days
    }

    /// User ID who created the dependency
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

    /// The dependent task (the one that has a dependency)
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

    /// The prerequisite task (the one being depended on)
    async fn depends_on_task(&self, ctx: &Context<'_>) -> GqlResult<Option<super::task::Task>> {
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
        .bind(self.depends_on_task_id)
        .fetch_optional(pool)
        .await?;

        Ok(task)
    }

    /// User who created the dependency
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

    /// Whether this is a blocking dependency (finish-to-start)
    async fn is_blocking(&self) -> bool {
        self.dependency_type == DependencyType::FinishToStart
    }
}

/// TaskDependency creation input
#[derive(Debug, Clone, InputObject)]
pub struct CreateTaskDependencyInput {
    pub task_id: Uuid,
    pub depends_on_task_id: Uuid,
    pub dependency_type: DependencyType,
    pub lag_days: Option<i32>,
}

/// TaskDependency update input
#[derive(Debug, Clone, InputObject)]
pub struct UpdateTaskDependencyInput {
    pub dependency_type: Option<DependencyType>,
    pub lag_days: Option<i32>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_task_dependency_model_compiles() {
        let dependency = TaskDependency {
            id: Uuid::new_v4(),
            task_id: Uuid::new_v4(),
            depends_on_task_id: Uuid::new_v4(),
            dependency_type: DependencyType::FinishToStart,
            lag_days: Some(2),
            created_by: Uuid::new_v4(),
            created_at: Utc::now(),
            updated_at: Utc::now(),
            deleted_at: None,
        };

        assert_eq!(dependency.dependency_type, DependencyType::FinishToStart);
    }
}
