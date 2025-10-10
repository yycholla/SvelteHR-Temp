-- Migration: [AUTO-GENERATED] add_missing_task_audit_entries_table
-- Created: 2025-10-10T01:58:17.280Z
-- Source: Schema drift detection
-- Affected: task_audit_entries
-- Reason: missing_table
-- Requires Review: YES (FR-024a)
--
-- WARNING: This migration was auto-generated from schema drift.
-- Review carefully before applying to ensure correctness.

BEGIN;

DROP TABLE IF EXISTS hr_public.task_audit_entries;

COMMIT;