//! Tests for m20251229_012_enhance_audit_trail migration

use sea_orm::{ConnectionTrait, Database, DatabaseConnection, DbBackend, DbErr, Statement};
use sea_orm_migration::prelude::*;

use hr_graphql_server::migration::m20251229_012_enhance_audit_trail::Migration;

fn get_test_db_url() -> String {
    std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgres://postgres:postgres@localhost:5432/test_db".to_string())
}

async fn setup() -> Result<DatabaseConnection, DbErr> {
    let db = Database::connect(get_test_db_url()).await?;
    let _ = db
        .execute(Statement::from_string(
            DbBackend::Postgres,
            "DROP TABLE IF EXISTS hr_public.sync_sessions CASCADE".to_string(),
        ))
        .await;
    Ok(db)
}

#[tokio::test]
async fn test_migration_name() {
    assert_eq!(Migration.name(), "m20251229_012_enhance_audit_trail");
}

#[tokio::test]
async fn test_up_migration_creates_table() -> Result<(), DbErr> {
    let db = setup().await?;
    let manager = SchemaManager::new(&db);
    Migration.up(&manager).await?;

    let result = db
        .query_one(Statement::from_string(
            DbBackend::Postgres,
            "SELECT EXISTS (SELECT FROM information_schema.tables
         WHERE table_schema = 'hr_public' AND table_name = 'sync_sessions')"
                .to_string(),
        ))
        .await?;

    let exists: bool = result.unwrap().try_get("", "exists")?;
    assert!(exists);

    Migration.down(&manager).await?;
    Ok(())
}

#[tokio::test]
async fn test_audit_logs_columns_added() -> Result<(), DbErr> {
    let db = setup().await?;
    let manager = SchemaManager::new(&db);
    Migration.up(&manager).await?;

    let columns = db
        .query_all(Statement::from_string(
            DbBackend::Postgres,
            "SELECT column_name FROM information_schema.columns
         WHERE table_schema = 'hr_public' AND table_name = 'audit_logs'
         AND column_name IN ('audit_id', 'previous_audit_id', 'audit_hash', 'entity_name')"
                .to_string(),
        ))
        .await?;

    assert_eq!(columns.len(), 4);

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
