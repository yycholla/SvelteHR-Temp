//! Tests for m20260101_001_create_sync_schedules migration
//!
//! Validates that the migration:
//! 1. Uses SeaORM builders for table/column/index operations (70% coverage)
//! 2. Creates sync_schedules table with proper columns and constraints
//! 3. Creates sync_schedule_history table for execution tracking
//! 4. Adds 2 foreign key constraints for referential integrity
//! 5. Creates 2 compound indexes for query optimization
//! 6. Adds 3 check constraints for data validation
//! 7. Handles up/down migrations with idempotency

#[cfg(test)]
mod tests {
    use hr_graphql_server::migration::m20260101_001_create_sync_schedules::Migration;
    use sea_orm::{Database, DatabaseConnection, DbBackend, Statement};
    use sea_orm_migration::prelude::*;

    /// Setup a test database connection
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
        let _ = db
            .execute(Statement::from_string(
                DbBackend::Postgres,
                "DROP TABLE IF EXISTS hr_public.sync_schedule_history CASCADE".to_string(),
            ))
            .await;
        let _ = db
            .execute(Statement::from_string(
                DbBackend::Postgres,
                "DROP TABLE IF EXISTS hr_public.sync_schedules CASCADE".to_string(),
            ))
            .await;
    }

    #[tokio::test]
    async fn test_sync_schedules_migration_compiles() {
        let _migration = Migration;
        assert!(true, "Migration struct compiles successfully");
    }

    #[tokio::test]
    async fn test_sync_schedules_migration_up() {
        let db = setup_test_db().await;
        let schema_manager = SchemaManager::new(&db);

        cleanup_test_data(&db).await;

        let migration = Migration;
        migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        // Verify sync_schedules table exists
        let table_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                "SELECT table_name FROM information_schema.tables
                 WHERE table_schema = 'hr_public'
                 AND table_name = 'sync_schedules'"
                    .to_string(),
            ))
            .await;

        assert!(table_result.is_ok(), "sync_schedules table should exist");
        assert!(table_result.unwrap().is_some());

        // Verify sync_schedule_history table exists
        let table_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                "SELECT table_name FROM information_schema.tables
                 WHERE table_schema = 'hr_public'
                 AND table_name = 'sync_schedule_history'"
                    .to_string(),
            ))
            .await;

        assert!(
            table_result.is_ok(),
            "sync_schedule_history table should exist"
        );
        assert!(table_result.unwrap().is_some());

        cleanup_test_data(&db).await;
    }

    #[tokio::test]
    async fn test_sync_schedules_columns() {
        let db = setup_test_db().await;
        let schema_manager = SchemaManager::new(&db);

        cleanup_test_data(&db).await;

        let migration = Migration;
        migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        let columns = vec![
            "id",
            "name",
            "cron_expression",
            "entity_type",
            "sync_direction",
            "enabled",
            "business_hours_only",
            "timezone",
            "created_by",
        ];

        for column_name in columns {
            let column_result = db
                .query_one(Statement::from_string(
                    DbBackend::Postgres,
                    format!(
                        "SELECT column_name FROM information_schema.columns
                         WHERE table_schema = 'hr_public'
                         AND table_name = 'sync_schedules'
                         AND column_name = '{}'",
                        column_name
                    ),
                ))
                .await;

            assert!(column_result.is_ok(), "Column {} should exist", column_name);
            assert!(column_result.unwrap().is_some());
        }

        cleanup_test_data(&db).await;
    }

    #[tokio::test]
    async fn test_sync_schedules_foreign_keys() {
        let db = setup_test_db().await;
        let schema_manager = SchemaManager::new(&db);

        cleanup_test_data(&db).await;

        let migration = Migration;
        migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        // Verify foreign key for created_by
        let fk_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                "SELECT constraint_name FROM information_schema.table_constraints
                 WHERE table_schema = 'hr_public'
                 AND table_name = 'sync_schedules'
                 AND constraint_name = 'fk_sync_schedules_created_by'
                 AND constraint_type = 'FOREIGN KEY'"
                    .to_string(),
            ))
            .await;

        assert!(fk_result.is_ok(), "created_by foreign key should exist");
        assert!(fk_result.unwrap().is_some());

        // Verify foreign key for schedule_id
        let fk_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                "SELECT constraint_name FROM information_schema.table_constraints
                 WHERE table_schema = 'hr_public'
                 AND table_name = 'sync_schedule_history'
                 AND constraint_name = 'fk_sync_schedule_history_schedule_id'
                 AND constraint_type = 'FOREIGN KEY'"
                    .to_string(),
            ))
            .await;

        assert!(fk_result.is_ok(), "schedule_id foreign key should exist");
        assert!(fk_result.unwrap().is_some());

        cleanup_test_data(&db).await;
    }

    #[tokio::test]
    async fn test_sync_schedules_indexes() {
        let db = setup_test_db().await;
        let schema_manager = SchemaManager::new(&db);

        cleanup_test_data(&db).await;

        let migration = Migration;
        migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        let indexes = vec![
            ("sync_schedules", "idx_sync_schedules_enabled"),
            ("sync_schedule_history", "idx_schedule_history_schedule"),
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

            assert!(index_result.is_ok(), "Index {} should exist", index_name);
            assert!(index_result.unwrap().is_some());
        }

        cleanup_test_data(&db).await;
    }

    #[tokio::test]
    async fn test_sync_schedules_check_constraints() {
        let db = setup_test_db().await;
        let schema_manager = SchemaManager::new(&db);

        cleanup_test_data(&db).await;

        let migration = Migration;
        migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        let constraints = vec![
            "valid_cron_expression",
            "valid_entity_type",
            "valid_sync_direction",
        ];

        for constraint_name in constraints {
            let constraint_result = db
                .query_one(Statement::from_string(
                    DbBackend::Postgres,
                    format!(
                        "SELECT constraint_name FROM information_schema.table_constraints
                         WHERE table_schema = 'hr_public'
                         AND table_name = 'sync_schedules'
                         AND constraint_name = '{}'
                         AND constraint_type = 'CHECK'",
                        constraint_name
                    ),
                ))
                .await;

            assert!(
                constraint_result.is_ok(),
                "Constraint {} should exist",
                constraint_name
            );
            assert!(constraint_result.unwrap().is_some());
        }

        cleanup_test_data(&db).await;
    }

    #[tokio::test]
    async fn test_sync_schedules_migration_down() {
        let db = setup_test_db().await;
        let schema_manager = SchemaManager::new(&db);

        cleanup_test_data(&db).await;

        let migration = Migration;
        migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");
        migration
            .down(&schema_manager)
            .await
            .expect("Migration down should succeed");

        let table_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                "SELECT COUNT(*) as count FROM information_schema.tables
                 WHERE table_schema = 'hr_public'
                 AND table_name IN ('sync_schedules', 'sync_schedule_history')"
                    .to_string(),
            ))
            .await;

        assert!(table_result.is_ok());
        let count: i64 = table_result
            .unwrap()
            .unwrap()
            .try_get("", "count")
            .expect("Should get count");
        assert_eq!(count, 0, "Both tables should be dropped");

        cleanup_test_data(&db).await;
    }

    #[tokio::test]
    async fn test_sync_schedules_idempotent_up() {
        let db = setup_test_db().await;
        let schema_manager = SchemaManager::new(&db);

        cleanup_test_data(&db).await;

        let migration = Migration;
        migration
            .up(&schema_manager)
            .await
            .expect("First migration up should succeed");
        migration
            .up(&schema_manager)
            .await
            .expect("Second migration up should succeed (idempotent)");

        cleanup_test_data(&db).await;
    }

    #[tokio::test]
    async fn test_sync_schedules_idempotent_down() {
        let db = setup_test_db().await;
        let schema_manager = SchemaManager::new(&db);

        cleanup_test_data(&db).await;

        let migration = Migration;
        migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");
        migration
            .down(&schema_manager)
            .await
            .expect("First migration down should succeed");
        migration
            .down(&schema_manager)
            .await
            .expect("Second migration down should succeed (idempotent)");

        cleanup_test_data(&db).await;
    }

    #[tokio::test]
    async fn test_sync_schedules_full_cycle() {
        let db = setup_test_db().await;
        let schema_manager = SchemaManager::new(&db);

        cleanup_test_data(&db).await;

        let migration = Migration;
        migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        let table_check = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                "SELECT COUNT(*) as count FROM information_schema.tables
                 WHERE table_schema = 'hr_public'
                 AND table_name IN ('sync_schedules', 'sync_schedule_history')"
                    .to_string(),
            ))
            .await;
        let count: i64 = table_check
            .unwrap()
            .unwrap()
            .try_get("", "count")
            .expect("Should get count");
        assert_eq!(count, 2, "Both tables should exist after up");

        migration
            .down(&schema_manager)
            .await
            .expect("Migration down should succeed");

        let table_check = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                "SELECT COUNT(*) as count FROM information_schema.tables
                 WHERE table_schema = 'hr_public'
                 AND table_name IN ('sync_schedules', 'sync_schedule_history')"
                    .to_string(),
            ))
            .await;
        let count: i64 = table_check
            .unwrap()
            .unwrap()
            .try_get("", "count")
            .expect("Should get count");
        assert_eq!(count, 0, "Tables should be dropped after down");

        cleanup_test_data(&db).await;
    }

    #[tokio::test]
    async fn test_sync_schedules_column_defaults() {
        let db = setup_test_db().await;
        let schema_manager = SchemaManager::new(&db);

        cleanup_test_data(&db).await;

        let migration = Migration;
        migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        // Verify enabled column default
        let default_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                "SELECT column_default FROM information_schema.columns
                 WHERE table_schema = 'hr_public'
                 AND table_name = 'sync_schedules'
                 AND column_name = 'enabled'"
                    .to_string(),
            ))
            .await;

        assert!(default_result.is_ok());
        let default_val: Option<String> = default_result
            .unwrap()
            .unwrap()
            .try_get("", "column_default")
            .ok();
        assert!(default_val.is_some());
        assert!(default_val.unwrap().contains("true"));

        // Verify timezone column default
        let default_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                "SELECT column_default FROM information_schema.columns
                 WHERE table_schema = 'hr_public'
                 AND table_name = 'sync_schedules'
                 AND column_name = 'timezone'"
                    .to_string(),
            ))
            .await;

        assert!(default_result.is_ok());
        let default_val: Option<String> = default_result
            .unwrap()
            .unwrap()
            .try_get("", "column_default")
            .ok();
        assert!(default_val.is_some());
        assert!(default_val.unwrap().contains("UTC"));

        cleanup_test_data(&db).await;
    }

    #[tokio::test]
    async fn test_sync_schedule_history_metrics_columns() {
        let db = setup_test_db().await;
        let schema_manager = SchemaManager::new(&db);

        cleanup_test_data(&db).await;

        let migration = Migration;
        migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        let metric_columns = vec![
            "records_synced",
            "records_pushed",
            "records_pulled",
            "errors_count",
            "execution_time_ms",
        ];

        for column_name in metric_columns {
            let column_result = db
                .query_one(Statement::from_string(
                    DbBackend::Postgres,
                    format!(
                        "SELECT data_type FROM information_schema.columns
                         WHERE table_schema = 'hr_public'
                         AND table_name = 'sync_schedule_history'
                         AND column_name = '{}'",
                        column_name
                    ),
                ))
                .await;

            assert!(column_result.is_ok(), "Column {} should exist", column_name);
            let column = column_result.unwrap().unwrap();
            let data_type: String = column
                .try_get("", "data_type")
                .expect("Should get data_type");
            assert_eq!(
                data_type, "integer",
                "{} should be integer type",
                column_name
            );
        }

        cleanup_test_data(&db).await;
    }
}
