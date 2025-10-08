# Quickstart: Integrate Events UI Components

**Feature**: 026-integrate-ui-components
**Date**: 2025-10-08
**Purpose**: Manual validation scenario for integrated event details dialog

## Prerequisites

✅ Feature 025 (events-flesh-out) deployed
✅ Database migrations applied (event_comments, event_history, event_waitlist tables)
✅ GraphQL resolvers deployed for comments, history, waitlist
✅ PostGraphile server running on port 4000
✅ SvelteKit dev server running on port 5173
✅ Test user account with authentication

## Validation Scenario

### Step 1: Open Event Details Dialog

1. Navigate to `/dashboard/events`
2. Click on any event card to open EventDetailsDialog
3. **Expected**:
   - Dialog opens with tab-based interface
   - Three tabs visible: "Details", "Comments", "History"
   - "Details" tab active by default (FR-002)
   - Comments tab shows badge with count if comments exist (FR-003)

**✓ Pass Criteria**: Dialog opens, tabs render correctly, default tab is "Details"

---

### Step 2: Verify Tab Navigation

1. Click "Comments" tab
2. **Expected**:
   - Tab switches without closing dialog (FR-004)
   - Comments tab content loads
   - Comment input field visible (if user has permission)
   - "Load More" button visible if >20 comments exist (FR-015a)

3. Click "History" tab
4. **Expected**:
   - Tab switches to History
   - Accordion-style history entries displayed (FR-025)
   - Entries collapsed by default
   - "Load More" button visible if >25 entries exist (FR-023a)

5. Click "Details" tab
6. **Expected**:
   - Returns to Details view
   - All event information displayed
   - Capacity indicator shown if maxCapacity set (FR-009)
   - Waitlist button shown if event full + waitlist enabled (FR-012)

**✓ Pass Criteria**: All three tabs navigate smoothly, content loads correctly

---

### Step 3: Add Comment with @Mention

1. Navigate to "Comments" tab
2. Type in comment input field:
   ```
   Great event! @johndoe will you be attending?
   ```
3. Click "Submit" or press Enter
4. **Expected**:
   - Comment appears at top of list (chronological order, DESC)
   - @johndoe is highlighted with visual distinction (FR-016)
   - Timestamp shows relative format (e.g., "just now") (FR-021)
   - Comment count badge increments on Comments tab

**✓ Pass Criteria**: Comment submitted, @mention highlighted, relative timestamp shown

---

### Step 4: Verify XSS Sanitization

1. Navigate to "Comments" tab
2. Type in comment input field (including malicious HTML):
   ```
   <script>alert('XSS')</script>This is a test <b>with HTML</b> and @alice mentioned
   ```
3. Click "Submit"
4. **Expected**:
   - Script tags removed (FR-017c)
   - HTML tags removed (FR-017c)
   - Plain text preserved: "This is a test with HTML and @alice mentioned" (FR-017d)
   - @alice mention highlighted (FR-017d)
   - **NO** JavaScript alert executed

**✓ Pass Criteria**: HTML/JavaScript stripped, plain text + @mentions preserved

---

### Step 5: Edit Own Comment

1. Find your own comment in the list
2. Click "Edit" button (pencil icon)
3. **Expected**:
   - Comment content becomes editable
   - Save/Cancel buttons appear

4. Modify text and click "Save"
5. **Expected**:
   - Comment updates inline
   - "updated_at" timestamp changes
   - Updated timestamp shown in UI

6. Try to edit another user's comment
7. **Expected**:
   - No Edit button visible (FR-020)

**✓ Pass Criteria**: Own comments editable, other users' comments not editable

---

### Step 6: Verify Timestamp Transition (48-hour threshold)

1. Navigate to "Comments" tab
2. Find comments posted ≤48 hours ago
3. **Expected**:
   - Relative timestamps shown (e.g., "2 hours ago", "1 day ago") (FR-021)

4. Find comments posted >48 hours ago (or modify database for testing)
5. **Expected**:
   - Absolute timestamps shown (e.g., "Jan 15, 2025 3:30 PM") (FR-022)

**✓ Pass Criteria**: Timestamps transition at 48-hour boundary

---

### Step 7: Test Comment Pagination

1. Navigate to "Comments" tab on event with >20 comments
2. **Expected**:
   - 20 most recent comments displayed (FR-015)
   - "Load More" button visible at bottom (FR-015a)

3. Click "Load More" button
4. **Expected**:
   - Next 20 comments load and append to list
   - Button remains if more comments exist
   - Button disappears if all comments loaded

**✓ Pass Criteria**: Pagination loads 20 at a time, "Load More" functions correctly

---

### Step 8: View Event History

1. Navigate to "History" tab
2. **Expected**:
   - Accordion-style entries displayed (FR-025)
   - Each entry collapsed by default
   - Color-coded by change type: created (green), updated (blue), deleted (red) (FR-026)

3. Click on a history entry to expand
4. **Expected**:
   - Entry expands to show details:
     - Field name (e.g., "title", "startTime")
     - Old value
     - New value
     - Who made the change (employee name)
     - When changed (timestamp)
   - All fields match FR-024 requirements

5. Attempt to edit or delete a history entry
6. **Expected**:
   - No edit/delete buttons visible (FR-027)
   - History is read-only

**✓ Pass Criteria**: History displays correctly, read-only, color-coded

---

### Step 9: Test History Pagination

1. Navigate to "History" tab on event with >25 history entries
2. **Expected**:
   - 25 most recent entries displayed (FR-023)
   - "Load More" button visible at bottom (FR-023a)

3. Click "Load More" button
4. **Expected**:
   - Next 25 entries load and append to list
   - Button remains if more entries exist
   - Button disappears if all entries loaded

**✓ Pass Criteria**: Pagination loads 25 at a time, "Load More" functions correctly

---

### Step 10: Test Capacity Indicator (if applicable)

1. Navigate to "Details" tab on event with maxCapacity set
2. **Expected**:
   - EventCapacityIndicator component visible (FR-009)
   - Shows "X / Y accepted" (X = acceptedCount, Y = maxCapacity)
   - Progress bar shows percentage filled (FR-010)
   - Waitlist count shown if waitlist has members (FR-011)

3. Navigate to event with NO maxCapacity (unlimited attendance)
4. **Expected**:
   - NO capacity indicator shown (FR-014)

**✓ Pass Criteria**: Capacity indicator shows for limited events, hidden for unlimited

---

### Step 11: Test Waitlist Functionality

1. Navigate to "Details" tab on event that is FULL with waitlist enabled
2. **Expected**:
   - "Join Waitlist" button visible (FR-012)

3. Click "Join Waitlist" button
4. **Expected**:
   - Button changes to "Leave Waitlist (Position #X)" (FR-013)
   - Position shows user's FIFO queue position

5. Click "Leave Waitlist" button
6. **Expected**:
   - Button changes back to "Join Waitlist"
   - User removed from waitlist

**✓ Pass Criteria**: Waitlist join/leave functions, position displayed correctly

---

### Step 12: Test Inline Error Handling

**Scenario A: Comment Submission Failure**

1. Disconnect network or simulate server error
2. Attempt to submit a comment
3. **Expected**:
   - Inline error message appears BELOW comment input field (FR-017a)
   - Message text: e.g., "Failed to submit comment. Please try again."
   - NO page refresh occurs

4. Reconnect network and click "Submit" again (retry)
5. **Expected**:
   - Comment submits successfully (FR-017b)
   - Error message clears

**Scenario B: Waitlist Join Failure**

1. Disconnect network or simulate server error
2. Attempt to join waitlist
3. **Expected**:
   - Inline error message appears BELOW waitlist button (FR-012a)
   - Message text: e.g., "Failed to join waitlist. Please try again."
   - NO page refresh occurs

4. Reconnect network and click "Join Waitlist" again (retry)
5. **Expected**:
   - Waitlist join succeeds (FR-012b)
   - Error message clears

**✓ Pass Criteria**: Inline errors show below failed actions, retry works without refresh

---

### Step 13: Test Recurring Event Scope Dialog

1. Navigate to "Details" tab on event with RRULE set (recurring event)
2. Click RSVP button or change RSVP status
3. **Expected**:
   - RecurrenceScopeDialog appears (FR-005)
   - Three options presented (FR-006):
     - "This event only"
     - "This and future events"
     - "All events"

4. Select "This event only" and confirm
5. **Expected**:
   - RSVP applies to current occurrence only (FR-008)
   - Scope dialog closes

6. Navigate to event WITHOUT RRULE (non-recurring)
7. Change RSVP status
8. **Expected**:
   - Scope dialog does NOT appear (FR-007)
   - RSVP updates directly

**✓ Pass Criteria**: Scope dialog shows for recurring events only, RSVP applies to selected scope

---

### Step 14: Verify Backward Compatibility

1. Navigate to event that has:
   - No comments
   - No history entries
   - No maxCapacity set
   - No RRULE (non-recurring)

2. Open EventDetailsDialog
3. **Expected** (FR-028, FR-029, FR-030):
   - Dialog opens normally
   - Details tab shows all existing event information
   - Comments tab shows "No comments yet" message
   - History tab shows "No changes recorded" message
   - No capacity indicator (unlimited attendance)
   - No waitlist button
   - No scope dialog on RSVP
   - **NO errors or broken functionality**

**✓ Pass Criteria**: Dialog functions normally for events without new features

---

## Success Criteria Summary

✅ All 14 validation steps pass
✅ Tab navigation smooth (<100ms switching time)
✅ Comment/history queries <200ms (check Network tab in DevTools)
✅ XSS sanitization prevents script execution
✅ Pagination loads correct number of items (20 comments, 25 history)
✅ Timestamp threshold works (48 hours)
✅ Inline errors display correctly
✅ Backward compatibility maintained
✅ No console errors during any operation
✅ No visual regressions in existing EventDetailsDialog

## Rollback Plan

If validation fails:

1. Identify failing step(s)
2. Check console for errors
3. Review GraphQL responses in Network tab
4. Verify database has required data (comments, history)
5. If critical failure: Revert EventDetailsDialog changes
6. Investigate and fix issues
7. Re-run quickstart validation

## Performance Validation

Use Chrome DevTools to verify:

1. **Tab Switching**: <100ms (Target: <50ms)
2. **Comment Query**: <200ms (Constitutional requirement)
3. **History Query**: <200ms (Constitutional requirement)
4. **Comment Submission**: <500ms (including sanitization)
5. **Waitlist Join**: <300ms

**Note**: Network conditions may vary; test on local development server for baseline.

---

**Validation Date**: _________
**Tester**: _________
**Result**: ☐ PASS ☐ FAIL (see notes below)

**Notes**:
_______________________________________________________________________
_______________________________________________________________________
_______________________________________________________________________
