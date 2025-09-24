# Tasks: Comprehensive HR User Journeys System

**Input**: Design documents from `/specs/010-let-s-define/`
**Prerequisites**: plan.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓, quickstart.md ✓

## Execution Flow (main)

```
1. Load plan.md from feature directory ✓
   → Tech stack: SvelteKit + PostGraphile + PostgreSQL + TypeScript
   → Structure: Web application (frontend/backend separation)
2. Load optional design documents ✓:
   → data-model.md: 13 entities (2 extend, 11 new) → model tasks
   → contracts/: GraphQL schema → contract test tasks
   → quickstart.md: 16 test scenarios → integration test tasks
3. Generate tasks by category ✓:
   → Setup: project dependencies, linting, database setup
   → Tests: contract tests (GraphQL), integration tests (user journeys)
   → Core: database migrations, PostGraphile plugins, components
   → Integration: authentication, role-based access, workflows
   → Polish: unit tests, performance optimization, documentation
4. Apply task rules ✓:
   → Different files = mark [P] for parallel
   → Database first, then API, then frontend (dependency order)
   → Tests before implementation (TDD)
5. Number tasks sequentially T001-T052 ✓
6. Generate dependency graph ✓
7. Create parallel execution examples ✓
8. Validate task completeness ✓:
   → All GraphQL operations have tests ✓
   → All entities have migrations ✓
   → All user journeys have E2E tests ✓
9. Return: SUCCESS (tasks ready for execution) ✓
```

## Format: `[ID] [P?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- File paths adjusted for web application structure (frontend/backend)

## Path Conventions

- **Backend**: `backend/src/`, `backend/migrations/`, `backend/tests/`
- **Frontend**: `src/`, `src/lib/`, `src/routes/`, `tests/`
- **Database**: `migrations/`, `backend/migrations/`

## Phase 3.1: Setup & Environment

- [ ] T001 [P] Update backend package.json with new PostGraphile plugins and dependencies
- [ ] T002 [P] Update frontend package.json with new Svelte components and GraphQL operations dependencies
- [ ] T003 [P] Configure ESLint and Prettier rules for HR domain TypeScript code
- [ ] T004 [P] Set up database migration environment and scripts in backend/migrations/
- [ ] T005 [P] Initialize GraphQL codegen configuration for new schema types

## Phase 3.2: Contract Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3

**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### GraphQL Contract Tests (Backend)
- [ ] T006 [P] Contract test TimeEntry queries and mutations in backend/tests/contract/test_time_entries_graphql.js
- [ ] T007 [P] Contract test LeaveRequest queries and mutations in backend/tests/contract/test_leave_requests_graphql.js
- [ ] T008 [P] Contract test Goal queries and mutations in backend/tests/contract/test_goals_graphql.js
- [ ] T009 [P] Contract test PerformanceReview queries and mutations in backend/tests/contract/test_performance_reviews_graphql.js
- [ ] T010 [P] Contract test Expense queries and mutations in backend/tests/contract/test_expenses_graphql.js
- [ ] T011 [P] Contract test Project queries and mutations in backend/tests/contract/test_projects_graphql.js
- [ ] T012 [P] Contract test Training queries and mutations in backend/tests/contract/test_training_graphql.js
- [ ] T013 [P] Contract test Attendance queries and mutations in backend/tests/contract/test_attendance_graphql.js
- [ ] T014 [P] Contract test Notification queries and mutations in backend/tests/contract/test_notifications_graphql.js
- [ ] T015 [P] Contract test Dashboard queries (all roles) in backend/tests/contract/test_dashboards_graphql.js

### Integration Tests (User Journeys)
- [ ] T016 [P] Integration test Employee Dashboard Access in tests/integration/test_employee_dashboard.spec.ts
- [ ] T017 [P] Integration test Time Tracking Workflow in tests/integration/test_time_tracking_flow.spec.ts
- [ ] T018 [P] Integration test Goal Management in tests/integration/test_goal_management.spec.ts
- [ ] T019 [P] Integration test Leave Request Process in tests/integration/test_leave_request_flow.spec.ts
- [ ] T020 [P] Integration test Performance Review Self-Assessment in tests/integration/test_performance_review.spec.ts
- [ ] T021 [P] Integration test Manager Approval Workflows in tests/integration/test_manager_approvals.spec.ts
- [ ] T022 [P] Integration test Team Analytics and Reporting in tests/integration/test_team_reporting.spec.ts
- [ ] T023 [P] Integration test HR Employee Lifecycle Management in tests/integration/test_hr_lifecycle.spec.ts
- [ ] T024 [P] Integration test Organizational Structure Management in tests/integration/test_org_structure.spec.ts
- [ ] T025 [P] Integration test System Admin User Management in tests/integration/test_system_admin.spec.ts

## Phase 3.3: Database Schema & Migrations (ONLY after tests are failing)

### Schema Extensions
- [ ] T026 [P] Database migration: Extend users table with HR fields in migrations/20250125140001_extend_users_table.sql
- [ ] T027 [P] Database migration: Extend departments table with hierarchy in migrations/20250125140002_extend_departments_table.sql

### New Entity Migrations
- [ ] T028 [P] Database migration: Create time_entries table in migrations/20250125140003_create_time_entries.sql
- [ ] T029 [P] Database migration: Create leave_requests table in migrations/20250125140004_create_leave_requests.sql
- [ ] T030 [P] Database migration: Create goals table in migrations/20250125140005_create_goals.sql
- [ ] T031 [P] Database migration: Create performance_reviews table in migrations/20250125140006_create_performance_reviews.sql
- [ ] T032 [P] Database migration: Create performance_review_cycles table in migrations/20250125140007_create_review_cycles.sql
- [ ] T033 [P] Database migration: Create projects table in migrations/20250125140008_create_projects.sql
- [ ] T034 [P] Database migration: Create expenses table in migrations/20250125140009_create_expenses.sql
- [ ] T035 [P] Database migration: Create training_programs table in migrations/20250125140010_create_training_programs.sql
- [ ] T036 [P] Database migration: Create training_enrollments table in migrations/20250125140011_create_training_enrollments.sql
- [ ] T037 [P] Database migration: Create attendance_records table in migrations/20250125140012_create_attendance_records.sql
- [ ] T038 [P] Database migration: Create notifications table in migrations/20250125140013_create_notifications.sql

### RLS Policies & Indexes
- [ ] T039 Apply Row-Level Security policies for all new tables in migrations/20250125140014_add_rls_policies.sql
- [ ] T040 Add database indexes for performance optimization in migrations/20250125140015_add_indexes.sql

## Phase 3.4: Backend API Implementation

### PostGraphile Plugins & Resolvers
- [ ] T041 PostGraphile plugin: Enhanced user hierarchy and role-based resolvers in backend/src/plugins/user-hierarchy-plugin.ts
- [ ] T042 PostGraphile plugin: Time tracking business logic and approval workflows in backend/src/plugins/time-tracking-plugin.ts
- [ ] T043 PostGraphile plugin: Leave request approval workflows in backend/src/plugins/leave-request-plugin.ts
- [ ] T044 PostGraphile plugin: Goal management and progress tracking in backend/src/plugins/goal-management-plugin.ts
- [ ] T045 PostGraphile plugin: Performance review cycles and workflows in backend/src/plugins/performance-review-plugin.ts
- [ ] T046 PostGraphile plugin: Dashboard aggregation queries for all roles in backend/src/plugins/dashboard-plugin.ts

### Authentication & Authorization
- [ ] T047 Extend authentication middleware with role hierarchy support in backend/src/middleware/auth-middleware.ts
- [ ] T048 Implement hierarchical permission validation in backend/src/middleware/permissions-middleware.ts

## Phase 3.5: Frontend Implementation

### GraphQL Operations
- [ ] T049 [P] Time tracking GraphQL operations in src/lib/graphql/time-tracking-operations.ts
- [ ] T050 [P] Leave request GraphQL operations in src/lib/graphql/leave-request-operations.ts
- [ ] T051 [P] Goal management GraphQL operations in src/lib/graphql/goal-management-operations.ts
- [ ] T052 [P] Performance review GraphQL operations in src/lib/graphql/performance-review-operations.ts
- [ ] T053 [P] Expense management GraphQL operations in src/lib/graphql/expense-management-operations.ts
- [ ] T054 [P] Training management GraphQL operations in src/lib/graphql/training-management-operations.ts
- [ ] T055 [P] Attendance tracking GraphQL operations in src/lib/graphql/attendance-tracking-operations.ts
- [ ] T056 [P] Dashboard GraphQL operations in src/lib/graphql/dashboard-operations.ts

### Base Components
- [ ] T057 [P] TimeEntryForm component in src/lib/components/time-tracking/TimeEntryForm.svelte
- [ ] T058 [P] TimeEntryList component in src/lib/components/time-tracking/TimeEntryList.svelte
- [ ] T059 [P] LeaveRequestForm component in src/lib/components/leave-management/LeaveRequestForm.svelte
- [ ] T060 [P] LeaveRequestCard component in src/lib/components/leave-management/LeaveRequestCard.svelte
- [ ] T061 [P] GoalCard component in src/lib/components/goal-management/GoalCard.svelte
- [ ] T062 [P] GoalProgressTracker component in src/lib/components/goal-management/GoalProgressTracker.svelte
- [ ] T063 [P] PerformanceReviewForm component in src/lib/components/performance/PerformanceReviewForm.svelte
- [ ] T064 [P] ExpenseForm component in src/lib/components/expense-management/ExpenseForm.svelte
- [ ] T065 [P] ApprovalQueue component in src/lib/components/approvals/ApprovalQueue.svelte

### Dashboard Components
- [ ] T066 [P] EmployeeDashboard component in src/lib/components/dashboards/EmployeeDashboard.svelte
- [ ] T067 [P] ManagerDashboard component in src/lib/components/dashboards/ManagerDashboard.svelte
- [ ] T068 [P] HRAdminDashboard component in src/lib/components/dashboards/HRAdminDashboard.svelte
- [ ] T069 [P] SystemAdminDashboard component in src/lib/components/dashboards/SystemAdminDashboard.svelte

## Phase 3.6: Page Implementation

### Employee Pages
- [ ] T070 Employee time tracking page in src/routes/dashboard/users/[userId]/time/+page.svelte
- [ ] T071 Employee time tracking server logic in src/routes/dashboard/users/[userId]/time/+page.server.ts
- [ ] T072 Employee goals page in src/routes/dashboard/users/[userId]/goals/+page.svelte
- [ ] T073 Employee goals server logic in src/routes/dashboard/users/[userId]/goals/+page.server.ts
- [ ] T074 Employee leave requests page in src/routes/dashboard/users/[userId]/leave/+page.svelte
- [ ] T075 Employee leave requests server logic in src/routes/dashboard/users/[userId]/leave/+page.server.ts
- [ ] T076 Employee performance review page in src/routes/dashboard/users/[userId]/performance/+page.svelte
- [ ] T077 Employee performance review server logic in src/routes/dashboard/users/[userId]/performance/+page.server.ts

### Manager Pages
- [ ] T078 Manager approval queue page in src/routes/dashboard/management/approvals/+page.svelte
- [ ] T079 Manager approval queue server logic in src/routes/dashboard/management/approvals/+page.server.ts
- [ ] T080 Manager team analytics page in src/routes/dashboard/management/analytics/+page.svelte
- [ ] T081 Manager team analytics server logic in src/routes/dashboard/management/analytics/+page.server.ts

### HR Admin Pages
- [ ] T082 HR employee lifecycle page in src/routes/dashboard/admin/employees/+page.svelte
- [ ] T083 HR employee lifecycle server logic in src/routes/dashboard/admin/employees/+page.server.ts
- [ ] T084 HR organizational structure page in src/routes/dashboard/admin/organization/+page.svelte
- [ ] T085 HR organizational structure server logic in src/routes/dashboard/admin/organization/+page.server.ts
- [ ] T086 HR compliance reporting page in src/routes/dashboard/admin/compliance/+page.svelte
- [ ] T087 HR compliance reporting server logic in src/routes/dashboard/admin/compliance/+page.server.ts

### System Admin Pages
- [ ] T088 System admin user management page in src/routes/dashboard/system/users/+page.svelte
- [ ] T089 System admin user management server logic in src/routes/dashboard/system/users/+page.server.ts
- [ ] T090 System admin security monitoring page in src/routes/dashboard/system/security/+page.svelte
- [ ] T091 System admin security monitoring server logic in src/routes/dashboard/system/security/+page.server.ts

## Phase 3.7: Enhanced Navigation & Workflows

- [ ] T092 Update main navigation with role-based menu items in src/lib/components/hr-app-sidebar.svelte
- [ ] T093 Implement notification system integration in src/lib/stores/notifications.ts
- [ ] T094 Add real-time updates via GraphQL subscriptions in src/lib/stores/realtime.ts

## Phase 3.8: End-to-End Testing

- [ ] T095 [P] E2E test: Complete employee time tracking workflow in tests/e2e/employee-time-tracking.spec.ts
- [ ] T096 [P] E2E test: Manager approval workflow end-to-end in tests/e2e/manager-approvals.spec.ts
- [ ] T097 [P] E2E test: Performance review cycle completion in tests/e2e/performance-review-cycle.spec.ts
- [ ] T098 [P] E2E test: HR employee onboarding process in tests/e2e/hr-onboarding.spec.ts
- [ ] T099 [P] E2E test: Cross-role data consistency verification in tests/e2e/data-consistency.spec.ts

## Phase 3.9: Polish & Optimization

- [ ] T100 [P] Unit tests for time tracking business logic in src/lib/components/time-tracking/TimeEntryForm.test.ts
- [ ] T101 [P] Unit tests for goal management logic in src/lib/components/goal-management/GoalCard.test.ts
- [ ] T102 [P] Unit tests for approval workflow logic in src/lib/components/approvals/ApprovalQueue.test.ts
- [ ] T103 Performance optimization: Database query analysis and materialized views in backend/migrations/20250125150001_performance_optimization.sql
- [ ] T104 Performance optimization: Frontend bundle analysis and lazy loading in src/lib/utils/lazy-loading.ts
- [ ] T105 [P] Update API documentation with new HR operations in docs/api/hr-user-journeys.md
- [ ] T106 [P] Update user documentation with new features in docs/user-guide/hr-features.md
- [ ] T107 Code quality: Remove duplication and refactor shared components
- [ ] T108 Execute quickstart.md validation scenarios for production readiness

## Dependencies

### Critical Path Dependencies
- **Setup First**: T001-T005 before all other tasks
- **Tests Before Implementation**: T006-T025 before T026-T108
- **Database Before API**: T026-T040 before T041-T048
- **API Before Frontend**: T041-T048 before T049-T094
- **Components Before Pages**: T057-T069 before T070-T091
- **Implementation Before E2E**: T026-T094 before T095-T099
- **Core Before Polish**: T026-T094 before T100-T108

### Parallel Execution Blocks
- **Contract Tests**: T006-T015 (can run simultaneously)
- **Integration Tests**: T016-T025 (can run simultaneously)
- **Database Migrations**: T028-T038 (can run simultaneously)
- **GraphQL Operations**: T049-T056 (can run simultaneously)
- **Base Components**: T057-T065 (can run simultaneously)
- **Dashboard Components**: T066-T069 (can run simultaneously)
- **E2E Tests**: T095-T099 (can run simultaneously)
- **Unit Tests**: T100-T102 (can run simultaneously)

### Sequential Dependencies
- T070-T071 (page + server logic must be implemented together)
- T072-T073 (page + server logic must be implemented together)
- T074-T075 (page + server logic must be implemented together)
- T076-T077 (page + server logic must be implemented together)
- T078-T079 (page + server logic must be implemented together)
- T080-T081 (page + server logic must be implemented together)
- T082-T083 (page + server logic must be implemented together)
- T084-T085 (page + server logic must be implemented together)
- T086-T087 (page + server logic must be implemented together)
- T088-T089 (page + server logic must be implemented together)
- T090-T091 (page + server logic must be implemented together)

## Parallel Execution Examples

### Phase 3.2: All Contract Tests Together
```bash
# Launch T006-T015 simultaneously (all contract tests)
Task: "Contract test TimeEntry queries and mutations in backend/tests/contract/test_time_entries_graphql.js"
Task: "Contract test LeaveRequest queries and mutations in backend/tests/contract/test_leave_requests_graphql.js"
Task: "Contract test Goal queries and mutations in backend/tests/contract/test_goals_graphql.js"
Task: "Contract test PerformanceReview queries and mutations in backend/tests/contract/test_performance_reviews_graphql.js"
Task: "Contract test Expense queries and mutations in backend/tests/contract/test_expenses_graphql.js"
Task: "Contract test Project queries and mutations in backend/tests/contract/test_projects_graphql.js"
Task: "Contract test Training queries and mutations in backend/tests/contract/test_training_graphql.js"
Task: "Contract test Attendance queries and mutations in backend/tests/contract/test_attendance_graphql.js"
Task: "Contract test Notification queries and mutations in backend/tests/contract/test_notifications_graphql.js"
Task: "Contract test Dashboard queries (all roles) in backend/tests/contract/test_dashboards_graphql.js"
```

### Phase 3.3: All Database Migrations Together
```bash
# Launch T028-T038 simultaneously (all new table migrations)
Task: "Database migration: Create time_entries table in migrations/20250125140003_create_time_entries.sql"
Task: "Database migration: Create leave_requests table in migrations/20250125140004_create_leave_requests.sql"
Task: "Database migration: Create goals table in migrations/20250125140005_create_goals.sql"
Task: "Database migration: Create performance_reviews table in migrations/20250125140006_create_performance_reviews.sql"
Task: "Database migration: Create performance_review_cycles table in migrations/20250125140007_create_review_cycles.sql"
Task: "Database migration: Create projects table in migrations/20250125140008_create_projects.sql"
Task: "Database migration: Create expenses table in migrations/20250125140009_create_expenses.sql"
Task: "Database migration: Create training_programs table in migrations/20250125140010_create_training_programs.sql"
Task: "Database migration: Create training_enrollments table in migrations/20250125140011_create_training_enrollments.sql"
Task: "Database migration: Create attendance_records table in migrations/20250125140012_create_attendance_records.sql"
Task: "Database migration: Create notifications table in migrations/20250125140013_create_notifications.sql"
```

### Phase 3.5: All GraphQL Operations Together
```bash
# Launch T049-T056 simultaneously (all GraphQL operations)
Task: "Time tracking GraphQL operations in src/lib/graphql/time-tracking-operations.ts"
Task: "Leave request GraphQL operations in src/lib/graphql/leave-request-operations.ts"
Task: "Goal management GraphQL operations in src/lib/graphql/goal-management-operations.ts"
Task: "Performance review GraphQL operations in src/lib/graphql/performance-review-operations.ts"
Task: "Expense management GraphQL operations in src/lib/graphql/expense-management-operations.ts"
Task: "Training management GraphQL operations in src/lib/graphql/training-management-operations.ts"
Task: "Attendance tracking GraphQL operations in src/lib/graphql/attendance-tracking-operations.ts"
Task: "Dashboard GraphQL operations in src/lib/graphql/dashboard-operations.ts"
```

### Phase 3.8: All E2E Tests Together
```bash
# Launch T095-T099 simultaneously (all E2E tests)
Task: "E2E test: Complete employee time tracking workflow in tests/e2e/employee-time-tracking.spec.ts"
Task: "E2E test: Manager approval workflow end-to-end in tests/e2e/manager-approvals.spec.ts"
Task: "E2E test: Performance review cycle completion in tests/e2e/performance-review-cycle.spec.ts"
Task: "E2E test: HR employee onboarding process in tests/e2e/hr-onboarding.spec.ts"
Task: "E2E test: Cross-role data consistency verification in tests/e2e/data-consistency.spec.ts"
```

## Validation Checklist

### All GraphQL Operations Covered
- [x] Time tracking (queries, mutations, subscriptions)
- [x] Leave requests (CRUD + approval workflows)
- [x] Goal management (CRUD + progress tracking)
- [x] Performance reviews (multi-stage workflow)
- [x] Expense management (CRUD + approval + receipts)
- [x] Training programs (enrollment + progress)
- [x] Attendance tracking (check-in/out + reports)
- [x] Dashboard queries (role-specific aggregations)
- [x] User management (extended hierarchy)
- [x] Notifications (real-time updates)

### All Database Entities Covered
- [x] Users table extensions (role hierarchy, employee details)
- [x] Departments table extensions (hierarchy, management)
- [x] Time entries (new table + RLS policies)
- [x] Leave requests (new table + approval workflows)
- [x] Goals (new table + review cycle integration)
- [x] Performance reviews (new table + multi-stage workflow)
- [x] Performance review cycles (new table + configuration)
- [x] Projects (new table + time allocation)
- [x] Expenses (new table + receipt management)
- [x] Training programs (new table + enrollment tracking)
- [x] Training enrollments (new table + progress tracking)
- [x] Attendance records (new table + time tracking)
- [x] Notifications (new table + delivery tracking)

### All User Journeys Covered
- [x] Employee Dashboard Access (T016)
- [x] Time Tracking Workflow (T017)
- [x] Goal Management (T018)
- [x] Leave Request Process (T019)
- [x] Performance Review Self-Assessment (T020)
- [x] Manager Approval Workflows (T021)
- [x] Team Analytics and Reporting (T022)
- [x] HR Employee Lifecycle Management (T023)
- [x] Organizational Structure Management (T024)
- [x] System Admin User Management (T025)

### TDD Compliance
- [x] Contract tests before implementation (T006-T015 before T026+)
- [x] Integration tests before implementation (T016-T025 before T026+)
- [x] All tests designed to fail initially
- [x] Implementation tasks reference test files
- [x] End-to-end validation covers complete workflows

**Total Tasks**: 108
**Parallel Execution Points**: 45 tasks marked with [P]
**Estimated Timeline**: 4-6 weeks with 3-4 developers
**Critical Path**: Setup → Contract Tests → Database → Backend API → Frontend → E2E → Polish

This comprehensive task breakdown ensures complete implementation of all HR user journeys while following strict TDD principles and enabling maximum parallel execution for development efficiency.