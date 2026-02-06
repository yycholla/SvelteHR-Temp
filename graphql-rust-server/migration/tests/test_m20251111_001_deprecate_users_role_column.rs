//! Tests for m20251111_001_deprecate_users_role_column migration
//!
//! This migration deprecates the legacy users.role column and migrates to RBAC.
//!
//! **Test Requirements:**
//! - Requires DATABASE_URL environment variable
//! - Requires users, roles, and user_role_assignments tables to exist
//! - Tests must run serially: `cargo test --test test_m20251111_001_deprecate_users_role_column --features test-utils -- --test-threads=1`
//!
//! **What We Test:**
//! - Data migration: Legacy role → RBAC user_role_assignments
//! - Schema migration: DROP COLUMN role from users table
//! - Role mapping: system_admin→Admin, hr_manager→HR Manager, etc.
//! - Reverse migration: RBAC → legacy role column
//! - Idempotency: IF EXISTS/IF NOT EXISTS allows safe re-runs

#[cfg(test)]
mod tests {
    use hr_graphql_server::migration::m20251111_001_deprecate_users_role_column::Migration;
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
        // Remove test users and role assignments
        let _ = db
            .execute(Statement::from_string(
                DbBackend::Postgres,
                "DELETE FROM hr_public.user_role_assignments WHERE user_id IN (SELECT id FROM hr_public.users WHERE email LIKE 'test_deprecate_%')".to_string(),
            ))
            .await;

        let _ = db
            .execute(Statement::from_string(
                DbBackend::Postgres,
                "DELETE FROM hr_public.users WHERE email LIKE 'test_deprecate_%'".to_string(),
            ))
            .await;

        // Ensure role column exists for testing
        let _ = db
            .execute(Statement::from_string(
                DbBackend::Postgres,
                "ALTER TABLE hr_public.users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'employee' NOT NULL".to_string(),
            ))
            .await;
    }

    #[tokio::test]
    async fn test_deprecate_users_role_migration_compiles() {
        // If this test runs, the migration compiles successfully
        assert!(true);
    }

    #[tokio::test]
    async fn test_deprecate_users_role_migration_up() {
        let db = setup_test_db().await;
        cleanup_test_data(&db).await;

        // Create test users with legacy roles
        db.execute(Statement::from_string(
            DbBackend::Postgres,
            r#"
            INSERT INTO hr_public.users (email, name, role)
            VALUES
                ('test_deprecate_admin@example.com', 'Test Admin', 'system_admin'),
                ('test_deprecate_hr@example.com', 'Test HR', 'hr_manager'),
                ('test_deprecate_manager@example.com', 'Test Manager', 'manager'),
                ('test_deprecate_employee@example.com', 'Test Employee', 'employee')
            "#
            .to_string(),
        ))
        .await
        .expect("Test data insertion should succeed");

        // Run the migration
        let schema_manager = SchemaManager::new(&db);
        Migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");
    }

    #[tokio::test]
    async fn test_legacy_role_migration_system_admin() {
        let db = setup_test_db().await;
        cleanup_test_data(&db).await;

        // Create test user with system_admin role
        db.execute(Statement::from_string(
            DbBackend::Postgres,
            "INSERT INTO hr_public.users (email, name, role) VALUES ('test_deprecate_admin@example.com', 'Test Admin', 'system_admin')".to_string(),
        ))
        .await
        .expect("Test data insertion should succeed");

        // Run the migration
        let schema_manager = SchemaManager::new(&db);
        Migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        // Verify system_admin → Admin role assignment
        let result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                SELECT COUNT(*) as count
                FROM hr_public.user_role_assignments ura
                JOIN hr_public.users u ON ura.user_id = u.id
                JOIN hr_public.roles r ON ura.role_id = r.id
                WHERE u.email = 'test_deprecate_admin@example.com'
                  AND r.name = 'Admin'
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
            "system_admin should be migrated to Admin role"
        );
    }

    #[tokio::test]
    async fn test_legacy_role_migration_hr_manager() {
        let db = setup_test_db().await;
        cleanup_test_data(&db).await;

        // Create test user with hr_manager role
        db.execute(Statement::from_string(
            DbBackend::Postgres,
            "INSERT INTO hr_public.users (email, name, role) VALUES ('test_deprecate_hr@example.com', 'Test HR', 'hr_manager')".to_string(),
        ))
        .await
        .expect("Test data insertion should succeed");

        // Run the migration
        let schema_manager = SchemaManager::new(&db);
        Migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        // Verify hr_manager → HR Manager role assignment
        let result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                SELECT COUNT(*) as count
                FROM hr_public.user_role_assignments ura
                JOIN hr_public.users u ON ura.user_id = u.id
                JOIN hr_public.roles r ON ura.role_id = r.id
                WHERE u.email = 'test_deprecate_hr@example.com'
                  AND r.name = 'HR Manager'
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
            "hr_manager should be migrated to HR Manager role"
        );
    }

    #[tokio::test]
    async fn test_role_column_dropped() {
        let db = setup_test_db().await;
        cleanup_test_data(&db).await;

        // Create test user
        db.execute(Statement::from_string(
            DbBackend::Postgres,
            "INSERT INTO hr_public.users (email, name, role) VALUES ('test_deprecate_check@example.com', 'Test', 'employee')".to_string(),
        ))
        .await
        .expect("Test data insertion should succeed");

        // Verify role column exists before migration
        let before_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                SELECT COUNT(*) as count
                FROM information_schema.columns
                WHERE table_schema = 'hr_public'
                  AND table_name = 'users'
                  AND column_name = 'role'
                "#
                .to_string(),
            ))
            .await
            .expect("Query should succeed");

        assert!(before_result.is_some(), "Query should return result");
        let row = before_result.unwrap();
        let before_count: i64 = row.try_get("", "count").unwrap();
        assert_eq!(before_count, 1, "role column should exist before migration");

        // Run the migration
        let schema_manager = SchemaManager::new(&db);
        Migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        // Verify role column is dropped after migration
        let after_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                SELECT COUNT(*) as count
                FROM information_schema.columns
                WHERE table_schema = 'hr_public'
                  AND table_name = 'users'
                  AND column_name = 'role'
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
            "role column should be dropped after migration"
        );
    }

    #[tokio::test]
    async fn test_idempotent_up() {
        let db = setup_test_db().await;
        cleanup_test_data(&db).await;

        // Create test user
        db.execute(Statement::from_string(
            DbBackend::Postgres,
            "INSERT INTO hr_public.users (email, name, role) VALUES ('test_deprecate_idem@example.com', 'Test', 'employee')".to_string(),
        ))
        .await
        .expect("Test data insertion should succeed");

        let schema_manager = SchemaManager::new(&db);

        // Run migration first time
        Migration
            .up(&schema_manager)
            .await
            .expect("First migration up should succeed");

        // Run migration second time - should succeed due to IF EXISTS and ON CONFLICT
        let result = Migration.up(&schema_manager).await;

        assert!(
            result.is_ok(),
            "Second migration up should succeed (idempotent with IF EXISTS and ON CONFLICT)"
        );
    }

    #[tokio::test]
    async fn test_deprecate_users_role_migration_down() {
        let db = setup_test_db().await;
        cleanup_test_data(&db).await;

        // Create test user with legacy role
        db.execute(Statement::from_string(
            DbBackend::Postgres,
            "INSERT INTO hr_public.users (email, name, role) VALUES ('test_deprecate_down@example.com', 'Test', 'hr_manager')".to_string(),
        ))
        .await
        .expect("Test data insertion should succeed");

        let schema_manager = SchemaManager::new(&db);

        // Run up migration
        Migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        // Verify role column is dropped
        let dropped_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                SELECT COUNT(*) as count
                FROM information_schema.columns
                WHERE table_schema = 'hr_public'
                  AND table_name = 'users'
                  AND column_name = 'role'
                "#
                .to_string(),
            ))
            .await
            .expect("Query should succeed");

        assert!(dropped_result.is_some(), "Query should return result");
        let row = dropped_result.unwrap();
        let dropped_count: i64 = row.try_get("", "count").unwrap();
        assert_eq!(dropped_count, 0, "role column should be dropped");

        // Run down migration
        Migration
            .down(&schema_manager)
            .await
            .expect("Migration down should succeed");

        // Verify role column is restored
        let restored_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                SELECT COUNT(*) as count
                FROM information_schema.columns
                WHERE table_schema = 'hr_public'
                  AND table_name = 'users'
                  AND column_name = 'role'
                "#
                .to_string(),
            ))
            .await
            .expect("Query should succeed");

        assert!(restored_result.is_some(), "Query should return result");
        let row = restored_result.unwrap();
        let restored_count: i64 = row.try_get("", "count").unwrap();
        assert_eq!(
            restored_count, 1,
            "role column should be restored after down migration"
        );
    }

    #[tokio::test]
    async fn test_reverse_migration_rbac_to_legacy() {
        let db = setup_test_db().await;
        cleanup_test_data(&db).await;

        // Create test user with legacy role
        db.execute(Statement::from_string(
            DbBackend::Postgres,
            "INSERT INTO hr_public.users (email, name, role) VALUES ('test_deprecate_reverse@example.com', 'Test', 'manager')".to_string(),
        ))
        .await
        .expect("Test data insertion should succeed");

        let schema_manager = SchemaManager::new(&db);

        // Run up migration (legacy → RBAC)
        Migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        // Run down migration (RBAC → legacy)
        Migration
            .down(&schema_manager)
            .await
            .expect("Migration down should succeed");

        // Verify role column has correct value
        let result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                SELECT role
                FROM hr_public.users
                WHERE email = 'test_deprecate_reverse@example.com'
                "#
                .to_string(),
            ))
            .await
            .expect("Query should succeed");

        assert!(result.is_some(), "Query should return result");
        let row = result.unwrap();
        let role: String = row.try_get("", "role").unwrap();
        assert_eq!(
            role, "manager",
            "Role should be restored to 'manager' after down migration"
        );
    }

    #[tokio::test]
    async fn test_idempotent_down() {
        let db = setup_test_db().await;
        cleanup_test_data(&db).await;

        // Create test user
        db.execute(Statement::from_string(
            DbBackend::Postgres,
            "INSERT INTO hr_public.users (email, name, role) VALUES ('test_deprecate_idem_down@example.com', 'Test', 'employee')".to_string(),
        ))
        .await
        .expect("Test data insertion should succeed");

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

        // Run down again - should succeed due to IF NOT EXISTS
        let result = Migration.down(&schema_manager).await;

        assert!(
            result.is_ok(),
            "Second migration down should succeed (idempotent with IF NOT EXISTS)"
        );
    }
}
