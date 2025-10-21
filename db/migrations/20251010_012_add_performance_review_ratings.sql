-- Migration: Add expanded rating fields to performance_reviews
-- Date: 2025-10-10
-- Purpose: Add 6 granular rating categories and average rating computation function
--          Priority: P2 (Medium - Feature Tables)

BEGIN;

-- ========================================
-- Add rating columns to performance_reviews
-- ========================================

ALTER TABLE hr_public.performance_reviews
ADD COLUMN IF NOT EXISTS technical_skills_rating INTEGER
  CHECK (technical_skills_rating IS NULL OR (technical_skills_rating BETWEEN 1 AND 5));

ALTER TABLE hr_public.performance_reviews
ADD COLUMN IF NOT EXISTS communication_rating INTEGER
  CHECK (communication_rating IS NULL OR (communication_rating BETWEEN 1 AND 5));

ALTER TABLE hr_public.performance_reviews
ADD COLUMN IF NOT EXISTS teamwork_rating INTEGER
  CHECK (teamwork_rating IS NULL OR (teamwork_rating BETWEEN 1 AND 5));

ALTER TABLE hr_public.performance_reviews
ADD COLUMN IF NOT EXISTS leadership_rating INTEGER
  CHECK (leadership_rating IS NULL OR (leadership_rating BETWEEN 1 AND 5));

ALTER TABLE hr_public.performance_reviews
ADD COLUMN IF NOT EXISTS problem_solving_rating INTEGER
  CHECK (problem_solving_rating IS NULL OR (problem_solving_rating BETWEEN 1 AND 5));

ALTER TABLE hr_public.performance_reviews
ADD COLUMN IF NOT EXISTS initiative_rating INTEGER
  CHECK (initiative_rating IS NULL OR (initiative_rating BETWEEN 1 AND 5));

-- ========================================
-- Add column comments
-- ========================================

COMMENT ON COLUMN hr_public.performance_reviews.technical_skills_rating IS
'Technical skills proficiency rating (1-5 scale): 1=Needs Improvement, 2=Below Expectations, 3=Meets Expectations, 4=Exceeds Expectations, 5=Outstanding';

COMMENT ON COLUMN hr_public.performance_reviews.communication_rating IS
'Communication skills rating (1-5 scale): Written and verbal communication effectiveness';

COMMENT ON COLUMN hr_public.performance_reviews.teamwork_rating IS
'Teamwork and collaboration rating (1-5 scale): Ability to work effectively with others';

COMMENT ON COLUMN hr_public.performance_reviews.leadership_rating IS
'Leadership and influence rating (1-5 scale): Ability to lead, mentor, and inspire others';

COMMENT ON COLUMN hr_public.performance_reviews.problem_solving_rating IS
'Problem solving and critical thinking rating (1-5 scale): Analytical and creative problem-solving abilities';

COMMENT ON COLUMN hr_public.performance_reviews.initiative_rating IS
'Initiative and proactivity rating (1-5 scale): Self-motivation and drive to improve processes';

-- ========================================
-- Average rating computation function
-- ========================================

CREATE OR REPLACE FUNCTION hr_public.calculate_average_rating(
  technical INTEGER,
  communication INTEGER,
  teamwork INTEGER,
  leadership INTEGER,
  problem_solving INTEGER,
  initiative INTEGER
) RETURNS NUMERIC(3,2) AS $$
DECLARE
  ratings INTEGER[] := ARRAY[technical, communication, teamwork, leadership, problem_solving, initiative];
  valid_ratings INTEGER[];
  sum_ratings INTEGER := 0;
  count_ratings INTEGER := 0;
BEGIN
  -- Filter out NULL values
  valid_ratings := ARRAY(SELECT unnest(ratings) WHERE unnest IS NOT NULL);
  count_ratings := array_length(valid_ratings, 1);

  -- Return NULL if no ratings provided
  IF count_ratings IS NULL OR count_ratings = 0 THEN
    RETURN NULL;
  END IF;

  -- Calculate sum
  SELECT SUM(r) INTO sum_ratings FROM unnest(valid_ratings) AS r;

  -- Return average rounded to 2 decimal places
  RETURN ROUND(sum_ratings::NUMERIC / count_ratings, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION hr_public.calculate_average_rating IS
'Calculate average rating across all non-NULL rating categories. Returns NULL if no ratings provided.';

-- Update table statistics
ANALYZE hr_public.performance_reviews;

COMMIT;
