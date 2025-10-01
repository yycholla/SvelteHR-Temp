# Implementation Plan: Replace Placeholder Data with Database Integration

**Branch**: `017-remove-all-placeholder` | **Date**: 2025-01-23 | **Spec**: `/specs/017-remove-all-placeholder/spec.md`
**Input**: Feature specification from `/specs/017-remove-all-placeholder/spec.md`

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

This feature addresses the critical need to replace all placeholder and mock data across the SvelteHR application with real database content, while also resolving backend initialization issues that cause HTTP 500 errors on newer pages. The implementation will establish proper data pipelines between the PostgreSQL database (via PostGraphile GraphQL API) and all frontend pages, ensuring comprehensive test data (10-50 records per entity) is available for verification. Special attention will be given to error handling with retry mechanisms and proper empty state displays when data is minimal.

## Technical Context

**Language/Version**: TypeScript 5.0 / SvelteKit 2.22.0 / Node.js 20.x
**Primary Dependencies**: SvelteKit, PostGraphile, PostgreSQL, GraphQL, Zod validation
**Storage**: PostgreSQL via PostGraphile GraphQL API (port 4000)
**Testing**: Playwright (E2E), Vitest (unit), >90% coverage required
**Target Platform**: Web application (server-rendered SvelteKit)
**Project Type**: web - full-stack application with frontend/backend separation
**Performance Goals**: GraphQL queries <200ms, page loads <1 second, bundle optimized
**Constraints**: JWT auth required, 4-tier RBAC enforcement, Row-Level Security
**Scale/Scope**: 10-50 records per entity for testing, all pages must work on init

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

**MCP-First Development**: ✅ Using Serena MCP for code analysis and Task tracking via Archon
**Test-First Development**: ⚠️ Must write E2E tests for data display before implementation
**Type Safety**: ✅ Using TypeScript 5.0 strict mode with generated GraphQL types
**Security by Design**: ✅ JWT auth and RLS already in place, no new security risks
**Performance Standards**: ✅ GraphQL <200ms requirement aligns with constitution
**Component Architecture**: ✅ Following server-side data loading patterns

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

**Structure Decision**: Option 2 (Web application) - existing SvelteKit structure with src/routes for frontend and PostGraphile backend

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

- Load `.specify/templates/tasks-template.md` as base
- Generate tasks from Phase 1 design docs (contracts, data model, quickstart)
- Health check implementation (critical path)
- Seed data system (foundation for all testing)
- Replace placeholder data in specific files
- Enhanced error handling with retry capability
- E2E tests for validation

**Task Categories**:

1. **Infrastructure** (Tasks 1-5)
   - Health check endpoint
   - Backend initialization handler
   - Unified GraphQL client

2. **Data Layer** (Tasks 6-15)
   - Seed data models
   - Seed data generation scripts
   - Database migrations
   - Data validation

3. **Frontend Updates** (Tasks 16-25)
   - Replace analytics dashboard placeholders
   - Replace management dashboard fallbacks
   - Add retry buttons to error states
   - Implement "No data available" messages

4. **Testing** (Tasks 26-30)
   - E2E tests for data display
   - Backend initialization tests
   - Error handling tests
   - Performance validation

**Ordering Strategy**:

- Critical path: Health check → Seed data → Frontend updates
- TDD approach: Write tests before implementation
- Parallel execution marked with [P] for independent tasks

**Estimated Output**: 30-35 numbered, ordered tasks in tasks.md

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

_Based on Constitution v2.1.1 - See `/memory/constitution.md`_
