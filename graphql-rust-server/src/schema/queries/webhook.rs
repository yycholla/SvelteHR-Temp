//! Webhook GraphQL Queries

use async_graphql::{Context, Object, Result};
use chrono::{DateTime, Utc};
use std::sync::Arc;
use uuid::Uuid;

use crate::auth::UserContext;
use crate::models::webhook_events;
use crate::services::permission_checker::{PermissionChecker, SyncPermission};
use crate::services::webhook_processor::WebhookProcessor;

#[derive(Default)]
pub struct WebhookQueries;

#[Object]
impl WebhookQueries {
    /// Get webhook subscription status
    async fn webhook_status(&self, ctx: &Context<'_>) -> Result<WebhookStatus> {
        use crate::models::webhook_subscriptions;
        use sea_orm::{ColumnTrait, EntityTrait, QueryFilter};

        let user_ctx = ctx.data::<UserContext>()?;
        let db = ctx.data::<sea_orm::DatabaseConnection>()?;

        // Check permission
        let permission_checker = PermissionChecker::new(db.clone());
        permission_checker
            .require(user_ctx, SyncPermission::ViewSyncHistory)
            .await?;

        // Find active subscription
        let subscription = webhook_subscriptions::Entity::find()
            .filter(webhook_subscriptions::Column::IsActive.eq(true))
            .filter(webhook_subscriptions::Column::DeletedAt.is_null())
            .one(db)
            .await?;

        match subscription {
            Some(sub) => Ok(WebhookStatus {
                is_active: true,
                webhook_id: Some(sub.webhook_id),
                entity_names: serde_json::from_value(sub.entity_names).unwrap_or_default(),
                last_delivered_at: sub.last_delivered_at.map(|dt| dt.with_timezone(&Utc)),
                failure_count: sub.failure_count,
            }),
            None => Ok(WebhookStatus {
                is_active: false,
                webhook_id: None,
                entity_names: vec![],
                last_delivered_at: None,
                failure_count: 0,
            }),
        }
    }

    /// Get webhook event by ID
    async fn webhook_event(
        &self,
        ctx: &Context<'_>,
        event_id: String,
    ) -> Result<Option<WebhookEvent>> {
        let user_ctx = ctx.data::<UserContext>()?;
        let db = ctx.data::<sea_orm::DatabaseConnection>()?;

        // Check permission
        let permission_checker = PermissionChecker::new(db.clone());
        permission_checker
            .require(user_ctx, SyncPermission::ViewSyncHistory)
            .await?;

        let processor = WebhookProcessor::new(Arc::new(db.clone()));
        let event = processor.get_event(Uuid::parse_str(&event_id)?).await?;

        Ok(event.map(WebhookEvent::from))
    }

    /// Get webhook events with optional filters
    async fn webhook_events(
        &self,
        ctx: &Context<'_>,
        status: Option<String>,
        event_type: Option<String>,
        limit: Option<i32>,
    ) -> Result<Vec<WebhookEvent>> {
        let user_ctx = ctx.data::<UserContext>()?;
        let db = ctx.data::<sea_orm::DatabaseConnection>()?;

        // Check permission
        let permission_checker = PermissionChecker::new(db.clone());
        permission_checker
            .require(user_ctx, SyncPermission::ViewSyncHistory)
            .await?;

        let processor = WebhookProcessor::new(Arc::new(db.clone()));
        let events = processor
            .get_events(
                status,
                event_type,
                limit.unwrap_or(50).max(1).min(100) as u64,
            )
            .await?;

        Ok(events.into_iter().map(WebhookEvent::from).collect())
    }

    /// Get pending webhook events
    async fn pending_webhook_events(
        &self,
        ctx: &Context<'_>,
        limit: Option<i32>,
    ) -> Result<Vec<WebhookEvent>> {
        let user_ctx = ctx.data::<UserContext>()?;
        let db = ctx.data::<sea_orm::DatabaseConnection>()?;

        // Check permission
        let permission_checker = PermissionChecker::new(db.clone());
        permission_checker
            .require(user_ctx, SyncPermission::ViewSyncHistory)
            .await?;

        let processor = WebhookProcessor::new(Arc::new(db.clone()));
        let events = processor
            .get_events(
                Some("pending".to_string()),
                None,
                limit.unwrap_or(50).max(1).min(100) as u64,
            )
            .await?;

        Ok(events.into_iter().map(WebhookEvent::from).collect())
    }

    /// Get webhook event statistics
    async fn webhook_statistics(&self, ctx: &Context<'_>) -> Result<WebhookStatistics> {
        let user_ctx = ctx.data::<UserContext>()?;
        let db = ctx.data::<sea_orm::DatabaseConnection>()?;

        // Check permission
        let permission_checker = PermissionChecker::new(db.clone());
        permission_checker
            .require(user_ctx, SyncPermission::ViewSyncHistory)
            .await?;

        let processor = WebhookProcessor::new(Arc::new(db.clone()));
        let stats = processor.get_event_statistics().await?;

        Ok(WebhookStatistics::from(stats))
    }
}

/// Webhook subscription status
#[derive(Debug, Clone)]
pub struct WebhookStatus {
    pub is_active: bool,
    pub webhook_id: Option<String>,
    pub entity_names: Vec<String>,
    pub last_delivered_at: Option<DateTime<Utc>>,
    pub failure_count: i32,
}

#[Object]
impl WebhookStatus {
    async fn is_active(&self) -> bool {
        self.is_active
    }
    async fn webhook_id(&self) -> Option<&str> {
        self.webhook_id.as_deref()
    }
    async fn entity_names(&self) -> &[String] {
        &self.entity_names
    }
    async fn last_delivered_at(&self) -> Option<DateTime<Utc>> {
        self.last_delivered_at
    }
    async fn failure_count(&self) -> i32 {
        self.failure_count
    }
}

/// Webhook event
#[derive(Debug, Clone)]
pub struct WebhookEvent {
    pub id: String,
    pub event_type: String,
    pub entity_name: String,
    pub realm_id: String,
    pub payload: serde_json::Value,
    pub status: String,
    pub processed_at: Option<DateTime<Utc>>,
    pub processing_attempts: i32,
    pub last_error: Option<String>,
    pub received_at: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
}

#[Object]
impl WebhookEvent {
    async fn id(&self) -> &str {
        &self.id
    }
    async fn event_type(&self) -> &str {
        &self.event_type
    }
    async fn entity_name(&self) -> &str {
        &self.entity_name
    }
    async fn realm_id(&self) -> &str {
        &self.realm_id
    }
    async fn payload(&self) -> &serde_json::Value {
        &self.payload
    }
    async fn status(&self) -> &str {
        &self.status
    }
    async fn processed_at(&self) -> Option<DateTime<Utc>> {
        self.processed_at
    }
    async fn processing_attempts(&self) -> i32 {
        self.processing_attempts
    }
    async fn last_error(&self) -> Option<&str> {
        self.last_error.as_deref()
    }
    async fn received_at(&self) -> DateTime<Utc> {
        self.received_at
    }
    async fn created_at(&self) -> DateTime<Utc> {
        self.created_at
    }
}

impl From<webhook_events::Model> for WebhookEvent {
    fn from(model: webhook_events::Model) -> Self {
        Self {
            id: model.id.to_string(),
            event_type: model.event_type,
            entity_name: model.entity_name,
            realm_id: model.realm_id,
            payload: model.payload,
            status: model.status,
            processed_at: model.processed_at.map(|dt| dt.with_timezone(&Utc)),
            processing_attempts: model.processing_attempts,
            last_error: model.last_error,
            received_at: model.received_at.with_timezone(&Utc),
            created_at: model.created_at.with_timezone(&Utc),
        }
    }
}

/// Webhook event statistics
#[derive(Debug, Clone)]
pub struct WebhookStatistics {
    pub total_events: i32,
    pub pending_events: i32,
    pub processing_events: i32,
    pub completed_events: i32,
    pub failed_events: i32,
    pub avg_processing_time_ms: Option<i32>,
}

#[Object]
impl WebhookStatistics {
    async fn total_events(&self) -> i32 {
        self.total_events
    }
    async fn pending_events(&self) -> i32 {
        self.pending_events
    }
    async fn processing_events(&self) -> i32 {
        self.processing_events
    }
    async fn completed_events(&self) -> i32 {
        self.completed_events
    }
    async fn failed_events(&self) -> i32 {
        self.failed_events
    }
    async fn avg_processing_time_ms(&self) -> Option<i32> {
        self.avg_processing_time_ms
    }
}

impl From<crate::services::webhook_processor::WebhookEventStats> for WebhookStatistics {
    fn from(stats: crate::services::webhook_processor::WebhookEventStats) -> Self {
        Self {
            total_events: stats.total as i32,
            pending_events: stats.pending as i32,
            processing_events: stats.processing as i32,
            completed_events: stats.completed as i32,
            failed_events: stats.failed as i32,
            avg_processing_time_ms: stats.avg_processing_time_ms.map(|t| t as i32),
        }
    }
}
