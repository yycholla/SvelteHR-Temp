//! Optional JWT authentication middleware
//!
//! Unlike jwt_auth_middleware, this does NOT return 401 for missing tokens.
//! Instead, it extracts UserContext if a valid token is present, allowing
//! unauthenticated GraphQL queries (like PostGraphile).
//!
//! Row-Level Security (RLS) policies in PostgreSQL control actual data access.

use axum::{extract::Request, http::header::AUTHORIZATION, middleware::Next, response::Response};
use jsonwebtoken::{decode, Algorithm, DecodingKey, Validation};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::auth::UserContext;

/// JWT claims structure
#[derive(Debug, Serialize, Deserialize)]
struct Claims {
    sub: String,
    user_id: String,
    roles: Vec<String>,
    exp: i64,
    #[serde(default)]
    permissions: Vec<String>,
    #[serde(default)]
    email: Option<String>,
}

/// Optional JWT authentication middleware
///
/// Extracts and validates Bearer token if present, but does NOT fail
/// if token is missing or invalid. This allows:
/// - Authenticated queries (with UserContext)
/// - Anonymous queries (no UserContext, relies on RLS policies)
///
/// This matches PostGraphile's behavior where authentication is optional
/// and PostgreSQL RLS policies control actual data access.
pub async fn optional_jwt_auth_middleware(mut request: Request, next: Next) -> Response {
    // Try to extract Authorization header
    let auth_header = request
        .headers()
        .get(AUTHORIZATION)
        .and_then(|h| h.to_str().ok());

    // Extract token if present
    let token = auth_header.and_then(|header| {
        if header.starts_with("Bearer ") {
            Some(header.trim_start_matches("Bearer "))
        } else {
            None
        }
    });

    // If token exists, try to validate and extract UserContext
    if let Some(token) = token {
        // Check if it's a service key first (for background services)
        let service_key = std::env::var("SERVICE_AUTH_KEY").ok();

        if let Some(ref expected_key) = service_key {
            if !expected_key.is_empty() && token == expected_key {
                // System service authentication - create system context
                let system_context = UserContext::system();
                request.extensions_mut().insert(system_context);

                tracing::info!("System service authenticated with service key");
                return next.run(request).await;
            }
        }

        // Not a service key, try JWT validation
        let secret = std::env::var("JWT_SECRET").unwrap_or_else(|_| "test-secret-key".to_string());

        // Attempt to decode token
        if let Ok(token_data) = decode::<Claims>(
            token,
            &DecodingKey::from_secret(secret.as_bytes()),
            &Validation::new(Algorithm::HS256),
        ) {
            // Parse user_id as UUID
            if let Ok(user_id) = Uuid::parse_str(&token_data.claims.user_id) {
                // Create UserContext from claims
                let mut user_context = UserContext::new(
                    user_id,
                    token_data.claims.roles,
                    token_data.claims.permissions,
                );
                user_context.email = token_data.claims.email;

                // Store in request extensions
                request.extensions_mut().insert(user_context);
            } else {
                tracing::warn!("Invalid user_id format in JWT token");
            }
        } else {
            // Invalid or expired JWT token - proceeding as anonymous
        }
    } else {
        // No JWT token provided - proceeding as anonymous
    }

    // Always proceed to next middleware/handler
    // If no UserContext was added, GraphQL resolvers will handle anonymous access
    next.run(request).await
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::{
        body::Body,
        http::{header::AUTHORIZATION, Request, StatusCode},
        middleware::from_fn,
        routing::post,
        Router,
    };
    use chrono::{Duration, Utc};
    use jsonwebtoken::{encode, EncodingKey, Header};
    use tower::ServiceExt;

    async fn test_handler(req: Request<Body>) -> (StatusCode, &'static str) {
        // Check if UserContext exists
        if req.extensions().get::<UserContext>().is_some() {
            (StatusCode::OK, "Authenticated")
        } else {
            (StatusCode::OK, "Anonymous")
        }
    }

    fn create_test_token(user_id: &str, roles: Vec<String>) -> String {
        let claims = Claims {
            sub: user_id.to_string(),
            user_id: user_id.to_string(),
            roles,
            exp: (Utc::now() + Duration::hours(1)).timestamp(),
            permissions: vec![],
            email: None,
        };

        encode(
            &Header::default(),
            &claims,
            &EncodingKey::from_secret("test-secret-key".as_bytes()),
        )
        .expect("Failed to encode token")
    }

    #[tokio::test]
    async fn test_valid_token_authenticates() {
        let user_id = Uuid::new_v4().to_string();
        let token = create_test_token(&user_id, vec!["employee".to_string()]);

        let app = Router::new()
            .route("/", post(test_handler))
            .layer(from_fn(optional_jwt_auth_middleware));

        let request = Request::builder()
            .method("POST")
            .uri("/")
            .header(AUTHORIZATION, format!("Bearer {}", token))
            .body(Body::empty())
            .unwrap();

        let response = app.oneshot(request).await.unwrap();
        assert_eq!(response.status(), StatusCode::OK);

        let body = axum::body::to_bytes(response.into_body(), usize::MAX)
            .await
            .unwrap();
        assert_eq!(&body[..], b"Authenticated");
    }

    #[tokio::test]
    async fn test_missing_token_allows_anonymous() {
        let app = Router::new()
            .route("/", post(test_handler))
            .layer(from_fn(optional_jwt_auth_middleware));

        let request = Request::builder()
            .method("POST")
            .uri("/")
            .body(Body::empty())
            .unwrap();

        let response = app.oneshot(request).await.unwrap();
        assert_eq!(response.status(), StatusCode::OK);

        let body = axum::body::to_bytes(response.into_body(), usize::MAX)
            .await
            .unwrap();
        assert_eq!(&body[..], b"Anonymous");
    }

    #[tokio::test]
    async fn test_invalid_token_allows_anonymous() {
        let app = Router::new()
            .route("/", post(test_handler))
            .layer(from_fn(optional_jwt_auth_middleware));

        let request = Request::builder()
            .method("POST")
            .uri("/")
            .header(AUTHORIZATION, "Bearer invalid_token")
            .body(Body::empty())
            .unwrap();

        let response = app.oneshot(request).await.unwrap();
        assert_eq!(response.status(), StatusCode::OK);

        let body = axum::body::to_bytes(response.into_body(), usize::MAX)
            .await
            .unwrap();
        assert_eq!(&body[..], b"Anonymous");
    }
}
