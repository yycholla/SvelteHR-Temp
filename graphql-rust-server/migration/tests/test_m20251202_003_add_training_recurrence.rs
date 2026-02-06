//! Tests for m20251202_003_add_training_recurrence migration
//!
//! This migration adds recurrence support to the trainings table with RFC 5545 RRULE.
//! Tests verify columns, self-referential FK, SET NULL behavior, and idempotency.

use sea_orm::{ConnectionTrait, Database, DbBackend, DbErr, Statement};
use sea_orm_migration::prelude::*;

// Import the migration
use hr_graphql_server::migration::m20251202_003_add_training_recurrence::Migration;
use hr_graphql_server::migration::MigratorTrait;

/// Helper function to get test database URL from environment
fn get_test_db_url() -> String {
    std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgres://postgres:postgres@localhost:5432/hr_test".to_string())
}

/// Test that the migration compiles and can be instantiated
#[tokio::test]
async fn test_migration_compiles() {
    let _migration = Migration;
    assert!(true, "Migration struct compiles and instantiates");
}

/// Test up migration adds all 3 columns
#[tokio::test]
async fn test_up_adds_recurrence_columns() -> Result<(), DbErr> {
    let db = Database::connect(get_test_db_url()).await?;

    // Run migration
    let migration = Migration;
    let schema_manager = SchemaManager::new(&db);
    migration.up(&schema_manager).await?;

    // Verify all 3 columns exist
    let columns = db
        .query_all(Statement::from_string(
            DbBackend::Postgres,
            "SELECT column_name FROM information_schema.columns
             WHERE table_schema = 'hr_public'
             AND table_name = 'trainings'
             AND column_name IN ('rrule', 'recurrence_id', 'recurrence_end_date')
             ORDER BY column_name"
                .to_string(),
        ))
        .await?;

    assert_eq!(
        columns.len(),
        3,
        "Should have 3 new recurrence columns (recurrence_end_date, recurrence_id, rrule)"
    );

    // Verify column names
    let column_names: Vec<String> = columns
        .iter()
        .map(|row| row.try_get("", "column_name").unwrap())
        .collect();

    assert!(
        column_names.contains(&"rrule".to_string()),
        "Should have rrule column"
    );
    assert!(
        column_names.contains(&"recurrence_id".to_string()),
        "Should have recurrence_id column"
    );
    assert!(
        column_names.contains(&"recurrence_end_date".to_string()),
        "Should have recurrence_end_date column"
    );

    Ok(())
}

/// Test rrule column properties
#[tokio::test]
async fn test_rrule_column_properties() -> Result<(), DbErr> {
    let db = Database::connect(get_test_db_url()).await?;

    let migration = Migration;
    let schema_manager = SchemaManager::new(&db);
    migration.up(&schema_manager).await?;

    // Verify rrule properties
    let result = db
        .query_one(Statement::from_string(
            DbBackend::Postgres,
            "SELECT data_type, is_nullable FROM information_schema.columns
             WHERE table_schema = 'hr_public'
             AND table_name = 'trainings'
             AND column_name = 'rrule'"
                .to_string(),
        ))
        .await?
        .unwrap();

    let data_type: String = result.try_get("", "data_type")?;
    let is_nullable: String = result.try_get("", "is_nullable")?;

    assert_eq!(data_type, "text", "rrule should be TEXT type");
    assert_eq!(is_nullable, "YES", "rrule should be nullable");

    Ok(())
}

/// Test recurrence_id column properties
#[tokio::test]
async fn test_recurrence_id_column_properties() -> Result<(), DbErr> {
    let db = Database::connect(get_test_db_url()).await?;

    let migration = Migration;
    let schema_manager = SchemaManager::new(&db);
    migration.up(&schema_manager).await?;

    // Verify recurrence_id properties
    let result = db
        .query_one(Statement::from_string(
            DbBackend::Postgres,
            "SELECT data_type, is_nullable FROM information_schema.columns
             WHERE table_schema = 'hr_public'
             AND table_name = 'trainings'
             AND column_name = 'recurrence_id'"
                .to_string(),
        ))
        .await?
        .unwrap();

    let data_type: String = result.try_get("", "data_type")?;
    let is_nullable: String = result.try_get("", "is_nullable")?;

    assert_eq!(data_type, "uuid", "recurrence_id should be UUID type");
    assert_eq!(is_nullable, "YES", "recurrence_id should be nullable");

    Ok(())
}

/// Test recurrence_end_date column properties
#[tokio::test]
async fn test_recurrence_end_date_column_properties() -> Result<(), DbErr> {
    let db = Database::connect(get_test_db_url()).await?;

    let migration = Migration;
    let schema_manager = SchemaManager::new(&db);
    migration.up(&schema_manager).await?;

    // Verify recurrence_end_date properties
    let result = db
        .query_one(Statement::from_string(
            DbBackend::Postgres,
            "SELECT data_type, is_nullable FROM information_schema.columns
             WHERE table_schema = 'hr_public'
             AND table_name = 'trainings'
             AND column_name = 'recurrence_end_date'"
                .to_string(),
        ))
        .await?
        .unwrap();

    let data_type: String = result.try_get("", "data_type")?;
    let is_nullable: String = result.try_get("", "is_nullable")?;

    assert_eq!(
        data_type, "timestamp with time zone",
        "recurrence_end_date should be TIMESTAMPTZ type"
    );
    assert_eq!(
        is_nullable, "YES",
        "recurrence_end_date should be nullable"
    );

    Ok(())
}

/// Test self-referential foreign key constraint exists
#[tokio::test]
async fn test_foreign_key_constraint_exists() -> Result<(), DbErr> {
    let db = Database::connect(get_test_db_url()).await?;

    let migration = Migration;
    let schema_manager = SchemaManager::new(&db);
    migration.up(&schema_manager).await?;

    // Check for foreign key constraint
    let result = db
        .query_one(Statement::from_string(
            DbBackend::Postgres,
            "SELECT constraint_name, delete_rule FROM information_schema.table_constraints tc
             JOIN information_schema.referential_constraints rc ON tc.constraint_name = rc.constraint_name
             WHERE tc.table_schema = 'hr_public'
             AND tc.table_name = 'trainings'
             AND tc.constraint_type = 'FOREIGN KEY'
             AND tc.constraint_name = 'fk_trainings_recurrence_id'"
                .to_string(),
        ))
        .await?;

    assert!(
        result.is_some(),
        "Foreign key constraint fk_trainings_recurrence_id should exist"
    );

    let constraint_name: String = result.as_ref().unwrap().try_get("", "constraint_name")?;
    let delete_rule: String = result.unwrap().try_get("", "delete_rule")?;

    assert_eq!(
        constraint_name, "fk_trainings_recurrence_id",
        "Constraint should have correct name"
    );
    assert_eq!(
        delete_rule, "SET NULL",
        "Foreign key should have ON DELETE SET NULL"
    );

    Ok(())
}

/// Test self-referential foreign key points to same table
#[tokio::test]
async fn test_foreign_key_is_self_referential() -> Result<(), DbErr> {
    let db = Database::connect(get_test_db_url()).await?;

    let migration = Migration;
    let schema_manager = SchemaManager::new(&db);
    migration.up(&schema_manager).await?;

    // Verify FK references trainings.id
    let result = db
        .query_one(Statement::from_string(
            DbBackend::Postgres,
            "SELECT
                kcu.column_name,
                ccu.table_name AS foreign_table_name,
                ccu.column_name AS foreign_column_name
             FROM information_schema.table_constraints AS tc
             JOIN information_schema.key_column_usage AS kcu
               ON tc.constraint_name = kcu.constraint_name
               AND tc.table_schema = kcu.table_schema
             JOIN information_schema.constraint_column_usage AS ccu
               ON ccu.constraint_name = tc.constraint_name
               AND ccu.table_schema = tc.table_schema
             WHERE tc.constraint_type = 'FOREIGN KEY'
               AND tc.table_schema = 'hr_public'
               AND tc.table_name = 'trainings'
               AND tc.constraint_name = 'fk_trainings_recurrence_id'"
                .to_string(),
        ))
        .await?
        .unwrap();

    let column_name: String = result.try_get("", "column_name")?;
    let foreign_table_name: String = result.try_get("", "foreign_table_name")?;
    let foreign_column_name: String = result.try_get("", "foreign_column_name")?;

    assert_eq!(
        column_name, "recurrence_id",
        "FK should be on recurrence_id column"
    );
    assert_eq!(
        foreign_table_name, "trainings",
        "FK should reference trainings table (self-referential)"
    );
    assert_eq!(
        foreign_column_name, "id",
        "FK should reference id column"
    );

    Ok(())
}

/// Test index exists on recurrence_id
#[tokio::test]
async fn test_index_exists() -> Result<(), DbErr> {
    let db = Database::connect(get_test_db_url()).await?;

    let migration = Migration;
    let schema_manager = SchemaManager::new(&db);
    migration.up(&schema_manager).await?;

    // Check for index
    let result = db
        .query_one(Statement::from_string(
            DbBackend::Postgres,
            "SELECT indexname FROM pg_indexes
             WHERE schemaname = 'hr_public'
             AND tablename = 'trainings'
             AND indexname = 'idx_trainings_recurrence_id'"
                .to_string(),
        ))
        .await?;

    assert!(
        result.is_some(),
        "Index idx_trainings_recurrence_id should exist"
    );

    let index_name: String = result.unwrap().try_get("", "indexname")?;
    assert_eq!(
        index_name, "idx_trainings_recurrence_id",
        "Index should have correct name"
    );

    Ok(())
}

/// Test idempotency - running up migration twice doesn't error
#[tokio::test]
async fn test_up_migration_is_idempotent() -> Result<(), DbErr> {
    let db = Database::connect(get_test_db_url()).await?;

    let migration = Migration;
    let schema_manager = SchemaManager::new(&db);

    // Run migration twice
    migration.up(&schema_manager).await?;
    let result = migration.up(&schema_manager).await;

    assert!(
        result.is_ok(),
        "Up migration should succeed when run twice (idempotent)"
    );

    // Verify still only 3 columns (not duplicated)
    let columns = db
        .query_all(Statement::from_string(
            DbBackend::Postgres,
            "SELECT column_name FROM information_schema.columns
             WHERE table_schema = 'hr_public'
             AND table_name = 'trainings'
             AND column_name IN ('rrule', 'recurrence_id', 'recurrence_end_date')"
                .to_string(),
        ))
        .await?;

    assert_eq!(
        columns.len(),
        3,
        "Should still have exactly 3 columns after running migration twice"
    );

    Ok(())
}

/// Test down migration removes all components
#[tokio::test]
async fn test_down_removes_all_components() -> Result<(), DbErr> {
    let db = Database::connect(get_test_db_url()).await?;

    let migration = Migration;
    let schema_manager = SchemaManager::new(&db);

    // Run up then down
    migration.up(&schema_manager).await?;
    migration.down(&schema_manager).await?;

    // Verify all 3 columns removed
    let columns = db
        .query_all(Statement::from_string(
            DbBackend::Postgres,
            "SELECT column_name FROM information_schema.columns
             WHERE table_schema = 'hr_public'
             AND table_name = 'trainings'
             AND column_name IN ('rrule', 'recurrence_id', 'recurrence_end_date')"
                .to_string(),
        ))
        .await?;

    assert_eq!(
        columns.len(),
        0,
        "All 3 columns should be removed after down migration"
    );

    // Verify foreign key removed
    let fk_result = db
        .query_all(Statement::from_string(
            DbBackend::Postgres,
            "SELECT constraint_name FROM information_schema.table_constraints
             WHERE table_schema = 'hr_public'
             AND table_name = 'trainings'
             AND constraint_type = 'FOREIGN KEY'
             AND constraint_name = 'fk_trainings_recurrence_id'"
                .to_string(),
        ))
        .await?;

    assert_eq!(
        fk_result.len(),
        0,
        "Foreign key constraint should be removed after down migration"
    );

    // Verify index removed
    let index_result = db
        .query_all(Statement::from_string(
            DbBackend::Postgres,
            "SELECT indexname FROM pg_indexes
             WHERE schemaname = 'hr_public'
             AND tablename = 'trainings'
             AND indexname = 'idx_trainings_recurrence_id'"
                .to_string(),
        ))
        .await?;

    assert_eq!(
        index_result.len(),
        0,
        "Index should be removed after down migration"
    );

    Ok(())
}

/// Test down migration is idempotent
#[tokio::test]
async fn test_down_migration_is_idempotent() -> Result<(), DbErr> {
    let db = Database::connect(get_test_db_url()).await?;

    let migration = Migration;
    let schema_manager = SchemaManager::new(&db);

    // Run up, then down twice
    migration.up(&schema_manager).await?;
    migration.down(&schema_manager).await?;
    let result = migration.down(&schema_manager).await;

    assert!(
        result.is_ok(),
        "Down migration should succeed even when run twice (idempotent)"
    );

    Ok(())
}

/// Test full migration cycle (up -> down -> up)
#[tokio::test]
async fn test_full_migration_cycle() -> Result<(), DbErr> {
    let db = Database::connect(get_test_db_url()).await?;

    let migration = Migration;
    let schema_manager = SchemaManager::new(&db);

    // Run up -> down -> up
    migration.up(&schema_manager).await?;
    migration.down(&schema_manager).await?;
    migration.up(&schema_manager).await?;

    // Verify all 3 columns exist after full cycle
    let columns = db
        .query_all(Statement::from_string(
            DbBackend::Postgres,
            "SELECT column_name FROM information_schema.columns
             WHERE table_schema = 'hr_public'
             AND table_name = 'trainings'
             AND column_name IN ('rrule', 'recurrence_id', 'recurrence_end_date')
             ORDER BY column_name"
                .to_string(),
        ))
        .await?;

    assert_eq!(
        columns.len(),
        3,
        "All 3 columns should exist after full migration cycle"
    );

    // Verify FK and index recreated
    let fk_exists = db
        .query_one(Statement::from_string(
            DbBackend::Postgres,
            "SELECT 1 FROM information_schema.table_constraints
             WHERE table_schema = 'hr_public'
             AND table_name = 'trainings'
             AND constraint_name = 'fk_trainings_recurrence_id'"
                .to_string(),
        ))
        .await?;

    assert!(
        fk_exists.is_some(),
        "Foreign key should exist after full cycle"
    );

    let index_exists = db
        .query_one(Statement::from_string(
            DbBackend::Postgres,
            "SELECT 1 FROM pg_indexes
             WHERE schemaname = 'hr_public'
             AND tablename = 'trainings'
             AND indexname = 'idx_trainings_recurrence_id'"
                .to_string(),
        ))
        .await?;

    assert!(index_exists.is_some(), "Index should exist after full cycle");

    Ok(())
}
