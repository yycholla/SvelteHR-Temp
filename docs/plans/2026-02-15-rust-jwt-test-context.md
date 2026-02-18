# Rust JWT Test Context Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Fix 44 Rust compile errors by recreating the JWT-compatible test infrastructure that was removed during JWT migration.

**Architecture:** Three-part fix: (1) add `testing/auth.rs` with DB-backed TestUsers (no JWT tokens), (2) re-enable `testing/context.rs` and `testing/mod.rs`, (3) convert `digest_service.rs` cron tests to pure unit tests using sea-orm MockDatabase. The GraphQL integration tests in query.rs and department.rs don't need changing — their imports will resolve once mod.rs is fixed.

**Tech Stack:** Rust, sea-orm 0.12, async-graphql, testcontainers, sea-orm MockDatabase

---

## Background

During the JWT auth migration (`c1f480d65c`), `testing/auth.rs` was deleted and `testing/context.rs` / `testing/mod.rs` were disabled. Three files still import the disabled types:

- `src/services/digest_service.rs` — imports `TestContext` (only needs a DB connection for pure cron tests)
- `src/schema/query.rs` — imports `TestContext` + `TestUserRole`
- `src/schema/mutations/department.rs` — imports `TestContext` + `TestUserRole`

All 44 errors cascade from these 3 import failures.

## Key Insight

`context.rs` is already JWT-correct. Its `execute_query_as` injects `UserContext::new(user.id, roles, permissions)` directly — no JWT parsing needed. The only missing piece is `TestUsers`, which creates real user DB records for tests.

## File Locations

- Rust server root: `graphql-rust-server/`
- Testing module: `graphql-rust-server/src/testing/`
- Run tests from: `graphql-rust-server/` with `cargo test`

## Roles Seeded by Migrations

The seed migration (`migration/m20251017_012_seed.rs`) inserts these roles into `hr_public.roles`:

- `'Employee'` (level 25)
- `'Manager'` (level 50)
- `'HR Manager'` (level 75)
- `'Admin'` (level 100)

`TestUsers::create_all()` will look up role IDs from this table after TestDatabase runs migrations.

---

## Task 1: Add "mock" to sea-orm features

**Files:**

- Modify: `graphql-rust-server/Cargo.toml`

**Step 1: Edit Cargo.toml**

Find the `[dependencies.sea-orm]` block (currently):

```toml
[dependencies.sea-orm]
version = "0.12"
features = [
  "sqlx-postgres",
  "runtime-tokio-rustls",
  "macros",
  "with-uuid",
  "with-chrono",
  "postgres-array",
]
```

Change to:

```toml
[dependencies.sea-orm]
version = "0.12"
features = [
  "sqlx-postgres",
  "runtime-tokio-rustls",
  "macros",
  "with-uuid",
  "with-chrono",
  "postgres-array",
  "mock",
]
```

**Step 2: Verify it compiles**

```bash
cd graphql-rust-server && cargo check
```

Expected: no errors related to sea-orm MockDatabase.

**Step 3: Commit**

```bash
git add graphql-rust-server/Cargo.toml
git commit -m "chore(rust): add sea-orm mock feature for unit tests"
```

---

## Task 2: Fix digest_service.rs — convert 4 tests to pure unit tests

**Files:**

- Modify: `graphql-rust-server/src/services/digest_service.rs`

The 4 failing tests (`test_calculate_next_send_time_daily`, `test_calculate_next_send_time_weekly`, `test_calculate_next_send_time_monthly`, `test_calculate_next_send_time_invalid_cron`) only call `service.calculate_next_send_time(cron, now)` — a pure function with no DB I/O. TestContext was being used solely to get a `DatabaseConnection` for `DigestService::new()`. The mock DB will never be queried.

**Step 1: Update the test module imports**

Find this in `src/services/digest_service.rs` (around line 424):

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use chrono::{TimeZone, Timelike};
    use crate::testing::TestContext;
```

Change to:

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use chrono::{TimeZone, Timelike};
    use sea_orm::{DatabaseBackend, MockDatabase};
```

**Step 2: Replace TestContext in `test_calculate_next_send_time_daily`**

Find (lines 428-431):

```rust
    async fn test_calculate_next_send_time_daily() {
        let ctx = TestContext::new().await.expect("Failed to create test context");
        let service = DigestService::new(Arc::new(ctx.connection().clone()));
```

Replace with:

```rust
    async fn test_calculate_next_send_time_daily() {
        let db = MockDatabase::new(DatabaseBackend::Postgres).into_connection();
        let service = DigestService::new(Arc::new(db));
```

**Step 3: Replace TestContext in `test_calculate_next_send_time_weekly`**

Find (around lines 453-456):

```rust
    async fn test_calculate_next_send_time_weekly() {
        let ctx = TestContext::new().await.expect("Failed to create test context");
        let service = DigestService::new(Arc::new(ctx.connection().clone()));
```

Replace with:

```rust
    async fn test_calculate_next_send_time_weekly() {
        let db = MockDatabase::new(DatabaseBackend::Postgres).into_connection();
        let service = DigestService::new(Arc::new(db));
```

**Step 4: Replace TestContext in `test_calculate_next_send_time_monthly`**

Find (around lines 470-473):

```rust
    async fn test_calculate_next_send_time_monthly() {
        let ctx = TestContext::new().await.expect("Failed to create test context");
        let service = DigestService::new(Arc::new(ctx.connection().clone()));
```

Replace with:

```rust
    async fn test_calculate_next_send_time_monthly() {
        let db = MockDatabase::new(DatabaseBackend::Postgres).into_connection();
        let service = DigestService::new(Arc::new(db));
```

**Step 5: Replace TestContext in `test_calculate_next_send_time_invalid_cron`**

Find (around lines 488-491):

```rust
    async fn test_calculate_next_send_time_invalid_cron() {
        let ctx = TestContext::new().await.expect("Failed to create test context");
        let service = DigestService::new(Arc::new(ctx.connection().clone()));
```

Replace with:

```rust
    async fn test_calculate_next_send_time_invalid_cron() {
        let db = MockDatabase::new(DatabaseBackend::Postgres).into_connection();
        let service = DigestService::new(Arc::new(db));
```

**Step 6: Verify cargo check passes**

```bash
cd graphql-rust-server && cargo check
```

Note: This will still show errors from the other files that import disabled `TestContext`. That's OK — those are addressed in Tasks 3-5. The important thing is that `digest_service.rs` itself no longer has compile errors.

Actually, `cargo check` will still report errors from query.rs and department.rs. Instead, just verify the file looks syntactically correct by eye. Task 5 will be the full `cargo check` verification.

**Step 7: Commit**

```bash
git add graphql-rust-server/src/services/digest_service.rs
git commit -m "fix(rust): convert digest_service cron tests to pure unit tests with MockDatabase"
```

---

## Task 3: Create `src/testing/auth.rs`

**Files:**

- Create: `graphql-rust-server/src/testing/auth.rs`

This file provides `TestUser`, `TestUserRole`, and `TestUsers`. It creates real user DB records (one per role) and assigns roles via `user_role_assignments`. No JWT tokens are used.

**Step 1: Create the file with full content**

Create `graphql-rust-server/src/testing/auth.rs` with:

```rust
//! Test Authentication Helpers
//!
//! Provides JWT-compatible test users for integration tests.
//! Creates real DB records (users + role assignments) without generating
//! JWT tokens — the GraphQL test context injects UserContext directly.

use sea_orm::{ConnectionTrait, DatabaseConnection, Statement};
use sea_orm::DatabaseBackend;
use uuid::Uuid;
use chrono::Utc;

use super::errors::TestContextError;

/// Test user roles matching seeded DB roles
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TestUserRole {
    Employee,
    Manager,
    HrManager,
    Admin,
    SystemAdmin,
}

/// A single test user with DB-backed identity
#[derive(Debug, Clone)]
pub struct TestUser {
    pub id: Uuid,
    pub email: String,
    /// Role name as stored in hr_public.roles (e.g., "Employee", "HR Manager", "Admin")
    pub role: String,
}

/// Pre-created test users for all roles
#[derive(Debug, Clone)]
pub struct TestUsers {
    pub employee: TestUser,
    pub manager: TestUser,
    pub hr_manager: TestUser,
    pub admin: TestUser,
    pub system_admin: TestUser,
}

impl TestUsers {
    /// Creates one user record per role in the test database.
    ///
    /// Uses a dummy bcrypt hash (bcrypt of "test-password").
    /// Assigns roles via user_role_assignments table.
    /// No JWT tokens are generated — UserContext is injected directly in tests.
    pub async fn create_all(db: &DatabaseConnection) -> Result<Self, TestContextError> {
        // Generate unique IDs for each test user
        let employee_id = Uuid::new_v4();
        let manager_id = Uuid::new_v4();
        let hr_manager_id = Uuid::new_v4();
        let admin_id = Uuid::new_v4();
        let system_admin_id = Uuid::new_v4();

        // Dummy bcrypt hash for "test-password" (cost factor 4 for speed)
        let password_hash = "$2b$04$ZaO7JPlU9JIxm2R6gPNuSeI0gEFE2.vb6Rf72qFP.nRyqe4FmUJnC";

        // Insert all 5 test users
        // NOTE: display_name and full_name are GENERATED columns — do NOT include in INSERT
        let now = Utc::now().format("%Y-%m-%d %H:%M:%S%.6f UTC").to_string();
        let insert_users_sql = format!(
            "INSERT INTO hr_public.users \
             (id, email, password_hash, first_name, last_name, \
              social_media_release, is_active, failed_login_attempts, \
              force_password_change, theme_preference, last_modified_at, \
              sync_status, bonus_eligible, created_at, updated_at, tokens_valid_after) \
             VALUES \
             ('{employee_id}', 'test.employee@example.com', '{pw}', 'Test', 'Employee', false, true, 0, false, 'system', NOW(), 'synced', false, NOW(), NOW(), NOW()), \
             ('{manager_id}', 'test.manager@example.com', '{pw}', 'Test', 'Manager', false, true, 0, false, 'system', NOW(), 'synced', false, NOW(), NOW(), NOW()), \
             ('{hr_manager_id}', 'test.hrmanager@example.com', '{pw}', 'Test', 'HrManager', false, true, 0, false, 'system', NOW(), 'synced', false, NOW(), NOW(), NOW()), \
             ('{admin_id}', 'test.admin@example.com', '{pw}', 'Test', 'Admin', false, true, 0, false, 'system', NOW(), 'synced', false, NOW(), NOW(), NOW()), \
             ('{system_admin_id}', 'test.sysadmin@example.com', '{pw}', 'Test', 'SysAdmin', false, true, 0, false, 'system', NOW(), 'synced', false, NOW(), NOW(), NOW()) \
             ON CONFLICT (email) DO NOTHING",
            employee_id = employee_id,
            manager_id = manager_id,
            hr_manager_id = hr_manager_id,
            admin_id = admin_id,
            system_admin_id = system_admin_id,
            pw = password_hash,
        );

        db.execute(Statement::from_string(
            DatabaseBackend::Postgres,
            insert_users_sql,
        ))
        .await
        .map_err(|e| TestContextError::SessionError(format!("Failed to insert test users: {}", e)))?;

        // Assign roles via user_role_assignments (look up role IDs by name from seeded roles)
        // Roles are seeded by migration: Employee(25), Manager(50), HR Manager(75), Admin(100)
        // SystemAdmin also uses the "Admin" role
        let assign_roles_sql = format!(
            "INSERT INTO hr_public.user_role_assignments (id, user_id, role_id, created_at, updated_at) \
             SELECT gen_random_uuid(), u.user_id, r.id, NOW(), NOW() \
             FROM (VALUES \
               ('{employee_id}'::uuid, 'Employee'), \
               ('{manager_id}'::uuid, 'Manager'), \
               ('{hr_manager_id}'::uuid, 'HR Manager'), \
               ('{admin_id}'::uuid, 'Admin'), \
               ('{system_admin_id}'::uuid, 'Admin') \
             ) AS u(user_id, role_name) \
             JOIN hr_public.roles r ON r.name = u.role_name \
             ON CONFLICT DO NOTHING",
            employee_id = employee_id,
            manager_id = manager_id,
            hr_manager_id = hr_manager_id,
            admin_id = admin_id,
            system_admin_id = system_admin_id,
        );

        db.execute(Statement::from_string(
            DatabaseBackend::Postgres,
            assign_roles_sql,
        ))
        .await
        .map_err(|e| TestContextError::SessionError(format!("Failed to assign roles: {}", e)))?;

        Ok(TestUsers {
            employee: TestUser {
                id: employee_id,
                email: "test.employee@example.com".to_string(),
                role: "Employee".to_string(),
            },
            manager: TestUser {
                id: manager_id,
                email: "test.manager@example.com".to_string(),
                role: "Manager".to_string(),
            },
            hr_manager: TestUser {
                id: hr_manager_id,
                email: "test.hrmanager@example.com".to_string(),
                role: "HR Manager".to_string(),
            },
            admin: TestUser {
                id: admin_id,
                email: "test.admin@example.com".to_string(),
                role: "Admin".to_string(),
            },
            system_admin: TestUser {
                id: system_admin_id,
                email: "test.sysadmin@example.com".to_string(),
                role: "Admin".to_string(), // SystemAdmin uses Admin role
            },
        })
    }
}
```

**Step 2: Verify the file compiles in isolation**

```bash
cd graphql-rust-server && cargo check 2>&1 | grep -E "auth\.rs|testing"
```

Expected: errors about auth.rs should be gone; remaining errors still come from mod.rs not yet re-enabled.

**Step 3: Commit**

```bash
git add graphql-rust-server/src/testing/auth.rs
git commit -m "feat(rust): add JWT-compatible TestUsers for test infrastructure"
```

---

## Task 4: Re-enable testing/context.rs

**Files:**

- Modify: `graphql-rust-server/src/testing/context.rs`

**Step 1: Un-comment the auth import (line 11)**

Find:

```rust
// use super::auth::{TestUser, TestUserRole, TestUsers}; // REMOVED: Use JWT tokens for test auth
```

Replace with:

```rust
use super::auth::{TestUser, TestUserRole, TestUsers};
```

**Step 2: Add the missing Manager variant to the `user()` method**

Find the `user()` method (around lines 79-86):

```rust
    pub fn user(&self, role: TestUserRole) -> &TestUser {
        match role {
            TestUserRole::Employee => &self.users.employee,
            TestUserRole::HrManager => &self.users.hr_manager,
            TestUserRole::Admin => &self.users.admin,
            TestUserRole::SystemAdmin => &self.users.system_admin,
        }
    }
```

Replace with:

```rust
    pub fn user(&self, role: TestUserRole) -> &TestUser {
        match role {
            TestUserRole::Employee => &self.users.employee,
            TestUserRole::Manager => &self.users.manager,
            TestUserRole::HrManager => &self.users.hr_manager,
            TestUserRole::Admin => &self.users.admin,
            TestUserRole::SystemAdmin => &self.users.system_admin,
        }
    }
```

**Step 3: Commit (don't verify yet — mod.rs is still disabled)**

```bash
git add graphql-rust-server/src/testing/context.rs
git commit -m "fix(rust): re-enable context.rs with JWT-compatible auth import"
```

---

## Task 5: Re-enable testing/mod.rs and verify compilation

**Files:**

- Modify: `graphql-rust-server/src/testing/mod.rs`

**Step 1: Un-comment the 4 disabled lines**

Find the current content:

```rust
pub mod database;
// pub mod context; // TEMPORARILY DISABLED: Depends on removed session auth (TODO: Update for JWT)
// pub mod auth; // REMOVED: Session-based auth helpers (replaced by JWT)
pub mod errors;
pub mod config;
// pub mod load_testing; // TEMPORARILY DISABLED: Depends on removed session auth (TODO: Update for JWT)

// Re-exports for convenient access
pub use database::TestDatabase;
// pub use context::TestContext; // TEMPORARILY DISABLED: Depends on removed session auth
// pub use auth::{TestUser, TestUserRole, TestUsers}; // REMOVED: Use JWT tokens in tests instead
pub use errors::*;
pub use config::TestConfig;
```

Replace with:

```rust
pub mod database;
pub mod context;
pub mod auth;
pub mod errors;
pub mod config;
// pub mod load_testing; // TEMPORARILY DISABLED: Depends on removed session auth (TODO: Update for JWT)

// Re-exports for convenient access
pub use database::TestDatabase;
pub use context::TestContext;
pub use auth::{TestUser, TestUserRole, TestUsers};
pub use errors::*;
pub use config::TestConfig;
```

NOTE: Leave `load_testing` commented out — it has more dependencies to resolve separately.

**Step 2: Run cargo check and confirm 0 errors**

```bash
cd graphql-rust-server && cargo check 2>&1 | tail -20
```

Expected output: `Finished dev [unoptimized + debuginfo] target(s) in ...`

If there are remaining errors, read them carefully and fix them before committing.

**Step 3: Run cargo test (requires Docker for PostgreSQL)**

```bash
cd graphql-rust-server && cargo test --lib 2>&1 | tail -30
```

Expected: digest_service cron tests run without Docker. Integration tests in query.rs and department.rs need Docker (TestDatabase starts a container). If Docker is available, run all tests. If not, at minimum verify the cron tests pass:

```bash
cd graphql-rust-server && cargo test digest_service 2>&1 | tail -20
```

Expected: 5 tests pass (4 cron + 1 structure test).

**Step 4: Commit**

```bash
git add graphql-rust-server/src/testing/mod.rs
git commit -m "fix(rust): re-enable TestContext and TestUsers in testing module"
```

---

## Success Criteria

1. `cargo check` exits with 0 errors
2. `cargo test digest_service` — 5 tests pass without Docker
3. `cargo test` (with Docker) — all tests pass including GraphQL integration tests
4. The 44 compile errors are gone
