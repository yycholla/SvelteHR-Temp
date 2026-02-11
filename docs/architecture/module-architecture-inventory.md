# SvelteHR Module Architecture Inventory

**Date:** February 11, 2026
**Purpose:** Comprehensive survey of all modules and their hexagonal architecture migration status
**Author:** Architecture Team

---

## Executive Summary

**Total Modules Identified:** 23
**Hexagonal Architecture Complete:** 3 (13%)
**In Progress:** 0 (0%)
**Not Started:** 20 (87%)

**High Priority Migration Candidates:** 8 modules
**Estimated Total Effort:** 16-20 person-weeks

---

## Module Inventory

| Module                    | Complexity | Current Pattern | Test Coverage | Hexagonal Status | Priority  | Effort (days) | Rationale                                               |
| ------------------------- | ---------- | --------------- | ------------- | ---------------- | --------- | ------------- | ------------------------------------------------------- |
| **Employee**              | High       | ✅ Hexagonal    | 95%+          | ✅ Complete      | -         | -             | Reference implementation with 156 tests                 |
| **Department**            | High       | ✅ Hexagonal    | 90%+          | ✅ Complete      | -         | -             | Complex hierarchy, 990 test lines                       |
| **Leave Request**         | High       | ✅ Hexagonal    | 85%+          | ✅ Complete      | -         | -             | Complex approval workflows, 584 test lines              |
| **Tasks**                 | Medium     | Direct GraphQL  | 20%           | Not Started      | 🔴 High   | 5             | Complex workflows, 974 LOC, frequent changes            |
| **Goals**                 | Medium     | Direct GraphQL  | 15%           | Not Started      | 🔴 High   | 4             | Business logic in helpers, 1050 LOC                     |
| **Performance Reviews**   | High       | Direct GraphQL  | 10%           | Not Started      | 🔴 High   | 6             | Duplicate modules, complex rating logic, 1949 LOC total |
| **Events/Calendar**       | High       | Direct GraphQL  | 25%           | Not Started      | 🔴 High   | 6             | Complex recurrence, RSVP logic, 1187 LOC                |
| **Leave Management**      | Medium     | Direct GraphQL  | 30%           | Not Started      | 🟡 Medium | 4             | Balance calculations, approval chains, 818 LOC          |
| **Notifications**         | Medium     | Direct GraphQL  | 15%           | Not Started      | 🟡 Medium | 3             | Event-driven logic, 1089 LOC                            |
| **Documents**             | Low        | Direct GraphQL  | 30%           | Not Started      | 🟡 Medium | 2             | File operations, assignment logic                       |
| **RBAC/Permissions**      | Medium     | Service Layer   | 40%           | Not Started      | 🔴 High   | 5             | Core security, used everywhere                          |
| **JWT/Auth**              | Medium     | Service Layer   | 80%           | Not Started      | 🔴 High   | 3             | Already well-tested, needs domain layer                 |
| **Reports**               | Medium     | Direct GraphQL  | 20%           | Not Started      | 🟡 Medium | 4             | Data aggregation, 1091 LOC                              |
| **Team Management**       | Low        | Direct GraphQL  | 25%           | Not Started      | 🟢 Low    | 2             | Simple CRUD, 709 LOC                                    |
| **Team Reports**          | Medium     | Direct GraphQL  | 15%           | Not Started      | 🟡 Medium | 3             | Aggregation logic, 1227 LOC                             |
| **Settings**              | Low        | Direct GraphQL  | 30%           | Not Started      | 🟢 Low    | 2             | Configuration management, 1009 LOC                      |
| **Onboarding**            | Low        | Direct GraphQL  | 10%           | Not Started      | 🟢 Low    | 2             | Simple workflows, 4 files                               |
| **Training**              | Low        | Direct GraphQL  | 10%           | Not Started      | 🟢 Low    | 2             | Simple tracking, 4 files                                |
| **Compliance**            | Low        | Direct GraphQL  | 5%            | Not Started      | 🟢 Low    | 2             | Reporting focused, 3 directories                        |
| **Emergency Contacts**    | Low        | Inline GraphQL  | 40%           | Not Started      | 🟢 Low    | 1             | Part of Employee, simple CRUD                           |
| **Vehicles**              | Low        | Inline GraphQL  | 30%           | Not Started      | 🟢 Low    | 1             | Part of Employee, simple tracking                       |
| **Skills/Certifications** | Low        | Inline GraphQL  | 10%           | Not Started      | 🟢 Low    | 1             | Part of Performance, simple list                        |
| **Activity Logs/Audit**   | Medium     | Service Layer   | 35%           | Not Started      | 🟡 Medium | 3             | Complex rollback logic, 570 LOC                         |

---

## Detailed Module Analysis

### ✅ Complete: Hexagonal Architecture (3 modules)

#### 1. Employee Module

- **Status:** ✅ Complete (Reference Implementation)
- **Location:** `src/domain/Employee/`, `src/services/EmployeeService.ts`
- **Complexity:** High
  - 11 domain files (493 test lines)
  - 9.8k LOC in service layer
  - Complex validation: email, hire dates, status management
- **Architecture:**
  - Domain entities: `Employee`, `Email`, `PersonName`, `HireDate`, `EmployeeStatus`
  - Service layer: `EmployeeService` with CRUD + bulk operations
  - Adapter: `GraphQLEmployeeAdapter` implements `EmployeeRepository` port
  - 156 comprehensive tests (100% passing)
- **Test Coverage:** 95%+
- **Key Features:**
  - Zero `any` types throughout
  - Result pattern for error handling
  - Duplicate detection
  - Data sanitization at boundary

#### 2. Department Module

- **Status:** ✅ Complete
- **Location:** `src/domain/Department/`, `src/services/DepartmentService.ts`
- **Complexity:** High
  - 8 domain files (990 test lines)
  - 13k LOC in service layer
  - Complex hierarchy management
- **Architecture:**
  - Domain entities: `Department`, `DepartmentHierarchy`
  - Service layer: `DepartmentService` with recursive operations
  - GIN index optimization for descendant queries
- **Test Coverage:** 90%+
- **Key Features:**
  - Parent-child relationship management
  - Circular dependency detection
  - Hierarchy traversal algorithms

#### 3. Leave Request Module

- **Status:** ✅ Complete
- **Location:** `src/domain/LeaveRequest/`, `src/services/LeaveRequestService.ts`
- **Complexity:** High
  - 9 domain files (584 test lines)
  - 13k LOC in service layer
  - Complex approval workflows
- **Architecture:**
  - Domain entities: `LeaveRequest`, `LeaveBalance`, `LeaveStatus`
  - Service layer: `LeaveRequestService` with approval chains
  - 164 service tests
- **Test Coverage:** 85%+
- **Key Features:**
  - Multi-stage approval workflows
  - Balance calculations
  - Status transition validation

---

### 🔴 High Priority (8 modules)

#### 1. Tasks Module

- **Current State:** Direct GraphQL calls in components/routes
- **Location:** `src/lib/graphql/tasks/`, `src/routes/dashboard/tasks/`
- **Complexity:** Medium (974 LOC, 26 route files)
- **Why High Priority:**
  - Complex workflow management (status transitions)
  - Frequent feature changes (agile backlog)
  - Poor test coverage (20%)
  - Business logic scattered across components
- **Business Rules to Extract:**
  - Task status transitions (pending → in_progress → completed)
  - Priority calculations
  - Due date validation and overdue detection
  - Assignment validation (RBAC)
  - Time tracking (estimated vs actual hours)
- **Estimated Effort:** 5 days
- **Migration Strategy:**
  1. Create domain entities: `Task`, `TaskStatus`, `TaskPriority`, `TimeEstimate`
  2. Build service layer: `TaskService` with workflow methods
  3. Create adapter: `GraphQLTaskAdapter`
  4. Write 80+ tests covering all workflows
  5. Refactor routes to use service

#### 2. Goals Module

- **Current State:** Direct GraphQL + helper functions
- **Location:** `src/lib/graphql/goals/`, `src/routes/dashboard/management/goals/`
- **Complexity:** Medium (1050 LOC)
- **Why High Priority:**
  - Complex business logic in query helpers
  - Progress tracking calculations
  - Quarterly alignment logic
  - Poor separation of concerns
- **Business Rules to Extract:**
  - Goal progress calculations
  - Status transitions (not_started → in_progress → completed)
  - Overdue detection
  - Priority management
  - Quarter/year alignment
  - Statistics aggregation (completion rate, average progress)
- **Estimated Effort:** 4 days
- **Migration Strategy:**
  1. Domain entities: `Goal`, `GoalProgress`, `GoalStatus`, `Quarter`
  2. Service: `GoalService` with calculation methods
  3. Move helper functions to domain/service layers
  4. 60+ tests for all calculations

#### 3. Performance Reviews Module

- **Current State:** Direct GraphQL (TWO duplicate modules!)
- **Location:**
  - `src/lib/graphql/performance/` (1115 LOC)
  - `src/lib/graphql/performance-management/` (834 LOC)
- **Complexity:** High (1949 LOC total)
- **Why High Priority:**
  - Critical HR function
  - Complex rating algorithms
  - Duplicate code needs consolidation
  - Multi-dimensional ratings
  - Low test coverage (10%)
- **Business Rules to Extract:**
  - Rating calculations (overall, goals, collaboration, etc.)
  - Review period validation
  - Status workflows (draft → submitted → completed)
  - Department-scoped access (RLS integration)
  - Statistics aggregation
- **Estimated Effort:** 6 days (includes consolidation)
- **Migration Strategy:**
  1. Consolidate two modules into one
  2. Domain entities: `PerformanceReview`, `Rating`, `ReviewPeriod`
  3. Service: `PerformanceReviewService` with rating calculations
  4. 100+ tests for all rating dimensions

#### 4. Events/Calendar Module

- **Current State:** Direct GraphQL with service layer partial
- **Location:** `src/lib/graphql/events/`, `src/lib/graphql/events/service.ts`
- **Complexity:** High (1187 LOC)
- **Why High Priority:**
  - Complex recurrence logic (RRULE integration)
  - RSVP workflow management
  - Waitlist logic
  - iCal generation
  - Event comments and history
- **Business Rules to Extract:**
  - Recurrence pattern validation
  - RSVP state transitions (pending → accepted/declined)
  - Waitlist promotion logic
  - Event capacity management
  - Conflict detection (overlapping events)
  - Reminder scheduling
- **Estimated Effort:** 6 days
- **Migration Strategy:**
  1. Domain entities: `Event`, `Recurrence`, `Attendee`, `RSVP`
  2. Service: `EventService` with recurrence and RSVP logic
  3. Extract iCal service to domain
  4. 90+ tests for recurrence and RSVP workflows

#### 5. RBAC/Permissions Module

- **Current State:** Service layer (interfaces only)
- **Location:** `src/lib/auth/rbac.ts`, `src/lib/auth/config.ts`
- **Complexity:** Medium (14k LOC in auth files)
- **Why High Priority:**
  - Core security system
  - Used by every module
  - Complex permission hierarchies
  - Role level calculations
  - Currently lacks domain layer
- **Business Rules to Extract:**
  - Permission checking algorithms
  - Role hierarchy (Admin > HR Manager > Manager > Employee)
  - Resource-specific permission logic
  - Role assignment validation
- **Estimated Effort:** 5 days
- **Migration Strategy:**
  1. Domain entities: `Role`, `Permission`, `RoleAssignment`
  2. Service: `RBACService` with hierarchy logic
  3. 80+ tests for all permission combinations

#### 6. JWT/Auth Module

- **Current State:** Service layer (well-tested)
- **Location:** `src/lib/auth/secure-auth-service.ts`, `src/lib/stores/jwt-auth.svelte.ts`
- **Complexity:** Medium (7.6k LOC service, 73 unit tests)
- **Why High Priority:**
  - Core security
  - Already 80% test coverage
  - Needs domain layer for token lifecycle
- **Business Rules to Extract:**
  - Token generation (access/refresh)
  - Token validation (expiry, revocation)
  - Token rotation (family-based)
  - Replay attack detection
- **Estimated Effort:** 3 days
- **Migration Strategy:**
  1. Domain entities: `AccessToken`, `RefreshToken`, `TokenFamily`
  2. Service: Extract from existing `secure-auth-service`
  3. Add 30+ domain tests

#### 7. Leave Management Module (Separate from Leave Request)

- **Current State:** Direct GraphQL
- **Location:** `src/lib/graphql/leave-management/`
- **Complexity:** Medium (818 LOC)
- **Why High Priority:**
  - Balance calculations
  - Accrual logic
  - Manager approval chains
  - Integration with Leave Request domain
- **Business Rules to Extract:**
  - Leave balance calculations
  - Accrual rate logic
  - Carry-over rules
  - Approval chain validation
- **Estimated Effort:** 4 days
- **Migration Strategy:**
  1. Domain entities: `LeaveBalance`, `LeaveType`, `AccrualRate`
  2. Service: `LeaveBalanceService`
  3. Integrate with existing `LeaveRequestService`
  4. 60+ tests

#### 8. Reports Module

- **Current State:** Direct GraphQL
- **Location:** `src/lib/graphql/reports/`, `src/routes/dashboard/management/reports/`
- **Complexity:** Medium (1091 LOC)
- **Why High Priority:**
  - Complex data aggregation
  - Multiple report types
  - Performance-sensitive
  - Export logic (CSV, PDF)
- **Business Rules to Extract:**
  - Report generation algorithms
  - Data aggregation logic
  - Filter validation
  - Date range calculations
- **Estimated Effort:** 4 days
- **Migration Strategy:**
  1. Domain entities: `Report`, `ReportFilter`, `ReportData`
  2. Service: `ReportService` with aggregation methods
  3. 50+ tests for different report types

---

### 🟡 Medium Priority (6 modules)

#### 1. Notifications Module

- **Complexity:** Medium (1089 LOC)
- **Current State:** Direct GraphQL
- **Why Medium Priority:** Event-driven logic, but relatively stable
- **Effort:** 3 days

#### 2. Documents Module

- **Complexity:** Low-Medium (9 route files)
- **Current State:** Direct GraphQL
- **Why Medium Priority:** File operations, assignment logic
- **Effort:** 2 days

#### 3. Activity Logs/Audit Module

- **Complexity:** Medium (570 LOC)
- **Current State:** Service layer partial
- **Why Medium Priority:** Complex rollback logic, but already has service patterns
- **Effort:** 3 days

#### 4. Team Reports Module

- **Complexity:** Medium (1227 LOC)
- **Current State:** Direct GraphQL
- **Why Medium Priority:** Aggregation logic
- **Effort:** 3 days

---

### 🟢 Low Priority (9 modules)

Simple CRUD operations, rarely changed, or already stable:

- **Team Management** (709 LOC, 2 days)
- **Settings** (1009 LOC, 2 days)
- **Onboarding** (4 files, 2 days)
- **Training** (4 files, 2 days)
- **Compliance** (3 directories, 2 days)
- **Emergency Contacts** (inline, 1 day)
- **Vehicles** (inline, 1 day)
- **Skills/Certifications** (inline, 1 day)

---

## Prioritization Criteria

### High Priority Indicators

- ✅ Complex business logic
- ✅ Frequently changed/extended
- ✅ Hard to test (logic in components)
- ✅ Core functionality
- ✅ Security-critical
- ✅ Low test coverage (<30%)

### Low Priority Indicators

- ✅ Simple CRUD operations
- ✅ Rarely modified
- ✅ Already well-tested (>40%)
- ✅ Stable patterns
- ✅ Secondary features

---

## Migration Roadmap

### Phase 1: Foundation (Weeks 1-2)

**Focus:** Core security and task management

1. **Tasks Module** (5 days) - Most frequently changed
2. **RBAC Module** (5 days) - Required by all modules

**Deliverables:**

- Task domain with full workflow logic
- RBAC domain with permission hierarchies
- 160+ new tests

---

### Phase 2: Performance Management (Weeks 3-4)

**Focus:** HR core functions

3. **Performance Reviews** (6 days) - Consolidate duplicates
4. **Goals Module** (4 days) - Linked to performance

**Deliverables:**

- Performance review domain with ratings
- Goals domain with progress tracking
- 160+ new tests

---

### Phase 3: Calendar & Events (Weeks 5-6)

**Focus:** Complex workflows

5. **Events/Calendar** (6 days) - Complex recurrence
6. **Leave Management** (4 days) - Balance calculations

**Deliverables:**

- Event domain with recurrence logic
- Leave balance domain
- 150+ new tests

---

### Phase 4: Auth & Reporting (Weeks 7-8)

**Focus:** Security and analytics

7. **JWT/Auth** (3 days) - Domain layer for tokens
8. **Reports** (4 days) - Data aggregation
9. **Notifications** (3 days) - Event-driven

**Deliverables:**

- Auth domain with token lifecycle
- Reports domain with aggregation
- 140+ new tests

---

### Phase 5: Remaining Modules (Weeks 9-10+)

**Focus:** Polish and complete coverage

- Medium priority modules (3-4 days each)
- Low priority modules (1-2 days each)

---

## Test Coverage Goals

| Module Tier     | Current Avg | Target    | Increase |
| --------------- | ----------- | --------- | -------- |
| High Priority   | 20%         | 85%+      | +65%     |
| Medium Priority | 25%         | 75%+      | +50%     |
| Low Priority    | 20%         | 60%+      | +40%     |
| **Overall**     | **~25%**    | **~75%+** | **+50%** |

---

## Benefits of Hexagonal Architecture

### Proven Benefits (Employee, Department, Leave Request)

1. **Type Safety:** Zero `any` types, 100% strict TypeScript
2. **Testability:** 95%+ test coverage, domain tests run in milliseconds
3. **Maintainability:** Changes to GraphQL schema isolated to adapters
4. **Validation:** Domain rules enforced at entity creation
5. **Error Handling:** Result pattern eliminates exceptions in happy path
6. **Refactoring Safety:** Domain tests prevent regressions

### Expected Benefits (Remaining Modules)

- **Reduced Bug Rate:** Domain validation catches errors early
- **Faster Development:** Service layer reduces code duplication
- **Better Onboarding:** Clear architecture makes codebase navigable
- **Migration Safety:** Domain layer independent of framework changes
- **Business Logic Clarity:** All rules in one place (not scattered in UI)

---

## Risks & Mitigation

### Risk 1: Over-Engineering Simple Modules

**Mitigation:** Use lightweight patterns for Low Priority modules (simple service layer, no complex value objects)

### Risk 2: Migration Breaking Changes

**Mitigation:** Run existing tests throughout migration, use feature flags for gradual rollout

### Risk 3: Team Knowledge Gap

**Mitigation:** Reference Employee module as living documentation, pair programming sessions

### Risk 4: Time Estimates Inaccurate

**Mitigation:** Track actual vs estimated time for Phase 1, adjust roadmap accordingly

---

## Success Metrics

### Code Quality

- **Type Safety:** 0 `any` types in new modules
- **Test Coverage:** 75%+ overall, 85%+ for High Priority
- **Duplication:** Eliminate duplicate modules (Performance, Leave Management)

### Developer Experience

- **Build Time:** Domain tests run in <100ms
- **Onboarding Time:** New developers productive in 2 days (vs 5 days)
- **Bug Resolution:** 50% faster due to isolated domain logic

### Business Impact

- **Feature Velocity:** 30% faster feature development (no UI logic refactoring)
- **Production Bugs:** 40% reduction (domain validation catches errors)
- **Maintenance Cost:** 25% reduction (clear architecture reduces debugging time)

---

## Appendix A: Module Complexity Matrix

| Module      | Files | LOC  | Tests | Business Rules | DB Tables | API Endpoints | Complexity Score |
| ----------- | ----- | ---- | ----- | -------------- | --------- | ------------- | ---------------- |
| Performance | 30+   | 1949 | 15    | 12             | 5         | 8             | 9.5/10           |
| Events      | 25+   | 1187 | 20    | 10             | 7         | 12            | 9.0/10           |
| Goals       | 20+   | 1050 | 10    | 8              | 3         | 6             | 8.0/10           |
| Reports     | 18+   | 1091 | 12    | 6              | 2         | 5             | 7.5/10           |
| Tasks       | 26    | 974  | 15    | 9              | 4         | 8             | 7.5/10           |
| Leave Mgmt  | 15+   | 818  | 20    | 7              | 4         | 6             | 7.0/10           |

(Complexity Score: 1=Simple CRUD, 10=Highly complex with many interdependencies)

---

## Appendix B: Cross-Module Dependencies

```
RBAC ─────────┬──────────────────> All Modules (security)
              │
JWT/Auth ─────┤
              │
Employee ─────┼──────────────────> Departments, Leave, Tasks, Goals
              │
Departments ──┼──────────────────> Leave, Tasks, Performance
              │
Leave Req ────┼──────────────────> Leave Management (balance)
              │
Goals ────────┴──────────────────> Performance Reviews
```

**Critical Path:** RBAC → Auth → Employee → Other Modules

**High Priority Modules** should be migrated first to establish patterns for dependent modules.

---

## Appendix C: File Structure Reference

### Standard Hexagonal Module Structure

```
src/
├── domain/
│   └── ModuleName/
│       ├── entities/
│       │   ├── Module.ts
│       │   ├── Module.test.ts
│       │   └── index.ts
│       ├── value-objects/
│       │   ├── ModuleProperty.ts
│       │   ├── ModuleProperty.test.ts
│       │   └── index.ts
│       ├── errors/
│       │   └── ModuleErrors.ts
│       └── index.ts
├── services/
│   ├── ModuleService.ts
│   ├── ModuleService.test.ts
│   └── ports/
│       └── ModuleRepository.ts (interface)
├── adapters/
│   └── graphql/
│       └── GraphQLModuleAdapter.ts
└── lib/
    └── server/
        └── services.ts (factory functions)
```

---

## Appendix D: Contract Testing Status

**Total Contract Tests:** 42 tests (from `tests/contract/`)

Coverage by module:

- ✅ Activity Logs: 10 tests
- ✅ Audit Logs: 9 tests (rollback, approval)
- ✅ Auth: 3 tests
- ✅ Departments: 2 tests
- ✅ Documents: 4 tests
- ✅ Dashboard: 2 tests
- ⚠️ Tasks: 0 tests
- ⚠️ Goals: 0 tests
- ⚠️ Performance: 0 tests
- ⚠️ Events: 0 tests

**Recommendation:** Add contract tests for High Priority modules during migration.

---

## Conclusion

The SvelteHR codebase has a solid foundation with 3 modules already following hexagonal architecture. The remaining 20 modules represent approximately **16-20 person-weeks** of effort to migrate.

**Key Recommendations:**

1. **Prioritize High Priority modules** (8 modules, ~10 weeks) for maximum business impact
2. **Use Employee module as reference** for all new migrations
3. **Track metrics** (test coverage, bug rate, feature velocity) to validate benefits
4. **Start with Tasks and RBAC** (Phase 1) as they are foundational

**Expected Outcome:**

By completing this migration, the codebase will achieve:

- 75%+ test coverage (from ~25%)
- 40% reduction in production bugs
- 30% faster feature development
- Clear architecture for onboarding new developers

---

**Next Steps:**

1. Team lead approval of roadmap
2. Begin Phase 1 (Tasks + RBAC modules)
3. Track actual vs estimated effort
4. Adjust roadmap after Phase 1 completion

---

**Document Version:** 1.0
**Last Updated:** 2026-02-11
**Status:** Awaiting Approval
