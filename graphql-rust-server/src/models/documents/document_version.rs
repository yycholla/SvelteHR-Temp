//! Document Version Model
//!
//! Maps to hr_public.document_versions table

use async_graphql::{InputObject, Object, Result as GqlResult};
use chrono::{DateTime, Utc};
use sea_orm::{entity::prelude::*, QueryFilter};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::{database::get_db_from_context, error::AppError};

/// Document version tracking
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "document_versions")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub document_id: Uuid,
    pub version_number: i32,
    pub file_path: String,
    pub file_size: i32,
    pub uploader_id: Uuid,
    pub change_summary: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::document::Entity",
        from = "Column::DocumentId",
        to = "super::document::Column::Id"
    )]
    Document,
    #[sea_orm(
        belongs_to = "crate::models::user::Entity",
        from = "Column::UploaderId",
        to = "crate::models::user::Column::Id"
    )]
    Uploader,
}

impl ActiveModelBehavior for ActiveModel {}

/// Input for creating a new document version
#[derive(Debug, Clone, InputObject)]
pub struct CreateDocumentVersionInput {
    #[graphql(name = "documentId")]
    pub document_id: Uuid,
    #[graphql(name = "versionNumber")]
    pub version_number: i32,
    #[graphql(name = "filePath")]
    pub file_path: String,
    #[graphql(name = "fileSize")]
    pub file_size: i32,
    #[graphql(name = "uploaderId")]
    pub uploader_id: Uuid,
    #[graphql(name = "changeSummary")]
    pub change_summary: Option<String>,
}

/// GraphQL Object implementation with camelCase field names
#[Object]
impl Model {
    async fn id(&self) -> Uuid {
        self.id
    }

    #[graphql(name = "documentId")]
    async fn document_id(&self) -> Uuid {
        self.document_id
    }

    #[graphql(name = "versionNumber")]
    async fn version_number(&self) -> i32 {
        self.version_number
    }

    #[graphql(name = "filePath")]
    async fn file_path(&self) -> &str {
        &self.file_path
    }

    #[graphql(name = "fileSize")]
    async fn file_size(&self) -> i32 {
        self.file_size
    }

    #[graphql(name = "uploaderId")]
    async fn uploader_id(&self) -> Uuid {
        self.uploader_id
    }

    #[graphql(name = "changeSummary")]
    async fn change_summary(&self) -> Option<&str> {
        self.change_summary.as_deref()
    }

    #[graphql(name = "createdAt")]
    async fn created_at(&self) -> DateTime<Utc> {
        self.created_at
    }

    /// Document relationship (lazy-loaded)
    async fn document(
        &self,
        ctx: &async_graphql::Context<'_>,
    ) -> GqlResult<super::document::Model> {
        let db = get_db_from_context(ctx)?;
        let document = super::document::Entity::find_by_id(self.document_id)
            .filter(super::document::Column::DeletedAt.is_null())
            .one(&db)
            .await?
            .ok_or_else(|| AppError::NotFound("Document not found".to_string()))?;

        Ok(document)
    }

    /// Uploader relationship (lazy-loaded)
    async fn uploader(&self, ctx: &async_graphql::Context<'_>) -> GqlResult<crate::models::User> {
        let db = get_db_from_context(ctx)?;
        let user = crate::models::user::Entity::find_by_id(self.uploader_id)
            .one(&db)
            .await?
            .ok_or_else(|| AppError::NotFound("User not found".to_string()))?;

        Ok(user)
    }
}
