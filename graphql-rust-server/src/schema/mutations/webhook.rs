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
    /// Register webhook subscription with QuickBooks
    async fn register_webhook(
        &self,
        ctx: &Context<'_>,
        entity_names: Vec<String>,
    ) -> Result<RegisterWebhookResult> {
        use crate::integrations::intuit::IntuitClientManager;
        use crate::models::{intuit_connection, webhook_subscriptions};
        use sea_orm::{ColumnTrait, EntityTrait, QueryFilter, Set};

        let user_ctx = ctx.data::<UserContext>()?;
        let db = ctx.data::<sea_orm::DatabaseConnection>()?;

        // Check permission
        let permission_checker = PermissionChecker::new(db.clone());
        permission_checker
            .require(user_ctx, SyncPermission::ManageIntegrations)
            .await?;

        // Get active Intuit connection with fresh token
        // Using IntuitClientManager ensures token is refreshed if expired
        let client_manager = IntuitClientManager::new(db.clone());
        let _ = client_manager
            .get_client()
            .await
            .map_err(|e| format!("Failed to ensure fresh token: {}", e))?;

        // Re-fetch connection to get the potentially refreshed access token
        let connection = intuit_connection::Entity::find()
            .filter(intuit_connection::Column::IsActive.eq(true))
            .filter(intuit_connection::Column::DeletedAt.is_null())
            .one(db)
            .await
            .map_err(|e| format!("Database error: {}", e))?
            .ok_or("No active QuickBooks connection found")?;

        // Get webhook verifier token from environment (use dev token in dev, prod token in prod)
        let verifier_token = std::env::var("INTUIT_WEBHOOK_VERIFIER_TOKEN")
            .map_err(|_| "INTUIT_WEBHOOK_VERIFIER_TOKEN not configured. This must match the token in QuickBooks Developer Portal.")?;

        // Get webhook URL from environment variable
        let webhook_url = std::env::var("WEBHOOK_URL")
            .unwrap_or_else(|_| "http://localhost:3001/api/webhooks/intuit".to_string());

        // Build event types for QuickBooks webhooks
        let mut event_types = Vec::new();
        for entity_name in &entity_names {
            event_types.push(format!("{}.Create", entity_name));
            event_types.push(format!("{}.Update", entity_name));
            event_types.push(format!("{}.Delete", entity_name));
        }

        // NOTE: QuickBooks webhooks must be manually configured in the Intuit Developer Portal.
        // There is no programmatic API to register webhooks.
        // This mutation creates a local database record to track the webhook subscription
        // that has already been configured in the portal.

        // Generate a local webhook ID for tracking
        let webhook_id = format!("webhook_{}", uuid::Uuid::new_v4());

        tracing::info!(
            webhook_id = %webhook_id,
            realm_id = %connection.realm_id,
            webhook_url = %webhook_url,
            entity_names = ?entity_names,
            "Creating local webhook subscription record (webhooks must be manually configured in Intuit portal)"
        );

        // Store subscription in database
        let subscription = webhook_subscriptions::ActiveModel {
            id: Set(uuid::Uuid::new_v4()),
            webhook_id: Set(webhook_id.clone()),
            realm_id: Set(connection.realm_id.clone()),
            event_types: Set(serde_json::json!(event_types)),
            entity_names: Set(serde_json::json!(entity_names)),
            verifier_token: Set(verifier_token),
            is_active: Set(true),
            last_delivered_at: Set(None),
            failure_count: Set(0),
            metadata: Set(Some(serde_json::json!({
                "webhook_url": webhook_url,
                "registered_at": chrono::Utc::now().to_rfc3339(),
                "status": "local_record",
                "note": "Webhook must be configured in Intuit Developer Portal"
            }))),
            created_at: Set(chrono::Utc::now().into()),
            updated_at: Set(chrono::Utc::now().into()),
            deleted_at: Set(None),
        };

        use sea_orm::ActiveModelTrait;
        subscription.insert(db)
            .await
            .map_err(|e| format!("Failed to save webhook subscription: {}", e))?;

        Ok(RegisterWebhookResult {
            success: true,
            message: format!("Webhook registered successfully for entities: {}", entity_names.join(", ")),
            webhook_id,
        })
    }

    /// Unregister webhook subscription
    async fn unregister_webhook(
        &self,
        ctx: &Context<'_>,
    ) -> Result<UnregisterWebhookResult> {
        use crate::models::webhook_subscriptions;
        use sea_orm::{ActiveModelTrait, ColumnTrait, EntityTrait, QueryFilter, Set};

        let user_ctx = ctx.data::<UserContext>()?;
        let db = ctx.data::<sea_orm::DatabaseConnection>()?;

        // Check permission
        let permission_checker = PermissionChecker::new(db.clone());
        permission_checker
            .require(user_ctx, SyncPermission::ManageIntegrations)
            .await?;

        // Find active subscription
        let subscription = webhook_subscriptions::Entity::find()
            .filter(webhook_subscriptions::Column::IsActive.eq(true))
            .filter(webhook_subscriptions::Column::DeletedAt.is_null())
            .one(db)
            .await
            .map_err(|e| format!("Database error: {}", e))?
            .ok_or("No active webhook subscription found")?;

        // Deactivate subscription (soft delete)
        let mut active_subscription: webhook_subscriptions::ActiveModel = subscription.into();
        active_subscription.is_active = Set(false);
        active_subscription.deleted_at = Set(Some(chrono::Utc::now().into()));
        active_subscription.updated_at = Set(chrono::Utc::now().into());

        active_subscription.update(db)
            .await
            .map_err(|e| format!("Failed to deactivate webhook subscription: {}", e))?;

        Ok(UnregisterWebhookResult {
            success: true,
            message: "Webhook subscription deactivated successfully".to_string(),
        })
    }

    /// Retry a failed webhook event
    async fn retry_webhook_event(
        &self,
        ctx: &Context<'_>,
        event_id: String,
    ) -> Result<RetryWebhookEventResult> {
        let user_ctx = ctx.data::<UserContext>()?;
        let db = ctx.data::<sea_orm::DatabaseConnection>()?;

        // Check permission - requires ManageIntegrations permission
        let permission_checker = PermissionChecker::new(db.clone());
        permission_checker
            .require(user_ctx, SyncPermission::ManageIntegrations)
            .await?;

        let processor = WebhookProcessor::new(Arc::new(db.clone()));
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
        use crate::integrations::intuit::IntuitClientManager;

        let user_ctx = ctx.data::<UserContext>()?;
        let db = ctx.data::<sea_orm::DatabaseConnection>()?;

        // Check permission - requires ManageIntegrations permission
        let permission_checker = PermissionChecker::new(db.clone());
        permission_checker
            .require(user_ctx, SyncPermission::ManageIntegrations)
            .await?;

        // Get QuickBooks client with automatic token refresh
        let client_manager = IntuitClientManager::new(db.clone());
        let intuit_client = client_manager
            .get_client()
            .await
            .map_err(|e| format!("Failed to create Intuit client: {}", e))?;

        let processor = WebhookProcessor::new(Arc::new(db.clone()));
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

/// Register webhook result
#[derive(Debug, Clone)]
pub struct RegisterWebhookResult {
    pub success: bool,
    pub message: String,
    pub webhook_id: String,
}

#[Object]
impl RegisterWebhookResult {
    async fn success(&self) -> bool { self.success }
    async fn message(&self) -> &str { &self.message }
    async fn webhook_id(&self) -> &str { &self.webhook_id }
}

/// Unregister webhook result
#[derive(Debug, Clone)]
pub struct UnregisterWebhookResult {
    pub success: bool,
    pub message: String,
}

#[Object]
impl UnregisterWebhookResult {
    async fn success(&self) -> bool { self.success }
    async fn message(&self) -> &str { &self.message }
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
