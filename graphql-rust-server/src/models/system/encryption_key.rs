//! Encryption Key Model
//!
//! Maps to hr_public.encryption_keys table

use async_graphql::{InputObject, Object};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Encryption key metadata
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
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
impl EncryptionKey {
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
