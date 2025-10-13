//! Document Access Log Model
//!
//! Maps to hr_public.document_access_logs table

use async_graphql::{Enum, InputObject, Object, Result as GqlResult};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

/// Document access type enumeration
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Enum, sqlx::Type)]
#[sqlx(type_name = "document_access_type", rename_all = "lowercase")]
pub enum DocumentAccessType {
    #[graphql(name = "VIEW")]
    View,
    #[graphql(name = "DOWNLOAD")]
    Download,
    #[graphql(name = "EDIT")]
    Edit,
    #[graphql(name = "DELETE")]
    Delete,
}

/// Document access audit log
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct DocumentAccessLog {
    pub id: Uuid,
    pub document_id: Uuid,
    pub user_id: Uuid,
    pub access_type: DocumentAccessType,
    pub accessed_at: DateTime<Utc>,
    pub ip_address: Option<String>,
}

/// Input for creating a new document access log
#[derive(Debug, Clone, InputObject)]
pub struct CreateDocumentAccessLogInput {
    #[graphql(name = "documentId")]
    pub document_id: Uuid,
    #[graphql(name = "userId")]
    pub user_id: Uuid,
    #[graphql(name = "accessType")]
    pub access_type: DocumentAccessType,
    #[graphql(name = "ipAddress")]
    pub ip_address: Option<String>,
}

/// GraphQL Object implementation with camelCase field names
#[Object]
impl DocumentAccessLog {
    async fn id(&self) -> Uuid {
        self.id
    }

    #[graphql(name = "documentId")]
    async fn document_id(&self) -> Uuid {
        self.document_id
    }

    #[graphql(name = "userId")]
    async fn user_id(&self) -> Uuid {
        self.user_id
    }

    #[graphql(name = "accessType")]
    async fn access_type(&self) -> DocumentAccessType {
        self.access_type
    }

    #[graphql(name = "accessedAt")]
    async fn accessed_at(&self) -> DateTime<Utc> {
        self.accessed_at
    }

    #[graphql(name = "ipAddress")]
    async fn ip_address(&self) -> Option<&str> {
        self.ip_address.as_deref()
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

    /// User relationship (lazy-loaded)
    async fn user(&self, ctx: &async_graphql::Context<'_>) -> GqlResult<crate::models::User> {
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
        .bind(self.user_id)
        .fetch_one(pool)
        .await?;

        Ok(user)
    }
}
