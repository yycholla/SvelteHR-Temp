-- Migration: Implement event capacity enforcement trigger
-- Feature: 025-events-flesh-out
-- Date: 2025-10-07

BEGIN;

-- Function to enforce event capacity limits
CREATE OR REPLACE FUNCTION enforce_event_capacity()
RETURNS TRIGGER AS $$
DECLARE
  current_count INT;
  event_capacity INT;
  event_waitlist_enabled BOOLEAN;
BEGIN
  -- Only check when RSVP status changes to accepted
  IF NEW.rsvp_status = 'accepted' THEN
    -- Get event capacity and waitlist settings
    SELECT max_capacity, waitlist_enabled
    INTO event_capacity, event_waitlist_enabled
    FROM hr_public.events
    WHERE id = NEW.event_id;

    -- If capacity is set, check current accepted count
    IF event_capacity IS NOT NULL THEN
      SELECT COUNT(*) INTO current_count
      FROM hr_public.event_attendees
      WHERE event_id = NEW.event_id
        AND rsvp_status = 'accepted'
        AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID); -- Exclude current record if updating

      IF current_count >= event_capacity THEN
        IF event_waitlist_enabled THEN
          RAISE EXCEPTION 'Event capacity reached. Join the waitlist instead.'
            USING ERRCODE = 'check_violation',
                  HINT = 'Use joinWaitlist mutation to add yourself to the waitlist';
        ELSE
          RAISE EXCEPTION 'Event capacity reached and waitlist is not enabled.'
            USING ERRCODE = 'check_violation';
        END IF;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to event_attendees table
DROP TRIGGER IF EXISTS capacity_enforcement_trigger ON event_attendees;
CREATE TRIGGER capacity_enforcement_trigger
BEFORE INSERT OR UPDATE ON hr_public.event_attendees
FOR EACH ROW
EXECUTE FUNCTION enforce_event_capacity();

COMMENT ON FUNCTION enforce_event_capacity() IS 'Enforces event capacity limits and prevents over-booking';

COMMIT;
