//! ReviewCycle domain model with GraphQL integration
//!
//! Represents review periods (annual, quarterly, etc.) for performance reviews.

use async_graphql::{Context, Enum, InputObject, Object, Result as GqlResult};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

/// Review cycle status
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Enum, sqlx::Type)]
#[sqlx(type_name = "review_cycle_status", rename_all = "lowercase")]
pub enum ReviewCycleStatus {
    Draft,
    Active,
    Closed,
}

/// Review type/frequency
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Enum, sqlx::Type)]
#[sqlx(type_name = "review_type", rename_all = "snake_case")]
pub enum ReviewType {
    AnnualReview,
    MidYearReview,
    QuarterlyReview,
    ProbationaryReview,
    PerformanceImprovementPlan,
    NinetyDayReview,
    ProjectBasedReview,
    PromotionReview,
    ExitReview,
    SelfReview,
}

/// ReviewCycle model - maps to hr_public.review_cycles table
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct ReviewCycle {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub review_type: ReviewType,
    pub start_date: DateTime<Utc>,
    pub end_date: DateTime<Utc>,
    pub status: ReviewCycleStatus,
    pub created_by: Uuid,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub deleted_at: Option<DateTime<Utc>>,
}

/// GraphQL Object implementation for ReviewCycle
#[Object]
impl ReviewCycle {
    /// Unique review cycle identifier
    async fn id(&self) -> Uuid {
        self.id
    }

    /// Review cycle name
    async fn name(&self) -> &str {
        &self.name
    }

    /// Review cycle description
    async fn description(&self) -> Option<&str> {
        self.description.as_deref()
    }

    /// Type of review cycle
    async fn review_type(&self) -> ReviewType {
        self.review_type
    }

    /// Cycle start date
    async fn start_date(&self) -> DateTime<Utc> {
        self.start_date
    }

    /// Cycle end date
    async fn end_date(&self) -> DateTime<Utc> {
        self.end_date
    }

    /// Current status of the cycle
    async fn status(&self) -> ReviewCycleStatus {
        self.status
    }

    /// User ID who created the cycle
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

    /// User who created the cycle
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

    /// Whether the cycle is currently active
    async fn is_active(&self) -> bool {
        self.status == ReviewCycleStatus::Active
    }

    /// Whether the cycle is in the past
    async fn is_past(&self) -> bool {
        Utc::now() > self.end_date
    }

    /// Whether the cycle is in the future
    async fn is_upcoming(&self) -> bool {
        Utc::now() < self.start_date
    }

    /// Duration of the cycle in days
    async fn duration_days(&self) -> i64 {
        (self.end_date - self.start_date).num_days()
    }

    /// Count of reviews in this cycle
    async fn review_count(&self, ctx: &Context<'_>) -> GqlResult<i64> {
        let pool = ctx.data::<PgPool>()?;

        let count: (i64,) = sqlx::query_as(
            r#"
            SELECT COUNT(*)::bigint
            FROM hr_public.performance_reviews
            WHERE review_cycle_id = $1 AND deleted_at IS NULL
            "#,
        )
        .bind(self.id)
        .fetch_one(pool)
        .await?;

        Ok(count.0)
    }

    /// Count of completed reviews in this cycle
    async fn completed_review_count(&self, ctx: &Context<'_>) -> GqlResult<i64> {
        let pool = ctx.data::<PgPool>()?;

        let count: (i64,) = sqlx::query_as(
            r#"
            SELECT COUNT(*)::bigint
            FROM hr_public.performance_reviews
            WHERE review_cycle_id = $1
              AND status = 'completed'
              AND deleted_at IS NULL
            "#,
        )
        .bind(self.id)
        .fetch_one(pool)
        .await?;

        Ok(count.0)
    }
}

/// ReviewCycle creation input
#[derive(Debug, Clone, InputObject)]
pub struct CreateReviewCycleInput {
    pub name: String,
    pub description: Option<String>,
    pub review_type: ReviewType,
    pub start_date: DateTime<Utc>,
    pub end_date: DateTime<Utc>,
}

/// ReviewCycle update input
#[derive(Debug, Clone, InputObject)]
pub struct UpdateReviewCycleInput {
    pub name: Option<String>,
    pub description: Option<String>,
    pub start_date: Option<DateTime<Utc>>,
    pub end_date: Option<DateTime<Utc>>,
    pub status: Option<ReviewCycleStatus>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_review_cycle_model_compiles() {
        let cycle = ReviewCycle {
            id: Uuid::new_v4(),
            name: "2025 Annual Review".to_string(),
            description: Some("Annual performance review cycle".to_string()),
            review_type: ReviewType::AnnualReview,
            start_date: Utc::now(),
            end_date: Utc::now(),
            status: ReviewCycleStatus::Draft,
            created_by: Uuid::new_v4(),
            created_at: Utc::now(),
            updated_at: Utc::now(),
            deleted_at: None,
        };

        assert_eq!(cycle.review_type, ReviewType::AnnualReview);
        assert_eq!(cycle.status, ReviewCycleStatus::Draft);
    }
}
