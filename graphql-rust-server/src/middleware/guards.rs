//! Authorization guards for async-graphql
//!
//! Idiomatic Rust approach for GraphQL authorization:
//! - Type-safe at compile time
//! - Clear authorization logic in resolvers
//! - Composable and reusable guards
//! - Better error messages for clients
//!
//! # Usage
//!
//! ```ignore
//! use async_graphql::*;
//! use hr_graphql_server::middleware::guards::*;
//! use hr_graphql_server::schema::QueryRoot;
//! use hr_graphql_server::models::User;
//!
//! #[Object]
//! impl QueryRoot {
//!     #[graphql(guard = "RequireRole::new(\"admin\")")]
//!     async fn admin_only_query(&self, ctx: &Context<'_>) -> Result<String> {
//!         Ok("Secret data".to_string())
//!     }
//!
//!     #[graphql(guard = "RequirePermission::new(\"employees:read\")")]
//!     async fn list_employees(&self, ctx: &Context<'_>) -> Result<Vec<User>> {
//!         // ... implementation
//!     }
//! }
//! ```

use crate::auth::UserContext;
use async_graphql::{Context, Error, ErrorExtensions, Guard, Result};

/// Guard that requires user to have a specific role
///
/// Roles are case-insensitive. Common roles:
/// - `Admin`: Full system access
/// - `HR Manager`: HR department access
/// - `Manager`: Team management access
/// - `Employee`: Basic employee access
#[derive(Debug, Clone)]
pub struct RequireRole {
    role: String,
}

impl RequireRole {
    pub fn new(role: impl Into<String>) -> Self {
        Self { role: role.into() }
    }
}

#[async_trait::async_trait]
impl Guard for RequireRole {
    async fn check(&self, ctx: &Context<'_>) -> Result<()> {
        let user_ctx = ctx.data::<UserContext>().map_err(|_| {
            Error::new("Authentication required")
                .extend_with(|_, e| e.set("code", "UNAUTHENTICATED"))
        })?;

        if user_ctx.has_role(&self.role) {
            Ok(())
        } else {
            Err(
                Error::new(format!("Requires role: {}", self.role)).extend_with(|_, e| {
                    e.set("code", "FORBIDDEN");
                    e.set("required_role", self.role.clone());
                }),
            )
        }
    }
}

/// Guard that requires user to have a specific permission
///
/// Supports wildcard permissions (`*`) for admin users.
/// Permission format: `resource:action` (e.g., `employees:read`, `departments:write`)
#[derive(Debug, Clone)]
pub struct RequirePermission {
    permission: String,
}

impl RequirePermission {
    pub fn new(permission: impl Into<String>) -> Self {
        Self {
            permission: permission.into(),
        }
    }
}

#[async_trait::async_trait]
impl Guard for RequirePermission {
    async fn check(&self, ctx: &Context<'_>) -> Result<()> {
        let user_ctx = ctx.data::<UserContext>().map_err(|_| {
            Error::new("Authentication required")
                .extend_with(|_, e| e.set("code", "UNAUTHENTICATED"))
        })?;

        if user_ctx.has_permission(&self.permission) {
            Ok(())
        } else {
            Err(
                Error::new(format!("Requires permission: {}", self.permission)).extend_with(
                    |_, e| {
                        e.set("code", "FORBIDDEN");
                        e.set("required_permission", self.permission.clone());
                    },
                ),
            )
        }
    }
}

/// Guard that requires user to have ANY of the specified roles
///
/// Useful for endpoints accessible to multiple role types.
#[derive(Debug, Clone)]
pub struct RequireAnyRole {
    roles: Vec<String>,
}

impl RequireAnyRole {
    pub fn new(roles: Vec<impl Into<String>>) -> Self {
        Self {
            roles: roles.into_iter().map(|r| r.into()).collect(),
        }
    }
}

#[async_trait::async_trait]
impl Guard for RequireAnyRole {
    async fn check(&self, ctx: &Context<'_>) -> Result<()> {
        let user_ctx = ctx.data::<UserContext>().map_err(|_| {
            Error::new("Authentication required")
                .extend_with(|_, e| e.set("code", "UNAUTHENTICATED"))
        })?;

        for role in &self.roles {
            if user_ctx.has_role(role) {
                return Ok(());
            }
        }

        Err(
            Error::new(format!("Requires one of roles: {}", self.roles.join(", "))).extend_with(
                |_, e| {
                    e.set("code", "FORBIDDEN");
                    e.set("required_roles", self.roles.clone());
                },
            ),
        )
    }
}

/// Guard that requires user to have minimum role level (hierarchical)
///
/// Role hierarchy (descending):
/// - Admin: 100
/// - HR Manager: 75
/// - Manager: 50
/// - Employee: 25
#[derive(Debug, Clone)]
pub struct RequireMinRoleLevel {
    min_level: i32,
}

impl RequireMinRoleLevel {
    pub fn new(min_level: i32) -> Self {
        Self { min_level }
    }

    // Convenience constructors
    pub fn admin() -> Self {
        Self { min_level: 100 }
    }

    pub fn hr_manager() -> Self {
        Self { min_level: 80 }
    }

    pub fn manager() -> Self {
        Self { min_level: 60 }
    }

    pub fn employee() -> Self {
        Self { min_level: 20 }
    }
}

#[async_trait::async_trait]
impl Guard for RequireMinRoleLevel {
    async fn check(&self, ctx: &Context<'_>) -> Result<()> {
        let user_ctx = ctx.data::<UserContext>().map_err(|_| {
            Error::new("Authentication required")
                .extend_with(|_, e| e.set("code", "UNAUTHENTICATED"))
        })?;

        let role_levels = [
            ("system", 1000), // System services have highest level
            ("Admin", 100),
            ("HR Manager", 75),
            ("Manager", 50),
            ("Employee", 25),
        ];

        let user_level = user_ctx
            .roles
            .iter()
            .filter_map(|role| {
                role_levels
                    .iter()
                    .find(|(name, _)| role.eq_ignore_ascii_case(name))
                    .map(|(_, level)| *level)
            })
            .max()
            .unwrap_or(0);

        if user_level >= self.min_level {
            Ok(())
        } else {
            Err(
                Error::new(format!("Requires minimum role level: {}", self.min_level)).extend_with(
                    |_, e| {
                        e.set("code", "FORBIDDEN");
                        e.set("user_level", user_level);
                        e.set("required_level", self.min_level);
                    },
                ),
            )
        }
    }
}

/// Guard that checks if user owns the resource
///
/// Useful for "my profile", "my timesheet", etc.
/// Admins bypass this check (can view any resource).
#[derive(Debug, Clone)]
pub struct RequireOwnership<F>
where
    F: Fn(&Context<'_>) -> Result<uuid::Uuid> + Send + Sync,
{
    get_resource_owner: F,
}

impl<F> RequireOwnership<F>
where
    F: Fn(&Context<'_>) -> Result<uuid::Uuid> + Send + Sync,
{
    pub fn new(get_resource_owner: F) -> Self {
        Self { get_resource_owner }
    }
}

#[async_trait::async_trait]
impl<F> Guard for RequireOwnership<F>
where
    F: Fn(&Context<'_>) -> Result<uuid::Uuid> + Send + Sync,
{
    async fn check(&self, ctx: &Context<'_>) -> Result<()> {
        let user_ctx = ctx.data::<UserContext>().map_err(|_| {
            Error::new("Authentication required")
                .extend_with(|_, e| e.set("code", "UNAUTHENTICATED"))
        })?;

        // Admins bypass ownership checks
        if user_ctx.has_role("Admin") {
            return Ok(());
        }

        let resource_owner = (self.get_resource_owner)(ctx)?;

        if user_ctx.user_id == resource_owner {
            Ok(())
        } else {
            Err(Error::new("You can only access your own resources")
                .extend_with(|_, e| e.set("code", "FORBIDDEN")))
        }
    }
}

/// Combine multiple guards with AND logic
///
/// All guards must pass for the check to succeed.
#[derive(Debug, Clone)]
pub struct And<G1, G2> {
    guard1: G1,
    guard2: G2,
}

impl<G1, G2> And<G1, G2> {
    pub fn new(guard1: G1, guard2: G2) -> Self {
        Self { guard1, guard2 }
    }
}

#[async_trait::async_trait]
impl<G1, G2> Guard for And<G1, G2>
where
    G1: Guard + Send + Sync,
    G2: Guard + Send + Sync,
{
    async fn check(&self, ctx: &Context<'_>) -> Result<()> {
        self.guard1.check(ctx).await?;
        self.guard2.check(ctx).await?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use uuid::Uuid;

    // Helper to create test context with user
    fn mock_user_context(roles: Vec<String>, permissions: Vec<String>) -> UserContext {
        UserContext::new(Uuid::new_v4(), roles, permissions)
    }

    // Note: Full guard tests require async-graphql Context setup
    // These are simplified unit tests for the logic

    #[test]
    fn test_user_context_role_checking() {
        let ctx = mock_user_context(vec!["admin".to_string()], vec!["*".to_string()]);

        assert!(ctx.has_role("admin"));
        assert!(ctx.has_role("ADMIN")); // Case insensitive
        assert!(!ctx.has_role("employee"));
    }

    #[test]
    fn test_user_context_permission_checking() {
        let ctx_wildcard =
            mock_user_context(vec!["system_admin".to_string()], vec!["*".to_string()]);

        assert!(ctx_wildcard.has_permission("anything"));

        let ctx_limited = mock_user_context(
            vec!["employee".to_string()],
            vec!["profile:read".to_string()],
        );

        assert!(ctx_limited.has_permission("profile:read"));
        assert!(!ctx_limited.has_permission("employees:write"));
    }
}
