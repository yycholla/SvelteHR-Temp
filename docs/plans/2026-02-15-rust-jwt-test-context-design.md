# Design: Rust JWT Test Context Migration

**Date:** 2026-02-15
**Branch:** feat/wave-1-integration
**Scope:** Fix 44 Rust compile errors caused by JWT migration leaving TestContext/TestUserRole broken

---

## Problem

During the JWT auth migration (`c1f480d65c`), `testing/auth.rs` was removed (session-based auth helpers) and `testing/context.rs` was disabled. Three test files still import the disabled types:

- `src/services/digest_service.rs` — imports `TestContext` for DB connection only
- `src/schema/query.rs` — imports `TestContext` + `TestUserRole` for GraphQL resolver tests
- `src/schema/mutations/department.rs` — imports `TestContext` + `TestUserRole` for mutation tests

All 44 compile errors cascade from these 3 import failures (41 are E0282 type-inference errors that vanish once imports resolve).

---

## Key Insight

`context.rs` is **already JWT-correct**. The `execute_query_as` method injects `UserContext::new(user.id, roles, permissions)` directly into the GraphQL request — no JWT token generation or parsing needed. The only missing piece is `TestUsers`, which creates real user DB records for tests that query users by ID.

---

## Design

### Part 1: New `src/testing/auth.rs`

Replaces the removed session-based auth module. Creates real user DB records (one per role) without any JWT tokens — just inserts into `users` and `user_role_assignment` tables.

```rust
pub enum TestUserRole {
    Employee,
    Manager,
    HrManager,
    Admin,
    SystemAdmin,
}

pub struct TestUser {
    pub id: Uuid,
    pub email: String,
    pub role: String,   // "Employee", "HR Manager", "Admin", etc.
}

pub struct TestUsers {
    pub employee: TestUser,
    pub manager: TestUser,
    pub hr_manager: TestUser,
    pub admin: TestUser,
    pub system_admin: TestUser,
}

impl TestUsers {
    /// Creates one user record per role in the test database.
    /// Uses a dummy password_hash (bcrypt of "test-password").
    /// Assigns roles via user_role_assignment table.
    pub async fn create_all(db: &DatabaseConnection) -> Result<Self, TestContextError>
}
```

No JWT tokens are generated. The `execute_query_as` in `context.rs` constructs `UserContext::new(user.id, vec![user.role.clone()], vec![])` directly, which is how JWT-validated requests work at the GraphQL layer.

### Part 2: Re-enable `src/testing/context.rs`

Un-comment one import line:

```rust
// Before (broken):
// use super::auth::{TestUser, TestUserRole, TestUsers}; // REMOVED: Use JWT tokens for test auth

// After:
use super::auth::{TestUser, TestUserRole, TestUsers};
```

All other logic in `context.rs` is unchanged and correct. The full `TestContext` API is restored:

- `TestContext::new()` — creates TestDatabase + TestUsers + GraphQL schema
- `ctx.user(TestUserRole::Admin)` — returns seeded TestUser
- `ctx.execute_query_as(query, user)` — injects UserContext, executes against real schema
- `ctx.extract_data/errors` — response helpers

### Part 3: Update `src/testing/mod.rs`

Un-comment four lines:

```rust
pub mod auth;
pub mod context;
pub use context::TestContext;
pub use auth::{TestUser, TestUserRole, TestUsers};
```

### Part 4: `src/services/digest_service.rs` — pure unit tests

The 4 affected tests only call `service.calculate_next_send_time(cron, now)` — a pure cron calculation that never uses the database. `TestContext` was being used solely to obtain a `DatabaseConnection` to pass to `DigestService::new()`.

**Fix:** Add `"mock"` to sea-orm features, use `MockDatabase` to construct the service:

```toml
# Cargo.toml — add to [dependencies.sea-orm] features:
"mock",
```

```rust
// In each of the 4 tests, replace:
let ctx = TestContext::new().await.expect("Failed to create test context");
let service = DigestService::new(Arc::new(ctx.connection().clone()));

// With:
use sea_orm::{MockDatabase, DatabaseBackend};
let db = MockDatabase::new(DatabaseBackend::Postgres).into_connection();
let service = DigestService::new(Arc::new(db));
```

Remove `use crate::testing::TestContext;` from `digest_service.rs`.

The 5th test (`test_digest_content_structure`) constructs `DigestContent` directly — no change needed.

---

## Files Changed

| File                                 | Change                                                      |
| ------------------------------------ | ----------------------------------------------------------- |
| `src/testing/auth.rs`                | **CREATE** — TestUser, TestUserRole, TestUsers              |
| `src/testing/context.rs`             | **MODIFY** — un-comment 1 import line                       |
| `src/testing/mod.rs`                 | **MODIFY** — un-comment 4 lines                             |
| `Cargo.toml`                         | **MODIFY** — add `"mock"` to sea-orm features               |
| `src/services/digest_service.rs`     | **MODIFY** — 4 tests: replace TestContext with MockDatabase |
| `src/schema/query.rs`                | No change needed (imports resolve once mod.rs is fixed)     |
| `src/schema/mutations/department.rs` | No change needed (imports resolve once mod.rs is fixed)     |

---

## Success Criteria

`cargo test` compiles and runs with 0 errors. The 4 digest_service tests run without Docker. The 6 GraphQL integration tests (query.rs + department.rs) run with a real PostgreSQL container via TestDatabase.
