//! QuickBooks Sync Rollback Mutations
//!
//! Provides GraphQL mutations for QuickBooks sync rollback operations

use crate::auth::UserContext;
use crate::database::get_db_from_context;
use crate::services::{ExecuteRollbackInput, PermissionChecker, RollbackService, SyncPermission};
use async_graphql::{Context, Object, Result};
use uuid::Uuid;

#[derive(Default)]
pub struct SyncRollbackMutations;

#[Object]
impl SyncRollbackMutations {
    /// Execute a rollback operation for a QuickBooks sync
    async fn execute_rollback(
        &self,
        ctx: &Context<'_>,
        snapshot_id: String,
        rollback_type: String,
        reason: String,
    ) -> Result<RollbackOperationResult> {
        let db = get_db_from_context(ctx)?;
        let user_ctx = ctx.data::<UserContext>()?;

        // Check permissions - rollback requires high-level integration management permission
        let permission_checker = PermissionChecker::new(db.clone());
        permission_checker
            .require(user_ctx, SyncPermission::ManageIntegrations)
            .await?;

        // Parse snapshot ID
        let snapshot_id =
            Uuid::parse_str(&snapshot_id).map_err(|_| "Invalid snapshot ID format")?;

        // Execute rollback
        let service = RollbackService::new(std::sync::Arc::new(db.clone()));
        let input = ExecuteRollbackInput {
            snapshot_id,
            rollback_type,
            reason,
            triggered_by: user_ctx.user_id,
            triggered_by_email: user_ctx
                .email
                .clone()
                .unwrap_or_else(|| "unknown".to_string()),
        };

        let result = service
            .execute_rollback(input)
            .await
            .map_err(|e| async_graphql::Error::new(format!("Rollback execution failed: {}", e)))?;

        Ok(RollbackOperationResult {
            operation_id: result.operation_id.to_string(),
            status: result.status,
            affected_entities: result.affected_entities,
            successful_rollbacks: result.successful_rollbacks,
            failed_rollbacks: result.failed_rollbacks,
            errors: result.errors,
        })
    }

    /// Clean up expired snapshots
    async fn cleanup_expired_snapshots(&self, ctx: &Context<'_>) -> Result<CleanupResult> {
        let db = get_db_from_context(ctx)?;
        let user_ctx = ctx.data::<UserContext>()?;

        // Check permissions - cleanup requires high-level integration management permission
        let permission_checker = PermissionChecker::new(db.clone());
        permission_checker
            .require(user_ctx, SyncPermission::ManageIntegrations)
            .await?;

        let service = RollbackService::new(std::sync::Arc::new(db.clone()));
        let deleted_count = service.cleanup_expired_snapshots().await?;

        Ok(CleanupResult {
            deleted_count: deleted_count as i32,
        })
    }
}

/// Rollback operation result for GraphQL
#[derive(async_graphql::SimpleObject)]
pub struct RollbackOperationResult {
    pub operation_id: String,
    pub status: String,
    pub affected_entities: i32,
    pub successful_rollbacks: i32,
    pub failed_rollbacks: i32,
    pub errors: Vec<String>,
}

/// Cleanup result for GraphQL
#[derive(async_graphql::SimpleObject)]
pub struct CleanupResult {
    pub deleted_count: i32,
}
