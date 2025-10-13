-- Migration: Add full indexes to enable PostGraphile filtering
-- Feature: 029-integration-tests-final
-- Date: 2025-10-10
-- Purpose: PostGraphile only exposes columns with FULL indexes (not partial) for filtering/condition
--
-- Root Cause Discovery:
-- PostGraphile exposes these columns for filtering: id, event_id, employee_id, response_status
-- These all have FULL indexes (no WHERE clause)
--
-- PostGraphile does NOT expose: is_required, created_at, reminder_time, scope, is_organizer
-- - is_required, created_at, scope: No indexes
-- - reminder_time, is_organizer: Only PARTIAL indexes (with WHERE clause)
--
-- Solution: Add FULL indexes to enable PostGraphile filtering on all columns

BEGIN;

-- Add full index on is_required (for filtering required vs optional attendees)
CREATE INDEX IF NOT EXISTS idx_event_attendees_is_required
ON hr_public.event_attendees(is_required);

-- Add full index on created_at (for filtering by date added)
CREATE INDEX IF NOT EXISTS idx_event_attendees_created_at
ON hr_public.event_attendees(created_at);

-- Add FULL index on reminder_time (replace partial index for filtering)
-- Note: Partial index idx_event_attendees_reminder_time still exists for efficient queries
CREATE INDEX IF NOT EXISTS idx_event_attendees_reminder_time_full
ON hr_public.event_attendees(reminder_time);

-- Add full index on scope (for filtering recurring event RSVPs)
CREATE INDEX IF NOT EXISTS idx_event_attendees_scope
ON hr_public.event_attendees(scope);

-- Add FULL index on is_organizer (replace partial index for filtering)
-- Note: Partial index idx_event_attendees_organizer still exists for efficient queries
CREATE INDEX IF NOT EXISTS idx_event_attendees_is_organizer_full
ON hr_public.event_attendees(is_organizer);

COMMIT;
