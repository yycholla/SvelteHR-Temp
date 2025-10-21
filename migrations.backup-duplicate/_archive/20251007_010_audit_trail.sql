-- Migration: Implement event audit trail trigger
-- Feature: 025-events-flesh-out
-- Date: 2025-10-07

BEGIN;

-- Function to log event changes to event_history table
CREATE OR REPLACE FUNCTION log_event_changes()
RETURNS TRIGGER AS $$
DECLARE
  field_record RECORD;
  current_user_id UUID;
BEGIN
  -- Get current user from session variable
  BEGIN
    current_user_id := current_setting('app.current_user_id', true)::UUID;
  EXCEPTION
    WHEN OTHERS THEN
      current_user_id := NULL;
  END;

  -- Skip if no user context (system operations)
  IF current_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Log CREATED event
  IF TG_OP = 'INSERT' THEN
    INSERT INTO hr_public.event_history (event_id, changed_by, change_type, field_name, old_value, new_value)
    VALUES (
      NEW.id,
      current_user_id,
      'created',
      NULL,
      NULL,
      to_jsonb(NEW)
    );
    RETURN NEW;
  END IF;

  -- Log DELETED event
  IF TG_OP = 'DELETE' THEN
    INSERT INTO hr_public.event_history (event_id, changed_by, change_type, field_name, old_value, new_value)
    VALUES (
      OLD.id,
      current_user_id,
      'deleted',
      NULL,
      to_jsonb(OLD),
      NULL
    );
    RETURN OLD;
  END IF;

  -- Log UPDATED event - record each changed field
  IF TG_OP = 'UPDATE' THEN
    FOR field_record IN
      SELECT key, to_jsonb(OLD) -> key AS old_val, to_jsonb(NEW) -> key AS new_val
      FROM jsonb_each(to_jsonb(NEW))
      WHERE to_jsonb(OLD) -> key IS DISTINCT FROM to_jsonb(NEW) -> key
        AND key NOT IN ('updated_at', 'created_at') -- Exclude metadata fields
    LOOP
      INSERT INTO hr_public.event_history (event_id, changed_by, change_type, field_name, old_value, new_value)
      VALUES (
        NEW.id,
        current_user_id,
        'updated',
        field_record.key,
        field_record.old_val,
        field_record.new_val
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to events table
DROP TRIGGER IF EXISTS event_audit_trigger ON events;
CREATE TRIGGER event_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON hr_public.events
FOR EACH ROW
EXECUTE FUNCTION log_event_changes();

COMMENT ON FUNCTION log_event_changes() IS 'Logs all event changes to event_history for audit trail';

COMMIT;
