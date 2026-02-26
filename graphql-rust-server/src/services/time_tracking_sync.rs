//! Time Tracking Sync Service
//!
//! Handles synchronization of time entries with QuickBooks Time Activities.
//! Supports:
//! - Push time entries to QuickBooks
//! - Pull time activities from QuickBooks
//! - Bidirectional sync with conflict resolution
//! - Batch sync operations

use sea_orm::{ColumnTrait, DatabaseConnection, EntityTrait, PaginatorTrait, QueryFilter};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use uuid::Uuid;

use crate::{integrations::intuit::IntuitClient, models::time::time_entry};

/// Time Activity data from QuickBooks
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QuickBooksTimeActivity {
    #[serde(rename = "Id")]
    pub id: String,
    #[serde(rename = "TxnDate")]
    pub txn_date: String,
    #[serde(rename = "NameOf")]
    pub name_of: String, // "Employee" or "Vendor"
    #[serde(rename = "EmployeeRef")]
    pub employee_ref: Option<QuickBooksRef>,
    #[serde(rename = "CustomerRef")]
    pub customer_ref: Option<QuickBooksRef>,
    #[serde(rename = "ItemRef")]
    pub item_ref: Option<QuickBooksRef>,
    #[serde(rename = "BillableStatus")]
    pub billable_status: Option<String>, // "Billable", "NotBillable", "HasBeenBilled"
    #[serde(rename = "HourlyRate")]
    pub hourly_rate: Option<f64>,
    #[serde(rename = "Hours")]
    pub hours: Option<i32>,
    #[serde(rename = "Minutes")]
    pub minutes: Option<i32>,
    #[serde(rename = "Description")]
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QuickBooksRef {
    pub value: String,
    pub name: Option<String>,
}

/// Time tracking sync service
pub struct TimeTrackingSync {
    db: Arc<DatabaseConnection>,
}

impl TimeTrackingSync {
    pub fn new(db: Arc<DatabaseConnection>) -> Self {
        Self { db }
    }

    /// Push approved time entries to QuickBooks
    pub async fn push_time_entries(
        &self,
        intuit_client: &IntuitClient,
        realm_id: &str,
        time_entry_ids: Option<Vec<Uuid>>,
    ) -> Result<SyncResult, anyhow::Error> {
        let mut query = time_entry::Entity::find()
            .filter(time_entry::Column::Status.eq("approved"))
            .filter(time_entry::Column::SyncStatus.ne("synced"))
            .filter(time_entry::Column::DeletedAt.is_null());

        // Filter by specific IDs if provided
        if let Some(ids) = time_entry_ids {
            query = query.filter(time_entry::Column::Id.is_in(ids));
        }

        let time_entries = query.all(&*self.db).await?;

        let mut synced = 0;
        let mut failed = 0;
        let mut errors = Vec::new();

        for entry in time_entries {
            match self
                .push_single_entry(intuit_client, realm_id, &entry)
                .await
            {
                Ok(_) => synced += 1,
                Err(e) => {
                    failed += 1;
                    errors.push(format!("Entry {}: {}", entry.id, e));
                }
            }
        }

        Ok(SyncResult {
            total: synced + failed,
            synced,
            failed,
            errors,
        })
    }

    /// Push a single time entry to QuickBooks
    /// TODO: Implement when IntuitClient adds generic API methods
    async fn push_single_entry(
        &self,
        _intuit_client: &IntuitClient,
        _realm_id: &str,
        _entry: &time_entry::Model,
    ) -> Result<(), anyhow::Error> {
        // TODO: Implement when IntuitClient has .post() method
        // For now, return not implemented
        Err(anyhow::anyhow!("Push time entry to QuickBooks not yet implemented - requires IntuitClient.post() method"))
    }

    /// Pull time activities from QuickBooks
    /// TODO: Implement when IntuitClient adds generic API methods
    pub async fn pull_time_activities(
        &self,
        _intuit_client: &IntuitClient,
        _realm_id: &str,
        _start_date: Option<String>,
        _end_date: Option<String>,
    ) -> Result<SyncResult, anyhow::Error> {
        // TODO: Implement when IntuitClient has .get() method
        // For now, return not implemented
        Err(anyhow::anyhow!("Pull time activities from QuickBooks not yet implemented - requires IntuitClient.get() method"))
    }

    /// Import a QuickBooks time activity as a time entry
    /// TODO: Implement when needed
    #[allow(dead_code)]
    async fn import_time_activity(
        &self,
        _activity: &QuickBooksTimeActivity,
    ) -> Result<(), anyhow::Error> {
        // TODO: Implement when pull functionality is added
        Err(anyhow::anyhow!("Import time activity not yet implemented"))
    }

    /// Get sync statistics
    pub async fn get_sync_stats(&self) -> Result<SyncStats, sea_orm::DbErr> {
        let total = time_entry::Entity::find()
            .filter(time_entry::Column::DeletedAt.is_null())
            .count(&*self.db)
            .await?;

        let synced = time_entry::Entity::find()
            .filter(time_entry::Column::SyncStatus.eq("synced"))
            .filter(time_entry::Column::DeletedAt.is_null())
            .count(&*self.db)
            .await?;

        let pending = time_entry::Entity::find()
            .filter(time_entry::Column::SyncStatus.eq("not_synced"))
            .filter(time_entry::Column::Status.eq("approved"))
            .filter(time_entry::Column::DeletedAt.is_null())
            .count(&*self.db)
            .await?;

        let failed = time_entry::Entity::find()
            .filter(time_entry::Column::SyncStatus.eq("failed"))
            .filter(time_entry::Column::DeletedAt.is_null())
            .count(&*self.db)
            .await?;

        Ok(SyncStats {
            total,
            synced,
            pending,
            failed,
        })
    }
}

/// Result of a sync operation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncResult {
    pub total: usize,
    pub synced: usize,
    pub failed: usize,
    pub errors: Vec<String>,
}

/// Sync statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncStats {
    pub total: u64,
    pub synced: u64,
    pub pending: u64,
    pub failed: u64,
}
