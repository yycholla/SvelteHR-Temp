# Implementation Plan: GraphQL API Migration

**Branch**: `006-switch-all-api` | **Date**: 2025-09-09 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/006-switch-all-api/spec.md`

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

Complete migration from REST API to GraphQL API for all data access in SvelteHR application. Replace existing MountainHRApiClient REST calls with GraphQL operations using the comprehensive GraphQL infrastructure already in place. Focus on developer experience improvements through code generation, type safety, and enhanced tooling while maintaining 100% functional parity and zero breaking changes for users.

## Technical Context

**Language/Version**: TypeScript 5.0, JavaScript ES2022, SvelteKit 2.22.0, Svelte 5.0  
**Primary Dependencies**: GraphQL, SvelteKit, Vite 7.0.4, Tailwind CSS 4.0, Better Auth 1.3.4  
**Storage**: GelDB GraphQL Database (localhost:5656), JWT token storage in cookies  
**Testing**: Playwright 1.49.1 (E2E), Vitest 3.2.3 (Unit), Contract Testing for GraphQL schema  
**Target Platform**: Web Browser (modern), SvelteKit SSR/Client-side rendering  
**Project Type**: web - SvelteKit web application with server-side rendering  
**Performance Goals**: <200ms GraphQL query response time, efficient query batching and caching  
**Constraints**: Zero user-facing breaking changes, maintain existing authentication patterns, preserve RBAC  
**Scale/Scope**: 35+ API integration points, 8 core entity types, 25+ UI components affected

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

**Simplicity**:

- Projects: 1 (SvelteKit web application) ✅
- Using framework directly? Yes - SvelteKit, GraphQL client without wrappers ✅
- Single data model? Yes - GraphQL schema matches existing REST data model ✅
- Avoiding patterns? Yes - Direct GraphQL queries, no unnecessary abstractions ✅

**Architecture**:

- EVERY feature as library? N/A - Web application migration, not library development
- Libraries listed: GraphQL client, type generation utilities ✅
- CLI per library: N/A - Web application project ✅
- Library docs: GraphQL schema serves as API documentation ✅

**Testing (NON-NEGOTIABLE)**:

- RED-GREEN-Refactor cycle enforced? Yes - Contract tests fail before GraphQL implementation ✅
- Git commits show tests before implementation? Yes - Test-driven migration approach ✅
- Order: Contract→Integration→E2E→Unit strictly followed? Yes - GraphQL schema → Integration → E2E → Unit ✅
- Real dependencies used? Yes - Actual GelDB GraphQL database ✅
- Integration tests for: GraphQL contract changes, schema validation, RBAC enforcement ✅
- FORBIDDEN: Implementation before test, skipping RED phase ✅

**Observability**:

- Structured logging included? Yes - GraphQL query logging, performance metrics ✅
- Frontend logs → backend? Yes - GraphQL errors captured server-side ✅
- Error context sufficient? Yes - GraphQL error extensions with context ✅

**Versioning**:

- Version number assigned? Migration-based versioning (006-switch-all-api) ✅
- BUILD increments on every change? Handled by existing SvelteHR versioning ✅
- Breaking changes handled? Zero breaking changes - maintains API parity ✅

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

**Structure Decision**: Option 1 (Single project) - SvelteKit web application with existing structure maintained

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

**Output**: research.md with all technical unknowns resolved ✅ **COMPLETE**

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
   - Run `/scripts/update-agent-context.sh [claude|gemini|copilot]` for your AI assistant
   - If exists: Add only NEW tech from current plan
   - Preserve manual additions between markers
   - Update recent changes (keep last 3)
   - Keep under 150 lines for token efficiency
   - Output to repository root

**Output**: data-model.md ✅, /contracts/schema.graphql ✅, quickstart.md ✅, CLAUDE.md (updated) ✅ **COMPLETE**

## Phase 2: Task Planning Approach

_This section describes what the /tasks command will do - DO NOT execute during /plan_

**Task Generation Strategy**:

- Load existing GraphQL infrastructure analysis from research.md
- Generate migration tasks for each API integration point (35+ identified)
- Group by functional area: Authentication → Core Entities → Dashboard → Advanced Features
- Each REST endpoint → GraphQL query/mutation migration task
- Each +page.server.ts file → server-side GraphQL integration task  
- Each component with API dependencies → client integration task
- Performance validation and testing tasks
- Code generation tooling setup tasks

**Ordering Strategy**:

- **Phase A: Foundation** (Tasks 1-8): GraphQL tooling, code generation, base client setup
- **Phase B: Core Migration** (Tasks 9-20): Authentication, Employee, Department entities  
- **Phase C: UI Integration** (Tasks 21-28): Dashboard, complex UI components, real-time features
- **Phase D: Validation** (Tasks 29-35): Testing, performance validation, documentation
- Mark [P] for parallel execution within phases
- Server-side migrations can run in parallel with UI component updates

**Estimated Output**: 35-40 numbered, ordered tasks in tasks.md organized into 4 phases

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation

_These phases are beyond the scope of the /plan command_

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking

_No constitutional violations detected - all requirements met within established guidelines_

✅ **CONSTITUTION COMPLIANT** - No justifications required

## Progress Tracking

_This checklist is updated during execution flow_

**Phase Status**:

- [✅] Phase 0: Research complete (/plan command)
- [✅] Phase 1: Design complete (/plan command)
- [✅] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:

- [✅] Initial Constitution Check: PASS
- [✅] Post-Design Constitution Check: PASS
- [✅] All technical unknowns resolved
- [✅] No complexity deviations - fully compliant

---

_Based on Constitution v2.1.1 - See `/memory/constitution.md`_
