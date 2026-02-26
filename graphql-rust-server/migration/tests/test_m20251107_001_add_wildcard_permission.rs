//! Tests for m20251107_001_add_wildcard_permission migration
//!
//! This migration seeds wildcard permissions and assigns them to admin roles.
//!
//! **Test Requirements:**
//! - Requires DATABASE_URL environment variable
//! - Requires roles and permissions tables to exist
//! - Tests must run serially: `cargo test --test test_m20251107_001_add_wildcard_permission --features test-utils -- --test-threads=1`
//!
//! **What We Test:**
//! - Permission creation: 1 full wildcard (*:*) + 20 category wildcards
//! - Role assignments: Admin and system_admin get wildcard permissions
//! - Idempotency: ON CONFLICT DO NOTHING allows safe re-runs
//! - Cleanup: DELETE removes wildcard permissions and assignments on rollback

#[cfg(test)]
mod tests {
    use hr_graphql_server::migration::m20251107_001_add_wildcard_permission::Migration;
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
        // Remove wildcard permission assignments
        let _ = db
            .execute(Statement::from_string(
                DbBackend::Postgres,
                r#"
                DELETE FROM hr_public.role_permissions
                WHERE permission_id IN (
                    SELECT id FROM hr_public.permissions
                    WHERE action = '*'
                )
                "#
                .to_string(),
            ))
            .await;

        // Remove wildcard permissions
        let _ = db
            .execute(Statement::from_string(
                DbBackend::Postgres,
                "DELETE FROM hr_public.permissions WHERE action = '*'".to_string(),
            ))
            .await;
    }

    #[tokio::test]
    async fn test_wildcard_permission_migration_compiles() {
        // If this test runs, the migration compiles successfully
        assert!(true);
    }

    #[tokio::test]
    async fn test_wildcard_permission_migration_up() {
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
    async fn test_wildcard_permissions_created() {
        let db = setup_test_db().await;
        cleanup_test_data(&db).await;

        // Run the migration
        let schema_manager = SchemaManager::new(&db);
        Migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        // Verify total wildcard permissions (1 full + 20 category)
        let result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                SELECT COUNT(*) as count
                FROM hr_public.permissions
                WHERE action = '*'
                "#
                .to_string(),
            ))
            .await
            .expect("Query should succeed");

        assert!(result.is_some(), "Query should return result");
        let row = result.unwrap();
        let count: i64 = row.try_get("", "count").unwrap();
        assert_eq!(
            count, 21,
            "Should create 21 wildcard permissions (1 full + 20 category)"
        );
    }

    #[tokio::test]
    async fn test_full_wildcard_permission() {
        let db = setup_test_db().await;
        cleanup_test_data(&db).await;

        // Run the migration
        let schema_manager = SchemaManager::new(&db);
        Migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        // Verify full wildcard permission (*:*)
        let result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                SELECT resource, action, description
                FROM hr_public.permissions
                WHERE resource = '*' AND action = '*'
                "#
                .to_string(),
            ))
            .await
            .expect("Query should succeed");

        assert!(
            result.is_some(),
            "Full wildcard permission (*:*) should exist"
        );
        let row = result.unwrap();
        let description: String = row.try_get("", "description").unwrap();
        assert!(
            description.contains("full access"),
            "Description should mention full access"
        );
    }

    #[tokio::test]
    async fn test_category_wildcard_permissions() {
        let db = setup_test_db().await;
        cleanup_test_data(&db).await;

        // Run the migration
        let schema_manager = SchemaManager::new(&db);
        Migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        // Verify category wildcard permissions (20 total)
        let result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                SELECT COUNT(*) as count
                FROM hr_public.permissions
                WHERE action = '*' AND resource != '*'
                "#
                .to_string(),
            ))
            .await
            .expect("Query should succeed");

        assert!(result.is_some(), "Query should return result");
        let row = result.unwrap();
        let count: i64 = row.try_get("", "count").unwrap();
        assert_eq!(count, 20, "Should create 20 category wildcard permissions");

        // Verify specific category wildcards
        let categories = vec![
            "employees",
            "departments",
            "users",
            "roles",
            "permissions",
            "documents",
            "management",
        ];

        for category in categories {
            let cat_result = db
                .query_one(Statement::from_string(
                    DbBackend::Postgres,
                    format!(
                        "SELECT COUNT(*) as count FROM hr_public.permissions
                         WHERE resource = '{}' AND action = '*'",
                        category
                    ),
                ))
                .await
                .expect("Query should succeed");

            assert!(cat_result.is_some(), "Query should return result");
            let row = cat_result.unwrap();
            let count: i64 = row.try_get("", "count").unwrap();
            assert_eq!(count, 1, "Should have {}:* wildcard permission", category);
        }
    }

    #[tokio::test]
    async fn test_admin_role_wildcard_assignment() {
        let db = setup_test_db().await;
        cleanup_test_data(&db).await;

        // Run the migration
        let schema_manager = SchemaManager::new(&db);
        Migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        // Verify Admin role has full wildcard permission (*:*)
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
            "Admin role should have full wildcard permission (*:*)"
        );
    }

    #[tokio::test]
    async fn test_admin_role_category_wildcards() {
        let db = setup_test_db().await;
        cleanup_test_data(&db).await;

        // Run the migration
        let schema_manager = SchemaManager::new(&db);
        Migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        // Verify Admin role has category wildcard permissions
        let result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                SELECT COUNT(*) as count
                FROM hr_public.role_permissions rp
                JOIN hr_public.roles r ON rp.role_id = r.id
                JOIN hr_public.permissions p ON rp.permission_id = p.id
                WHERE r.name = 'Admin'
                  AND p.action = '*'
                  AND p.resource != '*'
                "#
                .to_string(),
            ))
            .await
            .expect("Query should succeed");

        assert!(result.is_some(), "Query should return result");
        let row = result.unwrap();
        let count: i64 = row.try_get("", "count").unwrap();
        assert_eq!(
            count, 20,
            "Admin role should have 20 category wildcard permissions"
        );
    }

    #[tokio::test]
    async fn test_system_admin_role_wildcards() {
        let db = setup_test_db().await;
        cleanup_test_data(&db).await;

        // Create system_admin role if it doesn't exist (for testing)
        let _ = db
            .execute(Statement::from_string(
                DbBackend::Postgres,
                r#"
                INSERT INTO hr_public.roles (name, description)
                VALUES ('system_admin', 'System Administrator')
                ON CONFLICT (name) DO NOTHING
                "#
                .to_string(),
            ))
            .await;

        // Run the migration
        let schema_manager = SchemaManager::new(&db);
        Migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        // Verify system_admin role has full wildcard permission
        let result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                SELECT COUNT(*) as count
                FROM hr_public.role_permissions rp
                JOIN hr_public.roles r ON rp.role_id = r.id
                JOIN hr_public.permissions p ON rp.permission_id = p.id
                WHERE r.name = 'system_admin'
                  AND p.resource = '*'
                  AND p.action = '*'
                "#
                .to_string(),
            ))
            .await
            .expect("Query should succeed");

        if result.is_some() {
            let row = result.unwrap();
            let count: i64 = row.try_get("", "count").unwrap();
            assert_eq!(
                count, 1,
                "system_admin role should have full wildcard permission (*:*)"
            );
        }
    }

    #[tokio::test]
    async fn test_wildcard_permission_idempotent_up() {
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
                "SELECT COUNT(*) as count FROM hr_public.permissions WHERE action = '*'"
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
                "SELECT COUNT(*) as count FROM hr_public.permissions WHERE action = '*'"
                    .to_string(),
            ))
            .await
            .expect("Query should succeed");

        assert!(final_result.is_some(), "Query should return result");
        let row = final_result.unwrap();
        let final_count: i64 = row.try_get("", "count").unwrap();

        assert_eq!(
            initial_count, final_count,
            "Should have same number of wildcard permissions (no duplicates)"
        );
    }

    #[tokio::test]
    async fn test_wildcard_permission_migration_down() {
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
                "SELECT COUNT(*) as count FROM hr_public.permissions WHERE action = '*'"
                    .to_string(),
            ))
            .await
            .expect("Query should succeed");

        assert!(before_result.is_some(), "Query should return result");
        let row = before_result.unwrap();
        let before_count: i64 = row.try_get("", "count").unwrap();
        assert_eq!(
            before_count, 21,
            "Should have 21 wildcard permissions before down migration"
        );

        // Run down migration
        Migration
            .down(&schema_manager)
            .await
            .expect("Migration down should succeed");

        // Verify wildcard permissions were removed
        let after_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                "SELECT COUNT(*) as count FROM hr_public.permissions WHERE action = '*'"
                    .to_string(),
            ))
            .await
            .expect("Query should succeed");

        assert!(after_result.is_some(), "Query should return result");
        let row = after_result.unwrap();
        let after_count: i64 = row.try_get("", "count").unwrap();
        assert_eq!(
            after_count, 0,
            "All wildcard permissions should be removed after down migration"
        );
    }

    #[tokio::test]
    async fn test_wildcard_permission_idempotent_down() {
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

    #[tokio::test]
    async fn test_wildcard_permission_assignments_removed_on_down() {
        let db = setup_test_db().await;
        cleanup_test_data(&db).await;

        let schema_manager = SchemaManager::new(&db);

        // Run up migration
        Migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        // Verify role_permissions assignments exist
        let before_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                SELECT COUNT(*) as count
                FROM hr_public.role_permissions rp
                JOIN hr_public.permissions p ON rp.permission_id = p.id
                WHERE p.action = '*'
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
            "Should have wildcard permission assignments before down migration"
        );

        // Run down migration
        Migration
            .down(&schema_manager)
            .await
            .expect("Migration down should succeed");

        // Verify role_permissions assignments were removed
        let after_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                SELECT COUNT(*) as count
                FROM hr_public.role_permissions rp
                JOIN hr_public.permissions p ON rp.permission_id = p.id
                WHERE p.action = '*'
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
            "All wildcard permission assignments should be removed after down migration"
        );
    }
}
