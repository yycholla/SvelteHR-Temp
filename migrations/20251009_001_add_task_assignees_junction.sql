-- Migration: Add multi-assignee support for tasks
-- Feature: 028-task-system-expansion
-- Created: 2025-10-09
-- Description: Creates a junction table to support multiple assignees per task

-- Create task_assignees junction table
CREATE TABLE IF NOT EXISTS task_assignees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    assignee_id UUID NOT NULL,
    assignee_type VARCHAR(20) NOT NULL CHECK (assignee_type IN ('user', 'department')),
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    assigned_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Ensure unique task-assignee combinations
    UNIQUE(task_id, assignee_id, assignee_type)
);

-- Add indexes for performance
CREATE INDEX idx_task_assignees_task_id ON task_assignees(task_id);
CREATE INDEX idx_task_assignees_assignee_id ON task_assignees(assignee_id);
CREATE INDEX idx_task_assignees_assignee_type ON task_assignees(assignee_type);
CREATE INDEX idx_task_assignees_created_at ON task_assignees(created_at);

-- Add trigger for updated_at
CREATE TRIGGER update_task_assignees_updated_at
    BEFORE UPDATE ON task_assignees
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON task_assignees TO authenticated_user;

-- Comment on table and columns
COMMENT ON TABLE task_assignees IS 'Junction table for many-to-many relationship between tasks and assignees (users or departments)';
COMMENT ON COLUMN task_assignees.task_id IS 'Foreign key to tasks table';
COMMENT ON COLUMN task_assignees.assignee_id IS 'UUID of the assignee (user_id or department_id)';
COMMENT ON COLUMN task_assignees.assignee_type IS 'Type of assignee: user or department';
COMMENT ON COLUMN task_assignees.assigned_at IS 'When the assignee was added to the task';
COMMENT ON COLUMN task_assignees.assigned_by IS 'User who made the assignment';

-- Migrate existing single assignee_id to junction table
-- This preserves existing task assignments
INSERT INTO task_assignees (task_id, assignee_id, assignee_type, assigned_at)
SELECT
    id,
    assignee_id,
    'user', -- Assume existing assignments are to users
    created_at
FROM tasks
WHERE assignee_id IS NOT NULL;

-- Note: We're keeping the assignee_id column in tasks table for backward compatibility
-- It can be removed in a future migration once all code is updated
COMMENT ON COLUMN tasks.assignee_id IS 'DEPRECATED: Use task_assignees junction table instead. Kept for backward compatibility.';
