use async_graphql::*;
use chrono::Utc;
use sea_orm::*;
use uuid::Uuid;

use crate::auth::context::UserContext;
use crate::models::user::{Column as UserColumn, Entity as UserEntity};
use crate::services::permission_checker::{PermissionChecker, SyncPermission};

#[derive(Default)]
pub struct EmployeeSyncMutation;

#[derive(InputObject)]
pub struct EmployeeSyncSettingsInput {
    /// Employee ID
    pub employee_id: String,
    /// Enable automatic sync for this employee
    pub auto_sync_enabled: Option<bool>,
    /// Sync direction for this employee
    pub sync_direction: Option<String>,
    /// Whether to exclude specific fields from sync
    pub excluded_fields: Option<Vec<String>>,
}

#[derive(SimpleObject)]
pub struct EmployeeSyncSettingsResponse {
    pub success: bool,
    pub message: String,
}

#[derive(SimpleObject)]
pub struct EmployeeSyncHistory {
    pub id: String,
    pub employee_id: String,
    pub employee_name: String,
    pub sync_type: String,
    pub direction: String,
    pub status: String,
    pub synced_at: String,
    pub fields_synced: Vec<String>,
    pub errors: Vec<String>,
}

#[derive(SimpleObject)]
pub struct EmployeeSyncHistoryResponse {
    pub history: Vec<EmployeeSyncHistory>,
    pub total: i32,
}

#[derive(SimpleObject)]
pub struct EmployeeSyncStatus {
    pub employee_id: String,
    pub employee_name: String,
    pub quickbooks_id: Option<String>,
    pub last_synced_at: Option<String>,
    pub auto_sync_enabled: bool,
    pub sync_direction: String,
    pub has_local_changes: bool,
    pub excluded_fields: Vec<String>,
}

#[Object]
impl EmployeeSyncMutation {
    /// Update sync settings for a specific employee
    async fn update_employee_sync_settings(
        &self,
        ctx: &Context<'_>,
        input: EmployeeSyncSettingsInput,
    ) -> Result<EmployeeSyncSettingsResponse> {
        let db = ctx.data::<DatabaseConnection>()?;
        let user_ctx = ctx.data::<UserContext>()?;

        // Check permission
        let permission_checker = PermissionChecker::new(db.clone());
        permission_checker
            .require(user_ctx, SyncPermission::TriggerEmployeeSync)
            .await?;

        // Validate sync direction if provided
        if let Some(ref direction) = input.sync_direction {
            if !["Pull", "Push", "Bidirectional"].contains(&direction.as_str()) {
                return Err(Error::new("Invalid sync direction"));
            }
        }

        // Parse employee ID
        let employee_uuid =
            Uuid::parse_str(&input.employee_id).map_err(|_| Error::new("Invalid employee ID"))?;

        // Fetch employee
        let employee = UserEntity::find_by_id(employee_uuid)
            .filter(UserColumn::DeletedAt.is_null())
            .one(db)
            .await?
            .ok_or_else(|| Error::new("Employee not found"))?;

        // TODO: Store sync settings in a dedicated employee_sync_settings table
        // For now, return success response
        // In production, this would:
        // 1. Insert or update employee_sync_settings record
        // 2. Store auto_sync_enabled, sync_direction, excluded_fields
        // 3. Update last_modified timestamp

        Ok(EmployeeSyncSettingsResponse {
            success: true,
            message: format!(
                "Sync settings updated for {}",
                format!("{} {}", employee.first_name, employee.last_name)
            ),
        })
    }

    /// Trigger an immediate sync for a specific employee
    async fn trigger_employee_sync(
        &self,
        ctx: &Context<'_>,
        employee_id: String,
        direction: String,
    ) -> Result<EmployeeSyncSettingsResponse> {
        let db = ctx.data::<DatabaseConnection>()?;
        let user_ctx = ctx.data::<UserContext>()?;

        // Check permission
        let permission_checker = PermissionChecker::new(db.clone());
        permission_checker
            .require(user_ctx, SyncPermission::TriggerEmployeeSync)
            .await?;

        // Validate sync direction
        if !["Pull", "Push", "Bidirectional"].contains(&direction.as_str()) {
            return Err(Error::new(
                "Invalid sync direction. Must be 'Pull', 'Push', or 'Bidirectional'",
            ));
        }

        // Parse employee ID
        let employee_uuid =
            Uuid::parse_str(&employee_id).map_err(|_| Error::new("Invalid employee ID"))?;

        // Fetch employee
        let employee = UserEntity::find_by_id(employee_uuid)
            .filter(UserColumn::DeletedAt.is_null())
            .one(db)
            .await?
            .ok_or_else(|| Error::new("Employee not found"))?;

        // TODO: Queue sync job for this employee
        // For now, return success response
        // In production, this would:
        // 1. Create a sync job record
        // 2. Queue the job for processing
        // 3. Return job ID for tracking

        Ok(EmployeeSyncSettingsResponse {
            success: true,
            message: format!(
                "Sync triggered for {}",
                format!("{} {}", employee.first_name, employee.last_name)
            ),
        })
    }

    /// Get sync status for a specific employee
    async fn get_employee_sync_status(
        &self,
        ctx: &Context<'_>,
        employee_id: String,
    ) -> Result<EmployeeSyncStatus> {
        let db = ctx.data::<DatabaseConnection>()?;
        let user_ctx = ctx.data::<UserContext>()?;

        // Check permission
        let permission_checker = PermissionChecker::new(db.clone());
        permission_checker
            .require(user_ctx, SyncPermission::TriggerEmployeeSync)
            .await?;

        // Parse employee ID
        let employee_uuid =
            Uuid::parse_str(&employee_id).map_err(|_| Error::new("Invalid employee ID"))?;

        // Fetch employee
        let employee = UserEntity::find_by_id(employee_uuid)
            .filter(UserColumn::DeletedAt.is_null())
            .one(db)
            .await?
            .ok_or_else(|| Error::new("Employee not found"))?;

        // TODO: Fetch actual sync settings from employee_sync_settings table
        // For now, return mock data

        Ok(EmployeeSyncStatus {
            employee_id: employee.id.to_string(),
            employee_name: format!("{} {}", employee.first_name, employee.last_name),
            quickbooks_id: employee.intuit_employee_id,
            last_synced_at: employee.last_synced_at.map(|dt| dt.to_rfc3339()),
            auto_sync_enabled: true,
            sync_direction: "Bidirectional".to_string(),
            has_local_changes: false,
            excluded_fields: vec![],
        })
    }

    /// Get sync history for a specific employee
    async fn get_employee_sync_history(
        &self,
        ctx: &Context<'_>,
        employee_id: String,
        limit: Option<i32>,
    ) -> Result<EmployeeSyncHistoryResponse> {
        let db = ctx.data::<DatabaseConnection>()?;
        let user_ctx = ctx.data::<UserContext>()?;

        // Check permission
        let permission_checker = PermissionChecker::new(db.clone());
        permission_checker
            .require(user_ctx, SyncPermission::TriggerEmployeeSync)
            .await?;

        // Parse employee ID
        let employee_uuid =
            Uuid::parse_str(&employee_id).map_err(|_| Error::new("Invalid employee ID"))?;

        // Fetch employee
        let employee = UserEntity::find_by_id(employee_uuid)
            .filter(UserColumn::DeletedAt.is_null())
            .one(db)
            .await?
            .ok_or_else(|| Error::new("Employee not found"))?;

        // TODO: Fetch actual sync history from sync_log table
        // For now, return mock data
        let mock_history = vec![
            EmployeeSyncHistory {
                id: Uuid::new_v4().to_string(),
                employee_id: employee.id.to_string(),
                employee_name: format!("{} {}", employee.first_name, employee.last_name),
                sync_type: "Automatic".to_string(),
                direction: "Pull".to_string(),
                status: "Success".to_string(),
                synced_at: Utc::now().to_rfc3339(),
                fields_synced: vec![
                    "first_name".to_string(),
                    "last_name".to_string(),
                    "email".to_string(),
                ],
                errors: vec![],
            },
            EmployeeSyncHistory {
                id: Uuid::new_v4().to_string(),
                employee_id: employee.id.to_string(),
                employee_name: format!("{} {}", employee.first_name, employee.last_name),
                sync_type: "Manual".to_string(),
                direction: "Push".to_string(),
                status: "Success".to_string(),
                synced_at: Utc::now().to_rfc3339(),
                fields_synced: vec!["phone".to_string(), "address".to_string()],
                errors: vec![],
            },
        ];

        let limited_history = if let Some(lim) = limit {
            mock_history.into_iter().take(lim as usize).collect()
        } else {
            mock_history
        };

        let total = limited_history.len() as i32;

        Ok(EmployeeSyncHistoryResponse {
            history: limited_history,
            total,
        })
    }
}
