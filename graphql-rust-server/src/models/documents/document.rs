//! Document Model
//!
//! Maps to hr_public.documents table

use async_graphql::{InputObject, Object, Result as GqlResult};
use chrono::{DateTime, Utc};
use sea_orm::{entity::prelude::*, FromQueryResult, QueryFilter, QueryOrder, QuerySelect};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

use crate::{database::get_db_from_context, error::AppError};

/// SQLx-compatible Document struct for backward compatibility during migration
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Document {
    pub id: Uuid,
    pub title: String,
    pub description: Option<String>,
    pub category_id: Option<Uuid>,
    pub file_path: String,
    pub file_size: i32,
    pub mime_type: String,
    pub uploader_id: Uuid,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub deleted_at: Option<DateTime<Utc>>,
}

/// Core document metadata
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "documents")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub title: String,
    pub description: Option<String>,
    pub category_id: Option<Uuid>,
    pub file_path: String,
    pub file_size: i32,
    pub mime_type: String,
    pub uploader_id: Uuid,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub deleted_at: Option<DateTime<Utc>>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::document_category::Entity",
        from = "Column::CategoryId",
        to = "super::document_category::Column::Id"
    )]
    Category,
    #[sea_orm(
        belongs_to = "crate::models::user::Entity",
        from = "Column::UploaderId",
        to = "crate::models::user::Column::Id"
    )]
    Uploader,
}

impl ActiveModelBehavior for ActiveModel {}

/// Input for creating a new document
#[derive(Debug, Clone, InputObject)]
pub struct CreateDocumentInput {
    pub title: String,
    pub description: Option<String>,
    #[graphql(name = "categoryId")]
    pub category_id: Option<Uuid>,
    #[graphql(name = "filePath")]
    pub file_path: String,
    #[graphql(name = "fileSize")]
    pub file_size: i32,
    #[graphql(name = "mimeType")]
    pub mime_type: String,
    #[graphql(name = "uploaderId")]
    pub uploader_id: Uuid,
}

/// Input for updating a document
#[derive(Debug, Clone, InputObject)]
pub struct UpdateDocumentInput {
    pub title: Option<String>,
    pub description: Option<String>,
    #[graphql(name = "categoryId")]
    pub category_id: Option<Uuid>,
}

/// GraphQL Object implementation with camelCase field names
#[Object]
impl Model {
    async fn id(&self) -> Uuid {
        self.id
    }

    async fn title(&self) -> &str {
        &self.title
    }

    async fn description(&self) -> Option<&str> {
        self.description.as_deref()
    }

    #[graphql(name = "categoryId")]
    async fn category_id(&self) -> Option<Uuid> {
        self.category_id
    }

    #[graphql(name = "filePath")]
    async fn file_path(&self) -> &str {
        &self.file_path
    }

    #[graphql(name = "fileSize")]
    async fn file_size(&self) -> i32 {
        self.file_size
    }

    #[graphql(name = "mimeType")]
    async fn mime_type(&self) -> &str {
        &self.mime_type
    }

    #[graphql(name = "uploaderId")]
    async fn uploader_id(&self) -> Uuid {
        self.uploader_id
    }

    #[graphql(name = "createdAt")]
    async fn created_at(&self) -> DateTime<Utc> {
        self.created_at
    }

    #[graphql(name = "updatedAt")]
    async fn updated_at(&self) -> DateTime<Utc> {
        self.updated_at
    }

    #[graphql(name = "deletedAt")]
    async fn deleted_at(&self) -> Option<DateTime<Utc>> {
        self.deleted_at
    }

    /// Category relationship (lazy-loaded)
    async fn category(
        &self,
        ctx: &async_graphql::Context<'_>,
    ) -> GqlResult<Option<super::document_category::Model>> {
        if let Some(category_id) = self.category_id {
            let db = get_db_from_context(ctx)?;
            let category = super::document_category::Entity::find_by_id(category_id)
                .filter(super::document_category::Column::DeletedAt.is_null())
                .one(&db)
                .await?;

            Ok(category)
        } else {
            Ok(None)
        }
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

    /// Versions relationship (lazy-loaded)
    async fn versions(
        &self,
        ctx: &async_graphql::Context<'_>,
    ) -> GqlResult<Vec<super::document_version::Model>> {
        let db = get_db_from_context(ctx)?;
        let versions = super::document_version::Entity::find()
            .filter(super::document_version::Column::DocumentId.eq(self.id))
            .order_by_desc(super::document_version::Column::VersionNumber)
            .all(&db)
            .await?;

        Ok(versions)
    }

    /// Assignments relationship (lazy-loaded)
    async fn assignments(
        &self,
        ctx: &async_graphql::Context<'_>,
    ) -> GqlResult<Vec<super::document_assignment::Model>> {
        let db = get_db_from_context(ctx)?;
        let assignments = super::document_assignment::Entity::find()
            .filter(super::document_assignment::Column::DocumentId.eq(self.id))
            .all(&db)
            .await?;

        Ok(assignments)
    }

    /// Access logs relationship (lazy-loaded)
    async fn access_logs(
        &self,
        ctx: &async_graphql::Context<'_>,
    ) -> GqlResult<Vec<super::document_access_log::Model>> {
        let db = get_db_from_context(ctx)?;
        let logs = super::document_access_log::Entity::find()
            .filter(super::document_access_log::Column::DocumentId.eq(self.id))
            .order_by_desc(super::document_access_log::Column::AccessedAt)
            .limit(100)
            .all(&db)
            .await?;

        Ok(logs)
    }
}
