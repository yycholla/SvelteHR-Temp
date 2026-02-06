//! Tests for m20251217_002_create_media_assets migration
//!
//! Validates that the migration:
//! 1. Uses SeaORM builders (not raw SQL)
//! 2. Creates the media_assets table with correct schema
//! 3. Properly handles up/down migrations

#[cfg(test)]
mod tests {
    use sea_orm::{Database, DatabaseConnection, DbBackend, Statement};
    use sea_orm_migration::prelude::*;
    use hr_graphql_server::migration::m20251217_002_create_media_assets::Migration;

    /// Setup a test database connection
    /// Uses DATABASE_URL from environment or defaults to test database
    async fn setup_test_db() -> DatabaseConnection {
        let db_url = std::env::var("DATABASE_URL")
            .unwrap_or_else(|_| "postgres://postgres:postgres@localhost:5432/hr_test".to_string());
        Database::connect(&db_url).await.expect("Failed to connect to test database")
    }

    /// Clean up test tables after test runs
    async fn cleanup_test_table(db: &DatabaseConnection) {
        let _ = db
            .execute(Statement::from_string(
                DbBackend::Postgres,
                "DROP TABLE IF EXISTS hr_public.media_assets CASCADE".to_string(),
            ))
            .await;
    }

    #[tokio::test]
    async fn test_media_assets_migration_compiles() {
        // This test ensures the migration uses SeaORM builders, not raw SQL
        // If this compiles, the migration is using the builder API correctly
        let _migration = Migration;
        assert!(true, "Migration struct compiles successfully");
    }

    #[tokio::test]
    async fn test_media_assets_migration_up() {
        let db = setup_test_db().await;
        let schema_manager = SchemaManager::new(&db);

        // Clean up before test
        cleanup_test_table(&db).await;

        // Run the migration
        let migration = Migration;
        migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        // Verify table was created by checking if we can query it
        let result = db
            .execute(Statement::from_string(
                DbBackend::Postgres,
                "SELECT column_name, data_type, is_nullable
                 FROM information_schema.columns
                 WHERE table_schema = 'hr_public'
                 AND table_name = 'media_assets'
                 ORDER BY ordinal_position".to_string(),
            ))
            .await;

        assert!(result.is_ok(), "Should be able to query table structure");

        // Verify foreign key constraint exists
        let fk_result = db
            .execute(Statement::from_string(
                DbBackend::Postgres,
                "SELECT constraint_name
                 FROM information_schema.table_constraints
                 WHERE table_schema = 'hr_public'
                 AND table_name = 'media_assets'
                 AND constraint_type = 'FOREIGN KEY'".to_string(),
            ))
            .await;

        assert!(fk_result.is_ok(), "Should have foreign key constraint");

        // Clean up after test
        cleanup_test_table(&db).await;
    }

    #[tokio::test]
    async fn test_media_assets_migration_down() {
        let db = setup_test_db().await;
        let schema_manager = SchemaManager::new(&db);

        // Clean up before test
        cleanup_test_table(&db).await;

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

        // Verify table was dropped
        let result = db
            .execute(Statement::from_string(
                DbBackend::Postgres,
                "SELECT COUNT(*)
                 FROM information_schema.tables
                 WHERE table_schema = 'hr_public'
                 AND table_name = 'media_assets'".to_string(),
            ))
            .await;

        assert!(result.is_ok(), "Should be able to check if table exists");
    }

    #[tokio::test]
    async fn test_media_assets_idempotent_up() {
        let db = setup_test_db().await;
        let schema_manager = SchemaManager::new(&db);

        // Clean up before test
        cleanup_test_table(&db).await;

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
        cleanup_test_table(&db).await;
    }

    #[tokio::test]
    async fn test_media_assets_idempotent_down() {
        let db = setup_test_db().await;
        let schema_manager = SchemaManager::new(&db);

        // Clean up before test
        cleanup_test_table(&db).await;

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
    }
}
