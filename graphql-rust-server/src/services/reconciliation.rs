//! Reconciliation Service
//!
//! Verifies data consistency between local system and QuickBooks

use crate::integrations::intuit::{EmployeeExtended, IntuitClient};
use crate::models::{reconciliation_discrepancies, reconciliation_reports, user};
use chrono::Utc;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter, QueryOrder,
    QuerySelect, Set,
};
use serde_json::json;
use std::collections::HashMap;
use std::sync::Arc;
use uuid::Uuid;

/// Reconciliation service
pub struct ReconciliationService {
    db: Arc<DatabaseConnection>,
}

/// Reconciliation result summary
#[derive(Debug, Clone)]
pub struct ReconciliationResult {
    pub report_id: Uuid,
    pub total_local: i32,
    pub total_remote: i32,
    pub total_matched: i32,
    pub total_discrepancies: i32,
    pub missing_in_local: i32,
    pub missing_in_remote: i32,
    pub data_mismatches: i32,
    pub duration_ms: i32,
}

impl ReconciliationService {
    pub fn new(db: Arc<DatabaseConnection>) -> Self {
        Self { db }
    }

    /// Run reconciliation for employees
    pub async fn reconcile_employees(
        &self,
        client: &IntuitClient,
        user_id: Option<Uuid>,
        user_email: Option<String>,
    ) -> Result<ReconciliationResult, Box<dyn std::error::Error>> {
        let start_time = Utc::now();

        // Create report
        let report = reconciliation_reports::ActiveModel {
            id: Set(Uuid::new_v4()),
            entity_type: Set("employee".to_string()),
            status: Set("running".to_string()),
            total_local: Set(0),
            total_remote: Set(0),
            total_matched: Set(0),
            total_discrepancies: Set(0),
            missing_in_local: Set(0),
            missing_in_remote: Set(0),
            data_mismatches: Set(0),
            triggered_by: Set(user_id),
            triggered_by_email: Set(user_email.clone()),
            duration_ms: Set(None),
            error_message: Set(None),
            summary: Set(None),
            metadata: Set(None),
            started_at: Set(start_time.into()),
            completed_at: Set(None),
            created_at: Set(Utc::now().into()),
        };

        let report_model = match report.insert(&*self.db).await {
            Ok(model) => {
                tracing::info!(
                    report_id = %model.id,
                    user_email = ?user_email,
                    "Created reconciliation report"
                );
                model
            }
            Err(e) => {
                tracing::error!(error = %e, "Failed to create reconciliation report");
                return Err(Box::new(e));
            }
        };
        let report_id = report_model.id;

        // Fetch local employees
        let local_employees = match user::Entity::find()
            .filter(user::Column::DeletedAt.is_null())
            .all(&*self.db)
            .await
        {
            Ok(employees) => {
                tracing::info!(
                    report_id = %report_id,
                    count = employees.len(),
                    "Fetched local employees"
                );
                employees
            }
            Err(e) => {
                tracing::error!(report_id = %report_id, error = %e, "Failed to fetch local employees");
                return Err(Box::new(e));
            }
        };

        // Fetch remote employees
        let remote_employees = match client.list_employees().await {
            Ok(employees) => {
                tracing::info!(
                    report_id = %report_id,
                    count = employees.len(),
                    "Fetched remote employees from QuickBooks"
                );
                employees
            }
            Err(e) => {
                let error_msg = format!("Failed to fetch QuickBooks data: {}", e);
                tracing::error!(
                    report_id = %report_id,
                    error = %e,
                    "Failed to fetch remote employees from QuickBooks"
                );
                // Update report with failed status
                let mut failed_report: reconciliation_reports::ActiveModel = report_model.into();
                failed_report.status = Set("failed".to_string());
                failed_report.error_message = Set(Some(error_msg.clone()));
                failed_report.completed_at = Set(Some(Utc::now().into()));
                let _ = failed_report.update(&*self.db).await;
                return Err(error_msg.into());
            }
        };

        let total_local = local_employees.len() as i32;
        let total_remote = remote_employees.len() as i32;

        // Create lookup maps
        let local_map: HashMap<String, &user::Model> = local_employees
            .iter()
            .filter_map(|e| e.intuit_employee_id.clone().map(|id| (id, e)))
            .collect();

        let remote_map: HashMap<String, &EmployeeExtended> = remote_employees
            .iter()
            .map(|e| (e.base.id.clone().unwrap_or_default(), e))
            .collect();

        let mut discrepancies = Vec::new();
        let mut matched_count = 0;
        let mut missing_in_local = 0;
        let mut missing_in_remote = 0;
        let mut data_mismatches = 0;

        // Check for missing in local (exists in QB but not locally)
        for (qb_id, qb_emp) in &remote_map {
            if !local_map.contains_key(qb_id) {
                missing_in_local += 1;
                discrepancies.push(self.create_discrepancy(
                    report_id,
                    "employee",
                    qb_id,
                    "missing_in_local",
                    "medium",
                    None,
                    None,
                    Some(&format!("{:?}", qb_emp.base.display_name)),
                    &format!("Employee '{}' exists in QuickBooks but not in local system",
                        qb_emp.base.display_name.clone().unwrap_or_else(|| "Unknown".to_string())),
                    "Create this employee in local system or sync from QuickBooks",
                ));
            }
        }

        // Check for missing in remote and data mismatches
        for (local_id, local_emp) in local_employees
            .iter()
            .filter_map(|e| e.intuit_employee_id.as_ref().map(|id| (id, e)))
        {
            if let Some(qb_emp) = remote_map.get(local_id) {
                // Compare data
                let field_diffs = self.compare_employee_fields(local_emp, qb_emp);

                if field_diffs.is_empty() {
                    matched_count += 1;
                } else {
                    data_mismatches += field_diffs.len() as i32;

                    for (field_name, local_val, remote_val) in field_diffs {
                        discrepancies.push(self.create_discrepancy(
                            report_id,
                            "employee",
                            &local_emp.id.to_string(),
                            "data_mismatch",
                            "low",
                            Some(&field_name),
                            Some(&local_val),
                            Some(&remote_val),
                            &format!(
                                "Field '{}' differs: local='{}' vs remote='{}'",
                                field_name, local_val, remote_val
                            ),
                            "Review and decide which value is correct",
                        ));
                    }
                }
            } else {
                missing_in_remote += 1;
                discrepancies.push(self.create_discrepancy(
                    report_id,
                    "employee",
                    &local_emp.id.to_string(),
                    "missing_in_remote",
                    "medium",
                    None,
                    Some(&format!("{} {}", local_emp.first_name, local_emp.last_name)),
                    None,
                    &format!(
                        "Employee '{} {}' exists locally but not in QuickBooks",
                        local_emp.first_name, local_emp.last_name
                    ),
                    "Push this employee to QuickBooks or remove local record",
                ));
            }
        }

        // Insert all discrepancies
        for disc in discrepancies {
            disc.insert(&*self.db).await?;
        }

        let total_discrepancies = missing_in_local + missing_in_remote + data_mismatches;
        let duration_ms = (Utc::now() - start_time).num_milliseconds() as i32;

        // Update report
        let mut report_update: reconciliation_reports::ActiveModel = report_model.into();
        report_update.status = Set("completed".to_string());
        report_update.total_local = Set(total_local);
        report_update.total_remote = Set(total_remote);
        report_update.total_matched = Set(matched_count);
        report_update.total_discrepancies = Set(total_discrepancies);
        report_update.missing_in_local = Set(missing_in_local);
        report_update.missing_in_remote = Set(missing_in_remote);
        report_update.data_mismatches = Set(data_mismatches);
        report_update.duration_ms = Set(Some(duration_ms));
        report_update.completed_at = Set(Some(Utc::now().into()));
        report_update.summary = Set(Some(json!({
            "matched_percentage": if total_local > 0 { (matched_count as f64 / total_local as f64) * 100.0 } else { 0.0 },
            "discrepancy_percentage": if total_local > 0 { (total_discrepancies as f64 / total_local as f64) * 100.0 } else { 0.0 },
        })));

        match report_update.update(&*self.db).await {
            Ok(_) => {
                tracing::info!(
                    report_id = %report_id,
                    total_local = total_local,
                    total_remote = total_remote,
                    total_matched = matched_count,
                    total_discrepancies = total_discrepancies,
                    duration_ms = duration_ms,
                    "Reconciliation completed successfully"
                );
            }
            Err(e) => {
                tracing::error!(report_id = %report_id, error = %e, "Failed to update reconciliation report");
                return Err(Box::new(e));
            }
        }

        Ok(ReconciliationResult {
            report_id,
            total_local,
            total_remote,
            total_matched: matched_count,
            total_discrepancies,
            missing_in_local,
            missing_in_remote,
            data_mismatches,
            duration_ms,
        })
    }

    /// Compare employee fields and return differences
    fn compare_employee_fields(
        &self,
        local: &user::Model,
        remote: &EmployeeExtended,
    ) -> Vec<(String, String, String)> {
        let mut diffs = Vec::new();

        // Compare first name
        if let Some(remote_first) = &remote.base.given_name {
            if &local.first_name != remote_first {
                diffs.push((
                    "first_name".to_string(),
                    local.first_name.clone(),
                    remote_first.clone(),
                ));
            }
        }

        // Compare last name
        if let Some(remote_last) = &remote.base.family_name {
            if &local.last_name != remote_last {
                diffs.push((
                    "last_name".to_string(),
                    local.last_name.clone(),
                    remote_last.clone(),
                ));
            }
        }

        // Compare email
        if let Some(remote_email) = &remote.base.primary_email_addr {
            if let Some(remote_email_address) = &remote_email.address {
                if local.email.to_lowercase() != remote_email_address.to_lowercase() {
                    diffs.push((
                        "email".to_string(),
                        local.email.clone(),
                        remote_email_address.clone(),
                    ));
                }
            }
        }

        diffs
    }

    /// Create a discrepancy record
    fn create_discrepancy(
        &self,
        report_id: Uuid,
        entity_type: &str,
        entity_id: &str,
        discrepancy_type: &str,
        severity: &str,
        field_name: Option<&str>,
        local_value: Option<&str>,
        remote_value: Option<&str>,
        description: &str,
        suggested_action: &str,
    ) -> reconciliation_discrepancies::ActiveModel {
        reconciliation_discrepancies::ActiveModel {
            id: Set(Uuid::new_v4()),
            report_id: Set(report_id),
            entity_type: Set(entity_type.to_string()),
            entity_id: Set(entity_id.to_string()),
            discrepancy_type: Set(discrepancy_type.to_string()),
            severity: Set(severity.to_string()),
            field_name: Set(field_name.map(String::from)),
            local_value: Set(local_value.map(String::from)),
            remote_value: Set(remote_value.map(String::from)),
            description: Set(description.to_string()),
            suggested_action: Set(Some(suggested_action.to_string())),
            is_resolved: Set(false),
            resolved_at: Set(None),
            resolved_by: Set(None),
            resolution_notes: Set(None),
            metadata: Set(None),
            created_at: Set(Utc::now().into()),
        }
    }

    /// Get reconciliation report by ID
    pub async fn get_report(
        &self,
        report_id: Uuid,
    ) -> Result<Option<reconciliation_reports::Model>, sea_orm::DbErr> {
        reconciliation_reports::Entity::find_by_id(report_id)
            .one(&*self.db)
            .await
    }

    /// Get recent reconciliation reports
    pub async fn get_recent_reports(
        &self,
        entity_type: Option<String>,
        limit: u64,
    ) -> Result<Vec<reconciliation_reports::Model>, sea_orm::DbErr> {
        let mut query = reconciliation_reports::Entity::find();

        // Only filter by entity_type if it's specified and not "all"
        if let Some(et) = entity_type {
            if et != "all" {
                query = query.filter(reconciliation_reports::Column::EntityType.eq(et));
            }
        }

        query
            .order_by_desc(reconciliation_reports::Column::CreatedAt)
            .limit(limit)
            .all(&*self.db)
            .await
    }

    /// Get discrepancies for a report
    pub async fn get_report_discrepancies(
        &self,
        report_id: Uuid,
        unresolved_only: bool,
    ) -> Result<Vec<reconciliation_discrepancies::Model>, sea_orm::DbErr> {
        let mut query = reconciliation_discrepancies::Entity::find()
            .filter(reconciliation_discrepancies::Column::ReportId.eq(report_id));

        if unresolved_only {
            query = query.filter(reconciliation_discrepancies::Column::IsResolved.eq(false));
        }

        query
            .order_by_desc(reconciliation_discrepancies::Column::CreatedAt)
            .all(&*self.db)
            .await
    }

    /// Resolve a discrepancy
    pub async fn resolve_discrepancy(
        &self,
        discrepancy_id: Uuid,
        resolved_by: Uuid,
        resolution_notes: String,
    ) -> Result<(), sea_orm::DbErr> {
        let discrepancy = reconciliation_discrepancies::Entity::find_by_id(discrepancy_id)
            .one(&*self.db)
            .await?;

        if let Some(disc) = discrepancy {
            let mut active_disc: reconciliation_discrepancies::ActiveModel = disc.into();
            active_disc.is_resolved = Set(true);
            active_disc.resolved_at = Set(Some(Utc::now().into()));
            active_disc.resolved_by = Set(Some(resolved_by));
            active_disc.resolution_notes = Set(Some(resolution_notes));
            active_disc.update(&*self.db).await?;
        }

        Ok(())
    }

    /// Get discrepancy statistics
    pub async fn get_discrepancy_stats(
        &self,
        report_id: Uuid,
    ) -> Result<DiscrepancyStats, sea_orm::DbErr> {
        let all_discrepancies = self.get_report_discrepancies(report_id, false).await?;

        let total = all_discrepancies.len();
        let resolved = all_discrepancies.iter().filter(|d| d.is_resolved).count();
        let unresolved = total - resolved;

        let by_type = all_discrepancies.iter().fold(HashMap::new(), |mut acc, d| {
            *acc.entry(d.discrepancy_type.clone()).or_insert(0) += 1;
            acc
        });

        let by_severity = all_discrepancies.iter().fold(HashMap::new(), |mut acc, d| {
            *acc.entry(d.severity.clone()).or_insert(0) += 1;
            acc
        });

        Ok(DiscrepancyStats {
            total,
            resolved,
            unresolved,
            by_type,
            by_severity,
        })
    }

    /// Check if all discrepancies in a report are resolved and delete the report if so
    pub async fn check_and_delete_resolved_report(
        &self,
        report_id: Uuid,
    ) -> Result<bool, sea_orm::DbErr> {
        // Get all discrepancies for this report
        let all_discrepancies = self.get_report_discrepancies(report_id, false).await?;

        // If there are no discrepancies, or all are resolved, delete the report
        if !all_discrepancies.is_empty() && all_discrepancies.iter().all(|d| d.is_resolved) {
            tracing::info!(
                report_id = %report_id,
                discrepancy_count = all_discrepancies.len(),
                "All discrepancies resolved, deleting report"
            );

            // Delete all discrepancies first (due to foreign key constraint)
            for discrepancy in all_discrepancies {
                reconciliation_discrepancies::Entity::delete_by_id(discrepancy.id)
                    .exec(&*self.db)
                    .await?;
            }

            // Delete the report
            reconciliation_reports::Entity::delete_by_id(report_id)
                .exec(&*self.db)
                .await?;

            tracing::info!(report_id = %report_id, "Report deleted successfully");
            Ok(true)
        } else {
            let resolved_count = all_discrepancies.iter().filter(|d| d.is_resolved).count();
            tracing::debug!(
                report_id = %report_id,
                total_discrepancies = all_discrepancies.len(),
                resolved = resolved_count,
                "Not all discrepancies resolved yet"
            );
            Ok(false)
        }
    }

    /// Delete a specific reconciliation report and all its discrepancies
    pub async fn delete_report(&self, report_id: Uuid) -> Result<(), sea_orm::DbErr> {
        // Delete all discrepancies first (due to foreign key constraint)
        reconciliation_discrepancies::Entity::delete_many()
            .filter(reconciliation_discrepancies::Column::ReportId.eq(report_id))
            .exec(&*self.db)
            .await?;

        // Delete the report
        reconciliation_reports::Entity::delete_by_id(report_id)
            .exec(&*self.db)
            .await?;

        Ok(())
    }
}

/// Discrepancy statistics
#[derive(Debug, Clone)]
pub struct DiscrepancyStats {
    pub total: usize,
    pub resolved: usize,
    pub unresolved: usize,
    pub by_type: HashMap<String, i32>,
    pub by_severity: HashMap<String, i32>,
}
