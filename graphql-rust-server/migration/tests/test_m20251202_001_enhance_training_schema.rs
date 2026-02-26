//! Tests for m20251202_001_enhance_training_schema migration
//!
//! This migration adds metadata and authorship columns to the trainings table.
//! Tests verify column additions, types, and idempotency.

use sea_orm::{ConnectionTrait, Database, DbBackend, DbErr, Statement};
use sea_orm_migration::prelude::*;

// Import the migration
use hr_graphql_server::migration::m20251202_001_enhance_training_schema::Migration;
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

/// Test up migration adds all 4 columns
#[tokio::test]
async fn test_up_adds_metadata_columns() -> Result<(), DbErr> {
    let db = Database::connect(get_test_db_url()).await?;

    // Run migration
    let migration = Migration;
    let schema_manager = SchemaManager::new(&db);
    migration.up(&schema_manager).await?;

    // Verify all 4 columns exist
    let columns = db
        .query_all(Statement::from_string(
            DbBackend::Postgres,
            "SELECT column_name FROM information_schema.columns
             WHERE table_schema = 'hr_public'
             AND table_name = 'trainings'
             AND column_name IN ('meta_title', 'meta_description', 'tags', 'author_id')
             ORDER BY column_name"
                .to_string(),
        ))
        .await?;

    assert_eq!(
        columns.len(),
        4,
        "Should have 4 new columns (author_id, meta_description, meta_title, tags)"
    );

    // Verify column names
    let column_names: Vec<String> = columns
        .iter()
        .map(|row| row.try_get("", "column_name").unwrap())
        .collect();

    assert!(
        column_names.contains(&"meta_title".to_string()),
        "Should have meta_title column"
    );
    assert!(
        column_names.contains(&"meta_description".to_string()),
        "Should have meta_description column"
    );
    assert!(
        column_names.contains(&"tags".to_string()),
        "Should have tags column"
    );
    assert!(
        column_names.contains(&"author_id".to_string()),
        "Should have author_id column"
    );

    Ok(())
}

/// Test meta_title column properties
#[tokio::test]
async fn test_meta_title_column_properties() -> Result<(), DbErr> {
    let db = Database::connect(get_test_db_url()).await?;

    let migration = Migration;
    let schema_manager = SchemaManager::new(&db);
    migration.up(&schema_manager).await?;

    // Verify meta_title properties
    let result = db
        .query_one(Statement::from_string(
            DbBackend::Postgres,
            "SELECT data_type, is_nullable FROM information_schema.columns
             WHERE table_schema = 'hr_public'
             AND table_name = 'trainings'
             AND column_name = 'meta_title'"
                .to_string(),
        ))
        .await?
        .unwrap();

    let data_type: String = result.try_get("", "data_type")?;
    let is_nullable: String = result.try_get("", "is_nullable")?;

    assert_eq!(
        data_type, "character varying",
        "meta_title should be VARCHAR type"
    );
    assert_eq!(is_nullable, "YES", "meta_title should be nullable");

    Ok(())
}

/// Test meta_description column properties
#[tokio::test]
async fn test_meta_description_column_properties() -> Result<(), DbErr> {
    let db = Database::connect(get_test_db_url()).await?;

    let migration = Migration;
    let schema_manager = SchemaManager::new(&db);
    migration.up(&schema_manager).await?;

    // Verify meta_description properties
    let result = db
        .query_one(Statement::from_string(
            DbBackend::Postgres,
            "SELECT data_type, is_nullable FROM information_schema.columns
             WHERE table_schema = 'hr_public'
             AND table_name = 'trainings'
             AND column_name = 'meta_description'"
                .to_string(),
        ))
        .await?
        .unwrap();

    let data_type: String = result.try_get("", "data_type")?;
    let is_nullable: String = result.try_get("", "is_nullable")?;

    assert_eq!(
        data_type, "character varying",
        "meta_description should be VARCHAR type"
    );
    assert_eq!(is_nullable, "YES", "meta_description should be nullable");

    Ok(())
}

/// Test tags column is PostgreSQL array type
#[tokio::test]
async fn test_tags_column_is_array_type() -> Result<(), DbErr> {
    let db = Database::connect(get_test_db_url()).await?;

    let migration = Migration;
    let schema_manager = SchemaManager::new(&db);
    migration.up(&schema_manager).await?;

    // Verify tags is array type
    let result = db
        .query_one(Statement::from_string(
            DbBackend::Postgres,
            "SELECT data_type, is_nullable, udt_name FROM information_schema.columns
             WHERE table_schema = 'hr_public'
             AND table_name = 'trainings'
             AND column_name = 'tags'"
                .to_string(),
        ))
        .await?
        .unwrap();

    let data_type: String = result.try_get("", "data_type")?;
    let is_nullable: String = result.try_get("", "is_nullable")?;
    let udt_name: String = result.try_get("", "udt_name")?;

    assert_eq!(data_type, "ARRAY", "tags should be ARRAY type");
    assert_eq!(is_nullable, "YES", "tags should be nullable");
    assert_eq!(
        udt_name, "_text",
        "tags should be text array (_text is PostgreSQL's internal name)"
    );

    Ok(())
}

/// Test author_id column properties
#[tokio::test]
async fn test_author_id_column_properties() -> Result<(), DbErr> {
    let db = Database::connect(get_test_db_url()).await?;

    let migration = Migration;
    let schema_manager = SchemaManager::new(&db);
    migration.up(&schema_manager).await?;

    // Verify author_id properties
    let result = db
        .query_one(Statement::from_string(
            DbBackend::Postgres,
            "SELECT data_type, is_nullable FROM information_schema.columns
             WHERE table_schema = 'hr_public'
             AND table_name = 'trainings'
             AND column_name = 'author_id'"
                .to_string(),
        ))
        .await?
        .unwrap();

    let data_type: String = result.try_get("", "data_type")?;
    let is_nullable: String = result.try_get("", "is_nullable")?;

    assert_eq!(data_type, "uuid", "author_id should be UUID type");
    assert_eq!(is_nullable, "YES", "author_id should be nullable");

    Ok(())
}

/// Test author_id has no foreign key constraint (soft reference)
#[tokio::test]
async fn test_author_id_has_no_foreign_key() -> Result<(), DbErr> {
    let db = Database::connect(get_test_db_url()).await?;

    let migration = Migration;
    let schema_manager = SchemaManager::new(&db);
    migration.up(&schema_manager).await?;

    // Check for foreign key constraints on author_id
    let result = db
        .query_all(Statement::from_string(
            DbBackend::Postgres,
            "SELECT constraint_name FROM information_schema.table_constraints
             WHERE table_schema = 'hr_public'
             AND table_name = 'trainings'
             AND constraint_type = 'FOREIGN KEY'
             AND constraint_name LIKE '%author_id%'"
                .to_string(),
        ))
        .await?;

    assert_eq!(
        result.len(),
        0,
        "author_id should not have a foreign key constraint (soft reference)"
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

    // Verify still only 4 columns (not duplicated)
    let columns = db
        .query_all(Statement::from_string(
            DbBackend::Postgres,
            "SELECT column_name FROM information_schema.columns
             WHERE table_schema = 'hr_public'
             AND table_name = 'trainings'
             AND column_name IN ('meta_title', 'meta_description', 'tags', 'author_id')"
                .to_string(),
        ))
        .await?;

    assert_eq!(
        columns.len(),
        4,
        "Should still have exactly 4 columns after running migration twice"
    );

    Ok(())
}

/// Test down migration removes all 4 columns
#[tokio::test]
async fn test_down_removes_all_columns() -> Result<(), DbErr> {
    let db = Database::connect(get_test_db_url()).await?;

    let migration = Migration;
    let schema_manager = SchemaManager::new(&db);

    // Run up then down
    migration.up(&schema_manager).await?;
    migration.down(&schema_manager).await?;

    // Verify all 4 columns removed
    let columns = db
        .query_all(Statement::from_string(
            DbBackend::Postgres,
            "SELECT column_name FROM information_schema.columns
             WHERE table_schema = 'hr_public'
             AND table_name = 'trainings'
             AND column_name IN ('meta_title', 'meta_description', 'tags', 'author_id')"
                .to_string(),
        ))
        .await?;

    assert_eq!(
        columns.len(),
        0,
        "All 4 columns should be removed after down migration"
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

    // Verify all 4 columns exist after full cycle
    let columns = db
        .query_all(Statement::from_string(
            DbBackend::Postgres,
            "SELECT column_name FROM information_schema.columns
             WHERE table_schema = 'hr_public'
             AND table_name = 'trainings'
             AND column_name IN ('meta_title', 'meta_description', 'tags', 'author_id')
             ORDER BY column_name"
                .to_string(),
        ))
        .await?;

    assert_eq!(
        columns.len(),
        4,
        "All 4 columns should exist after full migration cycle"
    );

    Ok(())
}

/// Test tags array can store multiple values
#[tokio::test]
async fn test_tags_array_functionality() -> Result<(), DbErr> {
    let db = Database::connect(get_test_db_url()).await?;

    let migration = Migration;
    let schema_manager = SchemaManager::new(&db);
    migration.up(&schema_manager).await?;

    // Insert a training with tags array
    db.execute(Statement::from_string(
        DbBackend::Postgres,
        "INSERT INTO hr_public.trainings (title, tags)
         VALUES ('Test Training', ARRAY['leadership', 'management', 'soft-skills']::text[])"
            .to_string(),
    ))
    .await?;

    // Query back the tags
    let result = db
        .query_one(Statement::from_string(
            DbBackend::Postgres,
            "SELECT tags FROM hr_public.trainings WHERE title = 'Test Training'".to_string(),
        ))
        .await?
        .unwrap();

    // PostgreSQL returns arrays as text representation
    let tags: String = result.try_get("", "tags")?;
    assert!(
        tags.contains("leadership"),
        "Tags array should contain 'leadership'"
    );
    assert!(
        tags.contains("management"),
        "Tags array should contain 'management'"
    );
    assert!(
        tags.contains("soft-skills"),
        "Tags array should contain 'soft-skills'"
    );

    // Clean up
    db.execute(Statement::from_string(
        DbBackend::Postgres,
        "DELETE FROM hr_public.trainings WHERE title = 'Test Training'".to_string(),
    ))
    .await?;

    Ok(())
}
