-- Migration: Implement waitlist auto-promotion trigger
-- Feature: 025-events-flesh-out
-- Date: 2025-10-07

BEGIN;

-- Function to promote next waitlisted user when RSVP changes from accepted to declined
CREATE OR REPLACE FUNCTION promote_from_waitlist()
RETURNS TRIGGER AS $$
DECLARE
  next_waitlist RECORD;
  event_waitlist_enabled BOOLEAN;
BEGIN
  -- Only promote if RSVP changed from accepted to declined
  IF OLD.rsvp_status = 'accepted' AND NEW.rsvp_status = 'declined' THEN
    -- Check if waitlist is enabled for this event
    SELECT waitlist_enabled INTO event_waitlist_enabled
    FROM hr_public.events
    WHERE id = NEW.event_id;

    IF event_waitlist_enabled THEN
      -- Get first waitlisted user
      SELECT id, employee_id, event_id, position
      INTO next_waitlist
      FROM hr_public.event_waitlist
      WHERE event_id = NEW.event_id
      ORDER BY position
      LIMIT 1;

      IF FOUND THEN
        -- Add to attendees with pending status
        INSERT INTO hr_public.event_attendees (event_id, employee_id, rsvp_status)
        VALUES (next_waitlist.event_id, next_waitlist.employee_id, 'pending')
        ON CONFLICT (event_id, employee_id) DO UPDATE SET rsvp_status = 'pending';

        -- Remove from waitlist
        DELETE FROM hr_public.event_waitlist WHERE id = next_waitlist.id;

        -- Create notification
        INSERT INTO hr_public.event_notifications (user_id, event_id, type, message)
        VALUES (
          next_waitlist.employee_id,
          next_waitlist.event_id,
          'waitlist',
          'A spot opened up for this event! You have been moved from the waitlist.'
        );

        -- Reorder remaining waitlist positions
        UPDATE hr_public.event_waitlist
        SET position = position - 1
        WHERE event_id = NEW.event_id AND position > next_waitlist.position;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to event_attendees table
DROP TRIGGER IF EXISTS waitlist_promotion_trigger ON hr_public.event_attendees;
CREATE TRIGGER waitlist_promotion_trigger
AFTER UPDATE ON hr_public.event_attendees
FOR EACH ROW
EXECUTE FUNCTION promote_from_waitlist();

COMMENT ON FUNCTION promote_from_waitlist() IS 'Automatically promotes next waitlisted user when RSVP changes from accepted to declined';

COMMIT;
