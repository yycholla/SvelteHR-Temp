//! GraphQL Query Resolvers - SeaORM Implementation
//!
//! This module implements GraphQL query resolvers using SeaORM.
//! All queries follow idiomatic Rust patterns with proper error handling.

use async_graphql::{Context, Object, Result};
use axum_login::AuthSession;
use sea_orm::{EntityTrait, QueryFilter, QueryOrder, QuerySelect, ColumnTrait};
use uuid::Uuid;

use crate::{
    auth::backend::AuthBackend,
    database::get_db_from_context,
    models::{
        // SeaORM entities
        department::{self, Entity as DepartmentEntity},
        user::{self, Entity as UserEntity},
        task::{self, Entity as TaskEntity},
        leave_request::{self, Entity as LeaveRequestEntity},
        performance_review::{self, Entity as PerformanceReviewEntity},
        system::activity_log::{self, Entity as ActivityLogEntity},
        user_session::{self, Entity as UserSessionEntity},
    },
};

/// Session information for GraphQL responses
#[derive(async_graphql::SimpleObject)]
pub struct SessionInfo {
    pub id: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub expires_at: chrono::DateTime<chrono::Utc>,
    pub last_activity: chrono::DateTime<chrono::Utc>,
    pub ip_address: Option<String>,
    pub user_agent: Option<String>,
    pub is_current_session: bool,
}

#[derive(Default)]
pub struct QueryRoot;

#[Object]
impl QueryRoot {
    // =========================================================================
    // User Queries
    // =========================================================================
    
    /// Get all users with optional filtering and pagination
    async fn users(
        &self,
        ctx: &Context<'_>,
        limit: Option<i64>,
        offset: Option<i64>,
    ) -> Result<Vec<user::Model>> {
        let db = get_db_from_context(ctx)?;
        let limit = limit.unwrap_or(100).clamp(1, 1000);
        let offset = offset.unwrap_or(0).max(0);

        let users = UserEntity::find()
            .filter(user::Column::IsActive.eq(true))
            .filter(user::Column::DeletedAt.is_null())
            .order_by_desc(user::Column::CreatedAt)
            .limit(Some(limit as u64))
            .offset(offset as u64)
            .all(&db)
            .await?;

        Ok(users)
    }

    /// Get a single user by ID
    async fn user(&self, ctx: &Context<'_>, id: Uuid) -> Result<Option<user::Model>> {
        let db = get_db_from_context(ctx)?;
        let user = UserEntity::find_by_id(id)
            .filter(user::Column::DeletedAt.is_null())
            .one(&db)
            .await?;
        Ok(user)
    }

    // =========================================================================
    // Department Queries
    // =========================================================================
    
    /// Get all departments with optional filtering and pagination
    async fn departments(
        &self,
        ctx: &Context<'_>,
        limit: Option<i64>,
        offset: Option<i64>,
    ) -> Result<Vec<department::Model>> {
        let db = get_db_from_context(ctx)?;
        let limit = limit.unwrap_or(100).clamp(1, 1000);
        let offset = offset.unwrap_or(0).max(0);

        let departments = DepartmentEntity::find()
            .filter(department::Column::DeletedAt.is_null())
            .order_by_asc(department::Column::Name)
            .limit(Some(limit as u64))
            .offset(offset as u64)
            .all(&db)
            .await?;

        Ok(departments)
    }

    /// Get a single department by ID
    async fn department(&self, ctx: &Context<'_>, id: Uuid) -> Result<Option<department::Model>> {
        let db = get_db_from_context(ctx)?;
        let dept = DepartmentEntity::find_by_id(id)
            .filter(department::Column::DeletedAt.is_null())
            .one(&db)
            .await?;
        Ok(dept)
    }

    // =========================================================================
    // Task Queries
    // =========================================================================
    
    /// Get all tasks with optional filtering and pagination
    async fn tasks(
        &self,
        ctx: &Context<'_>,
        limit: Option<i64>,
        offset: Option<i64>,
    ) -> Result<Vec<task::Model>> {
        let db = get_db_from_context(ctx)?;
        let limit = limit.unwrap_or(100).clamp(1, 1000);
        let offset = offset.unwrap_or(0).max(0);

        let tasks = TaskEntity::find()
            .filter(task::Column::DeletedAt.is_null())
            .order_by_desc(task::Column::CreatedAt)
            .limit(Some(limit as u64))
            .offset(offset as u64)
            .all(&db)
            .await?;

        Ok(tasks)
    }

    /// Get a single task by ID
    async fn task(&self, ctx: &Context<'_>, id: Uuid) -> Result<Option<task::Model>> {
        let db = get_db_from_context(ctx)?;
        let task = TaskEntity::find_by_id(id)
            .filter(task::Column::DeletedAt.is_null())
            .one(&db)
            .await?;
        Ok(task)
    }

    // =========================================================================
    // Leave Request Queries
    // =========================================================================
    
    /// Get all leave requests with optional filtering and pagination
    async fn leave_requests(
        &self,
        ctx: &Context<'_>,
        limit: Option<i64>,
        offset: Option<i64>,
    ) -> Result<Vec<leave_request::Model>> {
        let db = get_db_from_context(ctx)?;
        let limit = limit.unwrap_or(100).clamp(1, 1000);
        let offset = offset.unwrap_or(0).max(0);

        let requests = LeaveRequestEntity::find()
            .filter(leave_request::Column::DeletedAt.is_null())
            .order_by_desc(leave_request::Column::CreatedAt)
            .limit(Some(limit as u64))
            .offset(offset as u64)
            .all(&db)
            .await?;

        Ok(requests)
    }

    /// Get a single leave request by ID
    async fn leave_request(&self, ctx: &Context<'_>, id: Uuid) -> Result<Option<leave_request::Model>> {
        let db = get_db_from_context(ctx)?;
        let request = LeaveRequestEntity::find_by_id(id)
            .filter(leave_request::Column::DeletedAt.is_null())
            .one(&db)
            .await?;
        Ok(request)
    }

    // =========================================================================
    // Performance Review Queries
    // =========================================================================
    
    /// Get all performance reviews with optional filtering and pagination
    async fn performance_reviews(
        &self,
        ctx: &Context<'_>,
        limit: Option<i64>,
        offset: Option<i64>,
    ) -> Result<Vec<performance_review::Model>> {
        let db = get_db_from_context(ctx)?;
        let limit = limit.unwrap_or(100).clamp(1, 1000);
        let offset = offset.unwrap_or(0).max(0);

        let reviews = PerformanceReviewEntity::find()
            .filter(performance_review::Column::DeletedAt.is_null())
            .order_by_desc(performance_review::Column::CreatedAt)
            .limit(Some(limit as u64))
            .offset(offset as u64)
            .all(&db)
            .await?;

        Ok(reviews)
    }

    /// Get a single performance review by ID
    async fn performance_review(&self, ctx: &Context<'_>, id: Uuid) -> Result<Option<performance_review::Model>> {
        let db = get_db_from_context(ctx)?;
        let review = PerformanceReviewEntity::find_by_id(id)
            .filter(performance_review::Column::DeletedAt.is_null())
            .one(&db)
            .await?;
        Ok(review)
    }

    // =========================================================================
    // Activity Log Queries  
    // =========================================================================
    
    /// Get activity logs with optional filtering and pagination
    async fn activity_logs(
        &self,
        ctx: &Context<'_>,
        limit: Option<i64>,
        offset: Option<i64>,
    ) -> Result<Vec<activity_log::Model>> {
        let db = get_db_from_context(ctx)?;
        let limit = limit.unwrap_or(100).clamp(1, 1000);
        let offset = offset.unwrap_or(0).max(0);

        let logs = ActivityLogEntity::find()
            .order_by_desc(activity_log::Column::CreatedAt)
            .limit(Some(limit as u64))
            .offset(offset as u64)
            .all(&db)
            .await?;

        Ok(logs)
    }

    /// Get a single activity log by ID
    async fn activity_log(&self, ctx: &Context<'_>, id: Uuid) -> Result<Option<activity_log::Model>> {
        let db = get_db_from_context(ctx)?;
        let log = ActivityLogEntity::find_by_id(id).one(&db).await?;
        Ok(log)
    }

    /// Get current authenticated user information
    async fn me(&self, ctx: &Context<'_>) -> Result<Option<user::Model>> {
        let auth_session = ctx.data::<AuthSession<crate::auth::AuthBackend>>()?;

        match &auth_session.user {
            Some(auth_user) => {
                let db = get_db_from_context(ctx)?;
                let user = UserEntity::find_by_id(auth_user.id)
                    .filter(user::Column::DeletedAt.is_null())
                    .one(&db)
                    .await?;
                Ok(user)
            }
            None => Ok(None),
        }
    }

    /// Get current user's session information
    async fn my_session(&self, ctx: &Context<'_>) -> Result<Option<SessionInfo>> {
        let auth_session = ctx.data::<AuthSession<crate::auth::AuthBackend>>()?;

        match &auth_session.user {
            Some(user) => {
                // For now, return a basic session info since we don't have access to the actual session details
                // This would need to be enhanced when we implement proper session store integration
                Ok(Some(SessionInfo {
                    id: "current".to_string(), // Placeholder
                    created_at: chrono::Utc::now(), // Placeholder
                    expires_at: chrono::Utc::now() + chrono::Duration::minutes(30), // Placeholder
                    last_activity: chrono::Utc::now(),
                    ip_address: None,
                    user_agent: None,
                    is_current_session: true,
                }))
            }
            None => Ok(None),
        }
    }

    /// Check authentication status
    async fn auth_status(&self, ctx: &Context<'_>) -> Result<bool> {
        let auth_session = ctx.data::<AuthSession<crate::auth::AuthBackend>>()?;
        Ok(auth_session.user.is_some())
    }

    /// Get active sessions for the current user
    async fn sessions(&self, ctx: &Context<'_>) -> Result<Vec<SessionInfo>> {
        let db = get_db_from_context(ctx)?;
        let auth_session = ctx.data::<AuthSession<crate::auth::AuthBackend>>()?;

        let Some(user) = &auth_session.user else {
            return Err(async_graphql::Error::new("Authentication required"));
        };

        let sessions = UserSessionEntity::find()
            .filter(user_session::Column::UserId.eq(user.id))
            .filter(user_session::Column::IsActive.eq(true))
            .filter(user_session::Column::ExpiresAt.gt(chrono::Utc::now()))
            .all(&db)
            .await?;

        let current_session_id = None; // TODO: Get current session ID when using proper session store

        let session_infos = sessions
            .into_iter()
            .map(|session| SessionInfo {
                id: session.id.to_string(),
                created_at: session.created_at.into(),
                expires_at: session.expires_at.into(),
                last_activity: session.last_activity.into(),
                ip_address: session.ip_address,
                user_agent: session.user_agent,
                is_current_session: current_session_id.as_ref() == Some(&session.session_token),
            })
            .collect();

        Ok(session_infos)
    }

    /// Get CSRF token for the current session
    async fn csrf_token(&self, ctx: &Context<'_>) -> Result<String> {
        let auth_session = ctx.data::<AuthSession<crate::auth::AuthBackend>>()?;

        // Only authenticated users can get CSRF tokens
        let _user = auth_session.user.as_ref()
            .ok_or_else(|| async_graphql::Error::new("Authentication required"))?;

        let token = auth_session.backend.generate_csrf_token();
        Ok(token)
    }
}
