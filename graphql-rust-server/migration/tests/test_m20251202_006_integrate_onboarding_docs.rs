//! Tests for Onboarding Documents Integration Migration
//!
//! This test suite verifies the integration between onboarding and document management.
//! It ensures the document_id column, foreign key, and index are properly created,
//! and that the "Onboarding Documents" category is seeded.

#[cfg(test)]
mod tests {
    use hr_graphql_server::migration::m20251202_006_integrate_onboarding_documents::Migration;
    use sea_orm::{Database, DatabaseConnection, DbBackend, Statement};
    use sea_orm_migration::prelude::*;

    /// Helper to set up test database connection
    async fn setup() -> DatabaseConnection {
        let database_url = std::env::var("DATABASE_URL")
            .unwrap_or_else(|_| "postgres://postgres:postgres@localhost:5432/hr_test".to_string());

        Database::connect(&database_url)
            .await
            .expect("Failed to connect to test database")
    }

    /// Helper to check if document_id column exists
    async fn document_id_column_exists(db: &DatabaseConnection) -> bool {
        let result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                    SELECT COUNT(*) as count
                    FROM information_schema.columns
                    WHERE table_schema = 'hr_public'
                    AND table_name = 'onboarding_document_uploads'
                    AND column_name = 'document_id'
                "#
                .to_string(),
            ))
            .await
            .expect("Query failed");

        match result {
            Some(row) => {
                let count: i64 = row.try_get("", "count").unwrap_or(0);
                count > 0
            }
            None => false,
        }
    }

    /// Helper to check if foreign key constraint exists
    async fn foreign_key_exists(db: &DatabaseConnection) -> bool {
        let result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                    SELECT COUNT(*) as count
                    FROM information_schema.table_constraints
                    WHERE constraint_schema = 'hr_public'
                    AND table_name = 'onboarding_document_uploads'
                    AND constraint_name = 'fk_onboarding_document_uploads_document_id'
                "#
                .to_string(),
            ))
            .await
            .expect("Query failed");

        match result {
            Some(row) => {
                let count: i64 = row.try_get("", "count").unwrap_or(0);
                count > 0
            }
            None => false,
        }
    }

    /// Helper to check if index exists
    async fn index_exists(db: &DatabaseConnection) -> bool {
        let result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                    SELECT COUNT(*) as count
                    FROM pg_indexes
                    WHERE schemaname = 'hr_public'
                    AND tablename = 'onboarding_document_uploads'
                    AND indexname = 'idx_onboarding_document_uploads_document_id'
                "#
                .to_string(),
            ))
            .await
            .expect("Query failed");

        match result {
            Some(row) => {
                let count: i64 = row.try_get("", "count").unwrap_or(0);
                count > 0
            }
            None => false,
        }
    }

    /// Helper to check if onboarding documents category exists
    async fn category_exists(db: &DatabaseConnection) -> bool {
        let result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                    SELECT COUNT(*) as count
                    FROM hr_public.document_categories
                    WHERE name = 'Onboarding Documents'
                "#
                .to_string(),
            ))
            .await
            .expect("Query failed");

        match result {
            Some(row) => {
                let count: i64 = row.try_get("", "count").unwrap_or(0);
                count > 0
            }
            None => false,
        }
    }

    #[tokio::test]
    #[ignore] // Run with: cargo test --test test_m20251202_006_integrate_onboarding_docs -- --ignored
    async fn test_migration_compiles() {
        // This test verifies that the migration module compiles correctly
        let _migration = Migration;
        assert!(true, "Migration compiles successfully");
    }

    #[tokio::test]
    #[ignore]
    async fn test_up_migration_creates_document_id_column() {
        let db = setup().await;
        let manager = SchemaManager::new(&db);

        // Clean up first
        let _ = Migration.down(&manager).await;

        // Run UP migration
        Migration
            .up(&manager)
            .await
            .expect("UP migration should succeed");

        // Verify column exists
        assert!(
            document_id_column_exists(&db).await,
            "document_id column should exist after migration"
        );
    }

    #[tokio::test]
    #[ignore]
    async fn test_document_id_column_is_nullable() {
        let db = setup().await;
        let manager = SchemaManager::new(&db);

        // Ensure migration is applied
        let _ = Migration.down(&manager).await;
        Migration.up(&manager).await.expect("Migration should succeed");

        // Check if column is nullable
        let result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                    SELECT is_nullable
                    FROM information_schema.columns
                    WHERE table_schema = 'hr_public'
                    AND table_name = 'onboarding_document_uploads'
                    AND column_name = 'document_id'
                "#
                .to_string(),
            ))
            .await
            .expect("Query should succeed")
            .expect("Column should exist");

        let is_nullable: String = result.try_get("", "is_nullable").unwrap();
        assert_eq!(
            is_nullable, "YES",
            "document_id should be nullable for gradual migration"
        );
    }

    #[tokio::test]
    #[ignore]
    async fn test_document_id_column_is_uuid_type() {
        let db = setup().await;
        let manager = SchemaManager::new(&db);

        // Ensure migration is applied
        let _ = Migration.down(&manager).await;
        Migration.up(&manager).await.expect("Migration should succeed");

        // Check column data type
        let result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                    SELECT data_type
                    FROM information_schema.columns
                    WHERE table_schema = 'hr_public'
                    AND table_name = 'onboarding_document_uploads'
                    AND column_name = 'document_id'
                "#
                .to_string(),
            ))
            .await
            .expect("Query should succeed")
            .expect("Column should exist");

        let data_type: String = result.try_get("", "data_type").unwrap();
        assert_eq!(data_type, "uuid", "document_id should be uuid type");
    }

    #[tokio::test]
    #[ignore]
    async fn test_foreign_key_constraint_is_created() {
        let db = setup().await;
        let manager = SchemaManager::new(&db);

        // Ensure migration is applied
        let _ = Migration.down(&manager).await;
        Migration.up(&manager).await.expect("Migration should succeed");

        // Verify foreign key exists
        assert!(
            foreign_key_exists(&db).await,
            "Foreign key constraint should exist after migration"
        );
    }

    #[tokio::test]
    #[ignore]
    async fn test_foreign_key_references_documents_table() {
        let db = setup().await;
        let manager = SchemaManager::new(&db);

        // Ensure migration is applied
        let _ = Migration.down(&manager).await;
        Migration.up(&manager).await.expect("Migration should succeed");

        // Check foreign key references
        let result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                    SELECT
                        ccu.table_name AS foreign_table_name,
                        ccu.column_name AS foreign_column_name
                    FROM information_schema.table_constraints AS tc
                    JOIN information_schema.constraint_column_usage AS ccu
                        ON tc.constraint_name = ccu.constraint_name
                        AND tc.constraint_schema = ccu.constraint_schema
                    WHERE tc.constraint_schema = 'hr_public'
                    AND tc.table_name = 'onboarding_document_uploads'
                    AND tc.constraint_name = 'fk_onboarding_document_uploads_document_id'
                    AND tc.constraint_type = 'FOREIGN KEY'
                "#
                .to_string(),
            ))
            .await
            .expect("Query should succeed")
            .expect("Foreign key should exist");

        let foreign_table: String = result.try_get("", "foreign_table_name").unwrap();
        let foreign_column: String = result.try_get("", "foreign_column_name").unwrap();

        assert_eq!(foreign_table, "documents");
        assert_eq!(foreign_column, "id");
    }

    #[tokio::test]
    #[ignore]
    async fn test_index_is_created() {
        let db = setup().await;
        let manager = SchemaManager::new(&db);

        // Ensure migration is applied
        let _ = Migration.down(&manager).await;
        Migration.up(&manager).await.expect("Migration should succeed");

        // Verify index exists
        assert!(
            index_exists(&db).await,
            "Index on document_id should exist after migration"
        );
    }

    #[tokio::test]
    #[ignore]
    async fn test_onboarding_documents_category_is_created() {
        let db = setup().await;
        let manager = SchemaManager::new(&db);

        // Clean up first
        let _ = Migration.down(&manager).await;

        // Run UP migration
        Migration
            .up(&manager)
            .await
            .expect("UP migration should succeed");

        // Verify category exists
        assert!(
            category_exists(&db).await,
            "Onboarding Documents category should exist after migration"
        );
    }

    #[tokio::test]
    #[ignore]
    async fn test_onboarding_documents_category_has_correct_description() {
        let db = setup().await;
        let manager = SchemaManager::new(&db);

        // Ensure migration is applied
        let _ = Migration.down(&manager).await;
        Migration.up(&manager).await.expect("Migration should succeed");

        // Get category description
        let result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                    SELECT name, description
                    FROM hr_public.document_categories
                    WHERE name = 'Onboarding Documents'
                "#
                .to_string(),
            ))
            .await
            .expect("Query should succeed")
            .expect("Category should exist");

        let name: String = result.try_get("", "name").unwrap();
        let description: String = result.try_get("", "description").unwrap();

        assert_eq!(name, "Onboarding Documents");
        assert!(
            description.contains("W-4") || description.contains("onboarding"),
            "Description should mention onboarding-related documents"
        );
    }

    #[tokio::test]
    #[ignore]
    async fn test_idempotent_up_migration() {
        let db = setup().await;
        let manager = SchemaManager::new(&db);

        // Clean up first
        let _ = Migration.down(&manager).await;

        // Run UP migration twice
        Migration
            .up(&manager)
            .await
            .expect("First UP migration should succeed");

        Migration
            .up(&manager)
            .await
            .expect("Second UP migration should succeed (idempotent)");

        // Verify all components still exist
        assert!(
            document_id_column_exists(&db).await,
            "Column should exist after double migration"
        );
        assert!(
            foreign_key_exists(&db).await,
            "Foreign key should exist after double migration"
        );
        assert!(
            index_exists(&db).await,
            "Index should exist after double migration"
        );
        assert!(
            category_exists(&db).await,
            "Category should exist after double migration"
        );
    }

    #[tokio::test]
    #[ignore]
    async fn test_down_migration_removes_column() {
        let db = setup().await;
        let manager = SchemaManager::new(&db);

        // Ensure migration is applied
        Migration.up(&manager).await.expect("UP migration should succeed");
        assert!(
            document_id_column_exists(&db).await,
            "Column should exist before rollback"
        );

        // Run DOWN migration
        Migration
            .down(&manager)
            .await
            .expect("DOWN migration should succeed");

        // Verify column is removed
        assert!(
            !document_id_column_exists(&db).await,
            "Column should be removed after rollback"
        );
    }

    #[tokio::test]
    #[ignore]
    async fn test_down_migration_removes_index() {
        let db = setup().await;
        let manager = SchemaManager::new(&db);

        // Ensure migration is applied
        Migration.up(&manager).await.expect("UP migration should succeed");
        assert!(index_exists(&db).await, "Index should exist before rollback");

        // Run DOWN migration
        Migration
            .down(&manager)
            .await
            .expect("DOWN migration should succeed");

        // Verify index is removed
        assert!(
            !index_exists(&db).await,
            "Index should be removed after rollback"
        );
    }

    #[tokio::test]
    #[ignore]
    async fn test_down_migration_removes_foreign_key() {
        let db = setup().await;
        let manager = SchemaManager::new(&db);

        // Ensure migration is applied
        Migration.up(&manager).await.expect("UP migration should succeed");
        assert!(
            foreign_key_exists(&db).await,
            "Foreign key should exist before rollback"
        );

        // Run DOWN migration
        Migration
            .down(&manager)
            .await
            .expect("DOWN migration should succeed");

        // Verify foreign key is removed
        assert!(
            !foreign_key_exists(&db).await,
            "Foreign key should be removed after rollback"
        );
    }

    #[tokio::test]
    #[ignore]
    async fn test_down_migration_removes_category() {
        let db = setup().await;
        let manager = SchemaManager::new(&db);

        // Ensure migration is applied
        Migration.up(&manager).await.expect("UP migration should succeed");
        assert!(
            category_exists(&db).await,
            "Category should exist before rollback"
        );

        // Run DOWN migration
        Migration
            .down(&manager)
            .await
            .expect("DOWN migration should succeed");

        // Verify category is removed
        assert!(
            !category_exists(&db).await,
            "Category should be removed after rollback"
        );
    }

    #[tokio::test]
    #[ignore]
    async fn test_idempotent_down_migration() {
        let db = setup().await;
        let manager = SchemaManager::new(&db);

        // Ensure migration is applied
        Migration.up(&manager).await.expect("UP migration should succeed");

        // Run DOWN migration twice
        Migration
            .down(&manager)
            .await
            .expect("First DOWN migration should succeed");

        Migration
            .down(&manager)
            .await
            .expect("Second DOWN migration should succeed (idempotent)");

        // Verify all components are removed
        assert!(
            !document_id_column_exists(&db).await,
            "Column should be removed after double rollback"
        );
        assert!(
            !index_exists(&db).await,
            "Index should be removed after double rollback"
        );
        assert!(
            !foreign_key_exists(&db).await,
            "Foreign key should be removed after double rollback"
        );
        assert!(
            !category_exists(&db).await,
            "Category should be removed after double rollback"
        );
    }

    #[tokio::test]
    #[ignore]
    async fn test_full_migration_cycle() {
        let db = setup().await;
        let manager = SchemaManager::new(&db);

        // Start clean
        let _ = Migration.down(&manager).await;

        // UP migration
        Migration.up(&manager).await.expect("UP should succeed");
        assert!(document_id_column_exists(&db).await);
        assert!(foreign_key_exists(&db).await);
        assert!(index_exists(&db).await);
        assert!(category_exists(&db).await);

        // DOWN migration
        Migration.down(&manager).await.expect("DOWN should succeed");
        assert!(!document_id_column_exists(&db).await);
        assert!(!foreign_key_exists(&db).await);
        assert!(!index_exists(&db).await);
        assert!(!category_exists(&db).await);

        // UP migration again
        Migration.up(&manager).await.expect("Second UP should succeed");
        assert!(document_id_column_exists(&db).await);
        assert!(foreign_key_exists(&db).await);
        assert!(index_exists(&db).await);
        assert!(category_exists(&db).await);
    }
}
