-- DEPRECATED: Old tasks table removed - see 20250925_005 and 20251009_000
-- The new task system (Oct 2025) does not use a 'category' column
-- -- Add missing category column to tasks table
-- ALTER TABLE hr_public.tasks
-- ADD COLUMN IF NOT EXISTS category character varying(100);
--
-- CREATE INDEX IF NOT EXISTS idx_tasks_category ON hr_public.tasks(category);

-- Create events table
CREATE TABLE IF NOT EXISTS hr_public.events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    event_type character varying(50) NOT NULL,
    start_time timestamp with time zone NOT NULL,
    end_time timestamp with time zone,
    all_day boolean DEFAULT false NOT NULL,
    location character varying(255),
    is_public boolean DEFAULT true NOT NULL,
    color character varying(7),
    organizer_id uuid NOT NULL,
    status character varying(20) DEFAULT 'scheduled' NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT events_pkey PRIMARY KEY (id),
    CONSTRAINT fk_events_organizer FOREIGN KEY (organizer_id) REFERENCES hr_public.users(id)
);

CREATE INDEX IF NOT EXISTS idx_events_organizer_id ON hr_public.events(organizer_id);
CREATE INDEX IF NOT EXISTS idx_events_start_time ON hr_public.events(start_time);
CREATE INDEX IF NOT EXISTS idx_events_status ON hr_public.events(status);

COMMENT ON TABLE hr_public.events IS 'Company and department events with RSVP tracking';

-- Create activity_logs table
CREATE TABLE IF NOT EXISTS hr_public.activity_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    employee_id uuid,
    action character varying(100) NOT NULL,
    resource_type character varying(50) NOT NULL,
    resource_id uuid,
    details jsonb,
    ip_address character varying(45),
    user_agent text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT activity_logs_pkey PRIMARY KEY (id),
    CONSTRAINT fk_activity_logs_user FOREIGN KEY (user_id) REFERENCES hr_public.users(id),
    CONSTRAINT fk_activity_logs_employee FOREIGN KEY (employee_id) REFERENCES hr_public.users(id)
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON hr_public.activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_employee_id ON hr_public.activity_logs(employee_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON hr_public.activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_activity_logs_resource_type ON hr_public.activity_logs(resource_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON hr_public.activity_logs(created_at);

COMMENT ON TABLE hr_public.activity_logs IS 'Audit log for user and employee activities';
