//! Error Recovery GraphQL Queries
//!
//! Provides queries for:
//! - Failed operation details
//! - Pending retries
//! - Dead letter queue
//! - Retry statistics
//! - Retry history

use async_graphql::{Context, Object, Result, SimpleObject};
use chrono::{DateTime, Utc};
use uuid::Uuid;

use crate::auth::UserContext;
use crate::database::get_db_from_context;
use crate::models::{failed_operations, retry_history};
use crate::services::permission_checker::{PermissionChecker, SyncPermission};
use crate::services::retry_service::RetryService;

/// Failed operation for GraphQL
#[derive(SimpleObject)]
pub struct FailedOperation {
    pub id: String,
    pub sync_log_id: Option<String>,
    pub operation_type: String,
    pub entity_type: String,
    pub entity_id: Option<String>,
    pub quickbooks_id: Option<String>,
    pub error_type: String,
    pub error_code: Option<String>,
    pub error_message: String,
    pub error_details: Option<serde_json::Value>,
    pub retry_count: i32,
    pub max_retries: i32,
    pub next_retry_at: Option<DateTime<Utc>>,
    pub last_retry_at: Option<DateTime<Utc>>,
    pub status: String,
    pub is_retryable: bool,
    pub recovery_strategy: Option<String>,
    pub priority: i32,
    pub moved_to_dead_letter: bool,
    pub dead_letter_reason: Option<String>,
    pub resolved_at: Option<DateTime<Utc>>,
    pub resolved_by: Option<String>,
    pub resolution_notes: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl From<failed_operations::Model> for FailedOperation {
    fn from(model: failed_operations::Model) -> Self {
        Self {
            id: model.id.to_string(),
            sync_log_id: model.sync_log_id.map(|id| id.to_string()),
            operation_type: model.operation_type,
            entity_type: model.entity_type,
            entity_id: model.entity_id.map(|id| id.to_string()),
            quickbooks_id: model.quickbooks_id,
            error_type: model.error_type,
            error_code: model.error_code,
            error_message: model.error_message,
            error_details: model.error_details,
            retry_count: model.retry_count,
            max_retries: model.max_retries,
            next_retry_at: model.next_retry_at.map(|dt| dt.with_timezone(&Utc)),
            last_retry_at: model.last_retry_at.map(|dt| dt.with_timezone(&Utc)),
            status: model.status,
            is_retryable: model.is_retryable,
            recovery_strategy: model.recovery_strategy,
            priority: model.priority,
            moved_to_dead_letter: model.moved_to_dead_letter,
            dead_letter_reason: model.dead_letter_reason,
            resolved_at: model.resolved_at.map(|dt| dt.with_timezone(&Utc)),
            resolved_by: model.resolved_by.map(|id| id.to_string()),
            resolution_notes: model.resolution_notes,
            created_at: model.created_at.with_timezone(&Utc),
            updated_at: model.updated_at.with_timezone(&Utc),
        }
    }
}

/// Retry history entry for GraphQL
#[derive(SimpleObject)]
pub struct RetryHistoryEntry {
    pub id: String,
    pub failed_operation_id: String,
    pub retry_number: i32,
    pub status: String,
    pub error_message: Option<String>,
    pub error_details: Option<serde_json::Value>,
    pub backoff_duration: Option<i32>,
    pub duration_ms: Option<i32>,
    pub created_at: DateTime<Utc>,
}

impl From<retry_history::Model> for RetryHistoryEntry {
    fn from(model: retry_history::Model) -> Self {
        Self {
            id: model.id.to_string(),
            failed_operation_id: model.failed_operation_id.to_string(),
            retry_number: model.retry_number,
            status: model.status,
            error_message: model.error_message,
            error_details: model.error_details,
            backoff_duration: model.backoff_duration,
            duration_ms: model.duration_ms,
            created_at: model.created_at.with_timezone(&Utc),
        }
    }
}

/// Retry statistics for GraphQL
#[derive(SimpleObject)]
pub struct RetryStats {
    pub total_failed_operations: i64,
    pub pending_retries: i64,
    pub currently_retrying: i64,
    pub succeeded_operations: i64,
    pub dead_letter_operations: i64,
    pub average_retry_count: f64,
}

impl From<crate::services::retry_service::RetryStatistics> for RetryStats {
    fn from(stats: crate::services::retry_service::RetryStatistics) -> Self {
        Self {
            total_failed_operations: stats.total_failed_operations as i64,
            pending_retries: stats.pending_retries as i64,
            currently_retrying: stats.currently_retrying as i64,
            succeeded_operations: stats.succeeded_operations as i64,
            dead_letter_operations: stats.dead_letter_operations as i64,
            average_retry_count: stats.average_retry_count,
        }
    }
}

/// Error Recovery Queries
#[derive(Default)]
pub struct ErrorRecoveryQueries;

#[Object]
impl ErrorRecoveryQueries {
    /// Get a specific failed operation by ID
    async fn failed_operation(
        &self,
        ctx: &Context<'_>,
        operation_id: String,
    ) -> Result<Option<FailedOperation>> {
        let db = get_db_from_context(ctx)?;
        let user_ctx = ctx.data::<UserContext>()?;

        // Check permissions
        let permission_checker = PermissionChecker::new(db.clone());
        permission_checker
            .require(user_ctx, SyncPermission::ViewSyncHistory)
            .await?;

        // Get operation
        let service = RetryService::new(std::sync::Arc::new(db.clone()));
        let operation_id = Uuid::parse_str(&operation_id)
            .map_err(|e| async_graphql::Error::new(format!("Invalid UUID: {}", e)))?;

        let operation = service
            .get_failed_operation(operation_id)
            .await
            .map_err(|e| async_graphql::Error::new(format!("Failed to get operation: {}", e)))?;

        Ok(operation.map(|op| op.into()))
    }

    /// Get operations pending retry
    async fn pending_retries(
        &self,
        ctx: &Context<'_>,
        limit: Option<i32>,
    ) -> Result<Vec<FailedOperation>> {
        let db = get_db_from_context(ctx)?;
        let user_ctx = ctx.data::<UserContext>()?;

        // Check permissions
        let permission_checker = PermissionChecker::new(db.clone());
        permission_checker
            .require(user_ctx, SyncPermission::ViewSyncHistory)
            .await?;

        // Get pending retries
        let service = RetryService::new(std::sync::Arc::new(db.clone()));
        let operations = service
            .get_operations_for_retry(limit)
            .await
            .map_err(|e| {
                async_graphql::Error::new(format!("Failed to get pending retries: {}", e))
            })?;

        Ok(operations.into_iter().map(|op| op.into()).collect())
    }

    /// Get dead letter queue operations
    async fn dead_letter_queue(
        &self,
        ctx: &Context<'_>,
        limit: Option<i32>,
    ) -> Result<Vec<FailedOperation>> {
        let db = get_db_from_context(ctx)?;
        let user_ctx = ctx.data::<UserContext>()?;

        // Check permissions
        let permission_checker = PermissionChecker::new(db.clone());
        permission_checker
            .require(user_ctx, SyncPermission::ViewSyncHistory)
            .await?;

        // Get dead letter operations
        let service = RetryService::new(std::sync::Arc::new(db.clone()));
        let operations = service
            .get_dead_letter_operations(limit)
            .await
            .map_err(|e| {
                async_graphql::Error::new(format!("Failed to get dead letter queue: {}", e))
            })?;

        Ok(operations.into_iter().map(|op| op.into()).collect())
    }

    /// Get retry statistics
    async fn retry_statistics(&self, ctx: &Context<'_>) -> Result<RetryStats> {
        let db = get_db_from_context(ctx)?;
        let user_ctx = ctx.data::<UserContext>()?;

        // Check permissions
        let permission_checker = PermissionChecker::new(db.clone());
        permission_checker
            .require(user_ctx, SyncPermission::ViewSyncHistory)
            .await?;

        // Get statistics
        let service = RetryService::new(std::sync::Arc::new(db.clone()));
        let stats = service
            .get_retry_statistics()
            .await
            .map_err(|e| async_graphql::Error::new(format!("Failed to get statistics: {}", e)))?;

        Ok(stats.into())
    }

    /// Get retry history for a failed operation
    async fn retry_history(
        &self,
        ctx: &Context<'_>,
        operation_id: String,
    ) -> Result<Vec<RetryHistoryEntry>> {
        let db = get_db_from_context(ctx)?;
        let user_ctx = ctx.data::<UserContext>()?;

        // Check permissions
        let permission_checker = PermissionChecker::new(db.clone());
        permission_checker
            .require(user_ctx, SyncPermission::ViewSyncHistory)
            .await?;

        // Get retry history
        let service = RetryService::new(std::sync::Arc::new(db.clone()));
        let operation_id = Uuid::parse_str(&operation_id)
            .map_err(|e| async_graphql::Error::new(format!("Invalid UUID: {}", e)))?;

        let history = service
            .get_retry_history(operation_id)
            .await
            .map_err(|e| async_graphql::Error::new(format!("Failed to get retry history: {}", e)))?;

        Ok(history.into_iter().map(|entry| entry.into()).collect())
    }
}
