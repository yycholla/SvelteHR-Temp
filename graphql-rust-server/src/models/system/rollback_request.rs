//! Rollback Request Model
//!
//! Maps to hr_public.rollback_requests table

use async_graphql::{Enum, InputObject, Object, Result as GqlResult, SimpleObject};
use chrono::{DateTime, Utc};
use sea_orm::{entity::prelude::*, QueryFilter};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

use crate::schema::PageInfo;

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

impl RollbackStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            RollbackStatus::Pending => "pending",
            RollbackStatus::Approved => "approved",
            RollbackStatus::Rejected => "rejected",
            RollbackStatus::Completed => "completed",
        }
    }
}

/// SeaORM Rollback request entity
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "rollback_requests", schema_name = "hr_public")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub entity_type: String,
    pub entity_id: Uuid,
    pub requested_by: Uuid,
    pub reason: String,
    #[sea_orm(column_type = "Text")]
    pub status: String, // Will be converted to enum in GraphQL
    pub approved_by: Option<Uuid>,
    pub processed_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "crate::models::user::Entity",
        from = "Column::RequestedBy",
        to = "crate::models::user::Column::Id"
    )]
    RequestedBy,
    #[sea_orm(
        belongs_to = "crate::models::user::Entity",
        from = "Column::ApprovedBy",
        to = "crate::models::user::Column::Id"
    )]
    ApprovedBy,
}

impl ActiveModelBehavior for ActiveModel {}

/// SQLx-compatible RollbackRequest struct for backward compatibility during migration
#[derive(Debug, Clone, Serialize, Deserialize, SimpleObject, FromRow)]
pub struct RollbackRequest {
    pub id: Uuid,
    pub entity_type: String,
    pub entity_id: Uuid,
    pub requested_by: Uuid,
    pub reason: String,
    pub status: RollbackStatus,
    pub approved_by: Option<Uuid>,
    pub processed_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
}

/// Input for creating a new rollback request
#[derive(Debug, Clone, InputObject)]
pub struct CreateRollbackRequestInput {
    #[graphql(name = "entityType")]
    pub entity_type: String,
    #[graphql(name = "entityId")]
    pub entity_id: Uuid,
    pub reason: String,
}

/// Input for updating a rollback request (status changes)
#[derive(Debug, Clone, InputObject)]
pub struct UpdateRollbackRequestInput {
    pub status: Option<RollbackStatus>,
    #[graphql(name = "approvedBy")]
    pub approved_by: Option<Uuid>,
}

/// Condition input for filtering rollback requests (PostGraphile-style)
#[derive(Debug, Clone, InputObject)]
pub struct RollbackRequestCondition {
    pub id: Option<Uuid>,
    #[graphql(name = "entityType")]
    pub entity_type: Option<String>,
    #[graphql(name = "entityId")]
    pub entity_id: Option<Uuid>,
    #[graphql(name = "requestedBy")]
    pub requested_by: Option<Uuid>,
    pub status: Option<RollbackStatus>,
    #[graphql(name = "approvedBy")]
    pub approved_by: Option<Uuid>,
}

/// Ordering options for rollback requests
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Enum)]
pub enum RollbackRequestsOrderBy {
    #[graphql(name = "ID_ASC")]
    IdAsc,
    #[graphql(name = "ID_DESC")]
    IdDesc,
    #[graphql(name = "CREATED_AT_ASC")]
    CreatedAtAsc,
    #[graphql(name = "CREATED_AT_DESC")]
    CreatedAtDesc,
    #[graphql(name = "STATUS_ASC")]
    StatusAsc,
    #[graphql(name = "STATUS_DESC")]
    StatusDesc,
}

impl RollbackRequestsOrderBy {
    pub fn to_sql(&self) -> &'static str {
        match self {
            RollbackRequestsOrderBy::IdAsc => "id ASC",
            RollbackRequestsOrderBy::IdDesc => "id DESC",
            RollbackRequestsOrderBy::CreatedAtAsc => "created_at ASC",
            RollbackRequestsOrderBy::CreatedAtDesc => "created_at DESC",
            RollbackRequestsOrderBy::StatusAsc => "status ASC",
            RollbackRequestsOrderBy::StatusDesc => "status DESC",
        }
    }
}

/// Connection type for paginated rollback requests
#[derive(Debug, Clone)]
pub struct RollbackRequestsConnection {
    pub nodes: Vec<RollbackRequest>,
    pub total_count: i64,
    pub page_info: PageInfo,
}

#[Object(name = "system_rollback_request_RollbackRequestsConnection")]
impl RollbackRequestsConnection {
    async fn nodes(&self) -> &Vec<RollbackRequest> {
        &self.nodes
    }

    async fn total_count(&self) -> i64 {
        self.total_count
    }

    async fn page_info(&self) -> &PageInfo {
        &self.page_info
    }
}

/// GraphQL Object implementation with camelCase field names
#[Object(name = "system_rollback_request_Model")]
impl Model {
    async fn id(&self) -> Uuid {
        self.id
    }

    #[graphql(name = "entityType")]
    async fn entity_type(&self) -> &str {
        &self.entity_type
    }

    #[graphql(name = "entityId")]
    async fn entity_id(&self) -> Uuid {
        self.entity_id
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
        self.created_at
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

    #[graphql(name = "approvedBy")]
    async fn approved_by(&self) -> Option<Uuid> {
        self.approved_by
    }

    #[graphql(name = "reviewedBy")]
    async fn reviewed_by(&self) -> Option<Uuid> {
        self.approved_by
    }

    #[graphql(name = "reviewerId")]
    async fn reviewer_id(&self) -> Option<Uuid> {
        self.approved_by
    }

    #[graphql(name = "processedAt")]
    async fn processed_at(&self) -> Option<DateTime<Utc>> {
        self.processed_at
    }

    #[graphql(name = "reviewedAt")]
    async fn reviewed_at(&self) -> Option<DateTime<Utc>> {
        self.processed_at
    }

    #[graphql(name = "createdAt")]
    async fn created_at(&self) -> DateTime<Utc> {
        self.created_at
    }

    #[graphql(name = "updatedAt")]
    async fn updated_at(&self) -> DateTime<Utc> {
        self.created_at
    }

    /// Requester relationship (simple name for frontend compatibility)
    async fn requester(&self, ctx: &async_graphql::Context<'_>) -> GqlResult<crate::models::user::Model> {
        let db = get_db_from_context(ctx)?;
        let user = crate::models::user::Entity::find_by_id(self.requested_by)
            .one(&db)
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
        let Some(approved_by) = self.approved_by else {
            return Ok(None);
        };

        let db = get_db_from_context(ctx)?;
        let user = crate::models::user::Entity::find_by_id(approved_by)
            .one(&db)
            .await?;

        Ok(user)
    }

    /// PostGraphile-style alias for reviewer
    #[graphql(name = "userByReviewedBy")]
    async fn user_by_reviewed_by(&self, ctx: &async_graphql::Context<'_>) -> GqlResult<Option<crate::models::User>> {
        self.reviewer(ctx).await?
    }

    /// PostGraphile-style alias for approver
    #[graphql(name = "userByApprovedBy")]
    async fn user_by_approved_by(&self, ctx: &async_graphql::Context<'_>) -> GqlResult<Option<crate::models::User>> {
        self.reviewer(ctx).await?
    }
}
