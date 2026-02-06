//! Tests for m20251229_002_add_sync_permissions migration
//!
//! Verifies sync permission and audit system:
//! - sync_permission_audit table creation
//! - Column definitions and data types
//! - Index creation for performance
//! - Foreign key relationship to users table
//! - Sync permissions seeding (19 permissions)
//! - Idempotent up and down migrations

use migration::m20251229_002_add_sync_permissions::Migration;
use migration::{Migrator, MigratorTrait};
use sea_orm::{Database, DatabaseConnection, DbErr, Statement};
use sea_orm_migration::prelude::*;

/// Helper to get test database connection
async fn get_test_db() -> Result<DatabaseConnection, DbErr> {
    let database_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgres://postgres:postgres@localhost/test_db".to_string());
    Database::connect(&database_url).await
}

/// Helper to check if a table exists
async fn table_exists(db: &DatabaseConnection, schema: &str, table: &str) -> Result<bool, DbErr> {
    let result = db
        .query_one(Statement::from_sql_and_values(
            db.get_database_backend(),
            r#"
            SELECT EXISTS (
                SELECT 1 FROM information_schema.tables
                WHERE table_schema = $1
                AND table_name = $2
            )
            "#,
            vec![schema.into(), table.into()],
        ))
        .await?;

    Ok(result.map(|row| row.try_get::<bool>("", "exists").unwrap_or(false)).unwrap_or(false))
}

/// Helper to check if a column exists in a table
async fn column_exists(
    db: &DatabaseConnection,
    schema: &str,
    table: &str,
    column: &str,
) -> Result<bool, DbErr> {
    let result = db
        .query_one(Statement::from_sql_and_values(
            db.get_database_backend(),
            r#"
            SELECT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_schema = $1
                AND table_name = $2
                AND column_name = $3
            )
            "#,
            vec![schema.into(), table.into(), column.into()],
        ))
        .await?;

    Ok(result.map(|row| row.try_get::<bool>("", "exists").unwrap_or(false)).unwrap_or(false))
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

    Ok(result.map(|row| row.try_get::<bool>("", "exists").unwrap_or(false)).unwrap_or(false))
}

/// Helper to count permissions by resource
async fn count_permissions_by_resource(
    db: &DatabaseConnection,
    resource: &str,
) -> Result<i64, DbErr> {
    let result = db
        .query_one(Statement::from_sql_and_values(
            db.get_database_backend(),
            r#"
            SELECT COUNT(*) FROM hr_public.permissions
            WHERE resource = $1
            AND deleted_at IS NULL
            "#,
            vec![resource.into()],
        ))
        .await?;

    Ok(result.map(|row| row.try_get::<i64>("", "count").unwrap_or(0)).unwrap_or(0))
}

/// Helper to check if a specific permission exists
async fn permission_exists(
    db: &DatabaseConnection,
    resource: &str,
    action: &str,
) -> Result<bool, DbErr> {
    let result = db
        .query_one(Statement::from_sql_and_values(
            db.get_database_backend(),
            r#"
            SELECT EXISTS (
                SELECT 1 FROM hr_public.permissions
                WHERE resource = $1
                AND action = $2
                AND deleted_at IS NULL
            )
            "#,
            vec![resource.into(), action.into()],
        ))
        .await?;

    Ok(result.map(|row| row.try_get::<bool>("", "exists").unwrap_or(false)).unwrap_or(false))
}

#[tokio::test]
async fn test_migration_compiles() {
    // This test simply verifies the migration struct compiles
    let _migration = Migration;
}

#[tokio::test]
async fn test_up_migration_creates_table() {
    let db = get_test_db().await.expect("Failed to connect to test database");
    let schema_manager = SchemaManager::new(&db);

    // Run migration
    Migration.up(&schema_manager).await.expect("Failed to run up migration");

    // Verify sync_permission_audit table exists
    assert!(
        table_exists(&db, "hr_public", "sync_permission_audit")
            .await
            .expect("Failed to check sync_permission_audit table"),
        "sync_permission_audit table should exist"
    );
}

#[tokio::test]
async fn test_sync_permission_audit_columns() {
    let db = get_test_db().await.expect("Failed to connect to test database");
    let schema_manager = SchemaManager::new(&db);

    // Ensure migration is run
    Migration.up(&schema_manager).await.expect("Failed to run up migration");

    // Verify all columns exist
    let columns = vec![
        "id",
        "user_id",
        "permission_name",
        "action",
        "granted",
        "reason",
        "checked_at",
    ];

    for column in columns {
        assert!(
            column_exists(&db, "hr_public", "sync_permission_audit", column)
                .await
                .expect(&format!("Failed to check {} column", column)),
            "{} column should exist in sync_permission_audit",
            column
        );
    }
}

#[tokio::test]
async fn test_indexes_created() {
    let db = get_test_db().await.expect("Failed to connect to test database");
    let schema_manager = SchemaManager::new(&db);

    // Ensure migration is run
    Migration.up(&schema_manager).await.expect("Failed to run up migration");

    // Verify all indexes exist
    assert!(
        index_exists(&db, "idx_sync_perm_audit_user")
            .await
            .expect("Failed to check idx_sync_perm_audit_user"),
        "idx_sync_perm_audit_user should exist"
    );

    assert!(
        index_exists(&db, "idx_sync_perm_audit_checked_at")
            .await
            .expect("Failed to check idx_sync_perm_audit_checked_at"),
        "idx_sync_perm_audit_checked_at should exist"
    );

    assert!(
        index_exists(&db, "idx_sync_perm_audit_permission")
            .await
            .expect("Failed to check idx_sync_perm_audit_permission"),
        "idx_sync_perm_audit_permission should exist"
    );
}

#[tokio::test]
async fn test_sync_permissions_seeded() {
    let db = get_test_db().await.expect("Failed to connect to test database");
    let schema_manager = SchemaManager::new(&db);

    // Ensure migration is run
    Migration.up(&schema_manager).await.expect("Failed to run up migration");

    // Verify sync resource permissions (18 permissions)
    let sync_count = count_permissions_by_resource(&db, "sync")
        .await
        .expect("Failed to count sync permissions");
    assert!(
        sync_count >= 18,
        "Should have at least 18 sync permissions, got {}",
        sync_count
    );

    // Verify integrations resource permissions (1 permission)
    let integrations_count = count_permissions_by_resource(&db, "integrations")
        .await
        .expect("Failed to count integrations permissions");
    assert!(
        integrations_count >= 1,
        "Should have at least 1 integrations permission, got {}",
        integrations_count
    );
}

#[tokio::test]
async fn test_specific_sync_permissions_exist() {
    let db = get_test_db().await.expect("Failed to connect to test database");
    let schema_manager = SchemaManager::new(&db);

    // Ensure migration is run
    Migration.up(&schema_manager).await.expect("Failed to run up migration");

    // Test sync operations permissions
    assert!(
        permission_exists(&db, "sync", "trigger_employee")
            .await
            .expect("Failed to check trigger_employee permission"),
        "sync:trigger_employee permission should exist"
    );

    assert!(
        permission_exists(&db, "sync", "trigger_department")
            .await
            .expect("Failed to check trigger_department permission"),
        "sync:trigger_department permission should exist"
    );

    assert!(
        permission_exists(&db, "sync", "push")
            .await
            .expect("Failed to check push permission"),
        "sync:push permission should exist"
    );

    assert!(
        permission_exists(&db, "sync", "force_full")
            .await
            .expect("Failed to check force_full permission"),
        "sync:force_full permission should exist"
    );

    // Test conflict management permissions
    assert!(
        permission_exists(&db, "sync", "view_conflicts")
            .await
            .expect("Failed to check view_conflicts permission"),
        "sync:view_conflicts permission should exist"
    );

    assert!(
        permission_exists(&db, "sync", "resolve_conflicts")
            .await
            .expect("Failed to check resolve_conflicts permission"),
        "sync:resolve_conflicts permission should exist"
    );

    // Test configuration permissions
    assert!(
        permission_exists(&db, "sync", "manage_schedules")
            .await
            .expect("Failed to check manage_schedules permission"),
        "sync:manage_schedules permission should exist"
    );

    // Test viewing permissions
    assert!(
        permission_exists(&db, "sync", "view_history")
            .await
            .expect("Failed to check view_history permission"),
        "sync:view_history permission should exist"
    );

    // Test administration permissions
    assert!(
        permission_exists(&db, "integrations", "manage")
            .await
            .expect("Failed to check integrations:manage permission"),
        "integrations:manage permission should exist"
    );
}

#[tokio::test]
async fn test_idempotent_permission_seeding() {
    let db = get_test_db().await.expect("Failed to connect to test database");
    let schema_manager = SchemaManager::new(&db);

    // Run migration twice
    Migration.up(&schema_manager).await.expect("Failed to run first up migration");

    // Get initial count
    let initial_sync_count = count_permissions_by_resource(&db, "sync")
        .await
        .expect("Failed to count sync permissions");

    // Run migration again
    Migration.up(&schema_manager).await.expect("Failed to run second up migration");

    // Get count after second run
    let second_sync_count = count_permissions_by_resource(&db, "sync")
        .await
        .expect("Failed to count sync permissions");

    // Counts should be the same (idempotent)
    assert_eq!(
        initial_sync_count, second_sync_count,
        "Permission count should remain the same after idempotent migration"
    );
}

#[tokio::test]
async fn test_foreign_key_to_users() {
    let db = get_test_db().await.expect("Failed to connect to test database");
    let schema_manager = SchemaManager::new(&db);

    // Ensure migration is run
    Migration.up(&schema_manager).await.expect("Failed to run up migration");

    // Create a test user
    db.execute(Statement::from_string(
        db.get_database_backend(),
        r#"
        INSERT INTO hr_public.users (id, email, hashed_password, created_at, updated_at)
        VALUES ('00000000-0000-0000-0000-000000000020', 'test_perm@example.com', 'test_hash', NOW(), NOW())
        "#.to_string(),
    ))
    .await
    .expect("Failed to insert test user");

    // Insert audit record with valid user_id - should succeed
    let result = db
        .execute(Statement::from_string(
            db.get_database_backend(),
            r#"
        INSERT INTO hr_public.sync_permission_audit (id, user_id, permission_name, action, granted)
        VALUES ('00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000020', 'sync:test', 'test', true)
        "#
            .to_string(),
        ))
        .await;

    assert!(
        result.is_ok(),
        "Should allow inserting audit record with valid user_id"
    );

    // Try to insert audit record with non-existent user_id - should fail
    let invalid_result = db
        .execute(Statement::from_string(
            db.get_database_backend(),
            r#"
        INSERT INTO hr_public.sync_permission_audit (id, user_id, permission_name, action, granted)
        VALUES ('00000000-0000-0000-0000-000000000022', '00000000-0000-0000-0000-999999999999', 'sync:test', 'test', true)
        "#
            .to_string(),
        ))
        .await;

    assert!(
        invalid_result.is_err(),
        "Should reject inserting audit record with invalid user_id"
    );

    // Cleanup
    let _ = db
        .execute(Statement::from_string(
            db.get_database_backend(),
            "DELETE FROM hr_public.sync_permission_audit WHERE id = '00000000-0000-0000-0000-000000000021'".to_string(),
        ))
        .await;
    let _ = db
        .execute(Statement::from_string(
            db.get_database_backend(),
            "DELETE FROM hr_public.users WHERE id = '00000000-0000-0000-0000-000000000020'"
                .to_string(),
        ))
        .await;
}

#[tokio::test]
async fn test_cascade_delete_audit_records() {
    let db = get_test_db().await.expect("Failed to connect to test database");
    let schema_manager = SchemaManager::new(&db);

    // Ensure migration is run
    Migration.up(&schema_manager).await.expect("Failed to run up migration");

    // Create a test user
    db.execute(Statement::from_string(
        db.get_database_backend(),
        r#"
        INSERT INTO hr_public.users (id, email, hashed_password, created_at, updated_at)
        VALUES ('00000000-0000-0000-0000-000000000030', 'cascade_test@example.com', 'test_hash', NOW(), NOW())
        "#.to_string(),
    ))
    .await
    .expect("Failed to insert test user");

    // Insert audit record
    db.execute(Statement::from_string(
        db.get_database_backend(),
        r#"
        INSERT INTO hr_public.sync_permission_audit (id, user_id, permission_name, action, granted)
        VALUES ('00000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-000000000030', 'sync:test', 'test', true)
        "#.to_string(),
    ))
    .await
    .expect("Failed to insert audit record");

    // Delete the user - audit record should be cascaded
    db.execute(Statement::from_string(
        db.get_database_backend(),
        "DELETE FROM hr_public.users WHERE id = '00000000-0000-0000-0000-000000000030'"
            .to_string(),
    ))
    .await
    .expect("Failed to delete user");

    // Verify audit record was also deleted
    let result = db
        .query_one(Statement::from_string(
            db.get_database_backend(),
            "SELECT COUNT(*) FROM hr_public.sync_permission_audit WHERE id = '00000000-0000-0000-0000-000000000031'".to_string(),
        ))
        .await
        .expect("Failed to query audit count");

    let count: i64 = result
        .map(|row| row.try_get("", "count").unwrap_or(0))
        .unwrap_or(0);

    assert_eq!(
        count, 0,
        "Audit record should be cascaded when user is deleted"
    );
}

#[tokio::test]
async fn test_idempotent_up_migration() {
    let db = get_test_db().await.expect("Failed to connect to test database");
    let schema_manager = SchemaManager::new(&db);

    // Run migration twice
    Migration.up(&schema_manager).await.expect("Failed to run first up migration");
    Migration.up(&schema_manager).await.expect("Failed to run second up migration");

    // Verify table still exists
    assert!(
        table_exists(&db, "hr_public", "sync_permission_audit")
            .await
            .expect("Failed to check sync_permission_audit table"),
        "sync_permission_audit table should exist after idempotent up"
    );
}

#[tokio::test]
async fn test_down_migration() {
    let db = get_test_db().await.expect("Failed to connect to test database");
    let schema_manager = SchemaManager::new(&db);

    // Run up migration first
    Migration.up(&schema_manager).await.expect("Failed to run up migration");

    // Verify table exists
    assert!(
        table_exists(&db, "hr_public", "sync_permission_audit")
            .await
            .expect("Failed to check sync_permission_audit table"),
        "sync_permission_audit table should exist before down migration"
    );

    // Run down migration
    Migration.down(&schema_manager).await.expect("Failed to run down migration");

    // Verify table is removed
    assert!(
        !table_exists(&db, "hr_public", "sync_permission_audit")
            .await
            .expect("Failed to check sync_permission_audit table"),
        "sync_permission_audit table should be removed after down migration"
    );
}

#[tokio::test]
async fn test_down_migration_soft_deletes_permissions() {
    let db = get_test_db().await.expect("Failed to connect to test database");
    let schema_manager = SchemaManager::new(&db);

    // Run up migration first
    Migration.up(&schema_manager).await.expect("Failed to run up migration");

    // Get count before down migration
    let before_count = count_permissions_by_resource(&db, "sync")
        .await
        .expect("Failed to count sync permissions");

    // Run down migration
    Migration.down(&schema_manager).await.expect("Failed to run down migration");

    // Get count after down migration (should be 0 for non-deleted)
    let after_count = count_permissions_by_resource(&db, "sync")
        .await
        .expect("Failed to count sync permissions");

    assert!(
        after_count < before_count,
        "Sync permissions should be soft deleted (count decreased)"
    );
}

#[tokio::test]
async fn test_idempotent_down_migration() {
    let db = get_test_db().await.expect("Failed to connect to test database");
    let schema_manager = SchemaManager::new(&db);

    // Run up migration first
    Migration.up(&schema_manager).await.expect("Failed to run up migration");

    // Run down migration twice
    Migration.down(&schema_manager).await.expect("Failed to run first down migration");
    Migration.down(&schema_manager).await.expect("Failed to run second down migration");

    // Verify table remains removed
    assert!(
        !table_exists(&db, "hr_public", "sync_permission_audit")
            .await
            .expect("Failed to check sync_permission_audit table"),
        "sync_permission_audit table should remain removed after idempotent down"
    );
}

#[tokio::test]
async fn test_full_migration_cycle() {
    let db = get_test_db().await.expect("Failed to connect to test database");
    let schema_manager = SchemaManager::new(&db);

    // Run up migration
    Migration.up(&schema_manager).await.expect("Failed to run up migration");

    // Verify table exists
    assert!(
        table_exists(&db, "hr_public", "sync_permission_audit")
            .await
            .expect("Failed to check sync_permission_audit table"),
        "sync_permission_audit table should exist after up"
    );

    // Verify permissions exist
    let sync_count_after_up = count_permissions_by_resource(&db, "sync")
        .await
        .expect("Failed to count sync permissions");
    assert!(
        sync_count_after_up >= 18,
        "Should have sync permissions after up"
    );

    // Run down migration
    Migration.down(&schema_manager).await.expect("Failed to run down migration");

    // Verify table removed
    assert!(
        !table_exists(&db, "hr_public", "sync_permission_audit")
            .await
            .expect("Failed to check sync_permission_audit table"),
        "sync_permission_audit table should be removed after down"
    );

    // Run up migration again
    Migration.up(&schema_manager).await.expect("Failed to run up migration again");

    // Verify table exists again
    assert!(
        table_exists(&db, "hr_public", "sync_permission_audit")
            .await
            .expect("Failed to check sync_permission_audit table"),
        "sync_permission_audit table should exist after second up"
    );

    // Verify permissions exist again
    let sync_count_after_cycle = count_permissions_by_resource(&db, "sync")
        .await
        .expect("Failed to count sync permissions");
    assert!(
        sync_count_after_cycle >= 18,
        "Should have sync permissions after cycle"
    );
}
