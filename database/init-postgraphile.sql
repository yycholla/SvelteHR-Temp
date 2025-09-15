-- PostGraphile HR System Database Initialization
-- Complete database setup for PostGraphile with JWT authentication and RLS
-- Run this script to initialize a fresh PostgreSQL database for PostGraphile

\echo '================================================'
\echo 'PostGraphile HR System - Database Initialization'
\echo '================================================'
\echo ''

-- Create database if needed (run as superuser)
-- CREATE DATABASE hr_system;
-- \c hr_system

\echo '📦 Installing PostgreSQL Extensions...'
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

\echo '✅ Extensions installed'
\echo ''

-- Run migrations in order
\echo '🔧 Running Migration 1: PostGraphile Schema Setup...'
\i ../migrations/20241213050000_postgraphile_schema_setup.sql

\echo '✅ Schema setup complete'
\echo ''

\echo '🔧 Running Migration 2: PostgreSQL Roles and Permissions...'
\i ../migrations/20241213051000_postgresql_roles_permissions.sql

\echo '✅ Roles and permissions configured'
\echo ''

\echo '🔧 Running Migration 3: JWT Authentication Functions...'
\i ../migrations/20241213052000_jwt_auth_functions.sql

\echo '✅ JWT authentication system ready'
\echo ''

\echo '🔧 Running Migration 4: Row-Level Security Policies...'
\i ../migrations/20241213053000_rls_policies_postgraphile.sql

\echo '✅ RLS policies applied'
\echo ''

-- Additional setup for PostGraphile
\echo '🔧 Configuring PostGraphile-specific settings...'

-- Create application user for PostGraphile connection
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_user WHERE usename = 'postgraphile_user') THEN
        CREATE USER postgraphile_user WITH PASSWORD 'postgraphile_password';
    END IF;
END
$$;

-- Grant necessary permissions to PostGraphile user
GRANT CONNECT ON DATABASE hr_system TO postgraphile_user;
GRANT postgraphile_application TO postgraphile_user;
GRANT USAGE ON SCHEMA hr_public, hr_private, hr_hidden TO postgraphile_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA hr_public TO postgraphile_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA hr_public TO postgraphile_user;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA hr_public, hr_private TO postgraphile_user;

-- Set default search path for PostGraphile user
ALTER ROLE postgraphile_user SET search_path TO hr_public, hr_private, public;

-- Create computed field functions for PostGraphile
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

-- Create smart comments for PostGraphile GraphQL generation
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

-- Add GraphQL mutation functions
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

CREATE OR REPLACE FUNCTION hr_public.authenticate(
  email TEXT,
  password TEXT
) RETURNS hr_public.jwt_token AS $$
DECLARE
  account hr_public.users;
BEGIN
  SELECT u.* INTO account
  FROM hr_public.users u
  WHERE u.email = authenticate.email;

  IF account.password_hash = crypt(password, account.password_hash) THEN
    UPDATE hr_public.users
    SET last_login = NOW()
    WHERE id = account.id;

    RETURN ROW(
      COALESCE((SELECT ur.name
       FROM hr_public.user_roles ur
       JOIN hr_public.user_role_assignments ura ON ur.id = ura.role_id
       WHERE ura.user_id = account.id AND ura.is_active = true
       ORDER BY ur.level DESC LIMIT 1), 'hr_guest'),
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
'Authenticate user and receive JWT token';

CREATE OR REPLACE FUNCTION hr_public.current_user_id()
RETURNS UUID AS $$
  SELECT current_setting('jwt.claims.user_id', true)::UUID;
$$ LANGUAGE sql STABLE;

COMMENT ON FUNCTION hr_public.current_user_id() IS
'Get the current authenticated user ID from JWT claims';

-- Performance optimization
\echo '⚡ Creating performance indexes...'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_lower
  ON hr_public.users(LOWER(email));

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_active_status
  ON hr_public.users(is_active, onboarding_status)
  WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_job_info_relationships
  ON hr_public.job_information(employee_id, department_id, manager_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_unread
  ON hr_public.notifications(user_id, is_read, created_at DESC)
  WHERE is_read = false;

-- Analyze tables for query planner
ANALYZE hr_public.users;
ANALYZE hr_public.departments;
ANALYZE hr_public.job_information;
ANALYZE hr_public.user_role_assignments;

\echo '✅ Performance optimization complete'
\echo ''

-- Verify installation
\echo '🔍 Verifying installation...'
\echo ''

DO $$
DECLARE
  table_count INTEGER;
  function_count INTEGER;
  role_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'hr_public';

  SELECT COUNT(*) INTO function_count
  FROM information_schema.routines
  WHERE routine_schema IN ('hr_public', 'hr_private');

  SELECT COUNT(*) INTO role_count
  FROM pg_roles
  WHERE rolname LIKE 'hr_%';

  RAISE NOTICE 'Tables created: %', table_count;
  RAISE NOTICE 'Functions created: %', function_count;
  RAISE NOTICE 'Roles created: %', role_count;

  IF table_count < 10 THEN
    RAISE WARNING 'Expected at least 10 tables, found %', table_count;
  END IF;

  IF function_count < 10 THEN
    RAISE WARNING 'Expected at least 10 functions, found %', function_count;
  END IF;

  IF role_count < 5 THEN
    RAISE WARNING 'Expected at least 5 roles, found %', role_count;
  END IF;
END
$$;

\echo ''
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
\echo '  http://localhost:3001/graphql'
\echo ''
\echo 'GraphiQL IDE will be available at:'
\echo '  http://localhost:3001/graphiql'
\echo ''