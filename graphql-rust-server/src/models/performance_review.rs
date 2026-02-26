//! PerformanceReview domain model with GraphQL integration
//!
//! Represents individual employee performance reviews within review cycles.

use async_graphql::{Context, Enum, InputObject, Object, Result as GqlResult};
use chrono::{DateTime, Utc};
use sea_orm::{entity::prelude::*, Related};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::database::get_db_from_context;

/// Performance review status
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Enum)]
pub enum PerformanceReviewStatus {
    Draft,
    NotStarted,
    InProgress,
    Completed,
}

impl PerformanceReviewStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            PerformanceReviewStatus::Draft => "draft",
            PerformanceReviewStatus::NotStarted => "not_started",
            PerformanceReviewStatus::InProgress => "in_progress",
            PerformanceReviewStatus::Completed => "completed",
        }
    }
}

/// PerformanceReview entity - maps to hr_public.performance_reviews table
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "performance_reviews", schema_name = "hr_public")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub employee_id: Uuid,
    pub reviewer_id: Uuid,
    pub cycle_id: Option<Uuid>,
    pub template_id: Option<Uuid>,
    pub status: String,
    pub overall_rating: Option<i32>,
    pub submitted_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub deleted_at: Option<DateTime<Utc>>,
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
#[Object(name = "performance_review_Model")]
impl Model {
    /// Unique performance review identifier
    async fn id(&self) -> Uuid {
        self.id
    }

    #[graphql(name = "employeeId")]
    /// Employee being reviewed
    async fn employee_id(&self) -> Uuid {
        self.employee_id
    }

    #[graphql(name = "reviewerId")]
    /// Reviewer (usually manager)
    async fn reviewer_id(&self) -> Uuid {
        self.reviewer_id
    }

    #[graphql(name = "cycleId")]
    /// Review cycle ID
    async fn cycle_id(&self) -> Option<Uuid> {
        self.cycle_id
    }

    #[graphql(name = "templateId")]
    /// Review template ID
    async fn template_id(&self) -> Option<Uuid> {
        self.template_id
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

    #[graphql(name = "overallRating")]
    /// Overall rating (1-5 scale)
    async fn overall_rating(&self) -> Option<i32> {
        self.overall_rating
    }

    #[graphql(name = "submittedAt")]
    /// When the review was submitted
    async fn submitted_at(&self) -> Option<DateTime<Utc>> {
        self.submitted_at
    }

    #[graphql(name = "createdAt")]
    /// Record creation timestamp
    async fn created_at(&self) -> DateTime<Utc> {
        self.created_at
    }

    #[graphql(name = "updatedAt")]
    /// Record last update timestamp
    async fn updated_at(&self) -> DateTime<Utc> {
        self.updated_at
    }

    /// Employee being reviewed
    async fn employee(&self, ctx: &Context<'_>) -> GqlResult<Option<super::user::Model>> {
        let db = get_db_from_context(ctx)?;
        let employee = super::user::Entity::find_by_id(self.employee_id)
            .one(&db)
            .await?;
        Ok(employee)
    }

    /// Reviewer (manager conducting the review)
    async fn reviewer(&self, ctx: &Context<'_>) -> GqlResult<Option<super::user::Model>> {
        let db = get_db_from_context(ctx)?;
        let reviewer = super::user::Entity::find_by_id(self.reviewer_id)
            .one(&db)
            .await?;
        Ok(reviewer)
    }

    /// Review goals associated with this review
    async fn goals(&self, ctx: &Context<'_>) -> GqlResult<Vec<super::review_goal::Model>> {
        let db = get_db_from_context(ctx)?;
        let goals = super::review_goal::Entity::find()
            .filter(super::review_goal::Column::ReviewId.eq(self.id))
            .filter(super::review_goal::Column::DeletedAt.is_null())
            .all(&db)
            .await?;
        Ok(goals)
    }

    /// Review feedback associated with this review
    async fn feedback(&self, ctx: &Context<'_>) -> GqlResult<Vec<super::review_feedback::Model>> {
        let db = get_db_from_context(ctx)?;
        let feedback = super::review_feedback::Entity::find()
            .filter(super::review_feedback::Column::ReviewId.eq(self.id))
            .filter(super::review_feedback::Column::DeletedAt.is_null())
            .all(&db)
            .await?;
        Ok(feedback)
    }

    /// Manager feedback (convenience method - filters feedback by type)
    #[graphql(name = "managerFeedback")]
    async fn manager_feedback(&self, ctx: &Context<'_>) -> GqlResult<Option<String>> {
        let db = get_db_from_context(ctx)?;
        let feedback = super::review_feedback::Entity::find()
            .filter(super::review_feedback::Column::ReviewId.eq(self.id))
            .filter(super::review_feedback::Column::FeedbackType.eq("manager"))
            .filter(super::review_feedback::Column::DeletedAt.is_null())
            .one(&db)
            .await?;
        Ok(feedback.map(|f| f.content))
    }

    /// Review cycle this review belongs to
    async fn cycle(&self, ctx: &Context<'_>) -> GqlResult<Option<super::review_cycle::Model>> {
        if let Some(cycle_id) = self.cycle_id {
            let db = get_db_from_context(ctx)?;
            let cycle = super::review_cycle::Entity::find_by_id(cycle_id)
                .filter(super::review_cycle::Column::DeletedAt.is_null())
                .one(&db)
                .await?;
            Ok(cycle)
        } else {
            Ok(None)
        }
    }

    #[graphql(name = "isCompleted")]
    /// Whether the review is completed
    async fn is_completed(&self) -> bool {
        self.status == "completed"
    }
}

/// PerformanceReview creation input
#[derive(Debug, Clone, InputObject)]
pub struct CreatePerformanceReviewInput {
    #[graphql(name = "employeeId")]
    pub employee_id: Uuid,
    #[graphql(name = "reviewerId")]
    pub reviewer_id: Uuid,
    #[graphql(name = "cycleId")]
    pub cycle_id: Option<Uuid>,
    #[graphql(name = "templateId")]
    pub template_id: Option<Uuid>,
}

/// PerformanceReview update input
#[derive(Debug, Clone, InputObject)]
pub struct UpdatePerformanceReviewInput {
    pub status: Option<PerformanceReviewStatus>,
    #[graphql(name = "overallRating")]
    pub overall_rating: Option<i32>,
    #[graphql(name = "cycleId")]
    pub cycle_id: Option<Uuid>,
    #[graphql(name = "templateId")]
    pub template_id: Option<Uuid>,
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
            cycle_id: Some(Uuid::new_v4()),
            template_id: Some(Uuid::new_v4()),
            status: "in_progress".to_string(),
            overall_rating: Some(4),
            submitted_at: None,
            created_at: Utc::now(),
            updated_at: Utc::now(),
            deleted_at: None,
        };

        assert_eq!(review.status, "in_progress");
        assert_eq!(review.overall_rating, Some(4));
    }
}
