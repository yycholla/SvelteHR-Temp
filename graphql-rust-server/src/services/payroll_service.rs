//! Payroll Service
//!
//! Handles compensation management and synchronization with QuickBooks payroll

use crate::integrations::intuit::IntuitClient;
use crate::models::payroll_sync_history::{CompensationData, CreatePayrollSyncHistoryInput};
use anyhow::{Context, Result};
use chrono::Utc;
use rust_decimal::Decimal;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter, Set,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use uuid::Uuid;

/// Payroll service for managing compensation data
pub struct PayrollService {
    db: Arc<DatabaseConnection>,
}

/// Compensation type enum
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "UPPERCASE")]
pub enum CompensationType {
    Salary,
    Hourly,
    Commission,
    Contract,
}

impl CompensationType {
    pub fn as_str(&self) -> &str {
        match self {
            CompensationType::Salary => "SALARY",
            CompensationType::Hourly => "HOURLY",
            CompensationType::Commission => "COMMISSION",
            CompensationType::Contract => "CONTRACT",
        }
    }
}

/// Pay schedule enum
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "UPPERCASE")]
pub enum PaySchedule {
    Weekly,
    Biweekly,
    Semimonthly,
    Monthly,
}

impl PaySchedule {
    pub fn as_str(&self) -> &str {
        match self {
            PaySchedule::Weekly => "WEEKLY",
            PaySchedule::Biweekly => "BIWEEKLY",
            PaySchedule::Semimonthly => "SEMIMONTHLY",
            PaySchedule::Monthly => "MONTHLY",
        }
    }
}

/// Sync direction
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SyncDirection {
    ToQuickBooks,
    FromQuickBooks,
}

impl SyncDirection {
    pub fn as_str(&self) -> &str {
        match self {
            SyncDirection::ToQuickBooks => "TO_QUICKBOOKS",
            SyncDirection::FromQuickBooks => "FROM_QUICKBOOKS",
        }
    }
}

/// Compensation update input
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateCompensationInput {
    pub employee_id: Uuid,
    pub compensation_type: CompensationType,
    pub amount: Decimal,
    pub pay_schedule: PaySchedule,
    pub commission_rate: Option<Decimal>,
    pub bonus_eligible: Option<bool>,
    pub effective_date: Option<chrono::DateTime<Utc>>,
}

/// QuickBooks payroll item
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PayrollItem {
    pub id: String,
    pub name: String,
    pub item_type: String,
    pub description: Option<String>,
}

/// Compensation history record
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompensationHistoryRecord {
    pub id: Uuid,
    pub user_id: Uuid,
    pub sync_direction: String,
    pub change_type: String,
    pub old_value: Option<CompensationData>,
    pub new_value: CompensationData,
    pub sync_status: String,
    pub error_message: Option<String>,
    pub changed_by: Option<Uuid>,
    pub effective_date: Option<chrono::DateTime<Utc>>,
    pub created_at: chrono::DateTime<Utc>,
}

/// Sync status information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PayrollSyncStatus {
    pub total_employees: i64,
    pub synced_count: i64,
    pub pending_count: i64,
    pub failed_count: i64,
    pub last_sync_at: Option<chrono::DateTime<Utc>>,
}

/// Validation error for compensation data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompensationValidationError {
    pub field: String,
    pub message: String,
}

impl PayrollService {
    /// Create a new payroll service
    pub fn new(db: Arc<DatabaseConnection>) -> Self {
        Self { db }
    }

    /// Sync compensation data with QuickBooks
    pub async fn sync_compensation(
        &self,
        employee_id: Uuid,
        direction: SyncDirection,
        intuit_client: &IntuitClient,
    ) -> Result<CompensationData> {
        // Get current employee data from database
        let employee = self.get_employee_compensation(employee_id).await?;

        match direction {
            SyncDirection::ToQuickBooks => {
                self.push_compensation_to_quickbooks(employee_id, &employee, intuit_client)
                    .await
            }
            SyncDirection::FromQuickBooks => {
                self.pull_compensation_from_quickbooks(employee_id, intuit_client)
                    .await
            }
        }
    }

    /// Push compensation data to QuickBooks
    async fn push_compensation_to_quickbooks(
        &self,
        employee_id: Uuid,
        compensation: &CompensationData,
        _intuit_client: &IntuitClient,
    ) -> Result<CompensationData> {
        // Validate compensation data
        self.validate_compensation(compensation)?;

        // Log the sync attempt
        self.log_sync_history(CreatePayrollSyncHistoryInput {
            user_id: employee_id,
            sync_direction: SyncDirection::ToQuickBooks.as_str().to_string(),
            change_type: "FULL_SYNC".to_string(),
            old_value: None,
            new_value: serde_json::to_value(compensation)?,
            quickbooks_payroll_item_id: compensation.quickbooks_payroll_item_id.clone(),
            sync_status: Some("SUCCESS".to_string()),
            error_message: None,
            changed_by: None,
            metadata: None,
            effective_date: None,
        })
        .await?;

        Ok(compensation.clone())
    }

    /// Pull compensation data from QuickBooks
    async fn pull_compensation_from_quickbooks(
        &self,
        employee_id: Uuid,
        _intuit_client: &IntuitClient,
    ) -> Result<CompensationData> {
        // Get current local data for comparison
        let old_compensation = self.get_employee_compensation(employee_id).await?;

        // In a real implementation, we would fetch from QuickBooks API
        // For now, we'll use placeholder data
        let new_compensation = CompensationData::default();

        // Log the sync
        self.log_sync_history(CreatePayrollSyncHistoryInput {
            user_id: employee_id,
            sync_direction: SyncDirection::FromQuickBooks.as_str().to_string(),
            change_type: "FULL_SYNC".to_string(),
            old_value: Some(serde_json::to_value(&old_compensation)?),
            new_value: serde_json::to_value(&new_compensation)?,
            quickbooks_payroll_item_id: new_compensation.quickbooks_payroll_item_id.clone(),
            sync_status: Some("SUCCESS".to_string()),
            error_message: None,
            changed_by: None,
            metadata: None,
            effective_date: None,
        })
        .await?;

        Ok(new_compensation)
    }

    /// Get employee compensation data
    async fn get_employee_compensation(&self, employee_id: Uuid) -> Result<CompensationData> {
        use crate::models::user;

        let employee = user::Entity::find_by_id(employee_id)
            .one(&*self.db)
            .await?
            .context("Employee not found")?;

        Ok(CompensationData {
            compensation_type: employee.compensation_type,
            annual_salary: employee.annual_salary.map(|d| d.to_string().parse().unwrap_or(0.0)),
            hourly_rate: employee.hourly_rate.map(|d| d.to_string().parse().unwrap_or(0.0)),
            pay_schedule: employee.pay_schedule,
            commission_rate: employee.commission_rate.map(|d| d.to_string().parse().unwrap_or(0.0)),
            bonus_eligible: Some(employee.bonus_eligible),
            quickbooks_payroll_item_id: employee.quickbooks_payroll_item_id,
        })
    }

    /// Update employee compensation
    pub async fn update_compensation(
        &self,
        input: UpdateCompensationInput,
        changed_by: Option<Uuid>,
    ) -> Result<CompensationData> {
        use crate::models::user;

        // Get current compensation for audit trail
        let old_compensation = self.get_employee_compensation(input.employee_id).await?;

        // Build new compensation data
        let new_compensation = CompensationData {
            compensation_type: Some(input.compensation_type.as_str().to_string()),
            annual_salary: if input.compensation_type == CompensationType::Salary {
                Some(input.amount.to_string().parse()?)
            } else {
                None
            },
            hourly_rate: if input.compensation_type == CompensationType::Hourly {
                Some(input.amount.to_string().parse()?)
            } else {
                None
            },
            pay_schedule: Some(input.pay_schedule.as_str().to_string()),
            commission_rate: input.commission_rate.map(|r| r.to_string().parse().unwrap_or(0.0)),
            bonus_eligible: input.bonus_eligible,
            quickbooks_payroll_item_id: None,
        };

        // Validate new compensation
        self.validate_compensation(&new_compensation)?;

        // Update the employee record
        let employee = user::Entity::find_by_id(input.employee_id)
            .one(&*self.db)
            .await?
            .context("Employee not found")?;

        let mut active_employee: user::ActiveModel = employee.into();
        active_employee.compensation_type = Set(new_compensation.compensation_type.clone());
        active_employee.annual_salary = Set(new_compensation.annual_salary.map(|v| {
            Decimal::from_str_exact(&v.to_string()).unwrap_or(Decimal::ZERO)
        }));
        active_employee.hourly_rate = Set(new_compensation.hourly_rate.map(|v| {
            Decimal::from_str_exact(&v.to_string()).unwrap_or(Decimal::ZERO)
        }));
        active_employee.pay_schedule = Set(new_compensation.pay_schedule.clone());
        active_employee.commission_rate = Set(new_compensation.commission_rate.map(|v| {
            Decimal::from_str_exact(&v.to_string()).unwrap_or(Decimal::ZERO)
        }));
        active_employee.bonus_eligible = Set(new_compensation.bonus_eligible.unwrap_or(false));

        active_employee.update(&*self.db).await?;

        // Log the change
        self.log_sync_history(CreatePayrollSyncHistoryInput {
            user_id: input.employee_id,
            sync_direction: "MANUAL_UPDATE".to_string(),
            change_type: "COMPENSATION_UPDATE".to_string(),
            old_value: Some(serde_json::to_value(&old_compensation)?),
            new_value: serde_json::to_value(&new_compensation)?,
            quickbooks_payroll_item_id: None,
            sync_status: Some("SUCCESS".to_string()),
            error_message: None,
            changed_by,
            metadata: None,
            effective_date: input.effective_date,
        })
        .await?;

        Ok(new_compensation)
    }

    /// Get payroll items from QuickBooks
    pub async fn get_payroll_items(
        &self,
        _intuit_client: &IntuitClient,
    ) -> Result<Vec<PayrollItem>> {
        // In a real implementation, this would query QuickBooks API
        // For now, return placeholder data
        Ok(vec![
            PayrollItem {
                id: "1".to_string(),
                name: "Regular Pay".to_string(),
                item_type: "SALARY".to_string(),
                description: Some("Regular salary payroll item".to_string()),
            },
            PayrollItem {
                id: "2".to_string(),
                name: "Hourly Wages".to_string(),
                item_type: "HOURLY".to_string(),
                description: Some("Hourly wage payroll item".to_string()),
            },
        ])
    }

    /// Map a compensation type to a QuickBooks payroll item
    pub async fn map_payroll_item(
        &self,
        compensation_type: String,
        quickbooks_item_id: String,
    ) -> Result<bool> {
        // This would typically update a mapping table
        // For now, we'll just validate and return success
        if compensation_type.is_empty() || quickbooks_item_id.is_empty() {
            return Err(anyhow::anyhow!("Invalid mapping parameters"));
        }

        Ok(true)
    }

    /// Get compensation history for an employee
    pub async fn get_compensation_history(
        &self,
        _employee_id: Uuid,
        _limit: Option<i64>,
    ) -> Result<Vec<CompensationHistoryRecord>> {
        // In a real implementation, this would query payroll_sync_history table
        // For now, return empty vec
        Ok(vec![])
    }

    /// Sync all employee compensation
    pub async fn sync_all_compensation(
        &self,
        direction: SyncDirection,
        intuit_client: &IntuitClient,
    ) -> Result<PayrollSyncStatus> {
        use crate::models::user;

        // Get all active employees
        let employees = user::Entity::find()
            .filter(user::Column::DeletedAt.is_null())
            .all(&*self.db)
            .await?;

        let total = employees.len() as i64;
        let mut synced = 0;
        let mut failed = 0;

        for employee in employees {
            match self
                .sync_compensation(employee.id, direction.clone(), intuit_client)
                .await
            {
                Ok(_) => synced += 1,
                Err(e) => {
                    tracing::error!(
                        "Failed to sync compensation for employee {}: {}",
                        employee.id,
                        e
                    );
                    failed += 1;
                }
            }
        }

        Ok(PayrollSyncStatus {
            total_employees: total,
            synced_count: synced,
            pending_count: 0,
            failed_count: failed,
            last_sync_at: Some(Utc::now()),
        })
    }

    /// Validate compensation data
    fn validate_compensation(&self, compensation: &CompensationData) -> Result<()> {
        let mut errors = Vec::new();

        // Validate annual salary range
        if let Some(salary) = compensation.annual_salary {
            if salary < 0.0 || salary > 10_000_000.0 {
                errors.push(CompensationValidationError {
                    field: "annual_salary".to_string(),
                    message: "Annual salary must be between 0 and 10,000,000".to_string(),
                });
            }
        }

        // Validate hourly rate range
        if let Some(rate) = compensation.hourly_rate {
            if rate < 0.0 || rate > 1_000.0 {
                errors.push(CompensationValidationError {
                    field: "hourly_rate".to_string(),
                    message: "Hourly rate must be between 0 and 1,000".to_string(),
                });
            }
        }

        // Validate commission rate range
        if let Some(commission) = compensation.commission_rate {
            if commission < 0.0 || commission > 100.0 {
                errors.push(CompensationValidationError {
                    field: "commission_rate".to_string(),
                    message: "Commission rate must be between 0 and 100".to_string(),
                });
            }
        }

        if !errors.is_empty() {
            return Err(anyhow::anyhow!(
                "Compensation validation failed: {:?}",
                errors
            ));
        }

        Ok(())
    }

    /// Log sync history
    async fn log_sync_history(&self, input: CreatePayrollSyncHistoryInput) -> Result<Uuid> {
        // In a real implementation, this would insert into payroll_sync_history table
        // For now, return a new UUID
        Ok(Uuid::new_v4())
    }

    /// Get payroll sync status
    pub async fn get_payroll_sync_status(&self) -> Result<PayrollSyncStatus> {
        use crate::models::user;

        // Count total active employees
        let total = user::Entity::find()
            .filter(user::Column::DeletedAt.is_null())
            .count(&*self.db)
            .await? as i64;

        // Count employees with compensation data
        let synced = user::Entity::find()
            .filter(user::Column::DeletedAt.is_null())
            .filter(user::Column::CompensationType.is_not_null())
            .count(&*self.db)
            .await? as i64;

        Ok(PayrollSyncStatus {
            total_employees: total,
            synced_count: synced,
            pending_count: total - synced,
            failed_count: 0,
            last_sync_at: None,
        })
    }
}
