-- Seed test data for development
-- This creates the default roles and test users

-- Insert default roles
INSERT INTO hr_public.user_roles (id, name, description, level, permissions, is_system_role)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'Super Admin', 'Full system access', 100, '["*"]'::jsonb, true),
  ('22222222-2222-2222-2222-222222222222', 'HR Admin', 'HR department administration', 80, '["users:read", "users:write", "departments:read", "departments:write", "employees:*"]'::jsonb, true),
  ('33333333-3333-3333-3333-333333333333', 'Manager', 'Department manager', 60, '["users:read", "departments:read", "employees:read", "employees:write:own_department"]'::jsonb, true),
  ('44444444-4444-4444-4444-444444444444', 'Employee', 'Regular employee', 20, '["profile:read:own", "profile:write:own"]'::jsonb, true)
ON CONFLICT (id) DO NOTHING;

-- Insert test admin user (password: admin123)
INSERT INTO hr_public.users (id, email, password_hash, display_name, onboarding_status, job_title)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'admin@postgraphile-hr.com',
   crypt('admin123', gen_salt('bf')), 'Admin User', 'Completed', 'System Administrator')
ON CONFLICT (email) DO NOTHING;

-- Assign super admin role to test user
INSERT INTO hr_public.user_role_assignments (user_id, role_id, is_active)
SELECT 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', true
WHERE NOT EXISTS (
  SELECT 1 FROM hr_public.user_role_assignments
  WHERE user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
    AND role_id = '11111111-1111-1111-1111-111111111111'
    AND is_active = true
);