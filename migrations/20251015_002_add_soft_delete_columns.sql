-- Add deleted_at columns to tables for soft delete functionality
-- This migration adds soft delete support to core HR tables

-- Departments table
ALTER TABLE hr_public.departments
ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;

-- Events table
ALTER TABLE hr_public.events
ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;

-- Leave requests table
ALTER TABLE hr_public.leave_requests
ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;

-- Tasks table (if it exists in hr_public schema)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'hr_public' AND table_name = 'tasks') THEN
        ALTER TABLE hr_public.tasks
        ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;
    END IF;
END $$;

-- Task assignees table (if it exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'hr_public' AND table_name = 'task_assignees') THEN
        ALTER TABLE hr_public.task_assignees
        ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;
    END IF;
END $$;

-- Task dependencies table (if it exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'hr_public' AND table_name = 'task_dependencies') THEN
        ALTER TABLE hr_public.task_dependencies
        ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;
    END IF;
END $$;

-- Linked resources table (if it exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'hr_public' AND table_name = 'linked_resources') THEN
        ALTER TABLE hr_public.linked_resources
        ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;
    END IF;
END $$;

-- Review cycles table (if it exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'hr_public' AND table_name = 'review_cycles') THEN
        ALTER TABLE hr_public.review_cycles
        ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;
    END IF;
END $$;

-- Review goals table (if it exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'hr_public' AND table_name = 'review_goals') THEN
        ALTER TABLE hr_public.review_goals
        ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;
    END IF;
END $$;

-- Review feedback table (if it exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'hr_public' AND table_name = 'review_feedback') THEN
        ALTER TABLE hr_public.review_feedback
        ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;
    END IF;
END $$;

-- Documents table (if it exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'hr_public' AND table_name = 'documents') THEN
        ALTER TABLE hr_public.documents
        ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;
    END IF;
END $$;

-- Document categories table (if it exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'hr_public' AND table_name = 'document_categories') THEN
        ALTER TABLE hr_public.document_categories
        ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;
    END IF;
END $$;

-- Event comments table (if it exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'hr_public' AND table_name = 'event_comments') THEN
        ALTER TABLE hr_public.event_comments
        ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;
    END IF;
END $$;

-- Create indexes for deleted_at columns where they exist
CREATE INDEX IF NOT EXISTS idx_departments_deleted_at ON hr_public.departments(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_events_deleted_at ON hr_public.events(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_leave_requests_deleted_at ON hr_public.leave_requests(deleted_at) WHERE deleted_at IS NULL;

-- Add comments
COMMENT ON COLUMN hr_public.departments.deleted_at IS 'Soft delete timestamp - NULL means not deleted';
COMMENT ON COLUMN hr_public.events.deleted_at IS 'Soft delete timestamp - NULL means not deleted';
COMMENT ON COLUMN hr_public.leave_requests.deleted_at IS 'Soft delete timestamp - NULL means not deleted';