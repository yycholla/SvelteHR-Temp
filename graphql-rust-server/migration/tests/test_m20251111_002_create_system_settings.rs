//! Tests for m20251111_002_create_system_settings migration
//!
//! This migration creates the application_settings singleton table for centralized system configuration.
//!
//! **Test Requirements:**
//! - Requires DATABASE_URL environment variable
//! - Tests must run serially: `cargo test --test test_m20251111_002_create_system_settings --features test-utils -- --test-threads=1`
//!
//! **What We Test:**
//! - Table creation: application_settings with 16 columns
//! - Default row insertion: Singleton pattern (id=1)
//! - Column defaults: system_name='MoncuraHR', system_timezone='UTC', session_timeout_minutes=60
//! - Array column: cors_origins (TEXT[])
//! - Idempotency: IF NOT EXISTS and ON CONFLICT DO NOTHING
//! - Cleanup: DROP TABLE on rollback

#[cfg(test)]
mod tests {
    use hr_graphql_server::migration::m20251111_002_create_system_settings::Migration;
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
        // Drop table if exists (for testing)
        let _ = db
            .execute(Statement::from_string(
                DbBackend::Postgres,
                "DROP TABLE IF EXISTS hr_public.application_settings CASCADE".to_string(),
            ))
            .await;
    }

    #[tokio::test]
    async fn test_system_settings_migration_compiles() {
        // If this test runs, the migration compiles successfully
        assert!(true);
    }

    #[tokio::test]
    async fn test_system_settings_migration_up() {
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
    async fn test_application_settings_table_created() {
        let db = setup_test_db().await;
        cleanup_test_data(&db).await;

        // Run the migration
        let schema_manager = SchemaManager::new(&db);
        Migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        // Verify table exists
        let result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                SELECT COUNT(*) as count
                FROM information_schema.tables
                WHERE table_schema = 'hr_public'
                  AND table_name = 'application_settings'
                "#
                .to_string(),
            ))
            .await
            .expect("Query should succeed");

        assert!(result.is_some(), "Query should return result");
        let row = result.unwrap();
        let count: i64 = row.try_get("", "count").unwrap();
        assert_eq!(count, 1, "application_settings table should exist");
    }

    #[tokio::test]
    async fn test_application_settings_columns() {
        let db = setup_test_db().await;
        cleanup_test_data(&db).await;

        // Run the migration
        let schema_manager = SchemaManager::new(&db);
        Migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        // Verify all 16 columns exist
        let expected_columns = vec![
            "id",
            "system_name",
            "system_timezone",
            "session_timeout_minutes",
            "min_password_length",
            "max_login_attempts",
            "require_mfa",
            "password_expiration_enabled",
            "password_expiration_days",
            "https_enforced",
            "csp_policy",
            "x_frame_options",
            "hsts_enabled",
            "cors_origins",
            "log_level_frontend",
            "log_level_backend",
            "created_at",
            "updated_at",
            "updated_by",
        ];

        for column in expected_columns {
            let result = db
                .query_one(Statement::from_string(
                    DbBackend::Postgres,
                    format!(
                        "SELECT COUNT(*) as count
                         FROM information_schema.columns
                         WHERE table_schema = 'hr_public'
                           AND table_name = 'application_settings'
                           AND column_name = '{}'",
                        column
                    ),
                ))
                .await
                .expect("Query should succeed");

            assert!(result.is_some(), "Query should return result");
            let row = result.unwrap();
            let count: i64 = row.try_get("", "count").unwrap();
            assert_eq!(count, 1, "Column '{}' should exist", column);
        }
    }

    #[tokio::test]
    async fn test_default_row_inserted() {
        let db = setup_test_db().await;
        cleanup_test_data(&db).await;

        // Run the migration
        let schema_manager = SchemaManager::new(&db);
        Migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        // Verify default row exists (singleton pattern with id=1)
        let result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                SELECT COUNT(*) as count
                FROM hr_public.application_settings
                WHERE id = 1
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
            "Default row (id=1) should exist after migration"
        );
    }

    #[tokio::test]
    async fn test_default_column_values() {
        let db = setup_test_db().await;
        cleanup_test_data(&db).await;

        // Run the migration
        let schema_manager = SchemaManager::new(&db);
        Migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        // Verify default values
        let result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                SELECT
                    system_name,
                    system_timezone,
                    session_timeout_minutes,
                    min_password_length,
                    max_login_attempts,
                    require_mfa,
                    password_expiration_enabled,
                    password_expiration_days,
                    https_enforced,
                    x_frame_options,
                    hsts_enabled,
                    log_level_frontend,
                    log_level_backend
                FROM hr_public.application_settings
                WHERE id = 1
                "#
                .to_string(),
            ))
            .await
            .expect("Query should succeed");

        assert!(result.is_some(), "Query should return result");
        let row = result.unwrap();

        let system_name: String = row.try_get("", "system_name").unwrap();
        assert_eq!(system_name, "MoncuraHR", "Default system_name should be 'MoncuraHR'");

        let system_timezone: String = row.try_get("", "system_timezone").unwrap();
        assert_eq!(system_timezone, "UTC", "Default system_timezone should be 'UTC'");

        let session_timeout: i32 = row.try_get("", "session_timeout_minutes").unwrap();
        assert_eq!(session_timeout, 60, "Default session_timeout_minutes should be 60");

        let min_password_length: i32 = row.try_get("", "min_password_length").unwrap();
        assert_eq!(min_password_length, 12, "Default min_password_length should be 12");

        let max_login_attempts: i32 = row.try_get("", "max_login_attempts").unwrap();
        assert_eq!(max_login_attempts, 5, "Default max_login_attempts should be 5");

        let require_mfa: bool = row.try_get("", "require_mfa").unwrap();
        assert_eq!(require_mfa, false, "Default require_mfa should be false");

        let password_expiration_enabled: bool =
            row.try_get("", "password_expiration_enabled").unwrap();
        assert_eq!(
            password_expiration_enabled, false,
            "Default password_expiration_enabled should be false"
        );

        let password_expiration_days: Option<i32> =
            row.try_get("", "password_expiration_days").unwrap();
        assert_eq!(
            password_expiration_days,
            Some(90),
            "Default password_expiration_days should be 90"
        );

        let https_enforced: bool = row.try_get("", "https_enforced").unwrap();
        assert_eq!(https_enforced, false, "Default https_enforced should be false");

        let x_frame_options: bool = row.try_get("", "x_frame_options").unwrap();
        assert_eq!(x_frame_options, true, "Default x_frame_options should be true");

        let hsts_enabled: bool = row.try_get("", "hsts_enabled").unwrap();
        assert_eq!(hsts_enabled, false, "Default hsts_enabled should be false");

        let log_level_frontend: String = row.try_get("", "log_level_frontend").unwrap();
        assert_eq!(log_level_frontend, "INFO", "Default log_level_frontend should be 'INFO'");

        let log_level_backend: String = row.try_get("", "log_level_backend").unwrap();
        assert_eq!(log_level_backend, "INFO", "Default log_level_backend should be 'INFO'");
    }

    #[tokio::test]
    async fn test_cors_origins_array_column() {
        let db = setup_test_db().await;
        cleanup_test_data(&db).await;

        // Run the migration
        let schema_manager = SchemaManager::new(&db);
        Migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        // Verify cors_origins column is an array type
        let result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                SELECT data_type, udt_name
                FROM information_schema.columns
                WHERE table_schema = 'hr_public'
                  AND table_name = 'application_settings'
                  AND column_name = 'cors_origins'
                "#
                .to_string(),
            ))
            .await
            .expect("Query should succeed");

        assert!(result.is_some(), "Query should return result");
        let row = result.unwrap();
        let data_type: String = row.try_get("", "data_type").unwrap();
        assert_eq!(
            data_type, "ARRAY",
            "cors_origins should be an ARRAY type"
        );
    }

    #[tokio::test]
    async fn test_idempotent_up() {
        let db = setup_test_db().await;
        cleanup_test_data(&db).await;

        let schema_manager = SchemaManager::new(&db);

        // Run migration first time
        Migration
            .up(&schema_manager)
            .await
            .expect("First migration up should succeed");

        // Count initial rows
        let initial_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                "SELECT COUNT(*) as count FROM hr_public.application_settings".to_string(),
            ))
            .await
            .expect("Query should succeed");

        assert!(initial_result.is_some(), "Query should return result");
        let row = initial_result.unwrap();
        let initial_count: i64 = row.try_get("", "count").unwrap();

        // Run migration second time - should succeed due to IF NOT EXISTS and ON CONFLICT DO NOTHING
        let result = Migration.up(&schema_manager).await;

        assert!(
            result.is_ok(),
            "Second migration up should succeed (idempotent with IF NOT EXISTS and ON CONFLICT DO NOTHING)"
        );

        // Verify count hasn't changed (no duplicate rows)
        let final_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                "SELECT COUNT(*) as count FROM hr_public.application_settings".to_string(),
            ))
            .await
            .expect("Query should succeed");

        assert!(final_result.is_some(), "Query should return result");
        let row = final_result.unwrap();
        let final_count: i64 = row.try_get("", "count").unwrap();

        assert_eq!(
            initial_count, final_count,
            "Should have same number of rows (no duplicates)"
        );
    }

    #[tokio::test]
    async fn test_system_settings_migration_down() {
        let db = setup_test_db().await;
        cleanup_test_data(&db).await;

        let schema_manager = SchemaManager::new(&db);

        // Run up migration first
        Migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        // Verify table exists
        let before_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                SELECT COUNT(*) as count
                FROM information_schema.tables
                WHERE table_schema = 'hr_public'
                  AND table_name = 'application_settings'
                "#
                .to_string(),
            ))
            .await
            .expect("Query should succeed");

        assert!(before_result.is_some(), "Query should return result");
        let row = before_result.unwrap();
        let before_count: i64 = row.try_get("", "count").unwrap();
        assert_eq!(before_count, 1, "Table should exist before down migration");

        // Run down migration
        Migration
            .down(&schema_manager)
            .await
            .expect("Migration down should succeed");

        // Verify table is dropped
        let after_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                SELECT COUNT(*) as count
                FROM information_schema.tables
                WHERE table_schema = 'hr_public'
                  AND table_name = 'application_settings'
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
            "Table should be dropped after down migration"
        );
    }

    #[tokio::test]
    async fn test_idempotent_down() {
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

        // Run down again - should succeed (table already dropped)
        let result = Migration.down(&schema_manager).await;

        assert!(
            result.is_ok(),
            "Second migration down should succeed (idempotent - table already dropped)"
        );
    }
}
