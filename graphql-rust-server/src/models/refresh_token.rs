//! Refresh token model for JWT authentication
//!
//! Represents refresh tokens stored in the database for token rotation
//! and replay attack detection.

use chrono::{DateTime, Utc};
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Refresh token entity - maps to hr_public.refresh_tokens table
///
/// Stores refresh tokens with rotation tracking for secure JWT authentication.
/// Each token belongs to a token family to detect replay attacks.
///
/// # Security Features
/// - Token hash stored (not plaintext token)
/// - Family ID for rotation detection
/// - Revocation timestamp for invalidation
/// - Device and IP tracking for audit
///
/// # Token Lifecycle
/// 1. Created on login/refresh
/// 2. Used once to generate new access token
/// 3. Rotated (new token created, old marked as used)
/// 4. Revoked if replay detected or user logs out
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "refresh_tokens", schema_name = "hr_public")]
pub struct Model {
    /// Unique token identifier
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,

    /// User who owns this token
    pub user_id: Uuid,

    /// SHA-256 hash of the token (not plaintext)
    /// Prevents token theft if database is compromised
    #[serde(skip_serializing)]
    pub token_hash: String,

    /// Token family ID - all tokens in a rotation chain share the same family
    /// Used to detect replay attacks
    pub token_family_id: Uuid,

    /// When this token expires
    pub expires_at: DateTime<Utc>,

    /// When this token was created
    pub created_at: DateTime<Utc>,

    /// When this token was last used (for rotation)
    /// None if never used, Some(timestamp) after first use
    pub last_used_at: Option<DateTime<Utc>>,

    /// When this token was revoked (logout, replay detection, etc.)
    /// None if active, Some(timestamp) if revoked
    pub revoked_at: Option<DateTime<Utc>>,

    /// Device information (user agent string)
    /// Optional for audit trail
    pub device_info: Option<String>,

    /// IP address where token was created
    /// Optional for audit trail
    pub ip_address: Option<String>,
}

/// Relations for refresh_token entity
#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    /// Belongs to a user (many refresh tokens to one user)
    #[sea_orm(
        belongs_to = "super::user::Entity",
        from = "Column::UserId",
        to = "super::user::Column::Id",
        on_update = "NoAction",
        on_delete = "Cascade"
    )]
    User,
}

impl Related<super::user::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::User.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}

impl Model {
    /// Check if token is expired
    pub fn is_expired(&self) -> bool {
        self.expires_at < Utc::now()
    }

    /// Check if token is revoked
    pub fn is_revoked(&self) -> bool {
        self.revoked_at.is_some()
    }

    /// Check if token is active (not expired and not revoked)
    pub fn is_active(&self) -> bool {
        !self.is_expired() && !self.is_revoked()
    }

    /// Check if token has been used
    pub fn is_used(&self) -> bool {
        self.last_used_at.is_some()
    }

    /// Get time remaining until expiration (in seconds)
    /// Returns None if already expired
    pub fn time_until_expiry(&self) -> Option<i64> {
        let now = Utc::now();
        if self.expires_at > now {
            Some((self.expires_at - now).num_seconds())
        } else {
            None
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_token() -> Model {
        Model {
            id: Uuid::new_v4(),
            user_id: Uuid::new_v4(),
            token_hash: "test-hash".to_string(),
            token_family_id: Uuid::new_v4(),
            expires_at: Utc::now() + chrono::Duration::days(7),
            created_at: Utc::now(),
            last_used_at: None,
            revoked_at: None,
            device_info: Some("Test Device".to_string()),
            ip_address: Some("127.0.0.1".to_string()),
        }
    }

    #[test]
    fn test_is_expired_future() {
        let token = create_test_token();
        assert!(!token.is_expired());
    }

    #[test]
    fn test_is_expired_past() {
        let mut token = create_test_token();
        token.expires_at = Utc::now() - chrono::Duration::hours(1);
        assert!(token.is_expired());
    }

    #[test]
    fn test_is_revoked_none() {
        let token = create_test_token();
        assert!(!token.is_revoked());
    }

    #[test]
    fn test_is_revoked_some() {
        let mut token = create_test_token();
        token.revoked_at = Some(Utc::now());
        assert!(token.is_revoked());
    }

    #[test]
    fn test_is_active_valid() {
        let token = create_test_token();
        assert!(token.is_active());
    }

    #[test]
    fn test_is_active_expired() {
        let mut token = create_test_token();
        token.expires_at = Utc::now() - chrono::Duration::hours(1);
        assert!(!token.is_active());
    }

    #[test]
    fn test_is_active_revoked() {
        let mut token = create_test_token();
        token.revoked_at = Some(Utc::now());
        assert!(!token.is_active());
    }

    #[test]
    fn test_is_used_none() {
        let token = create_test_token();
        assert!(!token.is_used());
    }

    #[test]
    fn test_is_used_some() {
        let mut token = create_test_token();
        token.last_used_at = Some(Utc::now());
        assert!(token.is_used());
    }

    #[test]
    fn test_time_until_expiry_future() {
        let token = create_test_token();
        let time_remaining = token.time_until_expiry();
        assert!(time_remaining.is_some());
        assert!(time_remaining.unwrap() > 0);
    }

    #[test]
    fn test_time_until_expiry_expired() {
        let mut token = create_test_token();
        token.expires_at = Utc::now() - chrono::Duration::hours(1);
        let time_remaining = token.time_until_expiry();
        assert!(time_remaining.is_none());
    }

    #[test]
    fn test_serialization() {
        let token = create_test_token();
        let json = serde_json::to_string(&token).expect("Should serialize");

        // Verify token_hash is not serialized
        assert!(!json.contains("token_hash"));
        assert!(json.contains("user_id"));
        assert!(json.contains("token_family_id"));
    }

    #[test]
    fn test_optional_fields_none() {
        let token = Model {
            id: Uuid::new_v4(),
            user_id: Uuid::new_v4(),
            token_hash: "test-hash".to_string(),
            token_family_id: Uuid::new_v4(),
            expires_at: Utc::now() + chrono::Duration::days(7),
            created_at: Utc::now(),
            last_used_at: None,
            revoked_at: None,
            device_info: None,
            ip_address: None,
        };

        assert!(token.device_info.is_none());
        assert!(token.ip_address.is_none());
    }
}
