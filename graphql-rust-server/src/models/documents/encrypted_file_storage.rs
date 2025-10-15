//! Encrypted File Storage Model
//!
//! Maps to hr_public.encrypted_file_storage table

use async_graphql::{InputObject, Object, Result as GqlResult};
use chrono::{DateTime, Utc};
use sea_orm::{entity::prelude::*, QueryFilter};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::{database::get_db_from_context, error::AppError};

/// Encrypted file storage tracking
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "encrypted_file_storage")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub document_id: Uuid,
    pub encryption_key_id: Uuid,
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
    // TODO: Add encryption key relation after encryption_key.rs is migrated to SeaORM
    // #[sea_orm(
    //     belongs_to = "crate::models::system::encryption_key::Entity",
    //     from = "Column::EncryptionKeyId",
    //     to = "crate::models::system::encryption_key::Column::Id"
    // )]
    // EncryptionKey,
}

impl ActiveModelBehavior for ActiveModel {}

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
impl Model {
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



    /// Encryption key relationship (lazy-loaded)
    #[graphql(name = "encryptionKey")]
    async fn encryption_key(
        &self,
        ctx: &async_graphql::Context<'_>,
    ) -> GqlResult<crate::models::system::encryption_key::Model> {
        let db = get_db_from_context(ctx)?;
        let key = crate::models::system::encryption_key::Entity::find_by_id(self.encryption_key_id)
            .one(db)
            .await?
            .ok_or_else(|| AppError::NotFound("Encryption key not found".to_string()))?;

        Ok(key)
    }
}
