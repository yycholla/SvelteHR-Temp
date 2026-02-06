//! Tests for m20251226_002_enforce_email_rules migration
//!
//! Verifies email validation constraint enforcement:
//! - CHECK constraint creation and removal
//! - Valid email acceptance (non-empty strings)
//! - Invalid email rejection (NULL, empty, whitespace-only)
//! - Idempotent up and down migrations

use migration::m20251226_002_enforce_email_rules::Migration;
use migration::{Migrator, MigratorTrait};
use sea_orm::{Database, DatabaseConnection, DbErr, Statement};
use sea_orm_migration::prelude::*;

/// Helper to get test database connection
async fn get_test_db() -> Result<DatabaseConnection, DbErr> {
    let database_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgres://postgres:postgres@localhost/test_db".to_string());
    Database::connect(&database_url).await
}

/// Helper to check if a constraint exists
async fn constraint_exists(
    db: &DatabaseConnection,
    table: &str,
    constraint_name: &str,
) -> Result<bool, DbErr> {
    let result = db
        .query_one(Statement::from_sql_and_values(
            db.get_database_backend(),
            r#"
            SELECT EXISTS (
                SELECT 1 FROM information_schema.table_constraints
                WHERE table_schema = 'hr_public'
                AND table_name = $1
                AND constraint_name = $2
                AND constraint_type = 'CHECK'
            )
            "#,
            vec![table.into(), constraint_name.into()],
        ))
        .await?;

    Ok(result.map(|row| row.try_get::<bool>("", "exists").unwrap_or(false)).unwrap_or(false))
}

/// Helper to insert a test user with specified email
async fn insert_test_user(db: &DatabaseConnection, email: Option<&str>) -> Result<(), DbErr> {
    let email_value = match email {
        Some(e) => format!("'{}'", e.replace('\'', "''")),
        None => "NULL".to_string(),
    };

    let sql = format!(
        r#"
        INSERT INTO hr_public.users (id, email, hashed_password, created_at, updated_at)
        VALUES (gen_random_uuid(), {}, 'test_hash', NOW(), NOW())
        "#,
        email_value
    );

    db.execute(Statement::from_string(db.get_database_backend(), sql))
        .await?;

    Ok(())
}

/// Helper to clean up test users
async fn cleanup_test_users(db: &DatabaseConnection) -> Result<(), DbErr> {
    db.execute(Statement::from_string(
        db.get_database_backend(),
        "DELETE FROM hr_public.users WHERE hashed_password = 'test_hash'".to_string(),
    ))
    .await?;

    Ok(())
}

#[tokio::test]
async fn test_migration_compiles() {
    // This test simply verifies the migration struct compiles
    let _migration = Migration;
}

#[tokio::test]
async fn test_up_migration() {
    let db = get_test_db().await.expect("Failed to connect to test database");
    let schema_manager = SchemaManager::new(&db);

    // Run migration
    Migration.up(&schema_manager).await.expect("Failed to run up migration");

    // Verify constraint exists
    assert!(
        constraint_exists(&db, "users", "chk_users_email_not_empty")
            .await
            .expect("Failed to check constraint"),
        "chk_users_email_not_empty constraint should exist"
    );
}

#[tokio::test]
async fn test_constraint_rejects_null_email() {
    let db = get_test_db().await.expect("Failed to connect to test database");
    let schema_manager = SchemaManager::new(&db);

    // Ensure migration is run
    Migration.up(&schema_manager).await.expect("Failed to run up migration");

    // Attempt to insert user with NULL email - should fail
    let result = insert_test_user(&db, None).await;

    assert!(result.is_err(), "Should reject NULL email");

    // Verify error message mentions constraint
    if let Err(err) = result {
        let err_msg = err.to_string();
        assert!(
            err_msg.contains("chk_users_email_not_empty")
                || err_msg.contains("constraint")
                || err_msg.contains("violates check constraint"),
            "Error should mention constraint violation: {}",
            err_msg
        );
    }

    // Cleanup
    let _ = cleanup_test_users(&db).await;
}

#[tokio::test]
async fn test_constraint_rejects_empty_email() {
    let db = get_test_db().await.expect("Failed to connect to test database");
    let schema_manager = SchemaManager::new(&db);

    // Ensure migration is run
    Migration.up(&schema_manager).await.expect("Failed to run up migration");

    // Attempt to insert user with empty string email - should fail
    let result = insert_test_user(&db, Some("")).await;

    assert!(result.is_err(), "Should reject empty email");

    // Verify error message mentions constraint
    if let Err(err) = result {
        let err_msg = err.to_string();
        assert!(
            err_msg.contains("chk_users_email_not_empty")
                || err_msg.contains("constraint")
                || err_msg.contains("violates check constraint"),
            "Error should mention constraint violation: {}",
            err_msg
        );
    }

    // Cleanup
    let _ = cleanup_test_users(&db).await;
}

#[tokio::test]
async fn test_constraint_rejects_whitespace_only_email() {
    let db = get_test_db().await.expect("Failed to connect to test database");
    let schema_manager = SchemaManager::new(&db);

    // Ensure migration is run
    Migration.up(&schema_manager).await.expect("Failed to run up migration");

    // Test various whitespace patterns
    let whitespace_emails = vec![
        "   ",      // spaces only
        "\t",       // tab only
        "\n",       // newline only
        "  \t  ",   // mixed whitespace
        " \n \t ",  // multiple whitespace types
    ];

    for email in whitespace_emails {
        let result = insert_test_user(&db, Some(email)).await;

        assert!(
            result.is_err(),
            "Should reject whitespace-only email: {:?}",
            email
        );

        // Cleanup any accidentally inserted data
        let _ = cleanup_test_users(&db).await;
    }
}

#[tokio::test]
async fn test_constraint_allows_valid_email() {
    let db = get_test_db().await.expect("Failed to connect to test database");
    let schema_manager = SchemaManager::new(&db);

    // Ensure migration is run
    Migration.up(&schema_manager).await.expect("Failed to run up migration");

    // Attempt to insert user with valid email - should succeed
    let result = insert_test_user(&db, Some("test@example.com")).await;

    assert!(result.is_ok(), "Should accept valid email: {:?}", result.err());

    // Cleanup
    cleanup_test_users(&db).await.expect("Failed to cleanup test users");
}

#[tokio::test]
async fn test_constraint_allows_email_with_surrounding_whitespace() {
    let db = get_test_db().await.expect("Failed to connect to test database");
    let schema_manager = SchemaManager::new(&db);

    // Ensure migration is run
    Migration.up(&schema_manager).await.expect("Failed to run up migration");

    // Email with surrounding whitespace should be accepted (trim() removes it)
    let result = insert_test_user(&db, Some("  test@example.com  ")).await;

    assert!(
        result.is_ok(),
        "Should accept email with surrounding whitespace: {:?}",
        result.err()
    );

    // Cleanup
    cleanup_test_users(&db).await.expect("Failed to cleanup test users");
}

#[tokio::test]
async fn test_constraint_allows_various_valid_email_formats() {
    let db = get_test_db().await.expect("Failed to connect to test database");
    let schema_manager = SchemaManager::new(&db);

    // Ensure migration is run
    Migration.up(&schema_manager).await.expect("Failed to run up migration");

    // Test various valid email formats
    let valid_emails = vec![
        "simple@example.com",
        "user+tag@example.co.uk",
        "first.last@subdomain.example.com",
        "123@numbers.com",
        "a@b.c", // minimal valid email
    ];

    for email in valid_emails {
        let result = insert_test_user(&db, Some(email)).await;

        assert!(
            result.is_ok(),
            "Should accept valid email format '{}': {:?}",
            email,
            result.err()
        );

        // Cleanup after each insert
        cleanup_test_users(&db).await.expect("Failed to cleanup test users");
    }
}

#[tokio::test]
async fn test_idempotent_up_migration() {
    let db = get_test_db().await.expect("Failed to connect to test database");
    let schema_manager = SchemaManager::new(&db);

    // Run migration twice
    Migration.up(&schema_manager).await.expect("Failed to run first up migration");
    Migration.up(&schema_manager).await.expect("Failed to run second up migration");

    // Verify constraint still exists
    assert!(
        constraint_exists(&db, "users", "chk_users_email_not_empty")
            .await
            .expect("Failed to check constraint"),
        "Constraint should exist after idempotent up"
    );
}

#[tokio::test]
async fn test_down_migration() {
    let db = get_test_db().await.expect("Failed to connect to test database");
    let schema_manager = SchemaManager::new(&db);

    // Run up migration first
    Migration.up(&schema_manager).await.expect("Failed to run up migration");

    // Verify constraint exists
    assert!(
        constraint_exists(&db, "users", "chk_users_email_not_empty")
            .await
            .expect("Failed to check constraint"),
        "Constraint should exist before down migration"
    );

    // Run down migration
    Migration.down(&schema_manager).await.expect("Failed to run down migration");

    // Verify constraint is removed
    assert!(
        !constraint_exists(&db, "users", "chk_users_email_not_empty")
            .await
            .expect("Failed to check constraint"),
        "Constraint should be removed after down migration"
    );
}

#[tokio::test]
async fn test_down_migration_allows_invalid_emails() {
    let db = get_test_db().await.expect("Failed to connect to test database");
    let schema_manager = SchemaManager::new(&db);

    // Run up then down migration
    Migration.up(&schema_manager).await.expect("Failed to run up migration");
    Migration.down(&schema_manager).await.expect("Failed to run down migration");

    // After down migration, empty emails should be allowed
    let result = insert_test_user(&db, Some("")).await;

    assert!(
        result.is_ok(),
        "Should allow empty email after constraint removal: {:?}",
        result.err()
    );

    // Cleanup
    cleanup_test_users(&db).await.expect("Failed to cleanup test users");
}

#[tokio::test]
async fn test_idempotent_down_migration() {
    let db = get_test_db().await.expect("Failed to connect to test database");
    let schema_manager = SchemaManager::new(&db);

    // Run up migration first
    Migration.up(&schema_manager).await.expect("Failed to run up migration");

    // Run down migration twice
    Migration.down(&schema_manager).await.expect("Failed to run first down migration");
    Migration.down(&schema_manager).await.expect("Failed to run second down migration");

    // Verify constraint is still removed
    assert!(
        !constraint_exists(&db, "users", "chk_users_email_not_empty")
            .await
            .expect("Failed to check constraint"),
        "Constraint should remain removed after idempotent down"
    );
}

#[tokio::test]
async fn test_full_migration_cycle() {
    let db = get_test_db().await.expect("Failed to connect to test database");
    let schema_manager = SchemaManager::new(&db);

    // Run up migration
    Migration.up(&schema_manager).await.expect("Failed to run up migration");

    // Verify constraint exists
    assert!(
        constraint_exists(&db, "users", "chk_users_email_not_empty")
            .await
            .expect("Failed to check constraint"),
        "Constraint should exist after up"
    );

    // Verify constraint enforcement
    assert!(
        insert_test_user(&db, Some("")).await.is_err(),
        "Should reject empty email when constraint active"
    );

    // Run down migration
    Migration.down(&schema_manager).await.expect("Failed to run down migration");

    // Verify constraint removed
    assert!(
        !constraint_exists(&db, "users", "chk_users_email_not_empty")
            .await
            .expect("Failed to check constraint"),
        "Constraint should be removed after down"
    );

    // Run up migration again
    Migration.up(&schema_manager).await.expect("Failed to run up migration again");

    // Verify constraint exists again
    assert!(
        constraint_exists(&db, "users", "chk_users_email_not_empty")
            .await
            .expect("Failed to check constraint"),
        "Constraint should exist after second up"
    );

    // Verify constraint enforcement again
    assert!(
        insert_test_user(&db, Some("")).await.is_err(),
        "Should reject empty email after cycle"
    );
}
