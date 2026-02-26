//! JWT Service Integration Tests
//!
//! Comprehensive tests for JWT authentication including:
//! - Access token generation and validation
//! - Refresh token rotation and replay attack detection
//! - Token revocation mechanisms (user-wide and family-wide)
//! - Token expiration enforcement
//! - Role and permission loading
//!
//! Run with: cargo test --test jwt_service_tests

use chrono::{Duration, Utc};
use hr_graphql_server::{
    auth::{JwtConfig, JwtError, JwtKeys, JwtService},
    models::{refresh_token, user},
    testing::{auth::TestUser, TestDatabase},
};
use sea_orm::{ActiveModelTrait, ActiveValue::Set, ColumnTrait, EntityTrait, QueryFilter};
use std::env;
use uuid::Uuid;

// ============================================================================
// Test Setup Helpers
// ============================================================================

// Test RSA keys (2048-bit) - FOR TESTING ONLY
// Generated with: openssl genrsa -out private.pem 2048 && openssl rsa -in private.pem -pubout -out public.pem
const TEST_PRIVATE_KEY: &str = r#"-----BEGIN PRIVATE KEY-----
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

const TEST_PUBLIC_KEY: &str = r#"-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAtsMgCmnjrom/PB1HOwxE
+qSf3LmVFm3J0mA+FvVpd+Bs0Mes5V5ep0P0n2OSV1tVV6vQ59Z584oCMtxnhHdr
vnUt7ANiHuW7mevai6arWY9t6gaXk3jgmZg024SLos8hgBZypGATXUnKIw3PO0/w
DRNLTSLyQNk1u7QFAYLP3WRSh/pQ8YH1jszCWSEXlU46L2vqsvwf4Ukb3YiBF1kb
2Npph0A3Q5NhiegrgxxYSBK6ShqhEZ5uH/uq6xjVz7T0F7IJ1V/+W8bK/OJt0vfx
2mxISifmOi84Qr5FhulLdgo1vrKfuzs8f2UA/p0Mvd4ME0NIOfP8rNonoIU/Lvpp
7wIDAQAB
-----END PUBLIC KEY-----"#;

async fn setup_jwt_service(test_db: &TestDatabase) -> JwtService {
    use jsonwebtoken::{DecodingKey, EncodingKey};
    use std::time::Duration;

    // Create JWT config
    let config = JwtConfig {
        access_ttl: Duration::from_secs(15 * 60), // 15 minutes
        refresh_ttl: Duration::from_secs(7 * 24 * 60 * 60), // 7 days
        issuer: "test-mountainhr-api".to_string(),
        audience: "test-mountainhr-app".to_string(),
    };

    // Create JWT keys from test keys
    let encoding_key = EncodingKey::from_rsa_pem(TEST_PRIVATE_KEY.as_bytes())
        .expect("Failed to parse test private key");
    let decoding_key = DecodingKey::from_rsa_pem(TEST_PUBLIC_KEY.as_bytes())
        .expect("Failed to parse test public key");

    let keys = JwtKeys {
        encoding_key,
        decoding_key,
    };

    JwtService::new(config, keys, test_db.connection().clone())
}

// ============================================================================
// Access Token Tests
// ============================================================================

#[tokio::test]
async fn test_generate_and_validate_access_token() {
    let test_db = TestDatabase::new()
        .await
        .expect("Failed to create test database");
    let jwt_service = setup_jwt_service(&test_db).await;

    // Create test user with roles and permissions
    let test_user = TestUser::admin(&test_db).await;

    // Generate access token
    let access_token = jwt_service
        .generate_access_token(
            test_user.id,
            test_user.email.clone(),
            test_user.display_name.clone(),
            test_user.department_id,
        )
        .await
        .expect("Failed to generate access token");

    // Token should not be empty
    assert!(!access_token.is_empty());

    // Validate token
    let claims = jwt_service
        .validate_access_token(&access_token)
        .await
        .expect("Failed to validate access token");

    // Verify claims
    assert_eq!(claims.sub, test_user.id.to_string());
    assert_eq!(claims.email, test_user.email);
    assert_eq!(claims.display_name, test_user.display_name);
    assert!(!claims.roles.is_empty(), "User should have roles");
    assert!(
        !claims.permissions.is_empty(),
        "User should have permissions"
    );
    assert_eq!(claims.iss, "test-mountainhr-api");
    assert_eq!(claims.aud, "test-mountainhr-app");

    test_db.cleanup().await;
}

#[tokio::test]
async fn test_access_token_contains_roles_and_permissions() {
    let test_db = TestDatabase::new()
        .await
        .expect("Failed to create test database");
    let jwt_service = setup_jwt_service(&test_db).await;

    let test_user = TestUser::admin(&test_db).await;

    let access_token = jwt_service
        .generate_access_token(
            test_user.id,
            test_user.email.clone(),
            test_user.display_name.clone(),
            None,
        )
        .await
        .expect("Failed to generate access token");

    let claims = jwt_service
        .validate_access_token(&access_token)
        .await
        .expect("Failed to validate token");

    // Admin should have Admin role
    assert!(
        claims.has_role("Admin"),
        "Admin user should have Admin role"
    );

    // Admin should have various permissions
    assert!(
        claims.permissions.len() > 0,
        "Admin should have permissions"
    );

    // Permissions should be in "resource:action" format
    for permission in &claims.permissions {
        assert!(
            permission.contains(':'),
            "Permission should be in 'resource:action' format: {}",
            permission
        );
    }

    test_db.cleanup().await;
}

#[tokio::test]
async fn test_expired_token_rejected() {
    use jsonwebtoken::{DecodingKey, EncodingKey};
    use std::time::Duration;

    let test_db = TestDatabase::new()
        .await
        .expect("Failed to create test database");

    // Create JWT service with immediate expiration (1 second)
    let config = JwtConfig {
        access_ttl: Duration::from_secs(1),
        refresh_ttl: Duration::from_secs(7 * 24 * 60 * 60),
        issuer: "test-mountainhr-api".to_string(),
        audience: "test-mountainhr-app".to_string(),
    };

    let encoding_key = EncodingKey::from_rsa_pem(TEST_PRIVATE_KEY.as_bytes())
        .expect("Failed to parse test private key");
    let decoding_key = DecodingKey::from_rsa_pem(TEST_PUBLIC_KEY.as_bytes())
        .expect("Failed to parse test public key");

    let keys = JwtKeys {
        encoding_key,
        decoding_key,
    };

    let jwt_service = JwtService::new(config, keys, test_db.connection().clone());
    let test_user = TestUser::admin(&test_db).await;

    let access_token = jwt_service
        .generate_access_token(
            test_user.id,
            test_user.email.clone(),
            test_user.display_name.clone(),
            None,
        )
        .await
        .expect("Failed to generate access token");

    // Wait for token to expire
    tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;

    // Validation should fail due to expiration
    let result = jwt_service.validate_access_token(&access_token).await;

    assert!(result.is_err(), "Expired token should be rejected");
    match result.unwrap_err() {
        JwtError::TokenExpired => {
            // Expected error
        }
        other => panic!("Expected TokenExpired, got: {:?}", other),
    }

    test_db.cleanup().await;
}

#[tokio::test]
async fn test_invalid_signature_rejected() {
    let test_db = TestDatabase::new()
        .await
        .expect("Failed to create test database");
    let jwt_service = setup_jwt_service(&test_db).await;

    let test_user = TestUser::admin(&test_db).await;

    let access_token = jwt_service
        .generate_access_token(
            test_user.id,
            test_user.email.clone(),
            test_user.display_name.clone(),
            None,
        )
        .await
        .expect("Failed to generate access token");

    // Tamper with the token (change last character)
    let mut tampered_token = access_token.clone();
    tampered_token.pop();
    tampered_token.push('X');

    // Validation should fail
    let result = jwt_service.validate_access_token(&tampered_token).await;

    assert!(result.is_err(), "Tampered token should be rejected");

    test_db.cleanup().await;
}

// ============================================================================
// Refresh Token Tests
// ============================================================================

#[tokio::test]
async fn test_generate_refresh_token() {
    let test_db = TestDatabase::new()
        .await
        .expect("Failed to create test database");
    let jwt_service = setup_jwt_service(&test_db).await;

    let test_user = TestUser::admin(&test_db).await;
    let family_id = Uuid::new_v4();

    let (plaintext_token, jwt_token) = jwt_service
        .generate_refresh_token(
            test_user.id,
            family_id,
            Some("Test Device".to_string()),
            Some("127.0.0.1".to_string()),
        )
        .await
        .expect("Failed to generate refresh token");

    // Plaintext token should be 64 hex characters (32 bytes * 2)
    assert_eq!(plaintext_token.len(), 64);

    // JWT token should not be empty
    assert!(!jwt_token.is_empty());

    // Verify token was stored in database
    let stored_tokens = refresh_token::Entity::find()
        .filter(refresh_token::Column::UserId.eq(test_user.id))
        .all(test_db.connection())
        .await
        .expect("Failed to query refresh tokens");

    assert_eq!(stored_tokens.len(), 1);
    assert_eq!(stored_tokens[0].user_id, test_user.id);
    assert_eq!(stored_tokens[0].token_family_id, family_id);
    assert!(stored_tokens[0].device_info.is_some());
    assert_eq!(
        stored_tokens[0].device_info.as_ref().unwrap(),
        "Test Device"
    );

    test_db.cleanup().await;
}

#[tokio::test]
async fn test_refresh_token_rotation() {
    let test_db = TestDatabase::new()
        .await
        .expect("Failed to create test database");
    let jwt_service = setup_jwt_service(&test_db).await;

    let test_user = TestUser::admin(&test_db).await;
    let family_id = Uuid::new_v4();

    // Generate initial refresh token
    let (plaintext_token, jwt_token) = jwt_service
        .generate_refresh_token(test_user.id, family_id, None, None)
        .await
        .expect("Failed to generate refresh token");

    // Use refresh token to get new access token (rotation)
    let result = jwt_service
        .refresh_access_token(&jwt_token, &plaintext_token, None, None)
        .await
        .expect("Failed to refresh access token");

    let (new_access_token, new_refresh_jwt, new_plaintext_token) = result;

    // New tokens should be different
    assert_ne!(plaintext_token, new_plaintext_token);
    assert_ne!(jwt_token, new_refresh_jwt);
    assert!(!new_access_token.is_empty());

    // Old token should be marked as used
    let old_tokens = refresh_token::Entity::find()
        .filter(refresh_token::Column::UserId.eq(test_user.id))
        .filter(refresh_token::Column::LastUsedAt.is_not_null())
        .all(test_db.connection())
        .await
        .expect("Failed to query tokens");

    assert_eq!(old_tokens.len(), 1, "Old token should be marked as used");

    // Should have 2 tokens total (old used, new active)
    let all_tokens = refresh_token::Entity::find()
        .filter(refresh_token::Column::UserId.eq(test_user.id))
        .all(test_db.connection())
        .await
        .expect("Failed to query tokens");

    assert_eq!(all_tokens.len(), 2, "Should have old and new tokens");

    test_db.cleanup().await;
}

#[tokio::test]
async fn test_refresh_token_reuse_triggers_family_revocation() {
    let test_db = TestDatabase::new()
        .await
        .expect("Failed to create test database");
    let jwt_service = setup_jwt_service(&test_db).await;

    let test_user = TestUser::admin(&test_db).await;
    let family_id = Uuid::new_v4();

    // Generate refresh token
    let (plaintext_token, jwt_token) = jwt_service
        .generate_refresh_token(test_user.id, family_id, None, None)
        .await
        .expect("Failed to generate refresh token");

    // Use token once (should succeed)
    jwt_service
        .refresh_access_token(&jwt_token, &plaintext_token, None, None)
        .await
        .expect("First use should succeed");

    // Try to use same token again (REPLAY ATTACK)
    let result = jwt_service
        .refresh_access_token(&jwt_token, &plaintext_token, None, None)
        .await;

    // Should fail with RefreshTokenReused error
    assert!(result.is_err(), "Token reuse should be detected");
    match result.unwrap_err() {
        JwtError::RefreshTokenReused => {
            // Expected error
        }
        other => panic!("Expected RefreshTokenReused, got: {:?}", other),
    }

    // Entire token family should be revoked
    let family_tokens = refresh_token::Entity::find()
        .filter(refresh_token::Column::TokenFamilyId.eq(family_id))
        .all(test_db.connection())
        .await
        .expect("Failed to query tokens");

    for token in family_tokens {
        assert!(
            token.revoked_at.is_some(),
            "All tokens in family should be revoked"
        );
    }

    test_db.cleanup().await;
}

#[tokio::test]
async fn test_refresh_token_expiration() {
    let test_db = TestDatabase::new()
        .await
        .expect("Failed to create test database");

    // Configure very short refresh token TTL
    env::set_var("JWT_REFRESH_TTL_DAYS", "0");

    let jwt_service = setup_jwt_service(&test_db).await;
    let test_user = TestUser::admin(&test_db).await;
    let family_id = Uuid::new_v4();

    let (plaintext_token, jwt_token) = jwt_service
        .generate_refresh_token(test_user.id, family_id, None, None)
        .await
        .expect("Failed to generate refresh token");

    // Manually update token to be expired in database
    let token_record = refresh_token::Entity::find()
        .filter(refresh_token::Column::UserId.eq(test_user.id))
        .one(test_db.connection())
        .await
        .expect("Failed to find token")
        .expect("Token should exist");

    let mut active_token: refresh_token::ActiveModel = token_record.into();
    active_token.expires_at = Set(Utc::now() - Duration::hours(1));
    active_token
        .update(test_db.connection())
        .await
        .expect("Failed to update token");

    // Try to use expired token
    let result = jwt_service
        .refresh_access_token(&jwt_token, &plaintext_token, None, None)
        .await;

    assert!(result.is_err(), "Expired refresh token should be rejected");

    // Reset to normal TTL
    env::set_var("JWT_REFRESH_TTL_DAYS", "7");

    test_db.cleanup().await;
}

// ============================================================================
// Token Revocation Tests
// ============================================================================

#[tokio::test]
async fn test_revoke_all_user_tokens() {
    let test_db = TestDatabase::new()
        .await
        .expect("Failed to create test database");
    let jwt_service = setup_jwt_service(&test_db).await;

    let test_user = TestUser::admin(&test_db).await;

    // Generate access token
    let access_token = jwt_service
        .generate_access_token(
            test_user.id,
            test_user.email.clone(),
            test_user.display_name.clone(),
            None,
        )
        .await
        .expect("Failed to generate access token");

    // Generate multiple refresh tokens (simulating multiple devices)
    let family1 = Uuid::new_v4();
    let family2 = Uuid::new_v4();

    jwt_service
        .generate_refresh_token(test_user.id, family1, Some("Device 1".to_string()), None)
        .await
        .expect("Failed to generate refresh token 1");

    jwt_service
        .generate_refresh_token(test_user.id, family2, Some("Device 2".to_string()), None)
        .await
        .expect("Failed to generate refresh token 2");

    // Token should be valid before revocation
    jwt_service
        .validate_access_token(&access_token)
        .await
        .expect("Token should be valid before revocation");

    // Wait to ensure revocation timestamp is definitely after token issue time
    // (tokens_valid_after must be > iat for revocation to work)
    tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;

    // Revoke all tokens for user (emergency logout)
    jwt_service
        .revoke_all_user_tokens(test_user.id)
        .await
        .expect("Failed to revoke all tokens");

    // Access token should now be rejected
    let result = jwt_service.validate_access_token(&access_token).await;

    assert!(result.is_err(), "Token should be rejected after revocation");
    match result.unwrap_err() {
        JwtError::TokenRevoked => {
            // Expected error
        }
        other => panic!("Expected TokenRevoked, got: {:?}", other),
    }

    // All refresh tokens should be revoked
    let refresh_tokens = refresh_token::Entity::find()
        .filter(refresh_token::Column::UserId.eq(test_user.id))
        .all(test_db.connection())
        .await
        .expect("Failed to query tokens");

    for token in refresh_tokens {
        assert!(
            token.revoked_at.is_some(),
            "All refresh tokens should be revoked"
        );
    }

    // tokens_valid_after should be updated
    let user = user::Entity::find_by_id(test_user.id)
        .one(test_db.connection())
        .await
        .expect("Failed to find user")
        .expect("User should exist");

    assert!(
        user.tokens_valid_after > test_user.created_at,
        "tokens_valid_after should be updated"
    );

    test_db.cleanup().await;
}

#[tokio::test]
async fn test_tokens_valid_after_enforcement() {
    let test_db = TestDatabase::new()
        .await
        .expect("Failed to create test database");
    let jwt_service = setup_jwt_service(&test_db).await;

    let test_user = TestUser::admin(&test_db).await;

    // Generate token
    let access_token = jwt_service
        .generate_access_token(
            test_user.id,
            test_user.email.clone(),
            test_user.display_name.clone(),
            None,
        )
        .await
        .expect("Failed to generate access token");

    // Token should be valid
    jwt_service
        .validate_access_token(&access_token)
        .await
        .expect("Token should be valid initially");

    // Update tokens_valid_after to future (invalidate all existing tokens)
    let mut user_model: user::ActiveModel = user::Entity::find_by_id(test_user.id)
        .one(test_db.connection())
        .await
        .expect("Failed to find user")
        .expect("User should exist")
        .into();

    user_model.tokens_valid_after = Set(Utc::now() + Duration::hours(1));
    user_model
        .update(test_db.connection())
        .await
        .expect("Failed to update user");

    // Token should now be rejected
    let result = jwt_service.validate_access_token(&access_token).await;

    assert!(
        result.is_err(),
        "Token issued before tokens_valid_after should be rejected"
    );
    match result.unwrap_err() {
        JwtError::TokenRevoked => {
            // Expected error
        }
        other => panic!("Expected TokenRevoked, got: {:?}", other),
    }

    test_db.cleanup().await;
}

#[tokio::test]
async fn test_revoke_token_family() {
    let test_db = TestDatabase::new()
        .await
        .expect("Failed to create test database");
    let jwt_service = setup_jwt_service(&test_db).await;

    let test_user = TestUser::admin(&test_db).await;
    let family_id = Uuid::new_v4();

    // Generate multiple tokens in same family (rotation chain)
    jwt_service
        .generate_refresh_token(test_user.id, family_id, None, None)
        .await
        .expect("Failed to generate token 1");

    jwt_service
        .generate_refresh_token(test_user.id, family_id, None, None)
        .await
        .expect("Failed to generate token 2");

    jwt_service
        .generate_refresh_token(test_user.id, family_id, None, None)
        .await
        .expect("Failed to generate token 3");

    // Verify all tokens are active
    let tokens_before = refresh_token::Entity::find()
        .filter(refresh_token::Column::TokenFamilyId.eq(family_id))
        .all(test_db.connection())
        .await
        .expect("Failed to query tokens");

    assert_eq!(tokens_before.len(), 3);
    for token in &tokens_before {
        assert!(token.revoked_at.is_none(), "Token should be active");
    }

    // Revoke entire family
    jwt_service
        .revoke_token_family(family_id)
        .await
        .expect("Failed to revoke token family");

    // All tokens in family should be revoked
    let tokens_after = refresh_token::Entity::find()
        .filter(refresh_token::Column::TokenFamilyId.eq(family_id))
        .all(test_db.connection())
        .await
        .expect("Failed to query tokens");

    assert_eq!(tokens_after.len(), 3);
    for token in &tokens_after {
        assert!(
            token.revoked_at.is_some(),
            "Token should be revoked after family revocation"
        );
    }

    test_db.cleanup().await;
}

// ============================================================================
// Maintenance Tests
// ============================================================================

#[tokio::test]
async fn test_cleanup_expired_tokens() {
    let test_db = TestDatabase::new()
        .await
        .expect("Failed to create test database");
    let jwt_service = setup_jwt_service(&test_db).await;

    let test_user = TestUser::admin(&test_db).await;
    let family_id = Uuid::new_v4();

    // Generate token
    let (_, _) = jwt_service
        .generate_refresh_token(test_user.id, family_id, None, None)
        .await
        .expect("Failed to generate token");

    // Manually expire token
    let token = refresh_token::Entity::find()
        .filter(refresh_token::Column::UserId.eq(test_user.id))
        .one(test_db.connection())
        .await
        .expect("Failed to find token")
        .expect("Token should exist");

    let mut active_token: refresh_token::ActiveModel = token.into();
    active_token.expires_at = Set(Utc::now() - Duration::days(1));
    active_token
        .update(test_db.connection())
        .await
        .expect("Failed to expire token");

    // Run cleanup
    let deleted_count = jwt_service
        .cleanup_expired_tokens()
        .await
        .expect("Failed to cleanup expired tokens");

    assert_eq!(deleted_count, 1, "Should delete 1 expired token");

    // Token should be deleted
    let remaining_tokens = refresh_token::Entity::find()
        .filter(refresh_token::Column::UserId.eq(test_user.id))
        .all(test_db.connection())
        .await
        .expect("Failed to query tokens");

    assert_eq!(remaining_tokens.len(), 0, "Expired token should be deleted");

    test_db.cleanup().await;
}

// ============================================================================
// Role and Permission Loading Tests
// ============================================================================

#[tokio::test]
async fn test_load_user_roles_and_permissions() {
    let test_db = TestDatabase::new()
        .await
        .expect("Failed to create test database");
    let jwt_service = setup_jwt_service(&test_db).await;

    let test_user = TestUser::admin(&test_db).await;

    let (roles, permissions) = jwt_service
        .load_user_roles_permissions(test_user.id)
        .await
        .expect("Failed to load roles and permissions");

    // Admin should have at least one role
    assert!(!roles.is_empty(), "Admin should have roles");
    assert!(roles.contains(&"Admin".to_string()));

    // Admin should have permissions
    assert!(!permissions.is_empty(), "Admin should have permissions");

    // Permissions should be in "resource:action" format
    for permission in &permissions {
        assert!(
            permission.contains(':'),
            "Permission should contain ':' separator"
        );
    }

    test_db.cleanup().await;
}

#[tokio::test]
async fn test_user_with_no_roles() {
    let test_db = TestDatabase::new()
        .await
        .expect("Failed to create test database");
    let jwt_service = setup_jwt_service(&test_db).await;

    // Create user without role assignments
    let user = TestUser::without_roles(&test_db).await;

    let (roles, permissions) = jwt_service
        .load_user_roles_permissions(user.id)
        .await
        .expect("Failed to load roles and permissions");

    assert!(
        roles.is_empty(),
        "User without role assignments should have no roles"
    );
    assert!(
        permissions.is_empty(),
        "User without roles should have no permissions"
    );

    test_db.cleanup().await;
}
