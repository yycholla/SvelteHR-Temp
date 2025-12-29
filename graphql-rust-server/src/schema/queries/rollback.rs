//! Rollback Queries
//!
//! GraphQL queries for rollback operations

use crate::context::GraphQLContext;
use crate::models::{rollback_operations, sync_snapshots, UserContext};
use crate::services::{PermissionChecker, RollbackService, RollbackStatistics, SyncPermission};
use async_graphql::{Context, Object, Result};
use uuid::Uuid;

#[derive(Default)]
pub struct RollbackQueries;

#[Object]
impl RollbackQueries {
    /// Get a rollback operation by ID
    async fn rollback_operation(
        &self,
        ctx: &Context<'_>,
        operation_id: String,
    ) -> Result<Option<RollbackOperation>> {
        let gql_ctx = ctx.data::<GraphQLContext>()?;
        let db = &gql_ctx.db;
        let user_ctx = ctx.data::<UserContext>()?;

        // Check permissions
        let permission_checker = PermissionChecker::new(db.clone());
        permission_checker
            .require(user_ctx, SyncPermission::ViewSync)
            .await?;

        let operation_id = Uuid::parse_str(&operation_id)
            .map_err(|_| "Invalid operation ID format")?;

        let service = RollbackService::new(db.clone());
        let operation = service.get_rollback_operation(operation_id).await?;

        Ok(operation.map(|op| RollbackOperation {
            id: op.id.to_string(),
            snapshot_id: op.snapshot_id.to_string(),
            sync_log_id: op.sync_log_id.map(|id| id.to_string()),
            rollback_type: op.rollback_type,
            status: op.status,
            affected_entities: op.affected_entities,
            successful_rollbacks: op.successful_rollbacks,
            failed_rollbacks: op.failed_rollbacks,
            reason: op.reason,
            triggered_by: op.triggered_by.to_string(),
            triggered_by_email: op.triggered_by_email,
            error_message: op.error_message,
            started_at: op.started_at.map(|dt| dt.to_string()),
            completed_at: op.completed_at.map(|dt| dt.to_string()),
            duration_ms: op.duration_ms,
        }))
    }

    /// Get rollback history for a sync log
    async fn rollback_history(
        &self,
        ctx: &Context<'_>,
        sync_log_id: String,
        limit: Option<i32>,
    ) -> Result<Vec<RollbackOperation>> {
        let gql_ctx = ctx.data::<GraphQLContext>()?;
        let db = &gql_ctx.db;
        let user_ctx = ctx.data::<UserContext>()?;

        // Check permissions
        let permission_checker = PermissionChecker::new(db.clone());
        permission_checker
            .require(user_ctx, SyncPermission::ViewSync)
            .await?;

        let sync_log_id = Uuid::parse_str(&sync_log_id)
            .map_err(|_| "Invalid sync log ID format")?;

        let service = RollbackService::new(db.clone());
        let operations = service.get_rollback_history(sync_log_id, limit).await?;

        Ok(operations
            .into_iter()
            .map(|op| RollbackOperation {
                id: op.id.to_string(),
                snapshot_id: op.snapshot_id.to_string(),
                sync_log_id: op.sync_log_id.map(|id| id.to_string()),
                rollback_type: op.rollback_type,
                status: op.status,
                affected_entities: op.affected_entities,
                successful_rollbacks: op.successful_rollbacks,
                failed_rollbacks: op.failed_rollbacks,
                reason: op.reason,
                triggered_by: op.triggered_by.to_string(),
                triggered_by_email: op.triggered_by_email,
                error_message: op.error_message,
                started_at: op.started_at.map(|dt| dt.to_string()),
                completed_at: op.completed_at.map(|dt| dt.to_string()),
                duration_ms: op.duration_ms,
            })
            .collect())
    }

    /// Get snapshots for an entity
    async fn entity_snapshots(
        &self,
        ctx: &Context<'_>,
        entity_type: String,
        entity_id: String,
        limit: Option<i32>,
    ) -> Result<Vec<SyncSnapshot>> {
        let gql_ctx = ctx.data::<GraphQLContext>()?;
        let db = &gql_ctx.db;
        let user_ctx = ctx.data::<UserContext>()?;

        // Check permissions
        let permission_checker = PermissionChecker::new(db.clone());
        permission_checker
            .require(user_ctx, SyncPermission::ViewSync)
            .await?;

        let entity_id = Uuid::parse_str(&entity_id)
            .map_err(|_| "Invalid entity ID format")?;

        let service = RollbackService::new(db.clone());
        let snapshots = service
            .get_entity_snapshots(&entity_type, entity_id, limit)
            .await?;

        Ok(snapshots
            .into_iter()
            .map(|snap| SyncSnapshot {
                id: snap.id.to_string(),
                sync_log_id: snap.sync_log_id.map(|id| id.to_string()),
                entity_type: snap.entity_type,
                entity_id: snap.entity_id.to_string(),
                operation_type: snap.operation_type,
                snapshot_type: snap.snapshot_type,
                quickbooks_id: snap.quickbooks_id,
                can_rollback: snap.can_rollback,
                rollback_reason: snap.rollback_reason,
                expires_at: snap.expires_at.map(|dt| dt.to_string()),
                created_at: snap.created_at.to_string(),
            })
            .collect())
    }

    /// Get rollback statistics
    async fn rollback_statistics(&self, ctx: &Context<'_>) -> Result<RollbackStatsGraphQL> {
        let gql_ctx = ctx.data::<GraphQLContext>()?;
        let db = &gql_ctx.db;
        let user_ctx = ctx.data::<UserContext>()?;

        // Check permissions
        let permission_checker = PermissionChecker::new(db.clone());
        permission_checker
            .require(user_ctx, SyncPermission::ViewSync)
            .await?;

        let service = RollbackService::new(db.clone());
        let stats = service.get_rollback_statistics().await?;

        Ok(RollbackStatsGraphQL {
            total_snapshots: stats.total_snapshots as i32,
            rollbackable_snapshots: stats.rollbackable_snapshots as i32,
            total_rollbacks: stats.total_rollbacks as i32,
            successful_rollbacks: stats.successful_rollbacks as i32,
            failed_rollbacks: stats.failed_rollbacks as i32,
        })
    }

    /// Validate if a rollback can be performed
    async fn validate_rollback(
        &self,
        ctx: &Context<'_>,
        snapshot_id: String,
    ) -> Result<RollbackValidationResult> {
        let gql_ctx = ctx.data::<GraphQLContext>()?;
        let db = &gql_ctx.db;
        let user_ctx = ctx.data::<UserContext>()?;

        // Check permissions
        let permission_checker = PermissionChecker::new(db.clone());
        permission_checker
            .require(user_ctx, SyncPermission::ViewSync)
            .await?;

        let snapshot_id = Uuid::parse_str(&snapshot_id)
            .map_err(|_| "Invalid snapshot ID format")?;

        let service = RollbackService::new(db.clone());
        let validation = service.validate_rollback(snapshot_id).await?;

        Ok(RollbackValidationResult {
            can_rollback: validation.can_rollback,
            validation_errors: validation.validation_errors,
            affected_entities: validation.affected_entities,
            warnings: validation.warnings,
        })
    }
}

/// Rollback operation for GraphQL
#[derive(async_graphql::SimpleObject)]
pub struct RollbackOperation {
    pub id: String,
    pub snapshot_id: String,
    pub sync_log_id: Option<String>,
    pub rollback_type: String,
    pub status: String,
    pub affected_entities: i32,
    pub successful_rollbacks: i32,
    pub failed_rollbacks: i32,
    pub reason: String,
    pub triggered_by: String,
    pub triggered_by_email: String,
    pub error_message: Option<String>,
    pub started_at: Option<String>,
    pub completed_at: Option<String>,
    pub duration_ms: Option<i32>,
}

/// Sync snapshot for GraphQL
#[derive(async_graphql::SimpleObject)]
pub struct SyncSnapshot {
    pub id: String,
    pub sync_log_id: Option<String>,
    pub entity_type: String,
    pub entity_id: String,
    pub operation_type: String,
    pub snapshot_type: String,
    pub quickbooks_id: Option<String>,
    pub can_rollback: bool,
    pub rollback_reason: Option<String>,
    pub expires_at: Option<String>,
    pub created_at: String,
}

/// Rollback statistics for GraphQL
#[derive(async_graphql::SimpleObject)]
pub struct RollbackStatsGraphQL {
    pub total_snapshots: i32,
    pub rollbackable_snapshots: i32,
    pub total_rollbacks: i32,
    pub successful_rollbacks: i32,
    pub failed_rollbacks: i32,
}

/// Rollback validation result for GraphQL
#[derive(async_graphql::SimpleObject)]
pub struct RollbackValidationResult {
    pub can_rollback: bool,
    pub validation_errors: Vec<String>,
    pub affected_entities: Vec<String>,
    pub warnings: Vec<String>,
}
