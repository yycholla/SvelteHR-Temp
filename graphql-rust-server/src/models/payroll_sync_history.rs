//! Payroll Sync History Model
//!
//! Tracks all compensation changes and QuickBooks payroll synchronization events

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use uuid::Uuid;

/// Payroll sync history record
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Model {
    pub id: Uuid,
    pub user_id: Uuid,
    pub sync_direction: String,
    pub change_type: String,
    pub old_value: Option<JsonValue>,
    pub new_value: JsonValue,
    pub quickbooks_payroll_item_id: Option<String>,
    pub sync_status: String,
    pub error_message: Option<String>,
    pub changed_by: Option<Uuid>,
    pub metadata: Option<JsonValue>,
    pub effective_date: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
}

/// Input for creating a payroll sync history record
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreatePayrollSyncHistoryInput {
    pub user_id: Uuid,
    pub sync_direction: String,
    pub change_type: String,
    pub old_value: Option<JsonValue>,
    pub new_value: JsonValue,
    pub quickbooks_payroll_item_id: Option<String>,
    pub sync_status: Option<String>,
    pub error_message: Option<String>,
    pub changed_by: Option<Uuid>,
    pub metadata: Option<JsonValue>,
    pub effective_date: Option<DateTime<Utc>>,
}

/// Compensation data structure for change tracking
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompensationData {
    pub compensation_type: Option<crate::models::user::CompensationType>,
    pub annual_salary: Option<f64>,
    pub hourly_rate: Option<f64>,
    pub pay_schedule: Option<crate::models::user::PaySchedule>,
    pub commission_rate: Option<f64>,
    pub bonus_eligible: Option<bool>,
    pub quickbooks_payroll_item_id: Option<String>,
}

impl Default for CompensationData {
    fn default() -> Self {
        Self {
            compensation_type: None,
            annual_salary: None,
            hourly_rate: None,
            pay_schedule: None,
            commission_rate: None,
            bonus_eligible: None,
            quickbooks_payroll_item_id: None,
        }
    }
}
