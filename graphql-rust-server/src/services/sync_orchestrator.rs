//! Bidirectional Sync Orchestrator
//!
//! Coordinates two-way synchronization between local database and QuickBooks Online,
//! handling change detection, conflict identification, and resolution.

use anyhow::{Context as AnyhowContext, Result};
use chrono::{DateTime, Utc};
use sea_orm::{DatabaseConnection, EntityTrait, Set, ActiveModelTrait, ColumnTrait, QueryFilter, PaginatorTrait};
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use uuid::Uuid;

use crate::integrations::intuit::{
    IntuitClient,
    Employee,
    Email,
    EmployeeExtended,
    Department,
};
use crate::models::{user, department};
use super::{
    sync_tracker::{ChangeRecord, EntityType, SyncTracker},
    conflict_resolver::{ConflictResolver, ConflictStrategy, ConflictRecord},
};

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
    /// Check if this is the first sync for this entity type
    ///
    /// Returns true if:
    /// - No records have been synced (last_synced_at is NULL)
    /// - No records have QuickBooks IDs
    async fn is_first_sync(
        db: &DatabaseConnection,
        entity_type: EntityType,
    ) -> Result<bool> {
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

        tracing::info!("Detected {} local changes for {:?}", local_changes.len(), entity_type);

        // 2. Detect remote changes
        let remote_changes = SyncTracker::get_remote_changes(client, db, entity_type)
            .await
            .context("Failed to detect remote changes")?;

        tracing::info!("Detected {} remote changes for {:?}", remote_changes.len(), entity_type);

        // 3. Identify conflicts (records changed on both sides)
        let conflicts = Self::identify_conflicts(&local_changes, &remote_changes);

        tracing::info!("Identified {} conflicts for {:?}", conflicts.len(), entity_type);

        // 4. Apply conflict resolution strategy
        let (resolved_local, resolved_remote) = match ConflictResolver::resolve(
            db,
            conflicts.clone(),
            strategy,
        )
        .await
        {
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
        let conflict_ids: HashSet<String> = conflicts
            .iter()
            .map(|c| c.entity_id.clone())
            .collect();

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

        Ok(SyncReport {
            pushed_count,
            pulled_count,
            updated_count,
            skipped_count,
            conflicts_resolved,
            errors,
            started_at,
            completed_at,
        })
    }

    /// Identify conflicts between local and remote changes
    ///
    /// A conflict occurs when:
    /// - A record has been modified both locally and remotely since last sync
    /// - The same entity_id appears in both change lists
    fn identify_conflicts(
        local: &[ChangeRecord],
        remote: &[ChangeRecord],
    ) -> Vec<ConflictRecord> {
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
                        display_name: Some(format!("{} {}", employee.first_name, employee.last_name)),
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
            let new_emp = Employee {
                given_name: Some(employee.first_name.clone()),
                family_name: Some(employee.last_name.clone()),
                display_name: Some(format!("{} {}", employee.first_name, employee.last_name)),
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
                if error_msg.contains("EMPLOYEE_NOT_FOUND") || error_msg.contains("does not exist") {
                    SyncResult {
                        entity_id: change.entity_id.clone(),
                        success: false,
                        error_message: Some(format!(
                            "CONFLICT: Local employee has QB ID '{}' that no longer exists in QuickBooks (likely deleted). \
                             Please review and either unlink this employee or delete them locally.",
                            employee.intuit_employee_id.as_ref().unwrap_or(&"unknown".to_string())
                        )),
                    }
                } else {
                    SyncResult {
                        entity_id: change.entity_id.clone(),
                        success: false,
                        error_message: Some(format!("QuickBooks API error: {}", e)),
                    }
                }
            },
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
                if error_msg.contains("EMPLOYEE_NOT_FOUND") || error_msg.contains("does not exist") {
                    return SyncResult {
                        entity_id: change.entity_id.clone(),
                        success: false,
                        error_message: Some(format!(
                            "CONFLICT: Employee with QB ID '{}' no longer exists in QuickBooks (likely deleted). \
                             Please review and either unlink this employee or delete them locally.",
                            qb_id
                        )),
                    };
                }

                return SyncResult {
                    entity_id: change.entity_id.clone(),
                    success: false,
                    error_message: Some(format!("Failed to fetch from QuickBooks: {}", e)),
                };
            }
        };

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
                active_model.first_name = Set(qb_employee.base.given_name.clone().unwrap_or_default());
                active_model.last_name = Set(qb_employee.base.family_name.clone().unwrap_or_default());

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
                // Validate that employee has an email (required by database constraint)
                let email = qb_employee.base.primary_email_addr
                    .as_ref()
                    .and_then(|e| e.address.clone())
                    .unwrap_or_default();

                if email.trim().is_empty() {
                    return SyncResult {
                        entity_id: change.entity_id.clone(),
                        success: false,
                        error_message: Some(format!(
                            "CONFLICT: QuickBooks employee (QB ID: {}) has no email address. \
                             Cannot create local record without a valid email. \
                             Please add an email in QuickBooks and sync again.",
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
                if error_msg.contains("idx_users_email_unique_when_active") || error_msg.contains("duplicate key") {
                    let email = qb_employee.base.primary_email_addr
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
            },
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
                active_model.name = Set(qb_dept.name.clone().unwrap_or_default());
                active_model.quickbooks_sync_token = Set(qb_dept.sync_token.clone());
                active_model.last_synced_at = Set(Some(Utc::now()));
                active_model.sync_status = Set("synced".to_string());

                active_model.update(db).await
            }
            Ok(None) => {
                // CREATE new local department
                let new_model = department::ActiveModel {
                    name: Set(qb_dept.name.clone().unwrap_or_default()),
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
    fn _collect_errors(
        push_results: &[SyncResult],
        pull_results: &[SyncResult],
    ) -> Vec<SyncError> {
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
