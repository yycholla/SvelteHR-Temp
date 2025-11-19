//! Rate limiting middleware
//!
//! This middleware implements rate limiting to prevent abuse of the GraphQL API.
//! It uses a sliding window approach with Redis for distributed rate limiting.

use axum::{
    extract::Request,
    http::StatusCode,
    middleware::Next,
    response::{IntoResponse, Response},
};
use std::{
    collections::HashMap,
    sync::Arc,
    time::{Duration, Instant},
};
use tokio::sync::RwLock;

/// Rate limit configuration
#[derive(Debug, Clone)]
pub struct RateLimitConfig {
    /// Maximum requests per window
    pub max_requests: u32,
    /// Window duration in seconds
    pub window_seconds: u64,
    /// Burst limit (additional requests allowed briefly)
    pub burst_limit: u32,
}

impl Default for RateLimitConfig {
    fn default() -> Self {
        Self {
            max_requests: 100,     // 100 requests
            window_seconds: 60,    // per minute
            burst_limit: 20,       // burst of 20 additional requests
        }
    }
}

/// Rate limit state for a single client
#[derive(Debug, Clone)]
struct ClientState {
    requests: Vec<Instant>,
    last_reset: Instant,
}

/// In-memory rate limiter (for development/single instance)
/// In production, this should be replaced with Redis
#[derive(Debug, Clone)]
pub struct RateLimiter {
    config: RateLimitConfig,
    clients: Arc<RwLock<HashMap<String, ClientState>>>,
}

impl RateLimiter {
    pub fn new(config: RateLimitConfig) -> Self {
        Self {
            config,
            clients: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    /// Check if request is allowed for the given client identifier
    pub async fn check_rate_limit(&self, client_id: &str) -> Result<(), RateLimitError> {
        let now = Instant::now();
        let mut clients = self.clients.write().await;

        let state = clients.entry(client_id.to_string()).or_insert(ClientState {
            requests: Vec::new(),
            last_reset: now,
        });

        // Clean old requests outside the window
        let window_start = now - Duration::from_secs(self.config.window_seconds);
        state.requests.retain(|&time| time > window_start);

        // Check if we're over the limit
        let current_requests = state.requests.len() as u32;
        if current_requests >= self.config.max_requests + self.config.burst_limit {
            return Err(RateLimitError::Exceeded);
        }

        // Add current request
        state.requests.push(now);

        Ok(())
    }

    /// Get remaining requests for a client
    pub async fn remaining_requests(&self, client_id: &str) -> u32 {
        let now = Instant::now();
        let clients = self.clients.read().await;

        if let Some(state) = clients.get(client_id) {
            let window_start = now - Duration::from_secs(self.config.window_seconds);
            let valid_requests = state.requests.iter().filter(|&&time| time > window_start).count() as u32;
            (self.config.max_requests + self.config.burst_limit).saturating_sub(valid_requests)
        } else {
            self.config.max_requests + self.config.burst_limit
        }
    }

    /// Get reset time for a client
    pub async fn reset_time(&self, client_id: &str) -> Option<Instant> {
        let clients = self.clients.read().await;
        clients.get(client_id).map(|state| {
            state.last_reset + Duration::from_secs(self.config.window_seconds)
        })
    }
}

/// Rate limit error
#[derive(Debug)]
pub enum RateLimitError {
    Exceeded,
}

/// Rate limiting middleware
pub async fn rate_limiting_middleware(
    req: Request,
    next: Next,
) -> Result<Response, StatusCode> {
    // Get client identifier (IP address for now, could be user ID for authenticated requests)
    let client_ip = req
        .headers()
        .get("x-forwarded-for")
        .and_then(|hv| hv.to_str().ok())
        .or_else(|| req.headers().get("x-real-ip").and_then(|hv| hv.to_str().ok()))
        .unwrap_or("unknown")
        .to_string();

    // Get rate limiter from request extensions (set up in main.rs)
    let rate_limiter = req
        .extensions()
        .get::<Arc<RateLimiter>>()
        .cloned()
        .ok_or(StatusCode::INTERNAL_SERVER_ERROR)?;

    // Check rate limit
    if let Err(RateLimitError::Exceeded) = rate_limiter.check_rate_limit(&client_ip).await {
        let mut response = (
            StatusCode::TOO_MANY_REQUESTS,
            "Rate limit exceeded. Please try again later.",
        )
            .into_response();

        // Add rate limit headers
        let headers = response.headers_mut();
        headers.insert(
            "X-RateLimit-Limit",
            format!("{}", rate_limiter.config.max_requests).parse().unwrap(),
        );
        headers.insert(
            "X-RateLimit-Remaining",
            format!("{}", rate_limiter.remaining_requests(&client_ip).await).parse().unwrap(),
        );

        if let Some(reset_time) = rate_limiter.reset_time(&client_ip).await {
            let reset_seconds = reset_time.duration_since(Instant::now()).as_secs();
            headers.insert(
                "X-RateLimit-Reset",
                format!("{}", reset_seconds).parse().unwrap(),
            );
        }

        headers.insert("Retry-After", "60".parse().unwrap());

        return Ok(response);
    }

    // Proceed with request
    let response = next.run(req).await;

    // Add rate limit headers to successful responses
    let mut response = response;
    let headers = response.headers_mut();
    headers.insert(
        "X-RateLimit-Limit",
        format!("{}", rate_limiter.config.max_requests).parse().unwrap(),
    );
    headers.insert(
        "X-RateLimit-Remaining",
        format!("{}", rate_limiter.remaining_requests(&client_ip).await).parse().unwrap(),
    );

    Ok(response)
}