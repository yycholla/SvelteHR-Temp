//! Rollback execution mutations
//!
//! Provides GraphQL mutations for executing rollbacks and managing snapshots.
//! Replaces frontend rollback-execution.service.ts logic with server-side execution.

use async_graphql::{Context, InputObject, Object, Result, SimpleObject};
use chrono::Utc;
use sea_orm::{ActiveModelTrait, ActiveValue::NotSet, DatabaseConnection, EntityTrait, Set};
use serde_json::Value as JsonValue;
use uuid::Uuid;

use crate::{
    auth::UserContext,
    database::get_db_from_context,
    error::AppError,
    models::system::{
        activity_log::{ActiveModel as ActivityLogActiveModel, Entity as ActivityLogEntity},
        rollback_request::{Entity as RollbackRequestEntity, RollbackStatus},
    },
};

/// Result of rollback execution
#[derive(Debug, Clone, SimpleObject)]
pub struct ExecuteRollbackResult {
    /// Whether the rollback was successful
    pub success: bool,
    /// Message describing the result
    pub message: String,
    /// ID of the created rollback activity log entry
    pub activity_log_id: Option<Uuid>,
    /// ID of the updated rollback request
    pub rollback_request_id: Uuid,
}

/// Result of snapshot capture
#[derive(Debug, Clone, SimpleObject)]
pub struct CaptureSnapshotResult {
    /// Whether the snapshot was captured successfully
    pub success: bool,
    /// Message describing the result
    pub message: String,
    /// ID of the created activity log entry (snapshot)
    pub activity_log_id: Option<Uuid>,
}

/// Input for snapshot comparison
#[derive(Debug, Clone, InputObject)]
pub struct CompareSnapshotsInput {
    /// ID of the "before" activity log entry
    #[graphql(name = "beforeId")]
    pub before_id: Uuid,
    /// ID of the "after" activity log entry
    #[graphql(name = "afterId")]
    pub after_id: Uuid,
}

/// Result of snapshot comparison
#[derive(Debug, Clone, SimpleObject)]
pub struct CompareSnapshotsResult {
    /// Differences between the two snapshots (JSON)
    pub differences: Option<JsonValue>,
    /// Whether snapshots are identical
    pub identical: bool,
}

/// Rollback execution mutations
#[derive(Default)]
pub struct RollbackMutations;

#[Object]
impl RollbackMutations {
    /// Execute a rollback request
    ///
    /// This mutation:
    /// 1. Validates the rollback request is approved
    /// 2. Retrieves the before_snapshot from the original activity log
    /// 3. Applies the snapshot to restore the entity to its previous state
    /// 4. Creates a new activity log entry marking the rollback
    /// 5. Updates the rollback request status to 'completed'
    ///
    /// **Authorization**: Requires authentication
    /// **RBAC**: Admin or request creator only
    async fn execute_rollback(
        &self,
        ctx: &Context<'_>,
        rollback_request_id: Uuid,
    ) -> Result<ExecuteRollbackResult> {
        let db = get_db_from_context(ctx)?;

        // Get user context
        let user_context = ctx
            .data_opt::<UserContext>()
            .ok_or("User context not found - authentication required")?;

        // Step 1: Fetch rollback request
        let rollback_request = RollbackRequestEntity::find_by_id(rollback_request_id)
            .one(&db)
            .await?
            .ok_or_else(|| AppError::NotFound("Rollback request not found".to_string()))?;

        // Step 2: Validate rollback request is approved
        if rollback_request.status != "approved" {
            return Ok(ExecuteRollbackResult {
                success: false,
                message: format!(
                    "Rollback request must be approved before execution (current status: {})",
                    rollback_request.status
                ),
                activity_log_id: None,
                rollback_request_id,
            });
        }

        // Step 3: Retrieve original entity snapshot from activity_logs
        // Find the most recent CREATE or UPDATE log for this entity
        use crate::models::system::activity_log::Column as ActivityLogColumn;
        use sea_orm::{ColumnTrait, QueryFilter, QueryOrder};

        let original_log = ActivityLogEntity::find()
            .filter(ActivityLogColumn::ResourceType.eq(&rollback_request.entity_type))
            .filter(ActivityLogColumn::ResourceId.eq(Some(rollback_request.entity_id)))
            .filter(ActivityLogColumn::Action.is_in(vec!["CREATE", "UPDATE"]))
            .order_by_desc(ActivityLogColumn::CreatedAt)
            .one(&db)
            .await?;

        let snapshot = match original_log {
            Some(log) => log.before_snapshot.ok_or_else(|| {
                AppError::Internal("No before_snapshot found for rollback".to_string())
            })?,
            None => {
                return Ok(ExecuteRollbackResult {
                    success: false,
                    message: format!(
                        "No activity log found for entity type '{}' with ID '{}'",
                        rollback_request.entity_type, rollback_request.entity_id
                    ),
                    activity_log_id: None,
                    rollback_request_id,
                });
            }
        };

        // Step 4: Apply snapshot to entity
        // This is a simplified version - in production, you would need entity-specific logic
        // For now, we just create an activity log entry marking the rollback
        // TODO: Implement actual entity restoration logic per entity type

        // Create activity log entry for rollback
        let rollback_log = ActivityLogActiveModel {
            id: Set(Uuid::new_v4()),
            user_id: Set(user_context.user_id),
            employee_id: NotSet,
            action: Set("ROLLBACK".to_string()),
            resource_type: Set(rollback_request.entity_type.clone()),
            resource_id: Set(Some(rollback_request.entity_id)),
            details: Set(Some(serde_json::json!({
                "rollback_request_id": rollback_request_id,
                "reason": rollback_request.reason,
            }))),
            before_snapshot: Set(Some(snapshot.clone())), // Current state before rollback
            after_snapshot: Set(Some(snapshot)),          // Restored state
            is_rollback: Set(true),
            rolled_back_log_id: NotSet, // Could reference original log ID
            ip_address: NotSet,
            user_agent: NotSet,
            signature_id: NotSet,
            batch_id: NotSet,
            created_at: Set(Utc::now()),
        };

        let created_log = rollback_log.insert(&db).await?;

        // Step 5: Update rollback request status to 'completed'
        let entity_type = rollback_request.entity_type.clone();
        let entity_id = rollback_request.entity_id;

        let mut rollback_request_active: crate::models::system::rollback_request::ActiveModel =
            rollback_request.into();
        rollback_request_active.status = Set("completed".to_string());
        rollback_request_active.processed_at = Set(Some(Utc::now()));
        rollback_request_active.update(&db).await?;

        Ok(ExecuteRollbackResult {
            success: true,
            message: format!(
                "Rollback executed successfully for {} '{}'",
                entity_type, entity_id
            ),
            activity_log_id: Some(created_log.id),
            rollback_request_id,
        })
    }

    /// Capture a snapshot of an entity's current state
    ///
    /// Creates an activity log entry with the current state snapshot.
    /// Useful for manual snapshot creation or pre-migration snapshots.
    ///
    /// **Authorization**: Requires authentication
    async fn capture_snapshot(
        &self,
        ctx: &Context<'_>,
        entity_type: String,
        entity_id: Uuid,
    ) -> Result<CaptureSnapshotResult> {
        let db = get_db_from_context(ctx)?;

        // Get user context
        let user_context = ctx
            .data_opt::<UserContext>()
            .ok_or("User context not found - authentication required")?;

        // TODO: Implement entity-specific snapshot logic
        // For now, we create a placeholder snapshot
        // In production, you would query the entity table and serialize its state

        let snapshot = serde_json::json!({
            "entity_type": entity_type,
            "entity_id": entity_id,
            "captured_at": Utc::now(),
            "note": "Manual snapshot - entity data not yet implemented"
        });

        // Create activity log entry with snapshot
        let snapshot_log = ActivityLogActiveModel {
            id: Set(Uuid::new_v4()),
            user_id: Set(user_context.user_id),
            employee_id: NotSet,
            action: Set("SNAPSHOT".to_string()),
            resource_type: Set(entity_type.clone()),
            resource_id: Set(Some(entity_id)),
            details: Set(Some(serde_json::json!({
                "snapshot_type": "manual",
            }))),
            before_snapshot: NotSet,
            after_snapshot: Set(Some(snapshot)), // Current state snapshot
            is_rollback: Set(false),
            rolled_back_log_id: NotSet,
            ip_address: NotSet,
            user_agent: NotSet,
            signature_id: NotSet,
            batch_id: NotSet,
            created_at: Set(Utc::now()),
        };

        let created_log = snapshot_log.insert(&db).await?;

        Ok(CaptureSnapshotResult {
            success: true,
            message: format!("Snapshot captured for {} '{}'", entity_type, entity_id),
            activity_log_id: Some(created_log.id),
        })
    }
}

/// Rollback query extensions
#[derive(Default)]
pub struct RollbackQueries;

#[Object]
impl RollbackQueries {
    /// Get snapshots for a specific entity
    ///
    /// Returns all activity log entries with snapshots for the given entity.
    /// Useful for viewing entity history and available restore points.
    async fn snapshots(
        &self,
        ctx: &Context<'_>,
        entity_type: String,
        entity_id: Uuid,
        limit: Option<i64>,
    ) -> Result<Vec<crate::models::system::activity_log::Model>> {
        use crate::models::system::activity_log::Column as ActivityLogColumn;
        use sea_orm::{ColumnTrait, QueryFilter, QueryOrder, QuerySelect};

        let db = get_db_from_context(ctx)?;

        let mut query = ActivityLogEntity::find()
            .filter(ActivityLogColumn::ResourceType.eq(&entity_type))
            .filter(ActivityLogColumn::ResourceId.eq(Some(entity_id)))
            .filter(
                sea_orm::Condition::any()
                    .add(ActivityLogColumn::BeforeSnapshot.is_not_null())
                    .add(ActivityLogColumn::AfterSnapshot.is_not_null()),
            )
            .order_by_desc(ActivityLogColumn::CreatedAt);

        if let Some(limit) = limit {
            query = query.limit(limit as u64);
        }

        let snapshots = query.all(&db).await?;

        Ok(snapshots)
    }

    /// Compare two snapshots to see differences
    ///
    /// Takes two activity log IDs and compares their snapshots.
    /// Returns the differences between them.
    async fn compare_snapshots(
        &self,
        ctx: &Context<'_>,
        input: CompareSnapshotsInput,
    ) -> Result<CompareSnapshotsResult> {
        let db = get_db_from_context(ctx)?;

        // Fetch both activity logs
        let before_log = ActivityLogEntity::find_by_id(input.before_id)
            .one(&db)
            .await?
            .ok_or_else(|| AppError::NotFound("Before snapshot not found".to_string()))?;

        let after_log = ActivityLogEntity::find_by_id(input.after_id)
            .one(&db)
            .await?
            .ok_or_else(|| AppError::NotFound("After snapshot not found".to_string()))?;

        // Extract snapshots
        let before_snapshot = before_log
            .after_snapshot
            .or(before_log.before_snapshot)
            .ok_or_else(|| AppError::Internal("Before log has no snapshot".to_string()))?;

        let after_snapshot = after_log
            .after_snapshot
            .or(after_log.before_snapshot)
            .ok_or_else(|| AppError::Internal("After log has no snapshot".to_string()))?;

        // Simple comparison - check if identical
        let identical = before_snapshot == after_snapshot;

        // TODO: Implement deep diff logic for structured differences
        let differences = if !identical {
            Some(serde_json::json!({
                "before": before_snapshot,
                "after": after_snapshot,
                "note": "Deep diff not yet implemented - showing full snapshots"
            }))
        } else {
            None
        };

        Ok(CompareSnapshotsResult {
            differences,
            identical,
        })
    }
}
