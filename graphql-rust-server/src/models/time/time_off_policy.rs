//! Time-Off Policy Model
//!
//! Maps to hr_public.time_off_policies table

use async_graphql::{InputObject, Object};
use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Time-off policy with accrual rules
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimeOffPolicy {
    pub id: Uuid,
    pub policy_name: String,
    pub leave_type: String, // Will be empty for now since table doesn't have this column
    pub accrual_rate: f64,  // Will be 0.0 for now since table doesn't have this column
    pub max_balance: Option<f64>, // Will be NULL for now since table doesn't have this column
    pub carryover_limit: Option<f64>, // Will be NULL for now since table doesn't have this column
    pub effective_date: NaiveDate, // Will be CURRENT_DATE for now since table doesn't have this column
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Input for creating a new time-off policy
#[derive(Debug, Clone, InputObject)]
pub struct CreateTimeOffPolicyInput {
    #[graphql(name = "policyName")]
    pub policy_name: String,
    #[graphql(name = "leaveType")]
    pub leave_type: String,
    #[graphql(name = "accrualRate")]
    pub accrual_rate: f64,
    #[graphql(name = "maxBalance")]
    pub max_balance: Option<f64>,
    #[graphql(name = "carryoverLimit")]
    pub carryover_limit: Option<f64>,
    #[graphql(name = "effectiveDate")]
    pub effective_date: NaiveDate,
}

/// Input for updating a time-off policy
#[derive(Debug, Clone, InputObject)]
pub struct UpdateTimeOffPolicyInput {
    #[graphql(name = "policyName")]
    pub policy_name: Option<String>,
    #[graphql(name = "leaveType")]
    pub leave_type: Option<String>,
    #[graphql(name = "accrualRate")]
    pub accrual_rate: Option<f64>,
    #[graphql(name = "maxBalance")]
    pub max_balance: Option<f64>,
    #[graphql(name = "carryoverLimit")]
    pub carryover_limit: Option<f64>,
    #[graphql(name = "effectiveDate")]
    pub effective_date: Option<NaiveDate>,
}

/// GraphQL Object implementation with camelCase field names
#[Object(name = "time_time_off_policy_TimeOffPolicy")]
impl TimeOffPolicy {
    async fn id(&self) -> Uuid {
        self.id
    }

    #[graphql(name = "policyName")]
    async fn policy_name(&self) -> &str {
        &self.policy_name
    }

    #[graphql(name = "leaveType")]
    async fn leave_type(&self) -> &str {
        &self.leave_type
    }

    #[graphql(name = "accrualRate")]
    async fn accrual_rate(&self) -> f64 {
        self.accrual_rate
    }

    #[graphql(name = "maxBalance")]
    async fn max_balance(&self) -> Option<f64> {
        self.max_balance
    }

    #[graphql(name = "carryoverLimit")]
    async fn carryover_limit(&self) -> Option<f64> {
        self.carryover_limit
    }

    #[graphql(name = "effectiveDate")]
    async fn effective_date(&self) -> NaiveDate {
        self.effective_date
    }

    #[graphql(name = "createdAt")]
    async fn created_at(&self) -> DateTime<Utc> {
        self.created_at
    }

    #[graphql(name = "updatedAt")]
    async fn updated_at(&self) -> DateTime<Utc> {
        self.updated_at
    }
}
