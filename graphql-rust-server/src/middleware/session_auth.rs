//! Session-based authentication middleware for axum-login
//!
//! This middleware integrates with axum-login to provide session-based
//! authentication, replacing the JWT-based approach.

use axum::{
    extract::{Request, State},
    http::StatusCode,
    middleware::Next,
    response::{Response, IntoResponse},
};
use axum_login::AuthSession;

use crate::auth::{AuthBackend, AuthUser};
use crate::handlers::AppState;

/// Session-based authentication middleware
///
/// Extracts user session from axum-login AuthSession, validates it,
/// and stores UserContext in request extensions for GraphQL resolvers.
///
/// Returns 401 Unauthorized if:
/// - No valid session exists
/// - User account is inactive
/// - Session has expired
pub async fn session_auth_middleware(
    State(app_state): State<AppState>,
    auth_session: AuthSession<AuthBackend>,
    mut request: Request,
    next: Next,
) -> Response {
    // Check if user is authenticated
    let Some(user) = auth_session.user else {
        tracing::warn!("Unauthenticated request to protected endpoint");
        return StatusCode::UNAUTHORIZED.into_response();
    };

    // Check if user account is active
    if !user.is_active {
        tracing::warn!("Request from inactive user: {}", user.email);
        return StatusCode::UNAUTHORIZED.into_response();
    }

    // Load roles and permissions from database via RBAC tables
    let (roles, permissions) = crate::auth::get_user_roles_and_permissions(&app_state.db, user.id)
        .await
        .unwrap_or_else(|e| {
            tracing::error!("Failed to load user roles/permissions: {}", e);
            (vec![], vec![])
        });

    // Roles/permissions loaded - logging disabled to reduce verbosity
    // Uncomment for debugging:
    // tracing::info!("Loaded user roles/permissions - user_id: {}, roles: {:?}, permissions: {:?}",
    //     user.id, roles, permissions);

    // Create user context from authenticated user with RLS fields
    let user_context = crate::auth::UserContext {
        user_id: user.id,
        email: Some(user.email.clone()),
        roles,        // Roles from user_role_assignments table
        permissions,  // Permissions from role_permissions table
        department_id: user.department_id,
        organization_id: None, // Not implemented yet
    };

    // Store user context in request extensions
    request.extensions_mut().insert(user_context);

    // Continue with the request
    next.run(request).await
}

/// Optional session authentication middleware
///
/// Similar to session_auth_middleware but doesn't require authentication.
/// Useful for endpoints that work for both authenticated and anonymous users.
///
/// Stores UserContext in extensions if user is authenticated, otherwise proceeds without it.
pub async fn optional_session_auth_middleware(
    State(app_state): State<AppState>,
    auth_session: AuthSession<AuthBackend>,
    mut request: Request,
    next: Next,
) -> Response {
    // If user is authenticated, store context with RLS fields
    if let Some(user) = &auth_session.user {
        if user.is_active {
            // Load roles and permissions from database via RBAC tables
            let (roles, permissions) = crate::auth::get_user_roles_and_permissions(&app_state.db, user.id)
                .await
                .unwrap_or_else(|e| {
                    tracing::error!("Failed to load user roles/permissions: {}", e);
                    (vec![], vec![])
                });

            // Roles/permissions loaded - logging disabled to reduce verbosity
            // Uncomment for debugging:
            // tracing::info!("(Optional) Loaded user roles/permissions - user_id: {}, roles: {:?}, permissions: {:?}",
            //     user.id, roles, permissions);

            let user_context = crate::auth::UserContext {
                user_id: user.id,
                email: Some(user.email.clone()),
                roles,        // Roles from user_role_assignments table
                permissions,  // Permissions from role_permissions table
                department_id: user.department_id,
                organization_id: None, // Not implemented yet
            };
            request.extensions_mut().insert(user_context);
        }
    }

    // Continue with the request regardless of authentication status
    next.run(request).await
}

/// Admin-only session authentication middleware
///
/// Requires authentication AND Admin role.
/// Returns 403 Forbidden if user doesn't have admin privileges.
pub async fn admin_session_auth_middleware(
    State(app_state): State<AppState>,
    auth_session: AuthSession<AuthBackend>,
    mut request: Request,
    next: Next,
) -> Response {
    // Check authentication
    let Some(user) = auth_session.user else {
        tracing::warn!("Unauthenticated request to admin endpoint");
        return StatusCode::UNAUTHORIZED.into_response();
    };

    // Check if user account is active
    if !user.is_active {
        tracing::warn!("Request from inactive user to admin endpoint: {}", user.email);
        return StatusCode::UNAUTHORIZED.into_response();
    }

    // Load roles and permissions from database via RBAC tables
    let (roles, permissions) = crate::auth::get_user_roles_and_permissions(&app_state.db, user.id)
        .await
        .unwrap_or_else(|e| {
            tracing::error!("Failed to load user roles/permissions: {}", e);
            (vec![], vec![])
        });

    // Roles/permissions loaded - logging disabled to reduce verbosity
    // Uncomment for debugging:
    // tracing::info!("(Admin) Loaded user roles/permissions - user_id: {}, roles: {:?}, permissions: {:?}",
    //     user.id, roles, permissions);

    // Check for Admin role
    if !roles.iter().any(|r| r == "Admin") {
        tracing::warn!("Non-admin user attempted admin access: {} (roles: {:?})", user.email, roles);
        return StatusCode::FORBIDDEN.into_response();
    }

    // Create user context with RLS fields
    let user_context = crate::auth::UserContext {
        user_id: user.id,
        email: Some(user.email.clone()),
        roles,        // Roles from user_role_assignments table
        permissions,  // Permissions from role_permissions table
        department_id: user.department_id,
        organization_id: None, // Not implemented yet
    };

    request.extensions_mut().insert(user_context);

    // Continue with the request
    next.run(request).await
}