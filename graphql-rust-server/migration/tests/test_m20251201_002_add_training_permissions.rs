//! Tests for m20251201_002_add_training_permissions migration
//!
//! This migration seeds training permissions and assigns them to roles.
//! Tests verify permission creation, role assignments, and idempotency.

use sea_orm::{ConnectionTrait, Database, DbBackend, DbErr, Statement};
use sea_orm_migration::prelude::*;

// Import the migration
use hr_graphql_server::migration::m20251201_002_add_training_permissions::Migration;
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

/// Test up migration creates 3 training permissions
#[tokio::test]
async fn test_up_creates_training_permissions() -> Result<(), DbErr> {
    let db = Database::connect(get_test_db_url()).await?;

    // Run migration
    let migration = Migration;
    let schema_manager = SchemaManager::new(&db);
    migration.up(&schema_manager).await?;

    // Verify 3 training permissions exist
    let result = db
        .query_one(Statement::from_string(
            DbBackend::Postgres,
            "SELECT COUNT(*) as count FROM hr_public.permissions WHERE resource = 'training'"
                .to_string(),
        ))
        .await?;

    let count: i64 = result.unwrap().try_get("", "count")?;
    assert_eq!(count, 3, "Should have 3 training permissions");

    // Verify specific permissions
    let read_exists = db
        .query_one(Statement::from_string(
            DbBackend::Postgres,
            "SELECT COUNT(*) as count FROM hr_public.permissions
             WHERE resource = 'training' AND action = 'read'"
                .to_string(),
        ))
        .await?
        .unwrap()
        .try_get::<i64>("", "count")?;
    assert_eq!(read_exists, 1, "training:read should exist");

    let write_exists = db
        .query_one(Statement::from_string(
            DbBackend::Postgres,
            "SELECT COUNT(*) as count FROM hr_public.permissions
             WHERE resource = 'training' AND action = 'write'"
                .to_string(),
        ))
        .await?
        .unwrap()
        .try_get::<i64>("", "count")?;
    assert_eq!(write_exists, 1, "training:write should exist");

    let assign_exists = db
        .query_one(Statement::from_string(
            DbBackend::Postgres,
            "SELECT COUNT(*) as count FROM hr_public.permissions
             WHERE resource = 'training' AND action = 'assign'"
                .to_string(),
        ))
        .await?
        .unwrap()
        .try_get::<i64>("", "count")?;
    assert_eq!(assign_exists, 1, "training:assign should exist");

    Ok(())
}

/// Test Employee role gets training:read permission
#[tokio::test]
async fn test_employee_role_gets_read_permission() -> Result<(), DbErr> {
    let db = Database::connect(get_test_db_url()).await?;

    let migration = Migration;
    let schema_manager = SchemaManager::new(&db);
    migration.up(&schema_manager).await?;

    // Verify Employee has exactly 1 training permission (read)
    let result = db
        .query_one(Statement::from_string(
            DbBackend::Postgres,
            "SELECT COUNT(*) as count FROM hr_public.role_permissions rp
             JOIN hr_public.roles r ON rp.role_id = r.id
             JOIN hr_public.permissions p ON rp.permission_id = p.id
             WHERE r.name = 'Employee' AND p.resource = 'training'"
                .to_string(),
        ))
        .await?;

    let count: i64 = result.unwrap().try_get("", "count")?;
    assert_eq!(
        count, 1,
        "Employee should have 1 training permission (read)"
    );

    // Verify it's specifically the 'read' permission
    let read_count = db
        .query_one(Statement::from_string(
            DbBackend::Postgres,
            "SELECT COUNT(*) as count FROM hr_public.role_permissions rp
             JOIN hr_public.roles r ON rp.role_id = r.id
             JOIN hr_public.permissions p ON rp.permission_id = p.id
             WHERE r.name = 'Employee' AND p.resource = 'training' AND p.action = 'read'"
                .to_string(),
        ))
        .await?
        .unwrap()
        .try_get::<i64>("", "count")?;
    assert_eq!(read_count, 1, "Employee should have training:read");

    Ok(())
}

/// Test Manager role gets training:read and training:assign permissions
#[tokio::test]
async fn test_manager_role_gets_read_and_assign_permissions() -> Result<(), DbErr> {
    let db = Database::connect(get_test_db_url()).await?;

    let migration = Migration;
    let schema_manager = SchemaManager::new(&db);
    migration.up(&schema_manager).await?;

    // Verify Manager has exactly 2 training permissions
    let result = db
        .query_one(Statement::from_string(
            DbBackend::Postgres,
            "SELECT COUNT(*) as count FROM hr_public.role_permissions rp
             JOIN hr_public.roles r ON rp.role_id = r.id
             JOIN hr_public.permissions p ON rp.permission_id = p.id
             WHERE r.name = 'Manager' AND p.resource = 'training'"
                .to_string(),
        ))
        .await?;

    let count: i64 = result.unwrap().try_get("", "count")?;
    assert_eq!(
        count, 2,
        "Manager should have 2 training permissions (read, assign)"
    );

    // Verify specific permissions
    let read_count = db
        .query_one(Statement::from_string(
            DbBackend::Postgres,
            "SELECT COUNT(*) as count FROM hr_public.role_permissions rp
             JOIN hr_public.roles r ON rp.role_id = r.id
             JOIN hr_public.permissions p ON rp.permission_id = p.id
             WHERE r.name = 'Manager' AND p.resource = 'training' AND p.action = 'read'"
                .to_string(),
        ))
        .await?
        .unwrap()
        .try_get::<i64>("", "count")?;
    assert_eq!(read_count, 1, "Manager should have training:read");

    let assign_count = db
        .query_one(Statement::from_string(
            DbBackend::Postgres,
            "SELECT COUNT(*) as count FROM hr_public.role_permissions rp
             JOIN hr_public.roles r ON rp.role_id = r.id
             JOIN hr_public.permissions p ON rp.permission_id = p.id
             WHERE r.name = 'Manager' AND p.resource = 'training' AND p.action = 'assign'"
                .to_string(),
        ))
        .await?
        .unwrap()
        .try_get::<i64>("", "count")?;
    assert_eq!(assign_count, 1, "Manager should have training:assign");

    Ok(())
}

/// Test HR Manager role gets all 3 training permissions
#[tokio::test]
async fn test_hr_manager_role_gets_all_permissions() -> Result<(), DbErr> {
    let db = Database::connect(get_test_db_url()).await?;

    let migration = Migration;
    let schema_manager = SchemaManager::new(&db);
    migration.up(&schema_manager).await?;

    // Verify HR Manager has exactly 3 training permissions
    let result = db
        .query_one(Statement::from_string(
            DbBackend::Postgres,
            "SELECT COUNT(*) as count FROM hr_public.role_permissions rp
             JOIN hr_public.roles r ON rp.role_id = r.id
             JOIN hr_public.permissions p ON rp.permission_id = p.id
             WHERE r.name = 'HR Manager' AND p.resource = 'training'"
                .to_string(),
        ))
        .await?;

    let count: i64 = result.unwrap().try_get("", "count")?;
    assert_eq!(
        count, 3,
        "HR Manager should have 3 training permissions (read, write, assign)"
    );

    // Verify specific permissions
    let read_count = db
        .query_one(Statement::from_string(
            DbBackend::Postgres,
            "SELECT COUNT(*) as count FROM hr_public.role_permissions rp
             JOIN hr_public.roles r ON rp.role_id = r.id
             JOIN hr_public.permissions p ON rp.permission_id = p.id
             WHERE r.name = 'HR Manager' AND p.resource = 'training' AND p.action = 'read'"
                .to_string(),
        ))
        .await?
        .unwrap()
        .try_get::<i64>("", "count")?;
    assert_eq!(read_count, 1, "HR Manager should have training:read");

    let write_count = db
        .query_one(Statement::from_string(
            DbBackend::Postgres,
            "SELECT COUNT(*) as count FROM hr_public.role_permissions rp
             JOIN hr_public.roles r ON rp.role_id = r.id
             JOIN hr_public.permissions p ON rp.permission_id = p.id
             WHERE r.name = 'HR Manager' AND p.resource = 'training' AND p.action = 'write'"
                .to_string(),
        ))
        .await?
        .unwrap()
        .try_get::<i64>("", "count")?;
    assert_eq!(write_count, 1, "HR Manager should have training:write");

    let assign_count = db
        .query_one(Statement::from_string(
            DbBackend::Postgres,
            "SELECT COUNT(*) as count FROM hr_public.role_permissions rp
             JOIN hr_public.roles r ON rp.role_id = r.id
             JOIN hr_public.permissions p ON rp.permission_id = p.id
             WHERE r.name = 'HR Manager' AND p.resource = 'training' AND p.action = 'assign'"
                .to_string(),
        ))
        .await?
        .unwrap()
        .try_get::<i64>("", "count")?;
    assert_eq!(assign_count, 1, "HR Manager should have training:assign");

    Ok(())
}

/// Test idempotency - running up migration twice doesn't duplicate records
#[tokio::test]
async fn test_up_migration_is_idempotent() -> Result<(), DbErr> {
    let db = Database::connect(get_test_db_url()).await?;

    let migration = Migration;
    let schema_manager = SchemaManager::new(&db);

    // Run migration twice
    migration.up(&schema_manager).await?;
    migration.up(&schema_manager).await?;

    // Verify still only 3 permissions
    let perm_count = db
        .query_one(Statement::from_string(
            DbBackend::Postgres,
            "SELECT COUNT(*) as count FROM hr_public.permissions WHERE resource = 'training'"
                .to_string(),
        ))
        .await?
        .unwrap()
        .try_get::<i64>("", "count")?;
    assert_eq!(
        perm_count, 3,
        "Should still have exactly 3 training permissions after running twice"
    );

    // Verify Employee still has 1 permission
    let employee_count = db
        .query_one(Statement::from_string(
            DbBackend::Postgres,
            "SELECT COUNT(*) as count FROM hr_public.role_permissions rp
             JOIN hr_public.roles r ON rp.role_id = r.id
             JOIN hr_public.permissions p ON rp.permission_id = p.id
             WHERE r.name = 'Employee' AND p.resource = 'training'"
                .to_string(),
        ))
        .await?
        .unwrap()
        .try_get::<i64>("", "count")?;
    assert_eq!(
        employee_count, 1,
        "Employee should still have 1 training permission after running twice"
    );

    // Verify Manager still has 2 permissions
    let manager_count = db
        .query_one(Statement::from_string(
            DbBackend::Postgres,
            "SELECT COUNT(*) as count FROM hr_public.role_permissions rp
             JOIN hr_public.roles r ON rp.role_id = r.id
             JOIN hr_public.permissions p ON rp.permission_id = p.id
             WHERE r.name = 'Manager' AND p.resource = 'training'"
                .to_string(),
        ))
        .await?
        .unwrap()
        .try_get::<i64>("", "count")?;
    assert_eq!(
        manager_count, 2,
        "Manager should still have 2 training permissions after running twice"
    );

    // Verify HR Manager still has 3 permissions
    let hr_manager_count = db
        .query_one(Statement::from_string(
            DbBackend::Postgres,
            "SELECT COUNT(*) as count FROM hr_public.role_permissions rp
             JOIN hr_public.roles r ON rp.role_id = r.id
             JOIN hr_public.permissions p ON rp.permission_id = p.id
             WHERE r.name = 'HR Manager' AND p.resource = 'training'"
                .to_string(),
        ))
        .await?
        .unwrap()
        .try_get::<i64>("", "count")?;
    assert_eq!(
        hr_manager_count, 3,
        "HR Manager should still have 3 training permissions after running twice"
    );

    Ok(())
}

/// Test down migration removes training permissions
#[tokio::test]
async fn test_down_removes_training_permissions() -> Result<(), DbErr> {
    let db = Database::connect(get_test_db_url()).await?;

    let migration = Migration;
    let schema_manager = SchemaManager::new(&db);

    // Run up then down
    migration.up(&schema_manager).await?;
    migration.down(&schema_manager).await?;

    // Verify no training permissions remain
    let result = db
        .query_one(Statement::from_string(
            DbBackend::Postgres,
            "SELECT COUNT(*) as count FROM hr_public.permissions WHERE resource = 'training'"
                .to_string(),
        ))
        .await?;

    let count: i64 = result.unwrap().try_get("", "count")?;
    assert_eq!(
        count, 0,
        "All training permissions should be removed after down migration"
    );

    Ok(())
}

/// Test down migration cascades to role_permissions
#[tokio::test]
async fn test_down_cascades_to_role_permissions() -> Result<(), DbErr> {
    let db = Database::connect(get_test_db_url()).await?;

    let migration = Migration;
    let schema_manager = SchemaManager::new(&db);

    // Run up then down
    migration.up(&schema_manager).await?;
    migration.down(&schema_manager).await?;

    // Verify no training role_permissions remain for any role
    let employee_count = db
        .query_one(Statement::from_string(
            DbBackend::Postgres,
            "SELECT COUNT(*) as count FROM hr_public.role_permissions rp
             JOIN hr_public.roles r ON rp.role_id = r.id
             JOIN hr_public.permissions p ON rp.permission_id = p.id
             WHERE r.name = 'Employee' AND p.resource = 'training'"
                .to_string(),
        ))
        .await?
        .unwrap()
        .try_get::<i64>("", "count")?;
    assert_eq!(
        employee_count, 0,
        "Employee should have no training permissions after down migration"
    );

    let manager_count = db
        .query_one(Statement::from_string(
            DbBackend::Postgres,
            "SELECT COUNT(*) as count FROM hr_public.role_permissions rp
             JOIN hr_public.roles r ON rp.role_id = r.id
             JOIN hr_public.permissions p ON rp.permission_id = p.id
             WHERE r.name = 'Manager' AND p.resource = 'training'"
                .to_string(),
        ))
        .await?
        .unwrap()
        .try_get::<i64>("", "count")?;
    assert_eq!(
        manager_count, 0,
        "Manager should have no training permissions after down migration"
    );

    let hr_manager_count = db
        .query_one(Statement::from_string(
            DbBackend::Postgres,
            "SELECT COUNT(*) as count FROM hr_public.role_permissions rp
             JOIN hr_public.roles r ON rp.role_id = r.id
             JOIN hr_public.permissions p ON rp.permission_id = p.id
             WHERE r.name = 'HR Manager' AND p.resource = 'training'"
                .to_string(),
        ))
        .await?
        .unwrap()
        .try_get::<i64>("", "count")?;
    assert_eq!(
        hr_manager_count, 0,
        "HR Manager should have no training permissions after down migration"
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
        "Down migration should succeed even when run twice"
    );

    // Verify still no training permissions
    let count = db
        .query_one(Statement::from_string(
            DbBackend::Postgres,
            "SELECT COUNT(*) as count FROM hr_public.permissions WHERE resource = 'training'"
                .to_string(),
        ))
        .await?
        .unwrap()
        .try_get::<i64>("", "count")?;
    assert_eq!(
        count, 0,
        "Should still have 0 training permissions after running down twice"
    );

    Ok(())
}

/// Test permission descriptions are correct
#[tokio::test]
async fn test_permission_descriptions() -> Result<(), DbErr> {
    let db = Database::connect(get_test_db_url()).await?;

    let migration = Migration;
    let schema_manager = SchemaManager::new(&db);
    migration.up(&schema_manager).await?;

    // Verify read permission description
    let read_desc = db
        .query_one(Statement::from_string(
            DbBackend::Postgres,
            "SELECT description FROM hr_public.permissions
             WHERE resource = 'training' AND action = 'read'"
                .to_string(),
        ))
        .await?
        .unwrap()
        .try_get::<String>("", "description")?;
    assert_eq!(
        read_desc, "View training modules and content",
        "Read permission should have correct description"
    );

    // Verify write permission description
    let write_desc = db
        .query_one(Statement::from_string(
            DbBackend::Postgres,
            "SELECT description FROM hr_public.permissions
             WHERE resource = 'training' AND action = 'write'"
                .to_string(),
        ))
        .await?
        .unwrap()
        .try_get::<String>("", "description")?;
    assert_eq!(
        write_desc, "Create and manage training modules",
        "Write permission should have correct description"
    );

    // Verify assign permission description
    let assign_desc = db
        .query_one(Statement::from_string(
            DbBackend::Postgres,
            "SELECT description FROM hr_public.permissions
             WHERE resource = 'training' AND action = 'assign'"
                .to_string(),
        ))
        .await?
        .unwrap()
        .try_get::<String>("", "description")?;
    assert_eq!(
        assign_desc, "Assign training to employees",
        "Assign permission should have correct description"
    );

    Ok(())
}
