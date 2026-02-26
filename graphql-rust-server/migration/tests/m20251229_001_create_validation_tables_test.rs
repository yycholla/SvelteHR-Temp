//! Tests for m20251229_001_create_validation_tables migration
//!
//! Verifies validation framework table creation:
//! - validation_rules and validation_failures table creation
//! - Column definitions and data types
//! - Default values and constraints
//! - Index creation for performance
//! - Foreign key relationships
//! - Idempotent up and down migrations

use hr_graphql_server::migration::m20251229_001_create_validation_tables::Migration;
use hr_graphql_server::migration::{Migrator, MigratorTrait};
use sea_orm::{Database, DatabaseConnection, DbErr, Statement};
use sea_orm_migration::prelude::*;

/// Helper to get test database connection
async fn get_test_db() -> Result<DatabaseConnection, DbErr> {
    let database_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgres://postgres:postgres@localhost/test_db".to_string());
    Database::connect(&database_url).await
}

/// Helper to check if a table exists
async fn table_exists(db: &DatabaseConnection, table: &str) -> Result<bool, DbErr> {
    let result = db
        .query_one(Statement::from_sql_and_values(
            db.get_database_backend(),
            r#"
            SELECT EXISTS (
                SELECT 1 FROM information_schema.tables
                WHERE table_schema = 'public'
                AND table_name = $1
            )
            "#,
            vec![table.into()],
        ))
        .await?;

    Ok(result
        .map(|row| row.try_get::<bool>("", "exists").unwrap_or(false))
        .unwrap_or(false))
}

/// Helper to check if a column exists in a table
async fn column_exists(db: &DatabaseConnection, table: &str, column: &str) -> Result<bool, DbErr> {
    let result = db
        .query_one(Statement::from_sql_and_values(
            db.get_database_backend(),
            r#"
            SELECT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'public'
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
            WHERE table_schema = 'public'
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
            WHERE table_schema = 'public'
            AND table_name = $1
            AND column_name = $2
            "#,
            vec![table.into(), column.into()],
        ))
        .await?;

    Ok(result.and_then(|row| row.try_get::<String>("", "column_default").ok()))
}

#[tokio::test]
async fn test_migration_compiles() {
    // This test simply verifies the migration struct compiles
    let _migration = Migration;
}

#[tokio::test]
async fn test_up_migration_creates_tables() {
    let db = get_test_db()
        .await
        .expect("Failed to connect to test database");
    let schema_manager = SchemaManager::new(&db);

    // Run migration
    Migration
        .up(&schema_manager)
        .await
        .expect("Failed to run up migration");

    // Verify validation_rules table exists
    assert!(
        table_exists(&db, "validation_rules")
            .await
            .expect("Failed to check validation_rules table"),
        "validation_rules table should exist"
    );

    // Verify validation_failures table exists
    assert!(
        table_exists(&db, "validation_failures")
            .await
            .expect("Failed to check validation_failures table"),
        "validation_failures table should exist"
    );
}

#[tokio::test]
async fn test_validation_rules_columns() {
    let db = get_test_db()
        .await
        .expect("Failed to connect to test database");
    let schema_manager = SchemaManager::new(&db);

    // Ensure migration is run
    Migration
        .up(&schema_manager)
        .await
        .expect("Failed to run up migration");

    // Verify all columns exist
    let columns = vec![
        "id",
        "name",
        "description",
        "entity_type",
        "field_name",
        "rule_type",
        "condition",
        "severity",
        "auto_fix_strategy",
        "enabled",
        "created_by",
        "created_at",
        "updated_at",
    ];

    for column in columns {
        assert!(
            column_exists(&db, "validation_rules", column)
                .await
                .expect(&format!("Failed to check {} column", column)),
            "{} column should exist in validation_rules",
            column
        );
    }
}

#[tokio::test]
async fn test_validation_failures_columns() {
    let db = get_test_db()
        .await
        .expect("Failed to connect to test database");
    let schema_manager = SchemaManager::new(&db);

    // Ensure migration is run
    Migration
        .up(&schema_manager)
        .await
        .expect("Failed to run up migration");

    // Verify all columns exist
    let columns = vec![
        "id",
        "rule_id",
        "entity_type",
        "entity_id",
        "field_name",
        "invalid_value",
        "error_message",
        "severity",
        "detected_at",
        "resolved_at",
        "resolution",
    ];

    for column in columns {
        assert!(
            column_exists(&db, "validation_failures", column)
                .await
                .expect(&format!("Failed to check {} column", column)),
            "{} column should exist in validation_failures",
            column
        );
    }
}

#[tokio::test]
async fn test_validation_rules_column_types() {
    let db = get_test_db()
        .await
        .expect("Failed to connect to test database");
    let schema_manager = SchemaManager::new(&db);

    // Ensure migration is run
    Migration
        .up(&schema_manager)
        .await
        .expect("Failed to run up migration");

    // Verify id is UUID
    let id_type = get_column_type(&db, "validation_rules", "id")
        .await
        .expect("Failed to get id type");
    assert_eq!(id_type, Some("uuid".to_string()));

    // Verify name is VARCHAR
    let name_type = get_column_type(&db, "validation_rules", "name")
        .await
        .expect("Failed to get name type");
    assert_eq!(name_type, Some("varchar".to_string()));

    // Verify enabled is BOOLEAN
    let enabled_type = get_column_type(&db, "validation_rules", "enabled")
        .await
        .expect("Failed to get enabled type");
    assert_eq!(enabled_type, Some("bool".to_string()));

    // Verify created_at is TIMESTAMPTZ
    let created_at_type = get_column_type(&db, "validation_rules", "created_at")
        .await
        .expect("Failed to get created_at type");
    assert_eq!(created_at_type, Some("timestamptz".to_string()));
}

#[tokio::test]
async fn test_validation_rules_defaults() {
    let db = get_test_db()
        .await
        .expect("Failed to connect to test database");
    let schema_manager = SchemaManager::new(&db);

    // Ensure migration is run
    Migration
        .up(&schema_manager)
        .await
        .expect("Failed to run up migration");

    // Verify severity defaults to 'ERROR'
    let severity_default = get_column_default(&db, "validation_rules", "severity")
        .await
        .expect("Failed to get severity default");
    assert!(severity_default.is_some());
    assert!(severity_default.unwrap().contains("ERROR"));

    // Verify auto_fix_strategy defaults to 'None'
    let auto_fix_default = get_column_default(&db, "validation_rules", "auto_fix_strategy")
        .await
        .expect("Failed to get auto_fix_strategy default");
    assert!(auto_fix_default.is_some());
    assert!(auto_fix_default.unwrap().contains("None"));

    // Verify enabled defaults to true
    let enabled_default = get_column_default(&db, "validation_rules", "enabled")
        .await
        .expect("Failed to get enabled default");
    assert!(enabled_default.is_some());
    assert!(enabled_default.unwrap().contains("true"));
}

#[tokio::test]
async fn test_validation_failures_defaults() {
    let db = get_test_db()
        .await
        .expect("Failed to connect to test database");
    let schema_manager = SchemaManager::new(&db);

    // Ensure migration is run
    Migration
        .up(&schema_manager)
        .await
        .expect("Failed to run up migration");

    // Verify severity defaults to 'ERROR'
    let severity_default = get_column_default(&db, "validation_failures", "severity")
        .await
        .expect("Failed to get severity default");
    assert!(severity_default.is_some());
    assert!(severity_default.unwrap().contains("ERROR"));

    // Verify detected_at has default (NOW())
    let detected_at_default = get_column_default(&db, "validation_failures", "detected_at")
        .await
        .expect("Failed to get detected_at default");
    assert!(detected_at_default.is_some());
}

#[tokio::test]
async fn test_indexes_created() {
    let db = get_test_db()
        .await
        .expect("Failed to connect to test database");
    let schema_manager = SchemaManager::new(&db);

    // Ensure migration is run
    Migration
        .up(&schema_manager)
        .await
        .expect("Failed to run up migration");

    // Verify validation_rules indexes
    assert!(
        index_exists(&db, "idx_validation_rules_entity_enabled")
            .await
            .expect("Failed to check idx_validation_rules_entity_enabled"),
        "idx_validation_rules_entity_enabled should exist"
    );

    // Verify validation_failures indexes
    assert!(
        index_exists(&db, "idx_validation_failures_entity")
            .await
            .expect("Failed to check idx_validation_failures_entity"),
        "idx_validation_failures_entity should exist"
    );

    assert!(
        index_exists(&db, "idx_validation_failures_detected_at")
            .await
            .expect("Failed to check idx_validation_failures_detected_at"),
        "idx_validation_failures_detected_at should exist"
    );

    assert!(
        index_exists(&db, "idx_validation_failures_resolved")
            .await
            .expect("Failed to check idx_validation_failures_resolved"),
        "idx_validation_failures_resolved should exist"
    );
}

#[tokio::test]
async fn test_foreign_key_relationship() {
    let db = get_test_db()
        .await
        .expect("Failed to connect to test database");
    let schema_manager = SchemaManager::new(&db);

    // Ensure migration is run
    Migration
        .up(&schema_manager)
        .await
        .expect("Failed to run up migration");

    // Insert a validation rule
    db.execute(Statement::from_string(
        db.get_database_backend(),
        r#"
        INSERT INTO validation_rules (id, name, entity_type, field_name, rule_type, condition)
        VALUES ('00000000-0000-0000-0000-000000000001', 'test_rule', 'employee', 'email', 'format', '^.*@.*$')
        "#.to_string(),
    ))
    .await
    .expect("Failed to insert test rule");

    // Insert a validation failure referencing the rule - should succeed
    let result = db
        .execute(Statement::from_string(
            db.get_database_backend(),
            r#"
        INSERT INTO validation_failures (id, rule_id, entity_type, field_name, error_message)
        VALUES ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'employee', 'email', 'Test error')
        "#
            .to_string(),
        ))
        .await;

    assert!(
        result.is_ok(),
        "Should allow inserting failure with valid rule_id"
    );

    // Try to insert failure with non-existent rule_id - should fail
    let invalid_result = db
        .execute(Statement::from_string(
            db.get_database_backend(),
            r#"
        INSERT INTO validation_failures (id, rule_id, entity_type, field_name, error_message)
        VALUES ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-999999999999', 'employee', 'email', 'Test error')
        "#
            .to_string(),
        ))
        .await;

    assert!(
        invalid_result.is_err(),
        "Should reject inserting failure with invalid rule_id"
    );

    // Cleanup
    let _ = db
        .execute(Statement::from_string(
            db.get_database_backend(),
            "DELETE FROM validation_failures WHERE id = '00000000-0000-0000-0000-000000000002'"
                .to_string(),
        ))
        .await;
    let _ = db
        .execute(Statement::from_string(
            db.get_database_backend(),
            "DELETE FROM validation_rules WHERE id = '00000000-0000-0000-0000-000000000001'"
                .to_string(),
        ))
        .await;
}

#[tokio::test]
async fn test_cascade_delete() {
    let db = get_test_db()
        .await
        .expect("Failed to connect to test database");
    let schema_manager = SchemaManager::new(&db);

    // Ensure migration is run
    Migration
        .up(&schema_manager)
        .await
        .expect("Failed to run up migration");

    // Insert a validation rule
    db.execute(Statement::from_string(
        db.get_database_backend(),
        r#"
        INSERT INTO validation_rules (id, name, entity_type, field_name, rule_type, condition)
        VALUES ('00000000-0000-0000-0000-000000000010', 'cascade_test', 'employee', 'email', 'format', '^.*@.*$')
        "#.to_string(),
    ))
    .await
    .expect("Failed to insert test rule");

    // Insert a validation failure
    db.execute(Statement::from_string(
        db.get_database_backend(),
        r#"
        INSERT INTO validation_failures (id, rule_id, entity_type, field_name, error_message)
        VALUES ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000010', 'employee', 'email', 'Test error')
        "#.to_string(),
    ))
    .await
    .expect("Failed to insert test failure");

    // Delete the rule - failure should be cascaded
    db.execute(Statement::from_string(
        db.get_database_backend(),
        "DELETE FROM validation_rules WHERE id = '00000000-0000-0000-0000-000000000010'"
            .to_string(),
    ))
    .await
    .expect("Failed to delete rule");

    // Verify failure was also deleted
    let result = db
        .query_one(Statement::from_string(
            db.get_database_backend(),
            "SELECT COUNT(*) FROM validation_failures WHERE id = '00000000-0000-0000-0000-000000000011'".to_string(),
        ))
        .await
        .expect("Failed to query failure count");

    let count: i64 = result
        .map(|row| row.try_get("", "count").unwrap_or(0))
        .unwrap_or(0);

    assert_eq!(count, 0, "Failure should be cascaded when rule is deleted");
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

    // Verify tables still exist
    assert!(
        table_exists(&db, "validation_rules")
            .await
            .expect("Failed to check validation_rules table"),
        "validation_rules table should exist after idempotent up"
    );

    assert!(
        table_exists(&db, "validation_failures")
            .await
            .expect("Failed to check validation_failures table"),
        "validation_failures table should exist after idempotent up"
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

    // Verify tables exist
    assert!(
        table_exists(&db, "validation_rules")
            .await
            .expect("Failed to check validation_rules table"),
        "validation_rules table should exist before down migration"
    );

    // Run down migration
    Migration
        .down(&schema_manager)
        .await
        .expect("Failed to run down migration");

    // Verify tables are removed
    assert!(
        !table_exists(&db, "validation_rules")
            .await
            .expect("Failed to check validation_rules table"),
        "validation_rules table should be removed after down migration"
    );

    assert!(
        !table_exists(&db, "validation_failures")
            .await
            .expect("Failed to check validation_failures table"),
        "validation_failures table should be removed after down migration"
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

    // Verify tables remain removed
    assert!(
        !table_exists(&db, "validation_rules")
            .await
            .expect("Failed to check validation_rules table"),
        "validation_rules table should remain removed after idempotent down"
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

    // Verify tables exist
    assert!(
        table_exists(&db, "validation_rules")
            .await
            .expect("Failed to check validation_rules table"),
        "validation_rules table should exist after up"
    );

    // Run down migration
    Migration
        .down(&schema_manager)
        .await
        .expect("Failed to run down migration");

    // Verify tables removed
    assert!(
        !table_exists(&db, "validation_rules")
            .await
            .expect("Failed to check validation_rules table"),
        "validation_rules table should be removed after down"
    );

    // Run up migration again
    Migration
        .up(&schema_manager)
        .await
        .expect("Failed to run up migration again");

    // Verify tables exist again
    assert!(
        table_exists(&db, "validation_rules")
            .await
            .expect("Failed to check validation_rules table"),
        "validation_rules table should exist after second up"
    );

    assert!(
        table_exists(&db, "validation_failures")
            .await
            .expect("Failed to check validation_failures table"),
        "validation_failures table should exist after second up"
    );
}
