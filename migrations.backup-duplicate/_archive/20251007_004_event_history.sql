-- Migration: Create event_history table for audit trail
-- Feature: 025-events-flesh-out
-- Date: 2025-10-07

BEGIN;

-- Create history table (immutable audit trail)
CREATE TABLE IF NOT EXISTS hr_public.event_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES hr_public.events(id) ON DELETE CASCADE,
  changed_by UUID NOT NULL REFERENCES hr_public.users(id),
  change_type TEXT NOT NULL CHECK (change_type IN ('created', 'updated', 'deleted', 'ownership_transfer', 'attendee_added', 'attendee_removed')),
  field_name VARCHAR(100),
  old_value JSONB,
  new_value JSONB,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for history queries (optimized for recent changes)
CREATE INDEX idx_history_event ON hr_public.event_history(event_id, changed_at DESC);
CREATE INDEX idx_history_changed_by ON hr_public.event_history(changed_by);
CREATE INDEX idx_history_change_type ON hr_public.event_history(change_type);

-- Add table comment
COMMENT ON TABLE hr_public.event_history IS E'@omit create,update,delete\nImmutable audit trail of event changes';
COMMENT ON COLUMN hr_public.event_history.change_type IS 'Type of change: created, updated, deleted, ownership_transfer, attendee_added, attendee_removed';
COMMENT ON COLUMN hr_public.event_history.old_value IS 'Previous field value as JSONB';
COMMENT ON COLUMN hr_public.event_history.new_value IS 'New field value as JSONB';

COMMIT;
