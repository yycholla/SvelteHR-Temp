# Implementation Plan: Frontend-Backend GraphQL API Schema Alignment System

**Branch**: `032-we-need-to` | **Date**: 2025-10-13 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/home/chanway/Projects/SvelteHR/specs/032-we-need-to/spec.md`

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

This feature implements a comprehensive schema governance system to prevent frontend-backend misalignments in the SvelteHR GraphQL API. The system treats frontend GraphQL operations as the single source of truth, automatically validating that database columns and Rust API fields match frontend expectations. A pre-commit hook blocks commits when misalignments are detected, displaying detailed error reports in the terminal and maintaining a persistent `SCHEMA_ALIGNMENT.md` file. The system generates comprehensive documentation mapping frontend queries to database schema and API implementation, preventing runtime errors from schema drift.

## Technical Context

**Language/Version**: TypeScript 5.0 (validation tool), Rust 1.75+ (async-graphql introspection), Node.js 20+ (CLI tool)
**Primary Dependencies**: @graphql-tools/graphql-tag-pluck (GraphQL parsing), sqlx (Postgres introspection), async-graphql (schema introspection), zod (validation schemas)
**Storage**: PostgreSQL 15+ (schema introspection), File system (SCHEMA_ALIGNMENT.md, documentation cache)
**Testing**: Vitest (unit tests for validation logic), integration tests (pre-commit hook execution), fixtures (known schema states)
**Target Platform**: Linux/macOS development environment (pre-commit hook), CI/CD pipeline (GitHub Actions validation)
**Project Type**: web (SvelteKit frontend + Rust GraphQL backend)
**Performance Goals**: Pre-commit validation <5 seconds, full alignment check <30 seconds, incremental validation <2 seconds
**Constraints**: Must not block developer workflow, must work offline (cached schema state), must handle 100+ GraphQL operations
**Scale/Scope**: ~50 frontend pages, ~200 GraphQL operations, ~40 database tables, ~150 Rust API resolvers

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

### I. Test-First Development ✅
- **Status**: PASS
- **Plan**: Vitest unit tests for validation logic (GraphQL parser, schema comparator, type matcher), integration tests for pre-commit hook execution, fixture-based tests with known schema states
- **Coverage Target**: >90% for validation engine, 100% for critical path (schema comparison, type validation)

### II. Type Safety First ✅
- **Status**: PASS
- **Plan**: TypeScript 5.0 strict mode throughout, Zod schemas for all validation rules, generated types from GraphQL schema, no `any` types except for generic AST node handling (justified)

### III. Security by Design ✅
- **Status**: PASS
- **Plan**: Read-only database introspection (no mutations), secure parsing of GraphQL files (no code execution), audit log for schema changes tracked in git history, no sensitive data exposure in alignment reports

### IV. Performance Standards ✅
- **Status**: PASS
- **Plan**: Incremental validation (only changed files), cached schema state for offline validation, parallel processing of GraphQL files, pre-commit validation <5s target, async database queries with connection pooling

### V. Component Architecture ✅
- **Status**: PASS
- **Plan**: CLI tool architecture (commander.js), modular validation engine (parser → comparator → reporter), reusable validation rules (Zod schemas), comprehensive error messages with actionable guidance

### VI. MCP-First Development ✅
- **Status**: PASS
- **Plan**: Serena MCP for code discovery (`list_dir`, `find_file`, `get_symbols_overview`), Archon MCP for task tracking, surgical code modifications using `replace_symbol_body`, impact validation with `find_referencing_symbols`

**Initial Gate**: PASS - All constitutional requirements satisfied, no violations requiring justification

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

**Structure Decision**: Option 2 (Web application) - SvelteKit frontend + Rust GraphQL backend. Schema validation tool will be placed in a new `tools/schema-validator/` directory at repository root to validate across both frontend and backend code.

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

The `/tasks` command will generate atomic, dependency-ordered tasks following TDD principles:

1. **Contract Test Tasks** (from `contracts/`):
   - CLI command contract tests (validate, init, check, report, compute, cache, history)
   - Validation engine API contract tests (SchemaValidator, GraphQLParser, DatabaseIntrospector, ApiIntrospector, TypeComparator, AlignmentReporter, SchemaCache)
   - Each contract interface → one failing contract test task [P]

2. **Data Model Tasks** (from `data-model.md`):
   - TypeScript interfaces for all 8 entities
   - Zod validation schemas for runtime type checking
   - Type mapping configuration
   - Enum definitions

3. **Core Implementation Tasks** (TDD order):
   - GraphQL parser implementation (make parseFile/parseFiles tests pass)
   - Database introspector implementation (make introspection tests pass)
   - API introspector implementation (make schema introspection tests pass)
   - Type comparator implementation (make type mapping tests pass)
   - Field alignment validator implementation (make validation tests pass)
   - Cache manager implementation (make cache tests pass)
   - Report generator implementation (make report tests pass)

4. **CLI Integration Tasks**:
   - CLI framework setup (commander.js)
   - Command implementations (make CLI contract tests pass)
   - Pre-commit hook installation script
   - Configuration file management

5. **Integration Test Tasks** (from `quickstart.md`):
   - Each quickstart step → one integration test scenario
   - End-to-end validation workflow tests
   - Pre-commit hook integration tests
   - Cache performance tests

6. **Documentation Tasks**:
   - Installation guide
   - Configuration reference
   - Troubleshooting guide
   - API documentation (TSDoc comments)

**Ordering Strategy**:

- **Phase 1 (Tests - Parallel)**: All contract tests [P]
- **Phase 2 (Models - Parallel)**: All data model interfaces and schemas [P]
- **Phase 3 (Core - Sequential)**: Parser → Introspectors → Comparator → Validator (dependency chain)
- **Phase 4 (Integration - Sequential)**: Cache → Reporter → CLI commands
- **Phase 5 (E2E - Sequential)**: Integration tests following quickstart order
- **Phase 6 (Docs - Parallel)**: All documentation tasks [P]

**Estimated Output**: 40-45 numbered, ordered tasks in tasks.md

**Task Priority Markers**:
- `[P]`: Parallel execution (no dependencies)
- `[CRITICAL]`: Blocks multiple downstream tasks
- `[TEST]`: Test task (must pass before implementation)

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

- [x] Phase 0: Research complete (/plan command) - research.md generated
- [x] Phase 1: Design complete (/plan command) - data-model.md, contracts/, quickstart.md, CLAUDE.md updated
- [x] Phase 2: Task planning complete (/plan command - approach described, ready for /tasks)
- [x] Phase 3: Tasks generated (/tasks command) - 56 tasks created, 39 parallel, 17 sequential
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:

- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS (no design changes required)
- [x] All NEEDS CLARIFICATION resolved (Technical Context complete)
- [x] Complexity deviations documented (None - no violations)

---

_Based on Constitution v2.1.1 - See `/memory/constitution.md`_
