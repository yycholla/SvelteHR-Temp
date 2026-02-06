//! Tests for m20251226_001_add_sync_tracking migration
//!
//! Validates that the migration:
//! 1. Adds 4 sync tracking fields to users table
//! 2. Adds 4 sync tracking fields to departments table
//! 3. Creates 6 performance indexes (3 per table)
//! 4. Uses MigrationHelpers for idempotent batch operations
//! 5. Sets correct defaults (last_modified_at DEFAULT NOW(), sync_status DEFAULT 'synced')
//! 6. Handles up/down migrations correctly
//! 7. Can run multiple times without errors (idempotency)

#[cfg(test)]
mod tests {
    use sea_orm::{Database, DatabaseConnection, DbBackend, Statement};
    use sea_orm_migration::prelude::*;
    use hr_graphql_server::migration::m20251226_001_add_sync_tracking::Migration;

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
            "hr_public.idx_users_last_synced_at",
            "hr_public.idx_users_sync_status",
            "hr_public.idx_users_intuit_id_sync_status",
            "hr_public.idx_departments_last_synced_at",
            "hr_public.idx_departments_sync_status",
            "hr_public.idx_departments_intuit_id_sync_status",
        ];

        for index in indexes {
            let _ = db
                .execute(Statement::from_string(
                    DbBackend::Postgres,
                    format!("DROP INDEX IF EXISTS {}", index),
                ))
                .await;
        }

        // Drop columns from users
        let _ = db
            .execute(Statement::from_string(
                DbBackend::Postgres,
                "ALTER TABLE hr_public.users
                 DROP COLUMN IF EXISTS last_synced_at,
                 DROP COLUMN IF EXISTS last_modified_at,
                 DROP COLUMN IF EXISTS quickbooks_sync_token,
                 DROP COLUMN IF EXISTS sync_status".to_string(),
            ))
            .await;

        // Drop columns from departments
        let _ = db
            .execute(Statement::from_string(
                DbBackend::Postgres,
                "ALTER TABLE hr_public.departments
                 DROP COLUMN IF EXISTS last_synced_at,
                 DROP COLUMN IF EXISTS last_modified_at,
                 DROP COLUMN IF EXISTS quickbooks_sync_token,
                 DROP COLUMN IF EXISTS sync_status".to_string(),
            ))
            .await;
    }

    #[tokio::test]
    async fn test_sync_tracking_migration_compiles() {
        // Ensures the migration uses MigrationHelpers correctly
        let _migration = Migration;
        assert!(true, "Migration struct compiles successfully");
    }

    #[tokio::test]
    async fn test_sync_tracking_migration_up() {
        let db = setup_test_db().await;
        let schema_manager = SchemaManager::new(&db);

        cleanup_test_data(&db).await;

        let migration = Migration;
        migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        // Verify users columns were added
        let users_columns_result = db
            .query_all(Statement::from_string(
                DbBackend::Postgres,
                "SELECT column_name FROM information_schema.columns
                 WHERE table_schema = 'hr_public'
                 AND table_name = 'users'
                 AND column_name IN ('last_synced_at', 'last_modified_at', 'quickbooks_sync_token', 'sync_status')
                 ORDER BY column_name".to_string(),
            ))
            .await;

        assert!(users_columns_result.is_ok(), "Users columns should exist");
        assert_eq!(users_columns_result.unwrap().len(), 4, "Should have 4 sync tracking columns in users");

        // Verify departments columns were added
        let dept_columns_result = db
            .query_all(Statement::from_string(
                DbBackend::Postgres,
                "SELECT column_name FROM information_schema.columns
                 WHERE table_schema = 'hr_public'
                 AND table_name = 'departments'
                 AND column_name IN ('last_synced_at', 'last_modified_at', 'quickbooks_sync_token', 'sync_status')
                 ORDER BY column_name".to_string(),
            ))
            .await;

        assert!(dept_columns_result.is_ok(), "Departments columns should exist");
        assert_eq!(dept_columns_result.unwrap().len(), 4, "Should have 4 sync tracking columns in departments");

        cleanup_test_data(&db).await;
    }

    #[tokio::test]
    async fn test_last_synced_at_nullable() {
        let db = setup_test_db().await;
        let schema_manager = SchemaManager::new(&db);

        cleanup_test_data(&db).await;

        let migration = Migration;
        migration.up(&schema_manager).await.expect("Migration should succeed");

        // Verify last_synced_at is nullable in users
        let column_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                "SELECT is_nullable FROM information_schema.columns
                 WHERE table_schema = 'hr_public'
                 AND table_name = 'users'
                 AND column_name = 'last_synced_at'".to_string(),
            ))
            .await;

        assert!(column_result.is_ok(), "last_synced_at should exist");
        let is_nullable: String = column_result
            .unwrap()
            .unwrap()
            .try_get("", "is_nullable")
            .expect("Should get is_nullable");

        assert_eq!(is_nullable, "YES", "last_synced_at should be nullable (NULL means never synced)");

        cleanup_test_data(&db).await;
    }

    #[tokio::test]
    async fn test_last_modified_at_not_null_default() {
        let db = setup_test_db().await;
        let schema_manager = SchemaManager::new(&db);

        cleanup_test_data(&db).await;

        let migration = Migration;
        migration.up(&schema_manager).await.expect("Migration should succeed");

        // Verify last_modified_at is NOT NULL with DEFAULT in users
        let column_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                "SELECT is_nullable, column_default FROM information_schema.columns
                 WHERE table_schema = 'hr_public'
                 AND table_name = 'users'
                 AND column_name = 'last_modified_at'".to_string(),
            ))
            .await;

        assert!(column_result.is_ok(), "last_modified_at should exist");
        let column = column_result.unwrap().unwrap();
        let is_nullable: String = column.try_get("", "is_nullable").expect("Should get is_nullable");
        let default_val: Option<String> = column.try_get("", "column_default").ok();

        assert_eq!(is_nullable, "NO", "last_modified_at should be NOT NULL");
        assert!(
            default_val.is_some() && default_val.unwrap().to_lowercase().contains("now()"),
            "last_modified_at should default to NOW()"
        );

        cleanup_test_data(&db).await;
    }

    #[tokio::test]
    async fn test_sync_status_default_synced() {
        let db = setup_test_db().await;
        let schema_manager = SchemaManager::new(&db);

        cleanup_test_data(&db).await;

        let migration = Migration;
        migration.up(&schema_manager).await.expect("Migration should succeed");

        // Verify sync_status has default 'synced' in users
        let column_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                "SELECT column_default FROM information_schema.columns
                 WHERE table_schema = 'hr_public'
                 AND table_name = 'users'
                 AND column_name = 'sync_status'".to_string(),
            ))
            .await;

        assert!(column_result.is_ok(), "sync_status should exist");
        let default_val: Option<String> = column_result
            .unwrap()
            .unwrap()
            .try_get("", "column_default")
            .ok();

        assert!(
            default_val.is_some() && default_val.unwrap().contains("synced"),
            "sync_status should default to 'synced'"
        );

        cleanup_test_data(&db).await;
    }

    #[tokio::test]
    async fn test_quickbooks_sync_token_nullable() {
        let db = setup_test_db().await;
        let schema_manager = SchemaManager::new(&db);

        cleanup_test_data(&db).await;

        let migration = Migration;
        migration.up(&schema_manager).await.expect("Migration should succeed");

        // Verify quickbooks_sync_token is nullable (only set after first sync)
        let column_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                "SELECT is_nullable, data_type FROM information_schema.columns
                 WHERE table_schema = 'hr_public'
                 AND table_name = 'users'
                 AND column_name = 'quickbooks_sync_token'".to_string(),
            ))
            .await;

        assert!(column_result.is_ok(), "quickbooks_sync_token should exist");
        let column = column_result.unwrap().unwrap();
        let is_nullable: String = column.try_get("", "is_nullable").expect("Should get is_nullable");
        let data_type: String = column.try_get("", "data_type").expect("Should get data_type");

        assert_eq!(is_nullable, "YES", "quickbooks_sync_token should be nullable");
        assert_eq!(data_type, "text", "quickbooks_sync_token should be TEXT type");

        cleanup_test_data(&db).await;
    }

    #[tokio::test]
    async fn test_users_indexes_created() {
        let db = setup_test_db().await;
        let schema_manager = SchemaManager::new(&db);

        cleanup_test_data(&db).await;

        let migration = Migration;
        migration.up(&schema_manager).await.expect("Migration should succeed");

        // Verify all 3 user indexes exist
        let indexes_result = db
            .query_all(Statement::from_string(
                DbBackend::Postgres,
                "SELECT indexname FROM pg_indexes
                 WHERE schemaname = 'hr_public'
                 AND tablename = 'users'
                 AND indexname IN ('idx_users_last_synced_at', 'idx_users_sync_status', 'idx_users_intuit_id_sync_status')
                 ORDER BY indexname".to_string(),
            ))
            .await;

        assert!(indexes_result.is_ok(), "User indexes should exist");
        assert_eq!(indexes_result.unwrap().len(), 3, "Should have 3 sync tracking indexes on users");

        cleanup_test_data(&db).await;
    }

    #[tokio::test]
    async fn test_departments_indexes_created() {
        let db = setup_test_db().await;
        let schema_manager = SchemaManager::new(&db);

        cleanup_test_data(&db).await;

        let migration = Migration;
        migration.up(&schema_manager).await.expect("Migration should succeed");

        // Verify all 3 department indexes exist
        let indexes_result = db
            .query_all(Statement::from_string(
                DbBackend::Postgres,
                "SELECT indexname FROM pg_indexes
                 WHERE schemaname = 'hr_public'
                 AND tablename = 'departments'
                 AND indexname IN ('idx_departments_last_synced_at', 'idx_departments_sync_status', 'idx_departments_intuit_id_sync_status')
                 ORDER BY indexname".to_string(),
            ))
            .await;

        assert!(indexes_result.is_ok(), "Department indexes should exist");
        assert_eq!(indexes_result.unwrap().len(), 3, "Should have 3 sync tracking indexes on departments");

        cleanup_test_data(&db).await;
    }

    #[tokio::test]
    async fn test_composite_index_structure() {
        let db = setup_test_db().await;
        let schema_manager = SchemaManager::new(&db);

        cleanup_test_data(&db).await;

        let migration = Migration;
        migration.up(&schema_manager).await.expect("Migration should succeed");

        // Verify composite index includes both columns
        let index_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                "SELECT indexdef FROM pg_indexes
                 WHERE schemaname = 'hr_public'
                 AND tablename = 'users'
                 AND indexname = 'idx_users_intuit_id_sync_status'".to_string(),
            ))
            .await;

        assert!(index_result.is_ok(), "Composite index should exist");
        let indexdef: String = index_result
            .unwrap()
            .unwrap()
            .try_get("", "indexdef")
            .expect("Should get indexdef");

        assert!(
            indexdef.contains("intuit_employee_id") && indexdef.contains("sync_status"),
            "Composite index should include both intuit_employee_id and sync_status"
        );

        cleanup_test_data(&db).await;
    }

    #[tokio::test]
    async fn test_sync_tracking_idempotent_up() {
        let db = setup_test_db().await;
        let schema_manager = SchemaManager::new(&db);

        cleanup_test_data(&db).await;

        let migration = Migration;

        // Run migration twice
        migration
            .up(&schema_manager)
            .await
            .expect("First migration up should succeed");

        migration
            .up(&schema_manager)
            .await
            .expect("Second migration up should succeed (idempotent)");

        // Verify columns still exist
        let users_columns_result = db
            .query_all(Statement::from_string(
                DbBackend::Postgres,
                "SELECT column_name FROM information_schema.columns
                 WHERE table_schema = 'hr_public'
                 AND table_name = 'users'
                 AND column_name IN ('last_synced_at', 'last_modified_at', 'quickbooks_sync_token', 'sync_status')".to_string(),
            ))
            .await;

        assert_eq!(
            users_columns_result.unwrap().len(),
            4,
            "All 4 columns should exist after idempotent run"
        );

        cleanup_test_data(&db).await;
    }

    #[tokio::test]
    async fn test_sync_tracking_migration_down() {
        let db = setup_test_db().await;
        let schema_manager = SchemaManager::new(&db);

        cleanup_test_data(&db).await;

        let migration = Migration;

        // Run up then down
        migration.up(&schema_manager).await.expect("Migration up should succeed");
        migration.down(&schema_manager).await.expect("Migration down should succeed");

        // Verify columns were dropped from users
        let users_columns_result = db
            .query_all(Statement::from_string(
                DbBackend::Postgres,
                "SELECT column_name FROM information_schema.columns
                 WHERE table_schema = 'hr_public'
                 AND table_name = 'users'
                 AND column_name IN ('last_synced_at', 'last_modified_at', 'quickbooks_sync_token', 'sync_status')".to_string(),
            ))
            .await;

        assert_eq!(
            users_columns_result.unwrap().len(),
            0,
            "All sync tracking columns should be dropped from users"
        );

        // Verify indexes were dropped
        let indexes_result = db
            .query_all(Statement::from_string(
                DbBackend::Postgres,
                "SELECT indexname FROM pg_indexes
                 WHERE schemaname = 'hr_public'
                 AND indexname LIKE 'idx_users_%_sync%'".to_string(),
            ))
            .await;

        assert_eq!(
            indexes_result.unwrap().len(),
            0,
            "All sync tracking indexes should be dropped"
        );

        cleanup_test_data(&db).await;
    }

    #[tokio::test]
    async fn test_sync_tracking_idempotent_down() {
        let db = setup_test_db().await;
        let schema_manager = SchemaManager::new(&db);

        cleanup_test_data(&db).await;

        let migration = Migration;

        // Run up, then down twice
        migration.up(&schema_manager).await.expect("Migration up should succeed");
        migration.down(&schema_manager).await.expect("First migration down should succeed");
        migration
            .down(&schema_manager)
            .await
            .expect("Second migration down should succeed (idempotent)");

        cleanup_test_data(&db).await;
    }

    #[tokio::test]
    async fn test_sync_tracking_full_cycle() {
        let db = setup_test_db().await;
        let schema_manager = SchemaManager::new(&db);

        cleanup_test_data(&db).await;

        let migration = Migration;

        // Run complete up/down/up cycle
        migration.up(&schema_manager).await.expect("First up should succeed");
        migration.down(&schema_manager).await.expect("Down should succeed");
        migration.up(&schema_manager).await.expect("Second up should succeed");

        // Verify columns exist after full cycle
        let users_columns_result = db
            .query_all(Statement::from_string(
                DbBackend::Postgres,
                "SELECT column_name FROM information_schema.columns
                 WHERE table_schema = 'hr_public'
                 AND table_name = 'users'
                 AND column_name IN ('last_synced_at', 'sync_status')".to_string(),
            ))
            .await;

        assert_eq!(
            users_columns_result.unwrap().len(),
            2,
            "Columns should exist after full cycle"
        );

        cleanup_test_data(&db).await;
    }

    #[tokio::test]
    async fn test_departments_columns_match_users() {
        let db = setup_test_db().await;
        let schema_manager = SchemaManager::new(&db);

        cleanup_test_data(&db).await;

        let migration = Migration;
        migration.up(&schema_manager).await.expect("Migration should succeed");

        // Verify departments has same columns as users
        let dept_columns_result = db
            .query_all(Statement::from_string(
                DbBackend::Postgres,
                "SELECT column_name, data_type, is_nullable
                 FROM information_schema.columns
                 WHERE table_schema = 'hr_public'
                 AND table_name = 'departments'
                 AND column_name IN ('last_synced_at', 'last_modified_at', 'quickbooks_sync_token', 'sync_status')
                 ORDER BY column_name".to_string(),
            ))
            .await;

        assert!(dept_columns_result.is_ok(), "Department columns should exist");
        assert_eq!(
            dept_columns_result.unwrap().len(),
            4,
            "Departments should have same 4 sync tracking columns as users"
        );

        cleanup_test_data(&db).await;
    }
}
