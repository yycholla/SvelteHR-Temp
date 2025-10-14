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
    pub employee_id: Uuid,
    pub reviewer_id: Uuid,
    pub review_period: String,
    pub status: PerformanceReviewStatus,
    pub overall_rating: Option<Decimal>,
    pub goals: Option<String>,
    pub achievements: Option<String>,
    pub areas_for_improvement: Option<String>,
    pub manager_feedback: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub review_period_start: Option<chrono::NaiveDate>,
    pub review_period_end: Option<chrono::NaiveDate>,
    pub review_type: Option<String>,
    pub notes: Option<String>,
}

/// GraphQL Object implementation for PerformanceReview
#[Object]
impl PerformanceReview {
    /// Unique performance review identifier
    async fn id(&self) -> Uuid {
        self.id
    }

    /// Employee being reviewed
    async fn employee_id(&self) -> Uuid {
        self.employee_id
    }

    /// Reviewer (usually manager)
    async fn reviewer_id(&self) -> Uuid {
        self.reviewer_id
    }

    /// Review period (e.g., "2025-Q1", "2025-Annual")
    async fn review_period(&self) -> &str {
        &self.review_period
    }

    /// Current status of the review
    async fn status(&self) -> PerformanceReviewStatus {
        self.status
    }

    /// Overall rating (1-5 scale)
    async fn overall_rating(&self) -> Option<String> {
        self.overall_rating.map(|d| d.to_string())
    }

    /// Goals text
    async fn goals(&self) -> Option<&str> {
        self.goals.as_deref()
    }

    /// Achievements text
    async fn achievements(&self) -> Option<&str> {
        self.achievements.as_deref()
    }

    /// Areas for improvement
    async fn areas_for_improvement(&self) -> Option<&str> {
        self.areas_for_improvement.as_deref()
    }

    /// Manager's feedback
    async fn manager_feedback(&self) -> Option<&str> {
        self.manager_feedback.as_deref()
    }

    /// Review period start date
    async fn review_period_start(&self) -> Option<chrono::NaiveDate> {
        self.review_period_start
    }

    /// Review period end date
    async fn review_period_end(&self) -> Option<chrono::NaiveDate> {
        self.review_period_end
    }

    /// Review type (annual, quarterly, probationary, etc.)
    async fn review_type(&self) -> Option<&str> {
        self.review_type.as_deref()
    }

    /// Additional notes
    async fn notes(&self) -> Option<&str> {
        self.notes.as_deref()
    }

    /// Record creation timestamp
    async fn created_at(&self) -> DateTime<Utc> {
        self.created_at
    }

    /// Record last update timestamp
    async fn updated_at(&self) -> DateTime<Utc> {
        self.updated_at
    }

    /// Employee being reviewed
    async fn user_by_employee_id(&self, ctx: &Context<'_>) -> GqlResult<Option<super::user::User>> {
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
        .bind(self.employee_id)
        .fetch_optional(pool)
        .await?;

        Ok(user)
    }

    /// Reviewer (manager conducting the review)
    async fn user_by_reviewer_id(&self, ctx: &Context<'_>) -> GqlResult<Option<super::user::User>> {
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
        .bind(self.reviewer_id)
        .fetch_optional(pool)
        .await?;

        Ok(user)
    }

    /// Whether the review is completed
    async fn is_completed(&self) -> bool {
        self.status == PerformanceReviewStatus::Completed
    }

    /// Whether manager review is complete
    async fn has_manager_review(&self) -> bool {
        self.manager_feedback.is_some() && self.overall_rating.is_some()
    }
}

/// PerformanceReview creation input
#[derive(Debug, Clone, InputObject)]
pub struct CreatePerformanceReviewInput {
    pub employee_id: Uuid,
    pub reviewer_id: Uuid,
    pub review_period: String,
}

/// PerformanceReview update input
#[derive(Debug, Clone, InputObject)]
pub struct UpdatePerformanceReviewInput {
    pub status: Option<PerformanceReviewStatus>,
    /// Overall rating as string (e.g., "4.5") - will be converted to Decimal
    pub overall_rating: Option<String>,
    pub goals: Option<String>,
    pub achievements: Option<String>,
    pub areas_for_improvement: Option<String>,
    pub manager_feedback: Option<String>,
    pub review_period_start: Option<chrono::NaiveDate>,
    pub review_period_end: Option<chrono::NaiveDate>,
    pub review_type: Option<String>,
    pub notes: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_performance_review_model_compiles() {
        let review = PerformanceReview {
            id: Uuid::new_v4(),
            employee_id: Uuid::new_v4(),
            reviewer_id: Uuid::new_v4(),
            review_period: "2025-Annual".to_string(),
            status: PerformanceReviewStatus::InProgress,
            overall_rating: Some(Decimal::new(40, 1)), // 4.0
            goals: Some("Complete project X".to_string()),
            achievements: Some("Delivered feature Y ahead of schedule".to_string()),
            areas_for_improvement: Some("Communication could improve".to_string()),
            manager_feedback: Some("Excellent performance overall".to_string()),
            created_at: Utc::now(),
            updated_at: Utc::now(),
            review_period_start: Some(chrono::NaiveDate::from_ymd_opt(2025, 1, 1).unwrap()),
            review_period_end: Some(chrono::NaiveDate::from_ymd_opt(2025, 12, 31).unwrap()),
            review_type: Some("annual".to_string()),
            notes: Some("Additional notes here".to_string()),
        };

        assert_eq!(review.status, PerformanceReviewStatus::InProgress);
        assert_eq!(review.overall_rating, Some(Decimal::new(40, 1)));
        assert_eq!(review.review_type, Some("annual".to_string()));
        assert_eq!(review.review_period, "2025-Annual".to_string());
    }
}
