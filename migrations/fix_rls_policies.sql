-- Set up Row Level Security policies for proper access control

-- Enable RLS on all tables
ALTER TABLE hr_public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_public.user_role_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_public.auth_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_public.auth_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_public.login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_public.attendance_records ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for users table
DROP POLICY IF EXISTS users_select_policy ON hr_public.users;
CREATE POLICY users_select_policy ON hr_public.users FOR SELECT
TO hr_guest, hr_employee, hr_manager, hr_admin, hr_super_admin
USING (
  -- Super admins and HR admins can see all users
  current_setting('jwt.claims.role', true) IN ('hr_super_admin', 'hr_admin') OR
  -- Managers can see users in their department (to be implemented)
  current_setting('jwt.claims.role', true) = 'hr_manager' OR
  -- Employees can see their own record
  (current_setting('jwt.claims.role', true) = 'hr_employee' AND
   id = current_setting('jwt.claims.user_id', true)::uuid)
);

-- Create RLS policies for user_roles table
DROP POLICY IF EXISTS user_roles_select_policy ON hr_public.user_roles;
CREATE POLICY user_roles_select_policy ON hr_public.user_roles FOR SELECT
TO hr_guest, hr_employee, hr_manager, hr_admin, hr_super_admin
USING (true); -- All authenticated users can see roles

-- Create RLS policies for user_role_assignments table
DROP POLICY IF EXISTS user_role_assignments_select_policy ON hr_public.user_role_assignments;
CREATE POLICY user_role_assignments_select_policy ON hr_public.user_role_assignments FOR SELECT
TO hr_guest, hr_employee, hr_manager, hr_admin, hr_super_admin
USING (
  -- Super admins and HR admins can see all assignments
  current_setting('jwt.claims.role', true) IN ('hr_super_admin', 'hr_admin') OR
  -- Users can see their own role assignments
  user_id = current_setting('jwt.claims.user_id', true)::uuid
);

-- Create RLS policies for leave_requests table
DROP POLICY IF EXISTS leave_requests_select_policy ON hr_public.leave_requests;
CREATE POLICY leave_requests_select_policy ON hr_public.leave_requests FOR SELECT
TO hr_employee, hr_manager, hr_admin, hr_super_admin
USING (
  -- Super admins and HR admins can see all requests
  current_setting('jwt.claims.role', true) IN ('hr_super_admin', 'hr_admin') OR
  -- Users can see their own requests
  user_id = current_setting('jwt.claims.user_id', true)::uuid
);

-- Create RLS policies for attendance_records table
DROP POLICY IF EXISTS attendance_records_select_policy ON hr_public.attendance_records;
CREATE POLICY attendance_records_select_policy ON hr_public.attendance_records FOR SELECT
TO hr_employee, hr_manager, hr_admin, hr_super_admin
USING (
  -- Super admins and HR admins can see all records
  current_setting('jwt.claims.role', true) IN ('hr_super_admin', 'hr_admin') OR
  -- Users can see their own records
  user_id = current_setting('jwt.claims.user_id', true)::uuid
);

-- Grant execute permissions on functions to roles
GRANT EXECUTE ON FUNCTION hr_public.authenticate(TEXT, TEXT) TO hr_guest;

-- Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA hr_public GRANT SELECT ON TABLES TO hr_guest;
ALTER DEFAULT PRIVILEGES IN SCHEMA hr_public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO hr_employee;
ALTER DEFAULT PRIVILEGES IN SCHEMA hr_public GRANT ALL ON TABLES TO hr_manager;
ALTER DEFAULT PRIVILEGES IN SCHEMA hr_public GRANT ALL ON TABLES TO hr_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA hr_public GRANT ALL ON TABLES TO hr_super_admin;