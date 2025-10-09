# Implementation Plan: Events Calendar UI Integration

**Branch**: `027-we-need-to` | **Date**: 2025-10-08 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/027-we-need-to/spec.md`

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

Build comprehensive UI components to integrate with the completed events calendar backend (feature 025-events-flesh-out). Primary requirement: Create enhanced EventDetailsDialog, EventCreateDialog, and EventCalendar components with full support for recurring events (RRULE), RSVP with scope selection, capacity/waitlist management, image uploads (16:9/9:16 aspect ratios), conflict detection, notification preferences, iCal export, and attendee management. All components must use Svelte 5 runes, shadcn-svelte, GraphQL operations from events-operations.ts, be mobile responsive, and meet WCAG 2.1 AA accessibility standards.

## Technical Context

**Language/Version**: TypeScript 5.0, Svelte 5.0, SvelteKit 2.22.0, Node.js 20
**Primary Dependencies**: shadcn-svelte, Bits UI 2.9.1, Tailwind CSS 4.0, FullCalendar 6.x, Sharp (image processing), urql (GraphQL client), Zod 4.0.14, date-fns 4.1.0
**Storage**: PostgreSQL 15 (via existing PostGraphile backend), Redis 7 (existing)
**Testing**: Playwright 1.49.1 (E2E), Vitest 3.2.3 (unit), Storybook 9.1.1 (component development)
**Target Platform**: Modern web browsers (Chrome, Firefox, Safari), mobile-responsive design
**Project Type**: Web application (frontend integration with existing backend)
**Performance Goals**: 3-month calendar buffer load, real-time event updates, <1s page load
**Constraints**: Online-only (no offline support), 10MB image upload limit, 5-year recurring event limit, 200-char event titles, 5000-char descriptions
**Scale/Scope**: 8 major UI components, 57 acceptance scenarios, 91 functional requirements, integration with 025-events-flesh-out backend

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

### I. Test-First Development ✅
- **Status**: PASS
- **Plan**: All UI components will have Playwright E2E tests for user journeys (57 scenarios), Vitest unit tests for component logic, Storybook stories for visual testing
- **Coverage Target**: >90% (per constitution)

### II. Type Safety First ✅
- **Status**: PASS
- **Plan**: TypeScript 5.0 strict mode, all GraphQL operations use generated types from events-operations.ts, Zod schemas for form validation, proper Svelte 5 prop types with `$props`

### III. Security by Design ✅
- **Status**: PASS
- **Plan**: Backend (025) already implements RLS and RBAC. UI respects permissions from backend, JWT authentication handled by existing auth system, input validation via Zod, no sensitive data in client code

### IV. Performance Standards ✅
- **Status**: PASS
- **Plan**: 3-month calendar buffer (load optimization), real-time GraphQL subscriptions for updates, image optimization with Sharp, code splitting for FullCalendar, <1s page load target

### V. Component Architecture ✅
- **Status**: PASS
- **Plan**: All components follow shadcn-svelte patterns, Svelte 5 runes (`$state`, `$derived`, `$props`, `$bindable`), server-side data loading via `+page.server.ts`, Storybook documentation, consistent error/loading states

### VI. MCP-First Development ✅
- **Status**: PASS
- **Plan**: Will use Serena MCP for code discovery (`get_symbols_overview`, `find_file`), surgical edits (`replace_symbol_body`), impact validation (`find_referencing_symbols`), and Archon MCP for task management per CLAUDE.md

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

**Structure Decision**: Option 2 (Web application) - SvelteKit frontend with existing PostGraphile backend

**Actual Project Structure**:
```
src/
├── lib/
│   ├── components/
│   │   └── events/         # Feature 027 components
│   │       ├── EventDetailsDialog.svelte
│   │       ├── EventCreateDialog.svelte
│   │       ├── EventCalendar.svelte
│   │       ├── ImageUploadWidget.svelte
│   │       ├── ConflictWarningDialog.svelte
│   │       ├── AttendeePickerModal.svelte
│   │       ├── AttendeeListView.svelte
│   │       └── (existing 025 components)
│   ├── graphql/
│   │   └── events-operations.ts  # Existing GraphQL queries/mutations
│   ├── stores/
│   │   └── notifications.ts       # Notification preferences store
│   └── utils/
│       └── calendar.ts            # Calendar utility functions
├── routes/
│   └── dashboard/
│       ├── events/
│       │   ├── +page.svelte       # Main calendar view
│       │   ├── +page.server.ts    # Server-side data loading
│       │   └── settings/
│       │       └── +page.svelte   # Notification preferences
└── tests/
    ├── e2e/
    │   └── events-calendar.spec.ts
    └── unit/
        └── components/
            └── events/

backend/ (existing - no changes needed)
```

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

The `/tasks` command will generate tasks from Phase 1 artifacts following TDD principles:

1. **Contract Test Tasks** (from `contracts/component-contracts.ts`):
   - One contract test per component (8 components)
   - Verify component props interfaces
   - Test required prop validation
   - Test callback invocation

2. **Component Implementation Tasks** (from `data-model.md` + `quickstart.md`):
   - EventCalendar component with FullCalendar integration
   - EventDetailsDialog with tabbed interface (Details/Comments/History)
   - EventCreateDialog with recurring pattern builder
   - ImageUploadWidget with cropperjs integration
   - ConflictWarningDialog with severity calculation
   - AttendeePickerModal with search/filter
   - AttendeeListView with RSVP status filtering
   - NotificationPreferencesPage with Svelte store

3. **GraphQL Integration Tasks** (from `data-model.md` GraphQL operations):
   - Implement calendar event queries with 3-month buffer
   - Implement event creation mutation with image upload
   - Implement RSVP mutation with scope selection
   - Implement waitlist mutation
   - Implement comment posting mutation
   - Implement notification preferences mutation
   - Implement real-time subscription for event updates
   - Implement real-time subscription for waitlist promotion

4. **Utility Function Tasks** (from `data-model.md` validation):
   - Conflict detection algorithm
   - RRULE generation from recurrence pattern
   - Date buffer calculation (3-month window)
   - Aspect ratio validation
   - Image size validation
   - Overlap duration calculation

5. **E2E Test Tasks** (from `quickstart.md` scenarios):
   - 12 quickstart scenarios → 12 E2E test files
   - Each test covers user journey end-to-end
   - Tests include visual assertions, interaction testing

6. **Integration Tasks**:
   - Wire EventCalendar to dashboard route
   - Connect components to GraphQL operations
   - Implement optimistic UI updates
   - Add error handling and loading states
   - Integrate existing 025 components (RecurrenceScopeDialog, etc.)

**Ordering Strategy**:

```
Priority 1 (Foundation):
- [P] Contract tests for all components
- [P] Utility functions (conflict detection, RRULE, etc.)
- [P] GraphQL query/mutation implementations

Priority 2 (Components - can parallelize):
- [P] EventCalendar component + unit tests
- [P] EventCreateDialog component + unit tests
- [P] EventDetailsDialog component + unit tests
- [P] ImageUploadWidget component + unit tests
- [P] ConflictWarningDialog component + unit tests
- [P] AttendeePickerModal component + unit tests
- [P] AttendeeListView component + unit tests
- [P] NotificationPreferencesPage component + unit tests

Priority 3 (Integration):
- Wire calendar to /dashboard/events route
- Implement GraphQL subscriptions
- Add optimistic UI updates
- Integrate existing 025 components

Priority 4 (Testing):
- [P] E2E test: View calendar scenario
- [P] E2E test: Create event scenario
- [P] E2E test: RSVP recurring scenario
- [P] E2E test: Join waitlist scenario
- [P] E2E test: Drag-drop reschedule scenario
- [P] E2E test: Comment on event scenario
- [P] E2E test: View history scenario
- [P] E2E test: Conflict detection scenario
- [P] E2E test: Notification preferences scenario
- [P] E2E test: Export iCal scenario
- [P] E2E test: Mobile responsive scenario
- [P] E2E test: Real-time updates scenario

Priority 5 (Polish):
- Accessibility audit with screen reader
- Performance benchmarking (3-month buffer load)
- Image upload performance testing
- Mobile device testing (iOS/Android)
```

**Task Dependencies**:

- E2E tests depend on component implementations
- Component implementations depend on contract tests passing (TDD)
- Integration tasks depend on component implementations
- GraphQL operations can be developed in parallel with components

**Estimated Output**: ~50 tasks total

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
- [x] Complexity deviations documented (none - all constitutional principles followed)

---

_Based on Constitution v2.1.1 - See `/memory/constitution.md`_
