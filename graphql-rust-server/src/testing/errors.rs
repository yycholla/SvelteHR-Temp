//! Error types for testing infrastructure
//!
//! Strongly-typed errors for test database setup, context creation,
//! and GraphQL operation execution.

use thiserror::Error;

/// Errors that can occur during test database setup
#[derive(Debug, Error)]
pub enum TestDatabaseError {
    #[error("Failed to start Docker container: {0}")]
    ContainerStartFailed(String),

    #[error("Failed to run migrations: {0}")]
    MigrationFailed(sea_orm::DbErr),

    #[error("Failed to connect to database: {0}")]
    ConnectionFailed(String),

    #[error("Database name generation failed: {0}")]
    NameGenerationFailed(String),

    #[error("Database error: {0}")]
    DatabaseError(#[from] sea_orm::DbErr),
}

/// Errors that can occur during test context setup
#[derive(Debug, Error)]
pub enum TestContextError {
    #[error("Database setup failed: {0}")]
    DatabaseError(#[from] TestDatabaseError),

    #[error("Failed to create test session: {0}")]
    SessionError(String),

    #[error("GraphQL schema creation failed: {0}")]
    SchemaError(String),

    #[error("HTTP client creation failed: {0}")]
    ClientError(String),
}

/// Errors that can occur during GraphQL operations in tests
#[derive(Debug, Error)]
pub enum GraphQLError {
    #[error("GraphQL syntax error: {0}")]
    SyntaxError(String),

    #[error("GraphQL execution error: {0}")]
    ExecutionError(String),

    #[error("HTTP request failed: {0}")]
    RequestError(#[from] reqwest::Error),

    #[error("Response deserialization failed: {0}")]
    DeserializationError(#[from] serde_json::Error),

    #[error("Authentication failed: {0}")]
    AuthenticationError(String),

    #[error("Authorization failed: {0}")]
    AuthorizationError(String),
}

/// Errors that can occur during load tests
#[derive(Debug, Error)]
pub enum LoadTestError {
    #[error("HTTP request failed: {0}")]
    RequestFailed(#[from] reqwest::Error),

    #[error("GraphQL error in operation '{operation}': {error}")]
    GraphQLError { operation: String, error: String },

    #[error("Configuration validation failed: {0}")]
    ConfigError(String),

    #[error("Metrics collection failed: {0}")]
    MetricsError(String),

    #[error("Load test timeout after {0:?}")]
    Timeout(std::time::Duration),

    #[error("Failed to create test session: {0}")]
    AuthError(String),
}
