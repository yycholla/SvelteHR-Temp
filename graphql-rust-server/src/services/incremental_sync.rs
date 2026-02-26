//! Incremental Sync Service
//!
//! Provides efficient change detection and synchronization by only processing
//! entities that have changed since the last successful sync.
//!
//! Key optimizations:
//! - Timestamp-based filtering for local changes
//! - QuickBooks Query API with LastUpdatedTime filters
//! - Entity-level sync token tracking
//! - Automatic fallback to full sync when needed

use anyhow::{Context, Result};
use chrono::{DateTime, Duration, Utc};
use sea_orm::{ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter};
use serde::{Deserialize, Serialize};

use crate::integrations::intuit::IntuitClient;
use crate::models::{
    department::{Column as DepartmentColumn, Entity as DepartmentEntity},
    intuit_connection::{Column as IntuitConnectionColumn, Entity as IntuitConnectionEntity},
    user::{Column as UserColumn, Entity as UserEntity},
};

use super::sync_tracker::{ChangeRecord, EntityType, SyncStatus};

/// Sync mode configuration
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum SyncMode {
    /// Full sync - process all entities
    Full,
    /// Incremental sync - process only changed entities
    Incremental,
    /// Auto - system decides based on conditions
    Auto,
}

impl SyncMode {
    pub fn as_str(&self) -> &'static str {
        match self {
            SyncMode::Full => "full",
            SyncMode::Incremental => "incremental",
            SyncMode::Auto => "auto",
        }
    }
}

/// Metadata about incremental sync state
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncMetadata {
    pub entity_type: EntityType,
    pub last_sync_at: Option<DateTime<Utc>>,
    pub sync_token: Option<String>,
    pub should_use_incremental: bool,
    pub reason: String,
}

/// Result of incremental sync decision
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncDecision {
    pub sync_mode: SyncMode,
    pub reason: String,
    pub metadata: SyncMetadata,
}

/// Incremental Sync Service
pub struct IncrementalSyncService;

impl IncrementalSyncService {
    /// Decide whether to use incremental or full sync
    ///
    /// Decision logic:
    /// 1. If no previous sync exists -> Full sync
    /// 2. If last sync was > 7 days ago -> Full sync (integrity check)
    /// 3. If sync token is missing -> Full sync
    /// 4. Otherwise -> Incremental sync
    pub async fn decide_sync_mode(
        db: &DatabaseConnection,
        entity_type: EntityType,
        requested_mode: SyncMode,
    ) -> Result<SyncDecision> {
        let metadata = Self::get_sync_metadata(db, entity_type).await?;

        // If user explicitly requested a mode, respect it
        if requested_mode != SyncMode::Auto {
            return Ok(SyncDecision {
                sync_mode: requested_mode,
                reason: format!("User requested {} sync", requested_mode.as_str()),
                metadata,
            });
        }

        // Auto-decision logic
        let (sync_mode, reason) = if !metadata.should_use_incremental {
            (SyncMode::Full, metadata.reason.clone())
        } else {
            (
                SyncMode::Incremental,
                "Conditions met for incremental sync".to_string(),
            )
        };

        Ok(SyncDecision {
            sync_mode,
            reason,
            metadata,
        })
    }

    /// Get sync metadata for an entity type
    pub async fn get_sync_metadata(
        db: &DatabaseConnection,
        entity_type: EntityType,
    ) -> Result<SyncMetadata> {
        // Get the active Intuit connection
        let connection = IntuitConnectionEntity::find()
            .filter(IntuitConnectionColumn::IsActive.eq(true))
            .filter(IntuitConnectionColumn::DeletedAt.is_null())
            .one(db)
            .await?
            .context("No active Intuit connection found")?;

        let (last_sync_at, sync_token) = match entity_type {
            EntityType::Employee => (
                connection
                    .last_employee_sync_at
                    .map(|ts| ts.with_timezone(&Utc)),
                connection.employee_sync_token,
            ),
            EntityType::Department => (
                connection
                    .last_department_sync_at
                    .map(|ts| ts.with_timezone(&Utc)),
                connection.department_sync_token,
            ),
        };

        // Determine if incremental sync is viable
        let (should_use_incremental, reason) =
            Self::check_incremental_viability(last_sync_at, sync_token.as_deref());

        Ok(SyncMetadata {
            entity_type,
            last_sync_at,
            sync_token,
            should_use_incremental,
            reason,
        })
    }

    /// Check if incremental sync is viable
    fn check_incremental_viability(
        last_sync_at: Option<DateTime<Utc>>,
        _sync_token: Option<&str>,
    ) -> (bool, String) {
        // Rule 1: No previous sync
        let Some(last_sync) = last_sync_at else {
            return (
                false,
                "No previous sync exists - full sync required".to_string(),
            );
        };

        // Rule 2: Last sync was too long ago (> 7 days) - force full sync for integrity
        let now = Utc::now();
        let days_since_sync = (now - last_sync).num_days();
        if days_since_sync > 7 {
            return (
                false,
                format!(
                    "Last sync was {} days ago - full sync for integrity check",
                    days_since_sync
                ),
            );
        }

        // Rule 3: Sync token missing (we can still use timestamp-based incremental)
        // QuickBooks provides both SyncToken and LastUpdatedTime, so we can use timestamps
        // even if we don't track individual entity tokens

        (true, "All conditions met for incremental sync".to_string())
    }

    /// Get local changes since last sync for incremental mode
    pub async fn get_incremental_local_changes(
        db: &DatabaseConnection,
        entity_type: EntityType,
        since: DateTime<Utc>,
    ) -> Result<Vec<ChangeRecord>> {
        match entity_type {
            EntityType::Employee => Self::get_incremental_employee_changes(db, since).await,
            EntityType::Department => Self::get_incremental_department_changes(db, since).await,
        }
    }

    async fn get_incremental_employee_changes(
        db: &DatabaseConnection,
        since: DateTime<Utc>,
    ) -> Result<Vec<ChangeRecord>> {
        let users = UserEntity::find()
            .filter(UserColumn::DeletedAt.is_null())
            .filter(
                sea_orm::Condition::any()
                    // Never synced
                    .add(UserColumn::LastSyncedAt.is_null())
                    // Modified since the given timestamp
                    .add(UserColumn::LastModifiedAt.gt(since)),
            )
            .all(db)
            .await
            .context("Failed to query incremental employee changes")?;

        Ok(users
            .into_iter()
            .map(|user| ChangeRecord {
                entity_type: EntityType::Employee,
                entity_id: user.id.to_string(),
                quickbooks_id: user.intuit_employee_id,
                last_modified_at: user.last_modified_at,
                last_synced_at: user.last_synced_at,
                sync_status: SyncStatus::from_str(&user.sync_status)
                    .unwrap_or(SyncStatus::LocalChanged),
                sync_token: user.quickbooks_sync_token,
            })
            .collect())
    }

    async fn get_incremental_department_changes(
        db: &DatabaseConnection,
        since: DateTime<Utc>,
    ) -> Result<Vec<ChangeRecord>> {
        let departments = DepartmentEntity::find()
            .filter(DepartmentColumn::DeletedAt.is_null())
            .filter(
                sea_orm::Condition::any()
                    // Never synced
                    .add(DepartmentColumn::LastSyncedAt.is_null())
                    // Modified since the given timestamp
                    .add(DepartmentColumn::LastModifiedAt.gt(since)),
            )
            .all(db)
            .await
            .context("Failed to query incremental department changes")?;

        Ok(departments
            .into_iter()
            .map(|dept| ChangeRecord {
                entity_type: EntityType::Department,
                entity_id: dept.id.to_string(),
                quickbooks_id: dept.intuit_department_id,
                last_modified_at: dept.last_modified_at,
                last_synced_at: dept.last_synced_at,
                sync_status: SyncStatus::from_str(&dept.sync_status)
                    .unwrap_or(SyncStatus::LocalChanged),
                sync_token: dept.quickbooks_sync_token,
            })
            .collect())
    }

    /// Get remote changes since last sync for incremental mode
    ///
    /// This delegates to the IntuitClient to query QuickBooks with a timestamp filter
    pub async fn get_incremental_remote_changes(
        client: &IntuitClient,
        db: &DatabaseConnection,
        entity_type: EntityType,
        since: DateTime<Utc>,
    ) -> Result<Vec<ChangeRecord>> {
        match entity_type {
            EntityType::Employee => {
                // Query QuickBooks for employees changed since timestamp
                let qb_employees = client
                    .list_employees_since(since)
                    .await
                    .context("Failed to query incremental QuickBooks employees")?;

                // Convert to ChangeRecords
                let mut changes = Vec::new();
                for emp in qb_employees {
                    let qb_id = emp.base.id.as_ref().context("Employee missing ID")?;

                    // Get local sync info
                    let local = UserEntity::find()
                        .filter(UserColumn::IntuitEmployeeId.eq(qb_id))
                        .filter(UserColumn::DeletedAt.is_null())
                        .one(db)
                        .await?;

                    let (entity_id, last_synced_at) = if let Some(user) = local {
                        (user.id.to_string(), user.last_synced_at)
                    } else {
                        (String::new(), None)
                    };

                    let last_updated = emp
                        .base
                        .meta_data
                        .as_ref()
                        .map(|m| m.last_updated_time)
                        .unwrap_or_else(Utc::now);

                    changes.push(ChangeRecord {
                        entity_type: EntityType::Employee,
                        entity_id,
                        quickbooks_id: Some(qb_id.clone()),
                        last_modified_at: last_updated,
                        last_synced_at,
                        sync_status: SyncStatus::RemoteChanged,
                        sync_token: emp.base.sync_token,
                    });
                }

                Ok(changes)
            }
            EntityType::Department => {
                // Query QuickBooks for departments changed since timestamp
                let qb_departments = client
                    .query_departments_since(since)
                    .await
                    .context("Failed to query incremental QuickBooks departments")?;

                // Convert to ChangeRecords
                let mut changes = Vec::new();
                for dept in qb_departments {
                    let qb_id = dept.id.as_ref().context("Department missing ID")?;

                    // Get local sync info
                    let local = DepartmentEntity::find()
                        .filter(DepartmentColumn::IntuitDepartmentId.eq(qb_id))
                        .filter(DepartmentColumn::DeletedAt.is_null())
                        .one(db)
                        .await?;

                    let (entity_id, last_synced_at) = if let Some(d) = local {
                        (d.id.to_string(), d.last_synced_at)
                    } else {
                        (String::new(), None)
                    };

                    let last_updated = dept
                        .meta_data
                        .as_ref()
                        .map(|m| m.last_updated_time)
                        .unwrap_or_else(Utc::now);

                    changes.push(ChangeRecord {
                        entity_type: EntityType::Department,
                        entity_id,
                        quickbooks_id: Some(qb_id.clone()),
                        last_modified_at: last_updated,
                        last_synced_at,
                        sync_status: SyncStatus::RemoteChanged,
                        sync_token: dept.sync_token,
                    });
                }

                Ok(changes)
            }
        }
    }

    /// Update sync metadata after successful sync
    pub async fn update_sync_metadata(
        db: &DatabaseConnection,
        entity_type: EntityType,
        sync_time: DateTime<Utc>,
        _sync_token: Option<String>,
    ) -> Result<()> {
        use crate::models::intuit_connection::ActiveModel;
        use sea_orm::{ActiveModelTrait, Set};

        // Get the active connection
        let connection = IntuitConnectionEntity::find()
            .filter(IntuitConnectionColumn::IsActive.eq(true))
            .filter(IntuitConnectionColumn::DeletedAt.is_null())
            .one(db)
            .await?
            .context("No active Intuit connection found")?;

        // Update the appropriate timestamp
        let mut active_model: ActiveModel = connection.into();

        match entity_type {
            EntityType::Employee => {
                active_model.last_employee_sync_at = Set(Some(sync_time.into()));
                // Note: We're not tracking individual entity sync tokens in intuit_connection
                // Those are tracked per-entity in the users/departments tables
            }
            EntityType::Department => {
                active_model.last_department_sync_at = Set(Some(sync_time.into()));
            }
        }

        active_model.updated_at = Set(Utc::now().into());
        active_model.update(db).await?;

        Ok(())
    }

    /// Calculate optimal time window for incremental sync
    ///
    /// Returns a timestamp to use for "changed since" queries.
    /// We subtract a small buffer (5 minutes) to account for clock skew and in-flight changes.
    pub fn calculate_since_timestamp(last_sync_at: DateTime<Utc>) -> DateTime<Utc> {
        last_sync_at - Duration::minutes(5)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_check_incremental_viability_no_previous_sync() {
        let (should_use, reason) = IncrementalSyncService::check_incremental_viability(None, None);
        assert!(!should_use);
        assert!(reason.contains("No previous sync"));
    }

    #[test]
    fn test_check_incremental_viability_too_old() {
        let old_sync = Utc::now() - Duration::days(10);
        let (should_use, reason) =
            IncrementalSyncService::check_incremental_viability(Some(old_sync), Some("token123"));
        assert!(!should_use);
        assert!(reason.contains("days ago"));
    }

    #[test]
    fn test_check_incremental_viability_valid() {
        let recent_sync = Utc::now() - Duration::hours(2);
        let (should_use, reason) = IncrementalSyncService::check_incremental_viability(
            Some(recent_sync),
            Some("token123"),
        );
        assert!(should_use);
        assert!(reason.contains("All conditions met"));
    }

    #[test]
    fn test_calculate_since_timestamp() {
        let last_sync = Utc::now();
        let since = IncrementalSyncService::calculate_since_timestamp(last_sync);

        // Should be 5 minutes before last sync
        let diff = (last_sync - since).num_minutes();
        assert_eq!(diff, 5);
    }

    #[test]
    fn test_sync_mode_as_str() {
        assert_eq!(SyncMode::Full.as_str(), "full");
        assert_eq!(SyncMode::Incremental.as_str(), "incremental");
        assert_eq!(SyncMode::Auto.as_str(), "auto");
    }
}
