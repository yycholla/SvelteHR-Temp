# Implementation Plan: Performance Reviews Creation with Goals Integration

**Branch**: `023-reviews-creation-it` | **Date**: 2025-10-06 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/home/chanway/Projects/SvelteHR/specs/023-reviews-creation-it/spec.md`

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

Enable administrators and managers to initiate performance reviews directly from employee profile pages and lists, with support for 10 flexible review types (Annual, Mid-Year, Quarterly, Probationary, PIP, 90-Day, Project-Based, Promotion, Exit, Self-Review) and integrated goal management. The system allows users to create new goals or reference existing goals within the review creation process, with draft functionality for multi-session completion. Manager access is restricted to direct reports only, while admins can review any employee. All data changes are tracked through the existing audit logging system with soft-delete support for goal preservation in historical reviews.

## Technical Context

**Language/Version**: TypeScript 5.0, Svelte 5.0 (runes syntax), Node.js 18+
**Primary Dependencies**: SvelteKit 2.22.0, PostgreSQL + PostGraphile (GraphQL backend), urql (GraphQL client), Zod 4.0.14 (validation), Tailwind CSS 4.0, shadcn/ui components
**Storage**: PostgreSQL 15+ with Row-Level Security (RLS), existing `performance_reviews` and `goals` tables (to be extended), audit logging via `activity_logs` table
**Testing**: Vitest 3.2.3 (unit tests), Playwright 1.49.1 (E2E tests), Storybook 9.1.1 (component development)
**Target Platform**: Web application (Chrome, Firefox, Safari), responsive design for desktop and mobile browsers
**Project Type**: web (frontend SvelteKit + backend PostGraphile GraphQL)
**Performance Goals**: GraphQL operations <200ms, page load <1s, forms responsive with draft auto-save
**Constraints**: JWT authentication with 4-tier RBAC (Admin 100, HR 80, Manager 60, Employee 20), Row-Level Security enforcement, test coverage >90%, accessibility WCAG 2.1 AA
**Scale/Scope**: ~500-5000 employees, 10 review types, multi-goal associations per review, draft reviews with multi-session persistence

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

### I. Test-First Development ✅
- E2E tests will cover review creation workflows (admin and manager paths)
- Unit tests for RBAC validation, draft persistence, goal associations
- Contract tests for GraphQL mutations and queries
- Target: >90% coverage on new code

### II. Type Safety First ✅
- TypeScript strict mode enabled project-wide
- Zod schemas for all form data and API responses
- GraphQL types auto-generated from schema
- No `any` types permitted

### III. Security by Design ✅
- Row-Level Security (RLS) for `performance_reviews` and `goals` tables
- JWT authentication with RBAC validation (Admin/HR/Manager/Employee roles)
- Manager-employee reporting relationship validation server-side
- Zod input validation on all forms
- Audit logging via existing `activity_logs` system

### IV. Performance Standards ✅
- GraphQL queries optimized with proper field selection
- Draft auto-save debounced to avoid excessive writes
- Redis caching for review types and reporting relationships
- Database indexes on foreign keys and status fields
- Performance regression tests for large goal lists

### V. Component Architecture ✅
- Svelte 5 runes (`$state`, `$derived`, `$props`) for reactive state
- shadcn/ui patterns for dialogs, forms, and buttons
- Server-side data loading via `+page.server.ts`
- No direct API calls from components
- Storybook stories for all new components

### VI. MCP-First Development ✅
- Serena MCP onboarding check before implementation
- Task management via Archon MCP (primary) + TodoWrite (secondary)
- Code discovery via `get_symbols_overview()`, `find_file()`
- Surgical editing via `replace_symbol_body()`, `insert_after_symbol()`
- Impact validation via `find_referencing_symbols()`

**Initial Gate Status**: PASS - All constitutional requirements aligned with feature design

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

**Structure Decision**: Option 2 (Web application) - SvelteKit frontend with PostGraphile GraphQL backend

**Actual Project Structure**:
```
src/
├── lib/
│   ├── components/
│   │   ├── ui/              # shadcn/ui base components
│   │   └── reviews/         # NEW: Review-specific components
│   ├── graphql/
│   │   ├── types.ts         # GraphQL generated types
│   │   └── operations/      # NEW: Review operations
│   ├── schemas/             # NEW: Zod validation schemas
│   ├── stores/              # Svelte stores
│   └── utils/
├── routes/
│   └── dashboard/
│       ├── employees/
│       │   └── [id]/        # Employee detail page (add button)
│       └── reviews/         # NEW: Review management routes
└── tests/
    ├── e2e/                 # Playwright tests
    └── unit/                # Vitest tests

Backend (PostGraphile auto-generates GraphQL from PostgreSQL):
- Database migrations for schema changes
- RLS policies for security
- GraphQL schema auto-generated
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

1. **Database Layer Tasks** (from data-model.md):
   - Migration files for schema changes (enums, fields, indexes)
   - RLS policies for security
   - Helper functions for RBAC validation

2. **Contract Test Tasks** (from contracts/graphql-schema.graphql):
   - GraphQL schema validation tests
   - Request/response schema tests
   - Enum value validation tests

3. **GraphQL Operations** (from contracts/):
   - Custom mutations (createReviewWithGoals, updateReviewDraft)
   - Custom queries (activeReviewsForEmployee, directReports)
   - Resolver implementation with RBAC validation

4. **Frontend Component Tasks** (from spec.md requirements):
   - ReviewCreationDialog component with Svelte 5 runes
   - GoalAssociationTabs component (create new / link existing)
   - StartReviewButton component with role-based visibility
   - ReviewTypeDropdown with descriptions
   - DraftAutoSave logic with debouncing

5. **Integration Test Tasks** (from quickstart.md scenarios):
   - Admin creates review workflow test
   - Manager RBAC validation test
   - Draft persistence test
   - Duplicate review prevention test
   - Soft delete goal preservation test

6. **E2E Test Tasks** (from acceptance scenarios):
   - Full review creation workflow (Playwright)
   - Multi-session draft resume (Playwright)
   - Goal association workflows (Playwright)

**Ordering Strategy**:

- **Phase 1**: Database migrations and RLS policies (foundation)
- **Phase 2**: GraphQL operations and contract tests [P]
- **Phase 3**: Frontend components (depends on GraphQL)
- **Phase 4**: Integration tests (depends on GraphQL + components)
- **Phase 5**: E2E tests (depends on complete feature)

**Task Categories**:
- [DB] Database migrations and schema
- [GQL] GraphQL operations and resolvers
- [UI] Frontend components and forms
- [TEST] Unit, integration, and E2E tests
- [DOCS] Storybook stories and documentation

**Estimated Output**: ~35-40 tasks across 5 phases in tasks.md

**Dependencies**:
- UI components depend on GraphQL operations
- Integration tests depend on GraphQL + UI
- E2E tests depend on complete stack

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation

_These phases are beyond the scope of the /plan command_

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking

_Fill ONLY if Constitution Check has violations that must be justified_

**Status**: No constitutional violations detected. All design decisions align with established principles.

All requirements can be implemented using:
- Existing SvelteKit + PostGraphile architecture
- Standard Svelte 5 component patterns
- PostGraphile auto-generated GraphQL with custom resolvers
- Existing RLS security model
- Standard TDD workflow

No additional complexity or architectural changes required.

## Progress Tracking

_This checklist is updated during execution flow_

**Phase Status**:

- [x] Phase 0: Research complete (/plan command) ✅
- [x] Phase 1: Design complete (/plan command) ✅
- [x] Phase 2: Task planning complete (/plan command - describe approach only) ✅
- [x] Phase 3: Tasks generated (/tasks command) ✅
- [ ] Phase 4: Implementation complete - NEXT STEP
- [ ] Phase 5: Validation passed

**Gate Status**:

- [x] Initial Constitution Check: PASS ✅
- [x] Post-Design Constitution Check: PASS ✅
- [x] All NEEDS CLARIFICATION resolved ✅
- [x] Complexity deviations documented (none required) ✅

**Artifacts Generated**:
- [x] `/specs/023-reviews-creation-it/research.md` - Technical decisions and research findings
- [x] `/specs/023-reviews-creation-it/data-model.md` - Entity definitions, relationships, validation rules
- [x] `/specs/023-reviews-creation-it/contracts/graphql-schema.graphql` - GraphQL API contract
- [x] `/specs/023-reviews-creation-it/quickstart.md` - 8 end-to-end test scenarios
- [x] `/home/chanway/Projects/SvelteHR/CLAUDE.md` - Updated with feature context
- [x] `/specs/023-reviews-creation-it/tasks.md` - 42 implementation tasks with dependencies

---

_Based on Constitution v2.1.1 - See `/memory/constitution.md`_
