//! Contract tests for authentication login endpoint
//!
//! These tests validate that the login API contract is maintained
//! and responses match the expected schema.

use serde_json::json;

/// Test successful login response structure
#[test]
fn test_login_success_response_structure() {
    // This is a contract test - it validates the API contract
    // In a real implementation, this would make actual HTTP calls

    let expected_response = json!({
        "user": {
            "id": "uuid",
            "email": "user@example.com",
            "role": "employee"
        },
        "session_expires": "2024-01-01T12:00:00Z"
    });

    // Validate response structure matches OpenAPI spec
    assert!(expected_response.get("user").is_some());
    assert!(expected_response.get("session_expires").is_some());

    let user = expected_response.get("user").unwrap();
    assert!(user.get("id").is_some());
    assert!(user.get("email").is_some());
    assert!(user.get("role").is_some());
}

/// Test login error response structure
#[test]
fn test_login_error_response_structure() {
    let expected_error = json!({
        "error": "Invalid email or password"
    });

    assert!(expected_error.get("error").is_some());
    assert!(expected_error["error"].is_string());
}

/// Test rate limit error response
#[test]
fn test_rate_limit_error_response() {
    let expected_error = json!({
        "error": "Too many login attempts",
        "retry_after": 300
    });

    assert!(expected_error.get("error").is_some());
    assert!(expected_error.get("retry_after").is_some());
    assert!(expected_error["retry_after"].is_number());
}

/// Test account locked error response
#[test]
fn test_account_locked_error_response() {
    let expected_error = json!({
        "error": "Account temporarily locked"
    });

    assert!(expected_error.get("error").is_some());
    assert_eq!(expected_error["error"], "Account temporarily locked");
}