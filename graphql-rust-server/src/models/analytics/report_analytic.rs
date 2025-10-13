//! Report Analytic Model (Materialized View)
//!
//! Maps to hr_public.report_analytics materialized view
//! READ-ONLY - refreshed via explicit mutation

use async_graphql::{Object, Result as GqlResult};
use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

/// Department attendance and headcount analytics (materialized view)
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
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
impl ReportAnalytic {
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
    async fn department(&self, ctx: &async_graphql::Context<'_>) -> GqlResult<crate::models::Department> {
        let pool = ctx.data::<PgPool>()?;
        let dept = sqlx::query_as::<_, crate::models::Department>(
            r#"
            SELECT id, name, description, parent_department_id, manager_id,
                   created_at, updated_at, deleted_at
            FROM hr_public.departments
            WHERE id = $1 AND deleted_at IS NULL
            "#,
        )
        .bind(self.department_id)
        .fetch_one(pool)
        .await?;

        Ok(dept)
    }
}
