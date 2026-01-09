use async_graphql::{SimpleObject, InputObject};
use chrono::{DateTime, Utc};
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize, SimpleObject)]
#[sea_orm(table_name = "onboarding_document_uploads", schema_name = "hr_public")]
#[graphql(name = "OnboardingDocumentUpload")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub user_id: Uuid,
    pub content_block_id: Uuid,
    pub file_name: String,
    pub file_size_bytes: i64,
    pub mime_type: String,
    pub storage_path: String,
    pub storage_url: Option<String>,
    pub virus_scan_status: Option<String>,
    pub virus_scan_date: Option<DateTime<Utc>>,
    pub uploaded_at: DateTime<Utc>,
    pub document_id: Option<Uuid>,
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
        belongs_to = "crate::models::documents::document::Entity",
        from = "Column::DocumentId",
        to = "crate::models::documents::document::Column::Id"
    )]
    Document,
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

impl Related<crate::models::documents::document::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Document.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}

#[derive(InputObject)]
pub struct CreateDocumentUploadInput {
    pub content_block_id: Uuid,
    pub file_name: String,
    pub file_size_bytes: i64,
    pub mime_type: String,
    pub storage_path: String,
    pub storage_url: Option<String>,
    // Optional: Create document record in documents table
    pub create_document: Option<bool>,
    pub document_title: Option<String>,
    pub document_description: Option<String>,
    pub document_access_level: Option<String>,
    pub document_expiry_date: Option<DateTime<Utc>>,
}

#[derive(InputObject)]
pub struct UpdateDocumentUploadInput {
    pub virus_scan_status: Option<String>,
    pub virus_scan_date: Option<DateTime<Utc>>,
}
