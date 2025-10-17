-- Migration: [AUTO-GENERATED] add_missing_event_comments_table
-- Created: 2025-10-10T01:58:17.279Z
-- Source: Schema drift detection
-- Affected: event_comments
-- Reason: missing_table
-- Requires Review: YES (FR-024a)
--
-- WARNING: This migration was auto-generated from schema drift.
-- Review carefully before applying to ensure correctness.

BEGIN;

-- Missing table: event_comments
CREATE TABLE IF NOT EXISTS hr_public.event_comments (
  -- TODO: Add column definitions from source schema
);

COMMIT;