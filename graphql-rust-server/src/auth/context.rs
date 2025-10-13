//! User authentication context for GraphQL resolvers

use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// User context extracted from JWT token
/// Contains user identification, roles, and permissions for RBAC
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserContext {
    /// User ID from JWT subject claim
    pub user_id: Uuid,

    /// User roles (e.g., "Admin", "HR_Manager", "Manager", "Employee")
    pub roles: Vec<String>,

    /// User permissions (e.g., "employees:read", "documents:write")
    pub permissions: Vec<String>,

    /// Optional: User email for logging/audit
    pub email: Option<String>,
}

impl UserContext {
    /// Create a new UserContext
    pub fn new(user_id: Uuid, roles: Vec<String>, permissions: Vec<String>) -> Self {
        Self {
            user_id,
            roles,
            permissions,
            email: None,
        }
    }

    /// Check if user has a specific role
    pub fn has_role(&self, role: &str) -> bool {
        self.roles.iter().any(|r| r == role)
    }

    /// Check if user has a specific permission
    pub fn has_permission(&self, permission: &str) -> bool {
        // Admin role has all permissions
        if self.has_role("Admin") {
            return true;
        }

        self.permissions.iter().any(|p| p == permission || p == "*")
    }

    /// Check if user has Admin role (full system access)
    pub fn is_admin(&self) -> bool {
        self.has_role("Admin")
    }

    /// Check if user has HR Manager role
    pub fn is_hr_manager(&self) -> bool {
        self.has_role("HR_Manager") || self.is_admin()
    }

    /// Check if user has Manager role
    pub fn is_manager(&self) -> bool {
        self.has_role("Manager") || self.is_hr_manager()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_admin_has_all_permissions() {
        let ctx = UserContext::new(
            Uuid::new_v4(),
            vec!["Admin".to_string()],
            vec![],
        );

        assert!(ctx.has_permission("any:permission"));
        assert!(ctx.is_admin());
        assert!(ctx.is_hr_manager());
        assert!(ctx.is_manager());
    }

    #[test]
    fn test_role_hierarchy() {
        let ctx = UserContext::new(
            Uuid::new_v4(),
            vec!["HR_Manager".to_string()],
            vec!["employees:read".to_string()],
        );

        assert!(!ctx.is_admin());
        assert!(ctx.is_hr_manager());
        assert!(ctx.is_manager());
        assert!(ctx.has_permission("employees:read"));
        assert!(!ctx.has_permission("system:admin"));
    }
}
