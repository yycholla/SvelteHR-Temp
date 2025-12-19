use async_graphql::{SimpleObject, InputObject, Enum};
use chrono::{DateTime, Utc};
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use uuid::Uuid;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Enum, Copy)]
#[graphql(name = "OnboardingContentType")]
pub enum OnboardingContentType {
    #[graphql(name = "TEXT")]
    Text,
    #[graphql(name = "DOCUMENT")]
    Document,
    #[graphql(name = "FORM")]
    Form,
    #[graphql(name = "FILE_UPLOAD")]
    FileUpload,
    #[graphql(name = "SIGNATURE")]
    Signature,
}

impl From<String> for OnboardingContentType {
    fn from(s: String) -> Self {
        match s.as_str() {
            "TEXT" => OnboardingContentType::Text,
            "DOCUMENT" => OnboardingContentType::Document,
            "FORM" => OnboardingContentType::Form,
            "FILE_UPLOAD" => OnboardingContentType::FileUpload,
            "SIGNATURE" => OnboardingContentType::Signature,
            _ => OnboardingContentType::Text,
        }
    }
}

impl From<OnboardingContentType> for String {
    fn from(t: OnboardingContentType) -> Self {
        match t {
            OnboardingContentType::Text => "TEXT".to_string(),
            OnboardingContentType::Document => "DOCUMENT".to_string(),
            OnboardingContentType::Form => "FORM".to_string(),
            OnboardingContentType::FileUpload => "FILE_UPLOAD".to_string(),
            OnboardingContentType::Signature => "SIGNATURE".to_string(),
        }
    }
}

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "onboarding_content_blocks", schema_name = "hr_public")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub onboarding_module_id: Uuid,
    pub title: String,
    #[sea_orm(column_name = "type")]
    pub content_type: String,
    pub sequence_order: i32,
    pub is_required: bool,
    pub text_content: Option<String>,
    pub document_url: Option<String>,
    pub form_template_id: Option<Uuid>,
    pub inline_form_elements: Option<JsonValue>,
    pub file_upload_requirements: Option<JsonValue>,
    pub signature_requirements: Option<JsonValue>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Clone, Debug, SimpleObject)]
#[graphql(name = "OnboardingContentBlock")]
pub struct ContentBlockGraphQL {
    pub id: Uuid,
    pub onboarding_module_id: Uuid,
    pub title: String,
    #[graphql(name = "type")]
    pub content_type: OnboardingContentType,
    pub sequence_order: i32,
    pub is_required: bool,
    pub text_content: Option<String>,
    pub document_url: Option<String>,
    pub form_template_id: Option<Uuid>,
    pub inline_form_elements: Option<JsonValue>,
    pub file_upload_requirements: Option<JsonValue>,
    pub signature_requirements: Option<JsonValue>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl From<Model> for ContentBlockGraphQL {
    fn from(model: Model) -> Self {
        ContentBlockGraphQL {
            id: model.id,
            onboarding_module_id: model.onboarding_module_id,
            title: model.title,
            content_type: OnboardingContentType::from(model.content_type),
            sequence_order: model.sequence_order,
            is_required: model.is_required,
            text_content: model.text_content,
            document_url: model.document_url,
            form_template_id: model.form_template_id,
            inline_form_elements: model.inline_form_elements,
            file_upload_requirements: model.file_upload_requirements,
            signature_requirements: model.signature_requirements,
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
    #[sea_orm(
        belongs_to = "super::form_template::Entity",
        from = "Column::FormTemplateId",
        to = "super::form_template::Column::Id"
    )]
    FormTemplate,
    #[sea_orm(has_many = "super::progress::Entity")]
    Progress,
    #[sea_orm(has_many = "super::form_submission::Entity")]
    FormSubmissions,
    #[sea_orm(has_many = "super::document_upload::Entity")]
    DocumentUploads,
}

impl Related<super::onboarding_module::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::OnboardingModule.def()
    }
}

impl Related<super::form_template::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::FormTemplate.def()
    }
}

impl Related<super::progress::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Progress.def()
    }
}

impl Related<super::form_submission::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::FormSubmissions.def()
    }
}

impl Related<super::document_upload::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::DocumentUploads.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}

#[derive(InputObject)]
pub struct CreateContentBlockInput {
    pub onboarding_module_id: Uuid,
    pub title: String,
    #[graphql(name = "type")]
    pub content_type: OnboardingContentType,
    pub sequence_order: i32,
    pub is_required: bool,
    pub text_content: Option<String>,
    pub document_url: Option<String>,
    pub form_template_id: Option<Uuid>,
    pub inline_form_elements: Option<JsonValue>,
    pub file_upload_requirements: Option<JsonValue>,
    pub signature_requirements: Option<JsonValue>,
}

#[derive(InputObject)]
pub struct UpdateContentBlockInput {
    pub title: Option<String>,
    pub sequence_order: Option<i32>,
    pub is_required: Option<bool>,
    pub text_content: Option<String>,
    pub document_url: Option<String>,
    pub form_template_id: Option<Uuid>,
    pub inline_form_elements: Option<JsonValue>,
    pub file_upload_requirements: Option<JsonValue>,
    pub signature_requirements: Option<JsonValue>,
}
