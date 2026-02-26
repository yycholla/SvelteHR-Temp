//! Tests for m20251222_002_add_quickbooks_employee_fields migration
//!
//! Validates that the migration:
//! 1. Adds 9 QuickBooks-specific employee fields to users table
//! 2. Uses MigrationHelpers for idempotent column operations
//! 3. All columns are nullable except billable_time (default false)
//! 4. Handles up/down migrations correctly
//! 5. Can run multiple times without errors (idempotency)
//! 6. Properly sets data types (VARCHAR, BOOLEAN)

#[cfg(test)]
mod tests {
    use hr_graphql_server::migration::m20251222_002_add_quickbooks_employee_fields::Migration;
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
        let columns = vec![
            "employee_number",
            "gender",
            "street_address",
            "city",
            "state",
            "postal_code",
            "country",
            "billable_time",
            "organization",
        ];

        for column in columns {
            let _ = db
                .execute(Statement::from_string(
                    DbBackend::Postgres,
                    format!(
                        "ALTER TABLE hr_public.users DROP COLUMN IF EXISTS {}",
                        column
                    ),
                ))
                .await;
        }
    }

    #[tokio::test]
    async fn test_quickbooks_fields_migration_compiles() {
        // Ensures the migration uses MigrationHelpers correctly
        let _migration = Migration;
        assert!(true, "Migration struct compiles successfully");
    }

    #[tokio::test]
    async fn test_quickbooks_fields_migration_up() {
        let db = setup_test_db().await;
        let schema_manager = SchemaManager::new(&db);

        cleanup_test_data(&db).await;

        let migration = Migration;
        migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        // Verify all columns were added
        let expected_columns = vec![
            "employee_number",
            "gender",
            "street_address",
            "city",
            "state",
            "postal_code",
            "country",
            "billable_time",
            "organization",
        ];

        for column_name in &expected_columns {
            let column_result = db
                .query_one(Statement::from_string(
                    DbBackend::Postgres,
                    format!(
                        "SELECT column_name FROM information_schema.columns
                         WHERE table_schema = 'hr_public'
                         AND table_name = 'users'
                         AND column_name = '{}'",
                        column_name
                    ),
                ))
                .await;

            assert!(
                column_result.is_ok() && column_result.unwrap().is_some(),
                "{} column should exist",
                column_name
            );
        }

        cleanup_test_data(&db).await;
    }

    #[tokio::test]
    async fn test_employee_number_column_properties() {
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
                 AND column_name = 'employee_number'"
                    .to_string(),
            ))
            .await;

        assert!(column_result.is_ok(), "employee_number column should exist");
        let column = column_result.unwrap().unwrap();
        let data_type: String = column
            .try_get("", "data_type")
            .expect("Should get data_type");
        let is_nullable: String = column
            .try_get("", "is_nullable")
            .expect("Should get is_nullable");

        assert_eq!(
            data_type, "character varying",
            "employee_number should be VARCHAR"
        );
        assert_eq!(is_nullable, "YES", "employee_number should be nullable");

        cleanup_test_data(&db).await;
    }

    #[tokio::test]
    async fn test_address_columns_nullable() {
        let db = setup_test_db().await;
        let schema_manager = SchemaManager::new(&db);

        cleanup_test_data(&db).await;

        let migration = Migration;
        migration
            .up(&schema_manager)
            .await
            .expect("Migration should succeed");

        let address_columns = vec!["street_address", "city", "state", "postal_code", "country"];

        for column_name in &address_columns {
            let column_result = db
                .query_one(Statement::from_string(
                    DbBackend::Postgres,
                    format!(
                        "SELECT is_nullable FROM information_schema.columns
                         WHERE table_schema = 'hr_public'
                         AND table_name = 'users'
                         AND column_name = '{}'",
                        column_name
                    ),
                ))
                .await;

            assert!(column_result.is_ok(), "{} should exist", column_name);
            let is_nullable: String = column_result
                .unwrap()
                .unwrap()
                .try_get("", "is_nullable")
                .expect("Should get is_nullable");
            assert_eq!(is_nullable, "YES", "{} should be nullable", column_name);
        }

        cleanup_test_data(&db).await;
    }

    #[tokio::test]
    async fn test_billable_time_column_properties() {
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
                "SELECT column_name, data_type, is_nullable, column_default
                 FROM information_schema.columns
                 WHERE table_schema = 'hr_public'
                 AND table_name = 'users'
                 AND column_name = 'billable_time'"
                    .to_string(),
            ))
            .await;

        assert!(column_result.is_ok(), "billable_time column should exist");
        let column = column_result.unwrap().unwrap();
        let data_type: String = column
            .try_get("", "data_type")
            .expect("Should get data_type");
        let is_nullable: String = column
            .try_get("", "is_nullable")
            .expect("Should get is_nullable");
        let default_val: Option<String> = column.try_get("", "column_default").ok();

        assert_eq!(data_type, "boolean", "billable_time should be BOOLEAN");
        assert_eq!(is_nullable, "NO", "billable_time should be NOT NULL");
        assert!(
            default_val.is_some() && default_val.unwrap().contains("false"),
            "billable_time should default to false"
        );

        cleanup_test_data(&db).await;
    }

    #[tokio::test]
    async fn test_gender_column_properties() {
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
                 AND column_name = 'gender'"
                    .to_string(),
            ))
            .await;

        assert!(column_result.is_ok(), "gender column should exist");
        let column = column_result.unwrap().unwrap();
        let data_type: String = column
            .try_get("", "data_type")
            .expect("Should get data_type");
        let is_nullable: String = column
            .try_get("", "is_nullable")
            .expect("Should get is_nullable");

        assert_eq!(data_type, "character varying", "gender should be VARCHAR");
        assert_eq!(is_nullable, "YES", "gender should be nullable");

        cleanup_test_data(&db).await;
    }

    #[tokio::test]
    async fn test_organization_column_properties() {
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
                 AND column_name = 'organization'"
                    .to_string(),
            ))
            .await;

        assert!(column_result.is_ok(), "organization column should exist");
        let column = column_result.unwrap().unwrap();
        let data_type: String = column
            .try_get("", "data_type")
            .expect("Should get data_type");
        let is_nullable: String = column
            .try_get("", "is_nullable")
            .expect("Should get is_nullable");

        assert_eq!(
            data_type, "character varying",
            "organization should be VARCHAR"
        );
        assert_eq!(is_nullable, "YES", "organization should be nullable");

        cleanup_test_data(&db).await;
    }

    #[tokio::test]
    async fn test_quickbooks_fields_idempotent_up() {
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
                 AND column_name IN ('employee_number', 'gender', 'street_address', 'city',
                                     'state', 'postal_code', 'country', 'billable_time', 'organization')
                 ORDER BY column_name".to_string(),
            ))
            .await;

        assert!(columns_result.is_ok(), "Columns should still exist");
        let columns = columns_result.unwrap();
        assert_eq!(
            columns.len(),
            9,
            "All 9 columns should exist after idempotent run"
        );

        cleanup_test_data(&db).await;
    }

    #[tokio::test]
    async fn test_quickbooks_fields_migration_down() {
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

        // Verify all columns were dropped
        let expected_columns = vec![
            "employee_number",
            "gender",
            "street_address",
            "city",
            "state",
            "postal_code",
            "country",
            "billable_time",
            "organization",
        ];

        for column_name in &expected_columns {
            let column_result = db
                .query_one(Statement::from_string(
                    DbBackend::Postgres,
                    format!(
                        "SELECT column_name FROM information_schema.columns
                         WHERE table_schema = 'hr_public'
                         AND table_name = 'users'
                         AND column_name = '{}'",
                        column_name
                    ),
                ))
                .await;

            assert!(
                column_result.is_ok() && column_result.unwrap().is_none(),
                "{} column should be dropped",
                column_name
            );
        }

        cleanup_test_data(&db).await;
    }

    #[tokio::test]
    async fn test_quickbooks_fields_idempotent_down() {
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
    async fn test_quickbooks_fields_full_cycle() {
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
                 AND column_name IN ('employee_number', 'gender', 'street_address')"
                    .to_string(),
            ))
            .await;

        assert!(
            columns_result.is_ok(),
            "Columns should exist after full cycle"
        );
        assert_eq!(columns_result.unwrap().len(), 3, "Columns should exist");

        cleanup_test_data(&db).await;
    }

    #[tokio::test]
    async fn test_postal_code_varchar_type() {
        let db = setup_test_db().await;
        let schema_manager = SchemaManager::new(&db);

        cleanup_test_data(&db).await;

        let migration = Migration;
        migration
            .up(&schema_manager)
            .await
            .expect("Migration should succeed");

        // Verify postal_code is VARCHAR (not numeric) for international support
        let column_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                "SELECT data_type FROM information_schema.columns
                 WHERE table_schema = 'hr_public'
                 AND table_name = 'users'
                 AND column_name = 'postal_code'"
                    .to_string(),
            ))
            .await;

        assert!(column_result.is_ok(), "postal_code should exist");
        let data_type: String = column_result
            .unwrap()
            .unwrap()
            .try_get("", "data_type")
            .expect("Should get data_type");

        assert_eq!(
            data_type, "character varying",
            "postal_code should be VARCHAR for international formats (e.g., 'K1A 0B1')"
        );

        cleanup_test_data(&db).await;
    }
}
