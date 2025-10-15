//! Encryption Key Model
//!
//! Maps to hr_public.encryption_keys table

use async_graphql::{InputObject, Object, Result as GqlResult};
use chrono::{DateTime, Utc};
use sea_orm::{entity::prelude::*, QueryFilter};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::{database::get_db_from_context, error::AppError};

/// SeaORM Encryption key entity
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "encryption_keys")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub key_name: String,
    pub algorithm: String,
    pub created_at: DateTime<Utc>,
    pub rotated_at: Option<DateTime<Utc>>,
    pub active: bool,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}

/// SQLx-compatible EncryptionKey struct for backward compatibility during migration
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct EncryptionKey {
    pub id: Uuid,
    pub key_name: String,
    pub algorithm: String,
    pub created_at: DateTime<Utc>,
    pub rotated_at: Option<DateTime<Utc>>,
    pub active: bool,
}

/// Input for creating a new encryption key
#[derive(Debug, Clone, InputObject)]
pub struct CreateEncryptionKeyInput {
    #[graphql(name = "keyName")]
    pub key_name: String,
    pub algorithm: String,
}

/// GraphQL Object implementation with camelCase field names
#[Object]
impl Model {
    async fn id(&self) -> Uuid {
        self.id
    }

    #[graphql(name = "keyName")]
    async fn key_name(&self) -> &str {
        &self.key_name
    }

    async fn algorithm(&self) -> &str {
        &self.algorithm
    }

    #[graphql(name = "createdAt")]
    async fn created_at(&self) -> DateTime<Utc> {
        self.created_at
    }

    #[graphql(name = "rotatedAt")]
    async fn rotated_at(&self) -> Option<DateTime<Utc>> {
        self.rotated_at
    }

    async fn active(&self) -> bool {
        self.active
    }
}
