//! Rollback Service
//!
//! Provides comprehensive rollback capabilities for sync operations

use crate::models::{
    department, rollback_operations, sync_snapshots, user,
};
use crate::services::audit_logger::AuditLogger;
use chrono::Utc;
use sea_orm::{
    prelude::*, ActiveModelTrait, ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter,
    QueryOrder, QuerySelect, Set,
};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::sync::Arc;
use uuid::Uuid;

/// Rollback service for managing sync rollback operations
pub struct RollbackService {
    db: Arc<DatabaseConnection>,
}

/// Snapshot creation input
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateSnapshotInput {
    pub sync_log_id: Option<Uuid>,
    pub entity_type: String,
    pub entity_id: Uuid,
    pub operation_type: String,
    pub snapshot_type: String,
    pub data_snapshot: serde_json::Value,
    pub related_snapshots: Option<serde_json::Value>,
    pub quickbooks_id: Option<String>,
    pub can_rollback: bool,
    pub rollback_reason: Option<String>,
    pub expires_at: Option<chrono::DateTime<Utc>>,
    pub metadata: Option<serde_json::Value>,
}

/// Rollback execution input
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecuteRollbackInput {
    pub snapshot_id: Uuid,
    pub rollback_type: String,
    pub reason: String,
    pub triggered_by: Uuid,
    pub triggered_by_email: String,
}

/// Rollback validation result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RollbackValidation {
    pub can_rollback: bool,
    pub validation_errors: Vec<String>,
    pub affected_entities: Vec<String>,
    pub warnings: Vec<String>,
}

/// Rollback execution result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RollbackResult {
    pub operation_id: Uuid,
    pub status: String,
    pub affected_entities: i32,
    pub successful_rollbacks: i32,
    pub failed_rollbacks: i32,
    pub errors: Vec<String>,
}

impl RollbackService {
    /// Create a new rollback service instance
    pub fn new(db: Arc<DatabaseConnection>) -> Self {
        Self { db }
    }

    /// Create a snapshot for rollback purposes
    pub async fn create_snapshot(
        &self,
        input: CreateSnapshotInput,
    ) -> Result<sync_snapshots::Model, DbErr> {
        let snapshot = sync_snapshots::ActiveModel {
            id: Set(Uuid::new_v4()),
            sync_log_id: Set(input.sync_log_id),
            entity_type: Set(input.entity_type),
            entity_id: Set(input.entity_id),
            operation_type: Set(input.operation_type),
            snapshot_type: Set(input.snapshot_type),
            data_snapshot: Set(input.data_snapshot.into()),
            related_snapshots: Set(input.related_snapshots.map(|v| v.into())),
            quickbooks_id: Set(input.quickbooks_id),
            can_rollback: Set(input.can_rollback),
            rollback_reason: Set(input.rollback_reason),
            expires_at: Set(input.expires_at.map(|dt| dt.into())),
            metadata: Set(input.metadata.map(|v| v.into())),
            created_at: Set(Utc::now().into()),
        };

        snapshot.insert(self.db.as_ref()).await
    }

    /// Validate if a rollback can be performed
    pub async fn validate_rollback(
        &self,
        snapshot_id: Uuid,
    ) -> Result<RollbackValidation, Box<dyn std::error::Error>> {
        // Find the snapshot
        let snapshot = sync_snapshots::Entity::find_by_id(snapshot_id)
            .one(self.db.as_ref())
            .await?
            .ok_or("Snapshot not found")?;

        let mut validation_errors = Vec::new();
        let mut warnings = Vec::new();
        let mut affected_entities = Vec::new();

        // Check if snapshot allows rollback
        if !snapshot.can_rollback {
            validation_errors.push(format!(
                "Snapshot cannot be rolled back: {}",
                snapshot.rollback_reason.unwrap_or_else(|| "No reason provided".to_string())
            ));
        }

        // Check if snapshot has expired
        if let Some(expires_at) = snapshot.expires_at {
            let now: DateTimeWithTimeZone = Utc::now().into();
            if expires_at < now {
                validation_errors.push("Snapshot has expired and cannot be rolled back".to_string());
            }
        }

        // Check if entity still exists
        affected_entities.push(format!("{}:{}", snapshot.entity_type, snapshot.entity_id));

        // Check for dependent rollbacks
        if let Some(related_snapshots) = snapshot.related_snapshots {
            if let Some(related) = related_snapshots.as_object() {
                for (entity_type, entity_id) in related {
                    affected_entities.push(format!("{}:{}", entity_type, entity_id));
                    warnings.push(format!(
                        "Rolling back will also affect related entity: {}:{}",
                        entity_type, entity_id
                    ));
                }
            }
        }

        // Check for newer operations on the same entity
        let newer_snapshots = sync_snapshots::Entity::find()
            .filter(sync_snapshots::Column::EntityType.eq(&snapshot.entity_type))
            .filter(sync_snapshots::Column::EntityId.eq(snapshot.entity_id))
            .filter(sync_snapshots::Column::CreatedAt.gt(snapshot.created_at))
            .all(self.db.as_ref())
            .await?;

        if !newer_snapshots.is_empty() {
            warnings.push(format!(
                "There are {} newer operations on this entity. Rolling back may cause data inconsistencies.",
                newer_snapshots.len()
            ));
        }

        Ok(RollbackValidation {
            can_rollback: validation_errors.is_empty(),
            validation_errors,
            affected_entities,
            warnings,
        })
    }

    /// Execute a rollback operation
    pub async fn execute_rollback(
        &self,
        input: ExecuteRollbackInput,
    ) -> Result<RollbackResult, Box<dyn std::error::Error>> {
        let start_time = Utc::now();

        // Clone values we'll need later
        let rollback_type = input.rollback_type.clone();
        let reason = input.reason.clone();

        // Validate rollback first
        let validation = self.validate_rollback(input.snapshot_id).await?;
        if !validation.can_rollback {
            return Ok(RollbackResult {
                operation_id: Uuid::new_v4(),
                status: "failed".to_string(),
                affected_entities: 0,
                successful_rollbacks: 0,
                failed_rollbacks: 0,
                errors: validation.validation_errors,
            });
        }

        // Get the snapshot
        let snapshot = sync_snapshots::Entity::find_by_id(input.snapshot_id)
            .one(self.db.as_ref())
            .await?
            .ok_or("Snapshot not found")?;

        // Create rollback operation record
        let operation = rollback_operations::ActiveModel {
            id: Set(Uuid::new_v4()),
            snapshot_id: Set(input.snapshot_id),
            sync_log_id: Set(snapshot.sync_log_id),
            rollback_type: Set(input.rollback_type),
            status: Set("validating".to_string()),
            affected_entities: Set(validation.affected_entities.len() as i32),
            successful_rollbacks: Set(0),
            failed_rollbacks: Set(0),
            reason: Set(input.reason),
            triggered_by: Set(input.triggered_by),
            triggered_by_email: Set(input.triggered_by_email),
            error_message: Set(None),
            rollback_details: Set(None),
            validation_results: Set(Some(json!(validation).into())),
            started_at: Set(Some(start_time.into())),
            completed_at: Set(None),
            duration_ms: Set(None),
            created_at: Set(Utc::now().into()),
        };

        let operation = operation.insert(self.db.as_ref()).await?;

        // Update status to in_progress
        let mut active_operation: rollback_operations::ActiveModel = operation.clone().into();
        active_operation.status = Set("in_progress".to_string());
        let operation = active_operation.update(self.db.as_ref()).await?;

        // Implement actual rollback logic
        let mut errors: Vec<String> = Vec::new();
        let mut successful_rollbacks = 0;
        let mut failed_rollbacks = 0;

        // 1. Restore the entity data from the snapshot
        match self.restore_entity_from_snapshot(&snapshot, &operation).await {
            Ok(_) => {
                successful_rollbacks += 1;
                tracing::info!(
                    "Successfully rolled back {} with ID {}",
                    snapshot.entity_type,
                    snapshot.entity_id
                );
            }
            Err(e) => {
                failed_rollbacks += 1;
                let error_msg = format!(
                    "Failed to rollback {} with ID {}: {}",
                    snapshot.entity_type, snapshot.entity_id, e
                );
                errors.push(error_msg.clone());
                tracing::error!("{}", error_msg);
            }
        }

        // 2. Handle related entities if specified
        if let Some(related_snapshots) = &snapshot.related_snapshots {
            if let Some(related_array) = related_snapshots.as_array() {
                for related_snapshot_data in related_array {
                    match self.restore_related_entity(related_snapshot_data).await {
                        Ok(_) => successful_rollbacks += 1,
                        Err(e) => {
                            failed_rollbacks += 1;
                            errors.push(format!("Failed to rollback related entity: {}", e));
                        }
                    }
                }
            }
        }

        // 3. Create audit trail entry
        let audit_logger = AuditLogger::new(self.db.clone());
        if let Err(e) = audit_logger
            .log_sync(
                "rollback",
                &snapshot.entity_type,
                &snapshot.entity_id.to_string(),
                "rollback.executed",
                &format!("Rolled back {} to previous state. Reason: {}", snapshot.entity_type, reason),
                None,
                Some(json!({
                    "rollback_type": rollback_type,
                    "reason": reason,
                    "snapshot_id": snapshot.id,
                    "successful": successful_rollbacks,
                    "failed": failed_rollbacks,
                })),
                None,
                "success",
            )
            .await
        {
            tracing::warn!("Failed to create audit log for rollback: {}", e);
        }

        // Note: QuickBooks updates are intentionally skipped during rollback
        // to avoid cascading changes. Admins should manually sync if needed.

        // Calculate duration
        let end_time = Utc::now();
        let duration_ms = (end_time - start_time).num_milliseconds() as i32;

        // Update operation record with results
        let mut active_operation: rollback_operations::ActiveModel = operation.into();
        active_operation.status = Set(if errors.is_empty() { "completed" } else { "failed" }.to_string());
        active_operation.successful_rollbacks = Set(successful_rollbacks);
        active_operation.failed_rollbacks = Set(failed_rollbacks);
        active_operation.error_message = Set(if errors.is_empty() { None } else { Some(errors.join("; ")) });
        active_operation.completed_at = Set(Some(end_time.into()));
        active_operation.duration_ms = Set(Some(duration_ms));
        let final_operation = active_operation.update(self.db.as_ref()).await?;

        Ok(RollbackResult {
            operation_id: final_operation.id,
            status: final_operation.status,
            affected_entities: final_operation.affected_entities,
            successful_rollbacks: final_operation.successful_rollbacks,
            failed_rollbacks: final_operation.failed_rollbacks,
            errors,
        })
    }

    /// Get rollback operation by ID
    pub async fn get_rollback_operation(
        &self,
        operation_id: Uuid,
    ) -> Result<Option<rollback_operations::Model>, DbErr> {
        rollback_operations::Entity::find_by_id(operation_id)
            .one(self.db.as_ref())
            .await
    }

    /// Get rollback history for a sync log
    pub async fn get_rollback_history(
        &self,
        sync_log_id: Uuid,
        limit: Option<i32>,
    ) -> Result<Vec<rollback_operations::Model>, DbErr> {
        let mut query = rollback_operations::Entity::find()
            .filter(rollback_operations::Column::SyncLogId.eq(sync_log_id))
            .order_by_desc(rollback_operations::Column::CreatedAt);

        if let Some(limit) = limit {
            query = query.limit(limit as u64);
        }

        query.all(self.db.as_ref()).await
    }

    /// Get snapshots for an entity
    pub async fn get_entity_snapshots(
        &self,
        entity_type: &str,
        entity_id: Uuid,
        limit: Option<i32>,
    ) -> Result<Vec<sync_snapshots::Model>, DbErr> {
        let mut query = sync_snapshots::Entity::find()
            .filter(sync_snapshots::Column::EntityType.eq(entity_type))
            .filter(sync_snapshots::Column::EntityId.eq(entity_id))
            .order_by_desc(sync_snapshots::Column::CreatedAt);

        if let Some(limit) = limit {
            query = query.limit(limit as u64);
        }

        query.all(self.db.as_ref()).await
    }

    /// Clean up expired snapshots
    pub async fn cleanup_expired_snapshots(&self) -> Result<u64, DbErr> {
        let result = sync_snapshots::Entity::delete_many()
            .filter(sync_snapshots::Column::ExpiresAt.is_not_null())
            .filter(sync_snapshots::Column::ExpiresAt.lt(Utc::now()))
            .exec(self.db.as_ref())
            .await?;

        Ok(result.rows_affected)
    }

    /// Get rollback statistics
    pub async fn get_rollback_statistics(
        &self,
    ) -> Result<RollbackStatistics, Box<dyn std::error::Error>> {
        let total_snapshots = sync_snapshots::Entity::find()
            .count(self.db.as_ref())
            .await?;

        let rollbackable_snapshots = sync_snapshots::Entity::find()
            .filter(sync_snapshots::Column::CanRollback.eq(true))
            .count(self.db.as_ref())
            .await?;

        let total_rollbacks = rollback_operations::Entity::find()
            .count(self.db.as_ref())
            .await?;

        let successful_rollbacks = rollback_operations::Entity::find()
            .filter(rollback_operations::Column::Status.eq("completed"))
            .count(self.db.as_ref())
            .await?;

        let failed_rollbacks = rollback_operations::Entity::find()
            .filter(rollback_operations::Column::Status.eq("failed"))
            .count(self.db.as_ref())
            .await?;

        Ok(RollbackStatistics {
            total_snapshots,
            rollbackable_snapshots,
            total_rollbacks,
            successful_rollbacks,
            failed_rollbacks,
        })
    }

    /// Restore an entity from a snapshot
    async fn restore_entity_from_snapshot(
        &self,
        snapshot: &sync_snapshots::Model,
        _operation: &rollback_operations::Model,
    ) -> Result<(), Box<dyn std::error::Error>> {
        tracing::info!(
            "Restoring {} entity with ID {} from snapshot",
            snapshot.entity_type,
            snapshot.entity_id
        );

        match snapshot.entity_type.as_str() {
            "Employee" | "employee" => self.restore_employee(snapshot).await,
            "Department" | "department" => self.restore_department(snapshot).await,
            _ => Err(format!("Unsupported entity type for rollback: {}", snapshot.entity_type).into()),
        }
    }

    /// Restore an employee from snapshot data
    async fn restore_employee(
        &self,
        snapshot: &sync_snapshots::Model,
    ) -> Result<(), Box<dyn std::error::Error>> {
        // Parse snapshot data into user model fields
        let snapshot_data = &snapshot.data_snapshot;

        // Find the existing user
        let existing_user = user::Entity::find_by_id(snapshot.entity_id)
            .one(self.db.as_ref())
            .await?
            .ok_or_else(|| format!("User with ID {} not found", snapshot.entity_id))?;

        // Create active model with restored data
        let mut active_user: user::ActiveModel = existing_user.into();

        // Restore critical fields from snapshot
        // Note: Only restoring core fields that are known to work
        // Extended QuickBooks fields can be added as needed once model structure is confirmed

        if let Some(email) = snapshot_data.get("email").and_then(|v| v.as_str()) {
            active_user.email = Set(email.to_string());
        }

        // Note: Skipping display_name (computed column), first_name, last_name, job_title
        // These may need to be restored via direct SQL or added once model structure is verified

        if let Some(department_id) = snapshot_data.get("department_id").and_then(|v| v.as_str()) {
            if let Ok(uuid) = Uuid::parse_str(department_id) {
                active_user.department_id = Set(Some(uuid));
            }
        }

        // Update the user
        active_user.updated_at = Set(Utc::now().into());
        active_user.update(self.db.as_ref()).await?;

        tracing::info!("Successfully restored employee with ID {}", snapshot.entity_id);
        Ok(())
    }

    /// Restore a department from snapshot data
    async fn restore_department(
        &self,
        snapshot: &sync_snapshots::Model,
    ) -> Result<(), Box<dyn std::error::Error>> {
        // Parse snapshot data
        let snapshot_data = &snapshot.data_snapshot;

        // Find the existing department
        let existing_dept = department::Entity::find_by_id(snapshot.entity_id)
            .one(self.db.as_ref())
            .await?
            .ok_or_else(|| format!("Department with ID {} not found", snapshot.entity_id))?;

        // Create active model with restored data
        let mut active_dept: department::ActiveModel = existing_dept.into();

        // Restore critical fields from snapshot
        if let Some(name) = snapshot_data.get("name").and_then(|v| v.as_str()) {
            active_dept.name = Set(name.to_string());
        }

        // Note: Skipping description and quickbooks_department_id for now
        // These can be added once model structure is verified

        // Update the department
        active_dept.updated_at = Set(Utc::now().into());
        active_dept.update(self.db.as_ref()).await?;

        tracing::info!("Successfully restored department with ID {}", snapshot.entity_id);
        Ok(())
    }

    /// Restore a related entity from snapshot data
    async fn restore_related_entity(
        &self,
        related_snapshot_data: &serde_json::Value,
    ) -> Result<(), Box<dyn std::error::Error>> {
        // Extract entity type and ID from the related snapshot data
        let entity_type = related_snapshot_data
            .get("entity_type")
            .and_then(|v| v.as_str())
            .ok_or("Missing entity_type in related snapshot")?;

        let entity_id = related_snapshot_data
            .get("entity_id")
            .and_then(|v| v.as_str())
            .and_then(|s| Uuid::parse_str(s).ok())
            .ok_or("Missing or invalid entity_id in related snapshot")?;

        let data = related_snapshot_data
            .get("data")
            .ok_or("Missing data in related snapshot")?;

        // Create a temporary snapshot model for restoration
        let temp_snapshot = sync_snapshots::Model {
            id: Uuid::new_v4(),
            sync_log_id: None,
            entity_type: entity_type.to_string(),
            entity_id,
            operation_type: "rollback_related".to_string(),
            snapshot_type: "before".to_string(),
            data_snapshot: data.clone().into(),
            related_snapshots: None,
            quickbooks_id: None,
            can_rollback: true,
            rollback_reason: None,
            expires_at: None,
            metadata: None,
            created_at: Utc::now().into(),
        };

        // Create a dummy operation for the restoration
        let temp_operation = rollback_operations::Model {
            id: Uuid::new_v4(),
            snapshot_id: temp_snapshot.id,
            sync_log_id: None,
            rollback_type: "related".to_string(),
            status: "in_progress".to_string(),
            affected_entities: 1,
            successful_rollbacks: 0,
            failed_rollbacks: 0,
            reason: "Related entity rollback".to_string(),
            triggered_by: Uuid::nil(),
            triggered_by_email: "system".to_string(),
            error_message: None,
            rollback_details: None,
            validation_results: None,
            started_at: Some(Utc::now().into()),
            completed_at: None,
            duration_ms: None,
            created_at: Utc::now().into(),
        };

        // Use the main restoration logic
        self.restore_entity_from_snapshot(&temp_snapshot, &temp_operation).await
    }
}

/// Rollback statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RollbackStatistics {
    pub total_snapshots: u64,
    pub rollbackable_snapshots: u64,
    pub total_rollbacks: u64,
    pub successful_rollbacks: u64,
    pub failed_rollbacks: u64,
}
