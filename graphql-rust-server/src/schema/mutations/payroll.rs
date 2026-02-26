//! Payroll GraphQL Mutations
//!
//! Provides mutations for:
//! - Syncing compensation data with QuickBooks
//! - Updating employee compensation
//! - Mapping payroll items
//! - Bulk compensation sync operations

use async_graphql::{Context, InputObject, Object, Result, SimpleObject};
use chrono::{DateTime, Utc};
use rust_decimal::Decimal;
use sea_orm::DatabaseConnection;
use std::sync::Arc;
use uuid::Uuid;

use crate::{
    auth::UserContext,
    database::get_db_from_context,
    integrations::intuit::{IntuitClient, IntuitClientManager},
    services::payroll_service::{
        CompensationType, PaySchedule, PayrollService, SyncDirection as PayrollSyncDirection,
        UpdateCompensationInput,
    },
};

/// Input for syncing compensation
#[derive(Debug, Clone, InputObject)]
pub struct SyncCompensationInput {
    pub employee_id: Uuid,
    pub direction: String, // "TO_QUICKBOOKS" or "FROM_QUICKBOOKS"
}

/// Input for updating compensation
#[derive(Debug, Clone, InputObject)]
pub struct UpdateEmployeeCompensationInput {
    pub employee_id: Uuid,
    pub compensation_type: String, // "SALARY", "HOURLY", "COMMISSION", "CONTRACT"
    pub amount: f64,
    pub pay_schedule: String, // "WEEKLY", "BIWEEKLY", "SEMIMONTHLY", "MONTHLY"
    pub commission_rate: Option<f64>,
    pub bonus_eligible: Option<bool>,
    pub effective_date: Option<DateTime<Utc>>,
}

/// Input for mapping payroll items
#[derive(Debug, Clone, InputObject)]
pub struct MapPayrollItemInput {
    pub compensation_type: String,
    pub quickbooks_item_id: String,
}

/// Input for bulk sync
#[derive(Debug, Clone, InputObject)]
pub struct SyncAllCompensationInput {
    pub direction: String, // "TO_QUICKBOOKS" or "FROM_QUICKBOOKS"
}

/// Result of compensation sync
#[derive(Debug, Clone, SimpleObject)]
pub struct CompensationSyncResult {
    pub success: bool,
    pub message: String,
    pub compensation_type: Option<String>,
    pub annual_salary: Option<f64>,
    pub hourly_rate: Option<f64>,
    pub pay_schedule: Option<String>,
}

/// Result of compensation update
#[derive(Debug, Clone, SimpleObject)]
pub struct CompensationUpdateResult {
    pub success: bool,
    pub message: String,
    pub employee_id: Uuid,
    pub compensation_type: String,
    pub amount: f64,
    pub effective_date: Option<DateTime<Utc>>,
}

/// Result of payroll item mapping
#[derive(Debug, Clone, SimpleObject)]
pub struct PayrollItemMappingResult {
    pub success: bool,
    pub message: String,
    pub compensation_type: String,
    pub quickbooks_item_id: String,
}

/// Result of bulk compensation sync
#[derive(Debug, Clone, SimpleObject)]
pub struct BulkCompensationSyncResult {
    pub success: bool,
    pub message: String,
    pub total_employees: i32,
    pub synced_count: i32,
    pub failed_count: i32,
}

#[derive(Default)]
pub struct PayrollMutations;

#[Object]
impl PayrollMutations {
    /// Sync employee compensation with QuickBooks
    async fn sync_compensation(
        &self,
        ctx: &Context<'_>,
        input: SyncCompensationInput,
    ) -> Result<CompensationSyncResult> {
        let db = get_db_from_context(ctx)?;
        let user_ctx = ctx.data::<UserContext>()?;

        // Check permissions
        if !user_ctx.has_permission("manage_compensation") {
            return Err("Permission denied: You need manage_compensation permission".into());
        }

        // Get Intuit client
        let intuit_client = get_intuit_client(&db).await?;

        // Parse direction
        let direction = match input.direction.as_str() {
            "TO_QUICKBOOKS" => PayrollSyncDirection::ToQuickBooks,
            "FROM_QUICKBOOKS" => PayrollSyncDirection::FromQuickBooks,
            _ => return Err("Invalid sync direction. Use TO_QUICKBOOKS or FROM_QUICKBOOKS".into()),
        };

        // Create payroll service
        let payroll_service = PayrollService::new(Arc::new(db.clone()));

        // Sync compensation
        let compensation = payroll_service
            .sync_compensation(input.employee_id, direction, &intuit_client)
            .await?;

        Ok(CompensationSyncResult {
            success: true,
            message: format!(
                "Successfully synced compensation for employee {}",
                input.employee_id
            ),
            compensation_type: compensation
                .compensation_type
                .map(|ct| ct.as_str().to_string()),
            annual_salary: compensation.annual_salary,
            hourly_rate: compensation.hourly_rate,
            pay_schedule: compensation.pay_schedule.map(|ps| ps.as_str().to_string()),
        })
    }

    /// Update employee compensation
    async fn update_compensation(
        &self,
        ctx: &Context<'_>,
        input: UpdateEmployeeCompensationInput,
    ) -> Result<CompensationUpdateResult> {
        let db = get_db_from_context(ctx)?;
        let user_ctx = ctx.data::<UserContext>()?;

        // Check permissions
        if !user_ctx.has_permission("manage_compensation") {
            return Err("Permission denied: You need manage_compensation permission".into());
        }

        // Parse compensation type
        let compensation_type = match input.compensation_type.as_str() {
            "SALARY" => CompensationType::Salary,
            "HOURLY" => CompensationType::Hourly,
            "COMMISSION" => CompensationType::Commission,
            "CONTRACT" => CompensationType::Contract,
            _ => return Err("Invalid compensation type".into()),
        };

        // Parse pay schedule
        let pay_schedule = match input.pay_schedule.as_str() {
            "WEEKLY" => PaySchedule::Weekly,
            "BIWEEKLY" => PaySchedule::Biweekly,
            "SEMIMONTHLY" => PaySchedule::Semimonthly,
            "MONTHLY" => PaySchedule::Monthly,
            _ => return Err("Invalid pay schedule".into()),
        };

        // Create payroll service
        let payroll_service = PayrollService::new(Arc::new(db.clone()));

        // Build update input
        let update_input = UpdateCompensationInput {
            employee_id: input.employee_id,
            compensation_type,
            amount: Decimal::from_f64_retain(input.amount).ok_or("Invalid amount")?,
            pay_schedule,
            commission_rate: input
                .commission_rate
                .and_then(|r| Decimal::from_f64_retain(r)),
            bonus_eligible: input.bonus_eligible,
            effective_date: input.effective_date,
        };

        // Update compensation
        payroll_service
            .update_compensation(update_input.clone(), Some(user_ctx.user_id))
            .await?;

        Ok(CompensationUpdateResult {
            success: true,
            message: format!(
                "Successfully updated compensation for employee {}",
                input.employee_id
            ),
            employee_id: input.employee_id,
            compensation_type: input.compensation_type,
            amount: input.amount,
            effective_date: input.effective_date,
        })
    }

    /// Map a compensation type to a QuickBooks payroll item
    async fn map_payroll_item(
        &self,
        ctx: &Context<'_>,
        input: MapPayrollItemInput,
    ) -> Result<PayrollItemMappingResult> {
        let db = get_db_from_context(ctx)?;
        let user_ctx = ctx.data::<UserContext>()?;

        // Check permissions
        if !user_ctx.has_permission("manage_compensation") {
            return Err("Permission denied: You need manage_compensation permission".into());
        }

        // Create payroll service
        let payroll_service = PayrollService::new(Arc::new(db.clone()));

        // Map payroll item
        payroll_service
            .map_payroll_item(
                input.compensation_type.clone(),
                input.quickbooks_item_id.clone(),
            )
            .await?;

        Ok(PayrollItemMappingResult {
            success: true,
            message: format!(
                "Successfully mapped {} to QuickBooks payroll item {}",
                input.compensation_type, input.quickbooks_item_id
            ),
            compensation_type: input.compensation_type,
            quickbooks_item_id: input.quickbooks_item_id,
        })
    }

    /// Sync all employee compensation
    async fn sync_all_compensation(
        &self,
        ctx: &Context<'_>,
        input: SyncAllCompensationInput,
    ) -> Result<BulkCompensationSyncResult> {
        let db = get_db_from_context(ctx)?;
        let user_ctx = ctx.data::<UserContext>()?;

        // Check permissions
        if !user_ctx.has_permission("manage_compensation") {
            return Err("Permission denied: You need manage_compensation permission".into());
        }

        // Get Intuit client
        let intuit_client = get_intuit_client(&db).await?;

        // Parse direction
        let direction = match input.direction.as_str() {
            "TO_QUICKBOOKS" => PayrollSyncDirection::ToQuickBooks,
            "FROM_QUICKBOOKS" => PayrollSyncDirection::FromQuickBooks,
            _ => return Err("Invalid sync direction. Use TO_QUICKBOOKS or FROM_QUICKBOOKS".into()),
        };

        // Create payroll service
        let payroll_service = PayrollService::new(Arc::new(db.clone()));

        // Sync all compensation
        let result = payroll_service
            .sync_all_compensation(direction, &intuit_client)
            .await?;

        Ok(BulkCompensationSyncResult {
            success: true,
            message: format!(
                "Synced {} of {} employees successfully",
                result.synced_count, result.total_employees
            ),
            total_employees: result.total_employees as i32,
            synced_count: result.synced_count as i32,
            failed_count: result.failed_count as i32,
        })
    }
}

/// Helper to get IntuitClient from database with automatic token refresh
async fn get_intuit_client(db: &DatabaseConnection) -> Result<IntuitClient> {
    let client_manager = IntuitClientManager::new(db.clone());
    client_manager
        .get_client()
        .await
        .map_err(|e| format!("Failed to create Intuit client: {}", e).into())
}
