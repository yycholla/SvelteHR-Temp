# Data Model: Events Calendar UI Integration

**Feature**: 027-we-need-to | **Date**: 2025-10-08

## UI State Models

These models represent client-side state for UI components. Backend database models already exist from feature 025-events-flesh-out.

### 1. CalendarViewState

**Purpose**: Manages calendar display state, event loading, and navigation

```typescript
interface CalendarViewState {
  // Current view configuration
  currentView: 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay';
  currentDate: Date;

  // 3-month buffer window
  bufferStart: Date;  // currentMonth - 1
  bufferEnd: Date;    // currentMonth + 2

  // Loaded events in buffer
  events: CalendarEvent[];

  // UI state
  isLoading: boolean;
  selectedEventId: string | null;
  draggedEventId: string | null;
  isDraggingValid: boolean;

  // Filters
  filterByType: EventType[] | null;
  filterByRsvpStatus: RsvpStatus[] | null;
  showConflictsOnly: boolean;
}

interface CalendarEvent {
  id: string;
  title: string;
  startDate: Date;
  endDate: Date;
  allDay: boolean;

  // Type and visibility
  type: EventType;
  visibility: EventVisibility;

  // Recurrence
  isRecurring: boolean;
  rrule: string | null;
  parentEventId: string | null;

  // Capacity and RSVP
  capacity: number | null;
  attendeeCount: number;
  waitlistCount: number;
  userRsvpStatus: RsvpStatus | null;
  userWaitlistPosition: number | null;

  // Image
  imageUrl: string | null;
  imageAspectRatio: '16:9' | '9:16' | null;

  // Permissions
  createdBy: string;
  canEdit: boolean;
  canDelete: boolean;

  // Conflict detection
  hasConflict: boolean;
  conflictingEventIds: string[];
}

type EventType = 'meeting' | 'training' | 'social' | 'conference' | 'other';
type EventVisibility = 'public' | 'department' | 'private';
type RsvpStatus = 'accepted' | 'declined' | 'tentative' | 'pending';
```

**Validation Rules**:
- `bufferEnd - bufferStart` must equal 3 months
- `events` must only contain events within buffer window
- `selectedEventId` must exist in `events` array if not null
- `draggedEventId` can only be set if event `canEdit === true`

**State Transitions**:
```
Initial → Loading (fetch 3-month buffer)
Loading → Loaded (events populated)
Loaded → Navigating (user clicks prev/next month)
Navigating → Loading (adjust buffer, fetch new month)
Loaded → Dragging (user drags event)
Dragging → Loaded (drop or cancel)
```

### 2. EventCreateFormState

**Purpose**: Manages event creation dialog form state

```typescript
interface EventCreateFormState {
  // Basic fields
  title: string;
  description: string;
  location: string;
  startDate: Date;
  endDate: Date;
  allDay: boolean;

  // Type and visibility
  type: EventType;
  visibility: EventVisibility;
  selectedDepartments: string[];  // if visibility === 'department'
  selectedAttendees: string[];    // if visibility === 'private'

  // Recurrence
  isRecurring: boolean;
  recurrencePattern: RecurrencePattern | null;

  // Capacity
  hasCapacityLimit: boolean;
  capacity: number | null;
  waitlistEnabled: boolean;

  // Image
  uploadedImage: File | null;
  imageCropData: CropData | null;
  imageAspectRatio: '16:9' | '9:16';
  imagePreviewUrl: string | null;

  // Form state
  errors: Record<string, string>;
  isDirty: boolean;
  isSubmitting: boolean;
}

interface RecurrencePattern {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;  // e.g., "every 2 weeks" = 2
  daysOfWeek: number[] | null;  // 0-6 for weekly
  endDate: Date;  // max 5 years from startDate
  rruleString: string;  // RFC 5545 format
}

interface CropData {
  x: number;
  y: number;
  width: number;
  height: number;
  rotate: number;
  scaleX: number;
  scaleY: number;
}
```

**Validation Rules**:
- `title`: 1-200 characters, required
- `description`: 0-5000 characters
- `endDate` must be after `startDate`
- `recurrencePattern.endDate` must be ≤ 5 years from `startDate`
- `capacity` must be > 0 if `hasCapacityLimit === true`
- `selectedAttendees` required if `visibility === 'private'`
- `uploadedImage` must be ≤ 10MB, formats: JPEG, PNG, GIF, WebP
- `imageCropData` required if `uploadedImage` present

**State Transitions**:
```
Initial → Editing (user types)
Editing → Validating (on blur or submit)
Validating → Editing (if errors) | Submitting (if valid)
Submitting → Success | Error
```

### 3. EventDetailsState

**Purpose**: Manages event details dialog with tabs

```typescript
interface EventDetailsState {
  eventId: string;
  activeTab: 'details' | 'comments' | 'history';

  // Event data (from backend)
  event: CalendarEvent;
  attendees: Attendee[];
  comments: Comment[];
  history: HistoryEntry[];

  // Loading states per tab
  isLoadingComments: boolean;
  isLoadingHistory: boolean;

  // RSVP state
  isRsvping: boolean;
  showRsvpScopeDialog: boolean;  // for recurring events
  selectedRsvpScope: 'single' | 'future' | null;

  // Waitlist state
  isJoiningWaitlist: boolean;

  // Comment state
  newCommentText: string;
  isPostingComment: boolean;
}

interface Attendee {
  userId: string;
  fullName: string;
  avatarUrl: string | null;
  rsvpStatus: RsvpStatus;
  rsvpDate: Date;
  isCreator: boolean;
}

interface Comment {
  id: string;
  userId: string;
  userName: string;
  userAvatarUrl: string | null;
  text: string;
  createdAt: Date;
  mentions: string[];  // user IDs mentioned with @
}

interface HistoryEntry {
  id: string;
  userId: string;
  userName: string;
  action: HistoryAction;
  changes: Record<string, { old: any; new: any }>;
  timestamp: Date;
}

type HistoryAction =
  | 'created'
  | 'updated'
  | 'rescheduled'
  | 'capacity_changed'
  | 'attendee_added'
  | 'attendee_removed'
  | 'cancelled';
```

**Validation Rules**:
- `activeTab` determines which data is loaded
- `showRsvpScopeDialog` only true if `event.isRecurring === true`
- `newCommentText` max 1000 characters

**State Transitions**:
```
Initial → LoadingDetails
LoadingDetails → DetailsLoaded
DetailsLoaded → SwitchingTab (user clicks tab)
SwitchingTab → LoadingComments | LoadingHistory | DetailsLoaded
DetailsLoaded → RsvpPrompt (user clicks RSVP)
RsvpPrompt → RsvpScopeDialog (if recurring) | Rsvping (if not)
Rsvping → DetailsLoaded (refresh event data)
```

### 4. NotificationPreferencesState

**Purpose**: Manages user notification settings

```typescript
interface NotificationPreferencesState {
  // Notification type toggles
  eventInvitations: boolean;
  eventChanges: boolean;
  eventCancellations: boolean;
  commentMentions: boolean;

  // Reminder configuration
  reminderTimes: ReminderTime[];
  reminderScope: ReminderScope;
  customEventIds: string[];  // if reminderScope === 'custom'

  // Form state
  isDirty: boolean;
  isSaving: boolean;
  lastSaved: Date | null;
}

type ReminderTime = '15min' | '1hour' | '1day';
type ReminderScope = 'all' | 'accepted' | 'custom';
```

**Validation Rules**:
- `reminderTimes` can have 0-3 values
- `customEventIds` required if `reminderScope === 'custom'`

**State Transitions**:
```
Initial → Loading (fetch from backend)
Loading → Loaded
Loaded → Editing (user changes setting)
Editing → Saving (user clicks save)
Saving → Loaded (update lastSaved)
```

### 5. ConflictDetectionState

**Purpose**: Manages conflict warning dialog

```typescript
interface ConflictDetectionState {
  isOpen: boolean;
  targetEvent: CalendarEvent;  // Event user is trying to RSVP to
  conflictingEvents: ConflictingEvent[];
  userAction: 'rsvp' | 'create' | null;
}

interface ConflictingEvent {
  id: string;
  title: string;
  startDate: Date;
  endDate: Date;
  overlapDuration: number;  // minutes of overlap
  overlapPercentage: number;  // 0-100%
  severity: 'minor' | 'major';  // <30% = minor, ≥30% = major
}
```

**Validation Rules**:
- `conflictingEvents` only includes events where user RSVP status is 'accepted'
- `overlapDuration` calculated as `min(event1.end, event2.end) - max(event1.start, event2.start)`
- `severity` = 'major' if `overlapPercentage ≥ 30%`, else 'minor'

### 6. ImageUploadState

**Purpose**: Manages image upload widget

```typescript
interface ImageUploadState {
  // Upload state
  file: File | null;
  isUploading: boolean;
  uploadProgress: number;  // 0-100
  uploadError: string | null;

  // Preview and crop
  previewUrl: string | null;
  cropData: CropData | null;
  aspectRatio: '16:9' | '9:16';
  isCropping: boolean;

  // Processed result
  processedImageUrl: string | null;
  processedImageId: string | null;
}
```

**Validation Rules**:
- `file` must be ≤ 10MB
- `file` must be image/jpeg, image/png, image/gif, or image/webp
- `cropData` required before upload can complete

**State Transitions**:
```
Initial → FileSelected (user drops/selects file)
FileSelected → Validating (check size and format)
Validating → Error (if invalid) | Previewing (if valid)
Previewing → Cropping (user adjusts crop)
Cropping → ReadyToUpload
ReadyToUpload → Uploading (user confirms)
Uploading → Uploaded | Error
```

## Component Prop Interfaces

### EventDetailsDialog Props

```typescript
interface EventDetailsDialogProps {
  eventId: string;
  open: boolean;
  onClose: () => void;
}
```

### EventCreateDialog Props

```typescript
interface EventCreateDialogProps {
  open: boolean;
  initialDate?: Date;
  onClose: () => void;
  onEventCreated: (eventId: string) => void;
}
```

### EventCalendar Props

```typescript
interface EventCalendarProps {
  initialDate?: Date;
  onEventClick: (eventId: string) => void;
  onDateSelect: (date: Date) => void;
}
```

### ImageUploadWidget Props

```typescript
interface ImageUploadWidgetProps {
  onImageUploaded: (imageId: string, imageUrl: string, aspectRatio: '16:9' | '9:16') => void;
  onError: (error: string) => void;
  initialAspectRatio?: '16:9' | '9:16';
}
```

### ConflictWarningDialog Props

```typescript
interface ConflictWarningDialogProps {
  open: boolean;
  targetEvent: CalendarEvent;
  conflictingEvents: ConflictingEvent[];
  action: 'rsvp' | 'create';
  onConfirm: () => void;
  onCancel: () => void;
}
```

### AttendeePickerModal Props

```typescript
interface AttendeePickerModalProps {
  open: boolean;
  selectedUserIds: string[];
  onSelectionChange: (userIds: string[]) => void;
  onClose: () => void;
}
```

### AttendeeListView Props

```typescript
interface AttendeeListViewProps {
  eventId: string;
  attendees: Attendee[];
  canRemoveAttendees: boolean;
  onRemoveAttendee?: (userId: string) => void;
}
```

## GraphQL Operation Types

These types are generated from `src/lib/graphql/events-operations.ts` (existing).

### Queries

```typescript
// Load events for calendar buffer
query GetEventsForCalendar($startDate: DateTime!, $endDate: DateTime!, $userId: UUID!) {
  events(
    filter: {
      startDate: { greaterThanOrEqualTo: $startDate }
      endDate: { lessThanOrEqualTo: $endDate }
      or: [
        { visibility: { equalTo: "public" } }
        { createdBy: { equalTo: $userId } }
        { attendees: { some: { userId: { equalTo: $userId } } } }
      ]
    }
  ) {
    nodes {
      id
      title
      description
      location
      startDate
      endDate
      allDay
      type
      visibility
      rrule
      parentEventId
      capacity
      waitlistEnabled
      imageUrl
      imageAspectRatio
      createdBy
      attendeeCount
      waitlistCount
      userRsvp(userId: $userId) {
        status
        scope
      }
      userWaitlistPosition(userId: $userId)
      conflicts(userId: $userId) {
        conflictingEventId
        overlapDuration
      }
    }
  }
}

// Get event details with attendees
query GetEventDetails($eventId: UUID!, $userId: UUID!) {
  event(id: $eventId) {
    # ... all fields from above ...
    attendees {
      userId
      fullName
      avatarUrl
      rsvpStatus
      rsvpDate
    }
  }
}

// Get event comments
query GetEventComments($eventId: UUID!) {
  eventComments(filter: { eventId: { equalTo: $eventId } }, orderBy: CREATED_AT_ASC) {
    nodes {
      id
      userId
      userName
      userAvatarUrl
      text
      mentions
      createdAt
    }
  }
}

// Get event history
query GetEventHistory($eventId: UUID!) {
  eventHistory(filter: { eventId: { equalTo: $eventId } }, orderBy: TIMESTAMP_DESC) {
    nodes {
      id
      userId
      userName
      action
      changes
      timestamp
    }
  }
}

// Get notification preferences
query GetNotificationPreferences($userId: UUID!) {
  userNotificationPreferences(userId: $userId) {
    eventInvitations
    eventChanges
    eventCancellations
    commentMentions
    reminderTimes
    reminderScope
    customEventIds
  }
}
```

### Mutations

```typescript
// Create event
mutation CreateEvent($input: CreateEventInput!) {
  createEvent(input: $input) {
    event {
      id
      # ... all fields ...
    }
  }
}

// Update event
mutation UpdateEvent($eventId: UUID!, $patch: EventPatch!) {
  updateEvent(input: { id: $eventId, patch: $patch }) {
    event {
      id
      # ... all fields ...
    }
  }
}

// RSVP to event
mutation RsvpToEvent($eventId: UUID!, $userId: UUID!, $status: RsvpStatus!, $scope: RsvpScope!) {
  rsvpToEvent(input: { eventId: $eventId, userId: $userId, status: $status, scope: $scope }) {
    eventRsvp {
      eventId
      userId
      status
      scope
    }
  }
}

// Join waitlist
mutation JoinWaitlist($eventId: UUID!, $userId: UUID!) {
  joinWaitlist(input: { eventId: $eventId, userId: $userId }) {
    waitlistEntry {
      eventId
      userId
      position
    }
  }
}

// Post comment
mutation PostEventComment($eventId: UUID!, $userId: UUID!, $text: String!, $mentions: [UUID!]) {
  postEventComment(input: { eventId: $eventId, userId: $userId, text: $text, mentions: $mentions }) {
    comment {
      id
      # ... all fields ...
    }
  }
}

// Update notification preferences
mutation UpdateNotificationPreferences($userId: UUID!, $prefs: NotificationPreferencesInput!) {
  updateNotificationPreferences(input: { userId: $userId, prefs: $prefs }) {
    preferences {
      # ... all fields ...
    }
  }
}

// Upload and process image
mutation UploadEventImage($file: Upload!, $cropData: CropDataInput!, $aspectRatio: AspectRatio!) {
  uploadEventImage(input: { file: $file, cropData: $cropData, aspectRatio: $aspectRatio }) {
    image {
      id
      url
      aspectRatio
    }
  }
}

// Reschedule event (drag-drop)
mutation RescheduleEvent($eventId: UUID!, $newStartDate: DateTime!, $scope: RsvpScope!) {
  rescheduleEvent(input: { eventId: $eventId, newStartDate: $newStartDate, scope: $scope }) {
    event {
      id
      startDate
      endDate
    }
  }
}
```

### Subscriptions

```typescript
// Subscribe to event updates for real-time calendar
subscription OnEventUpdate($userId: UUID!) {
  eventUpdated(userId: $userId) {
    mutation  # 'created' | 'updated' | 'deleted'
    event {
      id
      # ... all fields ...
    }
  }
}

// Subscribe to waitlist promotion
subscription OnWaitlistPromotion($userId: UUID!) {
  waitlistPromoted(userId: $userId) {
    eventId
    eventTitle
    newStatus  # 'pending'
  }
}
```

## Zod Validation Schemas

```typescript
import { z } from 'zod';

export const eventCreateSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  location: z.string().optional(),
  startDate: z.date(),
  endDate: z.date(),
  allDay: z.boolean(),
  type: z.enum(['meeting', 'training', 'social', 'conference', 'other']),
  visibility: z.enum(['public', 'department', 'private']),
  selectedDepartments: z.array(z.string()).optional(),
  selectedAttendees: z.array(z.string()).optional(),
  isRecurring: z.boolean(),
  recurrencePattern: z.object({
    frequency: z.enum(['daily', 'weekly', 'monthly', 'yearly']),
    interval: z.number().min(1),
    daysOfWeek: z.array(z.number().min(0).max(6)).optional(),
    endDate: z.date()
  }).optional(),
  hasCapacityLimit: z.boolean(),
  capacity: z.number().min(1).optional(),
  waitlistEnabled: z.boolean(),
  uploadedImageId: z.string().optional()
}).refine(
  (data) => data.endDate > data.startDate,
  { message: "End date must be after start date", path: ["endDate"] }
).refine(
  (data) => !data.isRecurring || (data.recurrencePattern &&
    differenceInYears(data.recurrencePattern.endDate, data.startDate) <= 5),
  { message: "Recurring events cannot extend beyond 5 years", path: ["recurrencePattern", "endDate"] }
).refine(
  (data) => data.visibility !== 'private' || (data.selectedAttendees && data.selectedAttendees.length > 0),
  { message: "Private events require at least one attendee", path: ["selectedAttendees"] }
);

export const notificationPrefsSchema = z.object({
  eventInvitations: z.boolean(),
  eventChanges: z.boolean(),
  eventCancellations: z.boolean(),
  commentMentions: z.boolean(),
  reminderTimes: z.array(z.enum(['15min', '1hour', '1day'])).max(3),
  reminderScope: z.enum(['all', 'accepted', 'custom']),
  customEventIds: z.array(z.string()).optional()
}).refine(
  (data) => data.reminderScope !== 'custom' || (data.customEventIds && data.customEventIds.length > 0),
  { message: "Custom reminder scope requires at least one event selected", path: ["customEventIds"] }
);

export const imageUploadSchema = z.object({
  file: z.instanceof(File)
    .refine((file) => file.size <= 10 * 1024 * 1024, "Image must be 10 MB or smaller")
    .refine(
      (file) => ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type),
      "Image must be JPEG, PNG, GIF, or WebP"
    ),
  cropData: z.object({
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number(),
    rotate: z.number(),
    scaleX: z.number(),
    scaleY: z.number()
  }),
  aspectRatio: z.enum(['16:9', '9:16'])
});
```

## Relationships Between Models

```
CalendarViewState
  └── contains CalendarEvent[]
      └── referenced by EventDetailsState.event
          ├── has Attendee[]
          ├── has Comment[]
          └── has HistoryEntry[]

EventCreateFormState
  └── uses ImageUploadState for image
  └── produces CalendarEvent (via mutation)

NotificationPreferencesState
  └── persists to backend user_notification_preferences table

ConflictDetectionState
  └── analyzes CalendarEvent overlaps
  └── triggers before RSVP or event creation
```

## Performance Considerations

1. **Calendar Events**: Load max 3 months (buffer) to keep dataset manageable
2. **Attendee List**: Paginate if >100 attendees
3. **Comment Thread**: Virtual scrolling for >50 comments
4. **Image Upload**: Client-side compression before server upload
5. **Real-Time Updates**: Batch subscription updates every 500ms to avoid UI thrashing

## Next Steps

Phase 1 will continue with:
- `/contracts/` directory with TypeScript contract files
- `quickstart.md` with user flow testing steps
- Update `CLAUDE.md` with new patterns and component usage
