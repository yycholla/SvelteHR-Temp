//! Department Metric Model (Materialized View)
//!
//! Maps to hr_public.department_metrics materialized view
//! READ-ONLY - refreshed via explicit mutation

use async_graphql::{Object, Result as GqlResult};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

/// Department-level metrics (materialized view)
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct DepartmentMetric {
    pub department_id: Uuid,
    pub department_name: String,
    pub active_employee_count: i32,
    pub total_employee_count: i32,
    pub avg_performance_rating: Option<f64>,
    pub active_tasks_count: i32,
    pub pending_leave_requests: i32,
    pub last_refreshed_at: DateTime<Utc>,
}

/// GraphQL Object implementation with camelCase field names
#[Object]
impl DepartmentMetric {
    #[graphql(name = "departmentId")]
    async fn department_id(&self) -> Uuid {
        self.department_id
    }

    #[graphql(name = "departmentName")]
    async fn department_name(&self) -> &str {
        &self.department_name
    }

    #[graphql(name = "activeEmployeeCount")]
    async fn active_employee_count(&self) -> i32 {
        self.active_employee_count
    }

    #[graphql(name = "totalEmployeeCount")]
    async fn total_employee_count(&self) -> i32 {
        self.total_employee_count
    }

    #[graphql(name = "avgPerformanceRating")]
    async fn avg_performance_rating(&self) -> Option<f64> {
        self.avg_performance_rating
    }

    #[graphql(name = "activeTasksCount")]
    async fn active_tasks_count(&self) -> i32 {
        self.active_tasks_count
    }

    #[graphql(name = "pendingLeaveRequests")]
    async fn pending_leave_requests(&self) -> i32 {
        self.pending_leave_requests
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
