//! Audit Logging Service
//!
//! Comprehensive audit trail for all system activities

use crate::models::{audit_logs, audit_log_retention};
use chrono::Utc;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, DatabaseConnection, EntityTrait, PaginatorTrait, QueryFilter,
    QueryOrder, QuerySelect, Set,
};
use serde_json::Value as JsonValue;
use std::sync::Arc;
use uuid::Uuid;

/// Audit logger service
pub struct AuditLogger {
    db: Arc<DatabaseConnection>,
}

/// Builder for creating audit log entries
pub struct AuditLogBuilder {
    event_type: String,
    event_category: String,
    entity_type: Option<String>,
    entity_id: Option<String>,
    user_id: Option<Uuid>,
    user_email: Option<String>,
    action: String,
    description: String,
    old_values: Option<JsonValue>,
    new_values: Option<JsonValue>,
    changes_summary: Option<JsonValue>,
    ip_address: Option<String>,
    user_agent: Option<String>,
    session_id: Option<Uuid>,
    sync_direction: Option<String>,
    sync_job_id: Option<Uuid>,
    source: String,
    status: String,
    error_message: Option<String>,
    metadata: Option<JsonValue>,
}

impl AuditLogBuilder {
    pub fn new(event_type: impl Into<String>, event_category: impl Into<String>) -> Self {
        Self {
            event_type: event_type.into(),
            event_category: event_category.into(),
            entity_type: None,
            entity_id: None,
            user_id: None,
            user_email: None,
            action: "read".to_string(),
            description: String::new(),
            old_values: None,
            new_values: None,
            changes_summary: None,
            ip_address: None,
            user_agent: None,
            session_id: None,
            sync_direction: None,
            sync_job_id: None,
            source: "system".to_string(),
            status: "success".to_string(),
            error_message: None,
            metadata: None,
        }
    }

    pub fn entity(mut self, entity_type: impl Into<String>, entity_id: impl Into<String>) -> Self {
        self.entity_type = Some(entity_type.into());
        self.entity_id = Some(entity_id.into());
        self
    }

    pub fn user(mut self, user_id: Uuid, user_email: impl Into<String>) -> Self {
        self.user_id = Some(user_id);
        self.user_email = Some(user_email.into());
        self
    }

    pub fn action(mut self, action: impl Into<String>) -> Self {
        self.action = action.into();
        self
    }

    pub fn description(mut self, description: impl Into<String>) -> Self {
        self.description = description.into();
        self
    }

    pub fn changes(
        mut self,
        old_values: Option<JsonValue>,
        new_values: Option<JsonValue>,
        summary: Option<JsonValue>,
    ) -> Self {
        self.old_values = old_values;
        self.new_values = new_values;
        self.changes_summary = summary;
        self
    }

    pub fn http_context(
        mut self,
        ip_address: Option<String>,
        user_agent: Option<String>,
        session_id: Option<Uuid>,
    ) -> Self {
        self.ip_address = ip_address;
        self.user_agent = user_agent;
        self.session_id = session_id;
        self
    }

    pub fn sync_context(
        mut self,
        direction: Option<String>,
        job_id: Option<Uuid>,
    ) -> Self {
        self.sync_direction = direction;
        self.sync_job_id = job_id;
        self
    }

    pub fn source(mut self, source: impl Into<String>) -> Self {
        self.source = source.into();
        self
    }

    pub fn status(mut self, status: impl Into<String>) -> Self {
        self.status = status.into();
        self
    }

    pub fn error(mut self, error_message: impl Into<String>) -> Self {
        self.error_message = Some(error_message.into());
        self.status = "failed".to_string();
        self
    }

    pub fn metadata(mut self, metadata: JsonValue) -> Self {
        self.metadata = Some(metadata);
        self
    }

    pub fn build(self) -> audit_logs::ActiveModel {
        audit_logs::ActiveModel {
            id: Set(Uuid::new_v4()),
            event_type: Set(self.event_type),
            event_category: Set(self.event_category),
            entity_type: Set(self.entity_type),
            entity_id: Set(self.entity_id),
            user_id: Set(self.user_id),
            user_email: Set(self.user_email),
            action: Set(self.action),
            description: Set(self.description),
            old_values: Set(self.old_values),
            new_values: Set(self.new_values),
            changes_summary: Set(self.changes_summary),
            ip_address: Set(self.ip_address),
            user_agent: Set(self.user_agent),
            session_id: Set(self.session_id),
            sync_direction: Set(self.sync_direction),
            sync_job_id: Set(self.sync_job_id),
            source: Set(self.source),
            status: Set(self.status),
            error_message: Set(self.error_message),
            metadata: Set(self.metadata),
            created_at: Set(Utc::now().into()),
            // Tamper detection fields (will be set by AuditLogger when recording)
            audit_id: Set(None),
            previous_audit_id: Set(None),
            audit_hash: Set(None),
            entity_name: Set(None),
        }
    }
}

impl AuditLogger {
    pub fn new(db: Arc<DatabaseConnection>) -> Self {
        Self { db }
    }

    /// Create a new audit log builder
    pub fn log(&self, event_type: impl Into<String>, event_category: impl Into<String>) -> AuditLogBuilder {
        AuditLogBuilder::new(event_type, event_category)
    }

    /// Record an audit log entry with tamper detection
    pub async fn record(&self, mut log: audit_logs::ActiveModel) -> Result<Uuid, sea_orm::DbErr> {
        use sha2::{Sha256, Digest};

        // Generate unique audit ID
        let audit_id = format!("AUD-{}", Uuid::new_v4());
        log.audit_id = Set(Some(audit_id.clone()));

        // Get the last audit entry for chaining
        let previous_audit_id = self.get_last_audit_id().await?;
        log.previous_audit_id = Set(previous_audit_id.clone());

        // Calculate hash for tamper detection
        let mut hasher = Sha256::new();
        hasher.update(audit_id.as_bytes());
        if let Some(prev_id) = &previous_audit_id {
            hasher.update(prev_id.as_bytes());
        }
        hasher.update(log.event_type.as_ref().as_bytes());
        hasher.update(log.action.as_ref().as_bytes());
        if let Some(entity_id) = log.entity_id.as_ref() {
            hasher.update(entity_id.as_bytes());
        }
        // Hash the snapshots
        if let Some(old_vals) = log.old_values.as_ref() {
            if let Ok(json_bytes) = serde_json::to_vec(old_vals) {
                hasher.update(&json_bytes);
            }
        }
        if let Some(new_vals) = log.new_values.as_ref() {
            if let Ok(json_bytes) = serde_json::to_vec(new_vals) {
                hasher.update(&json_bytes);
            }
        }

        let audit_hash = format!("{:x}", hasher.finalize());
        log.audit_hash = Set(Some(audit_hash));

        let result = log.insert(&*self.db).await?;
        Ok(result.id)
    }

    /// Get the last audit ID for chain linking
    async fn get_last_audit_id(&self) -> Result<Option<String>, sea_orm::DbErr> {
        let last_entry = audit_logs::Entity::find()
            .filter(audit_logs::Column::AuditId.is_not_null())
            .order_by_desc(audit_logs::Column::CreatedAt)
            .one(&*self.db)
            .await?;

        Ok(last_entry.and_then(|e| e.audit_id))
    }

    /// Log sync operation
    pub async fn log_sync(
        &self,
        direction: &str,
        entity_type: &str,
        entity_id: &str,
        action: &str,
        description: &str,
        old_values: Option<JsonValue>,
        new_values: Option<JsonValue>,
        sync_job_id: Option<Uuid>,
        status: &str,
    ) -> Result<Uuid, sea_orm::DbErr> {
        let log = self
            .log("sync_operation", "sync")
            .entity(entity_type, entity_id)
            .action(action)
            .description(description)
            .changes(old_values, new_values, None)
            .sync_context(Some(direction.to_string()), sync_job_id)
            .source("sync_job")
            .status(status)
            .build();

        self.record(log).await
    }

    /// Log user authentication
    pub async fn log_auth(
        &self,
        event_type: &str,
        user_id: Option<Uuid>,
        user_email: &str,
        ip_address: Option<String>,
        user_agent: Option<String>,
        session_id: Option<Uuid>,
        success: bool,
        error_message: Option<String>,
    ) -> Result<Uuid, sea_orm::DbErr> {
        let mut builder = self
            .log(event_type, "auth")
            .action(event_type)
            .description(format!("User {} attempt", event_type))
            .http_context(ip_address, user_agent, session_id)
            .source("web_ui")
            .status(if success { "success" } else { "failed" });

        if let Some(uid) = user_id {
            builder = builder.user(uid, user_email);
        }

        if let Some(err) = error_message {
            builder = builder.error(err);
        }

        self.record(builder.build()).await
    }

    /// Log data change
    pub async fn log_data_change(
        &self,
        entity_type: &str,
        entity_id: &str,
        action: &str,
        user_id: Uuid,
        user_email: &str,
        old_values: Option<JsonValue>,
        new_values: Option<JsonValue>,
        changes_summary: Option<JsonValue>,
    ) -> Result<Uuid, sea_orm::DbErr> {
        let log = self
            .log(format!("{}_changed", entity_type), "data_change")
            .entity(entity_type, entity_id)
            .user(user_id, user_email)
            .action(action)
            .description(format!("{} {} on {}", action, entity_type, entity_id))
            .changes(old_values, new_values, changes_summary)
            .source("web_ui")
            .build();

        self.record(log).await
    }

    /// Get audit logs with pagination
    pub async fn get_logs(
        &self,
        filters: AuditLogFilters,
        limit: u64,
        offset: u64,
    ) -> Result<(Vec<audit_logs::Model>, u64), sea_orm::DbErr> {
        let mut query = audit_logs::Entity::find();

        // Apply filters
        if let Some(event_category) = filters.event_category {
            query = query.filter(audit_logs::Column::EventCategory.eq(event_category));
        }
        if let Some(user_id) = filters.user_id {
            query = query.filter(audit_logs::Column::UserId.eq(user_id));
        }
        if let Some(entity_type) = filters.entity_type {
            query = query.filter(audit_logs::Column::EntityType.eq(entity_type));
        }
        if let Some(entity_id) = filters.entity_id {
            query = query.filter(audit_logs::Column::EntityId.eq(entity_id));
        }
        if let Some(sync_job_id) = filters.sync_job_id {
            query = query.filter(audit_logs::Column::SyncJobId.eq(sync_job_id));
        }
        if let Some(start_date) = filters.start_date {
            query = query.filter(audit_logs::Column::CreatedAt.gte(start_date));
        }
        if let Some(end_date) = filters.end_date {
            query = query.filter(audit_logs::Column::CreatedAt.lte(end_date));
        }

        // Get total count
        let total = query.clone().count(&*self.db).await?;

        // Get paginated results
        let logs = query
            .order_by_desc(audit_logs::Column::CreatedAt)
            .limit(limit)
            .offset(offset)
            .all(&*self.db)
            .await?;

        Ok((logs, total))
    }

    /// Get audit logs for a specific entity
    pub async fn get_entity_audit_trail(
        &self,
        entity_type: &str,
        entity_id: &str,
        limit: u64,
    ) -> Result<Vec<audit_logs::Model>, sea_orm::DbErr> {
        audit_logs::Entity::find()
            .filter(audit_logs::Column::EntityType.eq(entity_type))
            .filter(audit_logs::Column::EntityId.eq(entity_id))
            .order_by_desc(audit_logs::Column::CreatedAt)
            .limit(limit)
            .all(&*self.db)
            .await
    }

    /// Get retention policy for an event category
    pub async fn get_retention_policy(
        &self,
        event_category: &str,
    ) -> Result<Option<audit_log_retention::Model>, sea_orm::DbErr> {
        audit_log_retention::Entity::find()
            .filter(audit_log_retention::Column::EventCategory.eq(event_category))
            .filter(audit_log_retention::Column::IsActive.eq(true))
            .one(&*self.db)
            .await
    }

    /// Clean up old audit logs based on retention policies
    pub async fn cleanup_old_logs(&self) -> Result<u64, sea_orm::DbErr> {
        let policies = audit_log_retention::Entity::find()
            .filter(audit_log_retention::Column::IsActive.eq(true))
            .all(&*self.db)
            .await?;

        let mut total_deleted = 0u64;

        for policy in policies {
            let cutoff_date = Utc::now() - chrono::Duration::days(policy.retention_days as i64);

            let delete_result = audit_logs::Entity::delete_many()
                .filter(audit_logs::Column::EventCategory.eq(&policy.event_category))
                .filter(audit_logs::Column::CreatedAt.lt(cutoff_date))
                .exec(&*self.db)
                .await?;

            total_deleted += delete_result.rows_affected;
        }

        Ok(total_deleted)
    }

    /// Verify the integrity of the audit trail chain
    pub async fn verify_audit_chain(
        &self,
        from: chrono::DateTime<Utc>,
        to: chrono::DateTime<Utc>,
    ) -> Result<AuditVerification, sea_orm::DbErr> {
        use sha2::{Sha256, Digest};

        let entries = audit_logs::Entity::find()
            .filter(audit_logs::Column::CreatedAt.gte(from))
            .filter(audit_logs::Column::CreatedAt.lte(to))
            .filter(audit_logs::Column::AuditId.is_not_null())
            .order_by_asc(audit_logs::Column::CreatedAt)
            .all(&*self.db)
            .await?;

        let mut valid = true;
        let mut issues = Vec::new();
        let total_entries = entries.len();

        for (i, entry) in entries.iter().enumerate() {
            // Verify hash
            if let Some(stored_hash) = &entry.audit_hash {
                let mut hasher = Sha256::new();
                if let Some(audit_id) = &entry.audit_id {
                    hasher.update(audit_id.as_bytes());
                }
                if let Some(prev_id) = &entry.previous_audit_id {
                    hasher.update(prev_id.as_bytes());
                }
                hasher.update(entry.event_type.as_bytes());
                hasher.update(entry.action.as_bytes());
                if let Some(entity_id) = &entry.entity_id {
                    hasher.update(entity_id.as_bytes());
                }
                if let Some(old_vals) = &entry.old_values {
                    if let Ok(json_bytes) = serde_json::to_vec(old_vals) {
                        hasher.update(&json_bytes);
                    }
                }
                if let Some(new_vals) = &entry.new_values {
                    if let Ok(json_bytes) = serde_json::to_vec(new_vals) {
                        hasher.update(&json_bytes);
                    }
                }

                let computed_hash = format!("{:x}", hasher.finalize());
                if stored_hash != &computed_hash {
                    valid = false;
                    issues.push(format!(
                        "Hash mismatch for audit {} - possible tampering detected",
                        entry.audit_id.as_ref().unwrap_or(&"unknown".to_string())
                    ));
                }
            } else {
                // Entry missing hash (legacy entry)
                issues.push(format!(
                    "Audit entry {} missing hash - created before tamper detection was enabled",
                    entry.audit_id.as_ref().unwrap_or(&"unknown".to_string())
                ));
            }

            // Verify chain linkage (skip first entry)
            if i > 0 {
                let expected_prev_id = entries[i - 1].audit_id.clone();
                if entry.previous_audit_id != expected_prev_id {
                    valid = false;
                    issues.push(format!(
                        "Chain broken at audit {} - expected previous ID {:?}, got {:?}",
                        entry.audit_id.as_ref().unwrap_or(&"unknown".to_string()),
                        expected_prev_id,
                        entry.previous_audit_id
                    ));
                }
            }
        }

        Ok(AuditVerification {
            valid,
            total_entries,
            issues_found: issues.len(),
            issues,
        })
    }

    /// Generate compliance report for a date range
    pub async fn generate_compliance_report(
        &self,
        from: chrono::DateTime<Utc>,
        to: chrono::DateTime<Utc>,
    ) -> Result<ComplianceReport, sea_orm::DbErr> {
        // Get all logs in range
        let logs = audit_logs::Entity::find()
            .filter(audit_logs::Column::CreatedAt.gte(from))
            .filter(audit_logs::Column::CreatedAt.lte(to))
            .all(&*self.db)
            .await?;

        let total_actions = logs.len() as i32;

        // Count failed operations
        let failed_operations = logs
            .iter()
            .filter(|log| log.status == "failed")
            .count() as i32;

        // Count data modifications
        let data_modifications = logs
            .iter()
            .filter(|log| {
                log.event_category == "data_change" ||
                log.event_category == "sync"
            })
            .count() as i32;

        // Group by user for user activity
        use std::collections::HashMap;
        let mut user_activity_map: HashMap<String, UserActivityStats> = HashMap::new();

        for log in &logs {
            if let Some(user_email) = &log.user_email {
                let stats = user_activity_map
                    .entry(user_email.clone())
                    .or_insert(UserActivityStats {
                        user_email: user_email.clone(),
                        total_actions: 0,
                        failed_actions: 0,
                        data_changes: 0,
                    });

                stats.total_actions += 1;
                if log.status == "failed" {
                    stats.failed_actions += 1;
                }
                if log.event_category == "data_change" {
                    stats.data_changes += 1;
                }
            }
        }

        let user_activity: Vec<UserActivityStats> = user_activity_map.into_values().collect();

        Ok(ComplianceReport {
            start_date: from,
            end_date: to,
            total_actions,
            data_modifications,
            failed_operations,
            user_activity,
        })
    }
}

/// Audit chain verification result
#[derive(Debug, Clone)]
pub struct AuditVerification {
    pub valid: bool,
    pub total_entries: usize,
    pub issues_found: usize,
    pub issues: Vec<String>,
}

/// Compliance report data
#[derive(Debug, Clone)]
pub struct ComplianceReport {
    pub start_date: chrono::DateTime<Utc>,
    pub end_date: chrono::DateTime<Utc>,
    pub total_actions: i32,
    pub data_modifications: i32,
    pub failed_operations: i32,
    pub user_activity: Vec<UserActivityStats>,
}

/// User activity statistics
#[derive(Debug, Clone)]
pub struct UserActivityStats {
    pub user_email: String,
    pub total_actions: i32,
    pub failed_actions: i32,
    pub data_changes: i32,
}

/// Filters for querying audit logs
#[derive(Debug, Clone, Default)]
pub struct AuditLogFilters {
    pub event_category: Option<String>,
    pub user_id: Option<Uuid>,
    pub entity_type: Option<String>,
    pub entity_id: Option<String>,
    pub sync_job_id: Option<Uuid>,
    pub start_date: Option<chrono::DateTime<Utc>>,
    pub end_date: Option<chrono::DateTime<Utc>>,
}
