use async_graphql::*;
use sea_orm::*;
use chrono::{DateTime, Utc};
use uuid::Uuid;

use crate::models::{sync_schedule, sync_schedule_history};
use crate::services::permission_checker::{PermissionChecker, SyncPermission};
use crate::auth::context::UserContext;

#[derive(Default)]
pub struct SyncScheduleQuery;

#[derive(SimpleObject)]
pub struct SyncSchedule {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub cron_expression: String,
    pub entity_type: String,
    pub sync_direction: String,
    pub enabled: bool,
    pub business_hours_only: bool,
    pub timezone: String,
    pub last_run_at: Option<DateTime<Utc>>,
    pub next_run_at: Option<DateTime<Utc>>,
    pub last_run_status: Option<String>,
    pub last_run_error: Option<String>,
    pub created_by: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(SimpleObject)]
pub struct SyncScheduleHistory {
    pub id: String,
    pub schedule_id: String,
    pub started_at: DateTime<Utc>,
    pub completed_at: Option<DateTime<Utc>>,
    pub status: String,
    pub records_synced: Option<i32>,
    pub records_pushed: Option<i32>,
    pub records_pulled: Option<i32>,
    pub errors_count: Option<i32>,
    pub error_message: Option<String>,
    pub execution_time_ms: Option<i32>,
    pub created_at: DateTime<Utc>,
}

#[derive(SimpleObject)]
pub struct SyncSchedulesResponse {
    pub schedules: Vec<SyncSchedule>,
    pub total: i64,
}

#[Object]
impl SyncScheduleQuery {
    /// Get all sync schedules
    async fn sync_schedules(
        &self,
        ctx: &Context<'_>,
        enabled_only: Option<bool>,
        entity_type: Option<String>,
        limit: Option<u64>,
        offset: Option<u64>,
    ) -> Result<SyncSchedulesResponse> {
        let db = ctx.data::<DatabaseConnection>()?;
        let user_ctx = ctx.data::<UserContext>()?;

        // Check permission
        let permission_checker = PermissionChecker::new(db.clone());
        permission_checker
            .require(user_ctx, SyncPermission::ManageSyncSchedules)
            .await?;

        let mut query = sync_schedule::Entity::find();

        if let Some(true) = enabled_only {
            query = query.filter(sync_schedule::Column::Enabled.eq(true));
        }

        if let Some(entity) = entity_type {
            query = query.filter(sync_schedule::Column::EntityType.eq(entity));
        }

        // Get total count
        let total = query.clone().count(db).await?;

        // Apply pagination
        if let Some(limit) = limit {
            query = query.limit(limit);
        }
        if let Some(offset) = offset {
            query = query.offset(offset);
        }

        let schedules = query
            .order_by_desc(sync_schedule::Column::CreatedAt)
            .all(db)
            .await?;

        let schedules = schedules
            .into_iter()
            .map(|s| SyncSchedule {
                id: s.id.to_string(),
                name: s.name,
                description: s.description,
                cron_expression: s.cron_expression,
                entity_type: s.entity_type,
                sync_direction: s.sync_direction,
                enabled: s.enabled,
                business_hours_only: s.business_hours_only,
                timezone: s.timezone,
                last_run_at: s.last_run_at.map(|dt| dt.with_timezone(&Utc)),
                next_run_at: s.next_run_at.map(|dt| dt.with_timezone(&Utc)),
                last_run_status: s.last_run_status,
                last_run_error: s.last_run_error,
                created_by: s.created_by.map(|u| u.to_string()),
                created_at: s.created_at.with_timezone(&Utc),
                updated_at: s.updated_at.with_timezone(&Utc),
            })
            .collect();

        Ok(SyncSchedulesResponse { schedules, total: total as i64 })
    }

    /// Get a specific sync schedule by ID
    async fn sync_schedule(
        &self,
        ctx: &Context<'_>,
        schedule_id: String,
    ) -> Result<Option<SyncSchedule>> {
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
            .await?;

        Ok(schedule.map(|s| SyncSchedule {
            id: s.id.to_string(),
            name: s.name,
            description: s.description,
            cron_expression: s.cron_expression,
            entity_type: s.entity_type,
            sync_direction: s.sync_direction,
            enabled: s.enabled,
            business_hours_only: s.business_hours_only,
            timezone: s.timezone,
            last_run_at: s.last_run_at.map(|dt| dt.with_timezone(&Utc)),
            next_run_at: s.next_run_at.map(|dt| dt.with_timezone(&Utc)),
            last_run_status: s.last_run_status,
            last_run_error: s.last_run_error,
            created_by: s.created_by.map(|u| u.to_string()),
            created_at: s.created_at.with_timezone(&Utc),
            updated_at: s.updated_at.with_timezone(&Utc),
        }))
    }

    /// Get history for a specific schedule
    async fn sync_schedule_history(
        &self,
        ctx: &Context<'_>,
        schedule_id: String,
        limit: Option<u64>,
    ) -> Result<Vec<SyncScheduleHistory>> {
        let db = ctx.data::<DatabaseConnection>()?;
        let user_ctx = ctx.data::<UserContext>()?;

        let permission_checker = PermissionChecker::new(db.clone());
        permission_checker
            .require(user_ctx, SyncPermission::ManageSyncSchedules)
            .await?;

        let schedule_uuid = Uuid::parse_str(&schedule_id)
            .map_err(|_| Error::new("Invalid schedule ID"))?;

        let mut query = sync_schedule_history::Entity::find()
            .filter(sync_schedule_history::Column::ScheduleId.eq(schedule_uuid))
            .order_by_desc(sync_schedule_history::Column::StartedAt);

        if let Some(limit) = limit {
            query = query.limit(limit);
        }

        let history = query.all(db).await?;

        Ok(history
            .into_iter()
            .map(|h| SyncScheduleHistory {
                id: h.id.to_string(),
                schedule_id: h.schedule_id.to_string(),
                started_at: h.started_at.with_timezone(&Utc),
                completed_at: h.completed_at.map(|dt| dt.with_timezone(&Utc)),
                status: h.status,
                records_synced: h.records_synced,
                records_pushed: h.records_pushed,
                records_pulled: h.records_pulled,
                errors_count: h.errors_count,
                error_message: h.error_message,
                execution_time_ms: h.execution_time_ms,
                created_at: h.created_at.with_timezone(&Utc),
            })
            .collect())
    }
}
