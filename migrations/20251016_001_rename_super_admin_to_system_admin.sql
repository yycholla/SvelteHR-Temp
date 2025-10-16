-- Rename super_admin role to system_admin for consistency with backend code
-- This ensures consistent role naming throughout the system

-- Update role name in roles table
UPDATE hr_public.roles
SET name = 'system_admin'
WHERE name = 'super_admin';

-- Temporarily disable audit trigger on users table for this migration
ALTER TABLE hr_public.users DISABLE TRIGGER audit_trigger_users;

-- Update all users with super_admin role to system_admin
UPDATE hr_public.users
SET role = 'system_admin'
WHERE role = 'super_admin';

-- Re-enable audit trigger
ALTER TABLE hr_public.users ENABLE TRIGGER audit_trigger_users;

-- Add comment
COMMENT ON COLUMN hr_public.roles.name IS 'Role name (system_admin, admin, hr_manager, manager, employee)';
COMMENT ON COLUMN hr_public.users.role IS 'User role (system_admin, admin, hr_manager, manager, employee)';
