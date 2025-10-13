//! Document Category Model
//!
//! Maps to hr_public.document_categories table

use async_graphql::{InputObject, Object, Result as GqlResult};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

/// Document category for hierarchical organization
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct DocumentCategory {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub parent_category_id: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub deleted_at: Option<DateTime<Utc>>,
}

/// Input for creating a new document category
#[derive(Debug, Clone, InputObject)]
pub struct CreateDocumentCategoryInput {
    pub name: String,
    pub description: Option<String>,
    #[graphql(name = "parentCategoryId")]
    pub parent_category_id: Option<Uuid>,
}

/// Input for updating a document category
#[derive(Debug, Clone, InputObject)]
pub struct UpdateDocumentCategoryInput {
    pub name: Option<String>,
    pub description: Option<String>,
    #[graphql(name = "parentCategoryId")]
    pub parent_category_id: Option<Uuid>,
}

/// GraphQL Object implementation with camelCase field names
#[Object]
impl DocumentCategory {
    async fn id(&self) -> Uuid {
        self.id
    }

    async fn name(&self) -> &str {
        &self.name
    }

    async fn description(&self) -> Option<&str> {
        self.description.as_deref()
    }

    #[graphql(name = "parentCategoryId")]
    async fn parent_category_id(&self) -> Option<Uuid> {
        self.parent_category_id
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

    /// Parent category relationship (lazy-loaded)
    #[graphql(name = "parentCategory")]
    async fn parent_category(
        &self,
        ctx: &async_graphql::Context<'_>,
    ) -> GqlResult<Option<DocumentCategory>> {
        if let Some(parent_id) = self.parent_category_id {
            let pool = ctx.data::<PgPool>()?;
            let category = sqlx::query_as::<_, DocumentCategory>(
                r#"
                SELECT id, name, description, parent_category_id,
                       created_at, updated_at, deleted_at
                FROM hr_public.document_categories
                WHERE id = $1 AND deleted_at IS NULL
                "#,
            )
            .bind(parent_id)
            .fetch_optional(pool)
            .await?;

            Ok(category)
        } else {
            Ok(None)
        }
    }

    /// Child categories relationship (lazy-loaded)
    #[graphql(name = "childCategories")]
    async fn child_categories(
        &self,
        ctx: &async_graphql::Context<'_>,
    ) -> GqlResult<Vec<DocumentCategory>> {
        let pool = ctx.data::<PgPool>()?;
        let categories = sqlx::query_as::<_, DocumentCategory>(
            r#"
            SELECT id, name, description, parent_category_id,
                   created_at, updated_at, deleted_at
            FROM hr_public.document_categories
            WHERE parent_category_id = $1 AND deleted_at IS NULL
            ORDER BY name
            "#,
        )
        .bind(self.id)
        .fetch_all(pool)
        .await?;

        Ok(categories)
    }

    /// Documents in this category (lazy-loaded)
    async fn documents(
        &self,
        ctx: &async_graphql::Context<'_>,
    ) -> GqlResult<Vec<super::document::Document>> {
        let pool = ctx.data::<PgPool>()?;
        let documents = sqlx::query_as::<_, super::document::Document>(
            r#"
            SELECT id, title, description, category_id, file_path, file_size,
                   mime_type, uploader_id, created_at, updated_at, deleted_at
            FROM hr_public.documents
            WHERE category_id = $1 AND deleted_at IS NULL
            ORDER BY title
            "#,
        )
        .bind(self.id)
        .fetch_all(pool)
        .await?;

        Ok(documents)
    }
}
