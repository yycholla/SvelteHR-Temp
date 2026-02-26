use async_graphql::*;
use chrono::{Datelike, Timelike, Utc};
use chrono_tz::Tz;
use sea_orm::*;
use std::str::FromStr;
use uuid::Uuid;

use crate::auth::context::UserContext;
use crate::models::sync_schedule;
use crate::services::permission_checker::{PermissionChecker, SyncPermission};

/// Calculate the next run time for a cron expression in a specific timezone
fn calculate_next_run(
    cron_expression: &str,
    timezone: &str,
) -> Result<chrono::DateTime<chrono::FixedOffset>> {
    use chrono::TimeZone;

    // Parse the cron expression
    let cron = croner::Cron::from_str(cron_expression)
        .map_err(|e| Error::new(format!("Invalid cron expression: {}", e)))?;

    // Parse the timezone
    let tz: Tz = timezone
        .parse()
        .map_err(|_| Error::new(format!("Invalid timezone: {}", timezone)))?;

    // Get current time in UTC
    let now_utc = Utc::now();

    // Find next occurrence - croner works with the timestamp, not timezone-aware
    // So we need to work in UTC and then interpret the result in the target timezone
    let next_run_naive = cron
        .find_next_occurrence(&now_utc, false)
        .map_err(|e| Error::new(format!("Could not calculate next run time: {}", e)))?;

    // Get the naive date/time components from the result
    let naive_dt = chrono::NaiveDateTime::new(
        chrono::NaiveDate::from_ymd_opt(
            next_run_naive.year(),
            next_run_naive.month(),
            next_run_naive.day(),
        )
        .ok_or_else(|| Error::new("Invalid date"))?,
        chrono::NaiveTime::from_hms_opt(
            next_run_naive.hour(),
            next_run_naive.minute(),
            next_run_naive.second(),
        )
        .ok_or_else(|| Error::new("Invalid time"))?,
    );

    // Interpret these components as being in the SCHEDULE's timezone
    let next_run_in_tz = tz
        .from_local_datetime(&naive_dt)
        .single()
        .ok_or_else(|| Error::new("Ambiguous datetime in timezone"))?;

    // Convert to UTC
    let next_run_utc = next_run_in_tz.with_timezone(&Utc);

    // Convert to FixedOffset for database
    Ok(next_run_utc.fixed_offset())
}

#[derive(Default)]
pub struct SyncScheduleMutation;

#[derive(InputObject)]
pub struct CreateSyncScheduleInput {
    pub name: String,
    pub description: Option<String>,
    #[graphql(name = "cronExpression")]
    pub cron_expression: String,
    #[graphql(name = "entityType")]
    pub entity_type: String, // 'Employee', 'Department', 'Both'
    #[graphql(name = "syncDirection")]
    pub sync_direction: String, // 'Push', 'Pull', 'Bidirectional'
    pub enabled: Option<bool>,
    #[graphql(name = "businessHoursOnly")]
    pub business_hours_only: Option<bool>,
    pub timezone: Option<String>,
}

#[derive(InputObject)]
pub struct UpdateSyncScheduleInput {
    #[graphql(name = "scheduleId")]
    pub schedule_id: String,
    pub name: Option<String>,
    pub description: Option<String>,
    #[graphql(name = "cronExpression")]
    pub cron_expression: Option<String>,
    #[graphql(name = "entityType")]
    pub entity_type: Option<String>,
    #[graphql(name = "syncDirection")]
    pub sync_direction: Option<String>,
    pub enabled: Option<bool>,
    #[graphql(name = "businessHoursOnly")]
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
            return Err(Error::new(
                "Invalid entity type. Must be 'Employee', 'Department', or 'Both'",
            ));
        }

        // Validate sync direction
        if !["Push", "Pull", "Bidirectional"].contains(&input.sync_direction.as_str()) {
            return Err(Error::new(
                "Invalid sync direction. Must be 'Push', 'Pull', or 'Bidirectional'",
            ));
        }

        // Calculate next run time from cron expression in the schedule's timezone
        let timezone = input.timezone.clone().unwrap_or_else(|| "UTC".to_string());
        let next_run = calculate_next_run(&input.cron_expression, &timezone)?;

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
            next_run_at: ActiveValue::Set(Some(next_run)),
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

        let schedule_uuid =
            Uuid::parse_str(&input.schedule_id).map_err(|_| Error::new("Invalid schedule ID"))?;

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

        // Track if we need to recalculate next_run_at
        let mut cron_updated = false;
        let mut timezone_updated = false;

        if let Some(cron) = input.cron_expression {
            // Validate cron expression format (basic check)
            if cron.split_whitespace().count() != 6 {
                return Err(Error::new(
                    "Invalid cron expression format. Expected 6 fields",
                ));
            }

            active_schedule.cron_expression = ActiveValue::Set(cron);
            cron_updated = true;
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
            timezone_updated = true;
        }

        // Recalculate next_run_at if cron or timezone changed
        if cron_updated || timezone_updated {
            // Get current values from active_schedule
            let cron_expr = match &active_schedule.cron_expression {
                ActiveValue::Set(expr) => expr.clone(),
                ActiveValue::Unchanged(expr) => expr.clone(),
                _ => return Err(Error::new("Missing cron expression")),
            };
            let tz = match &active_schedule.timezone {
                ActiveValue::Set(tz) => tz.clone(),
                ActiveValue::Unchanged(tz) => tz.clone(),
                _ => "UTC".to_string(),
            };

            let next_run = calculate_next_run(&cron_expr, &tz)?;
            active_schedule.next_run_at = ActiveValue::Set(Some(next_run));
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

        let schedule_uuid =
            Uuid::parse_str(&schedule_id).map_err(|_| Error::new("Invalid schedule ID"))?;

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

        let schedule_uuid =
            Uuid::parse_str(&schedule_id).map_err(|_| Error::new("Invalid schedule ID"))?;

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
