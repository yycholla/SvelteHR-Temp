//! Tests for m20251125_001_employee_import_improvements migration
//!
//! This migration adds employee import system with job and row tracking.
//!
//! **Test Requirements:**
//! - Requires DATABASE_URL environment variable
//! - Requires users table to exist (from m20251017_003_auth)
//! - Tests must run serially: `cargo test --test test_m20251125_001_employee_import_improvements --features test-utils -- --test-threads=1`
//!
//! **What We Test:**
//! - Column addition: birth_date on users table
//! - Table creation: employee_import_jobs with 11 columns
//! - Table creation: employee_import_rows with 8 columns + foreign key
//! - JSONB columns: mapping_config, raw_data, parsed_data, validation_errors
//! - Foreign key: employee_import_rows.job_id -> employee_import_jobs.id (CASCADE)
//! - Idempotency: IF NOT EXISTS for column and tables
//! - Cleanup: DROP TABLE in correct dependency order

#[cfg(test)]
mod tests {
    use hr_graphql_server::migration::m20251125_001_employee_import_improvements::Migration;
    use sea_orm::{Database, DatabaseConnection, DbBackend, Statement};
    use sea_orm_migration::prelude::*;

    /// Set up test database connection
    async fn setup_test_db() -> DatabaseConnection {
        let db_url = std::env::var("DATABASE_URL").unwrap_or_else(|_| {
            "postgres://postgres:postgres@localhost:5432/hr_test".to_string()
        });
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
                "DROP TABLE IF EXISTS hr_public.employee_import_rows CASCADE".to_string(),
            ))
            .await;

        let _ = db
            .execute(Statement::from_string(
                DbBackend::Postgres,
                "DROP TABLE IF EXISTS hr_public.employee_import_jobs CASCADE".to_string(),
            ))
            .await;

        // Drop birth_date column if it exists
        let _ = db
            .execute(Statement::from_string(
                DbBackend::Postgres,
                "ALTER TABLE hr_public.users DROP COLUMN IF EXISTS birth_date CASCADE".to_string(),
            ))
            .await;
    }

    #[tokio::test]
    async fn test_employee_import_improvements_migration_compiles() {
        // If this test runs, the migration compiles successfully
        assert!(true);
    }

    #[tokio::test]
    async fn test_employee_import_improvements_migration_up() {
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
    async fn test_birth_date_column_added() {
        let db = setup_test_db().await;
        cleanup_test_data(&db).await;

        // Run the migration
        let schema_manager = SchemaManager::new(&db);
        Migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        // Verify birth_date column exists on users table
        let result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                SELECT COUNT(*) as count
                FROM information_schema.columns
                WHERE table_schema = 'hr_public'
                  AND table_name = 'users'
                  AND column_name = 'birth_date'
                "#
                .to_string(),
            ))
            .await
            .expect("Query should succeed");

        assert!(result.is_some(), "Query should return result");
        let row = result.unwrap();
        let count: i64 = row.try_get("", "count").unwrap();
        assert_eq!(count, 1, "birth_date column should exist on users table");
    }

    #[tokio::test]
    async fn test_employee_import_jobs_table_created() {
        let db = setup_test_db().await;
        cleanup_test_data(&db).await;

        // Run the migration
        let schema_manager = SchemaManager::new(&db);
        Migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        // Verify employee_import_jobs table exists
        let result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                SELECT COUNT(*) as count
                FROM information_schema.tables
                WHERE table_schema = 'hr_public'
                  AND table_name = 'employee_import_jobs'
                "#
                .to_string(),
            ))
            .await
            .expect("Query should succeed");

        assert!(result.is_some(), "Query should return result");
        let row = result.unwrap();
        let count: i64 = row.try_get("", "count").unwrap();
        assert_eq!(count, 1, "employee_import_jobs table should exist");
    }

    #[tokio::test]
    async fn test_employee_import_rows_table_created() {
        let db = setup_test_db().await;
        cleanup_test_data(&db).await;

        // Run the migration
        let schema_manager = SchemaManager::new(&db);
        Migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        // Verify employee_import_rows table exists
        let result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                SELECT COUNT(*) as count
                FROM information_schema.tables
                WHERE table_schema = 'hr_public'
                  AND table_name = 'employee_import_rows'
                "#
                .to_string(),
            ))
            .await
            .expect("Query should succeed");

        assert!(result.is_some(), "Query should return result");
        let row = result.unwrap();
        let count: i64 = row.try_get("", "count").unwrap();
        assert_eq!(count, 1, "employee_import_rows table should exist");
    }

    #[tokio::test]
    async fn test_employee_import_jobs_columns() {
        let db = setup_test_db().await;
        cleanup_test_data(&db).await;

        // Run the migration
        let schema_manager = SchemaManager::new(&db);
        Migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        // Verify all 11 columns exist
        let expected_columns = vec![
            "id",
            "status",
            "total_rows",
            "valid_rows",
            "error_rows",
            "mapping_config",
            "matching_strategy",
            "created_at",
            "updated_at",
            "completed_at",
            "created_by",
        ];

        for column in expected_columns {
            let result = db
                .query_one(Statement::from_string(
                    DbBackend::Postgres,
                    format!(
                        "SELECT COUNT(*) as count
                         FROM information_schema.columns
                         WHERE table_schema = 'hr_public'
                           AND table_name = 'employee_import_jobs'
                           AND column_name = '{}'",
                        column
                    ),
                ))
                .await
                .expect("Query should succeed");

            assert!(result.is_some(), "Query should return result");
            let row = result.unwrap();
            let count: i64 = row.try_get("", "count").unwrap();
            assert_eq!(count, 1, "Column '{}' should exist", column);
        }
    }

    #[tokio::test]
    async fn test_employee_import_rows_columns() {
        let db = setup_test_db().await;
        cleanup_test_data(&db).await;

        // Run the migration
        let schema_manager = SchemaManager::new(&db);
        Migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        // Verify all 8 columns exist
        let expected_columns = vec![
            "id",
            "job_id",
            "raw_data",
            "parsed_data",
            "status",
            "validation_errors",
            "matched_user_id",
            "row_number",
        ];

        for column in expected_columns {
            let result = db
                .query_one(Statement::from_string(
                    DbBackend::Postgres,
                    format!(
                        "SELECT COUNT(*) as count
                         FROM information_schema.columns
                         WHERE table_schema = 'hr_public'
                           AND table_name = 'employee_import_rows'
                           AND column_name = '{}'",
                        column
                    ),
                ))
                .await
                .expect("Query should succeed");

            assert!(result.is_some(), "Query should return result");
            let row = result.unwrap();
            let count: i64 = row.try_get("", "count").unwrap();
            assert_eq!(count, 1, "Column '{}' should exist", column);
        }
    }

    #[tokio::test]
    async fn test_mapping_config_is_jsonb() {
        let db = setup_test_db().await;
        cleanup_test_data(&db).await;

        // Run the migration
        let schema_manager = SchemaManager::new(&db);
        Migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        // Verify mapping_config column is JSONB type
        let result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                SELECT udt_name
                FROM information_schema.columns
                WHERE table_schema = 'hr_public'
                  AND table_name = 'employee_import_jobs'
                  AND column_name = 'mapping_config'
                "#
                .to_string(),
            ))
            .await
            .expect("Query should succeed");

        assert!(result.is_some(), "Query should return result");
        let row = result.unwrap();
        let udt_name: String = row.try_get("", "udt_name").unwrap();
        assert_eq!(
            udt_name, "jsonb",
            "mapping_config should be JSONB type"
        );
    }

    #[tokio::test]
    async fn test_raw_data_is_jsonb() {
        let db = setup_test_db().await;
        cleanup_test_data(&db).await;

        // Run the migration
        let schema_manager = SchemaManager::new(&db);
        Migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        // Verify raw_data column is JSONB type
        let result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                SELECT udt_name
                FROM information_schema.columns
                WHERE table_schema = 'hr_public'
                  AND table_name = 'employee_import_rows'
                  AND column_name = 'raw_data'
                "#
                .to_string(),
            ))
            .await
            .expect("Query should succeed");

        assert!(result.is_some(), "Query should return result");
        let row = result.unwrap();
        let udt_name: String = row.try_get("", "udt_name").unwrap();
        assert_eq!(udt_name, "jsonb", "raw_data should be JSONB type");
    }

    #[tokio::test]
    async fn test_foreign_key_exists() {
        let db = setup_test_db().await;
        cleanup_test_data(&db).await;

        // Run the migration
        let schema_manager = SchemaManager::new(&db);
        Migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        // Verify foreign key constraint exists
        let result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                SELECT COUNT(*) as count
                FROM information_schema.table_constraints
                WHERE constraint_schema = 'hr_public'
                  AND table_name = 'employee_import_rows'
                  AND constraint_name = 'fk_import_rows_job_id'
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
            "Foreign key fk_import_rows_job_id should exist"
        );
    }

    #[tokio::test]
    async fn test_foreign_key_cascade_delete() {
        let db = setup_test_db().await;
        cleanup_test_data(&db).await;

        // Run the migration
        let schema_manager = SchemaManager::new(&db);
        Migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        // Verify foreign key has CASCADE delete rule
        let result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                SELECT rc.delete_rule
                FROM information_schema.referential_constraints rc
                WHERE rc.constraint_schema = 'hr_public'
                  AND rc.constraint_name = 'fk_import_rows_job_id'
                "#
                .to_string(),
            ))
            .await
            .expect("Query should succeed");

        assert!(result.is_some(), "Query should return result");
        let row = result.unwrap();
        let delete_rule: String = row.try_get("", "delete_rule").unwrap();
        assert_eq!(
            delete_rule, "CASCADE",
            "Foreign key should have CASCADE delete rule"
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
        let jobs_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                SELECT COUNT(*) as count
                FROM information_schema.tables
                WHERE table_schema = 'hr_public'
                  AND table_name = 'employee_import_jobs'
                "#
                .to_string(),
            ))
            .await
            .expect("Query should succeed");

        assert!(jobs_result.is_some(), "Query should return result");
        let row = jobs_result.unwrap();
        let count: i64 = row.try_get("", "count").unwrap();
        assert_eq!(count, 1, "Should have exactly 1 jobs table (no duplicates)");

        let rows_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                SELECT COUNT(*) as count
                FROM information_schema.tables
                WHERE table_schema = 'hr_public'
                  AND table_name = 'employee_import_rows'
                "#
                .to_string(),
            ))
            .await
            .expect("Query should succeed");

        assert!(rows_result.is_some(), "Query should return result");
        let row = rows_result.unwrap();
        let count: i64 = row.try_get("", "count").unwrap();
        assert_eq!(count, 1, "Should have exactly 1 rows table (no duplicates)");
    }

    #[tokio::test]
    async fn test_employee_import_improvements_migration_down() {
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
                  AND table_name IN ('employee_import_jobs', 'employee_import_rows')
                "#
                .to_string(),
            ))
            .await
            .expect("Query should succeed");

        assert!(before_result.is_some(), "Query should return result");
        let row = before_result.unwrap();
        let before_count: i64 = row.try_get("", "count").unwrap();
        assert_eq!(before_count, 2, "Both tables should exist before down migration");

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
                  AND table_name IN ('employee_import_jobs', 'employee_import_rows')
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
            "Both tables should be dropped after down migration"
        );

        // Verify birth_date column is dropped
        let column_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                SELECT COUNT(*) as count
                FROM information_schema.columns
                WHERE table_schema = 'hr_public'
                  AND table_name = 'users'
                  AND column_name = 'birth_date'
                "#
                .to_string(),
            ))
            .await
            .expect("Query should succeed");

        assert!(column_result.is_some(), "Query should return result");
        let row = column_result.unwrap();
        let column_count: i64 = row.try_get("", "count").unwrap();
        assert_eq!(
            column_count, 0,
            "birth_date column should be dropped after down migration"
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
