-- Migration: [AUTO-GENERATED] fix_employee_goals_schema
-- Created: 2025-10-10T01:58:17.280Z
-- Source: Schema drift detection
-- Affected: employee_goals.deleted, employee_goals.deleted_at
-- Reason: modified_table
-- Requires Review: YES (FR-024a)
--
-- WARNING: This migration was auto-generated from schema drift.
-- Review carefully before applying to ensure correctness.

BEGIN;

ALTER TABLE hr_public.employee_goals ADD COLUMN deleted TEXT; -- TODO: Update type
ALTER TABLE hr_public.employee_goals ADD COLUMN deleted_at TEXT; -- TODO: Update type
-- Missing index: idx_employee_goals_deleted
-- CREATE INDEX idx_employee_goals_deleted ON hr_public.employee_goals USING btree (deleted)
-- Missing index: idx_employee_goals_employee_active
-- CREATE INDEX idx_employee_goals_employee_active ON hr_public.employee_goals USING btree (employee_id, status) WHERE (deleted = false)

COMMIT;