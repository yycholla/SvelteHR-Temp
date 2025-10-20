//! ReviewGoal domain model with GraphQL integration
//!
//! Represents goals and objectives set during performance reviews.

use async_graphql::{Context, Enum, InputObject, Object, Result as GqlResult};
use chrono::{DateTime, Utc};
use sea_orm::{entity::prelude::*, FromQueryResult, Related};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::{database::get_db_from_context, error::AppError, models::generated::prelude::*};

/// Goal completion status
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Enum)]
pub enum GoalCompletionStatus {
    NotStarted,
    InProgress,
    Completed,
    Deferred,
    Cancelled,
}

impl GoalCompletionStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            GoalCompletionStatus::NotStarted => "not_started",
            GoalCompletionStatus::InProgress => "in_progress",
            GoalCompletionStatus::Completed => "completed",
            GoalCompletionStatus::Deferred => "deferred",
            GoalCompletionStatus::Cancelled => "cancelled",
        }
    }
}

/// ReviewGoal entity - maps to hr_public.review_goals table
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "review_goals", schema_name = "hr_public")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub performance_review_id: Uuid,
    pub title: String,
    pub description: Option<String>,
    pub target_date: Option<DateTime<Utc>>,
    pub completion_status: String, // Using string to match database enum
    pub weight: Option<i32>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub deleted_at: Option<DateTime<Utc>>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::performance_review::Entity",
        from = "Column::PerformanceReviewId",
        to = "super::performance_review::Column::Id"
    )]
    PerformanceReview,
}

impl Related<super::performance_review::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::PerformanceReview.def().rev()
    }
}

impl ActiveModelBehavior for ActiveModel {}

/// GraphQL Object implementation for ReviewGoal
#[Object(name = "review_goal_Model")]
impl Model {
    /// Unique review goal identifier
    async fn id(&self) -> Uuid {
        self.id
    }

    /// Performance review ID (foreign key)
    async fn performance_review_id(&self) -> Uuid {
        self.performance_review_id
    }

    /// Goal title
    async fn title(&self) -> &str {
        &self.title
    }

    /// Goal description
    async fn description(&self) -> Option<&str> {
        self.description.as_deref()
    }

    /// Target completion date
    async fn target_date(&self) -> Option<DateTime<Utc>> {
        self.target_date
    }

    /// Current completion status
    async fn completion_status(&self) -> GoalCompletionStatus {
        match self.completion_status.as_str() {
            "not_started" => GoalCompletionStatus::NotStarted,
            "in_progress" => GoalCompletionStatus::InProgress,
            "completed" => GoalCompletionStatus::Completed,
            "deferred" => GoalCompletionStatus::Deferred,
            "cancelled" => GoalCompletionStatus::Cancelled,
            _ => GoalCompletionStatus::NotStarted, // Default fallback
        }
    }

    /// Goal weight/importance (0-100)
    async fn weight(&self) -> Option<i32> {
        self.weight
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

    /// Performance review this goal belongs to
    async fn performance_review(
        &self,
        ctx: &Context<'_>,
    ) -> GqlResult<Option<super::performance_review::Model>> {
        let db = get_db_from_context(ctx)?;
        let review = super::performance_review::Entity::find_by_id(self.performance_review_id).one(&db).await?;
        Ok(review)
    }

    /// Whether the goal is completed
    async fn is_completed(&self) -> bool {
        self.completion_status == "completed"
    }

    /// Whether the goal is overdue
    async fn is_overdue(&self) -> bool {
        if let Some(target) = self.target_date {
            if self.completion_status != "completed"
                && self.completion_status != "cancelled"
            {
                return Utc::now() > target;
            }
        }
        false
    }

    /// Days until target date (negative if overdue)
    async fn days_until_target(&self) -> Option<i64> {
        self.target_date
            .map(|target| (target - Utc::now()).num_days())
    }

    /// Progress percentage (0-100) based on status
    async fn progress_percentage(&self) -> i32 {
        match self.completion_status.as_str() {
            "not_started" => 0,
            "in_progress" => 50,
            "completed" => 100,
            "deferred" => 25,
            "cancelled" => 0,
            _ => 0,
        }
    }

    /// Whether goal is active (not completed or cancelled)
    async fn is_active(&self) -> bool {
        !matches!(
            self.completion_status.as_str(),
            "completed" | "cancelled"
        )
    }
}

/// ReviewGoal creation input
#[derive(Debug, Clone, InputObject)]
pub struct CreateReviewGoalInput {
    pub performance_review_id: Uuid,
    pub title: String,
    pub description: Option<String>,
    pub target_date: Option<DateTime<Utc>>,
    pub weight: Option<i32>,
}

/// ReviewGoal update input
#[derive(Debug, Clone, InputObject)]
pub struct UpdateReviewGoalInput {
    pub title: Option<String>,
    pub description: Option<String>,
    pub target_date: Option<DateTime<Utc>>,
    pub completion_status: Option<GoalCompletionStatus>,
    pub weight: Option<i32>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_review_goal_model_compiles() {
        let goal = Model {
            id: Uuid::new_v4(),
            performance_review_id: Uuid::new_v4(),
            title: "Improve code quality".to_string(),
            description: Some("Reduce technical debt by 30%".to_string()),
            target_date: Some(Utc::now()),
            completion_status: "in_progress".to_string(),
            weight: Some(80),
            created_at: Utc::now(),
            updated_at: Utc::now(),
            deleted_at: None,
        };

        assert_eq!(goal.completion_status, "in_progress");
        assert_eq!(goal.weight, Some(80));
    }
}
