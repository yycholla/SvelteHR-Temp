# Implementation Plan: Management Pages Repair & Admin Implementation

**Branch**: `016-repair-management-pages` | **Date**: 2025-09-30 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/home/chanway/Projects/SvelteHR/specs/016-repair-management-pages/spec.md`

## Execution Flow (/plan command scope)

```
1. Load feature spec from Input path ✅
   → Spec loaded successfully with 5 clarifications resolved
2. Fill Technical Context ✅
   → Project Type: web (SvelteKit frontend + PostGraphile backend)
   → Structure Decision: Option 2 (frontend/backend)
3. Fill the Constitution Check section ✅
4. Evaluate Constitution Check section ✅
   → Initial violations: None - fully compliant
   → Update Progress Tracking: Initial Constitution Check PASS
5. Execute Phase 0 → research.md ✅
   → All clarifications resolved, no unknowns
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, CLAUDE.md ✅
7. Re-evaluate Constitution Check section ✅
   → Post-Design violations: None - fully compliant
   → Update Progress Tracking: Post-Design Constitution Check PASS
8. Plan Phase 2 → Task generation approach described ✅
9. STOP - Ready for /tasks command ✅
```

**IMPORTANT**: The /plan command STOPS at step 9. Phase 2 is executed by /tasks command.

## Summary

This feature repairs existing management pages, implements comprehensive manager CRUD functionality, creates a full admin suite (User Management, System Settings, Audit Logs, Analytics Dashboard, Compliance Reports), fixes theme consistency across all cards and UI elements, and validates database schema with proper relationships. Managers get full CRUD access to their department's data with automatic permission refresh on department transfers. Admins have unrestricted organization-wide access. Theme audit covers all management pages, admin pages, and analytics cards to ensure proper light/dark mode adaptation.

## Technical Context

**Language/Version**: TypeScript 5.0 with Svelte 5.0 (runes mode), Node.js
**Primary Dependencies**: SvelteKit 2.22.0, PostGraphile (GraphQL), PostgreSQL, Svelte 5 runes, Tailwind CSS 4.0, Better Auth 1.3.4
**Storage**: PostgreSQL with GelDB (PostGraphile), Row-Level Security (RLS), Redis caching
**Testing**: Playwright (E2E), Vitest (unit), browser-based component testing
**Target Platform**: Web (browsers), development on localhost:5173, PostGraphile on localhost:5555
**Project Type**: web - frontend (SvelteKit) + backend (PostGraphile GraphQL)
**Performance Goals**: GraphQL <200ms, page load <1s, Redis caching for frequent queries
**Constraints**: >90% test coverage, RBAC at database and UI level, JWT authentication
**Scale/Scope**: 5 admin pages, 5 management pages, theme audit across all pages, database schema validation

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

### Test-First Development ✅

- Playwright E2E tests for all user journeys (manager CRUD, admin pages, theme switching)
- Vitest unit tests for RBAC utility functions, permission checks
- Contract tests for GraphQL operations
- Target: >90% coverage
- **Compliance**: All tests written before implementation, RED-GREEN-REFACTOR cycle

### Type Safety First ✅

- TypeScript 5.0 strict mode enabled
- All GraphQL operations have generated types
- No `any` types - proper interfaces for UserSession, permissions, theme modes
- Component props fully typed with Svelte 5 runes
- **Compliance**: Full type safety across codebase

### Security by Design ✅

- Row-Level Security (RLS) at database level for all tables
- JWT authentication with 4-tier RBAC (Admin 100, HR 80, Manager 60, Employee 20)
- Manager department filtering enforced server-side
- Admin role precedence logic validated
- Audit logging for all management actions (FR-028)
- Input validation with Zod schemas
- **Compliance**: RBAC enforced at database, API, and UI layers

### Performance Standards ✅

- GraphQL operations <200ms (FR-025 constraint)
- Redis caching for frequently accessed data (department lists, user permissions)
- Proper indexing on foreign keys (users.department_id, departments.manager_id)
- Bundle optimization with code splitting for admin pages
- **Compliance**: Performance targets aligned with constitution

### Component Architecture ✅

- Svelte 5 runes (`$state`, `$derived`, `$props`) for all reactive state
- shadcn/ui patterns for UI components
- Server-side data loading via `+page.server.ts` (no client-side API calls)
- Theme-aware components with proper CSS variable usage
- **Compliance**: Modern Svelte 5 architecture, server-side data loading

### MCP-First Development ✅

- Use Serena MCP for code discovery (`get_symbols_overview`, `find_symbol`, `find_referencing_symbols`)
- Use Serena MCP for surgical edits (`replace_symbol_body`, `insert_after_symbol`)
- Use Archon MCP for task management (primary), TodoWrite secondary
- Use `think_about_task_adherence` before implementation
- Use `think_about_whether_you_are_done` upon completion
- **Compliance**: MCP tools integrated into workflow

**Initial Check**: ✅ PASS - No violations detected
**Post-Design Check**: ✅ PASS - No violations detected

## Project Structure

### Documentation (this feature)

```
specs/016-repair-management-pages/
├── plan.md              # This file (/plan command output) ✅
├── research.md          # Phase 0 output (/plan command) ✅
├── data-model.md        # Phase 1 output (/plan command) ✅
├── quickstart.md        # Phase 1 output (/plan command) ✅
├── contracts/           # Phase 1 output (/plan command) ✅
│   ├── graphql-schema.graphql
│   ├── manager-operations.graphql
│   └── admin-operations.graphql
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)

```
# Web application structure (frontend + backend)
backend/
├── src/
│   ├── schema.sql         # Database migrations (departments, users, leave_requests, etc.)
│   └── server.ts          # PostGraphile server
└── tests/
    └── contract/          # GraphQL contract tests

frontend/src/
├── routes/
│   └── dashboard/
│       ├── management/    # Manager pages (leave-approvals, reviews, goals, reports, teams)
│       └── admin/         # Admin pages (users, settings, audit, analytics, compliance)
├── lib/
│   ├── server/
│   │   └── rbac-utils.ts  # Manager RBAC functions (canEditDepartment, etc.)
│   ├── graphql/           # GraphQL operations stubs → implementations
│   ├── components/
│   │   └── ui/            # Theme-aware components
│   └── stores/
│       └── theme.ts       # Theme state management
└── tests/
    ├── e2e/               # Playwright tests for user journeys
    └── unit/              # Vitest tests for RBAC, utilities
```

**Structure Decision**: Option 2 - Web application (frontend/backend detected)

## Phase 0: Outline & Research

**Objective**: Resolve all technical unknowns and establish implementation approach.

### Research Questions

1. **Manager CRUD Operations**: How to implement full CRUD for managers on team data?
   - **Decision**: Extend existing GraphQL operations stubs with proper implementations
   - **Rationale**: PostGraphile auto-generates mutations, need to add RLS policies
   - **Alternatives**: Custom resolvers (rejected - adds complexity, PostGraphile RLS sufficient)

2. **Admin Pages Architecture**: Best practices for admin suite implementation?
   - **Decision**: Dedicated `/dashboard/admin/` route structure with lazy loading
   - **Rationale**: Code splitting, clear separation from management pages, RBAC guard at route level
   - **Alternatives**: Modal-based admin (rejected - poor UX for complex admin tasks)

3. **Theme Consistency Strategy**: How to ensure theme consistency across all cards?
   - **Decision**: Centralized CSS custom properties, component audit, theme store integration
   - **Rationale**: DRY principle, single source of truth, reactive theme updates
   - **Alternatives**: Per-component theme classes (rejected - maintenance burden, inconsistency risk)

4. **Department Transfer Detection**: How to detect mid-session department changes?
   - **Decision**: Real-time GraphQL subscriptions + periodic permission refresh
   - **Rationale**: Immediate UX response, no logout required, aligns with FR-029
   - **Alternatives**: Manual refresh (rejected - poor UX), logout required (rejected - disrupts workflow)

5. **Database Schema Validation**: How to validate schema on deployment?
   - **Decision**: Migration scripts with validation checks, startup health check
   - **Rationale**: Fail-fast on missing tables/relationships, explicit error messages
   - **Alternatives**: Runtime discovery (rejected - masks schema issues until usage)

### Technology Stack Decisions

**GraphQL Operations**: Migrate from stubs to full implementations
- Stubs exist: `leave-management-operations.ts`, `performance-management-operations.ts`, `goals-okrs-operations.ts`, `reports-operations.ts`
- Implementation: Add actual GraphQL queries/mutations with RLS filtering

**RBAC Utilities**: Extend `rbac-utils.ts`
- Existing: `canEditDepartment()`, `canEditEmployee()`
- Add: Manager CRUD permission checks, admin page guards, role precedence logic

**Theme System**: Leverage Tailwind CSS 4.0 + custom properties
- Existing: `class="dark:bg-gray-800"` patterns
- Add: Comprehensive CSS variable system, theme-aware component wrappers

**Database Migrations**: SQL scripts for schema validation
- Check: Tables exist (departments, users, leave_requests, performance_reviews, goals, tasks, reports)
- Check: Foreign keys (users.department_id → departments.id, departments.manager_id → users.id)
- Check: Indexes on foreign keys for performance

**Output**: `research.md` - 5 decisions documented

## Phase 1: Design & Contracts

_Prerequisites: research.md complete ✅_

### 1. Data Model (`data-model.md`)

**Entities from Spec**:

- **Manager**: User with `role='manager'`, `department_id` assigned
- **Admin**: User with `role='admin'`, unrestricted access
- **Department**: `id`, `name`, `description`, `manager_id` (FK to users.id)
- **User**: `id`, `email`, `role`, `department_id` (FK to departments.id)
- **LeaveRequest**: `id`, `user_id` (FK), `department_id` (FK), `status`, `start_date`, `end_date`
- **PerformanceReview**: `id`, `reviewee_id` (FK), `reviewer_id` (FK), `department_id` (FK), `status`, `rating`
- **Goal**: `id`, `user_id` (FK), `department_id` (FK), `title`, `description`, `progress`, `quarter`, `year`
- **Task**: `id`, `assignee_id` (FK), `assigner_id` (FK), `department_id` (FK), `title`, `status`
- **Report**: `id`, `creator_id` (FK), `department_id` (FK), `type`, `data`, `created_at`
- **AuditLog**: `id`, `user_id` (FK), `action`, `resource`, `timestamp`
- **SystemSetting**: `id`, `key`, `value`, `category`

**Validation Rules**:
- Manager department assignment required (FR-026)
- Admin role precedence over manager (FR-030)
- Foreign key constraints enforced (FR-024)

**State Transitions**:
- Leave Request: draft → pending → approved/rejected
- Performance Review: draft → in_progress → completed
- Goal: active → completed → archived

### 2. API Contracts (`/contracts/`)

**GraphQL Schema**: `graphql-schema.graphql`
- Extended PostGraphile schema with custom RLS policies
- Manager-scoped queries/mutations
- Admin unrestricted queries/mutations

**Manager Operations**: `manager-operations.graphql`
```graphql
# Manager CRUD for their department
query GetDepartmentLeaveRequests($departmentId: UUID!) { ... }
mutation ApproveLeaveRequest($requestId: UUID!) { ... }
mutation CreatePerformanceReview($revieweeId: UUID!, $data: ReviewInput!) { ... }
mutation UpdateGoal($goalId: UUID!, $data: GoalInput!) { ... }
mutation AssignTask($assigneeId: UUID!, $data: TaskInput!) { ... }
mutation GenerateDepartmentReport($departmentId: UUID!, $type: ReportType!) { ... }
```

**Admin Operations**: `admin-operations.graphql`
```graphql
# Admin full access across all departments
query GetAllDepartments { ... }
mutation CreateUser($data: UserInput!) { ... }
mutation UpdateSystemSetting($key: String!, $value: String!) { ... }
query GetAuditLogs($filters: AuditFilterInput) { ... }
query GetAnalyticsDashboard { ... }
mutation GenerateComplianceReport($type: ComplianceReportType!) { ... }
```

### 3. Contract Tests

**Manager Operations Tests**: `backend/tests/contract/manager-operations.test.ts`
- Test department-scoped data access
- Test unauthorized access prevention
- Test department transfer permission refresh

**Admin Operations Tests**: `backend/tests/contract/admin-operations.test.ts`
- Test unrestricted data access
- Test admin page operations
- Test role precedence logic

**Theme Tests**: `frontend/tests/e2e/theme-consistency.spec.ts`
- Test light mode rendering on all pages
- Test dark mode rendering on all pages
- Test theme switching without page refresh

**Tests Status**: RED (no implementation yet) ✅

### 4. Test Scenarios from User Stories

**Manager CRUD Journey**: `frontend/tests/e2e/manager-crud.spec.ts`
- Login as manager
- View department leave requests
- Approve/reject requests
- Create/edit performance review
- Create/assign goal
- Assign task to team member
- Generate department report

**Admin Suite Journey**: `frontend/tests/e2e/admin-suite.spec.ts`
- Login as admin
- Navigate to User Management → create user
- Navigate to System Settings → toggle feature
- Navigate to Audit Logs → filter by date
- Navigate to Analytics Dashboard → view metrics
- Navigate to Compliance Reports → generate report

**Theme Consistency Journey**: `frontend/tests/e2e/theme-audit.spec.ts`
- Navigate to each management page (leave-approvals, reviews, goals, reports, teams)
- Navigate to each admin page (users, settings, audit, analytics, compliance)
- Toggle theme on each page
- Verify card backgrounds, borders, shadows, text colors adapt

### 5. Update Agent File (`CLAUDE.md`)

Running agent context update script...

(Note: Agent file already exists with comprehensive documentation. This phase adds new technical context about manager CRUD, admin suite, and theme system.)

**Output**:
- ✅ `data-model.md` - 10 entities with validation rules
- ✅ `contracts/` - 3 GraphQL contract files
- ✅ `backend/tests/contract/` - Failing contract tests
- ✅ `frontend/tests/e2e/` - Failing E2E test scenarios
- ✅ `quickstart.md` - Test execution guide
- ✅ `CLAUDE.md` - Updated with feature context (via script)

## Phase 2: Task Planning Approach

_This section describes what the /tasks command will do - DO NOT execute during /plan_

**Task Generation Strategy**:

1. **Load template**: `.specify/templates/tasks-template.md`
2. **Generate from Phase 1 artifacts**:
   - Each GraphQL operation → contract test task [P]
   - Each entity → database migration task [P]
   - Each user story → E2E test task
   - Implementation tasks to make tests pass

**Ordering Strategy**:

```
Priority 1: Database Foundation
- T001: Create database migration for tasks table [P]
- T002: Validate database schema (departments, users, FK constraints) [P]
- T003: Add indexes on foreign keys (performance) [P]

Priority 2: Manager CRUD (TDD Order)
- T004: Write contract tests for manager operations [P]
- T005: Implement leave approval GraphQL operations
- T006: Implement performance review CRUD operations
- T007: Implement goal CRUD operations
- T008: Implement task assignment operations
- T009: Implement report generation operations
- T010: Write E2E test for manager CRUD journey
- T011: Implement manager CRUD UI components (make E2E pass)

Priority 3: Admin Suite (TDD Order)
- T012: Write contract tests for admin operations [P]
- T013: Create admin route guards (RBAC) [P]
- T014: Implement User Management page
- T015: Implement System Settings page
- T016: Implement Audit Logs page
- T017: Implement Analytics Dashboard page
- T018: Implement Compliance Reports page
- T019: Write E2E test for admin suite journey
- T020: Implement admin navigation in sidebar (badges)

Priority 4: Theme Consistency (TDD Order)
- T021: Write E2E test for theme audit [P]
- T022: Create centralized CSS custom properties for theme
- T023: Audit and fix management pages (leave-approvals, reviews, goals, reports, teams)
- T024: Audit and fix admin pages (all 5 pages)
- T025: Audit and fix analytics/dashboard cards
- T026: Implement theme store with reactive updates

Priority 5: RBAC & Permissions (TDD Order)
- T027: Write unit tests for RBAC utilities [P]
- T028: Implement role precedence logic (admin > manager)
- T029: Implement department transfer detection
- T030: Implement automatic permission refresh
- T031: Add audit logging for management actions

Priority 6: Integration & Validation
- T032: Run all contract tests (expect PASS)
- T033: Run all E2E tests (expect PASS)
- T034: Run all unit tests (expect PASS)
- T035: Execute quickstart.md validation
- T036: Performance validation (GraphQL <200ms)
```

**Estimated Output**: 36 numbered, ordered tasks in tasks.md

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation

_These phases are beyond the scope of the /plan command_

**Phase 3**: Task execution (/tasks command creates tasks.md)
**Phase 4**: Implementation (execute tasks.md following TDD and constitutional principles)
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking

_Fill ONLY if Constitution Check has violations that must be justified_

**No violations detected** - this feature aligns with all constitutional principles:
- TDD with >90% coverage
- TypeScript strict mode throughout
- Row-Level Security at database
- GraphQL <200ms performance
- Svelte 5 runes component architecture
- MCP-First development workflow

## Progress Tracking

_This checklist is updated during execution flow_

**Phase Status**:

- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning complete (/plan command - approach described)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:

- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [x] Complexity deviations documented (N/A - no deviations)

---

_Based on Constitution v1.1.0 - See `.specify/memory/constitution.md`_
