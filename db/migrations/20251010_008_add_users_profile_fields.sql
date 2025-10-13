-- Migration: Add profile fields to users (job_title, avatar_url, date_of_birth)
-- Date: 2025-10-10
-- Purpose: Expand user profile with additional fields for HR features
--          Priority: P1 (High - Core Schema)

BEGIN;

-- ========================================
-- Add job_title field
-- ========================================

ALTER TABLE hr_public.users
ADD COLUMN IF NOT EXISTS job_title VARCHAR(255);

COMMENT ON COLUMN hr_public.users.job_title IS
'Job title/position (e.g., "Senior Software Engineer", "HR Manager")';

-- Create full-text search index for job title
CREATE INDEX IF NOT EXISTS idx_users_job_title
ON hr_public.users USING GIN (to_tsvector('english', job_title))
WHERE job_title IS NOT NULL;

-- ========================================
-- Add avatar_url field
-- ========================================

ALTER TABLE hr_public.users
ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500);

COMMENT ON COLUMN hr_public.users.avatar_url IS
'Profile avatar URL (CDN or storage path). Used in employee cards, comments, event attendees.';

-- ========================================
-- Add date_of_birth field (PII)
-- ========================================

ALTER TABLE hr_public.users
ADD COLUMN IF NOT EXISTS date_of_birth DATE;

COMMENT ON COLUMN hr_public.users.date_of_birth IS
'Date of birth - PII field requiring application-level encryption before write. Used for birthday notifications and age calculations.';

-- Update table statistics
ANALYZE hr_public.users;

COMMIT;
