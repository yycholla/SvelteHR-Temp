//! PerformanceReview domain model with GraphQL integration
//!
//! Represents individual employee performance reviews within review cycles.

use async_graphql::{Context, Enum, InputObject, Object, Result as GqlResult};
use chrono::{DateTime, Utc};
use rust_decimal::Decimal;
use sea_orm::{entity::prelude::*, FromQueryResult, Related};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::{database::get_db_from_context, error::AppError, models::generated::prelude::*};

/// Performance review status
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Enum)]
pub enum PerformanceReviewStatus {
    Draft,
    NotStarted,
    InProgress,
    Completed,
}

/// PerformanceReview entity - maps to hr_public.performance_reviews table
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "performance_reviews")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub employee_id: Uuid,
    pub reviewer_id: Uuid,
    pub review_period: String,
    pub status: String,
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

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::user::Entity",
        from = "Column::EmployeeId",
        to = "super::user::Column::Id"
    )]
    Employee,
    #[sea_orm(
        belongs_to = "super::user::Entity",
        from = "Column::ReviewerId",
        to = "super::user::Column::Id"
    )]
    Reviewer,
}

impl Related<super::user::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Employee.def().rev()
    }
}

impl ActiveModelBehavior for ActiveModel {}

/// GraphQL Object implementation for PerformanceReview
#[Object]
impl Model {
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
        match self.status.as_str() {
            "draft" => PerformanceReviewStatus::Draft,
            "not_started" => PerformanceReviewStatus::NotStarted,
            "in_progress" => PerformanceReviewStatus::InProgress,
            "completed" => PerformanceReviewStatus::Completed,
            _ => PerformanceReviewStatus::Draft, // Default fallback
        }
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
    async fn employee(&self, ctx: &Context<'_>) -> GqlResult<Option<super::user::Model>> {
        let db = get_db_from_context(ctx)?;
        let employee = super::user::Entity::find_by_id(self.employee_id).one(db).await?;
        Ok(employee)
    }

    /// Reviewer (manager conducting the review)
    async fn reviewer(&self, ctx: &Context<'_>) -> GqlResult<Option<super::user::Model>> {
        let db = get_db_from_context(ctx)?;
        let reviewer = super::user::Entity::find_by_id(self.reviewer_id).one(db).await?;
        Ok(reviewer)
    }

    /// Employee being reviewed (legacy resolver for compatibility)
    async fn user_by_employee_id(&self, ctx: &Context<'_>) -> GqlResult<Option<super::user::Model>> {
        let db = get_db_from_context(ctx)?;
        let user = super::user::Entity::find_by_id(self.employee_id).one(db).await?;
        Ok(user)
    }

    /// Reviewer (manager conducting the review) (legacy resolver for compatibility)
    async fn user_by_reviewer_id(&self, ctx: &Context<'_>) -> GqlResult<Option<super::user::Model>> {
        let db = get_db_from_context(ctx)?;
        let reviewer = super::user::Entity::find_by_id(self.reviewer_id).one(db).await?;
        Ok(reviewer)
    }

    /// Whether the review is completed
    async fn is_completed(&self) -> bool {
        self.status == "completed"
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
        let review = Model {
            id: Uuid::new_v4(),
            employee_id: Uuid::new_v4(),
            reviewer_id: Uuid::new_v4(),
            review_period: "2025-Annual".to_string(),
            status: "in_progress".to_string(),
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

        assert_eq!(review.status, "in_progress");
        assert_eq!(review.overall_rating, Some(Decimal::new(40, 1)));
        assert_eq!(review.review_type, Some("annual".to_string()));
        assert_eq!(review.review_period, "2025-Annual".to_string());
    }
}
