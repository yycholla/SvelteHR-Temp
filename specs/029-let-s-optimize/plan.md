# Implementation Plan: Database Schema Optimization for Full Frontend Support

**Branch**: `029-let-s-optimize` | **Date**: 2025-10-10 | **Spec**: [spec.md](/home/yycholla/Documents/SvelteHR/specs/029-let-s-optimize/spec.md)
**Input**: Feature specification from `/home/yycholla/Documents/SvelteHR/specs/029-let-s-optimize/spec.md`

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

**Primary Requirement**: Comprehensive database schema optimization to support all 70+ tables (41 existing + 7 new module expansions + 2 new feature tables) with frontend feature parity, RBAC enforcement, manager hierarchies, and performance optimization through composite indexes and materialized views.

**Critical Production Bug**: event_attendees.reminder_time field missing (P0) - frontend queries at 4+ locations causing events page crash.

**Technical Approach**: Incremental schema migrations with zero-downtime deployment:
1. **P0 Hotfix** (emergency): Add event_attendees.reminder_time field
2. **P1 Core Schema** (high priority): users.manager_id, users profile fields (job_title, avatar_url, date_of_birth), departments.manager_ids array conversion
3. **P2 Feature Tables** (medium priority): employee_skills, employee_certifications tables + expand performance_reviews ratings + hr_reports recurring fields + notifications delivery_channel
4. **P3 Enhancements** (low priority): departments hierarchy fields, leave_requests review tracking, event_attendees scope/is_organizer

**Schema Verification Complete**: 15 migration files analyzed (83% coverage), all ⚠️ markers resolved to ✅/❌. Database-level caching via PostgreSQL materialized views for department_metrics, goal_statistics, report_analytics, dashboard_summaries.

## Technical Context

**Language/Version**: PostgreSQL 15+, SQL (DDL migrations), TypeScript 5.0 (GraphQL operations validation)
**Primary Dependencies**: PostGraphile (GraphQL auto-generation), Docker (dev-containers), migration scripts (bash), Zod 4.0.14 (JSONB schema validation)
**Storage**: PostgreSQL 15+ with pgcrypto extension (encryption), uuid-ossp (UUIDs), hr_public/hr_private/public schemas
**Testing**: Contract tests (PostGraphile schema validation), integration tests (GraphQL operations), migration verification (schema snapshots)
**Target Platform**: Docker development containers (postgres-dev), Linux production deployment
**Project Type**: Web application (SvelteKit frontend + PostGraphile GraphQL backend)
**Performance Goals**: <200ms GraphQL query p95, 20+ composite indexes for common query patterns, materialized views for expensive aggregations
**Constraints**: Zero-downtime migrations (idempotent DDL), 7-year data retention (FLSA compliance), RLS policies per table, application-level PII encryption
**Scale/Scope**: 70+ tables (41 existing + 29 future expansion), 80+ functional requirements, 27 clarifications resolved, 15 migration files analyzed

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

### I. Test-First Development ✅ PASS
- **Status**: COMPLIANT - Database schema changes tested via migration verification scripts
- **Evidence**: Migration workflow includes `npm run db:verify` (schema drift detection), `npm run db:rebuild` (test all migrations), contract tests for PostGraphile GraphQL schema validation
- **TDD Approach**: Migrations written idempotently (IF NOT EXISTS), tested against baseline schema snapshots, GraphQL operations validated before deployment

### II. Type Safety First ✅ PASS
- **Status**: COMPLIANT - TypeScript 5.0 with strict mode for GraphQL operations
- **Evidence**: PostGraphile auto-generates TypeScript types from PostgreSQL schema, Zod schemas for JSONB validation (report.filters, report.data, department.budget)
- **Type Coverage**: All GraphQL queries/mutations have generated types, no `any` types in frontend operations

### III. Security by Design ✅ PASS
- **Status**: COMPLIANT - RLS policies per table, JWT authentication, PII encryption
- **Evidence**:
  - RLS policies verified in 20250930_002_add_rls_policies.sql (department-scoped access for managers)
  - Application-level PII encryption for salary, date_of_birth, address fields, emergency contacts (Q17-Q18 clarifications)
  - Audit logging via activity_logs table (public schema) with rollback capabilities
- **RBAC**: 4-tier hierarchy (super_admin 100 > admin 80 > manager 60 > employee 20) enforced at database level

### IV. Performance Standards ✅ PASS (with monitoring)
- **Status**: COMPLIANT - 20+ composite indexes, materialized views for aggregations
- **Evidence**:
  - Composite indexes verified in migrations: task_assignees, event_attendees, performance_reviews, employee_goals, leave_requests, notifications (FR-070 to FR-080)
  - Full-text search indexes on users, departments, tasks (GIN indexes)
  - Materialized views planned for department_metrics, goal_statistics, report_analytics, dashboard_summaries (Q20)
- **Monitoring**: Migration script includes `ANALYZE` statements for query planner optimization, index impact monitoring recommended

### V. Component Architecture ⚠️ PARTIAL (Database-focused feature)
- **Status**: N/A (database schema only) - Component changes minimal
- **Evidence**: This feature modifies database schema, not UI components. Frontend integration limited to updating GraphQL operations to query new fields.
- **Impact**: SvelteKit components will use new fields via urql GraphQL client with auto-generated types

### VI. MCP-First Development ⚠️ DEFERRED
- **Status**: DEFERRED - Migration scripts are SQL DDL, not code requiring Serena MCP analysis
- **Evidence**: Database migrations follow `.specify` workflow template (setup-plan.sh, plan-template.md) but don't involve complex code refactoring
- **Justification**: SQL migration files are declarative DDL statements. MCP tools apply to TypeScript/Svelte codebase, not SQL schema definitions.

**Overall Status**: ✅ **PASS with justifications** - Core constitutional principles (TDD, Type Safety, Security, Performance) are met. MCP-First Development deferred for SQL-only migrations. Component Architecture N/A for database feature.

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
SvelteHR/ (Frontend - SvelteKit 2.22.0 + Svelte 5.0)
├── src/
│   ├── lib/
│   │   ├── graphql/          # GraphQL operations (queries/mutations/subscriptions)
│   │   ├── components/       # Svelte 5 components with runes
│   │   ├── stores/           # Svelte stores for state management
│   │   ├── schemas/          # Zod validation schemas
│   │   └── types/            # TypeScript type definitions
│   └── routes/               # SvelteKit file-based routing
│       ├── +page.server.ts   # Server-side data loading
│       └── +layout.server.ts # Layout data loading
├── tests/
│   ├── contract/             # PostGraphile schema validation tests
│   ├── integration/          # GraphQL operation tests
│   └── unit/                 # Component + business logic tests
├── db/
│   ├── init/
│   │   └── 00_run_migrations.sh  # Migration execution script
│   └── migrations/           # Timestamped SQL migration files
│       ├── 20250925_*.sql   # Initial schema migrations
│       ├── 20250930_*.sql   # Performance/RLS migrations
│       ├── 20251010_*.sql   # Feature system migrations
│       └── 20251011_*.sql   # Feature 029 schema optimizations (NEW)
├── schema-snapshots/         # Baseline schema for drift detection
│   └── baseline-schema.json
├── scripts/
│   └── db/
│       ├── new-migration.sh  # Create timestamped migration file
│       ├── verify-schema.sh  # Schema drift detection
│       └── snapshot.sh       # Update baseline snapshot
└── dev-containers/
    └── docker-compose.dev.yml  # PostgreSQL dev container config

MountainHR-Backend/ (GraphQL API - PostGraphile auto-generated)
├── No manual code - PostGraphile generates GraphQL from PostgreSQL schema
└── Configuration only (connection strings, RLS enforcement)
```

**Structure Decision**: Option 2 (Web application) - SvelteKit frontend with PostGraphile GraphQL backend. Database migrations live in frontend repo (`SvelteHR/db/migrations/`) and are applied via Docker init scripts. PostGraphile introspects PostgreSQL schema to generate GraphQL API automatically.

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

The `/tasks` command will generate a comprehensive tasks.md file based on the Phase 1 design artifacts. The strategy follows a priority-based, test-driven approach:

1. **Load Base Template**: Start with `.specify/templates/tasks-template.md`

2. **Generate Tasks from Design Artifacts**:
   - **From data-model.md**: Extract 16 migration file tasks (P0-P4 phases)
   - **From contracts/**: Generate 6 GraphQL schema contract validation tasks
   - **From quickstart.md**: Extract 15 integration test scenarios
   - **From spec.md**: Extract 80+ functional requirements as verification tasks

3. **Task Categorization by Phase**:
   - **P0 Tasks (Emergency)**: 1 task - Fix event_attendees.reminder_time field
   - **P1 Tasks (High Priority)**: 4 tasks - Core schema changes (users.manager_id, profile fields, departments.manager_ids)
   - **P2 Tasks (Medium Priority)**: 6 tasks - New tables (employee_skills, employee_certifications) + expanded ratings
   - **P3 Tasks (Low Priority)**: 3 tasks - Enhancements (department hierarchy, leave review tracking)
   - **P4 Tasks (Performance)**: 4 tasks - Materialized views creation
   - **Testing Tasks**: 15 tasks - Contract tests, integration tests, quickstart validation

4. **Task Dependencies**:
   - P0 must complete before P1 (hotfix first)
   - Migrations must complete before contract tests
   - Contract tests must pass before integration tests
   - All schema changes before materialized view creation (P4 depends on P1-P3)

5. **Parallel Execution Opportunities [P]**:
   - All P1 migrations independent → [P]
   - All P2 table creation migrations independent → [P]
   - Contract validation tests independent → [P]
   - Quickstart test scenarios independent → [P]

**Ordering Strategy**:

1. **Priority-First**: P0 → P1 → P2 → P3 → P4
2. **TDD Order**: Write migration → Write contract test → Run contract test (must fail) → Verify schema → Update quickstart
3. **Dependency Respecting**: Schema changes before PostGraphile schema regeneration
4. **Performance Last**: Materialized views created after all base schema complete

**Estimated Task Breakdown** (40-45 total tasks):

- **Migration Tasks**: 16 tasks (1 P0 + 4 P1 + 6 P2 + 3 P3 + 4 P4)
- **Contract Test Tasks**: 6 tasks (1 per GraphQL schema file)
- **Schema Verification Tasks**: 4 tasks (verify migrations applied, check RLS, validate indexes, test FK constraints)
- **Integration Test Tasks**: 15 tasks (from quickstart.md test cases)
- **Performance Validation Tasks**: 4 tasks (materialized view query benchmarks)
- **Documentation Tasks**: 2 tasks (update migration README, document rollback procedures)

**Task Format** (each task follows this structure):
```markdown
### Task N: [Priority] [Component] - [Action]
**Estimated Time**: X hours
**Dependencies**: Task M, Task K
**Parallel**: [P] or [Sequential]
**Contract**: contracts/[file].graphql (if applicable)
**Quickstart**: Test Case [ID] (if applicable)

**Steps**:
1. [Specific action]
2. [Verification step]
3. [Validation criteria]

**Acceptance Criteria**:
- [ ] Criterion 1
- [ ] Criterion 2
```

**Example Tasks** (to be generated by `/tasks`):

```markdown
### Task 1: [P0] event_attendees - Add reminder_time field
**Priority**: P0 (Emergency Production Hotfix)
**Estimated Time**: 0.5 hours
**Dependencies**: None
**Parallel**: [First task - no parallelism]
**Migration**: 20251011_001_add_event_reminder_time.sql
**Contract**: contracts/events-schema.graphql
**Quickstart**: Test Case P0.1

**Steps**:
1. Create migration file with ALTER TABLE ADD COLUMN IF NOT EXISTS
2. Add COMMENT on column for documentation
3. Run migration against dev database
4. Verify field exists via psql
5. Test GraphQL query for reminderTime field
6. Run quickstart Test Case P0.1

**Acceptance Criteria**:
- [ ] Migration runs without errors
- [ ] Field queryable via GraphQL
- [ ] Events page loads without crashes
- [ ] Quickstart P0.1 passes

---

### Task 2-5: [P1] Core Schema Changes [P]
(Tasks 2-5 can run in parallel - independent migrations)

### Task 2: [P1] users - Add manager_id and profile fields
**Priority**: P1 (High)
**Estimated Time**: 1 hour
**Dependencies**: Task 1 complete
**Parallel**: [P] (parallel with Tasks 3-5)
...
```

**Contract Test Pattern**:
Each GraphQL schema contract in `contracts/` will generate 1 contract test task that validates:
- PostGraphile generates expected types from schema changes
- GraphQL queries return new fields without errors
- Mutations accept new input parameters
- Validation rules enforced at GraphQL layer

**Integration Test Pattern**:
Each quickstart test case generates 1 integration test task following the quickstart steps exactly, with automated assertions where possible.

**IMPORTANT**: This phase is executed by the `/tasks` command, NOT by `/plan`

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

- [x] Phase 0: Research complete (/plan command) ✅
- [x] Phase 1: Design complete (/plan command) ✅
  - ✅ data-model.md created (22,000+ words, 16 migrations documented)
  - ✅ contracts/ directory created (6 GraphQL schema contracts)
  - ✅ quickstart.md created (comprehensive testing guide)
  - ✅ CLAUDE.md updated via update-agent-context.sh
- [x] Phase 2: Task planning complete (/plan command - describe approach only) ✅
  - ✅ Task generation strategy documented (40-45 tasks estimated)
  - ✅ Priority-based ordering defined (P0→P1→P2→P3→P4)
  - ✅ Parallel execution opportunities identified
- [x] Phase 3: Tasks generated (/tasks command) ✅
  - ✅ tasks.md created with 47 comprehensive tasks
  - ✅ Tasks organized by priority phase (P0→P1→P2→P3→P4)
  - ✅ 18 tasks marked [P] for parallel execution
  - ✅ Dependencies graph documented
  - ✅ Parallel execution examples provided
  - ✅ Validation checklist included
- [ ] Phase 4: Implementation complete - READY FOR EXECUTION
- [ ] Phase 5: Validation passed

**Gate Status**:

- [x] Initial Constitution Check: PASS ✅
- [x] Post-Design Constitution Check: PASS ✅
  - ✅ Test-First Development: Contract tests defined in contracts/, quickstart validation scenarios documented
  - ✅ Type Safety First: All GraphQL schemas typed, PostGraphile auto-generates TypeScript types
  - ✅ Security by Design: RLS policies documented in data-model.md, PII encryption in migrations
  - ✅ Performance Standards: Materialized views defined (P4 phase), 20+ indexes documented
  - ✅ Component Architecture: N/A (database-only feature, minimal UI changes)
  - ✅ MCP-First Development: DEFERRED (SQL migrations, not TypeScript/Svelte code)
- [x] All NEEDS CLARIFICATION resolved ✅ (27 of 27 answered)
- [x] Complexity deviations documented ✅ (MCP-First deferred for SQL migrations, documented in Constitution Check)
- [x] Design artifacts complete ✅ (research.md, data-model.md, contracts/, quickstart.md, CLAUDE.md updated)

---

_Based on Constitution v2.1.1 - See `/memory/constitution.md`_
