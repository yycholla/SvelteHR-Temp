use async_graphql::{InputObject, SimpleObject};
use chrono::{DateTime, Utc};
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "onboarding_forms", schema_name = "hr_public")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub onboarding_module_id: Uuid,
    pub title: String,
    pub description: Option<String>,
    pub sequence_order: i32,
    pub is_required: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Clone, Debug, SimpleObject)]
#[graphql(name = "OnboardingForm")]
pub struct OnboardingFormGraphQL {
    pub id: Uuid,
    pub onboarding_module_id: Uuid,
    pub title: String,
    pub description: Option<String>,
    pub sequence_order: i32,
    pub is_required: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl From<Model> for OnboardingFormGraphQL {
    fn from(model: Model) -> Self {
        OnboardingFormGraphQL {
            id: model.id,
            onboarding_module_id: model.onboarding_module_id,
            title: model.title,
            description: model.description,
            sequence_order: model.sequence_order,
            is_required: model.is_required,
            created_at: model.created_at,
            updated_at: model.updated_at,
        }
    }
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::onboarding_module::Entity",
        from = "Column::OnboardingModuleId",
        to = "super::onboarding_module::Column::Id"
    )]
    OnboardingModule,
    #[sea_orm(has_many = "super::form_block::Entity")]
    FormBlocks,
    #[sea_orm(has_many = "super::form_progress::Entity")]
    FormProgress,
}

impl Related<super::onboarding_module::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::OnboardingModule.def()
    }
}

impl Related<super::form_block::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::FormBlocks.def()
    }
}

impl Related<super::form_progress::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::FormProgress.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}

#[derive(InputObject)]
pub struct CreateOnboardingFormInput {
    pub onboarding_module_id: Uuid,
    pub title: String,
    pub description: Option<String>,
    pub sequence_order: i32,
    pub is_required: bool,
}

#[derive(InputObject)]
pub struct UpdateOnboardingFormInput {
    pub title: Option<String>,
    pub description: Option<String>,
    pub sequence_order: Option<i32>,
    pub is_required: Option<bool>,
}
