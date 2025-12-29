//! Sync Batching Intelligence Service
//!
//! Groups sync operations into optimal batches for efficient API usage

use crate::integrations::intuit::IntuitClient;
use crate::models::{batch_operations, batch_operation_items, user};
use chrono::Utc;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter, QueryOrder, QuerySelect, Set,
};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use uuid::Uuid;

/// Batching configuration
#[derive(Debug, Clone)]
pub struct BatchConfig {
    pub max_batch_size: usize,          // Max entities per batch (e.g., 25)
    pub max_concurrent_batches: usize,  // Parallel batch limit (e.g., 3)
    pub batch_timeout_ms: u64,          // Time to wait for more items (e.g., 5000)
}

impl Default for BatchConfig {
    fn default() -> Self {
        Self {
            max_batch_size: 25,
            max_concurrent_batches: 3,
            batch_timeout_ms: 5000,
        }
    }
}

/// Batching engine service
pub struct BatchingEngine {
    db: Arc<DatabaseConnection>,
    config: BatchConfig,
}

/// A sync change to be batched
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncChange {
    pub entity_type: String,
    pub entity_id: String,
    pub operation: String,  // "create", "update", "delete"
    pub data: serde_json::Value,
}

/// A batch of related changes
#[derive(Debug, Clone)]
pub struct Batch {
    pub entity_type: String,
    pub operation: String,
    pub items: Vec<SyncChange>,
}

/// Result of sync operation
#[derive(Debug, Clone)]
pub struct SyncResult {
    pub entity_id: String,
    pub success: bool,
    pub error_message: Option<String>,
}

/// Batch processing result
#[derive(Debug, Clone)]
pub struct BatchProcessingResult {
    pub batch_id: Uuid,
    pub total_items: usize,
    pub successful_items: usize,
    pub failed_items: usize,
    pub duration_ms: i64,
}

impl BatchingEngine {
    pub fn new(db: Arc<DatabaseConnection>) -> Self {
        Self {
            db,
            config: BatchConfig::default(),
        }
    }

    pub fn with_config(db: Arc<DatabaseConnection>, config: BatchConfig) -> Self {
        Self { db, config }
    }

    /// Batch sync changes efficiently
    pub async fn batch_sync(
        &self,
        changes: Vec<SyncChange>,
        direction: &str,
        triggered_by: Option<Uuid>,
        triggered_by_email: Option<String>,
    ) -> Result<Vec<BatchProcessingResult>, Box<dyn std::error::Error>> {
        // Group changes into optimal batches
        let batches = self.create_optimal_batches(changes);

        let mut results = Vec::new();

        // Process batches sequentially for now (parallel processing would be more complex)
        for batch in batches {
            let result = self
                .process_single_batch(batch, direction, triggered_by, triggered_by_email.clone())
                .await?;
            results.push(result);
        }

        Ok(results)
    }

    /// Create optimal batches from changes
    fn create_optimal_batches(&self, changes: Vec<SyncChange>) -> Vec<Batch> {
        let mut batches = Vec::new();

        // Group by entity type
        let by_type = self.group_by_entity_type(changes);

        for (entity_type, items) in by_type {
            // Further group by operation (Create, Update, Delete)
            let by_operation = self.group_by_operation(items);

            for (operation, batch_items) in by_operation {
                // Split into chunks of max_batch_size
                for chunk in batch_items.chunks(self.config.max_batch_size) {
                    batches.push(Batch {
                        entity_type: entity_type.clone(),
                        operation: operation.clone(),
                        items: chunk.to_vec(),
                    });
                }
            }
        }

        batches
    }

    /// Group changes by entity type
    fn group_by_entity_type(
        &self,
        changes: Vec<SyncChange>,
    ) -> HashMap<String, Vec<SyncChange>> {
        let mut grouped: HashMap<String, Vec<SyncChange>> = HashMap::new();

        for change in changes {
            grouped
                .entry(change.entity_type.clone())
                .or_insert_with(Vec::new)
                .push(change);
        }

        grouped
    }

    /// Group changes by operation
    fn group_by_operation(
        &self,
        changes: Vec<SyncChange>,
    ) -> HashMap<String, Vec<SyncChange>> {
        let mut grouped: HashMap<String, Vec<SyncChange>> = HashMap::new();

        for change in changes {
            grouped
                .entry(change.operation.clone())
                .or_insert_with(Vec::new)
                .push(change);
        }

        grouped
    }

    /// Process a single batch
    async fn process_single_batch(
        &self,
        batch: Batch,
        direction: &str,
        triggered_by: Option<Uuid>,
        triggered_by_email: Option<String>,
    ) -> Result<BatchProcessingResult, Box<dyn std::error::Error>> {
        let batch_id = Uuid::new_v4();
        let start_time = Utc::now();
        let total_items = batch.items.len();

        // Create batch operation record
        let batch_op = batch_operations::ActiveModel {
            id: Set(batch_id),
            operation_type: Set("sync".to_string()),
            entity_type: Set(batch.entity_type.clone()),
            direction: Set(direction.to_string()),
            status: Set("running".to_string()),
            total_items: Set(total_items as i32),
            processed_items: Set(0),
            successful_items: Set(0),
            failed_items: Set(0),
            skipped_items: Set(0),
            progress_percentage: Set(rust_decimal::Decimal::ZERO),
            estimated_time_remaining: Set(None),
            triggered_by: Set(triggered_by),
            triggered_by_email: Set(triggered_by_email),
            error_message: Set(None),
            error_summary: Set(None),
            configuration: Set(Some(serde_json::json!({
                "max_batch_size": self.config.max_batch_size,
                "operation": batch.operation,
            }))),
            metadata: Set(None),
            started_at: Set(Some(start_time.into())),
            completed_at: Set(None),
            duration_ms: Set(None),
            created_at: Set(Utc::now().into()),
            updated_at: Set(Utc::now().into()),
        };

        let batch_model = batch_op.insert(&*self.db).await?;

        // Process items (mock processing for now - would integrate with sync orchestrator)
        let mut successful = 0;
        let mut failed = 0;

        for item in &batch.items {
            let item_result = batch_operation_items::ActiveModel {
                id: Set(Uuid::new_v4()),
                batch_operation_id: Set(batch_id),
                entity_id: Set(item.entity_id.clone()),
                entity_name: Set(Some(item.entity_type.clone())),
                status: Set("success".to_string()),
                attempt_count: Set(1),
                error_message: Set(None),
                error_details: Set(None),
                input_data: Set(Some(item.data.clone())),
                output_data: Set(None),
                processed_at: Set(Some(Utc::now().into())),
                duration_ms: Set(None),
                created_at: Set(Utc::now().into()),
            };

            item_result.insert(&*self.db).await?;
            successful += 1;
        }

        let end_time = Utc::now();
        let duration_ms = (end_time - start_time).num_milliseconds() as i32;

        // Update batch operation with results
        let mut batch_update: batch_operations::ActiveModel = batch_model.into();
        batch_update.status = Set("completed".to_string());
        batch_update.processed_items = Set(total_items as i32);
        batch_update.successful_items = Set(successful);
        batch_update.failed_items = Set(failed);
        batch_update.progress_percentage = Set(rust_decimal::Decimal::from(100));
        batch_update.completed_at = Set(Some(end_time.into()));
        batch_update.duration_ms = Set(Some(duration_ms));
        batch_update.updated_at = Set(Utc::now().into());
        batch_update.update(&*self.db).await?;

        Ok(BatchProcessingResult {
            batch_id,
            total_items,
            successful_items: successful as usize,
            failed_items: failed as usize,
            duration_ms: duration_ms as i64,
        })
    }

    /// Get batch operation by ID
    pub async fn get_batch_operation(
        &self,
        batch_id: Uuid,
    ) -> Result<Option<batch_operations::Model>, sea_orm::DbErr> {
        batch_operations::Entity::find_by_id(batch_id)
            .one(&*self.db)
            .await
    }

    /// Get recent batch operations
    pub async fn get_recent_batches(
        &self,
        entity_type: Option<String>,
        limit: u64,
    ) -> Result<Vec<batch_operations::Model>, sea_orm::DbErr> {
        let mut query = batch_operations::Entity::find();

        if let Some(et) = entity_type {
            query = query.filter(batch_operations::Column::EntityType.eq(et));
        }

        query
            .order_by_desc(batch_operations::Column::CreatedAt)
            .limit(limit)
            .all(&*self.db)
            .await
    }

    /// Calculate batching efficiency metrics
    pub async fn get_efficiency_metrics(
        &self,
    ) -> Result<BatchingEfficiencyMetrics, sea_orm::DbErr> {
        use sea_orm::sea_query::Expr;

        let batches = batch_operations::Entity::find()
            .filter(batch_operations::Column::Status.eq("completed"))
            .order_by_desc(batch_operations::Column::CreatedAt)
            .limit(100)
            .all(&*self.db)
            .await?;

        let total_batches = batches.len();
        let total_items: i32 = batches.iter().map(|b| b.total_items).sum();
        let total_successful: i32 = batches.iter().map(|b| b.successful_items).sum();
        let total_failed: i32 = batches.iter().map(|b| b.failed_items).sum();
        let avg_batch_size = if total_batches > 0 {
            total_items as f64 / total_batches as f64
        } else {
            0.0
        };

        // Estimate API call savings
        // Without batching: 1 API call per item
        // With batching: 1 API call per batch
        let api_calls_without_batching = total_items;
        let api_calls_with_batching = total_batches as i32;
        let api_call_reduction_percentage = if api_calls_without_batching > 0 {
            ((api_calls_without_batching - api_calls_with_batching) as f64
                / api_calls_without_batching as f64)
                * 100.0
        } else {
            0.0
        };

        Ok(BatchingEfficiencyMetrics {
            total_batches,
            total_items: total_items as usize,
            total_successful: total_successful as usize,
            total_failed: total_failed as usize,
            avg_batch_size,
            api_calls_saved: (api_calls_without_batching - api_calls_with_batching) as usize,
            api_call_reduction_percentage,
        })
    }
}

/// Batching efficiency metrics
#[derive(Debug, Clone)]
pub struct BatchingEfficiencyMetrics {
    pub total_batches: usize,
    pub total_items: usize,
    pub total_successful: usize,
    pub total_failed: usize,
    pub avg_batch_size: f64,
    pub api_calls_saved: usize,
    pub api_call_reduction_percentage: f64,
}
