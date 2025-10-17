-- Add deleted_at column to tasks table for soft delete functionality
-- This aligns with the Rust Task model expectations

ALTER TABLE hr_public.tasks
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add index for better query performance when filtering out deleted tasks
CREATE INDEX IF NOT EXISTS idx_tasks_deleted_at ON hr_public.tasks(deleted_at);

COMMENT ON COLUMN hr_public.tasks.deleted_at IS 'Soft delete timestamp - NULL means not deleted';
