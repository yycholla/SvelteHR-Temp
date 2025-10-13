//! ReviewFeedback domain model with GraphQL integration
//!
//! Represents feedback and comments provided during performance reviews.

use async_graphql::{Context, Enum, InputObject, Object, Result as GqlResult};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

/// Feedback type/source
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Enum, sqlx::Type)]
#[sqlx(type_name = "feedback_type", rename_all = "snake_case")]
pub enum FeedbackType {
    Manager,
    Peer,
    SelfReview,
    SkipLevel,
    DirectReport,
    Customer,
}

/// ReviewFeedback model - maps to hr_public.review_feedback table
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct ReviewFeedback {
    pub id: Uuid,
    pub performance_review_id: Uuid,
    pub provider_id: Uuid,
    pub feedback_type: FeedbackType,
    pub content: String,
    pub is_visible_to_employee: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub deleted_at: Option<DateTime<Utc>>,
}

/// GraphQL Object implementation for ReviewFeedback
#[Object]
impl ReviewFeedback {
    /// Unique review feedback identifier
    async fn id(&self) -> Uuid {
        self.id
    }

    /// Performance review ID (foreign key)
    async fn performance_review_id(&self) -> Uuid {
        self.performance_review_id
    }

    /// User ID who provided the feedback
    async fn provider_id(&self) -> Uuid {
        self.provider_id
    }

    /// Type of feedback
    async fn feedback_type(&self) -> FeedbackType {
        self.feedback_type
    }

    /// Feedback content/comments
    async fn content(&self) -> &str {
        &self.content
    }

    /// Whether this feedback is visible to the employee
    async fn is_visible_to_employee(&self) -> bool {
        self.is_visible_to_employee
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

    /// Performance review this feedback belongs to
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

    /// User who provided the feedback
    async fn provider(&self, ctx: &Context<'_>) -> GqlResult<Option<super::user::User>> {
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
        .bind(self.provider_id)
        .fetch_optional(pool)
        .await?;

        Ok(user)
    }

    /// Whether this is manager feedback
    async fn is_manager_feedback(&self) -> bool {
        self.feedback_type == FeedbackType::Manager
    }

    /// Whether this is peer feedback
    async fn is_peer_feedback(&self) -> bool {
        self.feedback_type == FeedbackType::Peer
    }

    /// Whether this is self-review feedback
    async fn is_self_review(&self) -> bool {
        self.feedback_type == FeedbackType::SelfReview
    }

    /// Whether this is 360-degree feedback (peer, skip, direct report, customer)
    async fn is_360_feedback(&self) -> bool {
        matches!(
            self.feedback_type,
            FeedbackType::Peer
                | FeedbackType::SkipLevel
                | FeedbackType::DirectReport
                | FeedbackType::Customer
        )
    }

    /// Character count of feedback content
    async fn content_length(&self) -> i32 {
        self.content.len() as i32
    }

    /// Word count estimate of feedback content
    async fn word_count(&self) -> i32 {
        self.content.split_whitespace().count() as i32
    }
}

/// ReviewFeedback creation input
#[derive(Debug, Clone, InputObject)]
pub struct CreateReviewFeedbackInput {
    pub performance_review_id: Uuid,
    pub feedback_type: FeedbackType,
    pub content: String,
    pub is_visible_to_employee: Option<bool>,
}

/// ReviewFeedback update input
#[derive(Debug, Clone, InputObject)]
pub struct UpdateReviewFeedbackInput {
    pub content: Option<String>,
    pub is_visible_to_employee: Option<bool>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_review_feedback_model_compiles() {
        let feedback = ReviewFeedback {
            id: Uuid::new_v4(),
            performance_review_id: Uuid::new_v4(),
            provider_id: Uuid::new_v4(),
            feedback_type: FeedbackType::Manager,
            content: "Excellent work on the project delivery".to_string(),
            is_visible_to_employee: true,
            created_at: Utc::now(),
            updated_at: Utc::now(),
            deleted_at: None,
        };

        assert_eq!(feedback.feedback_type, FeedbackType::Manager);
        assert!(feedback.is_visible_to_employee);
    }
}
