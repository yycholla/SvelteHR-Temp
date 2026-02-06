//! Tests for m20251229_010_create_rollback_system migration
//!
//! Verifies rollback system infrastructure including:
//! - sync_snapshots table (entity state snapshots)
//! - rollback_operations table (rollback audit trail)
//! - Foreign keys to intuit_sync_log
//! - Indexes for entity lookup and rollback status
//! - Check constraints for operation types and statuses
//! - Idempotent up/down migrations

use sea_orm::{ConnectionTrait, Database, DatabaseConnection, DbBackend, DbErr, Statement};
use sea_orm_migration::prelude::*;

/// Migration module being tested
mod m20251229_010_create_rollback_system;
use m20251229_010_create_rollback_system::Migration;

/// Test database URL from environment
fn get_test_db_url() -> String {
    std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgres://postgres:postgres@localhost:5432/test_db".to_string())
}

/// Setup test database connection
async fn setup() -> Result<DatabaseConnection, DbErr> {
    let db = Database::connect(get_test_db_url()).await?;

    // Clean up any existing test tables
    let _ = db.execute(Statement::from_string(
        DbBackend::Postgres,
        "DROP TABLE IF EXISTS hr_public.rollback_operations CASCADE".to_string(),
    )).await;

    let _ = db.execute(Statement::from_string(
        DbBackend::Postgres,
        "DROP TABLE IF EXISTS hr_public.sync_snapshots CASCADE".to_string(),
    )).await;

    Ok(db)
}

#[tokio::test]
async fn test_migration_name() {
    let migration = Migration;
    let name = migration.name();
    assert_eq!(name, "m20251229_010_create_rollback_system");
}

#[tokio::test]
async fn test_up_migration_creates_tables() -> Result<(), DbErr> {
    let db = setup().await?;
    let manager = SchemaManager::new(&db);

    // Run up migration
    Migration.up(&manager).await?;

    // Verify sync_snapshots table exists
    let result = db.query_one(Statement::from_string(
        DbBackend::Postgres,
        "SELECT EXISTS (
            SELECT FROM information_schema.tables
            WHERE table_schema = 'hr_public'
            AND table_name = 'sync_snapshots'
        )".to_string(),
    )).await?;

    assert!(result.is_some());
    let exists: bool = result.unwrap().try_get("", "exists")?;
    assert!(exists, "sync_snapshots table should exist after up migration");

    // Verify rollback_operations table exists
    let result = db.query_one(Statement::from_string(
        DbBackend::Postgres,
        "SELECT EXISTS (
            SELECT FROM information_schema.tables
            WHERE table_schema = 'hr_public'
            AND table_name = 'rollback_operations'
        )".to_string(),
    )).await?;

    assert!(result.is_some());
    let exists: bool = result.unwrap().try_get("", "exists")?;
    assert!(exists, "rollback_operations table should exist after up migration");

    // Cleanup
    Migration.down(&manager).await?;

    Ok(())
}

#[tokio::test]
async fn test_sync_snapshots_columns() -> Result<(), DbErr> {
    let db = setup().await?;
    let manager = SchemaManager::new(&db);

    Migration.up(&manager).await?;

    // Verify all required columns exist with correct types
    let columns = db.query_all(Statement::from_string(
        DbBackend::Postgres,
        "SELECT column_name, data_type, is_nullable, column_default
         FROM information_schema.columns
         WHERE table_schema = 'hr_public' AND table_name = 'sync_snapshots'
         ORDER BY ordinal_position".to_string(),
    )).await?;

    assert!(!columns.is_empty(), "sync_snapshots should have columns");

    // Check for key columns
    let column_names: Vec<String> = columns.iter()
        .map(|c| c.try_get("", "column_name").unwrap())
        .collect();

    assert!(column_names.contains(&"id".to_string()));
    assert!(column_names.contains(&"sync_log_id".to_string()));
    assert!(column_names.contains(&"entity_type".to_string()));
    assert!(column_names.contains(&"entity_id".to_string()));
    assert!(column_names.contains(&"operation_type".to_string()));
    assert!(column_names.contains(&"snapshot_type".to_string()));
    assert!(column_names.contains(&"data_snapshot".to_string()));
    assert!(column_names.contains(&"can_rollback".to_string()));
    assert!(column_names.contains(&"created_at".to_string()));

    Migration.down(&manager).await?;

    Ok(())
}

#[tokio::test]
async fn test_rollback_operations_columns() -> Result<(), DbErr> {
    let db = setup().await?;
    let manager = SchemaManager::new(&db);

    Migration.up(&manager).await?;

    // Verify all required columns exist
    let columns = db.query_all(Statement::from_string(
        DbBackend::Postgres,
        "SELECT column_name, data_type, is_nullable
         FROM information_schema.columns
         WHERE table_schema = 'hr_public' AND table_name = 'rollback_operations'
         ORDER BY ordinal_position".to_string(),
    )).await?;

    let column_names: Vec<String> = columns.iter()
        .map(|c| c.try_get("", "column_name").unwrap())
        .collect();

    assert!(column_names.contains(&"id".to_string()));
    assert!(column_names.contains(&"snapshot_id".to_string()));
    assert!(column_names.contains(&"sync_log_id".to_string()));
    assert!(column_names.contains(&"rollback_type".to_string()));
    assert!(column_names.contains(&"status".to_string()));
    assert!(column_names.contains(&"affected_entities".to_string()));
    assert!(column_names.contains(&"successful_rollbacks".to_string()));
    assert!(column_names.contains(&"failed_rollbacks".to_string()));
    assert!(column_names.contains(&"triggered_by".to_string()));
    assert!(column_names.contains(&"triggered_by_email".to_string()));
    assert!(column_names.contains(&"created_at".to_string()));

    Migration.down(&manager).await?;

    Ok(())
}

#[tokio::test]
async fn test_foreign_keys_created() -> Result<(), DbErr> {
    let db = setup().await?;
    let manager = SchemaManager::new(&db);

    Migration.up(&manager).await?;

    // Check foreign keys
    let fks = db.query_all(Statement::from_string(
        DbBackend::Postgres,
        "SELECT constraint_name, table_name
         FROM information_schema.table_constraints
         WHERE table_schema = 'hr_public'
         AND constraint_type = 'FOREIGN KEY'
         AND table_name IN ('sync_snapshots', 'rollback_operations')".to_string(),
    )).await?;

    let fk_names: Vec<String> = fks.iter()
        .map(|fk| fk.try_get("", "constraint_name").unwrap())
        .collect();

    assert!(fk_names.contains(&"fk_sync_snapshots_sync_log".to_string()));
    assert!(fk_names.contains(&"fk_rollback_operations_snapshot".to_string()));
    assert!(fk_names.contains(&"fk_rollback_operations_sync_log".to_string()));

    Migration.down(&manager).await?;

    Ok(())
}

#[tokio::test]
async fn test_indexes_created() -> Result<(), DbErr> {
    let db = setup().await?;
    let manager = SchemaManager::new(&db);

    Migration.up(&manager).await?;

    // Check indexes
    let indexes = db.query_all(Statement::from_string(
        DbBackend::Postgres,
        "SELECT indexname, tablename
         FROM pg_indexes
         WHERE schemaname = 'hr_public'
         AND tablename IN ('sync_snapshots', 'rollback_operations')
         AND indexname NOT LIKE '%_pkey'".to_string(),
    )).await?;

    let index_names: Vec<String> = indexes.iter()
        .map(|idx| idx.try_get("", "indexname").unwrap())
        .collect();

    assert!(index_names.contains(&"idx_sync_snapshots_entity".to_string()));
    assert!(index_names.contains(&"idx_sync_snapshots_sync_log_id".to_string()));
    assert!(index_names.contains(&"idx_sync_snapshots_can_rollback".to_string()));
    assert!(index_names.contains(&"idx_rollback_operations_status".to_string()));
    assert!(index_names.contains(&"idx_rollback_operations_snapshot_id".to_string()));

    Migration.down(&manager).await?;

    Ok(())
}

#[tokio::test]
async fn test_check_constraints_added() -> Result<(), DbErr> {
    let db = setup().await?;
    let manager = SchemaManager::new(&db);

    Migration.up(&manager).await?;

    // Verify CHECK constraints exist
    let constraints = db.query_all(Statement::from_string(
        DbBackend::Postgres,
        "SELECT conname, conrelid::regclass::text as table_name
         FROM pg_constraint
         WHERE contype = 'c'
         AND connamespace = 'hr_public'::regnamespace
         AND conrelid::regclass::text IN ('hr_public.sync_snapshots', 'hr_public.rollback_operations')".to_string(),
    )).await?;

    let constraint_names: Vec<String> = constraints.iter()
        .map(|c| c.try_get("", "conname").unwrap())
        .collect();

    assert!(constraint_names.contains(&"check_snapshot_operation_type".to_string()));
    assert!(constraint_names.contains(&"check_snapshot_type".to_string()));
    assert!(constraint_names.contains(&"check_rollback_type".to_string()));
    assert!(constraint_names.contains(&"check_rollback_status".to_string()));

    Migration.down(&manager).await?;

    Ok(())
}

#[tokio::test]
async fn test_default_values() -> Result<(), DbErr> {
    let db = setup().await?;
    let manager = SchemaManager::new(&db);

    Migration.up(&manager).await?;

    // Check default values for sync_snapshots
    let defaults = db.query_all(Statement::from_string(
        DbBackend::Postgres,
        "SELECT column_name, column_default
         FROM information_schema.columns
         WHERE table_schema = 'hr_public'
         AND table_name = 'sync_snapshots'
         AND column_default IS NOT NULL".to_string(),
    )).await?;

    let defaults_map: std::collections::HashMap<String, String> = defaults.iter()
        .map(|d| (
            d.try_get("", "column_name").unwrap(),
            d.try_get("", "column_default").unwrap()
        ))
        .collect();

    // Verify snapshot_type default
    assert!(defaults_map.contains_key("snapshot_type"));
    assert!(defaults_map.get("snapshot_type").unwrap().contains("before"));

    // Verify can_rollback default
    assert!(defaults_map.contains_key("can_rollback"));
    assert!(defaults_map.get("can_rollback").unwrap().contains("true"));

    Migration.down(&manager).await?;

    Ok(())
}

#[tokio::test]
async fn test_idempotent_up_migration() -> Result<(), DbErr> {
    let db = setup().await?;
    let manager = SchemaManager::new(&db);

    // Run migration twice
    Migration.up(&manager).await?;
    let result = Migration.up(&manager).await;

    // Should not error on second run
    assert!(result.is_ok(), "Up migration should be idempotent");

    // Verify tables still exist
    let result = db.query_one(Statement::from_string(
        DbBackend::Postgres,
        "SELECT COUNT(*) as count FROM information_schema.tables
         WHERE table_schema = 'hr_public'
         AND table_name IN ('sync_snapshots', 'rollback_operations')".to_string(),
    )).await?;

    let count: i64 = result.unwrap().try_get("", "count")?;
    assert_eq!(count, 2, "Both tables should exist after idempotent up");

    Migration.down(&manager).await?;

    Ok(())
}

#[tokio::test]
async fn test_down_migration_removes_tables() -> Result<(), DbErr> {
    let db = setup().await?;
    let manager = SchemaManager::new(&db);

    // Run up then down
    Migration.up(&manager).await?;
    Migration.down(&manager).await?;

    // Verify tables are removed
    let result = db.query_one(Statement::from_string(
        DbBackend::Postgres,
        "SELECT COUNT(*) as count FROM information_schema.tables
         WHERE table_schema = 'hr_public'
         AND table_name IN ('sync_snapshots', 'rollback_operations')".to_string(),
    )).await?;

    let count: i64 = result.unwrap().try_get("", "count")?;
    assert_eq!(count, 0, "Tables should be removed after down migration");

    Ok(())
}

#[tokio::test]
async fn test_idempotent_down_migration() -> Result<(), DbErr> {
    let db = setup().await?;
    let manager = SchemaManager::new(&db);

    // Run up migration first
    Migration.up(&manager).await?;

    // Run down migration twice
    Migration.down(&manager).await?;
    let result = Migration.down(&manager).await;

    // Should not error on second run
    assert!(result.is_ok(), "Down migration should be idempotent");

    Ok(())
}

#[tokio::test]
async fn test_full_migration_cycle() -> Result<(), DbErr> {
    let db = setup().await?;
    let manager = SchemaManager::new(&db);

    // Up migration
    Migration.up(&manager).await?;

    // Verify tables exist
    let result = db.query_one(Statement::from_string(
        DbBackend::Postgres,
        "SELECT COUNT(*) as count FROM information_schema.tables
         WHERE table_schema = 'hr_public'
         AND table_name IN ('sync_snapshots', 'rollback_operations')".to_string(),
    )).await?;

    let count: i64 = result.unwrap().try_get("", "count")?;
    assert_eq!(count, 2, "Tables should exist after up migration");

    // Down migration
    Migration.down(&manager).await?;

    // Verify tables are removed
    let result = db.query_one(Statement::from_string(
        DbBackend::Postgres,
        "SELECT COUNT(*) as count FROM information_schema.tables
         WHERE table_schema = 'hr_public'
         AND table_name IN ('sync_snapshots', 'rollback_operations')".to_string(),
    )).await?;

    let count: i64 = result.unwrap().try_get("", "count")?;
    assert_eq!(count, 0, "Tables should be removed after down migration");

    // Up migration again
    Migration.up(&manager).await?;

    // Verify tables exist again
    let result = db.query_one(Statement::from_string(
        DbBackend::Postgres,
        "SELECT COUNT(*) as count FROM information_schema.tables
         WHERE table_schema = 'hr_public'
         AND table_name IN ('sync_snapshots', 'rollback_operations')".to_string(),
    )).await?;

    let count: i64 = result.unwrap().try_get("", "count")?;
    assert_eq!(count, 2, "Tables should exist after second up migration");

    // Final cleanup
    Migration.down(&manager).await?;

    Ok(())
}

#[tokio::test]
async fn test_table_comments_added() -> Result<(), DbErr> {
    let db = setup().await?;
    let manager = SchemaManager::new(&db);

    Migration.up(&manager).await?;

    // Check table comments
    let comments = db.query_all(Statement::from_string(
        DbBackend::Postgres,
        "SELECT c.relname as table_name, d.description
         FROM pg_class c
         JOIN pg_namespace n ON n.oid = c.relnamespace
         LEFT JOIN pg_description d ON d.objoid = c.oid AND d.objsubid = 0
         WHERE n.nspname = 'hr_public'
         AND c.relname IN ('sync_snapshots', 'rollback_operations')
         AND d.description IS NOT NULL".to_string(),
    )).await?;

    assert!(!comments.is_empty(), "Table comments should exist");

    let table_names: Vec<String> = comments.iter()
        .map(|c| c.try_get("", "table_name").unwrap())
        .collect();

    assert!(table_names.contains(&"sync_snapshots".to_string()));
    assert!(table_names.contains(&"rollback_operations".to_string()));

    Migration.down(&manager).await?;

    Ok(())
}

#[tokio::test]
async fn test_primary_keys_created() -> Result<(), DbErr> {
    let db = setup().await?;
    let manager = SchemaManager::new(&db);

    Migration.up(&manager).await?;

    // Verify primary keys exist
    let pks = db.query_all(Statement::from_string(
        DbBackend::Postgres,
        "SELECT constraint_name, table_name
         FROM information_schema.table_constraints
         WHERE table_schema = 'hr_public'
         AND constraint_type = 'PRIMARY KEY'
         AND table_name IN ('sync_snapshots', 'rollback_operations')".to_string(),
    )).await?;

    assert_eq!(pks.len(), 2, "Both tables should have primary keys");

    let table_names: Vec<String> = pks.iter()
        .map(|pk| pk.try_get("", "table_name").unwrap())
        .collect();

    assert!(table_names.contains(&"sync_snapshots".to_string()));
    assert!(table_names.contains(&"rollback_operations".to_string()));

    Migration.down(&manager).await?;

    Ok(())
}
