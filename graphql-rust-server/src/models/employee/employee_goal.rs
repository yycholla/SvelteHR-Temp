//! Employee Goal Model
//!
//! Maps to hr_public.employee_goals table

use async_graphql::{Enum, InputObject, Object, Result as GqlResult};
use chrono::{DateTime, NaiveDate, Utc};
use sea_orm::{entity::prelude::*, QueryFilter};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::{database::get_db_from_context, error::AppError};

/// Goal status enumeration
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Enum)]
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

impl GoalStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            GoalStatus::NotStarted => "not_started",
            GoalStatus::InProgress => "in_progress",
            GoalStatus::Completed => "completed",
            GoalStatus::Cancelled => "cancelled",
        }
    }
}

/// Employee goal tracking
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "employee_goals", schema_name = "hr_public")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub employee_id: Uuid,
    #[sea_orm(column_name = "title")]
    pub title: String,
    #[sea_orm(column_name = "description")]
    pub description: Option<String>,
    pub target_date: Option<DateTime<Utc>>,
    pub status: String, // Will be converted to enum in GraphQL
    #[sea_orm(column_name = "progress")]
    pub progress_percentage: i32,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub deleted_at: Option<DateTime<Utc>>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "crate::models::user::Entity",
        from = "Column::EmployeeId",
        to = "crate::models::user::Column::Id"
    )]
    Employee,
}

impl ActiveModelBehavior for ActiveModel {}

/// Input for creating a new employee goal
#[derive(Debug, Clone, InputObject)]
pub struct CreateEmployeeGoalInput {
    #[graphql(name = "employeeId")]
    pub employee_id: Uuid,
    pub title: String,
    pub description: Option<String>,
    #[graphql(name = "targetDate")]
    pub target_date: Option<DateTime<Utc>>,
    pub status: Option<GoalStatus>,
    #[graphql(name = "progressPercentage")]
    pub progress_percentage: Option<i32>,
}

/// Input for updating an employee goal
#[derive(Debug, Clone, InputObject)]
pub struct UpdateEmployeeGoalInput {
    pub title: Option<String>,
    pub description: Option<String>,
    #[graphql(name = "targetDate")]
    pub target_date: Option<DateTime<Utc>>,
    pub status: Option<GoalStatus>,
    #[graphql(name = "progressPercentage")]
    pub progress_percentage: Option<i32>,
}

/// GraphQL Object implementation with camelCase field names
#[Object(name = "employee_employee_goal_Model")]
impl Model {
    async fn id(&self) -> Uuid {
        self.id
    }

    #[graphql(name = "employeeId")]
    async fn employee_id(&self) -> Uuid {
        self.employee_id
    }

    #[graphql(name = "goalTitle")]
    async fn goal_title(&self) -> &str {
        &self.title
    }

    #[graphql(name = "goalDescription")]
    async fn goal_description(&self) -> Option<&str> {
        self.description.as_deref()
    }

    #[graphql(name = "targetDate")]
    async fn target_date(&self) -> Option<DateTime<Utc>> {
        self.target_date
    }

    async fn status(&self) -> GoalStatus {
        match self.status.as_str() {
            "not_started" => GoalStatus::NotStarted,
            "in_progress" => GoalStatus::InProgress,
            "completed" => GoalStatus::Completed,
            "cancelled" => GoalStatus::Cancelled,
            _ => GoalStatus::NotStarted, // Default fallback
        }
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
        let db = get_db_from_context(ctx)?;
        let user = crate::models::user::Entity::find_by_id(self.employee_id)
            .one(&db)
            .await?
            .ok_or_else(|| AppError::NotFound("User not found".to_string()))?;

        Ok(user)
    }
}
