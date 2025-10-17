-- Migration: Recreate event_attendees table with all columns in CREATE TABLE
-- Feature: 029-integration-tests-final
-- Date: 2025-10-10
-- Purpose: Fix PostGraphile connection-filter plugin issue where columns added via ALTER TABLE are not included in EventAttendeeFilter type
--
-- Investigation Results:
-- - Only columns 1-4 (id, event_id, employee_id, response_status) were filterable
-- - Columns 5-9 (is_required, created_at, reminder_time, scope, is_organizer) were NOT filterable
-- - Root cause: Columns 5-9 were added via ALTER TABLE migrations
-- - Hypothesis: postgraphile-plugin-connection-filter v2.3.0 may not detect ALTER TABLE columns
--
-- Solution: Drop and recreate table with ALL columns in single CREATE TABLE statement

BEGIN;

-- Drop existing table (no data loss - table is empty)
DROP TABLE IF EXISTS hr_public.event_attendees CASCADE;

-- Recreate table with ALL columns in original CREATE TABLE
CREATE TABLE hr_public.event_attendees (
    -- Original columns (positions 1-4) - these were filterable
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    event_id UUID NOT NULL,
    employee_id UUID NOT NULL,
    response_status hr_public.rsvp_status DEFAULT 'pending'::hr_public.rsvp_status NOT NULL,

    -- Previously ALTER TABLE columns (positions 5-9) - these were NOT filterable
    is_required BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    reminder_time INTEGER,  -- Minutes before event to send reminder (NULL = no reminder)
    scope hr_public.rsvp_scope,  -- RSVP scope for recurring events
    is_organizer BOOLEAN DEFAULT false NOT NULL,

    -- Constraints
    CONSTRAINT event_attendees_pkey PRIMARY KEY (id),
    CONSTRAINT event_attendees_unique UNIQUE (event_id, employee_id),
    CONSTRAINT event_attendees_event_id_fkey FOREIGN KEY (event_id) REFERENCES hr_public.events(id) ON DELETE CASCADE,
    CONSTRAINT event_attendees_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES hr_public.users(id) ON DELETE CASCADE
);

-- Add table comment
COMMENT ON TABLE hr_public.event_attendees IS 'Event RSVP and attendance tracking';

-- Add column comments for documentation and smart tags
COMMENT ON COLUMN hr_public.event_attendees.id IS 'Unique identifier for event attendee record';
COMMENT ON COLUMN hr_public.event_attendees.event_id IS 'Reference to the event';
COMMENT ON COLUMN hr_public.event_attendees.employee_id IS 'Reference to the employee/user';
COMMENT ON COLUMN hr_public.event_attendees.response_status IS 'RSVP status: pending, accepted, declined, tentative';
COMMENT ON COLUMN hr_public.event_attendees.is_required IS 'Whether attendance is required for this attendee';
COMMENT ON COLUMN hr_public.event_attendees.created_at IS 'Timestamp when attendee was added to event';
COMMENT ON COLUMN hr_public.event_attendees.reminder_time IS
'@filterable
Reminder time in minutes before event starts. Examples: 15 = 15 min, 60 = 1 hour, 1440 = 1 day';
COMMENT ON COLUMN hr_public.event_attendees.scope IS
'@filterable
RSVP scope for recurring events: this_event (applies to single occurrence) or all_events (applies to entire recurring series). NULL for non-recurring events.';
COMMENT ON COLUMN hr_public.event_attendees.is_organizer IS
'@filterable
Whether this attendee is an event organizer with edit permissions. Organizers can modify event details, manage waitlist, and send announcements.';

-- Recreate indexes
CREATE INDEX idx_event_attendees_event_id ON hr_public.event_attendees(event_id);
CREATE INDEX idx_event_attendees_employee_id ON hr_public.event_attendees(employee_id);
CREATE INDEX idx_event_attendees_response_status ON hr_public.event_attendees(response_status);
CREATE INDEX idx_attendees_status ON hr_public.event_attendees(response_status);
CREATE INDEX idx_attendees_composite ON hr_public.event_attendees(employee_id, event_id, response_status);
CREATE INDEX idx_event_attendees_organizer ON hr_public.event_attendees(event_id, is_organizer) WHERE is_organizer = true;

-- Recreate reminder_time indexes (for notification service)
CREATE INDEX idx_event_attendees_reminder_time ON hr_public.event_attendees(reminder_time) WHERE reminder_time IS NOT NULL;
CREATE INDEX idx_event_attendees_reminder_lookup ON hr_public.event_attendees(event_id, employee_id, reminder_time) WHERE reminder_time IS NOT NULL;

-- Enable Row Level Security
ALTER TABLE hr_public.event_attendees ENABLE ROW LEVEL SECURITY;

-- Recreate RLS policies
DROP POLICY IF EXISTS attendees_select_policy ON hr_public.event_attendees;
CREATE POLICY attendees_select_policy ON hr_public.event_attendees
  FOR SELECT USING (
    event_id IN (SELECT id FROM hr_public.events WHERE is_public = TRUE) OR
    employee_id = current_setting('app.current_user_id', true)::UUID OR
    event_id IN (SELECT id FROM hr_public.events WHERE organizer_id = current_setting('app.current_user_id', true)::UUID)
  );

-- Recreate waitlist promotion trigger
CREATE OR REPLACE FUNCTION promote_from_waitlist()
RETURNS TRIGGER AS $$
DECLARE
  next_waitlist RECORD;
  event_waitlist_enabled BOOLEAN;
BEGIN
  IF OLD.response_status = 'accepted' AND NEW.response_status = 'declined' THEN
    SELECT waitlist_enabled INTO event_waitlist_enabled
    FROM hr_public.events
    WHERE id = NEW.event_id;

    IF event_waitlist_enabled THEN
      SELECT id, employee_id, event_id, position
      INTO next_waitlist
      FROM hr_public.event_waitlist
      WHERE event_id = NEW.event_id
      ORDER BY position
      LIMIT 1;

      IF FOUND THEN
        INSERT INTO hr_public.event_attendees (event_id, employee_id, response_status)
        VALUES (next_waitlist.event_id, next_waitlist.employee_id, 'pending')
        ON CONFLICT (event_id, employee_id) DO UPDATE SET response_status = 'pending';

        DELETE FROM hr_public.event_waitlist WHERE id = next_waitlist.id;

        INSERT INTO hr_public.event_notifications (user_id, event_id, type, message)
        VALUES (
          next_waitlist.employee_id,
          next_waitlist.event_id,
          'waitlist',
          'A spot opened up for this event! You have been moved from the waitlist.'
        );

        UPDATE hr_public.event_waitlist
        SET position = position - 1
        WHERE event_id = NEW.event_id AND position > next_waitlist.position;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS waitlist_promotion_trigger ON hr_public.event_attendees;
CREATE TRIGGER waitlist_promotion_trigger
AFTER UPDATE ON hr_public.event_attendees
FOR EACH ROW
EXECUTE FUNCTION promote_from_waitlist();

COMMIT;
