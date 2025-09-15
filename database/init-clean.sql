-- Clean PostGraphile HR System Database Setup
-- This script initializes a fresh PostgreSQL database for PostGraphile

\echo '================================================'
\echo 'PostGraphile HR System - Clean Initialization'
\echo '================================================'
\echo ''

-- Install PostgreSQL extensions
\echo '📦 Installing PostgreSQL Extensions...'
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
\echo '✅ Extensions installed'
\echo ''

-- Create schemas
\echo '🔧 Creating Schemas...'
CREATE SCHEMA IF NOT EXISTS hr_public;
CREATE SCHEMA IF NOT EXISTS hr_private;
CREATE SCHEMA IF NOT EXISTS hr_hidden;
\echo '✅ Schemas created'
\echo ''

-- Create JWT token type
\echo '🔧 Creating JWT token type...'
CREATE TYPE hr_public.jwt_token AS (
  role TEXT,
  user_id UUID,
  exp BIGINT,
  iat BIGINT
);
\echo '✅ JWT token type created'
\echo ''

-- Create user roles table
\echo '🔧 Creating user roles...'
CREATE TABLE hr_public.user_roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  level INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert basic roles
INSERT INTO hr_public.user_roles (name, description, level, is_active) VALUES
  ('hr_guest', 'Guest user with minimal permissions', 0, true),
  ('hr_employee', 'Standard employee access', 20, true),
  ('hr_manager', 'Team manager with department oversight', 60, true),
  ('hr_admin', 'HR administrator with full HR access', 80, true),
  ('hr_super_admin', 'System administrator with complete access', 100, true);
\echo '✅ User roles created'
\echo ''

-- Create users table
\echo '🔧 Creating users table...'
CREATE TABLE hr_public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  onboarding_status VARCHAR(20) DEFAULT 'Pending',
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default admin user
INSERT INTO hr_public.users (email, password_hash, display_name, is_active, onboarding_status)
VALUES (
  'admin@postgraphile-hr.com',
  crypt('admin123', gen_salt('bf')),
  'System Administrator',
  true,
  'Active'
);
\echo '✅ Users table created'
\echo ''

-- Create departments table
\echo '🔧 Creating departments table...'
CREATE TABLE hr_public.departments (
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

-- Insert default department
INSERT INTO hr_public.departments (name, description, is_active)
VALUES ('Administration', 'System administration department', true);
\echo '✅ Departments table created'
\echo ''

-- Create user role assignments table
\echo '🔧 Creating user role assignments...'
CREATE TABLE hr_public.user_role_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES hr_public.users(id) ON DELETE CASCADE,
  role_id INTEGER NOT NULL REFERENCES hr_public.user_roles(id),
  assigned_by UUID REFERENCES hr_public.users(id),
  is_active BOOLEAN DEFAULT true,
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, role_id) DEFERRABLE INITIALLY DEFERRED
);

-- Assign admin role to default user
INSERT INTO hr_public.user_role_assignments (user_id, role_id, is_active)
SELECT u.id, ur.id, true
FROM hr_public.users u, hr_public.user_roles ur
WHERE u.email = 'admin@postgraphile-hr.com' AND ur.name = 'hr_super_admin';
\echo '✅ User role assignments created'
\echo ''

-- Create job information table
\echo '🔧 Creating job information table...'
CREATE TABLE hr_public.job_information (
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
\echo '✅ Job information table created'
\echo ''

-- Create contact information table
\echo '🔧 Creating contact information table...'
CREATE TABLE hr_public.contact_information (
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
\echo '✅ Contact information table created'
\echo ''

-- Create auth sessions table
\echo '🔧 Creating auth sessions table...'
CREATE TABLE hr_public.auth_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES hr_public.users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true,
  user_agent TEXT,
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
\echo '✅ Auth sessions table created'
\echo ''

-- Create notifications table
\echo '🔧 Creating notifications table...'
CREATE TABLE hr_public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES hr_public.users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'info',
  is_read BOOLEAN DEFAULT false,
  action_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ
);
\echo '✅ Notifications table created'
\echo ''

-- Create PostgreSQL roles
\echo '🔧 Creating PostgreSQL roles...'
DO $$
BEGIN
    -- Create basic PostgreSQL roles
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'hr_guest') THEN
        CREATE ROLE hr_guest;
    END IF;

    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'hr_employee') THEN
        CREATE ROLE hr_employee;
        GRANT hr_guest TO hr_employee;
    END IF;

    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'hr_manager') THEN
        CREATE ROLE hr_manager;
        GRANT hr_employee TO hr_manager;
    END IF;

    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'hr_admin') THEN
        CREATE ROLE hr_admin;
        GRANT hr_manager TO hr_admin;
    END IF;

    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'hr_super_admin') THEN
        CREATE ROLE hr_super_admin;
        GRANT hr_admin TO hr_super_admin;
    END IF;

    -- Create application role for PostGraphile
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'postgraphile_application') THEN
        CREATE ROLE postgraphile_application;
        GRANT ALL ON SCHEMA hr_public TO postgraphile_application;
        GRANT ALL ON SCHEMA hr_private TO postgraphile_application;
    END IF;
END
$$;
\echo '✅ PostgreSQL roles created'
\echo ''

-- Create PostGraphile user
\echo '🔧 Creating PostGraphile user...'
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_user WHERE usename = 'postgraphile_user') THEN
        CREATE USER postgraphile_user WITH PASSWORD 'postgraphile_password';
    END IF;
END
$$;

-- Grant permissions to PostGraphile user
GRANT CONNECT ON DATABASE hr_system TO postgraphile_user;
GRANT postgraphile_application TO postgraphile_user;
GRANT USAGE ON SCHEMA hr_public, hr_private TO postgraphile_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA hr_public TO postgraphile_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA hr_public TO postgraphile_user;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA hr_public, hr_private TO postgraphile_user;

-- Set default search path
ALTER ROLE postgraphile_user SET search_path TO hr_public, hr_private, public;
\echo '✅ PostGraphile user configured'
\echo ''

-- Create authentication functions
\echo '🔧 Creating authentication functions...'
CREATE OR REPLACE FUNCTION hr_public.authenticate(
  email TEXT,
  password TEXT
) RETURNS hr_public.jwt_token AS $$
DECLARE
  account hr_public.users;
  user_role hr_public.user_roles;
BEGIN
  SELECT u.* INTO account
  FROM hr_public.users u
  WHERE u.email = authenticate.email AND u.is_active = true;

  IF account.password_hash = crypt(password, account.password_hash) THEN
    -- Update last login
    UPDATE hr_public.users
    SET last_login = NOW()
    WHERE id = account.id;

    -- Get the user's highest role
    SELECT ur.* INTO user_role
    FROM hr_public.user_roles ur
    JOIN hr_public.user_role_assignments ura ON ur.id = ura.role_id
    WHERE ura.user_id = account.id
      AND ura.is_active = true
    ORDER BY ur.level DESC
    LIMIT 1;

    RETURN ROW(
      COALESCE(user_role.name, 'hr_guest'),
      account.id,
      EXTRACT(EPOCH FROM (NOW() + INTERVAL '15 minutes'))::BIGINT,
      EXTRACT(EPOCH FROM NOW())::BIGINT
    )::hr_public.jwt_token;
  ELSE
    RETURN NULL;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION hr_public.authenticate(TEXT, TEXT) IS
'Authenticate user and return JWT token';

-- Create current user ID function
CREATE OR REPLACE FUNCTION hr_public.current_user_id()
RETURNS UUID AS $$
  SELECT current_setting('jwt.claims.user_id', true)::UUID;
$$ LANGUAGE sql STABLE;

COMMENT ON FUNCTION hr_public.current_user_id() IS
'Get the current authenticated user ID from JWT claims';

-- Create register user function
CREATE OR REPLACE FUNCTION hr_public.register_user(
  email TEXT,
  password TEXT,
  display_name TEXT
) RETURNS hr_public.users AS $$
DECLARE
  new_user hr_public.users;
BEGIN
  INSERT INTO hr_public.users (email, password_hash, display_name)
  VALUES (email, crypt(password, gen_salt('bf')), display_name)
  RETURNING * INTO new_user;

  RETURN new_user;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION hr_public.register_user(TEXT, TEXT, TEXT) IS
'Register a new user account';
\echo '✅ Authentication functions created'
\echo ''

-- Create computed field functions
\echo '🔧 Creating computed field functions...'
CREATE OR REPLACE FUNCTION hr_public.users_full_name(user_row hr_public.users)
RETURNS TEXT AS $$
  SELECT user_row.display_name;
$$ LANGUAGE sql STABLE;

COMMENT ON FUNCTION hr_public.users_full_name(hr_public.users) IS
'@deprecated Use display_name directly. Computed field for user full name.';

CREATE OR REPLACE FUNCTION hr_public.departments_employee_count(dept hr_public.departments)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM hr_public.job_information ji
  JOIN hr_public.users u ON ji.employee_id = u.id
  WHERE ji.department_id = dept.id
    AND u.is_active = true;
$$ LANGUAGE sql STABLE;

COMMENT ON FUNCTION hr_public.departments_employee_count(hr_public.departments) IS
'Computed field showing number of active employees in department';
\echo '✅ Computed field functions created'
\echo ''

-- Create basic indexes for performance
\echo '⚡ Creating performance indexes...'
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_lower
  ON hr_public.users(LOWER(email));

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_active_status
  ON hr_public.users(is_active, onboarding_status)
  WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_job_info_employee_id
  ON hr_public.job_information(employee_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_job_info_department_id
  ON hr_public.job_information(department_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_role_assignments_user_id
  ON hr_public.user_role_assignments(user_id, is_active)
  WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_unread
  ON hr_public.notifications(user_id, is_read, created_at DESC)
  WHERE is_read = false;
\echo '✅ Performance indexes created'
\echo ''

-- Add PostGraphile comments for GraphQL generation
\echo '🔧 Adding PostGraphile comments...'
COMMENT ON SCHEMA hr_public IS
'The main schema for HR system data exposed via GraphQL';

COMMENT ON TABLE hr_public.users IS
'@name User
Core user accounts in the HR system';

COMMENT ON COLUMN hr_public.users.password_hash IS
'@omit create,update
Password hash - never exposed via GraphQL';

COMMENT ON TABLE hr_public.departments IS
'@name Department
Organizational departments with hierarchical structure';

COMMENT ON TABLE hr_public.job_information IS
'@name JobInfo
Employee job details and organizational assignments';

COMMENT ON TABLE hr_public.contact_information IS
'@name ContactInfo
Employee contact details and emergency contacts';

COMMENT ON TABLE hr_public.notifications IS
'@name Notification
System notifications and alerts for users';
\echo '✅ PostGraphile comments added'
\echo ''

-- Analyze tables for query planner
ANALYZE hr_public.users;
ANALYZE hr_public.departments;
ANALYZE hr_public.job_information;
ANALYZE hr_public.user_role_assignments;

\echo '================================================'
\echo '✅ PostGraphile HR System Database Ready!'
\echo '================================================'
\echo ''
\echo 'Default admin credentials:'
\echo '  Email: admin@postgraphile-hr.com'
\echo '  Password: admin123'
\echo ''
\echo 'PostGraphile connection string:'
\echo '  postgres://postgraphile_user:postgraphile_password@localhost:5432/hr_system'
\echo ''
\echo 'GraphQL endpoint will be available at:'
\echo '  http://localhost:4000/graphql'
\echo ''
\echo 'GraphiQL IDE will be available at:'
\echo '  http://localhost:4000/graphiql'
\echo ''