-- Migration: [AUTO-GENERATED] fix_tasks_schema
-- Created: 2025-10-10T01:58:17.281Z
-- Source: Schema drift detection
-- Affected: tasks.task_type_id
-- Reason: modified_table
-- Requires Review: YES (FR-024a)
--
-- WARNING: This migration was auto-generated from schema drift.
-- Review carefully before applying to ensure correctness.

BEGIN;

ALTER TABLE hr_public.tasks DROP COLUMN task_type_id;

COMMIT;