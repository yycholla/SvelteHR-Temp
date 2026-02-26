//! Sync tracking service for detecting and managing QuickBooks synchronization state
//!
//! This service provides change detection functionality for bidirectional sync
//! between the HR system and QuickBooks Online.

use anyhow::{Context, Result};
use chrono::{DateTime, Utc};
use sea_orm::sea_query::Expr;
use sea_orm::*;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::models::department::{Column as DepartmentColumn, Entity as DepartmentEntity};
use crate::models::user::{Column as UserColumn, Entity as UserEntity};

/// Entity type for sync operations
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum EntityType {
    Employee,
    Department,
}

/// Sync status enum matching database values
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum SyncStatus {
    /// Record is in sync with QuickBooks
    Synced,
    /// Record changed locally since last sync
    LocalChanged,
    /// Record changed in QuickBooks since last sync
    RemoteChanged,
    /// Record changed on both sides (conflict)
    Conflict,
    /// Error occurred during last sync attempt
    Error,
}

impl SyncStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            SyncStatus::Synced => "synced",
            SyncStatus::LocalChanged => "local_changed",
            SyncStatus::RemoteChanged => "remote_changed",
            SyncStatus::Conflict => "conflict",
            SyncStatus::Error => "error",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "synced" => Some(SyncStatus::Synced),
            "local_changed" => Some(SyncStatus::LocalChanged),
            "remote_changed" => Some(SyncStatus::RemoteChanged),
            "conflict" => Some(SyncStatus::Conflict),
            "error" => Some(SyncStatus::Error),
            _ => None,
        }
    }
}

/// Record that has changed locally or remotely
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChangeRecord {
    pub entity_type: EntityType,
    pub entity_id: String,
    pub quickbooks_id: Option<String>,
    pub last_modified_at: DateTime<Utc>,
    pub last_synced_at: Option<DateTime<Utc>>,
    pub sync_status: SyncStatus,
    pub sync_token: Option<String>,
}

/// Service for tracking and detecting synchronization changes
pub struct SyncTracker;

impl SyncTracker {
    /// Detect records that changed locally since last sync
    ///
    /// Returns records where:
    /// - last_modified_at > last_synced_at, OR
    /// - sync_status != 'synced'
    pub async fn get_local_changes(
        db: &DatabaseConnection,
        entity_type: EntityType,
    ) -> Result<Vec<ChangeRecord>> {
        match entity_type {
            EntityType::Employee => Self::get_local_employee_changes(db).await,
            EntityType::Department => Self::get_local_department_changes(db).await,
        }
    }

    async fn get_local_employee_changes(db: &DatabaseConnection) -> Result<Vec<ChangeRecord>> {
        let users = UserEntity::find()
            .filter(
                Condition::any()
                    // Never synced (no last_synced_at)
                    .add(UserColumn::LastSyncedAt.is_null())
                    // Modified after last sync
                    .add(
                        Condition::all()
                            .add(UserColumn::LastSyncedAt.is_not_null())
                            .add(
                                Expr::col(UserColumn::LastModifiedAt)
                                    .gt(Expr::col(UserColumn::LastSyncedAt)),
                            ),
                    )
                    // Status indicates local change
                    .add(UserColumn::SyncStatus.ne("synced")),
            )
            .filter(UserColumn::DeletedAt.is_null())
            .all(db)
            .await
            .context("Failed to query local employee changes")?;

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

    async fn get_local_department_changes(db: &DatabaseConnection) -> Result<Vec<ChangeRecord>> {
        let departments = DepartmentEntity::find()
            .filter(
                Condition::any()
                    // Never synced (no last_synced_at)
                    .add(DepartmentColumn::LastSyncedAt.is_null())
                    // Modified after last sync
                    .add(
                        Condition::all()
                            .add(DepartmentColumn::LastSyncedAt.is_not_null())
                            .add(
                                Expr::col(DepartmentColumn::LastModifiedAt)
                                    .gt(Expr::col(DepartmentColumn::LastSyncedAt)),
                            ),
                    )
                    // Status indicates local change
                    .add(DepartmentColumn::SyncStatus.ne("synced")),
            )
            .filter(DepartmentColumn::DeletedAt.is_null())
            .all(db)
            .await
            .context("Failed to query local department changes")?;

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

    /// Get remote changes by querying QuickBooks API
    ///
    /// This is the high-level method that fetches data from QuickBooks
    /// and detects which records have changed remotely.
    pub async fn get_remote_changes(
        client: &crate::integrations::intuit::IntuitClient,
        db: &DatabaseConnection,
        entity_type: EntityType,
    ) -> Result<Vec<ChangeRecord>> {
        use crate::integrations::intuit::{Department, EmployeeExtended};

        match entity_type {
            EntityType::Employee => {
                // Query all employees from QuickBooks
                let qb_employees: Vec<EmployeeExtended> = client
                    .list_employees()
                    .await
                    .context("Failed to query QuickBooks employees")?;

                // Convert to QuickBooksRecord format
                // Extract actual last_updated_time from MetaData
                let qb_records: Vec<QuickBooksRecord> = qb_employees
                    .into_iter()
                    .filter_map(|emp| {
                        // Only include employees with ID and SyncToken
                        if let (Some(id), Some(sync_token)) =
                            (emp.base.id.clone(), emp.base.sync_token.clone())
                        {
                            // Extract last_updated_time from MetaData
                            // If MetaData is not available, use current time as fallback
                            let last_updated_time = emp
                                .base
                                .meta_data
                                .as_ref()
                                .map(|meta| meta.last_updated_time)
                                .unwrap_or_else(Utc::now);

                            return Some(QuickBooksRecord {
                                id,
                                sync_token,
                                last_updated_time,
                            });
                        }
                        None
                    })
                    .collect();

                Self::detect_remote_changes(db, entity_type, qb_records).await
            }
            EntityType::Department => {
                // Query all departments from QuickBooks
                let qb_departments: Vec<Department> = client
                    .query_departments()
                    .await
                    .context("Failed to query QuickBooks departments")?;

                // Convert to QuickBooksRecord format
                // Extract actual last_updated_time from MetaData
                let qb_records: Vec<QuickBooksRecord> = qb_departments
                    .into_iter()
                    .filter_map(|dept| {
                        // Only include departments with ID and SyncToken
                        if let (Some(id), Some(sync_token)) =
                            (dept.id.clone(), dept.sync_token.clone())
                        {
                            // Extract last_updated_time from MetaData
                            // If MetaData is not available, use current time as fallback
                            let last_updated_time = dept
                                .meta_data
                                .as_ref()
                                .map(|meta| meta.last_updated_time)
                                .unwrap_or_else(Utc::now);

                            return Some(QuickBooksRecord {
                                id,
                                sync_token,
                                last_updated_time,
                            });
                        }
                        None
                    })
                    .collect();

                Self::detect_remote_changes(db, entity_type, qb_records).await
            }
        }
    }

    /// Detect records that changed in QuickBooks since last sync
    ///
    /// Note: This requires querying QuickBooks API with metadata timestamps.
    /// The actual implementation would fetch QB records and compare LastUpdatedTime
    /// with local last_synced_at.
    ///
    /// For now, this is a placeholder that would be called from sync orchestrator
    /// with QuickBooks data.
    pub async fn detect_remote_changes(
        db: &DatabaseConnection,
        entity_type: EntityType,
        qb_records: Vec<QuickBooksRecord>,
    ) -> Result<Vec<ChangeRecord>> {
        let mut changes = Vec::new();

        for qb_record in qb_records {
            // Find corresponding local record and get both last_synced and entity_id
            let (local_last_synced, local_entity_id) = match entity_type {
                EntityType::Employee => Self::get_employee_sync_info(db, &qb_record.id).await?,
                EntityType::Department => Self::get_department_sync_info(db, &qb_record.id).await?,
            };

            // Check if QB record is newer than last sync
            if let Some(last_synced) = local_last_synced {
                if qb_record.last_updated_time > last_synced {
                    changes.push(ChangeRecord {
                        entity_type,
                        entity_id: local_entity_id.unwrap_or_default(),
                        quickbooks_id: Some(qb_record.id.clone()),
                        last_modified_at: qb_record.last_updated_time,
                        last_synced_at: Some(last_synced),
                        sync_status: SyncStatus::RemoteChanged,
                        sync_token: Some(qb_record.sync_token),
                    });
                }
            } else {
                // No local record exists - this is a new QB record
                changes.push(ChangeRecord {
                    entity_type,
                    entity_id: local_entity_id.unwrap_or_default(),
                    quickbooks_id: Some(qb_record.id.clone()),
                    last_modified_at: qb_record.last_updated_time,
                    last_synced_at: None,
                    sync_status: SyncStatus::RemoteChanged,
                    sync_token: Some(qb_record.sync_token),
                });
            }
        }

        Ok(changes)
    }

    async fn get_employee_sync_info(
        db: &DatabaseConnection,
        qb_id: &str,
    ) -> Result<(Option<DateTime<Utc>>, Option<String>)> {
        let user = UserEntity::find()
            .filter(UserColumn::IntuitEmployeeId.eq(qb_id))
            .filter(UserColumn::DeletedAt.is_null())
            .one(db)
            .await?;

        Ok(match user {
            Some(u) => (u.last_synced_at, Some(u.id.to_string())),
            None => (None, None),
        })
    }

    async fn get_department_sync_info(
        db: &DatabaseConnection,
        qb_id: &str,
    ) -> Result<(Option<DateTime<Utc>>, Option<String>)> {
        let dept = DepartmentEntity::find()
            .filter(DepartmentColumn::IntuitDepartmentId.eq(qb_id))
            .filter(DepartmentColumn::DeletedAt.is_null())
            .one(db)
            .await?;

        Ok(match dept {
            Some(d) => (d.last_synced_at, Some(d.id.to_string())),
            None => (None, None),
        })
    }

    /// Mark a record as successfully synced
    pub async fn mark_synced(
        db: &DatabaseConnection,
        entity_type: EntityType,
        entity_id: &str,
        sync_token: Option<String>,
    ) -> Result<()> {
        let now = Utc::now();

        match entity_type {
            EntityType::Employee => {
                let uuid_id = entity_id.parse::<Uuid>().context("Invalid employee UUID")?;
                UserEntity::update_many()
                    .col_expr(UserColumn::LastSyncedAt, Expr::value(now))
                    .col_expr(UserColumn::SyncStatus, Expr::value("synced"))
                    .col_expr(UserColumn::QuickbooksSyncToken, Expr::value(sync_token))
                    .filter(UserColumn::Id.eq(uuid_id))
                    .exec(db)
                    .await?;
            }
            EntityType::Department => {
                let uuid_id = entity_id
                    .parse::<Uuid>()
                    .context("Invalid department UUID")?;
                DepartmentEntity::update_many()
                    .col_expr(DepartmentColumn::LastSyncedAt, Expr::value(now))
                    .col_expr(DepartmentColumn::SyncStatus, Expr::value("synced"))
                    .col_expr(
                        DepartmentColumn::QuickbooksSyncToken,
                        Expr::value(sync_token),
                    )
                    .filter(DepartmentColumn::Id.eq(uuid_id))
                    .exec(db)
                    .await?;
            }
        }

        Ok(())
    }

    /// Mark a record with conflict status
    pub async fn mark_conflict(
        db: &DatabaseConnection,
        entity_type: EntityType,
        entity_id: &str,
    ) -> Result<()> {
        match entity_type {
            EntityType::Employee => {
                let uuid_id = entity_id.parse::<Uuid>().context("Invalid employee UUID")?;
                UserEntity::update_many()
                    .col_expr(UserColumn::SyncStatus, Expr::value("conflict"))
                    .filter(UserColumn::Id.eq(uuid_id))
                    .exec(db)
                    .await?;
            }
            EntityType::Department => {
                let uuid_id = entity_id
                    .parse::<Uuid>()
                    .context("Invalid department UUID")?;
                DepartmentEntity::update_many()
                    .col_expr(DepartmentColumn::SyncStatus, Expr::value("conflict"))
                    .filter(DepartmentColumn::Id.eq(uuid_id))
                    .exec(db)
                    .await?;
            }
        }

        Ok(())
    }

    /// Mark a record with error status
    pub async fn mark_error(
        db: &DatabaseConnection,
        entity_type: EntityType,
        entity_id: &str,
    ) -> Result<()> {
        match entity_type {
            EntityType::Employee => {
                let uuid_id = entity_id.parse::<Uuid>().context("Invalid employee UUID")?;
                UserEntity::update_many()
                    .col_expr(UserColumn::SyncStatus, Expr::value("error"))
                    .filter(UserColumn::Id.eq(uuid_id))
                    .exec(db)
                    .await?;
            }
            EntityType::Department => {
                let uuid_id = entity_id
                    .parse::<Uuid>()
                    .context("Invalid department UUID")?;
                DepartmentEntity::update_many()
                    .col_expr(DepartmentColumn::SyncStatus, Expr::value("error"))
                    .filter(DepartmentColumn::Id.eq(uuid_id))
                    .exec(db)
                    .await?;
            }
        }

        Ok(())
    }

    /// Get count of records by sync status
    pub async fn get_sync_status_counts(
        db: &DatabaseConnection,
        entity_type: EntityType,
    ) -> Result<SyncStatusCounts> {
        match entity_type {
            EntityType::Employee => Self::get_employee_status_counts(db).await,
            EntityType::Department => Self::get_department_status_counts(db).await,
        }
    }

    async fn get_employee_status_counts(db: &DatabaseConnection) -> Result<SyncStatusCounts> {
        let synced = UserEntity::find()
            .filter(UserColumn::SyncStatus.eq("synced"))
            .filter(UserColumn::DeletedAt.is_null())
            .count(db)
            .await?;

        let local_changed = UserEntity::find()
            .filter(UserColumn::SyncStatus.eq("local_changed"))
            .filter(UserColumn::DeletedAt.is_null())
            .count(db)
            .await?;

        let remote_changed = UserEntity::find()
            .filter(UserColumn::SyncStatus.eq("remote_changed"))
            .filter(UserColumn::DeletedAt.is_null())
            .count(db)
            .await?;

        let conflicts = UserEntity::find()
            .filter(UserColumn::SyncStatus.eq("conflict"))
            .filter(UserColumn::DeletedAt.is_null())
            .count(db)
            .await?;

        let errors = UserEntity::find()
            .filter(UserColumn::SyncStatus.eq("error"))
            .filter(UserColumn::DeletedAt.is_null())
            .count(db)
            .await?;

        Ok(SyncStatusCounts {
            synced,
            local_changed,
            remote_changed,
            conflicts,
            errors,
        })
    }

    async fn get_department_status_counts(db: &DatabaseConnection) -> Result<SyncStatusCounts> {
        let synced = DepartmentEntity::find()
            .filter(DepartmentColumn::SyncStatus.eq("synced"))
            .filter(DepartmentColumn::DeletedAt.is_null())
            .count(db)
            .await?;

        let local_changed = DepartmentEntity::find()
            .filter(DepartmentColumn::SyncStatus.eq("local_changed"))
            .filter(DepartmentColumn::DeletedAt.is_null())
            .count(db)
            .await?;

        let remote_changed = DepartmentEntity::find()
            .filter(DepartmentColumn::SyncStatus.eq("remote_changed"))
            .filter(DepartmentColumn::DeletedAt.is_null())
            .count(db)
            .await?;

        let conflicts = DepartmentEntity::find()
            .filter(DepartmentColumn::SyncStatus.eq("conflict"))
            .filter(DepartmentColumn::DeletedAt.is_null())
            .count(db)
            .await?;

        let errors = DepartmentEntity::find()
            .filter(DepartmentColumn::SyncStatus.eq("error"))
            .filter(DepartmentColumn::DeletedAt.is_null())
            .count(db)
            .await?;

        Ok(SyncStatusCounts {
            synced,
            local_changed,
            remote_changed,
            conflicts,
            errors,
        })
    }
}

/// Counts of records by sync status
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncStatusCounts {
    pub synced: u64,
    pub local_changed: u64,
    pub remote_changed: u64,
    pub conflicts: u64,
    pub errors: u64,
}

/// QuickBooks record metadata for change detection
#[derive(Debug, Clone)]
pub struct QuickBooksRecord {
    pub id: String,
    pub sync_token: String,
    pub last_updated_time: DateTime<Utc>,
}
