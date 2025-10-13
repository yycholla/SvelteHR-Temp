//! PerformanceReview domain model with GraphQL integration
//!
//! Represents individual employee performance reviews within review cycles.

use async_graphql::{Context, Enum, InputObject, Object, Result as GqlResult};
use chrono::{DateTime, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

/// Performance review status
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Enum, sqlx::Type)]
#[sqlx(type_name = "review_status", rename_all = "snake_case")]
pub enum PerformanceReviewStatus {
    Draft,
    NotStarted,
    InProgress,
    Completed,
}

/// PerformanceReview model - maps to hr_public.performance_reviews table
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct PerformanceReview {
    pub id: Uuid,
    pub review_cycle_id: Uuid,
    pub employee_id: Uuid,
    pub reviewer_id: Uuid,
    pub status: PerformanceReviewStatus,
    pub overall_rating: Option<Decimal>,
    pub manager_comments: Option<String>,
    pub employee_self_review: Option<String>,
    pub strengths: Option<String>,
    pub areas_for_improvement: Option<String>,
    pub due_date: Option<DateTime<Utc>>,
    pub completed_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub deleted_at: Option<DateTime<Utc>>,
}

/// GraphQL Object implementation for PerformanceReview
#[Object]
impl PerformanceReview {
    /// Unique performance review identifier
    async fn id(&self) -> Uuid {
        self.id
    }

    /// Review cycle ID (foreign key)
    async fn review_cycle_id(&self) -> Uuid {
        self.review_cycle_id
    }

    /// Employee being reviewed
    async fn employee_id(&self) -> Uuid {
        self.employee_id
    }

    /// Reviewer (usually manager)
    async fn reviewer_id(&self) -> Uuid {
        self.reviewer_id
    }

    /// Current status of the review
    async fn status(&self) -> PerformanceReviewStatus {
        self.status
    }

    /// Overall rating (1-5 scale)
    async fn overall_rating(&self) -> Option<String> {
        self.overall_rating.map(|d| d.to_string())
    }

    /// Manager's comments
    async fn manager_comments(&self) -> Option<&str> {
        self.manager_comments.as_deref()
    }

    /// Employee's self-review
    async fn employee_self_review(&self) -> Option<&str> {
        self.employee_self_review.as_deref()
    }

    /// Employee strengths identified
    async fn strengths(&self) -> Option<&str> {
        self.strengths.as_deref()
    }

    /// Areas for improvement
    async fn areas_for_improvement(&self) -> Option<&str> {
        self.areas_for_improvement.as_deref()
    }

    /// Review due date
    async fn due_date(&self) -> Option<DateTime<Utc>> {
        self.due_date
    }

    /// Completion timestamp
    async fn completed_at(&self) -> Option<DateTime<Utc>> {
        self.completed_at
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

    /// Review cycle this review belongs to
    async fn review_cycle(
        &self,
        ctx: &Context<'_>,
    ) -> GqlResult<Option<super::review_cycle::ReviewCycle>> {
        let pool = ctx.data::<PgPool>()?;

        let cycle = sqlx::query_as::<_, super::review_cycle::ReviewCycle>(
            r#"
            SELECT id, name, description, review_type, start_date, end_date,
                   status, created_by, created_at, updated_at, deleted_at
            FROM hr_public.review_cycles
            WHERE id = $1 AND deleted_at IS NULL
            "#,
        )
        .bind(self.review_cycle_id)
        .fetch_optional(pool)
        .await?;

        Ok(cycle)
    }

    /// Employee being reviewed
    async fn employee(&self, ctx: &Context<'_>) -> GqlResult<Option<super::user::User>> {
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
        .bind(self.employee_id)
        .fetch_optional(pool)
        .await?;

        Ok(user)
    }

    /// Reviewer (manager conducting the review)
    async fn reviewer(&self, ctx: &Context<'_>) -> GqlResult<Option<super::user::User>> {
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
        .bind(self.reviewer_id)
        .fetch_optional(pool)
        .await?;

        Ok(user)
    }

    /// Whether the review is completed
    async fn is_completed(&self) -> bool {
        self.status == PerformanceReviewStatus::Completed
    }

    /// Whether the review is overdue
    async fn is_overdue(&self) -> bool {
        if let Some(due) = self.due_date {
            if self.status != PerformanceReviewStatus::Completed {
                return Utc::now() > due;
            }
        }
        false
    }

    /// Whether employee self-review is complete
    async fn has_self_review(&self) -> bool {
        self.employee_self_review.is_some()
    }

    /// Whether manager review is complete
    async fn has_manager_review(&self) -> bool {
        self.manager_comments.is_some() && self.overall_rating.is_some()
    }

    /// Days until due (negative if overdue)
    async fn days_until_due(&self) -> Option<i64> {
        self.due_date.map(|due| (due - Utc::now()).num_days())
    }

    /// Goals associated with this review
    async fn goals(&self, ctx: &Context<'_>) -> GqlResult<Vec<super::review_goal::ReviewGoal>> {
        let pool = ctx.data::<PgPool>()?;

        let goals = sqlx::query_as::<_, super::review_goal::ReviewGoal>(
            r#"
            SELECT id, performance_review_id, title, description, target_date,
                   completion_status, weight, created_at, updated_at, deleted_at
            FROM hr_public.review_goals
            WHERE performance_review_id = $1 AND deleted_at IS NULL
            ORDER BY weight DESC, created_at ASC
            "#,
        )
        .bind(self.id)
        .fetch_all(pool)
        .await?;

        Ok(goals)
    }

    /// Feedback entries for this review
    async fn feedback(
        &self,
        ctx: &Context<'_>,
    ) -> GqlResult<Vec<super::review_feedback::ReviewFeedback>> {
        let pool = ctx.data::<PgPool>()?;

        let feedback = sqlx::query_as::<_, super::review_feedback::ReviewFeedback>(
            r#"
            SELECT id, performance_review_id, provider_id, feedback_type,
                   content, is_visible_to_employee, created_at, updated_at, deleted_at
            FROM hr_public.review_feedback
            WHERE performance_review_id = $1 AND deleted_at IS NULL
            ORDER BY created_at ASC
            "#,
        )
        .bind(self.id)
        .fetch_all(pool)
        .await?;

        Ok(feedback)
    }

    /// Count of goals for this review
    async fn goals_count(&self, ctx: &Context<'_>) -> GqlResult<i64> {
        let pool = ctx.data::<PgPool>()?;

        let count: (i64,) = sqlx::query_as(
            r#"
            SELECT COUNT(*)::bigint
            FROM hr_public.review_goals
            WHERE performance_review_id = $1 AND deleted_at IS NULL
            "#,
        )
        .bind(self.id)
        .fetch_one(pool)
        .await?;

        Ok(count.0)
    }

    /// Count of completed goals
    async fn completed_goals_count(&self, ctx: &Context<'_>) -> GqlResult<i64> {
        let pool = ctx.data::<PgPool>()?;

        let count: (i64,) = sqlx::query_as(
            r#"
            SELECT COUNT(*)::bigint
            FROM hr_public.review_goals
            WHERE performance_review_id = $1
              AND completion_status = 'completed'
              AND deleted_at IS NULL
            "#,
        )
        .bind(self.id)
        .fetch_one(pool)
        .await?;

        Ok(count.0)
    }

    /// Goals completion percentage
    async fn goals_completion_percentage(&self, ctx: &Context<'_>) -> GqlResult<Option<i32>> {
        let pool = ctx.data::<PgPool>()?;

        // Get total goals count
        let total_count: (i64,) = sqlx::query_as(
            r#"
            SELECT COUNT(*)::bigint
            FROM hr_public.review_goals
            WHERE performance_review_id = $1 AND deleted_at IS NULL
            "#,
        )
        .bind(self.id)
        .fetch_one(pool)
        .await?;

        let total = total_count.0;
        if total == 0 {
            return Ok(None);
        }

        // Get completed goals count
        let completed_count: (i64,) = sqlx::query_as(
            r#"
            SELECT COUNT(*)::bigint
            FROM hr_public.review_goals
            WHERE performance_review_id = $1
              AND completion_status = 'completed'
              AND deleted_at IS NULL
            "#,
        )
        .bind(self.id)
        .fetch_one(pool)
        .await?;

        let completed = completed_count.0;
        let percentage = ((completed as f64 / total as f64) * 100.0).round() as i32;

        Ok(Some(percentage))
    }
}

/// PerformanceReview creation input
#[derive(Debug, Clone, InputObject)]
pub struct CreatePerformanceReviewInput {
    pub review_cycle_id: Uuid,
    pub employee_id: Uuid,
    pub reviewer_id: Uuid,
    pub due_date: Option<DateTime<Utc>>,
}

/// PerformanceReview update input
#[derive(Debug, Clone, InputObject)]
pub struct UpdatePerformanceReviewInput {
    pub status: Option<PerformanceReviewStatus>,
    /// Overall rating as string (e.g., "4.5") - will be converted to Decimal
    pub overall_rating: Option<String>,
    pub manager_comments: Option<String>,
    pub employee_self_review: Option<String>,
    pub strengths: Option<String>,
    pub areas_for_improvement: Option<String>,
    pub due_date: Option<DateTime<Utc>>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_performance_review_model_compiles() {
        let review = PerformanceReview {
            id: Uuid::new_v4(),
            review_cycle_id: Uuid::new_v4(),
            employee_id: Uuid::new_v4(),
            reviewer_id: Uuid::new_v4(),
            status: PerformanceReviewStatus::InProgress,
            overall_rating: Some(Decimal::new(40, 1)), // 4.0
            manager_comments: Some("Excellent performance".to_string()),
            employee_self_review: Some("I believe I've met my goals".to_string()),
            strengths: Some("Strong technical skills".to_string()),
            areas_for_improvement: Some("Communication could improve".to_string()),
            due_date: Some(Utc::now()),
            completed_at: None,
            created_at: Utc::now(),
            updated_at: Utc::now(),
            deleted_at: None,
        };

        assert_eq!(review.status, PerformanceReviewStatus::InProgress);
        assert_eq!(review.overall_rating, Some(Decimal::new(40, 1)));
    }
}
