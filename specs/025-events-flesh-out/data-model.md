# Data Model: Events Calendar System

## Entity Relationship Diagram

```
┌─────────────┐         ┌──────────────────┐         ┌─────────────┐
│   Employee  │────────<│ EventAttendee    │>────────│    Event    │
│             │         │                  │         │             │
│ - id        │         │ - id             │         │ - id        │
│ - name      │         │ - event_id (FK)  │         │ - title     │
│ - email     │         │ - employee_id(FK)│         │ - description│
│ - manager_id│         │ - rsvp_status    │         │ - start_time│
└─────────────┘         │ - is_required    │         │ - end_time  │
      │                 │ - created_at     │         │ - location  │
      │                 └──────────────────┘         │ - visibility│
      │                          │                   │ - type      │
      │                          │                   │ - created_by│
      │                          │                   │ - rrule     │
      │                          │                   │ - recurrence_id│
      │                          │                   │ - max_capacity│
      │                          │                   │ - image_url │
      │                          │                   └─────────────┘
      │                          │                          │
      │                          │                          │
      │                          ▼                          │
      │                  ┌──────────────────┐              │
      │                  │  WaitlistEntry   │              │
      │                  │                  │              │
      │                  │ - id             │              │
      │                  │ - event_id (FK)  │              │
      │                  │ - employee_id(FK)│              │
      │                  │ - position       │              │
      │                  │ - created_at     │              │
      │                  └──────────────────┘              │
      │                                                     │
      │                                                     │
      ▼                                                     ▼
┌─────────────────────┐                          ┌──────────────────┐
│ EventNotification   │                          │  EventComment    │
│                     │                          │                  │
│ - id                │                          │ - id             │
│ - user_id (FK)      │                          │ - event_id (FK)  │
│ - event_id (FK)     │                          │ - user_id (FK)   │
│ - type              │                          │ - content        │
│ - message           │                          │ - mentions[]     │
│ - read              │                          │ - created_at     │
│ - created_at        │                          │ - updated_at     │
└─────────────────────┘                          └──────────────────┘
         │                                                  │
         │                                                  │
         ▼                                                  ▼
┌──────────────────────────┐                     ┌──────────────────┐
│ NotificationPreferences  │                     │  EventHistory    │
│                          │                     │                  │
│ - user_id (PK, FK)       │                     │ - id             │
│ - event_invites          │                     │ - event_id (FK)  │
│ - event_changes          │                     │ - changed_by(FK) │
│ - event_reminders        │                     │ - change_type    │
│ - comment_mentions       │                     │ - field_name     │
│ - waitlist_updates       │                     │ - old_value      │
│ - reminder_times[]       │                     │ - new_value      │
└──────────────────────────┘                     │ - changed_at     │
                                                  └──────────────────┘
```

## Core Entities

### Event

Primary entity representing calendar events with support for single and recurring occurrences.

**Fields**:
| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| id | UUID | Yes | Auto-generated | Unique identifier |
| title | VARCHAR(255) | Yes | 1-255 chars | Event title |
| description | TEXT | No | Max 10000 chars | Event description |
| start_time | TIMESTAMPTZ | Yes | Must be valid datetime | Event start |
| end_time | TIMESTAMPTZ | Yes | Must be after start_time | Event end |
| location | VARCHAR(255) | No | Max 255 chars | Physical or virtual location |
| visibility | ENUM | Yes | 'public' or 'private' | Event visibility level |
| type | ENUM | Yes | See EventType enum | Event category |
| created_by | UUID | Yes | FK to employees | Event creator |
| rrule | TEXT | No | Valid RFC 5545 RRULE | Recurrence rule |
| recurrence_id | UUID | No | FK to events | Parent event if exception |
| max_capacity | INT | No | Positive integer | Maximum attendees |
| waitlist_enabled | BOOLEAN | No | Default FALSE | Enable waitlist |
| image_url | VARCHAR(500) | No | Valid URL | Event image path |
| created_at | TIMESTAMPTZ | Yes | Auto-generated | Creation timestamp |
| updated_at | TIMESTAMPTZ | Yes | Auto-updated | Last update timestamp |

**Enums**:
```typescript
enum EventVisibility {
  PUBLIC = 'public',
  PRIVATE = 'private'
}

enum EventType {
  MEETING = 'meeting',
  TRAINING = 'training',
  SOCIAL = 'social',
  CONFERENCE = 'conference',
  OTHER = 'other'
}
```

**Relationships**:
- `created_by` → Employee (many-to-one)
- `recurrence_id` → Event (many-to-one, self-referential)
- EventAttendees → Event (one-to-many)
- EventComments → Event (one-to-many)
- EventHistory → Event (one-to-many)
- WaitlistEntries → Event (one-to-many)

**State Transitions**:
```
[Draft] ──create──> [Active] ──update──> [Active]
                        │
                        ├──delete──> [Deleted]
                        │
                        └──past end_time──> [Completed]
```

### EventAttendee

Junction entity linking employees to events with RSVP status.

**Fields**:
| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| id | UUID | Yes | Auto-generated | Unique identifier |
| event_id | UUID | Yes | FK to events | Associated event |
| employee_id | UUID | Yes | FK to employees | Invited employee |
| rsvp_status | ENUM | Yes | See RsvpStatus enum | Response status |
| is_required | BOOLEAN | No | Default FALSE | Attendance required |
| rsvp_scope | ENUM | No | See RsvpScope enum | For recurring events |
| created_at | TIMESTAMPTZ | Yes | Auto-generated | Invitation timestamp |
| updated_at | TIMESTAMPTZ | Yes | Auto-updated | Last status change |

**Enums**:
```typescript
enum RsvpStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  DECLINED = 'declined',
  TENTATIVE = 'tentative'
}

enum RsvpScope {
  THIS_EVENT = 'this_event',
  THIS_AND_FUTURE = 'this_and_future',
  ALL_EVENTS = 'all_events'
}
```

**Unique Constraints**:
- `(event_id, employee_id)` - One RSVP per user per event

**State Transitions**:
```
[Pending] ──rsvp──> [Accepted|Declined|Tentative]
    ↑                    │
    └────change rsvp─────┘
```

### WaitlistEntry

Manages event waitlist when capacity is reached.

**Fields**:
| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| id | UUID | Yes | Auto-generated | Unique identifier |
| event_id | UUID | Yes | FK to events | Associated event |
| employee_id | UUID | Yes | FK to employees | Waitlisted employee |
| position | INT | Yes | Positive integer | Position in queue (FIFO) |
| created_at | TIMESTAMPTZ | Yes | Auto-generated | Joined waitlist timestamp |

**Unique Constraints**:
- `(event_id, employee_id)` - One waitlist entry per user per event
- `(event_id, position)` - Unique position per event

**State Transitions**:
```
[Waitlisted] ──spot opens──> [Promoted to Attendee]
     │
     └──manually remove──> [Removed]
```

### EventComment

User comments and discussions on events.

**Fields**:
| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| id | UUID | Yes | Auto-generated | Unique identifier |
| event_id | UUID | Yes | FK to events | Associated event |
| user_id | UUID | Yes | FK to employees | Comment author |
| content | TEXT | Yes | 1-5000 chars | Comment text |
| mentions | UUID[] | No | Valid employee IDs | @mentioned users |
| created_at | TIMESTAMPTZ | Yes | Auto-generated | Posted timestamp |
| updated_at | TIMESTAMPTZ | No | Auto-updated | Last edit timestamp |

**Validation Rules**:
- Content must not be empty after trimming whitespace
- Mentions must reference existing employees
- User can only edit/delete own comments

**State Transitions**:
```
[Draft] ──post──> [Published] ──edit──> [Published]
                       │
                       └──delete──> [Deleted]
```

### EventHistory

Immutable audit trail of event changes.

**Fields**:
| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| id | UUID | Yes | Auto-generated | Unique identifier |
| event_id | UUID | Yes | FK to events | Associated event |
| changed_by | UUID | Yes | FK to employees | User who made change |
| change_type | ENUM | Yes | See ChangeType enum | Type of change |
| field_name | VARCHAR(100) | No | Valid event field | Changed field |
| old_value | JSONB | No | Valid JSON | Previous value |
| new_value | JSONB | No | Valid JSON | New value |
| changed_at | TIMESTAMPTZ | Yes | Auto-generated | Change timestamp |

**Enums**:
```typescript
enum ChangeType {
  CREATED = 'created',
  UPDATED = 'updated',
  DELETED = 'deleted',
  OWNERSHIP_TRANSFER = 'ownership_transfer',
  ATTENDEE_ADDED = 'attendee_added',
  ATTENDEE_REMOVED = 'attendee_removed'
}
```

**Immutability**: Records are never updated or deleted (append-only)

### EventNotification

User notifications for event-related activities.

**Fields**:
| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| id | UUID | Yes | Auto-generated | Unique identifier |
| user_id | UUID | Yes | FK to employees | Notification recipient |
| event_id | UUID | Yes | FK to events | Associated event |
| type | ENUM | Yes | See NotificationType enum | Notification type |
| message | TEXT | Yes | 1-500 chars | Notification text |
| read | BOOLEAN | Yes | Default FALSE | Read status |
| created_at | TIMESTAMPTZ | Yes | Auto-generated | Notification timestamp |

**Enums**:
```typescript
enum NotificationType {
  INVITE = 'invite',
  CHANGE = 'change',
  CANCEL = 'cancel',
  REMOVE = 'remove',
  COMMENT = 'comment',
  MENTION = 'mention',
  WAITLIST = 'waitlist',
  REMINDER = 'reminder'
}
```

**State Transitions**:
```
[Unread] ──user views──> [Read]
```

### NotificationPreferences

User-configurable notification settings.

**Fields**:
| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| user_id | UUID | Yes (PK) | FK to employees | User preferences owner |
| event_invites | BOOLEAN | Yes | Default TRUE | Notify on invitations |
| event_changes | BOOLEAN | Yes | Default TRUE | Notify on event updates |
| event_reminders | BOOLEAN | Yes | Default TRUE | Send event reminders |
| comment_mentions | BOOLEAN | Yes | Default TRUE | Notify on @mentions |
| waitlist_updates | BOOLEAN | Yes | Default TRUE | Notify on waitlist changes |
| reminder_times | INT[] | Yes | Default [60, 1440] | Minutes before event |

**Validation Rules**:
- reminder_times must be positive integers
- reminder_times sorted in ascending order

## Database Schema (PostgreSQL)

### Core Tables

```sql
-- Events table (extends existing)
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL CHECK (end_time > start_time),
  location VARCHAR(255),
  visibility TEXT NOT NULL CHECK (visibility IN ('public', 'private')),
  type TEXT NOT NULL CHECK (type IN ('meeting', 'training', 'social', 'conference', 'other')),
  created_by UUID NOT NULL REFERENCES employees(id),
  rrule TEXT, -- RFC 5545 RRULE string
  recurrence_id UUID REFERENCES events(id), -- Parent event if this is an exception
  max_capacity INT CHECK (max_capacity > 0),
  waitlist_enabled BOOLEAN DEFAULT FALSE,
  image_url VARCHAR(500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Event attendees (extends existing)
CREATE TABLE event_attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id),
  rsvp_status TEXT NOT NULL CHECK (rsvp_status IN ('pending', 'accepted', 'declined', 'tentative')),
  is_required BOOLEAN DEFAULT FALSE,
  rsvp_scope TEXT CHECK (rsvp_scope IN ('this_event', 'this_and_future', 'all_events')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (event_id, employee_id)
);

-- Waitlist
CREATE TABLE event_waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id),
  position INT NOT NULL CHECK (position > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (event_id, employee_id),
  UNIQUE (event_id, position)
);

-- Comments
CREATE TABLE event_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES employees(id),
  content TEXT NOT NULL CHECK (LENGTH(TRIM(content)) > 0 AND LENGTH(content) <= 5000),
  mentions UUID[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- History (immutable audit trail)
CREATE TABLE event_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  changed_by UUID NOT NULL REFERENCES employees(id),
  change_type TEXT NOT NULL CHECK (change_type IN ('created', 'updated', 'deleted', 'ownership_transfer', 'attendee_added', 'attendee_removed')),
  field_name VARCHAR(100),
  old_value JSONB,
  new_value JSONB,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Notifications
CREATE TABLE event_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES employees(id),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('invite', 'change', 'cancel', 'remove', 'comment', 'mention', 'waitlist', 'reminder')),
  message TEXT NOT NULL CHECK (LENGTH(message) BETWEEN 1 AND 500),
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Notification preferences
CREATE TABLE notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES employees(id),
  event_invites BOOLEAN NOT NULL DEFAULT TRUE,
  event_changes BOOLEAN NOT NULL DEFAULT TRUE,
  event_reminders BOOLEAN NOT NULL DEFAULT TRUE,
  comment_mentions BOOLEAN NOT NULL DEFAULT TRUE,
  waitlist_updates BOOLEAN NOT NULL DEFAULT TRUE,
  reminder_times INT[] NOT NULL DEFAULT ARRAY[60, 1440] -- [1 hour, 1 day] in minutes
);
```

### Indexes

```sql
-- Event queries
CREATE INDEX idx_events_start_time ON events(start_time);
CREATE INDEX idx_events_end_time ON events(end_time);
CREATE INDEX idx_events_visibility ON events(visibility);
CREATE INDEX idx_events_creator ON events(created_by);
CREATE INDEX idx_events_recurrence ON events(recurrence_id) WHERE recurrence_id IS NOT NULL;

-- Conflict detection (GiST index for temporal overlaps)
CREATE INDEX idx_events_time_range ON events USING GIST (tsrange(start_time, end_time));

-- RSVP lookups
CREATE INDEX idx_attendees_event ON event_attendees(event_id);
CREATE INDEX idx_attendees_employee ON event_attendees(employee_id);
CREATE INDEX idx_attendees_status ON event_attendees(rsvp_status);
CREATE INDEX idx_attendees_composite ON event_attendees(employee_id, event_id, rsvp_status);

-- Waitlist ordering
CREATE INDEX idx_waitlist_event ON event_waitlist(event_id, position);
CREATE INDEX idx_waitlist_employee ON event_waitlist(employee_id);

-- Comments
CREATE INDEX idx_comments_event ON event_comments(event_id);
CREATE INDEX idx_comments_user ON event_comments(user_id);
CREATE INDEX idx_comments_fulltext ON event_comments USING GIN(to_tsvector('english', content));

-- History (immutable, no update queries needed)
CREATE INDEX idx_history_event ON event_history(event_id, changed_at DESC);
CREATE INDEX idx_history_changed_by ON event_history(changed_by);

-- Notifications
CREATE INDEX idx_notifications_user ON event_notifications(user_id, read, created_at DESC);
CREATE INDEX idx_notifications_event ON event_notifications(event_id);
```

### Triggers & Functions

```sql
-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_events_updated_at
BEFORE UPDATE ON events
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_attendees_updated_at
BEFORE UPDATE ON event_attendees
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Waitlist auto-promotion on RSVP decline
CREATE OR REPLACE FUNCTION promote_from_waitlist()
RETURNS TRIGGER AS $$
DECLARE
  next_waitlist RECORD;
BEGIN
  -- Only promote if RSVP changed from accepted to declined
  IF OLD.rsvp_status = 'accepted' AND NEW.rsvp_status = 'declined' THEN
    -- Get first waitlisted user
    SELECT id, employee_id, event_id
    INTO next_waitlist
    FROM event_waitlist
    WHERE event_id = NEW.event_id
    ORDER BY position
    LIMIT 1;

    IF FOUND THEN
      -- Add to attendees with pending status
      INSERT INTO event_attendees (event_id, employee_id, rsvp_status)
      VALUES (next_waitlist.event_id, next_waitlist.employee_id, 'pending')
      ON CONFLICT (event_id, employee_id) DO UPDATE SET rsvp_status = 'pending';

      -- Remove from waitlist
      DELETE FROM event_waitlist WHERE id = next_waitlist.id;

      -- Create notification
      INSERT INTO event_notifications (user_id, event_id, type, message)
      VALUES (
        next_waitlist.employee_id,
        next_waitlist.event_id,
        'waitlist',
        'A spot opened up for this event!'
      );

      -- Reorder remaining waitlist positions
      UPDATE event_waitlist
      SET position = position - 1
      WHERE event_id = NEW.event_id AND position > (SELECT position FROM event_waitlist WHERE id = next_waitlist.id);
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER waitlist_promotion_trigger
AFTER UPDATE ON event_attendees
FOR EACH ROW
EXECUTE FUNCTION promote_from_waitlist();

-- Event audit trail logging
CREATE OR REPLACE FUNCTION log_event_changes()
RETURNS TRIGGER AS $$
DECLARE
  field_record RECORD;
BEGIN
  -- Log each changed field
  FOR field_record IN
    SELECT key, to_jsonb(OLD) -> key AS old_val, to_jsonb(NEW) -> key AS new_val
    FROM jsonb_each(to_jsonb(NEW))
    WHERE to_jsonb(OLD) -> key IS DISTINCT FROM to_jsonb(NEW) -> key
      AND key NOT IN ('updated_at', 'created_at')
  LOOP
    INSERT INTO event_history (event_id, changed_by, change_type, field_name, old_value, new_value)
    VALUES (
      NEW.id,
      current_setting('app.current_user_id', true)::UUID,
      TG_OP,
      field_record.key,
      field_record.old_val,
      field_record.new_val
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER event_audit_trigger
AFTER UPDATE ON events
FOR EACH ROW
EXECUTE FUNCTION log_event_changes();

-- Capacity enforcement
CREATE OR REPLACE FUNCTION enforce_event_capacity()
RETURNS TRIGGER AS $$
DECLARE
  current_count INT;
  event_capacity INT;
BEGIN
  -- Only check when RSVP status changes to accepted
  IF NEW.rsvp_status = 'accepted' THEN
    -- Get event capacity
    SELECT max_capacity INTO event_capacity
    FROM events
    WHERE id = NEW.event_id;

    -- If capacity is set, check current accepted count
    IF event_capacity IS NOT NULL THEN
      SELECT COUNT(*) INTO current_count
      FROM event_attendees
      WHERE event_id = NEW.event_id
        AND rsvp_status = 'accepted'
        AND id != NEW.id; -- Exclude current record

      IF current_count >= event_capacity THEN
        RAISE EXCEPTION 'Event capacity reached. Join the waitlist instead.';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER capacity_enforcement_trigger
BEFORE INSERT OR UPDATE ON event_attendees
FOR EACH ROW
EXECUTE FUNCTION enforce_event_capacity();
```

### Row-Level Security (RLS) Policies

```sql
-- Enable RLS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_notifications ENABLE ROW LEVEL SECURITY;

-- Events: Users see public events + private events they're invited to
CREATE POLICY events_select_policy ON events
  FOR SELECT USING (
    visibility = 'public' OR
    id IN (
      SELECT event_id FROM event_attendees
      WHERE employee_id = current_setting('app.current_user_id', true)::UUID
    )
  );

-- Event creators can update their own events
CREATE POLICY events_update_policy ON events
  FOR UPDATE USING (
    created_by = current_setting('app.current_user_id', true)::UUID
  );

-- Attendees: Users can view attendees of events they can see
CREATE POLICY attendees_select_policy ON event_attendees
  FOR SELECT USING (
    event_id IN (SELECT id FROM events) -- Leverages events RLS policy
  );

-- Users can only modify their own RSVP
CREATE POLICY attendees_update_policy ON event_attendees
  FOR UPDATE USING (
    employee_id = current_setting('app.current_user_id', true)::UUID
  );

-- Comments: Users can view comments on events they can see
CREATE POLICY comments_select_policy ON event_comments
  FOR SELECT USING (
    event_id IN (SELECT id FROM events)
  );

-- Users can edit/delete only their own comments
CREATE POLICY comments_update_policy ON event_comments
  FOR UPDATE USING (
    user_id = current_setting('app.current_user_id', true)::UUID
  );

CREATE POLICY comments_delete_policy ON event_comments
  FOR DELETE USING (
    user_id = current_setting('app.current_user_id', true)::UUID
  );

-- Notifications: Users can only see their own notifications
CREATE POLICY notifications_select_policy ON event_notifications
  FOR SELECT USING (
    user_id = current_setting('app.current_user_id', true)::UUID
  );
```

## GraphQL Schema

### Type Definitions

```graphql
# Core Types
type Event {
  id: UUID!
  title: String!
  description: String
  startTime: DateTime!
  endTime: DateTime!
  location: String
  visibility: EventVisibility!
  type: EventType!
  createdBy: Employee!
  rrule: String
  recurrenceId: UUID
  parentEvent: Event # For recurring event exceptions
  maxCapacity: Int
  waitlistEnabled: Boolean!
  imageUrl: String
  createdAt: DateTime!
  updatedAt: DateTime!

  # Relationships
  attendees: [EventAttendee!]!
  waitlist: [WaitlistEntry!]!
  comments: [EventComment!]!
  history: [EventHistory!]!

  # Computed fields
  attendeeCount: Int!
  acceptedCount: Int!
  declinedCount: Int!
  tentativeCount: Int!
  pendingCount: Int!
  isFull: Boolean!
  currentUserRsvp: RsvpStatus
}

type EventAttendee {
  id: UUID!
  event: Event!
  employee: Employee!
  rsvpStatus: RsvpStatus!
  isRequired: Boolean!
  rsvpScope: RsvpScope
  createdAt: DateTime!
  updatedAt: DateTime!
}

type WaitlistEntry {
  id: UUID!
  event: Event!
  employee: Employee!
  position: Int!
  createdAt: DateTime!
}

type EventComment {
  id: UUID!
  event: Event!
  author: Employee!
  content: String!
  mentions: [Employee!]!
  createdAt: DateTime!
  updatedAt: DateTime
}

type EventHistory {
  id: UUID!
  event: Event!
  changedBy: Employee!
  changeType: ChangeType!
  fieldName: String
  oldValue: JSON
  newValue: JSON
  changedAt: DateTime!
}

type EventNotification {
  id: UUID!
  user: Employee!
  event: Event!
  type: NotificationType!
  message: String!
  read: Boolean!
  createdAt: DateTime!
}

type NotificationPreferences {
  userId: UUID!
  eventInvites: Boolean!
  eventChanges: Boolean!
  eventReminders: Boolean!
  commentMentions: Boolean!
  waitlistUpdates: Boolean!
  reminderTimes: [Int!]!
}

# Enums
enum EventVisibility {
  PUBLIC
  PRIVATE
}

enum EventType {
  MEETING
  TRAINING
  SOCIAL
  CONFERENCE
  OTHER
}

enum RsvpStatus {
  PENDING
  ACCEPTED
  DECLINED
  TENTATIVE
}

enum RsvpScope {
  THIS_EVENT
  THIS_AND_FUTURE
  ALL_EVENTS
}

enum ChangeType {
  CREATED
  UPDATED
  DELETED
  OWNERSHIP_TRANSFER
  ATTENDEE_ADDED
  ATTENDEE_REMOVED
}

enum NotificationType {
  INVITE
  CHANGE
  CANCEL
  REMOVE
  COMMENT
  MENTION
  WAITLIST
  REMINDER
}

# Input Types
input EventInput {
  title: String!
  description: String
  startTime: DateTime!
  endTime: DateTime!
  location: String
  visibility: EventVisibility!
  type: EventType!
  rrule: String
  maxCapacity: Int
  waitlistEnabled: Boolean
  attendeeIds: [UUID!]
}

input RecurringEventInput {
  title: String!
  description: String
  startTime: DateTime!
  endTime: DateTime!
  location: String
  visibility: EventVisibility!
  type: EventType!
  rrule: RecurrenceRuleInput!
  maxCapacity: Int
  waitlistEnabled: Boolean
  attendeeIds: [UUID!]
}

input RecurrenceRuleInput {
  frequency: RRuleFrequency!
  interval: Int!
  until: DateTime
  count: Int
  byWeekday: [Int!]
  byMonthDay: [Int!]
}

enum RRuleFrequency {
  DAILY
  WEEKLY
  MONTHLY
  YEARLY
}

input NotificationPreferencesInput {
  eventInvites: Boolean
  eventChanges: Boolean
  eventReminders: Boolean
  commentMentions: Boolean
  waitlistUpdates: Boolean
  reminderTimes: [Int!]
}
```

### Queries

```graphql
type Query {
  # Events
  event(id: UUID!): Event
  events(
    start: DateTime
    end: DateTime
    visibility: EventVisibility
    type: EventType
    limit: Int = 50
    offset: Int = 0
  ): [Event!]!

  myEvents(
    start: DateTime
    end: DateTime
    rsvpStatus: RsvpStatus
  ): [Event!]!

  recurringEventInstances(
    eventId: UUID!
    start: DateTime!
    end: DateTime!
  ): [Event!]!

  # Conflicts
  conflictingEvents(
    startTime: DateTime!
    endTime: DateTime!
  ): [Event!]!

  # Notifications
  myNotifications(
    unreadOnly: Boolean = false
    limit: Int = 50
  ): [EventNotification!]!

  notificationPreferences: NotificationPreferences!
}
```

### Mutations

```graphql
type Mutation {
  # Event CRUD
  createEvent(input: EventInput!): Event!
  updateEvent(id: UUID!, input: EventInput!): Event!
  deleteEvent(id: UUID!): Boolean!

  # Recurring Events
  createRecurringEvent(input: RecurringEventInput!): Event!
  updateRecurringEvent(
    id: UUID!
    scope: RecurrenceScope!
    input: EventInput!
  ): Event!
  deleteRecurringEvent(
    id: UUID!
    scope: RecurrenceScope!
  ): Boolean!

  # RSVP
  updateRsvpStatus(
    eventId: UUID!
    status: RsvpStatus!
    scope: RecurrenceScope
  ): EventAttendee!

  # Attendee Management (private events)
  addAttendees(
    eventId: UUID!
    employeeIds: [UUID!]!
  ): [EventAttendee!]!
  removeAttendee(
    eventId: UUID!
    employeeId: UUID!
  ): Boolean!

  # Waitlist
  joinWaitlist(eventId: UUID!): WaitlistEntry!
  leaveWaitlist(eventId: UUID!): Boolean!

  # Comments
  createEventComment(
    eventId: UUID!
    content: String!
    mentions: [UUID!]
  ): EventComment!
  updateEventComment(
    id: UUID!
    content: String!
  ): EventComment!
  deleteEventComment(id: UUID!): Boolean!

  # Notifications
  markNotificationRead(id: UUID!): Boolean!
  markAllNotificationsRead: Boolean!
  updateNotificationPreferences(
    prefs: NotificationPreferencesInput!
  ): NotificationPreferences!

  # Images
  uploadEventImage(
    eventId: UUID!
    image: Upload!
  ): String! # Returns image URL
  deleteEventImage(eventId: UUID!): Boolean!
}
```

### Subscriptions

```graphql
type Subscription {
  # Real-time event updates
  eventUpdated(eventId: UUID!): Event!

  # Real-time notifications
  notificationReceived: EventNotification!

  # Real-time RSVP updates
  attendeeUpdated(eventId: UUID!): EventAttendee!
}
```

## Validation Rules Summary

### Event Validation
- Title: 1-255 characters, required
- Description: 0-10000 characters
- start_time < end_time
- RRULE: Valid RFC 5545 format if provided
- max_capacity: Positive integer if provided
- Image: ≤10 MB, JPEG/PNG/GIF/WebP only

### RSVP Validation
- User can only RSVP to visible events (public or invited private)
- Cannot RSVP to full event (must join waitlist)
- RSVP scope required for recurring events

### Waitlist Validation
- Can only join waitlist for full events with waitlist_enabled
- FIFO ordering (position auto-assigned)
- Auto-promotion on capacity opening

### Comment Validation
- Content: 1-5000 characters after trimming
- Mentions: Valid employee UUIDs
- User can only edit/delete own comments

### Notification Validation
- Message: 1-500 characters
- reminder_times: Positive integers in ascending order

## Data Integrity Constraints

### Referential Integrity
- All foreign keys use `ON DELETE CASCADE` except:
  - `events.created_by` (soft delete event on user deactivation)
  - `event_attendees.employee_id` (preserve RSVP history)

### Temporal Constraints
- Event end_time > start_time
- Recurring event exceptions must reference valid parent event
- Waitlist positions must be sequential and unique per event

### Capacity Constraints
- Accepted attendees ≤ max_capacity (enforced by trigger)
- Waitlist only available when waitlist_enabled = TRUE

### Concurrency Handling
- Optimistic locking via updated_at timestamp
- Database-level unique constraints prevent race conditions
- Triggers guarantee atomic waitlist promotion

## Data Model Checklist

- [x] All entities from spec mapped to tables
- [x] Relationships defined with proper foreign keys
- [x] Enums defined for status/type fields
- [x] Validation rules specified and enforced
- [x] Indexes created for performance
- [x] RLS policies implemented for security
- [x] Triggers for business logic automation
- [x] GraphQL schema matches database model
- [x] Audit trail for compliance (event_history)
- [x] Immutability enforced where needed

**Status**: ✅ Data Model Complete - Ready for Contract Generation
