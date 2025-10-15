//! Rollback Request Model
//!
//! Maps to hr_public.rollback_requests table

use async_graphql::{Enum, InputObject, Object, Result as GqlResult};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

/// Rollback request status
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Enum, sqlx::Type)]
#[sqlx(type_name = "rollback_status", rename_all = "lowercase")]
pub enum RollbackStatus {
    #[graphql(name = "pending")]
    Pending,
    #[graphql(name = "approved")]
    Approved,
    #[graphql(name = "rejected")]
    Rejected,
    #[graphql(name = "completed")]
    Completed,
}

/// Rollback request for data restoration
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct RollbackRequest {
    pub id: Uuid,
    pub activity_log_id: Uuid,
    pub requested_by: Uuid,
    pub requested_at: DateTime<Utc>,
    pub reason: String,
    pub status: RollbackStatus,
    pub reviewed_by: Option<Uuid>,
    pub reviewed_at: Option<DateTime<Utc>>,
    pub review_reason: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Input for creating a new rollback request
#[derive(Debug, Clone, InputObject)]
pub struct CreateRollbackRequestInput {
    #[graphql(name = "activityLogId")]
    pub activity_log_id: Uuid,
    pub reason: String,
}

/// Input for updating a rollback request (status changes)
#[derive(Debug, Clone, InputObject)]
pub struct UpdateRollbackRequestInput {
    pub status: Option<RollbackStatus>,
    #[graphql(name = "reviewedBy")]
    pub reviewed_by: Option<Uuid>,
    #[graphql(name = "reviewReason")]
    pub review_reason: Option<String>,
}

/// Condition input for filtering rollback requests (PostGraphile-style)
#[derive(Debug, Clone, InputObject)]
pub struct RollbackRequestCondition {
    pub id: Option<Uuid>,
    #[graphql(name = "activityLogId")]
    pub activity_log_id: Option<Uuid>,
    #[graphql(name = "requestedBy")]
    pub requested_by: Option<Uuid>,
    pub status: Option<RollbackStatus>,
    #[graphql(name = "reviewedBy")]
    pub reviewed_by: Option<Uuid>,
}

/// Ordering options for rollback requests
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Enum)]
pub enum RollbackRequestsOrderBy {
    #[graphql(name = "ID_ASC")]
    IdAsc,
    #[graphql(name = "ID_DESC")]
    IdDesc,
    #[graphql(name = "REQUESTED_AT_ASC")]
    RequestedAtAsc,
    #[graphql(name = "REQUESTED_AT_DESC")]
    RequestedAtDesc,
    #[graphql(name = "STATUS_ASC")]
    StatusAsc,
    #[graphql(name = "STATUS_DESC")]
    StatusDesc,
    #[graphql(name = "CREATED_AT_ASC")]
    CreatedAtAsc,
    #[graphql(name = "CREATED_AT_DESC")]
    CreatedAtDesc,
}

impl RollbackRequestsOrderBy {
    pub fn to_sql(&self) -> &'static str {
        match self {
            RollbackRequestsOrderBy::IdAsc => "id ASC",
            RollbackRequestsOrderBy::IdDesc => "id DESC",
            RollbackRequestsOrderBy::RequestedAtAsc => "requested_at ASC",
            RollbackRequestsOrderBy::RequestedAtDesc => "requested_at DESC",
            RollbackRequestsOrderBy::StatusAsc => "status ASC",
            RollbackRequestsOrderBy::StatusDesc => "status DESC",
            RollbackRequestsOrderBy::CreatedAtAsc => "created_at ASC",
            RollbackRequestsOrderBy::CreatedAtDesc => "created_at DESC",
        }
    }
}

/// Connection type for paginated rollback requests
#[derive(Debug, Clone)]
pub struct RollbackRequestsConnection {
    pub nodes: Vec<RollbackRequest>,
    pub total_count: i64,
    pub page_info: crate::schema::PageInfo,
}

#[Object]
impl RollbackRequestsConnection {
    async fn nodes(&self) -> &Vec<RollbackRequest> {
        &self.nodes
    }

    async fn total_count(&self) -> i64 {
        self.total_count
    }

    async fn page_info(&self) -> &crate::schema::PageInfo {
        &self.page_info
    }
}

/// GraphQL Object implementation with camelCase field names
#[Object]
impl RollbackRequest {
    async fn id(&self) -> Uuid {
        self.id
    }

    #[graphql(name = "activityLogId")]
    async fn activity_log_id(&self) -> Uuid {
        self.activity_log_id
    }

    #[graphql(name = "requestedBy")]
    async fn requested_by(&self) -> Uuid {
        self.requested_by
    }

    #[graphql(name = "requesterId")]
    async fn requester_id(&self) -> Uuid {
        self.requested_by
    }

    #[graphql(name = "requestedAt")]
    async fn requested_at(&self) -> DateTime<Utc> {
        self.requested_at
    }

    async fn reason(&self) -> &str {
        &self.reason
    }

    async fn status(&self) -> RollbackStatus {
        self.status
    }

    #[graphql(name = "reviewedBy")]
    async fn reviewed_by(&self) -> Option<Uuid> {
        self.reviewed_by
    }

    #[graphql(name = "reviewerId")]
    async fn reviewer_id(&self) -> Option<Uuid> {
        self.reviewed_by
    }

    #[graphql(name = "reviewedAt")]
    async fn reviewed_at(&self) -> Option<DateTime<Utc>> {
        self.reviewed_at
    }

    #[graphql(name = "reviewReason")]
    async fn review_reason(&self) -> Option<&str> {
        self.review_reason.as_deref()
    }

    #[graphql(name = "reviewNotes")]
    async fn review_notes(&self) -> Option<&str> {
        self.review_reason.as_deref()
    }

    #[graphql(name = "createdAt")]
    async fn created_at(&self) -> DateTime<Utc> {
        self.created_at
    }

    #[graphql(name = "updatedAt")]
    async fn updated_at(&self) -> DateTime<Utc> {
        self.updated_at
    }

    /// Requester relationship (simple name for frontend compatibility)
    async fn requester(&self, ctx: &async_graphql::Context<'_>) -> GqlResult<crate::models::User> {
        let pool = ctx.data::<PgPool>()?;
        let user = sqlx::query_as::<_, crate::models::User>(
            r#"
            SELECT id, email, first_name, last_name, display_name, full_name, role,
                     phone_number, alternate_phone, job_title, status,
                     department_id, manager_id, hire_date, is_active,
                     created_at, updated_at
            FROM hr_public.users
            WHERE id = $1
            "#,
        )
        .bind(self.requested_by)
        .fetch_one(pool)
        .await?;

        Ok(user)
    }

    /// PostGraphile-style alias for requester
    #[graphql(name = "userByRequestedBy")]
    async fn user_by_requested_by(&self, ctx: &async_graphql::Context<'_>) -> GqlResult<crate::models::User> {
        self.requester(ctx).await?
    }

    /// Reviewer relationship (simple name for frontend compatibility)
    async fn reviewer(&self, ctx: &async_graphql::Context<'_>) -> GqlResult<Option<crate::models::User>> {
        let Some(reviewed_by) = self.reviewed_by else {
            return Ok(None);
        };

        let pool = ctx.data::<PgPool>()?;
        let user = sqlx::query_as::<_, crate::models::User>(
            r#"
            SELECT id, email, first_name, last_name, display_name, full_name, role,
                     phone_number, alternate_phone, job_title, status,
                     department_id, manager_id, hire_date, is_active,
                     created_at, updated_at
            FROM hr_public.users
            WHERE id = $1
            "#,
        )
        .bind(reviewed_by)
        .fetch_one(pool)
        .await?;

        Ok(Some(user))
    }

    /// PostGraphile-style alias for reviewer
    #[graphql(name = "userByReviewedBy")]
    async fn user_by_reviewed_by(&self, ctx: &async_graphql::Context<'_>) -> GqlResult<Option<crate::models::User>> {
        self.reviewer(ctx).await?
    }

    /// Activity log relationship (simple name for frontend compatibility)
    #[graphql(name = "activityLog")]
    async fn activity_log_simple(&self, ctx: &async_graphql::Context<'_>) -> GqlResult<crate::models::ActivityLog> {
        let pool = ctx.data::<PgPool>()?;
        let log = sqlx::query_as::<_, crate::models::ActivityLog>(
            r#"
            SELECT id, user_id, employee_id, action, resource_type, resource_id,
                     details, before_snapshot, after_snapshot, is_rollback,
                     rolled_back_log_id, ip_address, user_agent, created_at
            FROM hr_public.activity_logs
            WHERE id = $1
            "#,
        )
        .bind(self.activity_log_id)
        .fetch_one(pool)
        .await?;

        Ok(log)
    }

    /// Activity log relationship (lazy-loaded)
    async fn activity_log(&self, ctx: &async_graphql::Context<'_>) -> GqlResult<crate::models::ActivityLog> {
        self.activity_log_simple(ctx).await?
    }

    /// PostGraphile-style alias for activity log
    #[graphql(name = "activityLogByActivityLogId")]
    async fn activity_log_by_activity_log_id(&self, ctx: &async_graphql::Context<'_>) -> GqlResult<crate::models::ActivityLog> {
        self.activity_log_simple(ctx).await?
    }
}
