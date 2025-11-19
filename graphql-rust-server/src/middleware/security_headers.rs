//! Security headers middleware
//!
//! This middleware adds security headers to all HTTP responses
//! to protect against common web vulnerabilities.

use axum::{
    http::HeaderValue,
    middleware::Next,
    response::Response,
};

/// Security headers middleware
///
/// Adds security headers to protect against:
/// - Clickjacking (X-Frame-Options)
/// - XSS attacks (X-Content-Type-Options)
/// - MIME type sniffing (X-Content-Type-Options)
/// - HTTPS enforcement (Strict-Transport-Security)
/// - Content Security Policy (Content-Security-Policy)
/// - Referrer Policy
pub async fn security_headers_middleware(request: axum::http::Request<axum::body::Body>, next: Next) -> Response {
    let mut response = next.run(request).await;

    let headers = response.headers_mut();

    // Prevent clickjacking
    headers.insert(
        "X-Frame-Options",
        HeaderValue::from_static("DENY"),
    );

    // Prevent MIME type sniffing
    headers.insert(
        "X-Content-Type-Options",
        HeaderValue::from_static("nosniff"),
    );

    // Enable XSS protection
    headers.insert(
        "X-XSS-Protection",
        HeaderValue::from_static("1; mode=block"),
    );

    // Referrer policy
    headers.insert(
        "Referrer-Policy",
        HeaderValue::from_static("strict-origin-when-cross-origin"),
    );

    // Permissions policy (restrict features)
    headers.insert(
        "Permissions-Policy",
        HeaderValue::from_static("camera=(), microphone=(), geolocation=()"),
    );

    // Content Security Policy (restrict resource loading)
    // Note: Adjust this based on your frontend requirements
    headers.insert(
        "Content-Security-Policy",
        HeaderValue::from_static(
            "default-src 'self'; \
             script-src 'self' 'unsafe-inline'; \
             style-src 'self' 'unsafe-inline'; \
             img-src 'self' data: https:; \
             font-src 'self'; \
             connect-src 'self'; \
             frame-ancestors 'none';"
        ),
    );

    // HSTS (HTTP Strict Transport Security) - only in production
    // In development, we don't want to force HTTPS
    if std::env::var("RUST_ENV").unwrap_or_default() == "production" {
        headers.insert(
            "Strict-Transport-Security",
            HeaderValue::from_static("max-age=31536000; includeSubDomains"),
        );
    }

    response
}