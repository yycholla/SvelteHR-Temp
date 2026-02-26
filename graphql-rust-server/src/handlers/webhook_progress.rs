//! Webhook Progress SSE Handler
//!
//! Provides Server-Sent Events (SSE) endpoint for real-time webhook batch processing progress

use axum::{
    extract::{Path, State},
    response::sse::{Event, Sse},
};
use futures::stream::{unfold, Stream};
use std::convert::Infallible;
use std::sync::Arc;
use tokio::sync::mpsc;

use crate::handlers::AppState;
use crate::integrations::intuit::IntuitClientManager;
use crate::services::webhook_batch_processor::{BatchProgress, WebhookBatchProcessor};

/// SSE handler for webhook batch processing progress
///
/// # Arguments
///
/// * `batch_id` - Unique identifier for the batch processing job
/// * `app_state` - Application state containing database connection
///
/// # Returns
///
/// Returns a Server-Sent Events stream that emits JSON-encoded BatchProgress updates
pub async fn webhook_progress_stream(
    State(app_state): State<AppState>,
    Path(batch_id): Path<String>,
) -> Sse<impl Stream<Item = Result<Event, Infallible>>> {
    tracing::info!(
        batch_id = %batch_id,
        "Client connected to webhook progress stream"
    );

    // Create a channel for progress updates
    let (tx, rx) = mpsc::channel::<BatchProgress>(100);

    // Clone values for the spawned task
    let db = Arc::new(app_state.db.clone());
    let task_batch_id = batch_id.clone();

    // Spawn task to process webhook batch with progress updates
    tokio::spawn(async move {
        let processor = WebhookBatchProcessor::new(db.clone());

        // Create IntuitClientManager and get client
        let client_manager = IntuitClientManager::new((*db).clone());

        match client_manager.get_client().await {
            Ok(intuit_client) => {
                tracing::info!(
                    "IntuitClient created successfully for batch {}",
                    task_batch_id
                );

                // Process batch with progress updates
                match processor
                    .process_batch_with_progress(
                        task_batch_id.clone(),
                        50,
                        &intuit_client,
                        tx.clone(),
                    )
                    .await
                {
                    Ok(_) => {
                        tracing::info!(
                            "Batch processing completed successfully for {}",
                            task_batch_id
                        );
                    }
                    Err(e) => {
                        tracing::error!("Error processing batch {}: {}", task_batch_id, e);
                    }
                }
            }
            Err(e) => {
                tracing::error!(
                    "Failed to create IntuitClient for batch {}: {}",
                    task_batch_id,
                    e
                );

                // Send error progress update
                if let Err(send_err) = tx
                    .send(BatchProgress {
                        batch_id: task_batch_id.clone(),
                        status: crate::services::webhook_batch_processor::BatchStatus::Failed,
                        processed_count: 0,
                        successful_count: 0,
                        failed_count: 0,
                        total_count: 0,
                        current_event_id: None,
                        last_error: Some(format!("Failed to initialize QuickBooks client: {}", e)),
                        events: vec![],
                    })
                    .await
                {
                    tracing::error!("Failed to send error progress: {}", send_err);
                }
            }
        }
    });

    // Create SSE stream from progress updates using unfold
    let batch_id_for_log = batch_id.clone();
    let stream = unfold(rx, move |mut receiver| {
        let batch_id_clone = batch_id_for_log.clone();
        async move {
            match receiver.recv().await {
                Some(progress) => {
                    let event = match serde_json::to_string(&progress) {
                        Ok(data) => Ok(Event::default().data(data)),
                        Err(e) => {
                            tracing::error!("Failed to serialize progress: {}", e);
                            Ok(Event::default().data(format!("{{\"error\": \"{}\"}}", e)))
                        }
                    };
                    Some((event, receiver))
                }
                None => {
                    tracing::info!(
                        batch_id = %batch_id_clone,
                        "Client disconnected from webhook progress stream"
                    );
                    None
                }
            }
        }
    });

    Sse::new(stream).keep_alive(
        axum::response::sse::KeepAlive::new()
            .interval(std::time::Duration::from_secs(15))
            .text("keepalive"),
    )
}
