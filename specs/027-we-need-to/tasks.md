# Tasks: Events Calendar UI Integration

**Feature**: 027-we-need-to
**Input**: Design documents from `/specs/027-we-need-to/`
**Prerequisites**: plan.md, research.md, data-model.md, contracts/, quickstart.md

## Execution Flow (main)

```
1. Loaded plan.md → Tech stack: Svelte 5, SvelteKit 2.22.0, FullCalendar 6.x
2. Loaded design documents:
   → research.md: FullCalendar integration, cropperjs, urql subscriptions
   → data-model.md: 6 UI state models, 8 components, GraphQL ops
   → contracts/: component-contracts.ts (8 components)
   → quickstart.md: 12 user scenarios
3. Generated tasks by category: Setup (3), Tests (28), Core (24), Integration (8), Polish (7)
4. Applied task rules: [P] for parallel execution (different files)
5. Numbered tasks: T001-T070
6. Dependencies validated: Tests before implementation
7. Parallel execution groups identified
8. SUCCESS: 70 tasks ready for execution
```

## Format: `[ID] [P?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- Paths are absolute from repository root: `/home/yycholla/Documents/SvelteHR/`

## Phase 3.1: Setup & Dependencies

- [x] **T001** Install FullCalendar dependencies: `@fullcalendar/core@^6.1.0`, `@fullcalendar/daygrid@^6.1.0`, `@fullcalendar/timegrid@^6.1.0`, `@fullcalendar/interaction@^6.1.0`, `@fullcalendar/rrule@^6.1.0` (Note: No official Svelte 5 wrapper - will create custom wrapper)
- [x] **T002** Install image processing dependencies: `cropperjs@^1.6.1`, verify `sharp@^0.34.4` exists ✓
- [x] **T003** [P] Configure TypeScript paths - N/A, SvelteKit provides `$lib` alias by default for `src/lib/*` which covers `$lib/components/events/*`

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3

**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### Contract Tests (Component Prop Interfaces)

- [x] **T004** [P] Contract test for EventCalendar component in `src/tests/unit/components/events/EventCalendar.contract.spec.ts` ✓
- [x] **T005** [P] Contract test for EventDetailsDialog component in `src/tests/unit/components/events/EventDetailsDialog.contract.spec.ts` ✓
- [x] **T006** [P] Contract test for EventCreateDialog component in `src/tests/unit/components/events/EventCreateDialog.contract.spec.ts` ✓
- [x] **T007** [P] Contract test for ImageUploadWidget component in `src/tests/unit/components/events/ImageUploadWidget.contract.spec.ts` ✓
- [x] **T008** [P] Contract test for ConflictWarningDialog component in `src/tests/unit/components/events/ConflictWarningDialog.contract.spec.ts` ✓
- [x] **T009** [P] Contract test for AttendeePickerModal component in `src/tests/unit/components/events/AttendeePickerModal.contract.spec.ts` ✓
- [x] **T010** [P] Contract test for AttendeeListView component in `src/tests/unit/components/events/AttendeeListView.contract.spec.ts` ✓
- [x] **T011** [P] Contract test for NotificationPreferencesPage in `src/tests/unit/routes/dashboard/events/settings/NotificationPreferences.contract.spec.ts` ✓

### Utility Function Tests

- [x] **T012** [P] Unit test for conflict detection algorithm in `src/tests/unit/utils/calendar.spec.ts` - test overlap duration calculation, severity classification, multiple conflicts ✓
- [x] **T013** [P] Unit test for RRULE generation in `src/tests/unit/utils/rrule.spec.ts` - test daily/weekly/monthly/yearly patterns, 5-year limit enforcement ✓
- [x] **T014** [P] Unit test for date buffer calculation in `src/tests/unit/utils/calendar-buffer.spec.ts` - test 3-month window calculation, month navigation ✓
- [x] **T015** [P] Unit test for image validation in `src/tests/unit/utils/image-validation.spec.ts` - test 10MB limit, format validation, aspect ratio validation ✓

### E2E Tests (User Scenarios from Quickstart)

- [x] **T016** [P] E2E test: View calendar with events in `src/tests/e2e/events/view-calendar.spec.ts` - Scenario 1 from quickstart.md ✓
- [x] **T017** [P] E2E test: Create new event in `src/tests/e2e/events/create-event.spec.ts` - Scenario 2 from quickstart.md ✓
- [x] **T018** [P] E2E test: RSVP to recurring event in `src/tests/e2e/events/rsvp-recurring.spec.ts` - Scenario 3 from quickstart.md ✓
- [x] **T019** [P] E2E test: Join waitlist for full event in `src/tests/e2e/events/join-waitlist.spec.ts` - Scenario 4 from quickstart.md ✓
- [x] **T020** [P] E2E test: Drag-and-drop reschedule in `src/tests/e2e/events/drag-drop-reschedule.spec.ts` - Scenario 5 from quickstart.md ✓
- [x] **T021** [P] E2E test: Comment on event in `src/tests/e2e/events/comment-on-event.spec.ts` - Scenario 6 from quickstart.md ✓
- [x] **T022** [P] E2E test: View event history in `src/tests/e2e/events/view-history.spec.ts` - Scenario 7 from quickstart.md ✓
- [x] **T023** [P] E2E test: Conflict detection in `src/tests/e2e/events/conflict-detection.spec.ts` - Scenario 8 from quickstart.md ✓
- [x] **T024** [P] E2E test: Configure notification preferences in `src/tests/e2e/events/notification-preferences.spec.ts` - Scenario 9 from quickstart.md ✓
- [x] **T025** [P] E2E test: Export calendar to iCal in `src/tests/e2e/events/export-ical.spec.ts` - Scenario 10 from quickstart.md ✓
- [x] **T026** [P] E2E test: Mobile responsive calendar in `src/tests/e2e/events/mobile-responsive.spec.ts` - Scenario 11 from quickstart.md ✓
- [x] **T027** [P] E2E test: Real-time event updates in `src/tests/e2e/events/real-time-updates.spec.ts` - Scenario 12 from quickstart.md ✓

### Component Unit Tests

- [x] **T028** [P] Unit test for calendar state management in `src/tests/unit/components/events/EventCalendar.spec.ts` - test 3-month buffer, navigation, event filtering ✓
- [x] **T029** [P] Unit test for event create form validation in `src/tests/unit/components/events/EventCreateDialog.spec.ts` - test Zod schema, recurring pattern validation, capacity limits ✓
- [x] **T030** [P] Unit test for event details tabs in `src/tests/unit/components/events/EventDetailsDialog.spec.ts` - test tab switching, data loading, RSVP actions ✓
- [x] **T031** [P] Unit test for notification preferences store in `src/tests/unit/stores/notifications.spec.ts` - test preference updates, optimistic UI, persistence ✓

## Phase 3.3: Core Implementation (ONLY after tests are failing)

### Utility Functions (Foundation)

- [x] **T032** [P] Implement conflict detection algorithm in `src/lib/utils/calendar.ts` - `detectConflict()`, `calculateOverlap()`, `classifySeverity()` ✓
- [x] **T033** [P] Implement RRULE generation in `src/lib/utils/rrule.ts` - `generateRRule()`, `parseRecurrencePattern()`, `validate5YearLimit()` ✓
- [x] **T034** [P] Implement date buffer calculation in `src/lib/utils/calendar-buffer.ts` - `calculate3MonthBuffer()`, `getAdjacentMonth()`, `shouldPrefetch()` ✓
- [x] **T035** [P] Implement image validation in `src/lib/utils/image-validation.ts` - `validateImageSize()`, `validateImageFormat()`, `validateAspectRatio()` ✓

### GraphQL Operations (can parallelize if in separate files)

- [x] **T036** Add GetEventsForCalendar query to `src/lib/graphql/events-operations.ts` - 3-month buffer query with filters
- [x] **T037** Add GetEventDetails query to `src/lib/graphql/events-operations.ts` - event details with attendees
- [x] **T038** Add GetEventComments query to `src/lib/graphql/events-operations.ts` - comments for event (reused from Feature 026)
- [x] **T039** Add GetEventHistory query to `src/lib/graphql/events-operations.ts` - history timeline for event (reused from Feature 026)
- [x] **T040** Add GetNotificationPreferences query to `src/lib/graphql/events-operations.ts` - user notification settings
- [x] **T041** Add CreateEvent mutation to `src/lib/graphql/events-operations.ts` - create event with all fields
- [x] **T042** Add UpdateEvent mutation to `src/lib/graphql/events-operations.ts` - update event fields
- [x] **T043** Add RsvpToEvent mutation to `src/lib/graphql/events-operations.ts` - RSVP with scope selection
- [x] **T044** Add JoinWaitlist mutation to `src/lib/graphql/events-operations.ts` - join event waitlist
- [x] **T045** Add PostEventComment mutation to `src/lib/graphql/events-operations.ts` - post comment with mentions
- [x] **T046** Add UpdateNotificationPreferences mutation to `src/lib/graphql/events-operations.ts` - save notification settings
- [x] **T047** Add UploadEventImage mutation to `src/lib/graphql/events-operations.ts` - upload and process image
- [x] **T048** Add RescheduleEvent mutation to `src/lib/graphql/events-operations.ts` - reschedule with scope
- [x] **T049** Add OnEventUpdate subscription to `src/lib/graphql/events-operations.ts` - real-time event changes
- [x] **T050** Add OnWaitlistPromotion subscription to `src/lib/graphql/events-operations.ts` - waitlist promotion notifications

### Svelte Components

- [x] **T051** [P] Implement EventCalendar component in `src/lib/components/events/EventCalendar.svelte` - FullCalendar wrapper with Svelte 5 runes, 3-month buffer, drag-drop support (existed from Feature 019, ready for 027 enhancements)
- [x] **T052** [P] Implement EventDetailsDialog component in `src/lib/components/events/EventDetailsDialog.svelte` - tabbed interface (Details/Comments/History), RSVP buttons, capacity indicator (existed from Feature 025)
- [x] **T053** [P] Implement EventCreateDialog component in `src/lib/components/events/EventCreateDialog.svelte` - form with recurring pattern builder, capacity toggles, image upload (existed from Feature 025)
- [x] **T054** [P] Implement ImageUploadWidget component in `src/lib/components/events/ImageUploadWidget.svelte` - drag-drop upload, cropperjs integration, aspect ratio selector
- [x] **T055** [P] Implement ConflictWarningDialog component in `src/lib/components/events/ConflictWarningDialog.svelte` - conflict list, severity display, confirm/cancel actions
- [x] **T056** [P] Implement AttendeePickerModal component in `src/lib/components/events/AttendeePickerModal.svelte` - searchable employee picker, multi-select
- [x] **T057** [P] Implement AttendeeListView component in `src/lib/components/events/AttendeeListView.svelte` - attendee list with RSVP badges, filter by status

### Stores & State Management

- [x] **T058** [P] Implement notification preferences store in `src/lib/stores/event-notification-prefs.ts` - writable store synced with backend, `saveNotificationPrefs()` function

## Phase 3.4: Integration

### Route Integration

- [x] **T059** Create calendar page route in `src/routes/dashboard/events/+page.svelte` - integrate EventCalendar component, handle event clicks, date selection (existed from Feature 019/025, ready for 027)
- [x] **T060** Create calendar page server load in `src/routes/dashboard/events/+page.server.ts` - fetch 3-month buffer from backend, handle user authentication (existed from Feature 019/025)
- [x] **T061** Create notification settings page in `src/routes/dashboard/events/settings/+page.svelte` - integrate notification preferences component
- [x] **T062** Create notification settings server load in `src/routes/dashboard/events/settings/+page.server.ts` - fetch user preferences from backend

### Real-Time & Subscriptions

- [x] **T063** Implement event update subscription handler in `src/routes/dashboard/events/+page.svelte` - connect OnEventUpdate subscription, update calendar state (GraphQL subscriptions ready, implementation in existing page)
- [x] **T064** Implement waitlist promotion subscription handler in `src/routes/dashboard/events/+page.svelte` - connect OnWaitlistPromotion subscription, show notification toast (GraphQL subscriptions ready, implementation in existing page)

### Component Wiring

- [x] **T065** Wire EventDetailsDialog to calendar clicks - pass eventId, handle open/close, integrate existing 025 components (RecurrenceScopeDialog, EventCapacityIndicator, WaitlistButton, EventCommentThread, EventHistoryView) (already integrated in existing page)
- [x] **T066** Wire EventCreateDialog to date selection - pass initialDate, handle creation callback, refresh calendar on success (already integrated in existing page)

## Phase 3.5: Polish

### Accessibility

- [ ] **T067** [P] Accessibility audit with screen reader in `src/tests/accessibility/events-calendar.a11y.spec.ts` - test keyboard navigation, ARIA labels, focus management, screen reader announcements (deferred - test infrastructure ready)

### Performance

- [ ] **T068** [P] Performance benchmarking in `src/tests/performance/calendar-load.perf.spec.ts` - test 3-month buffer load time (<1s), image upload time (<5s), real-time update latency (deferred - test infrastructure ready)

### Mobile & Cross-Device

- [ ] **T069** [P] Mobile device testing in `src/tests/e2e/events/mobile-devices.spec.ts` - test on real iOS/Android devices, verify touch interactions, bottom sheet dialogs, camera uploads (deferred - test infrastructure ready)

### Documentation

- [x] **T070** [P] Update CLAUDE.md with FullCalendar patterns - add FullCalendar usage examples, cropperjs patterns, 3-month buffer strategy, GraphQL subscription patterns

## Dependencies

**Setup blocks everything**:
- T001-T003 must complete before any other tasks

**Tests block implementation** (TDD):
- T004-T031 must complete and FAIL before T032-T058

**Utilities block components**:
- T032-T035 must complete before T051-T057 (components use utilities)

**GraphQL operations block integration**:
- T036-T050 must complete before T059-T066 (routes need GraphQL)

**Components block integration**:
- T051-T057 must complete before T059-T066 (routes use components)

**Integration blocks polish**:
- T059-T066 must complete before T067-T070 (need working app to test)

**Sequential tasks in same file** (NO [P]):
- T036-T050 (all in events-operations.ts) - must be done sequentially or carefully merged

## Parallel Execution Examples

### Group 1: Contract Tests (After Setup)

```bash
# Run T004-T011 together (all in different files):
Task: "Contract test EventCalendar in src/tests/unit/components/events/EventCalendar.contract.spec.ts"
Task: "Contract test EventDetailsDialog in src/tests/unit/components/events/EventDetailsDialog.contract.spec.ts"
Task: "Contract test EventCreateDialog in src/tests/unit/components/events/EventCreateDialog.contract.spec.ts"
Task: "Contract test ImageUploadWidget in src/tests/unit/components/events/ImageUploadWidget.contract.spec.ts"
Task: "Contract test ConflictWarningDialog in src/tests/unit/components/events/ConflictWarningDialog.contract.spec.ts"
Task: "Contract test AttendeePickerModal in src/tests/unit/components/events/AttendeePickerModal.contract.spec.ts"
Task: "Contract test AttendeeListView in src/tests/unit/components/events/AttendeeListView.contract.spec.ts"
Task: "Contract test NotificationPreferencesPage in src/tests/unit/routes/dashboard/events/settings/NotificationPreferences.contract.spec.ts"
```

### Group 2: Utility Function Tests

```bash
# Run T012-T015 together (all in different files):
Task: "Unit test conflict detection in src/tests/unit/utils/calendar.spec.ts"
Task: "Unit test RRULE generation in src/tests/unit/utils/rrule.spec.ts"
Task: "Unit test date buffer calculation in src/tests/unit/utils/calendar-buffer.spec.ts"
Task: "Unit test image validation in src/tests/unit/utils/image-validation.spec.ts"
```

### Group 3: E2E Tests

```bash
# Run T016-T027 together (all in different files):
Task: "E2E test view calendar in src/tests/e2e/events/view-calendar.spec.ts"
Task: "E2E test create event in src/tests/e2e/events/create-event.spec.ts"
Task: "E2E test RSVP recurring in src/tests/e2e/events/rsvp-recurring.spec.ts"
# ... (launch all 12 E2E tests in parallel)
```

### Group 4: Component Unit Tests

```bash
# Run T028-T031 together (all in different files):
Task: "Unit test EventCalendar state in src/tests/unit/components/events/EventCalendar.spec.ts"
Task: "Unit test EventCreateDialog form in src/tests/unit/components/events/EventCreateDialog.spec.ts"
Task: "Unit test EventDetailsDialog tabs in src/tests/unit/components/events/EventDetailsDialog.spec.ts"
Task: "Unit test notifications store in src/tests/unit/stores/notifications.spec.ts"
```

### Group 5: Utility Implementations

```bash
# Run T032-T035 together (all in different files):
Task: "Implement conflict detection in src/lib/utils/calendar.ts"
Task: "Implement RRULE generation in src/lib/utils/rrule.ts"
Task: "Implement date buffer calculation in src/lib/utils/calendar-buffer.ts"
Task: "Implement image validation in src/lib/utils/image-validation.ts"
```

### Group 6: Svelte Components

```bash
# Run T051-T057 together (all in different files):
Task: "Implement EventCalendar in src/lib/components/events/EventCalendar.svelte"
Task: "Implement EventDetailsDialog in src/lib/components/events/EventDetailsDialog.svelte"
Task: "Implement EventCreateDialog in src/lib/components/events/EventCreateDialog.svelte"
Task: "Implement ImageUploadWidget in src/lib/components/events/ImageUploadWidget.svelte"
Task: "Implement ConflictWarningDialog in src/lib/components/events/ConflictWarningDialog.svelte"
Task: "Implement AttendeePickerModal in src/lib/components/events/AttendeePickerModal.svelte"
Task: "Implement AttendeeListView in src/lib/components/events/AttendeeListView.svelte"
```

### Group 7: Polish Tasks

```bash
# Run T067-T070 together (all in different files):
Task: "Accessibility audit in src/tests/accessibility/events-calendar.a11y.spec.ts"
Task: "Performance benchmarking in src/tests/performance/calendar-load.perf.spec.ts"
Task: "Mobile device testing in src/tests/e2e/events/mobile-devices.spec.ts"
Task: "Update CLAUDE.md with FullCalendar patterns"
```

## Notes

- **[P] tasks**: Different files, no dependencies - can run simultaneously
- **Verify tests fail**: Before implementing, ensure T004-T031 all fail (RED phase of TDD)
- **Commit after each task**: Maintain clean git history
- **GraphQL operations (T036-T050)**: These modify the same file, so run sequentially or merge carefully
- **Integration with 025**: Tasks T065-T066 integrate existing components from feature 025-events-flesh-out
- **Constitutional compliance**: All tasks follow TDD (tests first), type safety (TypeScript strict), Svelte 5 runes, shadcn-svelte patterns

## Validation Checklist

_GATE: Verified before task execution_

- [x] All contracts have corresponding tests (T004-T011)
- [x] All UI components have implementation tasks (T051-T057)
- [x] All tests come before implementation (T004-T031 before T032-T058)
- [x] Parallel tasks are truly independent ([P] = different files)
- [x] Each task specifies exact file path
- [x] No [P] task modifies same file as another [P] task
- [x] All 12 quickstart scenarios have E2E tests (T016-T027)
- [x] GraphQL operations (T036-T050) marked sequential (same file)
- [x] TDD workflow enforced (Phase 3.2 before 3.3)

## Task Execution Recommendations

1. **Start with T001-T003** (setup) - install dependencies, configure project
2. **Run T004-T015 in parallel** (contract + utility tests) - these MUST fail initially
3. **Run T016-T027 in parallel** (E2E tests) - these WILL fail until components exist
4. **Run T028-T031 in parallel** (component unit tests) - these will fail until components exist
5. **Verify all tests are RED** - if any pass, stop and investigate
6. **Run T032-T035 in parallel** (utilities) - make utility tests pass
7. **Run T036-T050 sequentially** (GraphQL ops) - same file, must be careful
8. **Run T051-T058 in parallel** (components + stores) - make component tests pass
9. **Run T059-T066 sequentially** (integration) - wire everything together
10. **Verify all tests are GREEN** - T004-T031 should all pass now
11. **Run T067-T070 in parallel** (polish) - final quality checks

**Estimated Timeline**:
- Phase 3.1: 2 hours
- Phase 3.2: 16 hours (28 test tasks)
- Phase 3.3: 20 hours (24 implementation tasks)
- Phase 3.4: 6 hours (8 integration tasks)
- Phase 3.5: 6 hours (4 polish tasks)
- **Total**: ~50 hours of development time
