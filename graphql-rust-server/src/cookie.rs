//! Cookie management for GraphQL responses
//!
//! Provides a mechanism to set HTTP cookies from GraphQL mutations.
//! Uses GraphQL context extensions to pass cookie data to the HTTP handler.

use std::collections::HashMap;
use std::sync::{Arc, Mutex};

/// Cookie to be set in the HTTP response
#[derive(Debug, Clone)]
pub struct PendingCookie {
    pub name: String,
    pub value: String,
    pub http_only: bool,
    pub secure: bool,
    pub same_site: SameSite,
    pub path: String,
    pub max_age: Option<i64>, // seconds
}

/// SameSite cookie attribute
#[derive(Debug, Clone, Copy)]
pub enum SameSite {
    Strict,
    Lax,
    None,
}

impl std::fmt::Display for SameSite {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            SameSite::Strict => write!(f, "Strict"),
            SameSite::Lax => write!(f, "Lax"),
            SameSite::None => write!(f, "None"),
        }
    }
}

/// Container for cookies from the request
/// Parsed from Cookie header and provided to GraphQL context
#[derive(Debug, Clone, Default)]
pub struct RequestCookies {
    cookies: HashMap<String, String>,
}

impl RequestCookies {
    /// Parse cookies from Cookie header value
    pub fn from_header(header_value: &str) -> Self {
        let mut cookies = HashMap::new();

        for cookie_str in header_value.split(';') {
            let cookie_str = cookie_str.trim();
            if let Some((name, value)) = cookie_str.split_once('=') {
                cookies.insert(name.trim().to_string(), value.trim().to_string());
            }
        }

        Self { cookies }
    }

    /// Get a cookie by name
    pub fn get(&self, name: &str) -> Option<&String> {
        self.cookies.get(name)
    }
}

/// Container for cookies to be set in the response
/// Stored in GraphQL context and extracted by the HTTP handler
#[derive(Debug, Clone, Default)]
pub struct ResponseCookies {
    cookies: Arc<Mutex<Vec<PendingCookie>>>,
}

impl ResponseCookies {
    pub fn new() -> Self {
        Self {
            cookies: Arc::new(Mutex::new(Vec::new())),
        }
    }

    /// Add a cookie to be set in the HTTP response
    pub fn add(&self, cookie: PendingCookie) {
        if let Ok(mut cookies) = self.cookies.lock() {
            cookies.push(cookie);
        }
    }

    /// Get all pending cookies
    pub fn get_all(&self) -> Vec<PendingCookie> {
        self.cookies.lock().ok()
            .map(|cookies| cookies.clone())
            .unwrap_or_default()
    }

    /// Clear all pending cookies
    pub fn clear(&self) {
        if let Ok(mut cookies) = self.cookies.lock() {
            cookies.clear();
        }
    }
}

impl PendingCookie {
    /// Create a new secure HTTP-only cookie for refresh tokens
    pub fn refresh_token(value: String, max_age_seconds: i64) -> Self {
        Self {
            name: "refresh_token".to_string(),
            value,
            http_only: true,
            secure: true, // Always secure in production
            same_site: SameSite::Strict,
            path: "/".to_string(),
            max_age: Some(max_age_seconds),
        }
    }

    /// Convert to HTTP Set-Cookie header value
    pub fn to_header_value(&self) -> String {
        let mut parts = vec![format!("{}={}", self.name, self.value)];

        if self.http_only {
            parts.push("HttpOnly".to_string());
        }

        if self.secure {
            parts.push("Secure".to_string());
        }

        parts.push(format!("SameSite={}", self.same_site));
        parts.push(format!("Path={}", self.path));

        if let Some(max_age) = self.max_age {
            parts.push(format!("Max-Age={}", max_age));
        }

        parts.join("; ")
    }

    /// Create a cookie deletion directive (Max-Age=0)
    pub fn delete(name: &str) -> Self {
        Self {
            name: name.to_string(),
            value: String::new(),
            http_only: true,
            secure: true,
            same_site: SameSite::Strict,
            path: "/".to_string(),
            max_age: Some(0), // Expire immediately
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_cookie_header_formatting() {
        let cookie = PendingCookie::refresh_token("test_token".to_string(), 604800);
        let header = cookie.to_header_value();

        assert!(header.contains("refresh_token=test_token"));
        assert!(header.contains("HttpOnly"));
        assert!(header.contains("Secure"));
        assert!(header.contains("SameSite=Strict"));
        assert!(header.contains("Path=/"));
        assert!(header.contains("Max-Age=604800"));
    }

    #[test]
    fn test_cookie_deletion() {
        let cookie = PendingCookie::delete("refresh_token");
        let header = cookie.to_header_value();

        assert!(header.contains("Max-Age=0"));
        assert!(header.contains("HttpOnly"));
    }
}
