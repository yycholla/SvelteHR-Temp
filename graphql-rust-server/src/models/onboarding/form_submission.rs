use async_graphql::{InputObject, SimpleObject};
use chrono::{DateTime, Utc};
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use uuid::Uuid;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize, SimpleObject)]
#[sea_orm(table_name = "onboarding_form_submissions", schema_name = "hr_public")]
#[graphql(name = "OnboardingFormSubmission")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub user_id: Uuid,
    pub content_block_id: Uuid,
    pub form_template_id: Option<Uuid>,
    pub form_data: JsonValue,
    pub submitted_at: DateTime<Utc>,
    pub ip_address: Option<String>,
    pub user_agent: Option<String>,
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
    #[sea_orm(
        belongs_to = "super::form_template::Entity",
        from = "Column::FormTemplateId",
        to = "super::form_template::Column::Id"
    )]
    FormTemplate,
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

impl Related<super::form_template::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::FormTemplate.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}

#[derive(InputObject)]
pub struct CreateFormSubmissionInput {
    pub content_block_id: Uuid,
    pub form_template_id: Option<Uuid>,
    #[graphql(name = "formData")]
    pub form_data: JsonValue,
    pub ip_address: Option<String>,
    pub user_agent: Option<String>,
}
