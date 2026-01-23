//! QuickBooks Webhooks API Client
//!
//! Handles webhook subscription registration, deletion, and management with QuickBooks API

use anyhow::{Context, Result};
use reqwest::Client;
use serde::{Deserialize, Serialize};

/// QuickBooks Webhooks API client
pub struct WebhookApiClient {
    client: Client,
    access_token: String,
    base_url: String,
}

/// Request payload for webhook registration
#[derive(Debug, Serialize)]
struct WebhookRegistrationRequest {
    #[serde(rename = "targetUrl")]
    target_url: String,

    #[serde(rename = "eventTypes")]
    event_types: Vec<String>,

    #[serde(rename = "verifierToken")]
    verifier_token: String,
}

/// Response from webhook registration
#[derive(Debug, Deserialize)]
pub struct WebhookRegistrationResponse {
    #[serde(rename = "webhookId")]
    pub webhook_id: String,
    pub status: String,
}

impl WebhookApiClient {
    /// Create a new webhook API client
    pub fn new(access_token: String) -> Self {
        // Auto-detect environment: use production API if ENVIRONMENT=production, otherwise sandbox
        let base_url = if Self::is_production() {
            "https://developer.api.intuit.com"
        } else {
            "https://developer-sandbox.api.intuit.com"
        };

        Self {
            client: Client::new(),
            access_token,
            base_url: base_url.to_string(),
        }
    }

    /// Register a new webhook subscription with QuickBooks
    pub async fn register_webhook(
        &self,
        target_url: String,
        event_types: Vec<String>,
        verifier_token: String,
    ) -> Result<WebhookRegistrationResponse> {
        let url = format!("{}/v2/webhooks", self.base_url);

        let request_body = WebhookRegistrationRequest {
            target_url,
            event_types,
            verifier_token,
        };

        tracing::info!(
            url = %url,
            event_types = ?request_body.event_types,
            "Registering webhook subscription with QuickBooks API"
        );

        let response = self
            .client
            .post(&url)
            .header("Authorization", format!("Bearer {}", self.access_token))
            .header("Content-Type", "application/json")
            .json(&request_body)
            .send()
            .await
            .context("Failed to send webhook registration request")?;

        if !response.status().is_success() {
            let status = response.status();
            let error_body = response.text().await.unwrap_or_default();
            anyhow::bail!(
                "Webhook registration failed with status {}: {}",
                status,
                error_body
            );
        }

        let registration_response: WebhookRegistrationResponse = response
            .json()
            .await
            .context("Failed to parse webhook registration response")?;

        tracing::info!(
            webhook_id = %registration_response.webhook_id,
            status = %registration_response.status,
            "Successfully registered webhook with QuickBooks"
        );

        Ok(registration_response)
    }

    /// Delete an existing webhook subscription from QuickBooks
    pub async fn delete_webhook(&self, webhook_id: &str) -> Result<()> {
        let url = format!("{}/v2/webhooks/{}", self.base_url, webhook_id);

        tracing::info!(
            webhook_id = webhook_id,
            "Deleting webhook subscription from QuickBooks API"
        );

        let response = self
            .client
            .delete(&url)
            .header("Authorization", format!("Bearer {}", self.access_token))
            .send()
            .await
            .context("Failed to send webhook deletion request")?;

        if !response.status().is_success() {
            let status = response.status();
            let error_body = response.text().await.unwrap_or_default();
            anyhow::bail!(
                "Webhook deletion failed with status {}: {}",
                status,
                error_body
            );
        }

        tracing::info!(
            webhook_id = webhook_id,
            "Successfully deleted webhook from QuickBooks"
        );

        Ok(())
    }

    /// List all webhook subscriptions from QuickBooks
    pub async fn list_webhooks(&self) -> Result<Vec<WebhookRegistrationResponse>> {
        let url = format!("{}/v2/webhooks", self.base_url);

        tracing::debug!("Listing webhook subscriptions from QuickBooks API");

        let response = self
            .client
            .get(&url)
            .header("Authorization", format!("Bearer {}", self.access_token))
            .send()
            .await
            .context("Failed to send webhook list request")?;

        if !response.status().is_success() {
            let status = response.status();
            let error_body = response.text().await.unwrap_or_default();
            anyhow::bail!(
                "Webhook list request failed with status {}: {}",
                status,
                error_body
            );
        }

        let webhooks: Vec<WebhookRegistrationResponse> = response
            .json()
            .await
            .context("Failed to parse webhook list response")?;

        tracing::info!(count = webhooks.len(), "Retrieved webhook subscriptions");

        Ok(webhooks)
    }

    /// Check if running in production environment
    fn is_production() -> bool {
        std::env::var("ENVIRONMENT")
            .or_else(|_| std::env::var("NODE_ENV"))
            .map(|env| env.to_lowercase() == "production" || env.to_lowercase() == "prod")
            .unwrap_or(false)
    }

    /// Get the webhook URL for the current environment
    /// Priority: ENV var (for ngrok/tunneling) > auto-detection
    pub fn get_webhook_url() -> String {
        // Priority 1: Explicit environment variable (for ngrok tunneling)
        if let Ok(webhook_url) = std::env::var("INTUIT_WEBHOOK_URL") {
            tracing::debug!(webhook_url = %webhook_url, "Using INTUIT_WEBHOOK_URL from environment");
            return webhook_url;
        }

        // Priority 2: Auto-detect based on environment
        if Self::is_production() {
            "https://hr.mtncarerx.com/api/intuit/webhook".to_string()
        } else {
            // Development - will use dev.hr.mtncarerx.com (k8s dev namespace)
            // For local Docker Compose dev, set INTUIT_WEBHOOK_URL env var
            tracing::warn!(
                "No INTUIT_WEBHOOK_URL set. Using dev.hr.mtncarerx.com. \
                For local development with ngrok, set INTUIT_WEBHOOK_URL env var."
            );
            "https://dev.hr.mtncarerx.com/api/intuit/webhook".to_string()
        }
    }
}
