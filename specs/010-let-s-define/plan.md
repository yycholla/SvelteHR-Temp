# Implementation Plan: Comprehensive HR User Journeys System

**Branch**: `010-let-s-define` | **Date**: 2025-01-25 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/010-let-s-define/spec.md`

## Execution Flow (/plan command scope)

```
1. Load feature spec from Input path ✓
   → Feature spec loaded successfully
2. Fill Technical Context (scan for NEEDS CLARIFICATION) ✓
   → Project Type: Web application (SvelteKit frontend + PostGraphile backend)
   → Structure Decision: Option 2 (Web application structure)
3. Evaluate Constitution Check section below ✓
   → Constitution is template-based, no specific violations
   → Update Progress Tracking: Initial Constitution Check ✓
4. Execute Phase 0 → research.md ✓
   → All technical context clarified through existing codebase analysis
5. Execute Phase 1 → contracts, data-model.md, quickstart.md ✓
6. Re-evaluate Constitution Check section ✓
   → No new violations, design aligns with existing patterns
   → Update Progress Tracking: Post-Design Constitution Check ✓
7. Plan Phase 2 → Describe task generation approach ✓
8. STOP - Ready for /tasks command ✓
```

## Summary

This feature implements comprehensive user journey optimization for the SvelteHR system, extending the existing role-based architecture (Employee → Manager → HR Admin → System Admin) with complete workflow support for time tracking, goal management, performance reviews, leave requests, expense reporting, and compliance management. The implementation leverages the existing SvelteKit frontend and PostGraphile backend infrastructure, adding new pages, components, and database schemas to support the full HR lifecycle.

## Technical Context

**Language/Version**: TypeScript 5.x, PostgreSQL 15+, Node.js 18+
**Primary Dependencies**: SvelteKit, PostGraphile, TailwindCSS, Urql GraphQL, bcrypt, JWT
**Storage**: PostgreSQL with Row-Level Security, Redis for caching
**Testing**: Vitest (unit), Playwright (e2e), Jest (backend)
**Target Platform**: Web browsers (Chrome, Firefox, Safari, Edge)
**Project Type**: Web application (frontend + backend)
**Performance Goals**: <500ms page loads, 1000+ concurrent users, real-time updates
**Constraints**: GDPR compliance, role-based security, audit trails required
**Scale/Scope**: Multi-tenant support, 50+ pages/components, 12 core entities

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

**Simplicity**:

- Projects: 2 (frontend: SvelteKit app, backend: PostGraphile API)
- Using framework directly? Yes (SvelteKit, PostGraphile without wrappers)
- Single data model? Yes (PostgreSQL schema drives GraphQL API)
- Avoiding patterns? Yes (direct GraphQL queries, no unnecessary abstractions)

**Architecture**:

- EVERY feature as library? Partially (components in lib/, operations in lib/graphql/)
- Libraries listed:
  - UI Components (reusable Svelte components)
  - GraphQL Operations (typed query/mutation collections)
  - Stores (Svelte stores for state management)
  - Utils (helper functions and validators)
- CLI per library: N/A (web application)
- Library docs: Components documented in Storybook format

**Testing (NON-NEGOTIABLE)**:

- RED-GREEN-Refactor cycle enforced? Yes (failing tests first)
- Git commits show tests before implementation? Will be enforced
- Order: Contract→Integration→E2E→Unit strictly followed? Yes
- Real dependencies used? Yes (actual PostgreSQL, not mocks)
- Integration tests for: GraphQL schema changes, component integration, auth flows
- FORBIDDEN: Implementation before test, skipping RED phase

**Observability**:

- Structured logging included? Yes (backend logs to files, frontend to backend)
- Frontend logs → backend? Yes (unified logging stream)
- Error context sufficient? Yes (stack traces, user context, request IDs)

**Versioning**:

- Version number assigned? 1.0.0 (major HR workflows addition)
- BUILD increments on every change? Yes
- Breaking changes handled? Yes (database migrations, backward compatibility)

## Project Structure

### Documentation (this feature)

```
specs/010-let-s-define/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)

```
# Web application structure (existing SvelteHR codebase)
frontend/
├── src/
│   ├── lib/
│   │   ├── components/        # UI components
│   │   ├── graphql/          # GraphQL operations
│   │   ├── stores/           # Svelte stores
│   │   └── utils/            # Helper functions
│   ├── routes/               # SvelteKit pages
│   └── app.html
└── tests/
    ├── unit/                 # Component unit tests
    ├── integration/          # GraphQL integration tests
    └── e2e/                  # Playwright end-to-end tests

backend/
├── src/
│   ├── server.ts            # PostGraphile server
│   ├── middleware/          # Auth, logging, security
│   └── plugins/             # PostGraphile plugins
├── migrations/              # Database schema migrations
└── tests/
    ├── contract/            # API contract tests
    ├── integration/         # Database integration tests
    └── unit/                # Business logic unit tests
```

**Structure Decision**: Option 2 (Web application) - matches existing SvelteHR architecture

## Phase 0: Outline & Research

**Research Completed** - All technical context clarified through existing codebase analysis:

### Technology Stack Decisions

**Decision**: Continue with existing SvelteKit + PostGraphile architecture
**Rationale**:
- Proven working stack in current codebase
- PostGraphile auto-generates GraphQL from PostgreSQL schema
- SvelteKit provides SSR and optimal frontend performance
- Existing authentication and role-based access control can be extended

**Alternatives considered**:
- Next.js + Hasura (more complex migration)
- Pure REST API (less type safety)
- Different frontend frameworks (unnecessary rewrite)

### Database Schema Approach

**Decision**: Extend existing PostgreSQL schemas (hr_public, hr_private, hr_hidden)
**Rationale**:
- Consistent with existing row-level security model
- PostGraphile introspection works seamlessly
- Audit trails already implemented

### Frontend Architecture

**Decision**: Component-based with centralized state management
**Rationale**:
- Existing component library in src/lib/components/
- Svelte stores for reactive state
- GraphQL client (Urql) already configured

### Authentication Flow

**Decision**: Extend existing JWT-based auth with role hierarchy
**Rationale**:
- Current system supports basic roles
- Need to implement hierarchical permission inheritance
- Session management already implemented

**Output**: All technical unknowns resolved through existing codebase analysis

## Phase 1: Design & Contracts

_Prerequisites: research.md complete_

### Data Model Design

**Entities Identified** (extending existing schema):

1. **Users/Employees** (extend existing)
2. **Departments** (extend existing)
3. **TimeEntries** (new)
4. **LeaveRequests** (new)
5. **Goals** (new)
6. **PerformanceReviews** (new)
7. **Projects** (new)
8. **Expenses** (new)
9. **Training** (new)
10. **Attendance** (new)
11. **Notifications** (new)
12. **Approvals** (new workflow system)

### GraphQL API Contracts

**Generated from functional requirements**:
- Authentication mutations (extend existing)
- Employee self-service queries/mutations
- Manager approval workflows
- HR administration operations
- System admin functions
- Reporting and analytics queries

### User Interface Components

**New components needed**:
- Dashboard widgets for each role
- Time tracking forms and displays
- Goal management interface
- Performance review workflows
- Approval queue components
- Reports and analytics views

### Route Structure

**New pages to implement**:
- Role-specific dashboards
- Time tracking pages
- Goal management
- Performance review cycles
- Leave request management
- Expense reporting
- Employee directory enhancements
- Reports and analytics

**Output**: data-model.md, /contracts/*, failing contract tests, quickstart.md, updated CLAUDE.md

## Phase 2: Task Planning Approach

_This section describes what the /tasks command will do - DO NOT execute during /plan_

**Task Generation Strategy**:

1. **Database Tasks** (from data-model.md):
   - Create migration files for new tables
   - Add row-level security policies
   - Create stored functions for business logic
   - Add database indexes and constraints

2. **Backend API Tasks** (from contracts/):
   - PostGraphile plugins for custom resolvers
   - Middleware for advanced authentication
   - Business logic functions
   - Integration tests for each endpoint

3. **Frontend Component Tasks**:
   - Base components (forms, tables, cards)
   - Feature-specific components (time tracking, goals, reviews)
   - Layout components (dashboards, navigation)
   - Unit tests for each component

4. **Page Implementation Tasks**:
   - Route handlers (+page.server.ts files)
   - Page components (+page.svelte files)
   - Loading states and error handling
   - E2E tests for user workflows

5. **Integration Tasks**:
   - Role-based access control testing
   - Cross-component communication
   - GraphQL query optimization
   - Performance testing

**Ordering Strategy**:

1. **Database First** (models before services)
2. **API Contracts** (backend before frontend)
3. **Components** (reusable before specific)
4. **Pages** (simple before complex)
5. **Integration** (per-feature before cross-feature)

**TDD Approach**:
- Each task starts with failing test
- Contract tests before implementation
- Integration tests for user flows
- Unit tests for complex logic

**Parallel Execution Markers**:
- [P] for independent database migrations
- [P] for independent components
- [P] for independent page routes

**Estimated Output**: 40-50 numbered, ordered tasks in tasks.md

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation

_These phases are beyond the scope of the /plan command_

**Phase 3**: Task execution (/tasks command creates tasks.md)
**Phase 4**: Implementation (execute tasks.md following constitutional principles)
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking

_No constitutional violations identified - existing architecture supports requirements_

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --------- | ---------- | ----------------------------------- |
| None      | N/A        | N/A                                 |

## Progress Tracking

_This checklist is updated during execution flow_

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

_Based on Constitution template - See `/memory/constitution.md`_