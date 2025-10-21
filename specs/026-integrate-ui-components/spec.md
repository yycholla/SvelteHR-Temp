# Feature Specification: Integrate Events UI Components

**Feature Branch**: `026-integrate-ui-components`
**Created**: 2025-10-08
**Status**: Draft
**Input**: User description: "integrate UI components from previous specify run in order to complete implementation for Events."

## Execution Flow (main)

```
1. Parse user description from Input
   → Feature 025 created UI components that are not yet integrated into Events interface
2. Extract key concepts from description
   → Actors: Event organizers, event attendees, users viewing events
   → Actions: View recurring event details, manage RSVP with scope, join/leave waitlist, comment on events, view event history
   → Data: Event details dialog, capacity indicators, waitlist status, comments, audit trail
   → Constraints: Must integrate with existing EventDetailsDialog without breaking current functionality
3. For each unclear aspect:
   → All aspects clear - integration guide exists in EventDetailsDialog-025-updates.md
4. Fill User Scenarios & Testing section
   → Primary flow: User views event details and interacts with new features
5. Generate Functional Requirements
   → Each requirement is testable against component integration
6. Identify Key Entities
   → EventDetailsDialog, RecurrenceScopeDialog, EventCapacityIndicator, WaitlistButton, EventCommentThread, EventHistoryView
7. Run Review Checklist
   → No implementation details (UI component integration is specification-level)
8. Return: SUCCESS (spec ready for planning)
```

---

## ⚡ Quick Guidelines

- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- 👥 Written for business stakeholders, not developers

---

## Clarifications

### Session 2025-10-08

- Q: When displaying event comments in chronological order, what is the maximum number of comments that should be visible at once before requiring pagination or lazy loading? → A: Show 20 most recent, require "Load More" button for older comments
- Q: What should happen when a user attempts to add a comment or join a waitlist, but the operation fails due to network or server errors? → A: Show inline error message below the failed action, allow retry without page refresh
- Q: At what point should relative timestamps (e.g., "2 hours ago") transition to absolute timestamps (e.g., "Jan 15, 2025 3:30 PM") for comment display? → A: After 48 hours - comments older than 2 days show absolute timestamps
- Q: Should user-generated comment content be sanitized to prevent XSS (cross-site scripting) attacks and injection of malicious HTML/JavaScript? → A: Yes - strip all HTML tags and scripts, allow only plain text and @mentions
- Q: When viewing the event history audit trail with many changes, what is the maximum number of history entries that should be displayed at once before requiring pagination? → A: Show 25 most recent entries, require "Load More" for older entries

---

## User Scenarios & Testing

### Primary User Story

**As an employee**, I want to view comprehensive event details including recurring event options, capacity/waitlist status, comments from other attendees, and change history, **so that** I can make informed decisions about event participation and stay updated on event discussions and modifications.

**As an event organizer**, I want users to see when events are at capacity, allow them to join waitlists, and enable discussions via comments, **so that** event participation is transparent and collaborative.

**As any user**, I want to see what changes have been made to an event over time, **so that** I can understand how the event evolved and verify important details weren't changed without notice.

### Acceptance Scenarios

1. **Given** a user views a recurring event, **When** they attempt to RSVP or modify their response, **Then** they are prompted to select whether the change applies to this occurrence only, this and future occurrences, or all occurrences

2. **Given** an event has a maximum capacity set, **When** a user views the event details, **Then** they see a visual indicator showing how many spots are filled and how many remain

3. **Given** an event is at full capacity and has waitlist enabled, **When** a user views the event, **Then** they see an option to join the waitlist and their position if already on it

4. **Given** a user is viewing event details, **When** they navigate to the Comments tab, **Then** they see all comments with @mentions highlighted and can add their own comments with @mention support

5. **Given** an event has been modified over time, **When** a user views the History tab, **Then** they see a chronological audit trail showing what changed, when, and by whom

6. **Given** an event does NOT have recurring rules, **When** a user changes their RSVP, **Then** the scope selection dialog does NOT appear (direct RSVP update)

7. **Given** an event has no capacity limit, **When** a user views the event, **Then** no capacity indicator is shown (unlimited attendance)

8. **Given** a user is on a waitlist and a spot opens up, **When** they view the event details, **Then** they are automatically promoted and see their updated RSVP status

### Edge Cases

- What happens when a user tries to RSVP to a recurring event series that has mixed availability (some full, some not)?
  → Scope dialog allows them to choose which occurrences to RSVP to

- How does the system handle comments with invalid @mentions (non-existent users)?
  → Comments are saved but @mentions to invalid users are not highlighted or linked

- What happens when viewing event history for an event with hundreds of changes?
  → History view displays 25 most recent entries with "Load More" button for older entries; accordion collapse for individual entry detail

- How does capacity indicator handle events with declining RSVPs (accepted count decreases)?
  → Capacity indicator updates in real-time to show current accepted count vs max capacity

- What happens when two users try to join the waitlist simultaneously for the last waitlist spot?
  → FIFO ordering is handled server-side; both join but receive different positions

- What happens when a user attempts to add a comment or join a waitlist, but the operation fails due to network or server errors?
  → Inline error message appears below the failed action; user can retry without refreshing page

---

## Requirements

### Functional Requirements

#### Event Details Dialog Enhancement

- **FR-001**: System MUST display a tab-based interface in event details with tabs for: Details, Comments, and History
- **FR-002**: System MUST show the Details tab by default when event details dialog opens
- **FR-003**: Comments tab MUST display a badge showing the total number of comments when count is greater than zero
- **FR-004**: Users MUST be able to navigate between tabs without closing the dialog

#### Recurring Event RSVP Scope

- **FR-005**: System MUST display a scope selection dialog when users RSVP to recurring events (events with RRULE set)
- **FR-006**: Scope dialog MUST offer three options: "This event only", "This and future events", and "All events"
- **FR-007**: System MUST NOT show scope dialog for non-recurring events (direct RSVP update)
- **FR-008**: System MUST apply the user's RSVP choice to the selected scope of event occurrences

#### Event Capacity and Waitlist

- **FR-009**: System MUST display a capacity indicator showing accepted attendees vs maximum capacity when max capacity is set
- **FR-010**: Capacity indicator MUST include a visual progress bar showing percentage filled
- **FR-011**: System MUST show waitlist count when waitlist is enabled and has members
- **FR-012**: System MUST display a "Join Waitlist" button when event is at capacity and waitlist is enabled
- **FR-012a**: When joining waitlist fails due to network or server errors, system MUST display an inline error message below the waitlist button
- **FR-012b**: System MUST allow users to retry failed waitlist join operations without page refresh
- **FR-013**: System MUST display a "Leave Waitlist" button with position number when user is on waitlist
- **FR-014**: System MUST NOT show capacity indicator for events with no maximum capacity (unlimited attendance)

#### Event Comments

- **FR-015**: System MUST display the 20 most recent comments in chronological order on initial load
- **FR-015a**: System MUST provide a "Load More" button to display older comments when more than 20 comments exist
- **FR-016**: System MUST highlight @mentions in comments with visual distinction (e.g., colored text)
- **FR-017**: Users MUST be able to add new comments with support for @mentioning other users
- **FR-017a**: When comment submission fails due to network or server errors, system MUST display an inline error message below the comment input field
- **FR-017b**: System MUST allow users to retry failed comment submissions without page refresh
- **FR-017c**: System MUST sanitize comment content by stripping all HTML tags and JavaScript to prevent XSS attacks
- **FR-017d**: System MUST preserve plain text content and @mention formatting after sanitization
- **FR-018**: Users MUST be able to edit their own comments
- **FR-019**: Users MUST be able to delete their own comments
- **FR-020**: Users MUST NOT be able to edit or delete comments made by others
- **FR-021**: System MUST show relative timestamps (e.g., "2 hours ago") for comments posted within the last 48 hours
- **FR-022**: System MUST show absolute timestamps (e.g., "Jan 15, 2025 3:30 PM") for comments older than 48 hours

#### Event History Audit Trail

- **FR-023**: System MUST display the 25 most recent history entries in chronological order on initial load
- **FR-023a**: System MUST provide a "Load More" button to display older history entries when more than 25 entries exist
- **FR-024**: History entries MUST show: what changed, old value, new value, who made the change, and when
- **FR-025**: System MUST use an accordion-style interface to show history entries (collapsed by default)
- **FR-026**: System MUST use color coding to distinguish between different change types (created, updated, deleted)
- **FR-027**: History MUST be read-only (users cannot modify historical records)

#### Backward Compatibility

- **FR-028**: All new features MUST be optional additions that do not break existing event detail functionality
- **FR-029**: System MUST gracefully handle events that lack new feature data (no comments, no history, no capacity)
- **FR-030**: Existing EventDetailsDialog behavior MUST remain unchanged when new features are not applicable

### Key Entities

- **EventDetailsDialog**: Main dialog component that displays comprehensive event information, now enhanced with tabbed interface for Details, Comments, and History
- **RecurrenceScopeDialog**: Modal dialog that prompts users to select the scope of their RSVP change for recurring events (this event, this and future, or all events)
- **EventCapacityIndicator**: Visual component displaying event capacity metrics including accepted count, maximum capacity, progress bar, and waitlist information
- **WaitlistButton**: Interactive button allowing users to join or leave event waitlists, displaying current position when on waitlist
- **EventCommentThread**: Discussion thread component displaying all event comments with @mention support, edit/delete capabilities for own comments, and relative timestamps
- **EventHistoryView**: Audit trail component showing chronological history of event changes with field-level detail, color-coded change types, and accordion-style presentation

---

## Review & Acceptance Checklist

### Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

### Dependencies and Assumptions

**Dependencies:**
- Feature 025 (events-flesh-out) UI components must be available
- EventDetailsDialog-025-updates.md integration guide exists
- Event data includes new fields: rrule, maxCapacity, waitlistEnabled, waitlistCount

**Assumptions:**
- Server-side GraphQL resolvers for comments, history, and waitlist are deployed
- Database migrations for event_comments, event_history, and event_waitlist tables are applied
- User permissions for commenting and viewing history are already handled server-side

---

## Execution Status

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked (none found - integration guide provides clear direction)
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [x] Review checklist passed

---

## Success Metrics

**User Experience:**
- Users can successfully RSVP to recurring events with scope selection
- Event capacity and waitlist status is immediately visible in event details
- Users can engage in event discussions via comments
- Event change history provides transparency for all event modifications

**Functional Completeness:**
- All 6 UI components from feature 025 are integrated into EventDetailsDialog
- Tab-based navigation works smoothly between Details, Comments, and History
- Backward compatibility maintained for events without new features
- No existing event detail functionality is broken by integration

---
