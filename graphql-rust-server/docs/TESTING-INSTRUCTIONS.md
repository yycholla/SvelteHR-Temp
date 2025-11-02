# Testing Instructions - GraphQL Rust Server

**Generated:** 2025-11-02
**Status:** Tarpaulin coverage analysis in progress

---

## Quick Start

### View Coverage Reports

**Three comprehensive reports have been generated:**

1. **Executive Summary**
   ```bash
   cat /home/chanway/SvelteHR/graphql-rust-server/docs/test-coverage-summary.md
   ```
   - High-level overview
   - Critical findings
   - Action plan with timelines

2. **Detailed Coverage Analysis**
   ```bash
   cat /home/chanway/SvelteHR/graphql-rust-server/docs/test-coverage-report.md
   ```
   - Module-by-module breakdown
   - Security gap analysis
   - Test recommendations with code examples
   - 12-week improvement roadmap

3. **Quick Wins Guide**
   ```bash
   cat /home/chanway/SvelteHR/graphql-rust-server/docs/test-quick-wins.md
   ```
   - Easy tests to implement (1-2 hours each)
   - 11 categories of quick wins
   - Test templates and patterns
   - ~70 new tests in 2-3 weeks

---

## Tarpaulin Coverage Analysis

### Status: IN PROGRESS ⏳

Tarpaulin is currently running to generate line-level coverage data. This process typically takes 15-20 minutes for a large codebase.

**Command Used:**
```bash
cargo tarpaulin --lib --all-features --out Xml --out Html --output-dir coverage/ --timeout 300
```

### Check Progress

```bash
# Check if still running
ps aux | grep tarpaulin

# Monitor output (if running in background)
tail -f /tmp/tarpaulin-output.log  # (if logged)
```

### When Complete

**Output Files:**
- `coverage/index.html` - Interactive HTML report
- `coverage/cobertura.xml` - XML data for CI/CD

**View HTML Report:**
```bash
# Open in browser
xdg-open coverage/index.html
# or
firefox coverage/index.html
# or
google-chrome coverage/index.html
```

**Expected Results:**
- Exact line coverage percentage
- Uncovered line ranges per file
- Branch coverage metrics
- Function coverage breakdown

---

## Running Tests

### Basic Commands

```bash
# Run all tests
cargo test

# Run specific test
cargo test test_name

# Run tests with output
cargo test -- --nocapture

# Run ignored tests (database-dependent)
cargo test -- --ignored

# Run specific module tests
cargo test models::user
cargo test auth::
```

### Coverage Commands

```bash
# Generate HTML coverage report (after tarpaulin installs)
cargo tarpaulin --lib --all-features --out Html --output-dir coverage/

# Generate XML for CI/CD
cargo tarpaulin --lib --all-features --out Xml --output-dir coverage/

# Both HTML and XML
cargo tarpaulin --lib --all-features --out Html --out Xml --output-dir coverage/

# Fail if coverage below threshold
cargo tarpaulin --fail-under 60

# Verbose output
cargo tarpaulin --verbose

# Include ignored tests
cargo tarpaulin -- --ignored
```

### Watch Mode

```bash
# Install cargo-watch
cargo install cargo-watch

# Run tests on file changes
cargo watch -x test

# Run specific test on changes
cargo watch -x "test test_name -- --nocapture"
```

---

## Key Findings Summary

### Current Coverage: 25-30%

**What's Tested:**
- ✅ Database & RLS (83% file coverage) - STRONG
- ✅ Business Logic Services (75% file coverage) - GOOD
- ✅ JWT Middleware (6 tests) - MODERATE

**Critical Gaps:**
- 🚨 GraphQL Schema: 5,000+ lines, 0 tests
- 🚨 Auth Backend: 531 lines, 0 tests
- 🚨 RBAC Mutations: 663 lines, 0 tests
- 🚨 Request Handlers: 397 lines, 0 tests

### Top 10 Untested Critical Files

1. `src/schema/mutation.rs` - 3,966 lines (all mutations)
2. `src/schema/query.rs` - 1,693 lines (all queries)
3. `src/schema/mutations/task.rs` - 693 lines
4. `src/schema/mutations/rbac.rs` - 663 lines
5. `src/auth/backend.rs` - 531 lines
6. `src/handlers.rs` - 397 lines
7. `src/middleware/csrf.rs` - 210 lines
8. `src/middleware/rate_limiting.rs` - 187 lines
9. `src/schema/mutations/auth.rs` - 184 lines
10. `src/middleware/optional_auth.rs` - 225 lines

---

## Recommended Action Plan

### Week 1: Critical Security (URGENT)

**Priority: Prevent authentication/authorization bypass**

#### 1. Auth Backend Tests (4-6 hours)
File: `src/auth/backend.rs` (531 lines)

```bash
# Add tests for:
# - Password verification
# - Account lockout (5 failed attempts)
# - Rate limiting (10/IP, 5/account)
# - Progressive delays
# - Inactive user rejection

# Example test structure
#[cfg(test)]
mod tests {
    #[tokio::test]
    async fn test_valid_password_login() { /* ... */ }

    #[tokio::test]
    async fn test_account_locks_after_5_failures() { /* ... */ }
}
```

#### 2. RBAC Mutation Tests (6-8 hours)
File: `src/schema/mutations/rbac.rs` (663 lines)

```bash
# Test role/permission management
# Test authorization checks
# Test bulk operations
```

#### 3. CSRF Protection Tests (3-4 hours)
File: `src/middleware/csrf.rs` (210 lines)

#### 4. RLS Integration Tests (4-6 hours)
New file: `tests/rls_integration_test.rs`

```bash
# Test multi-tenant data isolation
# Test cross-tenant access prevention
```

**Total Effort:** 17-24 hours (1 week, 1 developer)
**Impact:** Eliminates critical security vulnerabilities

---

### Week 2: Quick Wins

**Priority: Build momentum, increase coverage to 40%**

See `docs/test-quick-wins.md` for details.

**Focus:**
- Pure logic functions (no database)
- Model validation
- Middleware edge cases

**Effort:** 16-23 hours
**New Tests:** ~70 functions
**Coverage Gain:** +10-15%

---

### Weeks 3-6: Core Business Logic

**Priority: Test all GraphQL resolvers**

**Focus:**
1. GraphQL query resolvers (12-16 hours)
2. GraphQL mutation resolvers (20-30 hours)
3. Model validation (10-15 hours)

**Total Effort:** 42-61 hours
**Coverage Goal:** 60%

---

### Weeks 7-12: Production Readiness

**Priority: Comprehensive coverage**

**Focus:**
- Edge cases and error paths
- Performance tests
- Load tests
- Integration tests

**Total Effort:** 60-80 hours
**Coverage Goal:** 80%+

---

## Test Infrastructure Setup

### Install Test Tools

```bash
# Tarpaulin for coverage (already installed)
cargo install cargo-tarpaulin

# Watch mode for development
cargo install cargo-watch

# Nextest (faster test runner)
cargo install cargo-nextest
```

### Set Up Test Database

```bash
# Copy from .env.example
cp .env.example .env.test

# Edit DATABASE_URL to point to test database
# DATABASE_URL=postgresql://postgres:password@localhost:5432/sveltehr_test

# Run migrations
cargo run --bin migrate

# Or use testcontainers (already configured)
```

### Create Test Helpers

The project already has test infrastructure in `src/testing/`:
- `database.rs` - Test database setup
- `auth.rs` - Auth test utilities
- `context.rs` - Test context creation

**Leverage these in new tests!**

---

## Writing Tests: Quick Reference

### Unit Test Template

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_pure_function() {
        // Arrange
        let input = "test";

        // Act
        let result = function(input);

        // Assert
        assert_eq!(result, expected);
    }

    #[tokio::test]
    async fn test_async_function() {
        let result = async_function().await.unwrap();
        assert!(result.is_valid());
    }
}
```

### Integration Test Template

```rust
// tests/integration_test.rs
use hr_graphql_server::testing::*;

#[tokio::test]
async fn test_feature() {
    // Create test database
    let db = setup_test_database().await;

    // Seed test data
    let user = create_test_user(&db, "Admin").await;

    // Run test
    let result = perform_operation(&db, &user).await;

    // Verify
    assert!(result.is_ok());

    // Cleanup (automatic with testcontainers)
}
```

### GraphQL Resolver Test Template

```rust
#[tokio::test]
async fn test_graphql_query() {
    let schema = create_test_schema().await;
    let user = create_admin_user().await;

    let query = r#"
        query {
            users {
                id
                email
            }
        }
    "#;

    let result = schema
        .execute(Request::new(query).data(user))
        .await;

    assert!(result.errors.is_empty());
    assert!(!result.data.as_object().unwrap()["users"].as_array().unwrap().is_empty());
}
```

---

## Continuous Integration

### GitHub Actions Example

```yaml
name: Test Coverage

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Install Rust
        uses: actions-rs/toolchain@v1
        with:
          toolchain: stable

      - name: Install Tarpaulin
        run: cargo install cargo-tarpaulin

      - name: Run tests with coverage
        run: cargo tarpaulin --out Xml --fail-under 60

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./cobertura.xml
```

---

## Coverage Goals

### Phase Targets

| Phase | Timeline | Coverage Target | Focus |
|-------|----------|-----------------|-------|
| Current | Now | 25-30% | Existing tests |
| Phase 1 | Week 1 | 30-35% | Critical security |
| Phase 2 | Week 2 | 40% | Quick wins |
| Phase 3 | Week 6 | 60% | GraphQL resolvers |
| Phase 4 | Week 12 | 80%+ | Comprehensive |

### Module Targets

| Module | Current | Target |
|--------|---------|--------|
| Database & RLS | 83% | 90% |
| Auth & Security | 47% | 80% |
| GraphQL Schema | 11% | 70% |
| Business Logic | 75% | 85% |
| Models | 26% | 60% |

---

## Troubleshooting

### Tarpaulin Fails to Compile

```bash
# Try without all features
cargo tarpaulin --lib

# Skip problematic crates
cargo tarpaulin --lib --exclude-files "**/generated/*"

# Increase timeout
cargo tarpaulin --lib --timeout 600
```

### Tests Hang or Timeout

```bash
# Run specific tests
cargo test test_name -- --nocapture

# Check for database connections
# Ensure test database is running

# Use shorter timeouts in tests
#[tokio::test(timeout = 5000)]
async fn test_with_timeout() { /* ... */ }
```

### Database Connection Issues

```bash
# Check DATABASE_URL in .env.test
echo $DATABASE_URL

# Start test database
docker-compose -f docker-compose.test.yml up -d

# Or use testcontainers (already configured)
```

---

## Next Steps

1. ✅ **Review the summary report** - Understand current state
2. ✅ **Check tarpaulin output** - Wait for completion, view coverage/index.html
3. ⏳ **Start Week 1 tasks** - Critical security tests
4. ⏳ **Set up CI/CD** - Automate coverage reporting
5. ⏳ **Train team** - Share testing patterns and best practices

---

## Additional Resources

### Project Documentation
- Main Report: `docs/test-coverage-report.md`
- Quick Wins: `docs/test-quick-wins.md`
- This File: `docs/TESTING-INSTRUCTIONS.md`

### Rust Testing Resources
- [Rust Book - Testing](https://doc.rust-lang.org/book/ch11-00-testing.html)
- [Cargo Tarpaulin](https://github.com/xd009642/tarpaulin)
- [Tokio Testing](https://tokio.rs/tokio/topics/testing)
- [async-graphql Testing](https://async-graphql.github.io/async-graphql/en/testing.html)

### Testing Best Practices
- AAA Pattern (Arrange, Act, Assert)
- One assertion per test
- Descriptive test names
- Test data builders
- Isolated tests (no shared state)

---

**Report Status:** Initial analysis complete
**Tarpaulin Status:** Running (compiling with coverage instrumentation)
**Expected Completion:** 15-20 minutes from 18:11 UTC (estimated: 18:26-18:31 UTC)

**To check if tarpaulin is complete:**
```bash
ls -lh coverage/
# If you see index.html and cobertura.xml, it's done!
```
