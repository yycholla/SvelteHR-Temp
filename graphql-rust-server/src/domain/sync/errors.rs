//! Domain errors for the sync module.
//!
//! This module contains domain-specific error types for sync operations.

use std::time::Duration;
use thiserror::Error;

use super::{EntityId, EntityType, QuickBooksId};

/// Validation violation details
#[derive(Debug, Clone)]
pub struct Violation {
    pub field: String,
    pub message: String,
    pub code: String,
}

impl Violation {
    pub fn new(
        field: impl Into<String>,
        message: impl Into<String>,
        code: impl Into<String>,
    ) -> Self {
        Self {
            field: field.into(),
            message: message.into(),
            code: code.into(),
        }
    }

    pub fn required(field: impl Into<String>) -> Self {
        let field_name = field.into();
        Self::new(
            field_name.clone(),
            format!("{} is required", field_name),
            "REQUIRED",
        )
    }

    pub fn invalid_format(field: impl Into<String>, expected: impl Into<String>) -> Self {
        let field_name = field.into();
        Self::new(
            field_name.clone(),
            format!(
                "{} has invalid format, expected: {}",
                field_name,
                expected.into()
            ),
            "INVALID_FORMAT",
        )
    }
}

/// Domain errors for sync operations
#[derive(Debug, Clone, Error)]
pub enum SyncError {
    #[error("Authentication token expired for realm {realm_id}")]
    TokenExpired { realm_id: String },

    #[error("Rate limited by QuickBooks API, retry after {retry_after:?}")]
    RateLimited { retry_after: Duration },

    #[error("Validation failed for entity {entity_id}: {message}")]
    ValidationFailed {
        entity_id: String,
        message: String,
        violations: Vec<Violation>,
    },

    #[error("Conflict detected for {entity_type} entity")]
    ConflictDetected {
        entity_type: EntityType,
        local_id: Option<EntityId>,
        remote_id: Option<QuickBooksId>,
    },

    #[error("Entity not found: {entity_type} with id {id}")]
    EntityNotFound { entity_type: EntityType, id: String },

    #[error("QuickBooks API error [{code}]: {message}")]
    QuickBooksApiError {
        code: String,
        message: String,
        retryable: bool,
    },

    #[error("Repository error: {message}")]
    RepositoryError { message: String },

    #[error("Invalid webhook signature")]
    InvalidWebhookSignature,

    #[error("Webhook payload parse error: {message}")]
    WebhookParseError { message: String },

    #[error("Internal error: {message}")]
    Internal { message: String },
}

impl SyncError {
    /// Check if this error is retryable
    pub fn is_retryable(&self) -> bool {
        match self {
            SyncError::RateLimited { .. } => true,
            SyncError::QuickBooksApiError { retryable, .. } => *retryable,
            SyncError::TokenExpired { .. } => false, // Requires re-auth
            SyncError::ValidationFailed { .. } => false,
            SyncError::ConflictDetected { .. } => false, // Requires resolution
            SyncError::EntityNotFound { .. } => false,
            SyncError::RepositoryError { .. } => true, // Might be transient
            SyncError::InvalidWebhookSignature => false,
            SyncError::WebhookParseError { .. } => false,
            SyncError::Internal { .. } => false,
        }
    }

    /// Get error code for API responses
    pub fn error_code(&self) -> &'static str {
        match self {
            SyncError::TokenExpired { .. } => "TOKEN_EXPIRED",
            SyncError::RateLimited { .. } => "RATE_LIMITED",
            SyncError::ValidationFailed { .. } => "VALIDATION_FAILED",
            SyncError::ConflictDetected { .. } => "CONFLICT_DETECTED",
            SyncError::EntityNotFound { .. } => "ENTITY_NOT_FOUND",
            SyncError::QuickBooksApiError { .. } => "QUICKBOOKS_API_ERROR",
            SyncError::RepositoryError { .. } => "REPOSITORY_ERROR",
            SyncError::InvalidWebhookSignature => "INVALID_SIGNATURE",
            SyncError::WebhookParseError { .. } => "WEBHOOK_PARSE_ERROR",
            SyncError::Internal { .. } => "INTERNAL_ERROR",
        }
    }

    /// Create a validation error with violations
    pub fn validation(entity_id: impl Into<String>, violations: Vec<Violation>) -> Self {
        let violations_summary: Vec<String> =
            violations.iter().map(|v| v.message.clone()).collect();
        SyncError::ValidationFailed {
            entity_id: entity_id.into(),
            message: violations_summary.join("; "),
            violations,
        }
    }

    /// Create a QuickBooks API error
    pub fn quickbooks_api(
        code: impl Into<String>,
        message: impl Into<String>,
        retryable: bool,
    ) -> Self {
        SyncError::QuickBooksApiError {
            code: code.into(),
            message: message.into(),
            retryable,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rate_limited_is_retryable() {
        let err = SyncError::RateLimited {
            retry_after: Duration::from_secs(60),
        };
        assert!(err.is_retryable());
    }

    #[test]
    fn token_expired_not_retryable() {
        let err = SyncError::TokenExpired {
            realm_id: "123".to_string(),
        };
        assert!(!err.is_retryable());
    }

    #[test]
    fn validation_error_has_correct_code() {
        let err = SyncError::validation("emp-1", vec![Violation::required("email")]);
        assert_eq!(err.error_code(), "VALIDATION_FAILED");
    }

    #[test]
    fn violation_required_helper() {
        let v = Violation::required("email");
        assert_eq!(v.field, "email");
        assert_eq!(v.code, "REQUIRED");
        assert!(v.message.contains("required"));
    }

    #[test]
    fn quickbooks_api_error_retryable_flag() {
        let retryable = SyncError::quickbooks_api("500", "Server error", true);
        assert!(retryable.is_retryable());

        let not_retryable = SyncError::quickbooks_api("400", "Bad request", false);
        assert!(!not_retryable.is_retryable());
    }
}
