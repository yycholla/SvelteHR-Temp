//! GraphQL Query Resolvers - SeaORM Implementation
//!
//! This module implements GraphQL query resolvers using SeaORM.
//! All queries follow idiomatic Rust patterns with proper error handling.

use async_graphql::{Context, Object, Result};
use sea_orm::{EntityTrait, QueryFilter, QueryOrder, ColumnTrait};
use uuid::Uuid;

use crate::{
    database::get_db_from_context,
    models::{
        // SeaORM entities
        department::{self, Entity as DepartmentEntity},
        user::{self, Entity as UserEntity},
        task::{self, Entity as TaskEntity},
        leave_request::{self, Entity as LeaveRequestEntity},
        performance_review::{self, Entity as PerformanceReviewEntity},
        system::activity_log::{self, Entity as ActivityLogEntity},
    },
};

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
            .order_by_desc(user::Column::CreatedAt)
            .limit(Some(limit as u64))
            .offset(offset as u64)
            .all(db)
            .await?;

        Ok(users)
    }

    /// Get a single user by ID
    async fn user(&self, ctx: &Context<'_>, id: Uuid) -> Result<Option<user::Model>> {
        let db = get_db_from_context(ctx)?;
        let user = UserEntity::find_by_id(id).one(db).await?;
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
            .order_by_asc(department::Column::Name)
            .limit(Some(limit as u64))
            .offset(offset as u64)
            .all(db)
            .await?;

        Ok(departments)
    }

    /// Get a single department by ID
    async fn department(&self, ctx: &Context<'_>, id: Uuid) -> Result<Option<department::Model>> {
        let db = get_db_from_context(ctx)?;
        let dept = DepartmentEntity::find_by_id(id).one(db).await?;
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
            .order_by_desc(task::Column::CreatedAt)
            .limit(Some(limit as u64))
            .offset(offset as u64)
            .all(db)
            .await?;

        Ok(tasks)
    }

    /// Get a single task by ID
    async fn task(&self, ctx: &Context<'_>, id: Uuid) -> Result<Option<task::Model>> {
        let db = get_db_from_context(ctx)?;
        let task = TaskEntity::find_by_id(id).one(db).await?;
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
            .order_by_desc(leave_request::Column::CreatedAt)
            .limit(Some(limit as u64))
            .offset(offset as u64)
            .all(db)
            .await?;

        Ok(requests)
    }

    /// Get a single leave request by ID
    async fn leave_request(&self, ctx: &Context<'_>, id: Uuid) -> Result<Option<leave_request::Model>> {
        let db = get_db_from_context(ctx)?;
        let request = LeaveRequestEntity::find_by_id(id).one(db).await?;
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
            .order_by_desc(performance_review::Column::CreatedAt)
            .limit(Some(limit as u64))
            .offset(offset as u64)
            .all(db)
            .await?;

        Ok(reviews)
    }

    /// Get a single performance review by ID
    async fn performance_review(&self, ctx: &Context<'_>, id: Uuid) -> Result<Option<performance_review::Model>> {
        let db = get_db_from_context(ctx)?;
        let review = PerformanceReviewEntity::find_by_id(id).one(db).await?;
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
            .all(db)
            .await?;

        Ok(logs)
    }

    /// Get a single activity log by ID
    async fn activity_log(&self, ctx: &Context<'_>, id: Uuid) -> Result<Option<activity_log::Model>> {
        let db = get_db_from_context(ctx)?;
        let log = ActivityLogEntity::find_by_id(id).one(db).await?;
        Ok(log)
    }
}
