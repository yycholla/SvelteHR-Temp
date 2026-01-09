//! Webhook Processing Service
//!
//! Handles QuickBooks webhook events and triggers appropriate sync operations

use crate::integrations::intuit::IntuitClient;
use crate::models::{webhook_events, webhook_subscriptions};
use chrono::Utc;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter, QuerySelect, Set,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use uuid::Uuid;

/// Webhook processor service
pub struct WebhookProcessor {
    db: Arc<DatabaseConnection>,
}

/// Webhook payload from QuickBooks
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QuickBooksWebhookPayload {
    #[serde(rename = "eventNotifications")]
    pub event_notifications: Vec<EventNotification>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EventNotification {
    #[serde(rename = "realmId")]
    pub realm_id: String,
    #[serde(rename = "dataChangeEvent")]
    pub data_change_event: DataChangeEvent,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DataChangeEvent {
    pub entities: Vec<EntityChange>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EntityChange {
    pub name: String,
    pub id: String,
    pub operation: String,
    #[serde(rename = "lastUpdated")]
    pub last_updated: Option<String>,
}

/// Webhook processing result
#[derive(Debug, Clone)]
pub struct WebhookProcessingResult {
    pub events_processed: usize,
    pub events_failed: usize,
    pub sync_triggered: bool,
}

impl WebhookProcessor {
    pub fn new(db: Arc<DatabaseConnection>) -> Self {
        Self { db }
    }

    /// Verify webhook signature
    pub fn verify_signature(
        &self,
        payload: &str,
        signature: &str,
        verifier_token: &str,
    ) -> Result<bool, Box<dyn std::error::Error>> {
        use hmac::{Hmac, Mac};
        use sha2::Sha256;

        type HmacSha256 = Hmac<Sha256>;

        // Create HMAC instance
        let mut mac = HmacSha256::new_from_slice(verifier_token.as_bytes())
            .map_err(|e| format!("Invalid verifier token: {}", e))?;

        // Update with payload
        mac.update(payload.as_bytes());

        // Verify signature
        let expected_signature = hex::encode(mac.finalize().into_bytes());

        Ok(expected_signature.eq_ignore_ascii_case(signature))
    }

    /// Process incoming webhook payload
    pub async fn process_webhook(
        &self,
        realm_id: &str,
        payload: QuickBooksWebhookPayload,
        signature: &str,
    ) -> Result<WebhookProcessingResult, Box<dyn std::error::Error>> {
        // Find subscription for this realm
        let subscription = webhook_subscriptions::Entity::find()
            .filter(webhook_subscriptions::Column::RealmId.eq(realm_id))
            .filter(webhook_subscriptions::Column::IsActive.eq(true))
            .filter(webhook_subscriptions::Column::DeletedAt.is_null())
            .one(&*self.db)
            .await?
            .ok_or("No active webhook subscription found for realm")?;

        // Verify signature
        let payload_json = serde_json::to_string(&payload)?;
        if !self.verify_signature(&payload_json, signature, &subscription.verifier_token)? {
            return Err("Invalid webhook signature".into());
        }

        let mut events_processed = 0;
        let mut events_failed = 0;
        let mut sync_triggered = false;

        // Process each event notification
        for notification in payload.event_notifications {
            for entity in notification.data_change_event.entities {
                match self.process_entity_change(
                    &subscription,
                    &notification.realm_id,
                    &entity,
                ).await {
                    Ok(_) => {
                        events_processed += 1;

                        // Trigger sync for employee or department changes
                        if matches!(entity.name.as_str(), "Employee" | "Department") {
                            sync_triggered = true;
                        }
                    }
                    Err(e) => {
                        tracing::error!(
                            "Failed to process webhook event for {} {}: {}",
                            entity.name,
                            entity.id,
                            e
                        );
                        events_failed += 1;
                    }
                }
            }
        }

        // Update subscription last delivered
        let mut active_sub: webhook_subscriptions::ActiveModel = subscription.into();
        active_sub.last_delivered_at = Set(Some(Utc::now().into()));
        active_sub.update(&*self.db).await?;

        Ok(WebhookProcessingResult {
            events_processed,
            events_failed,
            sync_triggered,
        })
    }

    /// Process a single entity change event
    async fn process_entity_change(
        &self,
        subscription: &webhook_subscriptions::Model,
        realm_id: &str,
        entity: &EntityChange,
    ) -> Result<Uuid, Box<dyn std::error::Error>> {
        // Create webhook event record
        let webhook_event = webhook_events::ActiveModel {
            id: Set(Uuid::new_v4()),
            subscription_id: Set(subscription.id),
            realm_id: Set(realm_id.to_string()),
            event_type: Set(entity.operation.to_lowercase()),
            entity_name: Set(entity.name.clone()),
            entity_id: Set(entity.id.clone()),
            payload: Set(serde_json::to_value(entity)?),
            status: Set("pending".to_string()),
            processed_at: Set(None),
            processing_attempts: Set(0),
            last_error: Set(None),
            metadata: Set(None),
            received_at: Set(Utc::now().into()),
            created_at: Set(Utc::now().into()),
        };

        let event = webhook_event.insert(&*self.db).await?;

        Ok(event.id)
    }

    /// Process pending webhook events
    pub async fn process_pending_events(
        &self,
        intuit_client: &IntuitClient,
        limit: u64,
    ) -> Result<usize, Box<dyn std::error::Error>> {
        // Get pending events
        let pending_events = webhook_events::Entity::find()
            .filter(webhook_events::Column::Status.eq("pending"))
            .limit(limit)
            .all(&*self.db)
            .await?;

        let mut processed_count = 0;

        for event in pending_events {
            match self.process_event(&event, intuit_client).await {
                Ok(_) => {
                    // Mark as completed
                    let mut active_event: webhook_events::ActiveModel = event.into();
                    active_event.status = Set("completed".to_string());
                    active_event.processed_at = Set(Some(Utc::now().into()));
                    active_event.update(&*self.db).await?;
                    processed_count += 1;
                }
                Err(e) => {
                    // Mark as failed and record error
                    let mut active_event: webhook_events::ActiveModel = event.clone().into();
                    active_event.status = Set("failed".to_string());
                    active_event.processing_attempts = Set(event.processing_attempts + 1);
                    active_event.last_error = Set(Some(e.to_string()));
                    active_event.update(&*self.db).await?;

                    tracing::error!(
                        "Failed to process webhook event {}: {}",
                        event.id,
                        e
                    );
                }
            }
        }

        Ok(processed_count)
    }

    /// Process a single webhook event
    async fn process_event(
        &self,
        event: &webhook_events::Model,
        intuit_client: &IntuitClient,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        match event.entity_name.as_str() {
            "Employee" => {
                self.sync_employee(&event.entity_id, intuit_client).await?;
            }
            "Department" => {
                self.sync_department(&event.entity_id, intuit_client).await?;
            }
            _ => {
                tracing::info!(
                    "Skipping unsupported entity type: {}",
                    event.entity_name
                );
            }
        }

        Ok(())
    }

    /// Sync a single employee from QuickBooks
    async fn sync_employee(
        &self,
        employee_id: &str,
        _intuit_client: &IntuitClient,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        // Note: Actual sync should be triggered by a background job or manual trigger
        // This webhook processor just records the event for later processing
        tracing::info!("Employee {} changed in QuickBooks - sync recommended", employee_id);
        Ok(())
    }

    /// Sync a single department from QuickBooks
    async fn sync_department(
        &self,
        department_id: &str,
        _intuit_client: &IntuitClient,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        // Note: Actual sync should be triggered by a background job or manual trigger
        // This webhook processor just records the event for later processing
        tracing::info!("Department {} changed in QuickBooks - sync recommended", department_id);
        Ok(())
    }

    /// Get a single webhook event by ID
    pub async fn get_event(
        &self,
        event_id: Uuid,
    ) -> Result<Option<webhook_events::Model>, sea_orm::DbErr> {
        webhook_events::Entity::find_by_id(event_id)
            .one(&*self.db)
            .await
    }

    /// Get webhook events with optional filters
    pub async fn get_events(
        &self,
        status: Option<String>,
        event_type: Option<String>,
        limit: u64,
    ) -> Result<Vec<webhook_events::Model>, sea_orm::DbErr> {
        use sea_orm::QueryOrder;

        let mut query = webhook_events::Entity::find();

        if let Some(s) = status {
            query = query.filter(webhook_events::Column::Status.eq(s));
        }

        if let Some(et) = event_type {
            query = query.filter(webhook_events::Column::EventType.eq(et));
        }

        query
            .order_by_desc(webhook_events::Column::CreatedAt)
            .limit(limit)
            .all(&*self.db)
            .await
    }

    /// Get webhook event statistics (alias for get_event_stats)
    pub async fn get_event_statistics(&self) -> Result<WebhookEventStats, sea_orm::DbErr> {
        self.get_event_stats(None).await
    }

    /// Get webhook event statistics
    pub async fn get_event_stats(
        &self,
        subscription_id: Option<Uuid>,
    ) -> Result<WebhookEventStats, sea_orm::DbErr> {
        let mut query = webhook_events::Entity::find();

        if let Some(sub_id) = subscription_id {
            query = query.filter(webhook_events::Column::SubscriptionId.eq(sub_id));
        }

        let all_events = query.all(&*self.db).await?;

        let total = all_events.len();
        let pending = all_events.iter().filter(|e| e.status == "pending").count();
        let processing = all_events.iter().filter(|e| e.status == "processing").count();
        let completed = all_events.iter().filter(|e| e.status == "completed").count();
        let failed = all_events.iter().filter(|e| e.status == "failed").count();
        let retrying = all_events.iter().filter(|e| e.status == "retrying").count();

        // Calculate average processing time for completed events
        // Note: We use received_at as start time and processed_at as end time
        let completed_with_times: Vec<_> = all_events
            .iter()
            .filter(|e| e.status == "completed" && e.processed_at.is_some())
            .collect();

        let avg_processing_time_ms = if !completed_with_times.is_empty() {
            let total_ms: i64 = completed_with_times
                .iter()
                .map(|e| {
                    let started = e.received_at;
                    let completed = e.processed_at.unwrap();
                    (completed - started).num_milliseconds()
                })
                .sum();
            Some(total_ms / completed_with_times.len() as i64)
        } else {
            None
        };

        Ok(WebhookEventStats {
            total,
            pending,
            processing,
            completed,
            failed,
            retrying,
            avg_processing_time_ms,
        })
    }

    /// Retry failed webhook events
    pub async fn retry_failed_events(
        &self,
        intuit_client: &IntuitClient,
        max_attempts: i32,
        limit: u64,
    ) -> Result<usize, Box<dyn std::error::Error>> {
        // Get failed events that haven't exceeded max attempts
        let failed_events = webhook_events::Entity::find()
            .filter(webhook_events::Column::Status.eq("failed"))
            .filter(webhook_events::Column::ProcessingAttempts.lt(max_attempts))
            .limit(limit)
            .all(&*self.db)
            .await?;

        let mut retried_count = 0;

        for event in failed_events {
            // Mark as retrying
            let mut active_event: webhook_events::ActiveModel = event.clone().into();
            active_event.status = Set("retrying".to_string());
            active_event.update(&*self.db).await?;

            // Attempt to process
            match self.process_event(&event, intuit_client).await {
                Ok(_) => {
                    let mut active_event: webhook_events::ActiveModel = event.into();
                    active_event.status = Set("completed".to_string());
                    active_event.processed_at = Set(Some(Utc::now().into()));
                    active_event.update(&*self.db).await?;
                    retried_count += 1;
                }
                Err(e) => {
                    let mut active_event: webhook_events::ActiveModel = event.clone().into();
                    active_event.status = Set("failed".to_string());
                    active_event.processing_attempts = Set(event.processing_attempts + 1);
                    active_event.last_error = Set(Some(e.to_string()));
                    active_event.update(&*self.db).await?;
                }
            }
        }

        Ok(retried_count)
    }

    /// Retry a single failed webhook event
    pub async fn retry_failed_event(
        &self,
        event_id: Uuid,
    ) -> Result<RetryResult, anyhow::Error> {
        use crate::integrations::intuit::IntuitClientManager;

        // Get the event
        let event = webhook_events::Entity::find_by_id(event_id)
            .one(&*self.db)
            .await?
            .ok_or_else(|| anyhow::anyhow!("Event {} not found", event_id))?;

        // Check if it's a failed event
        if event.status != "failed" {
            return Ok(RetryResult {
                success: false,
                message: format!("Event {} is not in failed status (current: {})", event_id, event.status),
                events_processed: 0,
            });
        }

        // Get QuickBooks client with automatic token refresh
        let client_manager = IntuitClientManager::new((*self.db).clone());
        let intuit_client = client_manager
            .get_client()
            .await?;

        // Mark as retrying
        let mut active_event: webhook_events::ActiveModel = event.clone().into();
        active_event.status = Set("retrying".to_string());
        active_event.update(&*self.db).await?;

        // Attempt to process
        match self.process_event(&event, &intuit_client).await {
            Ok(_) => {
                let mut active_event: webhook_events::ActiveModel = event.into();
                active_event.status = Set("completed".to_string());
                active_event.processed_at = Set(Some(Utc::now().into()));
                active_event.update(&*self.db).await?;

                Ok(RetryResult {
                    success: true,
                    message: format!("Event {} retried successfully", event_id),
                    events_processed: 1,
                })
            }
            Err(e) => {
                let error_msg = {
                    let msg = e.to_string();
                    drop(e);
                    msg
                };

                let mut active_event: webhook_events::ActiveModel = event.clone().into();
                active_event.status = Set("failed".to_string());
                active_event.processing_attempts = Set(event.processing_attempts + 1);
                active_event.last_error = Set(Some(error_msg.clone()));
                active_event.update(&*self.db).await?;

                Ok(RetryResult {
                    success: false,
                    message: format!("Event {} retry failed: {}", event_id, error_msg),
                    events_processed: 0,
                })
            }
        }
    }
}

/// Result of retrying a webhook event
#[derive(Debug, Clone)]
pub struct RetryResult {
    pub success: bool,
    pub message: String,
    pub events_processed: usize,
}

/// Webhook event statistics
#[derive(Debug, Clone)]
pub struct WebhookEventStats {
    pub total: usize,
    pub pending: usize,
    pub processing: usize,
    pub completed: usize,
    pub failed: usize,
    pub retrying: usize,
    pub avg_processing_time_ms: Option<i64>,
}
