//! Batch Operations GraphQL Queries

use async_graphql::{Context, Object, Result};
use chrono::{DateTime, Utc};

use crate::auth::UserContext;
use crate::services::batching_engine::{BatchingEngine, BatchingEfficiencyMetrics as ServiceMetrics};
use crate::services::permission_checker::{PermissionChecker, SyncPermission};
use crate::models::batch_operations;

use std::sync::Arc;
use uuid::Uuid;

#[derive(Default)]
pub struct BatchOperationsQueries;

#[Object]
impl BatchOperationsQueries {
    /// Get a batch operation by ID
    async fn batch_operation(
        &self,
        ctx: &Context<'_>,
        batch_id: String,
    ) -> Result<Option<BatchOperation>> {
        let user_ctx = ctx.data::<UserContext>()?;
        let db = ctx.data::<sea_orm::DatabaseConnection>()?;

        // Check permission
        let permission_checker = PermissionChecker::new(db.clone());
        permission_checker
            .require(user_ctx, SyncPermission::ViewSyncHistory)
            .await?;

        let engine = BatchingEngine::new(Arc::new(db.clone()));
        let batch = engine
            .get_batch_operation(Uuid::parse_str(&batch_id)?)
            .await?;

        Ok(batch.map(BatchOperation::from))
    }

    /// Get recent batch operations
    async fn batch_operations(
        &self,
        ctx: &Context<'_>,
        entity_type: Option<String>,
        limit: Option<i32>,
    ) -> Result<Vec<BatchOperation>> {
        let user_ctx = ctx.data::<UserContext>()?;
        let db = ctx.data::<sea_orm::DatabaseConnection>()?;

        // Check permission
        let permission_checker = PermissionChecker::new(db.clone());
        permission_checker
            .require(user_ctx, SyncPermission::ViewSyncHistory)
            .await?;

        let engine = BatchingEngine::new(Arc::new(db.clone()));
        let batches = engine
            .get_recent_batches(
                entity_type,
                limit.unwrap_or(10).max(1).min(50) as u64,
            )
            .await?;

        Ok(batches.into_iter().map(BatchOperation::from).collect())
    }

    /// Get batching efficiency metrics
    async fn batching_efficiency(&self, ctx: &Context<'_>) -> Result<BatchingEfficiencyMetrics> {
        let user_ctx = ctx.data::<UserContext>()?;
        let db = ctx.data::<sea_orm::DatabaseConnection>()?;

        // Check permission
        let permission_checker = PermissionChecker::new(db.clone());
        permission_checker
            .require(user_ctx, SyncPermission::ViewSyncHistory)
            .await?;

        let engine = BatchingEngine::new(Arc::new(db.clone()));
        let metrics = engine.get_efficiency_metrics().await?;

        Ok(BatchingEfficiencyMetrics::from(metrics))
    }
}

/// Batch operation
#[derive(Debug, Clone)]
pub struct BatchOperation {
    pub id: String,
    pub operation_type: String,
    pub entity_type: String,
    pub direction: String,
    pub status: String,
    pub total_items: i32,
    pub processed_items: i32,
    pub successful_items: i32,
    pub failed_items: i32,
    pub skipped_items: i32,
    pub progress_percentage: String,
    pub estimated_time_remaining: Option<i32>,
    pub triggered_by: Option<String>,
    pub triggered_by_email: Option<String>,
    pub error_message: Option<String>,
    pub configuration: Option<serde_json::Value>,
    pub metadata: Option<serde_json::Value>,
    pub started_at: Option<DateTime<Utc>>,
    pub completed_at: Option<DateTime<Utc>>,
    pub duration_ms: Option<i32>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[Object]
impl BatchOperation {
    async fn id(&self) -> &str { &self.id }
    async fn operation_type(&self) -> &str { &self.operation_type }
    async fn entity_type(&self) -> &str { &self.entity_type }
    async fn direction(&self) -> &str { &self.direction }
    async fn status(&self) -> &str { &self.status }
    async fn total_items(&self) -> i32 { self.total_items }
    async fn processed_items(&self) -> i32 { self.processed_items }
    async fn successful_items(&self) -> i32 { self.successful_items }
    async fn failed_items(&self) -> i32 { self.failed_items }
    async fn skipped_items(&self) -> i32 { self.skipped_items }
    async fn progress_percentage(&self) -> &str { &self.progress_percentage }
    async fn estimated_time_remaining(&self) -> Option<i32> { self.estimated_time_remaining }
    async fn triggered_by(&self) -> Option<&str> { self.triggered_by.as_deref() }
    async fn triggered_by_email(&self) -> Option<&str> { self.triggered_by_email.as_deref() }
    async fn error_message(&self) -> Option<&str> { self.error_message.as_deref() }
    async fn configuration(&self) -> Option<&serde_json::Value> { self.configuration.as_ref() }
    async fn metadata(&self) -> Option<&serde_json::Value> { self.metadata.as_ref() }
    async fn started_at(&self) -> Option<DateTime<Utc>> { self.started_at }
    async fn completed_at(&self) -> Option<DateTime<Utc>> { self.completed_at }
    async fn duration_ms(&self) -> Option<i32> { self.duration_ms }
    async fn created_at(&self) -> DateTime<Utc> { self.created_at }
    async fn updated_at(&self) -> DateTime<Utc> { self.updated_at }
}

impl From<batch_operations::Model> for BatchOperation {
    fn from(model: batch_operations::Model) -> Self {
        Self {
            id: model.id.to_string(),
            operation_type: model.operation_type,
            entity_type: model.entity_type,
            direction: model.direction,
            status: model.status,
            total_items: model.total_items,
            processed_items: model.processed_items,
            successful_items: model.successful_items,
            failed_items: model.failed_items,
            skipped_items: model.skipped_items,
            progress_percentage: model.progress_percentage.to_string(),
            estimated_time_remaining: model.estimated_time_remaining,
            triggered_by: model.triggered_by.map(|id| id.to_string()),
            triggered_by_email: model.triggered_by_email,
            error_message: model.error_message,
            configuration: model.configuration,
            metadata: model.metadata,
            started_at: model.started_at.map(|dt| dt.with_timezone(&Utc)),
            completed_at: model.completed_at.map(|dt| dt.with_timezone(&Utc)),
            duration_ms: model.duration_ms,
            created_at: model.created_at.with_timezone(&Utc),
            updated_at: model.updated_at.with_timezone(&Utc),
        }
    }
}

/// Batching efficiency metrics
#[derive(Debug, Clone)]
pub struct BatchingEfficiencyMetrics {
    pub total_batches: i32,
    pub total_items: i32,
    pub total_successful: i32,
    pub total_failed: i32,
    pub avg_batch_size: f64,
    pub api_calls_saved: i32,
    pub api_call_reduction_percentage: f64,
}

#[Object]
impl BatchingEfficiencyMetrics {
    async fn total_batches(&self) -> i32 { self.total_batches }
    async fn total_items(&self) -> i32 { self.total_items }
    async fn total_successful(&self) -> i32 { self.total_successful }
    async fn total_failed(&self) -> i32 { self.total_failed }
    async fn avg_batch_size(&self) -> f64 { self.avg_batch_size }
    async fn api_calls_saved(&self) -> i32 { self.api_calls_saved }
    async fn api_call_reduction_percentage(&self) -> f64 { self.api_call_reduction_percentage }
}

impl From<ServiceMetrics> for BatchingEfficiencyMetrics {
    fn from(metrics: ServiceMetrics) -> Self {
        Self {
            total_batches: metrics.total_batches as i32,
            total_items: metrics.total_items as i32,
            total_successful: metrics.total_successful as i32,
            total_failed: metrics.total_failed as i32,
            avg_batch_size: metrics.avg_batch_size,
            api_calls_saved: metrics.api_calls_saved as i32,
            api_call_reduction_percentage: metrics.api_call_reduction_percentage,
        }
    }
}
