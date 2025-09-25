# Implementation Plan: Complete Sidebar Page Implementation

**Branch**: `011-we-should-flesh` | **Date**: 2025-09-24 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/011-we-should-flesh/spec.md`

## Summary

Implement comprehensive sidebar page functionality for SvelteHR management system. Create 6 missing pages (Management overview, Leave Approvals, Reviews, Goals & OKRs, Team Reports, Teams admin) following established admin/users page pattern with full CRUD operations, data tables, filtering, export capabilities, and role-based access control.

## Technical Context

**Language/Version**: TypeScript 5.0 with Svelte 5.0 (frontend) + Node.js 18+ with tsx (backend)
**Primary Dependencies**: SvelteKit 2.22, PostGraphile 4.14, Urql GraphQL client, shadcn/ui, Tailwind CSS
**Storage**: PostgreSQL 15+ with Row-Level Security (hr_public schema) + Redis 7.2 for caching and sessions
**Testing**: Vitest 3.2 (unit tests), Playwright 1.49 (e2e), Jest (backend integration tests)
**Target Platform**: Web application with SSR, responsive desktop/tablet/mobile support
**Project Type**: web (SvelteKit frontend + PostGraphile Express backend)
**Performance Goals**: <200ms GraphQL response time, Redis caching, real-time updates via subscriptions
**Constraints**: JWT authentication, RBAC (4-tier: Admin 100, HR 80, Manager 60, Employee 20), audit logging required
**Scale/Scope**: Enterprise HR system supporting 1000+ users, 6 missing management pages, full CRUD operations

## Constitution Check

_GATE: ✅ PASSED - All requirements met_

**Simplicity**: ✅ 2 projects (SvelteKit + PostGraphile), direct framework usage, single data model
**Architecture**: ✅ Extending existing application, not creating libraries
**Testing**: ✅ TDD approach with E2E tests first, real dependencies, proper test order
**Observability**: ✅ Existing Winston logging and error handling
**Versioning**: ✅ Following existing v0.0.1 with incremental changes

## Project Structure

### Documentation (this feature)
```
specs/011-we-should-flesh/
├── plan.md              # This file (/plan command output) ✅
├── data-model.md        # Phase 1 output (/plan command) ✅
├── quickstart.md        # Phase 1 output (/plan command) ✅
├── contracts/           # Phase 1 output (/plan command) ✅
│   ├── leave-management.graphql
│   ├── performance-management.graphql
│   ├── goals-okrs.graphql
│   ├── team-reports.graphql
│   └── team-management.graphql
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code Structure
**Structure Decision**: Option 2 (web application with SvelteKit frontend + PostGraphile backend)

Missing pages to implement:
- `/dashboard/management` - Management overview page
- `/dashboard/management/leave-approvals` - Leave approval workflow
- `/dashboard/management/reviews` - Performance review management
- `/dashboard/management/goals` - Goals & OKRs tracking
- `/dashboard/management/reports` - Team analytics and reporting
- `/dashboard/teams` - Team/department administration

## Phase 0: Research & Analysis ✅ COMPLETED

**Research Findings**:
- **Reference Pattern**: `/dashboard/admin/users/+page.svelte` established pattern
- **UI Components**: shadcn/ui components (Table, Card, Dialog, Button, etc.)
- **State Management**: Svelte 5 `$state()` runes for reactive data
- **Data Loading**: GraphQL operations via Urql with loading/error states
- **CRUD Operations**: View, Create, Update, Delete with confirmation dialogs
- **Table Features**: Search, filtering, sorting, pagination, export to CSV
- **Navigation**: SvelteKit routing with programmatic navigation
- **Access Control**: Role-based rendering and operation restrictions

## Phase 1: Design & Contracts ✅ COMPLETED

**Deliverables Created**:
- ✅ **data-model.md**: 6 core entities with PostgreSQL schema, RLS policies, indexes
- ✅ **contracts/**: 5 GraphQL contract files with comprehensive operations
- ✅ **quickstart.md**: 5 detailed test scenarios with success criteria
- ✅ **CLAUDE.md**: Updated (not needed - extending existing application)

**Key Entities**: Leave Request, Performance Review, Team Goal/OKR, Team Report, Approval Workflow, Audit Entry

**GraphQL Contracts**: Complete CRUD operations, filtering, analytics queries, real-time subscriptions

## Phase 2: Task Planning Approach

_This section describes what the /tasks command will do - DO NOT execute during /plan_

**Task Generation Strategy**:

Based on completed design artifacts, the /tasks command will:

1. **Load Base Template**: Use `/templates/tasks-template.md` as foundation
2. **Generate TDD Task Sequence**: Follow Test-Driven Development principles
3. **Create Task Categories**:
   - **Database Tasks** (4): Schema migrations for new entities
   - **E2E Test Tasks** (6): Following quickstart.md scenarios [P]
   - **GraphQL Operations** (15): CRUD operations per contract [P]
   - **SvelteKit Pages** (6): Route implementations following admin/users pattern [P]
   - **Shared Components** (4): Data tables, filters, export, analytics charts
   - **Integration Tasks** (3): Codegen, testing, deployment validation

**Ordering Strategy**:

1. **Phase A - Foundation** (Tasks 1-4): Database migrations and schema setup
2. **Phase B - Tests First** (Tasks 5-10): E2E tests (must fail initially - RED phase)
3. **Phase C - GraphQL Layer** (Tasks 11-25): API operations to make tests pass [P]
4. **Phase D - UI Components** (Tasks 26-29): Shared components [P]
5. **Phase E - Page Implementation** (Tasks 30-35): SvelteKit routes [P]
6. **Phase F - Integration** (Tasks 36-38): Codegen, validation, deployment

**Parallelization Strategy**:
- Mark [P] for independent tasks that can run in parallel
- E2E tests can run concurrently (different pages)
- GraphQL operations are independent per contract
- Page implementations are independent per route

**Dependencies**:
- Database schema → GraphQL operations → Page components
- E2E tests can start immediately (will fail until implementation)
- Shared components can start after E2E tests define requirements

**Estimated Output**: 38 numbered, ordered tasks in tasks.md with clear TDD flow

## Progress Tracking

**Phase Status**:
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [x] Complexity deviations documented (none required)

---

✅ **PLANNING PHASE COMPLETE** - Ready for `/tasks` command

_Based on Constitution v2.1.1_