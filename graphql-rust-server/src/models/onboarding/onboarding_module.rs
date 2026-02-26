use async_graphql::{InputObject, SimpleObject};
use chrono::{DateTime, Utc};
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize, SimpleObject)]
#[sea_orm(table_name = "onboarding_modules", schema_name = "hr_public")]
#[graphql(name = "OnboardingModule")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub title: String,
    pub description: Option<String>,
    pub is_active: bool,
    pub category: Option<String>,
    pub tags: Option<Vec<String>>,
    pub author_id: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "crate::models::user::Entity",
        from = "Column::AuthorId",
        to = "crate::models::user::Column::Id"
    )]
    Author,
    #[sea_orm(has_many = "super::content_block::Entity")]
    ContentBlocks,
    #[sea_orm(has_many = "super::assignment::Entity")]
    Assignments,
}

impl Related<crate::models::user::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Author.def()
    }
}

impl Related<super::content_block::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::ContentBlocks.def()
    }
}

impl Related<super::assignment::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Assignments.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}

#[derive(InputObject)]
pub struct CreateOnboardingModuleInput {
    pub title: String,
    pub description: Option<String>,
    pub is_active: Option<bool>,
    pub category: Option<String>,
    pub tags: Option<Vec<String>>,
}

#[derive(InputObject)]
pub struct UpdateOnboardingModuleInput {
    pub title: Option<String>,
    pub description: Option<String>,
    pub is_active: Option<bool>,
    pub category: Option<String>,
    pub tags: Option<Vec<String>>,
}
