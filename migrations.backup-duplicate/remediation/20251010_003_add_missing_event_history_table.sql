-- Migration: [AUTO-GENERATED] add_missing_event_history_table
-- Created: 2025-10-10T01:58:17.279Z
-- Source: Schema drift detection
-- Affected: event_history
-- Reason: missing_table
-- Requires Review: YES (FR-024a)
--
-- WARNING: This migration was auto-generated from schema drift.
-- Review carefully before applying to ensure correctness.

BEGIN;

-- Missing table: event_history
CREATE TABLE IF NOT EXISTS hr_public.event_history (
  -- TODO: Add column definitions from source schema
);

COMMIT;