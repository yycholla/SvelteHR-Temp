//! Compliance Report GraphQL Queries

use async_graphql::{Context, Enum, Object, Result};
use chrono::{DateTime, Utc};

use crate::auth::UserContext;
use crate::models::{compliance_reports, report_schedules};
use crate::services::compliance_reports::ComplianceReportService;
use crate::services::permission_checker::{PermissionChecker, SyncPermission};

use std::sync::Arc;
use uuid::Uuid;

#[derive(Default)]
pub struct ComplianceQueries;

#[Object]
impl ComplianceQueries {
    /// Get a compliance report by ID
    async fn compliance_report(
        &self,
        ctx: &Context<'_>,
        report_id: String,
    ) -> Result<Option<ComplianceReport>> {
        let user_ctx = ctx.data::<UserContext>()?;
        let db = ctx.data::<sea_orm::DatabaseConnection>()?;

        // Check permission - only users with ViewSyncHistory can access compliance reports
        let permission_checker = PermissionChecker::new(db.clone());
        permission_checker
            .require(user_ctx, SyncPermission::ViewSyncHistory)
            .await?;

        let service = ComplianceReportService::new(Arc::new(db.clone()));
        let report = service.get_report(Uuid::parse_str(&report_id)?).await?;

        Ok(report.map(ComplianceReport::from))
    }

    /// Get recent compliance reports
    async fn compliance_reports(
        &self,
        ctx: &Context<'_>,
        report_type: Option<ComplianceReportType>,
        limit: Option<i32>,
    ) -> Result<Vec<ComplianceReport>> {
        let user_ctx = ctx.data::<UserContext>()?;
        let db = ctx.data::<sea_orm::DatabaseConnection>()?;

        // Check permission
        let permission_checker = PermissionChecker::new(db.clone());
        permission_checker
            .require(user_ctx, SyncPermission::ViewSyncHistory)
            .await?;

        let service = ComplianceReportService::new(Arc::new(db.clone()));
        let reports = service
            .get_recent_reports(
                report_type.map(|rt| rt.as_str().to_string()),
                limit.unwrap_or(10).max(1).min(50) as u64,
            )
            .await?;

        Ok(reports.into_iter().map(ComplianceReport::from).collect())
    }

    /// Get active report schedules
    async fn report_schedules(&self, ctx: &Context<'_>) -> Result<Vec<ReportSchedule>> {
        let user_ctx = ctx.data::<UserContext>()?;
        let db = ctx.data::<sea_orm::DatabaseConnection>()?;

        // Check permission
        let permission_checker = PermissionChecker::new(db.clone());
        permission_checker
            .require(user_ctx, SyncPermission::ManageIntegrations)
            .await?;

        let service = ComplianceReportService::new(Arc::new(db.clone()));
        let schedules = service.get_active_schedules().await?;

        Ok(schedules.into_iter().map(ReportSchedule::from).collect())
    }
}

/// Compliance report type
#[derive(Debug, Clone, Copy, Enum, PartialEq, Eq)]
pub enum ComplianceReportType {
    #[graphql(name = "SOX")]
    Sox,
    #[graphql(name = "GDPR")]
    Gdpr,
    #[graphql(name = "SOC2")]
    Soc2,
    #[graphql(name = "DATA_CHANGES")]
    DataChanges,
    #[graphql(name = "USER_ACTIVITY")]
    UserActivity,
    #[graphql(name = "ACCESS_LOG")]
    AccessLog,
}

impl ComplianceReportType {
    pub fn as_str(&self) -> &str {
        match self {
            ComplianceReportType::Sox => "sox",
            ComplianceReportType::Gdpr => "gdpr",
            ComplianceReportType::Soc2 => "soc2",
            ComplianceReportType::DataChanges => "data_changes",
            ComplianceReportType::UserActivity => "user_activity",
            ComplianceReportType::AccessLog => "access_log",
        }
    }
}

/// Compliance report
#[derive(Debug, Clone)]
pub struct ComplianceReport {
    pub id: String,
    pub report_type: String,
    pub period_start: DateTime<Utc>,
    pub period_end: DateTime<Utc>,
    pub generated_at: DateTime<Utc>,
    pub generated_by: String,
    pub report_data: Option<serde_json::Value>,
    pub pdf_path: Option<String>,
    pub csv_path: Option<String>,
    pub status: String,
    pub findings: Option<serde_json::Value>,
    pub error_message: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[Object]
impl ComplianceReport {
    async fn id(&self) -> &str {
        &self.id
    }
    async fn report_type(&self) -> &str {
        &self.report_type
    }
    async fn period_start(&self) -> DateTime<Utc> {
        self.period_start
    }
    async fn period_end(&self) -> DateTime<Utc> {
        self.period_end
    }
    async fn generated_at(&self) -> DateTime<Utc> {
        self.generated_at
    }
    async fn generated_by(&self) -> &str {
        &self.generated_by
    }
    async fn report_data(&self) -> Option<&serde_json::Value> {
        self.report_data.as_ref()
    }
    async fn pdf_path(&self) -> Option<&str> {
        self.pdf_path.as_deref()
    }
    async fn csv_path(&self) -> Option<&str> {
        self.csv_path.as_deref()
    }
    async fn status(&self) -> &str {
        &self.status
    }
    async fn findings(&self) -> Option<&serde_json::Value> {
        self.findings.as_ref()
    }
    async fn error_message(&self) -> Option<&str> {
        self.error_message.as_deref()
    }
    async fn created_at(&self) -> DateTime<Utc> {
        self.created_at
    }
    async fn updated_at(&self) -> DateTime<Utc> {
        self.updated_at
    }
}

impl From<compliance_reports::Model> for ComplianceReport {
    fn from(model: compliance_reports::Model) -> Self {
        Self {
            id: model.id.to_string(),
            report_type: model.report_type,
            period_start: model.period_start.with_timezone(&Utc),
            period_end: model.period_end.with_timezone(&Utc),
            generated_at: model.generated_at.with_timezone(&Utc),
            generated_by: model.generated_by.to_string(),
            report_data: model.report_data,
            pdf_path: model.pdf_path,
            csv_path: model.csv_path,
            status: model.status,
            findings: model.findings,
            error_message: model.error_message,
            created_at: model.created_at.with_timezone(&Utc),
            updated_at: model.updated_at.with_timezone(&Utc),
        }
    }
}

/// Report schedule
#[derive(Debug, Clone)]
pub struct ReportSchedule {
    pub id: String,
    pub report_type: String,
    pub schedule_cron: String,
    pub recipients: Vec<String>,
    pub enabled: bool,
    pub last_run_at: Option<DateTime<Utc>>,
    pub next_run_at: Option<DateTime<Utc>>,
    pub created_by: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[Object]
impl ReportSchedule {
    async fn id(&self) -> &str {
        &self.id
    }
    async fn report_type(&self) -> &str {
        &self.report_type
    }
    async fn schedule_cron(&self) -> &str {
        &self.schedule_cron
    }
    async fn recipients(&self) -> &Vec<String> {
        &self.recipients
    }
    async fn enabled(&self) -> bool {
        self.enabled
    }
    async fn last_run_at(&self) -> Option<DateTime<Utc>> {
        self.last_run_at
    }
    async fn next_run_at(&self) -> Option<DateTime<Utc>> {
        self.next_run_at
    }
    async fn created_by(&self) -> &str {
        &self.created_by
    }
    async fn created_at(&self) -> DateTime<Utc> {
        self.created_at
    }
    async fn updated_at(&self) -> DateTime<Utc> {
        self.updated_at
    }
}

impl From<report_schedules::Model> for ReportSchedule {
    fn from(model: report_schedules::Model) -> Self {
        Self {
            id: model.id.to_string(),
            report_type: model.report_type,
            schedule_cron: model.schedule_cron,
            recipients: model.recipients,
            enabled: model.enabled,
            last_run_at: model.last_run_at.map(|dt| dt.with_timezone(&Utc)),
            next_run_at: model.next_run_at.map(|dt| dt.with_timezone(&Utc)),
            created_by: model.created_by.to_string(),
            created_at: model.created_at.with_timezone(&Utc),
            updated_at: model.updated_at.with_timezone(&Utc),
        }
    }
}
