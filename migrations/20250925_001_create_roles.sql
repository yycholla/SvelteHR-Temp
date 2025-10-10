-- PostgreSQL roles initialization for SvelteHR development containers
-- This script creates the roles needed before the base schema

-- Create roles for PostGraphile integration
DO $$
BEGIN
    -- Guest role for unauthenticated access
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'guest') THEN
        CREATE ROLE guest;
    END IF;

    -- Employee role for basic authenticated users
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'employee') THEN
        CREATE ROLE employee;
    END IF;

    -- Manager role for team management
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'manager') THEN
        CREATE ROLE manager;
    END IF;

    -- Admin role for HR administration
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'admin') THEN
        CREATE ROLE admin;
    END IF;

    -- Super admin role for system administration
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'super_admin') THEN
        CREATE ROLE super_admin;
    END IF;

    -- PostGraphile application role
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'postgraphile_app') THEN
        CREATE ROLE postgraphile_app;
    END IF;

    -- PostGraphile authenticated role (for logged-in users)
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        CREATE ROLE authenticated;
    END IF;

    -- PostGraphile anonymous role (for public access)
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        CREATE ROLE anon;
    END IF;
END $$;

-- Enable essential extensions before schema creation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Grant role hierarchy permissions
GRANT guest TO employee;
GRANT employee TO manager;
GRANT manager TO admin;
GRANT admin TO super_admin;

-- PostGraphile app role permissions
GRANT super_admin TO postgraphile_app;

-- Note: Schema permissions will be granted in 02-schema.sql after schemas are created