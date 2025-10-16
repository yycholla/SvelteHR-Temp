//! Database connection and utilities

use async_graphql::Context;
use sea_orm::{Database, DatabaseConnection, DbErr};
use std::sync::Arc;

/// Create a database connection
pub async fn create_db_connection(database_url: &str) -> Result<DatabaseConnection, DbErr> {
    Database::connect(database_url).await
}

/// Get database connection from GraphQL context
pub fn get_db_from_context(ctx: &async_graphql::Context<'_>) -> Result<DatabaseConnection, String> {
    ctx.data::<DatabaseConnection>()
        .cloned()
        .map_err(|_| "Database connection not available in context".to_string())
}