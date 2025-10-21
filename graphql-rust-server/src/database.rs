//! Database connection and utilities

use async_graphql::Context;
use sea_orm::{ConnectOptions, Database, DatabaseConnection, DbErr};
use std::time::Duration;

/// Create a database connection with connection pooling
pub async fn create_db_connection(database_url: &str) -> Result<DatabaseConnection, DbErr> {
    // Configure connection options for optimal performance
    let mut opt = ConnectOptions::new(database_url.to_string());
    opt.max_connections(100)
        .min_connections(5)
        .connect_timeout(Duration::from_secs(8))
        .acquire_timeout(Duration::from_secs(8))
        .idle_timeout(Duration::from_secs(300)) // 5 minutes
        .max_lifetime(Duration::from_secs(1800)) // 30 minutes
        .sqlx_logging(false); // Disable sqlx logging (using RUST_LOG instead)

    let db = Database::connect(opt).await?;

    // Note: search_path is set at database level via:
    // ALTER DATABASE hr_system SET search_path TO hr_public, public

    Ok(db)
}

/// Get database connection from GraphQL context
pub fn get_db_from_context(ctx: &async_graphql::Context<'_>) -> Result<DatabaseConnection, String> {
    ctx.data::<DatabaseConnection>()
        .cloned()
        .map_err(|_| "Database connection not available in context".to_string())
}