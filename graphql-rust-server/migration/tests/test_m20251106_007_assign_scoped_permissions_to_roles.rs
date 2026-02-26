//! Tests for m20251106_007_assign_scoped_permissions_to_roles migration
//!
//! This migration seeds scoped role-permission assignments for fine-grained RBAC.
//!
//! **Test Requirements:**
//! - Requires DATABASE_URL environment variable
//! - Requires roles and scoped permissions tables to exist
//! - Tests must run serially: `cargo test --test test_m20251106_007_assign_scoped_permissions_to_roles --features test-utils -- --test-threads=1`
//!
//! **What We Test:**
//! - Data seeding: INSERT SELECT with CROSS JOIN for 3 roles
//! - Permission counts: Employee (19), Manager (30), HR Manager (70)
//! - Scope verification: read:self, read:team, read:all appropriately assigned
//! - Idempotency: ON CONFLICT DO NOTHING allows safe re-runs
//! - Cleanup: DELETE with subqueries removes assignments on rollback

#[cfg(test)]
mod tests {
    use hr_graphql_server::migration::m20251106_007_assign_scoped_permissions_to_roles::Migration;
    use sea_orm::{Database, DatabaseConnection, DbBackend, Statement};
    use sea_orm_migration::prelude::*;

    /// Set up test database connection
    async fn setup_test_db() -> DatabaseConnection {
        let db_url = std::env::var("DATABASE_URL")
            .unwrap_or_else(|_| "postgres://postgres:postgres@localhost:5432/hr_test".to_string());
        Database::connect(&db_url)
            .await
            .expect("Failed to connect to test database")
    }

    /// Clean up test data
    async fn cleanup_test_data(db: &DatabaseConnection) {
        // Remove scoped permission assignments for the 3 roles
        let _ = db
            .execute(Statement::from_string(
                DbBackend::Postgres,
                r#"
                DELETE FROM hr_public.role_permissions
                WHERE role_id IN (
                    SELECT id FROM hr_public.roles
                    WHERE name IN ('Employee', 'Manager', 'HR Manager')
                )
                AND permission_id IN (
                    SELECT id FROM hr_public.permissions
                    WHERE action IN ('read:self', 'read:team', 'read:all')
                )
                "#
                .to_string(),
            ))
            .await;
    }

    #[tokio::test]
    async fn test_assign_scoped_permissions_migration_compiles() {
        // If this test runs, the migration compiles successfully
        assert!(true);
    }

    #[tokio::test]
    async fn test_assign_scoped_permissions_migration_up() {
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
    async fn test_employee_role_scoped_permissions() {
        let db = setup_test_db().await;
        cleanup_test_data(&db).await;

        // Run the migration
        let schema_manager = SchemaManager::new(&db);
        Migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        // Verify Employee role has 19 scoped permissions
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
        assert_eq!(count, 19, "Employee role should have 19 scoped permissions");

        // Verify Employee has read:self permissions (mostly self-access)
        let self_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                SELECT COUNT(*) as count
                FROM hr_public.role_permissions rp
                JOIN hr_public.roles r ON rp.role_id = r.id
                JOIN hr_public.permissions p ON rp.permission_id = p.id
                WHERE r.name = 'Employee'
                  AND p.action = 'read:self'
                "#
                .to_string(),
            ))
            .await
            .expect("Query should succeed");

        assert!(self_result.is_some(), "Query should return result");
        let row = self_result.unwrap();
        let count: i64 = row.try_get("", "count").unwrap();
        assert!(
            count >= 10,
            "Employee should have at least 10 read:self permissions"
        );

        // Verify Employee can write leave requests
        let leave_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                SELECT COUNT(*) as count
                FROM hr_public.role_permissions rp
                JOIN hr_public.roles r ON rp.role_id = r.id
                JOIN hr_public.permissions p ON rp.permission_id = p.id
                WHERE r.name = 'Employee'
                  AND p.resource = 'leave'
                  AND p.action = 'write'
                "#
                .to_string(),
            ))
            .await
            .expect("Query should succeed");

        assert!(leave_result.is_some(), "Query should return result");
        let row = leave_result.unwrap();
        let count: i64 = row.try_get("", "count").unwrap();
        assert_eq!(count, 1, "Employee should have leave write permission");
    }

    #[tokio::test]
    async fn test_manager_role_scoped_permissions() {
        let db = setup_test_db().await;
        cleanup_test_data(&db).await;

        // Run the migration
        let schema_manager = SchemaManager::new(&db);
        Migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        // Verify Manager role has 30 scoped permissions
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
        assert_eq!(count, 30, "Manager role should have 30 scoped permissions");

        // Verify Manager has read:team permissions (team-level access)
        let team_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                SELECT COUNT(*) as count
                FROM hr_public.role_permissions rp
                JOIN hr_public.roles r ON rp.role_id = r.id
                JOIN hr_public.permissions p ON rp.permission_id = p.id
                WHERE r.name = 'Manager'
                  AND p.action = 'read:team'
                "#
                .to_string(),
            ))
            .await
            .expect("Query should succeed");

        assert!(team_result.is_some(), "Query should return result");
        let row = team_result.unwrap();
        let count: i64 = row.try_get("", "count").unwrap();
        assert!(
            count >= 15,
            "Manager should have at least 15 read:team permissions"
        );

        // Verify Manager can approve leave
        let approve_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                SELECT COUNT(*) as count
                FROM hr_public.role_permissions rp
                JOIN hr_public.roles r ON rp.role_id = r.id
                JOIN hr_public.permissions p ON rp.permission_id = p.id
                WHERE r.name = 'Manager'
                  AND p.resource = 'leave'
                  AND p.action = 'approve'
                "#
                .to_string(),
            ))
            .await
            .expect("Query should succeed");

        assert!(approve_result.is_some(), "Query should return result");
        let row = approve_result.unwrap();
        let count: i64 = row.try_get("", "count").unwrap();
        assert_eq!(count, 1, "Manager should have leave approve permission");
    }

    #[tokio::test]
    async fn test_hr_manager_role_scoped_permissions() {
        let db = setup_test_db().await;
        cleanup_test_data(&db).await;

        // Run the migration
        let schema_manager = SchemaManager::new(&db);
        Migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        // Verify HR Manager role has 70 scoped permissions
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
            count, 70,
            "HR Manager role should have 70 scoped permissions"
        );

        // Verify HR Manager has read:all permissions (org-wide access)
        let all_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                SELECT COUNT(*) as count
                FROM hr_public.role_permissions rp
                JOIN hr_public.roles r ON rp.role_id = r.id
                JOIN hr_public.permissions p ON rp.permission_id = p.id
                WHERE r.name = 'HR Manager'
                  AND p.action = 'read:all'
                "#
                .to_string(),
            ))
            .await
            .expect("Query should succeed");

        assert!(all_result.is_some(), "Query should return result");
        let row = all_result.unwrap();
        let count: i64 = row.try_get("", "count").unwrap();
        assert!(
            count >= 15,
            "HR Manager should have at least 15 read:all permissions"
        );

        // Verify HR Manager can write employees
        let write_result = db
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

        assert!(write_result.is_some(), "Query should return result");
        let row = write_result.unwrap();
        let count: i64 = row.try_get("", "count").unwrap();
        assert_eq!(
            count, 1,
            "HR Manager should have employees write permission"
        );

        // Verify HR Manager can delete employees
        let delete_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                SELECT COUNT(*) as count
                FROM hr_public.role_permissions rp
                JOIN hr_public.roles r ON rp.role_id = r.id
                JOIN hr_public.permissions p ON rp.permission_id = p.id
                WHERE r.name = 'HR Manager'
                  AND p.resource = 'employees'
                  AND p.action = 'delete'
                "#
                .to_string(),
            ))
            .await
            .expect("Query should succeed");

        assert!(delete_result.is_some(), "Query should return result");
        let row = delete_result.unwrap();
        let count: i64 = row.try_get("", "count").unwrap();
        assert_eq!(
            count, 1,
            "HR Manager should have employees delete permission"
        );
    }

    #[tokio::test]
    async fn test_scope_hierarchy() {
        let db = setup_test_db().await;
        cleanup_test_data(&db).await;

        // Run the migration
        let schema_manager = SchemaManager::new(&db);
        Migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        // Verify Employee has mostly read:self (self-access)
        let emp_self_count = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                SELECT COUNT(*) as count
                FROM hr_public.role_permissions rp
                JOIN hr_public.roles r ON rp.role_id = r.id
                JOIN hr_public.permissions p ON rp.permission_id = p.id
                WHERE r.name = 'Employee' AND p.action = 'read:self'
                "#
                .to_string(),
            ))
            .await
            .expect("Query should succeed")
            .unwrap();
        let emp_self: i64 = emp_self_count.try_get("", "count").unwrap();

        // Verify Manager has mostly read:team (team-access)
        let mgr_team_count = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                SELECT COUNT(*) as count
                FROM hr_public.role_permissions rp
                JOIN hr_public.roles r ON rp.role_id = r.id
                JOIN hr_public.permissions p ON rp.permission_id = p.id
                WHERE r.name = 'Manager' AND p.action = 'read:team'
                "#
                .to_string(),
            ))
            .await
            .expect("Query should succeed")
            .unwrap();
        let mgr_team: i64 = mgr_team_count.try_get("", "count").unwrap();

        // Verify HR Manager has mostly read:all (org-wide access)
        let hr_all_count = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                SELECT COUNT(*) as count
                FROM hr_public.role_permissions rp
                JOIN hr_public.roles r ON rp.role_id = r.id
                JOIN hr_public.permissions p ON rp.permission_id = p.id
                WHERE r.name = 'HR Manager' AND p.action = 'read:all'
                "#
                .to_string(),
            ))
            .await
            .expect("Query should succeed")
            .unwrap();
        let hr_all: i64 = hr_all_count.try_get("", "count").unwrap();

        // Verify hierarchy: self < team < all
        assert!(emp_self > 0, "Employee should have read:self permissions");
        assert!(mgr_team > 0, "Manager should have read:team permissions");
        assert!(hr_all > 0, "HR Manager should have read:all permissions");

        // HR should have more read:all than Manager has read:team
        assert!(
            hr_all > mgr_team,
            "HR Manager's read:all count should be higher than Manager's read:team count"
        );
    }

    #[tokio::test]
    async fn test_assign_scoped_permissions_idempotent_up() {
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
                WHERE r.name IN ('Employee', 'Manager', 'HR Manager')
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
                WHERE r.name IN ('Employee', 'Manager', 'HR Manager')
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
            "Should have same number of scoped assignments (no duplicates)"
        );
    }

    #[tokio::test]
    async fn test_assign_scoped_permissions_migration_down() {
        let db = setup_test_db().await;
        cleanup_test_data(&db).await;

        let schema_manager = SchemaManager::new(&db);

        // Run up migration first
        Migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        // Verify scoped assignments exist
        let before_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                SELECT COUNT(*) as count
                FROM hr_public.role_permissions rp
                JOIN hr_public.roles r ON rp.role_id = r.id
                JOIN hr_public.permissions p ON rp.permission_id = p.id
                WHERE r.name IN ('Employee', 'Manager', 'HR Manager')
                  AND p.action IN ('read:self', 'read:team', 'read:all')
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
            "Should have scoped role-permission assignments before down migration"
        );

        // Run down migration
        Migration
            .down(&schema_manager)
            .await
            .expect("Migration down should succeed");

        // Verify scoped assignments were removed
        let after_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                SELECT COUNT(*) as count
                FROM hr_public.role_permissions rp
                JOIN hr_public.roles r ON rp.role_id = r.id
                JOIN hr_public.permissions p ON rp.permission_id = p.id
                WHERE r.name IN ('Employee', 'Manager', 'HR Manager')
                  AND p.action IN ('read:self', 'read:team', 'read:all')
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
            "All scoped role-permission assignments should be removed after down migration"
        );
    }

    #[tokio::test]
    async fn test_assign_scoped_permissions_idempotent_down() {
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
