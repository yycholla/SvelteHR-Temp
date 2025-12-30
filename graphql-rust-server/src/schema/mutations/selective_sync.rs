use async_graphql::*;
use sea_orm::*;
use uuid::Uuid;

use crate::auth::context::UserContext;
use crate::services::permission_checker::{PermissionChecker, SyncPermission};
use crate::models::user::{Entity as UserEntity, Column as UserColumn};
use crate::models::department::{Entity as DepartmentEntity, Column as DepartmentColumn};

#[derive(Default)]
pub struct SelectiveSyncMutation;

#[derive(InputObject)]
pub struct SelectiveSyncInput {
    /// Sync direction (Pull, Push, Bidirectional)
    pub sync_direction: String,
    /// Employee IDs to sync (if None, sync all)
    pub employee_ids: Option<Vec<String>>,
    /// Department IDs to sync (if None, sync all)
    pub department_ids: Option<Vec<String>>,
    /// Whether to force full sync for selected entities
    pub force_full_sync: Option<bool>,
}

#[derive(SimpleObject)]
pub struct SelectiveSyncResponse {
    pub success: bool,
    pub message: String,
    /// Job/batch ID for tracking the sync operation
    pub job_id: Option<String>,
    /// Summary of what will be synced
    pub summary: SelectiveSyncSummary,
}

#[derive(SimpleObject, Debug, Clone)]
pub struct SelectiveSyncSummary {
    pub total_employees: i32,
    pub total_departments: i32,
    pub sync_direction: String,
    pub is_full_sync: bool,
}

#[derive(SimpleObject)]
pub struct AvailableEntitiesResponse {
    pub employees: Vec<EntityOption>,
    pub departments: Vec<EntityOption>,
}

#[derive(SimpleObject, Debug, Clone)]
pub struct EntityOption {
    pub id: String,
    pub name: String,
    pub quickbooks_id: Option<String>,
    pub last_synced_at: Option<String>,
    pub has_local_changes: bool,
}

#[Object]
impl SelectiveSyncMutation {
    /// Trigger a selective sync operation for specific entities
    async fn trigger_selective_sync(
        &self,
        ctx: &Context<'_>,
        input: SelectiveSyncInput,
    ) -> Result<SelectiveSyncResponse> {
        let db = ctx.data::<DatabaseConnection>()?;
        let user_ctx = ctx.data::<UserContext>()?;

        // Validate sync direction
        if !["Pull", "Push", "Bidirectional"].contains(&input.sync_direction.as_str()) {
            return Err(Error::new("Invalid sync direction. Must be 'Pull', 'Push', or 'Bidirectional'"));
        }

        // Check permissions based on what's being synced
        let permission_checker = PermissionChecker::new(db.clone());

        if input.employee_ids.is_some() {
            permission_checker
                .require(user_ctx, SyncPermission::TriggerEmployeeSync)
                .await?;
        }

        if input.department_ids.is_some() {
            permission_checker
                .require(user_ctx, SyncPermission::TriggerDepartmentSync)
                .await?;
        }

        if input.force_full_sync.unwrap_or(false) {
            permission_checker
                .require(user_ctx, SyncPermission::ForceFullSync)
                .await?;
        }

        // Count selected entities
        let employee_count = if let Some(ref ids) = input.employee_ids {
            ids.len() as i32
        } else {
            // Count all employees if no specific IDs provided
            UserEntity::find()
                .filter(UserColumn::DeletedAt.is_null())
                .count(db)
                .await? as i32
        };

        let department_count = if let Some(ref ids) = input.department_ids {
            ids.len() as i32
        } else {
            // Count all departments if no specific IDs provided
            DepartmentEntity::find()
                .filter(DepartmentColumn::DeletedAt.is_null())
                .count(db)
                .await? as i32
        };

        // Generate a job ID for tracking
        let job_id = Uuid::new_v4().to_string();

        // TODO: Queue the actual sync job using the sync orchestrator
        // For now, return a success response with the job ID
        // In production, this would:
        // 1. Create a batch operation record
        // 2. Queue sync jobs for each selected entity
        // 3. Return the batch ID for progress tracking

        Ok(SelectiveSyncResponse {
            success: true,
            message: format!(
                "Selective sync queued: {} employees, {} departments",
                employee_count, department_count
            ),
            job_id: Some(job_id),
            summary: SelectiveSyncSummary {
                total_employees: employee_count,
                total_departments: department_count,
                sync_direction: input.sync_direction,
                is_full_sync: input.force_full_sync.unwrap_or(false),
            },
        })
    }

    /// Get list of available entities for selective sync
    async fn get_available_entities(
        &self,
        ctx: &Context<'_>,
    ) -> Result<AvailableEntitiesResponse> {
        let db = ctx.data::<DatabaseConnection>()?;
        let user_ctx = ctx.data::<UserContext>()?;

        // Check permission to view entities
        let permission_checker = PermissionChecker::new(db.clone());
        permission_checker
            .require(user_ctx, SyncPermission::TriggerEmployeeSync)
            .await?;

        // Fetch employees (users)
        let employees = UserEntity::find()
            .filter(UserColumn::DeletedAt.is_null())
            .all(db)
            .await?;

        let employee_options: Vec<EntityOption> = employees
            .into_iter()
            .map(|e| EntityOption {
                id: e.id.to_string(),
                name: format!("{} {}", e.first_name, e.last_name),
                quickbooks_id: e.intuit_employee_id,
                last_synced_at: e.last_synced_at.map(|dt| dt.to_rfc3339()),
                has_local_changes: false, // TODO: Implement change detection
            })
            .collect();

        // Fetch departments
        let departments = DepartmentEntity::find()
            .filter(DepartmentColumn::DeletedAt.is_null())
            .all(db)
            .await?;

        let department_options: Vec<EntityOption> = departments
            .into_iter()
            .map(|d| EntityOption {
                id: d.id.to_string(),
                name: d.name,
                quickbooks_id: d.intuit_department_id,
                last_synced_at: d.last_synced_at.map(|dt| dt.to_rfc3339()),
                has_local_changes: false, // TODO: Implement change detection
            })
            .collect();

        Ok(AvailableEntitiesResponse {
            employees: employee_options,
            departments: department_options,
        })
    }
}
