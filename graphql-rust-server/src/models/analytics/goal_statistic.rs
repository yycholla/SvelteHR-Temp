//! Goal Statistic Model (Materialized View)
//!
//! Maps to hr_public.goal_statistics materialized view
//! READ-ONLY - refreshed via explicit mutation

use async_graphql::{Object, Result as GqlResult};
use chrono::{DateTime, Utc};
use sea_orm::{entity::prelude::*, FromQueryResult, QueryFilter};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

use crate::{database::get_db_from_context, error::AppError};

/// Goal completion statistics by user and quarter (materialized view)
#[derive(Debug, Clone, Serialize, Deserialize, FromQueryResult)]
pub struct Model {
    pub user_id: Uuid,
    pub first_name: String,
    pub last_name: String,
    pub department_id: Option<Uuid>,
    pub quarter: String,
    pub year: i32,
    pub total_goals: i32,
    pub completed_goals: i32,
    pub completion_percentage: f64,
    pub last_refreshed_at: DateTime<Utc>,
}

/// SQLx-compatible GoalStatistic struct for backward compatibility during migration
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct GoalStatistic {
    pub user_id: Uuid,
    pub first_name: String,
    pub last_name: String,
    pub department_id: Option<Uuid>,
    pub quarter: String,
    pub year: i32,
    pub total_goals: i32,
    pub completed_goals: i32,
    pub completion_percentage: f64,
    pub last_refreshed_at: DateTime<Utc>,
}

/// GraphQL Object implementation with camelCase field names
#[Object(name = "analytics_goal_statistic_Model")]
impl Model {
    #[graphql(name = "userId")]
    async fn user_id(&self) -> Uuid {
        self.user_id
    }

    #[graphql(name = "firstName")]
    async fn first_name(&self) -> &str {
        &self.first_name
    }

    #[graphql(name = "lastName")]
    async fn last_name(&self) -> &str {
        &self.last_name
    }

    #[graphql(name = "departmentId")]
    async fn department_id(&self) -> Option<Uuid> {
        self.department_id
    }

    async fn quarter(&self) -> &str {
        &self.quarter
    }

    async fn year(&self) -> i32 {
        self.year
    }

    #[graphql(name = "totalGoals")]
    async fn total_goals(&self) -> i32 {
        self.total_goals
    }

    #[graphql(name = "completedGoals")]
    async fn completed_goals(&self) -> i32 {
        self.completed_goals
    }

    #[graphql(name = "completionPercentage")]
    async fn completion_percentage(&self) -> f64 {
        self.completion_percentage
    }

    #[graphql(name = "lastRefreshedAt")]
    async fn last_refreshed_at(&self) -> DateTime<Utc> {
        self.last_refreshed_at
    }

    /// User relationship (lazy-loaded)
    async fn user(
        &self,
        ctx: &async_graphql::Context<'_>,
    ) -> GqlResult<crate::models::user::Model> {
        let db = get_db_from_context(ctx)?;
        let user = crate::models::user::Entity::find_by_id(self.user_id)
            .filter(crate::models::user::Column::DeletedAt.is_null())
            .one(&db)
            .await?
            .ok_or_else(|| AppError::NotFound("User not found".to_string()))?;

        Ok(user)
    }
}
