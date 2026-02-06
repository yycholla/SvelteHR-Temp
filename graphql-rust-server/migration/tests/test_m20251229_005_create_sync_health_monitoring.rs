//! Tests for m20251229_005_create_sync_health_monitoring migration
//!
//! Verifies comprehensive sync health monitoring system:
//! - sync_health_metrics table for time-series performance tracking
//! - sync_health_alerts table for alert lifecycle management
//! - All column definitions and data types
//! - Index creation for efficient querying
//! - Idempotent up and down migrations
//! - Full migration cycle testing

use hr_graphql_server::migration::m20251229_005_create_sync_health_monitoring::Migration;
use hr_graphql_server::migration::{Migrator, MigratorTrait};
use sea_orm::{Database, DatabaseConnection, DbErr, Statement};
use sea_orm_migration::prelude::*;

/// Helper to get test database connection
async fn get_test_db() -> Result<DatabaseConnection, DbErr> {
    let database_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgres://postgres:postgres@localhost/test_db".to_string());
    Database::connect(&database_url).await
}

/// Helper to check if a table exists
async fn table_exists(db: &DatabaseConnection, schema: &str, table: &str) -> Result<bool, DbErr> {
    let result = db
        .query_one(Statement::from_sql_and_values(
            db.get_database_backend(),
            r#"
            SELECT EXISTS (
                SELECT 1 FROM information_schema.tables
                WHERE table_schema = $1
                AND table_name = $2
            )
            "#,
            vec![schema.into(), table.into()],
        ))
        .await?;

    Ok(result
        .map(|row| row.try_get::<bool>("", "exists").unwrap_or(false))
        .unwrap_or(false))
}

/// Helper to check if a column exists in a table
async fn column_exists(
    db: &DatabaseConnection,
    schema: &str,
    table: &str,
    column: &str,
) -> Result<bool, DbErr> {
    let result = db
        .query_one(Statement::from_sql_and_values(
            db.get_database_backend(),
            r#"
            SELECT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_schema = $1
                AND table_name = $2
                AND column_name = $3
            )
            "#,
            vec![schema.into(), table.into(), column.into()],
        ))
        .await?;

    Ok(result
        .map(|row| row.try_get::<bool>("", "exists").unwrap_or(false))
        .unwrap_or(false))
}

/// Helper to check if an index exists
async fn index_exists(db: &DatabaseConnection, index_name: &str) -> Result<bool, DbErr> {
    let result = db
        .query_one(Statement::from_sql_and_values(
            db.get_database_backend(),
            r#"
            SELECT EXISTS (
                SELECT 1 FROM pg_indexes
                WHERE indexname = $1
            )
            "#,
            vec![index_name.into()],
        ))
        .await?;

    Ok(result
        .map(|row| row.try_get::<bool>("", "exists").unwrap_or(false))
        .unwrap_or(false))
}

/// Helper to get column data type
async fn get_column_type(
    db: &DatabaseConnection,
    schema: &str,
    table: &str,
    column: &str,
) -> Result<Option<String>, DbErr> {
    let result = db
        .query_one(Statement::from_sql_and_values(
            db.get_database_backend(),
            r#"
            SELECT data_type, udt_name
            FROM information_schema.columns
            WHERE table_schema = $1
            AND table_name = $2
            AND column_name = $3
            "#,
            vec![schema.into(), table.into(), column.into()],
        ))
        .await?;

    Ok(result.map(|row| {
        row.try_get::<String>("", "data_type")
            .or_else(|_| row.try_get::<String>("", "udt_name"))
            .unwrap_or_default()
    }))
}

#[tokio::test]
async fn test_migration_compiles() {
    // This test ensures the migration code compiles correctly
    let _migration = Migration;
}

#[tokio::test]
async fn test_up_migration() {
    let db = get_test_db().await.expect("Failed to connect to test database");

    // Run up migration
    let schema_manager = SchemaManager::new(&db);
    Migration
        .up(&schema_manager)
        .await
        .expect("Failed to run up migration");

    // Verify sync_health_metrics table exists
    assert!(
        table_exists(&db, "hr_public", "sync_health_metrics")
            .await
            .unwrap(),
        "sync_health_metrics table should exist"
    );

    // Verify sync_health_alerts table exists
    assert!(
        table_exists(&db, "hr_public", "sync_health_alerts")
            .await
            .unwrap(),
        "sync_health_alerts table should exist"
    );
}

#[tokio::test]
async fn test_sync_health_metrics_columns() {
    let db = get_test_db().await.expect("Failed to connect to test database");
    let schema_manager = SchemaManager::new(&db);
    Migration.up(&schema_manager).await.unwrap();

    // Test all required columns exist
    let columns = vec![
        "id",
        "recorded_at",
        "sync_duration_ms",
        "records_processed",
        "errors_count",
        "api_calls_used",
        "connection_status",
        "entity_type",
        "sync_direction",
        "metadata",
    ];

    for column in columns {
        assert!(
            column_exists(&db, "hr_public", "sync_health_metrics", column)
                .await
                .unwrap(),
            "Column {} should exist in sync_health_metrics",
            column
        );
    }

    // Verify specific column types
    let id_type = get_column_type(&db, "hr_public", "sync_health_metrics", "id")
        .await
        .unwrap();
    assert_eq!(id_type, Some("uuid".to_string()));

    let recorded_at_type =
        get_column_type(&db, "hr_public", "sync_health_metrics", "recorded_at")
            .await
            .unwrap();
    assert_eq!(
        recorded_at_type,
        Some("timestamp with time zone".to_string())
    );

    let metadata_type = get_column_type(&db, "hr_public", "sync_health_metrics", "metadata")
        .await
        .unwrap();
    assert_eq!(metadata_type, Some("jsonb".to_string()));
}

#[tokio::test]
async fn test_sync_health_alerts_columns() {
    let db = get_test_db().await.expect("Failed to connect to test database");
    let schema_manager = SchemaManager::new(&db);
    Migration.up(&schema_manager).await.unwrap();

    // Test all required columns exist
    let columns = vec![
        "id",
        "alert_type",
        "severity",
        "message",
        "triggered_at",
        "resolved_at",
        "notified_users",
        "metadata",
        "created_at",
        "updated_at",
    ];

    for column in columns {
        assert!(
            column_exists(&db, "hr_public", "sync_health_alerts", column)
                .await
                .unwrap(),
            "Column {} should exist in sync_health_alerts",
            column
        );
    }

    // Verify specific column types
    let id_type = get_column_type(&db, "hr_public", "sync_health_alerts", "id")
        .await
        .unwrap();
    assert_eq!(id_type, Some("uuid".to_string()));

    let severity_type = get_column_type(&db, "hr_public", "sync_health_alerts", "severity")
        .await
        .unwrap();
    assert!(
        severity_type == Some("text".to_string())
            || severity_type == Some("character varying".to_string())
    );

    let notified_users_type =
        get_column_type(&db, "hr_public", "sync_health_alerts", "notified_users")
            .await
            .unwrap();
    assert_eq!(notified_users_type, Some("ARRAY".to_string()));
}

#[tokio::test]
async fn test_sync_health_metrics_indexes() {
    let db = get_test_db().await.expect("Failed to connect to test database");
    let schema_manager = SchemaManager::new(&db);
    let migration = Migration;

    migration.up(&schema_manager).await.unwrap();

    // Verify all indexes exist
    assert!(
        index_exists(&db, "idx_sync_health_metrics_recorded_at")
            .await
            .unwrap(),
        "idx_sync_health_metrics_recorded_at should exist"
    );

    assert!(
        index_exists(&db, "idx_sync_health_metrics_connection_status")
            .await
            .unwrap(),
        "idx_sync_health_metrics_connection_status should exist"
    );
}

#[tokio::test]
async fn test_sync_health_alerts_indexes() {
    let db = get_test_db().await.expect("Failed to connect to test database");
    let schema_manager = SchemaManager::new(&db);
    let migration = Migration;

    migration.up(&schema_manager).await.unwrap();

    // Verify all indexes exist
    assert!(
        index_exists(&db, "idx_sync_health_alerts_triggered_at")
            .await
            .unwrap(),
        "idx_sync_health_alerts_triggered_at should exist"
    );

    assert!(
        index_exists(&db, "idx_sync_health_alerts_severity")
            .await
            .unwrap(),
        "idx_sync_health_alerts_severity should exist"
    );

    assert!(
        index_exists(&db, "idx_sync_health_alerts_resolved_at")
            .await
            .unwrap(),
        "idx_sync_health_alerts_resolved_at should exist"
    );
}

#[tokio::test]
async fn test_idempotent_up_migration() {
    let db = get_test_db().await.expect("Failed to connect to test database");
    let schema_manager = SchemaManager::new(&db);

    // Run migration twice
    Migration
        .up(&schema_manager)
        .await
        .expect("First up migration should succeed");
    Migration
        .up(&schema_manager)
        .await
        .expect("Second up migration should succeed (idempotent)");

    // Tables should still exist
    assert!(
        table_exists(&db, "hr_public", "sync_health_metrics")
            .await
            .unwrap()
    );
    assert!(
        table_exists(&db, "hr_public", "sync_health_alerts")
            .await
            .unwrap()
    );
}

#[tokio::test]
async fn test_down_migration() {
    let db = get_test_db().await.expect("Failed to connect to test database");
    let schema_manager = SchemaManager::new(&db);

    let migration = Migration;


    // Run up then down migration
    migration.up(&schema_manager).await.unwrap();
    Migration
        .down(&schema_manager)
        .await
        .expect("Down migration should succeed");

    // Tables should not exist
    assert!(
        !table_exists(&db, "hr_public", "sync_health_metrics")
            .await
            .unwrap(),
        "sync_health_metrics table should not exist after down migration"
    );
    assert!(
        !table_exists(&db, "hr_public", "sync_health_alerts")
            .await
            .unwrap(),
        "sync_health_alerts table should not exist after down migration"
    );

    // Indexes should not exist
    assert!(
        !index_exists(&db, "idx_sync_health_metrics_recorded_at")
            .await
            .unwrap()
    );
    assert!(
        !index_exists(&db, "idx_sync_health_alerts_severity")
            .await
            .unwrap()
    );
}

#[tokio::test]
async fn test_idempotent_down_migration() {
    let db = get_test_db().await.expect("Failed to connect to test database");
    let schema_manager = SchemaManager::new(&db);

    let migration = Migration;


    // Run up, then down twice
    migration.up(&schema_manager).await.unwrap();
    Migration
        .down(&schema_manager)
        .await
        .expect("First down migration should succeed");
    Migration
        .down(&schema_manager)
        .await
        .expect("Second down migration should succeed (idempotent)");

    // Tables should not exist
    assert!(!table_exists(&db, "hr_public", "sync_health_metrics")
        .await
        .unwrap());
    assert!(!table_exists(&db, "hr_public", "sync_health_alerts")
        .await
        .unwrap());
}

#[tokio::test]
async fn test_full_migration_cycle() {
    let db = get_test_db().await.expect("Failed to connect to test database");
    let schema_manager = SchemaManager::new(&db);

    // Up migration
    Migration
        .up(&schema_manager)
        .await
        .expect("Up migration should succeed");
    assert!(table_exists(&db, "hr_public", "sync_health_metrics")
        .await
        .unwrap());
    assert!(table_exists(&db, "hr_public", "sync_health_alerts")
        .await
        .unwrap());

    // Down migration
    Migration
        .down(&schema_manager)
        .await
        .expect("Down migration should succeed");
    assert!(!table_exists(&db, "hr_public", "sync_health_metrics")
        .await
        .unwrap());
    assert!(!table_exists(&db, "hr_public", "sync_health_alerts")
        .await
        .unwrap());

    // Up migration again
    Migration
        .up(&schema_manager)
        .await
        .expect("Second up migration should succeed");
    assert!(table_exists(&db, "hr_public", "sync_health_metrics")
        .await
        .unwrap());
    assert!(table_exists(&db, "hr_public", "sync_health_alerts")
        .await
        .unwrap());
}

#[tokio::test]
async fn test_column_defaults() {
    let db = get_test_db().await.expect("Failed to connect to test database");
    let schema_manager = SchemaManager::new(&db);
    let migration = Migration;

    migration.up(&schema_manager).await.unwrap();

    // Check that default values are set correctly by inserting minimal data
    let result = db
        .execute(Statement::from_string(
            db.get_database_backend(),
            r#"
            INSERT INTO hr_public.sync_health_metrics (id)
            VALUES (gen_random_uuid())
            RETURNING errors_count, api_calls_used
            "#
            .to_string(),
        ))
        .await;

    assert!(
        result.is_ok(),
        "Should be able to insert with only id (defaults should apply)"
    );

    // Check alert defaults
    let result = db
        .execute(Statement::from_string(
            db.get_database_backend(),
            r#"
            INSERT INTO hr_public.sync_health_alerts (id, alert_type, severity, message)
            VALUES (gen_random_uuid(), 'test', 'low', 'test message')
            RETURNING created_at, updated_at
            "#
            .to_string(),
        ))
        .await;

    assert!(
        result.is_ok(),
        "Should be able to insert alert with required fields (timestamps should default)"
    );
}
