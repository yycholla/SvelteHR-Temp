use async_trait::async_trait;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

use crate::domain::sync::{SyncError, SyncReport};

/// Health status of the sync system
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HealthStatus {
    pub status: HealthLevel,
    pub last_sync: Option<DateTime<Utc>>,
    pub last_sync_success: bool,
    pub sync_count_24h: usize,
    pub error_count_24h: usize,
    pub pending_conflicts: usize,
    pub uptime_percentage: f64,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum HealthLevel {
    Healthy,
    Warning,
    Critical,
}

impl HealthStatus {
    pub fn healthy() -> Self {
        Self {
            status: HealthLevel::Healthy,
            last_sync: None,
            last_sync_success: true,
            sync_count_24h: 0,
            error_count_24h: 0,
            pending_conflicts: 0,
            uptime_percentage: 100.0,
        }
    }
}

/// Port for health monitoring operations
#[async_trait]
pub trait HealthPort: Send + Sync {
    /// Record that a sync completed
    async fn record_sync_completed(&self, report: &SyncReport) -> Result<(), SyncError>;

    /// Get current health status
    async fn get_health_status(&self) -> Result<HealthStatus, SyncError>;
}
