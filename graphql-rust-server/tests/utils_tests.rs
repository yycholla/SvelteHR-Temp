//! Utility Function Tests (Pure Logic - No Database Required)
//!
//! This test suite covers commonly-used utility functions across the codebase
//! with a focus on high-impact helpers that don't require database setup.
//!
//! Test Categories:
//! 1. String Utilities (validation, sanitization)
//! 2. Permission Helpers (RBAC logic)
//! 3. Error Handling Utilities (sanitization, error codes)
//! 4. Authorization Utilities (role-based checks)

use hr_graphql_server::middleware::{sanitize_string_input, validate_email_format, validate_phone_format};
use hr_graphql_server::auth::{UserContext, authorization::{
    require_admin, require_hr_manager, require_manager,
    require_permission, require_role, require_owner_or_admin
}};
use hr_graphql_server::error::{AppError, ErrorCode};
use uuid::Uuid;

// ============================================================================
// 1. STRING UTILITY TESTS (6 tests)
// ============================================================================

#[test]
fn test_sanitize_string_input_removes_null_bytes() {
    let input = "hello\0world";
    let sanitized = sanitize_string_input(input);
    assert_eq!(sanitized, "helloworld");
}

#[test]
fn test_sanitize_string_input_preserves_alphanumeric_and_special_chars() {
    let input = "User123!@#$%^&*()_+-=[]{}|;:,.<>?";
    let sanitized = sanitize_string_input(input);
    // Should keep alphanumeric and allowed special chars
    assert!(sanitized.contains("User123"));
    assert!(sanitized.contains("!@#$%^&*()_+-=[]{}|;:,.<>?"));
}

#[test]
fn test_sanitize_string_input_preserves_whitespace() {
    let input = "Hello World  Test";
    let sanitized = sanitize_string_input(input);
    assert_eq!(sanitized, "Hello World  Test");
}

#[test]
fn test_validate_email_format_valid_emails() {
    assert!(validate_email_format("user@example.com"));
    assert!(validate_email_format("test.user@domain.co.uk"));
    assert!(validate_email_format("admin+tag@company.org"));
    assert!(validate_email_format("user123@test-domain.com"));
}

#[test]
fn test_validate_email_format_invalid_emails() {
    assert!(!validate_email_format("invalid-email"));
    assert!(!validate_email_format(""));
    assert!(!validate_email_format("no-at-sign.com"));
    assert!(!validate_email_format("@example.com"));
    assert!(!validate_email_format("user@"));
    assert!(!validate_email_format("user @example.com")); // space before @

    // Email longer than 254 characters (max length check)
    let long_email = format!("{}@example.com", "a".repeat(250));
    assert!(!validate_email_format(&long_email));
}

#[test]
fn test_validate_phone_format_valid_phones() {
    assert!(validate_phone_format("+1234567890"));
    assert!(validate_phone_format("1234567890"));
    assert!(validate_phone_format("+12345678901234")); // 14 digits after +
    assert!(validate_phone_format("+1 234 567 8901")); // with spaces
    assert!(validate_phone_format("+1-234-567-8901")); // with hyphens
}

#[test]
fn test_validate_phone_format_invalid_phones() {
    assert!(!validate_phone_format("invalid-phone"));
    assert!(!validate_phone_format(""));
    assert!(!validate_phone_format("1")); // too short (only 1 digit)
    assert!(!validate_phone_format("+0123456789")); // starts with 0 after +
    assert!(!validate_phone_format("abc1234567890")); // contains letters
    assert!(!validate_phone_format("0123456789")); // starts with 0 without +
    assert!(!validate_phone_format("+1 abc 567 8901")); // contains non-numeric

    // Phone longer than 20 characters
    let long_phone = "+123456789012345678901";
    assert!(!validate_phone_format(long_phone));
}

// ============================================================================
// 2. PERMISSION HELPER TESTS (8 tests)
// ============================================================================

#[test]
fn test_user_context_has_permission_exact_match() {
    let ctx = UserContext::new(
        Uuid::new_v4(),
        vec!["Employee".to_string()],
        vec!["employees:read".to_string(), "documents:write".to_string()],
    );

    assert!(ctx.has_permission("employees:read"));
    assert!(ctx.has_permission("documents:write"));
    assert!(!ctx.has_permission("employees:delete"));
}

#[test]
fn test_user_context_has_permission_wildcard() {
    let ctx = UserContext::new(
        Uuid::new_v4(),
        vec!["SuperUser".to_string()],
        vec!["*".to_string()],
    );

    assert!(ctx.has_permission("employees:read"));
    assert!(ctx.has_permission("employees:write"));
    assert!(ctx.has_permission("any:permission"));
}

#[test]
fn test_user_context_admin_has_all_permissions() {
    let ctx = UserContext::new(
        Uuid::new_v4(),
        vec!["Admin".to_string()],
        vec![], // No explicit permissions
    );

    // Admin role grants all permissions implicitly
    assert!(ctx.has_permission("employees:read"));
    assert!(ctx.has_permission("documents:delete"));
    assert!(ctx.has_permission("system:admin"));
}

#[test]
fn test_user_context_system_has_all_permissions() {
    let ctx = UserContext::system();

    assert!(ctx.is_system());
    assert!(ctx.has_permission("any:permission"));
    assert_eq!(ctx.user_id, Uuid::nil());
    assert_eq!(ctx.email, Some("system@internal".to_string()));
}

#[test]
fn test_user_context_role_hierarchy_admin() {
    let ctx = UserContext::new(
        Uuid::new_v4(),
        vec!["Admin".to_string()],
        vec![],
    );

    assert!(ctx.is_admin());
    assert!(ctx.is_hr_manager()); // Admin inherits HR_Manager
    assert!(ctx.is_manager());    // Admin inherits Manager
}

#[test]
fn test_user_context_role_hierarchy_hr_manager() {
    let ctx = UserContext::new(
        Uuid::new_v4(),
        vec!["HR_Manager".to_string()],
        vec!["employees:read".to_string()],
    );

    assert!(!ctx.is_admin());
    assert!(ctx.is_hr_manager());
    assert!(ctx.is_manager()); // HR_Manager inherits Manager
}

#[test]
fn test_user_context_role_hierarchy_manager() {
    let ctx = UserContext::new(
        Uuid::new_v4(),
        vec!["Manager".to_string()],
        vec!["team:read".to_string()],
    );

    assert!(!ctx.is_admin());
    assert!(!ctx.is_hr_manager());
    assert!(ctx.is_manager());
}

#[test]
fn test_user_context_has_role_case_insensitive() {
    let ctx = UserContext::new(
        Uuid::new_v4(),
        vec!["HR_Manager".to_string()],
        vec![],
    );

    assert!(ctx.has_role("HR_Manager"));
    assert!(ctx.has_role("hr_manager"));
    assert!(ctx.has_role("HR_MANAGER"));
    assert!(ctx.has_role("Hr_MaNaGeR"));
}

// ============================================================================
// 3. ERROR HANDLING UTILITY TESTS (5 tests)
// ============================================================================

#[test]
fn test_error_code_as_str() {
    assert_eq!(ErrorCode::UNAUTHENTICATED.as_str(), "UNAUTHENTICATED");
    assert_eq!(ErrorCode::FORBIDDEN.as_str(), "FORBIDDEN");
    assert_eq!(ErrorCode::BAD_USER_INPUT.as_str(), "BAD_USER_INPUT");
    assert_eq!(ErrorCode::NOT_FOUND.as_str(), "NOT_FOUND");
    assert_eq!(ErrorCode::CONFLICT.as_str(), "CONFLICT");
    assert_eq!(ErrorCode::INTERNAL_ERROR.as_str(), "INTERNAL_ERROR");
    assert_eq!(ErrorCode::SERVICE_UNAVAILABLE.as_str(), "SERVICE_UNAVAILABLE");
    assert_eq!(ErrorCode::RATE_LIMITED.as_str(), "RATE_LIMITED");
}

#[test]
fn test_app_error_display_authentication() {
    let error = AppError::Authentication("Invalid token".to_string());
    assert_eq!(error.to_string(), "Authentication error: Invalid token");
}

#[test]
fn test_app_error_display_authorization() {
    let error = AppError::Authorization("Insufficient permissions".to_string());
    assert_eq!(error.to_string(), "Authorization error: Insufficient permissions");
}

#[test]
fn test_app_error_display_validation() {
    let error = AppError::Validation("Email is required".to_string());
    assert_eq!(error.to_string(), "Validation error: Email is required");
}

#[test]
fn test_app_error_display_variants() {
    assert_eq!(
        AppError::NotFound("User".to_string()).to_string(),
        "Not found: User"
    );
    assert_eq!(
        AppError::Conflict("Duplicate email".to_string()).to_string(),
        "Conflict: Duplicate email"
    );
    assert_eq!(
        AppError::Internal("Unexpected error".to_string()).to_string(),
        "Internal error: Unexpected error"
    );
    assert_eq!(
        AppError::SessionExpired.to_string(),
        "Session expired"
    );
    assert_eq!(
        AppError::AccountLocked.to_string(),
        "Account temporarily locked"
    );
    assert_eq!(
        AppError::RateLimited.to_string(),
        "Too many requests"
    );
}

// ============================================================================
// 4. AUTHORIZATION UTILITY TESTS (6 tests)
// ============================================================================

#[test]
fn test_require_admin_success() {
    let admin_ctx = UserContext::new(
        Uuid::new_v4(),
        vec!["Admin".to_string()],
        vec![],
    );
    assert!(require_admin(&admin_ctx).is_ok());
}

#[test]
fn test_require_admin_failure() {
    let user_ctx = UserContext::new(
        Uuid::new_v4(),
        vec!["Employee".to_string()],
        vec![],
    );
    let result = require_admin(&user_ctx);
    assert!(result.is_err());
    assert!(result.unwrap_err().message.contains("admin"));
}

#[test]
fn test_require_hr_manager_success() {
    let hr_ctx = UserContext::new(
        Uuid::new_v4(),
        vec!["HR_Manager".to_string()],
        vec![],
    );
    assert!(require_hr_manager(&hr_ctx).is_ok());

    // Admin also satisfies HR Manager requirement
    let admin_ctx = UserContext::new(
        Uuid::new_v4(),
        vec!["Admin".to_string()],
        vec![],
    );
    assert!(require_hr_manager(&admin_ctx).is_ok());
}

#[test]
fn test_require_hr_manager_failure() {
    let user_ctx = UserContext::new(
        Uuid::new_v4(),
        vec!["Employee".to_string()],
        vec![],
    );
    let result = require_hr_manager(&user_ctx);
    assert!(result.is_err());
    assert!(result.unwrap_err().message.contains("HR Manager"));
}

#[test]
fn test_require_manager_success() {
    let manager_ctx = UserContext::new(
        Uuid::new_v4(),
        vec!["Manager".to_string()],
        vec![],
    );
    assert!(require_manager(&manager_ctx).is_ok());

    // HR_Manager also satisfies Manager requirement
    let hr_ctx = UserContext::new(
        Uuid::new_v4(),
        vec!["HR_Manager".to_string()],
        vec![],
    );
    assert!(require_manager(&hr_ctx).is_ok());
}

#[test]
fn test_require_permission_success_and_failure() {
    let ctx_with_perm = UserContext::new(
        Uuid::new_v4(),
        vec!["Employee".to_string()],
        vec!["users:read".to_string()],
    );
    assert!(require_permission(&ctx_with_perm, "users:read").is_ok());

    let result = require_permission(&ctx_with_perm, "users:write");
    assert!(result.is_err());
    assert!(result.unwrap_err().message.contains("users:write"));

    // Admin bypasses permission checks
    let admin_ctx = UserContext::new(
        Uuid::new_v4(),
        vec!["Admin".to_string()],
        vec![],
    );
    assert!(require_permission(&admin_ctx, "any:permission").is_ok());
}

#[test]
fn test_require_role_success_and_failure() {
    let ctx = UserContext::new(
        Uuid::new_v4(),
        vec!["HR_Manager".to_string()],
        vec![],
    );
    assert!(require_role(&ctx, "HR_Manager").is_ok());

    let result = require_role(&ctx, "Admin");
    assert!(result.is_err());
    assert!(result.unwrap_err().message.contains("Admin"));
}

#[test]
fn test_require_owner_or_admin_owner_access() {
    let user_id = Uuid::new_v4();
    let owner_ctx = UserContext::new(
        user_id,
        vec!["Employee".to_string()],
        vec![],
    );

    // Owner can access their own resource
    assert!(require_owner_or_admin(&owner_ctx, user_id).is_ok());

    // Owner cannot access other user's resource
    let other_id = Uuid::new_v4();
    let result = require_owner_or_admin(&owner_ctx, other_id);
    assert!(result.is_err());
}

#[test]
fn test_require_owner_or_admin_admin_access() {
    let user_id = Uuid::new_v4();
    let admin_ctx = UserContext::new(
        user_id,
        vec!["Admin".to_string()],
        vec![],
    );

    // Admin can access any resource
    let other_id = Uuid::new_v4();
    assert!(require_owner_or_admin(&admin_ctx, other_id).is_ok());
    assert!(require_owner_or_admin(&admin_ctx, user_id).is_ok());
}

// ============================================================================
// 5. USER CONTEXT CONSTRUCTION TESTS (3 tests)
// ============================================================================

#[test]
fn test_user_context_new_basic() {
    let user_id = Uuid::new_v4();
    let ctx = UserContext::new(
        user_id,
        vec!["Employee".to_string()],
        vec!["profile:read".to_string()],
    );

    assert_eq!(ctx.user_id, user_id);
    assert_eq!(ctx.roles.len(), 1);
    assert_eq!(ctx.permissions.len(), 1);
    assert_eq!(ctx.email, None);
    assert_eq!(ctx.department_id, None);
    assert_eq!(ctx.organization_id, None);
}

#[test]
fn test_user_context_with_rls() {
    let user_id = Uuid::new_v4();
    let dept_id = Uuid::new_v4();
    let org_id = Uuid::new_v4();

    let ctx = UserContext::with_rls(
        user_id,
        vec!["Manager".to_string()],
        vec!["team:read".to_string()],
        Some(dept_id),
        Some(org_id),
    );

    assert_eq!(ctx.user_id, user_id);
    assert_eq!(ctx.department_id, Some(dept_id));
    assert_eq!(ctx.organization_id, Some(org_id));
}

#[test]
fn test_user_context_system_context() {
    let ctx = UserContext::system();

    assert_eq!(ctx.user_id, Uuid::nil());
    assert!(ctx.roles.contains(&"system".to_string()));
    assert!(ctx.permissions.contains(&"*".to_string()));
    assert_eq!(ctx.email, Some("system@internal".to_string()));
    assert!(ctx.is_system());
    assert!(ctx.has_permission("any:permission"));
}
