use async_graphql::*;
use chrono::Utc;
use sea_orm::*;

use crate::auth::context::UserContext;
use crate::services::permission_checker::{PermissionChecker, SyncPermission};

#[derive(Default)]
pub struct IncrementalSyncMutation;

#[derive(SimpleObject)]
pub struct IncrementalSyncSettings {
    pub enabled: bool,
    pub last_full_sync_at: Option<String>,
    pub employee_sync_token: Option<String>,
    pub department_sync_token: Option<String>,
    pub description: String,
}

#[derive(SimpleObject)]
pub struct IncrementalSyncResponse {
    pub success: bool,
    pub message: String,
}

#[Object]
impl IncrementalSyncMutation {
    /// Get current incremental sync settings
    async fn get_incremental_sync_settings(
        &self,
        ctx: &Context<'_>,
    ) -> Result<IncrementalSyncSettings> {
        let db = ctx.data::<DatabaseConnection>()?;
        let user_ctx = ctx.data::<UserContext>()?;

        // Check permission
        let permission_checker = PermissionChecker::new(db.clone());
        permission_checker
            .require(user_ctx, SyncPermission::ManageSyncSchedules)
            .await?;

        // TODO: Fetch actual settings from sync_settings table
        // For now, return mock data
        Ok(IncrementalSyncSettings {
            enabled: true,
            last_full_sync_at: Some(Utc::now().to_rfc3339()),
            employee_sync_token: Some("emp_token_abc123".to_string()),
            department_sync_token: Some("dept_token_xyz789".to_string()),
            description:
                "Incremental sync reduces API calls by only syncing changes since last sync"
                    .to_string(),
        })
    }

    /// Enable incremental sync mode
    async fn enable_incremental_sync(&self, ctx: &Context<'_>) -> Result<IncrementalSyncResponse> {
        let db = ctx.data::<DatabaseConnection>()?;
        let user_ctx = ctx.data::<UserContext>()?;

        // Check permission
        let permission_checker = PermissionChecker::new(db.clone());
        permission_checker
            .require(user_ctx, SyncPermission::ManageSyncSchedules)
            .await?;

        // TODO: Update sync_settings table
        // For now, return success response
        // In production, this would:
        // 1. Update global sync settings to enable incremental mode
        // 2. Initialize sync tokens if not present
        // 3. Record the change in audit log

        Ok(IncrementalSyncResponse {
            success: true,
            message: "Incremental sync enabled successfully".to_string(),
        })
    }

    /// Disable incremental sync mode (force full sync)
    async fn disable_incremental_sync(&self, ctx: &Context<'_>) -> Result<IncrementalSyncResponse> {
        let db = ctx.data::<DatabaseConnection>()?;
        let user_ctx = ctx.data::<UserContext>()?;

        // Check permission
        let permission_checker = PermissionChecker::new(db.clone());
        permission_checker
            .require(user_ctx, SyncPermission::ManageSyncSchedules)
            .await?;

        // TODO: Update sync_settings table
        // For now, return success response
        // In production, this would:
        // 1. Update global sync settings to disable incremental mode
        // 2. Record the change in audit log

        Ok(IncrementalSyncResponse {
            success: true,
            message: "Incremental sync disabled. Next sync will be a full sync".to_string(),
        })
    }

    /// Clear all sync tokens to force a full sync on next run
    async fn clear_sync_tokens(
        &self,
        ctx: &Context<'_>,
        entity_type: Option<String>,
    ) -> Result<IncrementalSyncResponse> {
        let db = ctx.data::<DatabaseConnection>()?;
        let user_ctx = ctx.data::<UserContext>()?;

        // Check permission
        let permission_checker = PermissionChecker::new(db.clone());
        permission_checker
            .require(user_ctx, SyncPermission::ForceFullSync)
            .await?;

        // Validate entity type if provided
        if let Some(ref ent_type) = entity_type {
            if !["Employee", "Department", "All"].contains(&ent_type.as_str()) {
                return Err(Error::new(
                    "Invalid entity type. Must be 'Employee', 'Department', or 'All'",
                ));
            }
        }

        // TODO: Clear sync tokens from database
        // For now, return success response
        // In production, this would:
        // 1. Clear sync tokens from intuit_connections table
        // 2. Update last_full_sync_at timestamp
        // 3. Record the action in audit log

        let message = match entity_type.as_deref() {
            Some("Employee") => {
                "Employee sync tokens cleared. Next sync will be full for employees"
            }
            Some("Department") => {
                "Department sync tokens cleared. Next sync will be full for departments"
            }
            Some("All") | None => {
                "All sync tokens cleared. Next sync will be a full sync for all entities"
            }
            _ => "Sync tokens cleared",
        };

        Ok(IncrementalSyncResponse {
            success: true,
            message: message.to_string(),
        })
    }

    /// Force a one-time full sync without disabling incremental mode
    async fn force_full_sync_once(
        &self,
        ctx: &Context<'_>,
        entity_type: String,
    ) -> Result<IncrementalSyncResponse> {
        let db = ctx.data::<DatabaseConnection>()?;
        let user_ctx = ctx.data::<UserContext>()?;

        // Check permission
        let permission_checker = PermissionChecker::new(db.clone());
        permission_checker
            .require(user_ctx, SyncPermission::ForceFullSync)
            .await?;

        // Validate entity type
        if !["Employee", "Department", "All"].contains(&entity_type.as_str()) {
            return Err(Error::new(
                "Invalid entity type. Must be 'Employee', 'Department', or 'All'",
            ));
        }

        // TODO: Queue a one-time full sync job
        // For now, return success response
        // In production, this would:
        // 1. Create a sync job with force_full_sync flag
        // 2. Queue the job for immediate execution
        // 3. Return job ID for tracking

        Ok(IncrementalSyncResponse {
            success: true,
            message: format!(
                "Full sync queued for {}. Incremental mode will resume after this sync.",
                entity_type
            ),
        })
    }
}
