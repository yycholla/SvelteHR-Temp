# Implementation Plan: PostGraphile Migration for Enhanced GraphQL Architecture

**Branch**: `003-now-that-we` | **Date**: 2025-01-16 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-now-that-we/spec.md`

## Execution Flow (/plan command scope)

```
1. Load feature spec from Input path
   → If not found: ERROR "No feature spec at {path}"
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Detect Project Type from context (web=frontend+backend, mobile=app+api)
   → Set Structure Decision based on project type
3. Evaluate Constitution Check section below
   → If violations exist: Document in Complexity Tracking
   → If no justification possible: ERROR "Simplify approach first"
   → Update Progress Tracking: Initial Constitution Check
4. Execute Phase 0 → research.md
   → If NEEDS CLARIFICATION remain: ERROR "Resolve unknowns"
5. Execute Phase 1 → contracts, data-model.md, quickstart.md, agent-specific template file (e.g., `CLAUDE.md` for Claude Code, `.github/copilot-instructions.md` for GitHub Copilot, or `GEMINI.md` for Gemini CLI).
6. Re-evaluate Constitution Check section
   → If new violations: Refactor design, return to Phase 1
   → Update Progress Tracking: Post-Design Constitution Check
7. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
8. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 7. Phases 2-4 are executed by other commands:

- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary

Complete migration from Hasura GraphQL Engine to PostGraphile with database-first authentication, row-level security, and performance optimization. This migration provides transparent, open-source GraphQL layer with PostgreSQL-native security and eliminates vendor lock-in while maintaining backwards compatibility with existing frontend queries.

## Technical Context

**Language/Version**: Node.js 18+ with TypeScript 5.x  
**Primary Dependencies**: PostGraphile 4.x, Express.js, PostgreSQL 15+, Redis 7.2  
**Storage**: PostgreSQL 15+ with Row-Level Security enabled, Redis for caching  
**Testing**: Jest for unit tests, Supertest for API integration, Playwright for E2E  
**Target Platform**: Linux containers (Docker), development on localhost  
**Project Type**: web - SvelteKit frontend + PostGraphile backend  
**Performance Goals**: <200ms GraphQL response time, eliminate N+1 queries, 95% cache hit ratio  
**Constraints**: Complete migration from Hasura, maintain GraphQL schema compatibility, zero downtime deployment  
**Scale/Scope**: HR system with 4 user roles, 12 core entities, 50+ GraphQL operations

**Migration Context**: Moving entirely to PostGraphile to replace Hasura GraphQL Engine. This is a complete replacement, not an addition to existing infrastructure.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

**Simplicity**:

- Projects: 2 (postgraphile-backend, frontend) - under max 3
- Using framework directly? Yes - PostGraphile middleware in Express
- Single data model? Yes - PostgreSQL schema drives GraphQL schema
- Avoiding patterns? Yes - no Repository/UoW, direct PostgreSQL functions

**Architecture**:

- EVERY feature as library? Yes - auth, caching, logging as separate modules
- Libraries listed:
  - postgraphile-auth (JWT validation, role assignment)
  - postgraphile-cache (Redis LRU cache with pg-cache)
  - postgraphile-monitoring (structured logging, observability)
  - postgraphile-business-logic (custom PostgreSQL functions)
- CLI per library: Each module exposes --help/--version/--config commands
- Library docs: llms.txt format planned for all modules

**Testing (NON-NEGOTIABLE)**:

- RED-GREEN-Refactor cycle enforced? Yes - tests written first for each component
- Git commits show tests before implementation? Yes - test commits precede implementation
- Order: Contract→Integration→E2E→Unit strictly followed? Yes
- Real dependencies used? Yes - actual PostgreSQL and Redis in tests
- Integration tests for: new PostGraphile setup, GraphQL schema changes, auth flow
- FORBIDDEN: Implementation before test, skipping RED phase

**Observability**:

- Structured logging included? Yes - Winston with JSON format
- Frontend logs → backend? Yes - unified logging stream via GraphQL
- Error context sufficient? Yes - request ID, user context, query tracing

**Versioning**:

- Version number assigned? 1.0.0 (major migration)
- BUILD increments on every change? Yes
- Breaking changes handled? Yes - parallel Hasura/PostGraphile during transition

## Project Structure

### Documentation (this feature)

```
specs/003-now-that-we/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)

```
# Web application structure (PostGraphile migration)
backend/
├── src/
│   ├── postgraphile/     # PostGraphile configuration and plugins
│   ├── auth/            # JWT processing, role assignment
│   ├── cache/           # Redis caching layer
│   ├── monitoring/      # Logging and observability
│   └── functions/       # PostgreSQL function definitions
├── migrations/          # Database migration scripts
└── tests/
    ├── contract/        # GraphQL schema contract tests
    ├── integration/     # API integration tests with real DB
    └── unit/           # Individual module unit tests

frontend/
├── src/
│   ├── lib/graphql/    # GraphQL client (updated for PostGraphile)
│   ├── components/     # Svelte components (minimal changes)
│   ├── services/       # Service layer (updated endpoints)
│   └── types/         # Generated TypeScript types
└── tests/
    ├── integration/    # Frontend-backend integration tests
    └── e2e/           # End-to-end user workflow tests

# PostgreSQL schema and functions
database/
├── migrations/         # Database schema migrations
├── functions/         # Custom business logic functions
├── policies/          # Row-level security policies
└── grants/           # Role-based permissions
```

**Structure Decision**: Option 2 (Web application) - PostGraphile backend replaces Hasura, SvelteKit frontend maintained with updated GraphQL client

## Phase 0: Outline & Research

1. **Extract unknowns from Technical Context** above:
   - PostGraphile 4.x configuration and plugin system best practices
   - JWT token validation and PostgreSQL role assignment patterns
   - Redis caching integration with graphile-cache and pg-cache
   - PostgreSQL RLS policies for HR data access control
   - Performance optimization strategies for PostgreSQL + PostGraphile

2. **Generate and dispatch research agents**:

   ```
   Task: "Research PostGraphile 4.x setup and configuration for HR system migration"
   Task: "Find best practices for JWT authentication with PostGraphile and PostgreSQL roles"
   Task: "Research Redis caching strategies for PostGraphile with graphile-cache"
   Task: "Find PostgreSQL RLS policy patterns for role-based HR data access"
   Task: "Research performance optimization for PostGraphile GraphQL queries"
   ```

3. **Consolidate findings** in `research.md` using format:
   - Decision: [what was chosen]
   - Rationale: [why chosen]
   - Alternatives considered: [what else evaluated]

**Output**: research.md with all NEEDS CLARIFICATION resolved

## Phase 1: Design & Contracts

_Prerequisites: research.md complete_

1. **Extract entities from feature spec** → `data-model.md`:
   - Authentication Token: JWT structure, claims, expiration
   - User Role: Admin/HR Admin/Manager/Employee hierarchy
   - Security Policy: RLS rules for each entity and role
   - Query Cache: Redis key patterns, TTL strategies
   - Business Logic Function: Custom PostgreSQL functions for HR operations

2. **Generate API contracts** from functional requirements:
   - Authentication endpoint: login mutation
   - User management: CRUD operations with role-based access
   - Employee data: queries and mutations with RLS enforcement
   - Real-time subscriptions: live queries for HR operations
   - Output GraphQL schema to `/contracts/`

3. **Generate contract tests** from contracts:
   - Authentication flow contract tests
   - Role-based access control tests
   - GraphQL schema validation tests
   - Performance benchmark tests
   - Tests must fail (no implementation yet)

4. **Extract test scenarios** from user stories:
   - Employee authentication and token validation
   - HR Admin accessing all employee records
   - Manager accessing team member data only
   - Real-time updates for HR operations

5. **Update agent file incrementally** (O(1) operation):
   - Run `/scripts/update-agent-context.sh claude` for Claude Code
   - Add PostGraphile, JWT authentication, RLS patterns
   - Update recent changes with migration context
   - Keep under 150 lines for token efficiency
   - Output to repository root as CLAUDE.md

**Output**: data-model.md, /contracts/\*, failing tests, quickstart.md, CLAUDE.md

## Phase 2: Task Planning Approach

_This section describes what the /tasks command will do - DO NOT execute during /plan_

**Task Generation Strategy**:

- Load `/templates/tasks-template.md` as base
- Generate tasks from Phase 1 design docs (contracts, data model, quickstart)
- Each GraphQL contract → contract test task [P]
- Each entity → PostgreSQL schema creation task [P]
- Each security policy → RLS policy implementation task
- Each authentication flow → JWT validation test
- PostGraphile configuration → setup and plugin tasks
- Cache integration → Redis setup and testing tasks
- Frontend migration → GraphQL client update tasks

**Ordering Strategy**:

- TDD order: Tests before implementation
- Dependency order: Database schema → PostGraphile setup → Authentication → Frontend updates
- Mark [P] for parallel execution (independent database functions, tests)

**Estimated Output**: 35-40 numbered, ordered tasks in tasks.md

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation

_These phases are beyond the scope of the /plan command_

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking

_No constitutional violations identified_

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
- [x] Complexity deviations documented

---

_Based on Constitution v2.1.1 - See `/memory/constitution.md`_
