-- Migration: Create tasks table for manager task assignment feature
-- Feature: 016-repair-management-pages
-- Task: T001
-- Purpose: Enable managers to assign tasks to their team members

-- Create task priority and status enums
CREATE TYPE hr_public.task_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE hr_public.task_status AS ENUM ('todo', 'in_progress', 'completed', 'cancelled');

-- Create tasks table
CREATE TABLE hr_public.tasks (
    id uuid DEFAULT uuid_generate_v4() NOT NULL,
    assignee_id uuid NOT NULL,
    assigner_id uuid NOT NULL,
    department_id uuid NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    priority hr_public.task_priority DEFAULT 'medium'::hr_public.task_priority NOT NULL,
    status hr_public.task_status DEFAULT 'todo'::hr_public.task_status NOT NULL,
    due_date date,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    completed_at timestamp with time zone,
    CONSTRAINT tasks_pkey PRIMARY KEY (id),
    CONSTRAINT tasks_title_not_empty CHECK (length(TRIM(BOTH FROM title)) > 0),
    CONSTRAINT tasks_no_self_assignment CHECK (assignee_id != assigner_id),
    CONSTRAINT tasks_completed_at_logic CHECK (
        (status = 'completed' AND completed_at IS NOT NULL) OR
        (status != 'completed' AND completed_at IS NULL)
    )
);

-- Add foreign key constraints with CASCADE deletion
ALTER TABLE hr_public.tasks
    ADD CONSTRAINT tasks_assignee_id_fkey
    FOREIGN KEY (assignee_id)
    REFERENCES hr_public.users(id)
    ON DELETE CASCADE;

ALTER TABLE hr_public.tasks
    ADD CONSTRAINT tasks_assigner_id_fkey
    FOREIGN KEY (assigner_id)
    REFERENCES hr_public.users(id)
    ON DELETE CASCADE;

ALTER TABLE hr_public.tasks
    ADD CONSTRAINT tasks_department_id_fkey
    FOREIGN KEY (department_id)
    REFERENCES hr_public.departments(id)
    ON DELETE CASCADE;

-- Create indexes for common queries
CREATE INDEX tasks_assignee_id_idx ON hr_public.tasks(assignee_id);
CREATE INDEX tasks_assigner_id_idx ON hr_public.tasks(assigner_id);
CREATE INDEX tasks_department_id_idx ON hr_public.tasks(department_id);
CREATE INDEX tasks_status_idx ON hr_public.tasks(status);
CREATE INDEX tasks_due_date_idx ON hr_public.tasks(due_date) WHERE due_date IS NOT NULL;

-- Grant permissions to appropriate roles
GRANT SELECT ON hr_public.tasks TO hr_guest, hr_employee, hr_manager, hr_admin, hr_super_admin;
GRANT INSERT, UPDATE, DELETE ON hr_public.tasks TO hr_manager, hr_admin, hr_super_admin;

-- Add comment for documentation
COMMENT ON TABLE hr_public.tasks IS 'Tasks assigned by managers to team members within their department';
COMMENT ON COLUMN hr_public.tasks.assignee_id IS 'User who is assigned the task';
COMMENT ON COLUMN hr_public.tasks.assigner_id IS 'Manager who assigned the task';
COMMENT ON COLUMN hr_public.tasks.department_id IS 'Department context for RBAC filtering';
COMMENT ON COLUMN hr_public.tasks.completed_at IS 'Timestamp when task was marked complete';
