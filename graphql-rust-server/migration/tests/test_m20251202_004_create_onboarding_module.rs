//! Tests for m20251202_004_create_onboarding_module migration
//!
//! This migration creates a comprehensive onboarding system with 7 tables, 3 ENUMs, and 8 indexes.
//! Tests verify table creation, foreign keys, indexes, ENUMs, and idempotency.

use sea_orm::{ConnectionTrait, Database, DbBackend, DbErr, Statement};
use sea_orm_migration::prelude::*;

// Import the migration
use migration::m20251202_004_create_onboarding_module::Migration;
use migration::MigratorTrait;

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

/// Test up migration creates 3 PostgreSQL ENUMs
#[tokio::test]
async fn test_up_creates_enums() -> Result<(), DbErr> {
    let db = Database::connect(get_test_db_url()).await?;

    let migration = Migration;
    let schema_manager = SchemaManager::new(&db);
    migration.up(&schema_manager).await?;

    // Verify 3 ENUMs exist
    let result = db
        .query_all(Statement::from_string(
            DbBackend::Postgres,
            "SELECT typname FROM pg_type
             WHERE typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'hr_public')
             AND typtype = 'e'
             AND typname IN ('onboarding_content_type', 'form_field_type', 'onboarding_progress_status')
             ORDER BY typname"
                .to_string(),
        ))
        .await?;

    assert_eq!(
        result.len(),
        3,
        "Should have 3 ENUMs (form_field_type, onboarding_content_type, onboarding_progress_status)"
    );

    Ok(())
}

/// Test up migration creates all 7 tables
#[tokio::test]
async fn test_up_creates_all_tables() -> Result<(), DbErr> {
    let db = Database::connect(get_test_db_url()).await?;

    let migration = Migration;
    let schema_manager = SchemaManager::new(&db);
    migration.up(&schema_manager).await?;

    // Verify all 7 tables exist
    let tables = db
        .query_all(Statement::from_string(
            DbBackend::Postgres,
            "SELECT table_name FROM information_schema.tables
             WHERE table_schema = 'hr_public'
             AND table_name LIKE 'onboarding_%'
             ORDER BY table_name"
                .to_string(),
        ))
        .await?;

    assert_eq!(
        tables.len(),
        7,
        "Should have 7 onboarding tables"
    );

    // Verify table names
    let table_names: Vec<String> = tables
        .iter()
        .map(|row| row.try_get("", "table_name").unwrap())
        .collect();

    assert!(table_names.contains(&"onboarding_modules".to_string()));
    assert!(table_names.contains(&"onboarding_form_templates".to_string()));
    assert!(table_names.contains(&"onboarding_content_blocks".to_string()));
    assert!(table_names.contains(&"onboarding_assignments".to_string()));
    assert!(table_names.contains(&"onboarding_progress".to_string()));
    assert!(table_names.contains(&"onboarding_form_submissions".to_string()));
    assert!(table_names.contains(&"onboarding_document_uploads".to_string()));

    Ok(())
}

/// Test onboarding_modules table structure
#[tokio::test]
async fn test_onboarding_modules_table() -> Result<(), DbErr> {
    let db = Database::connect(get_test_db_url()).await?;

    let migration = Migration;
    let schema_manager = SchemaManager::new(&db);
    migration.up(&schema_manager).await?;

    // Verify column count
    let columns = db
        .query_all(Statement::from_string(
            DbBackend::Postgres,
            "SELECT column_name FROM information_schema.columns
             WHERE table_schema = 'hr_public'
             AND table_name = 'onboarding_modules'
             ORDER BY ordinal_position"
                .to_string(),
        ))
        .await?;

    assert_eq!(
        columns.len(),
        9,
        "onboarding_modules should have 9 columns"
    );

    // Verify tags column is array type
    let tags_type = db
        .query_one(Statement::from_string(
            DbBackend::Postgres,
            "SELECT data_type FROM information_schema.columns
             WHERE table_schema = 'hr_public'
             AND table_name = 'onboarding_modules'
             AND column_name = 'tags'"
                .to_string(),
        ))
        .await?
        .unwrap()
        .try_get::<String>("", "data_type")?;

    assert_eq!(tags_type, "ARRAY", "tags column should be array type");

    Ok(())
}

/// Test onboarding_form_templates table has JSONB fields column
#[tokio::test]
async fn test_form_templates_jsonb_column() -> Result<(), DbErr> {
    let db = Database::connect(get_test_db_url()).await?;

    let migration = Migration;
    let schema_manager = SchemaManager::new(&db);
    migration.up(&schema_manager).await?;

    // Verify fields column is JSONB
    let result = db
        .query_one(Statement::from_string(
            DbBackend::Postgres,
            "SELECT data_type, is_nullable FROM information_schema.columns
             WHERE table_schema = 'hr_public'
             AND table_name = 'onboarding_form_templates'
             AND column_name = 'fields'"
                .to_string(),
        ))
        .await?
        .unwrap();

    let data_type: String = result.try_get("", "data_type")?;
    let is_nullable: String = result.try_get("", "is_nullable")?;

    assert_eq!(data_type, "jsonb", "fields column should be JSONB type");
    assert_eq!(is_nullable, "NO", "fields column should be NOT NULL");

    Ok(())
}

/// Test onboarding_content_blocks table has polymorphic design
#[tokio::test]
async fn test_content_blocks_polymorphic_fields() -> Result<(), DbErr> {
    let db = Database::connect(get_test_db_url()).await?;

    let migration = Migration;
    let schema_manager = SchemaManager::new(&db);
    migration.up(&schema_manager).await?;

    // Verify type-specific columns exist
    let type_columns = db
        .query_all(Statement::from_string(
            DbBackend::Postgres,
            "SELECT column_name FROM information_schema.columns
             WHERE table_schema = 'hr_public'
             AND table_name = 'onboarding_content_blocks'
             AND column_name IN ('text_content', 'document_url', 'form_template_id', 'file_upload_requirements', 'signature_requirements')
             ORDER BY column_name"
                .to_string(),
        ))
        .await?;

    assert_eq!(
        type_columns.len(),
        5,
        "Should have 5 type-specific columns for polymorphic design"
    );

    Ok(())
}

/// Test foreign key constraints exist
#[tokio::test]
async fn test_foreign_key_constraints() -> Result<(), DbErr> {
    let db = Database::connect(get_test_db_url()).await?;

    let migration = Migration;
    let schema_manager = SchemaManager::new(&db);
    migration.up(&schema_manager).await?;

    // Count foreign key constraints on onboarding tables
    let fk_count = db
        .query_one(Statement::from_string(
            DbBackend::Postgres,
            "SELECT COUNT(*) as count FROM information_schema.table_constraints
             WHERE constraint_type = 'FOREIGN KEY'
             AND table_schema = 'hr_public'
             AND table_name LIKE 'onboarding_%'"
                .to_string(),
        ))
        .await?
        .unwrap()
        .try_get::<i64>("", "count")?;

    assert_eq!(
        fk_count, 15,
        "Should have 15 foreign key constraints across all tables"
    );

    Ok(())
}

/// Test CASCADE vs SET NULL foreign key strategies
#[tokio::test]
async fn test_foreign_key_delete_strategies() -> Result<(), DbErr> {
    let db = Database::connect(get_test_db_url()).await?;

    let migration = Migration;
    let schema_manager = SchemaManager::new(&db);
    migration.up(&schema_manager).await?;

    // Verify CASCADE foreign keys
    let cascade_fks = db
        .query_all(Statement::from_string(
            DbBackend::Postgres,
            "SELECT constraint_name FROM information_schema.table_constraints tc
             JOIN information_schema.referential_constraints rc ON tc.constraint_name = rc.constraint_name
             WHERE tc.table_schema = 'hr_public'
             AND tc.constraint_type = 'FOREIGN KEY'
             AND rc.delete_rule = 'CASCADE'
             AND tc.table_name LIKE 'onboarding_%'"
                .to_string(),
        ))
        .await?;

    assert!(
        cascade_fks.len() > 0,
        "Should have CASCADE foreign keys for child record deletion"
    );

    // Verify SET NULL foreign keys
    let set_null_fks = db
        .query_all(Statement::from_string(
            DbBackend::Postgres,
            "SELECT constraint_name FROM information_schema.table_constraints tc
             JOIN information_schema.referential_constraints rc ON tc.constraint_name = rc.constraint_name
             WHERE tc.table_schema = 'hr_public'
             AND tc.constraint_type = 'FOREIGN KEY'
             AND rc.delete_rule = 'SET NULL'
             AND tc.table_name LIKE 'onboarding_%'"
                .to_string(),
        ))
        .await?;

    assert!(
        set_null_fks.len() > 0,
        "Should have SET NULL foreign keys for preserving records"
    );

    Ok(())
}

/// Test all 8 indexes were created
#[tokio::test]
async fn test_indexes_created() -> Result<(), DbErr> {
    let db = Database::connect(get_test_db_url()).await?;

    let migration = Migration;
    let schema_manager = SchemaManager::new(&db);
    migration.up(&schema_manager).await?;

    // Count indexes on onboarding tables (excluding primary key indexes)
    let indexes = db
        .query_all(Statement::from_string(
            DbBackend::Postgres,
            "SELECT indexname FROM pg_indexes
             WHERE schemaname = 'hr_public'
             AND tablename LIKE 'onboarding_%'
             AND indexname LIKE 'idx_onboarding_%'
             ORDER BY indexname"
                .to_string(),
        ))
        .await?;

    assert_eq!(
        indexes.len(),
        8,
        "Should have 8 custom indexes for query optimization"
    );

    // Verify specific indexes exist
    let index_names: Vec<String> = indexes
        .iter()
        .map(|row| row.try_get("", "indexname").unwrap())
        .collect();

    assert!(index_names.contains(&"idx_onboarding_blocks_module".to_string()));
    assert!(index_names.contains(&"idx_onboarding_blocks_sequence".to_string()));
    assert!(index_names.contains(&"idx_onboarding_assignments_user".to_string()));
    assert!(index_names.contains(&"idx_onboarding_progress_user".to_string()));

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

    // Verify still only 7 tables (not duplicated)
    let tables = db
        .query_all(Statement::from_string(
            DbBackend::Postgres,
            "SELECT table_name FROM information_schema.tables
             WHERE table_schema = 'hr_public'
             AND table_name LIKE 'onboarding_%'"
                .to_string(),
        ))
        .await?;

    assert_eq!(
        tables.len(),
        7,
        "Should still have exactly 7 tables after running migration twice"
    );

    Ok(())
}

/// Test down migration removes all tables and ENUMs
#[tokio::test]
async fn test_down_removes_all_components() -> Result<(), DbErr> {
    let db = Database::connect(get_test_db_url()).await?;

    let migration = Migration;
    let schema_manager = SchemaManager::new(&db);

    // Run up then down
    migration.up(&schema_manager).await?;
    migration.down(&schema_manager).await?;

    // Verify all 7 tables removed
    let tables = db
        .query_all(Statement::from_string(
            DbBackend::Postgres,
            "SELECT table_name FROM information_schema.tables
             WHERE table_schema = 'hr_public'
             AND table_name LIKE 'onboarding_%'"
                .to_string(),
        ))
        .await?;

    assert_eq!(
        tables.len(),
        0,
        "All onboarding tables should be removed after down migration"
    );

    // Verify all 3 ENUMs removed
    let enums = db
        .query_all(Statement::from_string(
            DbBackend::Postgres,
            "SELECT typname FROM pg_type
             WHERE typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'hr_public')
             AND typtype = 'e'
             AND typname IN ('onboarding_content_type', 'form_field_type', 'onboarding_progress_status')"
                .to_string(),
        ))
        .await?;

    assert_eq!(
        enums.len(),
        0,
        "All onboarding ENUMs should be removed after down migration"
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

    // Verify all 7 tables exist after full cycle
    let tables = db
        .query_all(Statement::from_string(
            DbBackend::Postgres,
            "SELECT table_name FROM information_schema.tables
             WHERE table_schema = 'hr_public'
             AND table_name LIKE 'onboarding_%'
             ORDER BY table_name"
                .to_string(),
        ))
        .await?;

    assert_eq!(
        tables.len(),
        7,
        "All 7 tables should exist after full migration cycle"
    );

    // Verify ENUMs recreated
    let enums = db
        .query_all(Statement::from_string(
            DbBackend::Postgres,
            "SELECT typname FROM pg_type
             WHERE typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'hr_public')
             AND typtype = 'e'
             AND typname IN ('onboarding_content_type', 'form_field_type', 'onboarding_progress_status')"
                .to_string(),
        ))
        .await?;

    assert_eq!(enums.len(), 3, "All 3 ENUMs should exist after full cycle");

    Ok(())
}
