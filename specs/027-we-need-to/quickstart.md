# Quickstart: Events Calendar UI Integration

**Feature**: 027-we-need-to | **Date**: 2025-10-08

## Prerequisites

1. Backend from feature 025-events-flesh-out is running (PostGraphile + PostgreSQL)
2. Frontend dev server is running (`npm run dev`)
3. User is authenticated with valid JWT token
4. Database has test events populated

## Test Scenario 1: View Calendar with Events

**User Story**: As an employee, I want to view all my events in a calendar so that I can manage my schedule.

### Steps

1. Navigate to `/dashboard/events`
2. Verify calendar loads with current month view
3. Verify 3-month buffer is loaded (prev month + current + next month)
4. Verify events appear on calendar with:
   - Event title
   - Event type color coding
   - RSVP status badge (if applicable)
   - Capacity indicator (if has capacity limit)
   - Recurring icon (if recurring)
   - Conflict warning (if overlapping events)

### Expected Behavior

- Calendar displays current month by default
- Events load within 1 second
- Each event shows appropriate badges and indicators
- Clicking an event opens EventDetailsDialog
- Navigation arrows allow moving between months

### Acceptance Criteria

- ✅ Calendar renders with FullCalendar UI
- ✅ Events display in correct date slots
- ✅ Event cards show all required information
- ✅ Clicking event opens details dialog
- ✅ Month navigation works correctly

## Test Scenario 2: Create New Event

**User Story**: As an event organizer, I want to create events with all necessary details so that employees can attend.

### Steps

1. Click on a date in the calendar
2. EventCreateDialog opens with selected date pre-filled
3. Fill out event form:
   - Title: "Team Meeting"
   - Description: "Quarterly planning session"
   - Start date: (pre-filled from calendar)
   - End date: +1 hour from start
   - Type: "Meeting"
   - Visibility: "Public"
4. Toggle "Make this recurring"
5. Select "Weekly" frequency
6. Select days of week: Monday, Wednesday
7. Set end date: 3 months from start
8. Toggle "Set capacity limit"
9. Enter capacity: 20
10. Toggle "Enable waitlist"
11. Click "Upload Image"
12. Select image file (< 10MB, JPEG/PNG)
13. Choose aspect ratio: "16:9"
14. Adjust crop area
15. Confirm crop
16. Click "Create Event"

### Expected Behavior

- Form validates all fields before submission
- RRULE string generated correctly for recurrence
- Image uploaded and cropped to 16:9 ratio
- Event created successfully
- Calendar refreshes with new event
- User receives confirmation toast

### Acceptance Criteria

- ✅ Dialog opens on date click
- ✅ All form fields work correctly
- ✅ Recurrence pattern builder generates valid RRULE
- ✅ Image upload works with crop interface
- ✅ Form validation prevents invalid submissions
- ✅ Event appears on calendar after creation

## Test Scenario 3: RSVP to Recurring Event

**User Story**: As an employee, I want to RSVP to recurring events so that organizers know my availability.

### Steps

1. Click on a recurring event (shows repeat icon)
2. EventDetailsDialog opens on "Details" tab
3. Verify event details:
   - Title, description, location
   - Start/end date
   - Recurring pattern (e.g., "Every Monday")
   - Capacity: "8/10 spots filled"
   - RSVP status: "Pending"
4. Click "Accept" button
5. RecurrenceScopeDialog appears
6. Choose "All future events"
7. Confirm selection

### Expected Behavior

- Details dialog shows all event information
- Recurring events display pattern clearly
- RSVP scope prompt only appears for recurring events
- RSVP status updates immediately (optimistic UI)
- Backend receives mutation with scope = "future"
- Calendar updates all future instances with "Accepted" badge

### Acceptance Criteria

- ✅ Details dialog renders correctly
- ✅ Capacity indicator shows filled/total
- ✅ RSVP button triggers scope dialog for recurring events
- ✅ Scope selection applied correctly
- ✅ UI updates optimistically
- ✅ Calendar reflects new RSVP status

## Test Scenario 4: Join Waitlist for Full Event

**User Story**: As an employee, I want to join the waitlist when an event is full so that I can attend if spots open up.

### Steps

1. Click on a full event (capacity badge shows "10/10 Full")
2. EventDetailsDialog opens
3. Verify "RSVP" button is disabled
4. Verify "Join Waitlist" button is visible and enabled
5. Click "Join Waitlist"
6. Confirmation dialog appears
7. Confirm waitlist join

### Expected Behavior

- Full events disable RSVP button
- Waitlist button appears if `waitlistEnabled === true`
- Joining waitlist shows confirmation
- User's waitlist position displays (e.g., "On waitlist (#3)")
- If someone declines, user promoted automatically (via subscription)

### Acceptance Criteria

- ✅ Full events show "Join Waitlist" option
- ✅ Waitlist position displayed after joining
- ✅ Real-time promotion notification received
- ✅ Calendar updates when promoted

## Test Scenario 5: Drag-and-Drop Reschedule

**User Story**: As an event creator, I want to reschedule events by dragging them to new times.

### Steps

1. Identify an event created by current user
2. Click and hold event card
3. Drag event to different date
4. While dragging over valid slot, event shows normal styling
5. While dragging over invalid slot (e.g., past date), event turns red
6. Drop event on valid future date
7. For recurring event: RecurrenceScopeDialog appears
8. Choose "This event only"
9. Confirm reschedule

### Expected Behavior

- Only events where `canEdit === true` are draggable
- Invalid drop targets show red styling
- Valid drop targets allow drop
- Recurring events prompt for scope
- Event reschedules immediately on drop
- Attendees receive notification of change
- Calendar updates in real-time

### Acceptance Criteria

- ✅ Drag-drop only works for user's events
- ✅ Visual feedback for valid/invalid drops
- ✅ Scope prompt for recurring events
- ✅ Event saves immediately on drop
- ✅ Real-time update via subscription

## Test Scenario 6: Comment on Event

**User Story**: As an attendee, I want to comment on events to ask questions and share information.

### Steps

1. Open EventDetailsDialog
2. Click "Comments" tab
3. Verify existing comments load
4. Type new comment: "Looking forward to this! @JohnDoe what should I prepare?"
5. Verify @mention autocomplete appears
6. Select user from autocomplete
7. Click "Post Comment"
8. Comment appears immediately

### Expected Behavior

- Comments tab shows all comments chronologically
- New comment input at bottom
- @mention autocomplete works (@username)
- Comment posted successfully
- Mentioned user receives notification
- Comment appears with user avatar, name, timestamp

### Acceptance Criteria

- ✅ Comments tab loads existing comments
- ✅ @mention autocomplete functional
- ✅ Comment posts successfully
- ✅ Optimistic UI update
- ✅ Mentioned users notified

## Test Scenario 7: View Event History

**User Story**: As an event creator, I want to see the history of changes to my event.

### Steps

1. Open EventDetailsDialog for event with changes
2. Click "History" tab
3. Verify history entries load
4. Review timeline of changes:
   - "Created by Alice on Oct 1"
   - "Capacity changed from 15 to 20 by Alice on Oct 2"
   - "Attendee Bob added by Alice on Oct 3"
   - "Rescheduled from Oct 10 to Oct 12 by Alice on Oct 5"

### Expected Behavior

- History tab shows chronological timeline
- Each entry shows:
  - User who made change
  - Action performed
  - Specific changes (old → new)
  - Timestamp
- History loaded lazily when tab opened

### Acceptance Criteria

- ✅ History tab renders timeline
- ✅ All actions tracked correctly
- ✅ Changes show old and new values
- ✅ User attribution correct

## Test Scenario 8: Conflict Detection

**User Story**: As an employee, I want to be warned about schedule conflicts so that I don't double-book myself.

### Steps

1. Already have event "Meeting A" on Oct 10, 10:00-11:00 with RSVP "Accepted"
2. Try to RSVP "Accept" to event "Meeting B" on Oct 10, 10:30-11:30
3. ConflictWarningDialog appears
4. Verify conflict details:
   - "Conflicts with 1 other event:"
   - "Meeting A: 10:00 AM - 11:00 AM (30 minute overlap)"
   - Severity: "Major" (50% overlap)
5. Choose "RSVP Anyway" to proceed
6. RSVP status updates to "Accepted"
7. Both events show conflict warning icons on calendar

### Expected Behavior

- Conflict detected before RSVP confirmed
- Warning dialog shows all conflicting events
- Overlap duration calculated correctly
- User can proceed or cancel
- Calendar marks both events with conflict icon

### Acceptance Criteria

- ✅ Conflicts detected before RSVP
- ✅ Warning dialog displays conflicts
- ✅ Overlap duration/percentage calculated
- ✅ User can proceed despite conflict
- ✅ Calendar shows conflict indicators

## Test Scenario 9: Configure Notification Preferences

**User Story**: As an employee, I want to customize my notification preferences so that I receive relevant alerts.

### Steps

1. Navigate to `/dashboard/events/settings`
2. Notification Preferences page loads
3. Review current settings (loaded from backend)
4. Toggle "Event Invitations" to ON
5. Toggle "Event Changes" to ON
6. Toggle "Comment Mentions" to ON
7. Select reminder times:
   - Check "15 minutes before"
   - Check "1 hour before"
8. Select reminder scope: "Only accepted events"
9. Click "Save Preferences"
10. Success toast appears
11. Verify "Last saved: just now"

### Expected Behavior

- Preferences load from backend on page load
- All toggles functional
- Reminder time checkboxes (max 3)
- Reminder scope radio buttons
- Save button triggers mutation
- Optimistic UI update
- Success confirmation shown

### Acceptance Criteria

- ✅ Preferences load correctly
- ✅ All controls functional
- ✅ Max 3 reminder times enforced
- ✅ Save persists to backend
- ✅ Success confirmation shown

## Test Scenario 10: Export Calendar to iCal

**User Story**: As an employee, I want to export my events to my external calendar app.

### Steps

1. View calendar with multiple events
2. Click "Export My Calendar" button in header
3. Export dialog appears with:
   - Format: .ics file
   - Compatibility: "Works with Google Calendar, Outlook, Apple Calendar"
4. Click "Download"
5. File downloads: `my-calendar.ics`
6. Open file in external calendar app
7. Verify all events imported correctly with:
   - Title, description, location
   - Start/end times
   - Recurrence rules
   - Alarms/reminders

### Expected Behavior

- Export button visible in calendar header
- .ics file generated with all user's events
- File follows iCalendar spec (RFC 5545)
- RRULE strings formatted correctly
- File imports cleanly to Google/Outlook/Apple

### Acceptance Criteria

- ✅ Export button functional
- ✅ .ics file generated correctly
- ✅ All events included in export
- ✅ RFC 5545 compliance
- ✅ Import works in external apps

## Test Scenario 11: Mobile Responsive Calendar

**User Story**: As a mobile user, I want to view and manage events on my phone.

### Steps

1. Open calendar on mobile device (or resize browser to mobile width)
2. Verify calendar adapts to mobile view:
   - Simplified event cards
   - Touch-friendly controls
   - Bottom sheet dialogs instead of modals
3. Tap on event
4. EventDetailsDialog opens as bottom sheet
5. Swipe to switch tabs (Details, Comments, History)
6. Tap "Create Event" button
7. EventCreateDialog opens as bottom sheet
8. Fill out form with mobile keyboard
9. Upload image from camera/photos

### Expected Behavior

- Calendar switches to mobile layout
- Touch interactions work smoothly
- Dialogs open as bottom sheets
- Forms are touch-friendly
- Image upload works with mobile photos

### Acceptance Criteria

- ✅ Responsive design ≤768px width
- ✅ Touch interactions functional
- ✅ Bottom sheet dialogs on mobile
- ✅ Mobile keyboard doesn't break layout
- ✅ Camera/photo uploads work

## Test Scenario 12: Real-Time Event Updates

**User Story**: As an employee, I want to see events update in real-time when others make changes.

### Steps

1. Open calendar as User A
2. In another browser/session, User B creates new event
3. User A's calendar updates immediately (via WebSocket subscription)
4. New event appears on calendar
5. User B then reschedules the event to different date
6. User A's calendar updates to reflect new date
7. User B deletes the event
8. Event disappears from User A's calendar

### Expected Behavior

- WebSocket subscription active on calendar page
- Event mutations trigger subscription updates
- Calendar re-renders with new data
- Updates appear within 500ms (batched)
- Visual indicator shows update occurred

### Acceptance Criteria

- ✅ Subscription connects on page load
- ✅ Create events show immediately
- ✅ Update events reflect immediately
- ✅ Delete events disappear immediately
- ✅ Update indicator visible

## Performance Validation

### Calendar Load Performance

```bash
# Measure initial calendar load time
1. Clear browser cache
2. Navigate to /dashboard/events
3. Measure time to "calendar rendered"
Expected: <1 second
```

### 3-Month Buffer Prefetch

```bash
# Verify buffer strategy
1. Load October 2025 calendar
2. Check network requests:
   - Should load Sep 2025, Oct 2025, Nov 2025
3. Navigate to November
4. Check network requests:
   - Should load Dec 2025 (new month)
   - Should NOT reload Sep/Oct/Nov
```

### Image Upload Performance

```bash
# Measure image processing time
1. Select 8MB JPEG image
2. Crop to 16:9 ratio
3. Measure time from "Upload" click to "Success"
Expected: <5 seconds
```

## Accessibility Validation

### Keyboard Navigation

```bash
# Test keyboard-only navigation
1. Tab through calendar
2. Verify focus indicators visible
3. Arrow keys navigate between events
4. Enter opens event details
5. Tab through dialog controls
6. Escape closes dialogs
```

### Screen Reader

```bash
# Test with screen reader (NVDA/JAWS/VoiceOver)
1. Navigate to calendar
2. Verify events announced with context:
   - "Team Meeting, October 10, 10 AM to 11 AM, Meeting, You are attending, 8 of 10 spots filled"
3. Navigate to details dialog
4. Verify all controls have aria-labels
5. Verify tab structure announced
```

## Cleanup

After testing, no cleanup required. Test data persists in database for future testing.

## Next Steps

After quickstart validation passes:
1. Run `/tasks` to generate implementation tasks
2. Execute tasks following TDD approach
3. Write E2E tests for all 57 scenarios
4. Run full test suite before merge
