//! Sync Permission Checker Service
//!
//! Provides granular permission checks for QuickBooks sync operations.
//! Implements role-based access control with department-scoped permissions
//! and audit logging for compliance.

use async_graphql::{Error, ErrorExtensions};
use sea_orm::{
    DatabaseConnection, ActiveModelTrait, Set,
};
use serde::{Deserialize, Serialize};
use std::fmt;
use uuid::Uuid;
use chrono::Utc;

use crate::auth::UserContext;

/// Sync-specific permissions for QuickBooks integration
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum SyncPermission {
    // Sync Operations
    /// Trigger employee sync (pull from QuickBooks)
    TriggerEmployeeSync,
    /// Trigger department sync (pull from QuickBooks)
    TriggerDepartmentSync,
    /// Push data to QuickBooks
    PushToQuickBooks,
    /// Trigger bidirectional sync
    TriggerBidirectionalSync,
    /// Force a full sync (ignoring change tracking)
    ForceFullSync,
    /// Cancel an in-progress sync
    CancelSync,

    // Conflict Management
    /// View sync conflicts
    ViewConflicts,
    /// Resolve individual conflicts
    ResolveConflicts,
    /// Bulk resolve multiple conflicts
    BulkResolveConflicts,

    // Configuration
    /// Manage sync schedules
    ManageSyncSchedules,
    /// Configure field mapping
    ConfigureFieldMapping,
    /// Manage validation rules
    ManageValidationRules,

    // Viewing
    /// View sync history/logs
    ViewSyncHistory,
    /// View audit trail
    ViewAuditTrail,
    /// View sync metrics
    ViewMetrics,
    /// Export sync data
    ExportData,

    // Administration
    /// Manage QuickBooks integration connection
    ManageIntegrations,
    /// Manage sync permissions
    ManagePermissions,
    /// View system logs
    ViewSystemLogs,
}

impl SyncPermission {
    /// Convert to permission string in resource:action format
    pub fn as_permission_string(&self) -> &'static str {
        match self {
            // Sync Operations
            SyncPermission::TriggerEmployeeSync => "sync:trigger_employee",
            SyncPermission::TriggerDepartmentSync => "sync:trigger_department",
            SyncPermission::PushToQuickBooks => "sync:push",
            SyncPermission::TriggerBidirectionalSync => "sync:trigger_bidirectional",
            SyncPermission::ForceFullSync => "sync:force_full",
            SyncPermission::CancelSync => "sync:cancel",

            // Conflict Management
            SyncPermission::ViewConflicts => "sync:view_conflicts",
            SyncPermission::ResolveConflicts => "sync:resolve_conflicts",
            SyncPermission::BulkResolveConflicts => "sync:bulk_resolve_conflicts",

            // Configuration
            SyncPermission::ManageSyncSchedules => "sync:manage_schedules",
            SyncPermission::ConfigureFieldMapping => "sync:configure_field_mapping",
            SyncPermission::ManageValidationRules => "sync:manage_validation_rules",

            // Viewing
            SyncPermission::ViewSyncHistory => "sync:view_history",
            SyncPermission::ViewAuditTrail => "sync:view_audit_trail",
            SyncPermission::ViewMetrics => "sync:view_metrics",
            SyncPermission::ExportData => "sync:export_data",

            // Administration
            SyncPermission::ManageIntegrations => "integrations:manage",
            SyncPermission::ManagePermissions => "sync:manage_permissions",
            SyncPermission::ViewSystemLogs => "sync:view_system_logs",
        }
    }

    /// Get the resource component
    pub fn resource(&self) -> &'static str {
        let perm_str = self.as_permission_string();
        perm_str.split(':').next().unwrap_or("sync")
    }

    /// Get the action component
    pub fn action(&self) -> &'static str {
        let perm_str = self.as_permission_string();
        perm_str.split(':').nth(1).unwrap_or("read")
    }

    /// Get human-readable description
    pub fn description(&self) -> &'static str {
        match self {
            SyncPermission::TriggerEmployeeSync => "Trigger employee synchronization from QuickBooks",
            SyncPermission::TriggerDepartmentSync => "Trigger department synchronization from QuickBooks",
            SyncPermission::PushToQuickBooks => "Push local data to QuickBooks",
            SyncPermission::TriggerBidirectionalSync => "Trigger bidirectional synchronization",
            SyncPermission::ForceFullSync => "Force a complete resync ignoring change tracking",
            SyncPermission::CancelSync => "Cancel an in-progress synchronization",
            SyncPermission::ViewConflicts => "View synchronization conflicts",
            SyncPermission::ResolveConflicts => "Resolve individual sync conflicts",
            SyncPermission::BulkResolveConflicts => "Bulk resolve multiple sync conflicts",
            SyncPermission::ManageSyncSchedules => "Manage automatic sync schedules",
            SyncPermission::ConfigureFieldMapping => "Configure field mapping between systems",
            SyncPermission::ManageValidationRules => "Manage sync validation rules",
            SyncPermission::ViewSyncHistory => "View synchronization history and logs",
            SyncPermission::ViewAuditTrail => "View audit trail of sync operations",
            SyncPermission::ViewMetrics => "View sync performance metrics",
            SyncPermission::ExportData => "Export sync data and reports",
            SyncPermission::ManageIntegrations => "Manage QuickBooks integration connection",
            SyncPermission::ManagePermissions => "Manage sync-related permissions",
            SyncPermission::ViewSystemLogs => "View system-level sync logs",
        }
    }

    /// Get risk level for this permission
    pub fn risk_level(&self) -> RiskLevel {
        match self {
            // High risk - can modify data
            SyncPermission::PushToQuickBooks => RiskLevel::High,
            SyncPermission::ForceFullSync => RiskLevel::High,
            SyncPermission::BulkResolveConflicts => RiskLevel::High,
            SyncPermission::ManageIntegrations => RiskLevel::Critical,
            SyncPermission::ManagePermissions => RiskLevel::Critical,

            // Medium risk - can modify behavior
            SyncPermission::TriggerEmployeeSync => RiskLevel::Medium,
            SyncPermission::TriggerDepartmentSync => RiskLevel::Medium,
            SyncPermission::TriggerBidirectionalSync => RiskLevel::Medium,
            SyncPermission::CancelSync => RiskLevel::Medium,
            SyncPermission::ResolveConflicts => RiskLevel::Medium,
            SyncPermission::ManageSyncSchedules => RiskLevel::Medium,
            SyncPermission::ConfigureFieldMapping => RiskLevel::Medium,
            SyncPermission::ManageValidationRules => RiskLevel::Medium,

            // Low risk - read-only
            SyncPermission::ViewConflicts => RiskLevel::Low,
            SyncPermission::ViewSyncHistory => RiskLevel::Low,
            SyncPermission::ViewAuditTrail => RiskLevel::Low,
            SyncPermission::ViewMetrics => RiskLevel::Low,
            SyncPermission::ExportData => RiskLevel::Low,
            SyncPermission::ViewSystemLogs => RiskLevel::Low,
        }
    }

    /// Get category for this permission
    pub fn category(&self) -> PermissionCategory {
        match self {
            SyncPermission::TriggerEmployeeSync
            | SyncPermission::TriggerDepartmentSync
            | SyncPermission::PushToQuickBooks
            | SyncPermission::TriggerBidirectionalSync
            | SyncPermission::ForceFullSync
            | SyncPermission::CancelSync => PermissionCategory::SyncOperations,

            SyncPermission::ViewConflicts
            | SyncPermission::ResolveConflicts
            | SyncPermission::BulkResolveConflicts => PermissionCategory::ConflictManagement,

            SyncPermission::ManageSyncSchedules
            | SyncPermission::ConfigureFieldMapping
            | SyncPermission::ManageValidationRules => PermissionCategory::Configuration,

            SyncPermission::ViewSyncHistory
            | SyncPermission::ViewAuditTrail
            | SyncPermission::ViewMetrics
            | SyncPermission::ExportData => PermissionCategory::Viewing,

            SyncPermission::ManageIntegrations
            | SyncPermission::ManagePermissions
            | SyncPermission::ViewSystemLogs => PermissionCategory::Administration,
        }
    }

    /// List all sync permissions
    pub fn all() -> Vec<SyncPermission> {
        vec![
            SyncPermission::TriggerEmployeeSync,
            SyncPermission::TriggerDepartmentSync,
            SyncPermission::PushToQuickBooks,
            SyncPermission::TriggerBidirectionalSync,
            SyncPermission::ForceFullSync,
            SyncPermission::CancelSync,
            SyncPermission::ViewConflicts,
            SyncPermission::ResolveConflicts,
            SyncPermission::BulkResolveConflicts,
            SyncPermission::ManageSyncSchedules,
            SyncPermission::ConfigureFieldMapping,
            SyncPermission::ManageValidationRules,
            SyncPermission::ViewSyncHistory,
            SyncPermission::ViewAuditTrail,
            SyncPermission::ViewMetrics,
            SyncPermission::ExportData,
            SyncPermission::ManageIntegrations,
            SyncPermission::ManagePermissions,
            SyncPermission::ViewSystemLogs,
        ]
    }
}

impl fmt::Display for SyncPermission {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.as_permission_string())
    }
}

/// Permission risk level for compliance categorization
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum RiskLevel {
    /// Read-only operations
    Low,
    /// Can trigger operations but not modify data directly
    Medium,
    /// Can modify data
    High,
    /// Full system access, can modify permissions
    Critical,
}

impl RiskLevel {
    pub fn as_str(&self) -> &'static str {
        match self {
            RiskLevel::Low => "LOW",
            RiskLevel::Medium => "MEDIUM",
            RiskLevel::High => "HIGH",
            RiskLevel::Critical => "CRITICAL",
        }
    }
}

impl fmt::Display for RiskLevel {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.as_str())
    }
}

/// Permission categories for grouping
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum PermissionCategory {
    SyncOperations,
    ConflictManagement,
    Configuration,
    Viewing,
    Administration,
}

impl PermissionCategory {
    pub fn as_str(&self) -> &'static str {
        match self {
            PermissionCategory::SyncOperations => "Sync Operations",
            PermissionCategory::ConflictManagement => "Conflict Management",
            PermissionCategory::Configuration => "Configuration",
            PermissionCategory::Viewing => "Viewing",
            PermissionCategory::Administration => "Administration",
        }
    }
}

impl fmt::Display for PermissionCategory {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.as_str())
    }
}

/// Scoped permission for department-based access
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PermissionScope {
    /// Permission applies to self only
    Self_,
    /// Permission applies to own department
    Department,
    /// Permission applies to entire organization
    Organization,
}

/// Result of a permission check with context
#[derive(Debug, Clone)]
pub struct PermissionCheckResult {
    /// Whether the permission was granted
    pub granted: bool,
    /// The permission that was checked
    pub permission: SyncPermission,
    /// The scope under which permission was granted (if any)
    pub scope: Option<PermissionScope>,
    /// Reason for the decision
    pub reason: String,
}

/// Permission Checker Service
///
/// Provides async permission checks with audit logging.
/// Integrates with the existing RBAC system while adding
/// sync-specific granular permissions.
#[derive(Clone)]
pub struct PermissionChecker {
    db: DatabaseConnection,
}

impl PermissionChecker {
    /// Create a new PermissionChecker
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }

    /// Check if user has a specific sync permission
    ///
    /// Returns true if the user has the permission either through:
    /// 1. Admin/system role (all permissions)
    /// 2. Direct permission assignment in the database
    /// 3. Role-based permission grant
    pub async fn check(
        &self,
        user_context: &UserContext,
        permission: SyncPermission,
    ) -> Result<PermissionCheckResult, Error> {
        // System context always has permission
        if user_context.is_system() {
            return Ok(self.grant_permission(permission, "System context has all permissions"));
        }

        // Admin role has all permissions
        if user_context.is_admin() {
            let result = self.grant_permission(permission, "Admin role has all permissions");
            self.log_permission_check(user_context.user_id, permission, true, &result.reason).await?;
            return Ok(result);
        }

        // Check for wildcard permission
        if user_context.permissions.contains(&"*".to_string()) {
            let result = self.grant_permission(permission, "Wildcard permission granted");
            self.log_permission_check(user_context.user_id, permission, true, &result.reason).await?;
            return Ok(result);
        }

        // Check specific permission string
        let perm_string = permission.as_permission_string().to_string();
        if user_context.has_permission(&perm_string) {
            let result = self.grant_permission(permission, &format!("Permission '{}' found in user context", perm_string));
            self.log_permission_check(user_context.user_id, permission, true, &result.reason).await?;
            return Ok(result);
        }

        // Check for legacy manage:integrations permission for backward compatibility
        if matches!(permission,
            SyncPermission::TriggerEmployeeSync
            | SyncPermission::TriggerDepartmentSync
            | SyncPermission::TriggerBidirectionalSync
            | SyncPermission::ViewSyncHistory
            | SyncPermission::ViewConflicts
            | SyncPermission::ResolveConflicts
            | SyncPermission::ManageIntegrations
        ) && user_context.has_permission("manage:integrations") {
            let result = self.grant_permission(permission, "Legacy 'manage:integrations' permission grants access");
            self.log_permission_check(user_context.user_id, permission, true, &result.reason).await?;
            return Ok(result);
        }

        // Check for scoped permissions (department-based)
        if let Some(result) = self.check_scoped_permission(user_context, permission).await? {
            if result.granted {
                self.log_permission_check(user_context.user_id, permission, true, &result.reason).await?;
                return Ok(result);
            }
        }

        // Permission denied
        let reason = format!("Permission '{}' not granted to user", perm_string);
        self.log_permission_check(user_context.user_id, permission, false, &reason).await?;

        Ok(PermissionCheckResult {
            granted: false,
            permission,
            scope: None,
            reason,
        })
    }

    /// Check if user has permission and return error if not
    pub async fn require(
        &self,
        user_context: &UserContext,
        permission: SyncPermission,
    ) -> Result<(), Error> {
        let result = self.check(user_context, permission).await?;

        if result.granted {
            Ok(())
        } else {
            Err(Error::new(format!(
                "Permission denied: {} - {}",
                permission.as_permission_string(),
                result.reason
            )).extend_with(|_, e| {
                e.set("code", "FORBIDDEN");
                e.set("permission", permission.as_permission_string());
            }))
        }
    }

    /// Check if user has any of the specified permissions
    pub async fn check_any(
        &self,
        user_context: &UserContext,
        permissions: &[SyncPermission],
    ) -> Result<PermissionCheckResult, Error> {
        for perm in permissions {
            let result = self.check(user_context, *perm).await?;
            if result.granted {
                return Ok(result);
            }
        }

        // None granted
        let perm_list: Vec<_> = permissions.iter().map(|p| p.as_permission_string()).collect();
        Ok(PermissionCheckResult {
            granted: false,
            permission: permissions[0],
            scope: None,
            reason: format!("None of the required permissions granted: {:?}", perm_list),
        })
    }

    /// Check if user has all of the specified permissions
    pub async fn check_all(
        &self,
        user_context: &UserContext,
        permissions: &[SyncPermission],
    ) -> Result<bool, Error> {
        for perm in permissions {
            let result = self.check(user_context, *perm).await?;
            if !result.granted {
                return Ok(false);
            }
        }
        Ok(true)
    }

    /// Check for scoped permissions (department-level access)
    async fn check_scoped_permission(
        &self,
        user_context: &UserContext,
        permission: SyncPermission,
    ) -> Result<Option<PermissionCheckResult>, Error> {
        // HR Manager role gets read/view permissions for all
        if user_context.is_hr_manager() {
            match permission {
                SyncPermission::ViewSyncHistory
                | SyncPermission::ViewConflicts
                | SyncPermission::ViewMetrics
                | SyncPermission::ViewAuditTrail => {
                    return Ok(Some(PermissionCheckResult {
                        granted: true,
                        permission,
                        scope: Some(PermissionScope::Organization),
                        reason: "HR Manager role has organization-wide view access".to_string(),
                    }));
                }
                SyncPermission::TriggerEmployeeSync
                | SyncPermission::TriggerDepartmentSync
                | SyncPermission::ResolveConflicts => {
                    return Ok(Some(PermissionCheckResult {
                        granted: true,
                        permission,
                        scope: Some(PermissionScope::Organization),
                        reason: "HR Manager role has sync operation access".to_string(),
                    }));
                }
                _ => {}
            }
        }

        // Manager role gets limited department-scoped access
        if user_context.is_manager() {
            match permission {
                SyncPermission::ViewSyncHistory
                | SyncPermission::ViewConflicts => {
                    // Check if user has department_id set
                    if user_context.department_id.is_some() {
                        return Ok(Some(PermissionCheckResult {
                            granted: true,
                            permission,
                            scope: Some(PermissionScope::Department),
                            reason: "Manager role has department-scoped view access".to_string(),
                        }));
                    }
                }
                SyncPermission::ResolveConflicts => {
                    // Manager can resolve conflicts for their department
                    if user_context.department_id.is_some() {
                        return Ok(Some(PermissionCheckResult {
                            granted: true,
                            permission,
                            scope: Some(PermissionScope::Department),
                            reason: "Manager role can resolve conflicts for own department".to_string(),
                        }));
                    }
                }
                _ => {}
            }
        }

        // Employee role - very limited self-access
        if user_context.has_role("Employee") {
            if let SyncPermission::ViewSyncHistory = permission {
                return Ok(Some(PermissionCheckResult {
                    granted: true,
                    permission,
                    scope: Some(PermissionScope::Self_),
                    reason: "Employee can view own sync history".to_string(),
                }));
            }
        }

        Ok(None)
    }

    /// Create a granted permission result
    fn grant_permission(&self, permission: SyncPermission, reason: &str) -> PermissionCheckResult {
        PermissionCheckResult {
            granted: true,
            permission,
            scope: Some(PermissionScope::Organization),
            reason: reason.to_string(),
        }
    }

    /// Log a permission check for audit purposes
    async fn log_permission_check(
        &self,
        user_id: Uuid,
        permission: SyncPermission,
        granted: bool,
        reason: &str,
    ) -> Result<(), Error> {
        use crate::models::sync_permission_audit;

        let audit_entry = sync_permission_audit::ActiveModel {
            id: Set(Uuid::new_v4()),
            user_id: Set(user_id),
            permission_name: Set(permission.as_permission_string().to_string()),
            action: Set(format!("check:{}", permission.category().as_str())),
            granted: Set(granted),
            reason: Set(Some(reason.to_string())),
            checked_at: Set(Utc::now()),
        };

        // Insert audit log - don't fail the permission check if logging fails
        if let Err(e) = audit_entry.insert(&self.db).await {
            tracing::warn!("Failed to log permission check: {}", e);
        }

        Ok(())
    }

    /// Get all permissions granted to a user
    pub async fn get_user_sync_permissions(
        &self,
        user_context: &UserContext,
    ) -> Result<Vec<SyncPermission>, Error> {
        let mut granted = Vec::new();

        for perm in SyncPermission::all() {
            let result = self.check(user_context, perm).await?;
            if result.granted {
                granted.push(perm);
            }
        }

        Ok(granted)
    }
}

/// Async-graphql guard for sync permissions
#[derive(Clone)]
pub struct SyncPermissionGuard {
    pub permission: SyncPermission,
}

impl SyncPermissionGuard {
    pub fn new(permission: SyncPermission) -> Self {
        Self { permission }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sync_permission_string_format() {
        assert_eq!(
            SyncPermission::TriggerEmployeeSync.as_permission_string(),
            "sync:trigger_employee"
        );
        assert_eq!(
            SyncPermission::ManageIntegrations.as_permission_string(),
            "integrations:manage"
        );
    }

    #[test]
    fn test_sync_permission_resource_action() {
        let perm = SyncPermission::ViewConflicts;
        assert_eq!(perm.resource(), "sync");
        assert_eq!(perm.action(), "view_conflicts");
    }

    #[test]
    fn test_risk_levels() {
        assert_eq!(SyncPermission::ViewSyncHistory.risk_level(), RiskLevel::Low);
        assert_eq!(SyncPermission::TriggerEmployeeSync.risk_level(), RiskLevel::Medium);
        assert_eq!(SyncPermission::PushToQuickBooks.risk_level(), RiskLevel::High);
        assert_eq!(SyncPermission::ManageIntegrations.risk_level(), RiskLevel::Critical);
    }

    #[test]
    fn test_categories() {
        assert_eq!(
            SyncPermission::TriggerEmployeeSync.category(),
            PermissionCategory::SyncOperations
        );
        assert_eq!(
            SyncPermission::ViewConflicts.category(),
            PermissionCategory::ConflictManagement
        );
        assert_eq!(
            SyncPermission::ManageIntegrations.category(),
            PermissionCategory::Administration
        );
    }

    #[test]
    fn test_all_permissions_unique() {
        let all = SyncPermission::all();
        let mut strings: Vec<_> = all.iter().map(|p| p.as_permission_string()).collect();
        strings.sort();
        strings.dedup();
        assert_eq!(strings.len(), all.len(), "All permission strings must be unique");
    }

    #[test]
    fn test_permission_check_result_admin() {
        let user_ctx = UserContext::new(
            Uuid::new_v4(),
            vec!["Admin".to_string()],
            vec![],
        );

        assert!(user_ctx.is_admin());
    }

    #[test]
    fn test_permission_check_result_hr_manager() {
        let user_ctx = UserContext::new(
            Uuid::new_v4(),
            vec!["HR Manager".to_string()],
            vec![],
        );

        assert!(user_ctx.is_hr_manager());
        assert!(user_ctx.is_manager());
        assert!(!user_ctx.is_admin());
    }
}
