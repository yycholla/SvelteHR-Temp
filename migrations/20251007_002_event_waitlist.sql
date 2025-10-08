-- Migration: Create event_waitlist table
-- Feature: 025-events-flesh-out
-- Date: 2025-10-07

BEGIN;

-- Create waitlist table
CREATE TABLE IF NOT EXISTS event_waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id),
  position INT NOT NULL CHECK (position > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (event_id, employee_id),
  UNIQUE (event_id, position)
);

-- Add indexes for waitlist queries
CREATE INDEX idx_waitlist_event ON event_waitlist(event_id, position);
CREATE INDEX idx_waitlist_employee ON event_waitlist(employee_id);

-- Add table comment
COMMENT ON TABLE event_waitlist IS 'Waitlist entries for events at capacity';
COMMENT ON COLUMN event_waitlist.position IS 'Position in waitlist queue (FIFO ordering)';

COMMIT;
