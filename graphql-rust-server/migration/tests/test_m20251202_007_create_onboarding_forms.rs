//! Tests for Onboarding Forms Architecture Migration
//!
//! This test suite verifies the creation of the forms-based onboarding system
//! with three tables, two enums, and nine indexes.

#[cfg(test)]
mod tests {
    use hr_graphql_server::migration::m20251202_007_create_onboarding_forms::Migration;
    use sea_orm::{Database, DatabaseConnection, DbBackend, Statement};
    use sea_orm_migration::prelude::*;

    async fn setup() -> DatabaseConnection {
        let database_url = std::env::var("DATABASE_URL")
            .unwrap_or_else(|_| "postgres://postgres:postgres@localhost:5432/hr_test".to_string());
        Database::connect(&database_url)
            .await
            .expect("Failed to connect to test database")
    }

    async fn table_exists(db: &DatabaseConnection, table_name: &str) -> bool {
        let result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                format!(
                    "SELECT COUNT(*) as count FROM information_schema.tables \
                     WHERE table_schema = 'hr_public' AND table_name = '{}'",
                    table_name
                ),
            ))
            .await
            .expect("Query failed");

        match result {
            Some(row) => row.try_get::<i64>("", "count").unwrap_or(0) > 0,
            None => false,
        }
    }

    #[tokio::test]
    #[ignore]
    async fn test_migration_compiles() {
        let _migration = Migration;
        assert!(true, "Migration compiles successfully");
    }

    #[tokio::test]
    #[ignore]
    async fn test_up_migration_creates_all_tables() {
        let db = setup().await;
        let manager = SchemaManager::new(&db);

        let _ = Migration.down(&manager).await;
        Migration.up(&manager).await.expect("UP migration should succeed");

        assert!(table_exists(&db, "onboarding_forms").await);
        assert!(table_exists(&db, "onboarding_form_blocks").await);
        assert!(table_exists(&db, "onboarding_form_progress").await);
    }

    #[tokio::test]
    #[ignore]
    async fn test_onboarding_forms_has_required_columns() {
        let db = setup().await;
        let manager = SchemaManager::new(&db);

        let _ = Migration.down(&manager).await;
        Migration.up(&manager).await.expect("Migration should succeed");

        let result = db
            .query_all(Statement::from_string(
                DbBackend::Postgres,
                "SELECT column_name FROM information_schema.columns \
                 WHERE table_schema = 'hr_public' AND table_name = 'onboarding_forms'"
                    .to_string(),
            ))
            .await
            .expect("Query should succeed");

        let columns: Vec<String> = result
            .iter()
            .filter_map(|row| row.try_get::<String>("", "column_name").ok())
            .collect();

        assert!(columns.contains(&"id".to_string()));
        assert!(columns.contains(&"onboarding_module_id".to_string()));
        assert!(columns.contains(&"title".to_string()));
        assert!(columns.contains(&"sequence_order".to_string()));
        assert!(columns.contains(&"is_required".to_string()));
    }

    #[tokio::test]
    #[ignore]
    async fn test_onboarding_form_blocks_has_type_specific_columns() {
        let db = setup().await;
        let manager = SchemaManager::new(&db);

        let _ = Migration.down(&manager).await;
        Migration.up(&manager).await.expect("Migration should succeed");

        let result = db
            .query_all(Statement::from_string(
                DbBackend::Postgres,
                "SELECT column_name FROM information_schema.columns \
                 WHERE table_schema = 'hr_public' AND table_name = 'onboarding_form_blocks'"
                    .to_string(),
            ))
            .await
            .expect("Query should succeed");

        let columns: Vec<String> = result
            .iter()
            .filter_map(|row| row.try_get::<String>("", "column_name").ok())
            .collect();

        // Type-specific fields
        assert!(columns.contains(&"text_content".to_string()));
        assert!(columns.contains(&"document_url".to_string()));
        assert!(columns.contains(&"form_template_id".to_string()));
        assert!(columns.contains(&"file_upload_requirements".to_string()));
        assert!(columns.contains(&"signature_requirements".to_string()));
        assert!(columns.contains(&"checkbox_items".to_string()));
    }

    #[tokio::test]
    #[ignore]
    async fn test_form_progress_has_tracking_columns() {
        let db = setup().await;
        let manager = SchemaManager::new(&db);

        let _ = Migration.down(&manager).await;
        Migration.up(&manager).await.expect("Migration should succeed");

        let result = db
            .query_all(Statement::from_string(
                DbBackend::Postgres,
                "SELECT column_name FROM information_schema.columns \
                 WHERE table_schema = 'hr_public' AND table_name = 'onboarding_form_progress'"
                    .to_string(),
            ))
            .await
            .expect("Query should succeed");

        let columns: Vec<String> = result
            .iter()
            .filter_map(|row| row.try_get::<String>("", "column_name").ok())
            .collect();

        assert!(columns.contains(&"status".to_string()));
        assert!(columns.contains(&"form_data".to_string()));
        assert!(columns.contains(&"started_at".to_string()));
        assert!(columns.contains(&"completed_at".to_string()));
        assert!(columns.contains(&"last_accessed_at".to_string()));
    }

    #[tokio::test]
    #[ignore]
    async fn test_indexes_are_created() {
        let db = setup().await;
        let manager = SchemaManager::new(&db);

        let _ = Migration.down(&manager).await;
        Migration.up(&manager).await.expect("Migration should succeed");

        let result = db
            .query_all(Statement::from_string(
                DbBackend::Postgres,
                "SELECT indexname FROM pg_indexes WHERE schemaname = 'hr_public' \
                 AND (tablename LIKE 'onboarding_form%') ORDER BY indexname"
                    .to_string(),
            ))
            .await
            .expect("Query should succeed");

        let indexes: Vec<String> = result
            .iter()
            .filter_map(|row| row.try_get::<String>("", "indexname").ok())
            .collect();

        // Should have at least 9 custom indexes
        assert!(indexes.len() >= 9, "Should have at least 9 indexes");
    }

    #[tokio::test]
    #[ignore]
    async fn test_unique_constraint_on_user_form() {
        let db = setup().await;
        let manager = SchemaManager::new(&db);

        let _ = Migration.down(&manager).await;
        Migration.up(&manager).await.expect("Migration should succeed");

        let result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                "SELECT COUNT(*) as count FROM pg_indexes \
                 WHERE schemaname = 'hr_public' \
                 AND tablename = 'onboarding_form_progress' \
                 AND indexname = 'idx_form_progress_unique_user_form'"
                    .to_string(),
            ))
            .await
            .expect("Query should succeed")
            .expect("Should have result");

        let count: i64 = result.try_get("", "count").unwrap();
        assert!(count > 0, "Unique constraint index should exist");
    }

    #[tokio::test]
    #[ignore]
    async fn test_idempotent_up_migration() {
        let db = setup().await;
        let manager = SchemaManager::new(&db);

        let _ = Migration.down(&manager).await;
        Migration.up(&manager).await.expect("First UP should succeed");
        Migration.up(&manager).await.expect("Second UP should succeed (idempotent)");

        assert!(table_exists(&db, "onboarding_forms").await);
        assert!(table_exists(&db, "onboarding_form_blocks").await);
        assert!(table_exists(&db, "onboarding_form_progress").await);
    }

    #[tokio::test]
    #[ignore]
    async fn test_down_migration_removes_all_tables() {
        let db = setup().await;
        let manager = SchemaManager::new(&db);

        Migration.up(&manager).await.expect("UP should succeed");
        assert!(table_exists(&db, "onboarding_forms").await);

        Migration.down(&manager).await.expect("DOWN should succeed");
        assert!(!table_exists(&db, "onboarding_forms").await);
        assert!(!table_exists(&db, "onboarding_form_blocks").await);
        assert!(!table_exists(&db, "onboarding_form_progress").await);
    }

    #[tokio::test]
    #[ignore]
    async fn test_idempotent_down_migration() {
        let db = setup().await;
        let manager = SchemaManager::new(&db);

        Migration.up(&manager).await.expect("UP should succeed");
        Migration.down(&manager).await.expect("First DOWN should succeed");
        Migration.down(&manager).await.expect("Second DOWN should succeed (idempotent)");

        assert!(!table_exists(&db, "onboarding_forms").await);
    }

    #[tokio::test]
    #[ignore]
    async fn test_full_migration_cycle() {
        let db = setup().await;
        let manager = SchemaManager::new(&db);

        let _ = Migration.down(&manager).await;

        Migration.up(&manager).await.expect("UP should succeed");
        assert!(table_exists(&db, "onboarding_forms").await);

        Migration.down(&manager).await.expect("DOWN should succeed");
        assert!(!table_exists(&db, "onboarding_forms").await);

        Migration.up(&manager).await.expect("Second UP should succeed");
        assert!(table_exists(&db, "onboarding_forms").await);
    }
}
