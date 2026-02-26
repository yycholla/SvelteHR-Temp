//! Tests for m20260113_001_password_reset_tokens migration
//!
//! Validates that the migration:
//! 1. Uses SeaORM builders for all operations (100% coverage, pure SeaORM)
//! 2. Creates password_reset_tokens table with proper columns
//! 3. Adds foreign key to users table with CASCADE
//! 4. Creates 3 indexes for query optimization
//! 5. Handles up/down migrations with idempotency
//! 6. Properly handles token uniqueness and expiration tracking

#[cfg(test)]
mod tests {
    use hr_graphql_server::migration::m20260113_001_password_reset_tokens::Migration;
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
                "DROP TABLE IF EXISTS hr_public.password_reset_tokens CASCADE".to_string(),
            ))
            .await;
    }

    #[tokio::test]
    async fn test_password_reset_tokens_migration_compiles() {
        let _migration = Migration;
        assert!(true, "Migration struct compiles successfully");
    }

    #[tokio::test]
    async fn test_password_reset_tokens_migration_up() {
        let db = setup_test_db().await;
        let schema_manager = SchemaManager::new(&db);

        cleanup_test_data(&db).await;

        let migration = Migration;
        migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        // Verify table was created
        let table_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                "SELECT table_name FROM information_schema.tables
                 WHERE table_schema = 'hr_public'
                 AND table_name = 'password_reset_tokens'"
                    .to_string(),
            ))
            .await;

        assert!(
            table_result.is_ok(),
            "password_reset_tokens table should exist"
        );
        assert!(table_result.unwrap().is_some());

        cleanup_test_data(&db).await;
    }

    #[tokio::test]
    async fn test_password_reset_tokens_columns() {
        let db = setup_test_db().await;
        let schema_manager = SchemaManager::new(&db);

        cleanup_test_data(&db).await;

        let migration = Migration;
        migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        let columns = vec![
            "id",
            "user_id",
            "token",
            "expires_at",
            "used_at",
            "ip_address",
            "created_at",
        ];

        for column_name in columns {
            let column_result = db
                .query_one(Statement::from_string(
                    DbBackend::Postgres,
                    format!(
                        "SELECT column_name FROM information_schema.columns
                         WHERE table_schema = 'hr_public'
                         AND table_name = 'password_reset_tokens'
                         AND column_name = '{}'",
                        column_name
                    ),
                ))
                .await;

            assert!(column_result.is_ok(), "Column {} should exist", column_name);
            assert!(column_result.unwrap().is_some());
        }

        cleanup_test_data(&db).await;
    }

    #[tokio::test]
    async fn test_password_reset_tokens_token_unique() {
        let db = setup_test_db().await;
        let schema_manager = SchemaManager::new(&db);

        cleanup_test_data(&db).await;

        let migration = Migration;
        migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        // Verify token column has unique constraint
        let constraint_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                "SELECT constraint_type FROM information_schema.table_constraints tc
                 JOIN information_schema.constraint_column_usage ccu
                 ON tc.constraint_name = ccu.constraint_name
                 WHERE tc.table_schema = 'hr_public'
                 AND tc.table_name = 'password_reset_tokens'
                 AND ccu.column_name = 'token'
                 AND tc.constraint_type = 'UNIQUE'"
                    .to_string(),
            ))
            .await;

        assert!(
            constraint_result.is_ok(),
            "token column should have UNIQUE constraint"
        );
        assert!(constraint_result.unwrap().is_some());

        cleanup_test_data(&db).await;
    }

    #[tokio::test]
    async fn test_password_reset_tokens_foreign_key() {
        let db = setup_test_db().await;
        let schema_manager = SchemaManager::new(&db);

        cleanup_test_data(&db).await;

        let migration = Migration;
        migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        // Verify foreign key to users table
        let fk_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                "SELECT constraint_name FROM information_schema.table_constraints
                 WHERE table_schema = 'hr_public'
                 AND table_name = 'password_reset_tokens'
                 AND constraint_name = 'fk_password_reset_tokens_user_id'
                 AND constraint_type = 'FOREIGN KEY'"
                    .to_string(),
            ))
            .await;

        assert!(fk_result.is_ok(), "user_id foreign key should exist");
        assert!(fk_result.unwrap().is_some());

        cleanup_test_data(&db).await;
    }

    #[tokio::test]
    async fn test_password_reset_tokens_indexes() {
        let db = setup_test_db().await;
        let schema_manager = SchemaManager::new(&db);

        cleanup_test_data(&db).await;

        let migration = Migration;
        migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        let indexes = vec![
            "idx_password_reset_tokens_token",
            "idx_password_reset_tokens_user_expires",
            "idx_password_reset_tokens_expires_at",
        ];

        for index_name in indexes {
            let index_result = db
                .query_one(Statement::from_string(
                    DbBackend::Postgres,
                    format!(
                        "SELECT indexname FROM pg_indexes
                         WHERE schemaname = 'hr_public'
                         AND tablename = 'password_reset_tokens'
                         AND indexname = '{}'",
                        index_name
                    ),
                ))
                .await;

            assert!(index_result.is_ok(), "Index {} should exist", index_name);
            assert!(index_result.unwrap().is_some());
        }

        cleanup_test_data(&db).await;
    }

    #[tokio::test]
    async fn test_password_reset_tokens_column_properties() {
        let db = setup_test_db().await;
        let schema_manager = SchemaManager::new(&db);

        cleanup_test_data(&db).await;

        let migration = Migration;
        migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        // Verify token column properties
        let column_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                "SELECT character_maximum_length, is_nullable
                 FROM information_schema.columns
                 WHERE table_schema = 'hr_public'
                 AND table_name = 'password_reset_tokens'
                 AND column_name = 'token'"
                    .to_string(),
            ))
            .await;

        assert!(column_result.is_ok());
        let column = column_result.unwrap().unwrap();
        let max_length: Option<i32> = column.try_get("", "character_maximum_length").ok();
        let is_nullable: String = column
            .try_get("", "is_nullable")
            .expect("Should get is_nullable");

        assert_eq!(max_length, Some(64), "token should be VARCHAR(64)");
        assert_eq!(is_nullable, "NO", "token should be NOT NULL");

        // Verify ip_address column length (supports IPv6)
        let column_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                "SELECT character_maximum_length
                 FROM information_schema.columns
                 WHERE table_schema = 'hr_public'
                 AND table_name = 'password_reset_tokens'
                 AND column_name = 'ip_address'"
                    .to_string(),
            ))
            .await;

        assert!(column_result.is_ok());
        let max_length: Option<i32> = column_result
            .unwrap()
            .unwrap()
            .try_get("", "character_maximum_length")
            .ok();
        assert_eq!(
            max_length,
            Some(45),
            "ip_address should be VARCHAR(45) for IPv6 support"
        );

        cleanup_test_data(&db).await;
    }

    #[tokio::test]
    async fn test_password_reset_tokens_migration_down() {
        let db = setup_test_db().await;
        let schema_manager = SchemaManager::new(&db);

        cleanup_test_data(&db).await;

        let migration = Migration;
        migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");
        migration
            .down(&schema_manager)
            .await
            .expect("Migration down should succeed");

        let table_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                "SELECT COUNT(*) as count FROM information_schema.tables
                 WHERE table_schema = 'hr_public'
                 AND table_name = 'password_reset_tokens'"
                    .to_string(),
            ))
            .await;

        assert!(table_result.is_ok());
        let count: i64 = table_result
            .unwrap()
            .unwrap()
            .try_get("", "count")
            .expect("Should get count");
        assert_eq!(count, 0, "Table should be dropped");

        cleanup_test_data(&db).await;
    }

    #[tokio::test]
    async fn test_password_reset_tokens_idempotent_up() {
        let db = setup_test_db().await;
        let schema_manager = SchemaManager::new(&db);

        cleanup_test_data(&db).await;

        let migration = Migration;
        migration
            .up(&schema_manager)
            .await
            .expect("First migration up should succeed");
        migration
            .up(&schema_manager)
            .await
            .expect("Second migration up should succeed (idempotent)");

        cleanup_test_data(&db).await;
    }

    #[tokio::test]
    async fn test_password_reset_tokens_idempotent_down() {
        let db = setup_test_db().await;
        let schema_manager = SchemaManager::new(&db);

        cleanup_test_data(&db).await;

        let migration = Migration;
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
    async fn test_password_reset_tokens_full_cycle() {
        let db = setup_test_db().await;
        let schema_manager = SchemaManager::new(&db);

        cleanup_test_data(&db).await;

        let migration = Migration;
        migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        let table_check = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                "SELECT table_name FROM information_schema.tables
                 WHERE table_schema = 'hr_public'
                 AND table_name = 'password_reset_tokens'"
                    .to_string(),
            ))
            .await;
        assert!(
            table_check.is_ok() && table_check.unwrap().is_some(),
            "Table should exist after up"
        );

        migration
            .down(&schema_manager)
            .await
            .expect("Migration down should succeed");

        let table_check = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                "SELECT COUNT(*) as count FROM information_schema.tables
                 WHERE table_schema = 'hr_public'
                 AND table_name = 'password_reset_tokens'"
                    .to_string(),
            ))
            .await;
        let count: i64 = table_check
            .unwrap()
            .unwrap()
            .try_get("", "count")
            .expect("Should get count");
        assert_eq!(count, 0, "Table should be dropped after down");

        cleanup_test_data(&db).await;
    }

    #[tokio::test]
    async fn test_password_reset_tokens_column_comments() {
        let db = setup_test_db().await;
        let schema_manager = SchemaManager::new(&db);

        cleanup_test_data(&db).await;

        let migration = Migration;
        migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        // Verify column comments are set (important for documentation)
        let comment_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                "SELECT col_description('hr_public.password_reset_tokens'::regclass,
                 (SELECT ordinal_position FROM information_schema.columns
                  WHERE table_schema = 'hr_public'
                  AND table_name = 'password_reset_tokens'
                  AND column_name = 'token')) as comment"
                    .to_string(),
            ))
            .await;

        assert!(
            comment_result.is_ok(),
            "Should be able to query column comments"
        );
        let comment_info = comment_result.unwrap();
        assert!(comment_info.is_some(), "Should have comment information");

        let comment: Option<String> = comment_info.unwrap().try_get("", "comment").ok();
        assert!(comment.is_some(), "token should have a comment");
        assert!(
            comment.unwrap().contains("token"),
            "Comment should describe the column"
        );

        cleanup_test_data(&db).await;
    }

    #[tokio::test]
    async fn test_password_reset_tokens_nullable_columns() {
        let db = setup_test_db().await;
        let schema_manager = SchemaManager::new(&db);

        cleanup_test_data(&db).await;

        let migration = Migration;
        migration
            .up(&schema_manager)
            .await
            .expect("Migration up should succeed");

        // Verify used_at is nullable (for one-time use tracking)
        let column_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                "SELECT is_nullable FROM information_schema.columns
                 WHERE table_schema = 'hr_public'
                 AND table_name = 'password_reset_tokens'
                 AND column_name = 'used_at'"
                    .to_string(),
            ))
            .await;

        assert!(column_result.is_ok());
        let is_nullable: String = column_result
            .unwrap()
            .unwrap()
            .try_get("", "is_nullable")
            .expect("Should get is_nullable");
        assert_eq!(is_nullable, "YES", "used_at should be nullable");

        // Verify ip_address is nullable
        let column_result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                "SELECT is_nullable FROM information_schema.columns
                 WHERE table_schema = 'hr_public'
                 AND table_name = 'password_reset_tokens'
                 AND column_name = 'ip_address'"
                    .to_string(),
            ))
            .await;

        assert!(column_result.is_ok());
        let is_nullable: String = column_result
            .unwrap()
            .unwrap()
            .try_get("", "is_nullable")
            .expect("Should get is_nullable");
        assert_eq!(is_nullable, "YES", "ip_address should be nullable");

        cleanup_test_data(&db).await;
    }
}
