-- Migration 003: Add soft delete to employee_goals table
-- Feature: 023-reviews-creation-it
-- Date: 2025-10-06
-- Description: Add soft delete columns to preserve goal data in historical reviews

-- Add soft delete columns to employee_goals table
ALTER TABLE hr_public.employee_goals
  ADD COLUMN IF NOT EXISTS deleted BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- Create index on deleted field for filtering
CREATE INDEX IF NOT EXISTS idx_employee_goals_deleted
  ON hr_public.employee_goals(deleted);

-- Create composite index for active goals lookup
-- Filters out deleted goals efficiently
CREATE INDEX IF NOT EXISTS idx_employee_goals_employee_active
  ON hr_public.employee_goals(employee_id, status)
  WHERE deleted = FALSE;

-- Add comments for documentation
COMMENT ON COLUMN hr_public.employee_goals.deleted IS 'Soft delete flag - preserves goals in historical reviews';
COMMENT ON COLUMN hr_public.employee_goals.deleted_at IS 'Timestamp when goal was soft deleted';

-- Validation: Verify columns and indexes are created
-- Run: \d hr_public.employee_goals
-- Run: SELECT * FROM pg_indexes WHERE schemaname = 'hr_public' AND tablename = 'employee_goals';
