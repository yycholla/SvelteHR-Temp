//! Tests for m20251201_001_create_training_module migration
//!
//! This migration creates a complete training/LMS module with 4 tables.
//!
//! **Test Requirements:**
//! - Requires DATABASE_URL environment variable
//! - Requires users table to exist (from m20251017_003_auth)
//! - Tests must run serially: `cargo test --test test_m20251201_001_create_training_module --features test-utils -- --test-threads=1`
//!
//! **What We Test:**
//! - Table creation: trainings, training_contents, assignments, progress
//! - Foreign keys: 6 total with CASCADE delete
//! - Indexes: idx_assignments_user_id, idx_progress_user_content (unique composite)
//! - Idempotency: IF NOT EXISTS for all operations
//! - Cleanup: DROP TABLE in correct dependency order

#[cfg(test)]
mod tests {
    use hr_graphql_server::migration::m20251201_001_create_training_module::Migration;
    use sea_orm::{Database, DatabaseConnection, DbBackend, Statement};
    use sea_orm_migration::prelude::*;

    /// Set up test database connection
    async fn setup_test_db() -> DatabaseConnection {
        let db_url = std::env::var("DATABASE_URL")
            .unwrap_or_else(|_| "postgres://postgres:postgres@localhost:5432/hr_test".to_string());
        Database::connect(&db_url)
            .await
            .expect("Failed to connect to test database")
    }

    /// Clean up test data
    async fn cleanup_test_data(db: &DatabaseConnection) {
        // Drop tables if they exist (for testing) - correct dependency order
        let _ = db
            .execute(Statement::from_string(
                DbBackend::Postgres,
                "DROP TABLE IF EXISTS hr_public.progress CASCADE".to_string(),
            ))
            .await;

        let _ = db
            .execute(Statement::from_string(
                DbBackend::Postgres,
                "DROP TABLE IF EXISTS hr_public.assignments CASCADE".to_string(),
            ))
            .await;

        let _ = db
            .execute(Statement::from_string(
                DbBackend::Postgres,
                "DROP TABLE IF EXISTS hr_public.training_contents CASCADE".to_string(),
            ))
            .await;

        let _ = db
            .execute(Statement::from_string(
                DbBackend::Postgres,
                "DROP TABLE IF EXISTS hr_public.trainings CASCADE".to_string(),
            ))
            .await;
    }

    #[tokio::test]
    async fn test_create_training_module_migration_compiles() {
        // If this test runs, the migration compiles successfully
        assert!(true);
    }

    #[tokio::test]
    async fn test_create_training_module_migration_up() {
        let db = setup_test_db().await;
        cleanup_test_data(&db).await;

        // Run the migration
        let schema_manager = SchemaManager::new(&db);
        Migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");
    }

    #[tokio::test]
    async fn test_trainings_table_created() {
        let db = setup_test_db().await;
        cleanup_test_data(&db).await;

        // Run the migration
        let schema_manager = SchemaManager::new(&db);
        Migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        // Verify trainings table exists
        let result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                SELECT COUNT(*) as count
                FROM information_schema.tables
                WHERE table_schema = 'hr_public'
                  AND table_name = 'trainings'
                "#
                .to_string(),
            ))
            .await
            .expect("Query should succeed");

        assert!(result.is_some(), "Query should return result");
        let row = result.unwrap();
        let count: i64 = row.try_get("", "count").unwrap();
        assert_eq!(count, 1, "trainings table should exist");
    }

    #[tokio::test]
    async fn test_training_contents_table_created() {
        let db = setup_test_db().await;
        cleanup_test_data(&db).await;

        // Run the migration
        let schema_manager = SchemaManager::new(&db);
        Migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        // Verify training_contents table exists
        let result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                SELECT COUNT(*) as count
                FROM information_schema.tables
                WHERE table_schema = 'hr_public'
                  AND table_name = 'training_contents'
                "#
                .to_string(),
            ))
            .await
            .expect("Query should succeed");

        assert!(result.is_some(), "Query should return result");
        let row = result.unwrap();
        let count: i64 = row.try_get("", "count").unwrap();
        assert_eq!(count, 1, "training_contents table should exist");
    }

    #[tokio::test]
    async fn test_assignments_table_created() {
        let db = setup_test_db().await;
        cleanup_test_data(&db).await;

        // Run the migration
        let schema_manager = SchemaManager::new(&db);
        Migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        // Verify assignments table exists
        let result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                SELECT COUNT(*) as count
                FROM information_schema.tables
                WHERE table_schema = 'hr_public'
                  AND table_name = 'assignments'
                "#
                .to_string(),
            ))
            .await
            .expect("Query should succeed");

        assert!(result.is_some(), "Query should return result");
        let row = result.unwrap();
        let count: i64 = row.try_get("", "count").unwrap();
        assert_eq!(count, 1, "assignments table should exist");
    }

    #[tokio::test]
    async fn test_progress_table_created() {
        let db = setup_test_db().await;
        cleanup_test_data(&db).await;

        // Run the migration
        let schema_manager = SchemaManager::new(&db);
        Migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        // Verify progress table exists
        let result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                SELECT COUNT(*) as count
                FROM information_schema.tables
                WHERE table_schema = 'hr_public'
                  AND table_name = 'progress'
                "#
                .to_string(),
            ))
            .await
            .expect("Query should succeed");

        assert!(result.is_some(), "Query should return result");
        let row = result.unwrap();
        let count: i64 = row.try_get("", "count").unwrap();
        assert_eq!(count, 1, "progress table should exist");
    }

    #[tokio::test]
    async fn test_training_contents_foreign_key() {
        let db = setup_test_db().await;
        cleanup_test_data(&db).await;

        // Run the migration
        let schema_manager = SchemaManager::new(&db);
        Migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        // Verify foreign key fk_training_contents_training_id exists
        let result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                SELECT COUNT(*) as count
                FROM information_schema.table_constraints
                WHERE constraint_schema = 'hr_public'
                  AND table_name = 'training_contents'
                  AND constraint_name = 'fk_training_contents_training_id'
                  AND constraint_type = 'FOREIGN KEY'
                "#
                .to_string(),
            ))
            .await
            .expect("Query should succeed");

        assert!(result.is_some(), "Query should return result");
        let row = result.unwrap();
        let count: i64 = row.try_get("", "count").unwrap();
        assert_eq!(
            count, 1,
            "Foreign key fk_training_contents_training_id should exist"
        );
    }

    #[tokio::test]
    async fn test_assignments_foreign_keys() {
        let db = setup_test_db().await;
        cleanup_test_data(&db).await;

        // Run the migration
        let schema_manager = SchemaManager::new(&db);
        Migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        // Verify assignments has 2 foreign keys
        let result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                SELECT COUNT(*) as count
                FROM information_schema.table_constraints
                WHERE constraint_schema = 'hr_public'
                  AND table_name = 'assignments'
                  AND constraint_type = 'FOREIGN KEY'
                "#
                .to_string(),
            ))
            .await
            .expect("Query should succeed");

        assert!(result.is_some(), "Query should return result");
        let row = result.unwrap();
        let count: i64 = row.try_get("", "count").unwrap();
        assert_eq!(
            count, 2,
            "assignments table should have 2 foreign keys (user_id, training_id)"
        );
    }

    #[tokio::test]
    async fn test_progress_foreign_keys() {
        let db = setup_test_db().await;
        cleanup_test_data(&db).await;

        // Run the migration
        let schema_manager = SchemaManager::new(&db);
        Migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        // Verify progress has 2 foreign keys
        let result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                SELECT COUNT(*) as count
                FROM information_schema.table_constraints
                WHERE constraint_schema = 'hr_public'
                  AND table_name = 'progress'
                  AND constraint_type = 'FOREIGN KEY'
                "#
                .to_string(),
            ))
            .await
            .expect("Query should succeed");

        assert!(result.is_some(), "Query should return result");
        let row = result.unwrap();
        let count: i64 = row.try_get("", "count").unwrap();
        assert_eq!(
            count, 2,
            "progress table should have 2 foreign keys (user_id, training_content_id)"
        );
    }

    #[tokio::test]
    async fn test_assignments_user_id_index() {
        let db = setup_test_db().await;
        cleanup_test_data(&db).await;

        // Run the migration
        let schema_manager = SchemaManager::new(&db);
        Migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        // Verify idx_assignments_user_id index exists
        let result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                SELECT COUNT(*) as count
                FROM pg_indexes
                WHERE schemaname = 'hr_public'
                  AND tablename = 'assignments'
                  AND indexname = 'idx_assignments_user_id'
                "#
                .to_string(),
            ))
            .await
            .expect("Query should succeed");

        assert!(result.is_some(), "Query should return result");
        let row = result.unwrap();
        let count: i64 = row.try_get("", "count").unwrap();
        assert_eq!(count, 1, "idx_assignments_user_id index should exist");
    }

    #[tokio::test]
    async fn test_progress_unique_index() {
        let db = setup_test_db().await;
        cleanup_test_data(&db).await;

        // Run the migration
        let schema_manager = SchemaManager::new(&db);
        Migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        // Verify idx_progress_user_content unique index exists
        let result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                SELECT COUNT(*) as count
                FROM pg_indexes
                WHERE schemaname = 'hr_public'
                  AND tablename = 'progress'
                  AND indexname = 'idx_progress_user_content'
                "#
                .to_string(),
            ))
            .await
            .expect("Query should succeed");

        assert!(result.is_some(), "Query should return result");
        let row = result.unwrap();
        let count: i64 = row.try_get("", "count").unwrap();
        assert_eq!(
            count, 1,
            "idx_progress_user_content unique index should exist"
        );

        // Verify index is unique
        let unique_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                SELECT indisunique
                FROM pg_index
                JOIN pg_class ON pg_index.indexrelid = pg_class.oid
                WHERE pg_class.relname = 'idx_progress_user_content'
                "#
                .to_string(),
            ))
            .await
            .expect("Query should succeed");

        assert!(unique_result.is_some(), "Query should return result");
        let row = unique_result.unwrap();
        let is_unique: bool = row.try_get("", "indisunique").unwrap();
        assert!(
            is_unique,
            "idx_progress_user_content should be a unique index"
        );
    }

    #[tokio::test]
    async fn test_cascade_delete_rules() {
        let db = setup_test_db().await;
        cleanup_test_data(&db).await;

        // Run the migration
        let schema_manager = SchemaManager::new(&db);
        Migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        // Verify all foreign keys have CASCADE delete rule
        let result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                SELECT COUNT(*) as count
                FROM information_schema.referential_constraints
                WHERE constraint_schema = 'hr_public'
                  AND constraint_name LIKE 'fk_%'
                  AND delete_rule = 'CASCADE'
                "#
                .to_string(),
            ))
            .await
            .expect("Query should succeed");

        assert!(result.is_some(), "Query should return result");
        let row = result.unwrap();
        let count: i64 = row.try_get("", "count").unwrap();
        assert!(
            count >= 5,
            "All foreign keys should have CASCADE delete rule (at least 5 from this migration)"
        );
    }

    #[tokio::test]
    async fn test_idempotent_up() {
        let db = setup_test_db().await;
        cleanup_test_data(&db).await;

        let schema_manager = SchemaManager::new(&db);

        // Run migration first time
        Migration
            .up(&schema_manager)
            .await
            .expect("First migration up should succeed");

        // Run migration second time - should succeed due to IF NOT EXISTS
        let result = Migration.up(&schema_manager).await;

        assert!(
            result.is_ok(),
            "Second migration up should succeed (idempotent with IF NOT EXISTS)"
        );

        // Verify tables still exist (not duplicated)
        let tables_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                SELECT COUNT(*) as count
                FROM information_schema.tables
                WHERE table_schema = 'hr_public'
                  AND table_name IN ('trainings', 'training_contents', 'assignments', 'progress')
                "#
                .to_string(),
            ))
            .await
            .expect("Query should succeed");

        assert!(tables_result.is_some(), "Query should return result");
        let row = tables_result.unwrap();
        let count: i64 = row.try_get("", "count").unwrap();
        assert_eq!(count, 4, "Should have exactly 4 tables (no duplicates)");
    }

    #[tokio::test]
    async fn test_create_training_module_migration_down() {
        let db = setup_test_db().await;
        cleanup_test_data(&db).await;

        let schema_manager = SchemaManager::new(&db);

        // Run up migration first
        Migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        // Verify tables exist
        let before_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                SELECT COUNT(*) as count
                FROM information_schema.tables
                WHERE table_schema = 'hr_public'
                  AND table_name IN ('trainings', 'training_contents', 'assignments', 'progress')
                "#
                .to_string(),
            ))
            .await
            .expect("Query should succeed");

        assert!(before_result.is_some(), "Query should return result");
        let row = before_result.unwrap();
        let before_count: i64 = row.try_get("", "count").unwrap();
        assert_eq!(
            before_count, 4,
            "All 4 tables should exist before down migration"
        );

        // Run down migration
        Migration
            .down(&schema_manager)
            .await
            .expect("Migration down should succeed");

        // Verify tables are dropped
        let after_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                SELECT COUNT(*) as count
                FROM information_schema.tables
                WHERE table_schema = 'hr_public'
                  AND table_name IN ('trainings', 'training_contents', 'assignments', 'progress')
                "#
                .to_string(),
            ))
            .await
            .expect("Query should succeed");

        assert!(after_result.is_some(), "Query should return result");
        let row = after_result.unwrap();
        let after_count: i64 = row.try_get("", "count").unwrap();
        assert_eq!(
            after_count, 0,
            "All 4 tables should be dropped after down migration"
        );
    }

    #[tokio::test]
    async fn test_idempotent_down() {
        let db = setup_test_db().await;
        cleanup_test_data(&db).await;

        let schema_manager = SchemaManager::new(&db);

        // Run up and down migration
        Migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");
        Migration
            .down(&schema_manager)
            .await
            .expect("First migration down should succeed");

        // Run down again - should succeed (tables already dropped)
        let result = Migration.down(&schema_manager).await;

        assert!(
            result.is_ok(),
            "Second migration down should succeed (idempotent - tables already dropped)"
        );
    }
}
