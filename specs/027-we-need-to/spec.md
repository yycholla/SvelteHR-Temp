# Feature Specification: Events Calendar UI Integration

**Feature Branch**: `027-we-need-to`
**Created**: 2025-10-08
**Status**: Draft
**Input**: User description: "We need to create comprehensive UI for the events calendar system to connect with the backend we implemented in feature 025-events-flesh-out. CONTEXT: We have completed backend implementation including GraphQL resolvers for events, RSVP, waitlist, comments, history; Services for RRULE, image upload, conflict detection, notifications, iCal export; Database migrations for events extensions, waitlist, comments, history, notifications; Base UI components: RecurrenceScopeDialog, EventCapacityIndicator, WaitlistButton, EventCommentThread, EventHistoryView. REQUIRED UI FEATURES: 1. Enhanced EventDetailsDialog with tabbed interface (Details, Comments, History), integrated 025 components, capacity status, waitlist options, RSVP scope selector. 2. Enhanced EventCreateDialog with recurring event pattern builder, capacity limit toggle, waitlist toggle, event type selector, attendee picker, image upload. 3. Enhanced EventCalendar with recurring indicators, capacity status on cards, conflict warnings, event type colors, RSVP badges, drag-drop rescheduling. 4. Image Upload System with drag-drop, preview, cropping, 10MB validation. 5. Notification Preferences Page with toggles and reminder config. 6. Conflict Detection UI with visual indicators and warning dialogs. 7. iCal Export Features with download buttons. 8. Attendee Management with picker modal and status filtering. INTEGRATION: Use shadcn-svelte, Svelte 5 runes, GraphQL operations from events-operations.ts, mobile responsive, accessible."

## Execution Flow (main)

```
1. Parse user description from Input
   → Feature integrates UI with existing backend (025-events-flesh-out)
2. Extract key concepts from description
   → Actors: Event creators, Event attendees, All employees
   → Actions: View events, Create events, RSVP, Manage notifications, Export calendar
   → UI Components: Dialogs, Calendar view, Settings page, Upload interface
   → Constraints: Mobile responsive, accessible, use existing backend
3. Unclear aspects identified:
   → None - backend is fully implemented, UI features are well-defined
4. User scenarios filled below
5. Functional requirements generated (60+ UI-focused requirements)
6. Key UI components identified
7. Review checklist completed
8. Return: SUCCESS (spec ready for planning)
```

---

## ⚡ Quick Guidelines

- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- 👥 Written for business stakeholders, not developers

---

## User Scenarios & Testing

### Primary User Story

**As an employee**, I want intuitive visual interfaces to create and manage workplace events so that I can easily coordinate meetings, view event details, respond to invitations, and manage my calendar without confusion. I need clear visual feedback on event status, capacity, conflicts, and my RSVP commitments.

**As an event organizer**, I want comprehensive event creation and management tools so that I can configure recurring events, set capacity limits, upload event images, manage attendees, and track responses all through an easy-to-use interface.

**As a calendar user**, I want a clean, informative calendar view so that I can quickly see all my events, identify conflicts, understand capacity constraints, and manage my schedule effectively.

### Acceptance Scenarios

#### Enhanced Event Details View

1. **Given** I click on an event in the calendar, **When** the details dialog opens, **Then** I see a tabbed interface with Details, Comments, and History tabs
2. **Given** I am viewing event details, **When** the event has a capacity limit, **Then** I see a capacity indicator showing filled spots (e.g., "8/10 spots filled")
3. **Given** I am viewing a full event with waitlist enabled, **When** I am not attending, **Then** I see a "Join Waitlist" button
4. **Given** I am on the waitlist, **When** viewing the event, **Then** I see my waitlist position (e.g., "On waitlist (#3)")
5. **Given** I am viewing a recurring event, **When** I try to RSVP, **Then** I am prompted to apply my response to "This event only" or "All future events"
6. **Given** I switch to the Comments tab, **When** the tab loads, **Then** I see all event comments in chronological order
7. **Given** I switch to the History tab, **When** the tab loads, **Then** I see a timeline of all event changes with who made them and when
8. **Given** an event has an uploaded image, **When** I view the details, **Then** the image is prominently displayed

#### Event Creation Interface

9. **Given** I click "Create Event", **When** the creation dialog opens, **Then** I see fields for title, date/time, location, description, and visibility selector
10. **Given** I am creating an event, **When** I select visibility, **Then** I choose from Public (all employees), Department (specific departments), or Private (selected attendees only)
11. **Given** I select Private visibility, **When** the visibility changes, **Then** the "Add Attendees" button becomes visible
12. **Given** I am creating an event, **When** I toggle "Make this recurring", **Then** I see pattern options (daily, weekly, monthly, yearly)
13. **Given** I select "weekly" recurrence, **When** I configure the pattern, **Then** I can choose which days of the week
14. **Given** I am creating an event, **When** I toggle "Set capacity limit", **Then** I see a number input for maximum attendees
15. **Given** I set a capacity limit, **When** I check "Enable waitlist", **Then** the waitlist option is activated
16. **Given** I am creating an event, **When** I select event type, **Then** I choose from Meeting, Training, Social, Conference, or Other
17. **Given** I create a private event, **When** I click "Add Attendees", **Then** I see a searchable employee picker
18. **Given** I am creating an event, **When** I click "Upload Image", **Then** I can drag-drop or select an image file
19. **Given** I upload an image, **When** the file is larger than 10MB, **Then** I see an error "Image must be 10 MB or smaller"
20. **Given** I upload a valid image, **When** it loads, **Then** I see a preview with cropping controls

#### Calendar View Enhancements

21. **Given** I am viewing the calendar, **When** events are displayed, **Then** recurring events show a repeat icon
22. **Given** I am viewing the calendar, **When** events with capacity limits appear, **Then** they show capacity status (e.g., "8/10 spots")
23. **Given** I have overlapping events, **When** I view that time slot, **Then** conflicting events are highlighted with a warning icon
24. **Given** I am viewing the calendar, **When** events are color-coded, **Then** each event type has a distinct color
25. **Given** I have RSVPed to events, **When** viewing the calendar, **Then** each event shows my RSVP status badge (Accepted, Declined, Tentative, Pending)
26. **Given** I am the event creator, **When** I drag an event to a new time, **Then** the event is rescheduled immediately and attendees are notified
27. **Given** I am dragging an event, **When** I hover over an invalid drop target, **Then** the event element turns red to indicate invalid drop
28. **Given** I am dragging an event, **When** I hover over a valid drop target, **Then** the event element shows normal styling
29. **Given** I drag a recurring event to a new time, **When** I drop the event, **Then** I am prompted to reschedule "This event only" or "All future events"
30. **Given** I am not the event creator, **When** I try to drag an event, **Then** the event cannot be moved

#### Image Upload & Management

31. **Given** I am uploading an event image, **When** I drag an image file onto the upload area, **Then** the file is accepted and preview shows
32. **Given** I upload an image, **When** the preview loads, **Then** I see aspect ratio selector (16:9 horizontal or 9:16 vertical) and cropping handles
33. **Given** I select an aspect ratio, **When** I adjust the crop area, **Then** the aspect ratio is enforced (either 16:9 or 9:16)
34. **Given** I am cropping an image, **When** I switch between 16:9 and 9:16, **Then** the crop area updates to maintain the selected ratio
35. **Given** I have uploaded an image, **When** I click "Remove Image", **Then** the image is removed and I can upload a new one
36. **Given** I view an event with a 16:9 image, **When** the details load, **Then** the image is displayed in horizontal layout
37. **Given** I view an event with a 9:16 image, **When** the details load, **Then** the image is displayed in vertical/portrait layout

#### Notification Preferences

38. **Given** I navigate to notification settings, **When** the page loads, **Then** I see toggles for different notification types
39. **Given** I am in notification settings, **When** I toggle "Event Invitations", **Then** I can enable/disable invitation notifications
40. **Given** I am in notification settings, **When** I configure reminders, **Then** I can select multiple reminder times (15 min, 1 hour, 1 day before)
41. **Given** I am configuring reminders, **When** I select reminder scope, **Then** I can choose "All events", "Only accepted events", or "Custom selection"
42. **Given** I change notification preferences, **When** I click "Save Preferences", **Then** my settings are saved and applied immediately

#### Conflict Detection

43. **Given** I have overlapping events, **When** I view the calendar, **Then** both events show a visual conflict indicator
44. **Given** I try to RSVP to a conflicting event, **When** I click "Accept", **Then** I see a warning dialog listing all conflicts
45. **Given** I see a conflict warning, **When** the dialog shows, **Then** I see all conflicting event times clearly listed
46. **Given** I see a conflict warning, **When** I want to proceed anyway, **Then** I can click "RSVP Anyway" to confirm
47. **Given** I see a conflict warning, **When** I click "Cancel", **Then** my RSVP is not changed

#### iCal Export

48. **Given** I am viewing an event, **When** I click "Export to Calendar", **Then** a .ics file downloads for that single event
49. **Given** I am viewing the calendar, **When** I click "Export My Calendar", **Then** a .ics file downloads with all my events
50. **Given** I export to calendar, **When** the download prompt appears, **Then** I see compatibility notes (Google Calendar, Outlook, Apple Calendar)
51. **Given** I export an event, **When** I open the .ics file, **Then** it imports correctly into my external calendar app

#### Attendee Management

52. **Given** I am creating a private event, **When** I click "Add Attendees", **Then** a searchable employee picker modal opens
53. **Given** I am in the attendee picker, **When** I type an employee name, **Then** matching employees appear in the search results
54. **Given** I have selected attendees, **When** I view the attendee list, **Then** I see each attendee with their RSVP status badge
55. **Given** I am the event creator, **When** I view the attendee list, **Then** I see a "Remove" button next to each attendee
56. **Given** I am viewing attendees, **When** I filter by RSVP status, **Then** I see only attendees matching that status (Accepted, Declined, Tentative, Pending)
57. **Given** I am viewing attendees, **When** all attendees load, **Then** I see a summary count (e.g., "12 accepted, 3 declined, 2 pending")

### Edge Cases

#### Capacity and Waitlist Scenarios

- **What happens when** a user on the waitlist is auto-promoted when someone declines?
  - User receives a notification and their waitlist position disappears, showing "Pending" RSVP status instead

- **What happens when** an event reaches capacity while a user is viewing it?
  - The RSVP button changes to "Join Waitlist" and capacity indicator updates in real-time

- **What happens when** a user tries to upload an 11MB image?
  - Upload is rejected immediately with clear error message before any processing occurs

#### Recurring Event Scenarios

- **What happens when** a user edits one instance of a recurring event?
  - User is prompted "Edit this event only or entire series?" before changes are applied

- **What happens when** a user declines one instance but accepts others?
  - Calendar shows different RSVP badges for each instance, reflecting individual responses

- **What happens when** a user tries to create a recurring event with end date beyond 5 years?
  - System displays error message "Recurring events cannot extend beyond 5 years from start date" and prevents creation

#### Conflict Scenarios

- **What happens when** a user has 3 overlapping events?
  - All 3 events show conflict indicators, and warning dialog lists all conflicts when RSVPing

- **What happens when** a conflict warning is shown but user is offline?
  - System displays "No internet connection" message as offline functionality is not supported

#### Mobile and Accessibility

- **What happens when** a user accesses the calendar on a small mobile screen?
  - Calendar adapts to mobile view with simplified event cards and bottom sheet dialogs

- **What happens when** a keyboard-only user navigates the event creation dialog?
  - All controls are keyboard accessible with proper tab order and focus indicators

- **What happens when** a screen reader user views the calendar?
  - Events are announced with full context including title, time, RSVP status, and capacity

#### Performance and Data Loading

- **What happens when** a user loses internet connection while viewing the calendar?
  - System displays "No internet connection" message and disables interactive features until connection restored

- **What happens when** a user navigates to next month in the calendar?
  - System maintains 3-month buffer by prefetching the new adjacent month while keeping previously loaded months cached

- **What happens when** an event is updated by another user while viewing calendar?
  - Calendar updates in real-time to reflect the change with visual indicator of the update

## Requirements

### Functional Requirements - Event Details Dialog

- **FR-001**: System MUST display event details in a tabbed interface with Details, Comments, and History sections
- **FR-002**: System MUST show event capacity indicator when event has a maximum attendee limit
- **FR-003**: System MUST display "Join Waitlist" button when event is full and waitlist is enabled
- **FR-004**: System MUST show user's waitlist position when they are on the waitlist (e.g., "On waitlist (#3)")
- **FR-005**: System MUST prompt users for RSVP scope when responding to recurring events ("This event only" or "All future events")
- **FR-006**: System MUST display all event comments in chronological order in the Comments tab
- **FR-007**: System MUST display complete event change history in the History tab with timestamps and user attribution
- **FR-008**: System MUST prominently display event image when an image has been uploaded
- **FR-009**: System MUST show current attendee list with RSVP status badges in event details
- **FR-010**: System MUST display event type badge with appropriate color coding

### Functional Requirements - Event Creation Dialog

- **FR-011**: System MUST provide a toggle to enable recurring event creation
- **FR-012**: System MUST display recurrence pattern options (daily, weekly, monthly, yearly) when recurring is enabled
- **FR-013**: System MUST allow selection of specific weekdays for weekly recurrence patterns
- **FR-013a**: System MUST enforce maximum recurrence end date of 5 years from event start date
- **FR-014**: System MUST provide a toggle to set event capacity limits
- **FR-015**: System MUST display capacity input field when capacity limit is enabled
- **FR-016**: System MUST provide a toggle to enable waitlist when capacity limit is set
- **FR-017**: System MUST display event type selector with options: Meeting, Training, Social, Conference, Other
- **FR-017a**: System MUST provide visibility selector with options: Public (visible to all employees), Department (visible to specific departments), Private (visible only to selected attendees)
- **FR-017b**: System MUST show "Add Attendees" button when Private visibility is selected
- **FR-017c**: System MUST allow unlimited attendees for private events (no maximum cap)
- **FR-018**: System MUST provide "Add Attendees" button for private events that opens searchable employee picker
- **FR-019**: System MUST display image upload area with drag-and-drop support
- **FR-020**: System MUST reject image uploads exceeding 10MB with error message "Image must be 10 MB or smaller"
- **FR-021**: System MUST show image preview with cropping controls after successful upload
- **FR-022**: System MUST validate all required fields (title, date, time) before allowing event creation
- **FR-022a**: System MUST enforce reasonable character limits: event title (200 characters), event description (5000 characters)
- **FR-023**: System MUST display "Remove" button on uploaded image to allow replacement

### Functional Requirements - Calendar View

- **FR-024**: System MUST display a repeat icon on recurring events in calendar view
- **FR-025**: System MUST show capacity status on event cards (e.g., "8/10 spots")
- **FR-026**: System MUST highlight conflicting events with a visual warning icon
- **FR-027**: System MUST color-code events by type (Meeting, Training, Social, Conference, Other)
- **FR-028**: System MUST display user's RSVP status badge on each event (Accepted, Declined, Tentative, Pending)
- **FR-029**: System MUST enable drag-and-drop rescheduling for events created by the current user
- **FR-029a**: System MUST save event reschedule immediately when dropped on valid time slot
- **FR-029b**: System MUST turn event element red when dragged over invalid drop target
- **FR-029c**: System MUST display event element with normal styling when dragged over valid drop target
- **FR-029d**: System MUST prompt for scope ("This event only" or "All future events") when rescheduling recurring event
- **FR-030**: System MUST prevent drag-and-drop rescheduling for events not created by the current user
- **FR-031**: System MUST update calendar view with real-time changes to events
- **FR-031a**: System MUST load events for current month plus one month before and one month after (3-month buffer)
- **FR-031b**: System MUST maintain 3-month buffer when user navigates between months
- **FR-032**: System MUST display "Export My Calendar" button in calendar header
- **FR-033**: System MUST show event capacity as "Full" badge when maximum attendees reached

### Functional Requirements - Image Upload System

- **FR-034**: System MUST accept image uploads via drag-and-drop or file selection
- **FR-035**: System MUST display image preview immediately after upload
- **FR-036**: System MUST provide aspect ratio selector with options: 16:9 (horizontal) or 9:16 (vertical)
- **FR-036a**: System MUST provide cropping interface that enforces the selected aspect ratio (16:9 or 9:16)
- **FR-036b**: System MUST update crop area when user switches between 16:9 and 9:16 aspect ratios
- **FR-037**: System MUST validate image file size before upload (max 10MB)
- **FR-038**: System MUST support common image formats (JPEG, PNG, GIF, WebP)
- **FR-039**: System MUST show upload progress indicator during image processing
- **FR-040**: System MUST allow users to remove uploaded images and select new ones
- **FR-041**: System MUST display cropped image preview before finalizing upload
- **FR-041a**: System MUST display event images in horizontal layout for 16:9 aspect ratio
- **FR-041b**: System MUST display event images in vertical/portrait layout for 9:16 aspect ratio

### Functional Requirements - Notification Preferences Page

- **FR-042**: System MUST provide a settings page for notification preferences
- **FR-043**: System MUST display toggle switches for: Event Invitations, Event Changes, Event Cancellations, Comment Mentions
- **FR-044**: System MUST allow users to configure multiple reminder times (15 minutes, 1 hour, 1 day before events)
- **FR-045**: System MUST provide reminder scope options: "All events", "Only accepted events", "Custom selection"
- **FR-046**: System MUST save notification preferences immediately when "Save Preferences" is clicked
- **FR-047**: System MUST display current preference values when settings page loads
- **FR-048**: System MUST show confirmation message after preferences are successfully saved

### Functional Requirements - Conflict Detection UI

- **FR-049**: System MUST display visual conflict indicators on overlapping events in calendar view
- **FR-050**: System MUST show conflict warning dialog when user attempts to RSVP to an overlapping event
- **FR-051**: System MUST list all conflicting events with times in the conflict warning dialog
- **FR-052**: System MUST provide "RSVP Anyway" option in conflict warning to allow user to proceed
- **FR-053**: System MUST provide "Cancel" option in conflict warning to abort RSVP
- **FR-054**: System MUST highlight conflict severity (minor overlap vs complete overlap)

### Functional Requirements - iCal Export

- **FR-055**: System MUST provide "Export to Calendar" button in event details dialog
- **FR-056**: System MUST provide "Export My Calendar" button in calendar header
- **FR-057**: System MUST generate and download .ics file for single event export
- **FR-058**: System MUST generate and download .ics file for full calendar export
- **FR-059**: System MUST display compatibility information (Google Calendar, Outlook, Apple Calendar) in export UI
- **FR-060**: System MUST name downloaded files descriptively (e.g., "event-title.ics" or "my-calendar.ics")

### Functional Requirements - Attendee Management

- **FR-061**: System MUST display searchable employee picker modal when "Add Attendees" is clicked
- **FR-062**: System MUST filter employee list in real-time as user types in search box
- **FR-063**: System MUST show selected attendees with RSVP status badges
- **FR-064**: System MUST display "Remove" button next to each attendee (for event creators only)
- **FR-065**: System MUST allow filtering attendees by RSVP status (Accepted, Declined, Tentative, Pending)
- **FR-066**: System MUST display attendee count summary (e.g., "12 accepted, 3 declined, 2 pending")
- **FR-067**: System MUST update attendee list in real-time when attendees RSVP or are added/removed

### Functional Requirements - Mobile Responsiveness

- **FR-068**: System MUST adapt calendar view to mobile screen sizes with simplified event cards
- **FR-069**: System MUST use bottom sheet dialogs for event details on mobile devices
- **FR-070**: System MUST provide touch-friendly controls on all interactive elements
- **FR-071**: System MUST optimize image uploads for mobile bandwidth constraints
- **FR-072**: System MUST use responsive typography and spacing throughout all views

### Functional Requirements - Accessibility

- **FR-073**: System MUST provide keyboard navigation for all interactive elements
- **FR-074**: System MUST include proper ARIA labels on all buttons and controls
- **FR-075**: System MUST announce calendar events with full context to screen readers
- **FR-076**: System MUST provide visible focus indicators on all focusable elements
- **FR-077**: System MUST support high contrast mode for visually impaired users
- **FR-078**: System MUST provide descriptive alt text for event images

### Functional Requirements - Loading States & Error Handling

- **FR-079**: System MUST display loading spinners during data fetches
- **FR-080**: System MUST show skeleton loaders for calendar events while loading
- **FR-081**: System MUST display clear error messages when operations fail
- **FR-082**: System MUST provide retry options when network errors occur
- **FR-083**: System MUST show optimistic UI updates with rollback on failure

### Functional Requirements - Performance & Data Management

- **FR-084**: System MUST require active internet connection for all features (no offline support)
- **FR-085**: System MUST display clear "No internet connection" message when offline
- **FR-086**: System MUST load calendar data for 3-month window (current month ± 1 month)
- **FR-087**: System MUST prefetch adjacent month data when user navigates calendar

### Key UI Components

- **EventDetailsDialog**: Enhanced dialog with tabbed interface (Details, Comments, History), integrates RecurrenceScopeDialog, EventCapacityIndicator, WaitlistButton, EventCommentThread, and EventHistoryView components

- **EventCreateDialog**: Enhanced creation form with recurring pattern builder, capacity controls, event type selector, attendee picker, and image upload interface

- **EventCalendar**: Enhanced calendar view displaying recurring indicators, capacity status, conflict warnings, event type colors, RSVP badges, and drag-drop rescheduling

- **ImageUploadWidget**: Drag-and-drop image upload component with preview, cropping interface, and 10MB validation

- **NotificationPreferencesPage**: Settings page for managing notification toggles and reminder configurations

- **ConflictWarningDialog**: Modal dialog showing overlapping events with option to proceed or cancel RSVP

- **AttendeePickerModal**: Searchable employee picker with multi-select for private event attendee management

- **AttendeeListView**: Display component showing attendees with RSVP status badges and filtering options

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
- [x] Dependencies and assumptions identified (backend from 025-events-flesh-out is complete)

---

## Execution Status

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities resolved via clarification workflow (5 questions answered)
- [x] User scenarios defined (57 scenarios + edge cases)
- [x] Requirements generated (91 functional requirements)
- [x] UI components identified (8 key components)
- [x] Review checklist passed

---

## Next Steps

After specification approval:
1. Run `/plan` to create detailed implementation plan
2. Run `/tasks` to generate task breakdown
3. Begin UI implementation connecting to existing 025 backend
