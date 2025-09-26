-- Migration: Extend performance reviews table for management functionality
-- Created: 2025-09-24
-- Task: T002 - Performance reviews database migration

-- Add missing rating columns to existing performance_reviews table
ALTER TABLE hr_public.performance_reviews
ADD COLUMN IF NOT EXISTS goals_achievement INTEGER CHECK (goals_achievement BETWEEN 1 AND 5),
ADD COLUMN IF NOT EXISTS collaboration INTEGER CHECK (collaboration BETWEEN 1 AND 5),
ADD COLUMN IF NOT EXISTS communication INTEGER CHECK (communication BETWEEN 1 AND 5),
ADD COLUMN IF NOT EXISTS leadership INTEGER CHECK (leadership BETWEEN 1 AND 5),
ADD COLUMN IF NOT EXISTS strengths TEXT,
ADD COLUMN IF NOT EXISTS areas_for_improvement TEXT,
ADD COLUMN IF NOT EXISTS goals_for_next_period TEXT,
ADD COLUMN IF NOT EXISTS development_plan TEXT;

-- Update overall_rating to use integer values instead of strings
-- First update any string values to integers
UPDATE hr_public.performance_reviews
SET overall_rating = CASE
  WHEN UPPER(overall_rating) = 'EXCELLENT' THEN '5'
  WHEN UPPER(overall_rating) = 'GOOD' THEN '4'
  WHEN UPPER(overall_rating) = 'SATISFACTORY' THEN '3'
  WHEN UPPER(overall_rating) = 'NEEDS_IMPROVEMENT' THEN '2'
  WHEN UPPER(overall_rating) = 'POOR' THEN '1'
  WHEN overall_rating ~ '^[1-5]$' THEN overall_rating
  ELSE '3'
END
WHERE overall_rating IS NOT NULL;

-- Change overall_rating column type to integer
ALTER TABLE hr_public.performance_reviews
ALTER COLUMN overall_rating TYPE INTEGER USING overall_rating::INTEGER;

-- Add constraints using DO block for IF NOT EXISTS functionality
DO $$
BEGIN
    -- Add overall rating constraint if not exists
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'performance_reviews_overall_rating_check') THEN
        ALTER TABLE hr_public.performance_reviews ADD CONSTRAINT performance_reviews_overall_rating_check CHECK (overall_rating BETWEEN 1 AND 5);
    END IF;

    -- Add no self-review constraint if not exists
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'performance_reviews_no_self_review') THEN
        ALTER TABLE hr_public.performance_reviews ADD CONSTRAINT performance_reviews_no_self_review CHECK (employee_id != reviewer_id);
    END IF;
END $$;

-- Update status values to use lowercase
UPDATE hr_public.performance_reviews SET status = LOWER(status);

-- Add constraint for status values
ALTER TABLE hr_public.performance_reviews DROP CONSTRAINT IF EXISTS performance_reviews_status_check;
ALTER TABLE hr_public.performance_reviews
ADD CONSTRAINT performance_reviews_status_check
  CHECK (status IN ('not_started', 'draft', 'in_progress', 'completed', 'submitted'));

-- Add comments for documentation
COMMENT ON TABLE hr_public.performance_reviews IS 'Structured performance evaluations with ratings and goals';
COMMENT ON COLUMN hr_public.performance_reviews.status IS 'Review status: draft, in_progress, completed, submitted';
COMMENT ON COLUMN hr_public.performance_reviews.overall_rating IS 'Overall performance rating (1-5 scale)';
COMMENT ON COLUMN hr_public.performance_reviews.goals_achievement IS 'Goals achievement rating (1-5 scale)';
COMMENT ON COLUMN hr_public.performance_reviews.collaboration IS 'Collaboration skills rating (1-5 scale)';
COMMENT ON COLUMN hr_public.performance_reviews.communication IS 'Communication skills rating (1-5 scale)';
COMMENT ON COLUMN hr_public.performance_reviews.leadership IS 'Leadership skills rating (1-5 scale)';