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
