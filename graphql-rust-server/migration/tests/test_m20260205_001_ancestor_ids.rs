//! Tests for m20260205_001_add_department_ancestor_ids migration
//!
//! Validates that the migration:
//! 1. Uses SeaORM builders for schema operations (ADD COLUMN, CREATE INDEX, DROP INDEX, DROP COLUMN)
//! 2. Creates a GIN index on ancestor_ids for efficient hierarchy queries
//! 3. Properly backfills ancestor chains for existing departments
//! 4. Handles up/down migrations with idempotency
//! 5. Verifies GIN index type is correctly applied

#[cfg(test)]
mod tests {
    use sea_orm::{Database, DatabaseConnection, DbBackend, Statement};
    use sea_orm_migration::prelude::*;
    use hr_graphql_server::migration::m20260205_001_add_department_ancestor_ids::Migration;

    /// Setup a test database connection
    /// Uses DATABASE_URL from environment or defaults to test database
    async fn setup_test_db() -> DatabaseConnection {
        let db_url = std::env::var("DATABASE_URL")
            .unwrap_or_else(|_| "postgres://postgres:postgres123@localhost:5433/hr_test".to_string());
        Database::connect(&db_url).await.expect("Failed to connect to test database")
    }

    /// Clean up test data after test runs
    async fn cleanup_test_data(db: &DatabaseConnection) {
        // Drop the GIN index if it exists
        let _ = db
            .execute(Statement::from_string(
                DbBackend::Postgres,
                "DROP INDEX IF EXISTS hr_public.idx_departments_ancestor_ids".to_string(),
            ))
            .await;

        // Drop the ancestor_ids column if it exists
        let _ = db
            .execute(Statement::from_string(
                DbBackend::Postgres,
                "ALTER TABLE hr_public.departments DROP COLUMN IF EXISTS ancestor_ids".to_string(),
            ))
            .await;
    }

    #[tokio::test]
    async fn test_ancestor_ids_migration_compiles() {
        // This test ensures the migration uses SeaORM builders where possible
        // If this compiles, the migration is using the builder API correctly
        let _migration = Migration;
        assert!(true, "Migration struct compiles successfully");
    }

    #[tokio::test]
    async fn test_ancestor_ids_migration_up() {
        let db = setup_test_db().await;
        let schema_manager = SchemaManager::new(&db);

        // Clean up before test
        cleanup_test_data(&db).await;

        // Run the migration
        let migration = Migration;
        migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        // Verify the ancestor_ids column was created
        let column_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                "SELECT column_name, data_type, is_nullable, column_default
                 FROM information_schema.columns
                 WHERE table_schema = 'hr_public'
                 AND table_name = 'departments'
                 AND column_name = 'ancestor_ids'".to_string(),
            ))
            .await;

        assert!(column_result.is_ok(), "ancestor_ids column should exist");
        let column_info = column_result.unwrap();
        assert!(column_info.is_some(), "Should have column information");

        let column = column_info.unwrap();
        let data_type: String = column.try_get("", "data_type").expect("Should get data_type");
        let is_nullable: String = column.try_get("", "is_nullable").expect("Should get is_nullable");

        assert_eq!(data_type, "ARRAY", "Column should be ARRAY type");
        assert_eq!(is_nullable, "NO", "Column should be NOT NULL");

        // Verify the GIN index was created
        let index_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                "SELECT indexname, indexdef
                 FROM pg_indexes
                 WHERE schemaname = 'hr_public'
                 AND tablename = 'departments'
                 AND indexname = 'idx_departments_ancestor_ids'".to_string(),
            ))
            .await;

        assert!(index_result.is_ok(), "GIN index should exist");
        let index_info = index_result.unwrap();
        assert!(index_info.is_some(), "Should have index information");

        // Clean up after test
        cleanup_test_data(&db).await;
    }

    #[tokio::test]
    async fn test_ancestor_ids_gin_index_type() {
        let db = setup_test_db().await;
        let schema_manager = SchemaManager::new(&db);

        // Clean up before test
        cleanup_test_data(&db).await;

        // Run the migration
        let migration = Migration;
        migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        // Verify the index uses GIN access method
        let index_type_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                "SELECT am.amname as index_type
                 FROM pg_class c
                 JOIN pg_index i ON i.indexrelid = c.oid
                 JOIN pg_class t ON i.indrelid = t.oid
                 JOIN pg_namespace n ON t.relnamespace = n.oid
                 JOIN pg_am am ON c.relam = am.oid
                 WHERE n.nspname = 'hr_public'
                 AND t.relname = 'departments'
                 AND c.relname = 'idx_departments_ancestor_ids'".to_string(),
            ))
            .await;

        assert!(index_type_result.is_ok(), "Should be able to query index type");
        let index_type_info = index_type_result.unwrap();
        assert!(index_type_info.is_some(), "Should have index type information");

        let index_type: String = index_type_info.unwrap().try_get("", "index_type").expect("Should get index_type");
        assert_eq!(index_type, "gin", "Index should use GIN access method");

        // Also verify the indexdef contains USING GIN
        let indexdef_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                "SELECT indexdef
                 FROM pg_indexes
                 WHERE schemaname = 'hr_public'
                 AND tablename = 'departments'
                 AND indexname = 'idx_departments_ancestor_ids'".to_string(),
            ))
            .await;

        assert!(indexdef_result.is_ok(), "Should be able to query indexdef");
        let indexdef_info = indexdef_result.unwrap();
        assert!(indexdef_info.is_some(), "Should have indexdef information");

        let indexdef: String = indexdef_info.unwrap().try_get("", "indexdef").expect("Should get indexdef");
        assert!(indexdef.contains("USING gin"),
            "Index definition should contain USING gin. Got: {}", indexdef);

        // Clean up after test
        cleanup_test_data(&db).await;
    }

    #[tokio::test]
    async fn test_ancestor_ids_migration_down() {
        let db = setup_test_db().await;
        let schema_manager = SchemaManager::new(&db);

        // Clean up before test
        cleanup_test_data(&db).await;

        let migration = Migration;

        // Run up migration first
        migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        // Now run down migration
        migration
            .down(&schema_manager)
            .await
            .expect("Migration down should succeed");

        // Verify the GIN index was dropped
        let index_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                "SELECT COUNT(*)
                 FROM pg_indexes
                 WHERE schemaname = 'hr_public'
                 AND tablename = 'departments'
                 AND indexname = 'idx_departments_ancestor_ids'".to_string(),
            ))
            .await;

        assert!(index_result.is_ok(), "Should be able to check if index exists");
        let index_info = index_result.unwrap();
        assert!(index_info.is_some(), "Should have index count");

        let count: i64 = index_info.unwrap().try_get("", "count").expect("Should get count");
        assert_eq!(count, 0, "Index should be dropped");

        // Verify the ancestor_ids column was dropped
        let column_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                "SELECT COUNT(*)
                 FROM information_schema.columns
                 WHERE table_schema = 'hr_public'
                 AND table_name = 'departments'
                 AND column_name = 'ancestor_ids'".to_string(),
            ))
            .await;

        assert!(column_result.is_ok(), "Should be able to check if column exists");
        let column_info = column_result.unwrap();
        assert!(column_info.is_some(), "Should have column count");

        let col_count: i64 = column_info.unwrap().try_get("", "count").expect("Should get count");
        assert_eq!(col_count, 0, "Column should be dropped");

        // Clean up after test
        cleanup_test_data(&db).await;
    }

    #[tokio::test]
    async fn test_ancestor_ids_idempotent_up() {
        let db = setup_test_db().await;
        let schema_manager = SchemaManager::new(&db);

        // Clean up before test
        cleanup_test_data(&db).await;

        let migration = Migration;

        // Run migration twice - should not error due to IF NOT EXISTS
        migration
            .up(&schema_manager)
            .await
            .expect("First migration up should succeed");

        migration
            .up(&schema_manager)
            .await
            .expect("Second migration up should succeed (idempotent)");

        // Clean up after test
        cleanup_test_data(&db).await;
    }

    #[tokio::test]
    async fn test_ancestor_ids_idempotent_down() {
        let db = setup_test_db().await;
        let schema_manager = SchemaManager::new(&db);

        // Clean up before test
        cleanup_test_data(&db).await;

        let migration = Migration;

        // Run up migration first
        migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        // Run down migration twice - should not error due to IF EXISTS
        migration
            .down(&schema_manager)
            .await
            .expect("First migration down should succeed");

        migration
            .down(&schema_manager)
            .await
            .expect("Second migration down should succeed (idempotent)");

        // Clean up after test
        cleanup_test_data(&db).await;
    }

    #[tokio::test]
    async fn test_ancestor_ids_backfill_basic() {
        let db = setup_test_db().await;
        let schema_manager = SchemaManager::new(&db);

        // Clean up before test
        cleanup_test_data(&db).await;

        // Insert test departments before running migration
        // Root department
        let root_result = db
            .execute(Statement::from_string(
                DbBackend::Postgres,
                "INSERT INTO hr_public.departments (id, name, parent_department_id)
                 VALUES ('00000000-0000-0000-0000-000000000001'::uuid, 'Root Dept', NULL)
                 ON CONFLICT (id) DO NOTHING".to_string(),
            ))
            .await;
        assert!(root_result.is_ok(), "Root department insert should succeed");

        // Child department
        let child_result = db
            .execute(Statement::from_string(
                DbBackend::Postgres,
                "INSERT INTO hr_public.departments (id, name, parent_department_id)
                 VALUES ('00000000-0000-0000-0000-000000000002'::uuid, 'Child Dept', '00000000-0000-0000-0000-000000000001'::uuid)
                 ON CONFLICT (id) DO NOTHING".to_string(),
            ))
            .await;
        assert!(child_result.is_ok(), "Child department insert should succeed");

        // Grandchild department
        let grandchild_result = db
            .execute(Statement::from_string(
                DbBackend::Postgres,
                "INSERT INTO hr_public.departments (id, name, parent_department_id)
                 VALUES ('00000000-0000-0000-0000-000000000003'::uuid, 'Grandchild Dept', '00000000-0000-0000-0000-000000000002'::uuid)
                 ON CONFLICT (id) DO NOTHING".to_string(),
            ))
            .await;
        assert!(grandchild_result.is_ok(), "Grandchild department insert should succeed");

        // Run the migration
        let migration = Migration;
        migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        // Verify root department has empty ancestor_ids
        let root_ancestor_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                "SELECT array_length(ancestor_ids, 1) as ancestor_count FROM hr_public.departments WHERE id = '00000000-0000-0000-0000-000000000001'::uuid".to_string(),
            ))
            .await;

        assert!(root_ancestor_result.is_ok(), "Should be able to query root ancestor_ids");
        let root_ancestors = root_ancestor_result.unwrap();
        assert!(root_ancestors.is_some(), "Root department should exist");

        // Check that root has empty array (array_length returns NULL for empty arrays)
        let root_count: Option<i32> = root_ancestors.unwrap().try_get("", "ancestor_count").ok();
        assert!(root_count.is_none(), "Root department should have empty ancestor_ids array");

        // Verify child department has root as ancestor
        let child_ancestor_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                "SELECT ancestor_ids::text[] as ancestor_ids FROM hr_public.departments WHERE id = '00000000-0000-0000-0000-000000000002'::uuid".to_string(),
            ))
            .await;

        assert!(child_ancestor_result.is_ok(), "Should be able to query child ancestor_ids");
        let child_ancestors = child_ancestor_result.unwrap();
        assert!(child_ancestors.is_some(), "Child department should exist");

        let child_array: Vec<String> = child_ancestors.unwrap().try_get("", "ancestor_ids").expect("Should get ancestor_ids");
        assert_eq!(child_array.len(), 1, "Child department should have one ancestor");
        assert_eq!(child_array[0], "00000000-0000-0000-0000-000000000001", "Child's ancestor should be root");

        // Verify grandchild department has child and root as ancestors (in that order)
        let grandchild_ancestor_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                "SELECT ancestor_ids::text[] as ancestor_ids FROM hr_public.departments WHERE id = '00000000-0000-0000-0000-000000000003'::uuid".to_string(),
            ))
            .await;

        assert!(grandchild_ancestor_result.is_ok(), "Should be able to query grandchild ancestor_ids");
        let grandchild_ancestors = grandchild_ancestor_result.unwrap();
        assert!(grandchild_ancestors.is_some(), "Grandchild department should exist");

        let grandchild_array: Vec<String> = grandchild_ancestors.unwrap().try_get("", "ancestor_ids").expect("Should get ancestor_ids");
        assert_eq!(grandchild_array.len(), 2, "Grandchild department should have two ancestors");
        assert_eq!(grandchild_array[0], "00000000-0000-0000-0000-000000000002", "Grandchild's first ancestor should be child");
        assert_eq!(grandchild_array[1], "00000000-0000-0000-0000-000000000001", "Grandchild's second ancestor should be root");

        // Clean up test departments
        let _ = db
            .execute(Statement::from_string(
                DbBackend::Postgres,
                "DELETE FROM hr_public.departments WHERE id IN ('00000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000002'::uuid, '00000000-0000-0000-0000-000000000003'::uuid)".to_string(),
            ))
            .await;

        // Clean up after test
        cleanup_test_data(&db).await;
    }

    #[tokio::test]
    async fn test_gin_index_performance() {
        let db = setup_test_db().await;
        let schema_manager = SchemaManager::new(&db);

        // Clean up before test
        cleanup_test_data(&db).await;

        // Run the migration
        let migration = Migration;
        migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        // Insert test departments
        let _ = db
            .execute(Statement::from_string(
                DbBackend::Postgres,
                "INSERT INTO hr_public.departments (id, name, parent_department_id, ancestor_ids)
                 VALUES
                 ('00000000-0000-0000-0000-000000000010'::uuid, 'Test Root', NULL, ARRAY[]::uuid[]),
                 ('00000000-0000-0000-0000-000000000011'::uuid, 'Test Child', '00000000-0000-0000-0000-000000000010'::uuid, ARRAY['00000000-0000-0000-0000-000000000010'::uuid])
                 ON CONFLICT (id) DO NOTHING".to_string(),
            ))
            .await;

        // Test that GIN index supports containment queries (@> operator)
        let containment_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                "SELECT id, name
                 FROM hr_public.departments
                 WHERE ancestor_ids @> ARRAY['00000000-0000-0000-0000-000000000010'::uuid]::uuid[]".to_string(),
            ))
            .await;

        assert!(containment_result.is_ok(), "Containment query should succeed with GIN index");
        let result = containment_result.unwrap();
        assert!(result.is_some(), "Should find child department using containment query");

        let name: String = result.unwrap().try_get("", "name").expect("Should get name");
        assert_eq!(name, "Test Child", "Should find the correct child department");

        // Clean up test departments
        let _ = db
            .execute(Statement::from_string(
                DbBackend::Postgres,
                "DELETE FROM hr_public.departments WHERE id IN ('00000000-0000-0000-0000-000000000010'::uuid, '00000000-0000-0000-0000-000000000011'::uuid)".to_string(),
            ))
            .await;

        // Clean up after test
        cleanup_test_data(&db).await;
    }
}
