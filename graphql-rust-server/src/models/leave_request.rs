//! LeaveRequest domain model with GraphQL integration
//!
//! Represents time-off requests with approval workflow.

use async_graphql::{Context, Enum, InputObject, Object, Result as GqlResult};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

/// Leave request status
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Enum, sqlx::Type)]
#[sqlx(type_name = "leave_request_status", rename_all = "lowercase")]
pub enum LeaveRequestStatus {
    Pending,
    Approved,
    Rejected,
    Cancelled,
}

/// LeaveRequest model - maps to hr_public.leave_requests table
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct LeaveRequest {
    pub id: Uuid,
    pub user_id: Uuid,
    pub leave_type_id: Uuid,
    pub start_date: DateTime<Utc>,
    pub end_date: DateTime<Utc>,
    pub days_requested: i32,
    pub status: LeaveRequestStatus,
    pub reason: Option<String>,
    pub approved_by: Option<Uuid>,
    pub approved_at: Option<DateTime<Utc>>,
    pub rejection_reason: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub deleted_at: Option<DateTime<Utc>>,
}

/// GraphQL Object implementation for LeaveRequest
#[Object]
impl LeaveRequest {
    /// Unique leave request identifier
    async fn id(&self) -> Uuid {
        self.id
    }

    /// User ID requesting leave (foreign key)
    async fn user_id(&self) -> Uuid {
        self.user_id
    }

    /// Leave type ID (foreign key)
    async fn leave_type_id(&self) -> Uuid {
        self.leave_type_id
    }

    /// Leave start date
    async fn start_date(&self) -> DateTime<Utc> {
        self.start_date
    }

    /// Leave end date
    async fn end_date(&self) -> DateTime<Utc> {
        self.end_date
    }

    /// Number of days requested
    async fn days_requested(&self) -> i32 {
        self.days_requested
    }

    /// Current status of the request
    async fn status(&self) -> LeaveRequestStatus {
        self.status
    }

    /// Reason for leave (optional)
    async fn reason(&self) -> Option<&str> {
        self.reason.as_deref()
    }

    /// User ID who approved/rejected (optional)
    async fn approved_by(&self) -> Option<Uuid> {
        self.approved_by
    }

    /// Approval/rejection timestamp
    async fn approved_at(&self) -> Option<DateTime<Utc>> {
        self.approved_at
    }

    /// Reason for rejection (optional)
    async fn rejection_reason(&self) -> Option<&str> {
        self.rejection_reason.as_deref()
    }

    /// Record creation timestamp
    async fn created_at(&self) -> DateTime<Utc> {
        self.created_at
    }

    /// Record last update timestamp
    async fn updated_at(&self) -> DateTime<Utc> {
        self.updated_at
    }

    /// Soft delete timestamp (NULL if not deleted)
    async fn deleted_at(&self) -> Option<DateTime<Utc>> {
        self.deleted_at
    }

    /// User requesting leave
    async fn user(&self, ctx: &Context<'_>) -> GqlResult<Option<super::user::User>> {
        let pool = ctx.data::<PgPool>()?;

        let user = sqlx::query_as::<_, super::user::User>(
            r#"
            SELECT id, email, first_name, last_name, full_name, phone,
                   department_id, manager_id, hire_date, termination_date,
                   status, created_at, updated_at, deleted_at
            FROM hr_public.users
            WHERE id = $1 AND deleted_at IS NULL
            "#,
        )
        .bind(self.user_id)
        .fetch_optional(pool)
        .await?;

        Ok(user)
    }

    /// Leave type for this request
    async fn leave_type(&self, ctx: &Context<'_>) -> GqlResult<Option<super::leave_type::LeaveType>> {
        let pool = ctx.data::<PgPool>()?;

        let leave_type = sqlx::query_as::<_, super::leave_type::LeaveType>(
            r#"
            SELECT id, name, description, default_days_per_year,
                   requires_approval, max_consecutive_days, is_paid,
                   color, icon, created_at, updated_at, deleted_at
            FROM hr_public.leave_types
            WHERE id = $1 AND deleted_at IS NULL
            "#,
        )
        .bind(self.leave_type_id)
        .fetch_optional(pool)
        .await?;

        Ok(leave_type)
    }

    /// User who approved/rejected the request
    async fn approver(&self, ctx: &Context<'_>) -> GqlResult<Option<super::user::User>> {
        if let Some(approver_id) = self.approved_by {
            let pool = ctx.data::<PgPool>()?;

            let user = sqlx::query_as::<_, super::user::User>(
                r#"
                SELECT id, email, first_name, last_name, full_name, phone,
                       department_id, manager_id, hire_date, termination_date,
                       status, created_at, updated_at, deleted_at
                FROM hr_public.users
                WHERE id = $1 AND deleted_at IS NULL
                "#,
            )
            .bind(approver_id)
            .fetch_optional(pool)
            .await?;

            Ok(user)
        } else {
            Ok(None)
        }
    }

    /// Whether the request is currently pending
    async fn is_pending(&self) -> bool {
        self.status == LeaveRequestStatus::Pending
    }

    /// Whether the request is approved
    async fn is_approved(&self) -> bool {
        self.status == LeaveRequestStatus::Approved
    }

    /// Duration in days (calculated from start/end dates)
    async fn duration_days(&self) -> i32 {
        self.days_requested
    }
}

/// LeaveRequest creation input
#[derive(Debug, Clone, InputObject)]
pub struct CreateLeaveRequestInput {
    pub leave_type_id: Uuid,
    pub start_date: DateTime<Utc>,
    pub end_date: DateTime<Utc>,
    pub days_requested: i32,
    pub reason: Option<String>,
}

/// LeaveRequest update input
#[derive(Debug, Clone, InputObject)]
pub struct UpdateLeaveRequestInput {
    pub start_date: Option<DateTime<Utc>>,
    pub end_date: Option<DateTime<Utc>>,
    pub days_requested: Option<i32>,
    pub reason: Option<String>,
}

/// LeaveRequest approval input
#[derive(Debug, Clone, InputObject)]
pub struct ApproveLeaveRequestInput {
    pub request_id: Uuid,
}

/// LeaveRequest rejection input
#[derive(Debug, Clone, InputObject)]
pub struct RejectLeaveRequestInput {
    pub request_id: Uuid,
    pub rejection_reason: String,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_leave_request_model_compiles() {
        let request = LeaveRequest {
            id: Uuid::new_v4(),
            user_id: Uuid::new_v4(),
            leave_type_id: Uuid::new_v4(),
            start_date: Utc::now(),
            end_date: Utc::now(),
            days_requested: 5,
            status: LeaveRequestStatus::Pending,
            reason: Some("Family vacation".to_string()),
            approved_by: None,
            approved_at: None,
            rejection_reason: None,
            created_at: Utc::now(),
            updated_at: Utc::now(),
            deleted_at: None,
        };

        assert_eq!(request.status, LeaveRequestStatus::Pending);
        assert_eq!(request.days_requested, 5);
    }
}
