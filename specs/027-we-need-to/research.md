# Research: Events Calendar UI Integration

**Feature**: 027-we-need-to | **Date**: 2025-10-08

## Research Questions & Findings

### 1. FullCalendar 6.x Integration with Svelte 5

**Decision**: Use `@fullcalendar/core` with Svelte 5 wrapper component

**Rationale**:
- FullCalendar 6.x has official Svelte support via `@fullcalendar/svelte`
- Svelte 5 runes (`$state`, `$derived`) provide reactive calendar state
- FullCalendar plugins support drag-drop, recurring events (rrule), and timeline views
- Built-in accessibility features (keyboard navigation, ARIA labels)

**Alternatives Considered**:
- Build custom calendar from scratch - Rejected: Too complex, reinventing wheel
- tui-calendar - Rejected: Less maintained, weaker Svelte support
- react-big-calendar with adapter - Rejected: React-specific, conflicts with Svelte patterns

**Implementation Notes**:
```typescript
// Svelte 5 pattern for FullCalendar
let calendarState = $state({
  events: [],
  view: 'dayGridMonth'
});

let calendarEvents = $derived(
  loadEventsForRange(calendarState.currentStart, calendarState.currentEnd)
);
```

### 2. Image Cropping with 16:9 and 9:16 Aspect Ratios

**Decision**: Use `cropperjs` for aspect ratio enforcement with Sharp server-side processing

**Rationale**:
- cropperjs supports fixed aspect ratios (16:9, 9:16) with simple API
- Client-side preview with server-side Sharp processing for optimization
- TypeScript support, lightweight (< 50KB), no jQuery dependency
- Integrates well with Svelte 5 `$state` for crop coordinates

**Alternatives Considered**:
- react-image-crop - Rejected: React-specific
- canvas-based custom solution - Rejected: Browser compatibility concerns
- Cloudinary/third-party service - Rejected: Adds external dependency, cost

**Implementation Notes**:
```typescript
// Aspect ratio toggle pattern
let aspectRatio = $state<'16:9' | '9:16'>('16:9');
let cropData = $state<CropData | null>(null);

const ratioValue = $derived(aspectRatio === '16:9' ? 16/9 : 9/16);

// Server-side Sharp processing
export async function processImage(file: File, cropData: CropData, aspectRatio: string) {
  return sharp(file)
    .extract({
      left: cropData.x,
      top: cropData.y,
      width: cropData.width,
      height: cropData.height
    })
    .resize(aspectRatio === '16:9' ? { width: 1920 } : { height: 1920 })
    .toFormat('webp')
    .toBuffer();
}
```

### 3. Real-Time Event Updates with GraphQL Subscriptions

**Decision**: Use urql GraphQL subscriptions with WebSocket transport

**Rationale**:
- urql already integrated in project (from CLAUDE.md)
- WebSocket subscriptions for real-time event changes
- Automatic reconnection and offline queue handling
- Compatible with PostGraphile subscriptions from backend

**Alternatives Considered**:
- Server-Sent Events (SSE) - Rejected: One-way only, less efficient
- Polling - Rejected: Higher latency, more server load
- Apollo Client - Rejected: Heavier bundle, urql already in use

**Implementation Notes**:
```typescript
// GraphQL subscription for event changes
const eventUpdates = subscription({
  query: `
    subscription OnEventUpdate($userId: UUID!) {
      eventUpdated(userId: $userId) {
        id
        title
        startDate
        endDate
        ... // other fields
      }
    }
  `,
  variables: { userId }
});

// Auto-update calendar when events change
$effect(() => {
  if (eventUpdates.data) {
    updateCalendarEvent(eventUpdates.data.eventUpdated);
  }
});
```

### 4. Drag-and-Drop Validation with Visual Feedback

**Decision**: FullCalendar's `eventAllow` callback with custom CSS for invalid drops

**Rationale**:
- FullCalendar provides `eventAllow` callback for validation logic
- Custom CSS classes applied dynamically for red styling on invalid targets
- Integrates with RBAC permissions (only event creators can drag)
- Supports recurring event scope prompt via modal

**Alternatives Considered**:
- svelte-dnd-action - Rejected: Duplicate functionality with FullCalendar
- HTML5 drag-drop API - Rejected: FullCalendar handles this better

**Implementation Notes**:
```typescript
// Validation logic
const calendarOptions = {
  editable: true,
  eventAllow: (dropInfo, draggedEvent) => {
    // Check if user is event creator
    if (draggedEvent.extendedProps.createdBy !== currentUserId) {
      return false;
    }
    // Check for conflicts
    const hasConflict = checkEventConflict(dropInfo.start, dropInfo.end);
    return !hasConflict;
  },
  eventDragStart: (info) => {
    info.el.classList.add('dragging');
  },
  eventDragStop: (info) => {
    info.el.classList.remove('dragging', 'invalid-drop');
  },
  drop: async (info) => {
    if (info.event.extendedProps.isRecurring) {
      const scope = await showRecurrenceScopeDialog('reschedule');
      await rescheduleEvent(info.event.id, info.event.start, scope);
    } else {
      await rescheduleEvent(info.event.id, info.event.start, 'single');
    }
  }
};
```

### 5. 3-Month Calendar Buffer Strategy

**Decision**: Prefetch adjacent months with LRU cache invalidation

**Rationale**:
- Load current month + previous month + next month on initial render
- Prefetch adjacent month when user navigates (before they click)
- Use SvelteKit's `load` function for server-side prefetching
- Client-side cache with 5-minute TTL for real-time balance

**Alternatives Considered**:
- Load entire year - Rejected: Too much data, slower initial load
- Load only current month - Rejected: Poor UX when navigating
- Infinite scroll approach - Rejected: Doesn't fit calendar paradigm

**Implementation Notes**:
```typescript
// +page.server.ts - 3-month buffer
export const load: PageServerLoad = async ({ url, locals }) => {
  const currentMonth = url.searchParams.get('month') || getCurrentMonth();
  const startDate = subMonths(parseISO(currentMonth), 1);
  const endDate = addMonths(parseISO(currentMonth), 2);

  const events = await fetchEvents({
    startDate,
    endDate,
    userId: locals.user.id
  });

  return { events, currentMonth };
};

// Client-side prefetch on hover
function onMonthNavHover(direction: 'prev' | 'next') {
  const targetMonth = direction === 'next'
    ? addMonths(currentMonth, 1)
    : subMonths(currentMonth, 1);

  // Trigger prefetch
  goto(`?month=${format(targetMonth, 'yyyy-MM')}`, {
    replaceState: true,
    noScroll: true,
    keepFocus: true
  });
}
```

### 6. Notification Preferences Storage

**Decision**: PostgreSQL table `user_notification_preferences` with Svelte store

**Rationale**:
- Backend already has table from 025-events-flesh-out
- Svelte writable store synced with backend via GraphQL mutation
- Local state for instant UI feedback, async save to backend
- Use Zod schema for validation matching backend

**Alternatives Considered**:
- LocalStorage only - Rejected: Doesn't sync across devices
- Cookie-based - Rejected: Size limitations, security concerns

**Implementation Notes**:
```typescript
// stores/notifications.ts
import { writable } from 'svelte/store';

interface NotificationPrefs {
  eventInvitations: boolean;
  eventChanges: boolean;
  eventCancellations: boolean;
  commentMentions: boolean;
  reminderTimes: ('15min' | '1hour' | '1day')[];
  reminderScope: 'all' | 'accepted' | 'custom';
}

export const notificationPrefs = writable<NotificationPrefs | null>(null);

export async function saveNotificationPrefs(prefs: NotificationPrefs) {
  // Optimistic update
  notificationPrefs.set(prefs);

  // Persist to backend
  await client.mutation(UpdateNotificationPrefsMutation, { prefs });
}
```

### 7. Accessibility for Calendar Navigation

**Decision**: FullCalendar keyboard navigation + custom ARIA labels

**Rationale**:
- FullCalendar has built-in keyboard navigation (arrow keys, Enter, Tab)
- Add custom ARIA labels for event details, capacity status, RSVP badges
- Ensure all dialogs are screen-reader accessible via shadcn-svelte Dialog
- Focus management for modals (trap focus, return focus on close)

**Implementation Notes**:
```svelte
<!-- EventCard with ARIA -->
<div
  role="button"
  tabindex="0"
  aria-label="{event.title}, {formatDate(event.startDate)},
    {event.rsvpStatus === 'accepted' ? 'You are attending' : 'RSVP pending'},
    {event.capacity ? `${event.attendeeCount}/${event.capacity} spots filled` : ''}"
  on:click={openDetails}
  on:keydown={(e) => e.key === 'Enter' && openDetails()}
>
  <!-- Visual content -->
</div>
```

### 8. Testing Strategy for Complex UI Interactions

**Decision**: 3-tier testing approach

**Rationale**:
- **E2E (Playwright)**: User journeys from 57 acceptance scenarios
- **Unit (Vitest)**: Component logic, store mutations, utility functions
- **Visual (Storybook)**: Component states, responsive layouts, accessibility

**Coverage Targets**:
- E2E: All 57 scenarios from spec (100% coverage)
- Unit: >90% for components, stores, utilities
- Visual: All component variants and states

**Implementation Notes**:
```typescript
// E2E test pattern
test('Drag recurring event prompts for scope', async ({ page }) => {
  await page.goto('/dashboard/events');

  const recurringEvent = page.locator('[data-recurring="true"]').first();
  const targetSlot = page.locator('[data-date="2025-10-15"]');

  await recurringEvent.dragTo(targetSlot);

  // Should show scope dialog
  await expect(page.locator('text=This event only')).toBeVisible();
  await expect(page.locator('text=All future events')).toBeVisible();
});

// Unit test pattern
test('Conflict detection identifies overlapping events', () => {
  const existingEvent = { start: '2025-10-08T10:00', end: '2025-10-08T11:00' };
  const newEvent = { start: '2025-10-08T10:30', end: '2025-10-08T11:30' };

  const conflict = detectConflict(newEvent, [existingEvent]);
  expect(conflict).toBe(true);
});
```

## Dependencies Added/Confirmed

| Package | Version | Purpose |
|---------|---------|---------|
| @fullcalendar/core | ^6.1.0 | Calendar core functionality |
| @fullcalendar/svelte | ^6.1.0 | Svelte wrapper for FullCalendar |
| @fullcalendar/daygrid | ^6.1.0 | Month view plugin |
| @fullcalendar/timegrid | ^6.1.0 | Week/day view plugin |
| @fullcalendar/interaction | ^6.1.0 | Drag-drop, resize support |
| @fullcalendar/rrule | ^6.1.0 | Recurring events support |
| cropperjs | ^1.6.1 | Image cropping with aspect ratios |
| sharp | ^0.33.0 | Server-side image processing (existing) |
| rrule | ^2.8.1 | RRULE parsing (existing from 025) |
| date-fns | ^4.1.0 | Date utilities (existing) |

## Technical Risks & Mitigations

### Risk 1: FullCalendar Bundle Size
- **Impact**: Large bundle affecting page load time
- **Mitigation**: Code splitting, lazy load calendar plugins, only import needed views
- **Contingency**: Consider lightweight calendar if bundle >200KB

### Risk 2: Real-Time Subscription Scalability
- **Impact**: WebSocket connections consuming server resources
- **Mitigation**: Connection pooling, automatic reconnection with backoff, event batching
- **Contingency**: Fall back to polling every 30s if WebSocket issues

### Risk 3: Image Upload Performance
- **Impact**: Large images slowing upload/crop experience
- **Mitigation**: Client-side compression before upload, Sharp server-side optimization, 10MB hard limit
- **Contingency**: Add progress indicators, allow background processing

### Risk 4: Mobile Touch Interactions
- **Impact**: Drag-drop may not work well on touch devices
- **Mitigation**: FullCalendar has touch support, add long-press for drag on mobile, test on real devices
- **Contingency**: Provide alternative "Move Event" button for mobile

## Open Questions (Resolved via Clarify)

All questions from Technical Context were resolved during `/clarify` workflow:
- ✅ Event visibility options defined (Public, Department, Private)
- ✅ Image aspect ratios specified (16:9, 9:16)
- ✅ System limits established (5-year recurring, 200-char title, 5000-char description)
- ✅ Performance expectations set (3-month buffer, real-time updates, no offline)
- ✅ Drag-drop behavior defined (immediate save, red styling for invalid, scope prompt for recurring)

## Next Steps

Phase 1 will generate:
1. **data-model.md**: UI state models (calendar state, form state, notification prefs)
2. **contracts/**: Component prop interfaces, GraphQL operation types
3. **quickstart.md**: Steps to run calendar, create event, RSVP, manage notifications
4. **CLAUDE.md updates**: Add FullCalendar, cropperjs patterns to agent context
