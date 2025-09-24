-- Add missing management tables for team performance functionality
-- These tables were defined in init-clean.sql but weren't applied

-- Create departments table
CREATE TABLE IF NOT EXISTS hr_public.departments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  parent_department_id UUID REFERENCES hr_public.departments(id),
  manager_id UUID REFERENCES hr_public.users(id),
  budget DECIMAL(12, 2),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create job information table
CREATE TABLE IF NOT EXISTS hr_public.job_information (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES hr_public.users(id) ON DELETE CASCADE,
  department_id UUID REFERENCES hr_public.departments(id),
  job_title VARCHAR(255),
  employment_type VARCHAR(50) DEFAULT 'full_time',
  start_date DATE,
  end_date DATE,
  manager_id UUID REFERENCES hr_public.users(id),
  reports_to UUID REFERENCES hr_public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create contact information table
CREATE TABLE IF NOT EXISTS hr_public.contact_information (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES hr_public.users(id) ON DELETE CASCADE,
  phone_number VARCHAR(20),
  emergency_contact_name VARCHAR(255),
  emergency_contact_phone VARCHAR(20),
  address_line1 VARCHAR(255),
  address_line2 VARCHAR(255),
  city VARCHAR(100),
  state_province VARCHAR(100),
  postal_code VARCHAR(20),
  country VARCHAR(100) DEFAULT 'United States',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing fields to users table
ALTER TABLE hr_public.users
ADD COLUMN IF NOT EXISTS job_title VARCHAR(255),
ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS hire_date DATE;

-- Create update triggers for new tables
CREATE OR REPLACE FUNCTION hr_public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers to departments
DROP TRIGGER IF EXISTS update_departments_updated_at ON hr_public.departments;
CREATE TRIGGER update_departments_updated_at
    BEFORE UPDATE ON hr_public.departments
    FOR EACH ROW EXECUTE FUNCTION hr_public.update_updated_at_column();

-- Add triggers to job_information
DROP TRIGGER IF EXISTS update_job_information_updated_at ON hr_public.job_information;
CREATE TRIGGER update_job_information_updated_at
    BEFORE UPDATE ON hr_public.job_information
    FOR EACH ROW EXECUTE FUNCTION hr_public.update_updated_at_column();

-- Add triggers to contact_information
DROP TRIGGER IF EXISTS update_contact_information_updated_at ON hr_public.contact_information;
CREATE TRIGGER update_contact_information_updated_at
    BEFORE UPDATE ON hr_public.contact_information
    FOR EACH ROW EXECUTE FUNCTION hr_public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_departments_manager_id ON hr_public.departments(manager_id);
CREATE INDEX IF NOT EXISTS idx_departments_parent_id ON hr_public.departments(parent_department_id);
CREATE INDEX IF NOT EXISTS idx_job_information_employee_id ON hr_public.job_information(employee_id);
CREATE INDEX IF NOT EXISTS idx_job_information_department_id ON hr_public.job_information(department_id);
CREATE INDEX IF NOT EXISTS idx_job_information_manager_id ON hr_public.job_information(manager_id);
CREATE INDEX IF NOT EXISTS idx_contact_information_employee_id ON hr_public.contact_information(employee_id);

-- Insert sample departments
INSERT INTO hr_public.departments (name, description, is_active) VALUES
('Administration', 'System administration department', true),
('Engineering', 'Software development and engineering', true),
('Sales', 'Sales and customer acquisition', true),
('Marketing', 'Marketing and communications', true),
('Human Resources', 'HR and people operations', true)
ON CONFLICT DO NOTHING;

-- Get department and user IDs for sample data
DO $$
DECLARE
    admin_dept_id UUID;
    eng_dept_id UUID;
    admin_user_id UUID;
BEGIN
    -- Get department IDs
    SELECT id INTO admin_dept_id FROM hr_public.departments WHERE name = 'Administration' LIMIT 1;
    SELECT id INTO eng_dept_id FROM hr_public.departments WHERE name = 'Engineering' LIMIT 1;

    -- Get admin user ID
    SELECT id INTO admin_user_id FROM hr_public.users WHERE email = 'admin@postgraphile-hr.com' LIMIT 1;

    -- Set admin as manager of Administration department
    UPDATE hr_public.departments SET manager_id = admin_user_id WHERE name = 'Administration';

    -- Create job information for admin user
    INSERT INTO hr_public.job_information (employee_id, department_id, job_title, employment_type, start_date, manager_id)
    VALUES (admin_user_id, admin_dept_id, 'System Administrator', 'full_time', CURRENT_DATE, admin_user_id)
    ON CONFLICT DO NOTHING;
END $$;

-- Add some sample users with manager relationships
INSERT INTO hr_public.users (id, email, password_hash, display_name, job_title, is_active, onboarding_status) VALUES
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'manager@postgraphile-hr.com', crypt('manager123', gen_salt('bf')), 'Team Manager', 'Engineering Manager', true, 'Active'),
('cccccccc-cccc-cccc-cccc-cccccccccccc', 'employee1@postgraphile-hr.com', crypt('employee123', gen_salt('bf')), 'John Smith', 'Software Engineer', true, 'Active'),
('dddddddd-dddd-dddd-dddd-dddddddddddd', 'employee2@postgraphile-hr.com', crypt('employee123', gen_salt('bf')), 'Jane Doe', 'Senior Software Engineer', true, 'Active')
ON CONFLICT (email) DO NOTHING;

-- Assign roles to new users
DO $$
DECLARE
    manager_role_id INTEGER;
    employee_role_id INTEGER;
BEGIN
    -- Get role IDs
    SELECT id INTO manager_role_id FROM hr_public.user_roles WHERE name = 'hr_manager' LIMIT 1;
    SELECT id INTO employee_role_id FROM hr_public.user_roles WHERE name = 'hr_employee' LIMIT 1;

    -- Assign manager role
    INSERT INTO hr_public.user_role_assignments (user_id, role_id, is_active)
    VALUES ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', manager_role_id, true)
    ON CONFLICT (user_id, role_id) DO NOTHING;

    -- Assign employee roles
    INSERT INTO hr_public.user_role_assignments (user_id, role_id, is_active) VALUES
    ('cccccccc-cccc-cccc-cccc-cccccccccccc', employee_role_id, true),
    ('dddddddd-dddd-dddd-dddd-dddddddddddd', employee_role_id, true)
    ON CONFLICT (user_id, role_id) DO NOTHING;
END $$;

-- Create job information for sample users with manager relationships
DO $$
DECLARE
    eng_dept_id UUID;
    manager_user_id UUID := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
BEGIN
    SELECT id INTO eng_dept_id FROM hr_public.departments WHERE name = 'Engineering' LIMIT 1;

    -- Set manager as department head
    UPDATE hr_public.departments SET manager_id = manager_user_id WHERE name = 'Engineering';

    -- Create job information records
    INSERT INTO hr_public.job_information (employee_id, department_id, job_title, employment_type, start_date, manager_id) VALUES
    (manager_user_id, eng_dept_id, 'Engineering Manager', 'full_time', CURRENT_DATE, manager_user_id),
    ('cccccccc-cccc-cccc-cccc-cccccccccccc', eng_dept_id, 'Software Engineer', 'full_time', CURRENT_DATE, manager_user_id),
    ('dddddddd-dddd-dddd-dddd-dddddddddddd', eng_dept_id, 'Senior Software Engineer', 'full_time', CURRENT_DATE, manager_user_id)
    ON CONFLICT DO NOTHING;
END $$;

-- Enable RLS on new tables
ALTER TABLE hr_public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_public.job_information ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_public.contact_information ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for departments
CREATE POLICY departments_select_policy ON hr_public.departments
    FOR SELECT
    TO hr_employee, hr_manager, hr_admin, hr_super_admin
    USING (true);

-- Create RLS policies for job_information
CREATE POLICY job_information_select_policy ON hr_public.job_information
    FOR SELECT
    TO hr_employee, hr_manager, hr_admin, hr_super_admin
    USING (
        -- Users can see their own job info
        employee_id = current_setting('jwt.claims.user_id', true)::UUID
        -- Managers can see their direct reports
        OR manager_id = current_setting('jwt.claims.user_id', true)::UUID
        -- HR/Admin can see all
        OR current_setting('jwt.claims.role_level', true)::INTEGER >= 80
    );

-- Create RLS policies for contact_information
CREATE POLICY contact_information_select_policy ON hr_public.contact_information
    FOR SELECT
    TO hr_employee, hr_manager, hr_admin, hr_super_admin
    USING (
        -- Users can see their own contact info
        employee_id = current_setting('jwt.claims.user_id', true)::UUID
        -- HR/Admin can see all
        OR current_setting('jwt.claims.role_level', true)::INTEGER >= 80
    );

-- Grant permissions
GRANT SELECT ON hr_public.departments TO hr_employee, hr_manager, hr_admin, hr_super_admin;
GRANT SELECT ON hr_public.job_information TO hr_employee, hr_manager, hr_admin, hr_super_admin;
GRANT SELECT ON hr_public.contact_information TO hr_employee, hr_manager, hr_admin, hr_super_admin;

GRANT INSERT, UPDATE, DELETE ON hr_public.departments TO hr_admin, hr_super_admin;
GRANT INSERT, UPDATE, DELETE ON hr_public.job_information TO hr_admin, hr_super_admin;
GRANT INSERT, UPDATE, DELETE ON hr_public.contact_information TO hr_admin, hr_super_admin;

-- Allow managers to update job information for their reports
GRANT UPDATE ON hr_public.job_information TO hr_manager;

-- Add table comments for PostGraphile
COMMENT ON TABLE hr_public.departments IS 'Company departments and organizational structure';
COMMENT ON TABLE hr_public.job_information IS 'Employee job details including department and manager relationships';
COMMENT ON TABLE hr_public.contact_information IS 'Employee contact and address information';

-- Add column comments
COMMENT ON COLUMN hr_public.departments.manager_id IS 'Department manager (usually has hr_manager role)';
COMMENT ON COLUMN hr_public.job_information.manager_id IS 'Direct manager for this employee';
COMMENT ON COLUMN hr_public.job_information.reports_to IS 'Alternative reporting structure field';