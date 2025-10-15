//! Database configuration and connection management for SeaORM
//!
//! This module provides SeaORM database connection setup and configuration
//! for the HR system migration from sqlx.

use sea_orm::{Database, DatabaseConnection, ConnectOptions, DbErr};
use std::time::Duration;
use tracing::{info, error};

/// Database configuration structure
#[derive(Debug, Clone)]
pub struct DatabaseConfig {
    pub url: String,
    pub max_connections: u32,
    pub min_connections: u32,
    pub connect_timeout: Duration,
    pub idle_timeout: Duration,
    pub max_lifetime: Duration,
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

/// Create and configure database connection
pub async fn create_database_connection(config: &DatabaseConfig) -> Result<DatabaseConnection, DbErr> {
    info!("Connecting to database at: {}", config.url);

    let mut opt = ConnectOptions::new(config.url.clone());
    opt.max_connections(config.max_connections)
        .min_connections(config.min_connections)
        .connect_timeout(config.connect_timeout)
        .idle_timeout(config.idle_timeout)
        .max_lifetime(config.max_lifetime)
        .sqlx_logging(true)
        .sqlx_logging_level(log::LevelFilter::Info);

    let db = Database::connect(opt).await?;

    info!("Database connection established successfully");

    // Test the connection
    let _: Option<()> = db
        .execute(sea_orm::Statement::from_string(
            db.get_database_backend(),
            "SELECT 1".to_string(),
        ))
        .await?;

    Ok(db)
}

/// Get database connection from application state
pub async fn get_db_from_context(ctx: &async_graphql::Context<'_>) -> Result<&DatabaseConnection, async_graphql::Error> {
    ctx.data::<DatabaseConnection>()
        .map_err(|_| async_graphql::Error::new("Database connection not found in context"))
}

/// Initialize database connection for the application
pub async fn init_database() -> Result<DatabaseConnection, DbErr> {
    let config = DatabaseConfig::default();
    create_database_connection(&config).await
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_database_config_default() {
        let config = DatabaseConfig::default();
        assert_eq!(config.max_connections, 100);
        assert_eq!(config.min_connections, 5);
    }

    #[tokio::test]
    async fn test_database_connection_creation() {
        // This test would require a test database
        // For now, just test that the config can be created
        let config = DatabaseConfig::default();
        assert!(!config.url.is_empty());
    }
}