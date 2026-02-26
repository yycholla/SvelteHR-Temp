//! Tests for m20251111_004_extend_users_for_auth_policies migration
//!
//! This migration extends the users table with advanced authentication policy columns.
//!
//! **Test Requirements:**
//! - Requires DATABASE_URL environment variable
//! - Requires users table to exist (from m20251017_003_auth)
//! - Tests must run serially: `cargo test --test test_m20251111_004_extend_users_for_auth_policies --features test-utils -- --test-threads=1`
//!
//! **What We Test:**
//! - Column additions: account_locked (boolean), password_last_changed (timestamptz)
//! - Column defaults: false for account_locked, CURRENT_TIMESTAMP for password_last_changed
//! - Index creation: 2 indexes (account_locked, password_last_changed)
//! - Idempotency: ADD COLUMN IF NOT EXISTS
//! - Cleanup: DROP INDEX then DROP COLUMN on rollback

#[cfg(test)]
mod tests {
    use hr_graphql_server::migration::m20251111_004_extend_users_for_auth_policies::Migration;
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
        // Drop columns and indexes if they exist (for testing)
        let _ = db
            .execute(Statement::from_string(
                DbBackend::Postgres,
                "DROP INDEX IF EXISTS hr_public.idx_users_account_locked CASCADE".to_string(),
            ))
            .await;

        let _ = db
            .execute(Statement::from_string(
                DbBackend::Postgres,
                "DROP INDEX IF EXISTS hr_public.idx_users_password_last_changed CASCADE"
                    .to_string(),
            ))
            .await;

        let _ = db
            .execute(Statement::from_string(
                DbBackend::Postgres,
                "ALTER TABLE hr_public.users DROP COLUMN IF EXISTS account_locked CASCADE"
                    .to_string(),
            ))
            .await;

        let _ = db
            .execute(Statement::from_string(
                DbBackend::Postgres,
                "ALTER TABLE hr_public.users DROP COLUMN IF EXISTS password_last_changed CASCADE"
                    .to_string(),
            ))
            .await;
    }

    #[tokio::test]
    async fn test_extend_users_for_auth_policies_migration_compiles() {
        // If this test runs, the migration compiles successfully
        assert!(true);
    }

    #[tokio::test]
    async fn test_extend_users_for_auth_policies_migration_up() {
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
    async fn test_account_locked_column_added() {
        let db = setup_test_db().await;
        cleanup_test_data(&db).await;

        // Run the migration
        let schema_manager = SchemaManager::new(&db);
        Migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        // Verify account_locked column exists
        let result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                SELECT COUNT(*) as count
                FROM information_schema.columns
                WHERE table_schema = 'hr_public'
                  AND table_name = 'users'
                  AND column_name = 'account_locked'
                "#
                .to_string(),
            ))
            .await
            .expect("Query should succeed");

        assert!(result.is_some(), "Query should return result");
        let row = result.unwrap();
        let count: i64 = row.try_get("", "count").unwrap();
        assert_eq!(count, 1, "account_locked column should exist");
    }

    #[tokio::test]
    async fn test_password_last_changed_column_added() {
        let db = setup_test_db().await;
        cleanup_test_data(&db).await;

        // Run the migration
        let schema_manager = SchemaManager::new(&db);
        Migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        // Verify password_last_changed column exists
        let result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                SELECT COUNT(*) as count
                FROM information_schema.columns
                WHERE table_schema = 'hr_public'
                  AND table_name = 'users'
                  AND column_name = 'password_last_changed'
                "#
                .to_string(),
            ))
            .await
            .expect("Query should succeed");

        assert!(result.is_some(), "Query should return result");
        let row = result.unwrap();
        let count: i64 = row.try_get("", "count").unwrap();
        assert_eq!(count, 1, "password_last_changed column should exist");
    }

    #[tokio::test]
    async fn test_account_locked_default_value() {
        let db = setup_test_db().await;
        cleanup_test_data(&db).await;

        // Run the migration
        let schema_manager = SchemaManager::new(&db);
        Migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        // Verify account_locked column default is false
        let result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                SELECT column_default
                FROM information_schema.columns
                WHERE table_schema = 'hr_public'
                  AND table_name = 'users'
                  AND column_name = 'account_locked'
                "#
                .to_string(),
            ))
            .await
            .expect("Query should succeed");

        assert!(result.is_some(), "Query should return result");
        let row = result.unwrap();
        let default: String = row.try_get("", "column_default").unwrap();
        assert_eq!(default, "false", "account_locked default should be false");
    }

    #[tokio::test]
    async fn test_password_last_changed_has_timestamp_default() {
        let db = setup_test_db().await;
        cleanup_test_data(&db).await;

        // Run the migration
        let schema_manager = SchemaManager::new(&db);
        Migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        // Verify password_last_changed column has timestamp default
        let result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                SELECT column_default
                FROM information_schema.columns
                WHERE table_schema = 'hr_public'
                  AND table_name = 'users'
                  AND column_name = 'password_last_changed'
                "#
                .to_string(),
            ))
            .await
            .expect("Query should succeed");

        assert!(result.is_some(), "Query should return result");
        let row = result.unwrap();
        let default: Option<String> = row.try_get("", "column_default").unwrap();
        assert!(
            default.is_some(),
            "password_last_changed should have a default"
        );
        let default_str = default.unwrap();
        assert!(
            default_str.contains("CURRENT_TIMESTAMP") || default_str.contains("now()"),
            "password_last_changed default should be a timestamp function"
        );
    }

    #[tokio::test]
    async fn test_account_locked_index_created() {
        let db = setup_test_db().await;
        cleanup_test_data(&db).await;

        // Run the migration
        let schema_manager = SchemaManager::new(&db);
        Migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        // Verify idx_users_account_locked index exists
        let result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                SELECT COUNT(*) as count
                FROM pg_indexes
                WHERE schemaname = 'hr_public'
                  AND tablename = 'users'
                  AND indexname = 'idx_users_account_locked'
                "#
                .to_string(),
            ))
            .await
            .expect("Query should succeed");

        assert!(result.is_some(), "Query should return result");
        let row = result.unwrap();
        let count: i64 = row.try_get("", "count").unwrap();
        assert_eq!(count, 1, "idx_users_account_locked index should exist");
    }

    #[tokio::test]
    async fn test_password_last_changed_index_created() {
        let db = setup_test_db().await;
        cleanup_test_data(&db).await;

        // Run the migration
        let schema_manager = SchemaManager::new(&db);
        Migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        // Verify idx_users_password_last_changed index exists
        let result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                SELECT COUNT(*) as count
                FROM pg_indexes
                WHERE schemaname = 'hr_public'
                  AND tablename = 'users'
                  AND indexname = 'idx_users_password_last_changed'
                "#
                .to_string(),
            ))
            .await
            .expect("Query should succeed");

        assert!(result.is_some(), "Query should return result");
        let row = result.unwrap();
        let count: i64 = row.try_get("", "count").unwrap();
        assert_eq!(
            count, 1,
            "idx_users_password_last_changed index should exist"
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

        // Verify columns exist
        let before_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                SELECT COUNT(*) as count
                FROM information_schema.columns
                WHERE table_schema = 'hr_public'
                  AND table_name = 'users'
                  AND column_name IN ('account_locked', 'password_last_changed')
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

        // Verify columns still exist (not duplicated)
        let after_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                SELECT COUNT(*) as count
                FROM information_schema.columns
                WHERE table_schema = 'hr_public'
                  AND table_name = 'users'
                  AND column_name IN ('account_locked', 'password_last_changed')
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
    async fn test_extend_users_for_auth_policies_migration_down() {
        let db = setup_test_db().await;
        cleanup_test_data(&db).await;

        let schema_manager = SchemaManager::new(&db);

        // Run up migration first
        Migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        // Verify columns exist
        let before_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                SELECT COUNT(*) as count
                FROM information_schema.columns
                WHERE table_schema = 'hr_public'
                  AND table_name = 'users'
                  AND column_name IN ('account_locked', 'password_last_changed')
                "#
                .to_string(),
            ))
            .await
            .expect("Query should succeed");

        assert!(before_result.is_some(), "Query should return result");
        let row = before_result.unwrap();
        let before_count: i64 = row.try_get("", "count").unwrap();
        assert_eq!(
            before_count, 2,
            "Both columns should exist before down migration"
        );

        // Run down migration
        Migration
            .down(&schema_manager)
            .await
            .expect("Migration down should succeed");

        // Verify columns are dropped
        let after_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                SELECT COUNT(*) as count
                FROM information_schema.columns
                WHERE table_schema = 'hr_public'
                  AND table_name = 'users'
                  AND column_name IN ('account_locked', 'password_last_changed')
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
            "Both columns should be dropped after down migration"
        );

        // Verify indexes are dropped
        let index_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                SELECT COUNT(*) as count
                FROM pg_indexes
                WHERE schemaname = 'hr_public'
                  AND tablename = 'users'
                  AND indexname IN ('idx_users_account_locked', 'idx_users_password_last_changed')
                "#
                .to_string(),
            ))
            .await
            .expect("Query should succeed");

        assert!(index_result.is_some(), "Query should return result");
        let row = index_result.unwrap();
        let index_count: i64 = row.try_get("", "count").unwrap();
        assert_eq!(
            index_count, 0,
            "Both indexes should be dropped after down migration"
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

        // Run down again - should succeed (columns already dropped)
        let result = Migration.down(&schema_manager).await;

        assert!(
            result.is_ok(),
            "Second migration down should succeed (idempotent - columns already dropped)"
        );
    }
}
