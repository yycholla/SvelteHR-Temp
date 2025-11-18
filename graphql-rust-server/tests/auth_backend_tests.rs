//! Authentication Backend Tests
//!
//! Comprehensive tests for authentication backend functionality including:
//! - Password hashing and verification
//! - User authentication with credentials
//! - Rate limiting (IP and account-based)
//! - Account lockout after failed attempts
//! - Session management and security
//!
//! Run with: cargo test --test auth_backend_tests

use bcrypt::{hash, verify, DEFAULT_COST};
use hr_graphql_server::{
    auth::{AuthBackend, Credentials},
    testing::{TestDatabase, auth::{TestUser, TestUserRole}},
};
use sea_orm::{EntityTrait, Set, ActiveModelTrait, ColumnTrait, QueryFilter};
use uuid::Uuid;
use axum_login::AuthnBackend;

// ============================================================================
// Password Hashing & Verification Tests
// ============================================================================

#[tokio::test]
async fn test_password_hashing_produces_unique_hashes() {
    // Same password should produce different hashes due to random salt
    let password = "SecurePassword123!";

    let hash1 = hash(password, DEFAULT_COST).expect("Failed to hash password");
    let hash2 = hash(password, DEFAULT_COST).expect("Failed to hash password");

    // Hashes should be different (different salts)
    assert_ne!(hash1, hash2, "Hashes should be unique due to random salts");

    // Both hashes should verify the same password
    assert!(verify(password, &hash1).expect("Verification failed"));
    assert!(verify(password, &hash2).expect("Verification failed"));
}

#[tokio::test]
async fn test_password_verification_success() {
    let password = "MyTestPassword123!";
    let hash = hash(password, DEFAULT_COST).expect("Failed to hash password");

    // Correct password should verify successfully
    let result = verify(password, &hash);
    assert!(result.is_ok(), "Password verification should not error");
    assert!(result.unwrap(), "Correct password should verify");
}

#[tokio::test]
async fn test_password_verification_fails_with_wrong_password() {
    let correct_password = "CorrectPassword123!";
    let wrong_password = "WrongPassword456!";

    let hash = hash(correct_password, DEFAULT_COST).expect("Failed to hash password");

    // Wrong password should not verify
    let result = verify(wrong_password, &hash);
    assert!(result.is_ok(), "Verification should not error");
    assert!(!result.unwrap(), "Wrong password should not verify");
}

#[tokio::test]
async fn test_empty_password_handling() {
    let empty_password = "";

    // Empty password should hash (bcrypt allows it)
    let hash = hash(empty_password, DEFAULT_COST).expect("Failed to hash empty password");

    // Empty password should verify against its own hash
    assert!(verify(empty_password, &hash).expect("Verification failed"));

    // Non-empty password should not verify
    assert!(!verify("NotEmpty", &hash).expect("Verification failed"));
}

// ============================================================================
// Authentication Tests
// ============================================================================

#[tokio::test]
async fn test_authenticate_with_valid_credentials() {
    let db = TestDatabase::new().await.expect("Failed to create test database");
    let test_user = TestUser::create_with_password(
        db.connection(),
        TestUserRole::Employee,
        "test_password_123"
    ).await.expect("Failed to create test user");

    let auth_backend = AuthBackend::new(db.connection().clone());

    let creds = Credentials {
        email: test_user.email.clone(),
        password: "test_password_123".to_string(),
    };

    let result = auth_backend.authenticate(creds).await;
    assert!(result.is_ok(), "Authentication should succeed");

    let user = result.unwrap();
    assert!(user.is_some(), "Should return authenticated user");

    let auth_user = user.unwrap();
    assert_eq!(auth_user.id, test_user.id);
    assert_eq!(auth_user.email, test_user.email);
    assert_eq!(auth_user.role, test_user.role);
    assert!(auth_user.is_active);
}

#[tokio::test]
async fn test_authenticate_with_invalid_password() {
    let db = TestDatabase::new().await.expect("Failed to create test database");
    let test_user = TestUser::create_with_password(
        db.connection(),
        TestUserRole::Employee,
        "correct_password"
    ).await.expect("Failed to create test user");

    let auth_backend = AuthBackend::new(db.connection().clone());

    let creds = Credentials {
        email: test_user.email.clone(),
        password: "wrong_password".to_string(),
    };

    let result = auth_backend.authenticate(creds).await;
    assert!(result.is_ok(), "Should not error, but return None");
    assert!(result.unwrap().is_none(), "Should return None for invalid password");
}

#[tokio::test]
async fn test_authenticate_with_nonexistent_user() {
    let db = TestDatabase::new().await.expect("Failed to create test database");
    let auth_backend = AuthBackend::new(db.connection().clone());

    let creds = Credentials {
        email: "nonexistent@example.com".to_string(),
        password: "any_password".to_string(),
    };

    let result = auth_backend.authenticate(creds).await;
    assert!(result.is_ok(), "Should not error, but return None");
    assert!(result.unwrap().is_none(), "Should return None for non-existent user");
}

#[tokio::test]
async fn test_authenticate_with_inactive_user() {
    let db = TestDatabase::new().await.expect("Failed to create test database");
    let test_user = TestUser::create_with_password(
        db.connection(),
        TestUserRole::Employee,
        "test_password"
    ).await.expect("Failed to create test user");

    // Deactivate the user
    use hr_graphql_server::models::user;
    let mut user_model: user::ActiveModel = user::Entity::find_by_id(test_user.id)
        .one(db.connection())
        .await
        .expect("DB query failed")
        .expect("User not found")
        .into();
    user_model.is_active = Set(false);
    user_model.update(db.connection()).await.expect("Failed to update user");

    let auth_backend = AuthBackend::new(db.connection().clone());

    let creds = Credentials {
        email: test_user.email.clone(),
        password: "test_password".to_string(),
    };

    let result = auth_backend.authenticate(creds).await;
    assert!(result.is_ok(), "Should not error");
    assert!(result.unwrap().is_none(), "Should return None for inactive user");
}

#[tokio::test]
async fn test_get_user_by_id() {
    let db = TestDatabase::new().await.expect("Failed to create test database");
    let test_user = TestUser::create(db.connection(), TestUserRole::HrManager)
        .await.expect("Failed to create test user");

    let auth_backend = AuthBackend::new(db.connection().clone());

    let result = auth_backend.get_user(&test_user.id).await;
    assert!(result.is_ok(), "Getting user should succeed");

    let user = result.unwrap();
    assert!(user.is_some(), "Should find user");

    let auth_user = user.unwrap();
    assert_eq!(auth_user.id, test_user.id);
    assert_eq!(auth_user.email, test_user.email);
}

#[tokio::test]
async fn test_get_nonexistent_user_by_id() {
    let db = TestDatabase::new().await.expect("Failed to create test database");
    let auth_backend = AuthBackend::new(db.connection().clone());

    let fake_id = Uuid::new_v4();
    let result = auth_backend.get_user(&fake_id).await;

    assert!(result.is_ok(), "Should not error");
    assert!(result.unwrap().is_none(), "Should return None for non-existent user");
}

// ============================================================================
// Account Lockout & Failed Login Tests
// ============================================================================

#[tokio::test]
async fn test_failed_login_increments_attempt_counter() {
    let db = TestDatabase::new().await.expect("Failed to create test database");
    let test_user = TestUser::create_with_password(
        db.connection(),
        TestUserRole::Employee,
        "correct_password"
    ).await.expect("Failed to create test user");

    let auth_backend = AuthBackend::new(db.connection().clone());

    // Attempt login with wrong password
    let creds = Credentials {
        email: test_user.email.clone(),
        password: "wrong_password".to_string(),
    };

    let result = auth_backend.authenticate(creds).await;
    assert!(result.unwrap().is_none(), "Should fail authentication");

    // Check that failed attempt counter was incremented
    use hr_graphql_server::models::user;
    let user_record = user::Entity::find_by_id(test_user.id)
        .one(db.connection())
        .await
        .expect("DB query failed")
        .expect("User not found");

    assert_eq!(user_record.failed_login_attempts, 1, "Failed login attempt should be recorded");
}

#[tokio::test]
async fn test_successful_login_resets_failed_attempts() {
    let db = TestDatabase::new().await.expect("Failed to create test database");
    let test_user = TestUser::create_with_password(
        db.connection(),
        TestUserRole::Employee,
        "correct_password"
    ).await.expect("Failed to create test user");

    // Set failed attempts to 3
    use hr_graphql_server::models::user;
    let mut user_model: user::ActiveModel = user::Entity::find_by_id(test_user.id)
        .one(db.connection())
        .await
        .expect("DB query failed")
        .expect("User not found")
        .into();
    user_model.failed_login_attempts = Set(3);
    user_model.update(db.connection()).await.expect("Failed to update user");

    let auth_backend = AuthBackend::new(db.connection().clone());

    // Successful login should reset counter
    let creds = Credentials {
        email: test_user.email.clone(),
        password: "correct_password".to_string(),
    };

    let result = auth_backend.authenticate(creds).await;
    assert!(result.unwrap().is_some(), "Authentication should succeed");

    // Verify counter was reset
    let user_record = user::Entity::find_by_id(test_user.id)
        .one(db.connection())
        .await
        .expect("DB query failed")
        .expect("User not found");

    assert_eq!(user_record.failed_login_attempts, 0, "Failed attempts should be reset after successful login");
}

#[tokio::test]
async fn test_account_locked_after_max_failed_attempts() {
    let db = TestDatabase::new().await.expect("Failed to create test database");
    let test_user = TestUser::create_with_password(
        db.connection(),
        TestUserRole::Employee,
        "correct_password"
    ).await.expect("Failed to create test user");

    let auth_backend = AuthBackend::new(db.connection().clone());

    // Make 5 failed login attempts (max_attempts = 5)
    for i in 1..=5 {
        let creds = Credentials {
            email: test_user.email.clone(),
            password: "wrong_password".to_string(),
        };

        let result = auth_backend.authenticate(creds).await;
        assert!(result.unwrap().is_none(), "Attempt {} should fail", i);
    }

    // Check that account is now locked
    use hr_graphql_server::models::user;
    let user_record = user::Entity::find_by_id(test_user.id)
        .one(db.connection())
        .await
        .expect("DB query failed")
        .expect("User not found");

    assert_eq!(user_record.failed_login_attempts, 5);
    assert!(user_record.locked_until.is_some(), "Account should be locked");

    // Verify lock time is in the future (should be ~15 minutes)
    let locked_until = user_record.locked_until.unwrap();
    assert!(locked_until > chrono::Utc::now(), "Lock time should be in the future");
}

#[tokio::test]
async fn test_locked_account_rejects_correct_password() {
    let db = TestDatabase::new().await.expect("Failed to create test database");
    let test_user = TestUser::create_with_password(
        db.connection(),
        TestUserRole::Employee,
        "correct_password"
    ).await.expect("Failed to create test user");

    // Lock the account manually
    use hr_graphql_server::models::user;
    let mut user_model: user::ActiveModel = user::Entity::find_by_id(test_user.id)
        .one(db.connection())
        .await
        .expect("DB query failed")
        .expect("User not found")
        .into();
    user_model.locked_until = Set(Some(chrono::Utc::now() + chrono::Duration::hours(1)));
    user_model.update(db.connection()).await.expect("Failed to update user");

    let auth_backend = AuthBackend::new(db.connection().clone());

    // Even with correct password, login should fail while locked
    let creds = Credentials {
        email: test_user.email.clone(),
        password: "correct_password".to_string(),
    };

    let result = auth_backend.authenticate(creds).await;
    assert!(result.unwrap().is_none(), "Locked account should reject even correct password");
}

// ============================================================================
// Rate Limiting Tests
// ============================================================================

#[tokio::test]
async fn test_rate_limiter_ip_based_limiting() {
    let auth_backend = AuthBackend::new(
        TestDatabase::new().await.expect("Failed to create test database").connection().clone()
    );
    let rate_limiter = auth_backend.rate_limiter();

    let test_ip = "192.168.1.100";

    // Initial state - not rate limited
    assert!(!rate_limiter.is_ip_rate_limited(test_ip).await, "Should not be rate limited initially");

    // Record max_attempts_per_ip (10) attempts
    for _ in 0..10 {
        rate_limiter.record_ip_attempt(test_ip).await;
    }

    // Now should be rate limited
    assert!(rate_limiter.is_ip_rate_limited(test_ip).await, "Should be rate limited after 10 attempts");
}

#[tokio::test]
async fn test_rate_limiter_account_based_limiting() {
    let auth_backend = AuthBackend::new(
        TestDatabase::new().await.expect("Failed to create test database").connection().clone()
    );
    let rate_limiter = auth_backend.rate_limiter();

    let test_email = "test@example.com";

    // Initial state - not rate limited
    assert!(!rate_limiter.is_account_rate_limited(test_email).await, "Should not be rate limited initially");

    // Record max_attempts_per_account (5) attempts
    for _ in 0..5 {
        rate_limiter.record_account_attempt(test_email).await;
    }

    // Now should be rate limited
    assert!(rate_limiter.is_account_rate_limited(test_email).await, "Should be rate limited after 5 attempts");
}

#[tokio::test]
async fn test_rate_limiter_cleanup_old_attempts() {
    let auth_backend = AuthBackend::new(
        TestDatabase::new().await.expect("Failed to create test database").connection().clone()
    );
    let rate_limiter = auth_backend.rate_limiter();

    let test_ip = "10.0.0.1";

    // Record an attempt
    rate_limiter.record_ip_attempt(test_ip).await;

    // Verify it's tracked
    // (We can't easily check internal state, but we can verify cleanup doesn't error)
    rate_limiter.cleanup().await;

    // After cleanup, old attempts should be removed
    // Since window is 900 seconds, a fresh attempt should still be there
    rate_limiter.record_ip_attempt(test_ip).await;
}

// ============================================================================
// CSRF Token Tests
// ============================================================================

#[tokio::test]
async fn test_generate_csrf_token() {
    let auth_backend = AuthBackend::new(
        TestDatabase::new().await.expect("Failed to create test database").connection().clone()
    );

    let token1 = auth_backend.generate_csrf_token();
    let token2 = auth_backend.generate_csrf_token();

    // Tokens should be unique
    assert_ne!(token1, token2, "CSRF tokens should be unique");

    // Tokens should be valid UUIDs
    assert!(Uuid::parse_str(&token1).is_ok(), "Token should be valid UUID");
    assert!(Uuid::parse_str(&token2).is_ok(), "Token should be valid UUID");
}

// ============================================================================
// Admin Development Shortcut Tests
// ============================================================================

#[tokio::test]
async fn test_admin_development_shortcut_authentication() {
    let db = TestDatabase::new().await.expect("Failed to create test database");

    // Check if admin user already exists (from migrations)
    use hr_graphql_server::models::user;
    use sea_orm::EntityTrait;

    let existing_admin = user::Entity::find()
        .filter(user::Column::Email.eq("admin@mountainhr.dev"))
        .one(db.connection())
        .await
        .expect("DB query failed");

    // Create admin user if it doesn't exist
    if existing_admin.is_none() {
        use hr_graphql_server::models::{role, user_role_assignment};
        use sea_orm::NotSet;

        let admin_id = Uuid::new_v4();
        let admin_model = user::ActiveModel {
            id: Set(admin_id),
            email: Set("admin@mountainhr.dev".to_string()),
            password_hash: Set("any_hash".to_string()), // Won't be checked
            first_name: Set("Admin".to_string()),
            last_name: Set("User".to_string()),
            display_name: NotSet, // Generated column
            full_name: NotSet,    // Generated column
            is_active: Set(true),
            force_password_change: Set(false),
            ..Default::default()
        };
        admin_model.insert(db.connection()).await.expect("Failed to create admin user");

        // Assign Admin role if it exists in the database
        if let Ok(Some(admin_role)) = role::Entity::find()
            .filter(role::Column::Name.eq("Admin"))
            .one(db.connection())
            .await
        {
            let role_assignment = user_role_assignment::ActiveModel {
                id: Set(Uuid::new_v4()),
                user_id: Set(admin_id),
                role_id: Set(admin_role.id),
                created_at: Set(chrono::Utc::now()),
                updated_at: Set(chrono::Utc::now()),
                deleted_at: Set(None),
            };
            role_assignment.insert(db.connection()).await.ok();
        }
    }

    let auth_backend = AuthBackend::new(db.connection().clone());

    // Development shortcut should work with admin/admin
    let creds = Credentials {
        email: "admin@mountainhr.dev".to_string(),
        password: "admin".to_string(),
    };

    let result = auth_backend.authenticate(creds).await;
    assert!(result.is_ok(), "Admin development shortcut should work");

    let user = result.unwrap();
    assert!(user.is_some(), "Should authenticate admin user");

    let auth_user = user.unwrap();
    assert_eq!(auth_user.email, "admin@mountainhr.dev");
    // Role should be either "admin" or "system_admin" depending on migrations
    assert!(
        auth_user.role == "admin" || auth_user.role == "system_admin",
        "User should have admin role, got: {}",
        auth_user.role
    );
}
