use async_graphql::{SimpleObject, InputObject, Enum};
use chrono::{DateTime, Utc};
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use uuid::Uuid;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Enum, Copy)]
#[graphql(name = "OnboardingFormBlockType")]
pub enum OnboardingFormBlockType {
    #[graphql(name = "TEXT")]
    Text,
    #[graphql(name = "FORM_FIELDS")]
    FormFields,
    #[graphql(name = "DOCUMENT")]
    Document,
    #[graphql(name = "FILE_UPLOAD")]
    FileUpload,
    #[graphql(name = "SIGNATURE")]
    Signature,
    #[graphql(name = "CHECKBOX")]
    Checkbox,
}

impl From<String> for OnboardingFormBlockType {
    fn from(s: String) -> Self {
        match s.as_str() {
            "TEXT" => OnboardingFormBlockType::Text,
            "FORM_FIELDS" => OnboardingFormBlockType::FormFields,
            "DOCUMENT" => OnboardingFormBlockType::Document,
            "FILE_UPLOAD" => OnboardingFormBlockType::FileUpload,
            "SIGNATURE" => OnboardingFormBlockType::Signature,
            "CHECKBOX" => OnboardingFormBlockType::Checkbox,
            _ => OnboardingFormBlockType::Text,
        }
    }
}

impl From<OnboardingFormBlockType> for String {
    fn from(t: OnboardingFormBlockType) -> Self {
        match t {
            OnboardingFormBlockType::Text => "TEXT".to_string(),
            OnboardingFormBlockType::FormFields => "FORM_FIELDS".to_string(),
            OnboardingFormBlockType::Document => "DOCUMENT".to_string(),
            OnboardingFormBlockType::FileUpload => "FILE_UPLOAD".to_string(),
            OnboardingFormBlockType::Signature => "SIGNATURE".to_string(),
            OnboardingFormBlockType::Checkbox => "CHECKBOX".to_string(),
        }
    }
}

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "onboarding_form_blocks", schema_name = "hr_public")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub onboarding_form_id: Uuid,
    pub title: Option<String>,
    #[sea_orm(column_name = "type")]
    pub block_type: String,
    pub sequence_order: i32,
    pub text_content: Option<String>,
    pub document_url: Option<String>,
    pub form_template_id: Option<Uuid>,
    pub file_upload_requirements: Option<JsonValue>,
    pub signature_requirements: Option<JsonValue>,
    pub checkbox_items: Option<JsonValue>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Clone, Debug, SimpleObject)]
#[graphql(name = "OnboardingFormBlock")]
pub struct FormBlockGraphQL {
    pub id: Uuid,
    pub onboarding_form_id: Uuid,
    pub title: Option<String>,
    #[graphql(name = "type")]
    pub block_type: OnboardingFormBlockType,
    pub sequence_order: i32,
    pub text_content: Option<String>,
    pub document_url: Option<String>,
    pub form_template_id: Option<Uuid>,
    pub file_upload_requirements: Option<JsonValue>,
    pub signature_requirements: Option<JsonValue>,
    pub checkbox_items: Option<JsonValue>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl From<Model> for FormBlockGraphQL {
    fn from(model: Model) -> Self {
        FormBlockGraphQL {
            id: model.id,
            onboarding_form_id: model.onboarding_form_id,
            title: model.title,
            block_type: OnboardingFormBlockType::from(model.block_type),
            sequence_order: model.sequence_order,
            text_content: model.text_content,
            document_url: model.document_url,
            form_template_id: model.form_template_id,
            file_upload_requirements: model.file_upload_requirements,
            signature_requirements: model.signature_requirements,
            checkbox_items: model.checkbox_items,
            created_at: model.created_at,
            updated_at: model.updated_at,
        }
    }
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::form::Entity",
        from = "Column::OnboardingFormId",
        to = "super::form::Column::Id"
    )]
    OnboardingForm,
    #[sea_orm(
        belongs_to = "super::form_template::Entity",
        from = "Column::FormTemplateId",
        to = "super::form_template::Column::Id"
    )]
    FormTemplate,
}

impl Related<super::form::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::OnboardingForm.def()
    }
}

impl Related<super::form_template::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::FormTemplate.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}

#[derive(InputObject)]
pub struct CreateFormBlockInput {
    pub onboarding_form_id: Uuid,
    pub title: Option<String>,
    #[graphql(name = "type")]
    pub block_type: OnboardingFormBlockType,
    pub sequence_order: i32,
    pub text_content: Option<String>,
    pub document_url: Option<String>,
    pub form_template_id: Option<Uuid>,
    pub file_upload_requirements: Option<JsonValue>,
    pub signature_requirements: Option<JsonValue>,
    pub checkbox_items: Option<JsonValue>,
}

#[derive(InputObject)]
pub struct UpdateFormBlockInput {
    pub title: Option<String>,
    pub sequence_order: Option<i32>,
    pub text_content: Option<String>,
    pub document_url: Option<String>,
    pub form_template_id: Option<Uuid>,
    pub file_upload_requirements: Option<JsonValue>,
    pub signature_requirements: Option<JsonValue>,
    pub checkbox_items: Option<JsonValue>,
}
