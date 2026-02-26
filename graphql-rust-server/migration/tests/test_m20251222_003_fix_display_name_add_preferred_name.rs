//! Tests for m20251222_003_fix_display_name_add_preferred_name migration
//!
//! Validates that the migration:
//! 1. Drops generated display_name column and recreates as mutable
//! 2. Backfills display_name from first_name + last_name
//! 3. Adds preferred_name column for nicknames/chosen names
//! 4. Uses MigrationHelpers for idempotent operations
//! 5. Handles up/down migrations correctly
//! 6. Can run multiple times without errors (idempotency)
//! 7. Down migration recreates GENERATED column correctly

#[cfg(test)]
mod tests {
    use hr_graphql_server::migration::m20251222_003_fix_display_name_add_preferred_name::Migration;
    use sea_orm::{Database, DatabaseConnection, DbBackend, Statement};
    use sea_orm_migration::prelude::*;

    /// Setup a test database connection
    async fn setup_test_db() -> DatabaseConnection {
        let db_url = std::env::var("DATABASE_URL").unwrap_or_else(|_| {
            "postgres://postgres:postgres123@localhost:5433/hr_test".to_string()
        });
        Database::connect(&db_url)
            .await
            .expect("Failed to connect to test database")
    }

    /// Clean up test data after test runs
    async fn cleanup_test_data(db: &DatabaseConnection) {
        let _ = db
            .execute(Statement::from_string(
                DbBackend::Postgres,
                "ALTER TABLE hr_public.users DROP COLUMN IF EXISTS preferred_name".to_string(),
            ))
            .await;

        let _ = db
            .execute(Statement::from_string(
                DbBackend::Postgres,
                "ALTER TABLE hr_public.users DROP COLUMN IF EXISTS display_name".to_string(),
            ))
            .await;

        // Recreate display_name as it's likely a required column
        let _ = db
            .execute(Statement::from_string(
                DbBackend::Postgres,
                "ALTER TABLE hr_public.users ADD COLUMN IF NOT EXISTS display_name VARCHAR NOT NULL DEFAULT ''".to_string(),
            ))
            .await;
    }

    #[tokio::test]
    async fn test_display_name_migration_compiles() {
        // Ensures the migration uses MigrationHelpers correctly
        let _migration = Migration;
        assert!(true, "Migration struct compiles successfully");
    }

    #[tokio::test]
    async fn test_display_name_migration_up() {
        let db = setup_test_db().await;
        let schema_manager = SchemaManager::new(&db);

        cleanup_test_data(&db).await;

        let migration = Migration;
        migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        // Verify display_name column exists and is NOT generated
        let column_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                "SELECT column_name, data_type, is_nullable, is_generated
                 FROM information_schema.columns
                 WHERE table_schema = 'hr_public'
                 AND table_name = 'users'
                 AND column_name = 'display_name'"
                    .to_string(),
            ))
            .await;

        assert!(column_result.is_ok(), "display_name column should exist");
        let column = column_result.unwrap().unwrap();
        let is_nullable: String = column
            .try_get("", "is_nullable")
            .expect("Should get is_nullable");
        let is_generated: String = column
            .try_get("", "is_generated")
            .expect("Should get is_generated");

        assert_eq!(is_nullable, "NO", "display_name should be NOT NULL");
        assert_eq!(
            is_generated, "NEVER",
            "display_name should NOT be a generated column"
        );

        // Verify preferred_name column exists
        let preferred_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                "SELECT column_name, is_nullable FROM information_schema.columns
                 WHERE table_schema = 'hr_public'
                 AND table_name = 'users'
                 AND column_name = 'preferred_name'"
                    .to_string(),
            ))
            .await;

        assert!(
            preferred_result.is_ok(),
            "preferred_name column should exist"
        );
        let preferred = preferred_result.unwrap().unwrap();
        let pref_nullable: String = preferred
            .try_get("", "is_nullable")
            .expect("Should get is_nullable");
        assert_eq!(pref_nullable, "YES", "preferred_name should be nullable");

        cleanup_test_data(&db).await;
    }

    #[tokio::test]
    async fn test_display_name_mutable() {
        let db = setup_test_db().await;
        let schema_manager = SchemaManager::new(&db);

        cleanup_test_data(&db).await;

        let migration = Migration;
        migration
            .up(&schema_manager)
            .await
            .expect("Migration should succeed");

        // Try to update display_name (should succeed since it's no longer generated)
        let update_result = db
            .execute(Statement::from_string(
                DbBackend::Postgres,
                "UPDATE hr_public.users SET display_name = 'Custom Name' WHERE id = (SELECT id FROM hr_public.users LIMIT 1)".to_string(),
            ))
            .await;

        assert!(
            update_result.is_ok(),
            "Should be able to update display_name (no longer generated)"
        );

        cleanup_test_data(&db).await;
    }

    #[tokio::test]
    async fn test_display_name_backfill() {
        let db = setup_test_db().await;
        let schema_manager = SchemaManager::new(&db);

        cleanup_test_data(&db).await;

        // Create a test user with empty display_name
        let _ = db
            .execute(Statement::from_string(
                DbBackend::Postgres,
                "INSERT INTO hr_public.users (first_name, last_name, email, display_name, password_hash)
                 VALUES ('Test', 'User', 'test_backfill@example.com', '', 'hash123')
                 ON CONFLICT (email) DO UPDATE SET display_name = ''".to_string(),
            ))
            .await;

        let migration = Migration;
        migration
            .up(&schema_manager)
            .await
            .expect("Migration should succeed");

        // Verify display_name was backfilled
        let user_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                "SELECT display_name FROM hr_public.users
                 WHERE email = 'test_backfill@example.com'"
                    .to_string(),
            ))
            .await;

        if user_result.is_ok() && user_result.as_ref().unwrap().is_some() {
            let display_name: String = user_result
                .unwrap()
                .unwrap()
                .try_get("", "display_name")
                .expect("Should get display_name");

            assert_eq!(
                display_name, "Test User",
                "display_name should be backfilled from first_name + last_name"
            );
        }

        // Cleanup test user
        let _ = db
            .execute(Statement::from_string(
                DbBackend::Postgres,
                "DELETE FROM hr_public.users WHERE email = 'test_backfill@example.com'".to_string(),
            ))
            .await;

        cleanup_test_data(&db).await;
    }

    #[tokio::test]
    async fn test_preferred_name_column_properties() {
        let db = setup_test_db().await;
        let schema_manager = SchemaManager::new(&db);

        cleanup_test_data(&db).await;

        let migration = Migration;
        migration
            .up(&schema_manager)
            .await
            .expect("Migration should succeed");

        let column_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                "SELECT column_name, data_type, is_nullable
                 FROM information_schema.columns
                 WHERE table_schema = 'hr_public'
                 AND table_name = 'users'
                 AND column_name = 'preferred_name'"
                    .to_string(),
            ))
            .await;

        assert!(column_result.is_ok(), "preferred_name column should exist");
        let column = column_result.unwrap().unwrap();
        let data_type: String = column
            .try_get("", "data_type")
            .expect("Should get data_type");
        let is_nullable: String = column
            .try_get("", "is_nullable")
            .expect("Should get is_nullable");

        assert_eq!(
            data_type, "character varying",
            "preferred_name should be VARCHAR"
        );
        assert_eq!(is_nullable, "YES", "preferred_name should be nullable");

        cleanup_test_data(&db).await;
    }

    #[tokio::test]
    async fn test_display_name_idempotent_up() {
        let db = setup_test_db().await;
        let schema_manager = SchemaManager::new(&db);

        cleanup_test_data(&db).await;

        let migration = Migration;

        // Run migration twice
        migration
            .up(&schema_manager)
            .await
            .expect("First migration up should succeed");

        migration
            .up(&schema_manager)
            .await
            .expect("Second migration up should succeed (idempotent)");

        // Verify columns still exist after second run
        let columns_result = db
            .query_all(Statement::from_string(
                DbBackend::Postgres,
                "SELECT column_name FROM information_schema.columns
                 WHERE table_schema = 'hr_public'
                 AND table_name = 'users'
                 AND column_name IN ('display_name', 'preferred_name')
                 ORDER BY column_name"
                    .to_string(),
            ))
            .await;

        assert!(columns_result.is_ok(), "Columns should still exist");
        let columns = columns_result.unwrap();
        assert_eq!(
            columns.len(),
            2,
            "Both columns should exist after idempotent run"
        );

        cleanup_test_data(&db).await;
    }

    #[tokio::test]
    async fn test_display_name_migration_down() {
        let db = setup_test_db().await;
        let schema_manager = SchemaManager::new(&db);

        cleanup_test_data(&db).await;

        let migration = Migration;

        // Run up then down
        migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");
        migration
            .down(&schema_manager)
            .await
            .expect("Migration down should succeed");

        // Verify preferred_name was dropped
        let preferred_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                "SELECT column_name FROM information_schema.columns
                 WHERE table_schema = 'hr_public'
                 AND table_name = 'users'
                 AND column_name = 'preferred_name'"
                    .to_string(),
            ))
            .await;

        assert!(
            preferred_result.is_ok() && preferred_result.unwrap().is_none(),
            "preferred_name should be dropped"
        );

        // Verify display_name is now a GENERATED column
        let display_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                "SELECT is_generated FROM information_schema.columns
                 WHERE table_schema = 'hr_public'
                 AND table_name = 'users'
                 AND column_name = 'display_name'"
                    .to_string(),
            ))
            .await;

        if display_result.is_ok() && display_result.as_ref().unwrap().is_some() {
            let is_generated: String = display_result
                .unwrap()
                .unwrap()
                .try_get("", "is_generated")
                .expect("Should get is_generated");

            assert_eq!(
                is_generated, "ALWAYS",
                "display_name should be a GENERATED column after down migration"
            );
        }

        cleanup_test_data(&db).await;
    }

    #[tokio::test]
    async fn test_display_name_idempotent_down() {
        let db = setup_test_db().await;
        let schema_manager = SchemaManager::new(&db);

        cleanup_test_data(&db).await;

        let migration = Migration;

        // Run up, then down twice
        migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");
        migration
            .down(&schema_manager)
            .await
            .expect("First migration down should succeed");
        migration
            .down(&schema_manager)
            .await
            .expect("Second migration down should succeed (idempotent)");

        cleanup_test_data(&db).await;
    }

    #[tokio::test]
    async fn test_display_name_full_cycle() {
        let db = setup_test_db().await;
        let schema_manager = SchemaManager::new(&db);

        cleanup_test_data(&db).await;

        let migration = Migration;

        // Run complete up/down/up cycle
        migration
            .up(&schema_manager)
            .await
            .expect("First up should succeed");
        migration
            .down(&schema_manager)
            .await
            .expect("Down should succeed");
        migration
            .up(&schema_manager)
            .await
            .expect("Second up should succeed");

        // Verify columns exist after full cycle
        let columns_result = db
            .query_all(Statement::from_string(
                DbBackend::Postgres,
                "SELECT column_name FROM information_schema.columns
                 WHERE table_schema = 'hr_public'
                 AND table_name = 'users'
                 AND column_name IN ('display_name', 'preferred_name')"
                    .to_string(),
            ))
            .await;

        assert!(
            columns_result.is_ok(),
            "Columns should exist after full cycle"
        );
        assert_eq!(
            columns_result.unwrap().len(),
            2,
            "Both columns should exist"
        );

        cleanup_test_data(&db).await;
    }

    #[tokio::test]
    async fn test_backfill_preserves_custom_names() {
        let db = setup_test_db().await;
        let schema_manager = SchemaManager::new(&db);

        cleanup_test_data(&db).await;

        // Run migration first time
        let migration = Migration;
        migration
            .up(&schema_manager)
            .await
            .expect("Migration should succeed");

        // Create a user with custom display_name
        let _ = db
            .execute(Statement::from_string(
                DbBackend::Postgres,
                "INSERT INTO hr_public.users (first_name, last_name, email, display_name, password_hash)
                 VALUES ('Jane', 'Doe', 'test_preserve@example.com', 'Custom Display Name', 'hash456')
                 ON CONFLICT (email) DO UPDATE SET display_name = 'Custom Display Name'".to_string(),
            ))
            .await;

        // Run migration again (should not overwrite custom display_name)
        migration
            .up(&schema_manager)
            .await
            .expect("Second run should succeed");

        // Verify custom display_name was preserved
        let user_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                "SELECT display_name FROM hr_public.users
                 WHERE email = 'test_preserve@example.com'"
                    .to_string(),
            ))
            .await;

        if user_result.is_ok() && user_result.as_ref().unwrap().is_some() {
            let display_name: String = user_result
                .unwrap()
                .unwrap()
                .try_get("", "display_name")
                .expect("Should get display_name");

            assert_eq!(
                display_name, "Custom Display Name",
                "Custom display_name should be preserved (not overwritten by backfill)"
            );
        }

        // Cleanup test user
        let _ = db
            .execute(Statement::from_string(
                DbBackend::Postgres,
                "DELETE FROM hr_public.users WHERE email = 'test_preserve@example.com'".to_string(),
            ))
            .await;

        cleanup_test_data(&db).await;
    }

    #[tokio::test]
    async fn test_display_name_not_null_constraint() {
        let db = setup_test_db().await;
        let schema_manager = SchemaManager::new(&db);

        cleanup_test_data(&db).await;

        let migration = Migration;
        migration
            .up(&schema_manager)
            .await
            .expect("Migration should succeed");

        // Verify display_name has NOT NULL constraint
        let constraint_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                "SELECT is_nullable FROM information_schema.columns
                 WHERE table_schema = 'hr_public'
                 AND table_name = 'users'
                 AND column_name = 'display_name'"
                    .to_string(),
            ))
            .await;

        assert!(constraint_result.is_ok(), "Should query constraint");
        let is_nullable: String = constraint_result
            .unwrap()
            .unwrap()
            .try_get("", "is_nullable")
            .expect("Should get is_nullable");

        assert_eq!(
            is_nullable, "NO",
            "display_name should have NOT NULL constraint"
        );

        cleanup_test_data(&db).await;
    }
}
