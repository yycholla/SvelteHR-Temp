//! Email Digest GraphQL Mutations

use async_graphql::{Context, InputObject, Object, Result};
use chrono::{Duration, Utc};
use sea_orm::{ActiveModelTrait, EntityTrait, Set};
use std::sync::Arc;
use uuid::Uuid;

use crate::auth::UserContext;
use crate::models::email_digests;
use crate::services::digest_service::DigestService;
use crate::services::permission_checker::{PermissionChecker, SyncPermission};

#[derive(Default)]
pub struct DigestMutations;

#[derive(InputObject)]
pub struct CreateEmailDigestInput {
    pub name: String,
    pub schedule_cron: String,
    pub recipients: Vec<String>,
    pub include_sync_summary: Option<bool>,
    pub include_conflicts: Option<bool>,
    pub include_health_metrics: Option<bool>,
    pub include_new_employees: Option<bool>,
    pub enabled: Option<bool>,
}

#[derive(InputObject)]
pub struct UpdateEmailDigestInput {
    pub name: Option<String>,
    pub schedule_cron: Option<String>,
    pub recipients: Option<Vec<String>>,
    pub include_sync_summary: Option<bool>,
    pub include_conflicts: Option<bool>,
    pub include_health_metrics: Option<bool>,
    pub include_new_employees: Option<bool>,
    pub enabled: Option<bool>,
}

#[derive(InputObject)]
pub struct SendDigestInput {
    pub period_days: Option<i32>,
}

#[Object]
impl DigestMutations {
    /// Create a new email digest configuration
    async fn create_email_digest(
        &self,
        ctx: &Context<'_>,
        input: CreateEmailDigestInput,
    ) -> Result<CreateEmailDigestResult> {
        let user_ctx = ctx.data::<UserContext>()?;
        let db = ctx.data::<sea_orm::DatabaseConnection>()?;

        // Check permission
        let permission_checker = PermissionChecker::new(db.clone());
        permission_checker
            .require(user_ctx, SyncPermission::ManageIntegrations)
            .await?;

        let digest_id = Uuid::new_v4();
        let now = Utc::now();

        // Calculate next send time based on cron schedule
        let service = DigestService::new(Arc::new(db.clone()));
        let next_send_at = service.calculate_next_send_time(&input.schedule_cron, now);

        let digest = email_digests::ActiveModel {
            id: Set(digest_id),
            name: Set(input.name),
            schedule_cron: Set(input.schedule_cron),
            recipients: Set(input.recipients),
            include_sync_summary: Set(input.include_sync_summary.unwrap_or(true)),
            include_conflicts: Set(input.include_conflicts.unwrap_or(true)),
            include_health_metrics: Set(input.include_health_metrics.unwrap_or(true)),
            include_new_employees: Set(input.include_new_employees.unwrap_or(false)),
            template_id: Set(None),
            enabled: Set(input.enabled.unwrap_or(true)),
            last_sent_at: Set(None),
            next_send_at: Set(next_send_at.map(|dt| dt.into())),
            created_by: Set(user_ctx.user_id),
            created_at: Set(now.into()),
            updated_at: Set(now.into()),
        };

        let model = digest.insert(db).await?;

        Ok(CreateEmailDigestResult {
            digest_id: model.id.to_string(),
            success: true,
        })
    }

    /// Update email digest configuration
    async fn update_email_digest(
        &self,
        ctx: &Context<'_>,
        digest_id: String,
        input: UpdateEmailDigestInput,
    ) -> Result<UpdateEmailDigestResult> {
        let user_ctx = ctx.data::<UserContext>()?;
        let db = ctx.data::<sea_orm::DatabaseConnection>()?;

        // Check permission
        let permission_checker = PermissionChecker::new(db.clone());
        permission_checker
            .require(user_ctx, SyncPermission::ManageIntegrations)
            .await?;

        let uuid = Uuid::parse_str(&digest_id)?;
        let digest_model = email_digests::Entity::find_by_id(uuid)
            .one(db)
            .await?
            .ok_or_else(|| async_graphql::Error::new("Digest not found"))?;

        let mut active_model: email_digests::ActiveModel = digest_model.into();

        if let Some(name) = input.name {
            active_model.name = Set(name);
        }
        if let Some(cron) = input.schedule_cron {
            active_model.schedule_cron = Set(cron.clone());
            // Recalculate next send time
            let service = DigestService::new(Arc::new(db.clone()));
            let next_send = service.calculate_next_send_time(&cron, Utc::now());
            active_model.next_send_at = Set(next_send.map(|dt| dt.into()));
        }
        if let Some(recipients) = input.recipients {
            active_model.recipients = Set(recipients);
        }
        if let Some(include_sync) = input.include_sync_summary {
            active_model.include_sync_summary = Set(include_sync);
        }
        if let Some(include_conflicts) = input.include_conflicts {
            active_model.include_conflicts = Set(include_conflicts);
        }
        if let Some(include_health) = input.include_health_metrics {
            active_model.include_health_metrics = Set(include_health);
        }
        if let Some(include_employees) = input.include_new_employees {
            active_model.include_new_employees = Set(include_employees);
        }
        if let Some(enabled) = input.enabled {
            active_model.enabled = Set(enabled);
        }

        active_model.updated_at = Set(Utc::now().into());
        active_model.update(db).await?;

        Ok(UpdateEmailDigestResult { success: true })
    }

    /// Delete email digest configuration
    async fn delete_email_digest(
        &self,
        ctx: &Context<'_>,
        digest_id: String,
    ) -> Result<DeleteEmailDigestResult> {
        let user_ctx = ctx.data::<UserContext>()?;
        let db = ctx.data::<sea_orm::DatabaseConnection>()?;

        // Check permission
        let permission_checker = PermissionChecker::new(db.clone());
        permission_checker
            .require(user_ctx, SyncPermission::ManageIntegrations)
            .await?;

        let uuid = Uuid::parse_str(&digest_id)?;
        email_digests::Entity::delete_by_id(uuid).exec(db).await?;

        Ok(DeleteEmailDigestResult { success: true })
    }

    /// Manually send a digest now (for testing)
    async fn send_email_digest(
        &self,
        ctx: &Context<'_>,
        digest_id: String,
        input: Option<SendDigestInput>,
    ) -> Result<SendEmailDigestResult> {
        let user_ctx = ctx.data::<UserContext>()?;
        let db = ctx.data::<sea_orm::DatabaseConnection>()?;

        // Check permission
        let permission_checker = PermissionChecker::new(db.clone());
        permission_checker
            .require(user_ctx, SyncPermission::ManageIntegrations)
            .await?;

        let uuid = Uuid::parse_str(&digest_id)?;
        let service = DigestService::new(Arc::new(db.clone()));

        let digest = service
            .get_digest(uuid)
            .await
            .map_err(|e| async_graphql::Error::new(format!("Failed to get digest: {}", e)))?
            .ok_or_else(|| async_graphql::Error::new("Digest not found"))?;

        // Calculate time period
        let period_days = input.and_then(|i| i.period_days).unwrap_or(7);
        let period_end = Utc::now();
        let period_start = period_end - Duration::days(period_days as i64);

        // Generate digest content
        let content = service
            .generate_digest_content(
                period_start,
                period_end,
                digest.include_sync_summary,
                digest.include_conflicts,
                digest.include_health_metrics,
                digest.include_new_employees,
            )
            .await
            .map_err(|e| async_graphql::Error::new(format!("Failed to generate digest: {}", e)))?;

        // Send digest
        let result = service
            .send_digest(
                uuid,
                digest.name.clone(),
                digest.recipients.clone(),
                content,
                digest.include_sync_summary,
                digest.include_conflicts,
                digest.include_health_metrics,
                digest.include_new_employees,
            )
            .await
            .map_err(|e| async_graphql::Error::new(format!("Failed to send digest: {}", e)))?;

        Ok(SendEmailDigestResult {
            log_id: result.log_id.to_string(),
            recipients_count: result.recipients_count as i32,
            success: result.success,
            error_message: result.error_message,
        })
    }
}

#[derive(Debug, Clone)]
pub struct CreateEmailDigestResult {
    pub digest_id: String,
    pub success: bool,
}

#[Object]
impl CreateEmailDigestResult {
    async fn digest_id(&self) -> &str {
        &self.digest_id
    }
    async fn success(&self) -> bool {
        self.success
    }
}

#[derive(Debug, Clone)]
pub struct UpdateEmailDigestResult {
    pub success: bool,
}

#[Object]
impl UpdateEmailDigestResult {
    async fn success(&self) -> bool {
        self.success
    }
}

#[derive(Debug, Clone)]
pub struct DeleteEmailDigestResult {
    pub success: bool,
}

#[Object]
impl DeleteEmailDigestResult {
    async fn success(&self) -> bool {
        self.success
    }
}

#[derive(Debug, Clone)]
pub struct SendEmailDigestResult {
    pub log_id: String,
    pub recipients_count: i32,
    pub success: bool,
    pub error_message: Option<String>,
}

#[Object]
impl SendEmailDigestResult {
    async fn log_id(&self) -> &str {
        &self.log_id
    }
    async fn recipients_count(&self) -> i32 {
        self.recipients_count
    }
    async fn success(&self) -> bool {
        self.success
    }
    async fn error_message(&self) -> Option<&str> {
        self.error_message.as_deref()
    }
}
