//! Tests for m20251229_007_create_reconciliation migration
//!
//! Verifies data reconciliation system:
//! - reconciliation_reports table for job tracking
//! - reconciliation_discrepancies table for detailed issues
//! - All column definitions and data types
//! - Index creation for efficient querying
//! - Foreign key relationship with CASCADE
//! - CHECK constraints for data integrity
//! - Idempotent up and down migrations
//! - Full migration cycle testing

use migration::m20251229_007_create_reconciliation::Migration;
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

/// Helper to check if a foreign key exists
async fn foreign_key_exists(db: &DatabaseConnection, fk_name: &str) -> Result<bool, DbErr> {
    let result = db
        .query_one(Statement::from_sql_and_values(
            db.get_database_backend(),
            r#"
            SELECT EXISTS (
                SELECT 1 FROM information_schema.table_constraints
                WHERE constraint_name = $1
                AND constraint_type = 'FOREIGN KEY'
            )
            "#,
            vec![fk_name.into()],
        ))
        .await?;

    Ok(result
        .map(|row| row.try_get::<bool>("", "exists").unwrap_or(false))
        .unwrap_or(false))
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

    // Verify tables exist
    assert!(
        table_exists(&db, "hr_public", "reconciliation_reports")
            .await
            .unwrap(),
        "reconciliation_reports table should exist"
    );

    assert!(
        table_exists(&db, "hr_public", "reconciliation_discrepancies")
            .await
            .unwrap(),
        "reconciliation_discrepancies table should exist"
    );
}

#[tokio::test]
async fn test_reconciliation_reports_columns() {
    let db = get_test_db().await.expect("Failed to connect to test database");
    let schema_manager = SchemaManager::new(&db);
    Migration.up(&schema_manager).await.unwrap();

    // Test all required columns exist
    let columns = vec![
        "id",
        "entity_type",
        "status",
        "total_local",
        "total_remote",
        "total_matched",
        "total_discrepancies",
        "missing_in_local",
        "missing_in_remote",
        "data_mismatches",
        "triggered_by",
        "triggered_by_email",
        "duration_ms",
        "error_message",
        "summary",
        "metadata",
        "started_at",
        "completed_at",
        "created_at",
    ];

    for column in columns {
        assert!(
            column_exists(&db, "hr_public", "reconciliation_reports", column)
                .await
                .unwrap(),
            "Column {} should exist in reconciliation_reports",
            column
        );
    }
}

#[tokio::test]
async fn test_reconciliation_discrepancies_columns() {
    let db = get_test_db().await.expect("Failed to connect to test database");
    let schema_manager = SchemaManager::new(&db);
    Migration.up(&schema_manager).await.unwrap();

    // Test all required columns exist
    let columns = vec![
        "id",
        "report_id",
        "entity_type",
        "entity_id",
        "discrepancy_type",
        "severity",
        "field_name",
        "local_value",
        "remote_value",
        "description",
        "suggested_action",
        "is_resolved",
        "resolved_at",
        "resolved_by",
        "resolution_notes",
        "metadata",
        "created_at",
    ];

    for column in columns {
        assert!(
            column_exists(&db, "hr_public", "reconciliation_discrepancies", column)
                .await
                .unwrap(),
            "Column {} should exist in reconciliation_discrepancies",
            column
        );
    }
}

#[tokio::test]
async fn test_indexes() {
    let db = get_test_db().await.expect("Failed to connect to test database");
    let schema_manager = SchemaManager::new(&db);
    Migration.up(&schema_manager).await.unwrap();

    // Verify all indexes exist
    assert!(
        index_exists(&db, "idx_reconciliation_reports_entity_type")
            .await
            .unwrap()
    );
    assert!(
        index_exists(&db, "idx_reconciliation_reports_created_at")
            .await
            .unwrap()
    );
    assert!(
        index_exists(&db, "idx_reconciliation_discrepancies_report_id")
            .await
            .unwrap()
    );
    assert!(
        index_exists(&db, "idx_reconciliation_discrepancies_entity")
            .await
            .unwrap()
    );
    assert!(
        index_exists(&db, "idx_reconciliation_discrepancies_resolved")
            .await
            .unwrap()
    );
}

#[tokio::test]
async fn test_foreign_key_constraint() {
    let db = get_test_db().await.expect("Failed to connect to test database");
    let schema_manager = SchemaManager::new(&db);
    Migration.up(&schema_manager).await.unwrap();

    // Verify foreign key exists
    assert!(
        foreign_key_exists(&db, "fk_discrepancy_report")
            .await
            .unwrap(),
        "Foreign key fk_discrepancy_report should exist"
    );
}

#[tokio::test]
async fn test_foreign_key_cascade_delete() {
    let db = get_test_db().await.expect("Failed to connect to test database");
    let schema_manager = SchemaManager::new(&db);
    Migration.up(&schema_manager).await.unwrap();

    // Insert a report
    let report_id = db
        .query_one(Statement::from_string(
            db.get_database_backend(),
            r#"
            INSERT INTO hr_public.reconciliation_reports (entity_type, status)
            VALUES ('employee', 'completed')
            RETURNING id
            "#
            .to_string(),
        ))
        .await
        .unwrap()
        .unwrap();
    let report_id: String = report_id.try_get("", "id").unwrap();

    // Insert a discrepancy
    db.execute(Statement::from_string(
        db.get_database_backend(),
        format!(
            r#"
            INSERT INTO hr_public.reconciliation_discrepancies
            (report_id, entity_type, entity_id, discrepancy_type, description)
            VALUES ('{}', 'employee', 'emp-1', 'missing_in_local', 'test discrepancy')
            "#,
            report_id
        ),
    ))
    .await
    .unwrap();

    // Delete the report
    db.execute(Statement::from_string(
        db.get_database_backend(),
        format!(
            "DELETE FROM hr_public.reconciliation_reports WHERE id = '{}'",
            report_id
        ),
    ))
    .await
    .unwrap();

    // Verify discrepancy was cascade deleted
    let count = db
        .query_one(Statement::from_string(
            db.get_database_backend(),
            "SELECT COUNT(*) FROM hr_public.reconciliation_discrepancies".to_string(),
        ))
        .await
        .unwrap()
        .unwrap();
    let count: i64 = count.try_get("", "count").unwrap();
    assert_eq!(count, 0, "Discrepancies should be cascade deleted");
}

#[tokio::test]
async fn test_check_constraints() {
    let db = get_test_db().await.expect("Failed to connect to test database");
    let schema_manager = SchemaManager::new(&db);
    Migration.up(&schema_manager).await.unwrap();

    // Test invalid status
    let result = db
        .execute(Statement::from_string(
            db.get_database_backend(),
            r#"
            INSERT INTO hr_public.reconciliation_reports (entity_type, status)
            VALUES ('employee', 'invalid_status')
            "#
            .to_string(),
        ))
        .await;
    assert!(result.is_err(), "Should fail with invalid status");

    // Test invalid entity_type
    let result = db
        .execute(Statement::from_string(
            db.get_database_backend(),
            r#"
            INSERT INTO hr_public.reconciliation_reports (entity_type, status)
            VALUES ('invalid_entity', 'completed')
            "#
            .to_string(),
        ))
        .await;
    assert!(result.is_err(), "Should fail with invalid entity_type");

    // Test valid insert
    let result = db
        .execute(Statement::from_string(
            db.get_database_backend(),
            r#"
            INSERT INTO hr_public.reconciliation_reports (entity_type, status)
            VALUES ('employee', 'completed')
            "#
            .to_string(),
        ))
        .await;
    assert!(result.is_ok(), "Should insert with valid values");
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
        table_exists(&db, "hr_public", "reconciliation_reports")
            .await
            .unwrap()
    );
    assert!(
        table_exists(&db, "hr_public", "reconciliation_discrepancies")
            .await
            .unwrap()
    );
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
        !table_exists(&db, "hr_public", "reconciliation_reports")
            .await
            .unwrap()
    );
    assert!(
        !table_exists(&db, "hr_public", "reconciliation_discrepancies")
            .await
            .unwrap()
    );
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
    assert!(
        !table_exists(&db, "hr_public", "reconciliation_reports")
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
    assert!(
        table_exists(&db, "hr_public", "reconciliation_reports")
            .await
            .unwrap()
    );

    // Down migration
    Migration
        .down(&schema_manager)
        .await
        .expect("Down migration should succeed");
    assert!(
        !table_exists(&db, "hr_public", "reconciliation_reports")
            .await
            .unwrap()
    );

    // Up migration again
    Migration
        .up(&schema_manager)
        .await
        .expect("Second up migration should succeed");
    assert!(
        table_exists(&db, "hr_public", "reconciliation_reports")
            .await
            .unwrap()
    );
}

#[tokio::test]
async fn test_column_defaults() {
    let db = get_test_db().await.expect("Failed to connect to test database");
    let schema_manager = SchemaManager::new(&db);
    Migration.up(&schema_manager).await.unwrap();

    // Insert with minimal required fields
    let result = db
        .query_one(Statement::from_string(
            db.get_database_backend(),
            r#"
            INSERT INTO hr_public.reconciliation_reports (entity_type)
            VALUES ('employee')
            RETURNING status, total_local, total_matched
            "#
            .to_string(),
        ))
        .await
        .unwrap()
        .unwrap();

    assert_eq!(result.try_get::<String>("", "status").unwrap(), "running");
    assert_eq!(result.try_get::<i32>("", "total_local").unwrap(), 0);
    assert_eq!(result.try_get::<i32>("", "total_matched").unwrap(), 0);
}
