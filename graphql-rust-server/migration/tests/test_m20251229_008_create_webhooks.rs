//! Tests for m20251229_008_create_webhooks migration

use hr_graphql_server::migration::m20251229_008_create_webhooks::Migration;
use sea_orm::{Database, DatabaseConnection, DbErr, Statement};
use sea_orm_migration::prelude::*;

async fn get_test_db() -> Result<DatabaseConnection, DbErr> {
    let database_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgres://postgres:postgres@localhost/test_db".to_string());
    Database::connect(&database_url).await
}

async fn table_exists(db: &DatabaseConnection, schema: &str, table: &str) -> Result<bool, DbErr> {
    let result = db
        .query_one(Statement::from_sql_and_values(
            db.get_database_backend(),
            "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = $1 AND table_name = $2)",
            vec![schema.into(), table.into()],
        ))
        .await?;
    Ok(result.map(|row| row.try_get::<bool>("", "exists").unwrap_or(false)).unwrap_or(false))
}

async fn index_exists(db: &DatabaseConnection, index_name: &str) -> Result<bool, DbErr> {
    let result = db
        .query_one(Statement::from_sql_and_values(
            db.get_database_backend(),
            "SELECT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = $1)",
            vec![index_name.into()],
        ))
        .await?;
    Ok(result.map(|row| row.try_get::<bool>("", "exists").unwrap_or(false)).unwrap_or(false))
}

#[tokio::test]
async fn test_migration_compiles() {
    let _migration = Migration;
}

#[tokio::test]
async fn test_up_migration() {
    let db = get_test_db().await.expect("Failed to connect");
    let schema_manager = SchemaManager::new(&db);
    Migration.up(&schema_manager).await.expect("Failed to run up migration");
    
    assert!(table_exists(&db, "hr_public", "webhook_subscriptions").await.unwrap());
    assert!(table_exists(&db, "hr_public", "webhook_events").await.unwrap());
}

#[tokio::test]
async fn test_indexes() {
    let db = get_test_db().await.expect("Failed to connect");
    let schema_manager = SchemaManager::new(&db);
    Migration.up(&schema_manager).await.unwrap();
    
    assert!(index_exists(&db, "idx_webhook_subscriptions_realm_id").await.unwrap());
    assert!(index_exists(&db, "idx_webhook_subscriptions_webhook_id").await.unwrap());
    assert!(index_exists(&db, "idx_webhook_events_subscription_id").await.unwrap());
    assert!(index_exists(&db, "idx_webhook_events_status").await.unwrap());
    assert!(index_exists(&db, "idx_webhook_events_entity").await.unwrap());
}

#[tokio::test]
async fn test_foreign_key_cascade() {
    let db = get_test_db().await.expect("Failed to connect");
    let schema_manager = SchemaManager::new(&db);
    Migration.up(&schema_manager).await.unwrap();
    
    // Insert subscription
    let sub_id = db.query_one(Statement::from_string(
        db.get_database_backend(),
        "INSERT INTO hr_public.webhook_subscriptions (webhook_id, realm_id, event_types, entity_names, verifier_token) VALUES ('wh-1', 'realm-1', '[]'::jsonb, '[]'::jsonb, 'token') RETURNING id".to_string(),
    )).await.unwrap().unwrap();
    let sub_id: String = sub_id.try_get("", "id").unwrap();
    
    // Insert event
    db.execute(Statement::from_string(
        db.get_database_backend(),
        format!("INSERT INTO hr_public.webhook_events (subscription_id, realm_id, event_type, entity_name, entity_id, payload) VALUES ('{}', 'realm-1', 'create', 'Employee', 'emp-1', '{{}}'::jsonb)", sub_id),
    )).await.unwrap();
    
    // Delete subscription
    db.execute(Statement::from_string(
        db.get_database_backend(),
        format!("DELETE FROM hr_public.webhook_subscriptions WHERE id = '{}'", sub_id),
    )).await.unwrap();
    
    // Verify event was cascade deleted
    let count = db.query_one(Statement::from_string(
        db.get_database_backend(),
        "SELECT COUNT(*) FROM hr_public.webhook_events".to_string(),
    )).await.unwrap().unwrap();
    let count: i64 = count.try_get("", "count").unwrap();
    assert_eq!(count, 0);
}

#[tokio::test]
async fn test_check_constraints() {
    let db = get_test_db().await.expect("Failed to connect");
    let schema_manager = SchemaManager::new(&db);
    Migration.up(&schema_manager).await.unwrap();
    
    // Insert subscription for FK requirement
    db.execute(Statement::from_string(
        db.get_database_backend(),
        "INSERT INTO hr_public.webhook_subscriptions (id, webhook_id, realm_id, event_types, entity_names, verifier_token) VALUES (gen_random_uuid(), 'wh-1', 'realm-1', '[]'::jsonb, '[]'::jsonb, 'token')".to_string(),
    )).await.unwrap();
    
    let sub_id = db.query_one(Statement::from_string(
        db.get_database_backend(),
        "SELECT id FROM hr_public.webhook_subscriptions LIMIT 1".to_string(),
    )).await.unwrap().unwrap();
    let sub_id: String = sub_id.try_get("", "id").unwrap();
    
    // Test invalid status
    let result = db.execute(Statement::from_string(
        db.get_database_backend(),
        format!("INSERT INTO hr_public.webhook_events (subscription_id, realm_id, event_type, entity_name, entity_id, payload, status) VALUES ('{}', 'realm-1', 'create', 'Employee', 'emp-1', '{{}}'::jsonb, 'invalid')", sub_id),
    )).await;
    assert!(result.is_err());
    
    // Test valid insert
    let result = db.execute(Statement::from_string(
        db.get_database_backend(),
        format!("INSERT INTO hr_public.webhook_events (subscription_id, realm_id, event_type, entity_name, entity_id, payload) VALUES ('{}', 'realm-1', 'create', 'Employee', 'emp-1', '{{}}'::jsonb)", sub_id),
    )).await;
    assert!(result.is_ok());
}

#[tokio::test]
async fn test_idempotent_up_migration() {
    let db = get_test_db().await.expect("Failed to connect");
    let schema_manager = SchemaManager::new(&db);
    Migration.up(&schema_manager).await.expect("First up");
    Migration.up(&schema_manager).await.expect("Second up (idempotent)");
    assert!(table_exists(&db, "hr_public", "webhook_subscriptions").await.unwrap());
}

#[tokio::test]
async fn test_down_migration() {
    let db = get_test_db().await.expect("Failed to connect");
    let schema_manager = SchemaManager::new(&db);
    Migration.up(&schema_manager).await.unwrap();
    Migration.down(&schema_manager).await.expect("Down migration");
    assert!(!table_exists(&db, "hr_public", "webhook_subscriptions").await.unwrap());
    assert!(!table_exists(&db, "hr_public", "webhook_events").await.unwrap());
}

#[tokio::test]
async fn test_full_migration_cycle() {
    let db = get_test_db().await.expect("Failed to connect");
    let schema_manager = SchemaManager::new(&db);
    
    Migration.up(&schema_manager).await.expect("Up");
    assert!(table_exists(&db, "hr_public", "webhook_subscriptions").await.unwrap());
    
    Migration.down(&schema_manager).await.expect("Down");
    assert!(!table_exists(&db, "hr_public", "webhook_subscriptions").await.unwrap());
    
    Migration.up(&schema_manager).await.expect("Up again");
    assert!(table_exists(&db, "hr_public", "webhook_subscriptions").await.unwrap());
}
