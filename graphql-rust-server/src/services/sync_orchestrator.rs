//! Bidirectional Sync Orchestrator
//!
//! Coordinates two-way synchronization between local database and QuickBooks Online,
//! handling change detection, conflict identification, and resolution.

use anyhow::{Context as AnyhowContext, Result};
use chrono::{DateTime, Utc};
use sea_orm::{
    ActiveModelTrait, ColumnTrait, DatabaseConnection, EntityTrait, PaginatorTrait, QueryFilter,
    Set,
};
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::sync::Arc;
use uuid::Uuid;

use super::{
    conflict_resolver::{ConflictRecord, ConflictResolver, ConflictStrategy},
    health_monitor::HealthMonitor,
    incremental_sync::{IncrementalSyncService, SyncMode},
    sync_tracker::{ChangeRecord, EntityType, SyncTracker},
    validation_engine::{SyncContext, ValidationEngine},
};
use crate::integrations::intuit::{Department, Email, Employee, EmployeeExtended, IntuitClient};
use crate::models::{department, user};

/// Result of a sync operation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncResult {
    pub entity_id: String,
    pub success: bool,
    pub error_message: Option<String>,
}

/// Comprehensive report of a bidirectional sync operation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncReport {
    pub pushed_count: usize,
    pub pulled_count: usize,
    pub updated_count: usize,
    pub skipped_count: usize,
    pub conflicts_resolved: usize,
    pub errors: Vec<SyncError>,
    pub started_at: DateTime<Utc>,
    pub completed_at: DateTime<Utc>,
    // Incremental sync metadata (Feature 3)
    pub sync_mode: String,
    pub changes_detected: usize,
    pub changes_processed: usize,
}

/// Detailed error information for sync operations
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncError {
    pub entity_type: String,
    pub entity_id: Option<String>,
    pub quickbooks_id: Option<String>,
    pub error_message: String,
    pub error_code: Option<String>,
    pub is_retryable: bool,
}

/// Orchestrates bidirectional synchronization
pub struct SyncOrchestrator;

impl SyncOrchestrator {
    /// Intelligent sync that automatically chooses between full and incremental mode (Feature 3)
    ///
    /// Decision logic:
    /// - Auto mode: Let IncrementalSyncService decide based on conditions
    /// - Full mode: Force full sync regardless of conditions
    /// - Incremental mode: Force incremental sync (fallback to full if not viable)
    pub async fn sync_bidirectional_intelligent(
        db: &DatabaseConnection,
        client: &IntuitClient,
        entity_type: EntityType,
        strategy: ConflictStrategy,
        requested_mode: SyncMode,
    ) -> Result<SyncReport> {
        let started_at = Utc::now();

        // Decide sync mode
        let decision = IncrementalSyncService::decide_sync_mode(db, entity_type, requested_mode)
            .await
            .context("Failed to decide sync mode")?;

        tracing::info!(
            "Sync mode decision for {:?}: {} - {}",
            entity_type,
            decision.sync_mode.as_str(),
            decision.reason
        );

        // Execute appropriate sync
        let mut report = match decision.sync_mode {
            SyncMode::Incremental => {
                // Try incremental sync first
                match Self::sync_bidirectional_incremental(
                    db,
                    client,
                    entity_type,
                    strategy,
                    &decision.metadata,
                )
                .await
                {
                    Ok(report) => report,
                    Err(e) => {
                        tracing::warn!("Incremental sync failed, falling back to full sync: {}", e);
                        // Fallback to full sync - now properly awaited
                        match Self::sync_bidirectional(db, client, entity_type, strategy).await {
                            Ok(report) => report,
                            Err(full_error) => {
                                // Both failed - return error report
                                SyncReport {
                                    pushed_count: 0,
                                    pulled_count: 0,
                                    updated_count: 0,
                                    skipped_count: 0,
                                    conflicts_resolved: 0,
                                    errors: vec![SyncError {
                                        entity_type: format!("{:?}", entity_type),
                                        entity_id: None,
                                        quickbooks_id: None,
                                        error_message: format!(
                                            "Both incremental and full sync failed: {}",
                                            full_error
                                        ),
                                        error_code: Some("SYNC_FAILED".to_string()),
                                        is_retryable: true,
                                    }],
                                    started_at,
                                    completed_at: Utc::now(),
                                    sync_mode: "full_fallback".to_string(),
                                    changes_detected: 0,
                                    changes_processed: 0,
                                }
                            }
                        }
                    }
                }
            }
            SyncMode::Full | SyncMode::Auto => {
                Self::sync_bidirectional(db, client, entity_type, strategy).await?
            }
        };

        // Update sync metadata if successful
        if report.errors.is_empty() || report.pushed_count > 0 || report.pulled_count > 0 {
            let sync_time = report.completed_at;
            if let Err(e) =
                IncrementalSyncService::update_sync_metadata(db, entity_type, sync_time, None).await
            {
                tracing::warn!("Failed to update sync metadata: {}", e);
            }
        }

        // Ensure sync_mode is set
        if report.sync_mode.is_empty() {
            report.sync_mode = decision.sync_mode.as_str().to_string();
        }

        Ok(report)
    }

    /// Incremental bidirectional sync (Feature 3)
    ///
    /// Only syncs entities that have changed since last sync
    async fn sync_bidirectional_incremental(
        db: &DatabaseConnection,
        client: &IntuitClient,
        entity_type: EntityType,
        strategy: ConflictStrategy,
        metadata: &super::incremental_sync::SyncMetadata,
    ) -> Result<SyncReport> {
        let started_at = Utc::now();
        let mut errors = Vec::new();
        let mut pushed_count = 0;
        let mut pulled_count = 0;
        let updated_count = 0;
        let skipped_count = 0;
        let mut conflicts_resolved = 0;

        // Get last sync timestamp with buffer for clock skew
        let since = metadata
            .last_sync_at
            .ok_or_else(|| anyhow::anyhow!("No last sync timestamp for incremental sync"))?;
        let since_with_buffer = IncrementalSyncService::calculate_since_timestamp(since);

        tracing::info!(
            "Incremental sync for {:?} since {} (with 5min buffer: {})",
            entity_type,
            since,
            since_with_buffer
        );

        // 1. Detect incremental local changes
        let local_changes = IncrementalSyncService::get_incremental_local_changes(
            db,
            entity_type,
            since_with_buffer,
        )
        .await
        .context("Failed to detect incremental local changes")?;

        tracing::info!(
            "Detected {} incremental local changes for {:?}",
            local_changes.len(),
            entity_type
        );

        // 2. Detect incremental remote changes
        let remote_changes = IncrementalSyncService::get_incremental_remote_changes(
            client,
            db,
            entity_type,
            since_with_buffer,
        )
        .await
        .context("Failed to detect incremental remote changes")?;

        tracing::info!(
            "Detected {} incremental remote changes for {:?}",
            remote_changes.len(),
            entity_type
        );

        let changes_detected = local_changes.len() + remote_changes.len();

        // 3. Identify conflicts
        let conflicts = Self::identify_conflicts(&local_changes, &remote_changes);

        tracing::info!(
            "Identified {} conflicts for {:?}",
            conflicts.len(),
            entity_type
        );

        // 4. Apply conflict resolution strategy
        let (resolved_local, resolved_remote) =
            match ConflictResolver::resolve(db, conflicts.clone(), strategy).await {
                Ok((local, remote)) => {
                    conflicts_resolved = conflicts.len();
                    (local, remote)
                }
                Err(e) => {
                    for conflict in &conflicts {
                        errors.push(SyncError {
                            entity_type: format!("{:?}", entity_type),
                            entity_id: Some(conflict.entity_id.clone()),
                            quickbooks_id: conflict.quickbooks_id.clone(),
                            error_message: format!("Conflict requires manual review: {}", e),
                            error_code: Some("CONFLICT_MANUAL_REVIEW".to_string()),
                            is_retryable: false,
                        });
                    }
                    (Vec::new(), Vec::new())
                }
            };

        // 5. Separate conflicting IDs from change lists
        let conflict_ids: HashSet<String> = conflicts.iter().map(|c| c.entity_id.clone()).collect();

        let local_to_push: Vec<ChangeRecord> = local_changes
            .into_iter()
            .filter(|c| !conflict_ids.contains(&c.entity_id))
            .chain(resolved_local)
            .collect();

        let remote_to_pull: Vec<ChangeRecord> = remote_changes
            .into_iter()
            .filter(|c| !conflict_ids.contains(&c.entity_id))
            .chain(resolved_remote)
            .collect();

        // 6. Push local changes
        let push_results = Self::push_changes(client, db, entity_type, &local_to_push).await;
        for result in &push_results {
            if result.success {
                pushed_count += 1;
            } else {
                errors.push(SyncError {
                    entity_type: format!("{:?}", entity_type),
                    entity_id: Some(result.entity_id.clone()),
                    quickbooks_id: None,
                    error_message: result.error_message.clone().unwrap_or_default(),
                    error_code: None,
                    is_retryable: true,
                });
            }
        }

        // 7. Pull remote changes
        let pull_results = Self::pull_changes(client, db, entity_type, &remote_to_pull).await;
        for result in &pull_results {
            if result.success {
                pulled_count += 1;
            } else {
                errors.push(SyncError {
                    entity_type: format!("{:?}", entity_type),
                    entity_id: Some(result.entity_id.clone()),
                    quickbooks_id: None,
                    error_message: result.error_message.clone().unwrap_or_default(),
                    error_code: None,
                    is_retryable: true,
                });
            }
        }

        // 8. Mark successfully synced records
        for result in push_results.iter().chain(pull_results.iter()) {
            if result.success {
                if let Err(e) =
                    SyncTracker::mark_synced(db, entity_type, &result.entity_id, None).await
                {
                    errors.push(SyncError {
                        entity_type: format!("{:?}", entity_type),
                        entity_id: Some(result.entity_id.clone()),
                        quickbooks_id: None,
                        error_message: format!("Failed to mark as synced: {}", e),
                        error_code: None,
                        is_retryable: true,
                    });
                }
            }
        }

        let completed_at = Utc::now();
        let changes_processed = pushed_count + pulled_count;

        tracing::info!(
            "Incremental sync completed for {:?}: {} changes detected, {} processed (pushed={}, pulled={}), {} conflicts, {} errors",
            entity_type,
            changes_detected,
            changes_processed,
            pushed_count,
            pulled_count,
            conflicts_resolved,
            errors.len()
        );

        let report = SyncReport {
            pushed_count,
            pulled_count,
            updated_count,
            skipped_count,
            conflicts_resolved,
            errors: errors.clone(),
            started_at,
            completed_at,
            sync_mode: "incremental".to_string(),
            changes_detected,
            changes_processed,
        };

        // Record health metrics
        Self::record_health_metrics(db, &report, entity_type).await;

        Ok(report)
    }

    /// Check if this is the first sync for this entity type
    ///
    /// Returns true if:
    /// - No records have been synced (last_synced_at is NULL)
    /// - No records have QuickBooks IDs
    async fn is_first_sync(db: &DatabaseConnection, entity_type: EntityType) -> Result<bool> {
        match entity_type {
            EntityType::Employee => {
                // Check if any users have been synced
                let synced_count = user::Entity::find()
                    .filter(user::Column::LastSyncedAt.is_not_null())
                    .count(db)
                    .await?;

                let with_qb_id_count = user::Entity::find()
                    .filter(user::Column::IntuitEmployeeId.is_not_null())
                    .count(db)
                    .await?;

                Ok(synced_count == 0 && with_qb_id_count == 0)
            }
            EntityType::Department => {
                // Check if any departments have been synced
                let synced_count = department::Entity::find()
                    .filter(department::Column::LastSyncedAt.is_not_null())
                    .count(db)
                    .await?;

                let with_qb_id_count = department::Entity::find()
                    .filter(department::Column::IntuitDepartmentId.is_not_null())
                    .count(db)
                    .await?;

                Ok(synced_count == 0 && with_qb_id_count == 0)
            }
        }
    }

    /// Main two-way sync function with contextual sync order
    ///
    /// Coordinates the complete bidirectional sync process:
    /// - On first sync: Pull from QuickBooks FIRST, then push local changes
    /// - On subsequent syncs: Bidirectional sync with conflict detection
    ///
    /// Steps:
    /// 1. Detect if first sync
    /// 2. Detect changes on both sides
    /// 3. Identify conflicts
    /// 4. Resolve conflicts using strategy
    /// 5. Execute sync in appropriate order (pull-first on first sync)
    /// 6. Update sync timestamps
    pub async fn sync_bidirectional(
        db: &DatabaseConnection,
        client: &IntuitClient,
        entity_type: EntityType,
        strategy: ConflictStrategy,
    ) -> Result<SyncReport> {
        let started_at = Utc::now();
        let mut errors = Vec::new();
        let mut pushed_count = 0;
        let mut pulled_count = 0;
        let updated_count = 0;
        let skipped_count = 0;
        let mut conflicts_resolved = 0;

        // Check if this is the first sync
        let is_first_sync = Self::is_first_sync(db, entity_type).await?;

        // 1. Detect local changes
        let local_changes = SyncTracker::get_local_changes(db, entity_type)
            .await
            .context("Failed to detect local changes")?;

        tracing::info!(
            "Detected {} local changes for {:?}",
            local_changes.len(),
            entity_type
        );

        // 2. Detect remote changes
        let remote_changes = SyncTracker::get_remote_changes(client, db, entity_type)
            .await
            .context("Failed to detect remote changes")?;

        tracing::info!(
            "Detected {} remote changes for {:?}",
            remote_changes.len(),
            entity_type
        );

        // 3. Identify conflicts (records changed on both sides)
        let conflicts = Self::identify_conflicts(&local_changes, &remote_changes);

        tracing::info!(
            "Identified {} conflicts for {:?}",
            conflicts.len(),
            entity_type
        );

        // 4. Apply conflict resolution strategy
        let (resolved_local, resolved_remote) =
            match ConflictResolver::resolve(db, conflicts.clone(), strategy).await {
                Ok((local, remote)) => {
                    conflicts_resolved = conflicts.len();
                    (local, remote)
                }
                Err(e) => {
                    // If conflict resolution fails (e.g., ManualReview required), log it
                    for conflict in &conflicts {
                        errors.push(SyncError {
                            entity_type: format!("{:?}", entity_type),
                            entity_id: Some(conflict.entity_id.clone()),
                            quickbooks_id: conflict.quickbooks_id.clone(),
                            error_message: format!("Conflict requires manual review: {}", e),
                            error_code: Some("CONFLICT_MANUAL_REVIEW".to_string()),
                            is_retryable: false,
                        });
                    }
                    // Continue with non-conflicting changes
                    (Vec::new(), Vec::new())
                }
            };

        // 5. Separate conflicting IDs from change lists
        let conflict_ids: HashSet<String> = conflicts.iter().map(|c| c.entity_id.clone()).collect();

        let local_to_push: Vec<ChangeRecord> = local_changes
            .into_iter()
            .filter(|c| !conflict_ids.contains(&c.entity_id))
            .chain(resolved_local)
            .collect();

        let remote_to_pull: Vec<ChangeRecord> = remote_changes
            .into_iter()
            .filter(|c| !conflict_ids.contains(&c.entity_id))
            .chain(resolved_remote)
            .collect();

        // 6 & 7. Execute sync in contextual order
        // On first sync: Pull FIRST to establish QuickBooks as source of truth
        // On subsequent syncs: Push first to send local changes, then pull updates
        let (push_results, pull_results) = if is_first_sync {
            // FIRST SYNC: Pull from QuickBooks first, then push any local-only records

            // 6a. Pull remote changes to local DB (FIRST)
            let pull_results = Self::pull_changes(client, db, entity_type, &remote_to_pull).await;
            for result in &pull_results {
                if result.success {
                    pulled_count += 1;
                } else {
                    errors.push(SyncError {
                        entity_type: format!("{:?}", entity_type),
                        entity_id: Some(result.entity_id.clone()),
                        quickbooks_id: None,
                        error_message: result.error_message.clone().unwrap_or_default(),
                        error_code: None,
                        is_retryable: true,
                    });
                }
            }

            // 6b. Push local changes to QuickBooks (SECOND)
            let push_results = Self::push_changes(client, db, entity_type, &local_to_push).await;
            for result in &push_results {
                if result.success {
                    pushed_count += 1;
                } else {
                    errors.push(SyncError {
                        entity_type: format!("{:?}", entity_type),
                        entity_id: Some(result.entity_id.clone()),
                        quickbooks_id: None,
                        error_message: result.error_message.clone().unwrap_or_default(),
                        error_code: None,
                        is_retryable: true,
                    });
                }
            }

            (push_results, pull_results)
        } else {
            // SUBSEQUENT SYNC: Normal bidirectional sync (push then pull)

            // 6. Push local changes to QuickBooks
            let push_results = Self::push_changes(client, db, entity_type, &local_to_push).await;
            for result in &push_results {
                if result.success {
                    pushed_count += 1;
                } else {
                    errors.push(SyncError {
                        entity_type: format!("{:?}", entity_type),
                        entity_id: Some(result.entity_id.clone()),
                        quickbooks_id: None,
                        error_message: result.error_message.clone().unwrap_or_default(),
                        error_code: None,
                        is_retryable: true,
                    });
                }
            }

            // 7. Pull remote changes to local DB
            let pull_results = Self::pull_changes(client, db, entity_type, &remote_to_pull).await;
            for result in &pull_results {
                if result.success {
                    pulled_count += 1;
                } else {
                    errors.push(SyncError {
                        entity_type: format!("{:?}", entity_type),
                        entity_id: Some(result.entity_id.clone()),
                        quickbooks_id: None,
                        error_message: result.error_message.clone().unwrap_or_default(),
                        error_code: None,
                        is_retryable: true,
                    });
                }
            }

            (push_results, pull_results)
        };

        // 8. Mark successfully synced records
        for result in push_results.iter().chain(pull_results.iter()) {
            if result.success {
                if let Err(e) = SyncTracker::mark_synced(
                    db,
                    entity_type,
                    &result.entity_id,
                    None, // sync_token will be updated separately if needed
                )
                .await
                {
                    errors.push(SyncError {
                        entity_type: format!("{:?}", entity_type),
                        entity_id: Some(result.entity_id.clone()),
                        quickbooks_id: None,
                        error_message: format!("Failed to mark as synced: {}", e),
                        error_code: None,
                        is_retryable: true,
                    });
                }
            }
        }

        let completed_at = Utc::now();

        // Record health metrics
        let report = SyncReport {
            pushed_count,
            pulled_count,
            updated_count,
            skipped_count,
            conflicts_resolved,
            errors: errors.clone(),
            started_at,
            completed_at,
            sync_mode: "full".to_string(),
            changes_detected: pushed_count + pulled_count,
            changes_processed: pushed_count + pulled_count,
        };

        Self::record_health_metrics(db, &report, entity_type).await;

        Ok(report)
    }

    /// Push local changes to QuickBooks only (one-way sync)
    ///
    /// Detects local changes and pushes them to QuickBooks without pulling remote changes.
    /// Useful for batch uploads or when you only want to sync local changes.
    pub async fn sync_push(
        db: &DatabaseConnection,
        client: &IntuitClient,
        entity_type: EntityType,
    ) -> Result<SyncReport> {
        let started_at = Utc::now();
        let mut errors = Vec::new();
        let mut pushed_count = 0;

        // Detect local changes
        let local_changes = SyncTracker::get_local_changes(db, entity_type)
            .await
            .context("Failed to detect local changes")?;

        tracing::info!(
            "Detected {} local changes to push for {:?}",
            local_changes.len(),
            entity_type
        );

        // Push local changes to QuickBooks
        let push_results = Self::push_changes(client, db, entity_type, &local_changes).await;
        for result in &push_results {
            if result.success {
                pushed_count += 1;
            } else {
                errors.push(SyncError {
                    entity_type: format!("{:?}", entity_type),
                    entity_id: Some(result.entity_id.clone()),
                    quickbooks_id: None,
                    error_message: result.error_message.clone().unwrap_or_default(),
                    error_code: None,
                    is_retryable: true,
                });
            }
        }

        let completed_at = Utc::now();

        Ok(SyncReport {
            pushed_count,
            pulled_count: 0,
            updated_count: 0,
            skipped_count: 0,
            conflicts_resolved: 0,
            errors,
            started_at,
            completed_at,
            sync_mode: "push".to_string(),
            changes_detected: local_changes.len(),
            changes_processed: pushed_count,
        })
    }

    /// Pull remote changes from QuickBooks only (one-way sync)
    ///
    /// Detects QuickBooks changes and pulls them to local DB without pushing local changes.
    /// Useful for importing data from QuickBooks or refreshing local state.
    pub async fn sync_pull(
        db: &DatabaseConnection,
        client: &IntuitClient,
        entity_type: EntityType,
    ) -> Result<SyncReport> {
        let started_at = Utc::now();
        let mut errors = Vec::new();
        let mut pulled_count = 0;

        // Detect remote changes
        let remote_changes = SyncTracker::get_remote_changes(client, db, entity_type)
            .await
            .context("Failed to detect remote changes")?;

        tracing::info!(
            "Detected {} remote changes to pull for {:?}",
            remote_changes.len(),
            entity_type
        );

        // Pull remote changes to local DB
        let pull_results = Self::pull_changes(client, db, entity_type, &remote_changes).await;
        for result in &pull_results {
            if result.success {
                pulled_count += 1;
            } else {
                errors.push(SyncError {
                    entity_type: format!("{:?}", entity_type),
                    entity_id: Some(result.entity_id.clone()),
                    quickbooks_id: None,
                    error_message: result.error_message.clone().unwrap_or_default(),
                    error_code: None,
                    is_retryable: true,
                });
            }
        }

        let completed_at = Utc::now();

        Ok(SyncReport {
            pushed_count: 0,
            pulled_count,
            updated_count: 0,
            skipped_count: 0,
            conflicts_resolved: 0,
            errors,
            started_at,
            completed_at,
            sync_mode: "pull".to_string(),
            changes_detected: remote_changes.len(),
            changes_processed: pulled_count,
        })
    }

    /// Identify conflicts between local and remote changes
    ///
    /// A conflict occurs when:
    /// - A record has been modified both locally and remotely since last sync
    /// - The same entity_id appears in both change lists
    fn identify_conflicts(local: &[ChangeRecord], remote: &[ChangeRecord]) -> Vec<ConflictRecord> {
        let mut conflicts = Vec::new();

        // Create a map of remote changes by entity_id for fast lookup
        let remote_map: HashMap<&str, &ChangeRecord> = remote
            .iter()
            .map(|change| (change.entity_id.as_str(), change))
            .collect();

        // Find records that appear in both lists
        for local_change in local {
            if let Some(remote_change) = remote_map.get(local_change.entity_id.as_str()) {
                // Both local and remote have changes - this is a conflict
                conflicts.push(ConflictRecord {
                    entity_type: local_change.entity_type,
                    entity_id: local_change.entity_id.clone(),
                    quickbooks_id: local_change.quickbooks_id.clone(),
                    local_change: local_change.clone(),
                    remote_change: (*remote_change).clone(),
                    local_timestamp: local_change.last_modified_at,
                    remote_timestamp: remote_change.last_modified_at,
                });
            }
        }

        conflicts
    }

    /// Push local changes to QuickBooks
    async fn push_changes(
        client: &IntuitClient,
        db: &DatabaseConnection,
        entity_type: EntityType,
        changes: &[ChangeRecord],
    ) -> Vec<SyncResult> {
        let mut results = Vec::new();

        for change in changes {
            let result = match entity_type {
                EntityType::Employee => Self::push_employee_change(client, db, change).await,
                EntityType::Department => Self::push_department_change(client, db, change).await,
            };

            results.push(result);
        }

        results
    }

    /// Push a single employee change to QuickBooks
    async fn push_employee_change(
        client: &IntuitClient,
        db: &DatabaseConnection,
        change: &ChangeRecord,
    ) -> SyncResult {
        // 1. Parse entity_id as Uuid
        let user_id: Uuid = match Uuid::parse_str(&change.entity_id) {
            Ok(id) => id,
            Err(_) => {
                return SyncResult {
                    entity_id: change.entity_id.clone(),
                    success: false,
                    error_message: Some("Invalid user ID format".to_string()),
                };
            }
        };

        // 2. Fetch employee from local database
        let employee = match user::Entity::find_by_id(user_id).one(db).await {
            Ok(Some(emp)) => emp,
            Ok(None) => {
                return SyncResult {
                    entity_id: change.entity_id.clone(),
                    success: false,
                    error_message: Some("Employee not found in local database".to_string()),
                };
            }
            Err(e) => {
                return SyncResult {
                    entity_id: change.entity_id.clone(),
                    success: false,
                    error_message: Some(format!("Database error: {}", e)),
                };
            }
        };

        // 2a. VALIDATION: Validate employee data before pushing to QuickBooks
        // Use strict Push context since we're sending data TO QuickBooks
        let validation_engine = ValidationEngine::new();
        let validation_result =
            validation_engine.validate_local_employee_with_context(&employee, SyncContext::Push);

        if validation_result.has_errors() {
            // Log validation errors
            if let Err(e) = validation_engine
                .save_errors(db, &validation_result.errors)
                .await
            {
                tracing::warn!("Failed to save validation errors: {}", e);
            }

            // Build error message from validation errors
            let error_details: Vec<String> = validation_result
                .errors
                .iter()
                .map(|err| format!("{}: {}", err.field_name, err.error_message))
                .collect();

            return SyncResult {
                entity_id: change.entity_id.clone(),
                success: false,
                error_message: Some(format!(
                    "VALIDATION FAILED: Employee data quality issues prevent sync. Errors: {}",
                    error_details.join("; ")
                )),
            };
        }

        // 3. Convert to QuickBooks format
        let result = if let Some(qb_id) = employee.intuit_employee_id.clone() {
            // UPDATE existing QuickBooks employee
            match client.get_employee(&qb_id).await {
                Ok(current_emp) => {
                    let updated_emp = Employee {
                        id: Some(qb_id.clone()),
                        sync_token: current_emp.base.sync_token,
                        given_name: Some(employee.first_name.clone()),
                        family_name: Some(employee.last_name.clone()),
                        display_name: Some(format!(
                            "{} {}",
                            employee.first_name, employee.last_name
                        )),
                        primary_email_addr: if !employee.email.is_empty() {
                            Some(Email {
                                address: Some(employee.email.clone()),
                            })
                        } else {
                            None
                        },
                        active: Some(employee.is_active),
                        ..Default::default()
                    };

                    let mut emp_extended: EmployeeExtended = updated_emp.into();
                    emp_extended.sparse = Some(true);
                    emp_extended.employee_number = employee.employee_number.clone();

                    client.update_employee(emp_extended).await
                }
                Err(e) => Err(e),
            }
        } else {
            // CREATE new QuickBooks employee
            // First, check if an employee with the same display name already exists
            let display_name = format!("{} {}", employee.first_name, employee.last_name);

            // Try to find existing QB employee by name to enable auto-linking
            match client.list_employees().await {
                Ok(all_employees) => {
                    // Filter for employees with matching display name
                    let matching: Vec<_> = all_employees
                        .iter()
                        .filter(|emp| {
                            emp.base
                                .display_name
                                .as_ref()
                                .map(|n| n.trim().eq_ignore_ascii_case(display_name.trim()))
                                .unwrap_or(false)
                        })
                        .collect();

                    if !matching.is_empty() {
                        // Found existing employee with same name - auto-link instead of creating duplicate
                        let existing = matching[0];
                        let existing_id = existing
                            .base
                            .id
                            .as_ref()
                            .map(|s| s.to_string())
                            .unwrap_or_default();

                        tracing::info!(
                            "Auto-linking local employee '{}' (ID: {}) to existing QuickBooks employee (QB ID: {})",
                            display_name,
                            user_id,
                            existing_id
                        );

                        // Return the existing employee as if we just created it
                        // This will trigger the normal sync update flow below
                        Ok(Employee {
                            id: Some(existing_id),
                            sync_token: existing.base.sync_token.clone(),
                            given_name: existing.base.given_name.clone(),
                            family_name: existing.base.family_name.clone(),
                            display_name: existing.base.display_name.clone(),
                            primary_email_addr: existing.base.primary_email_addr.clone(),
                            active: existing.base.active,
                            ..Default::default()
                        })
                    } else {
                        // No duplicate found, safe to create
                        let new_emp = Employee {
                            given_name: Some(employee.first_name.clone()),
                            family_name: Some(employee.last_name.clone()),
                            display_name: Some(display_name),
                            primary_email_addr: if !employee.email.is_empty() {
                                Some(Email {
                                    address: Some(employee.email.clone()),
                                })
                            } else {
                                None
                            },
                            active: Some(employee.is_active),
                            ..Default::default()
                        };

                        let mut emp_extended: EmployeeExtended = new_emp.into();
                        emp_extended.employee_number = employee.employee_number.clone();

                        client.create_employee(emp_extended).await
                    }
                }
                Err(e) => {
                    // List failed - log warning but proceed with create attempt
                    tracing::warn!(
                        "Failed to check for duplicate employee name '{}': {}",
                        display_name,
                        e
                    );

                    let new_emp = Employee {
                        given_name: Some(employee.first_name.clone()),
                        family_name: Some(employee.last_name.clone()),
                        display_name: Some(display_name),
                        primary_email_addr: if !employee.email.is_empty() {
                            Some(Email {
                                address: Some(employee.email.clone()),
                            })
                        } else {
                            None
                        },
                        active: Some(employee.is_active),
                        ..Default::default()
                    };

                    let mut emp_extended: EmployeeExtended = new_emp.into();
                    emp_extended.employee_number = employee.employee_number.clone();

                    client.create_employee(emp_extended).await
                }
            }
        };

        // 4. Handle result and update local sync fields
        match result {
            Ok(qb_employee) => {
                // Update local record with sync info
                let mut active_model: user::ActiveModel = employee.into();
                active_model.intuit_employee_id = Set(qb_employee.id.clone());
                active_model.quickbooks_sync_token = Set(qb_employee.sync_token.clone());
                active_model.last_synced_at = Set(Some(Utc::now()));
                active_model.sync_status = Set("synced".to_string());

                match active_model.update(db).await {
                    Ok(_) => SyncResult {
                        entity_id: change.entity_id.clone(),
                        success: true,
                        error_message: None,
                    },
                    Err(e) => SyncResult {
                        entity_id: change.entity_id.clone(),
                        success: false,
                        error_message: Some(format!("Failed to update local sync fields: {}", e)),
                    },
                }
            }
            Err(e) => {
                let error_msg = e.to_string();

                // Detect EMPLOYEE_NOT_FOUND error - employee was deleted from QuickBooks
                if error_msg.contains("EMPLOYEE_NOT_FOUND") || error_msg.contains("does not exist")
                {
                    // Automatically mark employee as inactive since they were deleted from QuickBooks
                    tracing::info!(
                        "Employee {} (QB ID: {}) no longer exists in QuickBooks - marking as inactive",
                        format!("{} {}", employee.first_name, employee.last_name),
                        employee.intuit_employee_id.as_ref().unwrap_or(&"unknown".to_string())
                    );

                    let mut active_model: user::ActiveModel = employee.into();
                    active_model.is_active = Set(false);
                    active_model.sync_status = Set("inactive_in_quickbooks".to_string());
                    active_model.last_synced_at = Set(Some(Utc::now()));

                    match active_model.update(db).await {
                        Ok(_) => SyncResult {
                            entity_id: change.entity_id.clone(),
                            success: true,
                            error_message: None,
                        },
                        Err(e) => SyncResult {
                            entity_id: change.entity_id.clone(),
                            success: false,
                            error_message: Some(format!(
                                "Failed to mark employee as inactive: {}",
                                e
                            )),
                        },
                    }
                } else {
                    SyncResult {
                        entity_id: change.entity_id.clone(),
                        success: false,
                        error_message: Some(format!("QuickBooks API error: {}", e)),
                    }
                }
            }
        }
    }

    /// Push a single department change to QuickBooks
    async fn push_department_change(
        client: &IntuitClient,
        db: &DatabaseConnection,
        change: &ChangeRecord,
    ) -> SyncResult {
        // 1. Parse entity_id as Uuid
        let dept_id: Uuid = match Uuid::parse_str(&change.entity_id) {
            Ok(id) => id,
            Err(_) => {
                return SyncResult {
                    entity_id: change.entity_id.clone(),
                    success: false,
                    error_message: Some("Invalid department ID format".to_string()),
                };
            }
        };

        // 2. Fetch department from local database
        let dept = match department::Entity::find_by_id(dept_id).one(db).await {
            Ok(Some(d)) => d,
            Ok(None) => {
                return SyncResult {
                    entity_id: change.entity_id.clone(),
                    success: false,
                    error_message: Some("Department not found in local database".to_string()),
                };
            }
            Err(e) => {
                return SyncResult {
                    entity_id: change.entity_id.clone(),
                    success: false,
                    error_message: Some(format!("Database error: {}", e)),
                };
            }
        };

        // 2a. VALIDATION: Validate department data before pushing to QuickBooks
        let validation_engine = ValidationEngine::new();
        let validation_result = validation_engine.validate_local_department(&dept);

        if validation_result.has_errors() {
            // Log validation errors
            if let Err(e) = validation_engine
                .save_errors(db, &validation_result.errors)
                .await
            {
                tracing::warn!("Failed to save validation errors: {}", e);
            }

            // Build error message from validation errors
            let error_details: Vec<String> = validation_result
                .errors
                .iter()
                .map(|err| format!("{}: {}", err.field_name, err.error_message))
                .collect();

            return SyncResult {
                entity_id: change.entity_id.clone(),
                success: false,
                error_message: Some(format!(
                    "VALIDATION FAILED: Department data quality issues prevent sync. Errors: {}",
                    error_details.join("; ")
                )),
            };
        }

        // 3. Convert to QuickBooks format
        let result = if let Some(qb_id) = dept.intuit_department_id.clone() {
            // UPDATE existing QuickBooks department
            match client.get_department(&qb_id).await {
                Ok(current_dept) => {
                    let updated_dept = Department {
                        id: Some(qb_id.clone()),
                        sync_token: current_dept.sync_token,
                        name: Some(dept.name.clone()),
                        active: Some(true),
                        ..Default::default()
                    };

                    client.update_department(updated_dept).await
                }
                Err(e) => Err(e),
            }
        } else {
            // CREATE new QuickBooks department
            // Note: QuickBooks departments are typically read-only or managed differently
            // For now, return an error indicating this limitation
            Err(anyhow::anyhow!(
                "Department creation via API is not supported. Please create departments in QuickBooks first. Department name: {}",
                dept.name
            ))
        };

        // 4. Handle result and update local sync fields
        match result {
            Ok(qb_dept) => {
                // Update local record with sync info
                let mut active_model: department::ActiveModel = dept.into();
                active_model.intuit_department_id = Set(qb_dept.id.clone());
                active_model.quickbooks_sync_token = Set(qb_dept.sync_token.clone());
                active_model.last_synced_at = Set(Some(Utc::now()));
                active_model.sync_status = Set("synced".to_string());

                match active_model.update(db).await {
                    Ok(_) => SyncResult {
                        entity_id: change.entity_id.clone(),
                        success: true,
                        error_message: None,
                    },
                    Err(e) => SyncResult {
                        entity_id: change.entity_id.clone(),
                        success: false,
                        error_message: Some(format!("Failed to update local sync fields: {}", e)),
                    },
                }
            }
            Err(e) => SyncResult {
                entity_id: change.entity_id.clone(),
                success: false,
                error_message: Some(format!("QuickBooks API error: {}", e)),
            },
        }
    }

    /// Pull remote changes to local database
    async fn pull_changes(
        client: &IntuitClient,
        db: &DatabaseConnection,
        entity_type: EntityType,
        changes: &[ChangeRecord],
    ) -> Vec<SyncResult> {
        let mut results = Vec::new();

        for change in changes {
            let result = match entity_type {
                EntityType::Employee => Self::pull_employee_change(client, db, change).await,
                EntityType::Department => Self::pull_department_change(client, db, change).await,
            };
            results.push(result);
        }

        results
    }

    /// Pull a single employee change from QuickBooks
    async fn pull_employee_change(
        client: &IntuitClient,
        db: &DatabaseConnection,
        change: &ChangeRecord,
    ) -> SyncResult {
        // For remote changes, use quickbooks_id; for local changes, use entity_id
        let qb_id = change.quickbooks_id.as_ref().unwrap_or(&change.entity_id);

        // 1. Fetch employee from QuickBooks
        let qb_employee = match client.get_employee(qb_id).await {
            Ok(emp) => emp,
            Err(e) => {
                let error_msg = e.to_string();

                // Detect EMPLOYEE_NOT_FOUND error - employee was deleted from QuickBooks
                if error_msg.contains("EMPLOYEE_NOT_FOUND") || error_msg.contains("does not exist")
                {
                    // Check if we have a local employee with this QB ID
                    let local_employee = user::Entity::find()
                        .filter(user::Column::IntuitEmployeeId.eq(Some(qb_id.clone())))
                        .one(db)
                        .await;

                    match local_employee {
                        Ok(Some(employee)) => {
                            // Mark the local employee as inactive since they were deleted from QB
                            tracing::info!(
                                "Employee {} (QB ID: {}) no longer exists in QuickBooks - marking as inactive",
                                format!("{} {}", employee.first_name, employee.last_name),
                                qb_id
                            );

                            let mut active_model: user::ActiveModel = employee.into();
                            active_model.is_active = Set(false);
                            active_model.sync_status = Set("inactive_in_quickbooks".to_string());
                            active_model.last_synced_at = Set(Some(Utc::now()));

                            match active_model.update(db).await {
                                Ok(_) => {
                                    return SyncResult {
                                        entity_id: change.entity_id.clone(),
                                        success: true,
                                        error_message: None,
                                    }
                                }
                                Err(e) => {
                                    return SyncResult {
                                        entity_id: change.entity_id.clone(),
                                        success: false,
                                        error_message: Some(format!(
                                            "Failed to mark employee as inactive: {}",
                                            e
                                        )),
                                    }
                                }
                            }
                        }
                        Ok(None) => {
                            // No local employee with this QB ID - nothing to do
                            return SyncResult {
                                entity_id: change.entity_id.clone(),
                                success: true,
                                error_message: None,
                            };
                        }
                        Err(e) => {
                            return SyncResult {
                                entity_id: change.entity_id.clone(),
                                success: false,
                                error_message: Some(format!("Database error: {}", e)),
                            };
                        }
                    }
                }

                return SyncResult {
                    entity_id: change.entity_id.clone(),
                    success: false,
                    error_message: Some(format!("Failed to fetch from QuickBooks: {}", e)),
                };
            }
        };

        // 1a. VALIDATION: Validate QuickBooks employee data before pulling
        // Use lenient Pull context since we're receiving data FROM QuickBooks
        // This allows employees without emails to be imported (emails become warnings instead of errors)
        let validation_engine = ValidationEngine::new();
        let validation_result = validation_engine.validate_quickbooks_employee_with_context(
            &qb_employee,
            qb_id,
            SyncContext::Pull,
        );

        if validation_result.has_errors() {
            // Log validation errors
            if let Err(e) = validation_engine
                .save_errors(db, &validation_result.errors)
                .await
            {
                tracing::warn!("Failed to save validation errors: {}", e);
            }

            // Build error message from validation errors
            let error_details: Vec<String> = validation_result
                .errors
                .iter()
                .map(|err| format!("{}: {}", err.field_name, err.error_message))
                .collect();

            return SyncResult {
                entity_id: change.entity_id.clone(),
                success: false,
                error_message: Some(format!(
                    "VALIDATION FAILED: QuickBooks employee data quality issues prevent sync. QB ID: {}. Errors: {}",
                    qb_id,
                    error_details.join("; ")
                )),
            };
        }

        // 2. Find or create local employee
        // First, try to find by intuit_employee_id
        let mut existing = user::Entity::find()
            .filter(user::Column::IntuitEmployeeId.eq(qb_id))
            .one(db)
            .await;

        // If not found by QB ID, try to match by employee_number (stable identifier)
        if existing.is_ok() && existing.as_ref().unwrap().is_none() {
            if let Some(emp_number) = &qb_employee.employee_number {
                if !emp_number.is_empty() {
                    existing = user::Entity::find()
                        .filter(user::Column::EmployeeNumber.eq(emp_number))
                        .filter(user::Column::DeletedAt.is_null())
                        .filter(user::Column::IntuitEmployeeId.is_null()) // Only match unlinked employees
                        .one(db)
                        .await;
                }
            }
        }

        // If still not found, try to match by email as last resort
        // Note: We don't filter by IntuitEmployeeId.is_null() because we want to update
        // employees that have the wrong QB ID (e.g., if they were synced with a different QB account)
        if existing.is_ok() && existing.as_ref().unwrap().is_none() {
            if let Some(email_addr) = &qb_employee.base.primary_email_addr {
                if let Some(email) = &email_addr.address {
                    if !email.is_empty() {
                        existing = user::Entity::find()
                            .filter(user::Column::Email.eq(email))
                            .filter(user::Column::DeletedAt.is_null())
                            .one(db)
                            .await;
                    }
                }
            }
        }

        let result = match existing {
            Ok(Some(local_emp)) => {
                // UPDATE existing local employee (found by QB ID or employee_number)
                let employee_id = local_emp.id; // Capture ID before moving
                let mut active_model: user::ActiveModel = local_emp.into();
                active_model.intuit_employee_id = Set(Some(qb_id.clone())); // Ensure QB ID is set
                active_model.first_name =
                    Set(qb_employee.base.given_name.clone().unwrap_or_default());
                active_model.last_name =
                    Set(qb_employee.base.family_name.clone().unwrap_or_default());

                // Only update email if QuickBooks has a valid (non-empty) email
                // This prevents overwriting valid local emails with empty values from QuickBooks
                if let Some(email_addr) = &qb_employee.base.primary_email_addr {
                    if let Some(email) = &email_addr.address {
                        if !email.trim().is_empty() {
                            active_model.email = Set(email.clone());
                        }
                    }
                }
                active_model.is_active = Set(qb_employee.base.active.unwrap_or(true));
                active_model.quickbooks_sync_token = Set(qb_employee.base.sync_token.clone());
                if let Some(emp_num) = &qb_employee.employee_number {
                    active_model.employee_number = Set(Some(emp_num.clone()));
                }

                // Set both timestamps to same value to prevent false "local change" detection
                let sync_time = Utc::now();
                active_model.last_synced_at = Set(Some(sync_time));
                active_model.last_modified_at = Set(sync_time);
                active_model.sync_status = Set("synced".to_string());

                active_model.update(db).await.map(|_| employee_id)
            }
            Ok(None) => {
                // CREATE new local employee
                // Check if employee has an email (required for user accounts)
                let email = qb_employee
                    .base
                    .primary_email_addr
                    .as_ref()
                    .and_then(|e| e.address.clone())
                    .unwrap_or_default();

                if email.trim().is_empty() {
                    // Employee missing email - cannot create user account without email
                    use super::validation_engine::{
                        EntityType as ValidationEntityType, Severity, ValidationError,
                    };
                    // Get employee name for display
                    let employee_name = format!(
                        "{} {}",
                        qb_employee
                            .base
                            .given_name
                            .as_ref()
                            .unwrap_or(&"Unknown".to_string()),
                        qb_employee
                            .base
                            .family_name
                            .as_ref()
                            .unwrap_or(&"".to_string())
                    )
                    .trim()
                    .to_string();
                    // Log this as a data quality issue for admin to resolve
                    tracing::warn!(
                        "Cannot import QuickBooks employee (QB ID: {}, Name: {} {}) - missing email address. \
                         This employee will remain in QuickBooks only until an email is added.",
                        qb_id,
                        employee_name.clone(),
                        qb_employee.base.family_name.as_ref().unwrap_or(&"".to_string())
                    );

                    // Save validation error for tracking and reporting

                    let validation_error = ValidationError {
                        rule_id: Uuid::new_v4(),
                        rule_name: "employee_email_required".to_string(),
                        entity_type: ValidationEntityType::Employee,
                        entity_id: Some(qb_id.to_string()), // Use QB ID since no local ID yet
                        field_name: "email".to_string(),
                        invalid_value: employee_name.clone(), // Store employee name so UI can display it
                        error_message: "Missing required email address. This employee cannot be imported until an email is added in QuickBooks.".to_string(),
                        severity: Severity::Error,
                        auto_fix_available: false,
                        detected_at: Utc::now(),
                    };

                    // Save the validation error to database for admin review
                    let validation_engine = ValidationEngine::new();
                    if let Err(e) = validation_engine.save_errors(db, &[validation_error]).await {
                        tracing::error!("Failed to save validation error: {}", e);
                    }

                    return SyncResult {
                        entity_id: change.entity_id.clone(),
                        success: false,
                        error_message: Some(format!(
                            "DATA QUALITY ISSUE: QuickBooks employee '{}' (QB ID: {}) cannot be imported - missing email address. \
                             This has been logged for admin review. Add an email in QuickBooks and sync again to import this employee.",
                            employee_name,
                            qb_id
                        )),
                    };
                }

                // Generate a random password that user must change on first login
                use bcrypt::{hash, DEFAULT_COST};
                use uuid::Uuid;

                let random_password = Uuid::new_v4().to_string();
                let password_hash = match hash(random_password, DEFAULT_COST) {
                    Ok(hash) => hash,
                    Err(e) => {
                        return SyncResult {
                            entity_id: change.entity_id.clone(),
                            success: false,
                            error_message: Some(format!("Failed to hash password: {}", e)),
                        };
                    }
                };

                let new_employee_id = Uuid::new_v4(); // Capture ID for return
                let new_model = user::ActiveModel {
                    id: Set(new_employee_id),
                    first_name: Set(qb_employee.base.given_name.clone().unwrap_or_default()),
                    last_name: Set(qb_employee.base.family_name.clone().unwrap_or_default()),
                    email: Set(email),
                    password_hash: Set(password_hash),
                    force_password_change: Set(true), // Force password change on first login
                    employee_number: Set(qb_employee.employee_number.clone()),
                    is_active: Set(qb_employee.base.active.unwrap_or(true)),
                    intuit_employee_id: Set(Some(qb_id.clone())),
                    quickbooks_sync_token: Set(qb_employee.base.sync_token),
                    last_synced_at: Set(Some(Utc::now())),
                    last_modified_at: Set(Utc::now()),
                    sync_status: Set("synced".to_string()),
                    created_at: Set(Utc::now()),
                    updated_at: Set(Utc::now()),
                    ..Default::default()
                };

                new_model.insert(db).await.map(|_| new_employee_id)
            }
            Err(e) => {
                return SyncResult {
                    entity_id: change.entity_id.clone(),
                    success: false,
                    error_message: Some(format!("Database error: {}", e)),
                };
            }
        };

        match result {
            Ok(employee_uuid) => SyncResult {
                entity_id: employee_uuid.to_string(),
                success: true,
                error_message: None,
            },
            Err(e) => {
                let error_msg = e.to_string();

                // Detect duplicate email constraint violation
                if error_msg.contains("idx_users_email_unique_when_active")
                    || error_msg.contains("duplicate key")
                {
                    let email = qb_employee
                        .base
                        .primary_email_addr
                        .as_ref()
                        .and_then(|e| e.address.as_ref())
                        .map(|s| s.as_str())
                        .unwrap_or("unknown");

                    SyncResult {
                        entity_id: change.entity_id.clone(),
                        success: false,
                        error_message: Some(format!(
                            "CONFLICT: QuickBooks employee (QB ID: {}) has email '{}' which already exists locally with a different QB ID. \
                             This suggests a duplicate employee record. Please review and resolve manually.",
                            qb_id, email
                        )),
                    }
                } else {
                    SyncResult {
                        entity_id: change.entity_id.clone(),
                        success: false,
                        error_message: Some(format!("Failed to update local database: {}", e)),
                    }
                }
            }
        }
    }

    /// Pull a single department change from QuickBooks
    async fn pull_department_change(
        client: &IntuitClient,
        db: &DatabaseConnection,
        change: &ChangeRecord,
    ) -> SyncResult {
        // For remote changes, use quickbooks_id; for local changes, use entity_id
        let qb_id = change.quickbooks_id.as_ref().unwrap_or(&change.entity_id);

        // 1. Fetch department from QuickBooks
        let qb_dept = match client.get_department(qb_id).await {
            Ok(dept) => dept,
            Err(e) => {
                return SyncResult {
                    entity_id: change.entity_id.clone(),
                    success: false,
                    error_message: Some(format!("Failed to fetch from QuickBooks: {}", e)),
                };
            }
        };

        // 1a. VALIDATION: Validate QuickBooks department data before pulling
        let validation_engine = ValidationEngine::new();
        let validation_result = validation_engine.validate_quickbooks_department(&qb_dept, qb_id);

        if validation_result.has_errors() {
            // Log validation errors
            if let Err(e) = validation_engine
                .save_errors(db, &validation_result.errors)
                .await
            {
                tracing::warn!("Failed to save validation errors: {}", e);
            }

            // Build error message from validation errors
            let error_details: Vec<String> = validation_result
                .errors
                .iter()
                .map(|err| format!("{}: {}", err.field_name, err.error_message))
                .collect();

            return SyncResult {
                entity_id: change.entity_id.clone(),
                success: false,
                error_message: Some(format!(
                    "VALIDATION FAILED: QuickBooks department data quality issues prevent sync. QB ID: {}. Errors: {}",
                    qb_id,
                    error_details.join("; ")
                )),
            };
        }

        // 2. Find or create local department
        // First, try to find by intuit_department_id
        let existing = department::Entity::find()
            .filter(department::Column::IntuitDepartmentId.eq(qb_id))
            .one(db)
            .await;

        let result = match existing {
            Ok(Some(local_dept)) => {
                // UPDATE existing local department
                let mut active_model: department::ActiveModel = local_dept.into();

                // Only update name if QuickBooks has a valid (non-empty) name
                // This prevents overwriting valid local names with empty values from QuickBooks
                if let Some(dept_name) = qb_dept.name.clone() {
                    if !dept_name.trim().is_empty() {
                        active_model.name = Set(dept_name);
                    }
                }

                active_model.quickbooks_sync_token = Set(qb_dept.sync_token.clone());
                active_model.last_synced_at = Set(Some(Utc::now()));
                active_model.sync_status = Set("synced".to_string());

                active_model.update(db).await
            }
            Ok(None) => {
                // CREATE new local department
                // Validate that department has a name (required for data quality)
                let dept_name = qb_dept.name.clone().unwrap_or_default();

                if dept_name.trim().is_empty() {
                    return SyncResult {
                        entity_id: change.entity_id.clone(),
                        success: false,
                        error_message: Some(format!(
                            "CONFLICT: QuickBooks department (QB ID: {}) has no name. \
                             Cannot create local record without a valid name. \
                             Please add a name in QuickBooks and sync again.",
                            qb_id
                        )),
                    };
                }

                let new_model = department::ActiveModel {
                    name: Set(dept_name),
                    intuit_department_id: Set(Some(qb_id.clone())),
                    quickbooks_sync_token: Set(qb_dept.sync_token),
                    last_synced_at: Set(Some(Utc::now())),
                    sync_status: Set("synced".to_string()),
                    ..Default::default()
                };

                new_model.insert(db).await
            }
            Err(e) => {
                return SyncResult {
                    entity_id: change.entity_id.clone(),
                    success: false,
                    error_message: Some(format!("Database error: {}", e)),
                };
            }
        };

        match result {
            Ok(_) => SyncResult {
                entity_id: change.entity_id.clone(),
                success: true,
                error_message: None,
            },
            Err(e) => SyncResult {
                entity_id: change.entity_id.clone(),
                success: false,
                error_message: Some(format!("Failed to update local database: {}", e)),
            },
        }
    }

    /// Collect errors from sync results
    fn _collect_errors(push_results: &[SyncResult], pull_results: &[SyncResult]) -> Vec<SyncError> {
        let mut errors = Vec::new();

        for result in push_results.iter().chain(pull_results) {
            if !result.success {
                if let Some(error_msg) = &result.error_message {
                    errors.push(SyncError {
                        entity_type: "Unknown".to_string(),
                        entity_id: Some(result.entity_id.clone()),
                        quickbooks_id: None,
                        error_message: error_msg.clone(),
                        error_code: None,
                        is_retryable: true,
                    });
                }
            }
        }

        errors
    }

    /// Record health metrics after sync operation
    async fn record_health_metrics(
        db: &DatabaseConnection,
        report: &SyncReport,
        entity_type: EntityType,
    ) {
        let monitor = HealthMonitor::new(Arc::new(db.clone()));

        let sync_duration_ms = (report.completed_at - report.started_at).num_milliseconds() as i32;

        let records_processed = (report.pushed_count + report.pulled_count) as i32;
        let errors_count = report.errors.len() as i32;
        let total_records =
            (report.pushed_count + report.pulled_count + report.updated_count) as f64;
        let error_rate = if total_records > 0.0 {
            errors_count as f64 / total_records
        } else {
            0.0
        };

        let connection_status = if errors_count == 0 {
            "healthy"
        } else if error_rate > 0.5 {
            "down"
        } else {
            "degraded"
        };

        let sync_direction = match report.sync_mode.as_str() {
            "push" => Some("push".to_string()),
            "pull" => Some("pull".to_string()),
            _ => Some("bidirectional".to_string()),
        };

        if let Err(e) = monitor
            .record_sync_metric(
                Some(sync_duration_ms),
                Some(records_processed),
                errors_count,
                None, // API calls not tracked yet
                connection_status,
                Some(format!("{:?}", entity_type)),
                sync_direction,
            )
            .await
        {
            tracing::warn!("Failed to record health metric: {}", e);
        }

        // Check if alert conditions are triggered
        if let Err(e) = monitor.check_alert_conditions().await {
            tracing::warn!("Failed to check alert conditions: {}", e);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_identify_conflicts() {
        use super::super::sync_tracker::SyncStatus;

        let now = Utc::now();

        let local_changes = vec![
            ChangeRecord {
                entity_type: EntityType::Employee,
                entity_id: "1".to_string(),
                quickbooks_id: Some("qb1".to_string()),
                last_modified_at: now,
                last_synced_at: None,
                sync_status: SyncStatus::LocalChanged,
                sync_token: None,
            },
            ChangeRecord {
                entity_type: EntityType::Employee,
                entity_id: "2".to_string(),
                quickbooks_id: Some("qb2".to_string()),
                last_modified_at: now,
                last_synced_at: None,
                sync_status: SyncStatus::LocalChanged,
                sync_token: None,
            },
        ];

        let remote_changes = vec![
            ChangeRecord {
                entity_type: EntityType::Employee,
                entity_id: "1".to_string(),
                quickbooks_id: Some("qb1".to_string()),
                last_modified_at: now,
                last_synced_at: None,
                sync_status: SyncStatus::RemoteChanged,
                sync_token: None,
            },
            ChangeRecord {
                entity_type: EntityType::Employee,
                entity_id: "3".to_string(),
                quickbooks_id: Some("qb3".to_string()),
                last_modified_at: now,
                last_synced_at: None,
                sync_status: SyncStatus::RemoteChanged,
                sync_token: None,
            },
        ];

        let conflicts = SyncOrchestrator::identify_conflicts(&local_changes, &remote_changes);

        assert_eq!(conflicts.len(), 1);
        assert_eq!(conflicts[0].entity_id, "1");
    }
}
