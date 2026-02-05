// graphql-rust-server/src/application/sync_service.rs
use std::sync::Arc;

use crate::domain::sync::{
    ChangeDetector, ConflictResolver, ConflictStrategy, EntityType, SyncDirection,
    SyncEntity, SyncError, SyncMode, SyncReport,
};
use crate::ports::{HealthPort, QuickBooksPort, SyncRepositoryPort};

/// Application service that orchestrates sync operations
pub struct SyncService<Q, R, H>
where
    Q: QuickBooksPort,
    R: SyncRepositoryPort,
    H: HealthPort,
{
    quickbooks: Arc<Q>,
    repository: Arc<R>,
    health: Arc<H>,
}

impl<Q, R, H> SyncService<Q, R, H>
where
    Q: QuickBooksPort,
    R: SyncRepositoryPort,
    H: HealthPort,
{
    pub fn new(quickbooks: Arc<Q>, repository: Arc<R>, health: Arc<H>) -> Self {
        Self {
            quickbooks,
            repository,
            health,
        }
    }

    /// Execute a bidirectional sync operation
    pub async fn sync_bidirectional(
        &self,
        entity_type: EntityType,
        mode: SyncMode,
        strategy: ConflictStrategy,
    ) -> SyncReport {
        let mut report = SyncReport::new(entity_type, SyncDirection::Bidirectional, mode);

        // 1. Get last sync time for incremental mode
        let since = match mode {
            SyncMode::Incremental => {
                match self.repository.get_last_sync_time(entity_type).await {
                    Ok(time) => time,
                    Err(e) => {
                        report.add_error(e);
                        None
                    }
                }
            }
            SyncMode::Full => None,
        };

        // 2. Collect local changes
        let local_changes = match self.repository.get_local_changes(entity_type, since).await {
            Ok(changes) => changes,
            Err(e) => {
                report.add_error(e);
                Vec::new()
            }
        };

        // 3. Collect remote changes
        let remote_changes = match self.fetch_remote_changes(entity_type, since).await {
            Ok(changes) => changes,
            Err(e) => {
                report.add_error(e);
                Vec::new()
            }
        };

        // 4. Detect conflicts and partition changes
        let (conflicts, pushable, pullable) =
            ChangeDetector::partition_changes(local_changes, remote_changes);

        report.conflicts_detected = conflicts.len();

        // 5. Resolve conflicts if strategy is not Manual
        if strategy != ConflictStrategy::Manual && !conflicts.is_empty() {
            let resolved = ConflictResolver::resolve_all(&self.build_conflicts(&conflicts), strategy);
            report.conflicts_resolved = resolved.len();

            // Apply resolutions
            for (conflict, resolution) in resolved {
                if let Err(e) = self.apply_resolution(&mut report, conflict, resolution).await {
                    report.add_error(e);
                }
            }
        } else if !conflicts.is_empty() {
            // Save conflicts for manual resolution
            if let Err(e) = self.repository.save_conflicts(&self.build_conflicts(&conflicts)).await {
                report.add_error(e);
            }
        }

        // 6. Push local changes
        for entity in pushable {
            if let Err(e) = self.push_entity(&mut report, entity).await {
                report.add_error(e);
            }
        }

        // 7. Pull remote changes
        for entity in pullable {
            if let Err(e) = self.pull_entity(&mut report, entity).await {
                report.add_error(e);
            }
        }

        // 8. Complete the report
        report.complete();

        // 9. Record health metrics
        let _ = self.health.record_sync_completed(&report).await;

        // 10. Save sync log
        let _ = self.repository.save_sync_log(&report).await;

        report
    }

    /// Execute a push-only sync
    pub async fn sync_push(
        &self,
        entity_type: EntityType,
        mode: SyncMode,
    ) -> SyncReport {
        let mut report = SyncReport::new(entity_type, SyncDirection::Push, mode);

        let since = match mode {
            SyncMode::Incremental => {
                self.repository.get_last_sync_time(entity_type).await.ok().flatten()
            }
            SyncMode::Full => None,
        };

        let local_changes = match self.repository.get_local_changes(entity_type, since).await {
            Ok(changes) => changes,
            Err(e) => {
                report.add_error(e);
                report.complete();
                return report;
            }
        };

        for entity in local_changes {
            if let Err(e) = self.push_entity(&mut report, entity).await {
                report.add_error(e);
            }
        }

        report.complete();
        let _ = self.health.record_sync_completed(&report).await;
        let _ = self.repository.save_sync_log(&report).await;

        report
    }

    /// Execute a pull-only sync
    pub async fn sync_pull(
        &self,
        entity_type: EntityType,
        mode: SyncMode,
    ) -> SyncReport {
        let mut report = SyncReport::new(entity_type, SyncDirection::Pull, mode);

        let since = match mode {
            SyncMode::Incremental => {
                self.repository.get_last_sync_time(entity_type).await.ok().flatten()
            }
            SyncMode::Full => None,
        };

        let remote_changes = match self.fetch_remote_changes(entity_type, since).await {
            Ok(changes) => changes,
            Err(e) => {
                report.add_error(e);
                report.complete();
                return report;
            }
        };

        for entity in remote_changes {
            if let Err(e) = self.pull_entity(&mut report, entity).await {
                report.add_error(e);
            }
        }

        report.complete();
        let _ = self.health.record_sync_completed(&report).await;
        let _ = self.repository.save_sync_log(&report).await;

        report
    }

    // Private helper methods

    async fn fetch_remote_changes(
        &self,
        entity_type: EntityType,
        since: Option<chrono::DateTime<chrono::Utc>>,
    ) -> Result<Vec<SyncEntity>, SyncError> {
        match entity_type {
            EntityType::Employee => {
                let employees = self.quickbooks.list_employees(since).await?;
                Ok(employees
                    .into_iter()
                    .map(|e| {
                        SyncEntity::remote_only(EntityType::Employee, e.id.as_str())
                            .with_remote_version(crate::domain::sync::EntityVersion::new(e.last_modified)
                                .with_sync_token(&e.sync_token))
                    })
                    .collect())
            }
            EntityType::Department => {
                let departments = self.quickbooks.list_departments(since).await?;
                Ok(departments
                    .into_iter()
                    .map(|d| {
                        SyncEntity::remote_only(EntityType::Department, d.id.as_str())
                            .with_remote_version(crate::domain::sync::EntityVersion::new(d.last_modified)
                                .with_sync_token(&d.sync_token))
                    })
                    .collect())
            }
        }
    }

    fn build_conflicts(&self, entities: &[SyncEntity]) -> Vec<crate::domain::sync::Conflict> {
        // Simplified - in real impl, would fetch snapshots
        entities
            .iter()
            .map(|e| {
                crate::domain::sync::Conflict::new(
                    e.clone(),
                    crate::domain::sync::EntitySnapshot::new(Default::default()),
                    crate::domain::sync::EntitySnapshot::new(Default::default()),
                    Vec::new(),
                )
            })
            .collect()
    }

    async fn apply_resolution(
        &self,
        report: &mut SyncReport,
        conflict: crate::domain::sync::Conflict,
        resolution: crate::domain::sync::ConflictResolution,
    ) -> Result<(), SyncError> {
        use crate::domain::sync::ConflictWinner;

        match resolution.winner {
            ConflictWinner::Local => {
                self.push_entity(report, conflict.entity).await?;
            }
            ConflictWinner::Remote => {
                self.pull_entity(report, conflict.entity).await?;
            }
            ConflictWinner::Merged | ConflictWinner::Pending => {
                // Merged requires special handling, Pending is skipped
            }
        }
        Ok(())
    }

    async fn push_entity(
        &self,
        report: &mut SyncReport,
        entity: SyncEntity,
    ) -> Result<(), SyncError> {
        // In real implementation, would fetch local data and push to QB
        // For now, just mark as pushed
        report.add_pushed(entity.clone());
        self.repository.mark_synced(&[entity]).await
    }

    async fn pull_entity(
        &self,
        report: &mut SyncReport,
        entity: SyncEntity,
    ) -> Result<(), SyncError> {
        // In real implementation, would fetch remote data and save locally
        // For now, just mark as pulled
        report.add_pulled(entity.clone());
        self.repository.mark_synced(&[entity]).await
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::sync::SyncStatus;
    use crate::ports::health::HealthStatus;
    use std::sync::Mutex;

    // Mock implementations for testing

    struct MockRepo {
        changes: Mutex<Vec<SyncEntity>>,
    }

    impl MockRepo {
        fn new() -> Self {
            Self {
                changes: Mutex::new(Vec::new()),
            }
        }

        #[allow(dead_code)]
        fn with_changes(changes: Vec<SyncEntity>) -> Self {
            Self {
                changes: Mutex::new(changes),
            }
        }
    }

    #[async_trait::async_trait]
    impl SyncRepositoryPort for MockRepo {
        async fn get_local_changes(
            &self,
            _entity_type: EntityType,
            _since: Option<chrono::DateTime<chrono::Utc>>,
        ) -> Result<Vec<SyncEntity>, SyncError> {
            Ok(self.changes.lock().unwrap().clone())
        }

        async fn get_last_sync_time(
            &self,
            _entity_type: EntityType,
        ) -> Result<Option<chrono::DateTime<chrono::Utc>>, SyncError> {
            Ok(None)
        }

        async fn mark_synced(&self, _entities: &[SyncEntity]) -> Result<(), SyncError> {
            Ok(())
        }

        async fn save_conflicts(
            &self,
            _conflicts: &[crate::domain::sync::Conflict],
        ) -> Result<(), SyncError> {
            Ok(())
        }

        async fn get_pending_conflicts(
            &self,
        ) -> Result<Vec<crate::domain::sync::Conflict>, SyncError> {
            Ok(Vec::new())
        }

        async fn resolve_conflict(&self, _conflict_id: &str) -> Result<(), SyncError> {
            Ok(())
        }

        async fn save_sync_log(&self, _report: &SyncReport) -> Result<(), SyncError> {
            Ok(())
        }

        async fn get_recent_sync_logs(&self, _limit: usize) -> Result<Vec<SyncReport>, SyncError> {
            Ok(Vec::new())
        }
    }

    struct MockHealth;

    #[async_trait::async_trait]
    impl HealthPort for MockHealth {
        async fn record_sync_completed(&self, _report: &SyncReport) -> Result<(), SyncError> {
            Ok(())
        }

        async fn get_health_status(&self) -> Result<HealthStatus, SyncError> {
            Ok(HealthStatus::healthy())
        }
    }

    #[tokio::test]
    async fn sync_bidirectional_completes_without_changes() {
        use crate::ports::quickbooks::mock::MockQuickBooksPort;

        let qb = Arc::new(MockQuickBooksPort::new());
        let repo = Arc::new(MockRepo::new());
        let health = Arc::new(MockHealth);

        let service = SyncService::new(qb, repo, health);
        let report = service
            .sync_bidirectional(
                EntityType::Employee,
                SyncMode::Full,
                ConflictStrategy::LocalWins,
            )
            .await;

        assert_eq!(report.status, SyncStatus::Completed);
        assert_eq!(report.total_synced(), 0);
        assert!(!report.has_errors());
    }

    #[tokio::test]
    async fn sync_pull_fetches_remote_changes() {
        use crate::ports::quickbooks::mock::MockQuickBooksPort;
        use crate::ports::quickbooks::RemoteEmployee;
        use crate::domain::sync::QuickBooksId;
        use chrono::Utc;

        let employees = vec![RemoteEmployee {
            id: QuickBooksId::new("qb-1"),
            given_name: "John".to_string(),
            family_name: "Doe".to_string(),
            email: Some("john@test.com".to_string()),
            phone: None,
            department_id: None,
            sync_token: "1".to_string(),
            last_modified: Utc::now(),
            active: true,
        }];

        let qb = Arc::new(MockQuickBooksPort::with_employees(employees));
        let repo = Arc::new(MockRepo::new());
        let health = Arc::new(MockHealth);

        let service = SyncService::new(qb, repo, health);
        let report = service.sync_pull(EntityType::Employee, SyncMode::Full).await;

        assert_eq!(report.pulled.len(), 1);
        assert!(report.is_success());
    }
}
