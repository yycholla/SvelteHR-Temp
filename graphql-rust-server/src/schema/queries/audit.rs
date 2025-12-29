//! Audit Trail GraphQL Queries

use async_graphql::{Context, InputObject, Object, Result};
use chrono::{DateTime, Utc};

use crate::auth::UserContext;
use crate::services::audit_logger::{AuditLogger, AuditLogFilters};
use crate::services::permission_checker::{PermissionChecker, SyncPermission};
use crate::models::audit_logs;

use std::sync::Arc;
use uuid::Uuid;

#[derive(Default)]
pub struct AuditQueries;

#[Object]
impl AuditQueries {
    /// Get audit logs with pagination and filtering
    async fn audit_logs(
        &self,
        ctx: &Context<'_>,
        filters: Option<AuditLogFiltersInput>,
        limit: Option<i32>,
        offset: Option<i32>,
    ) -> Result<AuditLogsResult> {
        let user_ctx = ctx.data::<UserContext>()?;
        let db = ctx.data::<Arc<sea_orm::DatabaseConnection>>()?;

        // Check permission
        let permission_checker = PermissionChecker::new((**db).clone());
        permission_checker
            .require(user_ctx, SyncPermission::ViewSyncHistory)
            .await?;

        let audit_logger = AuditLogger::new(db.clone());

        // Convert filters
        let service_filters = filters.map(|f| AuditLogFilters {
            event_category: f.event_category,
            user_id: f.user_id,
            entity_type: f.entity_type,
            entity_id: f.entity_id,
            sync_job_id: f.sync_job_id,
            start_date: f.start_date,
            end_date: f.end_date,
        }).unwrap_or_default();

        let (logs, total) = audit_logger
            .get_logs(
                service_filters,
                limit.unwrap_or(20).max(1).min(100) as u64,
                offset.unwrap_or(0).max(0) as u64,
            )
            .await?;

        Ok(AuditLogsResult {
            logs: logs.into_iter().map(AuditLog::from).collect(),
            total: total as i32,
        })
    }

    /// Get audit trail for a specific entity
    async fn entity_audit_trail(
        &self,
        ctx: &Context<'_>,
        entity_type: String,
        entity_id: String,
        limit: Option<i32>,
    ) -> Result<Vec<AuditLog>> {
        let user_ctx = ctx.data::<UserContext>()?;
        let db = ctx.data::<Arc<sea_orm::DatabaseConnection>>()?;

        // Check permission
        let permission_checker = PermissionChecker::new((**db).clone());
        permission_checker
            .require(user_ctx, SyncPermission::ViewSyncHistory)
            .await?;

        let audit_logger = AuditLogger::new(db.clone());
        let logs = audit_logger
            .get_entity_audit_trail(
                &entity_type,
                &entity_id,
                limit.unwrap_or(50).max(1).min(200) as u64,
            )
            .await?;

        Ok(logs.into_iter().map(AuditLog::from).collect())
    }
}

/// Input filters for audit log queries
#[derive(Debug, Clone, InputObject)]
pub struct AuditLogFiltersInput {
    pub event_category: Option<String>,
    pub user_id: Option<Uuid>,
    pub entity_type: Option<String>,
    pub entity_id: Option<String>,
    pub sync_job_id: Option<Uuid>,
    pub start_date: Option<DateTime<Utc>>,
    pub end_date: Option<DateTime<Utc>>,
}

/// Audit logs result with pagination
#[derive(Debug, Clone)]
pub struct AuditLogsResult {
    pub logs: Vec<AuditLog>,
    pub total: i32,
}

#[Object]
impl AuditLogsResult {
    async fn logs(&self) -> &Vec<AuditLog> {
        &self.logs
    }

    async fn total(&self) -> i32 {
        self.total
    }
}

/// Individual audit log entry
#[derive(Debug, Clone)]
pub struct AuditLog {
    pub id: String,
    pub event_type: String,
    pub event_category: String,
    pub entity_type: Option<String>,
    pub entity_id: Option<String>,
    pub user_id: Option<String>,
    pub user_email: Option<String>,
    pub action: String,
    pub description: String,
    pub old_values: Option<serde_json::Value>,
    pub new_values: Option<serde_json::Value>,
    pub changes_summary: Option<serde_json::Value>,
    pub ip_address: Option<String>,
    pub user_agent: Option<String>,
    pub session_id: Option<String>,
    pub sync_direction: Option<String>,
    pub sync_job_id: Option<String>,
    pub source: String,
    pub status: String,
    pub error_message: Option<String>,
    pub metadata: Option<serde_json::Value>,
    pub created_at: DateTime<Utc>,
}

#[Object]
impl AuditLog {
    async fn id(&self) -> &str {
        &self.id
    }

    async fn event_type(&self) -> &str {
        &self.event_type
    }

    async fn event_category(&self) -> &str {
        &self.event_category
    }

    async fn entity_type(&self) -> Option<&str> {
        self.entity_type.as_deref()
    }

    async fn entity_id(&self) -> Option<&str> {
        self.entity_id.as_deref()
    }

    async fn user_id(&self) -> Option<&str> {
        self.user_id.as_deref()
    }

    async fn user_email(&self) -> Option<&str> {
        self.user_email.as_deref()
    }

    async fn action(&self) -> &str {
        &self.action
    }

    async fn description(&self) -> &str {
        &self.description
    }

    async fn old_values(&self) -> Option<&serde_json::Value> {
        self.old_values.as_ref()
    }

    async fn new_values(&self) -> Option<&serde_json::Value> {
        self.new_values.as_ref()
    }

    async fn changes_summary(&self) -> Option<&serde_json::Value> {
        self.changes_summary.as_ref()
    }

    async fn ip_address(&self) -> Option<&str> {
        self.ip_address.as_deref()
    }

    async fn user_agent(&self) -> Option<&str> {
        self.user_agent.as_deref()
    }

    async fn session_id(&self) -> Option<&str> {
        self.session_id.as_deref()
    }

    async fn sync_direction(&self) -> Option<&str> {
        self.sync_direction.as_deref()
    }

    async fn sync_job_id(&self) -> Option<&str> {
        self.sync_job_id.as_deref()
    }

    async fn source(&self) -> &str {
        &self.source
    }

    async fn status(&self) -> &str {
        &self.status
    }

    async fn error_message(&self) -> Option<&str> {
        self.error_message.as_deref()
    }

    async fn metadata(&self) -> Option<&serde_json::Value> {
        self.metadata.as_ref()
    }

    async fn created_at(&self) -> DateTime<Utc> {
        self.created_at
    }
}

impl From<audit_logs::Model> for AuditLog {
    fn from(model: audit_logs::Model) -> Self {
        Self {
            id: model.id.to_string(),
            event_type: model.event_type,
            event_category: model.event_category,
            entity_type: model.entity_type,
            entity_id: model.entity_id,
            user_id: model.user_id.map(|id| id.to_string()),
            user_email: model.user_email,
            action: model.action,
            description: model.description,
            old_values: model.old_values,
            new_values: model.new_values,
            changes_summary: model.changes_summary,
            ip_address: model.ip_address,
            user_agent: model.user_agent,
            session_id: model.session_id.map(|id| id.to_string()),
            sync_direction: model.sync_direction,
            sync_job_id: model.sync_job_id.map(|id| id.to_string()),
            source: model.source,
            status: model.status,
            error_message: model.error_message,
            metadata: model.metadata,
            created_at: model.created_at.with_timezone(&Utc),
        }
    }
}
