-- Migration 001: Add review_type enum and extend review_status
-- Feature: 023-reviews-creation-it
-- Date: 2025-10-06
-- Description: Create review_type enum and add 'draft' to existing review_status enum

-- Note: review_status enum already exists in hr_public schema with values:
-- 'not_started', 'in_progress', 'completed'
-- We'll add 'draft' to it

-- Add 'draft' to existing review_status enum
ALTER TYPE hr_public.review_status ADD VALUE IF NOT EXISTS 'draft' BEFORE 'not_started';

-- Create review_type enum in hr_public schema with all 10 types
CREATE TYPE hr_public.review_type AS ENUM (
  'annual_review',
  'mid_year_review',
  'quarterly_review',
  'probationary_review',
  'performance_improvement_plan',
  'ninety_day_review',
  'project_based_review',
  'promotion_review',
  'exit_review',
  'self_review'
);

-- Add comments for documentation
COMMENT ON TYPE hr_public.review_type IS 'Types of performance reviews available in the system';
COMMENT ON TYPE hr_public.review_status IS 'Lifecycle status of a performance review: draft, not_started, in_progress, completed';

-- Validation: Verify enums are created/updated
-- Run: SELECT * FROM pg_type WHERE typname IN ('review_type', 'review_status') AND typnamespace = 'hr_public'::regnamespace;
