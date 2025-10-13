# Implementation Plan: Debug and Fix Rust GraphQL API for Full Database Coverage

**Branch**: `031-we-have-recently` | **Date**: 2025-10-11 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/home/yycholla/Documents/SvelteHR/specs/031-we-have-recently/spec.md`

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

Complete the Rust GraphQL API implementation to achieve full database coverage (43+ tables) as a drop-in replacement for PostGraphile. Currently 20 models implemented (46.5% coverage), with 23+ tables missing including document management, employee details, time tracking, analytics, and system administration. The API must maintain PostGraphile compatibility (camelCase naming, Relay cursor pagination) while exposing all database tables through GraphQL queries and mutations.

## Technical Context

**Language/Version**: Rust 1.75+ (edition 2021)
**Primary Dependencies**: async-graphql 7.0, axum 0.8, sqlx 0.7 with PostgreSQL driver, tokio 1.x
**Storage**: PostgreSQL 15+ with `hr_public` schema (43+ tables, Row-Level Security enabled)
**Testing**: Rust integration tests with sqlx, contract tests for GraphQL schema validation
**Target Platform**: Linux server (Docker containerized, localhost:4001)
**Project Type**: web (Rust GraphQL backend + SvelteKit frontend)
**Performance Goals**: <200ms GraphQL query response time, 1000+ concurrent connections, N+1 query prevention via DataLoader
**Constraints**: PostGraphile drop-in compatibility (camelCase fields, Relay cursor pagination), maintain existing 20 models, SQLx compile-time query validation
**Scale/Scope**: 43+ database tables, 23 new Rust models, ~50 GraphQL queries/mutations, 100+ relationship resolvers

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

### Test-First Development (Principle I)
✅ **PASS** - Contract tests will be generated for all 23 new GraphQL models before implementation. Integration tests will validate PostGraphile compatibility.

### Type Safety First (Principle II)
✅ **PASS** - Rust provides compile-time type safety. SQLx validates queries at compile time. GraphQL schema enforcement via async-graphql types.

### Security by Design (Principle III)
✅ **PASS** - PostgreSQL RLS already implemented at database level. JWT authentication and RBAC enforced by existing auth layer. All new models will inherit existing security patterns.

### Performance Standards (Principle IV)
✅ **PASS** - DataLoader pattern required for N+1 prevention. Connection pooling configured (min 20 connections). GraphQL operations target <200ms response time per constitution.

### Component Architecture (Principle V)
⚠️ **PARTIAL** - This feature is backend-only (Rust GraphQL API). Frontend SvelteKit components already follow shadcn/ui patterns. No frontend changes required.

### MCP-First Development (Principle VI)
✅ **PASS** - Serena MCP tools will be used for code discovery (`get_symbols_overview`, `find_file`) before implementation. Archon MCP for task management per CLAUDE.md. `replace_symbol_body` for surgical model additions to `mod.rs`.

**Overall Constitution Compliance**: ✅ PASS with backend-only scope clarification

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

**Structure Decision**: **Option 2: Web application** - Project has separate `graphql-rust-server/` (backend) and `src/` (frontend SvelteKit). This feature only modifies the Rust backend in `graphql-rust-server/src/`.

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
- Generate tasks from Phase 1 design docs (contracts, data-model.md, quickstart.md)
- **Domain-based grouping**: Tasks organized by domain (Employee, Documents, Time, Analytics, System, Events, Tasks, Reviews)
- **Test-first**: Each domain starts with contract tests, then model implementation
- **Parallel execution**: Mark [P] for tasks within same domain (independent files)

**Task Categories**:

1. **Contract Tests (8 tasks)**: One per domain, validates GraphQL schema structure
2. **Model Implementation (8 tasks)**: One per domain module, creates Rust structs with SQLx
3. **Query Resolvers (8 tasks)**: One per domain, implements GraphQL queries with DataLoader
4. **Mutation Resolvers (8 tasks)**: One per domain, implements GraphQL mutations with validation
5. **Integration Tests (10 tasks)**: Based on quickstart.md scenarios, validates end-to-end functionality
6. **Schema Composition (1 task)**: Merge all domain schemas into root Query/Mutation
7. **SQLx Metadata (1 task)**: Run `cargo sqlx prepare` to generate query metadata

**Ordering Strategy**:

- **Phase 1 (Tests)**: Contract tests [P] → fail initially (RED)
- **Phase 2 (Models)**: Model implementation [P] per domain
- **Phase 3 (Resolvers)**: Query resolvers [P] → Mutation resolvers [P]
- **Phase 4 (Integration)**: Schema composition → Integration tests → SQLx metadata
- **Phase 5 (Validation)**: Run quickstart.md scenarios

**Estimated Output**: ~45 numbered, ordered tasks in tasks.md (8 domains × 4 task types + 10 integration tests + 5 infrastructure tasks)

**Implementation Order**:
1. Employee Management (5 models) - highest priority
2. Document Management (6 models) - blocking core functionality
3. Time Management (2 models) - medium priority
4. Analytics (4 materialized views) - read-only, low risk
5. System Administration (7 models) - low priority
6. Event/Task/Review Extensions (4 models) - enhancement features

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

- [x] Phase 0: Research complete (/plan command) ✅ research.md generated
- [x] Phase 1: Design complete (/plan command) ✅ data-model.md, contracts/, quickstart.md, CLAUDE.md updated
- [x] Phase 2: Task planning complete (/plan command - describe approach only) ✅ Implementation strategy documented
- [ ] Phase 3: Tasks generated (/tasks command) - NEXT STEP
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:

- [x] Initial Constitution Check: PASS (Test-first, type safety, security, performance, MCP-first all validated)
- [x] Post-Design Constitution Check: PASS (Domain-based modular design maintains all principles)
- [x] All NEEDS CLARIFICATION resolved (All 3 clarifications answered in spec.md)
- [x] Complexity deviations documented (None - design follows existing patterns)

---

_Based on Constitution v2.1.1 - See `/memory/constitution.md`_
