//! Sync Health Monitoring GraphQL Queries

use async_graphql::{Context, Object, Result};
use chrono::{DateTime, Utc};
use sea_orm::DatabaseConnection;
use std::sync::Arc;

use crate::auth::UserContext;
use crate::services::health_monitor::{HealthMonitor, SyncHealthSnapshot};
use crate::services::permission_checker::{PermissionChecker, SyncPermission};
use crate::models::{sync_health_alerts, sync_health_metrics};

#[derive(Default)]
pub struct SyncHealthQueries;

#[Object]
impl SyncHealthQueries {
    /// Get current sync health status with aggregated metrics
    async fn sync_health_status(&self, ctx: &Context<'_>) -> Result<SyncHealthStatus> {
        let user_ctx = ctx.data::<UserContext>()?;
        let db = ctx.data::<Arc<DatabaseConnection>>()?;

        // Check permission
        let permission_checker = PermissionChecker::new((**db).clone());
        permission_checker
            .require(user_ctx, SyncPermission::ViewSyncHistory)
            .await?;

        let monitor = HealthMonitor::new(db.clone());
        let snapshot = monitor.get_health_snapshot().await?;

        Ok(SyncHealthStatus::from(snapshot))
    }

    /// Get sync health metrics for a specific timeframe
    async fn sync_health_metrics(
        &self,
        ctx: &Context<'_>,
        #[graphql(desc = "Timeframe in hours (default: 24)")] timeframe: Option<i32>,
    ) -> Result<Vec<SyncHealthMetric>> {
        let user_ctx = ctx.data::<UserContext>()?;
        let db = ctx.data::<Arc<DatabaseConnection>>()?;

        // Check permission
        let permission_checker = PermissionChecker::new((**db).clone());
        permission_checker
            .require(user_ctx, SyncPermission::ViewSyncHistory)
            .await?;

        let hours = timeframe.unwrap_or(24);
        let monitor = HealthMonitor::new(db.clone());
        let metrics = monitor.get_metrics_time_series(hours as i64).await?;

        Ok(metrics.into_iter().map(SyncHealthMetric::from).collect())
    }

    /// Get sync health alerts with optional filtering
    async fn sync_health_alerts(
        &self,
        ctx: &Context<'_>,
        #[graphql(desc = "Status filter: 'active' or 'resolved' (default: all)")] status: Option<String>,
        #[graphql(desc = "Maximum number of alerts to return (default: 20)")] limit: Option<i32>,
    ) -> Result<Vec<SyncHealthAlert>> {
        let user_ctx = ctx.data::<UserContext>()?;
        let db = ctx.data::<Arc<DatabaseConnection>>()?;

        // Check permission
        let permission_checker = PermissionChecker::new((**db).clone());
        permission_checker
            .require(user_ctx, SyncPermission::ViewSyncHistory)
            .await?;

        let unresolved_only = status.as_deref() == Some("active");
        let max_limit = limit.unwrap_or(20);

        let monitor = HealthMonitor::new(db.clone());
        let alerts = monitor
            .get_recent_alerts(max_limit as u64, unresolved_only)
            .await?;

        Ok(alerts.into_iter().map(SyncHealthAlert::from).collect())
    }
}

/// Sync health status snapshot
#[derive(Debug, Clone)]
pub struct SyncHealthStatus {
    pub uptime_percentage: f64,
    pub avg_sync_duration_ms: i32,
    pub total_syncs_24h: i32,
    pub success_rate: f64,
    pub error_rate: f64,
    pub last_successful_sync: Option<DateTime<Utc>>,
    pub current_status: String,
    pub active_alerts_count: i32,
}

#[Object]
impl SyncHealthStatus {
    async fn uptime_percentage(&self) -> f64 {
        self.uptime_percentage
    }

    async fn avg_sync_duration_ms(&self) -> i32 {
        self.avg_sync_duration_ms
    }

    async fn total_syncs_24h(&self) -> i32 {
        self.total_syncs_24h
    }

    async fn success_rate(&self) -> f64 {
        self.success_rate
    }

    async fn error_rate(&self) -> f64 {
        self.error_rate
    }

    async fn last_successful_sync(&self) -> Option<DateTime<Utc>> {
        self.last_successful_sync
    }

    async fn current_status(&self) -> &str {
        &self.current_status
    }

    async fn active_alerts_count(&self) -> i32 {
        self.active_alerts_count
    }
}

impl From<SyncHealthSnapshot> for SyncHealthStatus {
    fn from(snapshot: SyncHealthSnapshot) -> Self {
        Self {
            uptime_percentage: snapshot.uptime_percentage,
            avg_sync_duration_ms: snapshot.avg_sync_duration_ms as i32,
            total_syncs_24h: snapshot.total_syncs_24h as i32,
            success_rate: snapshot.success_rate,
            error_rate: snapshot.error_rate,
            last_successful_sync: snapshot.last_successful_sync,
            current_status: snapshot.current_status,
            active_alerts_count: snapshot.active_alerts_count as i32,
        }
    }
}

/// Sync health metric data point
#[derive(Debug, Clone)]
pub struct SyncHealthMetric {
    pub id: String,
    pub recorded_at: DateTime<Utc>,
    pub sync_duration_ms: Option<i32>,
    pub records_processed: Option<i32>,
    pub errors_count: i32,
    pub connection_status: String,
    pub entity_type: Option<String>,
    pub sync_direction: Option<String>,
}

#[Object]
impl SyncHealthMetric {
    async fn id(&self) -> &str {
        &self.id
    }

    async fn recorded_at(&self) -> DateTime<Utc> {
        self.recorded_at
    }

    async fn sync_duration_ms(&self) -> Option<i32> {
        self.sync_duration_ms
    }

    async fn records_processed(&self) -> Option<i32> {
        self.records_processed
    }

    async fn errors_count(&self) -> i32 {
        self.errors_count
    }

    async fn connection_status(&self) -> &str {
        &self.connection_status
    }

    async fn entity_type(&self) -> Option<&str> {
        self.entity_type.as_deref()
    }

    async fn sync_direction(&self) -> Option<&str> {
        self.sync_direction.as_deref()
    }
}

impl From<sync_health_metrics::Model> for SyncHealthMetric {
    fn from(model: sync_health_metrics::Model) -> Self {
        Self {
            id: model.id.to_string(),
            recorded_at: model.recorded_at.with_timezone(&Utc),
            sync_duration_ms: model.sync_duration_ms,
            records_processed: model.records_processed,
            errors_count: model.errors_count,
            connection_status: model.connection_status,
            entity_type: model.entity_type,
            sync_direction: model.sync_direction,
        }
    }
}

/// Sync health alert
#[derive(Debug, Clone)]
pub struct SyncHealthAlert {
    pub id: String,
    pub alert_type: String,
    pub severity: String,
    pub message: String,
    pub triggered_at: DateTime<Utc>,
    pub resolved_at: Option<DateTime<Utc>>,
    pub entity_type: Option<String>,
}

#[Object]
impl SyncHealthAlert {
    async fn id(&self) -> &str {
        &self.id
    }

    async fn alert_type(&self) -> &str {
        &self.alert_type
    }

    async fn severity(&self) -> &str {
        &self.severity
    }

    async fn message(&self) -> &str {
        &self.message
    }

    async fn triggered_at(&self) -> DateTime<Utc> {
        self.triggered_at
    }

    async fn resolved_at(&self) -> Option<DateTime<Utc>> {
        self.resolved_at
    }

    async fn entity_type(&self) -> Option<&str> {
        self.entity_type.as_deref()
    }

    async fn is_resolved(&self) -> bool {
        self.resolved_at.is_some()
    }
}

impl From<sync_health_alerts::Model> for SyncHealthAlert {
    fn from(model: sync_health_alerts::Model) -> Self {
        Self {
            id: model.id.to_string(),
            alert_type: model.alert_type,
            severity: model.severity,
            message: model.message,
            triggered_at: model.triggered_at.with_timezone(&Utc),
            resolved_at: model.resolved_at.map(|dt| dt.with_timezone(&Utc)),
            entity_type: model.entity_type,
        }
    }
}
