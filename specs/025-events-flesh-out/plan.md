# Implementation Plan: Events Calendar System - Full Implementation

**Branch**: `025-events-flesh-out` | **Date**: 2025-10-07 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/home/yycholla/Documents/SvelteHR/specs/025-events-flesh-out/spec.md`

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

Comprehensive events calendar system for workplace event management with public/private event sharing, RSVP tracking (Accepted/Declined/Tentative/Pending), attendee management, recurring events (daily/weekly/monthly/annual), conflict detection, capacity limits with waitlists, notifications, reminders, iCal export, event comments, and change history tracking. Built on existing SvelteKit + PostgreSQL/PostGraphile GraphQL backend with FullCalendar integration.

## Technical Context

**Language/Version**: TypeScript 5.0, Svelte 5.0, SvelteKit 2.22.0
**Primary Dependencies**: FullCalendar 6.x, PostgreSQL + PostGraphile (GraphQL), urql (GraphQL client), Svelte 5 runes, shadcn-svelte UI components, Better Auth 1.3.4
**Storage**: PostgreSQL with PostGraphile GraphQL API, existing events/attendees tables, new tables for recurring events, comments, notifications, history
**Testing**: Playwright (E2E), Vitest (unit/integration), Storybook (components)
**Target Platform**: Web (SvelteKit SSR + CSR), modern browsers (Chrome/Firefox/Safari)
**Project Type**: web (frontend + backend via GraphQL)
**Performance Goals**: <200ms GraphQL operations, <1s page load, real-time notifications, efficient calendar rendering for 1000+ events
**Constraints**: 10 MB image upload limit with auto-optimization, RBAC enforcement, JWT authentication, accessibility (WCAG 2.1 AA), mobile-responsive
**Scale/Scope**: Enterprise HR system, 10k+ users, recurring event series management, conflict detection across user calendars, waitlist automation

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

### I. Test-First Development ✅
- E2E tests with Playwright for user journeys (event creation, RSVP, recurring events)
- Unit tests with Vitest for components and business logic
- Contract tests for GraphQL operations
- Target: >90% coverage
- **Compliance**: Tests written first, RED-GREEN-REFACTOR cycle mandatory

### II. Type Safety First ✅
- TypeScript 5.0 strict mode enabled
- Generated types from GraphQL schema for all operations
- Zod schemas for form validation
- No `any` types without justification
- **Compliance**: All API responses, props, data structures properly typed

### III. Security by Design ✅
- Row-Level Security (RLS) at PostgreSQL level for events/attendees
- JWT authentication with RBAC (Admin 100, HR 80, Manager 60, Employee 20)
- Zod input validation for all forms
- Audit logging for event modifications (history tracking per FR-056)
- Image upload validation (10 MB limit, type checking)
- **Compliance**: Security enforced at database and API layers

### IV. Performance Standards ✅
- GraphQL operations <200ms (indexed queries required)
- Page load <1s (code splitting, lazy loading)
- Redis caching for frequently accessed events
- Efficient FullCalendar rendering (virtualization for large datasets)
- Image auto-optimization to reduce bundle size
- **Compliance**: Performance targets defined in constraints

### V. Component Architecture ✅
- shadcn-svelte UI patterns for all components
- Svelte 5 runes ($state, $derived, $props, $bindable) for reactive state
- Server-side data loading via +page.server.ts (no direct API calls from components)
- Storybook documentation for calendar components
- Consistent error/loading states
- **Compliance**: Follows established SvelteHR patterns

### VI. MCP-First Development ✅
- Serena MCP onboarding check before implementation
- Archon MCP as primary task management system
- Code discovery with `list_dir()`, `find_file()`, `get_symbols_overview()`
- Surgical modifications with `replace_symbol_body()`, `insert_after_symbol()`
- Impact validation with `find_referencing_symbols()`
- Task adherence verification before implementation
- **Compliance**: MCP workflow integrated throughout development phases

**Initial Gate**: ✅ PASS - No violations detected, all principles addressable

**Post-Design Gate**: ✅ PASS - Design adheres to all constitutional principles:
- Test contracts defined in GraphQL schema
- TypeScript types will be generated from GraphQL
- RLS policies defined in data model
- Performance indexes specified
- Component architecture follows shadcn-svelte patterns
- MCP tools will be used throughout implementation

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

**Structure Decision**: Option 2 - Web application (SvelteKit frontend + PostgreSQL/PostGraphile GraphQL backend)

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

1. **Database Layer (Foundation)**
   - Create migration files for new tables (events extensions, waitlist, comments, history, notifications)
   - Create indexes and triggers from data-model.md
   - Apply RLS policies
   - Seed test data

2. **GraphQL Layer (Contract Implementation)**
   - Generate TypeScript types from GraphQL schema
   - Implement resolvers for queries (events, myEvents, conflictingEvents, etc.)
   - Implement resolvers for mutations (createEvent, updateRsvpStatus, etc.)
   - Implement resolvers for subscriptions (real-time updates)
   - Contract tests for each resolver

3. **Business Logic Layer**
   - RRULE parsing/generation service
   - Image upload/optimization service (Sharp integration)
   - Conflict detection service
   - Waitlist management service
   - Notification service (WebSocket + email)
   - iCal export service

4. **UI Components Layer**
   - EventCalendar component (FullCalendar integration)
   - EventDetailsDialog component (view/edit)
   - EventCreateDialog component
   - RSVPButton component (with scope selection)
   - WaitlistButton component
   - EventCommentThread component
   - EventHistoryView component
   - NotificationBell component
   - NotificationPreferences component

5. **Page Routes Layer**
   - /dashboard/events (+page.server.ts + +page.svelte)
   - /dashboard/events/[id] (event details)
   - /dashboard/settings/notifications (preferences)
   - API routes for image upload, iCal export

6. **Testing Layer (E2E)**
   - Event creation E2E test
   - Recurring event E2E test
   - RSVP flow E2E test
   - Waitlist E2E test
   - Conflict detection E2E test
   - Comments E2E test
   - Notifications E2E test
   - iCal export E2E test

**Ordering Strategy**:

- **Phase 1**: Database migrations [P] → Database tests
- **Phase 2**: GraphQL schema → Contract tests [P] → Resolver implementations → Resolver tests
- **Phase 3**: Services [P] → Service tests
- **Phase 4**: UI components [P] → Component tests → Storybook stories
- **Phase 5**: Page routes → Route tests
- **Phase 6**: E2E test scenarios [P]
- **Phase 7**: Integration testing → Performance validation

**Dependency Handling**:
- Mark [P] for parallelizable tasks (independent files)
- Database layer blocks GraphQL layer
- GraphQL layer blocks services/UI
- All implementation blocks E2E tests

**Estimated Output**: 45-55 numbered, dependency-ordered tasks in tasks.md

**Key Task Categories**:
1. Database (8-10 tasks): Migrations, indexes, triggers, RLS, seed data
2. GraphQL (12-15 tasks): Schema, resolvers, contracts, subscriptions
3. Services (10-12 tasks): RRULE, images, conflicts, waitlist, notifications, iCal
4. UI Components (15-18 tasks): Calendar, dialogs, buttons, comments, history
5. Routes (5-6 tasks): Pages, API endpoints
6. Testing (8-10 tasks): E2E scenarios, performance tests

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

- [x] Phase 0: Research complete (/plan command) - research.md created
- [x] Phase 1: Design complete (/plan command) - data-model.md, contracts/, quickstart.md, CLAUDE.md updated
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [x] Phase 3: Tasks generated (/tasks command) - 52 tasks in tasks.md
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:

- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved (via /clarify command)
- [x] Complexity deviations documented (none)

**Artifacts Generated**:
- ✅ research.md - Technology decisions and research findings
- ✅ data-model.md - Database schema, entities, relationships, GraphQL types
- ✅ contracts/events-api.graphql - GraphQL API contract
- ✅ quickstart.md - Step-by-step validation scenarios
- ✅ CLAUDE.md - Updated agent context with new technologies

---

_Based on Constitution v2.1.1 - See `/memory/constitution.md`_
