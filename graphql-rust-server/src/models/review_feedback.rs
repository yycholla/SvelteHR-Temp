//! ReviewFeedback domain model with GraphQL integration
//!
//! Represents feedback and comments provided during performance reviews.

use async_graphql::{Context, Enum, InputObject, Object, Result as GqlResult};
use chrono::{DateTime, Utc};
use sea_orm::{entity::prelude::*, Related};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::{database::get_db_from_context, models::generated::prelude::*};

/// Feedback type/source
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Enum)]
pub enum FeedbackType {
    Manager,
    Peer,
    SelfReview,
    SkipLevel,
    DirectReport,
    Customer,
}

impl FeedbackType {
    pub fn as_str(&self) -> &'static str {
        match self {
            FeedbackType::Manager => "manager",
            FeedbackType::Peer => "peer",
            FeedbackType::SelfReview => "self_review",
            FeedbackType::SkipLevel => "skip_level",
            FeedbackType::DirectReport => "direct_report",
            FeedbackType::Customer => "customer",
        }
    }
}

/// ReviewFeedback entity - maps to hr_public.review_feedback table
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "review_feedback", schema_name = "hr_public")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub review_id: Uuid,
    pub provider_id: Uuid,
    pub feedback_type: String, // Using string to match database enum
    pub content: String,
    pub is_visible_to_employee: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub deleted_at: Option<DateTime<Utc>>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::performance_review::Entity",
        from = "Column::ReviewId",
        to = "super::performance_review::Column::Id"
    )]
    PerformanceReview,
    #[sea_orm(
        belongs_to = "super::user::Entity",
        from = "Column::ProviderId",
        to = "super::user::Column::Id"
    )]
    Provider,
}

impl Related<super::performance_review::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::PerformanceReview.def().rev()
    }
}

impl Related<super::user::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Provider.def().rev()
    }
}

impl ActiveModelBehavior for ActiveModel {}

/// GraphQL Object implementation for ReviewFeedback
#[Object(name = "review_feedback_Model")]
impl Model {
    /// Unique review feedback identifier
    async fn id(&self) -> Uuid {
        self.id
    }

    /// Performance review ID (foreign key)
    async fn performance_review_id(&self) -> Uuid {
        self.review_id
    }

    /// User ID who provided the feedback
    async fn provider_id(&self) -> Uuid {
        self.provider_id
    }

    /// Type of feedback
    async fn feedback_type(&self) -> FeedbackType {
        match self.feedback_type.as_str() {
            "manager" => FeedbackType::Manager,
            "peer" => FeedbackType::Peer,
            "self_review" => FeedbackType::SelfReview,
            "skip_level" => FeedbackType::SkipLevel,
            "direct_report" => FeedbackType::DirectReport,
            "customer" => FeedbackType::Customer,
            _ => FeedbackType::Manager, // Default fallback
        }
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
    ) -> GqlResult<Option<super::performance_review::Model>> {
        let db = get_db_from_context(ctx)?;
        let review = super::performance_review::Entity::find_by_id(self.review_id).one(&db).await?;
        Ok(review)
    }

    /// User who provided the feedback
    async fn provider(&self, ctx: &Context<'_>) -> GqlResult<Option<super::user::Model>> {
        let db = get_db_from_context(ctx)?;
        let user = super::user::Entity::find_by_id(self.provider_id).one(&db).await?;
        Ok(user)
    }

    /// Whether this is manager feedback
    async fn is_manager_feedback(&self) -> bool {
        self.feedback_type == "manager"
    }

    /// Whether this is peer feedback
    async fn is_peer_feedback(&self) -> bool {
        self.feedback_type == "peer"
    }

    /// Whether this is self-review feedback
    async fn is_self_review(&self) -> bool {
        self.feedback_type == "self_review"
    }

    /// Whether this is 360-degree feedback (peer, skip, direct report, customer)
    async fn is_360_feedback(&self) -> bool {
        matches!(
            self.feedback_type.as_str(),
            "peer" | "skip_level" | "direct_report" | "customer"
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
        let feedback = Model {
            id: Uuid::new_v4(),
            review_id: Uuid::new_v4(),
            provider_id: Uuid::new_v4(),
            feedback_type: "manager".to_string(),
            content: "Excellent work on the project delivery".to_string(),
            is_visible_to_employee: true,
            created_at: Utc::now(),
            updated_at: Utc::now(),
            deleted_at: None,
        };

        assert_eq!(feedback.feedback_type, "manager");
        assert!(feedback.is_visible_to_employee);
    }
}
