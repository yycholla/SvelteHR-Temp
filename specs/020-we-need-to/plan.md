# Implementation Plan: Comprehensive Audit Logging with Rollback Capabilities

**Branch**: `020-we-need-to` | **Date**: 2025-10-02 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/home/chanway/Projects/SvelteHR/specs/020-we-need-to/spec.md`

## Execution Flow (/plan command scope)

```
1. Load feature spec from Input path
   → If not found: ERROR "No feature spec at {path}"
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Detect Project Type from context (web=frontend+backend, mobile=app+api)
   → Set Structure Decision based on project type
3. Fill the Constitution Check section based on the content of the constitution document.
4. Evaluate Constitution Check section below
   → If violations exist: Document in Complexity Tracking
   → If no justification possible: ERROR "Simplify approach first"
   → Update Progress Tracking: Initial Constitution Check
5. Execute Phase 0 → research.md
   → If NEEDS CLARIFICATION remain: ERROR "Resolve unknowns"
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, agent-specific template file (e.g., `CLAUDE.md` for Claude Code, `.github/copilot-instructions.md` for GitHub Copilot, `GEMINI.md` for Gemini CLI, `QWEN.md` for Qwen Code or `AGENTS.md` for opencode).
7. Re-evaluate Constitution Check section
   → If new violations: Refactor design, return to Phase 1
   → Update Progress Tracking: Post-Design Constitution Check
8. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
9. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 7. Phases 2-4 are executed by other commands:

- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary

This feature implements comprehensive audit logging with rollback capabilities for the SvelteHR system. All user actions (create, update, delete, read) will be logged with complete state snapshots, enabling super admins to rollback erroneous changes while maintaining a complete audit trail. The system includes a rollback request workflow allowing regular admins to request rollbacks that require super admin approval. Performance targets: 1-second query response time for up to 1 million log entries, 3-year retention policy, hybrid RBAC scope (department-level for admins, organization-wide for HR/super admins), and fail-safe logging with exponential retry.

## Technical Context

**Language/Version**: TypeScript 5.0 (strict mode), Svelte 5.0 with runes syntax
**Primary Dependencies**: SvelteKit 2.22.0, PostGraphile (GraphQL), PostgreSQL 15+, Better Auth 1.3.4, Zod 4.0.14
**Storage**: PostgreSQL with Row-Level Security (RLS), Redis caching for frequently accessed logs
**Testing**: Vitest 3.2.3 (unit), Playwright 1.49.1 (E2E), Storybook 9.1.1 (component)
**Target Platform**: Web application (Linux server backend, modern browsers)
**Project Type**: web (frontend: SvelteKit, backend: PostGraphile GraphQL API)
**Performance Goals**: <1 second query response for 1M entries, <200ms GraphQL operations, >90% test coverage
**Constraints**: 3-year log retention, 1M entry dataset, 100 rollbacks/batch max, fail-safe logging with retry
**Scale/Scope**: 52 functional requirements, 5 key entities (ActivityLog, RollbackSnapshot, RollbackRequest, RollbackOperation, BulkRollbackBatch), UI pages (audit logs, rollback requests), RBAC integration (admin/hr_admin/super_admin)

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

### I. Test-First Development ✅
- **E2E Tests**: Playwright tests for audit log viewing, filtering, rollback workflows, bulk operations
- **Unit Tests**: Vitest tests for logging service, rollback logic, state snapshot utilities, retry mechanism
- **Component Tests**: Storybook stories for ActivityFeed, RollbackRequestList, BulkRollbackDialog
- **TDD Order**: Tests written first (RED), implementation makes them pass (GREEN), refactor
- **Coverage Target**: >90% coverage required for all new code
- **MCP Integration**: Use Serena MCP tools for semantic analysis and task tracking throughout test development

### II. Type Safety First ✅
- **TypeScript 5.0**: Strict mode enabled, no `any` types without justification
- **GraphQL Types**: Generated types for ActivityLog, RollbackSnapshot, RollbackRequest, RollbackOperation, BulkRollbackBatch queries/mutations
- **Zod Schemas**: Validation schemas for rollback requests, bulk operations, filter parameters
- **Component Props**: Properly typed props using Svelte 5 `$props()` with TypeScript interfaces
- **API Responses**: All GraphQL responses typed with generated schema types

### III. Security by Design ✅
- **Row-Level Security**: Department-scoped logs for admin role, organization-wide for hr_admin/super_admin
- **RBAC Enforcement**: JWT authentication with role checks (super_admin=100 for rollback execution, admin=100 for viewing)
- **Input Validation**: Zod schemas for all user inputs (rollback reasons, filter criteria, bulk selections)
- **Audit Logging**: All rollback operations logged as new audit entries (meta-audit trail)
- **No Sensitive Data**: IP addresses and user agents sanitized in client-side rendering

### IV. Performance Standards ✅
- **GraphQL Operations**: <200ms for audit log queries with proper indexing (timestamp, user_id, resource_type, action)
- **Page Load**: <1 second for audit logs page with 50-entry pagination
- **Database Indexing**: Required on activity_logs (timestamp, employee_id, resource_type, action)
- **Redis Caching**: Frequently accessed filter options (users list, resource types) cached for 5 minutes
- **Performance Regression**: Tests for 1M entry datasets, bulk rollback batching (100 max per batch)
- **Bundle Optimization**: Code splitting for audit logs page, lazy loading for rollback dialogs

### V. Component Architecture ✅
- **Svelte 5 Runes**: All components use `$state`, `$derived`, `$props`, `$bindable` (no legacy reactivity)
- **Reusable Components**: ActivityFeed.svelte (already exists), RollbackButton.svelte, RollbackRequestCard.svelte, BulkRollbackDialog.svelte
- **Server-Side Data Loading**: All audit log queries via `+page.server.ts` load functions, no direct API calls from components
- **Storybook Documentation**: Stories for all new UI components with multiple states
- **Consistent Patterns**: Error handling with toast notifications, loading states with skeletons
- **MCP-Safe Refactoring**: Use `mcp__serena__replace_symbol_body()` and `mcp__serena__find_referencing_symbols()` for component modifications

### VI. MCP-First Development ✅
- **Onboarding**: Use `mcp__serena__check_onboarding_performed()` before starting implementation
- **Task Management**: Archon MCP as primary task system, TodoWrite only for secondary tracking
- **Code Discovery**: Use `mcp__serena__get_symbols_overview()`, `mcp__serena__find_file()` before modifications
- **Implementation**: Use `mcp__serena__replace_symbol_body()`, `mcp__serena__insert_after_symbol()` for surgical edits
- **Verification**: Use `mcp__serena__find_referencing_symbols()` to validate impact, `mcp__serena__think_about_task_adherence()` before implementation

**Initial Constitution Check: PASS** ✅

No violations detected. All constitutional principles can be met with current architectural approach.

## Project Structure

### Documentation (this feature)

```
specs/[###-feature]/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)

```
# Option 1: Single project (DEFAULT)
src/
├── models/
├── services/
├── cli/
└── lib/

tests/
├── contract/
├── integration/
└── unit/

# Option 2: Web application (when "frontend" + "backend" detected)
backend/
├── src/
│   ├── models/
│   ├── services/
│   └── api/
└── tests/

frontend/
├── src/
│   ├── components/
│   ├── pages/
│   └── services/
└── tests/

# Option 3: Mobile + API (when "iOS/Android" detected)
api/
└── [same as backend above]

ios/ or android/
└── [platform-specific structure]
```

**Structure Decision**: Option 2 (Web application) - Frontend (SvelteKit) + Backend (PostGraphile GraphQL API)

**Actual Project Structure** (SvelteHR existing):
```
src/
├── lib/
│   ├── components/        # UI components (Svelte 5)
│   ├── graphql/          # GraphQL operations and types
│   ├── stores/           # Svelte stores for state
│   ├── utils/            # Utility functions
│   └── schemas/          # Zod validation schemas
├── routes/               # SvelteKit routes
│   ├── dashboard/
│   │   └── activities/   # Existing activity logs
│   └── api/             # API routes
└── tests/
    ├── e2e/             # Playwright E2E tests
    └── unit/            # Vitest unit tests

supabase/migrations/      # Database schema migrations
```

## Phase 0: Outline & Research

1. **Extract unknowns from Technical Context** above:
   - For each NEEDS CLARIFICATION → research task
   - For each dependency → best practices task
   - For each integration → patterns task

2. **Generate and dispatch research agents**:

   ```
   For each unknown in Technical Context:
     Task: "Research {unknown} for {feature context}"
   For each technology choice:
     Task: "Find best practices for {tech} in {domain}"
   ```

3. **Consolidate findings** in `research.md` using format:
   - Decision: [what was chosen]
   - Rationale: [why chosen]
   - Alternatives considered: [what else evaluated]

**Output**: research.md with all NEEDS CLARIFICATION resolved

## Phase 1: Design & Contracts

_Prerequisites: research.md complete_

1. **Extract entities from feature spec** → `data-model.md`:
   - Entity name, fields, relationships
   - Validation rules from requirements
   - State transitions if applicable

2. **Generate API contracts** from functional requirements:
   - For each user action → endpoint
   - Use standard REST/GraphQL patterns
   - Output OpenAPI/GraphQL schema to `/contracts/`

3. **Generate contract tests** from contracts:
   - One test file per endpoint
   - Assert request/response schemas
   - Tests must fail (no implementation yet)

4. **Extract test scenarios** from user stories:
   - Each story → integration test scenario
   - Quickstart test = story validation steps

5. **Update agent file incrementally** (O(1) operation):
   - Run `.specify/scripts/bash/update-agent-context.sh claude`
     **IMPORTANT**: Execute it exactly as specified above. Do not add or remove any arguments.
   - If exists: Add only NEW tech from current plan
   - Preserve manual additions between markers
   - Update recent changes (keep last 3)
   - Keep under 150 lines for token efficiency
   - Output to repository root

**Output**: data-model.md, /contracts/\*, failing tests, quickstart.md, agent-specific file

## Phase 2: Task Planning Approach

_This section describes what the /tasks command will do - DO NOT execute during /plan_

**Task Generation Strategy**:

The /tasks command will generate tasks from Phase 1 design artifacts in strict TDD order:

1. **Database Schema Tasks** (Foundation - T001-T003):
   - T001: Create `activity_logs` migration with indexes and RLS policies [P]
   - T002: Create `rollback_requests` migration with indexes and RLS policies [P]
   - T003: Create `bulk_rollback_batches` migration with indexes and RLS policies [P]

2. **GraphQL Contract Test Tasks** (T004-T011):
   - T004: Contract test for GetActivityLogs query (paginated, filtered) [P]
   - T005: Contract test for GetActivityLog query (single, with details) [P]
   - T006: Contract test for GetPendingRollbackRequests query [P]
   - T007: Contract test for RequestRollback mutation [P]
   - T008: Contract test for ExecuteRollback mutation [P]
   - T009: Contract test for ApproveRollbackRequest mutation [P]
   - T010: Contract test for CreateBulkRollbackBatch mutation [P]
   - T011: Contract test for WatchBulkRollbackProgress subscription [P]

3. **Core Service Unit Tests** (T012-T020):
   - T012: Unit test for logging service (with retry logic) [P]
   - T013: Unit test for snapshot capture utility [P]
   - T014: Unit test for rollback validation logic [P]
   - T015: Unit test for conflict detection (jsonbDiff) [P]
   - T016: Unit test for cascade snapshot collection [P]
   - T017: Unit test for rollback execution engine [P]
   - T018: Unit test for bulk rollback batch processor [P]
   - T019: Unit test for RLS policy helpers [P]
   - T020: Unit test for SSE progress stream [P]

4. **Component Unit Tests** (T021-T027):
   - T021: Storybook + unit tests for RollbackButton component [P]
   - T022: Storybook + unit tests for RollbackRequestCard component [P]
   - T023: Storybook + unit tests for BulkRollbackDialog component [P]
   - T024: Storybook + unit tests for ConflictResolutionModal component [P]
   - T025: Unit test for audit log filter component [P]
   - T026: Unit test for ActivityFeed enhancements (rollback info) [P]
   - T027: Unit test for pagination component with page size selector [P]

5. **Implementation Tasks** (T028-T048):
   - T028: Implement logging service with retry and fail-safe (makes T012 pass)
   - T029: Implement snapshot capture utility (makes T013 pass)
   - T030: Implement rollback validation logic (makes T014 pass)
   - T031: Implement conflict detection with jsonbDiff (makes T015 pass)
   - T032: Implement cascade snapshot collection (makes T016 pass)
   - T033: Implement rollback execution engine (makes T017 pass)
   - T034: Implement bulk rollback batch processor (makes T018 pass)
   - T035: Implement RLS policy helpers (makes T019 pass)
   - T036: Implement SSE progress stream endpoint (makes T020 pass)
   - T037: Implement RollbackButton component (makes T021 pass)
   - T038: Implement RollbackRequestCard component (makes T022 pass)
   - T039: Implement BulkRollbackDialog component (makes T023 pass)
   - T040: Implement ConflictResolutionModal component (makes T024 pass)
   - T041: Enhance audit log filter component (makes T025 pass)
   - T042: Enhance ActivityFeed with rollback info (makes T026 pass)
   - T043: Implement pagination with page size selector (makes T027 pass)
   - T044: Create GraphQL operation files (queries.ts, mutations.ts)
   - T045: Create `/dashboard/activities/audit/+page.server.ts` with enhanced queries
   - T046: Enhance `/dashboard/activities/audit/+page.svelte` UI for rollback
   - T047: Create `/dashboard/activities/audit/requests/+page.svelte` (Pending Requests tab)
   - T048: Add rollback button/logic to existing ActivityFeed component

6. **E2E Integration Tests** (T049-T057):
   - T049: E2E test for audit log capture (Scenario 1 from quickstart) [P]
   - T050: E2E test for update logging with snapshots (Scenario 2) [P]
   - T051: E2E test for RBAC department scoping (Scenario 3) [P]
   - T052: E2E test for single rollback (Scenario 4) [P]
   - T053: E2E test for rollback request workflow (Scenario 5) [P]
   - T054: E2E test for bulk rollback with progress (Scenario 6) [P]
   - T055: E2E test for conflict detection (Scenario 7) [P]
   - T056: E2E test for performance validation (Scenario 8) [P]
   - T057: E2E test for logging failure handling (Scenario 9) [P]

7. **Performance & Security Tasks** (T058-T062):
   - T058: Performance benchmark for 100k entry queries (must meet <1s target)
   - T059: Performance benchmark for bulk rollback (100 operations)
   - T060: Security audit for RLS policies (verify dept scoping)
   - T061: Security audit for rollback permissions (verify super_admin only)
   - T062: Load testing with 1M entry dataset

**Ordering Strategy**:

- **Phase 1 (T001-T003)**: Database foundation (must complete first)
- **Phase 2 (T004-T011)**: Contract tests (parallel, can start immediately after Phase 1)
- **Phase 3 (T012-T027)**: Unit tests (parallel, independent)
- **Phase 4 (T028-T048)**: Implementation (serial based on test dependencies)
- **Phase 5 (T049-T057)**: E2E tests (parallel, after implementation)
- **Phase 6 (T058-T062)**: Performance & security validation (parallel, final gate)

**Parallelization Strategy**:
- Tasks marked [P] can execute in parallel (independent files/tests)
- Implementation tasks follow RED→GREEN→REFACTOR per constitutional requirement
- E2E tests in Phase 5 can run in parallel across different test files

**Estimated Output**: 62 numbered, ordered tasks in tasks.md with clear dependencies

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation

_These phases are beyond the scope of the /plan command_

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking

_Fill ONLY if Constitution Check has violations that must be justified_

| Violation                  | Why Needed         | Simpler Alternative Rejected Because |
| -------------------------- | ------------------ | ------------------------------------ |
| [e.g., 4th project]        | [current need]     | [why 3 projects insufficient]        |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient]  |

## Progress Tracking

_This checklist is updated during execution flow_

**Phase Status**:

- [x] Phase 0: Research complete (/plan command) - research.md created
- [x] Phase 1: Design complete (/plan command) - data-model.md, contracts/, quickstart.md, CLAUDE.md updated
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [x] Phase 3: Tasks generated (/tasks command) - tasks.md created with 62 tasks
- [x] Phase 3.1: Database Foundation (T001-T003) - 3 migration files created
- [x] Phase 3.2: GraphQL Contract Tests (T004-T011) - 8 contract test files created (RED phase complete)
- [ ] Phase 3.3-3.4: Unit Tests (T012-T027) - RED phase (tests must fail)
- [ ] Phase 3.5: Implementation (T028-T048) - GREEN phase (make tests pass)
- [ ] Phase 3.6: E2E Tests (T049-T057)
- [ ] Phase 3.7: Performance & Security (T058-T062)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:

- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [x] Complexity deviations documented (none - no deviations)

---

_Based on Constitution v2.1.1 - See `/memory/constitution.md`_
