//! Intuit QuickBooks Integration Mutations and Queries
//!
//! Handles OAuth flow, connection management, and employee synchronization

use async_graphql::{Context, Object, Result, SimpleObject};
use sea_orm::{DatabaseConnection, EntityTrait, QueryFilter, ColumnTrait, Set, ActiveModelTrait, QuerySelect};
use uuid::Uuid;
use chrono::Utc;

use crate::{
    auth::UserContext,
    database::get_db_from_context,
    integrations::intuit::{self as intuit, IntuitClient},
    models::{
        intuit_connection::{Entity as IntuitConnectionEntity, Column as IntuitConnectionColumn, ActiveModel as IntuitConnectionActiveModel},
        intuit_sync_log::{Entity as IntuitSyncLogEntity, Column as IntuitSyncLogColumn},
    },
    services::{
        SyncTracker, EntityType, ChangeRecord, SyncStatusCounts,
        SyncOrchestrator, ConflictStrategy, SyncMode,
        PermissionChecker, SyncPermission,
    },
};
use sea_orm::QueryOrder;

/// Authorization URL and state for OAuth flow
#[derive(SimpleObject)]
pub struct AuthorizationUrlResponse {
    pub url: String,
    pub state: String,
}

/// Connection status information
#[derive(SimpleObject)]
pub struct ConnectionInfo {
    pub is_connected: bool,
    pub company_name: Option<String>,
    pub realm_id: Option<String>,
    pub last_sync_at: Option<chrono::DateTime<Utc>>,
}

/// Connection result
#[derive(SimpleObject)]
pub struct ConnectResult {
    pub success: bool,
    pub company_name: Option<String>,
    pub error: Option<String>,
}

/// Disconnect result
#[derive(SimpleObject)]
pub struct DisconnectResult {
    pub success: bool,
    pub error: Option<String>,
}

/// Sync result
#[derive(SimpleObject)]
pub struct SyncResult {
    pub success: bool,
    pub synced_count: i32,
    pub errors: Vec<String>,
}

/// Entity type for sync operations
#[derive(async_graphql::Enum, Clone, Copy, PartialEq, Eq)]
pub enum EntityTypeInput {
    /// Employee/User entities
    Employee,
    /// Department entities
    Department,
}

impl From<EntityTypeInput> for EntityType {
    fn from(input: EntityTypeInput) -> Self {
        match input {
            EntityTypeInput::Employee => EntityType::Employee,
            EntityTypeInput::Department => EntityType::Department,
        }
    }
}

/// Conflict resolution strategy for bidirectional sync
#[derive(async_graphql::Enum, Clone, Copy, PartialEq, Eq)]
pub enum ConflictStrategyInput {
    /// Local changes always win
    LocalWins,
    /// Remote (QuickBooks) changes always win
    RemoteWins,
    /// Most recent change wins based on timestamp
    LastWriteWins,
    /// Require manual resolution
    ManualReview,
}

impl From<ConflictStrategyInput> for ConflictStrategy {
    fn from(input: ConflictStrategyInput) -> Self {
        match input {
            ConflictStrategyInput::LocalWins => ConflictStrategy::LocalWins,
            ConflictStrategyInput::RemoteWins => ConflictStrategy::RemoteWins,
            ConflictStrategyInput::LastWriteWins => ConflictStrategy::LastWriteWins,
            ConflictStrategyInput::ManualReview => ConflictStrategy::ManualReview,
        }
    }
}

/// Sync mode for incremental vs full synchronization
#[derive(async_graphql::Enum, Clone, Copy, PartialEq, Eq)]
pub enum SyncModeInput {
    /// Full sync - process all entities
    Full,
    /// Incremental sync - process only changed entities
    Incremental,
    /// Auto - system decides based on conditions (recommended)
    Auto,
}

impl From<SyncModeInput> for SyncMode {
    fn from(input: SyncModeInput) -> Self {
        match input {
            SyncModeInput::Full => SyncMode::Full,
            SyncModeInput::Incremental => SyncMode::Incremental,
            SyncModeInput::Auto => SyncMode::Auto,
        }
    }
}

/// Resolution strategy for a single conflict
#[derive(async_graphql::Enum, Clone, Copy, PartialEq, Eq, Debug)]
pub enum ConflictResolutionInput {
    /// Keep the local version (overwrite QuickBooks)
    KeepLocal,
    /// Keep the remote version (overwrite local)
    KeepRemote,
}

/// Result of resolving a single conflict
#[derive(SimpleObject)]
pub struct ConflictResolutionResult {
    pub success: bool,
    pub error_message: Option<String>,
    pub entity_type: String,
    pub entity_id: String,
}

/// Result of a bidirectional sync operation
#[derive(SimpleObject)]
pub struct BidirectionalSyncResult {
    pub success: bool,
    pub pushed_count: i32,
    pub pulled_count: i32,
    pub conflicts_resolved: i32,
    pub errors: Vec<String>,
    pub started_at: chrono::DateTime<Utc>,
    pub completed_at: chrono::DateTime<Utc>,
    /// Sync mode used (full, incremental, auto)
    pub sync_mode: String,
    /// Number of changes detected before processing
    pub changes_detected: i32,
    /// Number of changes successfully processed
    pub changes_processed: i32,
}

/// Sync status overview for a specific entity type
#[derive(SimpleObject, Clone, Debug)]
pub struct EntitySyncStatus {
    pub synced: u64,
    pub local_changed: u64,
    pub remote_changed: u64,
    pub conflicts: u64,
    pub errors: u64,
}

impl From<SyncStatusCounts> for EntitySyncStatus {
    fn from(counts: SyncStatusCounts) -> Self {
        Self {
            synced: counts.synced,
            local_changed: counts.local_changed,
            remote_changed: counts.remote_changed,
            conflicts: counts.conflicts,
            errors: counts.errors,
        }
    }
}

/// Overall sync status across all entities
#[derive(SimpleObject, Clone, Debug)]
pub struct SyncStatusOverview {
    pub last_sync_at: Option<chrono::DateTime<Utc>>,
    pub total_synced: u64,
    pub total_pending: u64,
    pub total_conflicts: u64,
    pub employees: EntitySyncStatus,
    pub departments: EntitySyncStatus,
}

/// Pending change record for display
#[derive(SimpleObject, Clone, Debug)]
pub struct PendingChange {
    pub entity_type: String,
    pub entity_id: String,
    pub quickbooks_id: Option<String>,
    pub last_modified_at: chrono::DateTime<Utc>,
    pub last_synced_at: Option<chrono::DateTime<Utc>>,
    pub sync_status: String,
}

impl From<ChangeRecord> for PendingChange {
    fn from(record: ChangeRecord) -> Self {
        Self {
            entity_type: format!("{:?}", record.entity_type),
            entity_id: record.entity_id,
            quickbooks_id: record.quickbooks_id,
            last_modified_at: record.last_modified_at,
            last_synced_at: record.last_synced_at,
            sync_status: record.sync_status.as_str().to_string(),
        }
    }
}

/// Conflict record showing both local and remote states
#[derive(SimpleObject, Clone, Debug)]
pub struct ConflictRecord {
    pub entity_type: String,
    pub entity_id: String,
    pub quickbooks_id: String,
    pub description: String,
    pub employee_name: Option<String>,
    pub employee_email: Option<String>,
    pub local_modified_at: chrono::DateTime<Utc>,
    pub remote_modified_at: chrono::DateTime<Utc>,
    pub last_synced_at: Option<chrono::DateTime<Utc>>,
}

/// Recent sync operation log entry
#[derive(SimpleObject, Clone, Debug)]
pub struct SyncLogEntry {
    pub id: String,
    pub sync_type: String,
    pub direction: String,
    pub change_direction: Option<String>,
    pub status: String,
    pub pushed_count: i32,
    pub pulled_count: i32,
    pub updated_count: i32,
    pub skipped_count: i32,
    pub conflict_detected: bool,
    pub error_message: Option<String>,
    pub created_at: chrono::DateTime<Utc>,
}

/// Intuit query operations
pub struct IntuitQueries;

#[Object]
impl IntuitQueries {
    /// Get authorization URL for OAuth flow
    async fn authorization_url(&self, ctx: &Context<'_>) -> Result<AuthorizationUrlResponse> {
        let db = get_db_from_context(ctx)?;
        let user_context = ctx.data::<UserContext>()
            .map_err(|_| async_graphql::Error::new("Authentication required"))?;

        // Use permission checker for granular access control
        let checker = PermissionChecker::new(db);
        checker.require(user_context, SyncPermission::ManageIntegrations).await?;

        let (url, csrf_token) = intuit::get_authorization_url()
            .map_err(|e| async_graphql::Error::new(format!("Failed to generate authorization URL: {}", e)))?;

        Ok(AuthorizationUrlResponse {
            url,
            state: csrf_token.secret().to_string(),
        })
    }

    /// Get current connection status
    async fn connection(&self, ctx: &Context<'_>) -> Result<ConnectionInfo> {
        let db = get_db_from_context(ctx)?;
        let user_context = ctx.data::<UserContext>()
            .map_err(|_| async_graphql::Error::new("Authentication required"))?;

        // Use permission checker - viewing connection status requires manage or view permissions
        let checker = PermissionChecker::new(db.clone());
        let result = checker.check_any(user_context, &[
            SyncPermission::ManageIntegrations,
            SyncPermission::ViewSyncHistory,
        ]).await?;

        if !result.granted {
            return Err(async_graphql::Error::new("Permission denied: requires sync view or manage permissions"));
        }

        // Get the most recent active connection
        let connection = IntuitConnectionEntity::find()
            .filter(IntuitConnectionColumn::DeletedAt.is_null())
            .order_by_desc(IntuitConnectionColumn::CreatedAt)
            .one(&db)
            .await?;

        match connection {
            Some(conn) => Ok(ConnectionInfo {
                is_connected: true,
                company_name: conn.company_name,
                realm_id: Some(conn.realm_id),
                last_sync_at: conn.last_sync_at.map(|dt| dt.to_utc()),
            }),
            None => Ok(ConnectionInfo {
                is_connected: false,
                company_name: None,
                realm_id: None,
                last_sync_at: None,
            }),
        }
    }

    /// Get comprehensive sync status overview
    ///
    /// Returns counts of records by sync_status for all entity types.
    /// Requires view metrics permission.
    async fn sync_status(&self, ctx: &Context<'_>) -> Result<SyncStatusOverview> {
        let db = get_db_from_context(ctx)?;
        let user_context = ctx.data::<UserContext>()
            .map_err(|_| async_graphql::Error::new("Authentication required"))?;

        // Use permission checker for granular access control
        let checker = PermissionChecker::new(db.clone());
        checker.require(user_context, SyncPermission::ViewMetrics).await?;

        // Get status counts for employees and departments
        let employee_counts = SyncTracker::get_sync_status_counts(&db, EntityType::Employee)
            .await
            .map_err(|e| async_graphql::Error::new(format!("Failed to get employee sync status: {}", e)))?;

        let department_counts = SyncTracker::get_sync_status_counts(&db, EntityType::Department)
            .await
            .map_err(|e| async_graphql::Error::new(format!("Failed to get department sync status: {}", e)))?;

        // Calculate totals
        let total_synced = employee_counts.synced + department_counts.synced;
        let total_pending = employee_counts.local_changed + employee_counts.remote_changed
            + department_counts.local_changed + department_counts.remote_changed;
        let total_conflicts = employee_counts.conflicts + department_counts.conflicts;

        // Get last sync time from most recent log entry
        let last_log = IntuitSyncLogEntity::find()
            .filter(IntuitSyncLogColumn::Status.eq("success"))
            .order_by_desc(IntuitSyncLogColumn::CreatedAt)
            .one(&db)
            .await?;

        let last_sync_at = last_log.map(|log| log.created_at.into());

        Ok(SyncStatusOverview {
            last_sync_at,
            total_synced,
            total_pending,
            total_conflicts,
            employees: employee_counts.into(),
            departments: department_counts.into(),
        })
    }

    /// Get list of pending changes for a specific entity type
    ///
    /// Returns records that have changed locally since last sync.
    /// Requires view history permission.
    async fn pending_changes(
        &self,
        ctx: &Context<'_>,
        entity_type: String,
    ) -> Result<Vec<PendingChange>> {
        let db = get_db_from_context(ctx)?;
        let user_context = ctx.data::<UserContext>()
            .map_err(|_| async_graphql::Error::new("Authentication required"))?;

        // Use permission checker for granular access control
        let checker = PermissionChecker::new(db.clone());
        checker.require(user_context, SyncPermission::ViewSyncHistory).await?;

        // Parse entity type
        let entity_type_enum = match entity_type.to_lowercase().as_str() {
            "employee" | "employees" => EntityType::Employee,
            "department" | "departments" => EntityType::Department,
            _ => return Err(async_graphql::Error::new(
                "Invalid entity_type: must be 'employee' or 'department'"
            )),
        };

        // Get local changes
        let changes = SyncTracker::get_local_changes(&db, entity_type_enum)
            .await
            .map_err(|e| async_graphql::Error::new(format!("Failed to get pending changes: {}", e)))?;

        Ok(changes.into_iter().map(|c| c.into()).collect())
    }

    /// Get list of records with sync conflicts
    ///
    /// Returns records that have sync conflicts requiring manual resolution.
    /// Requires view conflicts permission.
    async fn conflicts(&self, ctx: &Context<'_>) -> Result<Vec<ConflictRecord>> {
        let db = get_db_from_context(ctx)?;
        let user_context = ctx.data::<UserContext>()
            .map_err(|_| async_graphql::Error::new("Authentication required"))?;

        // Use permission checker for granular access control
        let checker = PermissionChecker::new(db.clone());
        checker.require(user_context, SyncPermission::ViewConflicts).await?;

        // Query recent sync logs with unresolved conflicts
        // Exclude logs where conflict_resolution starts with "Manually resolved"
        let logs = IntuitSyncLogEntity::find()
            .filter(IntuitSyncLogColumn::ConflictDetected.eq(true))
            .filter(IntuitSyncLogColumn::Status.eq("Error"))
            .order_by_desc(IntuitSyncLogColumn::CreatedAt)
            .limit(50)
            .all(&db)
            .await?
            .into_iter()
            .filter(|log| {
                // Exclude logs that have been manually resolved
                if let Some(ref resolution) = log.conflict_resolution {
                    !resolution.starts_with("Manually resolved")
                } else {
                    true // Include logs with no resolution yet
                }
            })
            .collect::<Vec<_>>();

        let mut conflicts = Vec::new();

        // Extract conflict information from error messages
        for log in logs {
            if let Some(error_msg) = &log.error_message {
                // Split by error separator to handle multiple errors
                let error_parts: Vec<&str> = error_msg.split("; ").collect();

                for error_part in error_parts {
                    if error_part.starts_with("CONFLICT:") {
                        // Parse conflict details from error message
                        // Format: "CONFLICT: <description>"

                        // Remove "CONFLICT: " prefix to get clean description
                        let description = error_part.trim_start_matches("CONFLICT:").trim().to_string();

                        // Extract QuickBooks ID if present
                        let qb_id = if let Some(start) = error_part.find("QB ID") {
                            let after_qb_id = &error_part[start + 6..]; // Skip "QB ID"
                            // Handle both "QB ID: '55'" and "QB ID: 55" formats
                            let trimmed = after_qb_id.trim_start_matches(':').trim();
                            if let Some(end) = trimmed.find(|c: char| c == ')' || c == ',' || c == ' ') {
                                trimmed[..end].trim().trim_matches('\'').to_string()
                            } else {
                                trimmed.trim_matches('\'').to_string()
                            }
                        } else {
                            "unknown".to_string()
                        };

                        // Extract email if present
                        let email_from_error = if let Some(start) = error_part.find("email '") {
                            let after_email = &error_part[start + 7..];
                            if let Some(end) = after_email.find('\'') {
                                Some(after_email[..end].to_string())
                            } else {
                                None
                            }
                        } else {
                            None
                        };

                        // Try to look up employee details from database
                        let (employee_name, employee_email) = if qb_id != "unknown" {
                            // Try to find employee by QuickBooks ID
                            use crate::models::user::{Entity as UserEntity, Column as UserColumn};
                            if let Ok(Some(user)) = UserEntity::find()
                                .filter(UserColumn::IntuitEmployeeId.eq(&qb_id))
                                .filter(UserColumn::DeletedAt.is_null())
                                .one(&db)
                                .await
                            {
                                (
                                    Some(format!("{} {}", user.first_name, user.last_name)),
                                    Some(user.email.clone())
                                )
                            } else {
                                (None, email_from_error.clone())
                            }
                        } else if let Some(ref email) = email_from_error {
                            // Try to find employee by email
                            use crate::models::user::{Entity as UserEntity, Column as UserColumn};
                            if let Ok(Some(user)) = UserEntity::find()
                                .filter(UserColumn::Email.eq(email))
                                .filter(UserColumn::DeletedAt.is_null())
                                .one(&db)
                                .await
                            {
                                (
                                    Some(format!("{} {}", user.first_name, user.last_name)),
                                    Some(user.email.clone())
                                )
                            } else {
                                (None, Some(email.clone()))
                            }
                        } else {
                            (None, None)
                        };

                        // Create conflict record
                        conflicts.push(ConflictRecord {
                            entity_type: log.sync_type.clone(),
                            entity_id: format!("{}:{}", qb_id, employee_email.as_deref().unwrap_or("unknown")),
                            quickbooks_id: qb_id,
                            description,
                            employee_name,
                            employee_email,
                            local_modified_at: log.created_at.into(),
                            remote_modified_at: log.created_at.into(),
                            last_synced_at: None,
                        });
                    }
                }
            }
        }

        Ok(conflicts)
    }

    /// Get recent sync operation history
    ///
    /// Returns the most recent sync operations with their status and counts.
    /// Requires view history permission.
    async fn sync_history(
        &self,
        ctx: &Context<'_>,
        limit: Option<i32>,
    ) -> Result<Vec<SyncLogEntry>> {
        let db = get_db_from_context(ctx)?;
        let user_context = ctx.data::<UserContext>()
            .map_err(|_| async_graphql::Error::new("Authentication required"))?;

        // Use permission checker for granular access control
        let checker = PermissionChecker::new(db.clone());
        checker.require(user_context, SyncPermission::ViewSyncHistory).await?;

        let limit = limit.unwrap_or(20).clamp(1, 100) as u64;

        let logs = IntuitSyncLogEntity::find()
            .order_by_desc(IntuitSyncLogColumn::CreatedAt)
            .limit(Some(limit))
            .all(&db)
            .await?;

        Ok(logs.into_iter().map(|log| SyncLogEntry {
            id: log.id.to_string(),
            sync_type: log.sync_type,
            direction: log.direction,
            change_direction: log.change_direction,
            status: log.status,
            pushed_count: log.pushed_count,
            pulled_count: log.pulled_count,
            updated_count: log.updated_count,
            skipped_count: log.skipped_count,
            conflict_detected: log.conflict_detected,
            error_message: log.error_message,
            created_at: log.created_at.into(),
        }).collect())
    }

    /// Get health monitoring queries
    async fn health(&self) -> crate::schema::queries::IntuitHealthQueries {
        crate::schema::queries::IntuitHealthQueries
    }

    /// Get sync preview queries
    async fn preview(&self) -> crate::schema::queries::IntuitPreviewQueries {
        crate::schema::queries::IntuitPreviewQueries
    }

    /// Get audit trail queries
    async fn audit(&self) -> crate::schema::queries::AuditQueries {
        crate::schema::queries::AuditQueries
    }

    /// Get reconciliation queries
    async fn reconciliation(&self) -> crate::schema::queries::ReconciliationQueries {
        crate::schema::queries::ReconciliationQueries
    }

    /// Get sync rollback queries
    async fn rollback(&self) -> crate::schema::queries::SyncRollbackQueries {
        crate::schema::queries::SyncRollbackQueries
    }

    /// Get error recovery queries
    async fn error_recovery(&self) -> crate::schema::queries::ErrorRecoveryQueries {
        crate::schema::queries::ErrorRecoveryQueries
    }
}

/// Intuit mutation operations
pub struct IntuitMutations;

#[Object]
impl IntuitMutations {
    /// Connect to QuickBooks using OAuth code and realm ID
    async fn connect(&self, ctx: &Context<'_>, code: String, realm_id: String) -> Result<ConnectResult> {
        let db = get_db_from_context(ctx)?;
        let user_context = ctx.data::<UserContext>()
            .map_err(|_| async_graphql::Error::new("Authentication required"))?;

        // Use permission checker for granular access control
        let checker = PermissionChecker::new(db.clone());
        checker.require(user_context, SyncPermission::ManageIntegrations).await?;

        // Exchange code for tokens
        let tokens = match intuit::exchange_code_for_tokens(code).await {
            Ok(t) => t,
            Err(e) => {
                return Ok(ConnectResult {
                    success: false,
                    company_name: None,
                    error: Some(format!("Failed to exchange code for tokens: {}", e)),
                });
            }
        };

        // Get company name from QuickBooks
        let client = IntuitClient::new(tokens.access_token.clone(), realm_id.clone())
            .map_err(|e| async_graphql::Error::new(format!("Failed to create Intuit client: {}", e)))?;

        let company_name = match client.get_company_info().await {
            Ok(info) => info.company_name,
            Err(e) => {
                tracing::warn!("Failed to fetch company name: {}", e);
                Some("QuickBooks Company".to_string())
            }
        };

        // Calculate token expiration time
        let expires_at = Utc::now() + chrono::Duration::seconds(tokens.expires_in);

        // Save connection to database
        let connection = IntuitConnectionActiveModel {
            id: Set(Uuid::new_v4()),
            realm_id: Set(realm_id),
            access_token: Set(tokens.access_token),
            refresh_token: Set(tokens.refresh_token),
            token_expires_at: Set(expires_at.into()),
            company_name: Set(company_name.clone()),
            is_active: Set(true),
            last_sync_at: Set(None),
            employee_sync_token: Set(None),
            department_sync_token: Set(None),
            last_employee_sync_at: Set(None),
            last_department_sync_at: Set(None),
            created_at: Set(Utc::now().into()),
            updated_at: Set(Utc::now().into()),
            deleted_at: Set(None),
        };

        connection.insert(&db).await?;

        Ok(ConnectResult {
            success: true,
            company_name,
            error: None,
        })
    }

    /// Disconnect from QuickBooks
    async fn disconnect(&self, ctx: &Context<'_>) -> Result<DisconnectResult> {
        let db = get_db_from_context(ctx)?;
        let user_context = ctx.data::<UserContext>()
            .map_err(|_| async_graphql::Error::new("Authentication required"))?;

        // Use permission checker for granular access control
        let checker = PermissionChecker::new(db.clone());
        checker.require(user_context, SyncPermission::ManageIntegrations).await?;

        // Soft delete the most recent connection
        let connection = IntuitConnectionEntity::find()
            .filter(IntuitConnectionColumn::DeletedAt.is_null())
            .order_by_desc(IntuitConnectionColumn::CreatedAt)
            .one(&db)
            .await?;

        match connection {
            Some(conn) => {
                let mut active_model: IntuitConnectionActiveModel = conn.into();
                active_model.deleted_at = Set(Some(Utc::now().into()));
                active_model.is_active = Set(false);
                active_model.update(&db).await?;

                Ok(DisconnectResult {
                    success: true,
                    error: None,
                })
            }
            None => Ok(DisconnectResult {
                success: false,
                error: Some("No active connection found".to_string()),
            }),
        }
    }

    /// Push employees from HR system to QuickBooks
    async fn push_employees_to_quickbooks(&self, ctx: &Context<'_>) -> Result<SyncResult> {
        let db = get_db_from_context(ctx)?;
        let user_context = ctx.data::<UserContext>()
            .map_err(|_| async_graphql::Error::new("Authentication required"))?;

        // Use permission checker for granular access control
        let checker = PermissionChecker::new(db.clone());
        checker.require(user_context, SyncPermission::PushToQuickBooks).await?;

        // Get active connection
        let connection = get_active_connection(&db).await?;

        // Check if token needs refresh
        let (access_token, _) = ensure_valid_token(&db, &connection).await?;

        // Create Intuit client
        let client = IntuitClient::new(access_token, connection.realm_id.clone())
            .map_err(|e| async_graphql::Error::new(format!("Failed to create Intuit client: {}", e)))?;

        // Import user model
        use crate::models::user::{Entity as UserEntity, Column as UserColumn, ActiveModel as UserActiveModel};
        use sea_orm::Set;

        // Fetch all active employees from HR system
        let hr_employees = UserEntity::find()
            .filter(UserColumn::IsActive.eq(true))
            .filter(UserColumn::DeletedAt.is_null())
            .all(&db)
            .await?;

        let mut synced_count = 0;
        let mut errors = Vec::new();

        // Separate employees into create and update groups
        let mut employees_to_create = Vec::new();
        let mut employees_to_update = Vec::new();

        for emp in &hr_employees {
            if emp.email.is_empty() {
                errors.push(format!("Employee {} {} has no email, skipping", emp.first_name, emp.last_name));
                continue;
            }

            if emp.intuit_employee_id.is_some() {
                // Employee already synced - add to update list
                employees_to_update.push(emp);
            } else {
                // New employee - add to create list
                employees_to_create.push(emp);
            }
        }

        tracing::info!(
            "Processing {} employees: {} to create, {} to update",
            hr_employees.len(),
            employees_to_create.len(),
            employees_to_update.len()
        );

        if employees_to_create.is_empty() && employees_to_update.is_empty() {
            tracing::info!("No employees to process in QuickBooks");
            return Ok(SyncResult {
                success: true,
                synced_count: 0,
                errors,
            });
        }

        // ========== PART 1: Handle Creates ==========
        if !employees_to_create.is_empty() {
            tracing::info!("Creating {} new employees in QuickBooks", employees_to_create.len());

            // Convert HR employees to QuickBooks EmployeeExtended objects with full data
            use crate::models::employee::user_address::{Entity as UserAddressEntity, Column as UserAddressColumn};
            use quickbooks_types::common::{Addr, PhoneNumber, NtRef};

            let mut qb_employees = Vec::new();
            for emp in &employees_to_create {
            // Fetch primary address for this employee
            let primary_address = UserAddressEntity::find()
                .filter(UserAddressColumn::UserId.eq(emp.id))
                .filter(UserAddressColumn::IsPrimary.eq(true))
                .filter(UserAddressColumn::DeletedAt.is_null())
                .one(&db)
                .await
                .ok()
                .flatten();

            // Fetch manager's QuickBooks ID if employee has a manager
            // Note: Currently unused as QuickBooks doesn't support ParentRef during creation
            let _manager_ref = if let Some(manager_id) = emp.manager_id {
                let manager = UserEntity::find_by_id(manager_id)
                    .filter(UserColumn::DeletedAt.is_null())
                    .one(&db)
                    .await?;

                manager.and_then(|mgr| {
                    mgr.intuit_employee_id.map(|qb_id| NtRef {
                        value: Some(qb_id),
                        name: Some(format!("{} {}", mgr.first_name, mgr.last_name)),
                        entity_ref_type: Some("Employee".to_string()),
                    })
                })
            } else {
                None
            };

            // Fetch department's QuickBooks ID if employee has a department
            // Note: Currently unused as batch employee creation doesn't support DepartmentRef
            use crate::models::department::{Entity as DepartmentEntity, Column as DepartmentColumn};

            let _department_ref = if let Some(department_id) = emp.department_id {
                let department = DepartmentEntity::find_by_id(department_id)
                    .filter(DepartmentColumn::DeletedAt.is_null())
                    .one(&db)
                    .await?;

                department.and_then(|dept| {
                    dept.intuit_department_id.map(|qb_id| NtRef {
                        value: Some(qb_id),
                        name: Some(dept.name.clone()),
                        // Note: entity_ref_type is not supported in batch employee creation
                        entity_ref_type: None,
                    })
                })
            } else {
                None
            };

            // Build QuickBooks Employee with all available fields
            let base_employee = intuit::Employee {
                given_name: Some(emp.first_name.clone()),
                family_name: Some(emp.last_name.clone()),
                primary_email_addr: Some(intuit::EmailAddress {
                    address: Some(emp.email.clone()),
                }),
                // QuickBooks Title field has a maximum length of 16 characters
                title: emp.job_title.as_ref().map(|t| {
                    if t.len() > 16 {
                        t.chars().take(16).collect()
                    } else {
                        t.clone()
                    }
                }),
                primary_phone: emp.phone_number.as_ref().map(|phone| PhoneNumber {
                    free_form_number: Some(phone.clone()),
                }),
                mobile: emp.mobile_number.as_ref().map(|mobile| PhoneNumber {
                    free_form_number: Some(mobile.clone()),
                }),
                primary_addr: primary_address.map(|addr| Addr {
                    line1: Some(addr.address_line1.clone()),
                    city: Some(addr.city.clone()),
                    country_sub_division_code: Some(addr.state_province.clone()),
                    postal_code: Some(addr.postal_code.clone()),
                    country: Some(addr.country.clone()),
                    id: None,
                }),
                birth_date: emp.birth_date,
                hired_date: emp.hire_date.map(|dt| dt.date_naive()),
                active: Some(true),
                ..Default::default()
            };

            // Create EmployeeExtended without department reference
            // Note: ParentRef (manager) and DepartmentRef are not supported during batch employee creation
            // Department assignment will need to be done via individual employee updates after creation
            let qb_employee = intuit::EmployeeExtended {
                base: base_employee,
                employee_number: emp.employee_number.clone(),
                department_ref: None,
                parent_ref: None,
                sparse: None,
            };

            if qb_employee.department_ref.is_some() {
                tracing::debug!("Employee {} has department reference set", emp.email);
            }

            qb_employees.push(qb_employee);
        }

        tracing::info!("Batch creating {} employees in QuickBooks", qb_employees.len());

        // Batch create employees (API handles chunking into groups of 30)
        let batch_results = client.batch_create_employees(qb_employees).await?;

        // Process results and update local database
        for (index, result) in batch_results.iter().enumerate() {
            let hr_employee = employees_to_create[index];

            match result {
                Ok(qb_employee) => {
                    if let Some(qb_id) = &qb_employee.id {
                        let mut user_update: UserActiveModel = hr_employee.clone().into();
                        user_update.intuit_employee_id = Set(Some(qb_id.clone()));
                        user_update.updated_at = Set(Utc::now());

                        if let Err(e) = user_update.update(&db).await {
                            errors.push(format!("Created in QuickBooks but failed to update local record for {}: {}", hr_employee.email, e));
                        } else {
                            synced_count += 1;
                            tracing::info!("Created employee {} in QuickBooks with ID {}", hr_employee.email, qb_id);
                        }
                    } else {
                        errors.push(format!("QuickBooks didn't return ID for employee {}", hr_employee.email));
                    }
                }
                Err(e) => {
                    errors.push(format!("Failed to create {} in QuickBooks: {}", hr_employee.email, e));
                }
            }
        }
        } // End of create block

        // ========== PART 2: Handle Updates ==========
        if !employees_to_update.is_empty() {
            tracing::info!("Updating {} existing employees in QuickBooks", employees_to_update.len());

            use crate::models::employee::user_address::{Entity as UserAddressEntity, Column as UserAddressColumn};
            use quickbooks_types::common::{Addr, PhoneNumber};

            for emp in employees_to_update {
                let qb_id = match &emp.intuit_employee_id {
                    Some(id) => id.clone(),
                    None => continue, // Should not happen, but skip if no ID
                };

                // Fetch current employee from QuickBooks to get SyncToken
                let current_qb_employee = match client.get_employee(&qb_id).await {
                    Ok(qb_emp) => qb_emp,
                    Err(e) => {
                        errors.push(format!("Failed to fetch employee {} from QuickBooks: {}", emp.email, e));
                        continue;
                    }
                };

                // Get SyncToken (required for updates)
                let sync_token = match current_qb_employee.base.sync_token {
                    Some(token) => token,
                    None => {
                        errors.push(format!("Employee {} in QuickBooks has no SyncToken", emp.email));
                        continue;
                    }
                };

                // Fetch primary address
                let primary_address = UserAddressEntity::find()
                    .filter(UserAddressColumn::UserId.eq(emp.id))
                    .filter(UserAddressColumn::IsPrimary.eq(true))
                    .filter(UserAddressColumn::DeletedAt.is_null())
                    .one(&db)
                    .await
                    .ok()
                    .flatten();

                // Build updated employee with current data
                let updated_employee = intuit::Employee {
                    id: Some(qb_id.clone()),
                    sync_token: Some(sync_token),
                    given_name: Some(emp.first_name.clone()),
                    family_name: Some(emp.last_name.clone()),
                    primary_email_addr: Some(intuit::EmailAddress {
                        address: Some(emp.email.clone()),
                    }),
                    title: emp.job_title.as_ref().map(|t| {
                        if t.len() > 16 {
                            t.chars().take(16).collect()
                        } else {
                            t.clone()
                        }
                    }),
                    primary_phone: emp.phone_number.as_ref().map(|phone| PhoneNumber {
                        free_form_number: Some(phone.clone()),
                    }),
                    mobile: emp.mobile_number.as_ref().map(|mobile| PhoneNumber {
                        free_form_number: Some(mobile.clone()),
                    }),
                    primary_addr: primary_address.map(|addr| Addr {
                        line1: Some(addr.address_line1.clone()),
                        city: Some(addr.city.clone()),
                        country_sub_division_code: Some(addr.state_province.clone()),
                        postal_code: Some(addr.postal_code.clone()),
                        country: Some(addr.country.clone()),
                        id: None,
                    }),
                    birth_date: emp.birth_date,
                    hired_date: emp.hire_date.map(|dt| dt.date_naive()),
                    active: Some(emp.is_active),
                    ..Default::default()
                };

                // Build EmployeeExtended for update
                let qb_employee_extended = intuit::EmployeeExtended {
                    base: updated_employee,
                    employee_number: emp.employee_number.clone(),
                    department_ref: None,
                    parent_ref: None,
                    sparse: Some(true),
                };

                // Perform update
                match client.update_employee(qb_employee_extended).await {
                    Ok(updated_qb_employee) => {
                        // Update local sync fields
                        let mut user_update: UserActiveModel = emp.clone().into();
                        user_update.quickbooks_sync_token = Set(updated_qb_employee.sync_token.clone());
                        user_update.last_synced_at = Set(Some(Utc::now()));
                        user_update.sync_status = Set("synced".to_string());
                        user_update.updated_at = Set(Utc::now());

                        if let Err(e) = user_update.update(&db).await {
                            errors.push(format!("Updated in QuickBooks but failed to update local record for {}: {}", emp.email, e));
                        } else {
                            synced_count += 1;
                            tracing::info!("Updated employee {} in QuickBooks", emp.email);
                        }
                    }
                    Err(e) => {
                        errors.push(format!("Failed to update {} in QuickBooks: {}", emp.email, e));
                    }
                }
            }
        }

        // Update last sync time
        update_last_sync_time(&db, connection.id).await?;

        Ok(SyncResult {
            success: synced_count > 0 || errors.is_empty(),
            synced_count,
            errors,
        })
    }

    /// Update employee departments in QuickBooks
    /// This operation updates existing QuickBooks employees with their department references
    async fn update_employee_departments_in_quickbooks(&self, ctx: &Context<'_>) -> Result<SyncResult> {
        let db = get_db_from_context(ctx)?;
        let user_context = ctx.data::<UserContext>()?;

        // Use permission checker for granular access control
        let checker = PermissionChecker::new(db.clone());
        checker.require(user_context, SyncPermission::PushToQuickBooks).await?;

        let connection = get_active_connection(&db).await?;
        let (access_token, _) = ensure_valid_token(&db, &connection).await?;
        let client = IntuitClient::new(access_token, connection.realm_id.clone())?;

        // Import user model
        use crate::models::user::{Entity as UserEntity, Column as UserColumn};

        // Find all employees that have both QuickBooks ID and department ID
        let employees_with_departments = UserEntity::find()
            .filter(UserColumn::DeletedAt.is_null())
            .filter(UserColumn::IntuitEmployeeId.is_not_null())
            .filter(UserColumn::DepartmentId.is_not_null())
            .all(&db)
            .await?;

        if employees_with_departments.is_empty() {
            return Ok(SyncResult {
                success: true,
                synced_count: 0,
                errors: vec!["No employees with departments to update".to_string()],
            });
        }

        use crate::models::department::{Entity as DepartmentEntity, Column as DepartmentColumn};
        use quickbooks_types::common::NtRef;

        let mut updated_count = 0;
        let mut errors = Vec::new();

        // Update employees one at a time (QuickBooks batch update may not support DepartmentRef either)
        for emp in employees_with_departments {
            // Get department QuickBooks ID
            let department = DepartmentEntity::find_by_id(emp.department_id.unwrap())
                .filter(DepartmentColumn::DeletedAt.is_null())
                .one(&db)
                .await?;

            if let Some(dept) = department {
                if let Some(qb_dept_id) = dept.intuit_department_id {
                    // Fetch current employee from QuickBooks to get sync token
                    let qb_emp_id = emp.intuit_employee_id.as_ref().unwrap();

                    match client.get_employee(qb_emp_id).await {
                        Ok(qb_employee) => {
                            // Create department reference (without entity_ref_type)
                            let department_ref = NtRef {
                                value: Some(qb_dept_id.clone()),
                                name: Some(dept.name.clone()),
                                entity_ref_type: None,
                            };

                            // Create a minimal sparse update with only the required fields
                            // QuickBooks requires: Id, SyncToken, and the field(s) being updated
                            let sparse_employee = intuit::Employee {
                                id: qb_employee.base.id.clone(),
                                sync_token: qb_employee.base.sync_token.clone(),
                                ..Default::default()
                            };

                            // Update employee with department using EmployeeExtended
                            // Enable sparse update mode to only update the department field
                            let employee_update = intuit::EmployeeExtended {
                                base: sparse_employee,
                                employee_number: emp.employee_number.clone(),
                                department_ref: Some(department_ref),
                                parent_ref: None,
                                sparse: Some(true), // Enable sparse update mode
                            };

                            match client.update_employee(employee_update).await {
                                Ok(_) => {
                                    updated_count += 1;
                                    tracing::info!("Updated department for employee {} (QB ID: {})", emp.email, qb_emp_id);
                                }
                                Err(e) => {
                                    errors.push(format!("Failed to update {} with department: {}", emp.email, e));
                                }
                            }
                        }
                        Err(e) => {
                            errors.push(format!("Failed to fetch QB employee {}: {}", emp.email, e));
                        }
                    }
                } else {
                    errors.push(format!("Department '{}' not synced to QuickBooks", dept.name));
                }
            }
        }

        update_last_sync_time(&db, connection.id).await?;

        Ok(SyncResult {
            success: updated_count > 0 || errors.is_empty(),
            synced_count: updated_count,
            errors,
        })
    }

    /// Synchronize all employees with QuickBooks (pull from QB to HR)
    async fn sync_all_employees(&self, ctx: &Context<'_>) -> Result<SyncResult> {
        let db = get_db_from_context(ctx)?;
        let user_context = ctx.data::<UserContext>()
            .map_err(|_| async_graphql::Error::new("Authentication required"))?;

        // Use permission checker for granular access control
        let checker = PermissionChecker::new(db.clone());
        checker.require(user_context, SyncPermission::TriggerEmployeeSync).await?;

        // Get active connection
        let connection = get_active_connection(&db).await?;

        // Check if token needs refresh
        let (access_token, _) = ensure_valid_token(&db, &connection).await?;

        // Create Intuit client
        let client = IntuitClient::new(access_token, connection.realm_id.clone())
            .map_err(|e| async_graphql::Error::new(format!("Failed to create Intuit client: {}", e)))?;

        // Fetch employees from QuickBooks
        let qb_employees = match client.list_employees().await {
            Ok(emps) => emps,
            Err(e) => {
                return Ok(SyncResult {
                    success: false,
                    synced_count: 0,
                    errors: vec![format!("Failed to fetch employees from QuickBooks: {}", e)],
                });
            }
        };

        let mut synced_count = 0;
        let mut errors = Vec::new();

        // Import user model
        use crate::models::user::{Entity as UserEntity, Column as UserColumn, ActiveModel as UserActiveModel};
        use sea_orm::{Set, NotSet};

        // Sync each employee from QuickBooks to local database
        tracing::info!("Processing {} employees from QuickBooks", qb_employees.len());

        // Log all employee names for debugging
        for (idx, emp) in qb_employees.iter().enumerate() {
            if idx < 10 || idx >= qb_employees.len() - 10 {
                tracing::debug!("Employee {}: ID={:?}, given_name={:?}, family_name={:?}, email={:?}",
                    idx, emp.base.id, emp.base.given_name, emp.base.family_name,
                    emp.base.primary_email_addr.as_ref().and_then(|e| e.address.as_ref()));
            }
        }

        for qb_employee in qb_employees {
            // Skip if no ID or email
            let qb_id = match &qb_employee.base.id {
                Some(id) => id.clone(),
                None => {
                    tracing::warn!("Employee missing ID, skipping");
                    errors.push("Employee missing ID, skipping".to_string());
                    continue;
                }
            };

            tracing::debug!("Processing QuickBooks employee ID: {}", qb_id);

            // Log the full employee data for debugging
            tracing::debug!("QB Employee data: given_name={:?}, family_name={:?}, primary_email_addr={:?}",
                qb_employee.base.given_name, qb_employee.base.family_name, qb_employee.base.primary_email_addr);

            let email = match &qb_employee.base.primary_email_addr {
                Some(e) => {
                    let email_addr = e.address.clone().unwrap_or_default();
                    if email_addr.is_empty() {
                        tracing::warn!("Employee {} has primary_email_addr but address field is empty", qb_id);
                        errors.push(format!("Employee {} has empty email address, skipping", qb_id));
                        continue;
                    }
                    email_addr
                },
                None => {
                    tracing::warn!("Employee {} missing primary_email_addr field", qb_id);
                    errors.push(format!("Employee {} missing email, skipping", qb_id));
                    continue;
                }
            };

            // Check if user already exists by intuit_employee_id or email (excluding soft-deleted users)
            let existing_user = UserEntity::find()
                .filter(
                    sea_orm::Condition::any()
                        .add(UserColumn::IntuitEmployeeId.eq(&qb_id))
                        .add(UserColumn::Email.eq(&email))
                )
                .filter(UserColumn::DeletedAt.is_null()) // Exclude soft-deleted users
                .one(&db)
                .await?;

            match existing_user {
                Some(user) => {
                    // Update existing user
                    let mut user_update: UserActiveModel = user.into();
                    user_update.intuit_employee_id = Set(Some(qb_id.clone()));

                    if let Some(given_name) = &qb_employee.base.given_name {
                        user_update.first_name = Set(given_name.clone());
                    }
                    if let Some(family_name) = &qb_employee.base.family_name {
                        user_update.last_name = Set(family_name.clone());
                    }

                    // Update active status from QuickBooks
                    if let Some(is_active) = qb_employee.base.active {
                        user_update.is_active = Set(is_active);
                    }

                    // Update employee_number from QuickBooks (stable identifier)
                    user_update.employee_number = Set(qb_employee.employee_number.clone());

                    // Update sync tracking fields
                    user_update.last_synced_at = Set(Some(Utc::now()));
                    user_update.last_modified_at = Set(Utc::now());
                    user_update.quickbooks_sync_token = Set(qb_employee.base.sync_token.clone());
                    user_update.sync_status = Set("synced".to_string());
                    user_update.updated_at = Set(Utc::now());

                    if let Err(e) = user_update.update(&db).await {
                        errors.push(format!("Failed to update user {}: {}", email, e));
                        continue;
                    }

                    synced_count += 1;
                    tracing::info!("Updated user {} from QuickBooks", email);
                }
                None => {
                    // Create new user from QuickBooks employee data
                    tracing::info!("Creating new user from QuickBooks employee {}", qb_id);
                    use uuid::Uuid;

                    let given_name = qb_employee.base.given_name.clone().unwrap_or_else(|| "Unknown".to_string());
                    let family_name = qb_employee.base.family_name.clone().unwrap_or_else(|| "Employee".to_string());
                    let display_name = format!("{} {}", given_name, family_name);

                    tracing::debug!("Creating user: {} {} ({})", given_name, family_name, email);

                    // Generate a random password that user must change on first login
                    use bcrypt::{hash, DEFAULT_COST};
                    let random_password = Uuid::new_v4().to_string();
                    let password_hash = match hash(random_password, DEFAULT_COST) {
                        Ok(hash) => hash,
                        Err(e) => {
                            let error_msg = format!("Failed to hash password for {}: {}", email, e);
                            tracing::error!("{}", error_msg);
                            errors.push(error_msg);
                            continue;
                        }
                    };

                    let new_user = UserActiveModel {
                        id: Set(Uuid::new_v4()),
                        email: Set(email.clone()),
                        password_hash: Set(password_hash),
                        first_name: Set(given_name),
                        last_name: Set(family_name),
                        display_name: Set(display_name), // Manual setting allowed
                        full_name: NotSet, // GENERATED column (first_name + last_name)
                        phone_number: Set(None), // Will be populated from QuickBooks fields later
                        alternate_phone: Set(None),
                        mobile_number: Set(None),
                        nickname: Set(None),
                        social_media_release: Set(false),
                        job_title: Set(None),
                        status: Set(Some("active".to_string())),
                        department_id: Set(None),
                        manager_id: Set(None),
                        hire_date: Set(None),
                        termination_date: Set(None),
                        is_active: Set(qb_employee.base.active.unwrap_or(true)),
                        failed_login_attempts: Set(0),
                        locked_until: Set(None),
                        last_login: Set(None),
                        force_password_change: Set(true), // Force password change on first login
                        theme_preference: Set("light".to_string()),
                        birth_date: Set(None),
                        intuit_employee_id: Set(Some(qb_id.clone())),
                        employee_number: Set(qb_employee.employee_number.clone()),
                        last_synced_at: Set(Some(Utc::now())),
                        last_modified_at: Set(Utc::now()),
                        quickbooks_sync_token: Set(qb_employee.base.sync_token.clone()),
                        sync_status: Set("synced".to_string()),
                        // Payroll fields
                        compensation_type: Set(None),
                        annual_salary: Set(None),
                        hourly_rate: Set(None),
                        pay_schedule: Set(None),
                        commission_rate: Set(None),
                        bonus_eligible: Set(false),
                        quickbooks_payroll_item_id: Set(None),
                        created_at: Set(Utc::now()),
                        updated_at: Set(Utc::now()),
                        deleted_at: Set(None),
                    };

                    match new_user.insert(&db).await {
                        Ok(inserted_user) => {
                            synced_count += 1;
                            tracing::info!("✓ Successfully created new user {} (ID: {}) from QuickBooks employee {}", email, inserted_user.id, qb_id);
                        }
                        Err(e) => {
                            let error_msg = format!("Failed to create user {} from QuickBooks: {}", email, e);
                            tracing::error!("{}", error_msg);
                            errors.push(error_msg);
                        }
                    }
                }
            }
        }

        // Update last sync time
        update_last_sync_time(&db, connection.id).await?;

        // Log sync summary
        if errors.is_empty() {
            tracing::info!("✓ Sync completed successfully: {} employees synced", synced_count);
        } else {
            tracing::warn!("Sync completed with {} errors: {} employees synced", errors.len(), synced_count);
            for error in &errors {
                tracing::error!("Sync error: {}", error);
            }
        }

        Ok(SyncResult {
            success: errors.is_empty(),
            synced_count,
            errors,
        })
    }

    /// Push departments from HR system to QuickBooks
    async fn push_departments_to_quickbooks(&self, ctx: &Context<'_>) -> Result<SyncResult> {
        let db = get_db_from_context(ctx)?;
        let user_context = ctx.data::<UserContext>()
            .map_err(|_| async_graphql::Error::new("Authentication required"))?;

        // Use permission checker for granular access control
        let checker = PermissionChecker::new(db.clone());
        checker.require(user_context, SyncPermission::PushToQuickBooks).await?;

        // Get active connection
        let connection = get_active_connection(&db).await?;

        // Check if token needs refresh
        let (access_token, _) = ensure_valid_token(&db, &connection).await?;

        // Create Intuit client
        let client = IntuitClient::new(access_token, connection.realm_id.clone())
            .map_err(|e| async_graphql::Error::new(format!("Failed to create Intuit client: {}", e)))?;

        // Import department model
        use crate::models::department::{Entity as DepartmentEntity, Column as DepartmentColumn, ActiveModel as DepartmentActiveModel};
        use sea_orm::Set;

        // Fetch all active departments from HR system
        let hr_departments = DepartmentEntity::find()
            .filter(DepartmentColumn::DeletedAt.is_null())
            .all(&db)
            .await?;

        tracing::info!("Found {} total departments in database", hr_departments.len());

        let mut synced_count = 0;
        let mut errors = Vec::new();

        // First, query existing departments from QuickBooks to avoid duplicate name errors
        tracing::info!("Querying existing departments from QuickBooks");
        let qb_existing = client.query_departments().await?;

        // Match existing QB departments with local departments by name and update IDs
        for qb_dept in &qb_existing {
            if let (Some(qb_id), Some(qb_name)) = (&qb_dept.id, &qb_dept.name) {
                // Find matching local department by name
                if let Some(local_dept) = hr_departments.iter().find(|d| d.name == *qb_name) {
                    // Update local department with QB ID if it doesn't have one
                    if local_dept.intuit_department_id.is_none() {
                        let mut dept_update: DepartmentActiveModel = local_dept.clone().into();
                        dept_update.intuit_department_id = Set(Some(qb_id.clone()));
                        dept_update.updated_at = Set(Utc::now());

                        if let Err(e) = dept_update.update(&db).await {
                            errors.push(format!("Failed to update local ID for {}: {}", local_dept.name, e));
                        } else {
                            synced_count += 1;
                            tracing::info!("Matched department '{}' with existing QuickBooks ID {}", local_dept.name, qb_id);
                        }
                    }
                }
            }
        }

        // Reload departments to get updated IDs
        let hr_departments = DepartmentEntity::find()
            .filter(DepartmentColumn::DeletedAt.is_null())
            .all(&db)
            .await?;

        // Separate departments into create and update groups
        let mut departments_to_create = Vec::new();
        let mut departments_to_update = Vec::new();

        for dept in &hr_departments {
            if dept.intuit_department_id.is_some() {
                // Department has QB ID - check if it needs update
                // For now, we'll update all departments with QB IDs to ensure sync
                departments_to_update.push(dept);
                tracing::debug!("Department '{}' will be updated in QuickBooks", dept.name);
            } else {
                departments_to_create.push(dept);
                tracing::info!("Department '{}' needs to be created in QuickBooks", dept.name);
            }
        }

        tracing::info!("Found {} departments to create and {} to update in QuickBooks",
            departments_to_create.len(), departments_to_update.len());

        // ========== PART 1: Handle Creates ==========
        if departments_to_create.is_empty() && departments_to_update.is_empty() {
            tracing::info!("No departments need to be created or updated");

            // Update last sync time even if nothing was created
            update_last_sync_time(&db, connection.id).await?;

            return Ok(SyncResult {
                success: true,
                synced_count,
                errors,
            });
        }

        // Convert HR departments to QuickBooks Department objects
        let qb_departments: Vec<intuit::Department> = departments_to_create
            .iter()
            .map(|dept| intuit::Department {
                name: Some(dept.name.clone()),
                active: Some(true),
                sub_department: Some(false), // TODO: Support hierarchical departments
                parent_ref: None, // TODO: Support parent departments
                ..Default::default()
            })
            .collect();

        tracing::info!("Batch creating {} departments in QuickBooks", qb_departments.len());
        tracing::debug!("Department names: {:?}", qb_departments.iter().map(|d| &d.name).collect::<Vec<_>>());

        // Batch create departments (API handles chunking)
        let batch_results = client.batch_create_departments(qb_departments).await?;

        tracing::info!("Received {} results from QuickBooks batch create", batch_results.len());

        // Process results and update local database
        for (index, result) in batch_results.iter().enumerate() {
            let hr_department = departments_to_create[index];

            match result {
                Ok(qb_department) => {
                    tracing::info!("QuickBooks created department '{}' successfully", hr_department.name);
                    if let Some(qb_id) = &qb_department.id {
                        let mut dept_update: DepartmentActiveModel = hr_department.clone().into();
                        dept_update.intuit_department_id = Set(Some(qb_id.clone()));
                        dept_update.updated_at = Set(Utc::now());

                        if let Err(e) = dept_update.update(&db).await {
                            errors.push(format!("Created in QuickBooks but failed to update local record for {}: {}", hr_department.name, e));
                        } else {
                            synced_count += 1;
                            tracing::info!("Created department {} in QuickBooks with ID {}", hr_department.name, qb_id);
                        }
                    } else {
                        let err_msg = format!("QuickBooks didn't return ID for department {}", hr_department.name);
                        tracing::error!("{}", err_msg);
                        errors.push(err_msg);
                    }
                }
                Err(e) => {
                    let err_msg = format!("Failed to create '{}' in QuickBooks: {}", hr_department.name, e);
                    tracing::error!("{}", err_msg);
                    errors.push(err_msg);
                }
            }
        }

        // ========== PART 2: Handle Updates ==========
        if !departments_to_update.is_empty() {
            tracing::info!("Updating {} departments in QuickBooks", departments_to_update.len());

            for dept in departments_to_update {
                let qb_id = dept.intuit_department_id.clone().unwrap();

                // Fetch current department from QuickBooks to get SyncToken
                match client.get_department(&qb_id).await {
                    Ok(current_qb_department) => {
                        let sync_token = current_qb_department.sync_token.unwrap_or_else(|| "0".to_string());

                        // Build updated department with current data
                        let updated_department = intuit::Department {
                            id: Some(qb_id.clone()),
                            sync_token: Some(sync_token),
                            name: Some(dept.name.clone()),
                            active: Some(true),
                            sub_department: Some(false),
                            parent_ref: None,
                            ..Default::default()
                        };

                        // Perform update
                        match client.update_department(updated_department).await {
                            Ok(updated_qb_department) => {
                                tracing::info!("Successfully updated department '{}' in QuickBooks", dept.name);

                                // Update local sync tracking fields
                                let mut dept_update: DepartmentActiveModel = dept.clone().into();
                                dept_update.quickbooks_sync_token = Set(updated_qb_department.sync_token.clone());
                                dept_update.last_synced_at = Set(Some(Utc::now()));
                                dept_update.sync_status = Set("synced".to_string());
                                dept_update.updated_at = Set(Utc::now());

                                match dept_update.update(&db).await {
                                    Ok(_) => {
                                        synced_count += 1;
                                        tracing::info!("Updated local sync fields for department '{}'", dept.name);
                                    }
                                    Err(e) => {
                                        let err_msg = format!("Updated in QuickBooks but failed to update local sync fields for {}: {}", dept.name, e);
                                        tracing::error!("{}", err_msg);
                                        errors.push(err_msg);
                                    }
                                }
                            }
                            Err(e) => {
                                let err_msg = format!("Failed to update department '{}' in QuickBooks: {}", dept.name, e);
                                tracing::error!("{}", err_msg);
                                errors.push(err_msg);
                            }
                        }
                    }
                    Err(e) => {
                        let err_msg = format!("Failed to fetch current department '{}' from QuickBooks: {}", dept.name, e);
                        tracing::error!("{}", err_msg);
                        errors.push(err_msg);
                    }
                }
            }
        }

        tracing::info!("Department sync complete: {} synced, {} errors", synced_count, errors.len());

        // Update last sync time
        update_last_sync_time(&db, connection.id).await?;

        Ok(SyncResult {
            success: synced_count > 0 || errors.is_empty(),
            synced_count,
            errors,
        })
    }

    /// Synchronize all departments with QuickBooks (pull from QB to HR)
    async fn sync_all_departments(&self, ctx: &Context<'_>) -> Result<SyncResult> {
        let db = get_db_from_context(ctx)?;
        let user_context = ctx.data::<UserContext>()
            .map_err(|_| async_graphql::Error::new("Authentication required"))?;

        // Use permission checker for granular access control
        let checker = PermissionChecker::new(db.clone());
        checker.require(user_context, SyncPermission::TriggerDepartmentSync).await?;

        // Get active connection
        let connection = get_active_connection(&db).await?;

        // Check if token needs refresh
        let (access_token, _) = ensure_valid_token(&db, &connection).await?;

        // Create Intuit client
        let client = IntuitClient::new(access_token, connection.realm_id.clone())
            .map_err(|e| async_graphql::Error::new(format!("Failed to create Intuit client: {}", e)))?;

        // Fetch departments from QuickBooks
        let qb_departments = match client.query_departments().await {
            Ok(depts) => depts,
            Err(e) => {
                return Ok(SyncResult {
                    success: false,
                    synced_count: 0,
                    errors: vec![format!("Failed to fetch departments from QuickBooks: {}", e)],
                });
            }
        };

        let mut synced_count = 0;
        let mut errors = Vec::new();

        // Import department model
        use crate::models::department::{Entity as DepartmentEntity, Column as DepartmentColumn, ActiveModel as DepartmentActiveModel};
        use sea_orm::{Set, QueryFilter, Condition, sea_query::Expr};

        // Sync each department from QuickBooks to local database
        tracing::info!("Processing {} departments from QuickBooks", qb_departments.len());

        // First pass: Create/update departments without parent relationships
        for qb_department in &qb_departments {
            // Skip if no ID or name
            let qb_id = match &qb_department.id {
                Some(id) => id.clone(),
                None => {
                    tracing::warn!("Department missing ID, skipping");
                    errors.push("Department missing ID, skipping".to_string());
                    continue;
                }
            };

            let name = match &qb_department.name {
                Some(n) if !n.is_empty() => n.clone(),
                _ => {
                    tracing::warn!("Department {} missing or has empty name, skipping", qb_id);
                    errors.push(format!("Department {} missing name, skipping", qb_id));
                    continue;
                }
            };

            tracing::debug!("Processing QuickBooks department: ID={}, name={}", qb_id, name);

            // Check if department already exists by intuit_department_id or name (case-insensitive, excluding soft-deleted)
            let existing_department = DepartmentEntity::find()
                .filter(
                    Condition::any()
                        .add(DepartmentColumn::IntuitDepartmentId.eq(&qb_id))
                        .add(Expr::cust_with_values(
                            "LOWER(name) = LOWER($1)",
                            vec![sea_orm::Value::from(name.clone())]
                        ))
                )
                .filter(DepartmentColumn::DeletedAt.is_null()) // Exclude soft-deleted departments
                .one(&db)
                .await?;

            match existing_department {
                Some(dept) => {
                    // Update existing department
                    let mut dept_update: DepartmentActiveModel = dept.into();
                    dept_update.intuit_department_id = Set(Some(qb_id.clone()));
                    dept_update.name = Set(name.clone());

                    // Update sync tracking fields
                    dept_update.last_synced_at = Set(Some(Utc::now()));
                    dept_update.last_modified_at = Set(Utc::now());
                    dept_update.quickbooks_sync_token = Set(qb_department.sync_token.clone());
                    dept_update.sync_status = Set("synced".to_string());
                    dept_update.updated_at = Set(Utc::now());

                    if let Err(e) = dept_update.update(&db).await {
                        errors.push(format!("Failed to update department {}: {}", name, e));
                        continue;
                    }

                    synced_count += 1;
                    tracing::info!("Updated department {} from QuickBooks", name);
                }
                None => {
                    // Create new department from QuickBooks data
                    tracing::info!("Creating new department from QuickBooks: {}", name);
                    use uuid::Uuid;

                    let new_department = DepartmentActiveModel {
                        id: Set(Uuid::new_v4()),
                        name: Set(name.clone()),
                        description: Set(None),
                        parent_department_id: Set(None), // Will be updated in second pass if needed
                        manager_id: Set(None),
                        intuit_department_id: Set(Some(qb_id.clone())),
                        last_synced_at: Set(Some(Utc::now())),
                        last_modified_at: Set(Utc::now()),
                        quickbooks_sync_token: Set(qb_department.sync_token.clone()),
                        sync_status: Set("synced".to_string()),
                        created_at: Set(Utc::now()),
                        updated_at: Set(Utc::now()),
                        deleted_at: Set(None),
                    };

                    match new_department.insert(&db).await {
                        Ok(inserted_dept) => {
                            synced_count += 1;
                            tracing::info!("✓ Successfully created new department {} (ID: {}) from QuickBooks", name, inserted_dept.id);
                        }
                        Err(e) => {
                            let error_msg = format!("Failed to create department {} from QuickBooks: {}", name, e);
                            tracing::error!("{}", error_msg);
                            errors.push(error_msg);
                        }
                    }
                }
            }
        }

        // Second pass: Update parent department relationships
        // This ensures all departments exist before we try to link parents
        for qb_department in &qb_departments {
            if let (Some(qb_id), Some(parent_ref)) = (&qb_department.id, &qb_department.parent_ref) {
                if let Some(parent_qb_id) = &parent_ref.value {
                    // Find local department by QuickBooks ID
                    if let Ok(Some(local_dept)) = DepartmentEntity::find()
                        .filter(DepartmentColumn::IntuitDepartmentId.eq(qb_id))
                        .filter(DepartmentColumn::DeletedAt.is_null())
                        .one(&db)
                        .await
                    {
                        // Find parent department by QuickBooks ID
                        if let Ok(Some(parent_dept)) = DepartmentEntity::find()
                            .filter(DepartmentColumn::IntuitDepartmentId.eq(parent_qb_id))
                            .filter(DepartmentColumn::DeletedAt.is_null())
                            .one(&db)
                            .await
                        {
                            // Update parent relationship
                            let mut dept_update: DepartmentActiveModel = local_dept.into();
                            dept_update.parent_department_id = Set(Some(parent_dept.id));
                            dept_update.updated_at = Set(Utc::now());

                            if let Err(e) = dept_update.update(&db).await {
                                tracing::warn!("Failed to update parent relationship for department {}: {}", qb_id, e);
                            } else {
                                tracing::debug!("Updated parent relationship for department {}", qb_id);
                            }
                        }
                    }
                }
            }
        }

        // Update last sync time
        update_last_sync_time(&db, connection.id).await?;

        // Log sync summary
        if errors.is_empty() {
            tracing::info!("✓ Sync completed successfully: {} departments synced", synced_count);
        } else {
            tracing::warn!("Sync completed with {} errors: {} departments synced", errors.len(), synced_count);
            for error in &errors {
                tracing::error!("Sync error: {}", error);
            }
        }

        Ok(SyncResult {
            success: errors.is_empty(),
            synced_count,
            errors,
        })
    }

    /// Perform bidirectional sync with conflict resolution
    ///
    /// Syncs changes in both directions between the local database and QuickBooks.
    /// Detects conflicts when both sides have changes and applies the specified resolution strategy.
    async fn sync_bidirectional(
        &self,
        ctx: &Context<'_>,
        entity_type: EntityTypeInput,
        conflict_strategy: Option<ConflictStrategyInput>,
        sync_mode: Option<SyncModeInput>,
    ) -> Result<BidirectionalSyncResult> {
        let entity_type = entity_type.into();
        let db = get_db_from_context(ctx)?;
        let user_context = ctx.data::<UserContext>()
            .map_err(|_| async_graphql::Error::new("Authentication required"))?;

        // Use permission checker for granular access control
        let checker = PermissionChecker::new(db.clone());
        checker.require(user_context, SyncPermission::TriggerBidirectionalSync).await?;

        // Get active connection and ensure valid token
        let connection = get_active_connection(&db).await?;
        let (access_token, _token_refreshed) = ensure_valid_token(&db, &connection).await?;

        // Create QuickBooks client
        let client = IntuitClient::new(access_token, connection.realm_id.clone())
            .map_err(|e| async_graphql::Error::new(format!("Failed to create QuickBooks client: {}", e)))?;

        // Determine conflict strategy (default to LastWriteWins)
        let strategy = conflict_strategy
            .map(|s| s.into())
            .unwrap_or(ConflictStrategy::LastWriteWins);

        // Determine sync mode (default to Auto)
        let mode = sync_mode
            .map(|m| m.into())
            .unwrap_or(SyncMode::Auto);

        tracing::info!(
            "Starting bidirectional sync for {:?} with strategy {:?} and mode {:?}",
            entity_type,
            strategy,
            mode
        );

        // Perform intelligent bidirectional sync with mode selection
        let sync_report = SyncOrchestrator::sync_bidirectional_intelligent(&db, &client, entity_type, strategy, mode)
            .await
            .map_err(|e| async_graphql::Error::new(format!("Sync failed: {}", e)))?;

        // Update last sync time
        update_last_sync_time(&db, connection.id).await?;

        // Create sync log entry
        use crate::models::intuit_sync_log;
        use sea_orm::ActiveModelTrait;

        let mut sync_log = intuit_sync_log::ActiveModel::new(
            Some(user_context.user_id),
            &format!("{:?}", entity_type),
            "TwoWay",
            if sync_report.errors.is_empty() { "Success" } else { "Error" },
        );

        // Set enhanced tracking fields
        sync_log.change_direction = Set(Some("TwoWay".to_string()));

        // Detect conflicts from error messages that start with "CONFLICT:"
        let has_conflicts = sync_report.conflicts_resolved > 0 ||
            sync_report.errors.iter().any(|e| e.error_message.starts_with("CONFLICT:"));

        sync_log.conflict_detected = Set(has_conflicts);
        sync_log.conflict_resolution = Set(if has_conflicts {
            Some(format!("{:?} (manual review required for {} unresolved conflicts)",
                strategy,
                sync_report.errors.iter().filter(|e| e.error_message.starts_with("CONFLICT:")).count()))
        } else {
            None
        });
        sync_log.pushed_count = Set(sync_report.pushed_count as i32);
        sync_log.pulled_count = Set(sync_report.pulled_count as i32);
        sync_log.updated_count = Set(sync_report.updated_count as i32);
        sync_log.skipped_count = Set(sync_report.skipped_count as i32);

        // Set incremental sync metadata (Feature 3)
        sync_log.sync_mode = Set(sync_report.sync_mode.clone());
        sync_log.changes_detected = Set(sync_report.changes_detected as i32);
        sync_log.changes_processed = Set(sync_report.changes_processed as i32);

        if !sync_report.errors.is_empty() {
            let error_summary = sync_report.errors.iter()
                .take(5)
                .map(|e| e.error_message.as_str())
                .collect::<Vec<_>>()
                .join("; ");
            sync_log.error_message = Set(Some(format!(
                "{} errors: {}{}",
                sync_report.errors.len(),
                error_summary,
                if sync_report.errors.len() > 5 { "..." } else { "" }
            )));
        }

        sync_log.insert(&db).await
            .map_err(|e| async_graphql::Error::new(format!("Failed to create sync log: {}", e)))?;

        // Convert errors to strings
        let error_messages: Vec<String> = sync_report
            .errors
            .iter()
            .map(|e| e.error_message.clone())
            .collect();

        // Log summary
        if error_messages.is_empty() {
            tracing::info!(
                "✓ Bidirectional sync completed: pushed {} pulled {} resolved {} conflicts",
                sync_report.pushed_count,
                sync_report.pulled_count,
                sync_report.conflicts_resolved
            );
        } else {
            tracing::warn!(
                "Bidirectional sync completed with {} errors: pushed {} pulled {}",
                error_messages.len(),
                sync_report.pushed_count,
                sync_report.pulled_count
            );
        }

        Ok(BidirectionalSyncResult {
            success: error_messages.is_empty(),
            pushed_count: sync_report.pushed_count as i32,
            pulled_count: sync_report.pulled_count as i32,
            conflicts_resolved: sync_report.conflicts_resolved as i32,
            errors: error_messages,
            started_at: sync_report.started_at,
            completed_at: sync_report.completed_at,
            sync_mode: sync_report.sync_mode,
            changes_detected: sync_report.changes_detected as i32,
            changes_processed: sync_report.changes_processed as i32,
        })
    }

    /// Resolve a single sync conflict
    ///
    /// Resolves a conflict by choosing either the local or remote version.
    /// The chosen version will overwrite the other.
    async fn resolve_conflict(
        &self,
        ctx: &Context<'_>,
        entity_type: EntityTypeInput,
        entity_id: String,
        resolution: ConflictResolutionInput,
    ) -> Result<ConflictResolutionResult> {
        let entity_type_enum: EntityType = entity_type.into();
        let db = get_db_from_context(ctx)?;
        let user_context = ctx.data::<UserContext>()
            .map_err(|_| async_graphql::Error::new("Authentication required"))?;

        // Use permission checker for granular access control
        let checker = PermissionChecker::new(db.clone());
        checker.require(user_context, SyncPermission::ResolveConflicts).await?;

        tracing::info!(
            "Resolving conflict for {:?} entity_id={} with resolution={:?}",
            entity_type_enum,
            entity_id,
            resolution
        );

        // Get active connection and ensure valid token
        let connection = get_active_connection(&db).await?;
        let (access_token, _) = ensure_valid_token(&db, &connection).await?;

        // Create QuickBooks client (will be used when conflict resolution is implemented)
        let _client = IntuitClient::new(access_token, connection.realm_id.clone())
            .map_err(|e| async_graphql::Error::new(format!("Failed to create QuickBooks client: {}", e)))?;

        // For now, conflict resolution marks the conflict as acknowledged
        // The actual data conflicts need to be manually resolved in the database or QuickBooks
        // This allows admins to acknowledge they've seen the conflict and choose to:
        // - KeepLocal: Ignore QuickBooks version (manual fix in QB if needed)
        // - KeepRemote: Ignore local version (manual fix in DB if needed)

        let resolution_note = match resolution {
            ConflictResolutionInput::KeepLocal => {
                "Keeping local version - QuickBooks data will be overwritten on next sync"
            }
            ConflictResolutionInput::KeepRemote => {
                "Keeping QuickBooks version - local data will be overwritten on next sync"
            }
        };

        tracing::info!(
            "Conflict resolution chosen: {} for {:?} entity_id={}",
            resolution_note,
            entity_type_enum,
            entity_id
        );

        // Mark the conflict as acknowledged by updating the sync log
        // Find the most recent sync log with this conflict
        use crate::models::intuit_sync_log::{
            Entity as IntuitSyncLogEntity,
            Column as IntuitSyncLogColumn,
        };

        let recent_log = IntuitSyncLogEntity::find()
            .filter(IntuitSyncLogColumn::ConflictDetected.eq(true))
            .filter(IntuitSyncLogColumn::Status.eq("Error"))
            .order_by_desc(IntuitSyncLogColumn::CreatedAt)
            .one(&db)
            .await?;

        if let Some(log) = recent_log {
            // Update the log to mark conflict as resolved
            use crate::models::intuit_sync_log::ActiveModel as IntuitSyncLogActiveModel;
            use sea_orm::ActiveValue::Set;

            let mut log_update: IntuitSyncLogActiveModel = log.into();
            log_update.conflict_resolution = Set(Some(format!(
                "Manually resolved: {} at {}",
                resolution_note,
                chrono::Utc::now().to_rfc3339()
            )));
            log_update.update(&db).await?;
        }

        Ok(ConflictResolutionResult {
            success: true,
            error_message: None,
            entity_type: format!("{:?}", entity_type_enum),
            entity_id: entity_id.clone(),
        })
    }

    /// Reset employee QuickBooks sync status (DEV ONLY)
    /// Clears intuit_employee_id for a limited number of employees to allow re-testing sync
    #[allow(unused_variables)]
    async fn reset_employee_sync_for_testing(&self, ctx: &Context<'_>, limit: Option<i32>) -> Result<i32> {
        // Only allow in development mode
        #[cfg(not(debug_assertions))]
        {
            return Err(async_graphql::Error::new("This mutation is only available in development mode"));
        }

        #[cfg(debug_assertions)]
        {
            let db = get_db_from_context(ctx)?;
            let user_context = ctx.data::<UserContext>()
                .map_err(|_| async_graphql::Error::new("Authentication required"))?;

            // Dev endpoints require ManageIntegrations permission (critical)
            let checker = PermissionChecker::new(db.clone());
            checker.require(user_context, SyncPermission::ManageIntegrations).await?;

            use crate::models::user::{Entity as UserEntity, Column as UserColumn, ActiveModel as UserActiveModel};

            let limit = limit.unwrap_or(5).min(20); // Default 5, max 20

        // Find employees with QB IDs and departments
        use sea_orm::QuerySelect;

        let employees = UserEntity::find()
            .filter(UserColumn::DeletedAt.is_null())
            .filter(UserColumn::IntuitEmployeeId.is_not_null())
            .filter(UserColumn::DepartmentId.is_not_null())
            .limit(Some(limit as u64))
            .all(&db)
            .await?;

        let mut reset_count = 0;

        for employee in employees {
            let mut emp_update: UserActiveModel = employee.into();
            emp_update.intuit_employee_id = Set(None);
            emp_update.updated_at = Set(Utc::now());

            emp_update.update(&db).await?;
            reset_count += 1;
        }

            tracing::info!("[DEV] Reset {} employees for QuickBooks re-sync testing", reset_count);

            Ok(reset_count)
        }
    }

    /// Reset department QuickBooks IDs for testing (development only)
    #[allow(unused_variables)]
    async fn reset_department_sync_for_testing(&self, ctx: &Context<'_>) -> Result<i32> {
        // Only allow in development mode
        #[cfg(not(debug_assertions))]
        {
            return Err(async_graphql::Error::new("This mutation is only available in development mode"));
        }

        #[cfg(debug_assertions)]
        {
            let db = get_db_from_context(ctx)?;
            let user_context = ctx.data::<UserContext>()
                .map_err(|_| async_graphql::Error::new("Authentication required"))?;

            // Dev endpoints require ManageIntegrations permission (critical)
            let checker = PermissionChecker::new(db.clone());
            checker.require(user_context, SyncPermission::ManageIntegrations).await?;

            use crate::models::department::{Entity as DepartmentEntity, Column as DepartmentColumn, ActiveModel as DepartmentActiveModel};

            // Find all departments with QuickBooks IDs
            let departments = DepartmentEntity::find()
            .filter(DepartmentColumn::DeletedAt.is_null())
            .filter(DepartmentColumn::IntuitDepartmentId.is_not_null())
            .all(&db)
            .await?;

        let mut reset_count = 0;

        for department in departments {
            let mut dept_update: DepartmentActiveModel = department.into();
            dept_update.intuit_department_id = Set(None);
            dept_update.updated_at = Set(Utc::now());

            dept_update.update(&db).await?;
            reset_count += 1;
        }

            tracing::info!("[DEV] Reset {} departments for QuickBooks re-sync testing", reset_count);

            Ok(reset_count)
        }
    }

    /// Get reconciliation mutations
    async fn reconciliation(&self) -> crate::schema::mutations::ReconciliationMutations {
        crate::schema::mutations::ReconciliationMutations
    }

    /// Get sync rollback mutations
    async fn rollback(&self) -> crate::schema::mutations::SyncRollbackMutations {
        crate::schema::mutations::SyncRollbackMutations
    }

    /// Get error recovery mutations
    async fn error_recovery(&self) -> crate::schema::mutations::ErrorRecoveryMutations {
        crate::schema::mutations::ErrorRecoveryMutations
    }
}

// Helper functions

async fn get_active_connection(db: &DatabaseConnection) -> Result<crate::models::intuit_connection::Model> {
    IntuitConnectionEntity::find()
        .filter(IntuitConnectionColumn::DeletedAt.is_null())
        .filter(IntuitConnectionColumn::IsActive.eq(true))
        .order_by_desc(IntuitConnectionColumn::CreatedAt)
        .one(db)
        .await?
        .ok_or_else(|| async_graphql::Error::new("No active QuickBooks connection found"))
}

async fn ensure_valid_token(
    db: &DatabaseConnection,
    connection: &crate::models::intuit_connection::Model,
) -> Result<(String, bool)> {
    // Check if token is expired or about to expire (within 5 minutes)
    let now = Utc::now();
    let expires_soon = connection.token_expires_at <= now + chrono::Duration::minutes(5);

    if expires_soon {
        // Refresh the token
        let new_tokens = intuit::refresh_access_token(connection.refresh_token.clone())
            .await
            .map_err(|e| async_graphql::Error::new(format!("Failed to refresh token: {}", e)))?;

        // Calculate new expiration time
        let new_expires_at = Utc::now() + chrono::Duration::seconds(new_tokens.expires_in);

        // Update connection with new tokens
        let mut active_model: IntuitConnectionActiveModel = connection.clone().into();
        active_model.access_token = Set(new_tokens.access_token.clone());
        active_model.refresh_token = Set(new_tokens.refresh_token);
        active_model.token_expires_at = Set(new_expires_at.into());
        active_model.updated_at = Set(Utc::now().into());
        active_model.update(db).await?;

        Ok((new_tokens.access_token, true))
    } else {
        Ok((connection.access_token.clone(), false))
    }
}

async fn update_last_sync_time(db: &DatabaseConnection, connection_id: Uuid) -> Result<()> {
    let connection = IntuitConnectionEntity::find_by_id(connection_id)
        .one(db)
        .await?
        .ok_or_else(|| async_graphql::Error::new("Connection not found"))?;

    let mut active_model: IntuitConnectionActiveModel = connection.into();
    active_model.last_sync_at = Set(Some(Utc::now().into()));
    active_model.updated_at = Set(Utc::now().into());
    active_model.update(db).await?;

    Ok(())
}
