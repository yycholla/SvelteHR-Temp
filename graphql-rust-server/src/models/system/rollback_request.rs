//! Rollback Request Model
//!
//! Maps to hr_public.rollback_requests table

use async_graphql::{Enum, InputObject, Object, Result as GqlResult};
use chrono::{DateTime, Utc};
use sea_orm::{entity::prelude::*, QueryFilter};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::{database::get_db_from_context, error::AppError};

/// Rollback request status
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Enum)]
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

/// SeaORM Rollback request entity
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "rollback_requests")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub activity_log_id: Uuid,
    pub requested_by: Uuid,
    pub requested_at: DateTime<Utc>,
    pub reason: String,
    #[sea_orm(column_type = "Text")]
    pub status: String, // Will be converted to enum in GraphQL
    pub reviewed_by: Option<Uuid>,
    pub reviewed_at: Option<DateTime<Utc>>,
    pub review_reason: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "crate::models::system::activity_log::Entity",
        from = "Column::ActivityLogId",
        to = "crate::models::system::activity_log::Column::Id"
    )]
    ActivityLog,
    #[sea_orm(
        belongs_to = "crate::models::user::Entity",
        from = "Column::RequestedBy",
        to = "crate::models::user::Column::Id"
    )]
    RequestedBy,
    #[sea_orm(
        belongs_to = "crate::models::user::Entity",
        from = "Column::ReviewedBy",
        to = "crate::models::user::Column::Id"
    )]
    ReviewedBy,
}

impl ActiveModelBehavior for ActiveModel {}

/// SQLx-compatible RollbackRequest struct for backward compatibility during migration
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
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
impl Model {
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
        match self.status.as_str() {
            "pending" => RollbackStatus::Pending,
            "approved" => RollbackStatus::Approved,
            "rejected" => RollbackStatus::Rejected,
            "completed" => RollbackStatus::Completed,
            _ => RollbackStatus::Pending, // Default fallback
        }
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
    async fn requester(&self, ctx: &async_graphql::Context<'_>) -> GqlResult<crate::models::user::Model> {
        let db = get_db_from_context(ctx)?;
        let user = crate::models::user::Entity::find_by_id(self.requested_by)
            .one(db)
            .await?
            .ok_or_else(|| AppError::NotFound("Requester not found".to_string()))?;

        Ok(user)
    }

    /// PostGraphile-style alias for requester
    #[graphql(name = "userByRequestedBy")]
    async fn user_by_requested_by(&self, ctx: &async_graphql::Context<'_>) -> GqlResult<crate::models::User> {
        self.requester(ctx).await?
    }

    /// Reviewer relationship (simple name for frontend compatibility)
    async fn reviewer(&self, ctx: &async_graphql::Context<'_>) -> GqlResult<Option<crate::models::user::Model>> {
        let Some(reviewed_by) = self.reviewed_by else {
            return Ok(None);
        };

        let db = get_db_from_context(ctx)?;
        let user = crate::models::user::Entity::find_by_id(reviewed_by)
            .one(db)
            .await?;

        Ok(user)
    }

    /// PostGraphile-style alias for reviewer
    #[graphql(name = "userByReviewedBy")]
    async fn user_by_reviewed_by(&self, ctx: &async_graphql::Context<'_>) -> GqlResult<Option<crate::models::User>> {
        self.reviewer(ctx).await?
    }

    /// Activity log relationship (simple name for frontend compatibility)
    #[graphql(name = "activityLog")]
    async fn activity_log_simple(&self, ctx: &async_graphql::Context<'_>) -> GqlResult<crate::models::system::activity_log::Model> {
        let db = get_db_from_context(ctx)?;
        let log = crate::models::system::activity_log::Entity::find_by_id(self.activity_log_id)
            .one(db)
            .await?
            .ok_or_else(|| AppError::NotFound("Activity log not found".to_string()))?;

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
