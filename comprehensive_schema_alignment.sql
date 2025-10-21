-- Comprehensive Schema Alignment Migration
-- Aligns database with frontend GraphQL expectations
-- Generated from schema analysis

BEGIN;

-- ============================================================================
-- USERS TABLE
-- ============================================================================

-- Note: phone_number exists and maps to 'phone' in GraphQL (already handled in resolver)
-- Note: display_name exists (computed column)
-- Note: Some fields should be mapped in GraphQL rather than duplicated:
--   - phone_number → phone (GraphQL resolver maps this)
--   - role → roleName (can be mapped if needed)

-- Add missing user columns
ALTER TABLE hr_public.users
  ADD COLUMN IF NOT EXISTS alternate_phone VARCHAR(20),
  ADD COLUMN IF NOT EXISTS job_title VARCHAR(255),
  ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';

-- Add full_name as computed column (like display_name)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema='hr_public'
                 AND table_name='users'
                 AND column_name='full_name') THEN
    ALTER TABLE hr_public.users
      ADD COLUMN full_name VARCHAR(255) GENERATED ALWAYS AS (
        CONCAT(first_name, ' ', last_name)
      ) STORED;
  END IF;
END $$;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_users_status ON hr_public.users(status);
CREATE INDEX IF NOT EXISTS idx_users_job_title ON hr_public.users(job_title);

-- ============================================================================
-- TASKS TABLE
-- ============================================================================

-- Note: created_by exists and will be mapped to creatorId in GraphQL
-- Add missing task columns
ALTER TABLE hr_public.tasks
  ADD COLUMN IF NOT EXISTS assignee_id UUID,
  ADD COLUMN IF NOT EXISTS parent_task_id UUID,
  ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS archived_by UUID;

-- Add foreign key constraints
ALTER TABLE hr_public.tasks
  ADD CONSTRAINT IF NOT EXISTS fk_tasks_assignee
    FOREIGN KEY (assignee_id) REFERENCES hr_public.users(id) ON DELETE SET NULL;

ALTER TABLE hr_public.tasks
  ADD CONSTRAINT IF NOT EXISTS fk_tasks_parent
    FOREIGN KEY (parent_task_id) REFERENCES hr_public.tasks(id) ON DELETE CASCADE;

ALTER TABLE hr_public.tasks
  ADD CONSTRAINT IF NOT EXISTS fk_tasks_archived_by
    FOREIGN KEY (archived_by) REFERENCES hr_public.users(id) ON DELETE SET NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON hr_public.tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_parent_id ON hr_public.tasks(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_archived ON hr_public.tasks(archived) WHERE archived = true;
CREATE INDEX IF NOT EXISTS idx_tasks_archived_by ON hr_public.tasks(archived_by);

-- ============================================================================
-- PERFORMANCE_REVIEWS TABLE
-- ============================================================================

-- Note: review_period exists as a single field
-- Add separate start/end dates for better querying
ALTER TABLE hr_public.performance_reviews
  ADD COLUMN IF NOT EXISTS review_period_start DATE,
  ADD COLUMN IF NOT EXISTS review_period_end DATE,
  ADD COLUMN IF NOT EXISTS review_type VARCHAR(50) DEFAULT 'annual',
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_reviews_period_start ON hr_public.performance_reviews(review_period_start);
CREATE INDEX IF NOT EXISTS idx_reviews_period_end ON hr_public.performance_reviews(review_period_end);
CREATE INDEX IF NOT EXISTS idx_reviews_type ON hr_public.performance_reviews(review_type);

-- ============================================================================
-- EVENT_ATTENDEES TABLE
-- ============================================================================

-- These columns were found in Rust model but missing in database
-- Add them now to match expectations
ALTER TABLE hr_public.event_attendees
  ADD COLUMN IF NOT EXISTS reminder_time INTEGER, -- minutes before event
  ADD COLUMN IF NOT EXISTS scope VARCHAR(20) DEFAULT 'this_event', -- this_event or all_events for recurring
  ADD COLUMN IF NOT EXISTS is_organizer BOOLEAN DEFAULT false;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_event_attendees_organizer ON hr_public.event_attendees(is_organizer) WHERE is_organizer = true;
CREATE INDEX IF NOT EXISTS idx_event_attendees_reminder ON hr_public.event_attendees(reminder_time) WHERE reminder_time IS NOT NULL;

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify users table
SELECT 'users table columns:' as check;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema='hr_public' AND table_name='users'
AND column_name IN ('phone_number', 'full_name', 'alternate_phone', 'job_title', 'status', 'manager_id')
ORDER BY column_name;

-- Verify tasks table
SELECT 'tasks table columns:' as check;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema='hr_public' AND table_name='tasks'
AND column_name IN ('created_by', 'assignee_id', 'parent_task_id', 'archived', 'archived_at', 'archived_by')
ORDER BY column_name;

-- Verify performance_reviews table
SELECT 'performance_reviews table columns:' as check;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema='hr_public' AND table_name='performance_reviews'
AND column_name IN ('review_period', 'review_period_start', 'review_period_end', 'review_type', 'notes')
ORDER BY column_name;

-- Verify event_attendees table
SELECT 'event_attendees table columns:' as check;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema='hr_public' AND table_name='event_attendees'
AND column_name IN ('reminder_time', 'scope', 'is_organizer')
ORDER BY column_name;
