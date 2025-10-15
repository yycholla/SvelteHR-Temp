//! Report Analytic Model (Materialized View)
//!
//! Maps to hr_public.report_analytics materialized view
//! READ-ONLY - refreshed via explicit mutation

use async_graphql::{Object, Result as GqlResult};
use chrono::{DateTime, Utc};
use sea_orm::{entity::prelude::*, FromQueryResult, QueryFilter};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::{database::get_db_from_context, error::AppError};

/// Department attendance and headcount analytics (materialized view)
#[derive(Debug, Clone, Serialize, Deserialize, FromQueryResult)]
pub struct Model {
    pub department_id: Uuid,
    pub department_name: String,
    pub month: NaiveDate,
    pub headcount: i32,
    pub days_present: Option<i32>,
    pub attendance_rate_percentage: Option<f64>,
    pub last_refreshed_at: DateTime<Utc>,
}

/// SQLx-compatible ReportAnalytic struct for backward compatibility during migration
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct ReportAnalytic {
    pub department_id: Uuid,
    pub department_name: String,
    pub month: NaiveDate,
    pub headcount: i32,
    pub days_present: Option<i32>,
    pub attendance_rate_percentage: Option<f64>,
    pub last_refreshed_at: DateTime<Utc>,
}

/// GraphQL Object implementation with camelCase field names
#[Object]
impl Model {
    #[graphql(name = "departmentId")]
    async fn department_id(&self) -> Uuid {
        self.department_id
    }

    #[graphql(name = "departmentName")]
    async fn department_name(&self) -> &str {
        &self.department_name
    }

    async fn month(&self) -> NaiveDate {
        self.month
    }

    async fn headcount(&self) -> i32 {
        self.headcount
    }

    #[graphql(name = "daysPresent")]
    async fn days_present(&self) -> Option<i32> {
        self.days_present
    }

    #[graphql(name = "attendanceRatePercentage")]
    async fn attendance_rate_percentage(&self) -> Option<f64> {
        self.attendance_rate_percentage
    }

    #[graphql(name = "lastRefreshedAt")]
    async fn last_refreshed_at(&self) -> DateTime<Utc> {
        self.last_refreshed_at
    }

    /// Department relationship (lazy-loaded)
    async fn department(&self, ctx: &async_graphql::Context<'_>) -> GqlResult<crate::models::department::Model> {
        let db = get_db_from_context(ctx)?;
        let dept = crate::models::department::Entity::find_by_id(self.department_id)
            .one(db)
            .await?
            .ok_or_else(|| AppError::NotFound("Department not found".to_string()))?;

        Ok(dept)
    }
}
