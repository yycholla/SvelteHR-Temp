use super::{AccessTokenClaims, JwtConfig, JwtKeys, RefreshTokenClaims};
use crate::models::{permission, refresh_token, role, role_permission, user, user_role_assignment};
use chrono::{Duration, Utc};
use jsonwebtoken::{decode, encode, Algorithm, Header, Validation};
use sea_orm::{
    ActiveModelTrait, ActiveValue::Set, ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter,
};
use sha2::{Digest, Sha256};
use std::collections::HashSet;
use uuid::Uuid;

/// JWT service for token generation, validation, and management
#[derive(Clone)]
pub struct JwtService {
    config: JwtConfig,
    keys: JwtKeys,
    db: DatabaseConnection,
}

/// Errors that can occur during JWT operations
#[derive(Debug, thiserror::Error)]
pub enum JwtError {
    #[error("Token expired")]
    TokenExpired,

    #[error("Invalid token signature")]
    InvalidSignature,

    #[error("Token has been revoked")]
    TokenRevoked,

    #[error("Token family has been revoked (replay attack detected)")]
    FamilyRevoked,

    #[error("Refresh token not found")]
    RefreshTokenNotFound,

    #[error("Refresh token already used (replay attack detected)")]
    RefreshTokenReused,

    #[error("User not found: {user_id}")]
    UserNotFound { user_id: Uuid },

    #[error("Database error: {0}")]
    DatabaseError(#[from] sea_orm::DbErr),

    #[error("JWT encoding error: {0}")]
    EncodingError(#[from] jsonwebtoken::errors::Error),

    #[error("Invalid token format")]
    InvalidTokenFormat,

    #[error("Missing required claim: {0}")]
    MissingClaim(String),
}

impl JwtService {
    /// Create a new JWT service
    pub fn new(config: JwtConfig, keys: JwtKeys, db: DatabaseConnection) -> Self {
        Self { config, keys, db }
    }

    /// Generate an access token for a user
    ///
    /// Loads user's roles and permissions from database and creates a JWT
    /// with RS256 signature.
    ///
    /// # Arguments
    /// * `user_id` - User's UUID
    /// * `email` - User's email address
    /// * `display_name` - User's display name
    /// * `department_id` - Optional department UUID
    ///
    /// # Returns
    /// JWT access token string (valid for 15 minutes by default)
    pub async fn generate_access_token(
        &self,
        user_id: Uuid,
        email: String,
        display_name: String,
        department_id: Option<Uuid>,
    ) -> Result<String, JwtError> {
        // Load user's roles and permissions
        let (roles, permissions) = self.load_user_roles_permissions(user_id).await?;

        let now = Utc::now();
        let exp = now + Duration::seconds(self.config.access_ttl_secs() as i64);

        let claims = AccessTokenClaims {
            sub: user_id.to_string(),
            email,
            exp: exp.timestamp(),
            iat: now.timestamp(),
            jti: Uuid::new_v4().to_string(),
            iss: self.config.issuer.clone(),
            aud: self.config.audience.clone(),
            roles,
            permissions,
            department_id: department_id.map(|id| id.to_string()),
            display_name,
        };

        let header = Header::new(Algorithm::RS256);
        let token = encode(&header, &claims, &self.keys.encoding_key)?;

        Ok(token)
    }

    /// Validate an access token
    ///
    /// Verifies signature, expiration, and checks if token has been revoked.
    ///
    /// # Arguments
    /// * `token` - JWT access token string
    ///
    /// # Returns
    /// Decoded access token claims if valid
    pub async fn validate_access_token(&self, token: &str) -> Result<AccessTokenClaims, JwtError> {
        // Decode and verify signature
        let mut validation = Validation::new(Algorithm::RS256);
        validation.set_issuer(&[&self.config.issuer]);
        validation.set_audience(&[&self.config.audience]);

        let token_data = decode::<AccessTokenClaims>(token, &self.keys.decoding_key, &validation)?;

        let claims = token_data.claims;

        // Check if token is expired (should be caught by jsonwebtoken, but double-check)
        if claims.is_expired() {
            return Err(JwtError::TokenExpired);
        }

        // Check if token has been revoked
        let user_id = claims.user_id().map_err(|_| JwtError::InvalidTokenFormat)?;
        if self.check_token_revocation(user_id, claims.iat).await? {
            return Err(JwtError::TokenRevoked);
        }

        Ok(claims)
    }

    /// Generate a refresh token
    ///
    /// Creates a cryptographically secure random token and stores its SHA256 hash
    /// in the database.
    ///
    /// # Arguments
    /// * `user_id` - User's UUID
    /// * `family_id` - Token family UUID (for rotation tracking)
    /// * `device_info` - Optional device information
    /// * `ip_address` - Optional IP address
    ///
    /// # Returns
    /// Tuple of (plaintext token, JWT refresh token string)
    pub async fn generate_refresh_token(
        &self,
        user_id: Uuid,
        family_id: Uuid,
        device_info: Option<String>,
        ip_address: Option<String>,
    ) -> Result<(String, String), JwtError> {
        // Generate cryptographically secure random token (32 bytes = 256 bits)
        // Use OsRng which is Send-safe (unlike thread_rng)
        use rand::RngCore;
        let mut rng = rand::rngs::OsRng;
        let mut random_bytes = [0u8; 32];
        rng.fill_bytes(&mut random_bytes);
        let plaintext_token = hex::encode(&random_bytes);

        // Hash token for storage (SHA256)
        let token_hash = self.hash_token(&plaintext_token);

        let now = Utc::now();
        let exp = now + Duration::seconds(self.config.refresh_ttl_secs() as i64);

        // Create JWT refresh token (stored in HTTP-only cookie)
        let token_id = Uuid::new_v4();
        let claims = RefreshTokenClaims {
            sub: user_id.to_string(),
            jti: token_id.to_string(),
            exp: exp.timestamp(),
            iat: now.timestamp(),
            iss: self.config.issuer.clone(),
            aud: self.config.audience.clone(),
            family_id: family_id.to_string(),
        };

        let header = Header::new(Algorithm::RS256);
        let jwt_token = encode(&header, &claims, &self.keys.encoding_key)?;

        // Store token hash in database
        let refresh_token = refresh_token::ActiveModel {
            id: Set(token_id),
            user_id: Set(user_id),
            token_hash: Set(token_hash),
            token_family_id: Set(family_id),
            expires_at: Set(exp),
            created_at: Set(now),
            last_used_at: Set(None),
            revoked_at: Set(None),
            device_info: Set(device_info),
            ip_address: Set(ip_address),
        };

        refresh_token.insert(&self.db).await?;

        Ok((plaintext_token, jwt_token))
    }

    /// Refresh access token using a refresh token
    ///
    /// Validates the refresh token, issues a new access token, and rotates the
    /// refresh token (single-use enforcement).
    ///
    /// # Arguments
    /// * `refresh_jwt` - JWT refresh token string
    /// * `plaintext_token` - Plaintext refresh token (for hash verification)
    /// * `device_info` - Optional device information
    /// * `ip_address` - Optional IP address
    ///
    /// # Returns
    /// Tuple of (new access token, new refresh token JWT, new plaintext token)
    pub async fn refresh_access_token(
        &self,
        refresh_jwt: &str,
        plaintext_token: &str,
        device_info: Option<String>,
        ip_address: Option<String>,
    ) -> Result<(String, String, String), JwtError> {
        // Decode and verify JWT signature
        let mut validation = Validation::new(Algorithm::RS256);
        validation.set_issuer(&[&self.config.issuer]);
        validation.set_audience(&[&self.config.audience]);

        let token_data =
            decode::<RefreshTokenClaims>(refresh_jwt, &self.keys.decoding_key, &validation)?;

        let claims = token_data.claims;

        // Check expiration
        if claims.is_expired() {
            return Err(JwtError::TokenExpired);
        }

        // Hash provided token for lookup
        let token_hash = self.hash_token(plaintext_token);

        // Find token in database by hash
        let token_id = claims
            .token_id()
            .map_err(|_| JwtError::InvalidTokenFormat)?;
        let stored_token = refresh_token::Entity::find_by_id(token_id)
            .one(&self.db)
            .await?
            .ok_or(JwtError::RefreshTokenNotFound)?;

        // Verify token hash matches
        if stored_token.token_hash != token_hash {
            return Err(JwtError::InvalidTokenFormat);
        }

        // Check if token is revoked
        if stored_token.is_revoked() {
            return Err(JwtError::TokenRevoked);
        }

        // Check if token is expired
        if stored_token.is_expired() {
            return Err(JwtError::TokenExpired);
        }

        // REPLAY ATTACK DETECTION: Check if token has been used before
        if stored_token.is_used() {
            // Token reuse detected! Revoke entire token family
            tracing::warn!(
                "Refresh token reuse detected! user_id={}, token_id={}, family_id={}",
                stored_token.user_id,
                stored_token.id,
                stored_token.token_family_id
            );
            self.revoke_token_family(stored_token.token_family_id)
                .await?;
            return Err(JwtError::RefreshTokenReused);
        }

        // Mark current token as used
        let mut active_token: refresh_token::ActiveModel = stored_token.clone().into();
        active_token.last_used_at = Set(Some(Utc::now()));
        active_token.update(&self.db).await?;

        // Load user information
        let user_id = stored_token.user_id;
        let user = user::Entity::find_by_id(user_id)
            .one(&self.db)
            .await?
            .ok_or(JwtError::UserNotFound { user_id })?;

        // Generate new access token
        let access_token = self
            .generate_access_token(
                user_id,
                user.email.clone(),
                user.display_name.clone(),
                user.department_id,
            )
            .await?;

        // Rotate refresh token (generate new one in same family)
        let family_id = stored_token.token_family_id;
        let (new_plaintext_token, new_refresh_jwt) = self
            .generate_refresh_token(user_id, family_id, device_info, ip_address)
            .await?;

        Ok((access_token, new_refresh_jwt, new_plaintext_token))
    }

    /// Revoke all tokens for a user (logout from all devices)
    ///
    /// Updates the user's tokens_valid_after timestamp, invalidating all tokens
    /// issued before this point.
    ///
    /// # Arguments
    /// * `user_id` - User's UUID
    pub async fn revoke_all_user_tokens(&self, user_id: Uuid) -> Result<(), JwtError> {
        // Update tokens_valid_after to current time
        let now = Utc::now();

        let mut user: user::ActiveModel = user::Entity::find_by_id(user_id)
            .one(&self.db)
            .await?
            .ok_or(JwtError::UserNotFound { user_id })?
            .into();

        user.tokens_valid_after = Set(now);
        user.update(&self.db).await?;

        // Also revoke all refresh tokens in database
        refresh_token::Entity::update_many()
            .col_expr(refresh_token::Column::RevokedAt, Utc::now().into())
            .filter(refresh_token::Column::UserId.eq(user_id))
            .filter(refresh_token::Column::RevokedAt.is_null())
            .exec(&self.db)
            .await?;

        tracing::info!("Revoked all tokens for user_id={}", user_id);

        Ok(())
    }

    /// Revoke an entire token family (replay attack response)
    ///
    /// When a refresh token is reused, revoke all tokens in the family to
    /// prevent further attacks.
    ///
    /// # Arguments
    /// * `family_id` - Token family UUID
    pub async fn revoke_token_family(&self, family_id: Uuid) -> Result<(), JwtError> {
        let now = Utc::now();

        // Revoke all tokens in this family
        refresh_token::Entity::update_many()
            .col_expr(refresh_token::Column::RevokedAt, now.into())
            .filter(refresh_token::Column::TokenFamilyId.eq(family_id))
            .filter(refresh_token::Column::RevokedAt.is_null())
            .exec(&self.db)
            .await?;

        tracing::warn!("Revoked token family_id={} due to replay attack", family_id);

        Ok(())
    }

    /// Check if a token has been revoked
    ///
    /// Checks the user's tokens_valid_after timestamp to see if tokens issued
    /// before that time should be considered invalid.
    ///
    /// # Arguments
    /// * `user_id` - User's UUID
    /// * `issued_at` - When the token was issued (Unix timestamp)
    ///
    /// # Returns
    /// true if token has been revoked, false otherwise
    pub async fn check_token_revocation(
        &self,
        user_id: Uuid,
        issued_at: i64,
    ) -> Result<bool, JwtError> {
        let user = user::Entity::find_by_id(user_id)
            .one(&self.db)
            .await?
            .ok_or(JwtError::UserNotFound { user_id })?;

        // Token is revoked if it was issued before tokens_valid_after
        let tokens_valid_after_ts = user.tokens_valid_after.timestamp();
        Ok(issued_at < tokens_valid_after_ts)
    }

    /// Load user's roles and permissions from database
    ///
    /// Queries role assignments and permissions via joins.
    ///
    /// # Arguments
    /// * `user_id` - User's UUID
    ///
    /// # Returns
    /// Tuple of (role names, permission names)
    pub async fn load_user_roles_permissions(
        &self,
        user_id: Uuid,
    ) -> Result<(Vec<String>, Vec<String>), JwtError> {
        // Load role assignments
        let role_assignments = user_role_assignment::Entity::find()
            .filter(user_role_assignment::Column::UserId.eq(user_id))
            .filter(user_role_assignment::Column::DeletedAt.is_null())
            .all(&self.db)
            .await?;

        if role_assignments.is_empty() {
            return Ok((vec![], vec![]));
        }

        let role_ids: Vec<Uuid> = role_assignments.iter().map(|a| a.role_id).collect();

        // Load roles
        let roles = role::Entity::find()
            .filter(role::Column::Id.is_in(role_ids.clone()))
            .filter(role::Column::DeletedAt.is_null())
            .all(&self.db)
            .await?;

        let role_names: Vec<String> = roles.iter().map(|r| r.name.clone()).collect();

        // Load permissions via role_permissions
        let role_permissions_records = role_permission::Entity::find()
            .filter(role_permission::Column::RoleId.is_in(role_ids))
            .filter(role_permission::Column::DeletedAt.is_null())
            .all(&self.db)
            .await?;

        if role_permissions_records.is_empty() {
            return Ok((role_names, vec![]));
        }

        let permission_ids: Vec<Uuid> = role_permissions_records
            .iter()
            .map(|rp| rp.permission_id)
            .collect();

        // Load permissions
        let permissions = permission::Entity::find()
            .filter(permission::Column::Id.is_in(permission_ids))
            .filter(permission::Column::DeletedAt.is_null())
            .all(&self.db)
            .await?;

        // Format permissions as "resource:action" and deduplicate
        let permission_names: Vec<String> = permissions
            .into_iter()
            .map(|p| format!("{}:{}", p.resource, p.action))
            .collect::<HashSet<_>>()
            .into_iter()
            .collect();

        Ok((role_names, permission_names))
    }

    /// Hash a token using SHA256
    ///
    /// # Arguments
    /// * `token` - Plaintext token
    ///
    /// # Returns
    /// Hex-encoded SHA256 hash
    fn hash_token(&self, token: &str) -> String {
        let mut hasher = Sha256::new();
        hasher.update(token.as_bytes());
        hex::encode(hasher.finalize())
    }

    /// Cleanup expired refresh tokens (maintenance task)
    ///
    /// Should be run periodically (e.g., daily cron job) to remove expired tokens.
    pub async fn cleanup_expired_tokens(&self) -> Result<u64, JwtError> {
        let now = Utc::now();

        let result = refresh_token::Entity::delete_many()
            .filter(refresh_token::Column::ExpiresAt.lt(now))
            .exec(&self.db)
            .await?;

        tracing::info!("Cleaned up {} expired refresh tokens", result.rows_affected);

        Ok(result.rows_affected)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // Helper to create a minimal JWT service for testing hash function
    fn create_test_service() -> JwtService {
        // Create minimal config without loading from env
        let config = JwtConfig {
            access_ttl: Duration::seconds(900).to_std().unwrap(),
            refresh_ttl: Duration::days(7).to_std().unwrap(),
            issuer: "test-issuer".to_string(),
            audience: "test-audience".to_string(),
        };

        // Create minimal keys (will not be used for hash tests)
        // Use test keys from jwt_config tests
        let test_private_key = r#"-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC2wyAKaeOuib88
HUc7DET6pJ/cuZUWbcnSYD4W9Wl34GzQx6zlXl6nQ/SfY5JXW1VXq9Dn1nnzigIy
3GeEd2u+dS3sA2Ie5buZ69qLpqtZj23qBpeTeOCZmDTbhIuizyGAFnKkYBNdScoj
Dc87T/ANE0tNIvJA2TW7tAUBgs/dZFKH+lDxgfWOzMJZIReVTjova+qy/B/hSRvd
iIEXWRvY2mmHQDdDk2GJ6CuDHFhIErpKGqERnm4f+6rrGNXPtPQXsgnVX/5bxsr8
4m3S9/HabEhKJ+Y6LzhCvkWG6Ut2CjW+sp+7Ozx/ZQD+nQy93gwTQ0g58/ys2ieg
hT8u+mnvAgMBAAECggEAAr0sNZZo//HMM2RERS7FuTSOuW9F5uGl/332FZWqSyPK
YwXzDIxHAokNWUwpN8pEc6gSspQaHMZp37BCPuUj8LqZ1xUlOyL565scxIYEFbda
utdMHeeBr4ZCmIhFKB9O4w1dvM08d7lGNb3xvUj75yjtsni+b66xqZ/6M+UYJLsN
1M2ivbxy65fk69lqtFN+NBRJGKKOgUsBT6ZmShIBqtzcshVw/H4hqq6Oppy6DCW8
05QfkOCMCOnaTLiNQ681gTwAU6BRkV4SivIJpY/uNBIrTiTlBkceq5bGNbQVloS2
PkLl7YgMxTT9GP74zXzeDEeKbxXHGC1YVQVs3SQ2GQKBgQDomYwrldZF2+0j3Enb
JQawE3fzDBOHwF9jxIzFgbtdjEl7O2EIqA3+mPKBE7MwIJI8A+idQuGKIXzo9Be8
lXGEQh35S9MTWjK1YBX1WQpQfLiHfFIyw4SfscQ6mrmRyN1N+F4TZKE6PH2mtGpE
KR5YDOyMK2vUAiY7RZrPv9RbuQKBgQDJJgs35cPBaWtHf31MZ7anoWhjUgcY11IU
5DDKXMLeAH4bAvwjok+FZTy8a1DU3daDlBlNcMnFrq3hIvZUM+2MIR8Pop8n/idJ
hTBnua4X36sj/GUv9wqda7fvFR5Q9LtpaSe1+TVdB8GF0nSxb/P/UFb7qmNGFqCA
p8iJnKfW5wKBgQCoW1uFwLKTZhhDOJOMt0Qb9juABGGuhKOGxyFNZBWGJKCbPeOC
LIHUokgE/YlZcHnoTrvz+BDftlV/GA6GRXUg0ep4I1XoUAUcGyxJpeU9VMkL6ARn
EfXQ0Q7DjHJ8/vKQGRGe39uDF32rSDMSmuCHwvMEkfk+P0AE7uCbNrIyoQKBgD9S
SZ/MJebCH/J/ENu3nomAx1LU5MUOK5nGCBH8R6AJealZNDSniO8OYqNSCT0ppLkB
K0H0qqAfkD9aeT8ipbpCRvvuDrpRSN7dHdLZYhPD5qVKdDQ4SdAqs9mAxW1ozYKu
hsDDdegWY/aTvQaKnr4V9Xv+NIhA4T//EaM4fKGrAoGAHvNzd4mdsKgvurpT+lH6
AeVni/1ooPefCFbOVws2wJzd+UtfdSM1zlxIqv3uMO0ZZdTv8or1M5Cb0mKdv7gI
ajy3m/b35958OScQxTwe3UJ+t4LSOzc9ENxOhsYKPLWs26XbZu3LZgHTOEvs+5W4
Mf97+dt9ZYdwMjXVJmLN5X4=
-----END PRIVATE KEY-----"#;

        let test_public_key = r#"-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAtsMgCmnjrom/PB1HOwxE
+qSf3LmVFm3J0mA+FvVpd+Bs0Mes5V5ep0P0n2OSV1tVV6vQ59Z584oCMtxnhHdr
vnUt7ANiHuW7mevai6arWY9t6gaXk3jgmZg024SLos8hgBZypGATXUnKIw3PO0/w
DRNLTSLyQNk1u7QFAYLP3WRSh/pQ8YH1jszCWSEXlU46L2vqsvwf4Ukb3YiBF1kb
2Npph0A3Q5NhiegrgxxYSBK6ShqhEZ5uH/uq6xjVz7T0F7IJ1V/+W8bK/OJt0vfx
2mxISifmOi84Qr5FhulLdgo1vrKfuzs8f2UA/p0Mvd4ME0NIOfP8rNonoIU/Lvpp
7wIDAQAB
-----END PUBLIC KEY-----"#;

        let encoding_key =
            jsonwebtoken::EncodingKey::from_rsa_pem(test_private_key.as_bytes()).unwrap();
        let decoding_key =
            jsonwebtoken::DecodingKey::from_rsa_pem(test_public_key.as_bytes()).unwrap();

        let keys = JwtKeys {
            encoding_key,
            decoding_key,
        };

        let db = DatabaseConnection::default();

        JwtService::new(config, keys, db)
    }

    #[test]
    fn test_hash_token() {
        let service = create_test_service();

        let token = "test-token-12345";
        let hash1 = service.hash_token(token);
        let hash2 = service.hash_token(token);

        // Same input produces same hash
        assert_eq!(hash1, hash2);

        // Different input produces different hash
        let hash3 = service.hash_token("different-token");
        assert_ne!(hash1, hash3);

        // Hash is hex-encoded SHA256 (64 characters)
        assert_eq!(hash1.len(), 64);
    }

    #[test]
    fn test_hash_token_deterministic() {
        let service = create_test_service();

        // Verify known hash
        let token = "test";
        let hash = service.hash_token(token);

        // SHA256 of "test" should always produce the same hash
        let expected_hash = "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08";
        assert_eq!(hash, expected_hash);
    }

    #[test]
    fn test_jwt_error_display() {
        let err = JwtError::TokenExpired;
        assert_eq!(err.to_string(), "Token expired");

        let err = JwtError::UserNotFound {
            user_id: Uuid::new_v4(),
        };
        assert!(err.to_string().contains("User not found"));

        let err = JwtError::InvalidSignature;
        assert_eq!(err.to_string(), "Invalid token signature");

        let err = JwtError::TokenRevoked;
        assert_eq!(err.to_string(), "Token has been revoked");
    }
}
