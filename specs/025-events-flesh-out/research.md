# Research: Events Calendar System

## Overview

Research findings for implementing a comprehensive events calendar system in SvelteHR with recurring events, RSVP tracking, notifications, and enterprise features.

## Technology Stack Decisions

### Calendar Rendering: FullCalendar 6.x

**Decision**: Use FullCalendar 6.x with Svelte adapter for calendar UI

**Rationale**:
- Already integrated in existing SvelteHR codebase
- Proven drag-and-drop event rescheduling
- Built-in support for recurring events (RRULE standard)
- Month/week/day views with responsive design
- Extensive customization via CSS and event rendering hooks
- Active community and enterprise support

**Alternatives Considered**:
- Custom calendar component: Rejected due to complexity of recurring events, timezone handling, and accessibility requirements
- TUI Calendar: Less mature Svelte integration
- DayPilot: Commercial license required

### Recurring Events: RFC 5545 RRULE

**Decision**: Implement recurring events using RFC 5545 RRULE standard

**Rationale**:
- Industry standard for calendar recurrence (iCal/ICS compatibility required by FR-053)
- FullCalendar has native RRULE plugin support
- PostgreSQL can store RRULE strings efficiently
- Supports daily, weekly, monthly, annual patterns (per FR-045)
- Libraries available: rrule.js for parsing/generation

**Alternatives Considered**:
- Custom recurrence logic: Rejected for iCal incompatibility
- Separate instance records: Storage inefficient for large series

**Implementation Pattern**:
```typescript
// Event model with optional recurrence
interface Event {
  id: string;
  title: string;
  start_time: Date;
  end_time: Date;
  rrule?: string; // RFC 5545 RRULE string
  recurrence_id?: string; // Parent event ID if this is an exception
}
```

### Image Upload & Optimization: Sharp

**Decision**: Use Sharp library for server-side image processing

**Rationale**:
- High-performance image resizing/compression (per FR-044)
- Supports 10 MB limit enforcement (per FR-043)
- WebP conversion for optimal web delivery
- Maintains aspect ratio during resize (per FR-044b)
- Already used in other parts of SvelteHR

**Alternatives Considered**:
- ImageMagick: Slower, more complex setup
- Client-side compression: Inconsistent quality, bypassable

**Processing Pipeline**:
1. Validate file type (JPEG/PNG/GIF/WebP) and size (≤10 MB)
2. Resize to max 1920x1080 maintaining aspect ratio
3. Compress to target quality (85% JPEG/WebP)
4. Store original filename + optimized version
5. Serve optimized version for display

### Notifications: Database-Driven with WebSocket Updates

**Decision**: PostgreSQL-based notification queue with real-time WebSocket delivery

**Rationale**:
- Reliable persistence for notification history
- LISTEN/NOTIFY for real-time PostgreSQL events
- Integrates with existing auth/RBAC system
- Supports user preferences (per FR-051)
- Email fallback via existing notification service

**Alternatives Considered**:
- Redis pub/sub: Added dependency, no persistence
- Server-Sent Events (SSE): Less bidirectional than WebSocket
- Polling: Inefficient for real-time updates

**Notification Schema**:
```sql
CREATE TABLE event_notifications (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES employees(id),
  event_id UUID REFERENCES events(id),
  type TEXT, -- 'invite', 'change', 'cancel', 'remove', 'comment', 'waitlist'
  message TEXT,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Conflict Detection: Temporal Overlap Queries

**Decision**: PostgreSQL temporal queries with range types for conflict detection

**Rationale**:
- Native tsrange (timestamp range) support in PostgreSQL
- Efficient overlap operator (&&) for conflict queries
- Index-backed performance (GiST index on time ranges)
- Supports recurring event expansion

**Alternatives Considered**:
- Client-side conflict detection: Incomplete data, race conditions
- Application-level iteration: Poor performance at scale

**Query Pattern**:
```sql
-- Find conflicting events for a user
SELECT * FROM events e
JOIN event_attendees a ON a.event_id = e.id
WHERE a.employee_id = $user_id
  AND a.rsvp_status = 'accepted'
  AND tsrange(e.start_time, e.end_time) && tsrange($new_start, $new_end);
```

### Waitlist Management: Trigger-Based Automation

**Decision**: PostgreSQL triggers for automatic waitlist processing

**Rationale**:
- Immediate processing on RSVP status change
- Guarantees FIFO waitlist order
- Transactional safety (no race conditions)
- Notification generation included

**Alternatives Considered**:
- Application-level processing: Race conditions on concurrent changes
- Cron job: Delays in waitlist promotion

**Trigger Logic**:
1. ON UPDATE of `event_attendees.rsvp_status` to 'declined'
2. Check if event has waitlist entries
3. Promote first waitlisted user to 'pending' RSVP
4. Create notification for promoted user

### iCal Export: ical.js Library

**Decision**: Use ical.js for RFC 5545 ICS file generation

**Rationale**:
- Full RFC 5545 compliance (per FR-053c)
- Supports RRULE for recurring events
- VTIMEZONE handling for timezone accuracy
- Compatible with Google Calendar, Outlook, Apple Calendar

**Alternatives Considered**:
- Manual ICS construction: Error-prone, incomplete spec coverage
- node-ical: Less active maintenance

**Export Endpoints**:
- `/api/events/{id}/export.ics` - Single event export
- `/api/calendar/export.ics` - User's full calendar feed
- Support for webcal:// subscriptions (live updates)

### Comments & History: Audit Trail Pattern

**Decision**: Separate tables for comments and event history with immutable audit trail

**Rationale**:
- Immutable history for compliance (per FR-056b)
- Efficient querying by event or user
- @mention support via text parsing and notifications
- Full-text search on comments

**Schema Design**:
```sql
CREATE TABLE event_comments (
  id UUID PRIMARY KEY,
  event_id UUID REFERENCES events(id),
  user_id UUID REFERENCES employees(id),
  content TEXT NOT NULL,
  mentions UUID[], -- Array of mentioned user IDs
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE TABLE event_history (
  id UUID PRIMARY KEY,
  event_id UUID REFERENCES events(id),
  changed_by UUID REFERENCES employees(id),
  change_type TEXT, -- 'created', 'updated', 'deleted', 'ownership_transfer'
  field_name TEXT,
  old_value JSONB,
  new_value JSONB,
  changed_at TIMESTAMPTZ DEFAULT NOW()
);
```

## GraphQL Schema Extensions

### New Types

```graphql
enum RRuleFrequency {
  DAILY
  WEEKLY
  MONTHLY
  YEARLY
}

type RecurrenceRule {
  frequency: RRuleFrequency!
  interval: Int!
  until: DateTime
  count: Int
  byWeekday: [Int!]
  byMonthDay: [Int!]
}

type EventConflict {
  conflictingEvent: Event!
  overlapStart: DateTime!
  overlapEnd: DateTime!
}

type EventNotification {
  id: UUID!
  event: Event!
  type: NotificationType!
  message: String!
  read: Boolean!
  createdAt: DateTime!
}

type WaitlistEntry {
  id: UUID!
  event: Event!
  user: Employee!
  position: Int!
  createdAt: DateTime!
}
```

### New Mutations

```graphql
type Mutation {
  # Recurring Events
  createRecurringEvent(input: RecurringEventInput!): Event!
  updateRecurringEvent(id: UUID!, scope: RecurrenceScope!, input: EventInput!): Event!
  deleteRecurringEvent(id: UUID!, scope: RecurrenceScope!): Boolean!

  # RSVP with Scope
  updateRsvpStatus(eventId: UUID!, status: RsvpStatus!, scope: RecurrenceScope): Boolean!

  # Waitlist
  joinWaitlist(eventId: UUID!): WaitlistEntry!
  leaveWaitlist(eventId: UUID!): Boolean!

  # Comments
  createEventComment(eventId: UUID!, content: String!, mentions: [UUID!]): EventComment!
  updateEventComment(id: UUID!, content: String!): EventComment!
  deleteEventComment(id: UUID!): Boolean!

  # Notifications
  markNotificationRead(id: UUID!): Boolean!
  markAllNotificationsRead: Boolean!
  updateNotificationPreferences(prefs: NotificationPreferencesInput!): NotificationPreferences!
}

enum RecurrenceScope {
  THIS_EVENT
  THIS_AND_FUTURE
  ALL_EVENTS
}
```

## Performance Optimizations

### Database Indexing Strategy

```sql
-- Event queries
CREATE INDEX idx_events_start_time ON events(start_time);
CREATE INDEX idx_events_visibility ON events(visibility);
CREATE INDEX idx_events_creator ON events(created_by);

-- Conflict detection (GiST index for range overlaps)
CREATE INDEX idx_events_time_range ON events USING GIST (tsrange(start_time, end_time));

-- RSVP lookups
CREATE INDEX idx_attendees_user_event ON event_attendees(employee_id, event_id);
CREATE INDEX idx_attendees_status ON event_attendees(rsvp_status);

-- Waitlist ordering
CREATE INDEX idx_waitlist_event_position ON event_waitlist(event_id, position);

-- Full-text search on comments
CREATE INDEX idx_comments_fulltext ON event_comments USING GIN(to_tsvector('english', content));
```

### Caching Strategy

**Redis Caching** (per Constitution IV):
- User's upcoming events (30 min TTL)
- Event attendee lists (15 min TTL)
- Public events calendar view (60 min TTL)
- Invalidation on mutations via GraphQL resolvers

### Lazy Loading

- Calendar view: Load events in visible date range only
- Comments: Paginated loading (10 per page)
- History: On-demand loading via accordion/modal
- Attendee list: Virtualized scrolling for 100+ attendees

## Security Considerations

### Row-Level Security (RLS) Policies

```sql
-- Events: Users see public events + private events they're invited to
CREATE POLICY events_select_policy ON events
  FOR SELECT USING (
    visibility = 'public' OR
    id IN (
      SELECT event_id FROM event_attendees
      WHERE employee_id = current_user_id()
    )
  );

-- Attendees: Users can only modify their own RSVP
CREATE POLICY attendees_update_policy ON event_attendees
  FOR UPDATE USING (employee_id = current_user_id());

-- Comments: Users can edit/delete only their own comments
CREATE POLICY comments_update_policy ON event_comments
  FOR UPDATE USING (user_id = current_user_id());
```

### Input Validation

**Zod Schemas** (per Constitution II):
```typescript
const EventImageSchema = z.object({
  file: z.instanceof(File)
    .refine(f => f.size <= 10_000_000, "Image must be ≤10 MB")
    .refine(f => ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(f.type),
            "Only JPEG, PNG, GIF, WebP allowed"),
});

const RRuleSchema = z.object({
  frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']),
  interval: z.number().int().positive(),
  until: z.date().optional(),
  count: z.number().int().positive().optional(),
});
```

## Testing Strategy

### E2E Test Scenarios (Playwright)

1. **Event Creation & Management**
   - Create public/private event
   - Upload event image (validate size/type)
   - Edit event details
   - Delete event (verify removed from attendees)

2. **Recurring Events**
   - Create daily/weekly/monthly/annual recurring event
   - RSVP to single instance vs. all future
   - Edit single instance vs. entire series
   - Delete single instance vs. entire series

3. **RSVP & Attendee Management**
   - RSVP to event (Accepted/Declined/Tentative)
   - Change RSVP status
   - Add/remove attendees from private event
   - Verify attendee list updates in real-time

4. **Conflict Detection & Capacity**
   - Create overlapping events
   - Verify conflict warning on RSVP
   - Reach event capacity limit
   - Join waitlist, verify promotion on decline

5. **Notifications & Reminders**
   - Receive invitation notification
   - Receive change notification
   - Configure reminder preferences
   - Receive reminder before event

6. **iCal Export & Comments**
   - Export single event as ICS
   - Export full calendar
   - Post comment with @mention
   - Edit/delete own comment

### Contract Tests

```typescript
// GraphQL mutation contract test
describe('createRecurringEvent mutation', () => {
  it('accepts valid RRULE and returns event with recurrence', async () => {
    const result = await graphql(schema, `
      mutation {
        createRecurringEvent(input: {
          title: "Weekly Team Standup",
          startTime: "2025-10-08T10:00:00Z",
          endTime: "2025-10-08T10:30:00Z",
          rrule: {
            frequency: WEEKLY,
            interval: 1,
            byWeekday: [1] # Monday
          }
        }) {
          id
          title
          rrule
        }
      }
    `);

    expect(result.data.createRecurringEvent).toMatchObject({
      title: "Weekly Team Standup",
      rrule: expect.stringContaining("FREQ=WEEKLY")
    });
  });
});
```

## Migration Plan

### Database Migrations

**Phase 1: Schema Extensions**
```sql
-- Add recurrence fields to events table
ALTER TABLE events ADD COLUMN rrule TEXT;
ALTER TABLE events ADD COLUMN recurrence_id UUID REFERENCES events(id);

-- Add capacity fields
ALTER TABLE events ADD COLUMN max_capacity INT;
ALTER TABLE events ADD COLUMN waitlist_enabled BOOLEAN DEFAULT FALSE;
```

**Phase 2: New Tables**
```sql
-- Waitlist
CREATE TABLE event_waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES employees(id),
  position INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, employee_id)
);

-- Comments
CREATE TABLE event_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES employees(id),
  content TEXT NOT NULL,
  mentions UUID[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- History
CREATE TABLE event_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  changed_by UUID REFERENCES employees(id),
  change_type TEXT NOT NULL,
  field_name TEXT,
  old_value JSONB,
  new_value JSONB,
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications
CREATE TABLE event_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES employees(id),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notification Preferences
CREATE TABLE notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES employees(id),
  event_invites BOOLEAN DEFAULT TRUE,
  event_changes BOOLEAN DEFAULT TRUE,
  event_reminders BOOLEAN DEFAULT TRUE,
  comment_mentions BOOLEAN DEFAULT TRUE,
  waitlist_updates BOOLEAN DEFAULT TRUE,
  reminder_times INT[] DEFAULT ARRAY[60, 1440] -- minutes before event
);
```

**Phase 3: Triggers & Functions**
```sql
-- Auto-promote waitlist on RSVP decline
CREATE OR REPLACE FUNCTION promote_from_waitlist()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.rsvp_status = 'accepted' AND NEW.rsvp_status = 'declined' THEN
    -- Get first waitlisted user
    WITH next_waitlist AS (
      SELECT w.id, w.employee_id, w.event_id
      FROM event_waitlist w
      WHERE w.event_id = NEW.event_id
      ORDER BY w.position
      LIMIT 1
    )
    -- Promote to pending RSVP
    INSERT INTO event_attendees (event_id, employee_id, rsvp_status)
    SELECT event_id, employee_id, 'pending'
    FROM next_waitlist
    ON CONFLICT (event_id, employee_id) DO UPDATE SET rsvp_status = 'pending';

    -- Remove from waitlist
    DELETE FROM event_waitlist WHERE id = (SELECT id FROM next_waitlist);

    -- Create notification
    INSERT INTO event_notifications (user_id, event_id, type, message)
    SELECT employee_id, event_id, 'waitlist', 'A spot opened up for this event!'
    FROM next_waitlist;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER waitlist_promotion_trigger
AFTER UPDATE ON event_attendees
FOR EACH ROW
EXECUTE FUNCTION promote_from_waitlist();

-- Audit trail trigger
CREATE OR REPLACE FUNCTION log_event_changes()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO event_history (event_id, changed_by, change_type, field_name, old_value, new_value)
  SELECT
    NEW.id,
    current_user_id(),
    TG_OP,
    key,
    to_jsonb(OLD) -> key,
    to_jsonb(NEW) -> key
  FROM jsonb_each(to_jsonb(NEW))
  WHERE to_jsonb(OLD) -> key IS DISTINCT FROM to_jsonb(NEW) -> key;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER event_audit_trigger
AFTER UPDATE ON events
FOR EACH ROW
EXECUTE FUNCTION log_event_changes();
```

## Deployment Considerations

### Environment Variables

```env
# Image Processing
MAX_IMAGE_SIZE_MB=10
IMAGE_STORAGE_PATH=/var/www/sveltehr/uploads/events
IMAGE_CDN_URL=https://cdn.sveltehr.com/events

# Notifications
NOTIFICATION_WEBSOCKET_PORT=8081
SMTP_SERVER=smtp.company.com
SMTP_FROM=noreply@sveltehr.com

# Performance
REDIS_CACHE_TTL_EVENTS=1800
REDIS_CACHE_TTL_ATTENDEES=900
```

### Monitoring & Alerts

- **Performance**: GraphQL operation timing (alert if >200ms p95)
- **Errors**: Image upload failures, notification delivery failures
- **Usage**: Events created per day, RSVP actions per hour
- **Capacity**: Waitlist promotions, notification queue depth

## Open Questions / Future Enhancements

1. **Timezone Management**: Should users set their own timezone preference or derive from browser/location?
   - **Recommendation**: Browser detection with manual override in profile settings

2. **External Calendar Sync**: Beyond iCal export, support bidirectional sync with Google Calendar/Outlook?
   - **Recommendation**: Phase 2 feature, requires OAuth integration

3. **Event Templates**: Allow users to save recurring event patterns as templates?
   - **Recommendation**: Phase 2 feature, improves UX for routine events

4. **Video Conferencing Integration**: Auto-create Zoom/Meet links for virtual events?
   - **Recommendation**: Phase 2 feature, requires third-party API integration

5. **Advanced Recurrence**: Support exceptions (skip specific dates) in recurring events?
   - **Recommendation**: Include in MVP, handle via recurrence_id relationship

## Research Completion Checklist

- [x] Calendar rendering technology selected
- [x] Recurring events standard chosen (RRULE)
- [x] Image optimization approach defined
- [x] Notification delivery mechanism designed
- [x] Conflict detection algorithm specified
- [x] Waitlist automation pattern established
- [x] iCal export library selected
- [x] Database schema designed
- [x] GraphQL schema extensions defined
- [x] Performance optimization strategy documented
- [x] Security controls specified (RLS policies)
- [x] Testing strategy outlined
- [x] Migration plan created
- [x] Deployment considerations documented

**Status**: ✅ Research Complete - Ready for Phase 1 (Design & Contracts)
