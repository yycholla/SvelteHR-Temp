-- Migration: [AUTO-GENERATED] add_missing_task_dependencies_table
-- Created: 2025-10-10T01:58:17.280Z
-- Source: Schema drift detection
-- Affected: task_dependencies
-- Reason: missing_table
-- Requires Review: YES (FR-024a)
--
-- WARNING: This migration was auto-generated from schema drift.
-- Review carefully before applying to ensure correctness.

BEGIN;

-- Missing table: task_dependencies
CREATE TABLE IF NOT EXISTS hr_public.task_dependencies (
  -- TODO: Add column definitions from source schema
);

COMMIT;