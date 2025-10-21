//! RLS-aware database session management
//!
//! This module provides type-safe Row-Level Security (RLS) integration for PostgreSQL.
//! It ensures all database queries execute with proper user context for RLS policies.
//!
//! # Design
//!
//! - **RlsSession**: Extracts user context from GraphQL requests
//! - **RlsTransaction**: Wraps PostgreSQL transactions with RLS variables set
//! - **RlsContextExt**: Extension trait for ergonomic Context usage
//!
//! # Usage
//!
//! ```rust,no_run
//! use crate::db::rls_context::RlsContextExt;
//!
//! async fn my_resolver(ctx: &Context<'_>) -> Result<Vec<Notification>> {
//!     let pool = ctx.data::<PgPool>()?;
//!     let session = ctx.rls_session()?;
//!
//!     session.execute(pool, |mut tx| async move {
//!         sqlx::query_as::<_, Notification>(
//!             "SELECT * FROM hr_public.notifications WHERE recipient_id = $1"
//!         )
//!         .bind(session.user_id())
//!         .fetch_all(&mut **tx.as_mut())
//!         .await
//!     }).await
//! }
//! ```

use async_graphql::{Context, Error, ErrorExtensions};
use sqlx::{PgPool, Postgres, Transaction};
use uuid::Uuid;
use std::future::Future;
use std::pin::Pin;

use crate::auth::context::UserContext;

/// Type alias for boxed futures (required for recursive async)
type BoxFuture<'a, T> = Pin<Box<dyn Future<Output = T> + Send + 'a>>;

/// RLS-aware database session
///
/// Automatically manages transaction lifecycle and PostgreSQL session variables
/// for Row-Level Security policies.
#[derive(Debug, Clone)]
pub struct RlsSession {
    user_id: Uuid,
    roles: Vec<String>,
    permissions: Vec<String>,
}

impl RlsSession {
    /// Extract RLS session from GraphQL context
    ///
    /// This is the primary entry point for all resolvers.
    /// Returns an error if no authenticated user context is found.
    ///
    /// **Note**: With the Guard-based approach, most resolvers should use Guards
    /// for authorization instead of RLS. Use this only when you need defense-in-depth
    /// with PostgreSQL RLS policies as an additional security layer.
    ///
    /// # Errors
    ///
    /// Returns `UNAUTHENTICATED` error if:
    /// - No UserContext found in GraphQL context
    /// - User context is invalid
    pub fn from_context(ctx: &Context<'_>) -> Result<Self, Error> {
        let user_ctx = ctx
            .data::<UserContext>()
            .map_err(|_| {
                tracing::warn!("Attempt to access RLS session without authentication");
                Error::new("Authentication required")
                    .extend_with(|_, e| e.set("code", "UNAUTHENTICATED"))
            })?;

        Ok(Self {
            user_id: user_ctx.user_id,
            roles: user_ctx.roles.clone(),
            permissions: user_ctx.permissions.clone(),
        })
    }

    /// Optionally extract RLS session from GraphQL context
    ///
    /// Returns None if no authenticated user context is found.
    /// Useful for queries that need to behave differently for authenticated vs anonymous users.
    ///
    /// **Prefer using Guards for authorization**. This method is for special cases
    /// where you need optional authentication.
    pub fn from_context_optional(ctx: &Context<'_>) -> Option<Self> {
        ctx.data::<UserContext>()
            .ok()
            .map(|user_ctx| Self {
                user_id: user_ctx.user_id,
                roles: user_ctx.roles.clone(),
                permissions: user_ctx.permissions.clone(),
            })
    }

    /// Execute a query with RLS variables set
    ///
    /// This handles the full transaction lifecycle:
    /// 1. Begin transaction
    /// 2. Set RLS session variables (app.user_id, app.roles, app.permissions)
    /// 3. Execute user function
    /// 4. Commit on success, rollback on error
    ///
    /// # Type Parameters
    ///
    /// - `F`: Closure that takes RlsTransaction and returns a Future
    /// - `T`: Return type of the query
    ///
    /// # Errors
    ///
    /// Returns errors if:
    /// - Transaction cannot be started
    /// - RLS variables cannot be set
    /// - User function returns an error
    /// - Transaction cannot be committed
    pub async fn execute<F, T>(
        &self,
        pool: &PgPool,
        f: F,
    ) -> Result<T, Error>
    where
        F: for<'a> FnOnce(&'a mut RlsTransaction<'a>) -> BoxFuture<'a, Result<T, Error>>,
        T: Send,
    {
        let mut tx = pool
            .begin()
            .await
            .map_err(|e| {
                tracing::error!("Failed to begin transaction: {}", e);
                Error::new("Database error")
                    .extend_with(|_, ext| ext.set("code", "INTERNAL_ERROR"))
            })?;

        // Set RLS session variables
        self.set_rls_variables(&mut tx).await?;

        // Create RLS-aware transaction wrapper
        let mut rls_tx = RlsTransaction {
            tx: &mut tx,
            session: self,
        };

        // Execute user function
        let result = f(&mut rls_tx).await;

        // Handle result and commit/rollback
        match result {
            Ok(value) => {
                tx.commit().await.map_err(|e| {
                    tracing::error!("Failed to commit transaction: {}", e);
                    Error::new("Database error")
                        .extend_with(|_, ext| ext.set("code", "INTERNAL_ERROR"))
                })?;
                Ok(value)
            }
            Err(e) => {
                // Rollback happens automatically when tx is dropped
                Err(e)
            }
        }
    }

    /// Set RLS session variables on a transaction
    ///
    /// Sets the following PostgreSQL session variables:
    /// - `app.user_id`: UUID of authenticated user
    /// - `app.roles`: Comma-separated list of user roles
    /// - `app.permissions`: Comma-separated list of permissions
    ///
    /// These can be accessed in RLS policies via:
    /// ```sql
    /// current_setting('app.user_id')::uuid
    /// current_setting('app.roles')
    /// current_setting('app.permissions')
    /// ```
    async fn set_rls_variables(
        &self,
        tx: &mut Transaction<'_, Postgres>,
    ) -> Result<(), Error> {
        // Set user_id
        sqlx::query(&format!(
            "SET LOCAL app.user_id = '{}'",
            self.user_id
        ))
        .execute(&mut **tx)
        .await
        .map_err(|e| {
            tracing::error!("Failed to set app.user_id: {}", e);
            Error::new("RLS setup failed")
                .extend_with(|_, ext| ext.set("code", "INTERNAL_ERROR"))
        })?;

        // Set roles as comma-separated string
        let roles_str = self.roles.join(",");
        sqlx::query(&format!(
            "SET LOCAL app.roles = '{}'",
            roles_str
        ))
        .execute(&mut **tx)
        .await
        .map_err(|e| {
            tracing::error!("Failed to set app.roles: {}", e);
            Error::new("RLS setup failed")
                .extend_with(|_, ext| ext.set("code", "INTERNAL_ERROR"))
        })?;

        // Set permissions (for fine-grained access control)
        let permissions_str = self.permissions.join(",");
        sqlx::query(&format!(
            "SET LOCAL app.permissions = '{}'",
            permissions_str
        ))
        .execute(&mut **tx)
        .await
        .map_err(|e| {
            tracing::error!("Failed to set app.permissions: {}", e);
            Error::new("RLS setup failed")
                .extend_with(|_, ext| ext.set("code", "INTERNAL_ERROR"))
        })?;



        Ok(())
    }

    /// Get the authenticated user's ID
    pub fn user_id(&self) -> Uuid {
        self.user_id
    }

    /// Get the authenticated user's roles
    pub fn roles(&self) -> &[String] {
        &self.roles
    }

    /// Get the authenticated user's permissions
    pub fn permissions(&self) -> &[String] {
        &self.permissions
    }

    /// Check if user has a specific role
    pub fn has_role(&self, role: &str) -> bool {
        self.roles.iter().any(|r| r.eq_ignore_ascii_case(role))
    }

    /// Check if user has wildcard permissions (full access)
    pub fn has_wildcard_permission(&self) -> bool {
        self.permissions.contains(&"*".to_string())
    }

    /// Check if user has a specific permission
    pub fn has_permission(&self, permission: &str) -> bool {
        self.has_wildcard_permission() ||
        self.permissions.iter().any(|p| p == permission)
    }

    /// Check if user has minimum role level (for hierarchical permissions)
    pub fn has_min_role_level(&self, min_level: i32) -> bool {
        let role_levels = [
            ("system_admin", 200),
            ("admin", 100),
            ("hr_manager", 80),
            ("manager", 60),
            ("employee", 20),
        ];

        let user_level = self.roles.iter()
            .filter_map(|role| {
                role_levels.iter()
                    .find(|(name, _)| role.eq_ignore_ascii_case(name))
                    .map(|(_, level)| *level)
            })
            .max()
            .unwrap_or(0);

        user_level >= min_level
    }
}

/// RLS-aware transaction wrapper
///
/// This type ensures all queries executed within it have RLS variables set.
/// It provides helper methods for common query patterns.
pub struct RlsTransaction<'a> {
    tx: &'a mut Transaction<'static, Postgres>,
    session: &'a RlsSession,
}

impl<'a> RlsTransaction<'a> {
    /// Get the underlying transaction
    ///
    /// Use this to execute sqlx queries:
    /// ```rust,no_run
    /// sqlx::query("SELECT * FROM table")
    ///     .fetch_all(&mut **tx.as_mut())
    ///     .await
    /// ```
    pub fn as_mut(&mut self) -> &mut Transaction<'static, Postgres> {
        self.tx
    }

    /// Get the RLS session info
    pub fn session(&self) -> &RlsSession {
        self.session
    }

    // Note: Helper methods removed - use sqlx query builders directly
    // Example: sqlx::query_as::<_, YourType>("SELECT ...").fetch_all(&mut **tx.as_mut()).await
}

/// Extension trait for Context to easily get RLS sessions
///
/// This provides a convenient `ctx.rls_session()` method for all resolvers.
pub trait RlsContextExt {
    /// Get an RLS session from the GraphQL context
    ///
    /// # Errors
    ///
    /// Returns `UNAUTHENTICATED` error if no user context is available.
    fn rls_session(&self) -> Result<RlsSession, Error>;
}

impl RlsContextExt for Context<'_> {
    fn rls_session(&self) -> Result<RlsSession, Error> {
        RlsSession::from_context(self)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_role_checking() {
        let session = RlsSession {
            user_id: Uuid::new_v4(),
            roles: vec!["admin".to_string(), "hr_manager".to_string()],
            permissions: vec!["employees:*".to_string()],
        };

        assert!(session.has_role("admin"));
        assert!(session.has_role("ADMIN")); // Case insensitive
        assert!(session.has_role("hr_manager"));
        assert!(!session.has_role("employee"));
    }

    #[test]
    fn test_permission_checking() {
        let session_with_wildcard = RlsSession {
            user_id: Uuid::new_v4(),
            roles: vec!["system_admin".to_string()],
            permissions: vec!["*".to_string()],
        };

        assert!(session_with_wildcard.has_wildcard_permission());
        assert!(session_with_wildcard.has_permission("anything"));

        let session_limited = RlsSession {
            user_id: Uuid::new_v4(),
            roles: vec!["employee".to_string()],
            permissions: vec!["profile:read".to_string()],
        };

        assert!(!session_limited.has_wildcard_permission());
        assert!(session_limited.has_permission("profile:read"));
        assert!(!session_limited.has_permission("employees:write"));
    }

    #[test]
    fn test_role_hierarchy() {
        let admin_session = RlsSession {
            user_id: Uuid::new_v4(),
            roles: vec!["admin".to_string()],
            permissions: vec![],
        };

        assert!(admin_session.has_min_role_level(100)); // Admin level
        assert!(admin_session.has_min_role_level(60));  // Manager level
        assert!(admin_session.has_min_role_level(20));  // Employee level
        assert!(!admin_session.has_min_role_level(200)); // System admin level

        let employee_session = RlsSession {
            user_id: Uuid::new_v4(),
            roles: vec!["employee".to_string()],
            permissions: vec![],
        };

        assert!(employee_session.has_min_role_level(20));  // Employee level
        assert!(!employee_session.has_min_role_level(60)); // Manager level
    }
}
