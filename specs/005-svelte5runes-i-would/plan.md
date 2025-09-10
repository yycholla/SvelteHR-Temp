# Implementation Plan: Svelte 5 Runes Migration & Best Practices

**Branch**: `005-svelte5runes-i-would` | **Date**: 2025-09-09 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/home/chanway/Projects/SvelteHR/specs/005-svelte5runes-i-would/spec.md`

## Execution Flow (/plan command scope)

```
1. Load feature spec from Input path
   → ✅ Spec loaded successfully
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → ✅ Context identified from existing SvelteHR codebase
   → ✅ Project Type: web (frontend SvelteKit + backend GraphQL)
   → ✅ Structure Decision: Option 2 (Web application)
3. Evaluate Constitution Check section below
   → ✅ Evaluating against architectural principles
   → Update Progress Tracking: Initial Constitution Check
4. Execute Phase 0 → research.md
   → ✅ All clarifications resolved from user input
5. Execute Phase 1 → contracts, data-model.md, quickstart.md, agent-specific template file (e.g., `CLAUDE.md` for Claude Code, `.github/copilot-instructions.md` for GitHub Copilot, or `GEMINI.md` for Gemini CLI).
6. Re-evaluate Constitution Check section
   → If new violations: Refactor design, return to Phase 1
   → Update Progress Tracking: Post-Design Constitution Check
7. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
8. ✅ STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 7. Phases 2-4 are executed by other commands:

- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary

**Primary Requirement**: Migrate the SvelteHR application to use modern Svelte 5 runes best practices, replacing traditional Svelte stores and reactive statements with $state, $derived, $props, $bindable, and $effect runes. Focus on performance optimization through preloading, caching, and streamlined maintenance patterns.

**Technical Approach**: Systematic migration of existing components and stores to Svelte 5 runes syntax, implementation of performance optimization utilities (hover preloading, reactive caching), and integration with existing GraphQL backend while maintaining RBAC authentication patterns.

## Technical Context

**Language/Version**: TypeScript 5.0, Svelte 5.0, SvelteKit 2.22.0
**Primary Dependencies**: Vite 7.0.4, Tailwind CSS 4.0, Better Auth 1.3.4, GraphQL client, Skeleton UI 3.1.7, Bits UI 2.9.1
**Storage**: GelDB (GraphQL database), Redis caching, JWT tokens via cookies
**Testing**: Vitest 3.2.3 (unit), Playwright 1.49.1 (e2e), Storybook 9.1.1 (component)
**Target Platform**: Web browsers (Chrome, Firefox, Safari), development on Linux
**Project Type**: web - SvelteKit frontend with GraphQL backend
**Performance Goals**: <200ms page load with preloading, 95%+ lighthouse scores, smooth 60fps interactions
**Constraints**: Proof-of-concept context, full replacement approach (no rollback), maintain existing RBAC functionality
**Scale/Scope**: ~50 components, 10+ stores, 20+ routes, GraphQL integration, authentication system

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

**Simplicity**:

- Projects: 1 (SvelteHR frontend with GraphQL backend integration)
- Using framework directly? ✅ Yes - Direct Svelte 5 runes, no wrapper abstractions
- Single data model? ✅ Yes - Unified reactive state with GraphQL schema alignment
- Avoiding patterns? ✅ Yes - Direct runes usage, no unnecessary abstractions

**Architecture**:

- EVERY feature as library? ✅ Yes - Modular component library, utility libraries
- Libraries listed: 
  - `auth.svelte.ts` - Authentication state management with runes
  - `cache.svelte.ts` - Reactive caching system
  - `ui/` - Component library with runes patterns
  - `utils/` - Performance utilities (preloading, etc.)
- CLI per library: N/A (frontend components, not CLI libraries)
- Library docs: Component documentation via Storybook, inline JSDoc

**Testing (NON-NEGOTIABLE)**:

- RED-GREEN-Refactor cycle enforced? ✅ Yes - Tests written before runes migration
- Git commits show tests before implementation? ✅ Yes - Following TDD approach
- Order: Contract→Integration→E2E→Unit strictly followed? ✅ Yes for new components
- Real dependencies used? ✅ Yes - Actual GraphQL endpoints, real auth flow
- Integration tests for: ✅ Yes - Component integration, GraphQL queries, auth flows
- FORBIDDEN: ✅ Implementation follows failing tests first

**Observability**:

- Structured logging included? ✅ Yes - Console logging with development/production modes
- Frontend logs → backend? ✅ Yes - Error tracking and performance metrics
- Error context sufficient? ✅ Yes - User-friendly error handling with technical context

**Versioning**:

- Version number assigned? ✅ Yes - 0.0.1 (proof-of-concept)
- BUILD increments on every change? ✅ Yes - Via package.json and CI/CD
- Breaking changes handled? ✅ Yes - Migration approach with component compatibility

## Project Structure

### Documentation (this feature)

```
specs/005-svelte5runes-i-would/
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

# Option 2: Web application (SvelteKit frontend + GraphQL backend)
src/
├── lib/
│   ├── components/
│   │   ├── ui/           # Runes-based UI components
│   │   ├── auth/         # Authentication components
│   │   └── layouts/      # Layout components with preloading
│   ├── stores/           # Svelte 5 runes stores (.svelte.ts)
│   ├── utils/            # Performance utilities, caching
│   ├── types/            # TypeScript definitions
│   └── graphql/          # GraphQL client and operations
├── routes/               # SvelteKit file-based routing
└── app.html             # Root template

tests/
├── integration/          # Component integration tests
├── e2e/                  # Playwright end-to-end tests
└── unit/                 # Vitest unit tests

# Option 3: Mobile + API (when "iOS/Android" detected)
api/
└── [same as backend above]

ios/ or android/
└── [platform-specific structure]
```

**Structure Decision**: Option 2 (Web application) - SvelteKit frontend with existing GraphQL backend

## Phase 0: Outline & Research

1. **Extract unknowns from Technical Context** above:
   - ✅ Svelte 5 runes patterns - RESOLVED via Archon MCP research
   - ✅ Performance optimization strategies - RESOLVED via research
   - ✅ Migration approach - RESOLVED (full replacement strategy)
   - ✅ GraphQL integration patterns - RESOLVED via codebase analysis

2. **Generate and dispatch research agents**:
   - ✅ Task: "Research Svelte 5 runes best practices" - COMPLETED
   - ✅ Task: "Research performance optimization patterns" - COMPLETED
   - ✅ Task: "Analyze existing codebase for migration targets" - COMPLETED

3. **Consolidate findings** in `research.md`

**Output**: ✅ research.md with all technical unknowns resolved

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

**Output**: data-model.md, /contracts/\*, failing tests, quickstart.md, agent-specific file

## Phase 2: Task Planning Approach

_This section describes what the /tasks command will do - DO NOT execute during /plan_

**Task Generation Strategy**:

- Load `/templates/tasks-template.md` as base
- Generate tasks from Phase 1 design docs (contracts, data model, quickstart)
- Each contract → contract test task [P]
- Each entity → model creation task [P]
- Each user story → integration test task
- Implementation tasks to make tests pass

**Ordering Strategy**:

- TDD order: Tests before implementation
- Dependency order: Models before services before UI
- Mark [P] for parallel execution (independent files)

**Estimated Output**: 25-30 numbered, ordered tasks in tasks.md

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
- [x] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:

- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [ ] Complexity deviations documented

---

_Based on Constitution v2.1.1 - See `/memory/constitution.md`_
