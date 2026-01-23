//! Password Reset Token Model
//!
//! Manages secure tokens for password reset flow with automatic expiration

use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(schema_name = "hr_public", table_name = "password_reset_tokens")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: Uuid,
    pub user_id: Uuid,
    pub token: String,
    pub expires_at: DateTimeWithTimeZone,
    pub used_at: Option<DateTimeWithTimeZone>,
    pub ip_address: Option<String>,
    pub created_at: DateTimeWithTimeZone,
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

impl Model {
    /// Check if token is still valid (not expired and not used)
    pub fn is_valid(&self) -> bool {
        let now = chrono::Utc::now();
        self.used_at.is_none() && self.expires_at.with_timezone(&chrono::Utc) > now
    }

    /// Check if token is expired
    pub fn is_expired(&self) -> bool {
        let now = chrono::Utc::now();
        self.expires_at.with_timezone(&chrono::Utc) <= now
    }
}
