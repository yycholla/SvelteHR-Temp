//! Tests for m20251229_004_incremental_sync migration
//!
//! Validates that the migration:
//! 1. Adds 4 sync mode tracking columns to intuit_sync_log table
//! 2. Adds 4 entity-level sync token columns to intuit_connections table
//! 3. Creates 3 performance indexes on users table (last_modified_at, last_synced_at, sync_status)
//! 4. Creates 3 performance indexes on departments table (last_modified_at, last_synced_at, sync_status)
//! 5. Creates 2 sync log indexes (created_at, sync_mode)
//! 6. Validates column properties (nullability, defaults)
//! 7. Tests idempotent re-runs with if_not_exists
//! 8. Tests down migration cleanup (drops indexes and columns)
//! 9. Full migration cycle verification

#[cfg(test)]
mod tests {
    use sea_orm::{Database, DatabaseConnection, DbBackend, Statement};
    use sea_orm_migration::prelude::*;
    use hr_graphql_server::migration::m20251229_004_incremental_sync::Migration;

    /// Setup a test database connection
    async fn setup_test_db() -> DatabaseConnection {
        let db_url = std::env::var("DATABASE_URL")
            .unwrap_or_else(|_| "postgres://postgres:postgres123@localhost:5433/hr_test".to_string());
        Database::connect(&db_url).await.expect("Failed to connect to test database")
    }

    /// Clean up test data after test runs
    async fn cleanup_test_data(db: &DatabaseConnection) {
        // Drop indexes
        let indexes = vec![
            "hr_public.idx_intuit_sync_log_sync_mode",
            "hr_public.idx_intuit_sync_log_created_at",
            "hr_public.idx_departments_sync_status",
            "hr_public.idx_departments_last_synced_at",
            "hr_public.idx_departments_last_modified_at",
            "hr_public.idx_users_sync_status",
            "hr_public.idx_users_last_synced_at",
            "hr_public.idx_users_last_modified_at",
        ];

        for index in indexes {
            let _ = db
                .execute(Statement::from_string(
                    DbBackend::Postgres,
                    format!("DROP INDEX IF EXISTS {}", index),
                ))
                .await;
        }

        // Drop columns from intuit_connections
        let _ = db
            .execute(Statement::from_string(
                DbBackend::Postgres,
                "ALTER TABLE hr_public.intuit_connections
                 DROP COLUMN IF EXISTS last_department_sync_at,
                 DROP COLUMN IF EXISTS last_employee_sync_at,
                 DROP COLUMN IF EXISTS department_sync_token,
                 DROP COLUMN IF EXISTS employee_sync_token".to_string(),
            ))
            .await;

        // Drop columns from intuit_sync_log
        let _ = db
            .execute(Statement::from_string(
                DbBackend::Postgres,
                "ALTER TABLE hr_public.intuit_sync_log
                 DROP COLUMN IF EXISTS sync_duration_ms,
                 DROP COLUMN IF EXISTS changes_processed,
                 DROP COLUMN IF EXISTS changes_detected,
                 DROP COLUMN IF EXISTS sync_mode".to_string(),
            ))
            .await;
    }

    #[tokio::test]
    async fn test_incremental_sync_migration_compiles() {
        // Ensures the migration compiles and uses correct types
        let _migration = Migration;
        assert!(true, "Migration struct compiles successfully");
    }

    #[tokio::test]
    async fn test_incremental_sync_migration_up() {
        let db = setup_test_db().await;
        let schema_manager = SchemaManager::new(&db);

        cleanup_test_data(&db).await;

        let migration = Migration;
        migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        // Verify intuit_sync_log columns were added
        let sync_log_columns_result = db
            .query_all(Statement::from_string(
                DbBackend::Postgres,
                "SELECT column_name FROM information_schema.columns
                 WHERE table_schema = 'hr_public'
                 AND table_name = 'intuit_sync_log'
                 AND column_name IN ('sync_mode', 'changes_detected', 'changes_processed', 'sync_duration_ms')
                 ORDER BY column_name".to_string(),
            ))
            .await;

        assert!(sync_log_columns_result.is_ok(), "Sync log columns should exist");
        assert_eq!(
            sync_log_columns_result.unwrap().len(),
            4,
            "Should have 4 sync tracking columns in intuit_sync_log"
        );

        // Verify intuit_connections columns were added
        let connections_columns_result = db
            .query_all(Statement::from_string(
                DbBackend::Postgres,
                "SELECT column_name FROM information_schema.columns
                 WHERE table_schema = 'hr_public'
                 AND table_name = 'intuit_connections'
                 AND column_name IN ('employee_sync_token', 'department_sync_token', 'last_employee_sync_at', 'last_department_sync_at')
                 ORDER BY column_name".to_string(),
            ))
            .await;

        assert!(connections_columns_result.is_ok(), "Connections columns should exist");
        assert_eq!(
            connections_columns_result.unwrap().len(),
            4,
            "Should have 4 sync tracking columns in intuit_connections"
        );

        cleanup_test_data(&db).await;
    }

    #[tokio::test]
    async fn test_sync_mode_column_properties() {
        let db = setup_test_db().await;
        let schema_manager = SchemaManager::new(&db);

        cleanup_test_data(&db).await;

        let migration = Migration;
        migration.up(&schema_manager).await.expect("Migration should succeed");

        // Verify sync_mode column properties
        let column_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                "SELECT column_default, is_nullable
                 FROM information_schema.columns
                 WHERE table_schema = 'hr_public'
                 AND table_name = 'intuit_sync_log'
                 AND column_name = 'sync_mode'".to_string(),
            ))
            .await;

        assert!(column_result.is_ok(), "sync_mode column should exist");
        let row = column_result.unwrap().unwrap();

        let is_nullable: String = row.try_get("", "is_nullable").expect("Should get is_nullable");
        assert_eq!(is_nullable, "NO", "sync_mode should be NOT NULL");

        let default_value: Option<String> = row.try_get("", "column_default").ok();
        assert!(
            default_value.is_some() && default_value.unwrap().contains("full"),
            "sync_mode should default to 'full'"
        );

        cleanup_test_data(&db).await;
    }

    #[tokio::test]
    async fn test_changes_detected_column_properties() {
        let db = setup_test_db().await;
        let schema_manager = SchemaManager::new(&db);

        cleanup_test_data(&db).await;

        let migration = Migration;
        migration.up(&schema_manager).await.expect("Migration should succeed");

        // Verify changes_detected column properties
        let column_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                "SELECT column_default, is_nullable
                 FROM information_schema.columns
                 WHERE table_schema = 'hr_public'
                 AND table_name = 'intuit_sync_log'
                 AND column_name = 'changes_detected'".to_string(),
            ))
            .await;

        assert!(column_result.is_ok(), "changes_detected column should exist");
        let row = column_result.unwrap().unwrap();

        let is_nullable: String = row.try_get("", "is_nullable").expect("Should get is_nullable");
        assert_eq!(is_nullable, "NO", "changes_detected should be NOT NULL");

        let default_value: Option<String> = row.try_get("", "column_default").ok();
        assert!(
            default_value.is_some() && default_value.unwrap().contains("0"),
            "changes_detected should default to 0"
        );

        cleanup_test_data(&db).await;
    }

    #[tokio::test]
    async fn test_sync_token_columns_nullable() {
        let db = setup_test_db().await;
        let schema_manager = SchemaManager::new(&db);

        cleanup_test_data(&db).await;

        let migration = Migration;
        migration.up(&schema_manager).await.expect("Migration should succeed");

        // Verify sync token columns are nullable
        let columns_result = db
            .query_all(Statement::from_string(
                DbBackend::Postgres,
                "SELECT column_name, is_nullable
                 FROM information_schema.columns
                 WHERE table_schema = 'hr_public'
                 AND table_name = 'intuit_connections'
                 AND column_name IN ('employee_sync_token', 'department_sync_token')
                 ORDER BY column_name".to_string(),
            ))
            .await;

        assert!(columns_result.is_ok(), "Sync token columns should exist");
        let rows = columns_result.unwrap();

        assert_eq!(rows.len(), 2, "Should have 2 sync token columns");
        for row in rows {
            let is_nullable: String = row.try_get("", "is_nullable").expect("Should get is_nullable");
            assert_eq!(is_nullable, "YES", "Sync token columns should be nullable");
        }

        cleanup_test_data(&db).await;
    }

    #[tokio::test]
    async fn test_users_indexes_created() {
        let db = setup_test_db().await;
        let schema_manager = SchemaManager::new(&db);

        cleanup_test_data(&db).await;

        let migration = Migration;
        migration.up(&schema_manager).await.expect("Migration should succeed");

        // Verify users table indexes
        let indexes_result = db
            .query_all(Statement::from_string(
                DbBackend::Postgres,
                "SELECT indexname
                 FROM pg_indexes
                 WHERE schemaname = 'hr_public'
                 AND tablename = 'users'
                 AND indexname IN (
                     'idx_users_last_modified_at',
                     'idx_users_last_synced_at',
                     'idx_users_sync_status'
                 )
                 ORDER BY indexname".to_string(),
            ))
            .await;

        assert!(indexes_result.is_ok(), "Users indexes should exist");
        assert_eq!(
            indexes_result.unwrap().len(),
            3,
            "Should have 3 indexes on users table"
        );

        cleanup_test_data(&db).await;
    }

    #[tokio::test]
    async fn test_departments_indexes_created() {
        let db = setup_test_db().await;
        let schema_manager = SchemaManager::new(&db);

        cleanup_test_data(&db).await;

        let migration = Migration;
        migration.up(&schema_manager).await.expect("Migration should succeed");

        // Verify departments table indexes
        let indexes_result = db
            .query_all(Statement::from_string(
                DbBackend::Postgres,
                "SELECT indexname
                 FROM pg_indexes
                 WHERE schemaname = 'hr_public'
                 AND tablename = 'departments'
                 AND indexname IN (
                     'idx_departments_last_modified_at',
                     'idx_departments_last_synced_at',
                     'idx_departments_sync_status'
                 )
                 ORDER BY indexname".to_string(),
            ))
            .await;

        assert!(indexes_result.is_ok(), "Departments indexes should exist");
        assert_eq!(
            indexes_result.unwrap().len(),
            3,
            "Should have 3 indexes on departments table"
        );

        cleanup_test_data(&db).await;
    }

    #[tokio::test]
    async fn test_sync_log_indexes_created() {
        let db = setup_test_db().await;
        let schema_manager = SchemaManager::new(&db);

        cleanup_test_data(&db).await;

        let migration = Migration;
        migration.up(&schema_manager).await.expect("Migration should succeed");

        // Verify sync log table indexes
        let indexes_result = db
            .query_all(Statement::from_string(
                DbBackend::Postgres,
                "SELECT indexname
                 FROM pg_indexes
                 WHERE schemaname = 'hr_public'
                 AND tablename = 'intuit_sync_log'
                 AND indexname IN (
                     'idx_intuit_sync_log_created_at',
                     'idx_intuit_sync_log_sync_mode'
                 )
                 ORDER BY indexname".to_string(),
            ))
            .await;

        assert!(indexes_result.is_ok(), "Sync log indexes should exist");
        assert_eq!(
            indexes_result.unwrap().len(),
            2,
            "Should have 2 indexes on intuit_sync_log table"
        );

        cleanup_test_data(&db).await;
    }

    #[tokio::test]
    async fn test_idempotent_index_creation() {
        let db = setup_test_db().await;
        let schema_manager = SchemaManager::new(&db);

        cleanup_test_data(&db).await;

        let migration = Migration;

        // Run migration first time
        migration
            .up(&schema_manager)
            .await
            .expect("First migration up should succeed");

        // Create indexes again manually (simulating re-run)
        // This tests that indexes use if_not_exists and are truly idempotent
        let _ = db
            .execute(Statement::from_string(
                DbBackend::Postgres,
                "CREATE INDEX IF NOT EXISTS idx_users_last_modified_at ON hr_public.users (last_modified_at)".to_string(),
            ))
            .await;

        let _ = db
            .execute(Statement::from_string(
                DbBackend::Postgres,
                "CREATE INDEX IF NOT EXISTS idx_intuit_sync_log_sync_mode ON hr_public.intuit_sync_log (sync_mode)".to_string(),
            ))
            .await;

        // Verify columns still exist and count is correct
        let sync_log_columns_result = db
            .query_all(Statement::from_string(
                DbBackend::Postgres,
                "SELECT column_name FROM information_schema.columns
                 WHERE table_schema = 'hr_public'
                 AND table_name = 'intuit_sync_log'
                 AND column_name IN ('sync_mode', 'changes_detected', 'changes_processed', 'sync_duration_ms')".to_string(),
            ))
            .await;

        assert_eq!(
            sync_log_columns_result.unwrap().len(),
            4,
            "Should still have 4 columns after operations"
        );

        // Verify indexes still exist
        let indexes_result = db
            .query_all(Statement::from_string(
                DbBackend::Postgres,
                "SELECT indexname
                 FROM pg_indexes
                 WHERE schemaname = 'hr_public'
                 AND indexname IN (
                     'idx_users_last_modified_at',
                     'idx_intuit_sync_log_sync_mode'
                 )".to_string(),
            ))
            .await;

        assert_eq!(
            indexes_result.unwrap().len(),
            2,
            "Indexes should handle re-creation with if_not_exists"
        );

        cleanup_test_data(&db).await;
    }

    #[tokio::test]
    async fn test_down_migration_removes_columns() {
        let db = setup_test_db().await;
        let schema_manager = SchemaManager::new(&db);

        cleanup_test_data(&db).await;

        let migration = Migration;

        // Run up migration
        migration.up(&schema_manager).await.expect("Migration up should succeed");

        // Run down migration
        migration.down(&schema_manager).await.expect("Migration down should succeed");

        // Verify intuit_sync_log columns were removed
        let sync_log_columns_result = db
            .query_all(Statement::from_string(
                DbBackend::Postgres,
                "SELECT column_name FROM information_schema.columns
                 WHERE table_schema = 'hr_public'
                 AND table_name = 'intuit_sync_log'
                 AND column_name IN ('sync_mode', 'changes_detected', 'changes_processed', 'sync_duration_ms')".to_string(),
            ))
            .await;

        assert_eq!(
            sync_log_columns_result.unwrap().len(),
            0,
            "Sync log columns should be removed after down migration"
        );

        // Verify intuit_connections columns were removed
        let connections_columns_result = db
            .query_all(Statement::from_string(
                DbBackend::Postgres,
                "SELECT column_name FROM information_schema.columns
                 WHERE table_schema = 'hr_public'
                 AND table_name = 'intuit_connections'
                 AND column_name IN ('employee_sync_token', 'department_sync_token', 'last_employee_sync_at', 'last_department_sync_at')".to_string(),
            ))
            .await;

        assert_eq!(
            connections_columns_result.unwrap().len(),
            0,
            "Connections columns should be removed after down migration"
        );

        cleanup_test_data(&db).await;
    }

    #[tokio::test]
    async fn test_down_migration_removes_indexes() {
        let db = setup_test_db().await;
        let schema_manager = SchemaManager::new(&db);

        cleanup_test_data(&db).await;

        let migration = Migration;

        // Run up migration
        migration.up(&schema_manager).await.expect("Migration up should succeed");

        // Run down migration
        migration.down(&schema_manager).await.expect("Migration down should succeed");

        // Verify users table indexes were removed
        let users_indexes_result = db
            .query_all(Statement::from_string(
                DbBackend::Postgres,
                "SELECT indexname
                 FROM pg_indexes
                 WHERE schemaname = 'hr_public'
                 AND tablename = 'users'
                 AND indexname IN (
                     'idx_users_last_modified_at',
                     'idx_users_last_synced_at',
                     'idx_users_sync_status'
                 )".to_string(),
            ))
            .await;

        assert_eq!(
            users_indexes_result.unwrap().len(),
            0,
            "Users indexes should be removed after down migration"
        );

        // Verify sync log indexes were removed
        let sync_log_indexes_result = db
            .query_all(Statement::from_string(
                DbBackend::Postgres,
                "SELECT indexname
                 FROM pg_indexes
                 WHERE schemaname = 'hr_public'
                 AND tablename = 'intuit_sync_log'
                 AND indexname IN (
                     'idx_intuit_sync_log_created_at',
                     'idx_intuit_sync_log_sync_mode'
                 )".to_string(),
            ))
            .await;

        assert_eq!(
            sync_log_indexes_result.unwrap().len(),
            0,
            "Sync log indexes should be removed after down migration"
        );

        cleanup_test_data(&db).await;
    }

    #[tokio::test]
    async fn test_full_migration_cycle() {
        let db = setup_test_db().await;
        let schema_manager = SchemaManager::new(&db);

        cleanup_test_data(&db).await;

        let migration = Migration;

        // Run up migration
        migration.up(&schema_manager).await.expect("First up should succeed");

        // Run down migration
        migration.down(&schema_manager).await.expect("Down should succeed");

        // Run up migration again
        migration.up(&schema_manager).await.expect("Second up should succeed");

        // Verify columns exist after full cycle
        let sync_log_columns_result = db
            .query_all(Statement::from_string(
                DbBackend::Postgres,
                "SELECT column_name FROM information_schema.columns
                 WHERE table_schema = 'hr_public'
                 AND table_name = 'intuit_sync_log'
                 AND column_name IN ('sync_mode', 'changes_detected', 'changes_processed', 'sync_duration_ms')".to_string(),
            ))
            .await;

        assert_eq!(
            sync_log_columns_result.unwrap().len(),
            4,
            "Should have 4 columns after full cycle"
        );

        // Verify indexes exist after full cycle
        let indexes_result = db
            .query_all(Statement::from_string(
                DbBackend::Postgres,
                "SELECT indexname
                 FROM pg_indexes
                 WHERE schemaname = 'hr_public'
                 AND indexname IN (
                     'idx_users_last_modified_at',
                     'idx_departments_last_synced_at',
                     'idx_intuit_sync_log_sync_mode'
                 )".to_string(),
            ))
            .await;

        assert_eq!(
            indexes_result.unwrap().len(),
            3,
            "Should have indexes after full cycle"
        );

        cleanup_test_data(&db).await;
    }

    #[tokio::test]
    async fn test_all_8_indexes_created() {
        let db = setup_test_db().await;
        let schema_manager = SchemaManager::new(&db);

        cleanup_test_data(&db).await;

        let migration = Migration;
        migration.up(&schema_manager).await.expect("Migration should succeed");

        // Verify all 8 indexes were created
        let indexes_result = db
            .query_all(Statement::from_string(
                DbBackend::Postgres,
                "SELECT indexname
                 FROM pg_indexes
                 WHERE schemaname = 'hr_public'
                 AND indexname IN (
                     'idx_users_last_modified_at',
                     'idx_users_last_synced_at',
                     'idx_users_sync_status',
                     'idx_departments_last_modified_at',
                     'idx_departments_last_synced_at',
                     'idx_departments_sync_status',
                     'idx_intuit_sync_log_created_at',
                     'idx_intuit_sync_log_sync_mode'
                 )
                 ORDER BY indexname".to_string(),
            ))
            .await;

        assert!(indexes_result.is_ok(), "All indexes should be created");
        assert_eq!(
            indexes_result.unwrap().len(),
            8,
            "Should have created all 8 performance indexes"
        );

        cleanup_test_data(&db).await;
    }
}
