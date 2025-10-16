//! ReviewCycle domain model with GraphQL integration
//!
//! Represents review periods (annual, quarterly, etc.) for performance reviews.

use async_graphql::{Context, Enum, InputObject, Object, Result as GqlResult};
use chrono::{DateTime, Utc};
use sea_orm::{entity::prelude::*, FromQueryResult, Related};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::{database::get_db_from_context, error::AppError, models::generated::prelude::*};

/// Review cycle status
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Enum)]
pub enum ReviewCycleStatus {
    Draft,
    Active,
    Closed,
}

impl ReviewCycleStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            ReviewCycleStatus::Draft => "draft",
            ReviewCycleStatus::Active => "active",
            ReviewCycleStatus::Closed => "closed",
        }
    }
}

/// Review type/frequency
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Enum)]
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

impl ReviewType {
    pub fn as_str(&self) -> &'static str {
        match self {
            ReviewType::AnnualReview => "annual_review",
            ReviewType::MidYearReview => "mid_year_review",
            ReviewType::QuarterlyReview => "quarterly_review",
            ReviewType::ProbationaryReview => "probationary_review",
            ReviewType::PerformanceImprovementPlan => "performance_improvement_plan",
            ReviewType::NinetyDayReview => "ninety_day_review",
            ReviewType::ProjectBasedReview => "project_based_review",
            ReviewType::PromotionReview => "promotion_review",
            ReviewType::ExitReview => "exit_review",
            ReviewType::SelfReview => "self_review",
        }
    }
}

/// ReviewCycle entity - maps to hr_public.review_cycles table
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "review_cycles")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub review_type: String, // Using string to match database enum
    pub start_date: DateTime<Utc>,
    pub end_date: DateTime<Utc>,
    pub status: String, // Using string to match database enum
    pub created_by: Uuid,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub deleted_at: Option<DateTime<Utc>>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::user::Entity",
        from = "Column::CreatedBy",
        to = "super::user::Column::Id"
    )]
    Creator,
}

impl Related<super::user::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Creator.def().rev()
    }
}

impl ActiveModelBehavior for ActiveModel {}

/// GraphQL Object implementation for ReviewCycle
#[Object(name = "review_cycle_Model")]
impl Model {
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
        match self.review_type.as_str() {
            "annual_review" => ReviewType::AnnualReview,
            "mid_year_review" => ReviewType::MidYearReview,
            "quarterly_review" => ReviewType::QuarterlyReview,
            "probationary_review" => ReviewType::ProbationaryReview,
            "performance_improvement_plan" => ReviewType::PerformanceImprovementPlan,
            "ninety_day_review" => ReviewType::NinetyDayReview,
            "project_based_review" => ReviewType::ProjectBasedReview,
            "promotion_review" => ReviewType::PromotionReview,
            "exit_review" => ReviewType::ExitReview,
            "self_review" => ReviewType::SelfReview,
            _ => ReviewType::AnnualReview, // Default fallback
        }
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
        match self.status.as_str() {
            "draft" => ReviewCycleStatus::Draft,
            "active" => ReviewCycleStatus::Active,
            "closed" => ReviewCycleStatus::Closed,
            _ => ReviewCycleStatus::Draft, // Default fallback
        }
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
    async fn creator(&self, ctx: &Context<'_>) -> GqlResult<Option<super::user::Model>> {
        let db = get_db_from_context(ctx)?;
        let user = super::user::Entity::find_by_id(self.created_by).one(&db).await?;
        Ok(user)
    }

    /// Whether the cycle is currently active
    async fn is_active(&self) -> bool {
        self.status == "active"
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
        // TODO: Implement with proper relation to performance_reviews
        Ok(0)
    }

    /// Count of completed reviews in this cycle
    async fn completed_review_count(&self, ctx: &Context<'_>) -> GqlResult<i64> {
        // TODO: Implement with proper relation to performance_reviews
        Ok(0)
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
        let cycle = Model {
            id: Uuid::new_v4(),
            name: "2025 Annual Review".to_string(),
            description: Some("Annual performance review cycle".to_string()),
            review_type: "annual_review".to_string(),
            start_date: Utc::now(),
            end_date: Utc::now(),
            status: "draft".to_string(),
            created_by: Uuid::new_v4(),
            created_at: Utc::now(),
            updated_at: Utc::now(),
            deleted_at: None,
        };

        assert_eq!(cycle.review_type, "annual_review");
        assert_eq!(cycle.status, "draft");
    }
}
