use async_graphql::{InputObject, SimpleObject};
use chrono::{DateTime, Utc};
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use uuid::Uuid;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize, SimpleObject)]
#[sea_orm(table_name = "onboarding_form_templates", schema_name = "hr_public")]
#[graphql(name = "OnboardingFormTemplate")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub category: Option<String>,
    pub version: Option<String>,
    pub is_active: bool,
    pub fields: JsonValue,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(has_many = "super::content_block::Entity")]
    ContentBlocks,
}

impl Related<super::content_block::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::ContentBlocks.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}

#[derive(InputObject)]
pub struct CreateFormTemplateInput {
    pub name: String,
    pub description: Option<String>,
    pub category: Option<String>,
    pub version: Option<String>,
    #[graphql(name = "fields")]
    pub fields: JsonValue,
}

#[derive(InputObject)]
pub struct UpdateFormTemplateInput {
    pub name: Option<String>,
    pub description: Option<String>,
    pub category: Option<String>,
    pub version: Option<String>,
    pub is_active: Option<bool>,
    #[graphql(name = "fields")]
    pub fields: Option<JsonValue>,
}
