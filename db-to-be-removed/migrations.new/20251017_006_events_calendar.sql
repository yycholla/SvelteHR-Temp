-- Migration: Events Calendar System
-- Created: 2025-10-17
-- Description: events, event_attendees, event_comments, event_history, event_waitlist

BEGIN;

-- ============================================================================
-- EVENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS hr_public.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(500) NOT NULL,
    description TEXT,
    event_type hr_public.event_type NOT NULL DEFAULT 'other',
    location VARCHAR(500),
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    all_day BOOLEAN NOT NULL DEFAULT FALSE,
    status hr_public.event_status NOT NULL DEFAULT 'draft',
    is_public BOOLEAN NOT NULL DEFAULT TRUE,
    color VARCHAR(7) DEFAULT '#3B82F6',
    organizer_id UUID NOT NULL REFERENCES hr_public.users(id) ON DELETE RESTRICT,
    recurrence_rule TEXT,
    recurrence_id UUID REFERENCES hr_public.events(id) ON DELETE SET NULL,
    recurrence_end_date TIMESTAMPTZ,
    max_capacity INTEGER,
    image_url VARCHAR(500),
    image_aspect_ratio VARCHAR(10),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,

    CONSTRAINT events_title_not_empty CHECK (LENGTH(TRIM(title)) > 0),
    CONSTRAINT events_time_logic CHECK (end_time > start_time),
    CONSTRAINT events_capacity_positive CHECK (max_capacity IS NULL OR max_capacity > 0),
    CONSTRAINT events_recurrence_end_valid CHECK (
        recurrence_rule IS NULL OR recurrence_end_date IS NULL OR recurrence_end_date >= start_time
    ),
    CONSTRAINT events_recurrence_5_year_limit CHECK (
        recurrence_rule IS NULL OR recurrence_end_date IS NULL OR
        recurrence_end_date <= (start_time + INTERVAL '5 years')
    ),
    CONSTRAINT events_color_hex CHECK (color IS NULL OR color ~ '^#[0-9A-Fa-f]{6}$'),
    CONSTRAINT events_aspect_ratio_valid CHECK (
        image_aspect_ratio IS NULL OR image_aspect_ratio IN ('16:9', '9:16')
    )
);

CREATE INDEX IF NOT EXISTS idx_events_organizer ON hr_public.events(organizer_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_events_start_time ON hr_public.events(start_time DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_events_end_time ON hr_public.events(end_time) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_events_status ON hr_public.events(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_events_type ON hr_public.events(event_type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_events_is_public ON hr_public.events(is_public) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_events_recurrence ON hr_public.events(recurrence_id) WHERE recurrence_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_events_time_range ON hr_public.events USING GIST (tstzrange(start_time, end_time)) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_events_upcoming ON hr_public.events(start_time) WHERE deleted_at IS NULL AND status = 'scheduled' AND start_time > NOW();

-- Full-text search indexes
CREATE INDEX IF NOT EXISTS idx_events_title_fulltext ON hr_public.events USING GIN(to_tsvector('english', title)) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_events_description_fulltext ON hr_public.events USING GIN(to_tsvector('english', COALESCE(description, ''))) WHERE deleted_at IS NULL;

COMMENT ON TABLE hr_public.events IS 'Company events with recurring event support (RFC 5545 RRULE), capacity management, and attendee tracking';
COMMENT ON COLUMN hr_public.events.recurrence_rule IS 'RFC 5545 RRULE string for recurring events (e.g., FREQ=WEEKLY;BYDAY=MO,WE,FR)';
COMMENT ON COLUMN hr_public.events.recurrence_id IS 'Parent event ID if this is a recurring event exception or instance';
COMMENT ON COLUMN hr_public.events.recurrence_end_date IS 'End date for recurring series (5-year limit enforced)';
COMMENT ON COLUMN hr_public.events.max_capacity IS 'Maximum attendee capacity (NULL = unlimited)';
COMMENT ON COLUMN hr_public.events.image_url IS 'Event image URL (10MB max, optimized by Sharp, 16:9 or 9:16 aspect ratio)';

-- ============================================================================
-- EVENT_ATTENDEES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS hr_public.event_attendees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES hr_public.events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES hr_public.users(id) ON DELETE CASCADE,
    response_status hr_public.rsvp_status NOT NULL DEFAULT 'pending',
    is_required BOOLEAN NOT NULL DEFAULT FALSE,
    is_organizer BOOLEAN NOT NULL DEFAULT FALSE,
    responded_at TIMESTAMPTZ,
    notification_sent BOOLEAN NOT NULL DEFAULT FALSE,
    rsvp_scope hr_public.rsvp_scope DEFAULT 'this_event',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT event_attendees_unique UNIQUE (event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_event_attendees_event ON hr_public.event_attendees(event_id);
CREATE INDEX IF NOT EXISTS idx_event_attendees_user ON hr_public.event_attendees(user_id);
CREATE INDEX IF NOT EXISTS idx_event_attendees_status ON hr_public.event_attendees(response_status);
CREATE INDEX IF NOT EXISTS idx_event_attendees_composite ON hr_public.event_attendees(user_id, event_id, response_status);
CREATE INDEX IF NOT EXISTS idx_event_attendees_pending ON hr_public.event_attendees(event_id) WHERE response_status = 'pending';

COMMENT ON TABLE hr_public.event_attendees IS 'Event attendees with RSVP status tracking and notifications';
COMMENT ON COLUMN hr_public.event_attendees.rsvp_scope IS 'Scope of RSVP: this_event (single occurrence) or all_events (entire series for recurring)';
COMMENT ON COLUMN hr_public.event_attendees.is_organizer IS 'Whether this attendee is a co-organizer with edit permissions';

-- ============================================================================
-- EVENT_WAITLIST TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS hr_public.event_waitlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES hr_public.events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES hr_public.users(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    promoted BOOLEAN NOT NULL DEFAULT FALSE,
    promoted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT event_waitlist_unique UNIQUE (event_id, user_id),
    CONSTRAINT event_waitlist_position_unique UNIQUE (event_id, position),
    CONSTRAINT event_waitlist_position_positive CHECK (position > 0)
);

CREATE INDEX IF NOT EXISTS idx_event_waitlist_event ON hr_public.event_waitlist(event_id, position) WHERE NOT promoted;
CREATE INDEX IF NOT EXISTS idx_event_waitlist_user ON hr_public.event_waitlist(user_id);
CREATE INDEX IF NOT EXISTS idx_event_waitlist_promoted ON hr_public.event_waitlist(promoted, promoted_at DESC);

COMMENT ON TABLE hr_public.event_waitlist IS 'Waitlist queue for events at capacity (FIFO ordering)';
COMMENT ON COLUMN hr_public.event_waitlist.position IS 'Position in waitlist queue (1 = first in line)';
COMMENT ON COLUMN hr_public.event_waitlist.promoted IS 'Whether user has been promoted from waitlist to attendee';

-- ============================================================================
-- EVENT_COMMENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS hr_public.event_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES hr_public.events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES hr_public.users(id) ON DELETE RESTRICT,
    content TEXT NOT NULL,
    mentions UUID[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,

    CONSTRAINT event_comments_content_valid CHECK (LENGTH(TRIM(content)) BETWEEN 1 AND 5000)
);

CREATE INDEX IF NOT EXISTS idx_event_comments_event ON hr_public.event_comments(event_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_event_comments_user ON hr_public.event_comments(user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_event_comments_mentions_gin ON hr_public.event_comments USING GIN(mentions) WHERE deleted_at IS NULL;

-- Full-text search on comments
CREATE INDEX IF NOT EXISTS idx_event_comments_fulltext ON hr_public.event_comments
USING GIN(to_tsvector('english', content)) WHERE deleted_at IS NULL;

COMMENT ON TABLE hr_public.event_comments IS 'User comments and discussions on events with @ mention support';
COMMENT ON COLUMN hr_public.event_comments.mentions IS 'Array of user UUIDs mentioned in comment with @ syntax';
COMMENT ON COLUMN hr_public.event_comments.content IS 'Comment text (1-5000 characters after trimming)';

-- ============================================================================
-- EVENT_HISTORY TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS hr_public.event_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES hr_public.events(id) ON DELETE CASCADE,
    changed_by UUID NOT NULL REFERENCES hr_public.users(id) ON DELETE RESTRICT,
    change_type VARCHAR(50) NOT NULL,
    field_name VARCHAR(100),
    old_value JSONB,
    new_value JSONB,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT event_history_change_type_valid CHECK (change_type IN (
        'created', 'updated', 'deleted', 'ownership_transfer',
        'attendee_added', 'attendee_removed', 'status_changed',
        'capacity_changed', 'recurrence_modified'
    ))
);

CREATE INDEX IF NOT EXISTS idx_event_history_event ON hr_public.event_history(event_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_event_history_changed_by ON hr_public.event_history(changed_by);
CREATE INDEX IF NOT EXISTS idx_event_history_change_type ON hr_public.event_history(change_type);
CREATE INDEX IF NOT EXISTS idx_event_history_changed_at ON hr_public.event_history(changed_at DESC);

COMMENT ON TABLE hr_public.event_history IS 'Immutable audit trail of event changes with field-level tracking';
COMMENT ON COLUMN hr_public.event_history.change_type IS 'Type of change: created, updated, deleted, ownership_transfer, attendee_added, attendee_removed, etc.';

COMMIT;
