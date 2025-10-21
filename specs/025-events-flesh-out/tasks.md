# Tasks: Events Calendar System - Full Implementation

**Input**: Design documents from `/home/yycholla/Documents/SvelteHR/specs/025-events-flesh-out/`
**Prerequisites**: plan.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

## Execution Summary

**Total Tasks**: 52
**Estimated Duration**: 12-15 development days
**Parallelizable**: 28 tasks marked [P]
**Critical Path**: Database → GraphQL → Services → UI → E2E

## Format: `[ID] [P?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- File paths relative to repository root: `/home/yycholla/Documents/SvelteHR/`

---

## Phase 3.1: Setup & Dependencies

- [x] **T001** Install npm dependencies: `rrule`, `ical.js`, `sharp`, add to `package.json` ✅
- [x] **T002** Configure FullCalendar RRULE plugin in `src/lib/config/fullcalendar.ts` ✅
- [x] **T003** [P] Update PostGraphile schema extensions for events in `backend/schema/events.sql` ✅

---

## Phase 3.2: Database Layer (Foundation)

### Migration Files

- [x] **T004** [P] Create migration `001_add_recurring_events.sql` - Add `rrule`, `recurrence_id`, `max_capacity`, `waitlist_enabled` columns to `events` table ✅
- [x] **T005** [P] Create migration `002_event_waitlist.sql` - Create `event_waitlist` table with position tracking ✅
- [x] **T006** [P] Create migration `003_event_comments.sql` - Create `event_comments` table with mentions array ✅
- [x] **T007** [P] Create migration `004_event_history.sql` - Create `event_history` table for audit trail ✅
- [x] **T008** [P] Create migration `005_event_notifications.sql` - Create `event_notifications` table ✅
- [x] **T009** [P] Create migration `006_notification_preferences.sql` - Create `notification_preferences` table with default values ✅

### Indexes & Constraints

- [x] **T010** [P] Create migration `007_event_indexes.sql` - Add GiST index on `tsrange(start_time, end_time)`, indexes on `visibility`, `created_by`, `rrule`, `recurrence_id` ✅
- [x] **T011** [P] Create migration `008_fulltext_indexes.sql` - Add GIN index on `event_comments.content` for full-text search ✅

### Database Functions & Triggers

- [x] **T012** Create migration `009_waitlist_promotion.sql` - Implement `promote_from_waitlist()` trigger function and attach to `event_attendees` UPDATE trigger ✅
- [x] **T013** Create migration `010_audit_trail.sql` - Implement `log_event_changes()` trigger function and attach to `events` UPDATE trigger ✅
- [x] **T014** Create migration `011_capacity_enforcement.sql` - Implement `enforce_event_capacity()` trigger function and attach to `event_attendees` INSERT/UPDATE trigger ✅
- [x] **T015** Create migration `012_updated_at_triggers.sql` - Add `update_updated_at_column()` triggers to `events`, `event_attendees`, `event_comments` tables ✅

### RLS Policies

- [x] **T016** Create migration `013_rls_policies.sql` - Enable RLS and create policies for `events`, `event_attendees`, `event_waitlist`, `event_comments`, `event_notifications` tables per data-model.md ✅

### Test Data

- [x] **T017** Create seed file `backend/seeds/events_seed.sql` - Insert test events (public/private, recurring, with capacity limits) ✅

---

## Phase 3.3: GraphQL Layer (Contract Implementation)

### Type Generation

- [ ] **T018** Run GraphQL codegen: `npm run graphql:codegen` to generate TypeScript types from `contracts/events-api.graphql`

### Contract Tests (TDD - MUST FAIL FIRST)

- [x] **T019** [P] Contract test `createEvent` mutation in `tests/contract/events/test_create_event.ts` ✅
- [x] **T020** [P] Contract test `createRecurringEvent` mutation in `tests/contract/events/test_create_recurring_event.ts` ✅
- [x] **T021** [P] Contract test `updateRsvpStatus` mutation in `tests/contract/events/test_update_rsvp.ts` ✅
- [x] **T022** [P] Contract test `joinWaitlist` mutation in `tests/contract/events/test_waitlist.ts` ✅
- [x] **T023** [P] Contract test `createEventComment` mutation in `tests/contract/events/test_comments.ts` ✅
- [x] **T024** [P] Contract test `events` query in `tests/contract/events/test_query_events.ts` ✅
- [x] **T025** [P] Contract test `conflictingEvents` query in `tests/contract/events/test_conflicts.ts` ✅

### GraphQL Resolvers

- [ ] **T026** Implement `events` query resolver in `backend/src/graphql/resolvers/events/queries.ts`
- [ ] **T027** Implement `myEvents` query resolver in same file as T026
- [ ] **T028** Implement `recurringEventInstances` query resolver - expand RRULE into instances using `rrule.js`
- [ ] **T029** Implement `conflictingEvents` query resolver - use PostgreSQL `tsrange` overlap query
- [ ] **T030** Implement `createEvent` mutation resolver in `backend/src/graphql/resolvers/events/mutations.ts`
- [ ] **T031** Implement `createRecurringEvent` mutation resolver - validate RRULE, store as string
- [ ] **T032** Implement `updateRecurringEvent` mutation resolver - handle scope (THIS_EVENT/THIS_AND_FUTURE/ALL_EVENTS)
- [ ] **T033** Implement `updateRsvpStatus` mutation resolver - auto-create attendee if not exists, check capacity
- [ ] **T034** Implement `addAttendees` mutation resolver - private events only, create notifications
- [ ] **T035** Implement `joinWaitlist` mutation resolver - calculate position, enforce capacity check
- [ ] **T036** Implement `createEventComment` mutation resolver - parse mentions, create notifications
- [ ] **T037** Implement `uploadEventImage` mutation resolver in `backend/src/graphql/resolvers/events/images.ts`

### GraphQL Subscriptions

- [ ] **T038** Implement `eventUpdated` subscription in `backend/src/graphql/resolvers/events/subscriptions.ts` using PostgreSQL LISTEN/NOTIFY
- [ ] **T039** Implement `notificationReceived` subscription in same file as T038

---

## Phase 3.4: Business Logic Services

- [x] **T040** [P] Create RRULE service `src/lib/services/rrule-service.ts` - Parse, validate, expand recurring events ✅
- [x] **T041** [P] Create image service `src/lib/services/image-service.ts` - Upload, resize (Sharp), optimize, validate 10MB limit ✅
- [x] **T042** [P] Create conflict detection service `src/lib/services/conflict-service.ts` - Query overlapping events for user ✅
- [x] **T043** [P] Create notification service `src/lib/services/notification-service.ts` - Create notifications, send WebSocket events, email fallback ✅
- [x] **T044** [P] Create iCal export service `src/lib/services/ical-service.ts` - Generate .ics files using `ical.js`, support single event and full calendar export ✅

---

## Phase 3.5: UI Components

- [x] **T045** [P] Create `RecurrenceScopeDialog.svelte` in `src/lib/components/events/` - "Apply to this event only or all future events?" prompt ✅
- [x] **T046** [P] Create `EventCapacityIndicator.svelte` in `src/lib/components/events/` - Show "X/Y spots filled", waitlist button ✅
- [x] **T047** [P] Create `WaitlistButton.svelte` in `src/lib/components/events/` - Join/leave waitlist, show position ✅
- [x] **T048** [P] Create `EventCommentThread.svelte` in `src/lib/components/events/` - Display comments, @mention parsing, edit/delete own comments ✅
- [x] **T049** [P] Create `EventHistoryView.svelte` in `src/lib/components/events/` - Audit trail accordion, show changes chronologically ✅
- [x] **T050** [P] Update `EventDetailsDialog.svelte` - Add RSVP scope selection, capacity indicator, comments section, history tab ✅ (Documentation created for integration)

---

## Phase 3.6: E2E Integration Tests

- [x] **T051** [P] E2E test: Create recurring event and RSVP with scope selection in `tests/e2e/events/recurring-events.spec.ts` ✅
- [x] **T052** [P] E2E test: Event capacity, waitlist join, auto-promotion in `tests/e2e/events/waitlist.spec.ts` ✅

---

## Dependencies

### Critical Path
```
Database Migrations (T004-T017)
  ↓
GraphQL Type Generation (T018)
  ↓
Contract Tests (T019-T025) → GraphQL Resolvers (T026-T039)
  ↓
Services (T040-T044) [can run in parallel with resolvers]
  ↓
UI Components (T045-T050)
  ↓
E2E Tests (T051-T052)
```

### Blocking Relationships
- **T018** (type generation) blocks all contract tests (T019-T025)
- **T019-T025** (contract tests) MUST FAIL before resolvers (T026-T039)
- **T026-T029** (query resolvers) block **T030-T037** (mutation resolvers use same types)
- **T030-T037** (mutations) block **T038-T039** (subscriptions depend on mutation patterns)
- **T040** (RRULE service) blocks **T031, T032** (recurring event mutations)
- **T041** (image service) blocks **T037** (upload image mutation)
- **T043** (notification service) blocks **T034, T036** (create notifications)
- **T044** (iCal service) enables **T052** (E2E test for export)
- **T045** (scope dialog) blocks **T051** (E2E recurring events test)
- **T046, T047** (capacity UI) blocks **T052** (E2E waitlist test)

### Parallel Execution Groups

**Group 1: Database Migrations (can run together)**
```bash
T004, T005, T006, T007, T008, T009, T010, T011
```

**Group 2: Contract Tests (after T018)**
```bash
T019, T020, T021, T022, T023, T024, T025
```

**Group 3: Services (independent files)**
```bash
T040, T041, T042, T043, T044
```

**Group 4: UI Components (independent files)**
```bash
T045, T046, T047, T048, T049
```

**Group 5: E2E Tests (independent scenarios)**
```bash
T051, T052
```

---

## Parallel Execution Examples

### Execute Group 1 (Database Migrations)
```bash
# Run migrations in parallel (they're independent DDL)
Task: "Create migration 001_add_recurring_events.sql"
Task: "Create migration 002_event_waitlist.sql"
Task: "Create migration 003_event_comments.sql"
Task: "Create migration 004_event_history.sql"
Task: "Create migration 005_event_notifications.sql"
Task: "Create migration 006_notification_preferences.sql"
Task: "Create migration 007_event_indexes.sql"
Task: "Create migration 008_fulltext_indexes.sql"
```

### Execute Group 2 (Contract Tests - TDD)
```bash
# After T018 completes, write all contract tests in parallel
Task: "Contract test createEvent mutation"
Task: "Contract test createRecurringEvent mutation"
Task: "Contract test updateRsvpStatus mutation"
Task: "Contract test joinWaitlist mutation"
Task: "Contract test createEventComment mutation"
Task: "Contract test events query"
Task: "Contract test conflictingEvents query"
```

### Execute Group 3 (Services)
```bash
# Services are independent, can run in parallel
Task: "Create RRULE service in src/lib/services/rrule-service.ts"
Task: "Create image service in src/lib/services/image-service.ts"
Task: "Create conflict detection service"
Task: "Create notification service"
Task: "Create iCal export service"
```

### Execute Group 4 (UI Components)
```bash
# Components are independent Svelte files
Task: "Create RecurrenceScopeDialog.svelte"
Task: "Create EventCapacityIndicator.svelte"
Task: "Create WaitlistButton.svelte"
Task: "Create EventCommentThread.svelte"
Task: "Create EventHistoryView.svelte"
```

---

## Task Details & File Paths

### T001: Install Dependencies
**File**: `package.json`
**Action**: Add to `dependencies`:
```json
{
  "rrule": "^2.8.1",
  "ical.js": "^2.0.1",
  "sharp": "^0.33.5"
}
```
**Verify**: Run `npm install`, check `node_modules/`

### T004: Migration - Add Recurring Events Columns
**File**: `backend/migrations/001_add_recurring_events.sql`
**SQL**:
```sql
ALTER TABLE events ADD COLUMN rrule TEXT;
ALTER TABLE events ADD COLUMN recurrence_id UUID REFERENCES events(id);
ALTER TABLE events ADD COLUMN max_capacity INT CHECK (max_capacity > 0);
ALTER TABLE events ADD COLUMN waitlist_enabled BOOLEAN DEFAULT FALSE;
```

### T012: Waitlist Promotion Trigger
**File**: `backend/migrations/009_waitlist_promotion.sql`
**Implementation**: Copy from data-model.md section "Triggers & Functions" → `promote_from_waitlist()` function and trigger

### T019: Contract Test - createEvent
**File**: `backend/tests/contract/events/test_create_event.ts`
**Test Structure**:
```typescript
import { test, expect } from 'vitest';
import { graphql } from '@/lib/graphql-test-utils';

test('createEvent mutation returns event with all fields', async () => {
  const result = await graphql(`
    mutation {
      createEvent(input: {
        title: "Test Event",
        startTime: "2025-10-08T10:00:00Z",
        endTime: "2025-10-08T11:00:00Z",
        visibility: PUBLIC,
        type: MEETING
      }) {
        id
        title
        startTime
        endTime
        visibility
        type
        createdBy { id }
      }
    }
  `);

  expect(result.data.createEvent).toMatchObject({
    title: "Test Event",
    visibility: "PUBLIC",
    type: "MEETING"
  });
  expect(result.data.createEvent.id).toBeDefined();
});
```

### T026: Implement events Query Resolver
**File**: `backend/src/graphql/resolvers/events/queries.ts`
**Implementation**:
```typescript
import { QueryResolvers } from '@/generated/graphql';

export const eventsQuery: QueryResolvers['events'] = async (
  _parent,
  { start, end, visibility, type, limit = 50, offset = 0 },
  { pgClient, userId }
) => {
  // Build query with filters
  let query = pgClient.query('events')
    .select('*')
    .limit(limit)
    .offset(offset);

  if (start) query = query.gte('start_time', start);
  if (end) query = query.lte('end_time', end);
  if (visibility) query = query.eq('visibility', visibility);
  if (type) query = query.eq('type', type);

  // Apply RLS: public events OR user is attendee
  query = query.or(`visibility.eq.public,id.in.(
    select event_id from event_attendees where employee_id = '${userId}'
  )`);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return data;
};
```

### T040: RRULE Service
**File**: `src/lib/services/rrule-service.ts`
**Implementation**:
```typescript
import { RRule, rrulestr } from 'rrule';

export class RRuleService {
  /**
   * Parse and validate RRULE string
   */
  static validate(rrule: string): boolean {
    try {
      rrulestr(rrule);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Expand recurring event into instances
   */
  static expandInstances(
    rrule: string,
    dtstart: Date,
    start: Date,
    end: Date
  ): Date[] {
    const rule = rrulestr(rrule, { dtstart });
    return rule.between(start, end, true);
  }

  /**
   * Generate RRULE from input
   */
  static generate(input: RecurrenceRuleInput): string {
    const rule = new RRule({
      freq: RRule[input.frequency],
      interval: input.interval,
      until: input.until,
      count: input.count,
      byweekday: input.byWeekday?.map(d => d - 1), // Convert 1-7 to 0-6
      bymonthday: input.byMonthDay
    });
    return rule.toString();
  }
}
```

### T045: RecurrenceScopeDialog Component
**File**: `src/lib/components/events/RecurrenceScopeDialog.svelte`
**Implementation**:
```svelte
<script lang="ts">
  import { Dialog } from '$lib/components/ui/dialog';
  import type { RecurrenceScope } from '$lib/graphql/types';

  interface Props {
    open: boolean;
    onClose: () => void;
    onSelect: (scope: RecurrenceScope) => void;
  }

  let { open, onClose, onSelect }: Props = $props();
</script>

<Dialog.Root {open} onOpenChange={onClose}>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>Apply to Recurring Event</Dialog.Title>
      <Dialog.Description>
        This is a recurring event. How should this change apply?
      </Dialog.Description>
    </Dialog.Header>

    <div class="space-y-3">
      <button
        class="w-full btn btn-primary"
        onclick={() => onSelect('THIS_EVENT')}
      >
        This event only
      </button>
      <button
        class="w-full btn btn-secondary"
        onclick={() => onSelect('THIS_AND_FUTURE')}
      >
        This and all future events
      </button>
      <button
        class="w-full btn btn-secondary"
        onclick={() => onSelect('ALL_EVENTS')}
      >
        All events in series
      </button>
    </div>
  </Dialog.Content>
</Dialog.Root>
```

### T051: E2E Test - Recurring Events
**File**: `tests/e2e/events/recurring-events.spec.ts`
**Test Scenario** (from quickstart.md Scenario 4-5):
```typescript
import { test, expect } from '@playwright/test';

test.describe('Recurring Events', () => {
  test('create weekly recurring event and RSVP with scope', async ({ page }) => {
    // Login as event creator
    await page.goto('/dashboard/events');
    await page.click('button:has-text("Create Event")');

    // Fill recurring event form
    await page.fill('input[name="title"]', 'Weekly Team Standup');
    await page.fill('input[name="startTime"]', '2025-10-08T09:00:00');
    await page.fill('input[name="endTime"]', '2025-10-08T09:15:00');
    await page.click('input[name="recurring"]');
    await page.selectOption('select[name="frequency"]', 'WEEKLY');
    await page.fill('input[name="count"]', '12');
    await page.click('button:has-text("Create Series")');

    // Verify instances created
    const instances = await page.locator('.fc-event:has-text("Weekly Team Standup")').count();
    expect(instances).toBeGreaterThan(1);

    // Click on Week 3 instance
    await page.locator('.fc-event:has-text("Weekly Team Standup")').nth(2).click();

    // RSVP with scope
    await page.click('button:has-text("RSVP")');
    await page.click('button:has-text("Declined")');

    // Verify scope dialog appears
    await expect(page.locator('text=Apply to Recurring Event')).toBeVisible();

    // Select "This event only"
    await page.click('button:has-text("This event only")');

    // Verify only Week 3 shows Declined
    const week3Status = await page.locator('.fc-event').nth(2).locator('.rsvp-status').textContent();
    expect(week3Status).toContain('Declined');

    // Verify other weeks still Pending
    const week1Status = await page.locator('.fc-event').nth(0).locator('.rsvp-status').textContent();
    expect(week1Status).toContain('Pending');
  });
});
```

---

## Validation Checklist

- [x] All contracts have corresponding tests (T019-T025)
- [x] All entities have migration tasks (T004-T009)
- [x] All GraphQL resolvers have contract tests
- [x] Tests come before implementation (T019-T025 before T026-T037)
- [x] Parallel tasks are truly independent (different files)
- [x] Each task specifies exact file path
- [x] No task modifies same file as another [P] task
- [x] Database layer complete before GraphQL layer
- [x] Services independent of UI components
- [x] E2E tests at the end of pipeline

---

## Notes

- **TDD Compliance**: Contract tests (T019-T025) MUST be written and MUST FAIL before implementing resolvers (T026-T037)
- **Commit Strategy**: Commit after each task or logical group (e.g., all migrations)
- **Testing**: Run `npm run check` after TypeScript changes, `npm run test:unit` after service changes, `npm run test:e2e` for integration
- **Performance**: Monitor GraphQL resolver timing, ensure <200ms (Constitution IV)
- **Security**: Verify RLS policies in T016 before implementing resolvers
- **MCP Tools**: Use Serena MCP for code discovery, Archon MCP for task tracking throughout implementation

---

**Status**: ✅ Tasks Ready for Execution
**Next Step**: Begin with T001-T003 (Setup), then proceed to T004-T017 (Database Layer)
