# Test Coverage Quick Wins

**Goal:** Rapidly increase test coverage from 25% to 40% in 1-2 weeks by targeting easy-to-test, high-value code.

---

## Quick Win Strategy

These are tests that are:
- **Easy to write** (1-2 hours each)
- **No complex setup** (minimal database, auth, or infrastructure requirements)
- **High value** (test critical paths or pure logic)
- **Good starting point** for developers new to the codebase

---

## Category 1: Pure Function Tests (No Database)

### 1. Filter Logic (`src/db/filters.rs`)
**Current:** 5 tests | **Target:** 12 tests | **Effort:** 1-2 hours

**Missing Test Cases:**
```rust
#[test]
fn test_filter_with_null_values() {
    // Test filters handle NULL correctly
}

#[test]
fn test_filter_with_special_characters() {
    // Test SQL injection prevention
}

#[test]
fn test_filter_with_unicode() {
    // Test international character support
}

#[test]
fn test_multiple_filter_conditions_combined() {
    // Test AND/OR logic
}

#[test]
fn test_filter_empty_array() {
    // Test edge case with empty filter list
}

#[test]
fn test_filter_date_range_validation() {
    // Test start_date < end_date enforcement
}

#[test]
fn test_filter_case_insensitive_search() {
    // Test case-insensitive string matching
}
```

**Why Quick Win:**
- Pure logic, no database required
- Clear input/output expectations
- Critical for security (SQL injection prevention)

---

### 2. Pagination Logic (`src/services/pagination.rs`)
**Current:** 6 tests | **Target:** 12 tests | **Effort:** 1-2 hours

**Missing Test Cases:**
```rust
#[test]
fn test_pagination_with_zero_items() {
    // Test empty result set
}

#[test]
fn test_pagination_first_page_has_previous_false() {
    // Test hasNextPage/hasPreviousPage logic
}

#[test]
fn test_pagination_last_page_has_next_false() {
    // Test boundary conditions
}

#[test]
fn test_pagination_cursor_encoding() {
    // Test base64 cursor generation
}

#[test]
fn test_pagination_invalid_cursor_returns_error() {
    // Test malformed cursor handling
}

#[test]
fn test_pagination_maximum_page_size_enforced() {
    // Test limit cannot exceed max (100?)
}
```

**Why Quick Win:**
- Cursor logic is pure (base64 encoding/decoding)
- No database needed for cursor generation tests
- Critical for API correctness

---

### 3. Query Builder (`src/services/query_builder.rs`)
**Current:** 3 tests | **Target:** 10 tests | **Effort:** 2-3 hours

**Missing Test Cases:**
```rust
#[test]
fn test_query_builder_with_single_field() {
    // Test field selection
}

#[test]
fn test_query_builder_with_nested_fields() {
    // Test relationship traversal
}

#[test]
fn test_query_builder_with_sorting() {
    // Test ORDER BY generation
}

#[test]
fn test_query_builder_with_multiple_filters() {
    // Test WHERE clause construction
}

#[test]
fn test_query_builder_sql_injection_prevention() {
    // Test parameterized queries
}

#[test]
fn test_query_builder_limit_offset() {
    // Test pagination SQL
}

#[test]
fn test_query_builder_joins() {
    // Test JOIN generation for relationships
}
```

**Why Quick Win:**
- Query building logic can be tested without executing queries
- Verify SQL generation is correct
- High value for security (SQL injection)

---

### 4. Error Formatting (`src/error.rs`)
**Current:** 2 tests | **Target:** 8 tests | **Effort:** 1 hour

**Missing Test Cases:**
```rust
#[test]
fn test_database_error_to_graphql_error() {
    // Test error type conversion
}

#[test]
fn test_authentication_error_returns_401() {
    // Test HTTP status mapping
}

#[test]
fn test_validation_error_includes_field_name() {
    // Test error message format
}

#[test]
fn test_not_found_error_returns_404() {
    // Test status codes
}

#[test]
fn test_internal_error_hides_sensitive_details() {
    // Test error message sanitization
}

#[test]
fn test_error_stack_trace_in_debug_mode() {
    // Test debug vs production error handling
}
```

**Why Quick Win:**
- Pure logic (enum conversions)
- No database or auth setup
- Important for API consistency

---

## Category 2: Model Validation Tests (Minimal Database)

### 5. User Model (`src/models/user.rs`)
**Current:** 2 tests | **Target:** 10 tests | **Effort:** 2-3 hours

**Template:**
```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_valid_email_accepted() {
        assert!(validate_email("user@example.com").is_ok());
    }

    #[test]
    fn test_invalid_email_rejected() {
        assert!(validate_email("not-an-email").is_err());
    }

    #[test]
    fn test_email_normalization() {
        let normalized = normalize_email("User@Example.COM");
        assert_eq!(normalized, "user@example.com");
    }

    #[test]
    fn test_password_hash_generation() {
        let hash = hash_password("password123");
        assert_ne!(hash, "password123"); // Should be hashed
    }

    #[test]
    fn test_password_verification() {
        let hash = hash_password("password123");
        assert!(verify_password("password123", &hash));
    }

    #[test]
    fn test_user_full_name_concatenation() {
        let user = User {
            first_name: "John".to_string(),
            last_name: "Doe".to_string(),
            ..Default::default()
        };
        assert_eq!(user.full_name(), "John Doe");
    }

    #[test]
    fn test_user_is_active_by_default() {
        let user = User::default();
        assert!(user.is_active);
    }

    #[test]
    fn test_user_roles_array_parsing() {
        // Test role array serialization
    }
}
```

**Why Quick Win:**
- Most validation logic is pure (email validation, name formatting)
- Password hashing is library-based (bcrypt)
- No database queries needed for validation tests

---

### 6. Role Model (`src/models/role.rs`)
**Current:** 1 test | **Target:** 8 tests | **Effort:** 2 hours

**Test Cases:**
```rust
#[test]
fn test_role_hierarchy_admin_highest() {
    assert!(Role::Admin.level() > Role::HRManager.level());
}

#[test]
fn test_role_hierarchy_comparison() {
    assert!(Role::Admin.can_manage(Role::Employee));
}

#[test]
fn test_role_name_validation() {
    assert!(validate_role_name("Admin").is_ok());
    assert!(validate_role_name("Invalid@Role").is_err());
}

#[test]
fn test_role_inherits_permissions() {
    let admin = Role::Admin;
    let manager_perms = Role::Manager.permissions();
    assert!(admin.has_all_permissions(&manager_perms));
}

#[test]
fn test_role_serialization() {
    let role = Role::Admin;
    let json = serde_json::to_string(&role).unwrap();
    assert_eq!(json, "\"Admin\"");
}
```

**Why Quick Win:**
- Role hierarchy logic is pure (comparison functions)
- Enum-based, easy to test all variants
- Critical for RBAC correctness

---

### 7. Permission Model (`src/models/permission.rs`)
**Current:** 1 test | **Target:** 8 tests | **Effort:** 1-2 hours

**Test Cases:**
```rust
#[test]
fn test_permission_parsing_from_string() {
    let perm = Permission::from_str("employees:read").unwrap();
    assert_eq!(perm.resource, "employees");
    assert_eq!(perm.action, "read");
}

#[test]
fn test_permission_wildcard_matching() {
    let wildcard = Permission::from_str("employees:*").unwrap();
    assert!(wildcard.matches(&Permission::from_str("employees:read").unwrap()));
}

#[test]
fn test_permission_format() {
    let perm = Permission::new("users", "write");
    assert_eq!(perm.to_string(), "users:write");
}

#[test]
fn test_invalid_permission_format_rejected() {
    assert!(Permission::from_str("invalid").is_err());
}

#[test]
fn test_permission_comparison() {
    let p1 = Permission::from_str("users:read").unwrap();
    let p2 = Permission::from_str("users:read").unwrap();
    assert_eq!(p1, p2);
}
```

**Why Quick Win:**
- String parsing logic is pure
- Pattern matching can be tested without database
- Essential for permission checks

---

## Category 3: Middleware Tests (Moderate Setup)

### 8. JWT Middleware (`src/middleware/auth.rs`)
**Current:** 6 tests | **Target:** 12 tests | **Effort:** 2-3 hours

**Existing tests are good! Add edge cases:**
```rust
#[tokio::test]
async fn test_token_with_missing_claims() {
    // Test token without user_id claim
}

#[tokio::test]
async fn test_token_with_extra_claims() {
    // Test forward compatibility
}

#[tokio::test]
async fn test_token_refresh_before_expiry() {
    // Test token refresh logic
}

#[tokio::test]
async fn test_multiple_concurrent_requests_same_token() {
    // Test thread safety
}

#[tokio::test]
async fn test_token_revocation() {
    // Test blacklist/revocation logic
}

#[tokio::test]
async fn test_case_insensitive_bearer_prefix() {
    // Test "bearer" vs "Bearer"
}
```

**Why Quick Win:**
- Test infrastructure already exists
- Add edge cases to existing test suite
- High value for security

---

### 9. Request Limits Middleware (`src/middleware/request_limits.rs`)
**Current:** 6 tests | **Target:** 10 tests | **Effort:** 1 hour

**Add edge cases:**
```rust
#[tokio::test]
async fn test_body_size_exactly_at_limit() {
    // Test boundary condition
}

#[tokio::test]
async fn test_streaming_body_size_check() {
    // Test chunked transfer encoding
}

#[tokio::test]
async fn test_concurrent_requests_within_limit() {
    // Test rate limiting doesn't block valid traffic
}

#[tokio::test]
async fn test_limits_reset_after_time_window() {
    // Test rate limit window expiration
}
```

---

## Category 4: Utility Function Tests (Super Easy)

### 10. Query Debugger (`src/utils/query_debugger.rs`)
**Current:** 2 tests | **Target:** 8 tests | **Effort:** 1 hour

**Test Cases:**
```rust
#[test]
fn test_query_parsing_simple_query() {}

#[test]
fn test_query_parsing_with_fragments() {}

#[test]
fn test_query_complexity_calculation() {}

#[test]
fn test_query_depth_calculation() {}

#[test]
fn test_malformed_query_error_handling() {}

#[test]
fn test_query_variable_extraction() {}
```

**Why Quick Win:**
- Pure string parsing logic
- No external dependencies
- Fast to write and run

---

### 11. Schema Validator (`src/utils/schema_validator.rs`)
**Current:** 1 test | **Target:** 8 tests | **Effort:** 1 hour

**Test Cases:**
```rust
#[test]
fn test_valid_schema_passes() {}

#[test]
fn test_schema_with_missing_types_fails() {}

#[test]
fn test_schema_with_circular_references_detected() {}

#[test]
fn test_schema_field_validation() {}

#[test]
fn test_schema_argument_validation() {}
```

---

## Quick Win Summary Table

| Module | Current | Target | Effort | Value | Priority |
|--------|---------|--------|--------|-------|----------|
| Filter Logic | 5 | 12 | 1-2h | High | 1 |
| Pagination | 6 | 12 | 1-2h | High | 2 |
| Error Formatting | 2 | 8 | 1h | Medium | 3 |
| User Model | 2 | 10 | 2-3h | High | 4 |
| Role Model | 1 | 8 | 2h | High | 5 |
| Permission Model | 1 | 8 | 1-2h | High | 6 |
| Query Builder | 3 | 10 | 2-3h | High | 7 |
| JWT Middleware | 6 | 12 | 2-3h | Medium | 8 |
| Request Limits | 6 | 10 | 1h | Low | 9 |
| Query Debugger | 2 | 8 | 1h | Low | 10 |
| Schema Validator | 1 | 8 | 1h | Low | 11 |

**Total Effort:** 16-23 hours
**Coverage Increase:** +10-15% overall coverage
**New Tests:** ~70 additional test functions

---

## Implementation Strategy

### Week 1: Pure Logic Tests (8-10 hours)
**Days 1-2:**
- Filter Logic (7 tests)
- Pagination (6 tests)
- Error Formatting (6 tests)

**Expected Outcome:** +5% coverage

---

### Week 2: Model Validation Tests (8-10 hours)
**Days 3-4:**
- User Model (8 tests)
- Role Model (7 tests)
- Permission Model (7 tests)

**Expected Outcome:** +5% coverage

---

### Week 3: Middleware & Utilities (6-8 hours)
**Days 5-6:**
- Query Builder (7 tests)
- JWT Middleware (6 tests)
- Request Limits (4 tests)
- Query Debugger (6 tests)
- Schema Validator (7 tests)

**Expected Outcome:** +5% coverage

---

## Success Criteria

After completing quick wins:
- ✅ Coverage increases from 25% to 40%
- ✅ All pure logic functions have 80%+ coverage
- ✅ Critical models (User, Role, Permission) have validation tests
- ✅ Middleware edge cases are covered
- ✅ Team has momentum and confidence in testing

**Next Phase:** Tackle critical security gaps (auth backend, RBAC, GraphQL resolvers)

---

## Test Writing Tips

### 1. Follow the AAA Pattern
```rust
#[test]
fn test_example() {
    // Arrange: Set up test data
    let input = "test";

    // Act: Execute the function
    let result = function_under_test(input);

    // Assert: Verify the outcome
    assert_eq!(result, expected_output);
}
```

### 2. Use Descriptive Test Names
```rust
// ❌ Bad
#[test]
fn test1() {}

// ✅ Good
#[test]
fn test_email_validation_rejects_missing_at_symbol() {}
```

### 3. Test One Thing Per Test
```rust
// ❌ Bad - Tests multiple things
#[test]
fn test_user() {
    assert!(user.email_valid());
    assert!(user.is_active());
    assert!(user.has_role("Admin"));
}

// ✅ Good - Focused tests
#[test]
fn test_user_email_validation() {
    assert!(user.email_valid());
}

#[test]
fn test_user_is_active_by_default() {
    assert!(user.is_active());
}
```

### 4. Use Test Data Builders
```rust
// Instead of:
let user = User {
    id: Uuid::new_v4(),
    email: "test@example.com".to_string(),
    first_name: "Test".to_string(),
    // ... 20 more fields
};

// Use:
let user = UserBuilder::new()
    .email("test@example.com")
    .build();
```

### 5. Test Edge Cases
```rust
#[test]
fn test_empty_string() {}

#[test]
fn test_null_value() {}

#[test]
fn test_maximum_length() {}

#[test]
fn test_unicode_characters() {}

#[test]
fn test_special_characters() {}
```

---

## Running Quick Win Tests

```bash
# Run all tests
cargo test

# Run specific module tests
cargo test filters
cargo test pagination
cargo test models::user

# Run with output
cargo test -- --nocapture

# Run and show coverage
cargo tarpaulin --lib --out Html --output-dir coverage/
```

---

## Conclusion

These quick wins provide:
1. **Immediate value** - Test critical logic paths
2. **Low barrier to entry** - Easy for new contributors
3. **Momentum** - Build confidence in testing
4. **Foundation** - Infrastructure for harder tests later

**Start here, then tackle the critical security gaps in the main report.**
