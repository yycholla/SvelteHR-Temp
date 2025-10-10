-- PostgreSQL seed data for SvelteHR development containers
-- This script creates essential seed data and default records

-- Insert default admin user (development only)
-- Email: admin@mountainhr.dev
-- Password: admin123 (change in production!)
INSERT INTO hr_public.users (
    email,
    password_hash,
    first_name,
    last_name,
    role,
    is_active,
    created_at,
    updated_at
) VALUES (
    'admin@mountainhr.dev',
    crypt('admin123', gen_salt('bf')),
    'System',
    'Administrator',
    'super_admin',
    true,
    NOW(),
    NOW()
) ON CONFLICT (email) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    role = EXCLUDED.role,
    updated_at = NOW();

-- Insert basic departments
INSERT INTO hr_public.departments (name, description, created_at, updated_at) VALUES
('Human Resources', 'HR department managing employee relations and policies', NOW(), NOW()),
('Engineering', 'Software development and technical operations', NOW(), NOW()),
('Sales', 'Business development and customer acquisition', NOW(), NOW()),
('Marketing', 'Brand promotion and market analysis', NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- Insert default leave types
INSERT INTO hr_public.time_off_policies (
    name, description, days_per_year, requires_approval, created_at, updated_at
) VALUES
('Annual Leave', 'Yearly vacation allowance', 25, true, NOW(), NOW()),
('Sick Leave', 'Medical absence policy', 10, false, NOW(), NOW()),
('Personal Leave', 'Personal time off', 5, true, NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- Create default role assignments for admin user
INSERT INTO hr_public.user_role_assignments (
    user_id,
    role_name,
    assigned_by,
    created_at
)
SELECT
    u.id,
    'super_admin',
    u.id,
    NOW()
FROM hr_public.users u
WHERE u.email = 'admin@mountainhr.dev'
AND NOT EXISTS (
    SELECT 1 FROM hr_public.user_role_assignments ura
    WHERE ura.user_id = u.id AND ura.role_name = 'super_admin'
);

-- Enable Row Level Security on all public tables
DO $$
DECLARE
    tbl_name text;
BEGIN
    FOR tbl_name IN
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'hr_public'
        AND table_type = 'BASE TABLE'
    LOOP
        EXECUTE format('ALTER TABLE hr_public.%I ENABLE ROW LEVEL SECURITY', tbl_name);
    END LOOP;
END $$;