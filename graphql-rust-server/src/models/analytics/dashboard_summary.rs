//! Dashboard Summary Model (Materialized View)
//!
//! Maps to hr_public.dashboard_summaries materialized view
//! READ-ONLY - refreshed via explicit mutation

use async_graphql::Object;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

/// Global dashboard KPIs (materialized view)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DashboardSummary {
    pub summary_key: String, // Always "global"
    pub total_active_employees: i32,
    pub tasks_in_progress: i32,
    pub pending_leave_requests: i32,
    pub expired_certifications: i32,
    pub last_refreshed_at: DateTime<Utc>,
}

/// GraphQL Object implementation with camelCase field names
#[Object]
impl DashboardSummary {
    #[graphql(name = "summaryKey")]
    async fn summary_key(&self) -> &str {
        &self.summary_key
    }

    #[graphql(name = "totalActiveEmployees")]
    async fn total_active_employees(&self) -> i32 {
        self.total_active_employees
    }

    #[graphql(name = "tasksInProgress")]
    async fn tasks_in_progress(&self) -> i32 {
        self.tasks_in_progress
    }

    #[graphql(name = "pendingLeaveRequests")]
    async fn pending_leave_requests(&self) -> i32 {
        self.pending_leave_requests
    }

    #[graphql(name = "expiredCertifications")]
    async fn expired_certifications(&self) -> i32 {
        self.expired_certifications
    }

    #[graphql(name = "lastRefreshedAt")]
    async fn last_refreshed_at(&self) -> DateTime<Utc> {
        self.last_refreshed_at
    }
}
