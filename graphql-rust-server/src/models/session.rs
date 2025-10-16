//! Session model for tower-sessions compatibility
//!
//! This module defines the sessions table model used by SeaOrmSessionStore
//! for persistent session storage in PostgreSQL.

use sea_orm::entity::prelude::*;
use chrono::{DateTime, Utc};

/// Sessions table model for tower-sessions
#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "sessions")]
pub struct Model {
    #[sea_orm(primary_key, column_type = "Text")]
    pub id: String,
    #[sea_orm(column_type = "Binary(BlobSize::Blob(None))")]
    pub data: Vec<u8>,
    pub expiry_date: DateTime<Utc>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}