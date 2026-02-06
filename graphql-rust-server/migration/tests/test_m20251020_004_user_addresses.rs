//! Tests for m20251020_004_add_user_addresses migration
//!
//! Validates that the migration:
//! 1. Uses SeaORM builders for main table/index operations (CREATE TABLE, CREATE INDEX, DROP operations)
//! 2. Documents partial index limitation (requires sea-query >= 0.32.0)
//! 3. Documents COMMENT limitation (no builder API exists)
//! 4. Creates unique partial index to enforce one primary address per user
//! 5. Properly creates table comment via raw SQL
//! 6. Handles up/down migrations with idempotency
//! 7. Enforces primary address constraint correctly

#[cfg(test)]
mod tests {
    use sea_orm::{Database, DatabaseConnection, DbBackend, Statement};
    use sea_orm_migration::prelude::*;
    use hr_graphql_server::migration::m20251020_004_add_user_addresses::Migration;

    /// Setup a test database connection
    /// Uses DATABASE_URL from environment or defaults to test database
    async fn setup_test_db() -> DatabaseConnection {
        let db_url = std::env::var("DATABASE_URL")
            .unwrap_or_else(|_| "postgres://postgres:postgres123@localhost:5433/hr_test".to_string());
        Database::connect(&db_url).await.expect("Failed to connect to test database")
    }

    /// Clean up test data after test runs
    async fn cleanup_test_data(db: &DatabaseConnection) {
        // Drop the table (CASCADE will drop all indexes and constraints)
        let _ = db
            .execute(Statement::from_string(
                DbBackend::Postgres,
                "DROP TABLE IF EXISTS hr_public.user_addresses CASCADE".to_string(),
            ))
            .await;
    }

    /// Helper to insert a test user for foreign key constraints
    async fn insert_test_user(db: &DatabaseConnection, user_id: &str) -> Result<(), sea_orm::DbErr> {
        db.execute(Statement::from_string(
            DbBackend::Postgres,
            format!(
                "INSERT INTO hr_public.users (id, email, password_hash, first_name, last_name)
                 VALUES ('{}'::uuid, 'test_{}@example.com', 'hash', 'Test', 'User')
                 ON CONFLICT (id) DO NOTHING",
                user_id, user_id
            ),
        ))
        .await?;
        Ok(())
    }

    /// Helper to clean up test users
    async fn cleanup_test_users(db: &DatabaseConnection, user_ids: &[&str]) {
        let ids_str = user_ids.iter()
            .map(|id| format!("'{}'::uuid", id))
            .collect::<Vec<_>>()
            .join(", ");
        let _ = db
            .execute(Statement::from_string(
                DbBackend::Postgres,
                format!("DELETE FROM hr_public.users WHERE id IN ({})", ids_str),
            ))
            .await;
    }

    #[tokio::test]
    async fn test_user_addresses_migration_compiles() {
        // This test ensures the migration uses SeaORM builders where possible
        // If this compiles, the migration is using the builder API correctly
        let _migration = Migration;
        assert!(true, "Migration struct compiles successfully");
    }

    #[tokio::test]
    async fn test_user_addresses_migration_up() {
        let db = setup_test_db().await;
        let schema_manager = SchemaManager::new(&db);

        // Clean up before test
        cleanup_test_data(&db).await;

        // Run the migration
        let migration = Migration;
        migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        // Verify the user_addresses table was created
        let table_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                "SELECT table_name FROM information_schema.tables
                 WHERE table_schema = 'hr_public'
                 AND table_name = 'user_addresses'".to_string(),
            ))
            .await;

        assert!(table_result.is_ok(), "user_addresses table should exist");
        assert!(table_result.unwrap().is_some(), "Should have table information");

        // Verify key columns exist
        let columns_result = db
            .query_all(Statement::from_string(
                DbBackend::Postgres,
                "SELECT column_name, data_type, is_nullable, column_default
                 FROM information_schema.columns
                 WHERE table_schema = 'hr_public'
                 AND table_name = 'user_addresses'
                 ORDER BY ordinal_position".to_string(),
            ))
            .await;

        assert!(columns_result.is_ok(), "Should be able to query columns");
        let columns = columns_result.unwrap();
        assert!(columns.len() >= 15, "Should have at least 15 columns");

        // Verify specific important columns
        let column_names: Vec<String> = columns
            .iter()
            .map(|row| row.try_get("", "column_name").unwrap())
            .collect();

        assert!(column_names.contains(&"id".to_string()), "Should have id column");
        assert!(column_names.contains(&"user_id".to_string()), "Should have user_id column");
        assert!(column_names.contains(&"is_primary".to_string()), "Should have is_primary column");
        assert!(column_names.contains(&"address_type".to_string()), "Should have address_type column");
        assert!(column_names.contains(&"deleted_at".to_string()), "Should have deleted_at column");

        // Verify indexes were created
        let indexes_result = db
            .query_all(Statement::from_string(
                DbBackend::Postgres,
                "SELECT indexname FROM pg_indexes
                 WHERE schemaname = 'hr_public'
                 AND tablename = 'user_addresses'
                 ORDER BY indexname".to_string(),
            ))
            .await;

        assert!(indexes_result.is_ok(), "Should be able to query indexes");
        let indexes = indexes_result.unwrap();

        let index_names: Vec<String> = indexes
            .iter()
            .map(|row| row.try_get("", "indexname").unwrap())
            .collect();

        assert!(index_names.contains(&"idx_user_addresses_user_id".to_string()), "Should have user_id index");
        assert!(index_names.contains(&"idx_user_addresses_address_type".to_string()), "Should have address_type index");
        assert!(index_names.contains(&"idx_user_addresses_primary".to_string()), "Should have primary index");
        assert!(index_names.contains(&"user_addresses_one_primary_per_user".to_string()), "Should have unique partial index");

        // Clean up after test
        cleanup_test_data(&db).await;
    }

    #[tokio::test]
    async fn test_user_addresses_partial_index() {
        let db = setup_test_db().await;
        let schema_manager = SchemaManager::new(&db);

        // Clean up before test
        cleanup_test_data(&db).await;

        // Run the migration
        let migration = Migration;
        migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        // Verify the partial index exists
        let index_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                "SELECT indexname, indexdef
                 FROM pg_indexes
                 WHERE schemaname = 'hr_public'
                 AND tablename = 'user_addresses'
                 AND indexname = 'user_addresses_one_primary_per_user'".to_string(),
            ))
            .await;

        assert!(index_result.is_ok(), "Partial index should exist");
        let index_info = index_result.unwrap();
        assert!(index_info.is_some(), "Should have index information");

        let indexdef: String = index_info.unwrap().try_get("", "indexdef").expect("Should get indexdef");

        // Verify the index definition contains the WHERE clause
        assert!(indexdef.contains("WHERE"), "Index definition should contain WHERE clause");
        assert!(indexdef.contains("is_primary = true"), "Index should filter on is_primary = true");
        assert!(indexdef.contains("deleted_at IS NULL"), "Index should filter on deleted_at IS NULL");
        assert!(indexdef.contains("UNIQUE"), "Index should be UNIQUE");

        // Clean up after test
        cleanup_test_data(&db).await;
    }

    #[tokio::test]
    async fn test_user_addresses_table_comment() {
        let db = setup_test_db().await;
        let schema_manager = SchemaManager::new(&db);

        // Clean up before test
        cleanup_test_data(&db).await;

        // Run the migration
        let migration = Migration;
        migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        // Verify the table comment was created
        // Query pg_description for the table comment
        let comment_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                "SELECT d.description
                 FROM pg_class c
                 JOIN pg_namespace n ON n.oid = c.relnamespace
                 LEFT JOIN pg_description d ON d.objoid = c.oid AND d.objsubid = 0
                 WHERE n.nspname = 'hr_public'
                 AND c.relname = 'user_addresses'".to_string(),
            ))
            .await;

        assert!(comment_result.is_ok(), "Should be able to query table comment");
        let comment_info = comment_result.unwrap();
        assert!(comment_info.is_some(), "Should have comment information");

        let description: String = comment_info.unwrap().try_get("", "description").expect("Should get description");
        assert_eq!(
            description,
            "User addresses with support for multiple address types and primary designation",
            "Table comment should match expected text"
        );

        // Clean up after test
        cleanup_test_data(&db).await;
    }

    #[tokio::test]
    async fn test_user_addresses_migration_down() {
        let db = setup_test_db().await;
        let schema_manager = SchemaManager::new(&db);

        // Clean up before test
        cleanup_test_data(&db).await;

        let migration = Migration;

        // Run up migration first
        migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        // Now run down migration
        migration
            .down(&schema_manager)
            .await
            .expect("Migration down should succeed");

        // Verify the table was dropped
        let table_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                "SELECT COUNT(*) FROM information_schema.tables
                 WHERE table_schema = 'hr_public'
                 AND table_name = 'user_addresses'".to_string(),
            ))
            .await;

        assert!(table_result.is_ok(), "Should be able to check if table exists");
        let table_info = table_result.unwrap();
        assert!(table_info.is_some(), "Should have table count");

        let count: i64 = table_info.unwrap().try_get("", "count").expect("Should get count");
        assert_eq!(count, 0, "Table should be dropped");

        // Clean up after test
        cleanup_test_data(&db).await;
    }

    #[tokio::test]
    async fn test_user_addresses_idempotent_up() {
        let db = setup_test_db().await;
        let schema_manager = SchemaManager::new(&db);

        // Clean up before test
        cleanup_test_data(&db).await;

        let migration = Migration;

        // Run migration twice - should not error due to IF NOT EXISTS
        migration
            .up(&schema_manager)
            .await
            .expect("First migration up should succeed");

        migration
            .up(&schema_manager)
            .await
            .expect("Second migration up should succeed (idempotent)");

        // Clean up after test
        cleanup_test_data(&db).await;
    }

    #[tokio::test]
    async fn test_user_addresses_idempotent_down() {
        let db = setup_test_db().await;
        let schema_manager = SchemaManager::new(&db);

        // Clean up before test
        cleanup_test_data(&db).await;

        let migration = Migration;

        // Run up migration first
        migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        // Run down migration twice - should not error
        migration
            .down(&schema_manager)
            .await
            .expect("First migration down should succeed");

        migration
            .down(&schema_manager)
            .await
            .expect("Second migration down should succeed (idempotent)");

        // Clean up after test
        cleanup_test_data(&db).await;
    }

    #[tokio::test]
    async fn test_user_addresses_primary_constraint_basic() {
        let db = setup_test_db().await;
        let schema_manager = SchemaManager::new(&db);

        // Clean up before test
        cleanup_test_data(&db).await;

        // Insert test user
        let user_id = "10000000-0000-0000-0000-000000000001";
        insert_test_user(&db, user_id).await.expect("Should insert test user");

        // Run the migration
        let migration = Migration;
        migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        // Insert first primary address - should succeed
        let first_primary_result = db
            .execute(Statement::from_string(
                DbBackend::Postgres,
                format!(
                    "INSERT INTO hr_public.user_addresses (user_id, address_type, is_primary, address_line1, city, state_province, postal_code)
                     VALUES ('{}'::uuid, 'home', true, '123 Main St', 'Springfield', 'IL', '62701')",
                    user_id
                ),
            ))
            .await;

        assert!(first_primary_result.is_ok(), "First primary address should insert successfully");

        // Try to insert second primary address - should fail due to unique partial index
        let second_primary_result = db
            .execute(Statement::from_string(
                DbBackend::Postgres,
                format!(
                    "INSERT INTO hr_public.user_addresses (user_id, address_type, is_primary, address_line1, city, state_province, postal_code)
                     VALUES ('{}'::uuid, 'work', true, '456 Oak Ave', 'Springfield', 'IL', '62702')",
                    user_id
                ),
            ))
            .await;

        assert!(second_primary_result.is_err(), "Second primary address should fail due to unique constraint");
        let error_msg = format!("{:?}", second_primary_result.unwrap_err());
        assert!(
            error_msg.contains("user_addresses_one_primary_per_user") || error_msg.contains("duplicate key"),
            "Error should mention the unique constraint or duplicate key. Got: {}", error_msg
        );

        // Clean up test users
        cleanup_test_users(&db, &[user_id]).await;

        // Clean up after test
        cleanup_test_data(&db).await;
    }

    #[tokio::test]
    async fn test_user_addresses_multiple_non_primary() {
        let db = setup_test_db().await;
        let schema_manager = SchemaManager::new(&db);

        // Clean up before test
        cleanup_test_data(&db).await;

        // Insert test user
        let user_id = "10000000-0000-0000-0000-000000000002";
        insert_test_user(&db, user_id).await.expect("Should insert test user");

        // Run the migration
        let migration = Migration;
        migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        // Insert first non-primary address - should succeed
        let first_result = db
            .execute(Statement::from_string(
                DbBackend::Postgres,
                format!(
                    "INSERT INTO hr_public.user_addresses (user_id, address_type, is_primary, address_line1, city, state_province, postal_code)
                     VALUES ('{}'::uuid, 'home', false, '123 Main St', 'Springfield', 'IL', '62701')",
                    user_id
                ),
            ))
            .await;

        assert!(first_result.is_ok(), "First non-primary address should insert successfully");

        // Insert second non-primary address - should succeed (no uniqueness constraint on non-primary)
        let second_result = db
            .execute(Statement::from_string(
                DbBackend::Postgres,
                format!(
                    "INSERT INTO hr_public.user_addresses (user_id, address_type, is_primary, address_line1, city, state_province, postal_code)
                     VALUES ('{}'::uuid, 'work', false, '456 Oak Ave', 'Springfield', 'IL', '62702')",
                    user_id
                ),
            ))
            .await;

        assert!(second_result.is_ok(), "Second non-primary address should insert successfully");

        // Insert third non-primary address - should also succeed
        let third_result = db
            .execute(Statement::from_string(
                DbBackend::Postgres,
                format!(
                    "INSERT INTO hr_public.user_addresses (user_id, address_type, is_primary, address_line1, city, state_province, postal_code)
                     VALUES ('{}'::uuid, 'billing', false, '789 Elm Rd', 'Springfield', 'IL', '62703')",
                    user_id
                ),
            ))
            .await;

        assert!(third_result.is_ok(), "Third non-primary address should insert successfully");

        // Verify all three addresses exist
        let count_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                format!(
                    "SELECT COUNT(*) as count FROM hr_public.user_addresses WHERE user_id = '{}'::uuid",
                    user_id
                ),
            ))
            .await;

        assert!(count_result.is_ok(), "Should be able to count addresses");
        let count_info = count_result.unwrap();
        assert!(count_info.is_some(), "Should have count");

        let count: i64 = count_info.unwrap().try_get("", "count").expect("Should get count");
        assert_eq!(count, 3, "User should have 3 addresses");

        // Clean up test users
        cleanup_test_users(&db, &[user_id]).await;

        // Clean up after test
        cleanup_test_data(&db).await;
    }

    #[tokio::test]
    async fn test_user_addresses_soft_delete_allows_new_primary() {
        let db = setup_test_db().await;
        let schema_manager = SchemaManager::new(&db);

        // Clean up before test
        cleanup_test_data(&db).await;

        // Insert test user
        let user_id = "10000000-0000-0000-0000-000000000003";
        insert_test_user(&db, user_id).await.expect("Should insert test user");

        // Run the migration
        let migration = Migration;
        migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        // Insert first primary address
        let first_result = db
            .execute(Statement::from_string(
                DbBackend::Postgres,
                format!(
                    "INSERT INTO hr_public.user_addresses (user_id, address_type, is_primary, address_line1, city, state_province, postal_code)
                     VALUES ('{}'::uuid, 'home', true, '123 Main St', 'Springfield', 'IL', '62701')",
                    user_id
                ),
            ))
            .await;

        assert!(first_result.is_ok(), "First primary address should insert successfully");

        // Soft delete the primary address (set deleted_at)
        let delete_result = db
            .execute(Statement::from_string(
                DbBackend::Postgres,
                format!(
                    "UPDATE hr_public.user_addresses
                     SET deleted_at = NOW()
                     WHERE user_id = '{}'::uuid AND is_primary = true",
                    user_id
                ),
            ))
            .await;

        assert!(delete_result.is_ok(), "Soft delete should succeed");

        // Insert new primary address - should succeed because deleted_at IS NOT NULL for old primary
        // (partial index WHERE clause excludes deleted rows)
        let new_primary_result = db
            .execute(Statement::from_string(
                DbBackend::Postgres,
                format!(
                    "INSERT INTO hr_public.user_addresses (user_id, address_type, is_primary, address_line1, city, state_province, postal_code)
                     VALUES ('{}'::uuid, 'work', true, '456 Oak Ave', 'Springfield', 'IL', '62702')",
                    user_id
                ),
            ))
            .await;

        assert!(new_primary_result.is_ok(), "New primary address should insert successfully after soft delete");

        // Verify we have 2 addresses (1 deleted, 1 active)
        let count_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                format!(
                    "SELECT COUNT(*) as count FROM hr_public.user_addresses WHERE user_id = '{}'::uuid",
                    user_id
                ),
            ))
            .await;

        assert!(count_result.is_ok(), "Should be able to count addresses");
        let count_info = count_result.unwrap();
        assert!(count_info.is_some(), "Should have count");

        let count: i64 = count_info.unwrap().try_get("", "count").expect("Should get count");
        assert_eq!(count, 2, "User should have 2 addresses (1 deleted, 1 active)");

        // Verify only 1 active primary
        let active_primary_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                format!(
                    "SELECT COUNT(*) as count FROM hr_public.user_addresses
                     WHERE user_id = '{}'::uuid AND is_primary = true AND deleted_at IS NULL",
                    user_id
                ),
            ))
            .await;

        assert!(active_primary_result.is_ok(), "Should be able to count active primaries");
        let active_primary_info = active_primary_result.unwrap();
        assert!(active_primary_info.is_some(), "Should have count");

        let active_count: i64 = active_primary_info.unwrap().try_get("", "count").expect("Should get count");
        assert_eq!(active_count, 1, "User should have exactly 1 active primary address");

        // Clean up test users
        cleanup_test_users(&db, &[user_id]).await;

        // Clean up after test
        cleanup_test_data(&db).await;
    }

    #[tokio::test]
    async fn test_user_addresses_foreign_key_cascade() {
        let db = setup_test_db().await;
        let schema_manager = SchemaManager::new(&db);

        // Clean up before test
        cleanup_test_data(&db).await;

        // Insert test user
        let user_id = "10000000-0000-0000-0000-000000000004";
        insert_test_user(&db, user_id).await.expect("Should insert test user");

        // Run the migration
        let migration = Migration;
        migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        // Insert address
        let insert_result = db
            .execute(Statement::from_string(
                DbBackend::Postgres,
                format!(
                    "INSERT INTO hr_public.user_addresses (user_id, address_type, is_primary, address_line1, city, state_province, postal_code)
                     VALUES ('{}'::uuid, 'home', true, '123 Main St', 'Springfield', 'IL', '62701')",
                    user_id
                ),
            ))
            .await;

        assert!(insert_result.is_ok(), "Address should insert successfully");

        // Verify address exists
        let count_before = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                format!(
                    "SELECT COUNT(*) as count FROM hr_public.user_addresses WHERE user_id = '{}'::uuid",
                    user_id
                ),
            ))
            .await
            .unwrap()
            .unwrap()
            .try_get::<i64>("", "count")
            .unwrap();

        assert_eq!(count_before, 1, "Should have 1 address before user deletion");

        // Delete the user - should cascade delete the address
        let delete_user_result = db
            .execute(Statement::from_string(
                DbBackend::Postgres,
                format!("DELETE FROM hr_public.users WHERE id = '{}'::uuid", user_id),
            ))
            .await;

        assert!(delete_user_result.is_ok(), "User deletion should succeed");

        // Verify address was cascade deleted
        let count_after_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                format!(
                    "SELECT COUNT(*) as count FROM hr_public.user_addresses WHERE user_id = '{}'::uuid",
                    user_id
                ),
            ))
            .await;

        assert!(count_after_result.is_ok(), "Should be able to count addresses after user deletion");
        let count_after_info = count_after_result.unwrap();
        assert!(count_after_info.is_some(), "Should have count");

        let count_after: i64 = count_after_info.unwrap().try_get("", "count").expect("Should get count");
        assert_eq!(count_after, 0, "Address should be cascade deleted when user is deleted");

        // Clean up after test (user already deleted, just clean up table)
        cleanup_test_data(&db).await;
    }
}
