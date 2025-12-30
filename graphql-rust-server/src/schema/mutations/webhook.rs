//! Webhook GraphQL Mutations

use async_graphql::{Context, Object, Result};
use uuid::Uuid;
use std::sync::Arc;

use crate::auth::UserContext;
use crate::services::webhook_processor::WebhookProcessor;
use crate::services::permission_checker::{PermissionChecker, SyncPermission};

#[derive(Default)]
pub struct WebhookMutations;

#[Object]
impl WebhookMutations {
    /// Retry a failed webhook event
    async fn retry_webhook_event(
        &self,
        ctx: &Context<'_>,
        event_id: String,
    ) -> Result<RetryWebhookEventResult> {
        let user_ctx = ctx.data::<UserContext>()?;
        let db = ctx.data::<Arc<sea_orm::DatabaseConnection>>()?;

        // Check permission - requires ManageIntegrations permission
        let permission_checker = PermissionChecker::new((**db).clone());
        permission_checker
            .require(user_ctx, SyncPermission::ManageIntegrations)
            .await?;

        let processor = WebhookProcessor::new(db.clone());
        let result = processor
            .retry_failed_event(Uuid::parse_str(&event_id)?)
            .await
            .map_err(|e| format!("Failed to retry event: {}", e))?;

        Ok(RetryWebhookEventResult {
            success: result.success,
            message: result.message,
            events_processed: result.events_processed as i32,
        })
    }

    /// Process all pending webhook events
    async fn process_pending_webhook_events(
        &self,
        ctx: &Context<'_>,
        limit: Option<i32>,
    ) -> Result<ProcessPendingWebhookEventsResult> {
        use crate::integrations::intuit::IntuitClient;

        let user_ctx = ctx.data::<UserContext>()?;
        let db = ctx.data::<Arc<sea_orm::DatabaseConnection>>()?;

        // Check permission - requires ManageIntegrations permission
        let permission_checker = PermissionChecker::new((**db).clone());
        permission_checker
            .require(user_ctx, SyncPermission::ManageIntegrations)
            .await?;

        // Create Intuit client
        let intuit_client = IntuitClient::new(
            std::env::var("INTUIT_CLIENT_ID").unwrap_or_default(),
            std::env::var("INTUIT_CLIENT_SECRET").unwrap_or_default(),
        ).map_err(|e| format!("Failed to create Intuit client: {}", e))?;

        let processor = WebhookProcessor::new(db.clone());
        let events_processed = processor
            .process_pending_events(&intuit_client, limit.unwrap_or(10).max(1).min(50) as u64)
            .await
            .map_err(|e| format!("Failed to process pending events: {}", e))?;

        Ok(ProcessPendingWebhookEventsResult {
            success: true,
            message: format!("Processed {} pending webhook events", events_processed),
            events_processed: events_processed as i32,
            events_succeeded: 0, // Not tracked by original implementation
            events_failed: 0,    // Not tracked by original implementation
        })
    }
}

/// Retry webhook event result
#[derive(Debug, Clone)]
pub struct RetryWebhookEventResult {
    pub success: bool,
    pub message: String,
    pub events_processed: i32,
}

#[Object]
impl RetryWebhookEventResult {
    async fn success(&self) -> bool { self.success }
    async fn message(&self) -> &str { &self.message }
    async fn events_processed(&self) -> i32 { self.events_processed }
}

/// Process pending webhook events result
#[derive(Debug, Clone)]
pub struct ProcessPendingWebhookEventsResult {
    pub success: bool,
    pub message: String,
    pub events_processed: i32,
    pub events_succeeded: i32,
    pub events_failed: i32,
}

#[Object]
impl ProcessPendingWebhookEventsResult {
    async fn success(&self) -> bool { self.success }
    async fn message(&self) -> &str { &self.message }
    async fn events_processed(&self) -> i32 { self.events_processed }
    async fn events_succeeded(&self) -> i32 { self.events_succeeded }
    async fn events_failed(&self) -> i32 { self.events_failed }
}
