//! Document Version Model
//!
//! Maps to hr_public.document_versions table

use async_graphql::{InputObject, Object, Result as GqlResult};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

/// Document version tracking
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct DocumentVersion {
    pub id: Uuid,
    pub document_id: Uuid,
    pub version_number: i32,
    pub file_path: String,
    pub file_size: i32,
    pub uploader_id: Uuid,
    pub change_summary: Option<String>,
    pub created_at: DateTime<Utc>,
}

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
impl DocumentVersion {
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
    ) -> GqlResult<super::document::Document> {
        let pool = ctx.data::<PgPool>()?;
        let document = sqlx::query_as::<_, super::document::Document>(
            r#"
            SELECT id, title, description, category_id, file_path, file_size,
                   mime_type, uploader_id, created_at, updated_at, deleted_at
            FROM hr_public.documents
            WHERE id = $1 AND deleted_at IS NULL
            "#,
        )
        .bind(self.document_id)
        .fetch_one(pool)
        .await?;

        Ok(document)
    }

    /// Uploader relationship (lazy-loaded)
    async fn uploader(&self, ctx: &async_graphql::Context<'_>) -> GqlResult<crate::models::User> {
        let pool = ctx.data::<PgPool>()?;
        let user = sqlx::query_as::<_, crate::models::User>(
            r#"
            SELECT id, email, first_name, last_name, full_name, phone,
                   department_id, manager_id, hire_date, termination_date,
                   status, created_at, updated_at, deleted_at
            FROM hr_public.users
            WHERE id = $1 AND deleted_at IS NULL
            "#,
        )
        .bind(self.uploader_id)
        .fetch_one(pool)
        .await?;

        Ok(user)
    }
}
