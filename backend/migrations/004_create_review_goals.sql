-- Migration 004: Create review_goals junction table
-- Feature: 023-reviews-creation-it
-- Date: 2025-10-06
-- Description: Many-to-many relationship between performance reviews and employee goals

-- Create review_goals junction table in hr_public schema
CREATE TABLE IF NOT EXISTS hr_public.review_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  review_id UUID NOT NULL REFERENCES hr_public.performance_reviews(id) ON DELETE CASCADE,
  goal_id UUID NOT NULL REFERENCES hr_public.employee_goals(id) ON DELETE RESTRICT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Prevent duplicate goal associations per review
  UNIQUE(review_id, goal_id)
);

-- Create index on review_id for efficient review->goals lookups
CREATE INDEX IF NOT EXISTS idx_review_goals_review
  ON hr_public.review_goals(review_id);

-- Create index on goal_id for efficient goal->reviews lookups
CREATE INDEX IF NOT EXISTS idx_review_goals_goal
  ON hr_public.review_goals(goal_id);

-- Add comments for documentation
COMMENT ON TABLE hr_public.review_goals IS 'Junction table linking performance reviews to employee goals';
COMMENT ON COLUMN hr_public.review_goals.review_id IS 'References performance_reviews - CASCADE delete removes associations';
COMMENT ON COLUMN hr_public.review_goals.goal_id IS 'References employee_goals - RESTRICT delete prevents deletion of goals linked to reviews';

-- Validation: Verify table and foreign keys are created
-- Run: \d hr_public.review_goals
-- Run: SELECT * FROM pg_indexes WHERE schemaname = 'hr_public' AND tablename = 'review_goals';
-- Run: SELECT conname, contype FROM pg_constraint WHERE conrelid = 'hr_public.review_goals'::regclass;
