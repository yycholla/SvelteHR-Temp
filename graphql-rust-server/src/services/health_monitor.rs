//! Sync Health Monitoring Service
//!
//! Tracks sync performance, uptime, and triggers alerts for degraded health

use crate::models::{
    sync_health_alerts, sync_health_metrics, intuit_sync_log,
};
use chrono::{DateTime, Duration, Utc};
use sea_orm::{
    ActiveModelTrait, ColumnTrait, DatabaseConnection, EntityTrait, PaginatorTrait, QueryFilter, QueryOrder,
    QuerySelect, Set,
};
use serde_json::json;
use std::sync::Arc;
use uuid::Uuid;

/// Health monitoring service for QuickBooks sync operations
pub struct HealthMonitor {
    db: Arc<DatabaseConnection>,
}

/// Aggregated health metrics for dashboards
#[derive(Debug, Clone)]
pub struct SyncHealthSnapshot {
    pub uptime_percentage: f64,
    pub avg_sync_duration_ms: i64,
    pub total_syncs_24h: i64,
    pub success_rate: f64,
    pub error_rate: f64,
    pub last_successful_sync: Option<DateTime<Utc>>,
    pub current_status: String,
    pub active_alerts_count: i64,
}

/// Alert configuration thresholds
#[derive(Debug, Clone)]
pub struct AlertThresholds {
    pub max_error_rate: f64,          // 5% = 0.05
    pub max_avg_duration_ms: i64,     // 2x average
    pub max_consecutive_failures: i32, // 3
    pub min_api_quota_percentage: f64, // 20% = 0.20
}

impl Default for AlertThresholds {
    fn default() -> Self {
        Self {
            max_error_rate: 0.05,          // 5%
            max_avg_duration_ms: 120000,    // 2 minutes
            max_consecutive_failures: 3,
            min_api_quota_percentage: 0.20, // 20%
        }
    }
}

impl HealthMonitor {
    pub fn new(db: Arc<DatabaseConnection>) -> Self {
        Self { db }
    }

    /// Record a health metric snapshot after a sync operation
    pub async fn record_sync_metric(
        &self,
        sync_duration_ms: Option<i32>,
        records_processed: Option<i32>,
        errors_count: i32,
        api_calls_used: Option<i32>,
        connection_status: &str,
        entity_type: Option<String>,
        sync_direction: Option<String>,
    ) -> Result<Uuid, sea_orm::DbErr> {
        let metric = sync_health_metrics::ActiveModel {
            id: Set(Uuid::new_v4()),
            recorded_at: Set(Utc::now().into()),
            sync_duration_ms: Set(sync_duration_ms),
            records_processed: Set(records_processed),
            errors_count: Set(errors_count),
            api_calls_used: Set(api_calls_used),
            connection_status: Set(connection_status.to_string()),
            entity_type: Set(entity_type),
            sync_direction: Set(sync_direction),
            success_rate: Set(None), // Calculated by aggregation
            metadata: Set(Some(json!({
                "timestamp": Utc::now().to_rfc3339(),
            }))),
        };

        let result = metric.insert(&*self.db).await?;
        Ok(result.id)
    }

    /// Get current health snapshot for dashboards
    pub async fn get_health_snapshot(&self) -> Result<SyncHealthSnapshot, sea_orm::DbErr> {
        let now = Utc::now();
        let yesterday = now - Duration::hours(24);

        // Get sync logs from last 24 hours
        let recent_syncs = intuit_sync_log::Entity::find()
            .filter(intuit_sync_log::Column::CreatedAt.gte(yesterday))
            .all(&*self.db)
            .await?;

        let total_syncs = recent_syncs.len() as i64;
        let successful_syncs = recent_syncs
            .iter()
            .filter(|s| s.status.to_lowercase() == "success")
            .count() as i64;
        let failed_syncs = total_syncs - successful_syncs;

        let success_rate = if total_syncs > 0 {
            successful_syncs as f64 / total_syncs as f64
        } else {
            0.0
        };

        let error_rate = if total_syncs > 0 {
            failed_syncs as f64 / total_syncs as f64
        } else {
            0.0
        };

        // Calculate average sync duration
        let total_duration: i64 = recent_syncs
            .iter()
            .filter_map(|s| s.sync_duration_ms)
            .map(|d| d as i64)
            .sum();
        let avg_duration = if total_syncs > 0 {
            total_duration / total_syncs
        } else {
            0
        };

        // Get last successful sync
        let last_successful = recent_syncs
            .iter()
            .filter(|s| s.status.to_lowercase() == "success")
            .max_by_key(|s| s.created_at)
            .map(|s| s.created_at.with_timezone(&Utc));

        // Determine current status
        let current_status = self.calculate_health_status(success_rate, error_rate).await;

        // Count active alerts
        let active_alerts = sync_health_alerts::Entity::find()
            .filter(sync_health_alerts::Column::ResolvedAt.is_null())
            .count(&*self.db)
            .await?;

        Ok(SyncHealthSnapshot {
            uptime_percentage: success_rate * 100.0,
            avg_sync_duration_ms: avg_duration,
            total_syncs_24h: total_syncs,
            success_rate,
            error_rate,
            last_successful_sync: last_successful,
            current_status,
            active_alerts_count: active_alerts as i64,
        })
    }

    /// Calculate health status based on metrics
    async fn calculate_health_status(&self, success_rate: f64, error_rate: f64) -> String {
        if error_rate > 0.10 {
            "down".to_string()
        } else if error_rate > 0.05 || success_rate < 0.95 {
            "degraded".to_string()
        } else {
            "healthy".to_string()
        }
    }

    /// Check for alert conditions and trigger alerts if needed
    pub async fn check_alert_conditions(&self) -> Result<Vec<Uuid>, sea_orm::DbErr> {
        let thresholds = AlertThresholds::default();
        let snapshot = self.get_health_snapshot().await?;
        let mut triggered_alerts = Vec::new();

        // Check high error rate
        if snapshot.error_rate > thresholds.max_error_rate {
            let alert_id = self
                .trigger_alert(
                    "high_error_rate",
                    "error",
                    &format!(
                        "Error rate ({:.1}%) exceeds threshold ({:.1}%)",
                        snapshot.error_rate * 100.0,
                        thresholds.max_error_rate * 100.0
                    ),
                    Some(json!({
                        "error_rate": snapshot.error_rate,
                        "threshold": thresholds.max_error_rate,
                    })),
                )
                .await?;
            triggered_alerts.push(alert_id);
        }

        // Check slow sync duration
        if snapshot.avg_sync_duration_ms > thresholds.max_avg_duration_ms {
            let alert_id = self
                .trigger_alert(
                    "slow_sync",
                    "warning",
                    &format!(
                        "Average sync duration ({}ms) exceeds threshold ({}ms)",
                        snapshot.avg_sync_duration_ms, thresholds.max_avg_duration_ms
                    ),
                    Some(json!({
                        "avg_duration_ms": snapshot.avg_sync_duration_ms,
                        "threshold_ms": thresholds.max_avg_duration_ms,
                    })),
                )
                .await?;
            triggered_alerts.push(alert_id);
        }

        // Check connection status
        if snapshot.current_status == "down" {
            let alert_id = self
                .trigger_alert(
                    "connection_down",
                    "critical",
                    "QuickBooks connection is down",
                    Some(json!({
                        "status": snapshot.current_status,
                        "uptime_percentage": snapshot.uptime_percentage,
                    })),
                )
                .await?;
            triggered_alerts.push(alert_id);
        }

        // Check consecutive failures
        let consecutive_failures = self.count_consecutive_failures().await?;
        if consecutive_failures >= thresholds.max_consecutive_failures {
            let alert_id = self
                .trigger_alert(
                    "consecutive_failures",
                    "critical",
                    &format!("{} consecutive sync failures detected", consecutive_failures),
                    Some(json!({
                        "consecutive_failures": consecutive_failures,
                        "threshold": thresholds.max_consecutive_failures,
                    })),
                )
                .await?;
            triggered_alerts.push(alert_id);
        }

        // Cleanup old resolved alerts (older than 7 days)
        if let Ok(deleted_count) = self.cleanup_old_resolved_alerts().await {
            if deleted_count > 0 {
                tracing::info!("Cleaned up {} old resolved alerts", deleted_count);
            }
        }

        Ok(triggered_alerts)
    }

    /// Trigger a health alert
    async fn trigger_alert(
        &self,
        alert_type: &str,
        severity: &str,
        message: &str,
        metric_snapshot: Option<serde_json::Value>,
    ) -> Result<Uuid, sea_orm::DbErr> {
        // Check if similar alert already exists and is unresolved
        let existing_alert = sync_health_alerts::Entity::find()
            .filter(sync_health_alerts::Column::AlertType.eq(alert_type))
            .filter(sync_health_alerts::Column::ResolvedAt.is_null())
            .one(&*self.db)
            .await?;

        if existing_alert.is_some() {
            // Don't create duplicate alerts
            return Ok(existing_alert.unwrap().id);
        }

        let alert = sync_health_alerts::ActiveModel {
            id: Set(Uuid::new_v4()),
            alert_type: Set(alert_type.to_string()),
            severity: Set(severity.to_string()),
            message: Set(message.to_string()),
            triggered_at: Set(Utc::now().into()),
            resolved_at: Set(None),
            entity_type: Set(None),
            metric_snapshot: Set(metric_snapshot),
            notified_users: Set(None),
            created_at: Set(Utc::now().into()),
            updated_at: Set(Utc::now().into()),
        };

        let result = alert.insert(&*self.db).await?;
        Ok(result.id)
    }

    /// Resolve an alert
    pub async fn resolve_alert(&self, alert_id: Uuid) -> Result<(), sea_orm::DbErr> {
        let alert = sync_health_alerts::Entity::find_by_id(alert_id)
            .one(&*self.db)
            .await?;

        if let Some(alert) = alert {
            let mut active_alert: sync_health_alerts::ActiveModel = alert.into();
            active_alert.resolved_at = Set(Some(Utc::now().into()));
            active_alert.updated_at = Set(Utc::now().into());
            active_alert.update(&*self.db).await?;
        }

        Ok(())
    }

    /// Delete an alert
    pub async fn delete_alert(&self, alert_id: Uuid) -> Result<(), sea_orm::DbErr> {
        sync_health_alerts::Entity::delete_by_id(alert_id)
            .exec(&*self.db)
            .await?;

        Ok(())
    }

    /// Clean up old resolved alerts (older than 7 days)
    pub async fn cleanup_old_resolved_alerts(&self) -> Result<u64, sea_orm::DbErr> {
        use sea_orm::QueryFilter;

        let cutoff_date = Utc::now() - chrono::Duration::days(7);

        let result = sync_health_alerts::Entity::delete_many()
            .filter(sync_health_alerts::Column::ResolvedAt.is_not_null())
            .filter(sync_health_alerts::Column::ResolvedAt.lt(cutoff_date))
            .exec(&*self.db)
            .await?;

        Ok(result.rows_affected)
    }

    /// Count consecutive sync failures
    async fn count_consecutive_failures(&self) -> Result<i32, sea_orm::DbErr> {
        let recent_syncs = intuit_sync_log::Entity::find()
            .order_by_desc(intuit_sync_log::Column::CreatedAt)
            .limit(10)
            .all(&*self.db)
            .await?;

        let mut consecutive = 0;
        for sync in recent_syncs {
            if sync.status.to_lowercase() == "failed" || sync.status.to_lowercase() == "error" {
                consecutive += 1;
            } else {
                break;
            }
        }

        Ok(consecutive)
    }

    /// Get recent alerts
    pub async fn get_recent_alerts(
        &self,
        limit: u64,
        unresolved_only: bool,
    ) -> Result<Vec<sync_health_alerts::Model>, sea_orm::DbErr> {
        let mut query = sync_health_alerts::Entity::find()
            .order_by_desc(sync_health_alerts::Column::TriggeredAt);

        if unresolved_only {
            query = query.filter(sync_health_alerts::Column::ResolvedAt.is_null());
        }

        query.limit(limit).all(&*self.db).await
    }

    /// Get metrics time series for charting
    pub async fn get_metrics_time_series(
        &self,
        hours: i64,
    ) -> Result<Vec<sync_health_metrics::Model>, sea_orm::DbErr> {
        let cutoff = Utc::now() - Duration::hours(hours);

        sync_health_metrics::Entity::find()
            .filter(sync_health_metrics::Column::RecordedAt.gte(cutoff))
            .order_by_asc(sync_health_metrics::Column::RecordedAt)
            .all(&*self.db)
            .await
    }
}
