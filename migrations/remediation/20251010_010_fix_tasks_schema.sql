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

ALTER TABLE hr_public.tasks ADD COLUMN task_type_id TEXT; -- TODO: Update type
-- Missing index: idx_tasks_archived_by_full
-- CREATE INDEX idx_tasks_archived_by_full ON hr_public.tasks USING btree (archived_by)
-- Missing index: idx_tasks_assignee_id_full
-- CREATE INDEX idx_tasks_assignee_id_full ON hr_public.tasks USING btree (assignee_id)
-- Missing index: idx_tasks_created_at_order
-- CREATE INDEX idx_tasks_created_at_order ON hr_public.tasks USING btree (created_at)
-- Missing index: idx_tasks_due_date_order
-- CREATE INDEX idx_tasks_due_date_order ON hr_public.tasks USING btree (due_date)
-- Missing index: idx_tasks_parent_id_full
-- CREATE INDEX idx_tasks_parent_id_full ON hr_public.tasks USING btree (parent_task_id)
-- Missing index: idx_tasks_priority_order
-- CREATE INDEX idx_tasks_priority_order ON hr_public.tasks USING btree (priority)
-- Missing index: idx_tasks_status_order
-- CREATE INDEX idx_tasks_status_order ON hr_public.tasks USING btree (status)
-- Missing index: idx_tasks_title_order
-- CREATE INDEX idx_tasks_title_order ON hr_public.tasks USING btree (title)
-- Missing index: idx_tasks_type
-- CREATE INDEX idx_tasks_type ON hr_public.tasks USING btree (task_type_id)
-- Missing index: idx_tasks_updated_at_order
-- CREATE INDEX idx_tasks_updated_at_order ON hr_public.tasks USING btree (updated_at)

COMMIT;