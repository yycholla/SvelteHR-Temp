//! Time Entry GraphQL Queries
//!
//! Provides queries for:
//! - Fetching time entries with filtering
//! - Viewing time entry details
//! - Viewing projects
//! - Time tracking sync statistics

use async_graphql::{Context, InputObject, Object, Result, SimpleObject};
use chrono::NaiveDate;
use sea_orm::{ColumnTrait, EntityTrait, QueryFilter, QueryOrder, QuerySelect};
use std::sync::Arc;
use uuid::Uuid;

use crate::{
    auth::UserContext,
    database::get_db_from_context,
    models::time::{project, time_entry, TimeEntryStatus, TimeEntrySyncState},
    services::time_tracking_sync::TimeTrackingSync,
};

/// Filter for time entries
#[derive(Debug, Clone, InputObject)]
pub struct TimeEntryFilter {
    #[graphql(name = "userId")]
    pub user_id: Option<Uuid>,
    #[graphql(name = "projectId")]
    pub project_id: Option<Uuid>,
    #[graphql(name = "startDate")]
    pub start_date: Option<NaiveDate>,
    #[graphql(name = "endDate")]
    pub end_date: Option<NaiveDate>,
    pub status: Option<TimeEntryStatus>,
    #[graphql(name = "syncStatus")]
    pub sync_status: Option<TimeEntrySyncState>,
    #[graphql(name = "isBillable")]
    pub is_billable: Option<bool>,
}

/// Time tracking sync statistics
#[derive(Debug, Clone, SimpleObject)]
pub struct TimeTrackingStats {
    pub total: i32,
    pub synced: i32,
    pub pending: i32,
    pub failed: i32,
}

#[derive(Default)]
pub struct TimeEntryQueries;

#[Object]
impl TimeEntryQueries {
    /// Get time entries with optional filtering
    async fn time_entries(
        &self,
        ctx: &Context<'_>,
        filter: Option<TimeEntryFilter>,
        limit: Option<i64>,
        offset: Option<i64>,
    ) -> Result<Vec<time_entry::Model>> {
        let db = get_db_from_context(ctx)?;
        let user_ctx = ctx.data::<UserContext>()?;
        let limit = limit.unwrap_or(100).clamp(1, 1000);
        let offset = offset.unwrap_or(0).max(0);

        // Check permissions
        let can_view_all = user_ctx.has_permission("time_entries:view_all");

        let mut query = time_entry::Entity::find().filter(time_entry::Column::DeletedAt.is_null());

        // If user can't view all, only show their own entries
        if !can_view_all {
            query = query.filter(time_entry::Column::UserId.eq(user_ctx.user_id));
        }

        // Apply filters if provided
        if let Some(f) = filter {
            if let Some(user_id) = f.user_id {
                query = query.filter(time_entry::Column::UserId.eq(user_id));
            }
            if let Some(project_id) = f.project_id {
                query = query.filter(time_entry::Column::ProjectId.eq(project_id));
            }
            if let Some(start_date) = f.start_date {
                query = query.filter(time_entry::Column::EntryDate.gte(start_date));
            }
            if let Some(end_date) = f.end_date {
                query = query.filter(time_entry::Column::EntryDate.lte(end_date));
            }
            if let Some(status) = f.status {
                query = query.filter(time_entry::Column::Status.eq(status.as_str()));
            }
            if let Some(sync_status) = f.sync_status {
                query = query.filter(time_entry::Column::SyncStatus.eq(sync_status.as_str()));
            }
            if let Some(is_billable) = f.is_billable {
                query = query.filter(time_entry::Column::IsBillable.eq(is_billable));
            }
        }

        let entries = query
            .order_by_desc(time_entry::Column::EntryDate)
            .order_by_desc(time_entry::Column::CreatedAt)
            .limit(Some(limit as u64))
            .offset(offset as u64)
            .all(&db)
            .await?;

        Ok(entries)
    }

    /// Get a single time entry by ID
    async fn time_entry(&self, ctx: &Context<'_>, id: Uuid) -> Result<Option<time_entry::Model>> {
        let db = get_db_from_context(ctx)?;
        let user_ctx = ctx.data::<UserContext>()?;

        let entry = time_entry::Entity::find_by_id(id)
            .filter(time_entry::Column::DeletedAt.is_null())
            .one(&db)
            .await?;

        // Check permissions
        if let Some(ref e) = entry {
            let can_view_all = user_ctx.has_permission("time_entries:view_all");

            // If user can't view all and this isn't their entry, deny access
            if !can_view_all && e.user_id != user_ctx.user_id {
                return Err("Permission denied: You can only view your own time entries".into());
            }
        }

        Ok(entry)
    }

    /// Get all projects
    async fn projects(
        &self,
        ctx: &Context<'_>,
        is_active: Option<bool>,
        is_billable: Option<bool>,
        limit: Option<i64>,
        offset: Option<i64>,
    ) -> Result<Vec<project::Model>> {
        let db = get_db_from_context(ctx)?;
        let user_ctx = ctx.data::<UserContext>()?;
        let limit = limit.unwrap_or(100).clamp(1, 1000);
        let offset = offset.unwrap_or(0).max(0);

        // Check permissions
        if !user_ctx.has_permission("projects:view") {
            return Err("Permission denied: You need projects:view permission".into());
        }

        let mut query = project::Entity::find().filter(project::Column::DeletedAt.is_null());

        if let Some(active) = is_active {
            query = query.filter(project::Column::IsActive.eq(active));
        }

        if let Some(billable) = is_billable {
            query = query.filter(project::Column::IsBillable.eq(billable));
        }

        let projects = query
            .order_by_asc(project::Column::Name)
            .limit(Some(limit as u64))
            .offset(offset as u64)
            .all(&db)
            .await?;

        Ok(projects)
    }

    /// Get a single project by ID
    async fn project(&self, ctx: &Context<'_>, id: Uuid) -> Result<Option<project::Model>> {
        let db = get_db_from_context(ctx)?;
        let user_ctx = ctx.data::<UserContext>()?;

        // Check permissions
        if !user_ctx.has_permission("projects:view") {
            return Err("Permission denied: You need projects:view permission".into());
        }

        let project = project::Entity::find_by_id(id)
            .filter(project::Column::DeletedAt.is_null())
            .one(&db)
            .await?;

        Ok(project)
    }

    /// Get time tracking sync statistics
    async fn time_tracking_stats(&self, ctx: &Context<'_>) -> Result<TimeTrackingStats> {
        let db = ctx.data::<sea_orm::DatabaseConnection>()?;
        let user_ctx = ctx.data::<UserContext>()?;

        // Check permissions
        if !user_ctx.has_permission("time_sync:view_status") {
            return Err("Permission denied: You need time_sync:view_status permission".into());
        }

        let sync_service = TimeTrackingSync::new(Arc::new(db.clone()));
        let stats = sync_service.get_sync_stats().await?;

        Ok(TimeTrackingStats {
            total: stats.total as i32,
            synced: stats.synced as i32,
            pending: stats.pending as i32,
            failed: stats.failed as i32,
        })
    }
}
