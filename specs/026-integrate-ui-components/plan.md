# Implementation Plan: Integrate Events UI Components

**Branch**: `026-integrate-ui-components` | **Date**: 2025-10-08 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/026-integrate-ui-components/spec.md`

## Execution Flow (/plan command scope)

```
1. Load feature spec from Input path
   → ✅ Loaded successfully from spec.md
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → ✅ No NEEDS CLARIFICATION - integration guide provides clear direction
   → Detected Project Type: web (SvelteKit frontend + existing components)
   → Set Structure Decision: Option 2 (frontend integration only)
3. Fill the Constitution Check section based on the content of the constitution document.
   → ✅ Constitution loaded and gates defined
4. Evaluate Constitution Check section below
   → ✅ All gates passed - integration task aligns with constitutional principles
   → Update Progress Tracking: Initial Constitution Check PASS
5. Execute Phase 0 → research.md
   → ✅ Research complete - existing components and integration patterns identified
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, CLAUDE.md updates
   → ✅ Design artifacts created
7. Re-evaluate Constitution Check section
   → ✅ No new violations - design adheres to Svelte 5 runes and component patterns
   → Update Progress Tracking: Post-Design Constitution Check PASS
8. Plan Phase 2 → Describe task generation approach
   → ✅ Task strategy defined
9. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 8. Phases 2-4 are executed by other commands:

- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary

This feature integrates 6 pre-built UI components from feature 025-events-flesh-out into the existing EventDetailsDialog:

1. **RecurrenceScopeDialog** - RSVP scope selection for recurring events
2. **EventCapacityIndicator** - Visual capacity tracking with progress bars
3. **WaitlistButton** - Join/leave waitlist functionality
4. **EventCommentThread** - Event discussions with @mentions, pagination (20 per page), XSS sanitization
5. **EventHistoryView** - Audit trail with pagination (25 per page), accordion UI
6. **Tab-based interface** - Details, Comments, History tabs with badge counts

Technical approach: Enhance existing EventDetailsDialog.svelte component following integration guide in EventDetailsDialog-025-updates.md. All data fetching happens server-side in +page.server.ts with GraphQL queries. Components follow Svelte 5 runes patterns and shadcn-svelte design system. Backward compatibility maintained for events without new features.

## Technical Context

**Language/Version**: TypeScript 5.0, Svelte 5.0, SvelteKit 2.22.0
**Primary Dependencies**:
- UI: Svelte 5 runes, shadcn-svelte, Tailwind CSS 4.0, Bits UI 2.9.1
- Data: urql (GraphQL client), Zod 4.0.14 (validation), date-fns 4.1.0
- Existing components from feature 025: RecurrenceScopeDialog, EventCapacityIndicator, WaitlistButton, EventCommentThread, EventHistoryView
**Storage**: PostgreSQL 14+ (existing tables: event_comments, event_history, event_waitlist from feature 025)
**Testing**: Vitest 3.2.3 (unit), Playwright 1.49.1 (E2E), Storybook 9.1.1 (component docs)
**Target Platform**: Web browsers (Chrome, Firefox, Safari), server-side rendering via SvelteKit
**Project Type**: web (frontend component integration, server-side data loading)
**Performance Goals**:
- Tab switching <100ms
- Comment/history load <200ms
- GraphQL queries <200ms (per constitution)
**Constraints**:
- Comment pagination: 20 per load with "Load More"
- History pagination: 25 per load with "Load More"
- Timestamp transition: 48 hours (relative → absolute)
- XSS protection: Strip all HTML/JavaScript, preserve plain text + @mentions
- Inline error messages for failed operations (no page refresh required)
- Backward compatibility: No breaking changes to existing EventDetailsDialog
**Scale/Scope**:
- 6 component integrations
- 3 new tabs (Details, Comments, History)
- Server-side data fetching in +page.server.ts
- Integration guide: EventDetailsDialog-025-updates.md

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

Based on SvelteHR Constitution v1.1.0:

### I. Test-First Development (TDD)
- ✅ **PASS**: Component integration tests will be written first using Vitest
- ✅ **PASS**: E2E tests for tab navigation, comments, history using Playwright
- ✅ **PASS**: All tests must fail initially (RED), then implementation makes them pass (GREEN)

### II. Type Safety First
- ✅ **PASS**: TypeScript 5.0 with strict mode, no `any` types
- ✅ **PASS**: GraphQL type generation from schema for comments/history queries
- ✅ **PASS**: All component props properly typed with Svelte 5 `$props` rune

### III. Security by Design
- ✅ **PASS**: RLS policies already in place for event_comments, event_history tables (feature 025)
- ✅ **PASS**: JWT authentication with RBAC enforced server-side
- ✅ **PASS**: XSS protection: HTML/JavaScript stripping via sanitization (FR-017c)
- ✅ **PASS**: Input validation using Zod schemas
- ✅ **PASS**: Audit logging via event_history table

### IV. Performance Standards
- ✅ **PASS**: GraphQL queries <200ms (per constitution)
- ✅ **PASS**: Pagination prevents unbounded data loads (20 comments, 25 history)
- ✅ **PASS**: Tab switching optimized with lazy loading
- ⚠️ **MONITOR**: Bundle size with 6 new components (code splitting may be needed)

### V. Component Architecture
- ✅ **PASS**: Follows shadcn-svelte patterns
- ✅ **PASS**: Svelte 5 runes ($state, $derived, $props, $bindable) required
- ✅ **PASS**: No direct API calls from components - server-side data loading in +page.server.ts
- ✅ **PASS**: Consistent error handling (inline error messages per FR-017a, FR-012a)
- ✅ **PASS**: Components self-contained and reusable

### VI. MCP-First Development
- ✅ **PASS**: Will use Serena MCP for code discovery before modifications
- ✅ **PASS**: Will use `replace_symbol_body` for surgical component updates
- ✅ **PASS**: Will use `find_referencing_symbols` to validate integration impact
- ✅ **PASS**: Archon MCP as primary task system (per CLAUDE.md)

**Overall Status**: ✅ ALL GATES PASSED - Ready for Phase 0

## Project Structure

### Documentation (this feature)

```
specs/026-integrate-ui-components/
├── spec.md              # Feature specification (input)
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
│   └── events-ui-integration.graphql
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)

```
# Web application structure (Option 2)
src/
├── lib/
│   ├── components/
│   │   ├── events/
│   │   │   ├── EventDetailsDialog.svelte       # ⚠️ MODIFY: Add tabs, integrate components
│   │   │   ├── RecurrenceScopeDialog.svelte    # ✅ EXISTS: From feature 025
│   │   │   ├── EventCapacityIndicator.svelte   # ✅ EXISTS: From feature 025
│   │   │   ├── WaitlistButton.svelte           # ✅ EXISTS: From feature 025
│   │   │   ├── EventCommentThread.svelte       # ✅ EXISTS: From feature 025
│   │   │   ├── EventHistoryView.svelte         # ✅ EXISTS: From feature 025
│   │   │   └── EventDetailsDialog-025-updates.md  # ✅ EXISTS: Integration guide
│   │   └── ui/
│   │       ├── tabs/                           # ✅ EXISTS: Shadcn-svelte tabs
│   │       └── badge/                          # ✅ EXISTS: Shadcn-svelte badge
│   ├── graphql/
│   │   └── events-operations.ts                # ⚠️ MODIFY: Add comments, history queries
│   └── utils/
│       └── sanitize.ts                         # ➕ NEW: XSS sanitization utility
├── routes/
│   └── dashboard/
│       └── events/
│           ├── +page.server.ts                 # ⚠️ MODIFY: Add comments, history data loading
│           └── +page.svelte                    # ⚠️ MODIFY: Pass new data to EventDetailsDialog
└── tests/
    ├── unit/
    │   └── components/
    │       └── events/
    │           └── EventDetailsDialog.spec.ts  # ➕ NEW: Unit tests for integration
    └── e2e/
        └── events/
            ├── event-details-tabs.spec.ts      # ➕ NEW: Tab navigation E2E
            ├── event-comments.spec.ts          # ➕ NEW: Comments CRUD E2E
            └── event-history.spec.ts           # ➕ NEW: History display E2E
```

**Structure Decision**: Option 2 (web) - Frontend component integration with server-side data loading

## Phase 0: Outline & Research

### 1. Extract unknowns from Technical Context

✅ **No unknowns** - All technical context is clear:
- Components already exist from feature 025
- Integration guide (EventDetailsDialog-025-updates.md) provides clear patterns
- Server-side data fetching patterns established in +page.server.ts
- Svelte 5 runes and shadcn-svelte patterns documented

### 2. Research Tasks

Since components are pre-built and integration guide exists, research focuses on:

#### R1: Review Existing Components
- **Task**: Analyze feature 025 component implementations
- **Goal**: Understand props interfaces, state management, event handlers
- **Output**: Component API documentation

#### R2: Integration Patterns
- **Task**: Review EventDetailsDialog-025-updates.md integration guide
- **Goal**: Understand tab structure, data flow, component placement
- **Output**: Integration strategy

#### R3: GraphQL Query Requirements
- **Task**: Identify data requirements for comments, history, waitlist
- **Goal**: Define GraphQL query shapes and pagination strategies
- **Output**: Query specifications

#### R4: XSS Sanitization Strategy
- **Task**: Research HTML/JavaScript stripping approaches for comment content
- **Goal**: Preserve plain text + @mentions, remove all malicious content
- **Output**: Sanitization utility design

### 3. Consolidated Findings

**Output**: research.md (generated below)

## Phase 1: Design & Contracts

_Prerequisites: research.md complete_

### 1. Extract entities from feature spec → data-model.md

Entities already defined in feature 025 database schema:
- **EventComment**: id, event_id, employee_id, content, mentions[], created_at, updated_at
- **EventHistory**: id, event_id, changed_by, field_name, old_value, new_value, change_type, created_at
- **EventWaitlist**: id, event_id, employee_id, position, joined_at

Data model focuses on **component integration contracts**:
- EventDetailsDialog props interface
- Tab component data requirements
- Comment/history pagination state

### 2. Generate API contracts → /contracts/events-ui-integration.graphql

GraphQL operations for:
- Query: eventComments(eventId, limit, offset)
- Query: eventHistory(eventId, limit, offset)
- Query: eventWaitlistStatus(eventId, userId)
- Mutation: createEventComment(eventId, content, mentions)
- Mutation: updateEventComment(commentId, content)
- Mutation: deleteEventComment(commentId)
- Mutation: joinEventWaitlist(eventId)
- Mutation: leaveEventWaitlist(eventId)

### 3. Generate contract tests

Contract tests in tests/contract/events/:
- test_event_details_tabs.ts - Tab navigation contract
- test_event_comments_pagination.ts - Comments pagination (20 limit)
- test_event_history_pagination.ts - History pagination (25 limit)
- test_comment_sanitization.ts - XSS stripping contract

### 4. Extract test scenarios → quickstart.md

Quickstart test validates:
1. Open event details dialog
2. Navigate to Comments tab (see badge count)
3. Add comment with @mention
4. Verify XSS sanitization (HTML stripped)
5. Navigate to History tab
6. Verify change entries displayed
7. Test pagination (Load More buttons)
8. Verify backward compatibility (event without comments/history)

### 5. Update CLAUDE.md incrementally

Execute: `.specify/scripts/bash/update-agent-context.sh claude`
- Add: RecurrenceScopeDialog, EventCapacityIndicator, WaitlistButton, EventCommentThread, EventHistoryView integration
- Add: Comment pagination (20), history pagination (25), timestamp threshold (48h)
- Add: XSS sanitization requirement
- Preserve: Existing event system context from feature 025

**Output**: data-model.md, /contracts/events-ui-integration.graphql, contract tests, quickstart.md, CLAUDE.md updated

## Phase 2: Task Planning Approach

_This section describes what the /tasks command will do - DO NOT execute during /plan_

**Task Generation Strategy**:

1. **Load** `.specify/templates/tasks-template.md` as base
2. **Generate tasks from Phase 1 design**:
   - Contract test tasks (7 tests) [P]
   - Component integration tasks (sequential)
   - Server-side data loading tasks [P]
   - E2E test tasks (3 suites)

**Task Categories**:

**Setup (2 tasks)**:
- T001: Create XSS sanitization utility (src/lib/utils/sanitize.ts)
- T002: Add GraphQL operations for comments/history (src/lib/graphql/events-operations.ts)

**Contract Tests (7 tasks)** - All [P] (parallel):
- T003: Write tab navigation contract test
- T004: Write comments pagination contract test (20 limit)
- T005: Write history pagination contract test (25 limit)
- T006: Write comment sanitization contract test
- T007: Write timestamp transition contract test (48h threshold)
- T008: Write inline error handling contract test
- T009: Write backward compatibility contract test

**Server-Side Data Loading (2 tasks)** - [P]:
- T010: Add comment/history queries to +page.server.ts
- T011: Add waitlist status query to +page.server.ts

**Component Integration (5 tasks)** - Sequential:
- T012: Add tab structure to EventDetailsDialog.svelte
- T013: Integrate EventCommentThread component in Comments tab
- T014: Integrate EventHistoryView component in History tab
- T015: Integrate EventCapacityIndicator in Details tab
- T016: Integrate WaitlistButton in Details tab

**Scope Dialog Integration (2 tasks)** - Sequential:
- T017: Add RecurrenceScopeDialog trigger logic for recurring events
- T018: Wire RSVP scope selection to mutation

**E2E Tests (3 tasks)** - [P]:
- T019: Write tab navigation E2E test
- T020: Write comments CRUD E2E test
- T021: Write history display E2E test

**Validation (2 tasks)**:
- T022: Execute quickstart.md validation
- T023: Verify backward compatibility (events without new features)

**Ordering Strategy**:

1. **TDD order**: Contract tests (T003-T009) before implementation
2. **Dependency order**:
   - Setup utilities first (T001-T002)
   - Server-side data loading (T010-T011) before component integration
   - Tab structure (T012) before tab content integration (T013-T014)
   - Component integration before E2E tests
3. **Parallel execution**: [P] marked tasks can run independently

**Estimated Output**: 23 numbered, ordered tasks in tasks.md

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation

_These phases are beyond the scope of the /plan command_

**Phase 3**: Task execution (/tasks command creates tasks.md)
**Phase 4**: Implementation (execute tasks.md following constitutional principles with MCP-First workflow)
**Phase 5**: Validation (run tests, execute quickstart.md, verify <200ms query performance)

## Complexity Tracking

_Fill ONLY if Constitution Check has violations that must be justified_

✅ **No constitutional violations** - all gates passed

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
- [x] Complexity deviations documented (none)

---

_Based on Constitution v1.1.0 - See `.specify/memory/constitution.md`_
