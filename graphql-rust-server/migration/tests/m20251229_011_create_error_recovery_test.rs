//! Tests for m20251229_011_create_error_recovery migration

use sea_orm::{ConnectionTrait, Database, DatabaseConnection, DbBackend, DbErr, Statement};
use sea_orm_migration::prelude::*;

use hr_graphql_server::migration::m20251229_011_create_error_recovery::Migration;

fn get_test_db_url() -> String {
    std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgres://postgres:postgres@localhost:5432/test_db".to_string())
}

async fn setup() -> Result<DatabaseConnection, DbErr> {
    let db = Database::connect(get_test_db_url()).await?;
    let _ = db.execute(Statement::from_string(
        DbBackend::Postgres,
        "DROP TABLE IF EXISTS hr_public.retry_history CASCADE".to_string(),
    )).await;
    let _ = db.execute(Statement::from_string(
        DbBackend::Postgres,
        "DROP TABLE IF EXISTS hr_public.failed_operations CASCADE".to_string(),
    )).await;
    Ok(db)
}

#[tokio::test]
async fn test_migration_name() {
    assert_eq!(Migration.name(), "m20251229_011_create_error_recovery");
}

#[tokio::test]
async fn test_up_migration_creates_tables() -> Result<(), DbErr> {
    let db = setup().await?;
    let manager = SchemaManager::new(&db);
    Migration.up(&manager).await?;

    let result = db.query_one(Statement::from_string(
        DbBackend::Postgres,
        "SELECT COUNT(*) as count FROM information_schema.tables
         WHERE table_schema = 'hr_public'
         AND table_name IN ('failed_operations', 'retry_history')".to_string(),
    )).await?;

    let count: i64 = result.unwrap().try_get("", "count")?;
    assert_eq!(count, 2);

    Migration.down(&manager).await?;
    Ok(())
}

#[tokio::test]
async fn test_failed_operations_columns() -> Result<(), DbErr> {
    let db = setup().await?;
    let manager = SchemaManager::new(&db);
    Migration.up(&manager).await?;

    let columns = db.query_all(Statement::from_string(
        DbBackend::Postgres,
        "SELECT column_name FROM information_schema.columns
         WHERE table_schema = 'hr_public' AND table_name = 'failed_operations'".to_string(),
    )).await?;

    let column_names: Vec<String> = columns.iter()
        .map(|c| c.try_get("", "column_name").unwrap())
        .collect();

    assert!(column_names.contains(&"id".to_string()));
    assert!(column_names.contains(&"sync_log_id".to_string()));
    assert!(column_names.contains(&"error_type".to_string()));
    assert!(column_names.contains(&"retry_count".to_string()));
    assert!(column_names.contains(&"is_retryable".to_string()));
    assert!(column_names.contains(&"moved_to_dead_letter".to_string()));

    Migration.down(&manager).await?;
    Ok(())
}

#[tokio::test]
async fn test_indexes_created() -> Result<(), DbErr> {
    let db = setup().await?;
    let manager = SchemaManager::new(&db);
    Migration.up(&manager).await?;

    let indexes = db.query_all(Statement::from_string(
        DbBackend::Postgres,
        "SELECT indexname FROM pg_indexes
         WHERE schemaname = 'hr_public'
         AND tablename IN ('failed_operations', 'retry_history')
         AND indexname NOT LIKE '%_pkey'".to_string(),
    )).await?;

    let index_names: Vec<String> = indexes.iter()
        .map(|idx| idx.try_get("", "indexname").unwrap())
        .collect();

    assert!(index_names.contains(&"idx_failed_operations_status".to_string()));
    assert!(index_names.contains(&"idx_failed_operations_next_retry".to_string()));
    assert!(index_names.contains(&"idx_retry_history_operation".to_string()));

    Migration.down(&manager).await?;
    Ok(())
}

#[tokio::test]
async fn test_idempotent_up_migration() -> Result<(), DbErr> {
    let db = setup().await?;
    let manager = SchemaManager::new(&db);

    Migration.up(&manager).await?;
    let result = Migration.up(&manager).await;
    assert!(result.is_ok());

    Migration.down(&manager).await?;
    Ok(())
}

#[tokio::test]
async fn test_down_migration_removes_tables() -> Result<(), DbErr> {
    let db = setup().await?;
    let manager = SchemaManager::new(&db);

    Migration.up(&manager).await?;
    Migration.down(&manager).await?;

    let result = db.query_one(Statement::from_string(
        DbBackend::Postgres,
        "SELECT COUNT(*) as count FROM information_schema.tables
         WHERE table_schema = 'hr_public'
         AND table_name IN ('failed_operations', 'retry_history')".to_string(),
    )).await?;

    let count: i64 = result.unwrap().try_get("", "count")?;
    assert_eq!(count, 0);

    Ok(())
}
