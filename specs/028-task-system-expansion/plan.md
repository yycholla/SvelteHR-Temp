# Implementation Plan: Task System Expansion

**Branch**: `028-task-system-expansion` | **Date**: 2025-10-09 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/028-task-system-expansion/spec.md`

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

**Primary Requirement**: Implement a comprehensive task management system with RBAC-based permissions, allowing employees to create self-assigned tasks, managers to create tasks for direct reports, and admins to create tasks for anyone. The system must support task hierarchy (subtasks), dependencies, linked resources, lifecycle management (edit/delete/reassign), organizational change handling, and comprehensive audit trails.

**Key Features**:
- RBAC-aware task creation and assignment (employee/manager/admin tiers)
- Task metadata: due dates, priorities (Low/Medium/High/Urgent), statuses (To Do/In Progress/Blocked/Deferred/Completed)
- Task hierarchy with parent-child relationships and dependencies
- Linked resources with availability tracking
- Task lifecycle management with soft deletion and audit trail
- Automated organizational change handling (manager reassignment, employee deactivation)
- Notification system for reminders and task changes
- Custom task types (admin-managed)

## Technical Context

**Language/Version**: TypeScript 5.0, Svelte 5.0 with runes, Node.js (backend)
**Primary Dependencies**: SvelteKit 2.22.0, PostgreSQL + PostGraphile, urql (GraphQL client), Zod 4.0.14, date-fns 4.1.0, Better Auth 1.3.4
**Storage**: PostgreSQL with Row-Level Security (RLS), Redis for caching
**Testing**: Playwright 1.49.1 (E2E), Vitest 3.2.3 (unit), Storybook 9.1.1 (component)
**Target Platform**: Web application (SvelteKit SSR), Docker containerized development
**Project Type**: web (frontend + backend integrated in SvelteKit)
**Performance Goals**:
  - GraphQL operations <200ms
  - Task creation form load <2s (NFR-001)
  - Task list (100 items) load <3s (NFR-002)
  - Task hierarchy (50 items) render <2s (NFR-004)
**Constraints**:
  - RBAC enforcement on all operations
  - Server-side API calls only (no client-side GraphQL)
  - Test-first development (TDD) mandatory
  - >90% test coverage required
**Scale/Scope**:
  - ~10k users expected
  - 69 functional requirements, 4 non-functional requirements
  - 48 acceptance scenarios
  - 5 key entities (Task, Task Audit Entry, Task Dependency, Linked Resource, Task Type)

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

### I. Test-First Development ✅
- **Status**: PASS
- **Plan**: E2E tests (Playwright) for all 48 acceptance scenarios, unit tests (Vitest) for business logic, component tests (Storybook)
- **Coverage Target**: >90% per constitution requirement

### II. Type Safety First ✅
- **Status**: PASS
- **Plan**: TypeScript 5.0 strict mode, Zod schemas for all GraphQL operations, generated types from PostGraphile schema
- **No `any` types**: All entities have proper type definitions

### III. Security by Design ✅
- **Status**: PASS
- **Plan**: PostgreSQL RLS for all task operations, JWT authentication with 4-tier RBAC (Admin 100, HR 80, Manager 60, Employee 20), Zod validation on all inputs
- **RBAC Enforcement**: All 69 functional requirements include permission checks (FR-063 to FR-069)
- **Audit Logging**: Standard audit trail (NFR-003) for all sensitive operations

### IV. Performance Standards ✅
- **Status**: PASS
- **Plan**: GraphQL operations <200ms (constitution), task list <3s for 100 items (NFR-002), proper indexing on task tables, Redis caching for frequently accessed data
- **Monitoring**: Performance regression tests for task hierarchies >50 items

### V. Component Architecture ✅
- **Status**: PASS
- **Plan**: Svelte 5 runes (`$state`, `$derived`, `$props`, `$bindable`), shadcn/ui patterns, server-side data loading via `+page.server.ts`, Storybook documentation
- **No client-side API calls**: All GraphQL operations in `+page.server.ts` files

### VI. MCP-First Development ✅
- **Status**: PASS
- **Plan**: Use Serena MCP for code discovery (`list_dir`, `find_file`, `get_symbols_overview`), surgical modifications (`replace_symbol_body`, `insert_after_symbol`), impact validation (`find_referencing_symbols`)
- **Archon MCP**: Primary task tracking system per CLAUDE.md, TodoWrite for secondary tracking only

**Overall Status**: ✅ ALL CONSTITUTIONAL REQUIREMENTS MET

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

**Structure Decision**: Option 2 (Web application) - SvelteKit integrates frontend and backend, with server-side routes in `src/routes/` and lib code in `src/lib/`

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

The `/tasks` command will generate a comprehensive task breakdown based on TDD principles and the design artifacts created in Phase 1.

### Database & Schema Tasks
1. Create PostgreSQL enums (task_status_enum, task_priority_enum, resource_type_enum, etc.) [P]
2. Create tasks table with RLS policies [P]
3. Create task_types table with seed data [P]
4. Create task_audit_entries table with JSONB indexing [P]
5. Create task_dependencies table with circular dependency trigger [P]
6. Create linked_resources table [P]
7. Create database migration file combining all schema changes

### GraphQL Contract Tests (TDD - Write First)
8. Write contract test: createTask mutation [P]
9. Write contract test: updateTask mutation [P]
10. Write contract test: deleteTask mutation [P]
11. Write contract test: reassignTask mutation [P]
12. Write contract test: createTaskDependency mutation [P]
13. Write contract test: allTasks query with filters [P]
14. Write contract test: myTasks query with RBAC [P]
15. Write contract test: taskHierarchy query [P]

### Backend GraphQL Operations
16. Implement tasks GraphQL operations (src/lib/graphql/tasks-operations.ts)
17. Implement RBAC permission helpers (src/lib/server/permissions.ts)
18. Implement audit trail service (src/lib/server/audit-service.ts)
19. Implement organizational change handlers (src/lib/server/org-change-handlers.ts)
20. Implement task reminder scheduler (src/lib/server/task-reminder-scheduler.ts)

### UI Component Development (With Storybook)
21. Create TaskCreationForm component with Zod validation
22. Create TaskList component with hierarchy view
23. Create TaskDetailsCard component with audit history
24. Create TaskDependencyGraph visualization component
25. Create LinkedResourcesList component
26. Create TaskTypeSelector component
27. Add Storybook stories for all task components [P]

### Page Routes (Server-Side Data Loading)
28. Implement /dashboard/tasks/+page.server.ts (My Tasks with filters)
29. Implement /dashboard/tasks/[id]/+page.server.ts (Task details)
30. Implement /dashboard/tasks/create/+page.server.ts (Task creation)
31. Implement /dashboard/tasks/team/+page.server.ts (Manager view)
32. Implement /admin/tasks/orphaned/+page.server.ts (Admin orphaned tasks)
33. Implement /admin/tasks/types/+page.server.ts (Admin task types management)

### Integration Tests (Playwright E2E - Based on 48 Scenarios)
34. E2E test: Task creation by role (scenarios 1-4)
35. E2E test: Task assignment & management (scenarios 5-7)
36. E2E test: Linked resources (scenarios 8-10)
37. E2E test: Task flexibility & types (scenarios 11-13)
38. E2E test: Task metadata & due dates (scenarios 14-20)
39. E2E test: Task lifecycle management (scenarios 21-28)
40. E2E test: Organizational changes (scenarios 29-32)
41. E2E test: Custom task types & resource links (scenarios 33-37)
42. E2E test: Task hierarchy & dependencies (scenarios 38-45)
43. E2E test: Orphaned task handling (scenarios 46-48)

### Unit Tests (Vitest)
44. Unit test: RBAC permission helpers [P]
45. Unit test: Audit trail service [P]
46. Unit test: Organizational change handlers [P]
47. Unit test: Task reminder scheduler [P]
48. Unit test: Circular dependency prevention logic [P]
49. Unit test: Subtask progress calculation [P]

### Performance & Optimization
50. Add database indexes for task queries
51. Implement Redis caching for frequently accessed tasks
52. Performance test: Task list with 100 items <3s (NFR-002)
53. Performance test: Task hierarchy with 50 items <2s (NFR-004)

### Documentation & Cleanup
54. Update API documentation with task endpoints
55. Create task system user guide
56. Run full test suite and fix any failures
57. Code review and refactoring

**Ordering Strategy**:

1. **Database First**: Schema changes must be in place before any code (tasks 1-7)
2. **TDD Cycle**: Contract tests before GraphQL operations (tasks 8-15, then 16-20)
3. **Bottom-Up**: Backend services before UI components (tasks 16-20, then 21-27)
4. **Routes Last**: Page routes after components are ready (tasks 28-33)
5. **Integration Tests**: After routes are functional (tasks 34-43)
6. **Parallel Tasks**: Marked with [P] can be executed concurrently

**Estimated Output**: 57 numbered, ordered tasks in tasks.md

**Key Dependencies**:
- Tasks 1-7 (database) must complete before any backend work
- Tasks 8-15 (contract tests) must be written before implementations
- Tasks 16-20 (backend) must complete before UI components (21-27)
- Tasks 21-27 (components) must complete before routes (28-33)
- Tasks 28-33 (routes) must complete before E2E tests (34-43)

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

- [x] Phase 0: Research complete (/plan command) ✅
- [x] Phase 1: Design complete (/plan command) ✅
- [x] Phase 2: Task planning described (/plan command - describe approach only) ✅
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:

- [x] Initial Constitution Check: PASS ✅
- [x] Post-Design Constitution Check: PASS ✅
- [x] All NEEDS CLARIFICATION resolved ✅
- [x] Complexity deviations documented: N/A (no deviations) ✅

**Artifacts Generated**:

- [x] research.md - Technical decisions and best practices ✅
- [x] data-model.md - Database schema, types, validation ✅
- [x] contracts/graphql-schema.graphql - GraphQL API contract ✅
- [x] quickstart.md - Integration test scenarios (48 scenarios) ✅
- [x] CLAUDE.md - Updated agent context ✅

---

## Planning Phase Complete ✅

**Status**: Ready for `/tasks` command

**Summary**:
The implementation plan for the Task System Expansion feature is complete. All design artifacts have been generated, constitutional requirements verified, and the task generation strategy outlined.

**Key Deliverables**:
1. ✅ **research.md** - Technical decisions for task hierarchy, RBAC, audit trail, reminders, resource validation, and organizational changes
2. ✅ **data-model.md** - Complete database schema with 5 tables, RLS policies, TypeScript types, and Zod validation
3. ✅ **contracts/graphql-schema.graphql** - Full GraphQL API contract with queries, mutations, and subscriptions
4. ✅ **quickstart.md** - 48 acceptance scenario test scripts for E2E validation
5. ✅ **CLAUDE.md** - Updated agent context with task system technologies

**Next Steps**:
Run `/tasks` to generate the detailed task breakdown (57 estimated tasks) for implementation. The task generation will follow TDD principles with database schema first, contract tests before implementations, and parallel execution opportunities marked.

**Implementation Timeline Estimate**:
- Database & Schema: 1-2 days
- GraphQL Operations & Tests: 3-4 days
- UI Components: 3-4 days
- Routes & Integration: 2-3 days
- E2E Testing: 2-3 days
- Performance & Optimization: 1-2 days
- **Total**: ~15-20 development days

---

_Based on Constitution v2.1.1 - See `/memory/constitution.md`_
