//! Reconciliation GraphQL Queries

use async_graphql::{Context, Enum, Object, Result};
use chrono::{DateTime, Utc};

use crate::auth::UserContext;
use crate::services::reconciliation::{ReconciliationService, DiscrepancyStats as ServiceDiscrepancyStats};
use crate::services::permission_checker::{PermissionChecker, SyncPermission};
use crate::models::{reconciliation_reports, reconciliation_discrepancies};

use std::collections::HashMap;
use std::sync::Arc;
use uuid::Uuid;

#[derive(Default)]
pub struct ReconciliationQueries;

#[Object]
impl ReconciliationQueries {
    /// Get a reconciliation report by ID
    async fn reconciliation_report(
        &self,
        ctx: &Context<'_>,
        report_id: String,
    ) -> Result<Option<ReconciliationReport>> {
        let user_ctx = ctx.data::<UserContext>()?;
        let db = ctx.data::<Arc<sea_orm::DatabaseConnection>>()?;

        // Check permission
        let permission_checker = PermissionChecker::new((**db).clone());
        permission_checker
            .require(user_ctx, SyncPermission::ViewSyncHistory)
            .await?;

        let service = ReconciliationService::new(db.clone());
        let report = service
            .get_report(Uuid::parse_str(&report_id)?)
            .await?;

        Ok(report.map(ReconciliationReport::from))
    }

    /// Get recent reconciliation reports
    async fn reconciliation_reports(
        &self,
        ctx: &Context<'_>,
        entity_type: Option<ReconciliationEntityType>,
        limit: Option<i32>,
    ) -> Result<Vec<ReconciliationReport>> {
        let user_ctx = ctx.data::<UserContext>()?;
        let db = ctx.data::<Arc<sea_orm::DatabaseConnection>>()?;

        // Check permission
        let permission_checker = PermissionChecker::new((**db).clone());
        permission_checker
            .require(user_ctx, SyncPermission::ViewSyncHistory)
            .await?;

        let service = ReconciliationService::new(db.clone());
        let reports = service
            .get_recent_reports(
                entity_type.map(|et| et.as_str().to_string()),
                limit.unwrap_or(10).max(1).min(50) as u64,
            )
            .await?;

        Ok(reports.into_iter().map(ReconciliationReport::from).collect())
    }

    /// Get discrepancies for a report
    async fn report_discrepancies(
        &self,
        ctx: &Context<'_>,
        report_id: String,
        unresolved_only: Option<bool>,
    ) -> Result<Vec<ReconciliationDiscrepancy>> {
        let user_ctx = ctx.data::<UserContext>()?;
        let db = ctx.data::<Arc<sea_orm::DatabaseConnection>>()?;

        // Check permission
        let permission_checker = PermissionChecker::new((**db).clone());
        permission_checker
            .require(user_ctx, SyncPermission::ViewSyncHistory)
            .await?;

        let service = ReconciliationService::new(db.clone());
        let discrepancies = service
            .get_report_discrepancies(
                Uuid::parse_str(&report_id)?,
                unresolved_only.unwrap_or(false),
            )
            .await?;

        Ok(discrepancies.into_iter().map(ReconciliationDiscrepancy::from).collect())
    }

    /// Get discrepancy statistics for a report
    async fn discrepancy_stats(
        &self,
        ctx: &Context<'_>,
        report_id: String,
    ) -> Result<DiscrepancyStats> {
        let user_ctx = ctx.data::<UserContext>()?;
        let db = ctx.data::<Arc<sea_orm::DatabaseConnection>>()?;

        // Check permission
        let permission_checker = PermissionChecker::new((**db).clone());
        permission_checker
            .require(user_ctx, SyncPermission::ViewSyncHistory)
            .await?;

        let service = ReconciliationService::new(db.clone());
        let stats = service
            .get_discrepancy_stats(Uuid::parse_str(&report_id)?)
            .await?;

        Ok(DiscrepancyStats::from(stats))
    }
}

/// Reconciliation entity type
#[derive(Debug, Clone, Copy, Enum, PartialEq, Eq)]
pub enum ReconciliationEntityType {
    #[graphql(name = "EMPLOYEE")]
    Employee,
    #[graphql(name = "DEPARTMENT")]
    Department,
    #[graphql(name = "ALL")]
    All,
}

impl ReconciliationEntityType {
    fn as_str(&self) -> &str {
        match self {
            ReconciliationEntityType::Employee => "employee",
            ReconciliationEntityType::Department => "department",
            ReconciliationEntityType::All => "all",
        }
    }
}

/// Reconciliation report
#[derive(Debug, Clone)]
pub struct ReconciliationReport {
    pub id: String,
    pub entity_type: String,
    pub status: String,
    pub total_local: i32,
    pub total_remote: i32,
    pub total_matched: i32,
    pub total_discrepancies: i32,
    pub missing_in_local: i32,
    pub missing_in_remote: i32,
    pub data_mismatches: i32,
    pub triggered_by: Option<String>,
    pub triggered_by_email: Option<String>,
    pub duration_ms: Option<i32>,
    pub error_message: Option<String>,
    pub summary: Option<serde_json::Value>,
    pub started_at: DateTime<Utc>,
    pub completed_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
}

#[Object]
impl ReconciliationReport {
    async fn id(&self) -> &str { &self.id }
    async fn entity_type(&self) -> &str { &self.entity_type }
    async fn status(&self) -> &str { &self.status }
    async fn total_local(&self) -> i32 { self.total_local }
    async fn total_remote(&self) -> i32 { self.total_remote }
    async fn total_matched(&self) -> i32 { self.total_matched }
    async fn total_discrepancies(&self) -> i32 { self.total_discrepancies }
    async fn missing_in_local(&self) -> i32 { self.missing_in_local }
    async fn missing_in_remote(&self) -> i32 { self.missing_in_remote }
    async fn data_mismatches(&self) -> i32 { self.data_mismatches }
    async fn triggered_by(&self) -> Option<&str> { self.triggered_by.as_deref() }
    async fn triggered_by_email(&self) -> Option<&str> { self.triggered_by_email.as_deref() }
    async fn duration_ms(&self) -> Option<i32> { self.duration_ms }
    async fn error_message(&self) -> Option<&str> { self.error_message.as_deref() }
    async fn summary(&self) -> Option<&serde_json::Value> { self.summary.as_ref() }
    async fn started_at(&self) -> DateTime<Utc> { self.started_at }
    async fn completed_at(&self) -> Option<DateTime<Utc>> { self.completed_at }
    async fn created_at(&self) -> DateTime<Utc> { self.created_at }
}

impl From<reconciliation_reports::Model> for ReconciliationReport {
    fn from(model: reconciliation_reports::Model) -> Self {
        Self {
            id: model.id.to_string(),
            entity_type: model.entity_type,
            status: model.status,
            total_local: model.total_local,
            total_remote: model.total_remote,
            total_matched: model.total_matched,
            total_discrepancies: model.total_discrepancies,
            missing_in_local: model.missing_in_local,
            missing_in_remote: model.missing_in_remote,
            data_mismatches: model.data_mismatches,
            triggered_by: model.triggered_by.map(|id| id.to_string()),
            triggered_by_email: model.triggered_by_email,
            duration_ms: model.duration_ms,
            error_message: model.error_message,
            summary: model.summary,
            started_at: model.started_at.with_timezone(&Utc),
            completed_at: model.completed_at.map(|dt| dt.with_timezone(&Utc)),
            created_at: model.created_at.with_timezone(&Utc),
        }
    }
}

/// Reconciliation discrepancy
#[derive(Debug, Clone)]
pub struct ReconciliationDiscrepancy {
    pub id: String,
    pub report_id: String,
    pub entity_type: String,
    pub entity_id: String,
    pub discrepancy_type: String,
    pub severity: String,
    pub field_name: Option<String>,
    pub local_value: Option<String>,
    pub remote_value: Option<String>,
    pub description: String,
    pub suggested_action: Option<String>,
    pub is_resolved: bool,
    pub resolved_at: Option<DateTime<Utc>>,
    pub resolved_by: Option<String>,
    pub resolution_notes: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[Object]
impl ReconciliationDiscrepancy {
    async fn id(&self) -> &str { &self.id }
    async fn report_id(&self) -> &str { &self.report_id }
    async fn entity_type(&self) -> &str { &self.entity_type }
    async fn entity_id(&self) -> &str { &self.entity_id }
    async fn discrepancy_type(&self) -> &str { &self.discrepancy_type }
    async fn severity(&self) -> &str { &self.severity }
    async fn field_name(&self) -> Option<&str> { self.field_name.as_deref() }
    async fn local_value(&self) -> Option<&str> { self.local_value.as_deref() }
    async fn remote_value(&self) -> Option<&str> { self.remote_value.as_deref() }
    async fn description(&self) -> &str { &self.description }
    async fn suggested_action(&self) -> Option<&str> { self.suggested_action.as_deref() }
    async fn is_resolved(&self) -> bool { self.is_resolved }
    async fn resolved_at(&self) -> Option<DateTime<Utc>> { self.resolved_at }
    async fn resolved_by(&self) -> Option<&str> { self.resolved_by.as_deref() }
    async fn resolution_notes(&self) -> Option<&str> { self.resolution_notes.as_deref() }
    async fn created_at(&self) -> DateTime<Utc> { self.created_at }
}

impl From<reconciliation_discrepancies::Model> for ReconciliationDiscrepancy {
    fn from(model: reconciliation_discrepancies::Model) -> Self {
        Self {
            id: model.id.to_string(),
            report_id: model.report_id.to_string(),
            entity_type: model.entity_type,
            entity_id: model.entity_id,
            discrepancy_type: model.discrepancy_type,
            severity: model.severity,
            field_name: model.field_name,
            local_value: model.local_value,
            remote_value: model.remote_value,
            description: model.description,
            suggested_action: model.suggested_action,
            is_resolved: model.is_resolved,
            resolved_at: model.resolved_at.map(|dt| dt.with_timezone(&Utc)),
            resolved_by: model.resolved_by.map(|id| id.to_string()),
            resolution_notes: model.resolution_notes,
            created_at: model.created_at.with_timezone(&Utc),
        }
    }
}

/// Discrepancy statistics
#[derive(Debug, Clone)]
pub struct DiscrepancyStats {
    pub total: i32,
    pub resolved: i32,
    pub unresolved: i32,
    pub by_type: HashMap<String, i32>,
    pub by_severity: HashMap<String, i32>,
}

#[Object]
impl DiscrepancyStats {
    async fn total(&self) -> i32 { self.total }
    async fn resolved(&self) -> i32 { self.resolved }
    async fn unresolved(&self) -> i32 { self.unresolved }
    async fn by_type(&self) -> Vec<TypeCount> {
        self.by_type.iter().map(|(k, v)| TypeCount {
            type_name: k.clone(),
            count: *v,
        }).collect()
    }
    async fn by_severity(&self) -> Vec<SeverityCount> {
        self.by_severity.iter().map(|(k, v)| SeverityCount {
            severity: k.clone(),
            count: *v,
        }).collect()
    }
}

#[derive(Debug, Clone)]
pub struct TypeCount {
    pub type_name: String,
    pub count: i32,
}

#[Object]
impl TypeCount {
    async fn type_name(&self) -> &str { &self.type_name }
    async fn count(&self) -> i32 { self.count }
}

#[derive(Debug, Clone)]
pub struct SeverityCount {
    pub severity: String,
    pub count: i32,
}

#[Object]
impl SeverityCount {
    async fn severity(&self) -> &str { &self.severity }
    async fn count(&self) -> i32 { self.count }
}

impl From<ServiceDiscrepancyStats> for DiscrepancyStats {
    fn from(stats: ServiceDiscrepancyStats) -> Self {
        Self {
            total: stats.total as i32,
            resolved: stats.resolved as i32,
            unresolved: stats.unresolved as i32,
            by_type: stats.by_type,
            by_severity: stats.by_severity,
        }
    }
}
