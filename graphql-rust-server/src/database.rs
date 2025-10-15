//! Database connection management with SeaORM
//!
//! This module provides database connection setup with proper error handling
//! and configuration management following Rust best practices.

use async_graphql::Error as GqlError;
use sea_orm::{Database, DatabaseConnection, ConnectOptions, DbErr, ConnectionTrait};
use std::time::Duration;
use tracing::info;

/// Database configuration with builder pattern
#[derive(Debug, Clone)]
pub struct DatabaseConfig {
    url: String,
    max_connections: u32,
    min_connections: u32,
    connect_timeout: Duration,
    idle_timeout: Duration,
    max_lifetime: Duration,
}

impl DatabaseConfig {
    /// Create a new database configuration builder
    pub fn builder() -> DatabaseConfigBuilder {
        DatabaseConfigBuilder::default()
    }
    
    /// Get the database URL
    pub fn url(&self) -> &str {
        &self.url
    }
}

impl Default for DatabaseConfig {
    fn default() -> Self {
        Self {
            url: std::env::var("DATABASE_URL")
                .unwrap_or_else(|_| "postgresql://postgres:postgres123@localhost:5433/hr_system".to_string()),
            max_connections: 100,
            min_connections: 5,
            connect_timeout: Duration::from_secs(10),
            idle_timeout: Duration::from_secs(300),
            max_lifetime: Duration::from_secs(3600),
        }
    }
}

/// Builder for DatabaseConfig following Rust builder pattern
#[derive(Default)]
pub struct DatabaseConfigBuilder {
    url: Option<String>,
    max_connections: Option<u32>,
    min_connections: Option<u32>,
    connect_timeout: Option<Duration>,
    idle_timeout: Option<Duration>,
    max_lifetime: Option<Duration>,
}

impl DatabaseConfigBuilder {
    pub fn url(mut self, url: String) -> Self {
        self.url = Some(url);
        self
    }

    pub fn max_connections(mut self, max: u32) -> Self {
        self.max_connections = Some(max);
        self
    }

    pub fn min_connections(mut self, min: u32) -> Self {
        self.min_connections = Some(min);
        self
    }

    pub fn connect_timeout(mut self, timeout: Duration) -> Self {
        self.connect_timeout = Some(timeout);
        self
    }

    pub fn build(self) -> DatabaseConfig {
        let defaults = DatabaseConfig::default();
        DatabaseConfig {
            url: self.url.unwrap_or(defaults.url),
            max_connections: self.max_connections.unwrap_or(defaults.max_connections),
            min_connections: self.min_connections.unwrap_or(defaults.min_connections),
            connect_timeout: self.connect_timeout.unwrap_or(defaults.connect_timeout),
            idle_timeout: self.idle_timeout.unwrap_or(defaults.idle_timeout),
            max_lifetime: self.max_lifetime.unwrap_or(defaults.max_lifetime),
        }
    }
}

/// Initialize SeaORM database connection with proper error handling
pub async fn init_database(config: &DatabaseConfig) -> Result<DatabaseConnection, DbErr> {
    info!("Initializing SeaORM connection to database");

    let mut opt = ConnectOptions::new(config.url.clone());
    opt.max_connections(config.max_connections)
        .min_connections(config.min_connections)
        .connect_timeout(config.connect_timeout)
        .idle_timeout(config.idle_timeout)
        .max_lifetime(config.max_lifetime)
        .sqlx_logging(true);

    let db = Database::connect(opt).await?;

    // Verify connection with health check
    db.execute(sea_orm::Statement::from_string(
        db.get_database_backend(),
        "SELECT 1".to_string(),
    ))
    .await?;

    info!("SeaORM connection established successfully");
    Ok(db)
}

/// Extract SeaORM connection from GraphQL context
///
/// This function provides type-safe extraction of the database connection
/// from the async-graphql context with proper error handling.
pub fn get_db_from_context<'a>(
    ctx: &'a async_graphql::Context<'_>
) -> Result<&'a DatabaseConnection, GqlError> {
    ctx.data::<DatabaseConnection>()
        .map_err(|_| GqlError::new("Database connection not available in context"))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_database_config_builder() {
        let config = DatabaseConfig::builder()
            .max_connections(50)
            .min_connections(10)
            .build();
        
        assert_eq!(config.max_connections, 50);
        assert_eq!(config.min_connections, 10);
    }

    #[test]
    fn test_database_config_default() {
        let config = DatabaseConfig::default();
        assert_eq!(config.max_connections, 100);
        assert_eq!(config.min_connections, 5);
        assert!(!config.url.is_empty());
    }

    #[tokio::test]
    async fn test_connection_initialization() {
        // This would require a test database
        // Placeholder for integration tests
        let config = DatabaseConfig::default();
        assert!(!config.url().is_empty());
    }
}
