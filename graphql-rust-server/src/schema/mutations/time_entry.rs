//! Time Entry GraphQL Mutations
//!
//! Provides mutations for:
//! - CRUD operations on time entries
//! - CRUD operations on projects
//! - Time entry approval/rejection
//! - QuickBooks sync operations

use async_graphql::{Context, Object, Result, SimpleObject};
use chrono::Utc;
use sea_orm::{ActiveModelTrait, EntityTrait, Set};
use std::sync::Arc;
use uuid::Uuid;

use crate::{
    auth::UserContext,
    database::get_db_from_context,
    models::time::{
        time_entry, project, CreateTimeEntryInput, UpdateTimeEntryInput,
        ApproveTimeEntryInput, CreateProjectInput, UpdateProjectInput,
    },
    services::time_tracking_sync::TimeTrackingSync,
    integrations::intuit::IntuitClientManager,
};

/// Result of a sync operation
#[derive(Debug, Clone, SimpleObject)]
pub struct TimeSyncResult {
    pub success: bool,
    pub message: String,
    pub total: i32,
    pub synced: i32,
    pub failed: i32,
    pub errors: Vec<String>,
}

#[derive(Default)]
pub struct TimeEntryMutations;

#[Object]
impl TimeEntryMutations {
    /// Create a new time entry
    async fn create_time_entry(
        &self,
        ctx: &Context<'_>,
        input: CreateTimeEntryInput,
    ) -> Result<time_entry::Model> {
        let db = get_db_from_context(ctx)?;
        let user_ctx = ctx.data::<UserContext>()?;

        // Check permissions
        if !user_ctx.has_permission("time_entries:create") {
            return Err("Permission denied: You need time_entries:create permission".into());
        }

        // Create time entry
        let new_entry = time_entry::ActiveModel {
            id: Set(Uuid::new_v4()),
            user_id: Set(input.user_id),
            entry_date: Set(input.entry_date),
            hours: Set(rust_decimal::Decimal::from_f64_retain(input.hours).unwrap_or_default()),
            project_id: Set(input.project_id),
            is_billable: Set(input.is_billable.unwrap_or(false)),
            description: Set(input.description),
            status: Set("draft".to_string()),
            approved_by: Set(None),
            approved_at: Set(None),
            rejected_reason: Set(None),
            quickbooks_time_activity_id: Set(None),
            sync_status: Set("not_synced".to_string()),
            synced_at: Set(None),
            sync_error: Set(None),
            last_modified_at: Set(Utc::now()),
            quickbooks_sync_token: Set(None),
            created_at: Set(Utc::now().into()),
            updated_at: Set(Utc::now().into()),
            deleted_at: Set(None),
        };

        let entry = new_entry.insert(&db).await?;
        Ok(entry)
    }

    /// Update a time entry
    async fn update_time_entry(
        &self,
        ctx: &Context<'_>,
        id: Uuid,
        input: UpdateTimeEntryInput,
    ) -> Result<time_entry::Model> {
        let db = get_db_from_context(ctx)?;
        let user_ctx = ctx.data::<UserContext>()?;

        // Get existing entry
        let entry = time_entry::Entity::find_by_id(id)
            .one(&db)
            .await?
            .ok_or_else(|| "Time entry not found")?;

        // Check permissions
        let can_edit_all = user_ctx.has_permission("time_entries:edit_all");

        if !can_edit_all && entry.user_id != user_ctx.user_id {
            return Err("Permission denied: You can only edit your own time entries".into());
        }

        // Can't edit approved/synced entries
        if entry.status == "approved" || entry.sync_status == "synced" {
            return Err("Cannot edit approved or synced time entries".into());
        }

        // Update entry
        let mut active_entry: time_entry::ActiveModel = entry.into();

        if let Some(date) = input.entry_date {
            active_entry.entry_date = Set(date);
        }
        if let Some(hours) = input.hours {
            active_entry.hours = Set(rust_decimal::Decimal::from_f64_retain(hours).unwrap_or_default());
        }
        if input.project_id.is_some() {
            active_entry.project_id = Set(input.project_id);
        }
        if let Some(billable) = input.is_billable {
            active_entry.is_billable = Set(billable);
        }
        if input.description.is_some() {
            active_entry.description = Set(input.description);
        }

        active_entry.updated_at = Set(Utc::now().into());

        let updated = active_entry.update(&db).await?;
        Ok(updated)
    }

    /// Delete a time entry (soft delete)
    async fn delete_time_entry(
        &self,
        ctx: &Context<'_>,
        id: Uuid,
    ) -> Result<bool> {
        let db = get_db_from_context(ctx)?;
        let user_ctx = ctx.data::<UserContext>()?;

        // Get existing entry
        let entry = time_entry::Entity::find_by_id(id)
            .one(&db)
            .await?
            .ok_or_else(|| "Time entry not found")?;

        // Check permissions
        let can_delete_all = user_ctx.has_permission("time_entries:delete_all");

        if !can_delete_all && entry.user_id != user_ctx.user_id {
            return Err("Permission denied: You can only delete your own time entries".into());
        }

        // Can't delete synced entries
        if entry.sync_status == "synced" {
            return Err("Cannot delete synced time entries".into());
        }

        // Soft delete
        let mut active_entry: time_entry::ActiveModel = entry.into();
        active_entry.deleted_at = Set(Some(Utc::now().into()));
        active_entry.update(&db).await?;

        Ok(true)
    }

    /// Submit time entry for approval
    async fn submit_time_entry(
        &self,
        ctx: &Context<'_>,
        id: Uuid,
    ) -> Result<time_entry::Model> {
        let db = get_db_from_context(ctx)?;
        let user_ctx = ctx.data::<UserContext>()?;

        let entry = time_entry::Entity::find_by_id(id)
            .one(&db)
            .await?
            .ok_or_else(|| "Time entry not found")?;

        // Can only submit own entries
        if entry.user_id != user_ctx.user_id {
            return Err("Permission denied: You can only submit your own time entries".into());
        }

        if entry.status != "draft" {
            return Err("Can only submit draft time entries".into());
        }

        let mut active_entry: time_entry::ActiveModel = entry.into();
        active_entry.status = Set("submitted".to_string());
        active_entry.updated_at = Set(Utc::now().into());

        let updated = active_entry.update(&db).await?;
        Ok(updated)
    }

    /// Approve or reject a time entry
    async fn approve_time_entry(
        &self,
        ctx: &Context<'_>,
        id: Uuid,
        input: ApproveTimeEntryInput,
    ) -> Result<time_entry::Model> {
        let db = get_db_from_context(ctx)?;
        let user_ctx = ctx.data::<UserContext>()?;

        // Check permissions
        if !user_ctx.has_permission("time_entries:approve") {
            return Err("Permission denied: You need time_entries:approve permission".into());
        }

        let entry = time_entry::Entity::find_by_id(id)
            .one(&db)
            .await?
            .ok_or_else(|| "Time entry not found")?;

        if entry.status != "submitted" {
            return Err("Can only approve/reject submitted time entries".into());
        }

        let mut active_entry: time_entry::ActiveModel = entry.into();

        if input.approve {
            active_entry.status = Set("approved".to_string());
            active_entry.approved_by = Set(Some(user_ctx.user_id));
            active_entry.approved_at = Set(Some(Utc::now().into()));
            active_entry.rejected_reason = Set(None);
        } else {
            active_entry.status = Set("rejected".to_string());
            active_entry.approved_by = Set(None);
            active_entry.approved_at = Set(None);
            active_entry.rejected_reason = Set(input.rejected_reason);
        }

        active_entry.updated_at = Set(Utc::now().into());

        let updated = active_entry.update(&db).await?;
        Ok(updated)
    }

    /// Create a new project
    async fn create_project(
        &self,
        ctx: &Context<'_>,
        input: CreateProjectInput,
    ) -> Result<project::Model> {
        let db = get_db_from_context(ctx)?;
        let user_ctx = ctx.data::<UserContext>()?;

        // Check permissions
        if !user_ctx.has_permission("projects:create") {
            return Err("Permission denied: You need projects:create permission".into());
        }

        let new_project = project::ActiveModel {
            id: Set(Uuid::new_v4()),
            name: Set(input.name),
            code: Set(input.code),
            description: Set(input.description),
            client_name: Set(input.client_name),
            is_active: Set(true),
            is_billable: Set(input.is_billable.unwrap_or(false)),
            quickbooks_customer_id: Set(None),
            quickbooks_service_item_id: Set(None),
            synced_at: Set(None),
            created_at: Set(Utc::now().into()),
            updated_at: Set(Utc::now().into()),
            deleted_at: Set(None),
        };

        let project = new_project.insert(&db).await?;
        Ok(project)
    }

    /// Update a project
    async fn update_project(
        &self,
        ctx: &Context<'_>,
        id: Uuid,
        input: UpdateProjectInput,
    ) -> Result<project::Model> {
        let db = get_db_from_context(ctx)?;
        let user_ctx = ctx.data::<UserContext>()?;

        // Check permissions
        if !user_ctx.has_permission("projects:edit") {
            return Err("Permission denied: You need projects:edit permission".into());
        }

        let project = project::Entity::find_by_id(id)
            .one(&db)
            .await?
            .ok_or_else(|| "Project not found")?;

        let mut active_project: project::ActiveModel = project.into();

        if let Some(name) = input.name {
            active_project.name = Set(name);
        }
        if input.code.is_some() {
            active_project.code = Set(input.code);
        }
        if input.description.is_some() {
            active_project.description = Set(input.description);
        }
        if input.client_name.is_some() {
            active_project.client_name = Set(input.client_name);
        }
        if let Some(active) = input.is_active {
            active_project.is_active = Set(active);
        }
        if let Some(billable) = input.is_billable {
            active_project.is_billable = Set(billable);
        }

        active_project.updated_at = Set(Utc::now().into());

        let updated = active_project.update(&db).await?;
        Ok(updated)
    }

    /// Delete a project (soft delete)
    async fn delete_project(
        &self,
        ctx: &Context<'_>,
        id: Uuid,
    ) -> Result<bool> {
        let db = get_db_from_context(ctx)?;
        let user_ctx = ctx.data::<UserContext>()?;

        // Check permissions
        if !user_ctx.has_permission("projects:delete") {
            return Err("Permission denied: You need projects:delete permission".into());
        }

        let project = project::Entity::find_by_id(id)
            .one(&db)
            .await?
            .ok_or_else(|| "Project not found")?;

        let mut active_project: project::ActiveModel = project.into();
        active_project.deleted_at = Set(Some(Utc::now().into()));
        active_project.update(&db).await?;

        Ok(true)
    }

    /// Push time entries to QuickBooks
    async fn sync_time_entries_to_quickbooks(
        &self,
        ctx: &Context<'_>,
        time_entry_ids: Option<Vec<Uuid>>,
    ) -> Result<TimeSyncResult> {
        let db = ctx.data::<sea_orm::DatabaseConnection>()?;
        let user_ctx = ctx.data::<UserContext>()?;

        // Check permissions
        if !user_ctx.has_permission("time_sync:trigger") {
            return Err("Permission denied: You need time_sync:trigger permission".into());
        }

        // Get QuickBooks client with automatic token refresh
        let client_manager = IntuitClientManager::new(db.clone());
        let intuit_client = client_manager
            .get_client()
            .await
            .map_err(|e| format!("Failed to create Intuit client: {}", e))?;

        // Get realm ID from the active connection
        let realm_id = client_manager
            .get_realm_id()
            .await
            .map_err(|e| format!("Failed to get realm ID: {}", e))?;

        let sync_service = TimeTrackingSync::new(Arc::new(db.clone()));
        let result = sync_service
            .push_time_entries(&intuit_client, &realm_id, time_entry_ids)
            .await
            .map_err(|e| format!("Sync failed: {}", e))?;

        Ok(TimeSyncResult {
            success: result.failed == 0,
            message: format!(
                "Synced {} of {} time entries",
                result.synced, result.total
            ),
            total: result.total as i32,
            synced: result.synced as i32,
            failed: result.failed as i32,
            errors: result.errors,
        })
    }

    /// Pull time activities from QuickBooks
    async fn sync_time_entries_from_quickbooks(
        &self,
        ctx: &Context<'_>,
        start_date: Option<String>,
        end_date: Option<String>,
    ) -> Result<TimeSyncResult> {
        let db = ctx.data::<sea_orm::DatabaseConnection>()?;
        let user_ctx = ctx.data::<UserContext>()?;

        // Check permissions
        if !user_ctx.has_permission("time_sync:trigger") {
            return Err("Permission denied: You need time_sync:trigger permission".into());
        }

        // Get QuickBooks client with automatic token refresh
        let client_manager = IntuitClientManager::new(db.clone());
        let intuit_client = client_manager
            .get_client()
            .await
            .map_err(|e| format!("Failed to create Intuit client: {}", e))?;

        // Get realm ID from the active connection
        let realm_id = client_manager
            .get_realm_id()
            .await
            .map_err(|e| format!("Failed to get realm ID: {}", e))?;

        let sync_service = TimeTrackingSync::new(Arc::new(db.clone()));
        let result = sync_service
            .pull_time_activities(&intuit_client, &realm_id, start_date, end_date)
            .await
            .map_err(|e| format!("Sync failed: {}", e))?;

        Ok(TimeSyncResult {
            success: result.failed == 0,
            message: format!(
                "Imported {} of {} time activities",
                result.synced, result.total
            ),
            total: result.total as i32,
            synced: result.synced as i32,
            failed: result.failed as i32,
            errors: result.errors,
        })
    }
}
