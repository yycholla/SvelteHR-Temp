-- Migration: Replace old tasks table with new full-featured task system
-- Date: 2025-10-09
-- Feature: Task System Expansion (028)
-- Purpose: Drop old hr_public.tasks table and prepare for new task schema

-- Step 1: Drop old tasks table and related objects
DROP TABLE IF EXISTS hr_public.tasks CASCADE;

-- Step 2: Drop old task-related indexes that may conflict
DROP INDEX IF EXISTS hr_public.idx_tasks_assignee_id;
DROP INDEX IF EXISTS hr_public.idx_tasks_assigner_id;
DROP INDEX IF EXISTS hr_public.idx_tasks_department_id;
DROP INDEX IF EXISTS hr_public.idx_tasks_assigned_department_id;
DROP INDEX IF EXISTS hr_public.idx_tasks_status;
DROP INDEX IF EXISTS hr_public.idx_tasks_due_date;
DROP INDEX IF EXISTS hr_public.idx_tasks_created_at;
DROP INDEX IF EXISTS hr_public.tasks_assignee_status_idx;
DROP INDEX IF EXISTS hr_public.tasks_assigner_status_idx;
DROP INDEX IF EXISTS hr_public.tasks_due_date_idx;

-- Step 3: Note that new migrations will create tables in public schema
-- (not hr_public schema) as per the 20251009_* migration files

COMMENT ON SCHEMA public IS 'Full-featured task system with hierarchies, dependencies, and audit trails - Feature 028';
