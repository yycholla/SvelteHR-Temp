-- Migration: Add recurring report fields to hr_reports
-- Date: 2025-10-10
-- Purpose: Add recurring schedule support with RFC 5545 RRULE patterns
--          Priority: P2 (Medium - Feature Tables)

BEGIN;

-- ========================================
-- Add recurring schedule fields
-- ========================================

ALTER TABLE hr_public.hr_reports
ADD COLUMN IF NOT EXISTS recurrence_pattern VARCHAR(50)
  CHECK (recurrence_pattern IS NULL OR recurrence_pattern IN ('none', 'daily', 'weekly', 'monthly', 'quarterly', 'yearly'));

ALTER TABLE hr_public.hr_reports
ADD COLUMN IF NOT EXISTS recurrence_rrule TEXT;

ALTER TABLE hr_public.hr_reports
ADD COLUMN IF NOT EXISTS next_run_at TIMESTAMPTZ;

ALTER TABLE hr_public.hr_reports
ADD COLUMN IF NOT EXISTS last_run_at TIMESTAMPTZ;

-- ========================================
-- Add column comments
-- ========================================

COMMENT ON COLUMN hr_public.hr_reports.recurrence_pattern IS
'Preset recurrence patterns: none/daily/weekly/monthly/quarterly/yearly. NULL for one-time reports.';

COMMENT ON COLUMN hr_public.hr_reports.recurrence_rrule IS
'RFC 5545 RRULE string for complex recurrence patterns. Example: "FREQ=WEEKLY;INTERVAL=1;BYDAY=MO" for every Monday.';

COMMENT ON COLUMN hr_public.hr_reports.next_run_at IS
'Next scheduled execution timestamp. Calculated from RRULE or pattern + last_run_at.';

COMMENT ON COLUMN hr_public.hr_reports.last_run_at IS
'Last execution timestamp. Updated after successful report generation.';

-- ========================================
-- Add constraint for pattern consistency
-- ========================================

-- If pattern is 'none', rrule should be NULL
ALTER TABLE hr_public.hr_reports
ADD CONSTRAINT chk_hr_reports_recurrence_consistency
CHECK (
  (recurrence_pattern = 'none' AND recurrence_rrule IS NULL) OR
  recurrence_pattern IS NULL OR
  recurrence_pattern != 'none'
);

-- ========================================
-- Create index for scheduled reports
-- ========================================

CREATE INDEX IF NOT EXISTS idx_hr_reports_next_run
ON hr_public.hr_reports(next_run_at)
WHERE next_run_at IS NOT NULL;

-- Update table statistics
ANALYZE hr_public.hr_reports;

COMMIT;
