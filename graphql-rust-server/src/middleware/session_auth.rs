//! Session-based authentication middleware for axum-login
//!
//! This middleware integrates with axum-login to provide session-based
//! authentication, replacing the JWT-based approach.

use axum::{
    extract::Request,
    http::StatusCode,
    middleware::Next,
    response::{Response, IntoResponse},
};
use axum_login::AuthSession;
use sea_orm::DatabaseConnection;

use crate::{
    auth::{AuthBackend, AuthUser},
    database::get_db_from_context,
};

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

    // Create user context from authenticated user
    let user_context = crate::auth::UserContext {
        user_id: user.id,
        email: Some(user.email.clone()),
        roles: vec![user.role.clone()], // Convert single role to vec for compatibility
        permissions: vec![], // TODO: Implement proper permission system
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
    auth_session: AuthSession<AuthBackend>,
    mut request: Request,
    next: Next,
) -> Response {
    // If user is authenticated, store context
    if let Some(user) = &auth_session.user {
        if user.is_active {
            let user_context = crate::auth::UserContext {
                user_id: user.id,
                email: Some(user.email.clone()),
                roles: vec![user.role.clone()],
                permissions: vec![], // TODO: Implement proper permission system
            };
            request.extensions_mut().insert(user_context);
        }
    }

    // Continue with the request regardless of authentication status
    next.run(request).await
}

/// Admin-only session authentication middleware
///
/// Requires authentication AND admin role (system_admin or hr_admin).
/// Returns 403 Forbidden if user doesn't have admin privileges.
pub async fn admin_session_auth_middleware(
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

    // Check admin role
    if !matches!(user.role.as_str(), "system_admin" | "hr_admin") {
        tracing::warn!("Non-admin user attempted admin access: {} (role: {})", user.email, user.role);
        return StatusCode::FORBIDDEN.into_response();
    }

    // Create user context
    let user_context = crate::auth::UserContext {
        user_id: user.id,
        email: Some(user.email.clone()),
        roles: vec![user.role.clone()],
        permissions: vec![], // TODO: Implement proper permission system
    };

    request.extensions_mut().insert(user_context);

    // Continue with the request
    next.run(request).await
}