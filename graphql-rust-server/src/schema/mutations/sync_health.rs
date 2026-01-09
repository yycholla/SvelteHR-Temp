//! Sync Health Monitoring GraphQL Mutations

use async_graphql::{Context, Object, Result};
use sea_orm::DatabaseConnection;
use std::sync::Arc;
use uuid::Uuid;

use crate::auth::UserContext;
use crate::services::health_monitor::HealthMonitor;
use crate::services::permission_checker::{PermissionChecker, SyncPermission};

#[derive(Default)]
pub struct SyncHealthMutations;

#[Object]
impl SyncHealthMutations {
    /// Resolve a health alert by ID
    async fn resolve_health_alert(
        &self,
        ctx: &Context<'_>,
        #[graphql(desc = "Alert ID to resolve")] alert_id: String,
    ) -> Result<ResolveAlertResponse> {
        let user_ctx = ctx.data::<UserContext>()?;
        let db = ctx.data::<DatabaseConnection>()?;

        // Check permission
        let permission_checker = PermissionChecker::new(db.clone());
        permission_checker
            .require(user_ctx, SyncPermission::ManageSyncSchedules)
            .await?;

        // Parse alert ID
        let alert_uuid = Uuid::parse_str(&alert_id)
            .map_err(|_| async_graphql::Error::new("Invalid alert ID format"))?;

        // Resolve the alert
        let monitor = HealthMonitor::new(Arc::new(db.clone()));
        monitor.resolve_alert(alert_uuid).await?;

        Ok(ResolveAlertResponse {
            success: true,
            message: "Alert resolved successfully".to_string(),
            alert_id,
        })
    }

    /// Delete a health alert by ID
    async fn delete_health_alert(
        &self,
        ctx: &Context<'_>,
        #[graphql(desc = "Alert ID to delete")] alert_id: String,
    ) -> Result<DeleteAlertResponse> {
        let user_ctx = ctx.data::<UserContext>()?;
        let db = ctx.data::<DatabaseConnection>()?;

        // Check permission
        let permission_checker = PermissionChecker::new(db.clone());
        permission_checker
            .require(user_ctx, SyncPermission::ManageSyncSchedules)
            .await?;

        // Parse alert ID
        let alert_uuid = Uuid::parse_str(&alert_id)
            .map_err(|_| async_graphql::Error::new("Invalid alert ID format"))?;

        // Delete the alert
        let monitor = HealthMonitor::new(Arc::new(db.clone()));
        monitor.delete_alert(alert_uuid).await?;

        Ok(DeleteAlertResponse {
            success: true,
            message: "Alert deleted successfully".to_string(),
            alert_id,
        })
    }

    /// Manually trigger a health check and alert evaluation
    async fn test_health_check(&self, ctx: &Context<'_>) -> Result<HealthCheckResponse> {
        let user_ctx = ctx.data::<UserContext>()?;
        let db = ctx.data::<DatabaseConnection>()?;

        // Check permission
        let permission_checker = PermissionChecker::new(db.clone());
        permission_checker
            .require(user_ctx, SyncPermission::ManageSyncSchedules)
            .await?;

        // Run health check
        let monitor = HealthMonitor::new(Arc::new(db.clone()));
        let snapshot = monitor.get_health_snapshot().await?;
        let triggered_alerts = monitor.check_alert_conditions().await?;

        Ok(HealthCheckResponse {
            success: true,
            current_status: snapshot.current_status,
            alerts_triggered: triggered_alerts.len() as i32,
            uptime_percentage: snapshot.uptime_percentage,
            error_rate: snapshot.error_rate,
        })
    }

    /// Create a test alert for demonstration purposes
    async fn create_test_alert(&self, ctx: &Context<'_>) -> Result<ResolveAlertResponse> {
        let user_ctx = ctx.data::<UserContext>()?;
        let db = ctx.data::<DatabaseConnection>()?;

        // Check permission
        let permission_checker = PermissionChecker::new(db.clone());
        permission_checker
            .require(user_ctx, SyncPermission::ManageSyncSchedules)
            .await?;

        // Create a test alert
        use crate::models::sync_health_alerts;
        use chrono::Utc;
        use sea_orm::{ActiveModelTrait, Set};
        use serde_json::json;

        let test_alert = sync_health_alerts::ActiveModel {
            id: Set(Uuid::new_v4()),
            alert_type: Set("slow_sync".to_string()),
            severity: Set("warning".to_string()),
            message: Set("TEST ALERT: This is a demonstration alert for testing the dismiss functionality".to_string()),
            triggered_at: Set(Utc::now().into()),
            resolved_at: Set(None),
            entity_type: Set(Some("test".to_string())),
            metric_snapshot: Set(Some(json!({
                "test": true,
                "avg_duration_ms": 150000,
                "threshold_ms": 120000,
                "created_at": Utc::now().to_rfc3339(),
            }))),
            notified_users: Set(None),
            created_at: Set(Utc::now().into()),
            updated_at: Set(Utc::now().into()),
        };

        let result = test_alert.insert(db).await?;

        Ok(ResolveAlertResponse {
            success: true,
            message: "Test alert created successfully".to_string(),
            alert_id: result.id.to_string(),
        })
    }
}

/// Response for resolve alert mutation
#[derive(Debug, Clone)]
pub struct ResolveAlertResponse {
    pub success: bool,
    pub message: String,
    pub alert_id: String,
}

#[Object]
impl ResolveAlertResponse {
    async fn success(&self) -> bool {
        self.success
    }

    async fn message(&self) -> &str {
        &self.message
    }

    async fn alert_id(&self) -> &str {
        &self.alert_id
    }
}

/// Response for delete alert mutation
#[derive(Debug, Clone)]
pub struct DeleteAlertResponse {
    pub success: bool,
    pub message: String,
    pub alert_id: String,
}

#[Object]
impl DeleteAlertResponse {
    async fn success(&self) -> bool {
        self.success
    }

    async fn message(&self) -> &str {
        &self.message
    }

    async fn alert_id(&self) -> &str {
        &self.alert_id
    }
}

/// Response for health check mutation
#[derive(Debug, Clone)]
pub struct HealthCheckResponse {
    pub success: bool,
    pub current_status: String,
    pub alerts_triggered: i32,
    pub uptime_percentage: f64,
    pub error_rate: f64,
}

#[Object]
impl HealthCheckResponse {
    async fn success(&self) -> bool {
        self.success
    }

    async fn current_status(&self) -> &str {
        &self.current_status
    }

    async fn alerts_triggered(&self) -> i32 {
        self.alerts_triggered
    }

    async fn uptime_percentage(&self) -> f64 {
        self.uptime_percentage
    }

    async fn error_rate(&self) -> f64 {
        self.error_rate
    }
}
