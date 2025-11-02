//! Encryption Key Model
//!
//! Maps to hr_public.encryption_keys table

use async_graphql::{InputObject, Object, Result as GqlResult};
use chrono::{DateTime, Utc};
use sea_orm::{entity::prelude::*, QueryFilter};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

use crate::database::get_db_from_context;

/// SeaORM Encryption key entity
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "encryption_keys", schema_name = "hr_public")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub key_name: String,
    pub encrypted_key: Vec<u8>,
    pub algorithm: String,
    pub user_id: Uuid,
    #[sea_orm(column_name = "is_active")]
    pub active: bool,
    pub created_at: DateTime<Utc>,
    pub rotated_at: Option<DateTime<Utc>>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "crate::models::user::Entity",
        from = "Column::UserId",
        to = "crate::models::user::Column::Id"
    )]
    User,
}

impl Related<crate::models::user::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::User.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}

/// SQLx-compatible EncryptionKey struct for backward compatibility during migration
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct EncryptionKey {
    pub id: Uuid,
    // Old columns (nullable)
    pub key_name: Option<String>,
    pub encrypted_key: Option<Vec<u8>>,
    // New columns (required)
    pub key_identifier: String,
    pub encrypted_key_data: Vec<u8>,
    pub key_algorithm: String,
    pub created_for_user: Uuid,
    // Common columns
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
    pub rotated_at: Option<DateTime<Utc>>,
}

/// Input for creating a new encryption key
#[derive(Debug, Clone, InputObject)]
pub struct CreateEncryptionKeyInput {
    #[graphql(name = "keyName")]
    pub key_name: String,
    pub algorithm: String,
    /// Base64-encoded encrypted key data
    #[graphql(name = "encryptedKey")]
    pub encrypted_key: String,
}

/// GraphQL Object implementation with camelCase field names
#[Object(name = "system_encryption_key_Model")]
impl Model {
    async fn id(&self) -> Uuid {
        self.id
    }

    #[graphql(name = "keyName")]
    async fn key_name(&self) -> &str {
        &self.key_name
    }

    #[graphql(name = "algorithm")]
    async fn algorithm(&self) -> &str {
        &self.algorithm
    }

    #[graphql(name = "isActive")]
    async fn is_active(&self) -> bool {
        self.active
    }

    #[graphql(name = "createdAt")]
    async fn created_at(&self) -> DateTime<Utc> {
        self.created_at
    }

    #[graphql(name = "rotatedAt")]
    async fn rotated_at(&self) -> Option<DateTime<Utc>> {
        self.rotated_at
    }
}
