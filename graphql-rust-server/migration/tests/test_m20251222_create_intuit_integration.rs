//! Tests for m20251222_create_intuit_integration migration
//!
//! Validates that the migration:
//! 1. Creates intuit_connections table for OAuth 2.0 token storage
//! 2. Adds intuit_employee_id column to users table with index
//! 3. Creates intuit_sync_log table with foreign key and indexes
//! 4. Uses SeaORM builders with idempotent operations (IF NOT EXISTS/IF EXISTS)
//! 5. Handles up/down migrations correctly with proper cleanup order
//! 6. Can run multiple times without errors (idempotency)

#[cfg(test)]
mod tests {
    use sea_orm::{Database, DatabaseConnection, DbBackend, Statement};
    use sea_orm_migration::prelude::*;
    use hr_graphql_server::migration::m20251222_create_intuit_integration::Migration;

    /// Setup a test database connection
    async fn setup_test_db() -> DatabaseConnection {
        let db_url = std::env::var("DATABASE_URL")
            .unwrap_or_else(|_| "postgres://postgres:postgres123@localhost:5433/hr_test".to_string());
        Database::connect(&db_url).await.expect("Failed to connect to test database")
    }

    /// Clean up test data after test runs
    async fn cleanup_test_data(db: &DatabaseConnection) {
        // Drop in reverse dependency order
        let _ = db
            .execute(Statement::from_string(
                DbBackend::Postgres,
                "DROP TABLE IF EXISTS hr_public.intuit_sync_log CASCADE".to_string(),
            ))
            .await;

        let _ = db
            .execute(Statement::from_string(
                DbBackend::Postgres,
                "DROP INDEX IF EXISTS hr_public.idx_users_intuit_employee_id".to_string(),
            ))
            .await;

        let _ = db
            .execute(Statement::from_string(
                DbBackend::Postgres,
                "ALTER TABLE hr_public.users DROP COLUMN IF EXISTS intuit_employee_id".to_string(),
            ))
            .await;

        let _ = db
            .execute(Statement::from_string(
                DbBackend::Postgres,
                "DROP TABLE IF EXISTS hr_public.intuit_connections CASCADE".to_string(),
            ))
            .await;
    }

    #[tokio::test]
    async fn test_intuit_integration_migration_compiles() {
        // Ensures the migration uses SeaORM builders correctly
        let _migration = Migration;
        assert!(true, "Migration struct compiles successfully");
    }

    #[tokio::test]
    async fn test_intuit_integration_migration_up() {
        let db = setup_test_db().await;
        let schema_manager = SchemaManager::new(&db);

        cleanup_test_data(&db).await;

        let migration = Migration;
        migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        // Verify intuit_connections table was created
        let table_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                "SELECT table_name FROM information_schema.tables
                 WHERE table_schema = 'hr_public'
                 AND table_name = 'intuit_connections'".to_string(),
            ))
            .await;

        assert!(table_result.is_ok(), "intuit_connections table should exist");
        assert!(table_result.unwrap().is_some(), "Should find intuit_connections table");

        // Verify intuit_employee_id column was added to users
        let column_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                "SELECT column_name, data_type, is_nullable
                 FROM information_schema.columns
                 WHERE table_schema = 'hr_public'
                 AND table_name = 'users'
                 AND column_name = 'intuit_employee_id'".to_string(),
            ))
            .await;

        assert!(column_result.is_ok(), "intuit_employee_id column should exist");
        let column = column_result.unwrap().unwrap();
        let is_nullable: String = column.try_get("", "is_nullable").expect("Should get is_nullable");
        assert_eq!(is_nullable, "YES", "intuit_employee_id should be nullable");

        // Verify intuit_sync_log table was created
        let sync_log_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                "SELECT table_name FROM information_schema.tables
                 WHERE table_schema = 'hr_public'
                 AND table_name = 'intuit_sync_log'".to_string(),
            ))
            .await;

        assert!(sync_log_result.is_ok(), "intuit_sync_log table should exist");
        assert!(sync_log_result.unwrap().is_some(), "Should find intuit_sync_log table");

        cleanup_test_data(&db).await;
    }

    #[tokio::test]
    async fn test_intuit_connections_table_columns() {
        let db = setup_test_db().await;
        let schema_manager = SchemaManager::new(&db);

        cleanup_test_data(&db).await;

        let migration = Migration;
        migration.up(&schema_manager).await.expect("Migration should succeed");

        // Verify all required columns exist
        let columns_result = db
            .query_all(Statement::from_string(
                DbBackend::Postgres,
                "SELECT column_name, data_type, is_nullable, column_default
                 FROM information_schema.columns
                 WHERE table_schema = 'hr_public'
                 AND table_name = 'intuit_connections'
                 ORDER BY ordinal_position".to_string(),
            ))
            .await;

        assert!(columns_result.is_ok(), "Should query columns successfully");
        let columns = columns_result.unwrap();

        let column_names: Vec<String> = columns
            .iter()
            .map(|c| c.try_get("", "column_name").unwrap())
            .collect();

        let expected_columns = vec![
            "id",
            "realm_id",
            "access_token",
            "refresh_token",
            "token_expires_at",
            "company_name",
            "is_active",
            "last_sync_at",
            "created_at",
            "updated_at",
            "deleted_at",
        ];

        for expected in &expected_columns {
            assert!(
                column_names.contains(&expected.to_string()),
                "intuit_connections should have {} column",
                expected
            );
        }

        cleanup_test_data(&db).await;
    }

    #[tokio::test]
    async fn test_intuit_sync_log_foreign_key() {
        let db = setup_test_db().await;
        let schema_manager = SchemaManager::new(&db);

        cleanup_test_data(&db).await;

        let migration = Migration;
        migration.up(&schema_manager).await.expect("Migration should succeed");

        // Verify foreign key exists
        let fk_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                "SELECT constraint_name, delete_rule
                 FROM information_schema.referential_constraints rc
                 JOIN information_schema.table_constraints tc
                   ON rc.constraint_name = tc.constraint_name
                 WHERE tc.table_schema = 'hr_public'
                 AND tc.table_name = 'intuit_sync_log'
                 AND tc.constraint_type = 'FOREIGN KEY'".to_string(),
            ))
            .await;

        assert!(fk_result.is_ok(), "Foreign key should exist");
        let fk = fk_result.unwrap();
        assert!(fk.is_some(), "Should find foreign key constraint");

        let delete_rule: String = fk.unwrap().try_get("", "delete_rule").expect("Should get delete_rule");
        assert_eq!(delete_rule, "SET NULL", "Foreign key should use SET NULL on delete");

        cleanup_test_data(&db).await;
    }

    #[tokio::test]
    async fn test_intuit_indexes_created() {
        let db = setup_test_db().await;
        let schema_manager = SchemaManager::new(&db);

        cleanup_test_data(&db).await;

        let migration = Migration;
        migration.up(&schema_manager).await.expect("Migration should succeed");

        // Verify idx_users_intuit_employee_id
        let user_index_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                "SELECT indexname FROM pg_indexes
                 WHERE schemaname = 'hr_public'
                 AND tablename = 'users'
                 AND indexname = 'idx_users_intuit_employee_id'".to_string(),
            ))
            .await;

        assert!(user_index_result.is_ok(), "User index should exist");
        assert!(user_index_result.unwrap().is_some(), "Should find idx_users_intuit_employee_id");

        // Verify idx_intuit_sync_log_user_id
        let log_user_index_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                "SELECT indexname FROM pg_indexes
                 WHERE schemaname = 'hr_public'
                 AND tablename = 'intuit_sync_log'
                 AND indexname = 'idx_intuit_sync_log_user_id'".to_string(),
            ))
            .await;

        assert!(log_user_index_result.is_ok(), "Log user index should exist");
        assert!(log_user_index_result.unwrap().is_some(), "Should find idx_intuit_sync_log_user_id");

        // Verify idx_intuit_sync_log_created_at
        let log_time_index_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                "SELECT indexname FROM pg_indexes
                 WHERE schemaname = 'hr_public'
                 AND tablename = 'intuit_sync_log'
                 AND indexname = 'idx_intuit_sync_log_created_at'".to_string(),
            ))
            .await;

        assert!(log_time_index_result.is_ok(), "Log time index should exist");
        assert!(log_time_index_result.unwrap().is_some(), "Should find idx_intuit_sync_log_created_at");

        cleanup_test_data(&db).await;
    }

    #[tokio::test]
    async fn test_intuit_integration_idempotent_up() {
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

        // Verify tables still exist after second run
        let tables_result = db
            .query_all(Statement::from_string(
                DbBackend::Postgres,
                "SELECT table_name FROM information_schema.tables
                 WHERE table_schema = 'hr_public'
                 AND table_name IN ('intuit_connections', 'intuit_sync_log')
                 ORDER BY table_name".to_string(),
            ))
            .await;

        assert!(tables_result.is_ok(), "Tables should still exist");
        let tables = tables_result.unwrap();
        assert_eq!(tables.len(), 2, "Both tables should exist after idempotent run");

        cleanup_test_data(&db).await;
    }

    #[tokio::test]
    async fn test_intuit_integration_migration_down() {
        let db = setup_test_db().await;
        let schema_manager = SchemaManager::new(&db);

        cleanup_test_data(&db).await;

        let migration = Migration;

        // Run up then down
        migration.up(&schema_manager).await.expect("Migration up should succeed");
        migration.down(&schema_manager).await.expect("Migration down should succeed");

        // Verify intuit_connections table was dropped
        let connections_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                "SELECT table_name FROM information_schema.tables
                 WHERE table_schema = 'hr_public'
                 AND table_name = 'intuit_connections'".to_string(),
            ))
            .await;

        assert!(
            connections_result.is_ok() && connections_result.unwrap().is_none(),
            "intuit_connections should be dropped"
        );

        // Verify intuit_sync_log table was dropped
        let log_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                "SELECT table_name FROM information_schema.tables
                 WHERE table_schema = 'hr_public'
                 AND table_name = 'intuit_sync_log'".to_string(),
            ))
            .await;

        assert!(
            log_result.is_ok() && log_result.unwrap().is_none(),
            "intuit_sync_log should be dropped"
        );

        // Verify intuit_employee_id column was dropped
        let column_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                "SELECT column_name FROM information_schema.columns
                 WHERE table_schema = 'hr_public'
                 AND table_name = 'users'
                 AND column_name = 'intuit_employee_id'".to_string(),
            ))
            .await;

        assert!(
            column_result.is_ok() && column_result.unwrap().is_none(),
            "intuit_employee_id column should be dropped"
        );

        cleanup_test_data(&db).await;
    }

    #[tokio::test]
    async fn test_intuit_integration_idempotent_down() {
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
    async fn test_intuit_integration_full_cycle() {
        let db = setup_test_db().await;
        let schema_manager = SchemaManager::new(&db);

        cleanup_test_data(&db).await;

        let migration = Migration;

        // Run complete up/down/up cycle
        migration.up(&schema_manager).await.expect("First up should succeed");
        migration.down(&schema_manager).await.expect("Down should succeed");
        migration.up(&schema_manager).await.expect("Second up should succeed");

        // Verify tables exist after full cycle
        let tables_result = db
            .query_all(Statement::from_string(
                DbBackend::Postgres,
                "SELECT table_name FROM information_schema.tables
                 WHERE table_schema = 'hr_public'
                 AND table_name IN ('intuit_connections', 'intuit_sync_log')".to_string(),
            ))
            .await;

        assert!(tables_result.is_ok(), "Tables should exist after full cycle");
        assert_eq!(tables_result.unwrap().len(), 2, "Both tables should exist");

        cleanup_test_data(&db).await;
    }

    #[tokio::test]
    async fn test_intuit_sync_log_payload_column() {
        let db = setup_test_db().await;
        let schema_manager = SchemaManager::new(&db);

        cleanup_test_data(&db).await;

        let migration = Migration;
        migration.up(&schema_manager).await.expect("Migration should succeed");

        // Verify payload column is JSONB type
        let column_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                "SELECT column_name, data_type, udt_name
                 FROM information_schema.columns
                 WHERE table_schema = 'hr_public'
                 AND table_name = 'intuit_sync_log'
                 AND column_name = 'payload'".to_string(),
            ))
            .await;

        assert!(column_result.is_ok(), "payload column should exist");
        let column = column_result.unwrap().unwrap();
        let udt_name: String = column.try_get("", "udt_name").expect("Should get udt_name");
        assert_eq!(udt_name, "jsonb", "payload should be JSONB type");

        cleanup_test_data(&db).await;
    }

    #[tokio::test]
    async fn test_intuit_connections_default_values() {
        let db = setup_test_db().await;
        let schema_manager = SchemaManager::new(&db);

        cleanup_test_data(&db).await;

        let migration = Migration;
        migration.up(&schema_manager).await.expect("Migration should succeed");

        // Verify is_active has default true
        let is_active_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                "SELECT column_name, column_default
                 FROM information_schema.columns
                 WHERE table_schema = 'hr_public'
                 AND table_name = 'intuit_connections'
                 AND column_name = 'is_active'".to_string(),
            ))
            .await;

        assert!(is_active_result.is_ok(), "is_active column should exist");
        let col = is_active_result.unwrap().unwrap();
        let default_val: Option<String> = col.try_get("", "column_default").ok();
        assert!(
            default_val.is_some() && default_val.unwrap().contains("true"),
            "is_active should default to true"
        );

        cleanup_test_data(&db).await;
    }
}
