-- Create tasks table with UUID-based schema
-- This table supports individual and department-wide task assignments

CREATE TABLE IF NOT EXISTS hr_public.tasks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    assignee_id uuid,
    assigner_id uuid NOT NULL,
    department_id uuid,
    assigned_to_department_id uuid,
    title character varying(255) NOT NULL,
    description text,
    priority character varying(20) DEFAULT 'medium' NOT NULL,
    status character varying(20) DEFAULT 'todo' NOT NULL,
    due_date timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    completed_at timestamp with time zone,
    CONSTRAINT tasks_pkey PRIMARY KEY (id),
    CONSTRAINT tasks_title_not_empty CHECK (length(TRIM(BOTH FROM title)) > 0),
    CONSTRAINT task_assignment_check CHECK (
        (assignee_id IS NOT NULL AND assigned_to_department_id IS NULL) OR
        (assignee_id IS NULL AND assigned_to_department_id IS NOT NULL)
    ),
    CONSTRAINT fk_tasks_assignee FOREIGN KEY (assignee_id) REFERENCES hr_public.users(id),
    CONSTRAINT fk_tasks_assigner FOREIGN KEY (assigner_id) REFERENCES hr_public.users(id),
    CONSTRAINT fk_tasks_department FOREIGN KEY (department_id) REFERENCES hr_public.departments(id),
    CONSTRAINT fk_tasks_assigned_department FOREIGN KEY (assigned_to_department_id) REFERENCES hr_public.departments(id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON hr_public.tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigner_id ON hr_public.tasks(assigner_id);
CREATE INDEX IF NOT EXISTS idx_tasks_department_id ON hr_public.tasks(department_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_department_id ON hr_public.tasks(assigned_to_department_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON hr_public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON hr_public.tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON hr_public.tasks(created_at);

-- Add table comments
COMMENT ON TABLE hr_public.tasks IS 'Task management with individual and department-wide assignments';
COMMENT ON COLUMN hr_public.tasks.assignee_id IS 'Individual user assigned to task (mutually exclusive with assigned_to_department_id)';
COMMENT ON COLUMN hr_public.tasks.assigned_to_department_id IS 'Department assignment for department-wide tasks (mutually exclusive with assignee_id)';

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON hr_public.tasks TO authenticated;
