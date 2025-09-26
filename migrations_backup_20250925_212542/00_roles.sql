-- PostgreSQL roles initialization for SvelteHR development containers
-- This script creates the roles needed before the base schema

-- Create roles for PostGraphile integration
DO $$
BEGIN
    -- Guest role for unauthenticated access
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'hr_guest') THEN
        CREATE ROLE hr_guest;
    END IF;

    -- Employee role for basic authenticated users
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'hr_employee') THEN
        CREATE ROLE hr_employee;
    END IF;

    -- Manager role for team management
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'hr_manager') THEN
        CREATE ROLE hr_manager;
    END IF;

    -- Admin role for HR department
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'hr_admin') THEN
        CREATE ROLE hr_admin;
    END IF;

    -- Super admin role for system administration
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'hr_super_admin') THEN
        CREATE ROLE hr_super_admin;
    END IF;

    -- PostGraphile application role
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'postgraphile_app') THEN
        CREATE ROLE postgraphile_app;
    END IF;
END $$;

-- Enable essential extensions before schema creation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";