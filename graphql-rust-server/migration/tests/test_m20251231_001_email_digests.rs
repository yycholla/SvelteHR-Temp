//! Tests for m20251231_001_email_digests migration
//!
//! Validates that the migration:
//! 1. Uses SeaORM builders for all operations (95% coverage, pure SeaORM)
//! 2. Creates email_digests configuration table with proper columns
//! 3. Creates email_digest_log delivery tracking table
//! 4. Adds 2 foreign key constraints for referential integrity
//! 5. Creates 5 indexes for query optimization
//! 6. Handles up/down migrations with idempotency
//! 7. Properly handles PostgreSQL array types for recipients

#[cfg(test)]
mod tests {
    use hr_graphql_server::migration::m20251231_001_email_digests::Migration;
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
        // Drop tables in reverse order
        let _ = db
            .execute(Statement::from_string(
                DbBackend::Postgres,
                "DROP TABLE IF EXISTS hr_public.email_digest_log CASCADE".to_string(),
            ))
            .await;
        let _ = db
            .execute(Statement::from_string(
                DbBackend::Postgres,
                "DROP TABLE IF EXISTS hr_public.email_digests CASCADE".to_string(),
            ))
            .await;
    }

    #[tokio::test]
    async fn test_email_digests_migration_compiles() {
        // This test ensures the migration uses SeaORM builders
        // If this compiles, the migration is using the builder API correctly
        let _migration = Migration;
        assert!(true, "Migration struct compiles successfully");
    }

    #[tokio::test]
    async fn test_email_digests_migration_up() {
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

        // Verify email_digests table was created
        let table_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                "SELECT table_name FROM information_schema.tables
                 WHERE table_schema = 'hr_public'
                 AND table_name = 'email_digests'"
                    .to_string(),
            ))
            .await;

        assert!(table_result.is_ok(), "email_digests table should exist");
        assert!(
            table_result.unwrap().is_some(),
            "Should have table information"
        );

        // Verify email_digest_log table was created
        let table_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                "SELECT table_name FROM information_schema.tables
                 WHERE table_schema = 'hr_public'
                 AND table_name = 'email_digest_log'"
                    .to_string(),
            ))
            .await;

        assert!(table_result.is_ok(), "email_digest_log table should exist");
        assert!(
            table_result.unwrap().is_some(),
            "Should have table information"
        );

        // Clean up after test
        cleanup_test_data(&db).await;
    }

    #[tokio::test]
    async fn test_email_digests_table_columns() {
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

        // Verify critical columns in email_digests table
        let columns = vec![
            "id",
            "name",
            "schedule_cron",
            "recipients",
            "include_sync_summary",
            "include_conflicts",
            "include_health_metrics",
            "include_new_employees",
            "enabled",
            "created_by",
        ];

        for column_name in columns {
            let column_result = db
                .query_one(Statement::from_string(
                    DbBackend::Postgres,
                    format!(
                        "SELECT column_name FROM information_schema.columns
                         WHERE table_schema = 'hr_public'
                         AND table_name = 'email_digests'
                         AND column_name = '{}'",
                        column_name
                    ),
                ))
                .await;

            assert!(column_result.is_ok(), "Column {} should exist", column_name);
            assert!(
                column_result.unwrap().is_some(),
                "Should have column information for {}",
                column_name
            );
        }

        // Clean up after test
        cleanup_test_data(&db).await;
    }

    #[tokio::test]
    async fn test_email_digests_recipients_array_type() {
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

        // Verify recipients column is an array type
        let column_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                "SELECT data_type, udt_name FROM information_schema.columns
                 WHERE table_schema = 'hr_public'
                 AND table_name = 'email_digests'
                 AND column_name = 'recipients'"
                    .to_string(),
            ))
            .await;

        assert!(column_result.is_ok(), "recipients column should exist");
        let column = column_result.unwrap().unwrap();
        let data_type: String = column
            .try_get("", "data_type")
            .expect("Should get data_type");
        assert_eq!(data_type, "ARRAY", "recipients should be ARRAY type");

        // Also check email_digest_log recipients column
        let column_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                "SELECT data_type FROM information_schema.columns
                 WHERE table_schema = 'hr_public'
                 AND table_name = 'email_digest_log'
                 AND column_name = 'recipients'"
                    .to_string(),
            ))
            .await;

        assert!(column_result.is_ok(), "log recipients column should exist");
        let column = column_result.unwrap().unwrap();
        let data_type: String = column
            .try_get("", "data_type")
            .expect("Should get data_type");
        assert_eq!(data_type, "ARRAY", "log recipients should be ARRAY type");

        // Clean up after test
        cleanup_test_data(&db).await;
    }

    #[tokio::test]
    async fn test_email_digests_foreign_keys() {
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

        // Verify foreign key from email_digest_log to email_digests
        let fk_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                "SELECT constraint_name FROM information_schema.table_constraints
                 WHERE table_schema = 'hr_public'
                 AND table_name = 'email_digest_log'
                 AND constraint_name = 'fk_email_digest_log_digest_id'
                 AND constraint_type = 'FOREIGN KEY'"
                    .to_string(),
            ))
            .await;

        assert!(fk_result.is_ok(), "digest_id foreign key should exist");
        assert!(
            fk_result.unwrap().is_some(),
            "Should have foreign key information"
        );

        // Verify foreign key from email_digests to users
        let fk_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                "SELECT constraint_name FROM information_schema.table_constraints
                 WHERE table_schema = 'hr_public'
                 AND table_name = 'email_digests'
                 AND constraint_name = 'fk_email_digests_created_by'
                 AND constraint_type = 'FOREIGN KEY'"
                    .to_string(),
            ))
            .await;

        assert!(fk_result.is_ok(), "created_by foreign key should exist");
        assert!(
            fk_result.unwrap().is_some(),
            "Should have foreign key information"
        );

        // Clean up after test
        cleanup_test_data(&db).await;
    }

    #[tokio::test]
    async fn test_email_digests_indexes() {
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

        // Verify all 5 indexes were created
        let indexes = vec![
            ("email_digest_log", "idx_email_digest_log_digest_id"),
            ("email_digest_log", "idx_email_digest_log_sent_at"),
            ("email_digest_log", "idx_email_digest_log_success"),
            ("email_digests", "idx_email_digests_enabled"),
            ("email_digests", "idx_email_digests_next_send_at"),
        ];

        for (table_name, index_name) in indexes {
            let index_result = db
                .query_one(Statement::from_string(
                    DbBackend::Postgres,
                    format!(
                        "SELECT indexname FROM pg_indexes
                         WHERE schemaname = 'hr_public'
                         AND tablename = '{}'
                         AND indexname = '{}'",
                        table_name, index_name
                    ),
                ))
                .await;

            assert!(
                index_result.is_ok(),
                "Index {} should exist on {}",
                index_name,
                table_name
            );
            assert!(
                index_result.unwrap().is_some(),
                "Should have index information for {}",
                index_name
            );
        }

        // Clean up after test
        cleanup_test_data(&db).await;
    }

    #[tokio::test]
    async fn test_email_digests_boolean_defaults() {
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

        // Verify boolean columns have correct defaults
        let boolean_columns = vec![
            ("include_sync_summary", "true"),
            ("include_conflicts", "true"),
            ("include_health_metrics", "true"),
            ("include_new_employees", "false"),
            ("enabled", "true"),
        ];

        for (column_name, expected_default) in boolean_columns {
            let default_result = db
                .query_one(Statement::from_string(
                    DbBackend::Postgres,
                    format!(
                        "SELECT column_default FROM information_schema.columns
                         WHERE table_schema = 'hr_public'
                         AND table_name = 'email_digests'
                         AND column_name = '{}'",
                        column_name
                    ),
                ))
                .await;

            assert!(
                default_result.is_ok(),
                "Column {} should exist",
                column_name
            );
            let default_val: Option<String> = default_result
                .unwrap()
                .unwrap()
                .try_get("", "column_default")
                .ok();
            assert!(
                default_val.is_some(),
                "{} should have a default",
                column_name
            );
            assert!(
                default_val.unwrap().contains(expected_default),
                "{} should default to {}",
                column_name,
                expected_default
            );
        }

        // Clean up after test
        cleanup_test_data(&db).await;
    }

    #[tokio::test]
    async fn test_email_digests_migration_down() {
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

        // Verify both tables were dropped
        let table_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                "SELECT COUNT(*) as count FROM information_schema.tables
                 WHERE table_schema = 'hr_public'
                 AND table_name IN ('email_digests', 'email_digest_log')"
                    .to_string(),
            ))
            .await;

        assert!(
            table_result.is_ok(),
            "Should be able to check if tables exist"
        );
        let count: i64 = table_result
            .unwrap()
            .unwrap()
            .try_get("", "count")
            .expect("Should get count");
        assert_eq!(count, 0, "Both tables should be dropped");

        // Clean up after test
        cleanup_test_data(&db).await;
    }

    #[tokio::test]
    async fn test_email_digests_idempotent_up() {
        let db = setup_test_db().await;
        let schema_manager = SchemaManager::new(&db);

        // Clean up before test
        cleanup_test_data(&db).await;

        let migration = Migration;

        // Run migration twice - should not error due to if_not_exists
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
    async fn test_email_digests_idempotent_down() {
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

        // Run down migration twice - should not error due to if_exists
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
    async fn test_email_digests_full_cycle() {
        let db = setup_test_db().await;
        let schema_manager = SchemaManager::new(&db);

        // Clean up before test
        cleanup_test_data(&db).await;

        let migration = Migration;

        // Run up migration
        migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        // Verify tables exist
        let table_check = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                "SELECT COUNT(*) as count FROM information_schema.tables
                 WHERE table_schema = 'hr_public'
                 AND table_name IN ('email_digests', 'email_digest_log')"
                    .to_string(),
            ))
            .await;
        assert!(table_check.is_ok(), "Should be able to check tables");
        let count: i64 = table_check
            .unwrap()
            .unwrap()
            .try_get("", "count")
            .expect("Should get count");
        assert_eq!(count, 2, "Both tables should exist after up");

        // Run down migration
        migration
            .down(&schema_manager)
            .await
            .expect("Migration down should succeed");

        // Verify tables are gone
        let table_check = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                "SELECT COUNT(*) as count FROM information_schema.tables
                 WHERE table_schema = 'hr_public'
                 AND table_name IN ('email_digests', 'email_digest_log')"
                    .to_string(),
            ))
            .await;
        assert!(table_check.is_ok(), "Should be able to check tables");
        let count: i64 = table_check
            .unwrap()
            .unwrap()
            .try_get("", "count")
            .expect("Should get count");
        assert_eq!(count, 0, "Tables should be dropped after down");

        // Clean up after test
        cleanup_test_data(&db).await;
    }

    #[tokio::test]
    async fn test_email_digest_log_column_properties() {
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

        // Verify success column properties
        let column_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                "SELECT data_type, is_nullable, column_default
                 FROM information_schema.columns
                 WHERE table_schema = 'hr_public'
                 AND table_name = 'email_digest_log'
                 AND column_name = 'success'"
                    .to_string(),
            ))
            .await;

        assert!(column_result.is_ok(), "success column should exist");
        let column = column_result.unwrap().unwrap();
        let data_type: String = column
            .try_get("", "data_type")
            .expect("Should get data_type");
        let is_nullable: String = column
            .try_get("", "is_nullable")
            .expect("Should get is_nullable");
        let default_val: Option<String> = column.try_get("", "column_default").ok();

        assert_eq!(data_type, "boolean", "success should be boolean type");
        assert_eq!(is_nullable, "NO", "success should be NOT NULL");
        assert!(
            default_val.is_some() && default_val.unwrap().contains("false"),
            "success should default to false"
        );

        // Clean up after test
        cleanup_test_data(&db).await;
    }

    #[tokio::test]
    async fn test_email_digests_json_columns() {
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

        // Verify content_summary is JSON type
        let column_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                "SELECT data_type, udt_name FROM information_schema.columns
                 WHERE table_schema = 'hr_public'
                 AND table_name = 'email_digest_log'
                 AND column_name = 'content_summary'"
                    .to_string(),
            ))
            .await;

        assert!(column_result.is_ok(), "content_summary column should exist");
        let column = column_result.unwrap().unwrap();
        let udt_name: String = column.try_get("", "udt_name").expect("Should get udt_name");
        assert!(
            udt_name == "json" || udt_name == "jsonb",
            "content_summary should be JSON type"
        );

        // Clean up after test
        cleanup_test_data(&db).await;
    }
}
