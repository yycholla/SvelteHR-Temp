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
    #[graphql(name = "PENDING")]
    Pending,
    #[graphql(name = "APPROVED")]
    Approved,
    #[graphql(name = "REJECTED")]
    Rejected,
    #[graphql(name = "COMPLETED")]
    Completed,
}

/// Rollback request for data restoration
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct RollbackRequest {
    pub id: Uuid,
    pub requester_id: Uuid,
    pub resource_type: String,
    pub resource_id: Uuid,
    pub rollback_to_timestamp: DateTime<Utc>,
    pub status: RollbackStatus,
    pub approver_id: Option<Uuid>,
    pub completed_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
}

/// Input for creating a new rollback request
#[derive(Debug, Clone, InputObject)]
pub struct CreateRollbackRequestInput {
    #[graphql(name = "requesterId")]
    pub requester_id: Uuid,
    #[graphql(name = "resourceType")]
    pub resource_type: String,
    #[graphql(name = "resourceId")]
    pub resource_id: Uuid,
    #[graphql(name = "rollbackToTimestamp")]
    pub rollback_to_timestamp: DateTime<Utc>,
}

/// Input for updating a rollback request (status changes)
#[derive(Debug, Clone, InputObject)]
pub struct UpdateRollbackRequestInput {
    pub status: Option<RollbackStatus>,
    #[graphql(name = "approverId")]
    pub approver_id: Option<Uuid>,
}

/// GraphQL Object implementation with camelCase field names
#[Object]
impl RollbackRequest {
    async fn id(&self) -> Uuid {
        self.id
    }

    #[graphql(name = "requesterId")]
    async fn requester_id(&self) -> Uuid {
        self.requester_id
    }

    #[graphql(name = "resourceType")]
    async fn resource_type(&self) -> &str {
        &self.resource_type
    }

    #[graphql(name = "resourceId")]
    async fn resource_id(&self) -> Uuid {
        self.resource_id
    }

    #[graphql(name = "rollbackToTimestamp")]
    async fn rollback_to_timestamp(&self) -> DateTime<Utc> {
        self.rollback_to_timestamp
    }

    async fn status(&self) -> RollbackStatus {
        self.status
    }

    #[graphql(name = "approverId")]
    async fn approver_id(&self) -> Option<Uuid> {
        self.approver_id
    }

    #[graphql(name = "completedAt")]
    async fn completed_at(&self) -> Option<DateTime<Utc>> {
        self.completed_at
    }

    #[graphql(name = "createdAt")]
    async fn created_at(&self) -> DateTime<Utc> {
        self.created_at
    }

    /// Requester relationship (lazy-loaded)
    async fn requester(&self, ctx: &async_graphql::Context<'_>) -> GqlResult<crate::models::User> {
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
        .bind(self.requester_id)
        .fetch_one(pool)
        .await?;

        Ok(user)
    }

    /// Approver relationship (lazy-loaded)
    async fn approver(&self, ctx: &async_graphql::Context<'_>) -> GqlResult<Option<crate::models::User>> {
        let Some(approver_id) = self.approver_id else {
            return Ok(None);
        };

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
        .bind(approver_id)
        .fetch_one(pool)
        .await?;

        Ok(Some(user))
    }
}
