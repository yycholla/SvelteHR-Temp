//! Tests for m20251106_006_add_scoped_permissions migration
//!
//! This migration seeds 104 scoped permission records for fine-grained RBAC.
//!
//! **Test Requirements:**
//! - Requires DATABASE_URL environment variable
//! - Tests must run serially: `cargo test --test test_m20251106_006_add_scoped_permissions --features test-utils -- --test-threads=1`
//!
//! **What We Test:**
//! - Data seeding: INSERT 104 scoped permissions (read:self, read:team, read:all)
//! - Resource coverage: 20 resource categories
//! - Idempotency: ON CONFLICT DO NOTHING allows safe re-runs
//! - Cleanup: DELETE removes scoped permissions on rollback

#[cfg(test)]
mod tests {
    use hr_graphql_server::migration::m20251106_006_add_scoped_permissions::Migration;
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
        // Remove scoped permissions
        let _ = db
            .execute(Statement::from_string(
                DbBackend::Postgres,
                r#"
                DELETE FROM hr_public.permissions
                WHERE action IN ('read:self', 'read:team', 'read:all')
                   OR (resource, action) IN (
                       ('dashboard', 'write'), ('dashboard', 'delete'),
                       ('users', 'write'), ('users', 'delete'),
                       ('employees', 'write'), ('employees', 'delete'),
                       ('departments', 'write'), ('departments', 'delete'),
                       ('events', 'delete'),
                       ('activities', 'write'), ('activities', 'delete'),
                       ('notifications', 'delete'),
                       ('attendance', 'delete'),
                       ('leave', 'write'), ('leave', 'delete'),
                       ('performance', 'delete'),
                       ('reviews', 'write'), ('reviews', 'delete'),
                       ('goals', 'delete'),
                       ('reports', 'write'), ('reports', 'delete'),
                       ('documents', 'write'), ('documents', 'delete'),
                       ('management', 'write'), ('management', 'delete'),
                       ('teams', 'write'), ('teams', 'delete'),
                       ('roles', 'write'), ('roles', 'delete'),
                       ('permissions', 'write'), ('permissions', 'delete'),
                       ('payroll', 'write'), ('payroll', 'delete'),
                       ('admin', 'delete')
                   )
                "#
                .to_string(),
            ))
            .await;
    }

    #[tokio::test]
    async fn test_scoped_permissions_migration_compiles() {
        // If this test runs, the migration compiles successfully
        assert!(true);
    }

    #[tokio::test]
    async fn test_scoped_permissions_migration_up() {
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
    async fn test_scoped_permissions_total_count() {
        let db = setup_test_db().await;
        cleanup_test_data(&db).await;

        // Run the migration
        let schema_manager = SchemaManager::new(&db);
        Migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        // Verify total count of scoped permissions (104 total)
        let result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                SELECT COUNT(*) as count
                FROM hr_public.permissions
                WHERE action IN ('read:self', 'read:team', 'read:all')
                   OR (resource, action) IN (
                       ('dashboard', 'write'), ('dashboard', 'delete'),
                       ('users', 'write'), ('users', 'delete'),
                       ('employees', 'write'), ('employees', 'delete'),
                       ('departments', 'write'), ('departments', 'delete'),
                       ('events', 'delete'),
                       ('activities', 'write'), ('activities', 'delete'),
                       ('notifications', 'delete'),
                       ('attendance', 'delete'),
                       ('leave', 'write'), ('leave', 'delete'),
                       ('performance', 'delete'),
                       ('reviews', 'write'), ('reviews', 'delete'),
                       ('goals', 'delete'),
                       ('reports', 'write'), ('reports', 'delete'),
                       ('documents', 'write'), ('documents', 'delete'),
                       ('management', 'write'), ('management', 'delete'),
                       ('teams', 'write'), ('teams', 'delete'),
                       ('roles', 'write'), ('roles', 'delete'),
                       ('permissions', 'write'), ('permissions', 'delete'),
                       ('payroll', 'write'), ('payroll', 'delete'),
                       ('admin', 'delete')
                   )
                "#
                .to_string(),
            ))
            .await
            .expect("Query should succeed");

        assert!(result.is_some(), "Query should return result");
        let row = result.unwrap();
        let count: i64 = row.try_get("", "count").unwrap();
        assert_eq!(count, 104, "Should insert 104 scoped permission records");
    }

    #[tokio::test]
    async fn test_scoped_read_permissions() {
        let db = setup_test_db().await;
        cleanup_test_data(&db).await;

        // Run the migration
        let schema_manager = SchemaManager::new(&db);
        Migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        // Verify scoped read permissions (read:self, read:team, read:all)
        let result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                SELECT COUNT(*) as count
                FROM hr_public.permissions
                WHERE action IN ('read:self', 'read:team', 'read:all')
                "#
                .to_string(),
            ))
            .await
            .expect("Query should succeed");

        assert!(result.is_some(), "Query should return result");
        let row = result.unwrap();
        let count: i64 = row.try_get("", "count").unwrap();
        assert_eq!(
            count, 60,
            "Should have 60 scoped read permissions (20 resources × 3 scopes)"
        );
    }

    #[tokio::test]
    async fn test_specific_scoped_permissions() {
        let db = setup_test_db().await;
        cleanup_test_data(&db).await;

        // Run the migration
        let schema_manager = SchemaManager::new(&db);
        Migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        // Verify employees:read:self permission
        let self_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                SELECT resource, action, description
                FROM hr_public.permissions
                WHERE resource = 'employees' AND action = 'read:self'
                "#
                .to_string(),
            ))
            .await
            .expect("Query should succeed");

        assert!(
            self_result.is_some(),
            "employees:read:self permission should exist"
        );
        let row = self_result.unwrap();
        let description: String = row.try_get("", "description").unwrap();
        assert_eq!(description, "View own employee record");

        // Verify employees:read:team permission
        let team_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                SELECT resource, action, description
                FROM hr_public.permissions
                WHERE resource = 'employees' AND action = 'read:team'
                "#
                .to_string(),
            ))
            .await
            .expect("Query should succeed");

        assert!(
            team_result.is_some(),
            "employees:read:team permission should exist"
        );
        let row = team_result.unwrap();
        let description: String = row.try_get("", "description").unwrap();
        assert_eq!(description, "View team employee records");

        // Verify employees:read:all permission
        let all_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                SELECT resource, action, description
                FROM hr_public.permissions
                WHERE resource = 'employees' AND action = 'read:all'
                "#
                .to_string(),
            ))
            .await
            .expect("Query should succeed");

        assert!(
            all_result.is_some(),
            "employees:read:all permission should exist"
        );
        let row = all_result.unwrap();
        let description: String = row.try_get("", "description").unwrap();
        assert_eq!(description, "View all employee records");
    }

    #[tokio::test]
    async fn test_resource_coverage() {
        let db = setup_test_db().await;
        cleanup_test_data(&db).await;

        // Run the migration
        let schema_manager = SchemaManager::new(&db);
        Migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        // Verify 20 resource categories have scoped permissions
        let resources = vec![
            "dashboard",
            "users",
            "employees",
            "departments",
            "events",
            "tasks",
            "activities",
            "notifications",
            "attendance",
            "leave",
            "performance",
            "reviews",
            "goals",
            "reports",
            "documents",
            "management",
            "teams",
            "roles",
            "permissions",
            "admin",
        ];

        for resource in resources {
            let result = db
                .query_one(Statement::from_string(
                    DbBackend::Postgres,
                    format!(
                        "SELECT COUNT(*) as count FROM hr_public.permissions WHERE resource = '{}'",
                        resource
                    ),
                ))
                .await
                .expect("Query should succeed");

            assert!(result.is_some(), "Query should return result");
            let row = result.unwrap();
            let count: i64 = row.try_get("", "count").unwrap();
            assert!(
                count >= 3,
                "Resource '{}' should have at least 3 scoped permissions (read:self, read:team, read:all)",
                resource
            );
        }
    }

    #[tokio::test]
    async fn test_dashboard_permissions() {
        let db = setup_test_db().await;
        cleanup_test_data(&db).await;

        // Run the migration
        let schema_manager = SchemaManager::new(&db);
        Migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        // Verify dashboard has 5 permissions (3 scoped read + write + delete)
        let result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                SELECT COUNT(*) as count
                FROM hr_public.permissions
                WHERE resource = 'dashboard'
                  AND action IN ('read:self', 'read:team', 'read:all', 'write', 'delete')
                "#
                .to_string(),
            ))
            .await
            .expect("Query should succeed");

        assert!(result.is_some(), "Query should return result");
        let row = result.unwrap();
        let count: i64 = row.try_get("", "count").unwrap();
        assert_eq!(
            count, 5,
            "Dashboard should have 5 permissions (3 read scopes + write + delete)"
        );
    }

    #[tokio::test]
    async fn test_scoped_permissions_idempotent_up() {
        let db = setup_test_db().await;
        cleanup_test_data(&db).await;

        let schema_manager = SchemaManager::new(&db);

        // Run migration first time
        Migration
            .up(&schema_manager)
            .await
            .expect("First migration up should succeed");

        // Count initial permissions
        let initial_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                SELECT COUNT(*) as count
                FROM hr_public.permissions
                WHERE action IN ('read:self', 'read:team', 'read:all')
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
                FROM hr_public.permissions
                WHERE action IN ('read:self', 'read:team', 'read:all')
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
            "Should have same number of scoped permissions (no duplicates)"
        );
    }

    #[tokio::test]
    async fn test_scoped_permissions_migration_down() {
        let db = setup_test_db().await;
        cleanup_test_data(&db).await;

        let schema_manager = SchemaManager::new(&db);

        // Run up migration first
        Migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        // Verify permissions exist
        let before_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                SELECT COUNT(*) as count
                FROM hr_public.permissions
                WHERE action IN ('read:self', 'read:team', 'read:all')
                "#
                .to_string(),
            ))
            .await
            .expect("Query should succeed");

        assert!(before_result.is_some(), "Query should return result");
        let row = before_result.unwrap();
        let before_count: i64 = row.try_get("", "count").unwrap();
        assert_eq!(
            before_count, 60,
            "Should have 60 scoped read permissions before down migration"
        );

        // Run down migration
        Migration
            .down(&schema_manager)
            .await
            .expect("Migration down should succeed");

        // Verify scoped permissions were removed
        let after_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                SELECT COUNT(*) as count
                FROM hr_public.permissions
                WHERE action IN ('read:self', 'read:team', 'read:all')
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
            "All scoped permissions should be removed after down migration"
        );
    }

    #[tokio::test]
    async fn test_scoped_permissions_idempotent_down() {
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
