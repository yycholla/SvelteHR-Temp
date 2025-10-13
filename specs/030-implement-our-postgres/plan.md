# Implementation Plan: Complete PostgreSQL Database API Coverage via GraphQL

**Branch**: `030-implement-our-postgres` | **Date**: 2025-10-10 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/home/yycholla/Documents/SvelteHR/specs/030-implement-our-postgres/spec.md`

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

Implement 100% API coverage for all 43 PostgreSQL tables in the SvelteHR database through a Rust-based GraphQL API. The system must provide complete CRUD operations, filtering, pagination, relationship traversal, and real-time subscriptions while maintaining GraphQL specification compliance. The frontend will migrate from the current PostGraphile API to this new Rust GraphQL endpoint with minimal changes (endpoint URL only). Performance targets include <1000ms response times for simple queries, default pagination of 100 records, optimistic locking for concurrent updates, soft delete for data integrity, and maximum query depth of 10 levels.

## Technical Context

**Language/Version**: Rust 1.90+ (using rust:1.90-slim Docker base)
**Primary Dependencies**: async-graphql 7.0, SQLx 0.7 (PostgreSQL), Axum 0.7.9, Tokio async runtime, tower-http (CORS), dataloader 0.17
**Storage**: PostgreSQL with 43 tables across 9 logical domains (hr_public schema)
**Testing**: cargo test with async integration tests, GraphQL playground for manual testing
**Target Platform**: Linux server (Debian Bookworm slim), containerized via Docker, exposes port 4000
**Project Type**: web (SvelteKit frontend + Rust GraphQL backend)
**Performance Goals**: <1000ms for simple queries (single record by ID), <200ms p95 for list queries, support 100+ concurrent users
**Constraints**: Default pagination 100 records (max 1000), query depth limit 10 levels, optimistic locking for concurrency, soft delete only
**Scale/Scope**: 43 PostgreSQL tables, ~150-200 GraphQL types/fields, HR application serving 10k+ employees, production-ready RBAC with JWT

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

### I. Test-First Development ✅ COMPLIANT
- **Requirement**: TDD mandatory, tests written first (RED→GREEN→REFACTOR), >90% coverage
- **Status**: Rust supports TDD with cargo test. Phase 1 will generate GraphQL contract tests first, then implementation
- **Actions**: Generate integration tests for all 43 table APIs, unit tests for business logic, use GraphQL Playground for E2E validation

### II. Type Safety First ✅ COMPLIANT
- **Requirement**: Strict typing, no `any` types, proper type definitions for all data structures
- **Status**: Rust provides compile-time type safety stronger than TypeScript. SQLx ensures type-safe SQL queries. async-graphql generates type-safe GraphQL schema from Rust types
- **Actions**: Use SQLx's `query_as!` macro for compile-time SQL verification, derive GraphQL types from database models

### III. Security by Design ✅ COMPLIANT
- **Requirement**: Row-Level Security (RLS), JWT authentication, 4-tier RBAC, Zod validation, audit logging, no sensitive data in client code
- **Status**: PostgreSQL RLS policies already exist. JWT verification required via middleware. Need RBAC enforcement in resolvers
- **Actions**: Implement JWT middleware in Axum, enforce RLS via PostgreSQL session variables, add audit logging for mutations, validate inputs with serde validators

### IV. Performance Standards ⚠️ PARTIAL COMPLIANCE
- **Requirement**: GraphQL <200ms, page load <1s, proper indexing, Redis caching, performance regression tests for >1000 records
- **Status**: Spec requires <1000ms (more lenient than constitution's <200ms). Need to implement caching strategy and indexing analysis
- **Actions**: Phase 0 research: Evaluate Redis caching with dataloader, analyze existing indexes, implement query complexity limits, benchmark with 10k+ record datasets
- **Justification**: GraphQL queries may aggregate multiple tables and relationships, requiring >200ms. Constitution allows justification for deviations.

### V. Component Architecture ✅ COMPLIANT
- **Requirement**: Reusable patterns, proper state management, no direct API calls from components
- **Status**: Backend API layer - not directly applicable. Frontend already uses server-side loading per CLAUDE.md
- **Actions**: Maintain GraphQL schema consistency for frontend compatibility

### VI. MCP-First Development ✅ COMPLIANT
- **Requirement**: Use Archon MCP for task management (primary), Serena MCP for code discovery/modification
- **Status**: This planning workflow follows MCP-first approach. Implementation phase will use Serena MCP tools
- **Actions**:
  - Phase 0: Use Archon for research task tracking
  - Phase 1: Use Serena `get_symbols_overview()` to analyze existing schema patterns
  - Phase 2: Use Serena `replace_symbol_body()` for surgical model/resolver additions
  - Phase 3: Use Serena `find_referencing_symbols()` to validate GraphQL type dependencies

### Security Requirements ✅ COMPLIANT
- **Requirement**: SQL injection protection, XSS prevention, CORS config, no credentials in code, security audits, RBAC validation
- **Status**: SQLx provides parameterized queries. Rust's type system prevents many security issues. CORS already configured in main.rs
- **Actions**: Implement JWT validation middleware, enforce RBAC at resolver level, use environment variables for secrets, audit all user inputs

### Quality Standards ✅ COMPLIANT
- **Requirement**: TypeScript compilation, ESLint/Prettier, >90% test coverage, security scans, code reviews, performance benchmarks, WCAG 2.1 AA
- **Status**: Rust compiler enforces strict quality. cargo clippy for linting, cargo fmt for formatting. Accessibility not applicable to API layer
- **Actions**: Set up CI pipeline with cargo clippy, cargo test (>90% coverage), cargo audit for security vulnerabilities

**INITIAL GATE STATUS**: ⚠️ **CONDITIONAL PASS** - Performance deviation documented (1000ms vs 200ms requirement). Proceed with Phase 0 research to address caching and indexing strategy.

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

**Structure Decision**: **Option 2 (Web Application)** - Project has SvelteKit frontend + Rust GraphQL backend. Backend code in `graphql-rust-server/`, frontend in root `src/`. This feature focuses on backend GraphQL API implementation.

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

**Status**: ✅ **COMPLETE** - research.md created with 9 technical decisions documented

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

**Output**: data-model.md, /contracts/*, failing tests, quickstart.md, agent-specific file

**Status**: ✅ **COMPLETE**
- data-model.md: 43 tables documented across 9 domains
- contracts/graphql-schema.graphql: Complete GraphQL schema with pagination, filtering, mutations
- quickstart.md: 10 validation steps with performance benchmarks
- CLAUDE.md: Updated with Rust GraphQL stack context
- Contract tests: Deferred to Phase 2 tasks (will be generated with TDD approach)

## Phase 2: Task Planning Approach

_This section describes what the /tasks command will do - DO NOT execute during /plan_

**Task Generation Strategy**:

The /tasks command will generate tasks organized by domain and following TDD principles:

1. **Infrastructure Setup Tasks** (Sequential)
   - Set up JWT middleware in Axum
   - Configure RLS session variable passing
   - Implement DataLoader for N+1 prevention
   - Add query depth/complexity limits
   - Set up integration test framework

2. **Domain-Based Model & Resolver Tasks** (Per Domain, Parallel within domain)

   For each of the 9 domains (Core HR, Events, Tasks, Documents, Performance, Leave, Notifications, Payroll, Admin):

   a. **Test Tasks First** (TDD Red Phase)
      - Write integration tests for domain queries [P]
      - Write integration tests for domain mutations [P]
      - Tests must fail initially (no implementation)

   b. **Model Tasks** (TDD Green Phase - Models)
      - Create Rust struct models for all tables in domain [P]
      - Add SQLx derive macros for type-safe queries [P]
      - Implement soft delete filters
      - Add optimistic locking (updated_at checks)

   c. **Resolver Tasks** (TDD Green Phase - Resolvers)
      - Implement Query resolvers for domain [P]
      - Implement Mutation resolvers for domain [P]
      - Implement pagination/filtering logic
      - Add DataLoader integration for relationships

   d. **Refactor Tasks** (TDD Refactor Phase)
      - Optimize query performance if benchmarks fail
      - Add error handling and validation
      - Document resolver patterns

3. **Cross-Domain Integration Tasks** (After all domains complete)
   - Test relationship queries across domains
   - Validate RBAC enforcement
   - Run performance benchmarks from quickstart.md
   - Verify all 43 tables covered

4. **Subscription Tasks** (WebSocket real-time)
   - Implement subscription infrastructure
   - Add event update subscriptions
   - Add task update subscriptions
   - Test subscription delivery

**Ordering Strategy**:

- **Sequential prerequisites**: Infrastructure → Domain models → Resolvers
- **Parallel within domain**: All tables in same domain can be developed in parallel [P]
- **Domain independence**: Domains 1-9 can be developed in parallel after infrastructure
- **TDD order**: Always tests before implementation (Red → Green → Refactor)

**Estimated Task Count**: ~120-150 tasks
- Infrastructure: 5-10 tasks
- Per domain (9 domains × ~12 tasks): 100-120 tasks
- Integration: 10-15 tasks
- Subscriptions: 5-10 tasks

**Parallelization Potential**: ~80% of tasks can run in parallel (domain isolation)

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

- [x] Phase 0: Research complete (/plan command) - ✅ research.md with 9 technical decisions
- [x] Phase 1: Design complete (/plan command) - ✅ data-model.md, contracts/, quickstart.md, CLAUDE.md updated
- [x] Phase 2: Task planning complete (/plan command - describe approach only) - ✅ Task strategy documented
- [x] Phase 3: Tasks generated (/tasks command) - ✅ tasks.md with 183 tasks (67% parallelizable)
- [ ] Phase 4: Implementation complete - **NEXT STEP**: Begin executing tasks starting with T001
- [ ] Phase 5: Validation passed

**Gate Status**:

- [x] Initial Constitution Check: ⚠️ CONDITIONAL PASS (performance deviation documented)
- [x] Post-Design Constitution Check: ✅ PASS (all requirements aligned with constitution)
- [x] All NEEDS CLARIFICATION resolved (Technical Context has no unknowns)
- [x] Complexity deviations documented (1000ms vs 200ms justified in Constitution Check section)

---

_Based on Constitution v2.1.1 - See `/memory/constitution.md`_
