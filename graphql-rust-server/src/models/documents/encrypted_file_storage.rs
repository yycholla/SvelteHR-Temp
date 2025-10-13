//! Encrypted File Storage Model
//!
//! Maps to hr_public.encrypted_file_storage table

use async_graphql::{InputObject, Object, Result as GqlResult};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

/// Encrypted file storage tracking
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct EncryptedFileStorage {
    pub id: Uuid,
    pub document_id: Uuid,
    pub encryption_key_id: Uuid,
    pub created_at: DateTime<Utc>,
}

/// Input for creating a new encrypted file storage record
#[derive(Debug, Clone, InputObject)]
pub struct CreateEncryptedFileStorageInput {
    #[graphql(name = "documentId")]
    pub document_id: Uuid,
    #[graphql(name = "encryptionKeyId")]
    pub encryption_key_id: Uuid,
}

/// GraphQL Object implementation with camelCase field names
#[Object]
impl EncryptedFileStorage {
    async fn id(&self) -> Uuid {
        self.id
    }

    #[graphql(name = "documentId")]
    async fn document_id(&self) -> Uuid {
        self.document_id
    }

    #[graphql(name = "encryptionKeyId")]
    async fn encryption_key_id(&self) -> Uuid {
        self.encryption_key_id
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

    /// Encryption key relationship (lazy-loaded)
    #[graphql(name = "encryptionKey")]
    async fn encryption_key(
        &self,
        ctx: &async_graphql::Context<'_>,
    ) -> GqlResult<crate::models::EncryptionKey> {
        let pool = ctx.data::<PgPool>()?;
        let key = sqlx::query_as::<_, crate::models::EncryptionKey>(
            r#"
            SELECT id, key_name, algorithm, created_at, rotated_at, active
            FROM hr_public.encryption_keys
            WHERE id = $1
            "#,
        )
        .bind(self.encryption_key_id)
        .fetch_one(pool)
        .await?;

        Ok(key)
    }
}
