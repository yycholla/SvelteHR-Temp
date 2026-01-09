//! Email Digest GraphQL Queries

use async_graphql::{Context, Object, Result};
use chrono::{DateTime, Utc};
use uuid::Uuid;
use std::sync::Arc;

use crate::auth::UserContext;
use crate::services::digest_service::DigestService;
use crate::services::permission_checker::{PermissionChecker, SyncPermission};
use crate::models::{email_digests, email_digest_log};

#[derive(Default)]
pub struct DigestQueries;

#[Object]
impl DigestQueries {
    /// Get email digest configuration by ID
    async fn email_digest(
        &self,
        ctx: &Context<'_>,
        digest_id: String,
    ) -> Result<Option<EmailDigest>> {
        let user_ctx = ctx.data::<UserContext>()?;
        let db = ctx.data::<sea_orm::DatabaseConnection>()?;

        // Check permission
        let permission_checker = PermissionChecker::new(db.clone());
        permission_checker
            .require(user_ctx, SyncPermission::ManageIntegrations)
            .await?;

        let service = DigestService::new(Arc::new(db.clone()));
        let digest = service
            .get_digest(Uuid::parse_str(&digest_id)?)
            .await
            .map_err(|e| async_graphql::Error::new(format!("Failed to get digest: {}", e)))?;

        Ok(digest.map(EmailDigest::from))
    }

    /// Get all active email digests
    async fn email_digests(
        &self,
        ctx: &Context<'_>,
    ) -> Result<Vec<EmailDigest>> {
        let user_ctx = ctx.data::<UserContext>()?;
        let db = ctx.data::<sea_orm::DatabaseConnection>()?;

        // Check permission
        let permission_checker = PermissionChecker::new(db.clone());
        permission_checker
            .require(user_ctx, SyncPermission::ManageIntegrations)
            .await?;

        let service = DigestService::new(Arc::new(db.clone()));
        let digests = service.get_active_digests().await
            .map_err(|e| async_graphql::Error::new(format!("Failed to get digests: {}", e)))?;

        Ok(digests.into_iter().map(EmailDigest::from).collect())
    }

    /// Get delivery logs for a digest
    async fn email_digest_logs(
        &self,
        ctx: &Context<'_>,
        digest_id: String,
        limit: Option<i32>,
    ) -> Result<Vec<EmailDigestLog>> {
        let user_ctx = ctx.data::<UserContext>()?;
        let db = ctx.data::<sea_orm::DatabaseConnection>()?;

        // Check permission
        let permission_checker = PermissionChecker::new(db.clone());
        permission_checker
            .require(user_ctx, SyncPermission::ViewSyncHistory)
            .await?;

        let service = DigestService::new(Arc::new(db.clone()));
        let logs = service
            .get_digest_logs(
                Uuid::parse_str(&digest_id)?,
                limit.unwrap_or(50).max(1).min(100) as u64,
            )
            .await
            .map_err(|e| async_graphql::Error::new(format!("Failed to get digest logs: {}", e)))?;

        Ok(logs.into_iter().map(EmailDigestLog::from).collect())
    }
}

/// Email digest configuration
#[derive(Debug, Clone)]
pub struct EmailDigest {
    pub id: String,
    pub name: String,
    pub schedule_cron: String,
    pub recipients: Vec<String>,
    pub include_sync_summary: bool,
    pub include_conflicts: bool,
    pub include_health_metrics: bool,
    pub include_new_employees: bool,
    pub template_id: Option<String>,
    pub enabled: bool,
    pub last_sent_at: Option<DateTime<Utc>>,
    pub next_send_at: Option<DateTime<Utc>>,
    pub created_by: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[Object]
impl EmailDigest {
    async fn id(&self) -> &str { &self.id }
    async fn name(&self) -> &str { &self.name }
    async fn schedule_cron(&self) -> &str { &self.schedule_cron }
    async fn recipients(&self) -> &Vec<String> { &self.recipients }
    async fn include_sync_summary(&self) -> bool { self.include_sync_summary }
    async fn include_conflicts(&self) -> bool { self.include_conflicts }
    async fn include_health_metrics(&self) -> bool { self.include_health_metrics }
    async fn include_new_employees(&self) -> bool { self.include_new_employees }
    async fn template_id(&self) -> Option<&str> { self.template_id.as_deref() }
    async fn enabled(&self) -> bool { self.enabled }
    async fn last_sent_at(&self) -> Option<DateTime<Utc>> { self.last_sent_at }
    async fn next_send_at(&self) -> Option<DateTime<Utc>> { self.next_send_at }
    async fn created_by(&self) -> &str { &self.created_by }
    async fn created_at(&self) -> DateTime<Utc> { self.created_at }
    async fn updated_at(&self) -> DateTime<Utc> { self.updated_at }
}

impl From<email_digests::Model> for EmailDigest {
    fn from(model: email_digests::Model) -> Self {
        Self {
            id: model.id.to_string(),
            name: model.name,
            schedule_cron: model.schedule_cron,
            recipients: model.recipients,
            include_sync_summary: model.include_sync_summary,
            include_conflicts: model.include_conflicts,
            include_health_metrics: model.include_health_metrics,
            include_new_employees: model.include_new_employees,
            template_id: model.template_id.map(|id| id.to_string()),
            enabled: model.enabled,
            last_sent_at: model.last_sent_at.map(|dt| dt.with_timezone(&Utc)),
            next_send_at: model.next_send_at.map(|dt| dt.with_timezone(&Utc)),
            created_by: model.created_by.to_string(),
            created_at: model.created_at.with_timezone(&Utc),
            updated_at: model.updated_at.with_timezone(&Utc),
        }
    }
}

/// Email digest delivery log
#[derive(Debug, Clone)]
pub struct EmailDigestLog {
    pub id: String,
    pub digest_id: String,
    pub sent_at: DateTime<Utc>,
    pub recipients: Vec<String>,
    pub success: bool,
    pub error_message: Option<String>,
    pub period_start: Option<DateTime<Utc>>,
    pub period_end: Option<DateTime<Utc>>,
    pub content_summary: Option<serde_json::Value>,
}

#[Object]
impl EmailDigestLog {
    async fn id(&self) -> &str { &self.id }
    async fn digest_id(&self) -> &str { &self.digest_id }
    async fn sent_at(&self) -> DateTime<Utc> { self.sent_at }
    async fn recipients(&self) -> &Vec<String> { &self.recipients }
    async fn success(&self) -> bool { self.success }
    async fn error_message(&self) -> Option<&str> { self.error_message.as_deref() }
    async fn period_start(&self) -> Option<DateTime<Utc>> { self.period_start }
    async fn period_end(&self) -> Option<DateTime<Utc>> { self.period_end }
    async fn content_summary(&self) -> Option<&serde_json::Value> { self.content_summary.as_ref() }
}

impl From<email_digest_log::Model> for EmailDigestLog {
    fn from(model: email_digest_log::Model) -> Self {
        Self {
            id: model.id.to_string(),
            digest_id: model.digest_id.to_string(),
            sent_at: model.sent_at.with_timezone(&Utc),
            recipients: model.recipients,
            success: model.success,
            error_message: model.error_message,
            period_start: model.period_start.map(|dt| dt.with_timezone(&Utc)),
            period_end: model.period_end.map(|dt| dt.with_timezone(&Utc)),
            content_summary: model.content_summary,
        }
    }
}
