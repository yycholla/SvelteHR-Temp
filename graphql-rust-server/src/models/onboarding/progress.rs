use async_graphql::{SimpleObject, InputObject, Enum};
use chrono::{DateTime, Utc};
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Enum, Copy)]
#[graphql(name = "OnboardingProgressStatus")]
pub enum OnboardingProgressStatus {
    #[graphql(name = "NOT_STARTED")]
    NotStarted,
    #[graphql(name = "IN_PROGRESS")]
    InProgress,
    #[graphql(name = "COMPLETED")]
    Completed,
    #[graphql(name = "SKIPPED")]
    Skipped,
}

impl From<String> for OnboardingProgressStatus {
    fn from(s: String) -> Self {
        match s.as_str() {
            "NOT_STARTED" => OnboardingProgressStatus::NotStarted,
            "IN_PROGRESS" => OnboardingProgressStatus::InProgress,
            "COMPLETED" => OnboardingProgressStatus::Completed,
            "SKIPPED" => OnboardingProgressStatus::Skipped,
            _ => OnboardingProgressStatus::NotStarted,
        }
    }
}

impl From<OnboardingProgressStatus> for String {
    fn from(s: OnboardingProgressStatus) -> Self {
        match s {
            OnboardingProgressStatus::NotStarted => "NOT_STARTED".to_string(),
            OnboardingProgressStatus::InProgress => "IN_PROGRESS".to_string(),
            OnboardingProgressStatus::Completed => "COMPLETED".to_string(),
            OnboardingProgressStatus::Skipped => "SKIPPED".to_string(),
        }
    }
}

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "onboarding_progress", schema_name = "hr_public")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub user_id: Uuid,
    pub content_block_id: Uuid,
    pub status: String,
    pub started_at: Option<DateTime<Utc>>,
    pub completed_at: Option<DateTime<Utc>>,
    pub last_accessed_at: Option<DateTime<Utc>>,
}

#[derive(Clone, Debug, SimpleObject)]
#[graphql(name = "OnboardingProgress")]
pub struct ProgressGraphQL {
    pub id: Uuid,
    pub user_id: Uuid,
    pub content_block_id: Uuid,
    pub status: OnboardingProgressStatus,
    pub started_at: Option<DateTime<Utc>>,
    pub completed_at: Option<DateTime<Utc>>,
    pub last_accessed_at: Option<DateTime<Utc>>,
}

impl From<Model> for ProgressGraphQL {
    fn from(model: Model) -> Self {
        ProgressGraphQL {
            id: model.id,
            user_id: model.user_id,
            content_block_id: model.content_block_id,
            status: OnboardingProgressStatus::from(model.status),
            started_at: model.started_at,
            completed_at: model.completed_at,
            last_accessed_at: model.last_accessed_at,
        }
    }
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "crate::models::user::Entity",
        from = "Column::UserId",
        to = "crate::models::user::Column::Id"
    )]
    User,
    #[sea_orm(
        belongs_to = "super::content_block::Entity",
        from = "Column::ContentBlockId",
        to = "super::content_block::Column::Id"
    )]
    ContentBlock,
}

impl Related<crate::models::user::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::User.def()
    }
}

impl Related<super::content_block::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::ContentBlock.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}

#[derive(InputObject)]
#[graphql(name = "UpdateOnboardingProgressInput")]
pub struct UpdateProgressInput {
    pub status: OnboardingProgressStatus,
}
