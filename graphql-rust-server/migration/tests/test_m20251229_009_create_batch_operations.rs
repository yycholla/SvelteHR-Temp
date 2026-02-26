//! Tests for m20251229_009_create_batch_operations migration

use hr_graphql_server::migration::m20251229_009_create_batch_operations::Migration;
use sea_orm::{Database, DatabaseConnection, DbErr, Statement};
use sea_orm_migration::prelude::*;

async fn get_test_db() -> Result<DatabaseConnection, DbErr> {
    let database_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgres://postgres:postgres@localhost/test_db".to_string());
    Database::connect(&database_url).await
}

async fn table_exists(db: &DatabaseConnection, schema: &str, table: &str) -> Result<bool, DbErr> {
    let result = db.query_one(Statement::from_sql_and_values(
        db.get_database_backend(),
        "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = $1 AND table_name = $2)",
        vec![schema.into(), table.into()],
    )).await?;
    Ok(result
        .map(|row| row.try_get::<bool>("", "exists").unwrap_or(false))
        .unwrap_or(false))
}

async fn index_exists(db: &DatabaseConnection, index_name: &str) -> Result<bool, DbErr> {
    let result = db
        .query_one(Statement::from_sql_and_values(
            db.get_database_backend(),
            "SELECT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = $1)",
            vec![index_name.into()],
        ))
        .await?;
    Ok(result
        .map(|row| row.try_get::<bool>("", "exists").unwrap_or(false))
        .unwrap_or(false))
}

#[tokio::test]
async fn test_migration_compiles() {
    let _migration = Migration;
}

#[tokio::test]
async fn test_up_migration() {
    let db = get_test_db().await.expect("Failed to connect");
    let schema_manager = SchemaManager::new(&db);
    let migration = Migration;

    migration
        .up(&schema_manager)
        .await
        .expect("Failed to run up migration");

    assert!(table_exists(&db, "hr_public", "batch_operations")
        .await
        .unwrap());
    assert!(table_exists(&db, "hr_public", "batch_operation_items")
        .await
        .unwrap());
}

#[tokio::test]
async fn test_indexes() {
    let db = get_test_db().await.expect("Failed to connect");
    let schema_manager = SchemaManager::new(&db);
    let migration = Migration;

    migration.up(&schema_manager).await.unwrap();

    assert!(index_exists(&db, "idx_batch_operations_status")
        .await
        .unwrap());
    assert!(index_exists(&db, "idx_batch_operations_type_entity")
        .await
        .unwrap());
    assert!(index_exists(&db, "idx_batch_operation_items_batch_id")
        .await
        .unwrap());
    assert!(index_exists(&db, "idx_batch_operation_items_status")
        .await
        .unwrap());
}

#[tokio::test]
async fn test_foreign_key_cascade() {
    let db = get_test_db().await.expect("Failed to connect");
    let schema_manager = SchemaManager::new(&db);
    let migration = Migration;

    migration.up(&schema_manager).await.unwrap();

    // Insert batch operation
    let batch_id = db.query_one(Statement::from_string(
        db.get_database_backend(),
        "INSERT INTO hr_public.batch_operations (operation_type, entity_type, direction) VALUES ('sync', 'employee', 'pull') RETURNING id".to_string(),
    )).await.unwrap().unwrap();
    let batch_id: String = batch_id.try_get("", "id").unwrap();

    // Insert item
    db.execute(Statement::from_string(
        db.get_database_backend(),
        format!("INSERT INTO hr_public.batch_operation_items (batch_operation_id, entity_id) VALUES ('{}', 'emp-1')", batch_id),
    )).await.unwrap();

    // Delete batch
    db.execute(Statement::from_string(
        db.get_database_backend(),
        format!(
            "DELETE FROM hr_public.batch_operations WHERE id = '{}'",
            batch_id
        ),
    ))
    .await
    .unwrap();

    // Verify item was cascade deleted
    let count = db
        .query_one(Statement::from_string(
            db.get_database_backend(),
            "SELECT COUNT(*) FROM hr_public.batch_operation_items".to_string(),
        ))
        .await
        .unwrap()
        .unwrap();
    let count: i64 = count.try_get("", "count").unwrap();
    assert_eq!(count, 0);
}

#[tokio::test]
async fn test_check_constraints() {
    let db = get_test_db().await.expect("Failed to connect");
    let schema_manager = SchemaManager::new(&db);
    let migration = Migration;

    migration.up(&schema_manager).await.unwrap();

    // Test invalid status
    let result = db.execute(Statement::from_string(
        db.get_database_backend(),
        "INSERT INTO hr_public.batch_operations (operation_type, entity_type, direction, status) VALUES ('sync', 'employee', 'pull', 'invalid')".to_string(),
    )).await;
    assert!(result.is_err());

    // Test invalid operation_type
    let result = db.execute(Statement::from_string(
        db.get_database_backend(),
        "INSERT INTO hr_public.batch_operations (operation_type, entity_type, direction) VALUES ('invalid', 'employee', 'pull')".to_string(),
    )).await;
    assert!(result.is_err());

    // Test valid insert
    let result = db.execute(Statement::from_string(
        db.get_database_backend(),
        "INSERT INTO hr_public.batch_operations (operation_type, entity_type, direction) VALUES ('sync', 'employee', 'pull')".to_string(),
    )).await;
    assert!(result.is_ok());
}

#[tokio::test]
async fn test_column_defaults() {
    let db = get_test_db().await.expect("Failed to connect");
    let schema_manager = SchemaManager::new(&db);
    let migration = Migration;

    migration.up(&schema_manager).await.unwrap();

    // Insert with minimal fields
    let result = db.query_one(Statement::from_string(
        db.get_database_backend(),
        "INSERT INTO hr_public.batch_operations (operation_type, entity_type, direction) VALUES ('sync', 'employee', 'pull') RETURNING status, total_items, progress_percentage".to_string(),
    )).await.unwrap().unwrap();

    assert_eq!(result.try_get::<String>("", "status").unwrap(), "pending");
    assert_eq!(result.try_get::<i32>("", "total_items").unwrap(), 0);
}

#[tokio::test]
async fn test_idempotent_up_migration() {
    let db = get_test_db().await.expect("Failed to connect");
    let schema_manager = SchemaManager::new(&db);
    let migration = Migration;

    migration.up(&schema_manager).await.expect("First up");
    migration
        .up(&schema_manager)
        .await
        .expect("Second up (idempotent)");
    assert!(table_exists(&db, "hr_public", "batch_operations")
        .await
        .unwrap());
}

#[tokio::test]
async fn test_down_migration() {
    let db = get_test_db().await.expect("Failed to connect");
    let schema_manager = SchemaManager::new(&db);
    let migration = Migration;

    migration.up(&schema_manager).await.unwrap();
    migration
        .down(&schema_manager)
        .await
        .expect("Down migration");
    assert!(!table_exists(&db, "hr_public", "batch_operations")
        .await
        .unwrap());
    assert!(!table_exists(&db, "hr_public", "batch_operation_items")
        .await
        .unwrap());
}

#[tokio::test]
async fn test_full_migration_cycle() {
    let db = get_test_db().await.expect("Failed to connect");
    let schema_manager = SchemaManager::new(&db);

    let migration = Migration;

    migration.up(&schema_manager).await.expect("Up");
    assert!(table_exists(&db, "hr_public", "batch_operations")
        .await
        .unwrap());

    migration.down(&schema_manager).await.expect("Down");
    assert!(!table_exists(&db, "hr_public", "batch_operations")
        .await
        .unwrap());

    migration.up(&schema_manager).await.expect("Up again");
    assert!(table_exists(&db, "hr_public", "batch_operations")
        .await
        .unwrap());
}
