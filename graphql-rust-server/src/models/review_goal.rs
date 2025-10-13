//! ReviewGoal domain model with GraphQL integration
//!
//! Represents goals and objectives set during performance reviews.

use async_graphql::{Context, Enum, InputObject, Object, Result as GqlResult};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

/// Goal completion status
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Enum, sqlx::Type)]
#[sqlx(type_name = "goal_completion_status", rename_all = "snake_case")]
pub enum GoalCompletionStatus {
    NotStarted,
    InProgress,
    Completed,
    Deferred,
    Cancelled,
}

/// ReviewGoal model - maps to hr_public.review_goals table
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct ReviewGoal {
    pub id: Uuid,
    pub performance_review_id: Uuid,
    pub title: String,
    pub description: Option<String>,
    pub target_date: Option<DateTime<Utc>>,
    pub completion_status: GoalCompletionStatus,
    pub weight: Option<i32>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub deleted_at: Option<DateTime<Utc>>,
}

/// GraphQL Object implementation for ReviewGoal
#[Object]
impl ReviewGoal {
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
        self.completion_status
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
    ) -> GqlResult<Option<super::performance_review::PerformanceReview>> {
        let pool = ctx.data::<PgPool>()?;

        let review = sqlx::query_as::<_, super::performance_review::PerformanceReview>(
            r#"
            SELECT id, review_cycle_id, employee_id, reviewer_id, status,
                   overall_rating, manager_comments, employee_self_review,
                   strengths, areas_for_improvement, due_date, completed_at,
                   created_at, updated_at, deleted_at
            FROM hr_public.performance_reviews
            WHERE id = $1 AND deleted_at IS NULL
            "#,
        )
        .bind(self.performance_review_id)
        .fetch_optional(pool)
        .await?;

        Ok(review)
    }

    /// Whether the goal is completed
    async fn is_completed(&self) -> bool {
        self.completion_status == GoalCompletionStatus::Completed
    }

    /// Whether the goal is overdue
    async fn is_overdue(&self) -> bool {
        if let Some(target) = self.target_date {
            if self.completion_status != GoalCompletionStatus::Completed
                && self.completion_status != GoalCompletionStatus::Cancelled
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
        match self.completion_status {
            GoalCompletionStatus::NotStarted => 0,
            GoalCompletionStatus::InProgress => 50,
            GoalCompletionStatus::Completed => 100,
            GoalCompletionStatus::Deferred => 25,
            GoalCompletionStatus::Cancelled => 0,
        }
    }

    /// Whether goal is active (not completed or cancelled)
    async fn is_active(&self) -> bool {
        !matches!(
            self.completion_status,
            GoalCompletionStatus::Completed | GoalCompletionStatus::Cancelled
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
        let goal = ReviewGoal {
            id: Uuid::new_v4(),
            performance_review_id: Uuid::new_v4(),
            title: "Improve code quality".to_string(),
            description: Some("Reduce technical debt by 30%".to_string()),
            target_date: Some(Utc::now()),
            completion_status: GoalCompletionStatus::InProgress,
            weight: Some(80),
            created_at: Utc::now(),
            updated_at: Utc::now(),
            deleted_at: None,
        };

        assert_eq!(goal.completion_status, GoalCompletionStatus::InProgress);
        assert_eq!(goal.weight, Some(80));
    }
}
