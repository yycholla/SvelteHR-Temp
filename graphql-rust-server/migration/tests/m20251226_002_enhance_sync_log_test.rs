//! Tests for m20251226_002_enhance_sync_log migration
//!
//! Verifies enhanced sync log tracking fields including:
//! - Sync direction and conflict tracking columns
//! - Sync statistics counters (pushed/pulled/updated/skipped)
//! - Retry mechanism (retry_count, next_retry_at)
//! - QuickBooks metadata JSONB storage
//! - Idempotent up and down migrations

use hr_graphql_server::migration::m20251226_002_enhance_sync_log::Migration;
use hr_graphql_server::migration::{Migrator, MigratorTrait};
use sea_orm::{Database, DatabaseConnection, DbErr, Statement};
use sea_orm_migration::prelude::*;

/// Helper to get test database connection
async fn get_test_db() -> Result<DatabaseConnection, DbErr> {
    let database_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgres://postgres:postgres@localhost/test_db".to_string());
    Database::connect(&database_url).await
}

/// Helper to check if a column exists in a table
async fn column_exists(db: &DatabaseConnection, table: &str, column: &str) -> Result<bool, DbErr> {
    let result = db
        .query_one(Statement::from_sql_and_values(
            db.get_database_backend(),
            r#"
            SELECT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'hr_public'
                AND table_name = $1
                AND column_name = $2
            )
            "#,
            vec![table.into(), column.into()],
        ))
        .await?;

    Ok(result
        .map(|row| row.try_get::<bool>("", "exists").unwrap_or(false))
        .unwrap_or(false))
}

/// Helper to get column data type
async fn get_column_type(
    db: &DatabaseConnection,
    table: &str,
    column: &str,
) -> Result<Option<String>, DbErr> {
    let result = db
        .query_one(Statement::from_sql_and_values(
            db.get_database_backend(),
            r#"
            SELECT data_type, udt_name
            FROM information_schema.columns
            WHERE table_schema = 'hr_public'
            AND table_name = $1
            AND column_name = $2
            "#,
            vec![table.into(), column.into()],
        ))
        .await?;

    Ok(result.map(|row| {
        row.try_get::<String>("", "udt_name")
            .unwrap_or_else(|_| row.try_get::<String>("", "data_type").unwrap_or_default())
    }))
}

/// Helper to get column default value
async fn get_column_default(
    db: &DatabaseConnection,
    table: &str,
    column: &str,
) -> Result<Option<String>, DbErr> {
    let result = db
        .query_one(Statement::from_sql_and_values(
            db.get_database_backend(),
            r#"
            SELECT column_default
            FROM information_schema.columns
            WHERE table_schema = 'hr_public'
            AND table_name = $1
            AND column_name = $2
            "#,
            vec![table.into(), column.into()],
        ))
        .await?;

    Ok(result.and_then(|row| row.try_get::<String>("", "column_default").ok()))
}

/// Helper to get column nullable constraint
async fn is_column_nullable(
    db: &DatabaseConnection,
    table: &str,
    column: &str,
) -> Result<bool, DbErr> {
    let result = db
        .query_one(Statement::from_sql_and_values(
            db.get_database_backend(),
            r#"
            SELECT is_nullable
            FROM information_schema.columns
            WHERE table_schema = 'hr_public'
            AND table_name = $1
            AND column_name = $2
            "#,
            vec![table.into(), column.into()],
        ))
        .await?;

    Ok(result
        .map(|row| row.try_get::<String>("", "is_nullable").unwrap_or_default() == "YES")
        .unwrap_or(false))
}

#[tokio::test]
async fn test_migration_compiles() {
    // This test simply verifies the migration struct compiles
    let _migration = Migration;
}

#[tokio::test]
async fn test_up_migration() {
    let db = get_test_db()
        .await
        .expect("Failed to connect to test database");
    let schema_manager = SchemaManager::new(&db);

    // Run migration
    Migration
        .up(&schema_manager)
        .await
        .expect("Failed to run up migration");

    // Verify sync direction and conflict tracking columns exist
    assert!(
        column_exists(&db, "intuit_sync_log", "change_direction")
            .await
            .expect("Failed to check change_direction column"),
        "change_direction column should exist"
    );

    assert!(
        column_exists(&db, "intuit_sync_log", "conflict_detected")
            .await
            .expect("Failed to check conflict_detected column"),
        "conflict_detected column should exist"
    );

    assert!(
        column_exists(&db, "intuit_sync_log", "conflict_resolution")
            .await
            .expect("Failed to check conflict_resolution column"),
        "conflict_resolution column should exist"
    );

    // Verify sync statistics columns exist
    assert!(
        column_exists(&db, "intuit_sync_log", "pushed_count")
            .await
            .expect("Failed to check pushed_count column"),
        "pushed_count column should exist"
    );

    assert!(
        column_exists(&db, "intuit_sync_log", "pulled_count")
            .await
            .expect("Failed to check pulled_count column"),
        "pulled_count column should exist"
    );

    assert!(
        column_exists(&db, "intuit_sync_log", "updated_count")
            .await
            .expect("Failed to check updated_count column"),
        "updated_count column should exist"
    );

    assert!(
        column_exists(&db, "intuit_sync_log", "skipped_count")
            .await
            .expect("Failed to check skipped_count column"),
        "skipped_count column should exist"
    );

    // Verify retry mechanism columns exist
    assert!(
        column_exists(&db, "intuit_sync_log", "retry_count")
            .await
            .expect("Failed to check retry_count column"),
        "retry_count column should exist"
    );

    assert!(
        column_exists(&db, "intuit_sync_log", "next_retry_at")
            .await
            .expect("Failed to check next_retry_at column"),
        "next_retry_at column should exist"
    );

    // Verify QuickBooks metadata column exists
    assert!(
        column_exists(&db, "intuit_sync_log", "quickbooks_metadata")
            .await
            .expect("Failed to check quickbooks_metadata column"),
        "quickbooks_metadata column should exist"
    );
}

#[tokio::test]
async fn test_column_data_types() {
    let db = get_test_db()
        .await
        .expect("Failed to connect to test database");
    let schema_manager = SchemaManager::new(&db);

    // Ensure migration is run
    Migration
        .up(&schema_manager)
        .await
        .expect("Failed to run up migration");

    // Verify change_direction is TEXT
    let change_direction_type = get_column_type(&db, "intuit_sync_log", "change_direction")
        .await
        .expect("Failed to get change_direction type");
    assert_eq!(change_direction_type, Some("text".to_string()));

    // Verify conflict_detected is BOOLEAN
    let conflict_detected_type = get_column_type(&db, "intuit_sync_log", "conflict_detected")
        .await
        .expect("Failed to get conflict_detected type");
    assert_eq!(conflict_detected_type, Some("bool".to_string()));

    // Verify sync counters are INTEGER
    let pushed_count_type = get_column_type(&db, "intuit_sync_log", "pushed_count")
        .await
        .expect("Failed to get pushed_count type");
    assert_eq!(pushed_count_type, Some("int4".to_string()));

    // Verify next_retry_at is TIMESTAMPTZ
    let next_retry_at_type = get_column_type(&db, "intuit_sync_log", "next_retry_at")
        .await
        .expect("Failed to get next_retry_at type");
    assert_eq!(next_retry_at_type, Some("timestamptz".to_string()));

    // Verify quickbooks_metadata is JSONB
    let quickbooks_metadata_type = get_column_type(&db, "intuit_sync_log", "quickbooks_metadata")
        .await
        .expect("Failed to get quickbooks_metadata type");
    assert_eq!(quickbooks_metadata_type, Some("jsonb".to_string()));
}

#[tokio::test]
async fn test_column_defaults() {
    let db = get_test_db()
        .await
        .expect("Failed to connect to test database");
    let schema_manager = SchemaManager::new(&db);

    // Ensure migration is run
    Migration
        .up(&schema_manager)
        .await
        .expect("Failed to run up migration");

    // Verify conflict_detected defaults to FALSE
    let conflict_detected_default = get_column_default(&db, "intuit_sync_log", "conflict_detected")
        .await
        .expect("Failed to get conflict_detected default");
    assert!(conflict_detected_default.is_some());
    assert!(conflict_detected_default.unwrap().contains("false"));

    // Verify sync counters default to 0
    let pushed_count_default = get_column_default(&db, "intuit_sync_log", "pushed_count")
        .await
        .expect("Failed to get pushed_count default");
    assert!(pushed_count_default.is_some());
    assert!(pushed_count_default.unwrap().contains('0'));

    let retry_count_default = get_column_default(&db, "intuit_sync_log", "retry_count")
        .await
        .expect("Failed to get retry_count default");
    assert!(retry_count_default.is_some());
    assert!(retry_count_default.unwrap().contains('0'));
}

#[tokio::test]
async fn test_column_nullable_constraints() {
    let db = get_test_db()
        .await
        .expect("Failed to connect to test database");
    let schema_manager = SchemaManager::new(&db);

    // Ensure migration is run
    Migration
        .up(&schema_manager)
        .await
        .expect("Failed to run up migration");

    // Verify nullable columns
    assert!(
        is_column_nullable(&db, "intuit_sync_log", "change_direction")
            .await
            .expect("Failed to check change_direction nullable"),
        "change_direction should be nullable"
    );

    assert!(
        is_column_nullable(&db, "intuit_sync_log", "conflict_resolution")
            .await
            .expect("Failed to check conflict_resolution nullable"),
        "conflict_resolution should be nullable"
    );

    assert!(
        is_column_nullable(&db, "intuit_sync_log", "next_retry_at")
            .await
            .expect("Failed to check next_retry_at nullable"),
        "next_retry_at should be nullable"
    );

    assert!(
        is_column_nullable(&db, "intuit_sync_log", "quickbooks_metadata")
            .await
            .expect("Failed to check quickbooks_metadata nullable"),
        "quickbooks_metadata should be nullable"
    );

    // Verify NOT NULL columns
    assert!(
        !is_column_nullable(&db, "intuit_sync_log", "conflict_detected")
            .await
            .expect("Failed to check conflict_detected nullable"),
        "conflict_detected should be NOT NULL"
    );

    assert!(
        !is_column_nullable(&db, "intuit_sync_log", "pushed_count")
            .await
            .expect("Failed to check pushed_count nullable"),
        "pushed_count should be NOT NULL"
    );

    assert!(
        !is_column_nullable(&db, "intuit_sync_log", "retry_count")
            .await
            .expect("Failed to check retry_count nullable"),
        "retry_count should be NOT NULL"
    );
}

#[tokio::test]
async fn test_idempotent_up_migration() {
    let db = get_test_db()
        .await
        .expect("Failed to connect to test database");
    let schema_manager = SchemaManager::new(&db);

    // Run migration twice
    Migration
        .up(&schema_manager)
        .await
        .expect("Failed to run first up migration");
    Migration
        .up(&schema_manager)
        .await
        .expect("Failed to run second up migration");

    // Verify all columns still exist
    assert!(
        column_exists(&db, "intuit_sync_log", "change_direction")
            .await
            .expect("Failed to check change_direction column"),
        "change_direction column should exist after idempotent up"
    );

    assert!(
        column_exists(&db, "intuit_sync_log", "quickbooks_metadata")
            .await
            .expect("Failed to check quickbooks_metadata column"),
        "quickbooks_metadata column should exist after idempotent up"
    );
}

#[tokio::test]
async fn test_down_migration() {
    let db = get_test_db()
        .await
        .expect("Failed to connect to test database");
    let schema_manager = SchemaManager::new(&db);

    // Run up migration first
    Migration
        .up(&schema_manager)
        .await
        .expect("Failed to run up migration");

    // Run down migration
    Migration
        .down(&schema_manager)
        .await
        .expect("Failed to run down migration");

    // Verify all columns are removed
    assert!(
        !column_exists(&db, "intuit_sync_log", "change_direction")
            .await
            .expect("Failed to check change_direction column"),
        "change_direction column should be removed"
    );

    assert!(
        !column_exists(&db, "intuit_sync_log", "conflict_detected")
            .await
            .expect("Failed to check conflict_detected column"),
        "conflict_detected column should be removed"
    );

    assert!(
        !column_exists(&db, "intuit_sync_log", "conflict_resolution")
            .await
            .expect("Failed to check conflict_resolution column"),
        "conflict_resolution column should be removed"
    );

    assert!(
        !column_exists(&db, "intuit_sync_log", "pushed_count")
            .await
            .expect("Failed to check pushed_count column"),
        "pushed_count column should be removed"
    );

    assert!(
        !column_exists(&db, "intuit_sync_log", "pulled_count")
            .await
            .expect("Failed to check pulled_count column"),
        "pulled_count column should be removed"
    );

    assert!(
        !column_exists(&db, "intuit_sync_log", "updated_count")
            .await
            .expect("Failed to check updated_count column"),
        "updated_count column should be removed"
    );

    assert!(
        !column_exists(&db, "intuit_sync_log", "skipped_count")
            .await
            .expect("Failed to check skipped_count column"),
        "skipped_count column should be removed"
    );

    assert!(
        !column_exists(&db, "intuit_sync_log", "retry_count")
            .await
            .expect("Failed to check retry_count column"),
        "retry_count column should be removed"
    );

    assert!(
        !column_exists(&db, "intuit_sync_log", "next_retry_at")
            .await
            .expect("Failed to check next_retry_at column"),
        "next_retry_at column should be removed"
    );

    assert!(
        !column_exists(&db, "intuit_sync_log", "quickbooks_metadata")
            .await
            .expect("Failed to check quickbooks_metadata column"),
        "quickbooks_metadata column should be removed"
    );
}

#[tokio::test]
async fn test_idempotent_down_migration() {
    let db = get_test_db()
        .await
        .expect("Failed to connect to test database");
    let schema_manager = SchemaManager::new(&db);

    // Run up migration first
    Migration
        .up(&schema_manager)
        .await
        .expect("Failed to run up migration");

    // Run down migration twice
    Migration
        .down(&schema_manager)
        .await
        .expect("Failed to run first down migration");
    Migration
        .down(&schema_manager)
        .await
        .expect("Failed to run second down migration");

    // Verify columns are still removed (idempotent)
    assert!(
        !column_exists(&db, "intuit_sync_log", "change_direction")
            .await
            .expect("Failed to check change_direction column"),
        "change_direction column should remain removed after idempotent down"
    );

    assert!(
        !column_exists(&db, "intuit_sync_log", "quickbooks_metadata")
            .await
            .expect("Failed to check quickbooks_metadata column"),
        "quickbooks_metadata column should remain removed after idempotent down"
    );
}

#[tokio::test]
async fn test_full_migration_cycle() {
    let db = get_test_db()
        .await
        .expect("Failed to connect to test database");
    let schema_manager = SchemaManager::new(&db);

    // Run up migration
    Migration
        .up(&schema_manager)
        .await
        .expect("Failed to run up migration");

    // Verify columns exist
    assert!(
        column_exists(&db, "intuit_sync_log", "change_direction")
            .await
            .expect("Failed to check change_direction column"),
        "change_direction column should exist after up"
    );

    // Run down migration
    Migration
        .down(&schema_manager)
        .await
        .expect("Failed to run down migration");

    // Verify columns removed
    assert!(
        !column_exists(&db, "intuit_sync_log", "change_direction")
            .await
            .expect("Failed to check change_direction column"),
        "change_direction column should be removed after down"
    );

    // Run up migration again
    Migration
        .up(&schema_manager)
        .await
        .expect("Failed to run up migration again");

    // Verify columns exist again
    assert!(
        column_exists(&db, "intuit_sync_log", "change_direction")
            .await
            .expect("Failed to check change_direction column"),
        "change_direction column should exist after second up"
    );

    assert!(
        column_exists(&db, "intuit_sync_log", "quickbooks_metadata")
            .await
            .expect("Failed to check quickbooks_metadata column"),
        "quickbooks_metadata column should exist after second up"
    );
}
