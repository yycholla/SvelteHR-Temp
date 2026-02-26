//! Tests for m20251229_013_create_compliance_reports migration

use sea_orm::{ConnectionTrait, Database, DatabaseConnection, DbBackend, DbErr, Statement};
use sea_orm_migration::prelude::*;

use hr_graphql_server::migration::m20251229_013_create_compliance_reports::Migration;

fn get_test_db_url() -> String {
    std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgres://postgres:postgres@localhost:5432/test_db".to_string())
}

async fn setup() -> Result<DatabaseConnection, DbErr> {
    let db = Database::connect(get_test_db_url()).await?;
    let _ = db
        .execute(Statement::from_string(
            DbBackend::Postgres,
            "DROP TABLE IF EXISTS hr_public.report_schedules CASCADE".to_string(),
        ))
        .await;
    let _ = db
        .execute(Statement::from_string(
            DbBackend::Postgres,
            "DROP TABLE IF EXISTS hr_public.compliance_reports CASCADE".to_string(),
        ))
        .await;
    Ok(db)
}

#[tokio::test]
async fn test_migration_name() {
    assert_eq!(Migration.name(), "m20251229_013_create_compliance_reports");
}

#[tokio::test]
async fn test_up_migration_creates_tables() -> Result<(), DbErr> {
    let db = setup().await?;
    let manager = SchemaManager::new(&db);
    let migration = Migration;

    migration.up(&manager).await?;

    let result = db
        .query_one(Statement::from_string(
            DbBackend::Postgres,
            "SELECT COUNT(*) as count FROM information_schema.tables
         WHERE table_schema = 'hr_public'
         AND table_name IN ('compliance_reports', 'report_schedules')"
                .to_string(),
        ))
        .await?;

    let count: i64 = result.unwrap().try_get("", "count")?;
    assert_eq!(count, 2);

    migration.down(&manager).await?;
    Ok(())
}
