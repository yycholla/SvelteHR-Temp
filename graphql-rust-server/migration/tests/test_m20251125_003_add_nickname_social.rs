//! Tests for m20251125_003_add_nickname_social migration
//!
//! This migration adds nickname and social_media_release columns to the users table.
//!
//! **Test Requirements:**
//! - Requires DATABASE_URL environment variable
//! - Requires users table to exist (from m20251017_003_auth)
//! - Tests must run serially: `cargo test --test test_m20251125_003_add_nickname_social --features test-utils -- --test-threads=1`
//!
//! **What We Test:**
//! - Column additions: nickname (varchar, nullable), social_media_release (boolean, default false)
//! - Column properties: nullable nickname, NOT NULL social_media_release with default
//! - Idempotency: ADD COLUMN IF NOT EXISTS for both columns
//! - Cleanup: DROP COLUMN for both columns on rollback

#[cfg(test)]
mod tests {
    use hr_graphql_server::migration::m20251125_003_add_nickname_social::Migration;
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
        // Drop columns if they exist (for testing)
        let _ = db
            .execute(Statement::from_string(
                DbBackend::Postgres,
                "ALTER TABLE hr_public.users DROP COLUMN IF EXISTS nickname CASCADE".to_string(),
            ))
            .await;

        let _ = db
            .execute(Statement::from_string(
                DbBackend::Postgres,
                "ALTER TABLE hr_public.users DROP COLUMN IF EXISTS social_media_release CASCADE"
                    .to_string(),
            ))
            .await;
    }

    #[tokio::test]
    async fn test_add_nickname_social_migration_compiles() {
        // If this test runs, the migration compiles successfully
        assert!(true);
    }

    #[tokio::test]
    async fn test_add_nickname_social_migration_up() {
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
    async fn test_nickname_column_added() {
        let db = setup_test_db().await;
        cleanup_test_data(&db).await;

        // Run the migration
        let schema_manager = SchemaManager::new(&db);
        Migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        // Verify nickname column exists
        let result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                SELECT COUNT(*) as count
                FROM information_schema.columns
                WHERE table_schema = 'hr_public'
                  AND table_name = 'users'
                  AND column_name = 'nickname'
                "#
                .to_string(),
            ))
            .await
            .expect("Query should succeed");

        assert!(result.is_some(), "Query should return result");
        let row = result.unwrap();
        let count: i64 = row.try_get("", "count").unwrap();
        assert_eq!(count, 1, "nickname column should exist");
    }

    #[tokio::test]
    async fn test_social_media_release_column_added() {
        let db = setup_test_db().await;
        cleanup_test_data(&db).await;

        // Run the migration
        let schema_manager = SchemaManager::new(&db);
        Migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        // Verify social_media_release column exists
        let result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                SELECT COUNT(*) as count
                FROM information_schema.columns
                WHERE table_schema = 'hr_public'
                  AND table_name = 'users'
                  AND column_name = 'social_media_release'
                "#
                .to_string(),
            ))
            .await
            .expect("Query should succeed");

        assert!(result.is_some(), "Query should return result");
        let row = result.unwrap();
        let count: i64 = row.try_get("", "count").unwrap();
        assert_eq!(count, 1, "social_media_release column should exist");
    }

    #[tokio::test]
    async fn test_nickname_is_nullable() {
        let db = setup_test_db().await;
        cleanup_test_data(&db).await;

        // Run the migration
        let schema_manager = SchemaManager::new(&db);
        Migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        // Verify nickname column is nullable
        let result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                SELECT is_nullable
                FROM information_schema.columns
                WHERE table_schema = 'hr_public'
                  AND table_name = 'users'
                  AND column_name = 'nickname'
                "#
                .to_string(),
            ))
            .await
            .expect("Query should succeed");

        assert!(result.is_some(), "Query should return result");
        let row = result.unwrap();
        let is_nullable: String = row.try_get("", "is_nullable").unwrap();
        assert_eq!(
            is_nullable, "YES",
            "nickname should be nullable for backward compatibility"
        );
    }

    #[tokio::test]
    async fn test_social_media_release_default_false() {
        let db = setup_test_db().await;
        cleanup_test_data(&db).await;

        // Run the migration
        let schema_manager = SchemaManager::new(&db);
        Migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        // Verify social_media_release column default is false
        let result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                SELECT column_default
                FROM information_schema.columns
                WHERE table_schema = 'hr_public'
                  AND table_name = 'users'
                  AND column_name = 'social_media_release'
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
            "social_media_release default should be false (opt-in)"
        );
    }

    #[tokio::test]
    async fn test_nickname_is_varchar() {
        let db = setup_test_db().await;
        cleanup_test_data(&db).await;

        // Run the migration
        let schema_manager = SchemaManager::new(&db);
        Migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        // Verify nickname column is varchar type
        let result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                SELECT data_type
                FROM information_schema.columns
                WHERE table_schema = 'hr_public'
                  AND table_name = 'users'
                  AND column_name = 'nickname'
                "#
                .to_string(),
            ))
            .await
            .expect("Query should succeed");

        assert!(result.is_some(), "Query should return result");
        let row = result.unwrap();
        let data_type: String = row.try_get("", "data_type").unwrap();
        assert_eq!(
            data_type, "character varying",
            "nickname should be varchar type"
        );
    }

    #[tokio::test]
    async fn test_social_media_release_is_boolean() {
        let db = setup_test_db().await;
        cleanup_test_data(&db).await;

        // Run the migration
        let schema_manager = SchemaManager::new(&db);
        Migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        // Verify social_media_release column is boolean type
        let result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                SELECT data_type
                FROM information_schema.columns
                WHERE table_schema = 'hr_public'
                  AND table_name = 'users'
                  AND column_name = 'social_media_release'
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
            "social_media_release should be boolean type"
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
                  AND column_name IN ('nickname', 'social_media_release')
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
                  AND column_name IN ('nickname', 'social_media_release')
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
    async fn test_add_nickname_social_migration_down() {
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
                  AND column_name IN ('nickname', 'social_media_release')
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
                  AND column_name IN ('nickname', 'social_media_release')
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
