//! Employee Goal Model
//!
//! Maps to hr_public.employee_goals table

use async_graphql::{Enum, InputObject, Object, Result as GqlResult};
use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

/// Goal status enumeration
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Enum, sqlx::Type)]
#[sqlx(type_name = "goal_status", rename_all = "snake_case")]
pub enum GoalStatus {
    #[graphql(name = "NOT_STARTED")]
    NotStarted,
    #[graphql(name = "IN_PROGRESS")]
    InProgress,
    #[graphql(name = "COMPLETED")]
    Completed,
    #[graphql(name = "CANCELLED")]
    Cancelled,
}

/// Employee goal tracking
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct EmployeeGoal {
    pub id: Uuid,
    pub employee_id: Uuid,
    pub goal_title: String,
    pub goal_description: Option<String>,
    pub target_date: Option<NaiveDate>,
    pub status: GoalStatus,
    pub progress_percentage: i32,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Input for creating a new employee goal
#[derive(Debug, Clone, InputObject)]
pub struct CreateEmployeeGoalInput {
    #[graphql(name = "employeeId")]
    pub employee_id: Uuid,
    #[graphql(name = "goalTitle")]
    pub goal_title: String,
    #[graphql(name = "goalDescription")]
    pub goal_description: Option<String>,
    #[graphql(name = "targetDate")]
    pub target_date: Option<NaiveDate>,
    pub status: Option<GoalStatus>,
    #[graphql(name = "progressPercentage")]
    pub progress_percentage: Option<i32>,
}

/// Input for updating an employee goal
#[derive(Debug, Clone, InputObject)]
pub struct UpdateEmployeeGoalInput {
    #[graphql(name = "goalTitle")]
    pub goal_title: Option<String>,
    #[graphql(name = "goalDescription")]
    pub goal_description: Option<String>,
    #[graphql(name = "targetDate")]
    pub target_date: Option<NaiveDate>,
    pub status: Option<GoalStatus>,
    #[graphql(name = "progressPercentage")]
    pub progress_percentage: Option<i32>,
}

/// GraphQL Object implementation with camelCase field names
#[Object]
impl EmployeeGoal {
    async fn id(&self) -> Uuid {
        self.id
    }

    #[graphql(name = "employeeId")]
    async fn employee_id(&self) -> Uuid {
        self.employee_id
    }

    #[graphql(name = "goalTitle")]
    async fn goal_title(&self) -> &str {
        &self.goal_title
    }

    #[graphql(name = "goalDescription")]
    async fn goal_description(&self) -> Option<&str> {
        self.goal_description.as_deref()
    }

    #[graphql(name = "targetDate")]
    async fn target_date(&self) -> Option<NaiveDate> {
        self.target_date
    }

    async fn status(&self) -> GoalStatus {
        self.status
    }

    #[graphql(name = "progressPercentage")]
    async fn progress_percentage(&self) -> i32 {
        self.progress_percentage
    }

    #[graphql(name = "createdAt")]
    async fn created_at(&self) -> DateTime<Utc> {
        self.created_at
    }

    #[graphql(name = "updatedAt")]
    async fn updated_at(&self) -> DateTime<Utc> {
        self.updated_at
    }

    /// Employee relationship (lazy-loaded)
    async fn employee(&self, ctx: &async_graphql::Context<'_>) -> GqlResult<crate::models::User> {
        let pool = ctx.data::<PgPool>()?;
        let user = sqlx::query_as::<_, crate::models::User>(
            r#"
            SELECT id, email, first_name, last_name, full_name, phone,
                   department_id, manager_id, hire_date, termination_date,
                   status, created_at, updated_at, deleted_at
            FROM hr_public.users
            WHERE id = $1 AND deleted_at IS NULL
            "#,
        )
        .bind(self.employee_id)
        .fetch_one(pool)
        .await?;

        Ok(user)
    }
}
