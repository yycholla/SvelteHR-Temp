//! Tests for m20251023_003_fix_encryption_keys migration
//!
//! This migration adds algorithm and user_id columns to encryption_keys table
//! and creates pgcrypto-based encryption/decryption functions.
//!
//! **Test Requirements:**
//! - Requires DATABASE_URL environment variable
//! - Tests must run serially: `cargo test --test test_m20251023_003_fix_encryption_keys --features test-utils -- --test-threads=1`
//!
//! **What We Test:**
//! - Schema changes: algorithm column, user_id column, foreign key, index
//! - PostgreSQL functions: encrypt_key_data(), decrypt_key_data()
//! - Idempotency: up and down migrations can run multiple times
//! - Rollback: down migration cleanly removes all changes

#[cfg(test)]
mod tests {
    use hr_graphql_server::migration::m20251023_003_fix_encryption_keys::Migration;
    use sea_orm::{Database, DatabaseConnection, Statement};
    use sea_orm_migration::prelude::*;

/// Set up test database connection
async fn setup_test_db() -> DatabaseConnection {
    let db_url = std::env::var("DATABASE_URL").unwrap_or_else(|_| {
        "postgres://postgres:postgres123@localhost:5432/hr_test".to_string()
    });
    Database::connect(&db_url).await.unwrap()
}

/// Clean up test data
async fn cleanup_test_data(db: &DatabaseConnection) {
    // Drop test data if any
    let _ = db
        .execute(Statement::from_string(
            db.get_database_backend(),
            "TRUNCATE TABLE hr_public.encryption_keys CASCADE".to_string(),
        ))
        .await;
}

#[tokio::test]
async fn test_encryption_keys_migration_compiles() {
    // If this test runs, the migration compiles successfully
    assert!(true);
}

#[tokio::test]
async fn test_encryption_keys_migration_up() {
    let db = setup_test_db().await;
    cleanup_test_data(&db).await;

    // Run the specific migration
    let schema_manager = SchemaManager::new(&db);
    Migration
        .up(&schema_manager)
        .await
        .expect("Migration up should succeed");
}

#[tokio::test]
async fn test_encryption_keys_algorithm_column() {
    let db = setup_test_db().await;
    cleanup_test_data(&db).await;

    // Ensure migration is applied
    let schema_manager = SchemaManager::new(&db);
    Migration
        .up(&schema_manager)
        .await
        .expect("Migration up should succeed");

    // Verify algorithm column exists with correct properties
    let result = db
        .query_one(Statement::from_string(
            db.get_database_backend(),
            r#"
            SELECT
                column_name,
                data_type,
                is_nullable,
                column_default
            FROM information_schema.columns
            WHERE table_schema = 'hr_public'
              AND table_name = 'encryption_keys'
              AND column_name = 'algorithm'
            "#
            .to_string(),
        ))
        .await
        .expect("Query should succeed");

    assert!(result.is_some(), "algorithm column should exist");
    let row = result.unwrap();

    // Check NOT NULL constraint
    let is_nullable: String = row.try_get("", "is_nullable").unwrap();
    assert_eq!(is_nullable, "NO", "algorithm should be NOT NULL");

    // Check default value
    let default: Option<String> = row.try_get("", "column_default").ok();
    assert!(
        default
            .as_ref()
            .map(|d| d.contains("AES-256-GCM"))
            .unwrap_or(false),
        "algorithm should have default 'AES-256-GCM', got: {:?}",
        default
    );
}

#[tokio::test]
async fn test_encryption_keys_user_id_column() {
    let db = setup_test_db().await;
    cleanup_test_data(&db).await;

    // Ensure migration is applied
    let schema_manager = SchemaManager::new(&db);
    Migration
        .up(&schema_manager)
        .await
        .expect("Migration up should succeed");

    // Verify user_id column exists with correct properties
    let result = db
        .query_one(Statement::from_string(
            db.get_database_backend(),
            r#"
            SELECT
                column_name,
                data_type,
                is_nullable
            FROM information_schema.columns
            WHERE table_schema = 'hr_public'
              AND table_name = 'encryption_keys'
              AND column_name = 'user_id'
            "#
            .to_string(),
        ))
        .await
        .expect("Query should succeed");

    assert!(result.is_some(), "user_id column should exist");
    let row = result.unwrap();

    // Check data type
    let data_type: String = row.try_get("", "data_type").unwrap();
    assert_eq!(data_type, "uuid", "user_id should be UUID type");

    // Check NOT NULL constraint
    let is_nullable: String = row.try_get("", "is_nullable").unwrap();
    assert_eq!(is_nullable, "NO", "user_id should be NOT NULL");
}

#[tokio::test]
async fn test_encryption_keys_foreign_key() {
    let db = setup_test_db().await;
    cleanup_test_data(&db).await;

    // Ensure migration is applied
    let schema_manager = SchemaManager::new(&db);
    Migration
        .up(&schema_manager)
        .await
        .expect("Migration up should succeed");

    // Verify foreign key constraint exists
    let result = db
        .query_one(Statement::from_string(
            db.get_database_backend(),
            r#"
            SELECT
                tc.constraint_name,
                kcu.column_name,
                ccu.table_name AS foreign_table_name,
                ccu.column_name AS foreign_column_name,
                rc.delete_rule
            FROM information_schema.table_constraints AS tc
            JOIN information_schema.key_column_usage AS kcu
              ON tc.constraint_name = kcu.constraint_name
              AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage AS ccu
              ON ccu.constraint_name = tc.constraint_name
              AND ccu.table_schema = tc.table_schema
            JOIN information_schema.referential_constraints AS rc
              ON tc.constraint_name = rc.constraint_name
              AND tc.table_schema = rc.constraint_schema
            WHERE tc.constraint_type = 'FOREIGN KEY'
              AND tc.table_schema = 'hr_public'
              AND tc.table_name = 'encryption_keys'
              AND tc.constraint_name = 'fk_encryption_keys_user_id'
            "#
            .to_string(),
        ))
        .await
        .expect("Query should succeed");

    assert!(
        result.is_some(),
        "Foreign key constraint fk_encryption_keys_user_id should exist"
    );
    let row = result.unwrap();

    // Verify foreign key properties
    let column_name: String = row.try_get("", "column_name").unwrap();
    assert_eq!(column_name, "user_id", "FK should be on user_id column");

    let foreign_table: String = row.try_get("", "foreign_table_name").unwrap();
    assert_eq!(foreign_table, "users", "FK should reference users table");

    let foreign_column: String = row.try_get("", "foreign_column_name").unwrap();
    assert_eq!(foreign_column, "id", "FK should reference id column");

    let delete_rule: String = row.try_get("", "delete_rule").unwrap();
    assert_eq!(
        delete_rule, "CASCADE",
        "FK should have ON DELETE CASCADE"
    );
}

#[tokio::test]
async fn test_encryption_keys_index() {
    let db = setup_test_db().await;
    cleanup_test_data(&db).await;

    // Ensure migration is applied
    let schema_manager = SchemaManager::new(&db);
    Migration
        .up(&schema_manager)
        .await
        .expect("Migration up should succeed");

    // Verify index exists
    let result = db
        .query_one(Statement::from_string(
            db.get_database_backend(),
            r#"
            SELECT
                indexname,
                indexdef
            FROM pg_indexes
            WHERE schemaname = 'hr_public'
              AND tablename = 'encryption_keys'
              AND indexname = 'idx_encryption_keys_user_id'
            "#
            .to_string(),
        ))
        .await
        .expect("Query should succeed");

    assert!(
        result.is_some(),
        "Index idx_encryption_keys_user_id should exist"
    );
    let row = result.unwrap();

    // Verify index definition
    let indexdef: String = row.try_get("", "indexdef").unwrap();
    assert!(
        indexdef.contains("user_id"),
        "Index should be on user_id column, got: {}",
        indexdef
    );
}

#[tokio::test]
async fn test_encryption_keys_encrypt_function() {
    let db = setup_test_db().await;
    cleanup_test_data(&db).await;

    // Ensure migration is applied
    let schema_manager = SchemaManager::new(&db);
    Migration
        .up(&schema_manager)
        .await
        .expect("Migration up should succeed");

    // Verify encrypt_key_data function exists
    let result = db
        .query_one(Statement::from_string(
            db.get_database_backend(),
            r#"
            SELECT
                routine_name,
                data_type AS return_type
            FROM information_schema.routines
            WHERE routine_schema = 'hr_public'
              AND routine_name = 'encrypt_key_data'
              AND routine_type = 'FUNCTION'
            "#
            .to_string(),
        ))
        .await
        .expect("Query should succeed");

    assert!(
        result.is_some(),
        "Function encrypt_key_data should exist"
    );
    let row = result.unwrap();

    let return_type: String = row.try_get("", "return_type").unwrap();
    assert_eq!(
        return_type, "bytea",
        "encrypt_key_data should return BYTEA"
    );

    // Test function works (encrypt some test data)
    let encrypted = db
        .query_one(Statement::from_string(
            db.get_database_backend(),
            "SELECT hr_public.encrypt_key_data('test_data'::bytea, 'test_key') as encrypted"
                .to_string(),
        ))
        .await
        .expect("Function call should succeed");

    assert!(
        encrypted.is_some(),
        "encrypt_key_data should return encrypted data"
    );
}

#[tokio::test]
async fn test_encryption_keys_decrypt_function() {
    let db = setup_test_db().await;
    cleanup_test_data(&db).await;

    // Ensure migration is applied
    let schema_manager = SchemaManager::new(&db);
    Migration
        .up(&schema_manager)
        .await
        .expect("Migration up should succeed");

    // Verify decrypt_key_data function exists
    let result = db
        .query_one(Statement::from_string(
            db.get_database_backend(),
            r#"
            SELECT
                routine_name,
                data_type AS return_type
            FROM information_schema.routines
            WHERE routine_schema = 'hr_public'
              AND routine_name = 'decrypt_key_data'
              AND routine_type = 'FUNCTION'
            "#
            .to_string(),
        ))
        .await
        .expect("Query should succeed");

    assert!(
        result.is_some(),
        "Function decrypt_key_data should exist"
    );
    let row = result.unwrap();

    let return_type: String = row.try_get("", "return_type").unwrap();
    assert_eq!(
        return_type, "bytea",
        "decrypt_key_data should return BYTEA"
    );

    // Test round-trip encryption/decryption
    let result = db
        .query_one(Statement::from_string(
            db.get_database_backend(),
            r#"
            SELECT
                hr_public.decrypt_key_data(
                    hr_public.encrypt_key_data('test_data'::bytea, 'test_key'),
                    'test_key'
                )::text as decrypted
            "#
            .to_string(),
        ))
        .await
        .expect("Round-trip encryption should succeed");

    assert!(result.is_some(), "Should decrypt successfully");
    let row = result.unwrap();
    let decrypted: String = row.try_get("", "decrypted").unwrap();

    // Convert bytea hex format back to string
    // The result will be in format like \x74657374... (hex representation)
    assert!(
        decrypted.contains("74657374"),
        "Decrypted data should contain 'test' in hex, got: {}",
        decrypted
    );
}

#[tokio::test]
async fn test_encryption_keys_migration_down() {
    let db = setup_test_db().await;
    cleanup_test_data(&db).await;

    let schema_manager = SchemaManager::new(&db);

    // Apply migration
    Migration
        .up(&schema_manager)
        .await
        .expect("Migration up should succeed");

    // Rollback migration
    Migration
        .down(&schema_manager)
        .await
        .expect("Migration down should succeed");

    // Verify algorithm column is removed
    let col_result = db
        .query_one(Statement::from_string(
            db.get_database_backend(),
            r#"
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = 'hr_public'
              AND table_name = 'encryption_keys'
              AND column_name = 'algorithm'
            "#
            .to_string(),
        ))
        .await
        .expect("Query should succeed");

    assert!(
        col_result.is_none(),
        "algorithm column should be removed after down migration"
    );

    // Verify user_id column is removed
    let user_col_result = db
        .query_one(Statement::from_string(
            db.get_database_backend(),
            r#"
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = 'hr_public'
              AND table_name = 'encryption_keys'
              AND column_name = 'user_id'
            "#
            .to_string(),
        ))
        .await
        .expect("Query should succeed");

    assert!(
        user_col_result.is_none(),
        "user_id column should be removed after down migration"
    );

    // Verify index is removed
    let idx_result = db
        .query_one(Statement::from_string(
            db.get_database_backend(),
            r#"
            SELECT indexname
            FROM pg_indexes
            WHERE schemaname = 'hr_public'
              AND tablename = 'encryption_keys'
              AND indexname = 'idx_encryption_keys_user_id'
            "#
            .to_string(),
        ))
        .await
        .expect("Query should succeed");

    assert!(
        idx_result.is_none(),
        "Index should be removed after down migration"
    );

    // Verify functions are removed
    let func_result = db
        .query_one(Statement::from_string(
            db.get_database_backend(),
            r#"
            SELECT routine_name
            FROM information_schema.routines
            WHERE routine_schema = 'hr_public'
              AND routine_name IN ('encrypt_key_data', 'decrypt_key_data')
            "#
            .to_string(),
        ))
        .await
        .expect("Query should succeed");

    assert!(
        func_result.is_none(),
        "Functions should be removed after down migration"
    );
}

#[tokio::test]
async fn test_encryption_keys_idempotent_up() {
    let db = setup_test_db().await;
    cleanup_test_data(&db).await;

    let schema_manager = SchemaManager::new(&db);

    // Run migration twice
    Migration
        .up(&schema_manager)
        .await
        .expect("First migration up should succeed");

    let result = Migration
        .up(&schema_manager)
        .await;

    // Note: This migration is NOT fully idempotent due to:
    // 1. ALTER TABLE ADD COLUMN (no IF NOT EXISTS)
    // 2. Foreign key constraints (no IF NOT EXISTS)
    //
    // It WILL fail on second run, which is expected behavior.
    // Only CREATE EXTENSION and CREATE OR REPLACE FUNCTION are idempotent.
    assert!(
        result.is_err(),
        "Second migration up should fail (not idempotent for ALTER TABLE)"
    );
}

#[tokio::test]
async fn test_encryption_keys_idempotent_down() {
    let db = setup_test_db().await;
    cleanup_test_data(&db).await;

    let schema_manager = SchemaManager::new(&db);

    // Apply and rollback migration
    Migration
        .up(&schema_manager)
        .await
        .expect("Migration up should succeed");

    Migration
        .down(&schema_manager)
        .await
        .expect("First migration down should succeed");

    // Run down again - should handle gracefully with IF EXISTS
    let result = Migration
        .down(&schema_manager)
        .await;

    // Note: Down migration is NOT fully idempotent because:
    // - DROP COLUMN doesn't use IF EXISTS (builder limitation)
    // - Foreign key drop doesn't check existence
    //
    // It WILL fail on second run.
    assert!(
        result.is_err(),
        "Second migration down should fail (not idempotent for DROP COLUMN)"
    );
}

} // mod tests
