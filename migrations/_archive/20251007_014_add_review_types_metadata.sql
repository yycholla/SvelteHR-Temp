-- Migration: Add review types enum and metadata view
-- Feature: 023-reviews-creation-it
-- Date: 2025-10-07
-- Purpose: Create ReviewType enum and review_types_metadata function for review creation UI

-- Set search path
SET search_path TO hr_public, public;

-- Create ReviewType enum
CREATE TYPE hr_public.review_type AS ENUM (
    'annual',
    'quarterly',
    'probationary',
    'project',
    'performance_improvement',
    'exit'
);

-- Add review_type column to performance_reviews table
ALTER TABLE hr_public.performance_reviews
ADD COLUMN IF NOT EXISTS review_type hr_public.review_type;

-- Add review_period_start and review_period_end columns
ALTER TABLE hr_public.performance_reviews
ADD COLUMN IF NOT EXISTS review_period_start DATE,
ADD COLUMN IF NOT EXISTS review_period_end DATE;

-- Add notes column if missing
ALTER TABLE hr_public.performance_reviews
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Create review_types_metadata function that returns metadata for UI
CREATE OR REPLACE FUNCTION hr_public.review_types_metadata()
RETURNS TABLE (
    value TEXT,
    label TEXT,
    description TEXT,
    display_order INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        'annual'::TEXT AS value,
        'Annual Review'::TEXT AS label,
        'Comprehensive yearly performance evaluation'::TEXT AS description,
        1::INTEGER AS display_order
    UNION ALL
    SELECT
        'quarterly'::TEXT,
        'Quarterly Review'::TEXT,
        'Regular check-in every three months'::TEXT,
        2::INTEGER
    UNION ALL
    SELECT
        'probationary'::TEXT,
        'Probationary Review'::TEXT,
        'Evaluation during probation period'::TEXT,
        3::INTEGER
    UNION ALL
    SELECT
        'project'::TEXT,
        'Project Review'::TEXT,
        'Post-project completion assessment'::TEXT,
        4::INTEGER
    UNION ALL
    SELECT
        'performance_improvement'::TEXT,
        'Performance Improvement Plan'::TEXT,
        'Review for performance enhancement goals'::TEXT,
        5::INTEGER
    UNION ALL
    SELECT
        'exit'::TEXT,
        'Exit Review'::TEXT,
        'Final review before employee departure'::TEXT,
        6::INTEGER;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION hr_public.review_types_metadata() TO authenticated;

-- Add comment
COMMENT ON FUNCTION hr_public.review_types_metadata() IS 'Returns metadata for review types to populate UI dropdowns';

-- Create index on review_type
CREATE INDEX IF NOT EXISTS idx_performance_reviews_review_type
ON hr_public.performance_reviews(review_type);

-- Migration complete
COMMENT ON TYPE hr_public.review_type IS 'Enum for performance review types - added in migration 20251007_001';
