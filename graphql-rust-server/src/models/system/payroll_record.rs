//! Payroll Record Model
//!
//! Maps to hr_public.payroll_records table

use async_graphql::{InputObject, Object, Result as GqlResult};
use chrono::{DateTime, NaiveDate, Utc};
use rust_decimal::Decimal;
use sea_orm::{entity::prelude::*, JsonValue, QueryFilter};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

use crate::{database::get_db_from_context, error::AppError};

/// SeaORM Payroll record entity
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "payroll_records", schema_name = "hr_public")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
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

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "crate::models::user::Entity",
        from = "Column::EmployeeId",
        to = "crate::models::user::Column::Id"
    )]
    Employee,
    #[sea_orm(
        belongs_to = "crate::models::user::Entity",
        from = "Column::ProcessorId",
        to = "crate::models::user::Column::Id"
    )]
    Processor,
}

impl ActiveModelBehavior for ActiveModel {}

/// SQLx-compatible PayrollRecord struct for backward compatibility during migration
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
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
#[Object(name = "system_payroll_record_Model")]
impl Model {
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
    async fn employee(&self, ctx: &async_graphql::Context<'_>) -> GqlResult<crate::models::user::Model> {
        let db = get_db_from_context(ctx)?;
        let user = crate::models::user::Entity::find_by_id(self.employee_id)
            .filter(crate::models::user::Column::DeletedAt.is_null())
            .one(&db)
            .await?
            .ok_or_else(|| AppError::NotFound("Employee not found".to_string()))?;

        Ok(user)
    }

    /// Processor relationship (lazy-loaded)
    async fn processor(&self, ctx: &async_graphql::Context<'_>) -> GqlResult<crate::models::user::Model> {
        let db = get_db_from_context(ctx)?;
        let user = crate::models::user::Entity::find_by_id(self.processor_id)
            .filter(crate::models::user::Column::DeletedAt.is_null())
            .one(&db)
            .await?
            .ok_or_else(|| AppError::NotFound("Processor not found".to_string()))?;

        Ok(user)
    }
}
