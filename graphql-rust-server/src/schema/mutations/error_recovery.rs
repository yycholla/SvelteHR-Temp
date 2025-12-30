//! Error Recovery GraphQL Mutations
//!
//! Provides mutations for:
//! - Manual retry of failed operations
//! - Resolving failed operations
//! - Moving operations to dead letter queue

use async_graphql::{Context, InputObject, Object, Result, SimpleObject};
use chrono::{DateTime, Utc};
use uuid::Uuid;

use crate::auth::UserContext;
use crate::database::get_db_from_context;
use crate::services::permission_checker::{PermissionChecker, SyncPermission};
use crate::services::retry_service::RetryService;

/// Input for resolving a failed operation
#[derive(InputObject)]
pub struct ResolveOperationInput {
    pub operation_id: String,
    pub resolution_notes: String,
}

/// Input for moving operation to dead letter
#[derive(InputObject)]
pub struct MoveToDeadLetterInput {
    pub operation_id: String,
    pub reason: String,
}

/// Result of a retry operation
#[derive(SimpleObject)]
#[allow(dead_code)]
pub struct RetryOperationResult {
    pub operation_id: String,
    pub success: bool,
    pub retry_number: i32,
    pub error_message: Option<String>,
    pub next_retry_at: Option<DateTime<Utc>>,
    pub moved_to_dead_letter: bool,
}

impl From<crate::services::retry_service::RetryResult> for RetryOperationResult {
    fn from(result: crate::services::retry_service::RetryResult) -> Self {
        Self {
            operation_id: result.operation_id.to_string(),
            success: result.success,
            retry_number: result.retry_number,
            error_message: result.error_message,
            next_retry_at: result.next_retry_at,
            moved_to_dead_letter: result.moved_to_dead_letter,
        }
    }
}

/// Success result for operations
#[derive(SimpleObject)]
pub struct OperationSuccess {
    pub success: bool,
    pub message: String,
}

/// Error Recovery Mutations
#[derive(Default)]
pub struct ErrorRecoveryMutations;

#[Object]
impl ErrorRecoveryMutations {
    /// Manually trigger retry for a failed operation
    /// Note: This doesn't execute the actual sync operation - it just schedules it for retry
    async fn retry_operation(
        &self,
        ctx: &Context<'_>,
        operation_id: String,
    ) -> Result<OperationSuccess> {
        let db = get_db_from_context(ctx)?;
        let user_ctx = ctx.data::<UserContext>()?;

        // Check permissions
        let permission_checker = PermissionChecker::new(db.clone());
        permission_checker
            .require(user_ctx, SyncPermission::ManageIntegrations)
            .await?;

        // Parse operation ID
        let operation_id = Uuid::parse_str(&operation_id)
            .map_err(|e| async_graphql::Error::new(format!("Invalid UUID: {}", e)))?;

        // Get the failed operation
        let service = RetryService::new(std::sync::Arc::new(db.clone()));
        let operation = service
            .get_failed_operation(operation_id)
            .await
            .map_err(|e| async_graphql::Error::new(format!("Failed to get operation: {}", e)))?
            .ok_or_else(|| async_graphql::Error::new("Operation not found"))?;

        // Check if operation is retryable
        if !operation.is_retryable {
            return Err(async_graphql::Error::new(
                "Operation is not retryable. Consider resolving it manually.",
            ));
        }

        if operation.moved_to_dead_letter {
            return Err(async_graphql::Error::new(
                "Operation is in dead letter queue. Cannot retry.",
            ));
        }

        // Reset retry status to pending with immediate next retry time
        use sea_orm::{ActiveModelTrait, Set};
        use crate::models::failed_operations;

        let mut active_op: failed_operations::ActiveModel = operation.into();
        active_op.status = Set("pending".to_string());
        active_op.next_retry_at = Set(Some(chrono::Utc::now().into()));
        active_op.updated_at = Set(chrono::Utc::now().into());
        active_op
            .update(&db)
            .await
            .map_err(|e| async_graphql::Error::new(format!("Failed to update operation: {}", e)))?;

        Ok(OperationSuccess {
            success: true,
            message: "Operation scheduled for immediate retry".to_string(),
        })
    }

    /// Manually resolve a failed operation
    async fn resolve_operation(
        &self,
        ctx: &Context<'_>,
        input: ResolveOperationInput,
    ) -> Result<OperationSuccess> {
        let db = get_db_from_context(ctx)?;
        let user_ctx = ctx.data::<UserContext>()?;

        // Check permissions
        let permission_checker = PermissionChecker::new(db.clone());
        permission_checker
            .require(user_ctx, SyncPermission::ManageIntegrations)
            .await?;

        // Parse operation ID
        let operation_id = Uuid::parse_str(&input.operation_id)
            .map_err(|e| async_graphql::Error::new(format!("Invalid UUID: {}", e)))?;

        // Resolve operation
        let service = RetryService::new(std::sync::Arc::new(db.clone()));
        service
            .resolve_operation(operation_id, user_ctx.user_id, input.resolution_notes)
            .await
            .map_err(|e| async_graphql::Error::new(format!("Failed to resolve operation: {}", e)))?;

        Ok(OperationSuccess {
            success: true,
            message: "Operation resolved successfully".to_string(),
        })
    }

    /// Move a failed operation to dead letter queue
    async fn move_to_dead_letter(
        &self,
        ctx: &Context<'_>,
        input: MoveToDeadLetterInput,
    ) -> Result<OperationSuccess> {
        let db = get_db_from_context(ctx)?;
        let user_ctx = ctx.data::<UserContext>()?;

        // Check permissions
        let permission_checker = PermissionChecker::new(db.clone());
        permission_checker
            .require(user_ctx, SyncPermission::ManageIntegrations)
            .await?;

        // Parse operation ID
        let operation_id = Uuid::parse_str(&input.operation_id)
            .map_err(|e| async_graphql::Error::new(format!("Invalid UUID: {}", e)))?;

        // Move to dead letter
        let service = RetryService::new(std::sync::Arc::new(db.clone()));
        service
            .move_to_dead_letter(operation_id, input.reason)
            .await
            .map_err(|e| {
                async_graphql::Error::new(format!("Failed to move to dead letter: {}", e))
            })?;

        Ok(OperationSuccess {
            success: true,
            message: "Operation moved to dead letter queue".to_string(),
        })
    }
}
