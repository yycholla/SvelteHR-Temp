//! Employee Statistics Scheduler
//!
//! Background task that captures daily snapshots of employee statistics
//! Runs once per day at midnight UTC

use chrono::{Duration, NaiveDate, Utc};
use sea_orm::{ActiveModelTrait, ColumnTrait, DatabaseConnection, EntityTrait, PaginatorTrait, QueryFilter, Set};
use tracing::{error, info, warn};
use uuid::Uuid;

use crate::models::{
    analytics::employee_statistic::{ActiveModel, Column, Entity},
    department::Entity as DepartmentEntity,
    user::{Column as UserColumn, Entity as UserEntity},
};

/// Capture a snapshot of current employee statistics
pub async fn capture_employee_statistics_snapshot(db: &DatabaseConnection) -> Result<(), sea_orm::DbErr> {
    let today = Utc::now().date_naive();

    // Check if snapshot already exists for today
    if Entity::exists_for_date(db, today).await? {
        info!("[Employee Statistics Scheduler] Snapshot for {} already exists, skipping", today);
        return Ok(());
    }

    // Count total employees
    let total_count = UserEntity::find().count(db).await?;

    // Count active employees
    let active_count = UserEntity::find()
        .filter(UserColumn::IsActive.eq(true))
        .count(db)
        .await?;

    // Count inactive employees
    let inactive_count = UserEntity::find()
        .filter(UserColumn::IsActive.eq(false))
        .count(db)
        .await?;

    // Count departments
    let department_count = DepartmentEntity::find().count(db).await?;

    // Create snapshot
    let snapshot = ActiveModel {
        id: Set(Uuid::new_v4()),
        snapshot_date: Set(today),
        total_count: Set(total_count as i32),
        active_count: Set(active_count as i32),
        inactive_count: Set(inactive_count as i32),
        department_count: Set(department_count as i32),
        created_at: Set(Utc::now()),
        updated_at: Set(Utc::now()),
    };

    snapshot.insert(db).await?;

    info!(
        "[Employee Statistics Scheduler] Snapshot captured for {}: total={}, active={}, inactive={}, departments={}",
        today, total_count, active_count, inactive_count, department_count
    );

    Ok(())
}

/// Clean up old statistics (older than 2 years)
pub async fn cleanup_old_statistics(db: &DatabaseConnection) -> Result<u64, sea_orm::DbErr> {
    use sea_orm::{QueryFilter, DeleteMany};

    let cutoff_date = Utc::now().date_naive() - Duration::days(730); // 2 years

    let result = Entity::delete_many()
        .filter(Column::SnapshotDate.lt(cutoff_date))
        .exec(db)
        .await?;

    if result.rows_affected > 0 {
        info!(
            "[Employee Statistics Scheduler] Cleaned up {} old statistics snapshots (older than {})",
            result.rows_affected, cutoff_date
        );
    }

    Ok(result.rows_affected)
}

/// Calculate time until next midnight UTC
fn time_until_midnight_utc() -> std::time::Duration {
    let now = Utc::now();
    let tomorrow = (now + Duration::days(1)).date_naive();
    let midnight_tomorrow = tomorrow.and_hms_opt(0, 0, 0).unwrap().and_utc();
    let duration = midnight_tomorrow.signed_duration_since(now);

    duration.to_std().unwrap_or(std::time::Duration::from_secs(60))
}

/// Start the employee statistics scheduler background task
pub async fn start_employee_statistics_scheduler(db: DatabaseConnection) {
    tokio::spawn(async move {
        // Wait until midnight UTC for first run
        let initial_delay = time_until_midnight_utc();
        info!(
            "[Employee Statistics Scheduler] Starting... First snapshot in {} seconds",
            initial_delay.as_secs()
        );
        tokio::time::sleep(initial_delay).await;

        // Then run every 24 hours
        let mut interval = tokio::time::interval(tokio::time::Duration::from_secs(86400)); // 24 hours

        loop {
            interval.tick().await;

            // Capture daily snapshot
            match capture_employee_statistics_snapshot(&db).await {
                Ok(_) => {
                    info!("[Employee Statistics Scheduler] Daily snapshot completed successfully");
                }
                Err(e) => {
                    error!("[Employee Statistics Scheduler] Failed to capture snapshot: {:?}", e);
                }
            }

            // Cleanup old data (once per day)
            match cleanup_old_statistics(&db).await {
                Ok(count) => {
                    if count > 0 {
                        info!("[Employee Statistics Scheduler] Cleaned up {} old snapshots", count);
                    }
                }
                Err(e) => {
                    warn!("[Employee Statistics Scheduler] Failed to cleanup old statistics: {:?}", e);
                }
            }
        }
    });
}
