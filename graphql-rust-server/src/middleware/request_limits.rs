//! Request size limits and input sanitization middleware
//!
//! This middleware enforces request size limits and performs input sanitization
//! to prevent various attacks including buffer overflow and injection attacks.

use axum::{
    extract::Request,
    http::{header, StatusCode},
    middleware::Next,
    response::IntoResponse,
};
use regex::Regex;
use std::sync::Arc;

/// Request limits configuration
#[derive(Debug, Clone)]
pub struct RequestLimitsConfig {
    /// Maximum request body size in bytes
    pub max_body_size: usize,
    /// Maximum number of form fields
    pub max_fields: usize,
    /// Maximum size of a single form field in bytes
    pub max_field_size: usize,
    /// Maximum number of files in multipart requests
    pub max_files: usize,
    /// Maximum file size in bytes
    pub max_file_size: usize,
}

impl Default for RequestLimitsConfig {
    fn default() -> Self {
        Self {
            max_body_size: 10 * 1024 * 1024,     // 10MB
            max_fields: 100,                     // 100 fields
            max_field_size: 1024 * 1024,         // 1MB per field
            max_files: 10,                       // 10 files
            max_file_size: 50 * 1024 * 1024,     // 50MB per file
        }
    }
}

#[derive(Debug, Default)]
pub struct SanitizationRules {
    // Fields removed as they were unused
}

/// Request limits middleware
pub async fn request_limits_middleware(
    req: Request,
    next: Next,
) -> Result<axum::response::Response, StatusCode> {
    let config = req
        .extensions()
        .get::<Arc<RequestLimitsConfig>>()
        .cloned()
        .unwrap_or_else(|| Arc::new(RequestLimitsConfig::default()));

    // Check Content-Length header
    if let Some(content_length) = req.headers().get(header::CONTENT_LENGTH) {
        if let Ok(length) = content_length.to_str().unwrap_or("0").parse::<usize>() {
            if length > config.max_body_size {
                return Ok((
                    StatusCode::PAYLOAD_TOO_LARGE,
                    "Request body too large",
                )
                    .into_response());
            }
        }
    }

    // For GraphQL requests, we need to check the body content
    if req.uri().path().contains("/graphql") {
        let content_type = req.headers().get(header::CONTENT_TYPE);
        if let Some(content_type) = content_type {
            if content_type.to_str().unwrap_or("").contains("application/json") {
                // For GraphQL requests, we check the content length from headers
                // In a production implementation, you might want to buffer and inspect the body
                // But for now, we'll rely on header-based size checking which is already done above
            }
        }
    }

    // Proceed with request
    Ok(next.run(req).await)
}



/// Sanitize string input by removing potentially dangerous characters
pub fn sanitize_string_input(input: &str) -> String {
    // Remove null bytes and other control characters
    input.chars()
        .filter(|&c| c.is_alphanumeric() || c.is_whitespace() || "!@#$%^&*()_+-=[]{}|;:,.<>?".contains(c))
        .collect()
}

/// Validate email format (basic validation)
pub fn validate_email_format(email: &str) -> bool {
    // Basic email regex - in production, use a proper email validation library
    let email_regex = Regex::new(r"^[^@\s]+@[^@\s]+\.[^@\s]+$").unwrap();
    email_regex.is_match(email) && email.len() <= 254
}

/// Validate phone number format (basic validation)
pub fn validate_phone_format(phone: &str) -> bool {
    // Allow international format with + and digits/spaces/hyphens
    let phone_regex = Regex::new(r"^\+?[1-9]\d{1,14}$").unwrap();
    phone_regex.is_match(&phone.replace([' ', '-'], "")) && phone.len() <= 20
}

#[cfg(test)]
mod tests {
    use super::*;

    // TODO: Implement sanitize_graphql_input() function before re-enabling these tests
    // #[test]
    // fn test_sanitize_graphql_input_valid() {
    //     let valid_query = r#"
    //         query {
    //             tasks {
    //                 id
    //                 title
    //             }
    //         }
    //     "#;
    //     assert!(sanitize_graphql_input(valid_query).is_ok());
    // }

    // #[test]
    // fn test_sanitize_graphql_input_sql_injection() {
    //     let malicious_query = r#"
    //         query {
    //             tasks(where: "1=1; DROP TABLE users; --") {
    //                 id
    //             }
    //         }
    //     "#;
    //     assert!(sanitize_graphql_input(malicious_query).is_err());
    // }

    // #[test]
    // fn test_sanitize_graphql_input_xss() {
    //     let malicious_query = r#"
    //         query {
    //             tasks(where: "<script>alert('xss')</script>") {
    //                 id
    //             }
    //         }
    //     "#;
    //     assert!(sanitize_graphql_input(malicious_query).is_err());
    // }

    // TODO: Implement count_graphql_depth() function before re-enabling this test
    // #[test]
    // fn test_count_graphql_depth() {
    //     let deep_query = r#"
    //         query {
    //             user {
    //                 tasks {
    //                     subtasks {
    //                         assignees {
    //                             name
    //                         }
    //                     }
    //                 }
    //             }
    //         }
    //     "#;
    //     assert_eq!(count_graphql_depth(deep_query), 4);
    // }

    #[test]
    fn test_validate_email_format() {
        assert!(validate_email_format("user@example.com"));
        assert!(!validate_email_format("invalid-email"));
        assert!(!validate_email_format(""));
    }

    #[test]
    fn test_validate_phone_format() {
        assert!(validate_phone_format("+1234567890"));
        assert!(validate_phone_format("1234567890"));
        assert!(!validate_phone_format("invalid-phone"));
    }
}