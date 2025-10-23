//! CSRF protection middleware
//!
//! This middleware protects against Cross-Site Request Forgery attacks by validating
//! CSRF tokens for state-changing operations (mutations).

use async_graphql::{Request, Response, ServerError};
use axum::{
    extract::Request as AxumRequest,
    http::{header, HeaderMap, Method, StatusCode},
    middleware::Next,
    response::IntoResponse,
};
use rand::{distributions::Alphanumeric, Rng};
use std::{
    collections::HashMap,
    sync::Arc,
    time::{Duration, Instant},
};
use tokio::sync::RwLock;

/// CSRF token configuration
#[derive(Debug, Clone)]
pub struct CsrfConfig {
    /// Token validity duration in seconds
    pub token_ttl_seconds: u64,
    /// Header name for CSRF token
    pub header_name: String,
    /// Cookie name for CSRF token
    pub cookie_name: String,
}

impl Default for CsrfConfig {
    fn default() -> Self {
        Self {
            token_ttl_seconds: 3600, // 1 hour
            header_name: "X-CSRF-Token".to_string(),
            cookie_name: "csrf_token".to_string(),
        }
    }
}

/// CSRF token store entry
#[derive(Debug, Clone)]
struct TokenEntry {
    token: String,
    created_at: Instant,
}

/// In-memory CSRF token store (for development/single instance)
/// In production, this should be replaced with Redis or database storage
#[derive(Debug, Clone)]
pub struct CsrfTokenStore {
    config: CsrfConfig,
    tokens: Arc<RwLock<HashMap<String, TokenEntry>>>,
}

impl CsrfTokenStore {
    pub fn new(config: CsrfConfig) -> Self {
        Self {
            config,
            tokens: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    /// Generate a new CSRF token for a session
    pub async fn generate_token(&self, session_id: &str) -> String {
        let token: String = rand::thread_rng()
            .sample_iter(&Alphanumeric)
            .take(32)
            .map(char::from)
            .collect();

        let entry = TokenEntry {
            token: token.clone(),
            created_at: Instant::now(),
        };

        let mut tokens = self.tokens.write().await;
        tokens.insert(session_id.to_string(), entry);

        // Clean up expired tokens periodically
        self.cleanup_expired_tokens(&mut tokens).await;

        token
    }

    /// Validate a CSRF token for a session
    pub async fn validate_token(&self, session_id: &str, token: &str) -> Result<(), CsrfError> {
        let mut tokens = self.tokens.write().await;

        // Clean up expired tokens
        self.cleanup_expired_tokens(&mut tokens).await;

        if let Some(entry) = tokens.get(session_id) {
            if entry.token == token {
                // Check if token is expired
                let ttl = Duration::from_secs(self.config.token_ttl_seconds);
                if entry.created_at.elapsed() < ttl {
                    return Ok(());
                } else {
                    // Remove expired token
                    tokens.remove(session_id);
                }
            }
        }

        Err(CsrfError::InvalidToken)
    }

    /// Remove a token (e.g., on logout)
    pub async fn remove_token(&self, session_id: &str) {
        let mut tokens = self.tokens.write().await;
        tokens.remove(session_id);
    }

    /// Clean up expired tokens
    async fn cleanup_expired_tokens(&self, tokens: &mut HashMap<String, TokenEntry>) {
        let ttl = Duration::from_secs(self.config.token_ttl_seconds);
        let now = Instant::now();

        tokens.retain(|_, entry| entry.created_at + ttl > now);
    }
}

/// CSRF error
#[derive(Debug)]
pub enum CsrfError {
    MissingToken,
    InvalidToken,
    MissingSession,
}

/// CSRF protection middleware for HTTP requests
pub async fn csrf_protection_middleware(
    req: AxumRequest,
    next: Next,
) -> Result<axum::response::Response, StatusCode> {
    // Only check CSRF for state-changing methods
    if !matches!(req.method(), &Method::POST | &Method::PUT | &Method::PATCH | &Method::DELETE) {
        return Ok(next.run(req).await);
    }

    // Skip CSRF check for GraphQL introspection queries (they're safe)
    if req.uri().path().contains("/graphql") {
        let content_type = req.headers().get(header::CONTENT_TYPE);
        if let Some(content_type) = content_type {
            if content_type.to_str().unwrap_or("").contains("application/json") {
                // For GraphQL, we need to check if it's a mutation
                // This is a simplified check - in production, you'd parse the GraphQL query
                // For now, we'll check for mutation keyword in the body
                // TODO: Implement proper GraphQL AST parsing for mutation detection
            }
        }
    }

    // Get CSRF token store from request extensions
    let token_store = req
        .extensions()
        .get::<Arc<CsrfTokenStore>>()
        .cloned()
        .ok_or(StatusCode::INTERNAL_SERVER_ERROR)?;

    // Get session ID (this would come from your session middleware)
    // For now, we'll use a simple approach - in production, get from session
    let session_id = req
        .headers()
        .get("X-Session-ID")
        .and_then(|h| h.to_str().ok())
        .unwrap_or("anonymous");

    // Get CSRF token from header
    let token = req
        .headers()
        .get(&token_store.config.header_name)
        .and_then(|h| h.to_str().ok());

    let token = match token {
        Some(t) => t,
        None => {
            return Ok((
                StatusCode::FORBIDDEN,
                "CSRF token missing. Include X-CSRF-Token header.",
            )
                .into_response());
        }
    };

    // Validate token
    if let Err(CsrfError::InvalidToken) = token_store.validate_token(session_id, token).await {
        return Ok((
            StatusCode::FORBIDDEN,
            "CSRF token invalid or expired.",
        )
            .into_response());
    }

    // Proceed with request
    Ok(next.run(req).await)
}

/// GraphQL extension for CSRF validation
/// Note: CSRF validation is primarily handled at the HTTP middleware level.
/// This extension is a placeholder for future GraphQL-specific CSRF validation.
pub struct CsrfExtension;

impl CsrfExtension {
    pub fn new(_token_store: Arc<CsrfTokenStore>) -> Self {
        Self
    }
}