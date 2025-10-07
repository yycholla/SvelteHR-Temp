-- Migration 002: Extend performance_reviews table
-- Feature: 023-reviews-creation-it
-- Date: 2025-10-06
-- Description: Add columns for review type, period dates, and notes to existing hr_public.performance_reviews

-- Add new columns to performance_reviews table
ALTER TABLE hr_public.performance_reviews
  ADD COLUMN IF NOT EXISTS review_type hr_public.review_type NOT NULL DEFAULT 'annual_review',
  ADD COLUMN IF NOT EXISTS review_period_start DATE,
  ADD COLUMN IF NOT EXISTS review_period_end DATE,
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- Note: status column already exists, we'll update its default if needed
-- Update default status to 'draft' instead of 'not_started' for new reviews
ALTER TABLE hr_public.performance_reviews
  ALTER COLUMN status SET DEFAULT 'draft'::hr_public.review_status;

-- Create index on review_type for filtering (status index already exists)
CREATE INDEX IF NOT EXISTS idx_performance_reviews_review_type
  ON hr_public.performance_reviews(review_type);

-- Create composite index for employee-type lookups
CREATE INDEX IF NOT EXISTS idx_performance_reviews_employee_type
  ON hr_public.performance_reviews(employee_id, review_type);

-- Create partial unique index to prevent duplicate active reviews
-- Only enforces uniqueness for draft and in_progress reviews
CREATE UNIQUE INDEX IF NOT EXISTS idx_active_reviews_unique
  ON hr_public.performance_reviews(employee_id, review_type)
  WHERE status IN ('draft', 'in_progress');

-- Add comments for new columns
COMMENT ON COLUMN hr_public.performance_reviews.review_type IS 'Type of performance review (annual, quarterly, etc.)';
COMMENT ON COLUMN hr_public.performance_reviews.review_period_start IS 'Start date of the review period';
COMMENT ON COLUMN hr_public.performance_reviews.review_period_end IS 'End date of the review period';
COMMENT ON COLUMN hr_public.performance_reviews.notes IS 'Additional notes and comments for the review';

-- Validation: Verify columns and indexes are created
-- Run: \d hr_public.performance_reviews
-- Run: SELECT * FROM pg_indexes WHERE schemaname = 'hr_public' AND tablename = 'performance_reviews';
