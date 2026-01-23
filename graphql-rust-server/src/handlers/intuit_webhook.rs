//! QuickBooks Webhook Handler
//!
//! Receives and processes webhook events from QuickBooks Online

use axum::{
    extract::State,
    http::{HeaderMap, StatusCode},
    response::Json,
};
use serde::Serialize;
use std::sync::Arc;

use crate::handlers::AppState;
use crate::services::webhook_processor::WebhookProcessor;

/// Webhook verification response
#[derive(Debug, Serialize)]
pub struct WebhookResponse {
    pub success: bool,
    pub message: String,
}

/// QuickBooks webhook handler
///
/// Receives webhook events from QuickBooks and processes them asynchronously.
/// Verifies HMAC-SHA256 signature before processing.
pub async fn intuit_webhook_handler(
    State(app_state): State<AppState>,
    headers: HeaderMap,
    body: String,
) -> Result<Json<WebhookResponse>, StatusCode> {
    // Extract signature from Intuit-Signature header
    let signature = headers
        .get("intuit-signature")
        .and_then(|v| v.to_str().ok())
        .ok_or_else(|| {
            tracing::warn!("Missing Intuit-Signature header in webhook request");
            StatusCode::UNAUTHORIZED
        })?;

    // Get verifier token from environment
    let verifier_token = std::env::var("INTUIT_WEBHOOK_VERIFIER_TOKEN")
        .map_err(|_| {
            tracing::error!("INTUIT_WEBHOOK_VERIFIER_TOKEN not configured");
            StatusCode::INTERNAL_SERVER_ERROR
        })?;

    tracing::debug!(
        verifier_token = %verifier_token,
        signature = %signature,
        body_length = body.len(),
        body_preview = %&body[..body.len().min(200)],
        "Webhook received - verifying signature"
    );

    // Create webhook processor
    let processor = WebhookProcessor::new(Arc::new(app_state.db.clone()));

    // Verify signature
    match processor.verify_signature(&body, signature, &verifier_token) {
        Ok(true) => {
            tracing::debug!("Webhook signature verified successfully");
        }
        Ok(false) => {
            tracing::warn!(
                "Webhook signature verification failed - signature mismatch"
            );
            return Err(StatusCode::UNAUTHORIZED);
        }
        Err(e) => {
            tracing::error!("Webhook signature verification error: {}", e);
            return Err(StatusCode::INTERNAL_SERVER_ERROR);
        }
    }

    // Parse the webhook payload (try CloudEvents first, then legacy format)
    let payload = if body.trim_start().starts_with('[') {
        // CloudEvents format (array)
        let cloud_events: Vec<crate::services::webhook_processor::CloudEvent> =
            serde_json::from_str(&body).map_err(|e| {
                tracing::error!("Failed to parse CloudEvents webhook payload: {}", e);
                StatusCode::BAD_REQUEST
            })?;

        crate::services::webhook_processor::WebhookPayload::CloudEvents(cloud_events)
    } else {
        // Legacy format (object)
        let legacy_payload: crate::services::webhook_processor::QuickBooksWebhookPayload =
            serde_json::from_str(&body).map_err(|e| {
                tracing::error!("Failed to parse legacy webhook payload: {}", e);
                StatusCode::BAD_REQUEST
            })?;

        crate::services::webhook_processor::WebhookPayload::Legacy(legacy_payload)
    };

    // Process webhook asynchronously
    // Pass verifier_token so processor can look up subscription
    match processor.process_webhook_with_token(payload, signature, &verifier_token).await {
        Ok(result) => {
            tracing::info!(
                "Webhook processed successfully: {} events processed, {} events failed",
                result.events_processed,
                result.events_failed
            );

            Ok(Json(WebhookResponse {
                success: true,
                message: format!("Webhook processed: {} events processed, {} failed", result.events_processed, result.events_failed),
            }))
        }
        Err(e) => {
            tracing::error!("Webhook processing error: {}", e);

            // Return 200 OK even on processing errors to prevent QuickBooks from retrying
            // The webhook processor will handle retries internally
            Ok(Json(WebhookResponse {
                success: false,
                message: format!("Webhook received but processing failed: {}", e),
            }))
        }
    }
}
