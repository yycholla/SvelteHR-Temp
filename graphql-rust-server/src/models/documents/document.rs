//! Document Model
//!
//! Maps to hr_public.documents table

use async_graphql::{InputObject, Object, Result as GqlResult};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

/// Core document metadata
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
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
impl Document {
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
    ) -> GqlResult<Option<super::document_category::DocumentCategory>> {
        if let Some(category_id) = self.category_id {
            let pool = ctx.data::<PgPool>()?;
            let category = sqlx::query_as::<_, super::document_category::DocumentCategory>(
                r#"
                SELECT id, name, description, parent_category_id,
                       created_at, updated_at, deleted_at
                FROM hr_public.document_categories
                WHERE id = $1 AND deleted_at IS NULL
                "#,
            )
            .bind(category_id)
            .fetch_optional(pool)
            .await?;

            Ok(category)
        } else {
            Ok(None)
        }
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

    /// Versions relationship (lazy-loaded)
    async fn versions(
        &self,
        ctx: &async_graphql::Context<'_>,
    ) -> GqlResult<Vec<super::document_version::DocumentVersion>> {
        let pool = ctx.data::<PgPool>()?;
        let versions = sqlx::query_as::<_, super::document_version::DocumentVersion>(
            r#"
            SELECT id, document_id, version_number, file_path, file_size,
                   uploader_id, change_summary, created_at
            FROM hr_public.document_versions
            WHERE document_id = $1
            ORDER BY version_number DESC
            "#,
        )
        .bind(self.id)
        .fetch_all(pool)
        .await?;

        Ok(versions)
    }

    /// Assignments relationship (lazy-loaded)
    async fn assignments(
        &self,
        ctx: &async_graphql::Context<'_>,
    ) -> GqlResult<Vec<super::document_assignment::DocumentAssignment>> {
        let pool = ctx.data::<PgPool>()?;
        let assignments = sqlx::query_as::<_, super::document_assignment::DocumentAssignment>(
            r#"
            SELECT id, document_id, user_id, department_id, access_level,
                   assigned_at, assigned_by_id
            FROM hr_public.document_assignments
            WHERE document_id = $1
            "#,
        )
        .bind(self.id)
        .fetch_all(pool)
        .await?;

        Ok(assignments)
    }

    /// Access logs relationship (lazy-loaded)
    async fn access_logs(
        &self,
        ctx: &async_graphql::Context<'_>,
    ) -> GqlResult<Vec<super::document_access_log::DocumentAccessLog>> {
        let pool = ctx.data::<PgPool>()?;
        let logs = sqlx::query_as::<_, super::document_access_log::DocumentAccessLog>(
            r#"
            SELECT id, document_id, user_id, access_type, accessed_at, ip_address
            FROM hr_public.document_access_logs
            WHERE document_id = $1
            ORDER BY accessed_at DESC
            LIMIT 100
            "#,
        )
        .bind(self.id)
        .fetch_all(pool)
        .await?;

        Ok(logs)
    }
}
