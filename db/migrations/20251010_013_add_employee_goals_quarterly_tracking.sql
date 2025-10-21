-- Migration: Add quarterly tracking fields to employee_goals
-- Date: 2025-10-10
-- Purpose: Add quarter/year tracking and completion timestamps for goal management
--          Priority: P2 (Medium - Feature Tables)

BEGIN;

-- ========================================
-- Add quarterly tracking fields
-- ========================================

ALTER TABLE hr_public.employee_goals
ADD COLUMN IF NOT EXISTS quarter VARCHAR(10)
  CHECK (quarter IS NULL OR quarter IN ('Q1', 'Q2', 'Q3', 'Q4'));

ALTER TABLE hr_public.employee_goals
ADD COLUMN IF NOT EXISTS year INTEGER
  CHECK (year IS NULL OR year BETWEEN 2020 AND 2100);

ALTER TABLE hr_public.employee_goals
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- ========================================
-- Add column comments
-- ========================================

COMMENT ON COLUMN hr_public.employee_goals.quarter IS
'Fiscal quarter for goal (Q1/Q2/Q3/Q4). NULL for annual or ongoing goals.';

COMMENT ON COLUMN hr_public.employee_goals.year IS
'Year for goal tracking (2020-2100 range). NULL for ongoing goals without time boundaries.';

COMMENT ON COLUMN hr_public.employee_goals.completed_at IS
'Timestamp when goal status changed to completed. Auto-set by trigger or application logic.';

-- ========================================
-- Create indexes for quarter/year queries
-- ========================================

CREATE INDEX IF NOT EXISTS idx_employee_goals_quarter_year
ON hr_public.employee_goals(year, quarter)
WHERE year IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_employee_goals_completed
ON hr_public.employee_goals(completed_at DESC)
WHERE completed_at IS NOT NULL;

-- Update table statistics
ANALYZE hr_public.employee_goals;

COMMIT;
