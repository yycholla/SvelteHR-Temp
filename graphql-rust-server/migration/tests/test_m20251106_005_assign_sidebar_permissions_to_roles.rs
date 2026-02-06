//! Tests for m20251106_005_assign_sidebar_permissions_to_roles migration
//!
//! This migration seeds RBAC role-permission assignments.
//!
//! **Test Requirements:**
//! - Requires DATABASE_URL environment variable
//! - Requires roles and permissions tables to exist
//! - Tests must run serially: `cargo test --test test_m20251106_005_assign_sidebar_permissions_to_roles --features test-utils -- --test-threads=1`
//!
//! **What We Test:**
//! - Data seeding: INSERT SELECT with CROSS JOIN for 4 roles
//! - Permission counts: Employee (13), Manager (24), HR Manager (40), Admin (wildcard)
//! - Idempotency: ON CONFLICT DO NOTHING allows safe re-runs
//! - Cleanup: DELETE with subqueries removes assignments on rollback

#[cfg(test)]
mod tests {
    use hr_graphql_server::migration::m20251106_005_assign_sidebar_permissions_to_roles::Migration;
    use sea_orm::{Database, DatabaseConnection, DbBackend, Statement};
    use sea_orm_migration::prelude::*;

    /// Set up test database connection
    async fn setup_test_db() -> DatabaseConnection {
        let db_url = std::env::var("DATABASE_URL").unwrap_or_else(|_| {
            "postgres://postgres:postgres@localhost:5432/hr_test".to_string()
        });
        Database::connect(&db_url)
            .await
            .expect("Failed to connect to test database")
    }

    /// Clean up test data
    async fn cleanup_test_data(db: &DatabaseConnection) {
        // Remove all role_permissions assignments for the 4 roles
        let _ = db
            .execute(Statement::from_string(
                DbBackend::Postgres,
                r#"
                DELETE FROM hr_public.role_permissions
                WHERE role_id IN (
                    SELECT id FROM hr_public.roles
                    WHERE name IN ('Employee', 'Manager', 'HR Manager', 'Admin')
                )
                "#
                .to_string(),
            ))
            .await;
    }

    #[tokio::test]
    async fn test_assign_sidebar_permissions_migration_compiles() {
        // If this test runs, the migration compiles successfully
        assert!(true);
    }

    #[tokio::test]
    async fn test_assign_sidebar_permissions_migration_up() {
        let db = setup_test_db().await;
        cleanup_test_data(&db).await;

        // Run the migration
        let schema_manager = SchemaManager::new(&db);
        Migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");
    }

    #[tokio::test]
    async fn test_employee_role_permissions() {
        let db = setup_test_db().await;
        cleanup_test_data(&db).await;

        // Run the migration
        let schema_manager = SchemaManager::new(&db);
        Migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        // Verify Employee role has correct number of permissions
        let result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                SELECT COUNT(*) as count
                FROM hr_public.role_permissions rp
                JOIN hr_public.roles r ON rp.role_id = r.id
                WHERE r.name = 'Employee'
                "#
                .to_string(),
            ))
            .await
            .expect("Query should succeed");

        assert!(result.is_some(), "Query should return result");
        let row = result.unwrap();
        let count: i64 = row.try_get("", "count").unwrap();
        assert_eq!(
            count, 13,
            "Employee role should have 13 read-only permissions"
        );

        // Verify specific Employee permission (dashboard read)
        let dashboard_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                SELECT COUNT(*) as count
                FROM hr_public.role_permissions rp
                JOIN hr_public.roles r ON rp.role_id = r.id
                JOIN hr_public.permissions p ON rp.permission_id = p.id
                WHERE r.name = 'Employee'
                  AND p.resource = 'dashboard'
                  AND p.action = 'read'
                "#
                .to_string(),
            ))
            .await
            .expect("Query should succeed");

        assert!(dashboard_result.is_some(), "Query should return result");
        let row = dashboard_result.unwrap();
        let count: i64 = row.try_get("", "count").unwrap();
        assert_eq!(count, 1, "Employee should have dashboard read permission");
    }

    #[tokio::test]
    async fn test_manager_role_permissions() {
        let db = setup_test_db().await;
        cleanup_test_data(&db).await;

        // Run the migration
        let schema_manager = SchemaManager::new(&db);
        Migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        // Verify Manager role has correct number of permissions
        let result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                SELECT COUNT(*) as count
                FROM hr_public.role_permissions rp
                JOIN hr_public.roles r ON rp.role_id = r.id
                WHERE r.name = 'Manager'
                "#
                .to_string(),
            ))
            .await
            .expect("Query should succeed");

        assert!(result.is_some(), "Query should return result");
        let row = result.unwrap();
        let count: i64 = row.try_get("", "count").unwrap();
        assert_eq!(
            count, 24,
            "Manager role should have 24 permissions (employee + management)"
        );

        // Verify Manager has management write permission
        let mgmt_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                SELECT COUNT(*) as count
                FROM hr_public.role_permissions rp
                JOIN hr_public.roles r ON rp.role_id = r.id
                JOIN hr_public.permissions p ON rp.permission_id = p.id
                WHERE r.name = 'Manager'
                  AND p.resource = 'management'
                  AND p.action = 'write'
                "#
                .to_string(),
            ))
            .await
            .expect("Query should succeed");

        assert!(mgmt_result.is_some(), "Query should return result");
        let row = mgmt_result.unwrap();
        let count: i64 = row.try_get("", "count").unwrap();
        assert_eq!(
            count, 1,
            "Manager should have management write permission"
        );
    }

    #[tokio::test]
    async fn test_hr_manager_role_permissions() {
        let db = setup_test_db().await;
        cleanup_test_data(&db).await;

        // Run the migration
        let schema_manager = SchemaManager::new(&db);
        Migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        // Verify HR Manager role has correct number of permissions
        let result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                SELECT COUNT(*) as count
                FROM hr_public.role_permissions rp
                JOIN hr_public.roles r ON rp.role_id = r.id
                WHERE r.name = 'HR Manager'
                "#
                .to_string(),
            ))
            .await
            .expect("Query should succeed");

        assert!(result.is_some(), "Query should return result");
        let row = result.unwrap();
        let count: i64 = row.try_get("", "count").unwrap();
        assert_eq!(
            count, 40,
            "HR Manager role should have 40 permissions (manager + admin)"
        );

        // Verify HR Manager has admin read permission
        let admin_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                SELECT COUNT(*) as count
                FROM hr_public.role_permissions rp
                JOIN hr_public.roles r ON rp.role_id = r.id
                JOIN hr_public.permissions p ON rp.permission_id = p.id
                WHERE r.name = 'HR Manager'
                  AND p.resource = 'admin'
                  AND p.action = 'read'
                "#
                .to_string(),
            ))
            .await
            .expect("Query should succeed");

        assert!(admin_result.is_some(), "Query should return result");
        let row = admin_result.unwrap();
        let count: i64 = row.try_get("", "count").unwrap();
        assert_eq!(count, 1, "HR Manager should have admin read permission");

        // Verify HR Manager has employee write permission
        let emp_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                SELECT COUNT(*) as count
                FROM hr_public.role_permissions rp
                JOIN hr_public.roles r ON rp.role_id = r.id
                JOIN hr_public.permissions p ON rp.permission_id = p.id
                WHERE r.name = 'HR Manager'
                  AND p.resource = 'employees'
                  AND p.action = 'write'
                "#
                .to_string(),
            ))
            .await
            .expect("Query should succeed");

        assert!(emp_result.is_some(), "Query should return result");
        let row = emp_result.unwrap();
        let count: i64 = row.try_get("", "count").unwrap();
        assert_eq!(
            count, 1,
            "HR Manager should have employees write permission"
        );
    }

    #[tokio::test]
    async fn test_admin_role_wildcard_permission() {
        let db = setup_test_db().await;
        cleanup_test_data(&db).await;

        // Run the migration
        let schema_manager = SchemaManager::new(&db);
        Migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        // Verify Admin role has wildcard permission
        let result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                SELECT COUNT(*) as count
                FROM hr_public.role_permissions rp
                JOIN hr_public.roles r ON rp.role_id = r.id
                JOIN hr_public.permissions p ON rp.permission_id = p.id
                WHERE r.name = 'Admin'
                  AND p.resource = '*'
                  AND p.action = '*'
                "#
                .to_string(),
            ))
            .await
            .expect("Query should succeed");

        assert!(result.is_some(), "Query should return result");
        let row = result.unwrap();
        let count: i64 = row.try_get("", "count").unwrap();
        assert_eq!(
            count, 1,
            "Admin role should have wildcard permission (*:*)"
        );
    }

    #[tokio::test]
    async fn test_assign_sidebar_permissions_idempotent_up() {
        let db = setup_test_db().await;
        cleanup_test_data(&db).await;

        let schema_manager = SchemaManager::new(&db);

        // Run migration first time
        Migration
            .up(&schema_manager)
            .await
            .expect("First migration up should succeed");

        // Count initial assignments
        let initial_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                SELECT COUNT(*) as count
                FROM hr_public.role_permissions rp
                JOIN hr_public.roles r ON rp.role_id = r.id
                WHERE r.name IN ('Employee', 'Manager', 'HR Manager', 'Admin')
                "#
                .to_string(),
            ))
            .await
            .expect("Query should succeed");

        assert!(initial_result.is_some(), "Query should return result");
        let row = initial_result.unwrap();
        let initial_count: i64 = row.try_get("", "count").unwrap();

        // Run migration second time - should succeed due to ON CONFLICT DO NOTHING
        let result = Migration.up(&schema_manager).await;

        assert!(
            result.is_ok(),
            "Second migration up should succeed (idempotent with ON CONFLICT DO NOTHING)"
        );

        // Verify count hasn't changed (no duplicates)
        let final_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                SELECT COUNT(*) as count
                FROM hr_public.role_permissions rp
                JOIN hr_public.roles r ON rp.role_id = r.id
                WHERE r.name IN ('Employee', 'Manager', 'HR Manager', 'Admin')
                "#
                .to_string(),
            ))
            .await
            .expect("Query should succeed");

        assert!(final_result.is_some(), "Query should return result");
        let row = final_result.unwrap();
        let final_count: i64 = row.try_get("", "count").unwrap();

        assert_eq!(
            initial_count, final_count,
            "Should have same number of assignments (no duplicates)"
        );
    }

    #[tokio::test]
    async fn test_assign_sidebar_permissions_migration_down() {
        let db = setup_test_db().await;
        cleanup_test_data(&db).await;

        let schema_manager = SchemaManager::new(&db);

        // Run up migration first
        Migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        // Verify assignments exist
        let before_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                SELECT COUNT(*) as count
                FROM hr_public.role_permissions rp
                JOIN hr_public.roles r ON rp.role_id = r.id
                WHERE r.name IN ('Employee', 'Manager', 'HR Manager', 'Admin')
                "#
                .to_string(),
            ))
            .await
            .expect("Query should succeed");

        assert!(before_result.is_some(), "Query should return result");
        let row = before_result.unwrap();
        let before_count: i64 = row.try_get("", "count").unwrap();
        assert!(
            before_count > 0,
            "Should have role-permission assignments before down migration"
        );

        // Run down migration
        Migration
            .down(&schema_manager)
            .await
            .expect("Migration down should succeed");

        // Verify assignments were removed
        let after_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                SELECT COUNT(*) as count
                FROM hr_public.role_permissions rp
                JOIN hr_public.roles r ON rp.role_id = r.id
                WHERE r.name IN ('Employee', 'Manager', 'HR Manager', 'Admin')
                "#
                .to_string(),
            ))
            .await
            .expect("Query should succeed");

        assert!(after_result.is_some(), "Query should return result");
        let row = after_result.unwrap();
        let after_count: i64 = row.try_get("", "count").unwrap();
        assert_eq!(
            after_count, 0,
            "All role-permission assignments should be removed after down migration"
        );
    }

    #[tokio::test]
    async fn test_assign_sidebar_permissions_idempotent_down() {
        let db = setup_test_db().await;
        cleanup_test_data(&db).await;

        let schema_manager = SchemaManager::new(&db);

        // Run up and down migration
        Migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");
        Migration
            .down(&schema_manager)
            .await
            .expect("First migration down should succeed");

        // Run down again - should succeed (no records to delete)
        let result = Migration.down(&schema_manager).await;

        assert!(
            result.is_ok(),
            "Second migration down should succeed (idempotent - no records to delete)"
        );
    }
}
