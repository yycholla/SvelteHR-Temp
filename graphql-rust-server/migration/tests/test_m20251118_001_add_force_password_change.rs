//! Tests for m20251118_001_add_force_password_change migration
//!
//! This migration adds the force_password_change column to the users table.
//!
//! **Test Requirements:**
//! - Requires DATABASE_URL environment variable
//! - Requires users table to exist (from m20251017_003_auth)
//! - Tests must run serially: `cargo test --test test_m20251118_001_add_force_password_change --features test-utils -- --test-threads=1`
//!
//! **What We Test:**
//! - Column addition: force_password_change (boolean)
//! - Column default: false
//! - Column comment: Documentation metadata
//! - Idempotency: ADD COLUMN IF NOT EXISTS
//! - Cleanup: DROP COLUMN on rollback

#[cfg(test)]
mod tests {
    use hr_graphql_server::migration::m20251118_001_add_force_password_change::Migration;
    use sea_orm::{Database, DatabaseConnection, DbBackend, Statement};
    use sea_orm_migration::prelude::*;

    /// Set up test database connection
    async fn setup_test_db() -> DatabaseConnection {
        let db_url = std::env::var("DATABASE_URL")
            .unwrap_or_else(|_| "postgres://postgres:postgres@localhost:5432/hr_test".to_string());
        Database::connect(&db_url)
            .await
            .expect("Failed to connect to test database")
    }

    /// Clean up test data
    async fn cleanup_test_data(db: &DatabaseConnection) {
        // Drop column if it exists (for testing)
        let _ = db
            .execute(Statement::from_string(
                DbBackend::Postgres,
                "ALTER TABLE hr_public.users DROP COLUMN IF EXISTS force_password_change CASCADE"
                    .to_string(),
            ))
            .await;
    }

    #[tokio::test]
    async fn test_force_password_change_migration_compiles() {
        // If this test runs, the migration compiles successfully
        assert!(true);
    }

    #[tokio::test]
    async fn test_force_password_change_migration_up() {
        let db = setup_test_db().await;
        cleanup_test_data(&db).await;

        // Run the migration
        let schema_manager = SchemaManager::new(&db);
        Migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");
    }

    #[tokio::test]
    async fn test_force_password_change_column_added() {
        let db = setup_test_db().await;
        cleanup_test_data(&db).await;

        // Run the migration
        let schema_manager = SchemaManager::new(&db);
        Migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        // Verify force_password_change column exists
        let result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                SELECT COUNT(*) as count
                FROM information_schema.columns
                WHERE table_schema = 'hr_public'
                  AND table_name = 'users'
                  AND column_name = 'force_password_change'
                "#
                .to_string(),
            ))
            .await
            .expect("Query should succeed");

        assert!(result.is_some(), "Query should return result");
        let row = result.unwrap();
        let count: i64 = row.try_get("", "count").unwrap();
        assert_eq!(count, 1, "force_password_change column should exist");
    }

    #[tokio::test]
    async fn test_force_password_change_is_boolean() {
        let db = setup_test_db().await;
        cleanup_test_data(&db).await;

        // Run the migration
        let schema_manager = SchemaManager::new(&db);
        Migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        // Verify force_password_change column is boolean
        let result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                SELECT data_type
                FROM information_schema.columns
                WHERE table_schema = 'hr_public'
                  AND table_name = 'users'
                  AND column_name = 'force_password_change'
                "#
                .to_string(),
            ))
            .await
            .expect("Query should succeed");

        assert!(result.is_some(), "Query should return result");
        let row = result.unwrap();
        let data_type: String = row.try_get("", "data_type").unwrap();
        assert_eq!(
            data_type, "boolean",
            "force_password_change should be boolean type"
        );
    }

    #[tokio::test]
    async fn test_force_password_change_default_value() {
        let db = setup_test_db().await;
        cleanup_test_data(&db).await;

        // Run the migration
        let schema_manager = SchemaManager::new(&db);
        Migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        // Verify force_password_change column default is false
        let result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                SELECT column_default
                FROM information_schema.columns
                WHERE table_schema = 'hr_public'
                  AND table_name = 'users'
                  AND column_name = 'force_password_change'
                "#
                .to_string(),
            ))
            .await
            .expect("Query should succeed");

        assert!(result.is_some(), "Query should return result");
        let row = result.unwrap();
        let default: String = row.try_get("", "column_default").unwrap();
        assert_eq!(
            default, "false",
            "force_password_change default should be false"
        );
    }

    #[tokio::test]
    async fn test_force_password_change_not_null() {
        let db = setup_test_db().await;
        cleanup_test_data(&db).await;

        // Run the migration
        let schema_manager = SchemaManager::new(&db);
        Migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        // Verify force_password_change column is NOT NULL
        let result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                SELECT is_nullable
                FROM information_schema.columns
                WHERE table_schema = 'hr_public'
                  AND table_name = 'users'
                  AND column_name = 'force_password_change'
                "#
                .to_string(),
            ))
            .await
            .expect("Query should succeed");

        assert!(result.is_some(), "Query should return result");
        let row = result.unwrap();
        let is_nullable: String = row.try_get("", "is_nullable").unwrap();
        assert_eq!(
            is_nullable, "NO",
            "force_password_change should be NOT NULL"
        );
    }

    #[tokio::test]
    async fn test_force_password_change_has_comment() {
        let db = setup_test_db().await;
        cleanup_test_data(&db).await;

        // Run the migration
        let schema_manager = SchemaManager::new(&db);
        Migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        // Verify force_password_change column has comment
        let result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                SELECT col_description(
                    (SELECT oid FROM pg_class WHERE relname = 'users' AND relnamespace =
                     (SELECT oid FROM pg_namespace WHERE nspname = 'hr_public')),
                    (SELECT ordinal_position FROM information_schema.columns
                     WHERE table_schema = 'hr_public'
                     AND table_name = 'users'
                     AND column_name = 'force_password_change')
                ) as comment
                "#
                .to_string(),
            ))
            .await
            .expect("Query should succeed");

        assert!(result.is_some(), "Query should return result");
        let row = result.unwrap();
        let comment: Option<String> = row.try_get("", "comment").unwrap();
        assert!(
            comment.is_some(),
            "force_password_change column should have a comment"
        );
        let comment_text = comment.unwrap();
        assert!(
            comment_text.contains("next login") || comment_text.contains("temporary"),
            "Comment should mention next login or temporary password"
        );
    }

    #[tokio::test]
    async fn test_idempotent_up() {
        let db = setup_test_db().await;
        cleanup_test_data(&db).await;

        let schema_manager = SchemaManager::new(&db);

        // Run migration first time
        Migration
            .up(&schema_manager)
            .await
            .expect("First migration up should succeed");

        // Verify column exists
        let before_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                SELECT COUNT(*) as count
                FROM information_schema.columns
                WHERE table_schema = 'hr_public'
                  AND table_name = 'users'
                  AND column_name = 'force_password_change'
                "#
                .to_string(),
            ))
            .await
            .expect("Query should succeed");

        assert!(before_result.is_some(), "Query should return result");
        let row = before_result.unwrap();
        let before_count: i64 = row.try_get("", "count").unwrap();

        // Run migration second time - should succeed due to ADD COLUMN IF NOT EXISTS
        let result = Migration.up(&schema_manager).await;

        assert!(
            result.is_ok(),
            "Second migration up should succeed (idempotent with ADD COLUMN IF NOT EXISTS)"
        );

        // Verify column still exists (not duplicated)
        let after_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                SELECT COUNT(*) as count
                FROM information_schema.columns
                WHERE table_schema = 'hr_public'
                  AND table_name = 'users'
                  AND column_name = 'force_password_change'
                "#
                .to_string(),
            ))
            .await
            .expect("Query should succeed");

        assert!(after_result.is_some(), "Query should return result");
        let row = after_result.unwrap();
        let after_count: i64 = row.try_get("", "count").unwrap();

        assert_eq!(
            before_count, after_count,
            "Should have same number of columns (no duplicates)"
        );
    }

    #[tokio::test]
    async fn test_force_password_change_migration_down() {
        let db = setup_test_db().await;
        cleanup_test_data(&db).await;

        let schema_manager = SchemaManager::new(&db);

        // Run up migration first
        Migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        // Verify column exists
        let before_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                SELECT COUNT(*) as count
                FROM information_schema.columns
                WHERE table_schema = 'hr_public'
                  AND table_name = 'users'
                  AND column_name = 'force_password_change'
                "#
                .to_string(),
            ))
            .await
            .expect("Query should succeed");

        assert!(before_result.is_some(), "Query should return result");
        let row = before_result.unwrap();
        let before_count: i64 = row.try_get("", "count").unwrap();
        assert_eq!(before_count, 1, "Column should exist before down migration");

        // Run down migration
        Migration
            .down(&schema_manager)
            .await
            .expect("Migration down should succeed");

        // Verify column is dropped
        let after_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                SELECT COUNT(*) as count
                FROM information_schema.columns
                WHERE table_schema = 'hr_public'
                  AND table_name = 'users'
                  AND column_name = 'force_password_change'
                "#
                .to_string(),
            ))
            .await
            .expect("Query should succeed");

        assert!(after_result.is_some(), "Query should return result");
        let row = after_result.unwrap();
        let after_count: i64 = row.try_get("", "count").unwrap();
        assert_eq!(
            after_count, 0,
            "Column should be dropped after down migration"
        );
    }

    #[tokio::test]
    async fn test_idempotent_down() {
        let db = setup_test_db().await;
        cleanup_test_data(&db).await;

        let schema_manager = SchemaManager::new(&db);

        // Run up and down migration
        Migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");
        Migration
            .down(&schema_manager)
            .await
            .expect("First migration down should succeed");

        // Run down again - should succeed (column already dropped)
        let result = Migration.down(&schema_manager).await;

        assert!(
            result.is_ok(),
            "Second migration down should succeed (idempotent - column already dropped)"
        );
    }
}
