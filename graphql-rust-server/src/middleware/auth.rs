//! JWT authentication middleware for Axum
//!
//! Extracts and validates Bearer tokens from Authorization header,
//! decodes user context, and stores it in request extensions for GraphQL resolvers.

use axum::{
    extract::Request,
    http::{StatusCode, header::AUTHORIZATION},
    middleware::Next,
    response::{Response, IntoResponse},
};
use jsonwebtoken::{decode, DecodingKey, Validation, Algorithm};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::auth::UserContext;

/// JWT claims structure matching the token issued by the backend
#[derive(Debug, Serialize, Deserialize)]
struct Claims {
    /// Subject (user ID)
    sub: String,
    /// User ID (redundant with sub, but kept for compatibility)
    user_id: String,
    /// User roles (e.g., ["Admin", "HR_Manager"])
    roles: Vec<String>,
    /// Token expiration timestamp
    exp: i64,
    /// Optional: User permissions
    #[serde(default)]
    permissions: Vec<String>,
    /// Optional: User email
    #[serde(default)]
    email: Option<String>,
    /// Optional: Department ID for Row-Level Security (RLS) filtering
    #[serde(default)]
    department_id: Option<String>,
    /// Optional: Organization ID for Row-Level Security (future-proofing)
    #[serde(default)]
    organization_id: Option<String>,
}

/// JWT authentication middleware
///
/// Extracts Bearer token from Authorization header, validates it,
/// and stores UserContext in request extensions.
///
/// Returns 401 Unauthorized if:
/// - Authorization header is missing
/// - Token format is invalid (not "Bearer <token>")
/// - Token signature is invalid
/// - Token has expired
pub async fn jwt_auth_middleware(
    mut request: Request,
    next: Next,
) -> Result<Response, impl IntoResponse> {
    // Extract Authorization header
    let auth_header = request
        .headers()
        .get(AUTHORIZATION)
        .and_then(|h| h.to_str().ok());

    let token = match auth_header {
        Some(header) if header.starts_with("Bearer ") => {
            header.trim_start_matches("Bearer ")
        }
        _ => {
            return Err((
                StatusCode::UNAUTHORIZED,
                "Missing or invalid Authorization header",
            ));
        }
    };

    // Get JWT secret from environment
    let secret = std::env::var("JWT_SECRET")
        .unwrap_or_else(|_| "test-secret-key".to_string());

    // Decode and validate token
    let token_data = decode::<Claims>(
        token,
        &DecodingKey::from_secret(secret.as_bytes()),
        &Validation::new(Algorithm::HS256),
    )
    .map_err(|e| {
        tracing::warn!("JWT validation failed: {}", e);
        (StatusCode::UNAUTHORIZED, "Invalid or expired token")
    })?;

    // Parse user_id as UUID
    let user_id = Uuid::parse_str(&token_data.claims.user_id)
        .map_err(|_| {
            (StatusCode::UNAUTHORIZED, "Invalid user_id format in token")
        })?;

    // Parse optional department_id and organization_id as UUIDs
    let department_id = token_data.claims.department_id
        .as_ref()
        .and_then(|id| Uuid::parse_str(id).ok());

    let organization_id = token_data.claims.organization_id
        .as_ref()
        .and_then(|id| Uuid::parse_str(id).ok());

    // Create UserContext from claims with RLS fields
    let mut user_context = UserContext::with_rls(
        user_id,
        token_data.claims.roles,
        token_data.claims.permissions,
        department_id,
        organization_id,
    );
    user_context.email = token_data.claims.email;

    // Store UserContext in request extensions for GraphQL resolvers
    request.extensions_mut().insert(user_context);

    Ok(next.run(request).await)
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::{
        body::Body,
        http::{Request, StatusCode, header::AUTHORIZATION},
        middleware::from_fn,
        routing::get,
        Router,
    };
    use tower::ServiceExt;
    use jsonwebtoken::{encode, Header, EncodingKey};
    use chrono::{Utc, Duration};

    async fn test_handler(req: Request<Body>) -> &'static str {
        // Verify UserContext is in extensions
        let user_context = req.extensions().get::<UserContext>().unwrap();
        assert!(!user_context.roles.is_empty());
        "OK"
    }

    fn create_test_token(user_id: &str, roles: Vec<String>, expired: bool) -> String {
        let claims = Claims {
            sub: user_id.to_string(),
            user_id: user_id.to_string(),
            roles,
            exp: if expired {
                (Utc::now() - Duration::hours(1)).timestamp()
            } else {
                (Utc::now() + Duration::hours(1)).timestamp()
            },
            permissions: vec![],
            email: None,
            department_id: None,
            organization_id: None,
        };

        encode(
            &Header::default(),
            &claims,
            &EncodingKey::from_secret("test-secret-key".as_bytes()),
        )
        .expect("Failed to encode token")
    }

    #[tokio::test]
    async fn test_valid_token() {
        let user_id = Uuid::new_v4().to_string();
        let token = create_test_token(&user_id, vec!["Admin".to_string()], false);

        let app = Router::new()
            .route("/", get(test_handler))
            .layer(from_fn(jwt_auth_middleware));

        let request = Request::builder()
            .uri("/")
            .header(AUTHORIZATION, format!("Bearer {}", token))
            .body(Body::empty())
            .unwrap();

        let response = app.oneshot(request).await.unwrap();
        assert_eq!(response.status(), StatusCode::OK);
    }

    #[tokio::test]
    async fn test_missing_authorization_header() {
        let app = Router::new()
            .route("/", get(test_handler))
            .layer(from_fn(jwt_auth_middleware));

        let request = Request::builder()
            .uri("/")
            .body(Body::empty())
            .unwrap();

        let response = app.oneshot(request).await.unwrap();
        assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    }

    #[tokio::test]
    async fn test_invalid_bearer_format() {
        let app = Router::new()
            .route("/", get(test_handler))
            .layer(from_fn(jwt_auth_middleware));

        let request = Request::builder()
            .uri("/")
            .header(AUTHORIZATION, "InvalidFormat token")
            .body(Body::empty())
            .unwrap();

        let response = app.oneshot(request).await.unwrap();
        assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    }

    #[tokio::test]
    async fn test_expired_token() {
        let user_id = Uuid::new_v4().to_string();
        let token = create_test_token(&user_id, vec!["Admin".to_string()], true);

        let app = Router::new()
            .route("/", get(test_handler))
            .layer(from_fn(jwt_auth_middleware));

        let request = Request::builder()
            .uri("/")
            .header(AUTHORIZATION, format!("Bearer {}", token))
            .body(Body::empty())
            .unwrap();

        let response = app.oneshot(request).await.unwrap();
        assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    }

    #[tokio::test]
    async fn test_invalid_signature() {
        let user_id = Uuid::new_v4().to_string();
        let claims = Claims {
            sub: user_id.clone(),
            user_id: user_id.clone(),
            roles: vec!["Admin".to_string()],
            exp: (Utc::now() + Duration::hours(1)).timestamp(),
            permissions: vec![],
            email: None,
            department_id: None,
            organization_id: None,
        };

        // Sign with wrong secret
        let token = encode(
            &Header::default(),
            &claims,
            &EncodingKey::from_secret("wrong-secret".as_bytes()),
        )
        .unwrap();

        let app = Router::new()
            .route("/", get(test_handler))
            .layer(from_fn(jwt_auth_middleware));

        let request = Request::builder()
            .uri("/")
            .header(AUTHORIZATION, format!("Bearer {}", token))
            .body(Body::empty())
            .unwrap();

        let response = app.oneshot(request).await.unwrap();
        assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    }
}
