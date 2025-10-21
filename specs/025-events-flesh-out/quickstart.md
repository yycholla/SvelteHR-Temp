# Quickstart: Events Calendar System

## Overview

This quickstart guide provides step-by-step instructions to validate the events calendar system implementation. Each scenario maps to functional requirements and user stories from the specification.

## Prerequisites

- Development environment running (SvelteKit + PostgreSQL + PostGraphile)
- Test database seeded with sample employees
- At least 2 test user accounts (one manager, one employee)
- Browser with dev tools open (for network/console monitoring)

## Setup

### 1. Database Migration

```bash
# Apply schema migrations
cd backend
npm run db:migrate

# Verify tables created
psql -d sveltehr -c "\dt event*"

# Expected output:
# event_attendees
# event_comments
# event_history
# event_notifications
# event_waitlist
# events
# notification_preferences
```

### 2. GraphQL Schema Verification

```bash
# Regenerate GraphQL types
npm run graphql:codegen

# Verify new types generated
ls src/lib/graphql/types.ts | grep -E "(Event|Rsvp|Waitlist|Comment)"
```

### 3. Frontend Development Server

```bash
# Start dev server
npm run dev

# Navigate to events calendar
open http://localhost:5173/dashboard/events
```

## Test Scenarios

### Scenario 1: Create Public Event (FR-001, FR-011, FR-012)

**As Event Creator:**

1. Navigate to `/dashboard/events`
2. Click "Create Event" button
3. Fill in event form:
   - Title: "Company All-Hands Meeting"
   - Description: "Q4 2025 company update and Q&A"
   - Start: Tomorrow at 10:00 AM
   - End: Tomorrow at 11:00 AM
   - Location: "Main Conference Room"
   - Visibility: **Public**
   - Type: Meeting
4. Click "Create Event"

**Expected Results:**
- ✅ Event appears on calendar
- ✅ Event visible to all employees (test with second account)
- ✅ Creator automatically added as attendee with "Accepted" status
- ✅ Event card shows attendee count
- ✅ No errors in console

**GraphQL Mutation Verification:**
```graphql
mutation {
  createEvent(input: {
    title: "Company All-Hands Meeting",
    description: "Q4 2025 company update and Q&A",
    startTime: "2025-10-08T10:00:00Z",
    endTime: "2025-10-08T11:00:00Z",
    location: "Main Conference Room",
    visibility: PUBLIC,
    type: MEETING
  }) {
    id
    title
    visibility
    createdBy { name }
  }
}
```

---

### Scenario 2: Create Private Event with Attendees (FR-013, FR-014, FR-018)

**As Event Creator:**

1. Click "Create Event"
2. Fill in event form:
   - Title: "Engineering Sprint Planning"
   - Description: "Plan Q4 sprint goals"
   - Start: Next Monday at 2:00 PM
   - End: Next Monday at 3:00 PM
   - Visibility: **Private**
   - Attendees: Select 3-4 specific employees
3. Click "Create Event"

**Expected Results:**
- ✅ Event created and visible only to selected attendees
- ✅ Other employees cannot see this event (verify with non-invited account)
- ✅ Invited attendees receive notification (FR-047)
- ✅ Attendees see event in their calendar
- ✅ RLS policy enforced (SELECT query returns null for non-invited users)

**Database Verification:**
```sql
-- Verify attendees created
SELECT e.title, ea.employee_id, ea.rsvp_status
FROM events e
JOIN event_attendees ea ON ea.event_id = e.id
WHERE e.title = 'Engineering Sprint Planning';

-- Verify RLS policy (as non-invited user)
SET app.current_user_id = '<non_invited_user_uuid>';
SELECT * FROM events WHERE title = 'Engineering Sprint Planning';
-- Should return 0 rows
```

---

### Scenario 3: RSVP to Event (FR-024, FR-025, FR-026, FR-028)

**As Event Attendee:**

1. Navigate to calendar view
2. Click on "Company All-Hands Meeting" event
3. Event details dialog opens
4. Click RSVP dropdown
5. Select "Accepted"

**Expected Results:**
- ✅ RSVP status updates immediately (no page reload)
- ✅ Event card shows updated attendee count
- ✅ User's calendar highlights accepted event
- ✅ Creator sees updated RSVP count
- ✅ Database record persisted

**Test RSVP Changes:**
1. Change RSVP to "Tentative"
2. Change RSVP to "Declined"
3. Change back to "Accepted"

**Expected Results:**
- ✅ Each change persists
- ✅ Updated timestamp changes
- ✅ No duplicate records created

**GraphQL Mutation:**
```graphql
mutation {
  updateRsvpStatus(
    eventId: "<event_uuid>",
    status: ACCEPTED
  ) {
    id
    rsvpStatus
    updatedAt
  }
}
```

---

### Scenario 4: Create Recurring Event (FR-045, FR-045a)

**As Event Creator:**

1. Click "Create Recurring Event"
2. Fill in form:
   - Title: "Weekly Team Standup"
   - Start: Next Monday at 9:00 AM
   - End: Next Monday at 9:15 AM
   - Recurrence: Weekly
   - Frequency: Every 1 week
   - On: Monday
   - Ends: After 12 occurrences
3. Click "Create Series"

**Expected Results:**
- ✅ Parent event created with rrule field populated
- ✅ Calendar shows multiple instances (12 weeks)
- ✅ Each instance links to parent event
- ✅ RRULE format: `FREQ=WEEKLY;INTERVAL=1;BYDAY=MO;COUNT=12`

**Verify Instances:**
```graphql
query {
  recurringEventInstances(
    eventId: "<parent_event_uuid>",
    start: "2025-10-08T00:00:00Z",
    end: "2025-12-31T00:00:00Z"
  ) {
    id
    title
    startTime
    recurrenceId
  }
}
```

---

### Scenario 5: RSVP to Recurring Event with Scope (FR-045a, FR-045b, FR-045c)

**As Event Attendee:**

1. Click on Week 3 instance of "Weekly Team Standup"
2. Click RSVP dropdown
3. Select "Declined"
4. **System prompts:** "Apply to this event only or all future events?"
5. Select "This event only"

**Expected Results:**
- ✅ Scope selection dialog appears
- ✅ Week 3 instance shows "Declined"
- ✅ Other instances remain "Pending"
- ✅ Event exception created (recurrence_id set)

**Test "All Future Events" Scope:**
1. Click on Week 5 instance
2. Select "Accepted"
3. Choose "This and future events"

**Expected Results:**
- ✅ Week 5-12 instances show "Accepted"
- ✅ Week 1-4 unchanged
- ✅ Database records created for affected instances

---

### Scenario 6: Edit Recurring Event (FR-002a, FR-002b, FR-002c)

**As Event Creator:**

1. Click on Week 2 instance of "Weekly Team Standup"
2. Click "Edit Event"
3. Change time to 9:30 AM - 9:45 AM
4. **System prompts:** "Edit this event only or entire series?"
5. Select "This event only"

**Expected Results:**
- ✅ Week 2 instance time changed
- ✅ Other instances unchanged
- ✅ Exception event created (recurrence_id = parent_id)
- ✅ Change logged in event_history

**Test "Entire Series" Edit:**
1. Click on any instance
2. Edit → Change title to "Daily Team Standup"
3. Select "Entire series"

**Expected Results:**
- ✅ All instances show new title
- ✅ Parent event updated
- ✅ History log shows series-wide change

---

### Scenario 7: Event Capacity & Waitlist (FR-054, FR-054a-d)

**As Event Creator:**

1. Create new event:
   - Title: "Workshop: Introduction to GraphQL"
   - Max Capacity: 3
   - Waitlist Enabled: Yes
2. Invite 5 employees

**As Attendees (use 5 different accounts):**

1. First 3 attendees RSVP "Accepted"
2. 4th attendee attempts to RSVP "Accepted"

**Expected Results:**
- ✅ First 3 RSVPs succeed
- ✅ 4th RSVP blocked with error: "Event capacity reached"
- ✅ Capacity indicator shows "3/3 spots filled"
- ✅ "Join Waitlist" button appears

**Join Waitlist:**
1. 4th attendee clicks "Join Waitlist"
2. 5th attendee also joins waitlist

**Expected Results:**
- ✅ Waitlist shows positions: #1, #2
- ✅ Waitlist entries created in database

**Test Auto-Promotion:**
1. 2nd attendee changes RSVP to "Declined"

**Expected Results:**
- ✅ 4th attendee (position #1) automatically promoted
- ✅ 4th attendee receives notification: "A spot opened up!"
- ✅ 4th attendee RSVP changes to "Pending"
- ✅ 5th attendee moves to position #1 in waitlist

**Database Verification:**
```sql
-- Verify trigger execution
SELECT * FROM event_waitlist WHERE event_id = '<workshop_uuid>';
SELECT * FROM event_notifications WHERE type = 'waitlist';
```

---

### Scenario 8: Conflict Detection (FR-046, FR-046a, FR-046b)

**As Event Attendee:**

1. RSVP "Accepted" to "Company All-Hands" (10:00-11:00 AM)
2. Navigate to calendar
3. Attempt to create overlapping event:
   - Title: "Client Call"
   - Time: 10:30-11:30 AM (overlaps by 30 min)

**Expected Results:**
- ✅ Warning message: "You have 1 conflicting event"
- ✅ Conflicting event listed: "Company All-Hands Meeting"
- ✅ User can proceed anyway (warning, not blocking)
- ✅ Both events show conflict indicator in calendar

**GraphQL Query:**
```graphql
query {
  conflictingEvents(
    startTime: "2025-10-08T10:30:00Z",
    endTime: "2025-10-08T11:30:00Z"
  ) {
    id
    title
    startTime
    endTime
  }
}
```

---

### Scenario 9: Event Comments & @Mentions (FR-055, FR-055a-d)

**As Event Attendee:**

1. Open "Company All-Hands Meeting" event
2. Scroll to comments section
3. Type: "@John Smith will you be presenting the Q4 results?"
4. Click "Post Comment"

**Expected Results:**
- ✅ Comment posted immediately
- ✅ John Smith receives notification (type: MENTION)
- ✅ John Smith's name highlighted/linked in comment
- ✅ Comment author and timestamp displayed

**Edit Comment:**
1. Click "Edit" on own comment
2. Change text to: "@John Smith confirmed for presentation"
3. Save

**Expected Results:**
- ✅ Comment updated
- ✅ "Edited" indicator shown
- ✅ updated_at timestamp changed
- ✅ New notification sent to John Smith

**Delete Comment:**
1. Click "Delete" on own comment
2. Confirm deletion

**Expected Results:**
- ✅ Comment removed immediately
- ✅ Database record soft deleted or hard deleted

---

### Scenario 10: Notifications & Preferences (FR-047-051)

**As Event Attendee:**

1. Navigate to `/dashboard/settings/notifications`
2. View notification preferences
3. Disable "Event Changes" notifications
4. Enable reminders: 1 hour and 1 day before events
5. Save preferences

**Expected Results:**
- ✅ Preferences saved to database
- ✅ Settings UI reflects changes

**Test Notification Delivery:**
1. Have another user edit an event you're attending
2. Check notifications bell icon

**Expected Results:**
- ✅ NO notification received (event changes disabled)
- ✅ Other notification types still working

**Test Reminders:**
1. Create event starting in 65 minutes
2. Wait for reminder (or use time manipulation in tests)

**Expected Results:**
- ✅ Reminder notification sent at T-60 minutes
- ✅ Reminder notification sent at T-1 day (if applicable)
- ✅ Notification type: REMINDER

---

### Scenario 11: Event Image Upload (FR-039-044)

**As Event Creator:**

1. Create or edit an event
2. Click "Upload Image"
3. Select a 15 MB JPEG file

**Expected Results:**
- ✅ Error: "Image must be 10 MB or smaller" (FR-043a)
- ✅ Upload blocked

**Upload Valid Image:**
1. Select a 5 MB PNG file
2. Click "Upload"

**Expected Results:**
- ✅ Upload progress indicator
- ✅ Image processed (resized/compressed) (FR-044)
- ✅ Optimized image URL returned
- ✅ Image displayed in event card
- ✅ Original aspect ratio maintained (FR-044b)

**Test Image Types:**
- ✅ JPEG: Accepted
- ✅ PNG: Accepted
- ✅ GIF: Accepted
- ✅ WebP: Accepted
- ❌ PDF: Rejected
- ❌ SVG: Rejected

---

### Scenario 12: iCal Export (FR-053, FR-053a-c)

**As Event Attendee:**

1. Navigate to calendar view
2. Click on single event "Company All-Hands"
3. Click "Export to Calendar" button

**Expected Results:**
- ✅ .ics file downloaded
- ✅ Filename: `company-all-hands-meeting.ics`
- ✅ File opens in Google Calendar/Outlook/Apple Calendar
- ✅ Event details match (title, time, location)

**Export Full Calendar:**
1. Click "Export Calendar" in calendar toolbar
2. Download `my-calendar.ics`

**Expected Results:**
- ✅ File contains all user's events
- ✅ Recurring events include RRULE
- ✅ VTIMEZONE information included
- ✅ Compatible with all major calendar apps

**Test Webcal Subscription (Advanced):**
```
webcal://localhost:5173/api/calendar/feed?userId=<uuid>&token=<jwt>
```

**Expected Results:**
- ✅ Live-updating calendar feed
- ✅ Changes in app reflect in subscribed calendar

---

### Scenario 13: Event History Audit Trail (FR-056, FR-056a-d)

**As Event Creator:**

1. Open existing event
2. Click "View History" or "Changes" tab
3. Review audit trail

**Expected Results:**
- ✅ All changes listed chronologically
- ✅ Each entry shows:
  - Timestamp
  - User who made change
  - Field changed
  - Old value → New value
- ✅ Immutable records (no edit/delete buttons)

**Generate History Entries:**
1. Edit event title
2. Edit event time
3. Add attendee
4. Remove attendee

**Expected Results:**
- ✅ 4 new history entries created
- ✅ Field names: "title", "start_time", "attendees"
- ✅ JSONB values for old_value and new_value
- ✅ change_type: "updated", "attendee_added", "attendee_removed"

**Database Verification:**
```sql
SELECT
  eh.changed_at,
  e.email AS changed_by,
  eh.change_type,
  eh.field_name,
  eh.old_value,
  eh.new_value
FROM event_history eh
JOIN employees e ON e.id = eh.changed_by
WHERE eh.event_id = '<event_uuid>'
ORDER BY eh.changed_at DESC;
```

---

### Scenario 14: Account Deactivation & Ownership Transfer (FR-061, FR-061a-b)

**As Admin:**

1. Create test event as user "John Doe"
2. Ensure John has a manager assigned
3. Deactivate John's account

**Expected Results:**
- ✅ Event ownership transfers to John's manager
- ✅ created_by field updated
- ✅ History entry created:
  - change_type: "ownership_transfer"
  - old_value: John's UUID
  - new_value: Manager's UUID
- ✅ Event remains visible to all attendees

**Test No Manager Scenario:**
1. Create event as user with no manager
2. Deactivate user

**Expected Results:**
- ✅ Ownership transfers to designated admin
- ✅ History entry logged
- ✅ Event not deleted

---

## Performance Validation

### 1. GraphQL Operation Timing (Constitution IV)

```bash
# Monitor GraphQL operations
# Open browser DevTools → Network tab → Filter: "graphql"

# Create event and measure time
# Expected: <200ms
```

**Benchmark Queries:**
- `events(limit: 50)`: <200ms
- `myEvents(start: "...", end: "...")`: <150ms
- `conflictingEvents(...)`: <100ms (with GiST index)

### 2. Calendar Rendering Performance

```javascript
// In browser console
console.time('calendar-render');
// Navigate to /dashboard/events
console.timeEnd('calendar-render');
// Expected: <1000ms (1 second)
```

### 3. Database Index Usage

```sql
-- Verify indexes used
EXPLAIN ANALYZE
SELECT * FROM events
WHERE tsrange(start_time, end_time) && tsrange(NOW(), NOW() + INTERVAL '1 hour');

-- Expected: Index Scan using idx_events_time_range
```

---

## Security Validation

### 1. Row-Level Security (RLS)

**Test Private Event Access:**
```sql
-- As user A (not invited)
SET app.current_user_id = '<user_a_uuid>';
SELECT * FROM events WHERE visibility = 'private';
-- Expected: Only events where user A is attendee

-- Attempt to view specific private event
SELECT * FROM events WHERE id = '<private_event_uuid>';
-- Expected: 0 rows (if not invited)
```

### 2. RBAC Permission Checks

**Test Event Editing:**
```graphql
# As non-creator user
mutation {
  updateEvent(
    id: "<other_user_event>",
    input: { title: "Hacked!" }
  ) {
    id
  }
}
# Expected: Error "Unauthorized: Only event creator can edit"
```

### 3. Input Validation

**Test SQL Injection:**
```graphql
mutation {
  createEvent(input: {
    title: "'; DROP TABLE events; --",
    startTime: "2025-10-08T10:00:00Z",
    endTime: "2025-10-08T11:00:00Z",
    visibility: PUBLIC,
    type: MEETING
  }) {
    id
  }
}
# Expected: Event created safely with literal title, no SQL execution
```

---

## Cleanup

After testing, clean up test data:

```sql
-- Delete test events
DELETE FROM events WHERE title LIKE '%Test%' OR title LIKE '%Workshop%';

-- Delete test notifications
DELETE FROM event_notifications WHERE created_at > NOW() - INTERVAL '1 hour';

-- Reset waitlist
DELETE FROM event_waitlist;
```

---

## Acceptance Checklist

### Core Features
- [ ] Create public event
- [ ] Create private event with attendees
- [ ] RSVP to event (all statuses)
- [ ] Change RSVP status
- [ ] Create recurring event (daily/weekly/monthly/annual)
- [ ] RSVP to recurring event with scope
- [ ] Edit recurring event with scope
- [ ] Delete recurring event with scope

### Capacity & Waitlist
- [ ] Event capacity enforcement
- [ ] Join waitlist
- [ ] Auto-promotion from waitlist
- [ ] Waitlist notifications

### Conflict Detection
- [ ] Detect scheduling conflicts
- [ ] Display conflict warnings
- [ ] Visual conflict indicators

### Comments & Notifications
- [ ] Post comment on event
- [ ] @mention in comment
- [ ] Edit/delete own comment
- [ ] Receive notifications (invite, change, reminder, mention, waitlist)
- [ ] Configure notification preferences

### Images & Export
- [ ] Upload event image (validation)
- [ ] Auto-optimize images
- [ ] Export single event as ICS
- [ ] Export full calendar as ICS
- [ ] iCal compatibility with major calendars

### Audit & History
- [ ] View event change history
- [ ] Immutable audit trail
- [ ] Ownership transfer on account deactivation

### Performance & Security
- [ ] GraphQL operations <200ms
- [ ] Page load <1s
- [ ] RLS policies enforced
- [ ] RBAC permissions validated
- [ ] Input sanitization working

**Status**: Ready for implementation testing ✅

---

## Troubleshooting

### Common Issues

**Issue: Event not visible to attendees**
- Check event visibility setting
- Verify RLS policies applied
- Confirm user is in event_attendees table

**Issue: Waitlist promotion not working**
- Verify trigger installed: `SELECT * FROM pg_trigger WHERE tgname = 'waitlist_promotion_trigger';`
- Check trigger function exists
- Review PostgreSQL logs for errors

**Issue: GraphQL operation slow (>200ms)**
- Check EXPLAIN ANALYZE output
- Verify indexes exist
- Consider Redis caching for frequently accessed data

**Issue: Image upload fails**
- Check file size (≤10 MB)
- Verify file type (JPEG/PNG/GIF/WebP)
- Check upload directory permissions
- Review Sharp library logs

**Issue: Notifications not received**
- Verify notification preferences enabled
- Check WebSocket connection status
- Review event_notifications table
- Confirm PostgreSQL LISTEN/NOTIFY working

---

**Quickstart Version**: 1.0.0
**Last Updated**: 2025-10-07
**Next Steps**: Proceed to `/tasks` command for task generation
