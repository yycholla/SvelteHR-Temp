//! Tests for m20251230_001_create_time_entries migration

use sea_orm::{ConnectionTrait, Database, DatabaseConnection, DbBackend, DbErr, Statement};
use sea_orm_migration::prelude::*;

mod m20251230_001_create_time_entries;
use m20251230_001_create_time_entries::Migration;

fn get_test_db_url() -> String {
    std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgres://postgres:postgres@localhost:5432/test_db".to_string())
}

async fn setup() -> Result<DatabaseConnection, DbErr> {
    let db = Database::connect(get_test_db_url()).await?;
    let _ = db.execute(Statement::from_string(DbBackend::Postgres, "DROP TABLE IF EXISTS hr_public.time_entries CASCADE".to_string())).await;
    let _ = db.execute(Statement::from_string(DbBackend::Postgres, "DROP TABLE IF EXISTS hr_public.projects CASCADE".to_string())).await;
    Ok(db)
}

#[tokio::test]
async fn test_migration_name() {
    assert_eq!(Migration.name(), "m20251230_001_create_time_entries");
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
         AND table_name IN ('projects', 'time_entries')".to_string(),
    )).await?;

    let count: i64 = result.unwrap().try_get("", "count")?;
    assert_eq!(count, 2);

    Migration.down(&manager).await?;
    Ok(())
}

#[tokio::test]
async fn test_time_entries_columns() -> Result<(), DbErr> {
    let db = setup().await?;
    let manager = SchemaManager::new(&db);
    Migration.up(&manager).await?;

    let columns = db.query_all(Statement::from_string(
        DbBackend::Postgres,
        "SELECT column_name FROM information_schema.columns
         WHERE table_schema = 'hr_public' AND table_name = 'time_entries'".to_string(),
    )).await?;

    let column_names: Vec<String> = columns.iter()
        .map(|c| c.try_get("", "column_name").unwrap())
        .collect();

    assert!(column_names.contains(&"id".to_string()));
    assert!(column_names.contains(&"user_id".to_string()));
    assert!(column_names.contains(&"hours".to_string()));
    assert!(column_names.contains(&"is_billable".to_string()));
    assert!(column_names.contains(&"quickbooks_time_activity_id".to_string()));

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
         AND tablename IN ('projects', 'time_entries')
         AND indexname NOT LIKE '%_pkey'".to_string(),
    )).await?;

    let index_names: Vec<String> = indexes.iter()
        .map(|idx| idx.try_get("", "indexname").unwrap())
        .collect();

    assert!(index_names.contains(&"idx_projects_code".to_string()));
    assert!(index_names.contains(&"idx_time_entries_user_date".to_string()));
    assert!(index_names.contains(&"idx_time_entries_project".to_string()));

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
