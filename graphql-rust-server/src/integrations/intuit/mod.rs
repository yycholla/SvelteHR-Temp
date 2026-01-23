// Intuit QuickBooks Integration Module
//
// This module provides OAuth 2.0 authentication and API client for Intuit QuickBooks.
// It handles:
// - OAuth code exchange and token refresh
// - Employee data synchronization
// - API requests with automatic token refresh

mod client;
mod client_manager;
mod models;
mod oauth;
mod webhook_api;

pub use client::IntuitClient;
pub use client_manager::IntuitClientManager;
pub use models::*;
pub use oauth::{exchange_code_for_tokens, get_authorization_url, refresh_access_token};
pub use webhook_api::WebhookApiClient;

use anyhow::Result;

/// Initialize Intuit integration with environment configuration
pub fn init() -> Result<()> {
    // Validate required environment variables
    std::env::var("INTUIT_CLIENT_ID")
        .map_err(|_| anyhow::anyhow!("INTUIT_CLIENT_ID not set"))?;
    std::env::var("INTUIT_CLIENT_SECRET")
        .map_err(|_| anyhow::anyhow!("INTUIT_CLIENT_SECRET not set"))?;
    std::env::var("INTUIT_REDIRECT_URI")
        .map_err(|_| anyhow::anyhow!("INTUIT_REDIRECT_URI not set"))?;

    Ok(())
}
