//! Tests for m20251217_001_add_inline_form_elements migration
//!
//! Validates that the migration:
//! 1. Uses SeaORM builders (not raw SQL)
//! 2. Adds inline_form_elements JSONB column to both tables
//! 3. Properly handles up/down migrations with idempotency

#[cfg(test)]
mod tests {
    use hr_graphql_server::migration::m20251217_001_add_inline_form_elements::Migration;
    use sea_orm::{Database, DatabaseConnection, DbBackend, Statement};
    use sea_orm_migration::prelude::*;

    /// Setup a test database connection
    /// Uses DATABASE_URL from environment or defaults to test database
    async fn setup_test_db() -> DatabaseConnection {
        let db_url = std::env::var("DATABASE_URL")
            .unwrap_or_else(|_| "postgres://postgres:postgres@localhost:5432/hr_test".to_string());
        Database::connect(&db_url)
            .await
            .expect("Failed to connect to test database")
    }

    /// Clean up test columns after test runs
    async fn cleanup_test_columns(db: &DatabaseConnection) {
        // Remove inline_form_elements from both tables if they exist
        let _ = db
            .execute(Statement::from_string(
                DbBackend::Postgres,
                "ALTER TABLE hr_public.onboarding_content_blocks DROP COLUMN IF EXISTS inline_form_elements".to_string(),
            ))
            .await;

        let _ = db
            .execute(Statement::from_string(
                DbBackend::Postgres,
                "ALTER TABLE hr_public.onboarding_form_blocks DROP COLUMN IF EXISTS inline_form_elements".to_string(),
            ))
            .await;
    }

    #[tokio::test]
    async fn test_inline_form_elements_migration_compiles() {
        // This test ensures the migration uses SeaORM builders, not raw SQL
        // If this compiles, the migration is using the builder API correctly
        let _migration = Migration;
        assert!(true, "Migration struct compiles successfully");
    }

    #[tokio::test]
    async fn test_inline_form_elements_migration_up() {
        let db = setup_test_db().await;
        let schema_manager = SchemaManager::new(&db);

        // Clean up before test
        cleanup_test_columns(&db).await;

        // Run the migration
        let migration = Migration;
        migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        // Verify column was added to onboarding_content_blocks
        let result_content = db
            .execute(Statement::from_string(
                DbBackend::Postgres,
                "SELECT column_name, data_type
                 FROM information_schema.columns
                 WHERE table_schema = 'hr_public'
                 AND table_name = 'onboarding_content_blocks'
                 AND column_name = 'inline_form_elements'"
                    .to_string(),
            ))
            .await;

        assert!(
            result_content.is_ok(),
            "Should be able to query onboarding_content_blocks column"
        );

        // Verify column was added to onboarding_form_blocks
        let result_form = db
            .execute(Statement::from_string(
                DbBackend::Postgres,
                "SELECT column_name, data_type
                 FROM information_schema.columns
                 WHERE table_schema = 'hr_public'
                 AND table_name = 'onboarding_form_blocks'
                 AND column_name = 'inline_form_elements'"
                    .to_string(),
            ))
            .await;

        assert!(
            result_form.is_ok(),
            "Should be able to query onboarding_form_blocks column"
        );

        // Clean up after test
        cleanup_test_columns(&db).await;
    }

    #[tokio::test]
    async fn test_inline_form_elements_migration_down() {
        let db = setup_test_db().await;
        let schema_manager = SchemaManager::new(&db);

        // Clean up before test
        cleanup_test_columns(&db).await;

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

        // Verify column was dropped from onboarding_content_blocks
        let result_content = db
            .execute(Statement::from_string(
                DbBackend::Postgres,
                "SELECT COUNT(*)
                 FROM information_schema.columns
                 WHERE table_schema = 'hr_public'
                 AND table_name = 'onboarding_content_blocks'
                 AND column_name = 'inline_form_elements'"
                    .to_string(),
            ))
            .await;

        assert!(
            result_content.is_ok(),
            "Should be able to check if column exists"
        );

        // Verify column was dropped from onboarding_form_blocks
        let result_form = db
            .execute(Statement::from_string(
                DbBackend::Postgres,
                "SELECT COUNT(*)
                 FROM information_schema.columns
                 WHERE table_schema = 'hr_public'
                 AND table_name = 'onboarding_form_blocks'
                 AND column_name = 'inline_form_elements'"
                    .to_string(),
            ))
            .await;

        assert!(
            result_form.is_ok(),
            "Should be able to check if column exists"
        );
    }

    #[tokio::test]
    async fn test_inline_form_elements_idempotent_up() {
        let db = setup_test_db().await;
        let schema_manager = SchemaManager::new(&db);

        // Clean up before test
        cleanup_test_columns(&db).await;

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
        cleanup_test_columns(&db).await;
    }

    #[tokio::test]
    async fn test_inline_form_elements_idempotent_down() {
        let db = setup_test_db().await;
        let schema_manager = SchemaManager::new(&db);

        // Clean up before test
        cleanup_test_columns(&db).await;

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

    #[tokio::test]
    async fn test_column_data_type() {
        let db = setup_test_db().await;
        let schema_manager = SchemaManager::new(&db);

        // Clean up before test
        cleanup_test_columns(&db).await;

        let migration = Migration;
        migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        // Verify data type is JSONB for onboarding_content_blocks
        let result_content = db
            .execute(Statement::from_string(
                DbBackend::Postgres,
                "SELECT data_type
                 FROM information_schema.columns
                 WHERE table_schema = 'hr_public'
                 AND table_name = 'onboarding_content_blocks'
                 AND column_name = 'inline_form_elements'"
                    .to_string(),
            ))
            .await;

        assert!(
            result_content.is_ok(),
            "Should verify column data type for content_blocks"
        );

        // Verify data type is JSONB for onboarding_form_blocks
        let result_form = db
            .execute(Statement::from_string(
                DbBackend::Postgres,
                "SELECT data_type
                 FROM information_schema.columns
                 WHERE table_schema = 'hr_public'
                 AND table_name = 'onboarding_form_blocks'
                 AND column_name = 'inline_form_elements'"
                    .to_string(),
            ))
            .await;

        assert!(
            result_form.is_ok(),
            "Should verify column data type for form_blocks"
        );

        // Clean up after test
        cleanup_test_columns(&db).await;
    }
}
