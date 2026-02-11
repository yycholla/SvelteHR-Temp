# Time-Related Modules Architecture Review

**Date:** 2026-02-11
**Reviewer:** Architecture Review Agent
**Scope:** Time Tracking, Attendance, Leave Management modules

---

## Executive Summary

This report analyzes the current architecture of all time-related modules (Attendance Records, Time Entries, Leave Management) against hexagonal architecture principles. The analysis focuses on domain logic separation, testability, coupling, and readiness for migration to a cleaner architecture pattern.

### Key Findings

| Module                 | Architecture Status | Domain Complexity | Coupling Level | Test Coverage    | Priority        |
| ---------------------- | ------------------- | ----------------- | -------------- | ---------------- | --------------- |
| **Time Entries**       | ⚠️ Mixed            | **High**          | **High**       | Medium (144 LOC) | **P1 - High**   |
| **Leave Management**   | ⚠️ Mixed            | **High**          | Medium         | High (1221 LOC)  | **P2 - Medium** |
| **Attendance Records** | ❌ Anemic           | Low               | High           | Low (0 LOC)      | P3 - Low        |
| **Projects**           | ❌ Anemic           | Low               | Medium         | Low (0 LOC)      | P4 - Low        |

**Legend:**

- ✅ Clean Architecture (domain-driven, decoupled, testable)
- ⚠️ Mixed (some business logic, tightly coupled to GraphQL)
- ❌ Anemic (data models only, no domain logic)

### Overall Assessment

**Current State:** All time-related modules follow a **traditional CRUD pattern** with:

- Business logic embedded in GraphQL mutations/queries
- Direct database access via SeaORM in GraphQL resolvers
- No domain layer or service abstraction
- Tight coupling between GraphQL schema and database models

**Recommended Migration Path:**

1. **Time Entries** (highest complexity + QuickBooks sync)
2. **Leave Management** (approval workflows + balance calculations)
3. **Attendance Records** (simple CRUD)
4. **Projects** (simple CRUD with QuickBooks sync)

---

## Module 1: Time Entries

### Current Architecture

**Location:** `graphql-rust-server/src/models/time/time_entry.rs`

**Status:** ⚠️ **Mixed Architecture (Not Hexagonal)**

### Structure

```
src/
├── models/time/
│   ├── time_entry.rs (302 LOC) - SeaORM entity + GraphQL Object
│   └── project.rs (120 LOC) - SeaORM entity for project tracking
├── schema/
│   ├── mutations/time_entry.rs (446 LOC) - GraphQL mutations with business logic
│   └── queries/time_entry.rs (226 LOC) - GraphQL queries with filtering logic
├── services/
│   └── time_tracking_sync.rs (22k LOC) - QuickBooks sync service
└── tests/
    └── contract/test_time_contract.rs (144 LOC)
```

### Domain Complexity: **HIGH**

**Business Rules Identified:**

1. **Status Workflow:**
   - Draft → Submitted → Approved/Rejected
   - Can only submit draft entries
   - Can only approve submitted entries
   - Cannot edit approved or synced entries
   - Cannot delete synced entries

2. **Approval Logic:**
   - Requires `time_entries:approve` permission
   - Tracks approver + timestamp
   - Rejection requires reason

3. **QuickBooks Sync State:**
   - Not Synced → Pending → Synced/Failed
   - Bidirectional sync with conflict resolution
   - Batch sync operations with retry logic
   - Tracks `quickbooks_time_activity_id`, `sync_token`, `last_modified_at`

4. **Permission-Based Access:**
   - Own entries vs all entries (`time_entries:view_all`, `time_entries:edit_all`)
   - Approval workflow permissions (`time_entries:approve`)
   - Sync trigger permissions (`time_sync:trigger`)

5. **Project Association:**
   - Optional project linkage
   - Billable/non-billable flag
   - Project-based time tracking

**Value Objects (Should Exist):**

- `TimeEntryStatus` (Draft, Submitted, Approved, Rejected) - **EXISTS as enum**
- `TimeEntrySyncState` (NotSynced, Pending, Synced, Failed) - **EXISTS as enum**
- `Hours` (0.0 - 24.0 validation) - **MISSING**
- `BillableStatus` - **MISSING (boolean only)**

### Current Code Location

**Business Logic Location:** ❌ **Directly in GraphQL Mutations**

Example from `src/schema/mutations/time_entry.rs`:

```rust
async fn approve_time_entry(&self, ctx: &Context<'_>, id: Uuid, input: ApproveTimeEntryInput) -> Result<time_entry::Model> {
    // Permission check IN MUTATION
    if !user_ctx.has_permission("time_entries:approve") {
        return Err("Permission denied".into());
    }

    // Business rule IN MUTATION
    if entry.status != "submitted" {
        return Err("Can only approve/reject submitted time entries".into());
    }

    // State transition logic IN MUTATION
    if input.approve {
        active_entry.status = Set("approved".to_string());
        active_entry.approved_by = Set(Some(user_ctx.user_id));
        // ...
    }
}
```

**Problems:**

- Business rules scattered across mutation resolvers
- Cannot test approval workflow without GraphQL context
- Status transitions hard-coded as strings
- Permission checks duplicated in multiple places
- No domain invariants enforced at entity level

### Coupling Level: **HIGH**

**Dependencies:**

- ✅ SeaORM (database access) - **Acceptable, but should be behind repository**
- ❌ async-graphql (GraphQL framework) - **Tight coupling in business logic**
- ❌ UserContext (auth) - **Embedded in mutations**
- ✅ IntuitClient (QuickBooks) - **Properly abstracted in service**

**Coupling Issues:**

1. GraphQL types mixed with domain models
2. Database queries in mutation resolvers
3. No repository abstraction
4. Business logic not reusable outside GraphQL context

### Test Coverage: **MEDIUM**

**Existing Tests:**

- `tests/contract/test_time_contract.rs` (144 LOC)
  - Contract tests for QuickBooks sync
  - Integration tests (requires database)
  - **No unit tests for domain logic** (because it's in mutations)

**Coverage Gaps:**

1. ❌ Status transition rules (Draft → Submitted → Approved)
2. ❌ Permission-based filtering logic
3. ❌ Approval workflow edge cases
4. ❌ Billable/non-billable business rules
5. ✅ QuickBooks sync service (has integration tests)

**Why Coverage is Low:**

- Business logic embedded in GraphQL mutations is hard to unit test
- Requires spinning up GraphQL context + database for every test
- No pure domain tests possible

### Service Layer: ⚠️ **Partial**

**Exists:** `TimeTrackingSync` service for QuickBooks integration

**Responsibilities:**

- Push approved time entries to QuickBooks
- Pull time activities from QuickBooks
- Batch sync operations
- Sync statistics

**What's Missing:**

- `TimeEntryService` for core CRUD + approval workflow
- Domain validation (hours, dates, status transitions)
- Permission abstractions
- Repository interface

### Hexagonal Architecture Readiness

**Migration Complexity:** 🔴 **HIGH**

**Estimated Effort:** **8-10 person-days**

**What Would Change:**

```
BEFORE (Current):
GraphQL Mutation → SeaORM Entity → Database

AFTER (Hexagonal):
GraphQL Adapter → TimeEntryService (orchestration)
                    ↓
                TimeEntry Domain Entity (business rules)
                    ↓
                TimeEntryRepository Port (interface)
                    ↓
                SeaORMTimeEntryAdapter (implementation)
                    ↓
                Database
```

**Required Work:**

1. **Domain Layer** (3 days):
   - `TimeEntry` entity with status transition rules
   - `Hours`, `BillableStatus` value objects
   - Domain errors: `InvalidStatusTransitionError`, `UnauthorizedApprovalError`
   - Business logic: `approve()`, `reject()`, `submit()`, `canEdit()`, `canDelete()`

2. **Service Layer** (2 days):
   - `TimeEntryService` for orchestration
   - Depends on `TimeEntryRepository` port
   - Handles permission checks at service level
   - Returns `Result<T, DomainError>`

3. **Adapter Layer** (2 days):
   - `SeaORMTimeEntryAdapter` implements `TimeEntryRepository`
   - Translates between GraphQL and domain entities
   - Data sanitization at boundary

4. **Testing** (2 days):
   - Domain layer unit tests (pure, fast)
   - Service layer tests with mock repository
   - Integration tests with real database

5. **Migration** (1 day):
   - Update GraphQL mutations to use service
   - Deprecate direct SeaORM access
   - Update existing contract tests

**Benefits of Migration:**

- ✅ Business logic testable without database
- ✅ Status transitions enforced by domain entity
- ✅ Permission logic reusable
- ✅ QuickBooks sync decoupled from CRUD
- ✅ Can swap database implementation

---

## Module 2: Leave Management

### Current Architecture

**Location:** `graphql-rust-server/src/models/`

**Status:** ⚠️ **Mixed Architecture (Not Hexagonal)**

### Structure

```
src/
├── models/
│   ├── leave_request.rs (280 LOC) - SeaORM entity + GraphQL Object + business logic helpers
│   ├── leave_type.rs (178 LOC) - SeaORM entity + GraphQL Object + aggregations
│   └── leave_balance.rs (161 LOC) - SeaORM entity + GraphQL Object + calculations
├── schema/ (mutations/queries in main mutation.rs/query.rs)
└── tests/
    └── graphql_leave_tests.rs (1221 LOC) - Comprehensive GraphQL integration tests
```

### Domain Complexity: **HIGH**

**Business Rules Identified:**

1. **Leave Request Workflow:**
   - Pending → Approved/Rejected/Cancelled
   - Manager approval required (based on `requires_approval` flag in leave type)
   - Balance deduction on approval
   - Balance restoration on rejection/cancellation

2. **Leave Balance Calculations:**
   - Annual allocation based on `default_days` per leave type
   - Real-time balance tracking: `total_days - used_days = remaining_days`
   - Insufficient balance validation
   - Multi-leave-type support (vacation, sick, personal, etc.)

3. **Leave Type Configuration:**
   - Paid vs unpaid leave
   - Approval required flag
   - Default days allocation
   - Calendar color coding

4. **Date Validation:**
   - Start date ≤ End date
   - No overlapping leave requests
   - Business days calculation (fractional days like 0.5 for half-day)

5. **Permission-Based Access:**
   - Employees can create own requests
   - Managers can approve/reject requests for their reports
   - HR can view all requests
   - RLS filtering by employee/manager relationship

**Value Objects (Should Exist):**

- `LeaveRequestStatus` (Pending, Approved, Rejected, Cancelled) - **EXISTS as enum**
- `LeaveDays` (0.5 - 365.0 validation with fractional days) - **MISSING (stored as Decimal)**
- `DateRange` (start/end date validation) - **MISSING**
- `LeaveBalance` (total, used, remaining invariants) - **EXISTS but not as value object**

### Current Code Location

**Business Logic Location:** ⚠️ **Split Between Model and GraphQL**

**Good:** Helper methods in model:

```rust
// In leave_request.rs
impl Model {
    async fn is_pending(&self) -> bool { self.status == "pending" }
    async fn is_approved(&self) -> bool { self.status == "approved" }
    async fn duration_days(&self) -> String { self.days_requested.to_string() }
}
```

**Bad:** Business logic still in GraphQL mutations (not shown, but inferred from test structure)

### Coupling Level: **MEDIUM**

**Dependencies:**

- ✅ SeaORM (database access)
- ❌ async-graphql (GraphQL framework mixed with domain)
- ✅ Relationships properly modeled (Employee, Manager, LeaveType)

**Coupling Issues:**

1. Domain helpers exist BUT still coupled to GraphQL Object
2. Business logic for approval/rejection likely in mutations
3. Balance calculations use raw SQL queries (see `leave_type.rs:106`)

### Test Coverage: **HIGH**

**Existing Tests:**

- `tests/graphql_leave_tests.rs` (1221 LOC) ✅
  - 7 tests: Leave request creation with validation
  - 8 tests: Leave approval workflow with RBAC
  - 5 tests: Leave balance calculations
  - 4 tests: Leave queries with RLS filtering

**Coverage:** Excellent GraphQL integration test coverage, but:

- ❌ No unit tests for domain logic
- ❌ Tests require full database + GraphQL context
- ❌ Slow test execution (integration tests)
- ✅ Good coverage of business rules

### Service Layer: ❌ **MISSING**

**No dedicated service exists.** All logic likely in:

1. GraphQL mutations (approval, rejection, creation)
2. Model helper methods (status checks)
3. Raw SQL queries (balance aggregations)

### Hexagonal Architecture Readiness

**Migration Complexity:** 🟡 **MEDIUM**

**Estimated Effort:** **6-8 person-days**

**Why Easier Than Time Entries:**

- Simpler domain (no external sync)
- Already has helper methods in model
- Excellent test coverage to verify migration
- Clear bounded context

**Required Work:**

1. **Domain Layer** (2 days):
   - `LeaveRequest` entity with approval workflow
   - `LeaveDays`, `DateRange` value objects
   - `LeaveBalance` entity with calculation invariants
   - Domain errors: `InsufficientBalanceError`, `OverlappingLeaveError`, `InvalidDateRangeError`

2. **Service Layer** (2 days):
   - `LeaveService` for orchestration
   - `LeaveBalanceService` for calculations
   - `LeaveRepository` port

3. **Adapter Layer** (1 day):
   - `SeaORMLeaveAdapter` implements `LeaveRepository`

4. **Testing** (2 days):
   - Convert GraphQL tests to domain + service tests
   - Keep integration tests for end-to-end verification

5. **Migration** (1 day):
   - Update GraphQL mutations
   - Preserve existing test behavior

**Benefits of Migration:**

- ✅ Balance calculations testable without database
- ✅ Approval workflow as pure domain logic
- ✅ Date validation enforced at entity level
- ✅ Overlap detection as domain service
- ✅ Fast unit tests (current tests are slow)

---

## Module 3: Attendance Records

### Current Architecture

**Location:** `graphql-rust-server/src/models/time/attendance_record.rs`

**Status:** ❌ **Anemic Domain Model**

### Structure

```
src/
├── models/time/
│   └── attendance_record.rs (172 LOC) - SeaORM entity + GraphQL Object
├── schema/
│   └── mutations/time.rs (contains attendance CRUD)
└── tests/
    └── (NO TESTS FOR ATTENDANCE)
```

### Domain Complexity: **LOW**

**Business Rules Identified:**

1. **Attendance Status:**
   - Present, Absent, Late, Half Day
   - Simple enum-based status

2. **Clock In/Out:**
   - Optional timestamps
   - Hours worked calculation (should be derived from clock in/out)

3. **Daily Attendance:**
   - One record per employee per day
   - Date-based tracking

**Value Objects (Should Exist):**

- `AttendanceStatus` (Present, Absent, Late, HalfDay) - **EXISTS as enum**
- `ClockTime` (in/out validation) - **MISSING**
- `WorkHours` (derived from clock times) - **MISSING**

### Current Code Location

**Business Logic Location:** ❌ **None (Pure CRUD)**

- No business rules enforced
- No validation logic
- Just data model + GraphQL resolvers

### Coupling Level: **HIGH**

**Dependencies:**

- ❌ async-graphql tightly coupled
- ❌ Direct SeaORM access in mutations
- ❌ No abstraction layers

### Test Coverage: **NONE**

**Existing Tests:** ❌ Zero

**Coverage Gaps:**

- All business logic untested
- CRUD operations untested
- Clock in/out validation missing

### Service Layer: ❌ **MISSING**

### Hexagonal Architecture Readiness

**Migration Complexity:** 🟢 **LOW**

**Estimated Effort:** **2-3 person-days**

**Why Easiest:**

- Minimal business logic
- Simple CRUD operations
- No external integrations
- No complex workflows

**Required Work:**

1. **Domain Layer** (0.5 days):
   - `AttendanceRecord` entity with clock time validation
   - `ClockTime`, `WorkHours` value objects
   - Auto-calculate hours from clock in/out

2. **Service Layer** (0.5 days):
   - `AttendanceService` for CRUD
   - `AttendanceRepository` port

3. **Adapter Layer** (0.5 days):
   - `SeaORMAttendanceAdapter`

4. **Testing** (0.5 days):
   - Domain unit tests
   - Service tests
   - Integration tests

5. **Migration** (0.5 days):
   - Update GraphQL mutations

**Benefits of Migration:**

- ✅ Clock time validation
- ✅ Auto-calculated work hours
- ✅ Testable business rules
- ✅ Consistent with other time modules

---

## Module 4: Projects

### Current Architecture

**Location:** `graphql-rust-server/src/models/time/project.rs`

**Status:** ❌ **Anemic Domain Model**

### Structure

```
src/
├── models/time/
│   └── project.rs (120 LOC) - SeaORM entity + GraphQL Object
└── schema/
    └── mutations/time_entry.rs (contains project CRUD)
```

### Domain Complexity: **LOW**

**Business Rules:**

- Project active/inactive flag
- Billable/non-billable flag
- QuickBooks customer + service item mapping
- Project code uniqueness (likely enforced at DB level)

### Current Code Location

**Business Logic Location:** ❌ **None (Pure CRUD + QuickBooks sync)**

### Coupling Level: **MEDIUM**

- QuickBooks sync fields embedded in model
- Otherwise standard CRUD

### Test Coverage: **NONE**

### Service Layer: ⚠️ **Partial (QuickBooks sync only)**

### Hexagonal Architecture Readiness

**Migration Complexity:** 🟢 **LOW**

**Estimated Effort:** **2-3 person-days**

**Similar to Attendance Records** - simple CRUD with minimal business logic.

---

## Cross-Cutting Concerns

### 1. Permission System

**Current State:**

- Permission checks embedded in GraphQL mutations
- `UserContext` passed via async-graphql context
- String-based permission names

**Hexagonal Approach:**

- Permission checks in service layer
- Domain-agnostic authorization interface
- Testable without auth framework

### 2. QuickBooks Integration

**Current State:**

- ✅ Already abstracted via `IntuitClient` and `TimeTrackingSync` service
- Properly decoupled from core business logic
- Implements retry logic and error handling

**No Changes Needed** - This is already following good architectural patterns.

### 3. Audit Logging

**Current State:**

- Not visible in time modules
- Likely centralized in `services/audit_logger.rs`

**Hexagonal Approach:**

- Audit events emitted from domain layer
- Event handlers in infrastructure layer

---

## Recommended Migration Order

### Phase 1: Foundation (Week 1)

**Priority:** Establish patterns for other modules to follow

1. **Attendance Records** (2-3 days)
   - Simplest module
   - Proof of concept for hexagonal pattern
   - Template for other modules

### Phase 2: High-Value Migrations (Week 2-3)

2. **Time Entries** (8-10 days)
   - Highest complexity
   - Most business value (QuickBooks sync)
   - Critical for payroll accuracy

3. **Leave Management** (6-8 days)
   - Second highest complexity
   - Well-tested (can verify migration correctness)
   - Important for employee experience

### Phase 3: Finishing Touches (Week 4)

4. **Projects** (2-3 days)
   - Simple CRUD
   - Supporting module for time entries

---

## Effort Summary

| Module             | Complexity | Effort (Person-Days) | Risk Level |
| ------------------ | ---------- | -------------------- | ---------- |
| Time Entries       | High       | 8-10                 | Medium     |
| Leave Management   | Medium     | 6-8                  | Low        |
| Attendance Records | Low        | 2-3                  | Very Low   |
| Projects           | Low        | 2-3                  | Very Low   |
| **TOTAL**          | -          | **18-24 days**       | -          |

**Total Estimated Effort:** 3.5 - 5 weeks (1 developer)

**Risk Factors:**

- 🔴 Time Entries: Complex QuickBooks sync logic (already abstracted, mitigates risk)
- 🟡 Leave Management: Extensive test suite to maintain (good for verification)
- 🟢 Attendance/Projects: Minimal risk

---

## Benefits of Migration

### 1. Testability

**Before:** Business logic in GraphQL mutations → requires database + GraphQL context for every test
**After:** Pure domain tests → milliseconds, no I/O

**Example:**

```rust
// BEFORE: Integration test (slow)
#[tokio::test]
async fn test_approve_time_entry() {
    let ctx = TestContext::new().await;
    let result = execute_graphql_mutation(...).await;
    // Requires: Database, GraphQL, UserContext
}

// AFTER: Unit test (fast)
#[test]
fn test_approve_time_entry() {
    let entry = TimeEntry::draft(...);
    let result = entry.approve(approver_id);
    assert!(result.is_ok());
    // Pure domain logic, no I/O
}
```

### 2. Maintainability

- Business rules documented in domain entities
- Single source of truth for status transitions
- GraphQL becomes thin adapter layer

### 3. Reusability

- Domain logic usable in REST API, CLI, batch jobs
- Not locked to GraphQL

### 4. Type Safety

- Value objects enforce invariants (e.g., `Hours` can't be negative)
- Compile-time guarantees for status transitions

### 5. Separation of Concerns

- Domain layer: What the system does
- Service layer: How operations are orchestrated
- Adapter layer: How we talk to external systems

---

## Risks and Mitigations

### Risk 1: Regression Bugs During Migration

**Mitigation:**

- ✅ Leave Management has 1221 LOC of integration tests
- ✅ Migrate one module at a time
- ✅ Keep existing tests running during migration
- ✅ Use feature flags for gradual rollout

### Risk 2: Increased Code Volume

**Reality Check:** Yes, hexagonal architecture adds layers, but:

- Domain logic becomes testable (reduces debugging time)
- Business rules are explicit (reduces onboarding time)
- Changes are localized (reduces maintenance time)

**Net Result:** Long-term productivity gain outweighs initial code volume increase.

### Risk 3: Team Learning Curve

**Mitigation:**

- Start with simplest module (Attendance Records)
- Create detailed examples and templates
- Pair programming during first migration
- Document patterns in `CLAUDE.md`

---

## Comparison to Employee Module

**Employee Module Status:** ✅ Already uses hexagonal architecture

**What We Can Learn:**

1. **Domain Layer:**
   - `Employee` entity with business logic and invariants
   - Value objects: `Email`, `PersonName`, `HireDate`, `EmployeeStatus`
   - `Result<T, E>` pattern for type-safe error handling

2. **Service Layer:**
   - `EmployeeService` orchestrates operations
   - Depends on `EmployeeRepository` port (interface)
   - 156 comprehensive tests (100% passing)

3. **Adapter Layer:**
   - `GraphQLEmployeeAdapter` implements repository
   - Data sanitization at boundary

**Time Modules Should Follow Same Pattern:**

- Time Entries → `TimeEntryService`, `TimeEntryRepository`
- Leave Management → `LeaveService`, `LeaveRepository`
- Attendance → `AttendanceService`, `AttendanceRepository`

---

## Conclusion

### Current State: ⚠️ Traditional CRUD with Mixed Business Logic

All time-related modules currently follow a **GraphQL-first architecture** with:

- ❌ Business logic embedded in GraphQL mutations
- ❌ Direct database access via SeaORM
- ❌ No domain layer or service abstraction
- ❌ Difficult to unit test (requires full stack)

### Recommended Action: ✅ Migrate to Hexagonal Architecture

**Why:**

1. **Employee module proves the pattern works** (156 tests, 100% passing)
2. **Time Entries has high complexity** that would benefit from domain modeling
3. **Leave Management is well-tested** making migration verification easier
4. **Consistency across codebase** improves maintainability

**When:**

- **Start:** After completing current JWT authentication work
- **Duration:** 3.5 - 5 weeks (1 developer)
- **Order:** Attendance → Time Entries → Leave Management → Projects

**Expected Outcome:**

- ✅ Business logic testable without database
- ✅ Domain rules enforced at entity level
- ✅ GraphQL as thin adapter layer
- ✅ Consistent architecture across all HR modules
- ✅ Faster test execution (pure unit tests)
- ✅ Easier onboarding for new developers

---

## Appendix: File Statistics

### Time Entries Module

- Model: 302 LOC (`time_entry.rs`)
- Mutations: 446 LOC (`mutations/time_entry.rs`)
- Queries: 226 LOC (`queries/time_entry.rs`)
- Service: 22k LOC (`time_tracking_sync.rs`) - mostly QuickBooks integration
- Tests: 144 LOC (contract tests only)
- **Total:** ~1,118 LOC (excluding QuickBooks sync)

### Leave Management Module

- Leave Request Model: 280 LOC
- Leave Type Model: 178 LOC
- Leave Balance Model: 161 LOC
- Tests: 1,221 LOC (comprehensive GraphQL integration tests)
- **Total:** ~1,840 LOC

### Attendance Records Module

- Model: 172 LOC
- Mutations: ~50 LOC (in `mutations/time.rs`)
- Tests: 0 LOC
- **Total:** ~222 LOC

### Projects Module

- Model: 120 LOC
- Mutations: ~100 LOC (in `mutations/time_entry.rs`)
- Tests: 0 LOC
- **Total:** ~220 LOC

### Grand Total

**~3,400 LOC** across all time-related modules (excluding QuickBooks sync infrastructure)

---

**Report Generated:** 2026-02-11
**Next Review:** After Phase 1 migration (Attendance Records)
