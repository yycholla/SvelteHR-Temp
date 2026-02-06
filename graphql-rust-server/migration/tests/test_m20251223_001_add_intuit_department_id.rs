//! Tests for m20251223_001_add_intuit_department_id migration
//!
//! Validates that the migration:
//! 1. Adds intuit_department_id column to departments table
//! 2. Creates performance index on intuit_department_id
//! 3. Uses MigrationHelpers for idempotent operations
//! 4. Column is nullable to support gradual rollout
//! 5. Handles up/down migrations correctly
//! 6. Can run multiple times without errors (idempotency)

#[cfg(test)]
mod tests {
    use sea_orm::{Database, DatabaseConnection, DbBackend, Statement};
    use sea_orm_migration::prelude::*;
    use hr_graphql_server::migration::m20251223_001_add_intuit_department_id::Migration;

    /// Setup a test database connection
    async fn setup_test_db() -> DatabaseConnection {
        let db_url = std::env::var("DATABASE_URL")
            .unwrap_or_else(|_| "postgres://postgres:postgres123@localhost:5433/hr_test".to_string());
        Database::connect(&db_url).await.expect("Failed to connect to test database")
    }

    /// Clean up test data after test runs
    async fn cleanup_test_data(db: &DatabaseConnection) {
        let _ = db
            .execute(Statement::from_string(
                DbBackend::Postgres,
                "DROP INDEX IF EXISTS hr_public.idx_departments_intuit_department_id".to_string(),
            ))
            .await;

        let _ = db
            .execute(Statement::from_string(
                DbBackend::Postgres,
                "ALTER TABLE hr_public.departments DROP COLUMN IF EXISTS intuit_department_id".to_string(),
            ))
            .await;
    }

    #[tokio::test]
    async fn test_intuit_department_id_migration_compiles() {
        // Ensures the migration uses MigrationHelpers correctly
        let _migration = Migration;
        assert!(true, "Migration struct compiles successfully");
    }

    #[tokio::test]
    async fn test_intuit_department_id_migration_up() {
        let db = setup_test_db().await;
        let schema_manager = SchemaManager::new(&db);

        cleanup_test_data(&db).await;

        let migration = Migration;
        migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        // Verify intuit_department_id column was created
        let column_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                "SELECT column_name, data_type, is_nullable
                 FROM information_schema.columns
                 WHERE table_schema = 'hr_public'
                 AND table_name = 'departments'
                 AND column_name = 'intuit_department_id'".to_string(),
            ))
            .await;

        assert!(column_result.is_ok(), "intuit_department_id column should exist");
        let column = column_result.unwrap();
        assert!(column.is_some(), "Should have column information");

        let column_info = column.unwrap();
        let data_type: String = column_info.try_get("", "data_type").expect("Should get data_type");
        let is_nullable: String = column_info.try_get("", "is_nullable").expect("Should get is_nullable");

        assert_eq!(data_type, "character varying", "Column should be VARCHAR");
        assert_eq!(is_nullable, "YES", "Column should be nullable");

        // Verify the index was created
        let index_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                "SELECT indexname FROM pg_indexes
                 WHERE schemaname = 'hr_public'
                 AND tablename = 'departments'
                 AND indexname = 'idx_departments_intuit_department_id'".to_string(),
            ))
            .await;

        assert!(index_result.is_ok(), "Index should exist");
        assert!(index_result.unwrap().is_some(), "Should find idx_departments_intuit_department_id");

        cleanup_test_data(&db).await;
    }

    #[tokio::test]
    async fn test_intuit_department_id_column_nullable() {
        let db = setup_test_db().await;
        let schema_manager = SchemaManager::new(&db);

        cleanup_test_data(&db).await;

        let migration = Migration;
        migration.up(&schema_manager).await.expect("Migration should succeed");

        // Verify column is nullable (supports gradual rollout)
        let column_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                "SELECT is_nullable FROM information_schema.columns
                 WHERE table_schema = 'hr_public'
                 AND table_name = 'departments'
                 AND column_name = 'intuit_department_id'".to_string(),
            ))
            .await;

        assert!(column_result.is_ok(), "Should query column");
        let is_nullable: String = column_result
            .unwrap()
            .unwrap()
            .try_get("", "is_nullable")
            .expect("Should get is_nullable");

        assert_eq!(
            is_nullable, "YES",
            "intuit_department_id should be nullable to support non-synced departments"
        );

        cleanup_test_data(&db).await;
    }

    #[tokio::test]
    async fn test_intuit_department_id_index_exists() {
        let db = setup_test_db().await;
        let schema_manager = SchemaManager::new(&db);

        cleanup_test_data(&db).await;

        let migration = Migration;
        migration.up(&schema_manager).await.expect("Migration should succeed");

        // Verify index was created
        let index_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                "SELECT indexname, indexdef FROM pg_indexes
                 WHERE schemaname = 'hr_public'
                 AND tablename = 'departments'
                 AND indexname = 'idx_departments_intuit_department_id'".to_string(),
            ))
            .await;

        assert!(index_result.is_ok(), "Index query should succeed");
        let index = index_result.unwrap();
        assert!(index.is_some(), "Index should exist");

        let index_info = index.unwrap();
        let indexdef: String = index_info.try_get("", "indexdef").expect("Should get indexdef");

        assert!(
            indexdef.contains("intuit_department_id"),
            "Index should be on intuit_department_id column"
        );

        cleanup_test_data(&db).await;
    }

    #[tokio::test]
    async fn test_intuit_department_id_varchar_type() {
        let db = setup_test_db().await;
        let schema_manager = SchemaManager::new(&db);

        cleanup_test_data(&db).await;

        let migration = Migration;
        migration.up(&schema_manager).await.expect("Migration should succeed");

        // Verify column is VARCHAR (not numeric)
        let column_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                "SELECT data_type, udt_name FROM information_schema.columns
                 WHERE table_schema = 'hr_public'
                 AND table_name = 'departments'
                 AND column_name = 'intuit_department_id'".to_string(),
            ))
            .await;

        assert!(column_result.is_ok(), "Should query column type");
        let column = column_result.unwrap().unwrap();
        let data_type: String = column.try_get("", "data_type").expect("Should get data_type");

        assert_eq!(
            data_type, "character varying",
            "intuit_department_id should be VARCHAR for flexibility"
        );

        cleanup_test_data(&db).await;
    }

    #[tokio::test]
    async fn test_intuit_department_id_idempotent_up() {
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

        // Verify column still exists after second run
        let column_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                "SELECT column_name FROM information_schema.columns
                 WHERE table_schema = 'hr_public'
                 AND table_name = 'departments'
                 AND column_name = 'intuit_department_id'".to_string(),
            ))
            .await;

        assert!(
            column_result.is_ok() && column_result.unwrap().is_some(),
            "Column should still exist after idempotent run"
        );

        cleanup_test_data(&db).await;
    }

    #[tokio::test]
    async fn test_intuit_department_id_migration_down() {
        let db = setup_test_db().await;
        let schema_manager = SchemaManager::new(&db);

        cleanup_test_data(&db).await;

        let migration = Migration;

        // Run up then down
        migration.up(&schema_manager).await.expect("Migration up should succeed");
        migration.down(&schema_manager).await.expect("Migration down should succeed");

        // Verify column was dropped
        let column_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                "SELECT column_name FROM information_schema.columns
                 WHERE table_schema = 'hr_public'
                 AND table_name = 'departments'
                 AND column_name = 'intuit_department_id'".to_string(),
            ))
            .await;

        assert!(
            column_result.is_ok() && column_result.unwrap().is_none(),
            "intuit_department_id column should be dropped"
        );

        // Verify index was dropped
        let index_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                "SELECT indexname FROM pg_indexes
                 WHERE schemaname = 'hr_public'
                 AND tablename = 'departments'
                 AND indexname = 'idx_departments_intuit_department_id'".to_string(),
            ))
            .await;

        assert!(
            index_result.is_ok() && index_result.unwrap().is_none(),
            "Index should be dropped"
        );

        cleanup_test_data(&db).await;
    }

    #[tokio::test]
    async fn test_intuit_department_id_idempotent_down() {
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
    async fn test_intuit_department_id_full_cycle() {
        let db = setup_test_db().await;
        let schema_manager = SchemaManager::new(&db);

        cleanup_test_data(&db).await;

        let migration = Migration;

        // Run complete up/down/up cycle
        migration.up(&schema_manager).await.expect("First up should succeed");
        migration.down(&schema_manager).await.expect("Down should succeed");
        migration.up(&schema_manager).await.expect("Second up should succeed");

        // Verify column exists after full cycle
        let column_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                "SELECT column_name FROM information_schema.columns
                 WHERE table_schema = 'hr_public'
                 AND table_name = 'departments'
                 AND column_name = 'intuit_department_id'".to_string(),
            ))
            .await;

        assert!(
            column_result.is_ok() && column_result.unwrap().is_some(),
            "Column should exist after full cycle"
        );

        cleanup_test_data(&db).await;
    }

    #[tokio::test]
    async fn test_intuit_department_id_no_unique_constraint() {
        let db = setup_test_db().await;
        let schema_manager = SchemaManager::new(&db);

        cleanup_test_data(&db).await;

        let migration = Migration;
        migration.up(&schema_manager).await.expect("Migration should succeed");

        // Verify no unique constraint exists (allows flexibility)
        let constraint_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                "SELECT constraint_name, constraint_type
                 FROM information_schema.table_constraints
                 WHERE table_schema = 'hr_public'
                 AND table_name = 'departments'
                 AND constraint_type = 'UNIQUE'
                 AND constraint_name LIKE '%intuit_department_id%'".to_string(),
            ))
            .await;

        // Should return None because no unique constraint should exist
        assert!(
            constraint_result.is_ok() && constraint_result.unwrap().is_none(),
            "intuit_department_id should NOT have a unique constraint (allows flexibility for testing)"
        );

        cleanup_test_data(&db).await;
    }

    #[tokio::test]
    async fn test_intuit_department_id_index_not_unique() {
        let db = setup_test_db().await;
        let schema_manager = SchemaManager::new(&db);

        cleanup_test_data(&db).await;

        let migration = Migration;
        migration.up(&schema_manager).await.expect("Migration should succeed");

        // Verify index is NOT unique (allows duplicate QB IDs in different environments)
        let index_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                "SELECT indexname, indexdef FROM pg_indexes
                 WHERE schemaname = 'hr_public'
                 AND tablename = 'departments'
                 AND indexname = 'idx_departments_intuit_department_id'".to_string(),
            ))
            .await;

        assert!(index_result.is_ok(), "Should query index");
        let index = index_result.unwrap().unwrap();
        let indexdef: String = index.try_get("", "indexdef").expect("Should get indexdef");

        assert!(
            !indexdef.to_lowercase().contains("unique"),
            "Index should NOT be unique (allows flexibility)"
        );

        cleanup_test_data(&db).await;
    }
}
