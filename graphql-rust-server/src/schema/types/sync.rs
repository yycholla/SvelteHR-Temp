//! GraphQL types for the new sync system

use async_graphql::{Enum, Object};
use chrono::{DateTime, Utc};

use crate::domain::sync::{
    ConflictStrategy as DomainConflictStrategy, EntityType as DomainEntityType,
    SyncDirection as DomainSyncDirection, SyncMode as DomainSyncMode,
    SyncReport as DomainSyncReport, SyncStatus as DomainSyncStatus,
};

/// Entity type for sync operations
#[derive(Enum, Clone, Copy, PartialEq, Eq)]
pub enum EntityType {
    Employee,
    Department,
}

impl From<EntityType> for DomainEntityType {
    fn from(value: EntityType) -> Self {
        match value {
            EntityType::Employee => DomainEntityType::Employee,
            EntityType::Department => DomainEntityType::Department,
        }
    }
}

impl From<DomainEntityType> for EntityType {
    fn from(value: DomainEntityType) -> Self {
        match value {
            DomainEntityType::Employee => EntityType::Employee,
            DomainEntityType::Department => EntityType::Department,
        }
    }
}

/// Sync direction (push, pull, bidirectional)
#[derive(Enum, Clone, Copy, PartialEq, Eq)]
pub enum SyncDirection {
    Push,
    Pull,
    Bidirectional,
}

impl From<DomainSyncDirection> for SyncDirection {
    fn from(value: DomainSyncDirection) -> Self {
        match value {
            DomainSyncDirection::Push => SyncDirection::Push,
            DomainSyncDirection::Pull => SyncDirection::Pull,
            DomainSyncDirection::Bidirectional => SyncDirection::Bidirectional,
        }
    }
}

impl From<SyncDirection> for DomainSyncDirection {
    fn from(value: SyncDirection) -> Self {
        match value {
            SyncDirection::Push => DomainSyncDirection::Push,
            SyncDirection::Pull => DomainSyncDirection::Pull,
            SyncDirection::Bidirectional => DomainSyncDirection::Bidirectional,
        }
    }
}

/// Sync mode (full, incremental)
#[derive(Enum, Clone, Copy, PartialEq, Eq)]
pub enum SyncMode {
    Full,
    Incremental,
}

impl From<DomainSyncMode> for SyncMode {
    fn from(value: DomainSyncMode) -> Self {
        match value {
            DomainSyncMode::Full => SyncMode::Full,
            DomainSyncMode::Incremental => SyncMode::Incremental,
        }
    }
}

impl From<SyncMode> for DomainSyncMode {
    fn from(value: SyncMode) -> Self {
        match value {
            SyncMode::Full => DomainSyncMode::Full,
            SyncMode::Incremental => DomainSyncMode::Incremental,
        }
    }
}

/// Conflict resolution strategy
#[derive(Enum, Clone, Copy, PartialEq, Eq)]
pub enum ConflictStrategy {
    LocalWins,
    RemoteWins,
    LastWriteWins,
    Manual,
}

impl From<ConflictStrategy> for DomainConflictStrategy {
    fn from(value: ConflictStrategy) -> Self {
        match value {
            ConflictStrategy::LocalWins => DomainConflictStrategy::LocalWins,
            ConflictStrategy::RemoteWins => DomainConflictStrategy::RemoteWins,
            ConflictStrategy::LastWriteWins => DomainConflictStrategy::LastWriteWins,
            ConflictStrategy::Manual => DomainConflictStrategy::Manual,
        }
    }
}

/// Sync status
#[derive(Enum, Clone, Copy, PartialEq, Eq)]
pub enum SyncStatus {
    Pending,
    InProgress,
    Completed,
    CompletedWithErrors,
    Failed,
}

impl From<DomainSyncStatus> for SyncStatus {
    fn from(value: DomainSyncStatus) -> Self {
        match value {
            DomainSyncStatus::Pending => SyncStatus::Pending,
            DomainSyncStatus::InProgress => SyncStatus::InProgress,
            DomainSyncStatus::Completed => SyncStatus::Completed,
            DomainSyncStatus::CompletedWithErrors => SyncStatus::CompletedWithErrors,
            DomainSyncStatus::Failed => SyncStatus::Failed,
        }
    }
}

/// Sync report returned from sync operations
#[derive(Clone)]
pub struct SyncReport {
    domain_report: DomainSyncReport,
}

impl From<DomainSyncReport> for SyncReport {
    fn from(domain_report: DomainSyncReport) -> Self {
        Self { domain_report }
    }
}

#[Object]
impl SyncReport {
    async fn entity_type(&self) -> EntityType {
        self.domain_report.entity_type.into()
    }

    async fn direction(&self) -> SyncDirection {
        self.domain_report.direction.into()
    }

    async fn mode(&self) -> SyncMode {
        self.domain_report.mode.into()
    }

    async fn status(&self) -> SyncStatus {
        self.domain_report.status.into()
    }

    async fn started_at(&self) -> DateTime<Utc> {
        self.domain_report.started_at
    }

    async fn completed_at(&self) -> Option<DateTime<Utc>> {
        self.domain_report.completed_at
    }

    async fn duration_ms(&self) -> Option<i64> {
        self.domain_report.completed_at.map(|completed| {
            (completed - self.domain_report.started_at)
                .num_milliseconds()
        })
    }

    async fn pushed_count(&self) -> i32 {
        self.domain_report.pushed.len() as i32
    }

    async fn pulled_count(&self) -> i32 {
        self.domain_report.pulled.len() as i32
    }

    async fn conflicts_detected(&self) -> i32 {
        self.domain_report.conflicts_detected as i32
    }

    async fn conflicts_resolved(&self) -> i32 {
        self.domain_report.conflicts_resolved as i32
    }

    async fn error_count(&self) -> i32 {
        self.domain_report.errors.len() as i32
    }

    async fn errors(&self) -> Vec<String> {
        self.domain_report
            .errors
            .iter()
            .map(|e| e.to_string())
            .collect()
    }

    async fn is_success(&self) -> bool {
        self.domain_report.is_success()
    }

    async fn has_errors(&self) -> bool {
        self.domain_report.has_errors()
    }

    async fn total_synced(&self) -> i32 {
        self.domain_report.total_synced() as i32
    }
}

/// Input for triggering a sync operation
#[derive(async_graphql::InputObject)]
pub struct SyncInput {
    pub entity_type: EntityType,
    pub direction: SyncDirection,
    pub mode: SyncMode,
    pub conflict_strategy: Option<ConflictStrategy>,
}
