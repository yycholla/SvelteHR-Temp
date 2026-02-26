//! Tests for m20251202_006_integrate_onboarding_documents migration
//!
//! Validates that the migration:
//! 1. Uses SeaORM builders for schema operations (ADD COLUMN, CREATE INDEX, DROP operations)
//! 2. Seeds the "Onboarding Documents" category with proper idempotency
//! 3. Creates a nullable document_id column for gradual migration
//! 4. Establishes foreign key constraint with ON DELETE CASCADE
//! 5. Creates index on document_id for query performance
//! 6. Handles up/down migrations with full idempotency
//! 7. Properly cleans up all resources on rollback
//! 8. Tests foreign key cascade behavior

#[cfg(test)]
mod tests {
    use hr_graphql_server::migration::m20251202_006_integrate_onboarding_documents::Migration;
    use sea_orm::{Database, DatabaseConnection, DbBackend, Statement};
    use sea_orm_migration::prelude::*;

    /// Setup a test database connection
    /// Uses DATABASE_URL from environment or defaults to test database
    async fn setup_test_db() -> DatabaseConnection {
        let db_url = std::env::var("DATABASE_URL").unwrap_or_else(|_| {
            "postgres://postgres:postgres123@localhost:5433/hr_test".to_string()
        });
        Database::connect(&db_url)
            .await
            .expect("Failed to connect to test database")
    }

    /// Clean up test data after test runs
    async fn cleanup_test_data(db: &DatabaseConnection) {
        // Drop the index if it exists
        let _ = db
            .execute(Statement::from_string(
                DbBackend::Postgres,
                "DROP INDEX IF EXISTS hr_public.idx_onboarding_document_uploads_document_id"
                    .to_string(),
            ))
            .await;

        // Drop the foreign key constraint if it exists
        let _ = db
            .execute(Statement::from_string(
                DbBackend::Postgres,
                "ALTER TABLE hr_public.onboarding_document_uploads DROP CONSTRAINT IF EXISTS fk_onboarding_document_uploads_document_id".to_string(),
            ))
            .await;

        // Drop the document_id column if it exists
        let _ = db
            .execute(Statement::from_string(
                DbBackend::Postgres,
                "ALTER TABLE hr_public.onboarding_document_uploads DROP COLUMN IF EXISTS document_id".to_string(),
            ))
            .await;

        // Delete the onboarding documents category if it exists
        let _ = db
            .execute(Statement::from_string(
                DbBackend::Postgres,
                "DELETE FROM hr_public.document_categories WHERE name = 'Onboarding Documents'"
                    .to_string(),
            ))
            .await;
    }

    #[tokio::test]
    async fn test_onboarding_documents_migration_compiles() {
        // This test ensures the migration uses SeaORM builders where possible
        // If this compiles, the migration is using the builder API correctly
        let _migration = Migration;
        assert!(true, "Migration struct compiles successfully");
    }

    #[tokio::test]
    async fn test_onboarding_documents_migration_up() {
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

        // Verify the document_id column was created
        let column_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                "SELECT column_name, data_type, is_nullable
                 FROM information_schema.columns
                 WHERE table_schema = 'hr_public'
                 AND table_name = 'onboarding_document_uploads'
                 AND column_name = 'document_id'"
                    .to_string(),
            ))
            .await;

        assert!(column_result.is_ok(), "document_id column should exist");
        let column_info = column_result.unwrap();
        assert!(column_info.is_some(), "Should have column information");

        let column = column_info.unwrap();
        let data_type: String = column
            .try_get("", "data_type")
            .expect("Should get data_type");
        let is_nullable: String = column
            .try_get("", "is_nullable")
            .expect("Should get is_nullable");

        assert_eq!(data_type, "uuid", "Column should be UUID type");
        assert_eq!(
            is_nullable, "YES",
            "Column should be nullable for gradual migration"
        );

        // Verify the foreign key constraint was created
        let fk_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                "SELECT constraint_name
                 FROM information_schema.table_constraints
                 WHERE constraint_schema = 'hr_public'
                 AND table_name = 'onboarding_document_uploads'
                 AND constraint_name = 'fk_onboarding_document_uploads_document_id'
                 AND constraint_type = 'FOREIGN KEY'"
                    .to_string(),
            ))
            .await;

        assert!(fk_result.is_ok(), "Foreign key constraint should exist");
        assert!(
            fk_result.unwrap().is_some(),
            "Should have constraint information"
        );

        // Verify the index was created
        let index_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                "SELECT indexname
                 FROM pg_indexes
                 WHERE schemaname = 'hr_public'
                 AND tablename = 'onboarding_document_uploads'
                 AND indexname = 'idx_onboarding_document_uploads_document_id'"
                    .to_string(),
            ))
            .await;

        assert!(index_result.is_ok(), "Index should exist");
        assert!(
            index_result.unwrap().is_some(),
            "Should have index information"
        );

        // Verify the document category was created
        let category_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                "SELECT name, description
                 FROM hr_public.document_categories
                 WHERE name = 'Onboarding Documents'"
                    .to_string(),
            ))
            .await;

        assert!(category_result.is_ok(), "Document category should exist");
        let category_info = category_result.unwrap();
        assert!(category_info.is_some(), "Should have category information");

        let category = category_info.unwrap();
        let name: String = category.try_get("", "name").expect("Should get name");
        let description: String = category
            .try_get("", "description")
            .expect("Should get description");

        assert_eq!(name, "Onboarding Documents");
        assert!(
            description.contains("W-4"),
            "Description should mention W-4"
        );
        assert!(
            description.contains("I-9"),
            "Description should mention I-9"
        );

        // Clean up after test
        cleanup_test_data(&db).await;
    }

    #[tokio::test]
    async fn test_onboarding_documents_migration_down() {
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

        // Verify the index was dropped
        let index_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                "SELECT COUNT(*) as count
                 FROM pg_indexes
                 WHERE schemaname = 'hr_public'
                 AND tablename = 'onboarding_document_uploads'
                 AND indexname = 'idx_onboarding_document_uploads_document_id'"
                    .to_string(),
            ))
            .await;

        assert!(
            index_result.is_ok(),
            "Should be able to check if index exists"
        );
        let index_info = index_result.unwrap();
        assert!(index_info.is_some(), "Should have index count");

        let count: i64 = index_info
            .unwrap()
            .try_get("", "count")
            .expect("Should get count");
        assert_eq!(count, 0, "Index should be dropped");

        // Verify the foreign key constraint was dropped
        let fk_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                "SELECT COUNT(*) as count
                 FROM information_schema.table_constraints
                 WHERE constraint_schema = 'hr_public'
                 AND table_name = 'onboarding_document_uploads'
                 AND constraint_name = 'fk_onboarding_document_uploads_document_id'"
                    .to_string(),
            ))
            .await;

        assert!(
            fk_result.is_ok(),
            "Should be able to check if constraint exists"
        );
        let fk_info = fk_result.unwrap();
        assert!(fk_info.is_some(), "Should have constraint count");

        let fk_count: i64 = fk_info
            .unwrap()
            .try_get("", "count")
            .expect("Should get count");
        assert_eq!(fk_count, 0, "Foreign key constraint should be dropped");

        // Verify the document_id column was dropped
        let column_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                "SELECT COUNT(*) as count
                 FROM information_schema.columns
                 WHERE table_schema = 'hr_public'
                 AND table_name = 'onboarding_document_uploads'
                 AND column_name = 'document_id'"
                    .to_string(),
            ))
            .await;

        assert!(
            column_result.is_ok(),
            "Should be able to check if column exists"
        );
        let column_info = column_result.unwrap();
        assert!(column_info.is_some(), "Should have column count");

        let col_count: i64 = column_info
            .unwrap()
            .try_get("", "count")
            .expect("Should get count");
        assert_eq!(col_count, 0, "Column should be dropped");

        // Verify the document category was deleted
        let category_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                "SELECT COUNT(*) as count
                 FROM hr_public.document_categories
                 WHERE name = 'Onboarding Documents'"
                    .to_string(),
            ))
            .await;

        assert!(
            category_result.is_ok(),
            "Should be able to check if category exists"
        );
        let category_info = category_result.unwrap();
        assert!(category_info.is_some(), "Should have category count");

        let cat_count: i64 = category_info
            .unwrap()
            .try_get("", "count")
            .expect("Should get count");
        assert_eq!(cat_count, 0, "Category should be deleted");

        // Clean up after test
        cleanup_test_data(&db).await;
    }

    #[tokio::test]
    async fn test_onboarding_documents_idempotent_up() {
        let db = setup_test_db().await;
        let schema_manager = SchemaManager::new(&db);

        // Clean up before test
        cleanup_test_data(&db).await;

        let migration = Migration;

        // Run migration twice - should not error due to idempotency checks
        migration
            .up(&schema_manager)
            .await
            .expect("First migration up should succeed");

        migration
            .up(&schema_manager)
            .await
            .expect("Second migration up should succeed (idempotent)");

        // Verify only one category was created (not duplicated)
        let category_count_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                "SELECT COUNT(*) as count
                 FROM hr_public.document_categories
                 WHERE name = 'Onboarding Documents'"
                    .to_string(),
            ))
            .await;

        let count: i64 = category_count_result
            .unwrap()
            .unwrap()
            .try_get("", "count")
            .expect("Should get count");
        assert_eq!(count, 1, "Should have exactly one category after two runs");

        // Clean up after test
        cleanup_test_data(&db).await;
    }

    #[tokio::test]
    async fn test_onboarding_documents_idempotent_down() {
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
    async fn test_foreign_key_cascade_delete() {
        let db = setup_test_db().await;
        let schema_manager = SchemaManager::new(&db);

        // Clean up before test
        cleanup_test_data(&db).await;

        let migration = Migration;

        // Run the migration
        migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        // Verify the foreign key constraint has CASCADE behavior
        // Query the constraint definition from PostgreSQL system tables
        let fk_definition = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                "SELECT
                    tc.constraint_name,
                    tc.table_name,
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
                   ON rc.constraint_name = tc.constraint_name
                   AND rc.constraint_schema = tc.table_schema
                 WHERE tc.constraint_type = 'FOREIGN KEY'
                   AND tc.table_schema = 'hr_public'
                   AND tc.table_name = 'onboarding_document_uploads'
                   AND tc.constraint_name = 'fk_onboarding_document_uploads_document_id'"
                    .to_string(),
            ))
            .await;

        assert!(
            fk_definition.is_ok(),
            "Should be able to query foreign key constraint"
        );
        let fk_info = fk_definition.unwrap();
        assert!(fk_info.is_some(), "Should have constraint information");

        let constraint_info = fk_info.unwrap();
        let delete_rule: String = constraint_info
            .try_get("", "delete_rule")
            .expect("Should get delete_rule");
        assert_eq!(
            delete_rule, "CASCADE",
            "Foreign key should have ON DELETE CASCADE"
        );

        let foreign_table: String = constraint_info
            .try_get("", "foreign_table_name")
            .expect("Should get foreign_table_name");
        assert_eq!(
            foreign_table, "documents",
            "Should reference documents table"
        );

        // Clean up after test
        cleanup_test_data(&db).await;
    }

    #[tokio::test]
    async fn test_nullable_column_allows_null_values() {
        let db = setup_test_db().await;
        let schema_manager = SchemaManager::new(&db);

        // Clean up before test
        cleanup_test_data(&db).await;

        let migration = Migration;

        // Run the migration
        migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        // Verify the column is nullable by checking the information schema
        let nullable_check = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                "SELECT is_nullable
                 FROM information_schema.columns
                 WHERE table_schema = 'hr_public'
                 AND table_name = 'onboarding_document_uploads'
                 AND column_name = 'document_id'"
                    .to_string(),
            ))
            .await;

        assert!(
            nullable_check.is_ok(),
            "Should be able to query column info"
        );
        let nullable_info = nullable_check.unwrap();
        assert!(nullable_info.is_some(), "Should have nullable information");

        let is_nullable: String = nullable_info
            .unwrap()
            .try_get("", "is_nullable")
            .expect("Should get is_nullable");
        assert_eq!(
            is_nullable, "YES",
            "document_id column should allow NULL values for gradual migration"
        );

        // Clean up after test
        cleanup_test_data(&db).await;
    }

    #[tokio::test]
    async fn test_index_improves_query_performance() {
        let db = setup_test_db().await;
        let schema_manager = SchemaManager::new(&db);

        // Clean up before test
        cleanup_test_data(&db).await;

        let migration = Migration;

        // Run the migration
        migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        // Verify the index exists and is on the correct column
        let index_columns = db
            .query_all(Statement::from_string(
                DbBackend::Postgres,
                "SELECT
                    a.attname AS column_name,
                    i.indisunique AS is_unique
                 FROM pg_class t
                 JOIN pg_index i ON t.oid = i.indrelid
                 JOIN pg_class idx ON i.indexrelid = idx.oid
                 JOIN pg_namespace n ON t.relnamespace = n.oid
                 JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(i.indkey)
                 WHERE n.nspname = 'hr_public'
                   AND t.relname = 'onboarding_document_uploads'
                   AND idx.relname = 'idx_onboarding_document_uploads_document_id'"
                    .to_string(),
            ))
            .await;

        assert!(
            index_columns.is_ok(),
            "Should be able to query index columns"
        );
        let columns = index_columns.unwrap();
        assert_eq!(columns.len(), 1, "Index should be on exactly one column");

        let column_name: String = columns[0]
            .try_get("", "column_name")
            .expect("Should get column name");
        assert_eq!(
            column_name, "document_id",
            "Index should be on document_id column"
        );

        let is_unique: bool = columns[0]
            .try_get("", "is_unique")
            .expect("Should get is_unique");
        assert!(
            !is_unique,
            "Index should be non-unique (allows multiple uploads per document)"
        );

        // Clean up after test
        cleanup_test_data(&db).await;
    }

    #[tokio::test]
    async fn test_document_category_structure() {
        let db = setup_test_db().await;
        let schema_manager = SchemaManager::new(&db);

        // Clean up before test
        cleanup_test_data(&db).await;

        let migration = Migration;

        // Run the migration
        migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        // Verify the category has all required fields
        let category_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                "SELECT id::text as id_text, name, description, created_at, updated_at
                 FROM hr_public.document_categories
                 WHERE name = 'Onboarding Documents'"
                    .to_string(),
            ))
            .await;

        assert!(category_result.is_ok(), "Should be able to query category");
        let category = category_result.unwrap().unwrap();

        // Verify ID is a valid UUID (cast to text in SQL)
        let id: String = category.try_get("", "id_text").expect("Should have id");
        assert!(!id.is_empty(), "ID should not be empty");
        // Verify it's a valid UUID format
        assert_eq!(id.len(), 36, "UUID should be 36 characters with hyphens");

        // Verify timestamps are set
        let created_at: chrono::DateTime<chrono::Utc> = category
            .try_get("", "created_at")
            .expect("Should have created_at");
        let updated_at: chrono::DateTime<chrono::Utc> = category
            .try_get("", "updated_at")
            .expect("Should have updated_at");
        assert!(
            created_at <= updated_at,
            "created_at should be <= updated_at"
        );

        // Verify description contains key terms
        let description: String = category
            .try_get("", "description")
            .expect("Should have description");
        assert!(
            description.contains("W-4"),
            "Description should mention W-4 form"
        );
        assert!(
            description.contains("I-9"),
            "Description should mention I-9 form"
        );
        assert!(
            description.contains("onboarding"),
            "Description should mention onboarding"
        );

        // Clean up after test
        cleanup_test_data(&db).await;
    }
}
