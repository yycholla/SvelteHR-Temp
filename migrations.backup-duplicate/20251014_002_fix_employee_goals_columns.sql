-- Migration: Fix employee goals column names to match Rust GraphQL server expectations
-- Created: 2025-10-14
-- Reason: Rust GraphQL server expects goal_title/goal_description but DB has title/description

BEGIN;

-- Rename columns to match Rust GraphQL server expectations
ALTER TABLE hr_public.employee_goals RENAME COLUMN title TO goal_title;
ALTER TABLE hr_public.employee_goals RENAME COLUMN description TO goal_description;

-- Update any indexes that reference the old column names
-- (Note: The existing indexes should automatically update with column renames)

COMMIT;