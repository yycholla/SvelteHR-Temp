-- Migration: Add reminder_time field to event_attendees
-- Date: 2025-10-10
-- Purpose: Fix production bug - events page crashes due to missing reminderTime field
--          Frontend GraphQL queries reference this field at events-operations.ts:52,105,630,1449
--          Priority: P0 (Emergency Hotfix)

BEGIN;

-- ========================================
-- Add reminder_time column to event_attendees
-- ========================================

ALTER TABLE hr_public.event_attendees
ADD COLUMN IF NOT EXISTS reminder_time INTEGER;

COMMENT ON COLUMN hr_public.event_attendees.reminder_time IS
'Minutes before event start_time to send notification reminder (e.g., 15 for 15 minutes before)';

-- Update table statistics for query planner
ANALYZE hr_public.event_attendees;

COMMIT;
