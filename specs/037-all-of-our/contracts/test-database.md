# Contract: TestDatabase

**Module**: `src/testing/database.rs`
**Type**: Struct
**Purpose**: Manages ephemeral PostgreSQL database instances for complete test isolation

## Public API

### Constructor

```rust
impl TestDatabase {
    /// Creates a new isolated PostgreSQL database with all migrations applied
    ///
    /// # Behavior
    /// 1. Starts a PostgreSQL Docker container via testcontainers
    /// 2. Generates unique database name (test_db_<uuid>)
    /// 3. Creates database connection pool
    /// 4. Runs all SeaORM migrations from scratch
    /// 5. Returns TestDatabase instance
    ///
    /// # Returns
    /// - Ok(TestDatabase) on success
    /// - Err(TestDatabaseError) if:
    ///   - Docker daemon not available
    ///   - Container fails to start
    ///   - Migrations fail
    ///   - Connection pool creation fails
    ///
    /// # Performance
    /// - Expected time: 2-3 seconds (Docker startup + migrations)
    /// - Blocking: Yes (async but sequential)
    ///
    /// # Example
    /// ```rust
    /// let db = TestDatabase::new().await?;
    /// // Use db.connection() for queries
    /// // Automatic cleanup on drop
    /// ```
    pub async fn new() -> Result<Self, TestDatabaseError>;
}
```

**Contract**:
- MUST create completely isolated database (no shared state)
- MUST run all migrations in correct order
- MUST handle migration failures gracefully with clear errors
- MUST clean up Docker container on drop (even on panic)
- MUST generate unique database names (collision probability < 1e-36)

### Methods

```rust
impl TestDatabase {
    /// Runs all database migrations on this instance
    ///
    /// # Behavior
    /// - Executes SeaORM migrator
    /// - Applies migrations in dependency order
    /// - Idempotent: Safe to call multiple times
    ///
    /// # Returns
    /// - Ok(()) on success
    /// - Err(MigrationError) if any migration fails
    ///
    /// # Contract
    /// - MUST apply migrations in correct dependency order
    /// - MUST rollback on failure (transaction per migration)
    /// - MUST provide detailed error messages (which migration failed)
    pub async fn run_migrations(&self) -> Result<(), MigrationError>;

    /// Gets a reference to the database connection
    ///
    /// # Returns
    /// - Reference to SeaORM DatabaseConnection
    ///
    /// # Usage
    /// ```rust
    /// let conn = db.connection();
    /// let user = User::find_by_id(1).one(conn).await?;
    /// ```
    ///
    /// # Contract
    /// - MUST return connection to isolated database (not shared)
    /// - MUST be valid for lifetime of TestDatabase
    pub fn connection(&self) -> &DatabaseConnection;

    /// Gets the database URL for this instance
    ///
    /// # Returns
    /// - PostgreSQL connection string
    ///
    /// # Format
    /// - `postgresql://user:pass@host:port/db_name`
    ///
    /// # Contract
    /// - MUST be valid connection string
    /// - MUST point to this specific test database
    pub fn url(&self) -> &str;
}
```

### Destructor

```rust
impl Drop for TestDatabase {
    /// Automatically cleans up Docker container and database
    ///
    /// # Behavior
    /// - Container is stopped and removed
    /// - Database connections are closed
    /// - No manual cleanup required
    ///
    /// # Contract
    /// - MUST clean up even on panic
    /// - MUST be async-safe (no blocking operations)
    /// - MUST not fail (best-effort cleanup)
    fn drop(&mut self);
}
```

## Error Handling

```rust
#[derive(Debug, thiserror::Error)]
pub enum TestDatabaseError {
    #[error("Docker container failed to start: {0}")]
    ContainerStartFailed(String),

    #[error("Database migrations failed: {0}")]
    MigrationFailed(#[from] sea_orm_migration::DbErr),

    #[error("Database connection failed: {0}")]
    ConnectionFailed(String),

    #[error("Failed to generate unique database name: {0}")]
    NameGenerationFailed(String),
}
```

## Invariants

1. **Isolation**: Each TestDatabase instance MUST have its own PostgreSQL database
2. **Migration State**: Database MUST have all migrations applied before use
3. **Cleanup**: Docker container MUST be removed when TestDatabase is dropped
4. **Thread Safety**: TestDatabase is NOT Send/Sync (single-test ownership)
5. **Uniqueness**: Database names MUST be unique (UUID-based)

## Performance Guarantees

- **Creation Time**: 2-3 seconds (95th percentile)
- **Migration Time**: Proportional to number of migrations (~100ms per migration)
- **Cleanup Time**: <500ms (container stop + remove)
- **Memory Usage**: ~50MB per instance (PostgreSQL + connection pool)

## Dependencies

```toml
[dev-dependencies]
testcontainers = "0.15"
testcontainers-modules = { version = "0.3", features = ["postgres"] }
sea-orm = { version = "0.12", features = ["sqlx-postgres", "runtime-tokio-rustls"] }
uuid = { version = "1.6", features = ["v4"] }
```

## Testing Contract

### Unit Tests

```rust
#[cfg(test)]
mod tests {
    #[tokio::test]
    async fn test_database_creation_succeeds() {
        let db = TestDatabase::new().await.unwrap();
        assert!(db.url().starts_with("postgresql://"));
    }

    #[tokio::test]
    async fn test_migrations_run_successfully() {
        let db = TestDatabase::new().await.unwrap();
        // Verify tables exist
        let conn = db.connection();
        // Query schema to verify migrations ran
    }

    #[tokio::test]
    async fn test_databases_are_isolated() {
        let db1 = TestDatabase::new().await.unwrap();
        let db2 = TestDatabase::new().await.unwrap();

        // Insert data in db1
        // Verify data NOT in db2
        assert_ne!(db1.name, db2.name);
    }

    #[tokio::test]
    async fn test_cleanup_on_drop() {
        let db_name = {
            let db = TestDatabase::new().await.unwrap();
            db.name.clone()
        }; // db dropped here

        // Verify container is stopped
        // Verify database no longer accessible
    }
}
```

### Integration Test Requirements

- MUST verify Docker container starts
- MUST verify migrations apply correctly
- MUST verify database isolation (concurrent tests)
- MUST verify cleanup on normal and panic exit

## Usage Examples

### Basic Usage

```rust
#[tokio::test]
async fn test_user_creation() {
    let db = TestDatabase::new().await.unwrap();
    let conn = db.connection();

    let user = user::ActiveModel {
        email: Set("test@example.com".to_string()),
        ..Default::default()
    };

    let result = user.insert(conn).await;
    assert!(result.is_ok());
}
```

### Parallel Tests

```rust
#[tokio::test]
async fn test_scenario_a() {
    let db = TestDatabase::new().await.unwrap();
    // Test logic - isolated from other tests
}

#[tokio::test]
async fn test_scenario_b() {
    let db = TestDatabase::new().await.unwrap();
    // Different database instance - no interference
}
```

## Migration Failure Handling

```rust
#[tokio::test]
async fn test_handles_migration_failure() {
    // Simulate migration failure
    let result = TestDatabase::new().await;

    match result {
        Err(TestDatabaseError::MigrationFailed(err)) => {
            // Expected - should provide clear error message
            assert!(err.to_string().contains("migration"));
        }
        _ => panic!("Expected migration failure"),
    }
}
```

## Compatibility

- **Rust Version**: 1.70+ (tokio async/await)
- **PostgreSQL Version**: 12+ (tested with 15-alpine Docker image)
- **Docker Version**: 20.10+ (testcontainers requirement)
- **OS**: Linux, macOS, Windows (with Docker Desktop)

## Future Enhancements

1. **Template Databases**: Pre-migrated template for faster test setup
2. **Connection Pooling**: Shared pool with per-test schemas
3. **Snapshot/Restore**: Fast database state snapshots
4. **Parallel Migrations**: Run independent migrations concurrently
5. **Custom Docker Images**: Support for custom PostgreSQL extensions
