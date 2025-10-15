//! Department Metric Model (Materialized View)
//!
//! Maps to hr_public.department_metrics materialized view
//! READ-ONLY - refreshed via explicit mutation

use async_graphql::{Object, Result as GqlResult};
use chrono::{DateTime, Utc};
use sea_orm::{entity::prelude::*, FromQueryResult, QueryFilter};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::{database::get_db_from_context, error::AppError};

/// Department-level metrics (materialized view)
#[derive(Debug, Clone, Serialize, Deserialize, FromQueryResult)]
pub struct Model {
    pub department_id: Uuid,
    pub department_name: String,
    pub active_employee_count: i32,
    pub total_employee_count: i32,
    pub avg_performance_rating: Option<f64>,
    pub active_tasks_count: i32,
    pub pending_leave_requests: i32,
    pub last_refreshed_at: DateTime<Utc>,
}

/// SQLx-compatible DepartmentMetric struct for backward compatibility during migration
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
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
impl Model {
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
    async fn department(&self, ctx: &async_graphql::Context<'_>) -> GqlResult<crate::models::department::Model> {
        let db = get_db_from_context(ctx)?;
        let dept = crate::models::department::Entity::find_by_id(self.department_id)
            .one(db)
            .await?
            .ok_or_else(|| AppError::NotFound("Department not found".to_string()))?;

        Ok(dept)
    }
}
