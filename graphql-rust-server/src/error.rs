//! Error handling and logging for SeaORM integration
//!
//! This module provides comprehensive error handling for database operations,
//! GraphQL resolvers, and application-level errors.

use async_graphql::{Error as GraphQLError, ErrorExtensions};
use sea_orm::{DbErr, RuntimeErr};
use serde::{Deserialize, Serialize};
use std::fmt;
use tracing::{error, warn, info};

/// Application error types
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AppError {
    Database(DbError),
    Authentication(String),
    Authorization(String),
    Validation(String),
    NotFound(String),
    Conflict(String),
    Internal(String),
}

impl fmt::Display for AppError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            AppError::Database(err) => write!(f, "Database error: {}", err),
            AppError::Authentication(msg) => write!(f, "Authentication error: {}", msg),
            AppError::Authorization(msg) => write!(f, "Authorization error: {}", msg),
            AppError::Validation(msg) => write!(f, "Validation error: {}", msg),
            AppError::NotFound(msg) => write!(f, "Not found: {}", msg),
            AppError::Conflict(msg) => write!(f, "Conflict: {}", msg),
            AppError::Internal(msg) => write!(f, "Internal error: {}", msg),
        }
    }
}

impl std::error::Error for AppError {}

/// Database-specific errors
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum DbError {
    Connection(String),
    Query(String),
    Transaction(String),
    Constraint(String),
    Migration(String),
}

impl fmt::Display for DbError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            DbError::Connection(msg) => write!(f, "Connection error: {}", msg),
            DbError::Query(msg) => write!(f, "Query error: {}", msg),
            DbError::Transaction(msg) => write!(f, "Transaction error: {}", msg),
            DbError::Constraint(msg) => write!(f, "Constraint error: {}", msg),
            DbError::Migration(msg) => write!(f, "Migration error: {}", msg),
        }
    }
}

/// Convert SeaORM errors to application errors
impl From<DbErr> for AppError {
    fn from(err: DbErr) -> Self {
        error!("Database error occurred: {:?}", err);

        match err {
            DbErr::ConnectionAcquire(_) => AppError::Database(DbError::Connection(err.to_string())),
            DbErr::Custom(msg) => {
                if msg.contains("duplicate key") {
                    AppError::Database(DbError::Constraint("Duplicate entry".to_string()))
                } else if msg.contains("foreign key") {
                    AppError::Database(DbError::Constraint("Foreign key constraint violation".to_string()))
                } else {
                    AppError::Database(DbError::Query(msg))
                }
            }
            DbErr::RecordNotFound(_) => AppError::NotFound("Record not found".to_string()),
            _ => AppError::Database(DbError::Query(err.to_string())),
        }
    }
}

/// Convert application errors to GraphQL errors
impl From<AppError> for GraphQLError {
    fn from(err: AppError) -> Self {
        let message = err.to_string();

        match err {
            AppError::NotFound(_) => GraphQLError::new(message).extend_with(|_, e| e.set("code", "NOT_FOUND")),
            AppError::Validation(_) => GraphQLError::new(message).extend_with(|_, e| e.set("code", "VALIDATION_ERROR")),
            AppError::Authentication(_) => GraphQLError::new(message).extend_with(|_, e| e.set("code", "UNAUTHORIZED")),
            AppError::Authorization(_) => GraphQLError::new(message).extend_with(|_, e| e.set("code", "FORBIDDEN")),
            AppError::Conflict(_) => GraphQLError::new(message).extend_with(|_, e| e.set("code", "CONFLICT")),
            AppError::Database(_) => GraphQLError::new("Database error occurred").extend_with(|_, e| e.set("code", "DATABASE_ERROR")),
            AppError::Internal(_) => GraphQLError::new("Internal server error").extend_with(|_, e| e.set("code", "INTERNAL_ERROR")),
        }
    }
}

/// Result type alias for application operations
pub type AppResult<T> = Result<T, AppError>;

/// Log and handle database errors
pub fn handle_db_error(err: DbErr, operation: &str) -> AppError {
    error!("Database error during {}: {:?}", operation, err);
    err.into()
}

/// Log and handle authentication errors
pub fn handle_auth_error(msg: &str) -> AppError {
    warn!("Authentication error: {}", msg);
    AppError::Authentication(msg.to_string())
}

/// Log and handle authorization errors
pub fn handle_authz_error(msg: &str) -> AppError {
    warn!("Authorization error: {}", msg);
    AppError::Authorization(msg.to_string())
}

/// Log and handle validation errors
pub fn handle_validation_error(msg: &str) -> AppError {
    info!("Validation error: {}", msg);
    AppError::Validation(msg.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_app_error_display() {
        let auth_error = AppError::Authentication("Invalid token".to_string());
        assert_eq!(auth_error.to_string(), "Authentication error: Invalid token");
    }

    #[test]
    fn test_db_error_conversion() {
        let db_err = DbErr::Custom("duplicate key value violates unique constraint".to_string());
        let app_err: AppError = db_err.into();
        match app_err {
            AppError::Database(DbError::Constraint(_)) => {},
            _ => panic!("Expected constraint error"),
        }
    }
}