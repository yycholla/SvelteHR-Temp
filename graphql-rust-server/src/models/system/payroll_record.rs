//! Payroll Record Model
//!
//! Maps to hr_public.payroll_records table

use async_graphql::{InputObject, Object, Result as GqlResult};
use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use sqlx::PgPool;
use uuid::Uuid;

/// Payroll processing record
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct PayrollRecord {
    pub id: Uuid,
    pub employee_id: Uuid,
    pub pay_period_start: NaiveDate,
    pub pay_period_end: NaiveDate,
    pub gross_pay: f64,
    pub net_pay: f64,
    pub deductions: Option<JsonValue>,
    pub bonuses: Option<JsonValue>,
    pub processed_at: DateTime<Utc>,
    pub processor_id: Uuid,
    pub created_at: DateTime<Utc>,
}

/// Input for creating a new payroll record
#[derive(Debug, Clone, InputObject)]
pub struct CreatePayrollRecordInput {
    #[graphql(name = "employeeId")]
    pub employee_id: Uuid,
    #[graphql(name = "payPeriodStart")]
    pub pay_period_start: NaiveDate,
    #[graphql(name = "payPeriodEnd")]
    pub pay_period_end: NaiveDate,
    #[graphql(name = "grossPay")]
    pub gross_pay: f64,
    #[graphql(name = "netPay")]
    pub net_pay: f64,
    pub deductions: Option<String>, // JSON string
    pub bonuses: Option<String>,    // JSON string
    #[graphql(name = "processorId")]
    pub processor_id: Uuid,
}

/// GraphQL Object implementation with camelCase field names
#[Object]
impl PayrollRecord {
    async fn id(&self) -> Uuid {
        self.id
    }

    #[graphql(name = "employeeId")]
    async fn employee_id(&self) -> Uuid {
        self.employee_id
    }

    #[graphql(name = "payPeriodStart")]
    async fn pay_period_start(&self) -> NaiveDate {
        self.pay_period_start
    }

    #[graphql(name = "payPeriodEnd")]
    async fn pay_period_end(&self) -> NaiveDate {
        self.pay_period_end
    }

    #[graphql(name = "grossPay")]
    async fn gross_pay(&self) -> f64 {
        self.gross_pay
    }

    #[graphql(name = "netPay")]
    async fn net_pay(&self) -> f64 {
        self.net_pay
    }

    async fn deductions(&self) -> Option<String> {
        self.deductions.as_ref().map(|v| v.to_string())
    }

    async fn bonuses(&self) -> Option<String> {
        self.bonuses.as_ref().map(|v| v.to_string())
    }

    #[graphql(name = "processedAt")]
    async fn processed_at(&self) -> DateTime<Utc> {
        self.processed_at
    }

    #[graphql(name = "processorId")]
    async fn processor_id(&self) -> Uuid {
        self.processor_id
    }

    #[graphql(name = "createdAt")]
    async fn created_at(&self) -> DateTime<Utc> {
        self.created_at
    }

    /// Employee relationship (lazy-loaded)
    async fn employee(&self, ctx: &async_graphql::Context<'_>) -> GqlResult<crate::models::User> {
        let pool = ctx.data::<PgPool>()?;
        let user = sqlx::query_as::<_, crate::models::User>(
            r#"
            SELECT id, email, first_name, last_name, full_name, phone,
                   department_id, manager_id, hire_date, termination_date,
                   status, created_at, updated_at, deleted_at
            FROM hr_public.users
            WHERE id = $1 AND deleted_at IS NULL
            "#,
        )
        .bind(self.employee_id)
        .fetch_one(pool)
        .await?;

        Ok(user)
    }

    /// Processor relationship (lazy-loaded)
    async fn processor(&self, ctx: &async_graphql::Context<'_>) -> GqlResult<crate::models::User> {
        let pool = ctx.data::<PgPool>()?;
        let user = sqlx::query_as::<_, crate::models::User>(
            r#"
            SELECT id, email, first_name, last_name, full_name, phone,
                   department_id, manager_id, hire_date, termination_date,
                   status, created_at, updated_at, deleted_at
            FROM hr_public.users
            WHERE id = $1 AND deleted_at IS NULL
            "#,
        )
        .bind(self.processor_id)
        .fetch_one(pool)
        .await?;

        Ok(user)
    }
}
