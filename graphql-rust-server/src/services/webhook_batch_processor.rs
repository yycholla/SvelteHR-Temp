//! Webhook Batch Processing Service with Progress Tracking
//!
//! Processes webhook events in batches with real-time progress updates via SSE

use crate::integrations::intuit::IntuitClient;
use crate::models::webhook_events;
use crate::services::webhook_processor::WebhookProcessor;
use chrono::Utc;
use sea_orm::{ActiveModelTrait, ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter, QuerySelect, Set};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::mpsc;

/// Status of a batch processing job
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum BatchStatus {
    Queued,
    InProgress,
    Completed,
    Failed,
}

/// Status of an individual event in the batch
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum EventStatus {
    Pending,
    Processing,
    Completed,
    Failed,
}

/// Progress information for an individual webhook event
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EventProgress {
    pub event_id: String,
    pub entity_name: String,
    pub entity_id: String,
    pub event_type: String,
    pub status: EventStatus,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
    pub received_at: String,
}

/// Progress information for a batch processing job
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BatchProgress {
    pub batch_id: String,
    pub status: BatchStatus,
    pub processed_count: usize,
    pub successful_count: usize,
    pub failed_count: usize,
    pub total_count: usize,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub current_event_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_error: Option<String>,
    pub events: Vec<EventProgress>,
}

/// Webhook batch processor service
pub struct WebhookBatchProcessor {
    db: Arc<DatabaseConnection>,
}

impl WebhookBatchProcessor {
    /// Create a new webhook batch processor
    pub fn new(db: Arc<DatabaseConnection>) -> Self {
        Self { db }
    }

    /// Process a batch of webhook events with real-time progress updates
    ///
    /// # Arguments
    ///
    /// * `batch_id` - Unique identifier for this batch job
    /// * `limit` - Maximum number of pending events to process
    /// * `intuit_client` - QuickBooks API client for syncing data
    /// * `progress_tx` - Channel for sending progress updates
    ///
    /// # Returns
    ///
    /// Returns Ok with the final batch progress on success, or an error if the processing fails
    pub async fn process_batch_with_progress(
        &self,
        batch_id: String,
        limit: u64,
        intuit_client: &IntuitClient,
        progress_tx: mpsc::Sender<BatchProgress>,
    ) -> Result<BatchProgress, Box<dyn std::error::Error>> {
        // Get pending events
        let pending_events = webhook_events::Entity::find()
            .filter(webhook_events::Column::Status.eq("pending"))
            .limit(limit)
            .all(&*self.db)
            .await?;

        let total = pending_events.len();

        tracing::info!(
            batch_id = %batch_id,
            total_events = total,
            "Starting webhook batch processing"
        );

        // Initialize events list with all pending events
        let mut events: Vec<EventProgress> = pending_events
            .iter()
            .map(|event| EventProgress {
                event_id: event.id.to_string(),
                entity_name: event.entity_name.clone(),
                entity_id: event.entity_id.clone(),
                event_type: event.event_type.clone(),
                status: EventStatus::Pending,
                error: None,
                received_at: event.received_at.to_rfc3339(),
            })
            .collect();

        // Send initial progress (queued)
        let initial_progress = BatchProgress {
            batch_id: batch_id.clone(),
            status: BatchStatus::Queued,
            processed_count: 0,
            successful_count: 0,
            failed_count: 0,
            total_count: total,
            current_event_id: None,
            last_error: None,
            events: events.clone(),
        };

        if let Err(e) = progress_tx.send(initial_progress).await {
            tracing::error!("Failed to send initial progress: {}", e);
        }

        // If no events to process, return immediately as completed
        if total == 0 {
            let final_progress = BatchProgress {
                batch_id: batch_id.clone(),
                status: BatchStatus::Completed,
                processed_count: 0,
                successful_count: 0,
                failed_count: 0,
                total_count: 0,
                current_event_id: None,
                last_error: Some("No pending events to process".to_string()),
                events: vec![],
            };

            let _ = progress_tx.send(final_progress.clone()).await;
            return Ok(final_progress);
        }

        let mut processed = 0;
        let mut successful = 0;
        let mut failed = 0;
        let mut last_error: Option<String> = None;

        // Create webhook processor for handling individual events
        let processor = WebhookProcessor::new(self.db.clone());

        // Process each event
        for (index, event) in pending_events.iter().enumerate() {
            let event_id = event.id.to_string();

            // Update event status to PROCESSING
            if let Some(event_progress) = events.get_mut(index) {
                event_progress.status = EventStatus::Processing;
            }

            // Send progress update before processing
            let progress = BatchProgress {
                batch_id: batch_id.clone(),
                status: BatchStatus::InProgress,
                processed_count: processed,
                successful_count: successful,
                failed_count: failed,
                total_count: total,
                current_event_id: Some(event_id.clone()),
                last_error: last_error.clone(),
                events: events.clone(),
            };

            if let Err(e) = progress_tx.send(progress).await {
                tracing::error!("Failed to send progress update: {}", e);
            }

            // Process the event
            match processor.process_event(event, intuit_client).await {
                Ok(_) => {
                    // Mark as completed
                    let mut active_event: webhook_events::ActiveModel = event.clone().into();
                    active_event.status = Set("completed".to_string());
                    active_event.processed_at = Set(Some(Utc::now().into()));

                    if let Err(e) = active_event.update(&*self.db).await {
                        tracing::error!("Failed to update event status: {}", e);
                        failed += 1;
                        last_error = Some(format!("Failed to update event status: {}", e));

                        // Update event progress to FAILED
                        if let Some(event_progress) = events.get_mut(index) {
                            event_progress.status = EventStatus::Failed;
                            event_progress.error = Some(format!("Failed to update event status: {}", e));
                        }
                    } else {
                        successful += 1;
                        tracing::debug!("Successfully processed event {}", event_id);

                        // Update event progress to COMPLETED
                        if let Some(event_progress) = events.get_mut(index) {
                            event_progress.status = EventStatus::Completed;
                        }
                    }
                }
                Err(e) => {
                    // Mark as failed and record error
                    let error_msg = e.to_string();

                    // Need to fetch the event again to update it
                    if let Ok(Some(event_model)) = webhook_events::Entity::find_by_id(event_id.parse::<uuid::Uuid>().unwrap())
                        .one(&*self.db)
                        .await
                    {
                        let mut active_event: webhook_events::ActiveModel = event_model.into();
                        active_event.status = Set("failed".to_string());
                        active_event.processing_attempts = Set(active_event.processing_attempts.clone().unwrap() + 1);
                        active_event.last_error = Set(Some(error_msg.clone()));

                        if let Err(update_err) = active_event.update(&*self.db).await {
                            tracing::error!("Failed to update failed event status: {}", update_err);
                        }
                    }

                    failed += 1;
                    last_error = Some(error_msg.clone());

                    // Update event progress to FAILED
                    if let Some(event_progress) = events.get_mut(index) {
                        event_progress.status = EventStatus::Failed;
                        event_progress.error = Some(error_msg.clone());
                    }

                    tracing::error!(
                        "Failed to process webhook event {}: {}",
                        event_id,
                        error_msg
                    );
                }
            }

            processed += 1;
        }

        // Send completion progress
        let final_status = if failed == 0 {
            BatchStatus::Completed
        } else if successful == 0 {
            BatchStatus::Failed
        } else {
            BatchStatus::Completed // Partial success
        };

        let final_progress = BatchProgress {
            batch_id: batch_id.clone(),
            status: final_status,
            processed_count: processed,
            successful_count: successful,
            failed_count: failed,
            total_count: total,
            current_event_id: None,
            last_error,
            events: events.clone(),
        };

        tracing::info!(
            batch_id = %batch_id,
            processed = processed,
            successful = successful,
            failed = failed,
            "Completed webhook batch processing"
        );

        if let Err(e) = progress_tx.send(final_progress.clone()).await {
            tracing::error!("Failed to send final progress: {}", e);
        }

        Ok(final_progress)
    }
}
