use async_graphql::{Enum, InputObject, SimpleObject};
use chrono::{DateTime, Utc};
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use uuid::Uuid;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Enum, Copy)]
#[graphql(name = "OnboardingFormProgressStatus")]
pub enum OnboardingFormProgressStatus {
    #[graphql(name = "NOT_STARTED")]
    NotStarted,
    #[graphql(name = "IN_PROGRESS")]
    InProgress,
    #[graphql(name = "COMPLETED")]
    Completed,
}

impl From<String> for OnboardingFormProgressStatus {
    fn from(s: String) -> Self {
        match s.as_str() {
            "NOT_STARTED" => OnboardingFormProgressStatus::NotStarted,
            "IN_PROGRESS" => OnboardingFormProgressStatus::InProgress,
            "COMPLETED" => OnboardingFormProgressStatus::Completed,
            _ => OnboardingFormProgressStatus::NotStarted,
        }
    }
}

impl From<OnboardingFormProgressStatus> for String {
    fn from(status: OnboardingFormProgressStatus) -> Self {
        match status {
            OnboardingFormProgressStatus::NotStarted => "NOT_STARTED".to_string(),
            OnboardingFormProgressStatus::InProgress => "IN_PROGRESS".to_string(),
            OnboardingFormProgressStatus::Completed => "COMPLETED".to_string(),
        }
    }
}

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "onboarding_form_progress", schema_name = "hr_public")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub user_id: Uuid,
    pub onboarding_form_id: Uuid,
    pub status: String,
    pub form_data: Option<JsonValue>,
    pub started_at: Option<DateTime<Utc>>,
    pub completed_at: Option<DateTime<Utc>>,
    pub last_accessed_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Clone, Debug, SimpleObject)]
#[graphql(name = "OnboardingFormProgress")]
pub struct FormProgressGraphQL {
    pub id: Uuid,
    pub user_id: Uuid,
    pub onboarding_form_id: Uuid,
    pub status: OnboardingFormProgressStatus,
    pub form_data: Option<JsonValue>,
    pub started_at: Option<DateTime<Utc>>,
    pub completed_at: Option<DateTime<Utc>>,
    pub last_accessed_at: Option<DateTime<Utc>>,
}

impl From<Model> for FormProgressGraphQL {
    fn from(model: Model) -> Self {
        FormProgressGraphQL {
            id: model.id,
            user_id: model.user_id,
            onboarding_form_id: model.onboarding_form_id,
            status: OnboardingFormProgressStatus::from(model.status),
            form_data: model.form_data,
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
        belongs_to = "super::form::Entity",
        from = "Column::OnboardingFormId",
        to = "super::form::Column::Id"
    )]
    OnboardingForm,
}

impl Related<crate::models::user::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::User.def()
    }
}

impl Related<super::form::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::OnboardingForm.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}

#[derive(InputObject)]
pub struct SaveFormProgressInput {
    pub user_id: Uuid,
    pub onboarding_form_id: Uuid,
    pub status: OnboardingFormProgressStatus,
    pub form_data: Option<JsonValue>,
}

#[derive(InputObject)]
pub struct CompleteFormInput {
    pub onboarding_form_id: Uuid,
    pub form_data: JsonValue,
}
