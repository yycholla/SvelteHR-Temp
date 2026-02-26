//! Tests for m20251106_004_add_sidebar_view_permissions migration
//!
//! This migration seeds permission data for sidebar menu visibility.
//!
//! **Test Requirements:**
//! - Requires DATABASE_URL environment variable
//! - Tests must run serially: `cargo test --test test_m20251106_004_add_sidebar_view_permissions --features test-utils -- --test-threads=1`
//!
//! **What We Test:**
//! - Data seeding: INSERT 22 permission records
//! - Idempotency: ON CONFLICT DO NOTHING allows safe re-runs
//! - Cleanup: DELETE removes permissions on rollback
//! - Verification: Permissions are actually inserted and removed

#[cfg(test)]
mod tests {
    use hr_graphql_server::migration::m20251106_004_add_sidebar_view_permissions::Migration;
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
        // Remove test permissions
        let _ = db
            .execute(Statement::from_string(
                DbBackend::Postgres,
                r#"
                DELETE FROM hr_public.permissions WHERE (resource, action) IN (
                    ('dashboard', 'read'),
                    ('events', 'read'),
                    ('events', 'write'),
                    ('notifications', 'read'),
                    ('notifications', 'write'),
                    ('activities', 'read'),
                    ('attendance', 'read'),
                    ('attendance', 'write'),
                    ('tasks', 'read'),
                    ('tasks', 'write'),
                    ('tasks', 'create'),
                    ('tasks', 'delete'),
                    ('tasks', 'reassign'),
                    ('performance', 'read'),
                    ('performance', 'write'),
                    ('goals', 'read'),
                    ('goals', 'write'),
                    ('reports', 'execute'),
                    ('reports', 'analytics'),
                    ('admin', 'read'),
                    ('admin', 'write')
                )
                "#
                .to_string(),
            ))
            .await;
    }

    #[tokio::test]
    async fn test_sidebar_permissions_migration_compiles() {
        // If this test runs, the migration compiles successfully
        assert!(true);
    }

    #[tokio::test]
    async fn test_sidebar_permissions_migration_up() {
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
    async fn test_sidebar_permissions_inserted() {
        let db = setup_test_db().await;
        cleanup_test_data(&db).await;

        // Run the migration
        let schema_manager = SchemaManager::new(&db);
        Migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        // Verify permissions were inserted
        let result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                SELECT COUNT(*) as count
                FROM hr_public.permissions
                WHERE (resource, action) IN (
                    ('dashboard', 'read'),
                    ('events', 'read'),
                    ('events', 'write'),
                    ('notifications', 'read'),
                    ('notifications', 'write'),
                    ('activities', 'read'),
                    ('attendance', 'read'),
                    ('attendance', 'write'),
                    ('tasks', 'read'),
                    ('tasks', 'write'),
                    ('tasks', 'create'),
                    ('tasks', 'delete'),
                    ('tasks', 'reassign'),
                    ('performance', 'read'),
                    ('performance', 'write'),
                    ('goals', 'read'),
                    ('goals', 'write'),
                    ('reports', 'execute'),
                    ('reports', 'analytics'),
                    ('admin', 'read'),
                    ('admin', 'write')
                )
                "#
                .to_string(),
            ))
            .await
            .expect("Query should succeed");

        assert!(result.is_some(), "Query should return result");
        let row = result.unwrap();
        let count: i64 = row.try_get("", "count").unwrap();

        assert_eq!(count, 21, "Should insert 21 permission records");
    }

    #[tokio::test]
    async fn test_sidebar_permissions_specific_records() {
        let db = setup_test_db().await;
        cleanup_test_data(&db).await;

        // Run the migration
        let schema_manager = SchemaManager::new(&db);
        Migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        // Verify specific dashboard permission
        let dashboard_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                SELECT resource, action, description
                FROM hr_public.permissions
                WHERE resource = 'dashboard' AND action = 'read'
                "#
                .to_string(),
            ))
            .await
            .expect("Query should succeed");

        assert!(
            dashboard_result.is_some(),
            "Dashboard read permission should exist"
        );
        let row = dashboard_result.unwrap();
        let description: String = row.try_get("", "description").unwrap();
        assert_eq!(description, "View dashboard");

        // Verify tasks permissions (5 total)
        let tasks_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                SELECT COUNT(*) as count
                FROM hr_public.permissions
                WHERE resource = 'tasks'
                "#
                .to_string(),
            ))
            .await
            .expect("Query should succeed");

        assert!(tasks_result.is_some(), "Query should return result");
        let row = tasks_result.unwrap();
        let count: i64 = row.try_get("", "count").unwrap();
        assert_eq!(count, 5, "Should have 5 tasks permissions");

        // Verify admin permissions (2 total)
        let admin_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                SELECT COUNT(*) as count
                FROM hr_public.permissions
                WHERE resource = 'admin'
                "#
                .to_string(),
            ))
            .await
            .expect("Query should succeed");

        assert!(admin_result.is_some(), "Query should return result");
        let row = admin_result.unwrap();
        let count: i64 = row.try_get("", "count").unwrap();
        assert_eq!(count, 2, "Should have 2 admin permissions");
    }

    #[tokio::test]
    async fn test_sidebar_permissions_idempotent_up() {
        let db = setup_test_db().await;
        cleanup_test_data(&db).await;

        let schema_manager = SchemaManager::new(&db);

        // Run migration first time
        Migration
            .up(&schema_manager)
            .await
            .expect("First migration up should succeed");

        // Run migration second time - should succeed due to ON CONFLICT DO NOTHING
        let result = Migration.up(&schema_manager).await;

        assert!(
            result.is_ok(),
            "Second migration up should succeed (idempotent with ON CONFLICT DO NOTHING)"
        );

        // Verify still have exactly 21 permissions (not duplicated)
        let count_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                SELECT COUNT(*) as count
                FROM hr_public.permissions
                WHERE (resource, action) IN (
                    ('dashboard', 'read'),
                    ('events', 'read'),
                    ('events', 'write'),
                    ('notifications', 'read'),
                    ('notifications', 'write'),
                    ('activities', 'read'),
                    ('attendance', 'read'),
                    ('attendance', 'write'),
                    ('tasks', 'read'),
                    ('tasks', 'write'),
                    ('tasks', 'create'),
                    ('tasks', 'delete'),
                    ('tasks', 'reassign'),
                    ('performance', 'read'),
                    ('performance', 'write'),
                    ('goals', 'read'),
                    ('goals', 'write'),
                    ('reports', 'execute'),
                    ('reports', 'analytics'),
                    ('admin', 'read'),
                    ('admin', 'write')
                )
                "#
                .to_string(),
            ))
            .await
            .expect("Query should succeed");

        assert!(count_result.is_some(), "Query should return result");
        let row = count_result.unwrap();
        let count: i64 = row.try_get("", "count").unwrap();
        assert_eq!(
            count, 21,
            "Should still have 21 permissions (no duplicates)"
        );
    }

    #[tokio::test]
    async fn test_sidebar_permissions_migration_down() {
        let db = setup_test_db().await;
        cleanup_test_data(&db).await;

        let schema_manager = SchemaManager::new(&db);

        // Run up migration first
        Migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        // Run down migration
        Migration
            .down(&schema_manager)
            .await
            .expect("Migration down should succeed");

        // Verify permissions were removed
        let result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                SELECT COUNT(*) as count
                FROM hr_public.permissions
                WHERE (resource, action) IN (
                    ('dashboard', 'read'),
                    ('events', 'read'),
                    ('events', 'write'),
                    ('notifications', 'read'),
                    ('notifications', 'write'),
                    ('activities', 'read'),
                    ('attendance', 'read'),
                    ('attendance', 'write'),
                    ('tasks', 'read'),
                    ('tasks', 'write'),
                    ('tasks', 'create'),
                    ('tasks', 'delete'),
                    ('tasks', 'reassign'),
                    ('performance', 'read'),
                    ('performance', 'write'),
                    ('goals', 'read'),
                    ('goals', 'write'),
                    ('reports', 'execute'),
                    ('reports', 'analytics'),
                    ('admin', 'read'),
                    ('admin', 'write')
                )
                "#
                .to_string(),
            ))
            .await
            .expect("Query should succeed");

        assert!(result.is_some(), "Query should return result");
        let row = result.unwrap();
        let count: i64 = row.try_get("", "count").unwrap();
        assert_eq!(
            count, 0,
            "All sidebar permissions should be removed after down migration"
        );
    }

    #[tokio::test]
    async fn test_sidebar_permissions_idempotent_down() {
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
