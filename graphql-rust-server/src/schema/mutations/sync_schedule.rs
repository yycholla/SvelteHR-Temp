use async_graphql::*;
use sea_orm::*;
use chrono::Utc;
use uuid::Uuid;

use crate::models::sync_schedule;
use crate::services::permission_checker::{PermissionChecker, SyncPermission};
use crate::auth::context::UserContext;

#[derive(Default)]
pub struct SyncScheduleMutation;

#[derive(InputObject)]
pub struct CreateSyncScheduleInput {
    pub name: String,
    pub description: Option<String>,
    pub cron_expression: String,
    pub entity_type: String, // 'Employee', 'Department', 'Both'
    pub sync_direction: String, // 'Push', 'Pull', 'Bidirectional'
    pub enabled: Option<bool>,
    pub business_hours_only: Option<bool>,
    pub timezone: Option<String>,
}

#[derive(InputObject)]
pub struct UpdateSyncScheduleInput {
    pub schedule_id: String,
    pub name: Option<String>,
    pub description: Option<String>,
    pub cron_expression: Option<String>,
    pub entity_type: Option<String>,
    pub sync_direction: Option<String>,
    pub enabled: Option<bool>,
    pub business_hours_only: Option<bool>,
    pub timezone: Option<String>,
}

#[derive(SimpleObject)]
pub struct SyncScheduleMutationResponse {
    pub success: bool,
    pub message: String,
    pub schedule_id: Option<String>,
}

#[Object]
impl SyncScheduleMutation {
    /// Create a new sync schedule
    async fn create_sync_schedule(
        &self,
        ctx: &Context<'_>,
        input: CreateSyncScheduleInput,
    ) -> Result<SyncScheduleMutationResponse> {
        let db = ctx.data::<DatabaseConnection>()?;
        let user_ctx = ctx.data::<UserContext>()?;

        // Check permission
        let permission_checker = PermissionChecker::new(db.clone());
        permission_checker
            .require(user_ctx, SyncPermission::ManageSyncSchedules)
            .await?;

        // Validate cron expression format (basic check)
        if input.cron_expression.split_whitespace().count() != 6 {
            return Err(Error::new("Invalid cron expression format. Expected 6 fields (second minute hour day month day_of_week)"));
        }

        // Validate entity type
        if !["Employee", "Department", "Both"].contains(&input.entity_type.as_str()) {
            return Err(Error::new("Invalid entity type. Must be 'Employee', 'Department', or 'Both'"));
        }

        // Validate sync direction
        if !["Push", "Pull", "Bidirectional"].contains(&input.sync_direction.as_str()) {
            return Err(Error::new("Invalid sync direction. Must be 'Push', 'Pull', or 'Bidirectional'"));
        }

        // Next run time will be calculated by the scheduler service
        let new_schedule = sync_schedule::ActiveModel {
            id: ActiveValue::NotSet,
            name: ActiveValue::Set(input.name.clone()),
            description: ActiveValue::Set(input.description),
            cron_expression: ActiveValue::Set(input.cron_expression),
            entity_type: ActiveValue::Set(input.entity_type),
            sync_direction: ActiveValue::Set(input.sync_direction),
            enabled: ActiveValue::Set(input.enabled.unwrap_or(true)),
            business_hours_only: ActiveValue::Set(input.business_hours_only.unwrap_or(false)),
            timezone: ActiveValue::Set(input.timezone.unwrap_or_else(|| "UTC".to_string())),
            last_run_at: ActiveValue::NotSet,
            next_run_at: ActiveValue::NotSet,
            last_run_status: ActiveValue::NotSet,
            last_run_error: ActiveValue::NotSet,
            created_by: ActiveValue::Set(Some(user_ctx.user_id)),
            created_at: ActiveValue::Set(Utc::now().fixed_offset()),
            updated_at: ActiveValue::Set(Utc::now().fixed_offset()),
            deleted_at: ActiveValue::NotSet,
        };

        let result = new_schedule.insert(db).await?;

        Ok(SyncScheduleMutationResponse {
            success: true,
            message: format!("Sync schedule '{}' created successfully", input.name),
            schedule_id: Some(result.id.to_string()),
        })
    }

    /// Update an existing sync schedule
    async fn update_sync_schedule(
        &self,
        ctx: &Context<'_>,
        input: UpdateSyncScheduleInput,
    ) -> Result<SyncScheduleMutationResponse> {
        let db = ctx.data::<DatabaseConnection>()?;
        let user_ctx = ctx.data::<UserContext>()?;

        let permission_checker = PermissionChecker::new(db.clone());
        permission_checker
            .require(user_ctx, SyncPermission::ManageSyncSchedules)
            .await?;

        let schedule_uuid = Uuid::parse_str(&input.schedule_id)
            .map_err(|_| Error::new("Invalid schedule ID"))?;

        let schedule = sync_schedule::Entity::find_by_id(schedule_uuid)
            .one(db)
            .await?
            .ok_or_else(|| Error::new("Schedule not found"))?;

        let mut active_schedule: sync_schedule::ActiveModel = schedule.into();

        if let Some(name) = input.name {
            active_schedule.name = ActiveValue::Set(name);
        }

        if let Some(description) = input.description {
            active_schedule.description = ActiveValue::Set(Some(description));
        }

        if let Some(cron) = input.cron_expression {
            // Validate cron expression format (basic check)
            if cron.split_whitespace().count() != 6 {
                return Err(Error::new("Invalid cron expression format. Expected 6 fields"));
            }

            active_schedule.cron_expression = ActiveValue::Set(cron);
            // Next run time will be recalculated by the scheduler service
        }

        if let Some(entity_type) = input.entity_type {
            if !["Employee", "Department", "Both"].contains(&entity_type.as_str()) {
                return Err(Error::new("Invalid entity type"));
            }
            active_schedule.entity_type = ActiveValue::Set(entity_type);
        }

        if let Some(sync_direction) = input.sync_direction {
            if !["Push", "Pull", "Bidirectional"].contains(&sync_direction.as_str()) {
                return Err(Error::new("Invalid sync direction"));
            }
            active_schedule.sync_direction = ActiveValue::Set(sync_direction);
        }

        if let Some(enabled) = input.enabled {
            active_schedule.enabled = ActiveValue::Set(enabled);
        }

        if let Some(business_hours_only) = input.business_hours_only {
            active_schedule.business_hours_only = ActiveValue::Set(business_hours_only);
        }

        if let Some(timezone) = input.timezone {
            active_schedule.timezone = ActiveValue::Set(timezone);
        }

        active_schedule.updated_at = ActiveValue::Set(Utc::now().fixed_offset());

        active_schedule.update(db).await?;

        Ok(SyncScheduleMutationResponse {
            success: true,
            message: "Sync schedule updated successfully".to_string(),
            schedule_id: Some(input.schedule_id),
        })
    }

    /// Delete a sync schedule
    async fn delete_sync_schedule(
        &self,
        ctx: &Context<'_>,
        schedule_id: String,
    ) -> Result<SyncScheduleMutationResponse> {
        let db = ctx.data::<DatabaseConnection>()?;
        let user_ctx = ctx.data::<UserContext>()?;

        let permission_checker = PermissionChecker::new(db.clone());
        permission_checker
            .require(user_ctx, SyncPermission::ManageSyncSchedules)
            .await?;

        let schedule_uuid = Uuid::parse_str(&schedule_id)
            .map_err(|_| Error::new("Invalid schedule ID"))?;

        let schedule = sync_schedule::Entity::find_by_id(schedule_uuid)
            .one(db)
            .await?
            .ok_or_else(|| Error::new("Schedule not found"))?;

        let mut active_schedule: sync_schedule::ActiveModel = schedule.into();
        active_schedule.deleted_at = ActiveValue::Set(Some(Utc::now().fixed_offset()));
        active_schedule.update(db).await?;

        Ok(SyncScheduleMutationResponse {
            success: true,
            message: "Sync schedule deleted successfully".to_string(),
            schedule_id: Some(schedule_id),
        })
    }

    /// Toggle a sync schedule on/off
    async fn toggle_sync_schedule(
        &self,
        ctx: &Context<'_>,
        schedule_id: String,
        enabled: bool,
    ) -> Result<SyncScheduleMutationResponse> {
        let db = ctx.data::<DatabaseConnection>()?;
        let user_ctx = ctx.data::<UserContext>()?;

        let permission_checker = PermissionChecker::new(db.clone());
        permission_checker
            .require(user_ctx, SyncPermission::ManageSyncSchedules)
            .await?;

        let schedule_uuid = Uuid::parse_str(&schedule_id)
            .map_err(|_| Error::new("Invalid schedule ID"))?;

        let schedule = sync_schedule::Entity::find_by_id(schedule_uuid)
            .one(db)
            .await?
            .ok_or_else(|| Error::new("Schedule not found"))?;

        let mut active_schedule: sync_schedule::ActiveModel = schedule.into();
        active_schedule.enabled = ActiveValue::Set(enabled);
        active_schedule.updated_at = ActiveValue::Set(Utc::now().fixed_offset());
        active_schedule.update(db).await?;

        let status = if enabled { "enabled" } else { "disabled" };
        Ok(SyncScheduleMutationResponse {
            success: true,
            message: format!("Sync schedule {} successfully", status),
            schedule_id: Some(schedule_id),
        })
    }
}
