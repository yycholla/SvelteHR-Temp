# Implementation Plan: Hasura GraphQL Implementation

**Branch**: `002-hasura-implementation-we` | **Date**: 2025-01-09 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/home/chanway/Projects/SvelteHR/specs/002-hasura-implementation-we/spec.md`

## Execution Flow (/plan command scope)

```
1. Load feature spec from Input path → ✅ COMPLETE
2. Fill Technical Context (scan for NEEDS CLARIFICATION) → ✅ COMPLETE
3. Evaluate Constitution Check section → ✅ COMPLETE
4. Execute Phase 0 → research.md → 🔄 IN PROGRESS
5. Execute Phase 1 → contracts, data-model.md, quickstart.md, CLAUDE.md → PENDING
6. Re-evaluate Constitution Check section → PENDING
7. Plan Phase 2 → Describe task generation approach → PENDING
8. STOP - Ready for /tasks command → PENDING
```

## Summary

Complete migration from GelDB to Hasura GraphQL Engine with PostgreSQL backend, implementing JWT authentication, real-time subscriptions, and role-based access control. Primary focus on achieving sub-200ms response times with enhanced performance optimization including query caching, database indexing, and connection pooling.

## Technical Context

**Language/Version**: TypeScript 5.3, Node.js 20.x LTS, PostgreSQL 15+  
**Primary Dependencies**: Hasura GraphQL Engine 2.x, SvelteKit 2.x, Urql GraphQL client  
**Storage**: PostgreSQL 15+ with Row-Level Security, Redis for caching/sessions  
**Testing**: Vitest, Playwright, @testing-library/svelte, contract testing with Pact  
**Target Platform**: Docker containers, Linux server deployment  
**Project Type**: web (frontend + backend with GraphQL API gateway)  
**Performance Goals**: Sub-200ms response times, 1000+ concurrent users, <100ms GraphQL query execution  
**Constraints**: Zero downtime migration, PII encryption at rest, RBAC compliance, real-time WebSocket support  
**Scale/Scope**: 500+ employees, multi-tenant HR system, department hierarchy management

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

**Simplicity**:

- Projects: 3 (hasura-migration-lib, auth-jwt-lib, graphql-client-lib) ✅
- Using framework directly? Yes - Hasura GraphQL Engine, SvelteKit, Urql ✅
- Single data model? Yes - PostgreSQL schema serves as single source of truth ✅
- Avoiding patterns? Yes - Direct GraphQL queries, no Repository/UoW layer ✅

**Architecture**:

- EVERY feature as library? Yes ✅
- Libraries listed:
  - hasura-migration-lib: Data migration and schema synchronization
  - auth-jwt-lib: JWT authentication with Hasura integration
  - graphql-client-lib: Type-safe GraphQL client with caching
- CLI per library: Each with --help/--version/--format support ✅
- Library docs: llms.txt format planned for each library ✅

**Testing (NON-NEGOTIABLE)**:

- RED-GREEN-Refactor cycle enforced? Yes ✅
- Git commits show tests before implementation? Will enforce ✅
- Order: Contract→Integration→E2E→Unit strictly followed? Yes ✅
- Real dependencies used? Yes - actual PostgreSQL, Redis, Hasura instances ✅
- Integration tests for: GraphQL schema changes, auth flows, real-time subscriptions ✅
- FORBIDDEN: Implementation before test, skipping RED phase ✅

**Observability**:

- Structured logging included? Yes - JSON logs with correlation IDs ✅
- Frontend logs → backend? Yes - unified logging stream ✅
- Error context sufficient? Yes - GraphQL errors with stack traces ✅

**Versioning**:

- Version number assigned? v1.0.0 ✅
- BUILD increments on every change? Yes ✅
- Breaking changes handled? Migration scripts + parallel testing ✅

## Project Structure

### Documentation (this feature)

```
specs/002-hasura-implementation-we/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)

```
# Option 2: Web application (frontend + backend + GraphQL API gateway)
backend/
├── src/
│   ├── models/          # PostgreSQL entities and migrations
│   ├── services/        # Business logic libraries
│   └── api/            # REST endpoints for non-GraphQL operations
└── tests/

frontend/
├── src/
│   ├── components/      # Svelte components
│   ├── pages/          # SvelteKit routes
│   └── services/       # GraphQL client libraries
└── tests/

hasura/
├── migrations/         # Hasura schema migrations
├── metadata/          # Hasura metadata configuration
└── seeds/             # Test data seeding
```

**Structure Decision**: Option 2 - Web application structure with separate Hasura directory for GraphQL configuration

## Phase 0: Outline & Research

1. **Extract unknowns from Technical Context** - All technical dependencies identified ✅

2. **Research tasks**:
   - Hasura performance optimization techniques for sub-200ms targets
   - PostgreSQL connection pooling and query optimization strategies
   - JWT authentication integration patterns with Hasura
   - Real-time subscription performance at scale
   - Migration strategies from GelDB to PostgreSQL/Hasura

3. **Research findings to consolidate**:
   - Performance optimization decisions (caching, indexing, query limits)
   - Authentication architecture (JWT issuer, refresh tokens, session management)
   - Real-time implementation (subscription filters, connection limits)
   - Migration approach (data validation, rollback strategies)

**Output**: research.md with performance-focused optimization strategies

## Phase 1: Design & Contracts

_Prerequisites: research.md complete_

1. **Extract entities from feature spec** → `data-model.md`:
   - Existing PostgreSQL schema already maps all entities
   - Users (central hub), Departments, Roles, JobInformation, Compensation, etc.
   - Validation rules from Row-Level Security policies
   - State transitions for onboarding_status, approval workflows

2. **Generate API contracts** from functional requirements:
   - GraphQL schema from Hasura introspection
   - Subscription contracts for real-time features
   - JWT claims structure and validation rules
   - Output Hasura metadata and GraphQL schema to `/contracts/`

3. **Generate contract tests** from contracts:
   - GraphQL query/mutation/subscription tests
   - Authentication flow tests
   - Performance benchmark tests for sub-200ms targets
   - Tests must fail (no Hasura instance running yet)

4. **Extract test scenarios** from user stories:
   - HR manager employee data queries
   - Real-time department notifications
   - Role-based data access validation
   - High-load concurrent user scenarios

5. **Update CLAUDE.md incrementally**:
   - Add Hasura GraphQL, PostgreSQL, JWT authentication
   - Performance optimization context
   - Real-time subscriptions and WebSocket handling

**Output**: data-model.md, /contracts/\*, failing tests, quickstart.md, CLAUDE.md

## Phase 2: Task Planning Approach

_This section describes what the /tasks command will do - DO NOT execute during /plan_

**Task Generation Strategy**:

- Load `/templates/tasks-template.md` as base
- Performance-first task ordering focusing on response time optimization
- Each GraphQL schema entity → contract test task [P]
- Each authentication flow → security test task [P]
- Each real-time subscription → performance test task
- Migration tasks with data validation checkpoints
- Performance benchmarking tasks throughout implementation

**Ordering Strategy**:

- TDD order: Performance tests → Contract tests → Implementation
- Dependency order: Database schema → Authentication → GraphQL API → Frontend
- Mark [P] for parallel execution (independent schema objects)
- Performance validation gates between major components

**Estimated Output**: 35-40 numbered, performance-focused tasks in tasks.md

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation

_These phases are beyond the scope of the /plan command_

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md with performance benchmarking)  
**Phase 5**: Validation (performance tests, load testing, migration verification)

## Complexity Tracking

_No constitutional violations identified_

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --------- | ---------- | ------------------------------------ |
| N/A       | N/A        | N/A                                  |

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
