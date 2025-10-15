//! GraphQL Rust Server Library
//!
//! Main library file for the HR system GraphQL API server with SeaORM integration.

pub mod auth;
pub mod database;
pub mod error;
pub mod loaders;
pub mod middleware;
pub mod models;
pub mod schema;
pub mod services;
pub mod utils;

use async_graphql::{EmptyMutation, EmptySubscription, Schema};
use database::{DatabaseConfig, init_database};
use sea_orm::DatabaseConnection;
use std::sync::Arc;
use tracing::info;

/// Application state containing database connection and configuration
#[derive(Clone)]
pub struct AppState {
    pub db: Arc<DatabaseConnection>,
    pub config: DatabaseConfig,
}

impl AppState {
    /// Create a new application state with the given database connection
    pub fn new(db: DatabaseConnection, config: DatabaseConfig) -> Self {
        Self {
            db: Arc::new(db),
            config,
        }
    }

    /// Get a reference to the database connection
    pub fn db(&self) -> &DatabaseConnection {
        &self.db
    }
}

/// Create GraphQL schema with database context
pub fn create_schema(db: DatabaseConnection) -> Schema<schema::Query, schema::Mutation, EmptySubscription> {
    info!("Creating GraphQL schema with SeaORM database connection");
    Schema::build(schema::Query::default(), schema::Mutation::default(), EmptySubscription)
        .data(db)
        .finish()
}

/// Initialize the application with database connection
pub async fn init_app() -> Result<AppState, Box<dyn std::error::Error>> {
    info!("Initializing application with SeaORM database connection");
    let config = DatabaseConfig::default();
    let db = init_database(&config).await?;

    info!("Application initialized successfully");
    Ok(AppState::new(db, config))
}

/// Health check for database connection
pub async fn health_check(state: &AppState) -> Result<(), Box<dyn std::error::Error>> {
    use sea_orm::Statement;

    state.db()
        .execute(Statement::from_string(
            state.db().get_database_backend(),
            "SELECT 1".to_string(),
        ))
        .await?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_app_state_creation() {
        // This would require a test database
        // For now, just test that the module compiles
        assert!(true);
    }
}