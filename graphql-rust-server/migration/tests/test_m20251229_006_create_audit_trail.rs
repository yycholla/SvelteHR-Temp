//! Tests for m20251229_006_create_audit_trail migration
//!
//! Verifies comprehensive audit trail system:
//! - audit_logs table for activity tracking
//! - audit_log_retention table for policy management
//! - All column definitions and data types
//! - Index creation for efficient querying
//! - CHECK constraints for data integrity
//! - Default retention policy seeding (6 policies)
//! - Idempotent up and down migrations
//! - Full migration cycle testing

use migration::m20251229_006_create_audit_trail::Migration;
use migration::{Migrator, MigratorTrait};
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

/// Helper to count retention policies
async fn count_retention_policies(db: &DatabaseConnection) -> Result<i64, DbErr> {
    let result = db
        .query_one(Statement::from_string(
            db.get_database_backend(),
            "SELECT COUNT(*) FROM hr_public.audit_log_retention".to_string(),
        ))
        .await?;

    Ok(result
        .map(|row| row.try_get::<i64>("", "count").unwrap_or(0))
        .unwrap_or(0))
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

    // Verify audit_logs table exists
    assert!(
        table_exists(&db, "hr_public", "audit_logs").await.unwrap(),
        "audit_logs table should exist"
    );

    // Verify audit_log_retention table exists
    assert!(
        table_exists(&db, "hr_public", "audit_log_retention")
            .await
            .unwrap(),
        "audit_log_retention table should exist"
    );
}

#[tokio::test]
async fn test_audit_logs_columns() {
    let db = get_test_db().await.expect("Failed to connect to test database");
    let schema_manager = SchemaManager::new(&db);
    Migration.up(&schema_manager).await.unwrap();

    // Test all required columns exist
    let columns = vec![
        "id",
        "event_type",
        "event_category",
        "entity_type",
        "entity_id",
        "user_id",
        "user_email",
        "action",
        "description",
        "old_values",
        "new_values",
        "changes_summary",
        "ip_address",
        "user_agent",
        "session_id",
        "sync_direction",
        "sync_job_id",
        "source",
        "status",
        "error_message",
        "metadata",
        "created_at",
    ];

    for column in columns {
        assert!(
            column_exists(&db, "hr_public", "audit_logs", column)
                .await
                .unwrap(),
            "Column {} should exist in audit_logs",
            column
        );
    }

    // Verify specific column types
    let id_type = get_column_type(&db, "hr_public", "audit_logs", "id")
        .await
        .unwrap();
    assert_eq!(id_type, Some("uuid".to_string()));

    let event_type_type = get_column_type(&db, "hr_public", "audit_logs", "event_type")
        .await
        .unwrap();
    assert!(event_type_type == Some("character varying".to_string()));

    let old_values_type = get_column_type(&db, "hr_public", "audit_logs", "old_values")
        .await
        .unwrap();
    assert_eq!(old_values_type, Some("jsonb".to_string()));

    let created_at_type = get_column_type(&db, "hr_public", "audit_logs", "created_at")
        .await
        .unwrap();
    assert_eq!(
        created_at_type,
        Some("timestamp with time zone".to_string())
    );
}

#[tokio::test]
async fn test_audit_log_retention_columns() {
    let db = get_test_db().await.expect("Failed to connect to test database");
    let schema_manager = SchemaManager::new(&db);
    Migration.up(&schema_manager).await.unwrap();

    // Test all required columns exist
    let columns = vec![
        "id",
        "event_category",
        "retention_days",
        "archive_after_days",
        "is_active",
        "created_at",
        "updated_at",
    ];

    for column in columns {
        assert!(
            column_exists(&db, "hr_public", "audit_log_retention", column)
                .await
                .unwrap(),
            "Column {} should exist in audit_log_retention",
            column
        );
    }

    // Verify specific column types
    let id_type = get_column_type(&db, "hr_public", "audit_log_retention", "id")
        .await
        .unwrap();
    assert_eq!(id_type, Some("uuid".to_string()));

    let retention_days_type =
        get_column_type(&db, "hr_public", "audit_log_retention", "retention_days")
            .await
            .unwrap();
    assert_eq!(retention_days_type, Some("integer".to_string()));

    let is_active_type = get_column_type(&db, "hr_public", "audit_log_retention", "is_active")
        .await
        .unwrap();
    assert_eq!(is_active_type, Some("boolean".to_string()));
}

#[tokio::test]
async fn test_audit_logs_indexes() {
    let db = get_test_db().await.expect("Failed to connect to test database");
    let schema_manager = SchemaManager::new(&db);
    Migration.up(&schema_manager).await.unwrap();

    // Verify all indexes exist
    assert!(
        index_exists(&db, "idx_audit_logs_created_at")
            .await
            .unwrap(),
        "idx_audit_logs_created_at should exist"
    );

    assert!(
        index_exists(&db, "idx_audit_logs_user_id").await.unwrap(),
        "idx_audit_logs_user_id should exist"
    );

    assert!(
        index_exists(&db, "idx_audit_logs_entity").await.unwrap(),
        "idx_audit_logs_entity should exist"
    );

    assert!(
        index_exists(&db, "idx_audit_logs_event_category")
            .await
            .unwrap(),
        "idx_audit_logs_event_category should exist"
    );

    assert!(
        index_exists(&db, "idx_audit_logs_sync_job_id")
            .await
            .unwrap(),
        "idx_audit_logs_sync_job_id should exist"
    );
}

#[tokio::test]
async fn test_retention_policies_seeded() {
    let db = get_test_db().await.expect("Failed to connect to test database");
    let schema_manager = SchemaManager::new(&db);
    Migration.up(&schema_manager).await.unwrap();

    // Verify 6 retention policies were seeded
    let count = count_retention_policies(&db).await.unwrap();
    assert_eq!(count, 6, "Should have 6 retention policies seeded");

    // Verify specific policies exist
    let result = db
        .query_one(Statement::from_string(
            db.get_database_backend(),
            r#"
            SELECT event_category, retention_days, archive_after_days
            FROM hr_public.audit_log_retention
            WHERE event_category = 'sync'
            "#
            .to_string(),
        ))
        .await
        .unwrap();

    assert!(result.is_some(), "Sync retention policy should exist");
    let row = result.unwrap();
    assert_eq!(
        row.try_get::<String>("", "event_category").unwrap(),
        "sync"
    );
    assert_eq!(row.try_get::<i32>("", "retention_days").unwrap(), 730);
    assert_eq!(row.try_get::<i32>("", "archive_after_days").unwrap(), 365);
}

#[tokio::test]
async fn test_check_constraints() {
    let db = get_test_db().await.expect("Failed to connect to test database");
    let schema_manager = SchemaManager::new(&db);
    Migration.up(&schema_manager).await.unwrap();

    // Test event_category constraint
    let result = db
        .execute(Statement::from_string(
            db.get_database_backend(),
            r#"
            INSERT INTO hr_public.audit_logs
            (id, event_type, event_category, action, description, source, status)
            VALUES
            (gen_random_uuid(), 'test', 'invalid_category', 'create', 'test', 'web_ui', 'success')
            "#
            .to_string(),
        ))
        .await;

    assert!(
        result.is_err(),
        "Should fail to insert invalid event_category"
    );

    // Test action constraint
    let result = db
        .execute(Statement::from_string(
            db.get_database_backend(),
            r#"
            INSERT INTO hr_public.audit_logs
            (id, event_type, event_category, action, description, source, status)
            VALUES
            (gen_random_uuid(), 'test', 'sync', 'invalid_action', 'test', 'web_ui', 'success')
            "#
            .to_string(),
        ))
        .await;

    assert!(result.is_err(), "Should fail to insert invalid action");

    // Test valid insert
    let result = db
        .execute(Statement::from_string(
            db.get_database_backend(),
            r#"
            INSERT INTO hr_public.audit_logs
            (id, event_type, event_category, action, description, source, status)
            VALUES
            (gen_random_uuid(), 'test_event', 'sync', 'create', 'test description', 'web_ui', 'success')
            "#
            .to_string(),
        ))
        .await;

    assert!(result.is_ok(), "Should successfully insert valid data");
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
    assert!(table_exists(&db, "hr_public", "audit_logs").await.unwrap());
    assert!(
        table_exists(&db, "hr_public", "audit_log_retention")
            .await
            .unwrap()
    );

    // Should still have 6 policies (not 12)
    let count = count_retention_policies(&db).await.unwrap();
    assert_eq!(count, 6, "Should still have 6 policies after re-run");
}

#[tokio::test]
async fn test_down_migration() {
    let db = get_test_db().await.expect("Failed to connect to test database");
    let schema_manager = SchemaManager::new(&db);

    // Run up then down migration
    Migration.up(&schema_manager).await.unwrap();
    Migration
        .down(&schema_manager)
        .await
        .expect("Down migration should succeed");

    // Tables should not exist
    assert!(
        !table_exists(&db, "hr_public", "audit_logs").await.unwrap(),
        "audit_logs table should not exist after down migration"
    );
    assert!(
        !table_exists(&db, "hr_public", "audit_log_retention")
            .await
            .unwrap(),
        "audit_log_retention table should not exist after down migration"
    );

    // Indexes should not exist
    assert!(!index_exists(&db, "idx_audit_logs_created_at")
        .await
        .unwrap());
    assert!(!index_exists(&db, "idx_audit_logs_entity").await.unwrap());
}

#[tokio::test]
async fn test_idempotent_down_migration() {
    let db = get_test_db().await.expect("Failed to connect to test database");
    let schema_manager = SchemaManager::new(&db);

    // Run up, then down twice
    Migration.up(&schema_manager).await.unwrap();
    Migration
        .down(&schema_manager)
        .await
        .expect("First down migration should succeed");
    Migration
        .down(&schema_manager)
        .await
        .expect("Second down migration should succeed (idempotent)");

    // Tables should not exist
    assert!(!table_exists(&db, "hr_public", "audit_logs").await.unwrap());
    assert!(
        !table_exists(&db, "hr_public", "audit_log_retention")
            .await
            .unwrap()
    );
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
    assert!(table_exists(&db, "hr_public", "audit_logs").await.unwrap());
    assert!(
        table_exists(&db, "hr_public", "audit_log_retention")
            .await
            .unwrap()
    );

    // Down migration
    Migration
        .down(&schema_manager)
        .await
        .expect("Down migration should succeed");
    assert!(!table_exists(&db, "hr_public", "audit_logs").await.unwrap());
    assert!(
        !table_exists(&db, "hr_public", "audit_log_retention")
            .await
            .unwrap()
    );

    // Up migration again
    Migration
        .up(&schema_manager)
        .await
        .expect("Second up migration should succeed");
    assert!(table_exists(&db, "hr_public", "audit_logs").await.unwrap());
    assert!(
        table_exists(&db, "hr_public", "audit_log_retention")
            .await
            .unwrap()
    );
}

#[tokio::test]
async fn test_column_defaults() {
    let db = get_test_db().await.expect("Failed to connect to test database");
    let schema_manager = SchemaManager::new(&db);
    Migration.up(&schema_manager).await.unwrap();

    // Check that default values are set correctly
    let result = db
        .query_one(Statement::from_string(
            db.get_database_backend(),
            r#"
            INSERT INTO hr_public.audit_logs
            (event_type, event_category, action, description, source)
            VALUES
            ('test', 'sync', 'create', 'test', 'web_ui')
            RETURNING id, status, created_at
            "#
            .to_string(),
        ))
        .await;

    assert!(result.is_ok(), "Should insert with defaults");
    let row = result.unwrap().unwrap();
    assert_eq!(row.try_get::<String>("", "status").unwrap(), "success");
    assert!(row.try_get::<String>("", "id").is_ok());
}
