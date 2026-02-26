//! Error handling and logging for SeaORM integration
//!
//! This module provides comprehensive error handling for database operations,
//! GraphQL resolvers, and application-level errors.

use async_graphql::{Error, ErrorExtensions};
use sea_orm::DbErr;
use serde::{Deserialize, Serialize};
use std::fmt;
use tracing::{error, info, warn};

use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};

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
    SessionExpired,
    AccountLocked,
    RateLimited,
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, error_message) = match self {
            AppError::Database(db_err) => match db_err {
                DbError::Connection(_) => (
                    StatusCode::SERVICE_UNAVAILABLE,
                    "Database connection error".to_string(),
                ),
                DbError::Constraint(msg) => (StatusCode::CONFLICT, msg),
                _ => (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "Database error".to_string(),
                ),
            },
            AppError::Authentication(msg) => (StatusCode::UNAUTHORIZED, msg),
            AppError::Authorization(msg) => (StatusCode::FORBIDDEN, msg),
            AppError::Validation(msg) => (StatusCode::BAD_REQUEST, msg),
            AppError::NotFound(msg) => (StatusCode::NOT_FOUND, msg),
            AppError::Conflict(msg) => (StatusCode::CONFLICT, msg),
            AppError::Internal(msg) => (StatusCode::INTERNAL_SERVER_ERROR, msg),
            AppError::SessionExpired => (StatusCode::UNAUTHORIZED, "Session expired".to_string()),
            AppError::AccountLocked => (StatusCode::FORBIDDEN, "Account locked".to_string()),
            AppError::RateLimited => (
                StatusCode::TOO_MANY_REQUESTS,
                "Rate limit exceeded".to_string(),
            ),
        };

        let body = Json(serde_json::json!({
            "error": error_message,
        }));

        (status, body).into_response()
    }
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
            AppError::SessionExpired => write!(f, "Session expired"),
            AppError::AccountLocked => write!(f, "Account temporarily locked"),
            AppError::RateLimited => write!(f, "Too many requests"),
        }
    }
}

impl std::error::Error for AppError {}

/// Error codes for GraphQL extensions
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ErrorCode {
    /// Authentication required
    Unauthenticated,
    /// Insufficient permissions
    Forbidden,
    /// Invalid input data
    BadUserInput,
    /// Resource not found
    NotFound,
    /// Resource already exists
    Conflict,
    /// Internal server error
    InternalError,
    /// Service temporarily unavailable
    ServiceUnavailable,
    /// Rate limit exceeded
    RateLimited,
}

impl ErrorCode {
    /// Get the string representation of the error code
    pub fn as_str(&self) -> &'static str {
        match self {
            ErrorCode::Unauthenticated => "UNAUTHENTICATED",
            ErrorCode::Forbidden => "FORBIDDEN",
            ErrorCode::BadUserInput => "BAD_USER_INPUT",
            ErrorCode::NotFound => "NOT_FOUND",
            ErrorCode::Conflict => "CONFLICT",
            ErrorCode::InternalError => "INTERNAL_ERROR",
            ErrorCode::ServiceUnavailable => "SERVICE_UNAVAILABLE",
            ErrorCode::RateLimited => "RATE_LIMITED",
        }
    }
}

/// Implement ErrorExtensions for AppError to provide GraphQL error extensions
impl ErrorExtensions for AppError {
    fn extend(&self) -> Error {
        let (code, user_message, debug_message) = match self {
            AppError::Authentication(msg) => (
                ErrorCode::Unauthenticated,
                "Authentication required. Please log in to continue.".to_string(),
                sanitize_error_message(msg),
            ),
            AppError::Authorization(msg) => (
                ErrorCode::Forbidden,
                "You don't have permission to perform this action.".to_string(),
                sanitize_error_message(msg),
            ),
            AppError::Validation(msg) => (
                ErrorCode::BadUserInput,
                "The provided data is invalid. Please check your input and try again.".to_string(),
                sanitize_error_message(msg),
            ),
            AppError::NotFound(msg) => (
                ErrorCode::NotFound,
                "The requested resource was not found.".to_string(),
                sanitize_error_message(msg),
            ),
            AppError::Conflict(msg) => (
                ErrorCode::Conflict,
                "This action would create a conflict. Please try again.".to_string(),
                sanitize_error_message(msg),
            ),
            AppError::Database(db_err) => match db_err {
                DbError::Connection(_) => (
                    ErrorCode::ServiceUnavailable,
                    "Service temporarily unavailable. Please try again later.".to_string(),
                    "Database connection error".to_string(), // Don't leak connection details
                ),
                DbError::Constraint(msg) if msg.contains("Duplicate") => (
                    ErrorCode::Conflict,
                    "This item already exists.".to_string(),
                    "Duplicate constraint violation".to_string(), // Don't leak constraint details
                ),
                _ => (
                    ErrorCode::InternalError,
                    "An unexpected error occurred. Please try again.".to_string(),
                    "Database operation failed".to_string(), // Don't leak internal DB errors
                ),
            },
            AppError::Internal(msg) => (
                ErrorCode::InternalError,
                "An unexpected error occurred. Please try again.".to_string(),
                sanitize_error_message(msg),
            ),
            AppError::SessionExpired => (
                ErrorCode::Unauthenticated,
                "Your session has expired. Please log in again.".to_string(),
                "Session expired".to_string(),
            ),
            AppError::AccountLocked => (
                ErrorCode::Forbidden,
                "Your account has been temporarily locked. Please contact support.".to_string(),
                "Account locked".to_string(),
            ),
            AppError::RateLimited => (
                ErrorCode::RateLimited,
                "Too many requests. Please wait a moment before trying again.".to_string(),
                "Rate limit exceeded".to_string(),
            ),
        };

        let mut error = Error::new(user_message)
            .extend_with(|_, e| e.set("code", code.as_str()))
            .extend_with(|_, e| e.set("timestamp", chrono::Utc::now().to_rfc3339()));

        // Only include debug info in development mode
        if std::env::var("RUST_ENV").unwrap_or_default() == "development" {
            error = error.extend_with(|_, e| e.set("debug", debug_message));
        }

        error
    }
}

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
                    AppError::Database(DbError::Constraint(
                        "Foreign key constraint violation".to_string(),
                    ))
                } else {
                    AppError::Database(DbError::Query(msg))
                }
            }
            DbErr::RecordNotFound(_) => AppError::NotFound("Record not found".to_string()),
            _ => AppError::Database(DbError::Query(err.to_string())),
        }
    }
}

/// Result type alias for application operations
pub type AppResult<T> = Result<T, AppError>;

/// Sanitize error messages to prevent information leakage
fn sanitize_error_message(msg: &str) -> String {
    // Remove potentially sensitive information from error messages
    let sensitive_patterns = [
        r"password.*",
        r"token.*",
        r"key.*",
        r"secret.*",
        r"connection.*",
        r"database.*",
        r"sql.*",
        r"query.*",
        r"stack.*",
        r"trace.*",
        r"\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b", // IP addresses
        r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b", // Email addresses
    ];

    let mut sanitized = msg.to_string();
    for pattern in &sensitive_patterns {
        if let Ok(regex) = regex::Regex::new(&format!(r"(?i){}", pattern)) {
            sanitized = regex.replace_all(&sanitized, "[REDACTED]").to_string();
        }
    }

    // Limit error message length to prevent extremely long messages
    if sanitized.len() > 500 {
        sanitized.truncate(500);
        sanitized.push_str("... [truncated]");
    }

    sanitized
}

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
        assert_eq!(
            auth_error.to_string(),
            "Authentication error: Invalid token"
        );
    }

    #[test]
    fn test_db_error_conversion() {
        let db_err = DbErr::Custom("duplicate key value violates unique constraint".to_string());
        let app_err: AppError = db_err.into();
        match app_err {
            AppError::Database(DbError::Constraint(_)) => {}
            _ => panic!("Expected constraint error"),
        }
    }
}
