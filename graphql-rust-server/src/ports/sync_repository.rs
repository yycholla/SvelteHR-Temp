use async_trait::async_trait;
use chrono::{DateTime, Utc};

use crate::domain::sync::{Conflict, EntityType, SyncEntity, SyncError, SyncReport};

/// Port for sync state persistence operations
#[async_trait]
pub trait SyncRepositoryPort: Send + Sync {
    /// Get local entities that changed since the given timestamp
    async fn get_local_changes(
        &self,
        entity_type: EntityType,
        since: Option<DateTime<Utc>>,
    ) -> Result<Vec<SyncEntity>, SyncError>;

    /// Get the last sync timestamp for an entity type
    async fn get_last_sync_time(
        &self,
        entity_type: EntityType,
    ) -> Result<Option<DateTime<Utc>>, SyncError>;

    /// Mark entities as synced (batch operation)
    async fn mark_synced(&self, entities: &[SyncEntity]) -> Result<(), SyncError>;

    /// Save detected conflicts
    async fn save_conflicts(&self, conflicts: &[Conflict]) -> Result<(), SyncError>;

    /// Get pending (unresolved) conflicts
    async fn get_pending_conflicts(&self) -> Result<Vec<Conflict>, SyncError>;

    /// Resolve a conflict
    async fn resolve_conflict(&self, conflict_id: &str) -> Result<(), SyncError>;

    /// Save a sync operation log
    async fn save_sync_log(&self, report: &SyncReport) -> Result<(), SyncError>;

    /// Get recent sync logs
    async fn get_recent_sync_logs(&self, limit: usize) -> Result<Vec<SyncReport>, SyncError>;
}

/// Mock implementation for testing
#[cfg(test)]
pub mod mock {
    use super::*;
    use std::sync::{Arc, Mutex};

    #[derive(Default)]
    pub struct MockSyncRepositoryPort {
        pub local_changes: Arc<Mutex<Vec<SyncEntity>>>,
        pub last_sync_times: Arc<Mutex<std::collections::HashMap<EntityType, DateTime<Utc>>>>,
        pub conflicts: Arc<Mutex<Vec<Conflict>>>,
        pub sync_logs: Arc<Mutex<Vec<SyncReport>>>,
    }

    impl MockSyncRepositoryPort {
        pub fn new() -> Self {
            Self::default()
        }

        pub fn with_local_changes(changes: Vec<SyncEntity>) -> Self {
            Self {
                local_changes: Arc::new(Mutex::new(changes)),
                ..Default::default()
            }
        }
    }

    #[async_trait]
    impl SyncRepositoryPort for MockSyncRepositoryPort {
        async fn get_local_changes(
            &self,
            _entity_type: EntityType,
            since: Option<DateTime<Utc>>,
        ) -> Result<Vec<SyncEntity>, SyncError> {
            let changes = self.local_changes.lock().unwrap();
            let filtered: Vec<SyncEntity> = match since {
                Some(ts) => changes
                    .iter()
                    .filter(|e| {
                        e.local_version
                            .as_ref()
                            .map(|v| v.last_modified > ts)
                            .unwrap_or(false)
                    })
                    .cloned()
                    .collect(),
                None => changes.clone(),
            };
            Ok(filtered)
        }

        async fn get_last_sync_time(
            &self,
            entity_type: EntityType,
        ) -> Result<Option<DateTime<Utc>>, SyncError> {
            Ok(self
                .last_sync_times
                .lock()
                .unwrap()
                .get(&entity_type)
                .copied())
        }

        async fn mark_synced(&self, entities: &[SyncEntity]) -> Result<(), SyncError> {
            if !entities.is_empty() {
                let entity_type = entities[0].entity_type;
                // Find the max modified time from local or remote versions
                let max_time = entities
                    .iter()
                    .filter_map(|e| {
                        e.local_version
                            .as_ref()
                            .or(e.remote_version.as_ref())
                            .map(|v| v.last_modified)
                    })
                    .max();

                if let Some(max_time) = max_time {
                    self.last_sync_times
                        .lock()
                        .unwrap()
                        .insert(entity_type, max_time);
                }
            }
            Ok(())
        }

        async fn save_conflicts(&self, conflicts: &[Conflict]) -> Result<(), SyncError> {
            self.conflicts.lock().unwrap().extend_from_slice(conflicts);
            Ok(())
        }

        async fn get_pending_conflicts(&self) -> Result<Vec<Conflict>, SyncError> {
            Ok(self.conflicts.lock().unwrap().clone())
        }

        async fn resolve_conflict(&self, _conflict_id: &str) -> Result<(), SyncError> {
            Ok(())
        }

        async fn save_sync_log(&self, report: &SyncReport) -> Result<(), SyncError> {
            self.sync_logs.lock().unwrap().push(report.clone());
            Ok(())
        }

        async fn get_recent_sync_logs(&self, limit: usize) -> Result<Vec<SyncReport>, SyncError> {
            let logs = self.sync_logs.lock().unwrap();
            Ok(logs.iter().rev().take(limit).cloned().collect())
        }
    }
}
