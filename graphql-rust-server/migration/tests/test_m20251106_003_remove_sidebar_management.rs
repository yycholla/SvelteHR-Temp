//! Tests for m20251106_003_remove_sidebar_management migration
//!
//! This migration permanently removes sidebar management tables.
//!
//! **Test Requirements:**
//! - Requires DATABASE_URL environment variable
//! - Tests must run serially: `cargo test --test test_m20251106_003_remove_sidebar_management --features test-utils -- --test-threads=1`
//!
//! **What We Test:**
//! - Schema changes: DROP TABLE operations for 3 tables
//! - Idempotency: up and down migrations can run multiple times
//! - Verification: tables are actually dropped after migration

#[cfg(test)]
mod tests {
    use hr_graphql_server::migration::m20251106_003_remove_sidebar_management::Migration;
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

    /// Create sidebar tables for testing (simulate pre-migration state)
    async fn create_sidebar_tables(db: &DatabaseConnection) {
        // Create tables that will be dropped by the migration
        let _ = db
            .execute(Statement::from_string(
                DbBackend::Postgres,
                r#"
                CREATE TABLE IF NOT EXISTS hr_public.sidebar_items (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    name TEXT NOT NULL
                )
                "#
                .to_string(),
            ))
            .await;

        let _ = db
            .execute(Statement::from_string(
                DbBackend::Postgres,
                r#"
                CREATE TABLE IF NOT EXISTS hr_public.sidebar_sections (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    name TEXT NOT NULL
                )
                "#
                .to_string(),
            ))
            .await;

        let _ = db
            .execute(Statement::from_string(
                DbBackend::Postgres,
                r#"
                CREATE TABLE IF NOT EXISTS hr_public.sidebar_layouts (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    name TEXT NOT NULL
                )
                "#
                .to_string(),
            ))
            .await;
    }

    #[tokio::test]
    async fn test_remove_sidebar_migration_compiles() {
        // If this test runs, the migration compiles successfully with SeaORM builders
        assert!(true);
    }

    #[tokio::test]
    async fn test_remove_sidebar_migration_up() {
        let db = setup_test_db().await;

        // Create sidebar tables first
        create_sidebar_tables(&db).await;

        // Run the migration
        let schema_manager = SchemaManager::new(&db);
        Migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");
    }

    #[tokio::test]
    async fn test_remove_sidebar_tables_dropped() {
        let db = setup_test_db().await;

        // Create sidebar tables first
        create_sidebar_tables(&db).await;

        // Run the migration
        let schema_manager = SchemaManager::new(&db);
        Migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        // Verify sidebar_items table is dropped
        let items_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = 'hr_public'
                  AND table_name = 'sidebar_items'
                "#
                .to_string(),
            ))
            .await
            .expect("Query should succeed");

        assert!(
            items_result.is_none(),
            "sidebar_items table should be dropped"
        );

        // Verify sidebar_sections table is dropped
        let sections_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = 'hr_public'
                  AND table_name = 'sidebar_sections'
                "#
                .to_string(),
            ))
            .await
            .expect("Query should succeed");

        assert!(
            sections_result.is_none(),
            "sidebar_sections table should be dropped"
        );

        // Verify sidebar_layouts table is dropped
        let layouts_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = 'hr_public'
                  AND table_name = 'sidebar_layouts'
                "#
                .to_string(),
            ))
            .await
            .expect("Query should succeed");

        assert!(
            layouts_result.is_none(),
            "sidebar_layouts table should be dropped"
        );
    }

    #[tokio::test]
    async fn test_remove_sidebar_idempotent_up() {
        let db = setup_test_db().await;

        // Create sidebar tables first
        create_sidebar_tables(&db).await;

        let schema_manager = SchemaManager::new(&db);

        // Run migration first time
        Migration
            .up(&schema_manager)
            .await
            .expect("First migration up should succeed");

        // Run migration second time - should succeed due to IF EXISTS
        let result = Migration.up(&schema_manager).await;

        assert!(
            result.is_ok(),
            "Second migration up should succeed (idempotent with IF EXISTS)"
        );
    }

    #[tokio::test]
    async fn test_remove_sidebar_cascade() {
        let db = setup_test_db().await;

        // Create sidebar tables with a foreign key relationship
        let _ = db
            .execute(Statement::from_string(
                DbBackend::Postgres,
                r#"
                DROP TABLE IF EXISTS hr_public.sidebar_layouts CASCADE;
                DROP TABLE IF EXISTS hr_public.sidebar_sections CASCADE;
                DROP TABLE IF EXISTS hr_public.sidebar_items CASCADE;

                CREATE TABLE hr_public.sidebar_items (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    name TEXT NOT NULL
                );

                CREATE TABLE hr_public.sidebar_sections (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    name TEXT NOT NULL,
                    item_id UUID REFERENCES hr_public.sidebar_items(id)
                );

                CREATE TABLE hr_public.sidebar_layouts (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    name TEXT NOT NULL,
                    section_id UUID REFERENCES hr_public.sidebar_sections(id)
                );
                "#
                .to_string(),
            ))
            .await;

        // Run the migration - CASCADE should handle foreign keys
        let schema_manager = SchemaManager::new(&db);
        let result = Migration.up(&schema_manager).await;

        assert!(
            result.is_ok(),
            "Migration should succeed with CASCADE handling foreign keys"
        );

        // Verify all tables are dropped
        let tables_result = db
            .query_all(Statement::from_string(
                DbBackend::Postgres,
                r#"
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = 'hr_public'
                  AND table_name IN ('sidebar_items', 'sidebar_sections', 'sidebar_layouts')
                "#
                .to_string(),
            ))
            .await
            .expect("Query should succeed");

        assert!(
            tables_result.is_empty(),
            "All sidebar tables should be dropped despite foreign keys"
        );
    }

    #[tokio::test]
    async fn test_remove_sidebar_migration_down() {
        let db = setup_test_db().await;
        let schema_manager = SchemaManager::new(&db);

        // Run down migration (no-op)
        let result = Migration.down(&schema_manager).await;

        assert!(result.is_ok(), "Migration down should succeed (no-op)");
    }

    #[tokio::test]
    async fn test_remove_sidebar_idempotent_down() {
        let db = setup_test_db().await;
        let schema_manager = SchemaManager::new(&db);

        // Run down migration multiple times (no-op, should always succeed)
        Migration
            .down(&schema_manager)
            .await
            .expect("First migration down should succeed");

        let result = Migration.down(&schema_manager).await;

        assert!(
            result.is_ok(),
            "Second migration down should succeed (idempotent no-op)"
        );
    }

    #[tokio::test]
    async fn test_remove_sidebar_down_non_reversible() {
        let db = setup_test_db().await;

        // Create and drop tables
        create_sidebar_tables(&db).await;
        let schema_manager = SchemaManager::new(&db);
        Migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        // Run down migration
        Migration
            .down(&schema_manager)
            .await
            .expect("Migration down should succeed");

        // Verify tables are NOT restored (down is non-reversible)
        let result = db
            .query_all(Statement::from_string(
                DbBackend::Postgres,
                r#"
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = 'hr_public'
                  AND table_name IN ('sidebar_items', 'sidebar_sections', 'sidebar_layouts')
                "#
                .to_string(),
            ))
            .await
            .expect("Query should succeed");

        assert!(
            result.is_empty(),
            "Tables should NOT be restored (down migration is non-reversible)"
        );
    }
}
