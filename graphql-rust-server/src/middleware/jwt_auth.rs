//! JWT-based authentication middleware for Axum
//!
//! This middleware extracts and validates JWT access tokens from the
//! Authorization header, validates them using JwtService, and stores
//! UserContext in request extensions for GraphQL resolvers.

use axum::{
    extract::{Request, State},
    http::{HeaderMap, StatusCode},
    middleware::Next,
    response::{IntoResponse, Response},
};

use crate::auth::UserContext;
use crate::handlers::AppState;

/// Extract JWT token from Authorization header
///
/// Looks for "Authorization: Bearer <token>" header and returns the token.
///
/// # Arguments
/// * `headers` - HTTP request headers
///
/// # Returns
/// * `Some(token)` if valid Bearer token found
/// * `None` if header missing or malformed
fn extract_bearer_token(headers: &HeaderMap) -> Option<String> {
    let auth_header = headers.get("authorization")?;
    let auth_str = auth_header.to_str().ok()?;

    // Check for "Bearer " prefix (case-insensitive)
    if auth_str.len() < 7 {
        return None;
    }

    let (prefix, token) = auth_str.split_at(7);
    if prefix.to_lowercase() != "bearer " {
        return None;
    }

    Some(token.to_string())
}

/// JWT authentication middleware
///
/// Extracts JWT access token from Authorization header, validates it,
/// and stores UserContext in request extensions for GraphQL resolvers.
///
/// # Flow
/// 1. Extract Bearer token from Authorization header
/// 2. Validate token using JwtService (signature, expiration, revocation)
/// 3. Extract claims (user_id, roles, permissions, etc.)
/// 4. Store UserContext in request extensions
///
/// # Returns
/// * 401 Unauthorized if:
///   - No Authorization header
///   - Invalid Bearer token format
///   - Token signature invalid
///   - Token expired
///   - Token revoked
///   - User not found
pub async fn jwt_auth_middleware(
    State(app_state): State<AppState>,
    mut request: Request,
    next: Next,
) -> Response {
    // Extract token from Authorization header
    let Some(token) = extract_bearer_token(request.headers()) else {
        tracing::warn!("Missing or invalid Authorization header");
        return StatusCode::UNAUTHORIZED.into_response();
    };

    // Validate token using JwtService
    let jwt_service = &app_state.jwt_service;
    let claims = match jwt_service.validate_access_token(&token).await {
        Ok(claims) => claims,
        Err(err) => {
            tracing::warn!("JWT validation failed: {:?}", err);
            return StatusCode::UNAUTHORIZED.into_response();
        }
    };

    // Extract user_id from claims
    let user_id = match claims.user_id() {
        Ok(id) => id,
        Err(err) => {
            tracing::error!("Invalid user_id in JWT claims: {}", err);
            return StatusCode::UNAUTHORIZED.into_response();
        }
    };

    // Parse department_id from claims (optional)
    let department_id = claims.department_id.as_ref().and_then(|id_str| {
        uuid::Uuid::parse_str(id_str).ok()
    });

    // Create user context from JWT claims
    let user_context = UserContext {
        user_id,
        email: Some(claims.email.clone()),
        roles: claims.roles.clone(),
        permissions: claims.permissions.clone(),
        department_id,
        organization_id: None, // Not implemented yet
    };

    // Log successful authentication (disabled to reduce verbosity)
    // Uncomment for debugging:
    // tracing::info!("JWT authentication successful - user_id: {}, roles: {:?}", user_id, claims.roles);

    // Store user context in request extensions
    request.extensions_mut().insert(user_context);

    // Continue with the request
    next.run(request).await
}

/// Optional JWT authentication middleware
///
/// Similar to jwt_auth_middleware but doesn't require authentication.
/// Useful for endpoints that work for both authenticated and anonymous users.
///
/// Stores UserContext in extensions if JWT is valid, otherwise proceeds without it.
pub async fn optional_jwt_auth_middleware(
    State(app_state): State<AppState>,
    mut request: Request,
    next: Next,
) -> Response {
    // Try to extract token
    if let Some(token) = extract_bearer_token(request.headers()) {
        // Try to validate token
        let jwt_service = &app_state.jwt_service;
        if let Ok(claims) = jwt_service.validate_access_token(&token).await {
            // Extract user_id
            if let Ok(user_id) = claims.user_id() {
                // Parse department_id
                let department_id = claims.department_id.as_ref().and_then(|id_str| {
                    uuid::Uuid::parse_str(id_str).ok()
                });

                // Create user context
                let user_context = UserContext {
                    user_id,
                    email: Some(claims.email.clone()),
                    roles: claims.roles.clone(),
                    permissions: claims.permissions.clone(),
                    department_id,
                    organization_id: None,
                };

                // Store in extensions
                request.extensions_mut().insert(user_context);
            }
        }
    }

    // Continue regardless of authentication status
    next.run(request).await
}

/// Admin-only JWT authentication middleware
///
/// Requires authentication AND Admin role.
/// Returns 403 Forbidden if user doesn't have admin privileges.
pub async fn admin_jwt_auth_middleware(
    State(app_state): State<AppState>,
    mut request: Request,
    next: Next,
) -> Response {
    // Extract and validate token
    let Some(token) = extract_bearer_token(request.headers()) else {
        tracing::warn!("Missing Authorization header for admin endpoint");
        return StatusCode::UNAUTHORIZED.into_response();
    };

    let jwt_service = &app_state.jwt_service;
    let claims = match jwt_service.validate_access_token(&token).await {
        Ok(claims) => claims,
        Err(err) => {
            tracing::warn!("JWT validation failed for admin endpoint: {:?}", err);
            return StatusCode::UNAUTHORIZED.into_response();
        }
    };

    // Check for Admin role using AccessTokenClaims::has_role helper
    if !claims.has_role("Admin") {
        tracing::warn!(
            "Non-admin user attempted admin access: {} (roles: {:?})",
            claims.email,
            claims.roles
        );
        return StatusCode::FORBIDDEN.into_response();
    }

    // Extract user_id
    let user_id = match claims.user_id() {
        Ok(id) => id,
        Err(err) => {
            tracing::error!("Invalid user_id in admin JWT claims: {}", err);
            return StatusCode::UNAUTHORIZED.into_response();
        }
    };

    // Parse department_id
    let department_id = claims.department_id.as_ref().and_then(|id_str| {
        uuid::Uuid::parse_str(id_str).ok()
    });

    // Create user context
    let user_context = UserContext {
        user_id,
        email: Some(claims.email.clone()),
        roles: claims.roles.clone(),
        permissions: claims.permissions.clone(),
        department_id,
        organization_id: None,
    };

    request.extensions_mut().insert(user_context);

    // Continue with the request
    next.run(request).await
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::http::{HeaderMap, HeaderValue};

    #[test]
    fn test_extract_bearer_token_valid() {
        let mut headers = HeaderMap::new();
        headers.insert(
            "authorization",
            HeaderValue::from_static("Bearer test-token-123"),
        );

        let token = extract_bearer_token(&headers);
        assert_eq!(token, Some("test-token-123".to_string()));
    }

    #[test]
    fn test_extract_bearer_token_case_insensitive() {
        let mut headers = HeaderMap::new();
        headers.insert(
            "authorization",
            HeaderValue::from_static("bearer test-token-456"),
        );

        let token = extract_bearer_token(&headers);
        assert_eq!(token, Some("test-token-456".to_string()));
    }

    #[test]
    fn test_extract_bearer_token_missing_header() {
        let headers = HeaderMap::new();
        let token = extract_bearer_token(&headers);
        assert_eq!(token, None);
    }

    #[test]
    fn test_extract_bearer_token_wrong_scheme() {
        let mut headers = HeaderMap::new();
        headers.insert(
            "authorization",
            HeaderValue::from_static("Basic dXNlcjpwYXNz"),
        );

        let token = extract_bearer_token(&headers);
        assert_eq!(token, None);
    }

    #[test]
    fn test_extract_bearer_token_malformed() {
        let mut headers = HeaderMap::new();
        headers.insert("authorization", HeaderValue::from_static("Bearer"));

        let token = extract_bearer_token(&headers);
        assert_eq!(token, None);
    }

    #[test]
    fn test_extract_bearer_token_empty() {
        let mut headers = HeaderMap::new();
        headers.insert("authorization", HeaderValue::from_static("Bearer "));

        let token = extract_bearer_token(&headers);
        assert_eq!(token, Some("".to_string()));
    }
}
