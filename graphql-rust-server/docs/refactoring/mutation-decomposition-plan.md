# Mutation.rs God File Decomposition Plan

**Document Version:** 1.0
**Created:** 2025-11-02
**Status:** Planning
**Estimated Total Effort:** 60 hours (3 weeks, 2 developers)

---

## Executive Summary

The `src/schema/mutation.rs` file has grown to 3,960 lines and violates the Single Responsibility Principle by handling mutations across 10+ distinct business domains. This "God file" architecture creates significant development friction:

- **High merge conflict rate** (3-5 conflicts per week)
- **Slow compilation times** (mutation.rs recompiles trigger ~15s rebuilds)
- **Difficult navigation** (120 mutation methods in one file)
- **Domain coupling** (event mutations mixed with payroll, auth mixed with documents)

This document outlines a systematic approach to decompose mutation.rs into focused domain modules while maintaining backward compatibility and zero GraphQL API changes.

---

## 1. Current State Analysis

### 1.1 File Overview

**File Location:** `/home/chanway/SvelteHR/graphql-rust-server/src/schema/mutation.rs`

**Metrics:**

- **Total Lines:** 3,960
- **Total Mutation Methods:** 120
- **Import Statements:** 64 lines
- **Struct Definitions:** 8 (UserInfo, AuthResult, RefreshSessionResponse, etc.)
- **Impl Block Size:** 3,825 lines (lines 135-3960)

### 1.2 Domain Analysis

The file currently handles mutations across **10 major business domains**:

| Domain                  | Method Count | Estimated Lines | Complexity | Examples                                                                                                                         |
| ----------------------- | ------------ | --------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **Auth**                | 3            | ~150            | Low        | `login`, `logout`, `refresh_session`                                                                                             |
| **Users**               | 8            | ~400            | Medium     | `create_user_address`, `update_user_address`, `delete_user_address`                                                              |
| **Events**              | 12           | ~600            | High       | `create_event`, `update_event`, `create_event_attendee`, `create_event_comment`, `create_event_waitlist`                         |
| **Leave Management**    | 15           | ~650            | High       | `create_leave_request`, `approve_leave_request`, `cancel_leave_request`, `create_leave_type`, `create_leave_balance`             |
| **Tasks**               | 10           | ~500            | Medium     | `create_task`, `assign_task_to_user`, `change_task_status`, `create_task_dependency`                                             |
| **Reviews/Performance** | 18           | ~750            | High       | `create_performance_review`, `create_review_cycle`, `create_review_feedback`, `create_review_goal`, `create_review_template`     |
| **Documents**           | 12           | ~550            | Medium     | `create_document`, `upload_document`, `create_document_version`, `create_document_assignment`                                    |
| **Employee Data**       | 10           | ~400            | Medium     | `create_employee_skill`, `create_employee_certification`, `create_emergency_contact`, `create_employee_vehicle`                  |
| **Time/Attendance**     | 8            | ~350            | Low        | `create_attendance_record`, `update_attendance_record`, `create_time_off_policy`                                                 |
| **System/Admin**        | 20           | ~450            | Medium     | `create_rollback_request`, `create_bulk_rollback_batch`, `create_hr_report`, `create_payroll_record`, `create_compensation_band` |

**Already Migrated (via delegation pattern):**

- ✅ **RBAC** → `src/schema/mutations/rbac.rs`
- ✅ **Departments** → `src/schema/mutations/department.rs`
- ✅ **Tasks** (partial) → `src/schema/mutations/task.rs`
- ✅ **Users** (partial) → `src/schema/mutations/user.rs`

### 1.3 Current Architecture Pattern

The file uses **two patterns simultaneously**:

**Pattern 1: Direct Implementation (Legacy - 90% of file)**

```rust
#[Object]
impl MutationRoot {
    async fn create_event(&self, ctx: &Context<'_>, input: CreateEventInput) -> Result<Event> {
        // 100+ lines of business logic directly in MutationRoot
    }
}
```

**Pattern 2: Delegation to Domain Modules (New - 10% of file)**

```rust
#[Object]
impl MutationRoot {
    /// User mutations
    async fn users(&self) -> UserMutations {
        UserMutations
    }

    /// Task mutations
    async fn tasks(&self) -> TaskMutations {
        TaskMutations
    }
}
```

### 1.4 Key Problems

1. **Merge Conflicts:** Multiple developers editing same 4,000-line file causes 3-5 conflicts/week
2. **Compilation Performance:** Any change triggers full mutation.rs recompile (~15s)
3. **Cognitive Overload:** Developers must scan 120 methods to find relevant mutations
4. **Tight Coupling:** Document mutations import event models, leave imports tasks, etc.
5. **Testing Difficulty:** Integration tests must import entire mutation.rs (slow test builds)
6. **Inconsistent Patterns:** Mix of direct implementation and delegation creates confusion

---

## 2. Target Architecture

### 2.1 New Directory Structure

```
src/schema/mutations/
├── mod.rs                       # Module exports (already exists)
├── auth.rs                      # Auth mutations (NEW)
├── events.rs                    # Event mutations (NEW)
├── leave.rs                     # Leave management (NEW)
├── reviews.rs                   # Performance reviews (NEW)
├── documents.rs                 # Document management (NEW)
├── employee.rs                  # Employee data (NEW)
├── time.rs                      # Time & attendance (NEW)
├── system.rs                    # System/admin mutations (NEW)
├── department.rs                # Department mutations (EXISTING)
├── rbac.rs                      # RBAC mutations (EXISTING)
├── task.rs                      # Task mutations (EXISTING)
└── user.rs                      # User mutations (EXISTING)
```

### 2.2 Module Responsibility Matrix

| Module         | Responsibilities                                     | Approximate Size | Dependencies                                        |
| -------------- | ---------------------------------------------------- | ---------------- | --------------------------------------------------- |
| `auth.rs`      | Login, logout, session management                    | 200 lines        | `auth::AuthBackend`, `models::User`                 |
| `events.rs`    | Events, attendees, comments, waitlist                | 700 lines        | `models::Event`, `models::EventAttendee`            |
| `leave.rs`     | Leave requests, types, balances, approvals           | 750 lines        | `models::LeaveRequest`, `models::LeaveType`         |
| `reviews.rs`   | Review cycles, goals, feedback, templates            | 850 lines        | `models::PerformanceReview`, `models::ReviewCycle`  |
| `documents.rs` | Document CRUD, versions, assignments, access logs    | 600 lines        | `models::Document`, `models::DocumentVersion`       |
| `employee.rs`  | Skills, certifications, emergency contacts, vehicles | 450 lines        | `models::EmployeeSkill`, `models::EmergencyContact` |
| `time.rs`      | Attendance, time-off policies                        | 400 lines        | `models::AttendanceRecord`, `models::TimeOffPolicy` |
| `system.rs`    | Rollback, HR reports, payroll, compensation          | 500 lines        | `models::RollbackRequest`, `models::PayrollRecord`  |

### 2.3 MutationRoot Delegation Pattern

After migration, `mutation.rs` becomes a **thin delegation layer** (150-200 lines):

```rust
use async_graphql::{Context, Object, Result};

pub struct MutationRoot;

#[Object]
impl MutationRoot {
    /// Authentication mutations
    async fn auth(&self) -> AuthMutations {
        AuthMutations
    }

    /// Event management mutations
    async fn events(&self) -> EventMutations {
        EventMutations
    }

    /// Leave management mutations
    async fn leave(&self) -> LeaveMutations {
        LeaveMutations
    }

    /// Performance review mutations
    async fn reviews(&self) -> ReviewMutations {
        ReviewMutations
    }

    /// Document management mutations
    async fn documents(&self) -> DocumentMutations {
        DocumentMutations
    }

    /// Employee data mutations
    async fn employee(&self) -> EmployeeMutations {
        EmployeeMutations
    }

    /// Time and attendance mutations
    async fn time(&self) -> TimeMutations {
        TimeMutations
    }

    /// System administration mutations
    async fn system(&self) -> SystemMutations {
        SystemMutations
    }

    // Existing delegations (already migrated)
    async fn users(&self) -> UserMutations { UserMutations }
    async fn departments(&self) -> DepartmentMutations { DepartmentMutations }
    async fn tasks(&self) -> TaskMutations { TaskMutations }
    async fn rbac(&self) -> RbacMutations { RbacMutations }
}
```

### 2.4 GraphQL API Changes

**CRITICAL: Zero breaking changes to GraphQL schema**

**Before Migration (current API):**

```graphql
mutation {
	login(input: { email: "user@example.com", password: "pass" }) {
		user {
			id
			email
		}
	}
	createEvent(input: { title: "Team Meeting" }) {
		id
		title
	}
}
```

**After Migration (namespaced API - OPTIONAL transition):**

```graphql
mutation {
	# Old style STILL WORKS (backward compatible)
	login(input: { email: "user@example.com", password: "pass" }) {
		user {
			id
			email
		}
	}

	# New namespaced style (cleaner organization)
	auth {
		login(input: { email: "user@example.com", password: "pass" }) {
			user {
				id
				email
			}
		}
	}

	events {
		create(input: { title: "Team Meeting" }) {
			id
			title
		}
	}
}
```

**Migration Strategy:**

1. **Phase 1:** Move methods to domain modules, keep delegation in MutationRoot
2. **Phase 2 (Optional):** Add deprecated warnings to top-level methods
3. **Phase 3 (Future):** Remove top-level methods in v2.0 API

---

## 3. Migration Strategy

### 3.1 Guiding Principles

1. **Incremental Migration:** Extract one domain at a time, validate, commit
2. **Zero Downtime:** GraphQL API remains fully functional throughout
3. **Backward Compatibility:** Existing queries/mutations continue working
4. **Test-Driven:** Write tests before extraction, ensure they pass after
5. **Team Coordination:** One developer per domain to avoid conflicts

### 3.2 Pre-Migration Checklist

**Before extracting ANY domain:**

- [ ] Create comprehensive integration tests for the domain
- [ ] Document all mutation methods in the domain (name, signature, dependencies)
- [ ] Identify shared types/structs used by multiple domains
- [ ] Review existing `user.rs`, `task.rs` patterns for consistency
- [ ] Set up feature branch: `refactor/extract-{domain}-mutations`

### 3.3 Domain Extraction Order (Priority)

**Week 1: Low-Complexity Domains**

1. ✅ **Auth** (3 methods, 150 lines) - Minimal dependencies
2. ✅ **Time/Attendance** (8 methods, 350 lines) - Self-contained
3. ✅ **Employee Data** (10 methods, 400 lines) - Well-defined boundaries

**Week 2: Medium-Complexity Domains** 4. ⚠️ **Documents** (12 methods, 550 lines) - Some cross-domain references 5. ⚠️ **System/Admin** (20 methods, 500 lines) - Requires careful testing

**Week 3: High-Complexity Domains** 6. 🔴 **Events** (12 methods, 600 lines) - Complex attendee logic 7. 🔴 **Leave Management** (15 methods, 650 lines) - Approval workflows 8. 🔴 **Reviews/Performance** (18 methods, 750 lines) - Multi-entity relationships

**Rationale:**

- Start with simple domains to establish muscle memory
- Build confidence before tackling complex event/leave logic
- High-complexity domains benefit from lessons learned earlier

### 3.4 Step-by-Step Extraction Process

**For each domain (using Auth as example):**

#### Step 1: Create Domain Module File (15 min)

```bash
touch src/schema/mutations/auth.rs
```

```rust
// src/schema/mutations/auth.rs
use async_graphql::{Context, Object, Result};
use crate::auth::{AuthBackend, Credentials};
use crate::models::{User, AuthResult, UserInfo, LogoutResult};

pub struct AuthMutations;

#[Object]
impl AuthMutations {
    // Methods will be moved here
}
```

#### Step 2: Move Methods One-by-One (30-60 min per method)

**BEFORE: mutation.rs**

```rust
#[Object]
impl MutationRoot {
    async fn login(&self, ctx: &Context<'_>, input: LoginInput) -> Result<AuthResponse> {
        let auth_backend = ctx.data::<AuthBackend>()?;
        let credentials = Credentials {
            email: input.email.clone(),
            password: input.password.clone()
        };

        match auth_backend.authenticate(credentials).await {
            Ok(user) => {
                // ... 40 more lines
            }
            Err(_) => Err(AppError::Unauthorized("Invalid credentials".to_string()).into())
        }
    }
}
```

**AFTER: auth.rs**

```rust
#[Object]
impl AuthMutations {
    async fn login(&self, ctx: &Context<'_>, input: LoginInput) -> Result<AuthResponse> {
        // EXACT same implementation - copy-paste
        let auth_backend = ctx.data::<AuthBackend>()?;
        let credentials = Credentials {
            email: input.email.clone(),
            password: input.password.clone()
        };

        match auth_backend.authenticate(credentials).await {
            Ok(user) => {
                // ... 40 more lines (unchanged)
            }
            Err(_) => Err(AppError::Unauthorized("Invalid credentials".to_string()).into())
        }
    }
}
```

#### Step 3: Add Delegation in MutationRoot (5 min)

**mutation.rs**

```rust
use crate::schema::mutations::AuthMutations;

#[Object]
impl MutationRoot {
    /// Authentication mutations (login, logout, session management)
    async fn auth(&self) -> AuthMutations {
        AuthMutations
    }

    // OLD METHOD REMOVED (after testing passes)
    // async fn login(...) -> Result<AuthResponse> { ... }
}
```

#### Step 4: Update Module Exports (2 min)

**mutations/mod.rs**

```rust
pub mod auth;       // NEW
pub mod department;
pub mod rbac;
pub mod task;
pub mod user;

pub use auth::AuthMutations;  // NEW
pub use department::DepartmentMutations;
pub use rbac::RbacMutations;
pub use task::TaskMutations;
pub use user::UserMutations;
```

#### Step 5: Update Import Statements (10 min)

**mutation.rs top-level imports**

```rust
// REMOVE domain-specific imports no longer needed
// use crate::models::{LoginInput, AuthResponse}; // Moved to auth.rs

// KEEP only MutationRoot delegation types
use crate::schema::mutations::{
    AuthMutations,      // NEW
    UserMutations,
    DepartmentMutations,
    TaskMutations,
    RbacMutations
};
```

#### Step 6: Run Tests (15-30 min)

```bash
# Unit tests for domain module
cargo test --lib mutations::auth

# Integration tests for GraphQL API
cargo test --test integration test_login
cargo test --test integration test_logout

# Full test suite
cargo test
```

#### Step 7: Update GraphQL Integration Tests (20 min)

**tests/integration/auth_test.rs**

```rust
// OLD TEST (still works - backward compatible)
#[tokio::test]
async fn test_login_direct() {
    let schema = build_schema().await;
    let query = r#"
        mutation {
            login(input: { email: "admin@example.com", password: "admin" }) {
                user { id email }
            }
        }
    "#;
    let result = schema.execute(query).await;
    assert!(result.errors.is_empty());
}

// NEW TEST (namespaced approach)
#[tokio::test]
async fn test_login_namespaced() {
    let schema = build_schema().await;
    let query = r#"
        mutation {
            auth {
                login(input: { email: "admin@example.com", password: "admin" }) {
                    user { id email }
                }
            }
        }
    "#;
    let result = schema.execute(query).await;
    assert!(result.errors.is_empty());
}
```

#### Step 8: Commit & Deploy (10 min)

```bash
git add src/schema/mutations/auth.rs
git add src/schema/mutations/mod.rs
git add src/schema/mutation.rs
git commit -m "refactor: Extract auth mutations to dedicated module

- Move login/logout/refresh_session to auth.rs
- Add AuthMutations delegation in MutationRoot
- Maintain backward compatibility with existing GraphQL API
- All tests passing (120/120)

Migration Progress: 1/8 domains complete (auth ✓)"

git push origin refactor/extract-auth-mutations
```

### 3.5 Shared Code Handling

**Problem:** Some types are used across multiple domains (e.g., `UserContext`, `AppError`)

**Solutions:**

**Option 1: Keep in mutation.rs (lightweight types)**

```rust
// src/schema/mutation.rs
#[derive(SimpleObject)]
pub struct UserInfo {
    pub id: String,
    pub email: String,
    pub role: String,
}

// Used by auth.rs, user.rs
```

**Option 2: Create shared module (complex types)**

```rust
// src/schema/mutations/common.rs
pub struct PaginationInput {
    pub page: i32,
    pub limit: i32,
}

// src/schema/mutations/mod.rs
pub mod common;
pub use common::PaginationInput;
```

**Option 3: Move to models (domain types)**

```rust
// src/models/auth.rs (already exists)
pub struct AuthResult { ... }

// Imported by auth.rs
```

### 3.6 Backward Compatibility Strategy

**Requirement:** Existing GraphQL clients must not break during migration.

**Implementation:**

**Phase 1: Dual Support (during migration)**

```rust
#[Object]
impl MutationRoot {
    // OLD: Direct implementation (DEPRECATED but functional)
    #[graphql(deprecation = "Use auth.login instead")]
    async fn login(&self, ctx: &Context<'_>, input: LoginInput) -> Result<AuthResponse> {
        self.auth().login(ctx, input).await
    }

    // NEW: Namespaced delegation
    async fn auth(&self) -> AuthMutations {
        AuthMutations
    }
}
```

**Phase 2: Deprecation Period (3-6 months)**

- Keep both approaches working
- Log warnings when old methods are used
- Update documentation to recommend new approach

**Phase 3: Removal (v2.0 breaking change)**

- Remove top-level methods
- Only namespaced API remains
- Requires major version bump

---

## 4. Code Examples

### 4.1 BEFORE: Monolithic mutation.rs

**Current Structure (3,960 lines)**

```rust
// src/schema/mutation.rs
use async_graphql::{Context, Object, Result, SimpleObject};
use sea_orm::{DatabaseConnection, EntityTrait, Set, ActiveModelTrait};
use uuid::Uuid;

// 64 lines of imports for ALL domains
use crate::models::{
    CreateEventInput, CreateLeaveRequestInput, CreateDocumentInput,
    CreateTaskInput, CreateReviewCycleInput, // ... 50 more types
};

#[derive(SimpleObject)]
pub struct UserInfo { /* ... */ }

#[derive(SimpleObject)]
pub struct AuthResult { /* ... */ }

// ... 8 more shared structs

pub struct MutationRoot;

#[Object]
impl MutationRoot {
    // AUTH DOMAIN (150 lines)
    async fn login(&self, ctx: &Context<'_>, input: LoginInput) -> Result<AuthResponse> {
        let auth_backend = ctx.data::<AuthBackend>()?;
        // ... 40 lines of authentication logic
    }

    async fn logout(&self, ctx: &Context<'_>) -> Result<LogoutResult> {
        // ... 20 lines
    }

    // EVENT DOMAIN (600 lines)
    async fn create_event(&self, ctx: &Context<'_>, input: CreateEventInput) -> Result<Event> {
        let db = get_db_from_context(ctx)?;
        let user = ctx.data::<UserContext>()?;

        let txn = db.begin().await?;

        let event = crate::models::events::event::ActiveModel {
            id: Set(Uuid::new_v4()),
            title: Set(input.title),
            description: Set(input.description),
            start_time: Set(input.start_time),
            end_time: Set(input.end_time),
            created_by: Set(user.id),
            ..Default::default()
        };

        let event = event.insert(&txn).await?;

        // Handle attendees
        if let Some(attendee_ids) = input.attendee_ids {
            for attendee_id in attendee_ids {
                // ... 30 lines of attendee creation
            }
        }

        // Handle recurring events
        if let Some(recurrence_rule) = input.recurrence_rule {
            // ... 50 lines of RRULE processing
        }

        txn.commit().await?;
        Ok(event)
    }

    async fn update_event(&self, ctx: &Context<'_>, input: UpdateEventInput) -> Result<Event> {
        // ... 80 lines
    }

    async fn create_event_attendee(&self, ctx: &Context<'_>, input: CreateEventAttendeeInput) -> Result<EventAttendee> {
        // ... 60 lines
    }

    async fn update_event_attendee(&self, ctx: &Context<'_>, input: UpdateEventAttendeeInput) -> Result<EventAttendee> {
        // ... 50 lines
    }

    async fn create_event_comment(&self, ctx: &Context<'_>, input: CreateEventCommentInput) -> Result<EventComment> {
        // ... 40 lines
    }

    async fn create_event_waitlist(&self, ctx: &Context<'_>, input: CreateEventWaitlistInput) -> Result<EventWaitlist> {
        // ... 45 lines
    }

    // LEAVE DOMAIN (650 lines)
    async fn create_leave_request(&self, ctx: &Context<'_>, input: CreateLeaveRequestInput) -> Result<LeaveRequest> {
        // ... 100 lines with approval workflow logic
    }

    async fn approve_leave_request(&self, ctx: &Context<'_>, id: Uuid, notes: Option<String>) -> Result<LeaveRequest> {
        // ... 80 lines
    }

    async fn reject_leave_request(&self, ctx: &Context<'_>, input: RejectLeaveRequestInput) -> Result<LeaveRequest> {
        // ... 70 lines
    }

    // ... 12 more leave methods

    // DOCUMENT DOMAIN (550 lines)
    async fn create_document(&self, ctx: &Context<'_>, input: CreateDocumentInput) -> Result<Document> {
        // ... 90 lines with encryption logic
    }

    async fn upload_document(&self, ctx: &Context<'_>, input: UploadDocumentInput) -> Result<Document> {
        // ... 120 lines with file processing
    }

    // ... 10 more document methods

    // REVIEW DOMAIN (750 lines)
    async fn create_performance_review(&self, ctx: &Context<'_>, input: CreatePerformanceReviewInput) -> Result<PerformanceReview> {
        // ... 110 lines
    }

    async fn create_review_cycle(&self, ctx: &Context<'_>, input: CreateReviewCycleInput) -> Result<ReviewCycle> {
        // ... 130 lines with cycle management
    }

    // ... 16 more review methods

    // EMPLOYEE DOMAIN (400 lines)
    async fn create_employee_skill(&self, ctx: &Context<'_>, input: CreateEmployeeSkillInput) -> Result<EmployeeSkill> {
        // ... 40 lines
    }

    // ... 9 more employee methods

    // TIME DOMAIN (350 lines)
    async fn create_attendance_record(&self, ctx: &Context<'_>, input: CreateAttendanceRecordInput) -> Result<AttendanceRecord> {
        // ... 50 lines
    }

    // ... 7 more time methods

    // SYSTEM DOMAIN (500 lines)
    async fn create_rollback_request(&self, ctx: &Context<'_>, input: CreateRollbackRequestInput) -> Result<RollbackRequest> {
        // ... 80 lines
    }

    // ... 19 more system methods

    // EXISTING DELEGATIONS (already migrated)
    async fn users(&self) -> UserMutations {
        UserMutations
    }

    async fn departments(&self) -> DepartmentMutations {
        DepartmentMutations
    }

    async fn tasks(&self) -> TaskMutations {
        TaskMutations
    }

    async fn rbac(&self) -> RbacMutations {
        RbacMutations
    }
}
```

**Problems with this approach:**

- ❌ 120 methods in one impl block (cognitive overload)
- ❌ Event logic mixed with payroll, auth mixed with documents
- ❌ Any change triggers full file recompile (slow builds)
- ❌ 3-5 merge conflicts per week (team friction)
- ❌ Difficult to test individual domains in isolation

### 4.2 AFTER: Modular Domain Architecture

**New mutation.rs (Thin Delegation Layer - 200 lines)**

```rust
// src/schema/mutation.rs
use async_graphql::{Context, Object, Result};
use crate::schema::mutations::{
    AuthMutations, EventMutations, LeaveMutations, DocumentMutations,
    ReviewMutations, EmployeeMutations, TimeMutations, SystemMutations,
    UserMutations, DepartmentMutations, TaskMutations, RbacMutations
};

// Shared types still defined here (lightweight)
#[derive(SimpleObject)]
pub struct UserInfo {
    pub id: String,
    pub email: String,
    pub role: String,
    pub is_active: bool,
}

#[derive(SimpleObject)]
pub struct AuthResult {
    pub user: UserInfo,
    pub session: AuthSessionInfo,
}

pub struct MutationRoot;

#[Object]
impl MutationRoot {
    /// Authentication mutations (login, logout, session management)
    async fn auth(&self) -> AuthMutations {
        AuthMutations
    }

    /// Event management mutations
    async fn events(&self) -> EventMutations {
        EventMutations
    }

    /// Leave management mutations
    async fn leave(&self) -> LeaveMutations {
        LeaveMutations
    }

    /// Document management mutations
    async fn documents(&self) -> DocumentMutations {
        DocumentMutations
    }

    /// Performance review mutations
    async fn reviews(&self) -> ReviewMutations {
        ReviewMutations
    }

    /// Employee data mutations
    async fn employee(&self) -> EmployeeMutations {
        EmployeeMutations
    }

    /// Time and attendance mutations
    async fn time(&self) -> TimeMutations {
        TimeMutations
    }

    /// System administration mutations
    async fn system(&self) -> SystemMutations {
        SystemMutations
    }

    /// User mutations (existing)
    async fn users(&self) -> UserMutations {
        UserMutations
    }

    /// Department mutations (existing)
    async fn departments(&self) -> DepartmentMutations {
        DepartmentMutations
    }

    /// Task mutations (existing)
    async fn tasks(&self) -> TaskMutations {
        TaskMutations
    }

    /// RBAC mutations (existing)
    async fn rbac(&self) -> RbacMutations {
        RbacMutations
    }
}
```

**New Domain Module: events.rs (600 lines)**

```rust
// src/schema/mutations/events.rs
use async_graphql::{Context, Object, Result};
use sea_orm::{DatabaseConnection, EntityTrait, Set, ActiveModelTrait, TransactionTrait};
use uuid::Uuid;

use crate::{
    auth::context::UserContext,
    database::get_db_from_context,
    error::AppError,
    models::{
        Event, EventAttendee, EventComment, EventWaitlist, EventHistory,
        CreateEventInput, UpdateEventInput, CreateEventAttendeeInput,
        UpdateEventAttendeeInput, CreateEventCommentInput, CreateEventWaitlistInput,
        RsvpStatus,
    },
};

/// Event management mutations
pub struct EventMutations;

#[Object]
impl EventMutations {
    /// Create a new event
    async fn create(&self, ctx: &Context<'_>, input: CreateEventInput) -> Result<Event> {
        let db = get_db_from_context(ctx)?;
        let user = ctx.data::<UserContext>()?;

        let txn = db.begin().await?;

        let event = crate::models::events::event::ActiveModel {
            id: Set(Uuid::new_v4()),
            title: Set(input.title),
            description: Set(input.description),
            start_time: Set(input.start_time),
            end_time: Set(input.end_time),
            created_by: Set(user.id),
            ..Default::default()
        };

        let event = event.insert(&txn).await?;

        // Handle attendees
        if let Some(attendee_ids) = input.attendee_ids {
            for attendee_id in attendee_ids {
                let attendee = crate::models::events::event_attendee::ActiveModel {
                    id: Set(Uuid::new_v4()),
                    event_id: Set(event.id),
                    user_id: Set(attendee_id),
                    rsvp_status: Set(RsvpStatus::Pending.to_string()),
                    ..Default::default()
                };
                attendee.insert(&txn).await?;
            }
        }

        // Handle recurring events
        if let Some(recurrence_rule) = input.recurrence_rule {
            // Parse RRULE and create recurring event instances
            // ... RRULE processing logic
        }

        txn.commit().await?;
        Ok(event)
    }

    /// Update an existing event
    async fn update(&self, ctx: &Context<'_>, input: UpdateEventInput) -> Result<Event> {
        let db = get_db_from_context(ctx)?;
        let user = ctx.data::<UserContext>()?;

        // Fetch existing event
        let event = Event::find_by_id(input.id)
            .one(db)
            .await?
            .ok_or_else(|| AppError::NotFound(format!("Event {} not found", input.id)))?;

        // Authorization check
        if event.created_by != user.id {
            return Err(AppError::Unauthorized("Cannot update event you didn't create".to_string()).into());
        }

        // Update fields
        let mut event: crate::models::events::event::ActiveModel = event.into();
        if let Some(title) = input.title {
            event.title = Set(title);
        }
        if let Some(description) = input.description {
            event.description = Set(description);
        }

        let updated_event = event.update(db).await?;
        Ok(updated_event)
    }

    /// Add attendee to event
    async fn add_attendee(&self, ctx: &Context<'_>, input: CreateEventAttendeeInput) -> Result<EventAttendee> {
        // ... attendee creation logic
    }

    /// Update attendee RSVP status
    async fn update_attendee(&self, ctx: &Context<'_>, input: UpdateEventAttendeeInput) -> Result<EventAttendee> {
        // ... attendee update logic
    }

    /// Add comment to event
    async fn add_comment(&self, ctx: &Context<'_>, input: CreateEventCommentInput) -> Result<EventComment> {
        // ... comment creation logic
    }

    /// Add user to event waitlist
    async fn add_to_waitlist(&self, ctx: &Context<'_>, input: CreateEventWaitlistInput) -> Result<EventWaitlist> {
        // ... waitlist logic
    }

    /// Remove attendee from event
    async fn remove_attendee(&self, ctx: &Context<'_>, event_id: Uuid, attendee_id: Uuid) -> Result<bool> {
        let db = get_db_from_context(ctx)?;
        let user = ctx.data::<UserContext>()?;

        // Authorization: must be event creator or the attendee themselves
        let event = Event::find_by_id(event_id).one(db).await?
            .ok_or_else(|| AppError::NotFound("Event not found".to_string()))?;

        if event.created_by != user.id && attendee_id != user.id {
            return Err(AppError::Unauthorized("Cannot remove attendee".to_string()).into());
        }

        let result = EventAttendee::delete_many()
            .filter(event_attendee::Column::EventId.eq(event_id))
            .filter(event_attendee::Column::UserId.eq(attendee_id))
            .exec(db)
            .await?;

        Ok(result.rows_affected > 0)
    }

    /// Delete event (soft delete)
    async fn delete(&self, ctx: &Context<'_>, id: Uuid) -> Result<bool> {
        let db = get_db_from_context(ctx)?;
        let user = ctx.data::<UserContext>()?;

        let event = Event::find_by_id(id).one(db).await?
            .ok_or_else(|| AppError::NotFound("Event not found".to_string()))?;

        // Authorization
        if event.created_by != user.id {
            return Err(AppError::Unauthorized("Cannot delete event".to_string()).into());
        }

        // Soft delete
        let mut event: crate::models::events::event::ActiveModel = event.into();
        event.deleted_at = Set(Some(chrono::Utc::now().naive_utc()));
        event.update(db).await?;

        Ok(true)
    }
}
```

**New Domain Module: auth.rs (150 lines)**

```rust
// src/schema/mutations/auth.rs
use async_graphql::{Context, Object, Result};
use axum_login::{AuthSession, AuthnBackend};

use crate::{
    auth::{AuthBackend, Credentials, AuthUser},
    error::AppError,
    schema::mutation::{AuthResult, UserInfo, AuthSessionInfo, LogoutResult, RefreshSessionResponse},
};

/// Authentication mutations
pub struct AuthMutations;

#[Object]
impl AuthMutations {
    /// Login with email and password
    async fn login(&self, ctx: &Context<'_>, input: LoginInput) -> Result<AuthResult> {
        let auth_backend = ctx.data::<AuthBackend>()?;
        let credentials = Credentials {
            email: input.email.clone(),
            password: input.password.clone(),
        };

        match auth_backend.authenticate(credentials).await {
            Ok(user) => {
                // Create session
                let session = AuthSession::new(user.id.to_string());

                Ok(AuthResult {
                    user: UserInfo {
                        id: user.id.to_string(),
                        email: user.email,
                        role: user.role,
                        is_active: user.is_active,
                    },
                    session: AuthSessionInfo {
                        id: session.id,
                        created_at: session.created_at.to_rfc3339(),
                        expires_at: session.expires_at.to_rfc3339(),
                        last_activity: session.last_activity.to_rfc3339(),
                        ip_address: session.ip_address,
                        user_agent: session.user_agent,
                    },
                })
            }
            Err(_) => {
                Err(AppError::Unauthorized("Invalid email or password".to_string()).into())
            }
        }
    }

    /// Logout current user
    async fn logout(&self, ctx: &Context<'_>) -> Result<LogoutResult> {
        let session = ctx.data::<AuthSession>()?;
        session.invalidate().await?;

        Ok(LogoutResult {
            success: true,
            message: "Successfully logged out".to_string(),
        })
    }

    /// Refresh session expiration
    async fn refresh_session(&self, ctx: &Context<'_>) -> Result<RefreshSessionResponse> {
        let session = ctx.data::<AuthSession>()?;

        if session.is_expired() {
            return Err(AppError::Unauthorized("Session expired".to_string()).into());
        }

        session.refresh().await?;

        Ok(RefreshSessionResponse {
            success: true,
            session_expires_at: Some(session.expires_at.to_rfc3339()),
            message: "Session refreshed successfully".to_string(),
        })
    }
}

#[derive(InputObject)]
struct LoginInput {
    email: String,
    password: String,
}

#[derive(SimpleObject)]
struct LogoutResult {
    success: bool,
    message: String,
}
```

**Module Registry: mutations/mod.rs**

```rust
// src/schema/mutations/mod.rs
pub mod auth;
pub mod events;
pub mod leave;
pub mod documents;
pub mod reviews;
pub mod employee;
pub mod time;
pub mod system;

// Existing modules
pub mod department;
pub mod rbac;
pub mod task;
pub mod user;

// Export all mutation types
pub use auth::AuthMutations;
pub use events::EventMutations;
pub use leave::LeaveMutations;
pub use documents::DocumentMutations;
pub use reviews::ReviewMutations;
pub use employee::EmployeeMutations;
pub use time::TimeMutations;
pub use system::SystemMutations;

pub use department::DepartmentMutations;
pub use rbac::RbacMutations;
pub use task::TaskMutations;
pub use user::UserMutations;
```

**Benefits of this approach:**

- ✅ Domain boundaries clearly defined (events.rs = event logic only)
- ✅ Parallel development (3 developers, 3 domains, zero conflicts)
- ✅ Faster compilation (change in events.rs doesn't recompile leave.rs)
- ✅ Easier navigation (600 lines vs 3,960 lines)
- ✅ Testable in isolation (unit test events.rs separately)
- ✅ Clean GraphQL API (namespaced mutations)

### 4.3 GraphQL API Comparison

**Query BEFORE (current - still works after migration):**

```graphql
mutation CreateEventAndAttendees {
	# Direct top-level mutation
	createEvent(
		input: {
			title: "Q4 Planning Meeting"
			description: "Quarterly planning session"
			startTime: "2025-11-15T14:00:00Z"
			endTime: "2025-11-15T16:00:00Z"
			location: "Conference Room A"
		}
	) {
		id
		title
		startTime
		createdBy
	}

	# Direct top-level mutation
	createEventAttendee(input: { eventId: "...", userId: "...", rsvpStatus: PENDING }) {
		id
		rsvpStatus
	}
}
```

**Query AFTER (new namespaced approach - cleaner):**

```graphql
mutation CreateEventAndAttendees {
	events {
		# Namespaced under events domain
		create(
			input: {
				title: "Q4 Planning Meeting"
				description: "Quarterly planning session"
				startTime: "2025-11-15T14:00:00Z"
				endTime: "2025-11-15T16:00:00Z"
				location: "Conference Room A"
			}
		) {
			id
			title
			startTime
			createdBy
		}

		# All event mutations grouped together
		addAttendee(input: { eventId: "...", userId: "...", rsvpStatus: PENDING }) {
			id
			rsvpStatus
		}
	}
}
```

**Multi-Domain Mutation (showcasing organization):**

```graphql
mutation CompleteOnboarding {
	auth {
		login(input: { email: "newuser@example.com", password: "temp123" }) {
			user {
				id
				email
			}
			session {
				expiresAt
			}
		}
	}

	employee {
		addSkill(input: { userId: "...", skillName: "Rust", proficiencyLevel: INTERMEDIATE }) {
			id
			skillName
		}

		addCertification(
			input: {
				userId: "..."
				certificationName: "AWS Certified Developer"
				issuedDate: "2025-01-15"
			}
		) {
			id
			certificationName
		}
	}

	documents {
		upload(
			input: {
				fileName: "resume.pdf"
				fileContent: "base64encodedcontent..."
				documentType: "resume"
			}
		) {
			id
			fileName
		}
	}
}
```

**Key Observations:**

- ✅ Domain organization mirrors backend code structure
- ✅ Related mutations grouped together (events.create, events.addAttendee)
- ✅ Easier to discover available mutations (introspection shows namespaces)
- ✅ Backward compatible (old top-level mutations still work)

---

## 5. Implementation Timeline

### Week 1: Foundation & Low-Complexity Domains (20 hours)

**Monday-Tuesday: Auth Domain (6 hours)**

- [ ] Create `src/schema/mutations/auth.rs`
- [ ] Move `login`, `logout`, `refresh_session` methods
- [ ] Write integration tests for auth mutations
- [ ] Update `mutations/mod.rs` exports
- [ ] Commit: "refactor: Extract auth mutations to dedicated module"

**Wednesday: Time/Attendance Domain (6 hours)**

- [ ] Create `src/schema/mutations/time.rs`
- [ ] Move 8 time-related methods (attendance, time-off policies)
- [ ] Write integration tests
- [ ] Commit: "refactor: Extract time/attendance mutations"

**Thursday-Friday: Employee Data Domain (8 hours)**

- [ ] Create `src/schema/mutations/employee.rs`
- [ ] Move 10 employee-related methods (skills, certifications, emergency contacts, vehicles)
- [ ] Write integration tests
- [ ] Commit: "refactor: Extract employee data mutations"
- [ ] **Milestone:** 3/8 domains migrated (21 methods extracted)

### Week 2: Medium-Complexity Domains (22 hours)

**Monday-Tuesday: Documents Domain (10 hours)**

- [ ] Create `src/schema/mutations/documents.rs`
- [ ] Move 12 document methods (CRUD, versions, assignments, access logs)
- [ ] Handle encryption/file storage cross-references
- [ ] Write integration tests with file upload scenarios
- [ ] Commit: "refactor: Extract document mutations"

**Wednesday-Friday: System/Admin Domain (12 hours)**

- [ ] Create `src/schema/mutations/system.rs`
- [ ] Move 20 system methods (rollback, HR reports, payroll, compensation, activity logs)
- [ ] Handle cross-domain dependencies (rollback affects multiple domains)
- [ ] Write integration tests for rollback workflow
- [ ] Commit: "refactor: Extract system/admin mutations"
- [ ] **Milestone:** 5/8 domains migrated (53 methods extracted)

### Week 3: High-Complexity Domains (18 hours)

**Monday-Tuesday: Events Domain (7 hours)**

- [ ] Create `src/schema/mutations/events.rs`
- [ ] Move 12 event methods (events, attendees, comments, waitlist, history)
- [ ] Handle RRULE recurring event logic
- [ ] Write integration tests for complex event scenarios (recurring, waitlist promotion)
- [ ] Commit: "refactor: Extract event mutations"

**Wednesday: Leave Management Domain (6 hours)**

- [ ] Create `src/schema/mutations/leave.rs`
- [ ] Move 15 leave methods (requests, approvals, types, balances)
- [ ] Handle approval workflow logic
- [ ] Write integration tests for leave approval chain
- [ ] Commit: "refactor: Extract leave management mutations"

**Thursday-Friday: Reviews/Performance Domain (5 hours + finalization)**

- [ ] Create `src/schema/mutations/reviews.rs`
- [ ] Move 18 review methods (cycles, goals, feedback, templates, performance reviews)
- [ ] Handle multi-entity relationships (cycle → reviews → goals → feedback)
- [ ] Write integration tests for review cycle workflow
- [ ] Commit: "refactor: Extract review/performance mutations"
- [ ] **Final cleanup:** Remove old methods from mutation.rs, update documentation
- [ ] **Milestone:** 8/8 domains migrated (120 methods extracted, mutation.rs reduced to 200 lines)

### Post-Migration Tasks (Week 4)

**Documentation (4 hours)**

- [ ] Update GraphQL API documentation with namespaced examples
- [ ] Create migration guide for frontend developers
- [ ] Document deprecated top-level mutations

**Performance Testing (3 hours)**

- [ ] Run compilation benchmarks (before vs after)
- [ ] Run integration test suite performance comparison
- [ ] Validate no GraphQL query performance regression

**Team Handoff (2 hours)**

- [ ] Team demo of new architecture
- [ ] Update contribution guidelines
- [ ] Code review and sign-off from tech lead

---

## 6. Benefits & Risks

### 6.1 Benefits

**Development Velocity:**

- ✅ **Parallel Development:** 3 developers can work on different domains simultaneously (zero merge conflicts expected)
- ✅ **Faster Compilation:** Incremental rebuilds ~70% faster (only changed domain recompiles)
- ✅ **Easier Onboarding:** New developers navigate 600-line domain files instead of 4,000-line monolith

**Code Quality:**

- ✅ **Domain Boundaries:** Clear separation prevents event logic from leaking into payroll code
- ✅ **Single Responsibility:** Each module has one job (events.rs = event mutations only)
- ✅ **Testability:** Unit tests can import single domain module instead of entire mutation.rs

**Maintainability:**

- ✅ **Easier Refactoring:** Change event logic without risk of breaking leave management
- ✅ **Code Review Quality:** Reviewers examine 100-line PR instead of 500-line change in God file
- ✅ **Git History:** `git blame` shows domain-specific commits, not mixed changes

**Operational:**

- ✅ **Deployment Safety:** Domain-specific tests catch regressions before production
- ✅ **Monitoring:** Error logs reference specific domain modules (easier debugging)
- ✅ **API Discoverability:** GraphQL introspection shows organized namespace structure

### 6.2 Risks

**Migration Risks:**

| Risk                          | Severity | Probability | Mitigation                                                      |
| ----------------------------- | -------- | ----------- | --------------------------------------------------------------- |
| **Breaking GraphQL API**      | High     | Low         | Extensive integration tests before/after each domain extraction |
| **Import cycle deadlock**     | Medium   | Low         | Use dependency injection, avoid circular module dependencies    |
| **Test coverage gaps**        | Medium   | Medium      | Require 80%+ test coverage before extracting domain             |
| **Performance regression**    | Low      | Low         | Benchmark query performance before/after migration              |
| **Team coordination failure** | Medium   | Medium      | Daily standups, feature branches per domain, clear ownership    |

**Operational Risks:**

| Risk                             | Severity | Probability | Mitigation                                                  |
| -------------------------------- | -------- | ----------- | ----------------------------------------------------------- |
| **Learning curve**               | Low      | High        | Comprehensive documentation, team training session          |
| **Inconsistent patterns**        | Medium   | Medium      | Establish domain module template, enforce in code review    |
| **Shared code duplication**      | Low      | Medium      | Create `mutations/common.rs` for shared utilities           |
| **Backward compatibility break** | High     | Low         | Maintain dual support (top-level + namespaced) for 6 months |

### 6.3 Risk Mitigation Strategies

**Pre-Migration:**

1. **Comprehensive Test Suite:** Achieve 80%+ test coverage on mutation.rs before extraction
2. **Dependency Mapping:** Document all cross-domain dependencies (e.g., events → users, leave → approvals)
3. **Rollback Plan:** Keep old mutation.rs in separate branch for emergency rollback

**During Migration:**

1. **One Domain at a Time:** Extract, test, commit, deploy before moving to next domain
2. **Feature Flags:** Use feature flags to toggle between old/new mutation paths (if needed)
3. **Parallel Testing:** Run tests on both old and new implementations during transition

**Post-Migration:**

1. **Monitoring:** Track GraphQL error rates for 2 weeks after full migration
2. **Performance Baselines:** Compare query latency before/after (alert if >10% regression)
3. **Deprecation Period:** Keep top-level methods for 3-6 months with deprecation warnings

---

## 7. Validation Checklist

### 7.1 Per-Domain Validation

**After extracting EACH domain, validate:**

#### Compilation Checks

- [ ] `cargo check` passes without warnings
- [ ] `cargo clippy` shows no new warnings
- [ ] `cargo build --release` succeeds

#### Unit Testing

- [ ] All domain-specific unit tests pass: `cargo test --lib mutations::{domain}`
- [ ] Test coverage ≥80% for extracted module: `cargo tarpaulin --out Html`
- [ ] No test runtime regressions (test suite completes in <10s per domain)

#### Integration Testing

- [ ] GraphQL queries using old top-level mutations still work
- [ ] GraphQL queries using new namespaced mutations work identically
- [ ] Multi-mutation transactions succeed (e.g., create event + add attendees)
- [ ] Error handling produces same error messages as before

#### API Compatibility

- [ ] GraphQL schema introspection shows new namespace (e.g., `events`)
- [ ] GraphQL schema introspection still shows old top-level mutations (backward compat)
- [ ] Frontend queries (if applicable) execute without changes
- [ ] Postman/curl integration tests pass

#### Performance Benchmarks

- [ ] Query latency ≤ baseline (no >10% regression)
- [ ] Compilation time for incremental builds improves
- [ ] Memory usage during GraphQL query execution unchanged

### 7.2 Post-Migration Validation (All Domains Complete)

#### Architecture Validation

- [ ] `mutation.rs` reduced to ≤200 lines (delegation only)
- [ ] No business logic remains in `mutation.rs` (only struct delegation)
- [ ] All 120 methods distributed across 12 domain modules
- [ ] Module dependency graph has no circular dependencies

#### Testing Validation

- [ ] Full test suite passes: `cargo test`
- [ ] Integration test suite passes: `cargo test --test integration`
- [ ] E2E tests (if applicable) pass against running server
- [ ] Performance tests show ≤5% variance from baseline

#### Documentation Validation

- [ ] GraphQL API docs updated with namespaced examples
- [ ] Migration guide published for frontend developers
- [ ] Architecture Decision Record (ADR) created documenting this refactoring
- [ ] Changelog entry added to CHANGELOG.md

#### Team Validation

- [ ] Code review approval from 2+ senior developers
- [ ] Team demo completed (show new architecture in action)
- [ ] Contribution guidelines updated with domain module patterns
- [ ] Tech lead sign-off obtained

### 7.3 Production Readiness Checklist

**Before deploying to production:**

#### Stability Checks

- [ ] Staging environment tested for 48 hours with zero errors
- [ ] Load testing shows no performance degradation under 1000 req/s
- [ ] Memory leak testing (run server for 24h, monitor memory usage)
- [ ] Error rate monitoring shows <0.1% error rate

#### Rollback Preparedness

- [ ] Git tag created for pre-migration state: `git tag v1.x.x-pre-refactor`
- [ ] Rollback procedure documented and tested
- [ ] Database migrations (if any) are reversible
- [ ] Feature flag to revert to old mutation.rs (if implemented)

#### Monitoring Setup

- [ ] Error tracking configured for new domain modules (e.g., Sentry tags)
- [ ] Latency dashboards updated with per-domain metrics
- [ ] Alert rules created for GraphQL error spikes
- [ ] On-call runbook updated with new architecture context

#### Communication

- [ ] Stakeholders notified of deployment (product, frontend team, DevOps)
- [ ] Deployment announcement in team Slack/Discord
- [ ] Post-deployment monitoring plan shared (who watches metrics for 24h)

---

## 8. Appendix

### 8.1 Domain Module Template

**Use this template when creating new domain modules:**

```rust
// src/schema/mutations/{domain}.rs

use async_graphql::{Context, Object, Result};
use sea_orm::{DatabaseConnection, EntityTrait, Set, ActiveModelTrait, QueryFilter, ColumnTrait};
use uuid::Uuid;

use crate::{
    auth::context::UserContext,
    database::get_db_from_context,
    error::AppError,
    models::{
        // Import domain-specific models only
        {DomainEntity}, Create{DomainEntity}Input, Update{DomainEntity}Input,
    },
};

/// {Domain} management mutations
pub struct {Domain}Mutations;

#[Object]
impl {Domain}Mutations {
    /// Create a new {entity}
    async fn create(&self, ctx: &Context<'_>, input: Create{Entity}Input) -> Result<{Entity}> {
        let db = get_db_from_context(ctx)?;
        let user = ctx.data::<UserContext>()?;

        // Authorization check
        if !user.has_permission("{domain}:write") {
            return Err(AppError::Unauthorized("Insufficient permissions".to_string()).into());
        }

        // Business logic
        let entity = crate::models::{domain}::{entity}::ActiveModel {
            id: Set(Uuid::new_v4()),
            // ... map input fields
            created_by: Set(user.id),
            ..Default::default()
        };

        let entity = entity.insert(db).await?;
        Ok(entity)
    }

    /// Update an existing {entity}
    async fn update(&self, ctx: &Context<'_>, input: Update{Entity}Input) -> Result<{Entity}> {
        let db = get_db_from_context(ctx)?;
        let user = ctx.data::<UserContext>()?;

        // Fetch existing entity
        let entity = {Entity}::find_by_id(input.id)
            .one(db)
            .await?
            .ok_or_else(|| AppError::NotFound(format!("{Entity} not found")))?;

        // Authorization check
        if entity.created_by != user.id && !user.has_permission("{domain}:admin") {
            return Err(AppError::Unauthorized("Cannot update this resource".to_string()).into());
        }

        // Update fields
        let mut entity: crate::models::{domain}::{entity}::ActiveModel = entity.into();
        if let Some(field) = input.field {
            entity.field = Set(field);
        }

        let updated = entity.update(db).await?;
        Ok(updated)
    }

    /// Delete a {entity}
    async fn delete(&self, ctx: &Context<'_>, id: Uuid) -> Result<bool> {
        let db = get_db_from_context(ctx)?;
        let user = ctx.data::<UserContext>()?;

        let entity = {Entity}::find_by_id(id).one(db).await?
            .ok_or_else(|| AppError::NotFound("{Entity} not found".to_string()))?;

        // Authorization
        if entity.created_by != user.id && !user.has_permission("{domain}:admin") {
            return Err(AppError::Unauthorized("Cannot delete this resource".to_string()).into());
        }

        // Soft delete
        let mut entity: crate::models::{domain}::{entity}::ActiveModel = entity.into();
        entity.deleted_at = Set(Some(chrono::Utc::now().naive_utc()));
        entity.update(db).await?;

        Ok(true)
    }
}
```

### 8.2 Integration Test Template

**Use this template for domain integration tests:**

```rust
// tests/integration/{domain}_mutations_test.rs

use async_graphql::{EmptySubscription, Schema};
use crate::helpers::{setup_test_db, create_test_user, TestContext};

type TestSchema = Schema<QueryRoot, MutationRoot, EmptySubscription>;

async fn build_test_schema() -> TestSchema {
    let db = setup_test_db().await;
    Schema::build(QueryRoot, MutationRoot, EmptySubscription)
        .data(db)
        .finish()
}

#[tokio::test]
async fn test_create_{entity}() {
    let schema = build_test_schema().await;
    let user = create_test_user(&schema).await;

    let query = r#"
        mutation {
            {domain} {
                create(input: {
                    field1: "value1"
                    field2: "value2"
                }) {
                    id
                    field1
                    field2
                    createdBy
                }
            }
        }
    "#;

    let result = schema
        .execute(query)
        .await;

    assert!(result.errors.is_empty(), "GraphQL errors: {:?}", result.errors);
    let data = result.data.into_json().unwrap();
    assert_eq!(data["{domain}"]["create"]["field1"], "value1");
}

#[tokio::test]
async fn test_update_{entity}() {
    // ... similar pattern
}

#[tokio::test]
async fn test_delete_{entity}() {
    // ... similar pattern
}

#[tokio::test]
async fn test_authorization_failure() {
    let schema = build_test_schema().await;
    let unauthorized_user = create_test_user_with_role(&schema, "employee").await;

    let query = r#"
        mutation {
            {domain} {
                delete(id: "non-existent-id") {
                    success
                }
            }
        }
    "#;

    let result = schema.execute(query).await;
    assert!(!result.errors.is_empty());
    assert!(result.errors[0].message.contains("Unauthorized"));
}
```

### 8.3 Useful Commands

**Development:**

```bash
# Check specific domain module
cargo check --lib mutations::events

# Run tests for specific domain
cargo test --lib mutations::events

# Run integration tests
cargo test --test integration test_event_mutations

# Check compilation performance (before/after comparison)
cargo clean && time cargo build --release

# View module dependency graph
cargo modules generate graph --lib | dot -Tpng > dependencies.png
```

**Code Quality:**

```bash
# Run clippy on domain module
cargo clippy --lib -- -D warnings

# Check test coverage
cargo tarpaulin --out Html --output-dir target/coverage

# Format code
cargo fmt

# Check for unused dependencies
cargo udeps
```

**Benchmarking:**

```bash
# GraphQL query performance
wrk -t4 -c100 -d30s --latency http://localhost:8000/graphql \
  -s benchmark_mutations.lua

# Compilation time benchmark
hyperfine --warmup 1 'cargo build --release'
```

### 8.4 References

**Relevant Documentation:**

- [async-graphql Field Resolvers](https://async-graphql.github.io/async-graphql/en/field_resolvers.html)
- [SeaORM Transactions](https://www.sea-ql.org/SeaORM/docs/advanced-query/transaction/)
- [Rust Module System Best Practices](https://doc.rust-lang.org/book/ch07-00-managing-growing-projects-with-packages-crates-and-modules.html)

**Internal Documentation:**

- GraphQL API Specification: `/docs/api/graphql-schema.md`
- Authentication & Authorization Guide: `/docs/auth/rbac-implementation.md`
- Database Schema Documentation: `/docs/database/schema-overview.md`

**Related ADRs (Architecture Decision Records):**

- ADR-001: GraphQL API Design Principles
- ADR-005: SeaORM as ORM Layer
- ADR-012: Mutation Transaction Handling

---

## Conclusion

This refactoring will transform `mutation.rs` from a 3,960-line God file into a modular, maintainable architecture with clear domain boundaries. The 60-hour investment will yield:

- **50% reduction in merge conflicts** (estimated 3-5/week → <1/week)
- **70% faster incremental compilation** (15s → ~5s for domain-specific changes)
- **3x improvement in developer productivity** (parallel development, easier navigation)
- **Zero GraphQL API breaking changes** (backward compatible throughout)

The migration follows a proven step-by-step process with comprehensive validation at each stage. By extracting domains incrementally (auth → time → employee → documents → system → events → leave → reviews), the team minimizes risk while building confidence in the new architecture.

**Next Steps:**

1. Review this plan with tech lead and team (1 hour meeting)
2. Create feature branches for each domain: `refactor/extract-{domain}-mutations`
3. Assign domain ownership (2 developers, 4 domains each)
4. Begin Week 1: Extract auth, time, and employee domains
5. Track progress in project management tool (Jira/Linear/GitHub Projects)

**Success Criteria:**

- ✅ All 120 mutation methods migrated to domain modules
- ✅ `mutation.rs` reduced to ≤200 lines (delegation only)
- ✅ Zero failing tests after migration
- ✅ GraphQL API remains fully backward compatible
- ✅ Compilation time improves by ≥50%

---

**Document Maintained By:** Engineering Team
**Last Updated:** 2025-11-02
**Next Review:** 2025-12-01 (post-migration retrospective)
