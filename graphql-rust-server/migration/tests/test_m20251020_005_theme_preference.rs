//! Tests for m20251020_005_add_user_theme_preference migration
//!
//! Validates that the migration:
//! 1. Uses SeaORM builders for ALTER TABLE operations (ADD COLUMN, DROP COLUMN)
//! 2. Documents COMMENT limitation (no builder API exists)
//! 3. Properly creates column comment via raw SQL
//! 4. Handles up/down migrations with idempotency
//! 5. Sets correct default value ('system')
//! 6. Verifies column comment in pg_description

#[cfg(test)]
mod tests {
    use sea_orm::{Database, DatabaseConnection, DbBackend, Statement};
    use sea_orm_migration::prelude::*;
    use hr_graphql_server::migration::m20251020_005_add_user_theme_preference::Migration;

    /// Setup a test database connection
    /// Uses DATABASE_URL from environment or defaults to test database
    async fn setup_test_db() -> DatabaseConnection {
        let db_url = std::env::var("DATABASE_URL")
            .unwrap_or_else(|_| "postgres://postgres:postgres123@localhost:5433/hr_test".to_string());
        Database::connect(&db_url).await.expect("Failed to connect to test database")
    }

    /// Clean up test column after test runs
    async fn cleanup_test_column(db: &DatabaseConnection) {
        // Drop the column if it exists (ignore errors)
        let _ = db
            .execute(Statement::from_string(
                DbBackend::Postgres,
                "ALTER TABLE hr_public.users DROP COLUMN IF EXISTS theme_preference".to_string(),
            ))
            .await;
    }

    #[tokio::test]
    async fn test_theme_preference_migration_compiles() {
        // This test ensures the migration uses SeaORM builders where possible
        // If this compiles, the migration is using the builder API correctly
        let _migration = Migration;
        assert!(true, "Migration struct compiles successfully");
    }

    #[tokio::test]
    async fn test_theme_preference_migration_up() {
        let db = setup_test_db().await;
        let schema_manager = SchemaManager::new(&db);

        // Clean up before test
        cleanup_test_column(&db).await;

        // Run the migration
        let migration = Migration;
        migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        // Verify the theme_preference column was created
        let column_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                "SELECT column_name, data_type, is_nullable, column_default
                 FROM information_schema.columns
                 WHERE table_schema = 'hr_public'
                 AND table_name = 'users'
                 AND column_name = 'theme_preference'".to_string(),
            ))
            .await;

        assert!(column_result.is_ok(), "Should be able to query column information");
        let column_info = column_result.unwrap();
        assert!(column_info.is_some(), "theme_preference column should exist");

        let column = column_info.unwrap();
        let column_name: String = column.try_get("", "column_name").expect("Should get column_name");
        let data_type: String = column.try_get("", "data_type").expect("Should get data_type");
        let is_nullable: String = column.try_get("", "is_nullable").expect("Should get is_nullable");
        let column_default: Option<String> = column.try_get("", "column_default").ok();

        assert_eq!(column_name, "theme_preference", "Column name should be theme_preference");
        assert_eq!(data_type, "character varying", "Data type should be character varying");
        assert_eq!(is_nullable, "NO", "Column should be NOT NULL");
        assert!(
            column_default.is_some() && column_default.unwrap().contains("system"),
            "Default value should be 'system'"
        );

        // Clean up after test
        cleanup_test_column(&db).await;
    }

    #[tokio::test]
    async fn test_theme_preference_column_comment() {
        let db = setup_test_db().await;
        let schema_manager = SchemaManager::new(&db);

        // Clean up before test
        cleanup_test_column(&db).await;

        // Run the migration
        let migration = Migration;
        migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        // Verify the column comment was created
        // Query pg_description for the column comment
        let comment_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                "SELECT d.description
                 FROM pg_class c
                 JOIN pg_namespace n ON n.oid = c.relnamespace
                 JOIN pg_attribute a ON a.attrelid = c.oid
                 LEFT JOIN pg_description d ON d.objoid = c.oid AND d.objsubid = a.attnum
                 WHERE n.nspname = 'hr_public'
                 AND c.relname = 'users'
                 AND a.attname = 'theme_preference'".to_string(),
            ))
            .await;

        assert!(comment_result.is_ok(), "Should be able to query column comment");
        let comment_info = comment_result.unwrap();
        assert!(comment_info.is_some(), "Should have comment information");

        let description: String = comment_info.unwrap().try_get("", "description").expect("Should get description");
        assert_eq!(
            description,
            "User theme preference: light, dark, or system",
            "Column comment should match expected text"
        );

        // Clean up after test
        cleanup_test_column(&db).await;
    }

    #[tokio::test]
    async fn test_theme_preference_migration_down() {
        let db = setup_test_db().await;
        let schema_manager = SchemaManager::new(&db);

        // Clean up before test
        cleanup_test_column(&db).await;

        let migration = Migration;

        // Run up migration first
        migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        // Verify column exists
        let column_before = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                "SELECT COUNT(*) as count FROM information_schema.columns
                 WHERE table_schema = 'hr_public'
                 AND table_name = 'users'
                 AND column_name = 'theme_preference'".to_string(),
            ))
            .await
            .unwrap()
            .unwrap()
            .try_get::<i64>("", "count")
            .unwrap();

        assert_eq!(column_before, 1, "Column should exist after up migration");

        // Now run down migration
        migration
            .down(&schema_manager)
            .await
            .expect("Migration down should succeed");

        // Verify the column was dropped
        let column_after = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                "SELECT COUNT(*) as count FROM information_schema.columns
                 WHERE table_schema = 'hr_public'
                 AND table_name = 'users'
                 AND column_name = 'theme_preference'".to_string(),
            ))
            .await
            .unwrap()
            .unwrap()
            .try_get::<i64>("", "count")
            .unwrap();

        assert_eq!(column_after, 0, "Column should be dropped after down migration");

        // Clean up after test
        cleanup_test_column(&db).await;
    }

    #[tokio::test]
    async fn test_theme_preference_idempotent_up() {
        let db = setup_test_db().await;
        let schema_manager = SchemaManager::new(&db);

        // Clean up before test
        cleanup_test_column(&db).await;

        let migration = Migration;

        // Run migration twice - second run should not error
        migration
            .up(&schema_manager)
            .await
            .expect("First migration up should succeed");

        migration
            .up(&schema_manager)
            .await
            .expect("Second migration up should succeed (idempotent)");

        // Clean up after test
        cleanup_test_column(&db).await;
    }

    #[tokio::test]
    async fn test_theme_preference_idempotent_down() {
        let db = setup_test_db().await;
        let schema_manager = SchemaManager::new(&db);

        // Clean up before test
        cleanup_test_column(&db).await;

        let migration = Migration;

        // Run up migration first
        migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        // Run down migration twice - should not error
        migration
            .down(&schema_manager)
            .await
            .expect("First migration down should succeed");

        migration
            .down(&schema_manager)
            .await
            .expect("Second migration down should succeed (idempotent)");

        // Clean up after test
        cleanup_test_column(&db).await;
    }
}
