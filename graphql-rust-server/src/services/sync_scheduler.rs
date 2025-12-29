// ! Sync Scheduler Service
//!
//! Manages automated, scheduled synchronization with QuickBooks using cron expressions.
//! Provides schedule management, execution tracking, and timezone-aware scheduling.

use anyhow::{Context, Result};
use chrono::{DateTime, Datelike, Timelike, Utc};
use sea_orm::{
    ActiveModelTrait, ColumnTrait, DatabaseConnection, EntityTrait, PaginatorTrait, QueryFilter,
    QueryOrder, QuerySelect, Set,
};
use std::sync::Arc;
use tokio::sync::RwLock;
use tokio_cron_scheduler::{Job, JobScheduler};
use uuid::Uuid;

use crate::{
    integrations::intuit::IntuitClient,
    models::intuit_connection,
    services::{ConflictStrategy, EntityType, SyncOrchestrator},
};

/// Sync direction for scheduled syncs
#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
pub enum SyncDirection {
    /// Push local changes to QuickBooks
    Push,
    /// Pull changes from QuickBooks to local
    Pull,
    /// Two-way synchronization with conflict resolution
    Bidirectional,
}

impl SyncDirection {
    pub fn as_str(&self) -> &'static str {
        match self {
            SyncDirection::Push => "Push",
            SyncDirection::Pull => "Pull",
            SyncDirection::Bidirectional => "Bidirectional",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "Push" => Some(SyncDirection::Push),
            "Pull" => Some(SyncDirection::Pull),
            "Bidirectional" => Some(SyncDirection::Bidirectional),
            _ => None,
        }
    }
}

/// Schedule entity type (can sync multiple entities or specific ones)
#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
pub enum ScheduleEntityType {
    /// Only employees
    Employee,
    /// Only departments
    Department,
    /// Both employees and departments
    Both,
}

impl ScheduleEntityType {
    pub fn as_str(&self) -> &'static str {
        match self {
            ScheduleEntityType::Employee => "Employee",
            ScheduleEntityType::Department => "Department",
            ScheduleEntityType::Both => "Both",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "Employee" => Some(ScheduleEntityType::Employee),
            "Department" => Some(ScheduleEntityType::Department),
            "Both" => Some(ScheduleEntityType::Both),
            _ => None,
        }
    }

    pub fn to_entity_types(&self) -> Vec<EntityType> {
        match self {
            ScheduleEntityType::Employee => vec![EntityType::Employee],
            ScheduleEntityType::Department => vec![EntityType::Department],
            ScheduleEntityType::Both => vec![EntityType::Employee, EntityType::Department],
        }
    }
}

/// Schedule configuration
#[derive(Debug, Clone)]
pub struct ScheduleConfig {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub cron_expression: String,
    pub entity_type: ScheduleEntityType,
    pub sync_direction: SyncDirection,
    pub enabled: bool,
    pub business_hours_only: bool,
    pub timezone: chrono_tz::Tz,
    pub last_run_at: Option<DateTime<Utc>>,
    pub next_run_at: Option<DateTime<Utc>>,
}

/// Execution result of a scheduled sync
#[derive(Debug, Clone)]
pub struct ScheduleExecutionResult {
    pub schedule_id: Uuid,
    pub started_at: DateTime<Utc>,
    pub completed_at: DateTime<Utc>,
    pub status: String,
    pub records_synced: i32,
    pub records_pushed: i32,
    pub records_pulled: i32,
    pub errors_count: i32,
    pub error_message: Option<String>,
    pub execution_time_ms: i32,
}

/// Sync scheduler that manages cron-based scheduled syncs
pub struct SyncScheduler {
    db: DatabaseConnection,
    scheduler: Arc<RwLock<JobScheduler>>,
}

impl SyncScheduler {
    /// Create a new sync scheduler instance
    pub async fn new(db: DatabaseConnection) -> Result<Self> {
        let scheduler = JobScheduler::new()
            .await
            .context("Failed to create job scheduler")?;

        Ok(Self {
            db,
            scheduler: Arc::new(RwLock::new(scheduler)),
        })
    }

    /// Start the scheduler and load all enabled schedules
    pub async fn start(&self) -> Result<()> {
        use crate::models::sync_schedule::{Column, Entity};

        // Load all enabled schedules
        let schedules = Entity::find()
            .filter(Column::Enabled.eq(true))
            .filter(Column::DeletedAt.is_null())
            .all(&self.db)
            .await
            .context("Failed to load schedules")?;

        tracing::info!("Loading {} enabled schedules", schedules.len());

        // Add each schedule to the cron scheduler
        for schedule in schedules {
            if let Err(e) = self.add_schedule_to_cron(&schedule).await {
                tracing::error!(
                    "Failed to add schedule {} to cron: {}",
                    schedule.name,
                    e
                );
            }
        }

        // Start the scheduler
        self.scheduler
            .write()
            .await
            .start()
            .await
            .context("Failed to start scheduler")?;

        tracing::info!("Sync scheduler started successfully");
        Ok(())
    }

    /// Stop the scheduler
    pub async fn stop(&self) -> Result<()> {
        self.scheduler
            .write()
            .await
            .shutdown()
            .await
            .context("Failed to shutdown scheduler")?;
        tracing::info!("Sync scheduler stopped");
        Ok(())
    }

    /// Add a schedule to the cron scheduler
    async fn add_schedule_to_cron(
        &self,
        schedule: &crate::models::sync_schedule::Model,
    ) -> Result<()> {
        let schedule_id = schedule.id;
        let cron_expr = schedule.cron_expression.clone();
        let db = self.db.clone();

        // Parse timezone
        let timezone: chrono_tz::Tz = schedule
            .timezone
            .parse()
            .unwrap_or(chrono_tz::UTC);

        tracing::info!(
            "Adding schedule '{}' with cron: {} (timezone: {})",
            schedule.name,
            cron_expr,
            timezone
        );

        // Create the cron job
        let job = Job::new_async(cron_expr.as_str(), move |_uuid, _lock| {
            let db_clone = db.clone();
            let schedule_id_clone = schedule_id;

            Box::pin(async move {
                if let Err(e) = Self::execute_schedule_static(db_clone, schedule_id_clone).await {
                    tracing::error!("Scheduled sync {} failed: {}", schedule_id_clone, e);
                }
            })
        })
        .context("Failed to create cron job")?;

        // Add job to scheduler
        self.scheduler
            .write()
            .await
            .add(job)
            .await
            .context("Failed to add job to scheduler")?;

        // Calculate next run time
        self.update_next_run_time(schedule_id).await?;

        Ok(())
    }

    /// Execute a schedule (static version for use in async closures)
    async fn execute_schedule_static(db: DatabaseConnection, schedule_id: Uuid) -> Result<()> {
        use crate::models::sync_schedule::{ActiveModel, Column, Entity};

        let started_at = Utc::now();

        // Load schedule
        let schedule = Entity::find_by_id(schedule_id)
            .one(&db)
            .await
            .context("Failed to load schedule")?
            .ok_or_else(|| anyhow::anyhow!("Schedule not found"))?;

        // Check if enabled
        if !schedule.enabled {
            tracing::info!("Schedule {} is disabled, skipping execution", schedule_id);
            return Ok(());
        }

        tracing::info!("Executing schedule: {}", schedule.name);

        // Check business hours if required
        if schedule.business_hours_only {
            let timezone: chrono_tz::Tz = schedule.timezone.parse().unwrap_or(chrono_tz::UTC);
            let now = Utc::now().with_timezone(&timezone);
            let hour = now.hour();
            let weekday = now.weekday();

            // Business hours: Monday-Friday, 9 AM - 5 PM
            let is_weekday = weekday.number_from_monday() <= 5;
            let is_business_hours = hour >= 9 && hour < 17;

            if !is_weekday || !is_business_hours {
                tracing::info!(
                    "Skipping schedule {} - outside business hours",
                    schedule.name
                );
                return Ok(());
            }
        }

        // Get active QuickBooks connection
        let connection = intuit_connection::Entity::find()
            .filter(intuit_connection::Column::DeletedAt.is_null())
            .filter(intuit_connection::Column::IsActive.eq(true))
            .order_by_desc(intuit_connection::Column::CreatedAt)
            .one(&db)
            .await
            .context("Failed to query connections")?
            .ok_or_else(|| anyhow::anyhow!("No active QuickBooks connection"))?;

        // Ensure token is valid (refresh if needed)
        let access_token = if connection.token_expires_at
            <= Utc::now() + chrono::Duration::minutes(5)
        {
            // Token expired or expiring soon - would need refresh logic here
            tracing::warn!("QuickBooks token expired, skipping sync");
            return Err(anyhow::anyhow!("QuickBooks token expired"));
        } else {
            connection.access_token.clone()
        };

        // Create QuickBooks client
        let client = IntuitClient::new(access_token, connection.realm_id.clone())
            .context("Failed to create QuickBooks client")?;

        // Parse entity type and sync direction
        let entity_type = ScheduleEntityType::from_str(&schedule.entity_type)
            .ok_or_else(|| anyhow::anyhow!("Invalid entity type"))?;
        let sync_direction = SyncDirection::from_str(&schedule.sync_direction)
            .ok_or_else(|| anyhow::anyhow!("Invalid sync direction"))?;

        // Execute sync for each entity type
        let mut total_pushed = 0;
        let mut total_pulled = 0;
        let mut total_synced = 0;
        let mut errors = Vec::new();

        for et in entity_type.to_entity_types() {
            match sync_direction {
                SyncDirection::Bidirectional => {
                    // Use bidirectional sync with LastWriteWins strategy
                    match SyncOrchestrator::sync_bidirectional(
                        &db,
                        &client,
                        et,
                        ConflictStrategy::LastWriteWins,
                    )
                    .await
                    {
                        Ok(report) => {
                            total_pushed += report.pushed_count;
                            total_pulled += report.pulled_count;
                            total_synced += report.pushed_count + report.pulled_count;
                            for error in report.errors {
                                errors.push(error.error_message);
                            }
                        }
                        Err(e) => {
                            errors.push(format!("Sync failed for {:?}: {}", et, e));
                        }
                    }
                }
                SyncDirection::Push => {
                    // Push local changes to QuickBooks only
                    match SyncOrchestrator::sync_push(&db, &client, et).await {
                        Ok(report) => {
                            total_pushed += report.pushed_count;
                            total_synced += report.pushed_count;
                            for error in report.errors {
                                errors.push(error.error_message);
                            }
                        }
                        Err(e) => {
                            errors.push(format!("Push sync failed for {:?}: {}", et, e));
                        }
                    }
                }
                SyncDirection::Pull => {
                    // Pull remote changes from QuickBooks only
                    match SyncOrchestrator::sync_pull(&db, &client, et).await {
                        Ok(report) => {
                            total_pulled += report.pulled_count;
                            total_synced += report.pulled_count;
                            for error in report.errors {
                                errors.push(error.error_message);
                            }
                        }
                        Err(e) => {
                            errors.push(format!("Pull sync failed for {:?}: {}", et, e));
                        }
                    }
                }
            }
        }

        let completed_at = Utc::now();
        let execution_time_ms = (completed_at - started_at).num_milliseconds() as i32;

        // Record execution in history
        let status = if errors.is_empty() {
            "Success"
        } else {
            "Error"
        };

        let error_message = if errors.is_empty() {
            None
        } else {
            Some(errors.join("; "))
        };

        Self::record_execution(
            &db,
            schedule_id,
            started_at,
            completed_at,
            status,
            total_synced as i32,
            total_pushed as i32,
            total_pulled as i32,
            errors.len() as i32,
            error_message.clone(),
            execution_time_ms,
        )
        .await?;

        // Update schedule's last run fields
        let mut schedule_update: ActiveModel = schedule.into();
        schedule_update.last_run_at = Set(Some(completed_at.into()));
        schedule_update.last_run_status = Set(Some(status.to_string()));
        schedule_update.last_run_error = Set(error_message);
        schedule_update.updated_at = Set(Utc::now().into());
        schedule_update
            .update(&db)
            .await
            .context("Failed to update schedule")?;

        tracing::info!(
            "Schedule {} completed: {} records synced, {} errors",
            schedule_id,
            total_synced,
            errors.len()
        );

        Ok(())
    }

    /// Record a schedule execution in history
    async fn record_execution(
        db: &DatabaseConnection,
        schedule_id: Uuid,
        started_at: DateTime<Utc>,
        completed_at: DateTime<Utc>,
        status: &str,
        records_synced: i32,
        records_pushed: i32,
        records_pulled: i32,
        errors_count: i32,
        error_message: Option<String>,
        execution_time_ms: i32,
    ) -> Result<()> {
        use crate::models::sync_schedule_history::ActiveModel;

        let history = ActiveModel {
            id: Set(Uuid::new_v4()),
            schedule_id: Set(schedule_id),
            started_at: Set(started_at.into()),
            completed_at: Set(Some(completed_at.into())),
            status: Set(status.to_string()),
            records_synced: Set(Some(records_synced)),
            records_pushed: Set(Some(records_pushed)),
            records_pulled: Set(Some(records_pulled)),
            errors_count: Set(Some(errors_count)),
            error_message: Set(error_message),
            execution_time_ms: Set(Some(execution_time_ms)),
            created_at: Set(Utc::now().into()),
        };

        history
            .insert(db)
            .await
            .context("Failed to record execution")?;

        Ok(())
    }

    /// Update the next run time for a schedule based on its cron expression
    async fn update_next_run_time(&self, schedule_id: Uuid) -> Result<()> {
        use crate::models::sync_schedule::{ActiveModel, Column, Entity};

        let schedule = Entity::find_by_id(schedule_id)
            .one(&self.db)
            .await
            .context("Failed to load schedule")?
            .ok_or_else(|| anyhow::anyhow!("Schedule not found"))?;

        // Parse cron expression to get next run time
        // This is a simplified version - in production, use a proper cron parser
        let next_run = Utc::now() + chrono::Duration::hours(1); // Placeholder

        let mut schedule_update: ActiveModel = schedule.into();
        schedule_update.next_run_at = Set(Some(next_run.into()));
        schedule_update.updated_at = Set(Utc::now().into());
        schedule_update
            .update(&self.db)
            .await
            .context("Failed to update next run time")?;

        Ok(())
    }

    /// Enable or disable a schedule
    pub async fn toggle_schedule(&self, schedule_id: Uuid, enabled: bool) -> Result<()> {
        use crate::models::sync_schedule::{ActiveModel, Column, Entity};

        let schedule = Entity::find_by_id(schedule_id)
            .one(&self.db)
            .await
            .context("Failed to load schedule")?
            .ok_or_else(|| anyhow::anyhow!("Schedule not found"))?;

        let mut schedule_update: ActiveModel = schedule.clone().into();
        schedule_update.enabled = Set(enabled);
        schedule_update.updated_at = Set(Utc::now().into());
        schedule_update
            .update(&self.db)
            .await
            .context("Failed to update schedule")?;

        // If enabling, add to cron scheduler
        if enabled {
            self.add_schedule_to_cron(&schedule).await?;
        }

        tracing::info!(
            "Schedule {} {}: {}",
            schedule_id,
            if enabled { "enabled" } else { "disabled" },
            schedule.name
        );

        Ok(())
    }

    /// Get execution history for a schedule
    pub async fn get_execution_history(
        &self,
        schedule_id: Uuid,
        limit: Option<u64>,
    ) -> Result<Vec<crate::models::sync_schedule_history::Model>> {
        use crate::models::sync_schedule_history::{Column, Entity};

        let limit = limit.unwrap_or(20).min(100);

        let history = Entity::find()
            .filter(Column::ScheduleId.eq(schedule_id))
            .order_by_desc(Column::StartedAt)
            .limit(Some(limit))
            .all(&self.db)
            .await
            .context("Failed to load execution history")?;

        Ok(history)
    }

    /// Get all schedules
    pub async fn get_all_schedules(
        &self,
    ) -> Result<Vec<crate::models::sync_schedule::Model>> {
        use crate::models::sync_schedule::{Column, Entity};

        let schedules = Entity::find()
            .filter(Column::DeletedAt.is_null())
            .order_by_asc(Column::Name)
            .all(&self.db)
            .await
            .context("Failed to load schedules")?;

        Ok(schedules)
    }

    /// Delete a schedule (soft delete)
    pub async fn delete_schedule(&self, schedule_id: Uuid) -> Result<()> {
        use crate::models::sync_schedule::{ActiveModel, Entity};

        let schedule = Entity::find_by_id(schedule_id)
            .one(&self.db)
            .await
            .context("Failed to load schedule")?
            .ok_or_else(|| anyhow::anyhow!("Schedule not found"))?;

        let mut schedule_update: ActiveModel = schedule.into();
        schedule_update.deleted_at = Set(Some(Utc::now().into()));
        schedule_update.updated_at = Set(Utc::now().into());
        schedule_update
            .update(&self.db)
            .await
            .context("Failed to delete schedule")?;

        tracing::info!("Schedule {} deleted", schedule_id);
        Ok(())
    }
}
