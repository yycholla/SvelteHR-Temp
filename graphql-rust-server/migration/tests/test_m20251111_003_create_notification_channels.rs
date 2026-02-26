//! Tests for m20251111_003_create_notification_channels migration
//!
//! This migration creates the notification_channels table for multi-channel notification system.
//!
//! **Test Requirements:**
//! - Requires DATABASE_URL environment variable
//! - Tests must run serially: `cargo test --test test_m20251111_003_create_notification_channels --features test-utils -- --test-threads=1`
//!
//! **What We Test:**
//! - Table creation: notification_channels with 6 columns
//! - JSONB column: config_json for channel-specific configuration
//! - Index creation: 3 indexes (enabled, channel_type, enabled+channel_type)
//! - Idempotency: IF NOT EXISTS for table and indexes
//! - Cleanup: DROP TABLE CASCADE on rollback

#[cfg(test)]
mod tests {
    use hr_graphql_server::migration::m20251111_003_create_notification_channels::Migration;
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
        // Drop table if exists (for testing)
        let _ = db
            .execute(Statement::from_string(
                DbBackend::Postgres,
                "DROP TABLE IF EXISTS hr_public.notification_channels CASCADE".to_string(),
            ))
            .await;
    }

    #[tokio::test]
    async fn test_notification_channels_migration_compiles() {
        // If this test runs, the migration compiles successfully
        assert!(true);
    }

    #[tokio::test]
    async fn test_notification_channels_migration_up() {
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
    async fn test_notification_channels_table_created() {
        let db = setup_test_db().await;
        cleanup_test_data(&db).await;

        // Run the migration
        let schema_manager = SchemaManager::new(&db);
        Migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        // Verify table exists
        let result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                SELECT COUNT(*) as count
                FROM information_schema.tables
                WHERE table_schema = 'hr_public'
                  AND table_name = 'notification_channels'
                "#
                .to_string(),
            ))
            .await
            .expect("Query should succeed");

        assert!(result.is_some(), "Query should return result");
        let row = result.unwrap();
        let count: i64 = row.try_get("", "count").unwrap();
        assert_eq!(count, 1, "notification_channels table should exist");
    }

    #[tokio::test]
    async fn test_notification_channels_columns() {
        let db = setup_test_db().await;
        cleanup_test_data(&db).await;

        // Run the migration
        let schema_manager = SchemaManager::new(&db);
        Migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        // Verify all 6 columns exist
        let expected_columns = vec![
            "id",
            "channel_type",
            "enabled",
            "config_json",
            "created_at",
            "updated_at",
        ];

        for column in expected_columns {
            let result = db
                .query_one(Statement::from_string(
                    DbBackend::Postgres,
                    format!(
                        "SELECT COUNT(*) as count
                         FROM information_schema.columns
                         WHERE table_schema = 'hr_public'
                           AND table_name = 'notification_channels'
                           AND column_name = '{}'",
                        column
                    ),
                ))
                .await
                .expect("Query should succeed");

            assert!(result.is_some(), "Query should return result");
            let row = result.unwrap();
            let count: i64 = row.try_get("", "count").unwrap();
            assert_eq!(count, 1, "Column '{}' should exist", column);
        }
    }

    #[tokio::test]
    async fn test_config_json_is_jsonb() {
        let db = setup_test_db().await;
        cleanup_test_data(&db).await;

        // Run the migration
        let schema_manager = SchemaManager::new(&db);
        Migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        // Verify config_json column is JSONB type
        let result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                SELECT data_type, udt_name
                FROM information_schema.columns
                WHERE table_schema = 'hr_public'
                  AND table_name = 'notification_channels'
                  AND column_name = 'config_json'
                "#
                .to_string(),
            ))
            .await
            .expect("Query should succeed");

        assert!(result.is_some(), "Query should return result");
        let row = result.unwrap();
        let udt_name: String = row.try_get("", "udt_name").unwrap();
        assert_eq!(udt_name, "jsonb", "config_json should be JSONB type");
    }

    #[tokio::test]
    async fn test_enabled_index_created() {
        let db = setup_test_db().await;
        cleanup_test_data(&db).await;

        // Run the migration
        let schema_manager = SchemaManager::new(&db);
        Migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        // Verify idx_notification_channels_enabled index exists
        let result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                SELECT COUNT(*) as count
                FROM pg_indexes
                WHERE schemaname = 'hr_public'
                  AND tablename = 'notification_channels'
                  AND indexname = 'idx_notification_channels_enabled'
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
            "idx_notification_channels_enabled index should exist"
        );
    }

    #[tokio::test]
    async fn test_type_index_created() {
        let db = setup_test_db().await;
        cleanup_test_data(&db).await;

        // Run the migration
        let schema_manager = SchemaManager::new(&db);
        Migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        // Verify idx_notification_channels_type index exists
        let result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                SELECT COUNT(*) as count
                FROM pg_indexes
                WHERE schemaname = 'hr_public'
                  AND tablename = 'notification_channels'
                  AND indexname = 'idx_notification_channels_type'
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
            "idx_notification_channels_type index should exist"
        );
    }

    #[tokio::test]
    async fn test_composite_index_created() {
        let db = setup_test_db().await;
        cleanup_test_data(&db).await;

        // Run the migration
        let schema_manager = SchemaManager::new(&db);
        Migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        // Verify idx_notification_channels_enabled_type composite index exists
        let result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                SELECT COUNT(*) as count
                FROM pg_indexes
                WHERE schemaname = 'hr_public'
                  AND tablename = 'notification_channels'
                  AND indexname = 'idx_notification_channels_enabled_type'
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
            "idx_notification_channels_enabled_type composite index should exist"
        );
    }

    #[tokio::test]
    async fn test_all_indexes_created() {
        let db = setup_test_db().await;
        cleanup_test_data(&db).await;

        // Run the migration
        let schema_manager = SchemaManager::new(&db);
        Migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        // Verify total number of indexes (3 custom indexes)
        let result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                SELECT COUNT(*) as count
                FROM pg_indexes
                WHERE schemaname = 'hr_public'
                  AND tablename = 'notification_channels'
                  AND indexname LIKE 'idx_notification_channels_%'
                "#
                .to_string(),
            ))
            .await
            .expect("Query should succeed");

        assert!(result.is_some(), "Query should return result");
        let row = result.unwrap();
        let count: i64 = row.try_get("", "count").unwrap();
        assert_eq!(count, 3, "Should have 3 custom indexes");
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

        // Run migration second time - should succeed due to IF NOT EXISTS
        let result = Migration.up(&schema_manager).await;

        assert!(
            result.is_ok(),
            "Second migration up should succeed (idempotent with IF NOT EXISTS)"
        );

        // Verify table still exists (not duplicated)
        let table_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                SELECT COUNT(*) as count
                FROM information_schema.tables
                WHERE table_schema = 'hr_public'
                  AND table_name = 'notification_channels'
                "#
                .to_string(),
            ))
            .await
            .expect("Query should succeed");

        assert!(table_result.is_some(), "Query should return result");
        let row = table_result.unwrap();
        let count: i64 = row.try_get("", "count").unwrap();
        assert_eq!(count, 1, "Should have exactly 1 table (no duplicates)");

        // Verify indexes still exist (not duplicated)
        let index_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                SELECT COUNT(*) as count
                FROM pg_indexes
                WHERE schemaname = 'hr_public'
                  AND tablename = 'notification_channels'
                  AND indexname LIKE 'idx_notification_channels_%'
                "#
                .to_string(),
            ))
            .await
            .expect("Query should succeed");

        assert!(index_result.is_some(), "Query should return result");
        let row = index_result.unwrap();
        let count: i64 = row.try_get("", "count").unwrap();
        assert_eq!(count, 3, "Should have exactly 3 indexes (no duplicates)");
    }

    #[tokio::test]
    async fn test_notification_channels_migration_down() {
        let db = setup_test_db().await;
        cleanup_test_data(&db).await;

        let schema_manager = SchemaManager::new(&db);

        // Run up migration first
        Migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        // Verify table exists
        let before_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                SELECT COUNT(*) as count
                FROM information_schema.tables
                WHERE table_schema = 'hr_public'
                  AND table_name = 'notification_channels'
                "#
                .to_string(),
            ))
            .await
            .expect("Query should succeed");

        assert!(before_result.is_some(), "Query should return result");
        let row = before_result.unwrap();
        let before_count: i64 = row.try_get("", "count").unwrap();
        assert_eq!(before_count, 1, "Table should exist before down migration");

        // Run down migration
        Migration
            .down(&schema_manager)
            .await
            .expect("Migration down should succeed");

        // Verify table is dropped
        let after_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                SELECT COUNT(*) as count
                FROM information_schema.tables
                WHERE table_schema = 'hr_public'
                  AND table_name = 'notification_channels'
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
            "Table should be dropped after down migration"
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

        // Run down again - should succeed (table already dropped)
        let result = Migration.down(&schema_manager).await;

        assert!(
            result.is_ok(),
            "Second migration down should succeed (idempotent - table already dropped)"
        );
    }
}
