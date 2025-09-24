-- Fix missing fields and permissions for frontend queries

-- Add hireDate column to users table if it doesn't exist
ALTER TABLE hr_public.users
ADD COLUMN IF NOT EXISTS hire_date DATE;

-- Create missing tables for leave requests and attendance
CREATE TABLE IF NOT EXISTS hr_public.leave_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES hr_public.users(id) ON DELETE CASCADE,
  leave_type VARCHAR(50) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  approved_by UUID REFERENCES hr_public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hr_public.attendance_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES hr_public.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  check_in TIME,
  check_out TIME,
  status VARCHAR(20),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_leave_requests_user_id ON hr_public.leave_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_user_id ON hr_public.attendance_records(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_date ON hr_public.attendance_records(date);
CREATE INDEX IF NOT EXISTS idx_user_role_assignments_user_id ON hr_public.user_role_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_role_assignments_role_id ON hr_public.user_role_assignments(role_id);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_id ON hr_public.auth_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_tokens_user_id ON hr_public.auth_tokens(user_id);

-- Grant permissions to roles
GRANT SELECT ON ALL TABLES IN SCHEMA hr_public TO hr_guest;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA hr_public TO hr_employee;
GRANT ALL ON ALL TABLES IN SCHEMA hr_public TO hr_manager;
GRANT ALL ON ALL TABLES IN SCHEMA hr_public TO hr_admin;
GRANT ALL ON ALL TABLES IN SCHEMA hr_public TO hr_super_admin;

-- Grant usage on schema
GRANT USAGE ON SCHEMA hr_public TO hr_guest;
GRANT USAGE ON SCHEMA hr_public TO hr_employee;
GRANT USAGE ON SCHEMA hr_public TO hr_manager;
GRANT USAGE ON SCHEMA hr_public TO hr_admin;
GRANT USAGE ON SCHEMA hr_public TO hr_super_admin;

-- Grant sequence permissions
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA hr_public TO hr_employee;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA hr_public TO hr_manager;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA hr_public TO hr_admin;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA hr_public TO hr_super_admin;

-- Add comment on hire_date for GraphQL
COMMENT ON COLUMN hr_public.users.hire_date IS 'The date the employee was hired';