//! SeaORM-based implementation of SyncRepositoryPort
//!
//! This adapter implements the sync repository port using SeaORM for database operations.
//! It maps between domain entities and database models, handling CRUD operations for sync state.

use async_trait::async_trait;
use chrono::{DateTime, Utc};
use sea_orm::{
    ActiveModelTrait, ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter, QueryOrder, Set,
};

use crate::domain::sync::{
    ChangeType, Conflict, EntityId, EntityType, QuickBooksId, SyncEntity, SyncError, SyncReport,
};
use crate::models::{department, intuit_sync_log, sync_snapshots, user};
use crate::ports::sync_repository::SyncRepositoryPort;

/// Adapter that implements SyncRepositoryPort using SeaORM
pub struct SeaOrmSyncRepository {
    db: DatabaseConnection,
}

impl SeaOrmSyncRepository {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }

    /// Map user model to SyncEntity
    fn map_user_to_sync_entity(&self, user: user::Model) -> SyncEntity {
        let local_id = EntityId::new(user.id.to_string());
        let remote_id = user
            .intuit_employee_id
            .as_ref()
            .map(|id| QuickBooksId::new(id.clone()));

        let entity = if let Some(qb_id) = remote_id {
            SyncEntity::employee(local_id.as_str(), qb_id.as_str())
        } else {
            SyncEntity::local_only(EntityType::Employee, local_id.as_str())
        };

        // Set change type based on conditions
        if user.intuit_employee_id.is_none() {
            entity.with_change_type(ChangeType::Created)
        } else {
            entity.with_change_type(ChangeType::Updated)
        }
    }

    /// Map department model to SyncEntity
    fn map_department_to_sync_entity(&self, dept: department::Model) -> SyncEntity {
        let local_id = EntityId::new(dept.id.to_string());
        let remote_id = dept
            .intuit_department_id
            .as_ref()
            .map(|id| QuickBooksId::new(id.clone()));

        if let Some(qb_id) = remote_id {
            SyncEntity::department(local_id.as_str(), qb_id.as_str())
                .with_change_type(ChangeType::Updated)
        } else {
            SyncEntity::local_only(EntityType::Department, local_id.as_str())
                .with_change_type(ChangeType::Created)
        }
    }
}

#[async_trait]
impl SyncRepositoryPort for SeaOrmSyncRepository {
    async fn get_local_changes(
        &self,
        entity_type: EntityType,
        since: Option<DateTime<Utc>>,
    ) -> Result<Vec<SyncEntity>, SyncError> {
        match entity_type {
            EntityType::Employee => {
                let mut query = user::Entity::find().filter(user::Column::IsActive.eq(true));

                if let Some(since_time) = since {
                    query = query.filter(user::Column::LastModifiedAt.gt(since_time));
                }

                let users = query
                    .all(&self.db)
                    .await
                    .map_err(|e| SyncError::RepositoryError {
                        message: e.to_string(),
                    })?;

                Ok(users
                    .into_iter()
                    .map(|u| self.map_user_to_sync_entity(u))
                    .collect())
            }
            EntityType::Department => {
                let mut query =
                    department::Entity::find().filter(department::Column::DeletedAt.is_null());

                if let Some(since_time) = since {
                    query = query.filter(department::Column::UpdatedAt.gt(since_time));
                }

                let departments =
                    query
                        .all(&self.db)
                        .await
                        .map_err(|e| SyncError::RepositoryError {
                            message: e.to_string(),
                        })?;

                Ok(departments
                    .into_iter()
                    .map(|d| self.map_department_to_sync_entity(d))
                    .collect())
            }
            EntityType::TimeEntry => {
                // Time entry sync not yet implemented
                Ok(Vec::new())
            }
        }
    }

    async fn get_last_sync_time(
        &self,
        entity_type: EntityType,
    ) -> Result<Option<DateTime<Utc>>, SyncError> {
        // Query the most recent successful sync log
        let entity_type_str = match entity_type {
            EntityType::Employee => "employee",
            EntityType::Department => "department",
            EntityType::TimeEntry => "time_entry",
        };

        let log = intuit_sync_log::Entity::find()
            .filter(intuit_sync_log::Column::SyncType.eq(entity_type_str))
            .filter(intuit_sync_log::Column::Status.eq("completed"))
            .order_by_desc(intuit_sync_log::Column::CreatedAt)
            .one(&self.db)
            .await
            .map_err(|e| SyncError::RepositoryError {
                message: e.to_string(),
            })?;

        Ok(log.map(|l| l.created_at.to_utc()))
    }

    async fn mark_synced(&self, entities: &[SyncEntity]) -> Result<(), SyncError> {
        for entity in entities {
            if let Some(local_id) = &entity.local_id {
                let uuid =
                    uuid::Uuid::parse_str(local_id.as_str()).map_err(|e| SyncError::Internal {
                        message: format!("Invalid UUID: {}", e),
                    })?;

                match entity.entity_type {
                    EntityType::Employee => {
                        if let Some(user_model) = user::Entity::find_by_id(uuid)
                            .one(&self.db)
                            .await
                            .map_err(|e| SyncError::RepositoryError {
                                message: e.to_string(),
                            })?
                        {
                            let mut active: user::ActiveModel = user_model.into();
                            active.last_synced_at = Set(Some(Utc::now()));
                            if let Some(remote_id) = &entity.remote_id {
                                active.intuit_employee_id =
                                    Set(Some(remote_id.as_str().to_string()));
                            }
                            active.update(&self.db).await.map_err(|e| {
                                SyncError::RepositoryError {
                                    message: e.to_string(),
                                }
                            })?;
                        }
                    }
                    EntityType::Department => {
                        if let Some(dept_model) = department::Entity::find_by_id(uuid)
                            .one(&self.db)
                            .await
                            .map_err(|e| SyncError::RepositoryError {
                                message: e.to_string(),
                            })?
                        {
                            let mut active: department::ActiveModel = dept_model.into();
                            active.last_synced_at = Set(Some(Utc::now()));
                            if let Some(remote_id) = &entity.remote_id {
                                active.intuit_department_id =
                                    Set(Some(remote_id.as_str().to_string()));
                            }
                            active.update(&self.db).await.map_err(|e| {
                                SyncError::RepositoryError {
                                    message: e.to_string(),
                                }
                            })?;
                        }
                    }
                    EntityType::TimeEntry => {
                        // Time entry sync not yet implemented
                    }
                }
            }
        }

        Ok(())
    }

    async fn save_conflicts(&self, conflicts: &[Conflict]) -> Result<(), SyncError> {
        // For now, log conflicts to sync_snapshots
        // In a full implementation, would have a dedicated conflicts table
        for conflict in conflicts {
            let snapshot = sync_snapshots::ActiveModel {
                id: Set(uuid::Uuid::new_v4()),
                sync_log_id: Set(None),
                entity_type: Set(conflict.entity.entity_type.to_string()),
                entity_id: Set(uuid::Uuid::parse_str(
                    conflict.entity.local_id.as_ref().unwrap().as_str(),
                )
                .map_err(|e| SyncError::Internal {
                    message: e.to_string(),
                })?),
                operation_type: Set("conflict".to_string()),
                snapshot_type: Set("before".to_string()),
                data_snapshot: Set(serde_json::to_value(&conflict.local_data).map_err(|e| {
                    SyncError::Internal {
                        message: e.to_string(),
                    }
                })?),
                related_snapshots: Set(Some(serde_json::to_value(&conflict.remote_data).map_err(
                    |e| SyncError::Internal {
                        message: e.to_string(),
                    },
                )?)),
                quickbooks_id: Set(conflict
                    .entity
                    .remote_id
                    .as_ref()
                    .map(|id| id.as_str().to_string())),
                can_rollback: Set(true),
                rollback_reason: Set(Some("Conflict detected during sync".to_string())),
                expires_at: Set(None),
                metadata: Set(None),
                created_at: Set(Utc::now().into()),
            };

            snapshot
                .insert(&self.db)
                .await
                .map_err(|e| SyncError::RepositoryError {
                    message: e.to_string(),
                })?;
        }

        Ok(())
    }

    async fn get_pending_conflicts(&self) -> Result<Vec<Conflict>, SyncError> {
        // Simplified - return empty for now
        // In full implementation, would query conflicts table
        Ok(Vec::new())
    }

    async fn resolve_conflict(&self, _conflict_id: &str) -> Result<(), SyncError> {
        // Simplified - no-op for now
        // In full implementation, would mark conflict as resolved
        Ok(())
    }

    async fn save_sync_log(&self, report: &SyncReport) -> Result<(), SyncError> {
        // Calculate duration in milliseconds
        let duration_ms = if let Some(completed) = report.completed_at {
            let duration = completed.signed_duration_since(report.started_at);
            Some(duration.num_milliseconds() as i32)
        } else {
            None
        };

        let log = intuit_sync_log::ActiveModel {
            id: Set(uuid::Uuid::new_v4()),
            user_id: Set(None), // Could pass user_id if available
            sync_type: Set(report.entity_type.to_string()),
            direction: Set(report.direction.to_string()),
            status: Set(match report.status {
                crate::domain::sync::SyncStatus::Completed => "completed".to_string(),
                crate::domain::sync::SyncStatus::CompletedWithErrors => {
                    "completed_with_errors".to_string()
                }
                crate::domain::sync::SyncStatus::Failed => "failed".to_string(),
                crate::domain::sync::SyncStatus::InProgress => "in_progress".to_string(),
                crate::domain::sync::SyncStatus::Pending => "pending".to_string(),
            }),
            error_message: Set(report.errors.first().map(|e| e.to_string())),
            payload: Set(None),
            change_direction: Set(Some(report.direction.to_string())),
            conflict_detected: Set(report.conflicts_detected > 0),
            conflict_resolution: Set(None),
            pushed_count: Set(report.pushed.len() as i32),
            pulled_count: Set(report.pulled.len() as i32),
            updated_count: Set(0),
            skipped_count: Set(0),
            retry_count: Set(0),
            next_retry_at: Set(None),
            quickbooks_metadata: Set(None),
            sync_mode: Set(match report.mode {
                crate::domain::sync::SyncMode::Full => "full".to_string(),
                crate::domain::sync::SyncMode::Incremental => "incremental".to_string(),
            }),
            changes_detected: Set(report.conflicts_detected as i32),
            changes_processed: Set(report.total_synced() as i32),
            sync_duration_ms: Set(duration_ms),
            created_at: Set(Utc::now().into()),
        };

        log.insert(&self.db)
            .await
            .map_err(|e| SyncError::RepositoryError {
                message: e.to_string(),
            })?;

        Ok(())
    }

    async fn get_recent_sync_logs(&self, _limit: usize) -> Result<Vec<SyncReport>, SyncError> {
        // Simplified - return empty for now
        // In full implementation, would query and map logs to SyncReport
        Ok(Vec::new())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_repository_creation() {
        // This is a compilation test - we can't test without a real database
        // Full integration tests would be in a separate test file with test database
    }
}
