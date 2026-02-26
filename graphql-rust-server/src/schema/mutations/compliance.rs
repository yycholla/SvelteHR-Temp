//! Compliance Report GraphQL Mutations

use async_graphql::{Context, InputObject, Object, Result};
use chrono::{DateTime, Utc};
use sea_orm::EntityTrait;
use std::sync::Arc;
use uuid::Uuid;

use crate::auth::UserContext;
use crate::models::compliance_reports;
use crate::schema::queries::compliance::ComplianceReportType;
use crate::services::compliance_reports::ComplianceReportService;
use crate::services::permission_checker::{PermissionChecker, SyncPermission};

#[derive(Default)]
pub struct ComplianceMutations;

/// Input for generating a compliance report
#[derive(InputObject)]
pub struct GenerateComplianceReportInput {
    pub report_type: ComplianceReportType,
    pub period_start: DateTime<Utc>,
    pub period_end: DateTime<Utc>,
    pub include_pdf: Option<bool>,
    pub include_csv: Option<bool>,
}

#[Object]
impl ComplianceMutations {
    /// Generate a compliance report
    async fn generate_compliance_report(
        &self,
        ctx: &Context<'_>,
        input: GenerateComplianceReportInput,
    ) -> Result<ComplianceReportResult> {
        let user_ctx = ctx.data::<UserContext>()?;
        let db = ctx.data::<sea_orm::DatabaseConnection>()?;

        // Check permission - requires ManageIntegrations permission
        let permission_checker = PermissionChecker::new(db.clone());
        permission_checker
            .require(user_ctx, SyncPermission::ManageIntegrations)
            .await?;

        // Validate date range
        if input.period_start >= input.period_end {
            return Err(async_graphql::Error::new(
                "period_start must be before period_end",
            ));
        }

        // Create service
        let service = ComplianceReportService::new(Arc::new(db.clone()));

        // Generate report based on type
        let result = match input.report_type {
            ComplianceReportType::Sox => service
                .generate_sox_report(input.period_start, input.period_end, user_ctx.user_id)
                .await
                .map_err(|e| async_graphql::Error::new(e.to_string()))?,
            ComplianceReportType::Gdpr => service
                .generate_gdpr_report(input.period_start, input.period_end, user_ctx.user_id)
                .await
                .map_err(|e| async_graphql::Error::new(e.to_string()))?,
            ComplianceReportType::Soc2 => service
                .generate_soc2_report(input.period_start, input.period_end, user_ctx.user_id)
                .await
                .map_err(|e| async_graphql::Error::new(e.to_string()))?,
            ComplianceReportType::DataChanges => service
                .generate_data_changes_report(
                    input.period_start,
                    input.period_end,
                    user_ctx.user_id,
                )
                .await
                .map_err(|e| async_graphql::Error::new(e.to_string()))?,
            ComplianceReportType::UserActivity => service
                .generate_user_activity_report(
                    input.period_start,
                    input.period_end,
                    user_ctx.user_id,
                )
                .await
                .map_err(|e| async_graphql::Error::new(e.to_string()))?,
            ComplianceReportType::AccessLog => service
                .generate_access_log_report(input.period_start, input.period_end, user_ctx.user_id)
                .await
                .map_err(|e| async_graphql::Error::new(e.to_string()))?,
        };

        // TODO: Generate PDF and CSV if requested
        // For now, we'll just note the preference but not generate the files
        let _include_pdf = input.include_pdf.unwrap_or(true);
        let _include_csv = input.include_csv.unwrap_or(true);

        // Fetch the generated report to return full details
        let report = service
            .get_report(result.report_id)
            .await
            .map_err(|e| async_graphql::Error::new(e.to_string()))?
            .ok_or_else(|| {
                async_graphql::Error::new("Report was generated but could not be retrieved")
            })?;

        Ok(ComplianceReportResult::from(report))
    }

    /// Delete a compliance report
    async fn delete_compliance_report(
        &self,
        ctx: &Context<'_>,
        report_id: String,
    ) -> Result<DeleteComplianceReportResult> {
        let user_ctx = ctx.data::<UserContext>()?;
        let db = ctx.data::<sea_orm::DatabaseConnection>()?;

        // Check permission
        let permission_checker = PermissionChecker::new(db.clone());
        permission_checker
            .require(user_ctx, SyncPermission::ManageIntegrations)
            .await?;

        let uuid = Uuid::parse_str(&report_id)
            .map_err(|e| async_graphql::Error::new(format!("Invalid UUID: {}", e)))?;

        // Verify report exists before deleting
        let report = compliance_reports::Entity::find_by_id(uuid)
            .one(db)
            .await?
            .ok_or_else(|| async_graphql::Error::new("Report not found"))?;

        // Delete the report
        compliance_reports::Entity::delete_by_id(uuid)
            .exec(db)
            .await?;

        Ok(DeleteComplianceReportResult {
            success: true,
            deleted_report_id: report.id.to_string(),
        })
    }

    /// Regenerate a failed compliance report
    async fn regenerate_compliance_report(
        &self,
        ctx: &Context<'_>,
        report_id: String,
    ) -> Result<ComplianceReportResult> {
        let user_ctx = ctx.data::<UserContext>()?;
        let db = ctx.data::<sea_orm::DatabaseConnection>()?;

        // Check permission
        let permission_checker = PermissionChecker::new(db.clone());
        permission_checker
            .require(user_ctx, SyncPermission::ManageIntegrations)
            .await?;

        let uuid = Uuid::parse_str(&report_id)
            .map_err(|e| async_graphql::Error::new(format!("Invalid UUID: {}", e)))?;

        // Get the existing report
        let report = compliance_reports::Entity::find_by_id(uuid)
            .one(db)
            .await?
            .ok_or_else(|| async_graphql::Error::new("Report not found"))?;

        // Only allow regeneration of failed reports
        if report.status != "failed" {
            return Err(async_graphql::Error::new(
                "Only failed reports can be regenerated",
            ));
        }

        // Delete the old report
        compliance_reports::Entity::delete_by_id(uuid)
            .exec(db)
            .await?;

        // Create service
        let service = ComplianceReportService::new(Arc::new(db.clone()));

        // Determine report type and regenerate
        let period_start = report.period_start.with_timezone(&Utc);
        let period_end = report.period_end.with_timezone(&Utc);

        let result = match report.report_type.as_str() {
            "sox" => service
                .generate_sox_report(period_start, period_end, user_ctx.user_id)
                .await
                .map_err(|e| async_graphql::Error::new(e.to_string()))?,
            "gdpr" => service
                .generate_gdpr_report(period_start, period_end, user_ctx.user_id)
                .await
                .map_err(|e| async_graphql::Error::new(e.to_string()))?,
            "soc2" => service
                .generate_soc2_report(period_start, period_end, user_ctx.user_id)
                .await
                .map_err(|e| async_graphql::Error::new(e.to_string()))?,
            "data_changes" => service
                .generate_data_changes_report(period_start, period_end, user_ctx.user_id)
                .await
                .map_err(|e| async_graphql::Error::new(e.to_string()))?,
            "user_activity" => service
                .generate_user_activity_report(period_start, period_end, user_ctx.user_id)
                .await
                .map_err(|e| async_graphql::Error::new(e.to_string()))?,
            "access_log" => service
                .generate_access_log_report(period_start, period_end, user_ctx.user_id)
                .await
                .map_err(|e| async_graphql::Error::new(e.to_string()))?,
            _ => {
                return Err(async_graphql::Error::new(format!(
                    "Unknown report type: {}",
                    report.report_type
                )));
            }
        };

        // Fetch the regenerated report
        let new_report = service
            .get_report(result.report_id)
            .await
            .map_err(|e| async_graphql::Error::new(e.to_string()))?
            .ok_or_else(|| {
                async_graphql::Error::new("Report was generated but could not be retrieved")
            })?;

        Ok(ComplianceReportResult::from(new_report))
    }
}

/// Compliance report result
#[derive(Debug, Clone)]
pub struct ComplianceReportResult {
    pub report_id: String,
    pub report_type: String,
    pub period_start: DateTime<Utc>,
    pub period_end: DateTime<Utc>,
    pub generated_at: DateTime<Utc>,
    pub generated_by: String,
    pub status: String,
    pub total_records: i32,
    pub findings_count: i32,
    pub pdf_path: Option<String>,
    pub csv_path: Option<String>,
    pub error_message: Option<String>,
}

#[Object]
impl ComplianceReportResult {
    async fn report_id(&self) -> &str {
        &self.report_id
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
    async fn status(&self) -> &str {
        &self.status
    }
    async fn total_records(&self) -> i32 {
        self.total_records
    }
    async fn findings_count(&self) -> i32 {
        self.findings_count
    }
    async fn pdf_path(&self) -> Option<&str> {
        self.pdf_path.as_deref()
    }
    async fn csv_path(&self) -> Option<&str> {
        self.csv_path.as_deref()
    }
    async fn error_message(&self) -> Option<&str> {
        self.error_message.as_deref()
    }
}

impl From<compliance_reports::Model> for ComplianceReportResult {
    fn from(model: compliance_reports::Model) -> Self {
        // Extract counts from report_data if available
        let (total_records, findings_count) = if let Some(data) = &model.report_data {
            let total = data
                .get("summary")
                .and_then(|s| s.get("total_events"))
                .and_then(|v| v.as_u64())
                .unwrap_or(0) as i32;

            let findings = model
                .findings
                .as_ref()
                .and_then(|f| f.as_array())
                .map(|arr| arr.len() as i32)
                .unwrap_or(0);

            (total, findings)
        } else {
            (0, 0)
        };

        Self {
            report_id: model.id.to_string(),
            report_type: model.report_type,
            period_start: model.period_start.with_timezone(&Utc),
            period_end: model.period_end.with_timezone(&Utc),
            generated_at: model.generated_at.with_timezone(&Utc),
            generated_by: model.generated_by.to_string(),
            status: model.status,
            total_records,
            findings_count,
            pdf_path: model.pdf_path,
            csv_path: model.csv_path,
            error_message: model.error_message,
        }
    }
}

/// Delete compliance report result
#[derive(Debug, Clone)]
pub struct DeleteComplianceReportResult {
    pub success: bool,
    pub deleted_report_id: String,
}

#[Object]
impl DeleteComplianceReportResult {
    async fn success(&self) -> bool {
        self.success
    }
    async fn deleted_report_id(&self) -> &str {
        &self.deleted_report_id
    }
}
