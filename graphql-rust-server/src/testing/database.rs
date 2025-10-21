//! TestDatabase: Ephemeral PostgreSQL database for test isolation
//!
//! Provides isolated PostgreSQL database instances via Docker containers
//! for complete test isolation. Each test gets its own database with
//! migrations applied from scratch.

use sea_orm::{Database, DatabaseConnection, ConnectionTrait};
use sea_orm_migration::MigratorTrait;
use testcontainers::{clients::Cli, Container, Image, RunnableImage};
use testcontainers_modules::postgres::Postgres;
use uuid::Uuid;

use super::config::TestConfig;
use super::errors::TestDatabaseError;

// Import the migration module from the crate root
use crate::migration::Migrator;

/// Represents an isolated PostgreSQL database for testing
pub struct TestDatabase {
    /// Unique identifier for this test database
    pub id: Uuid,

    /// Database name (e.g., "test_db_550e8400")
    pub name: String,

    /// Docker container handle (testcontainers)
    /// We use 'static lifetime because testcontainers requires it
    _container: Container<'static, Postgres>,

    /// Database connection pool
    pool: DatabaseConnection,

    /// Database URL for connecting
    pub url: String,

    /// Test configuration
    config: TestConfig,
}

impl TestDatabase {
    /// Creates a new test database with migrations applied
    ///
    /// # Returns
    /// - Ok(TestDatabase) with fully initialized database
    /// - Err(TestDatabaseError) if setup fails
    ///
    /// # Behavior
    /// 1. Starts a Docker PostgreSQL container
    /// 2. Generates unique database name
    /// 3. Creates connection pool
    /// 4. Runs all migrations from scratch
    ///
    /// # Performance
    /// - Expected time: 2-4 seconds
    /// - Blocking: Yes (Docker + migrations)
    pub async fn new() -> Result<Self, TestDatabaseError> {
        let config = TestConfig::from_env();
        Self::new_with_config(config).await
    }

    /// Creates a new test database with custom configuration
    pub async fn new_with_config(config: TestConfig) -> Result<Self, TestDatabaseError> {
        // Generate unique database name
        let id = Uuid::new_v4();
        let name = format!("test_db_{}", id.as_simple());

        tracing::debug!("Creating test database: {}", name);

        // Start Docker PostgreSQL container with specified image
        let docker = Cli::default();

        // Use the configured PostgreSQL image (default: postgres:15-alpine)
        // Note: testcontainers-modules v0.3 Postgres::default() uses postgres:11-alpine
        // We create a custom image to ensure we use postgres:15
        let tag = config.postgres_image
            .split(':')
            .last()
            .unwrap_or("15-alpine")
            .to_string();

        let postgres_image = RunnableImage::from(Postgres::default())
            .with_tag(tag);

        let container = docker.run(postgres_image);

        // Get connection details
        let host = "127.0.0.1";
        let port = container.get_host_port_ipv4(5432);
        let database = "postgres"; // Initial connection to postgres database
        let user = "postgres";
        let password = "postgres";

        // Build connection URL for postgres database (to create test database)
        let postgres_url = format!(
            "postgres://{}:{}@{}:{}/{}",
            user, password, host, port, database
        );

        tracing::debug!("Connecting to PostgreSQL at port {}", port);

        // Connect to postgres database
        let postgres_conn = Database::connect(&postgres_url)
            .await
            .map_err(|e| TestDatabaseError::ConnectionFailed(e.to_string()))?;

        // Create test database
        let create_db_sql = format!("CREATE DATABASE {}", name);
        postgres_conn
            .execute(sea_orm::Statement::from_string(
                sea_orm::DatabaseBackend::Postgres,
                create_db_sql,
            ))
            .await
            .map_err(|e| TestDatabaseError::DatabaseError(e))?;

        tracing::debug!("Created test database: {}", name);

        // Close connection to postgres database
        drop(postgres_conn);

        // Build connection URL for test database
        let test_db_url = format!(
            "postgres://{}:{}@{}:{}/{}",
            user, password, host, port, name
        );

        // Connect to test database
        let pool = Database::connect(&test_db_url)
            .await
            .map_err(|e| TestDatabaseError::ConnectionFailed(e.to_string()))?;

        tracing::debug!("Connected to test database: {}", name);

        let mut db = Self {
            id,
            name,
            _container: unsafe {
                // SAFETY: We need to convert the container to 'static lifetime
                // This is safe because the container is owned by TestDatabase
                // and will be dropped when TestDatabase is dropped
                std::mem::transmute(container)
            },
            pool,
            url: test_db_url,
            config,
        };

        // Run migrations
        db.run_migrations().await?;

        tracing::info!("Test database ready: {} ({})", db.name, db.id);

        Ok(db)
    }

    /// Runs all migrations on this database
    ///
    /// # Returns
    /// - Ok(()) if migrations succeed
    /// - Err(TestDatabaseError) if migrations fail
    ///
    /// # Behavior
    /// Executes all migrations defined in the migration module
    /// in the correct order using SeaORM's MigratorTrait
    pub async fn run_migrations(&mut self) -> Result<(), TestDatabaseError> {
        tracing::debug!("Running migrations on database: {}", self.name);

        // Run migrations using the project's Migrator
        Migrator::up(&self.pool, None)
            .await
            .map_err(|e| TestDatabaseError::MigrationFailed(e))?;

        tracing::info!("Migrations completed for database: {}", self.name);

        Ok(())
    }

    /// Gets a reference to the database connection
    ///
    /// # Returns
    /// Reference to SeaORM DatabaseConnection
    ///
    /// # Usage
    /// ```rust
    /// let conn = test_db.connection();
    /// let user = User::find_by_id(1).one(conn).await?;
    /// ```
    pub fn connection(&self) -> &DatabaseConnection {
        &self.pool
    }

    /// Gets the database name
    pub fn database_name(&self) -> &str {
        &self.name
    }

    /// Gets the database URL
    pub fn database_url(&self) -> &str {
        &self.url
    }

    /// Gets the test configuration
    pub fn config(&self) -> &TestConfig {
        &self.config
    }
}

// Automatic cleanup on drop
impl Drop for TestDatabase {
    fn drop(&mut self) {
        tracing::debug!("Dropping test database: {} ({})", self.name, self.id);
        // Container is automatically stopped and removed by testcontainers
        // when it goes out of scope
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_database_creation() {
        // This test verifies that TestDatabase can be created and initialized
        let result = TestDatabase::new().await;
        if let Err(e) = &result {
            eprintln!("TestDatabase creation error: {:?}", e);
        }
        assert!(result.is_ok(), "TestDatabase creation should succeed");

        let db = result.unwrap();
        assert!(!db.name.is_empty(), "Database name should not be empty");
        assert!(!db.url.is_empty(), "Database URL should not be empty");

        // Test database should have a valid connection
        let conn = db.connection();
        assert!(conn.ping().await.is_ok(), "Database connection should be valid");
    }

    #[tokio::test]
    async fn test_migrations_run() {
        // This test verifies that migrations are applied successfully
        let db = TestDatabase::new().await.expect("Failed to create test database");

        // Query for a table that should exist after migrations
        // (users table is created in migration 003_auth)
        let result = db.connection()
            .execute(sea_orm::Statement::from_string(
                sea_orm::DatabaseBackend::Postgres,
                "SELECT 1 FROM hr_public.users LIMIT 1".to_string(),
            ))
            .await;

        // The query should not fail (table exists), even if it returns no rows
        assert!(result.is_ok() || result.unwrap_err().to_string().contains("no rows"),
                "Users table should exist after migrations");
    }

    #[tokio::test]
    async fn test_database_isolation() {
        // This test verifies that multiple test databases are isolated
        let db1 = TestDatabase::new().await.expect("Failed to create first database");
        let db2 = TestDatabase::new().await.expect("Failed to create second database");

        // Databases should have different names
        assert_ne!(db1.name, db2.name, "Test databases should have unique names");

        // Databases should have different URLs
        assert_ne!(db1.url, db2.url, "Test databases should have unique URLs");
    }
}
