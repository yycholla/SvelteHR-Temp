//! Payroll GraphQL Queries
//!
//! Provides queries for:
//! - Employee compensation details
//! - QuickBooks payroll items
//! - Compensation history
//! - Payroll sync status

use async_graphql::{Context, Object, Result, SimpleObject};
use chrono::{DateTime, Utc};
use sea_orm::DatabaseConnection;
use std::sync::Arc;
use uuid::Uuid;

use crate::{
    auth::UserContext,
    database::get_db_from_context,
    integrations::intuit::IntuitClient,
    models::intuit_connection,
    services::payroll_service::PayrollService,
};
use sea_orm::{ColumnTrait, EntityTrait, QueryFilter};

/// Employee compensation details
#[derive(Debug, Clone, SimpleObject)]
pub struct EmployeeCompensation {
    pub employee_id: Uuid,
    pub compensation_type: Option<String>,
    pub annual_salary: Option<f64>,
    pub hourly_rate: Option<f64>,
    pub pay_schedule: Option<String>,
    pub commission_rate: Option<f64>,
    pub bonus_eligible: bool,
    pub quickbooks_payroll_item_id: Option<String>,
}

/// QuickBooks payroll item
#[derive(Debug, Clone, SimpleObject)]
pub struct QuickBooksPayrollItem {
    pub id: String,
    pub name: String,
    pub item_type: String,
    pub description: Option<String>,
}

/// Compensation history record
#[derive(Debug, Clone, SimpleObject)]
pub struct CompensationHistory {
    pub id: Uuid,
    pub employee_id: Uuid,
    pub change_type: String,
    pub old_compensation_type: Option<String>,
    pub new_compensation_type: Option<String>,
    pub old_amount: Option<f64>,
    pub new_amount: Option<f64>,
    pub changed_by: Option<Uuid>,
    pub effective_date: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
}

/// Overall payroll sync status
#[derive(Debug, Clone, SimpleObject)]
pub struct PayrollSyncStatusResponse {
    pub total_employees: i32,
    pub synced_count: i32,
    pub pending_count: i32,
    pub failed_count: i32,
    pub last_sync_at: Option<DateTime<Utc>>,
}

#[derive(Default)]
pub struct PayrollQueries;

#[Object]
impl PayrollQueries {
    /// Get employee compensation details
    async fn employee_compensation(
        &self,
        ctx: &Context<'_>,
        employee_id: Uuid,
    ) -> Result<EmployeeCompensation> {
        let db = get_db_from_context(ctx)?;
        let user_ctx = ctx.data::<UserContext>()?;

        // Check permissions
        let can_view_all = user_ctx.has_permission("view_all_compensation");
        let can_view_own = user_ctx.has_permission("view_own_compensation");

        if !can_view_all && (!can_view_own || user_ctx.user_id != employee_id) {
            return Err("Permission denied: You can only view your own compensation".into());
        }

        // Create payroll service
        let _payroll_service = PayrollService::new(Arc::new(db.clone()));

        // Get compensation from service (it fetches from users table)
        use crate::models::user;

        let employee = user::Entity::find_by_id(employee_id)
            .one(&db)
            .await?
            .ok_or_else(|| "Employee not found")?;

        Ok(EmployeeCompensation {
            employee_id,
            compensation_type: employee.compensation_type,
            annual_salary: employee.annual_salary.map(|d| d.to_string().parse().unwrap_or(0.0)),
            hourly_rate: employee.hourly_rate.map(|d| d.to_string().parse().unwrap_or(0.0)),
            pay_schedule: employee.pay_schedule,
            commission_rate: employee.commission_rate.map(|d| d.to_string().parse().unwrap_or(0.0)),
            bonus_eligible: employee.bonus_eligible,
            quickbooks_payroll_item_id: employee.quickbooks_payroll_item_id,
        })
    }

    /// Get QuickBooks payroll items
    async fn payroll_items(&self, ctx: &Context<'_>) -> Result<Vec<QuickBooksPayrollItem>> {
        let db = get_db_from_context(ctx)?;
        let user_ctx = ctx.data::<UserContext>()?;

        // Check permissions
        if !user_ctx.has_permission("manage_compensation") {
            return Err("Permission denied: You need manage_compensation permission".into());
        }

        // Get Intuit client
        let intuit_client = get_intuit_client(&db).await?;

        // Create payroll service
        let payroll_service = PayrollService::new(Arc::new(db.clone()));

        // Get payroll items
        let items = payroll_service.get_payroll_items(&intuit_client).await?;

        Ok(items
            .into_iter()
            .map(|item| QuickBooksPayrollItem {
                id: item.id,
                name: item.name,
                item_type: item.item_type,
                description: item.description,
            })
            .collect())
    }

    /// Get compensation history for an employee
    async fn compensation_history(
        &self,
        ctx: &Context<'_>,
        employee_id: Uuid,
        limit: Option<i32>,
    ) -> Result<Vec<CompensationHistory>> {
        let db = get_db_from_context(ctx)?;
        let user_ctx = ctx.data::<UserContext>()?;

        // Check permissions
        let can_view_all = user_ctx.has_permission("view_all_compensation");
        let can_view_own = user_ctx.has_permission("view_own_compensation");

        if !can_view_all && (!can_view_own || user_ctx.user_id != employee_id) {
            return Err("Permission denied: You can only view your own compensation history".into());
        }

        // Create payroll service
        let payroll_service = PayrollService::new(Arc::new(db.clone()));

        // Get compensation history
        let history = payroll_service
            .get_compensation_history(employee_id, limit.map(|l| l as i64))
            .await?;

        Ok(history
            .into_iter()
            .map(|record| CompensationHistory {
                id: record.id,
                employee_id: record.user_id,
                change_type: record.change_type,
                old_compensation_type: record
                    .old_value
                    .as_ref()
                    .and_then(|v| v.compensation_type.clone()),
                new_compensation_type: record.new_value.compensation_type.clone(),
                old_amount: record.old_value.as_ref().and_then(|v| {
                    v.annual_salary.or(v.hourly_rate)
                }),
                new_amount: record.new_value.annual_salary.or(record.new_value.hourly_rate),
                changed_by: record.changed_by,
                effective_date: record.effective_date,
                created_at: record.created_at,
            })
            .collect())
    }

    /// Get overall payroll sync status
    async fn payroll_sync_status(&self, ctx: &Context<'_>) -> Result<PayrollSyncStatusResponse> {
        let db = get_db_from_context(ctx)?;
        let user_ctx = ctx.data::<UserContext>()?;

        // Check permissions
        if !user_ctx.has_permission("manage_compensation") {
            return Err("Permission denied: You need manage_compensation permission".into());
        }

        // Create payroll service
        let payroll_service = PayrollService::new(Arc::new(db.clone()));

        // Get sync status
        let status = payroll_service.get_payroll_sync_status().await?;

        Ok(PayrollSyncStatusResponse {
            total_employees: status.total_employees as i32,
            synced_count: status.synced_count as i32,
            pending_count: status.pending_count as i32,
            failed_count: status.failed_count as i32,
            last_sync_at: status.last_sync_at,
        })
    }
}

/// Helper to get IntuitClient from database
async fn get_intuit_client(db: &DatabaseConnection) -> Result<IntuitClient> {
    let connection = intuit_connection::Entity::find()
        .filter(intuit_connection::Column::IsActive.eq(true))
        .filter(intuit_connection::Column::DeletedAt.is_null())
        .one(db)
        .await?
        .ok_or_else(|| "No active Intuit connection found")?;

    IntuitClient::new(connection.access_token, connection.realm_id)
        .map_err(|e| format!("Failed to create Intuit client: {}", e).into())
}
