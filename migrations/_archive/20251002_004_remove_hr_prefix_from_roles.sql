-- Migration: Remove "hr_" prefix from all roles
-- Date: 2025-10-02
-- Purpose: Simplify role naming by removing "hr_" prefix (keep super_admin, just remove hr_super_admin)

-- ============================================================================
-- STEP 1: Create new roles without hr_ prefix (if not exists from 01-roles.sql)
-- ============================================================================

DO $$
BEGIN
    -- Create new roles without hr_ prefix
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'guest') THEN
        CREATE ROLE guest;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'employee') THEN
        CREATE ROLE employee;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'manager') THEN
        CREATE ROLE manager;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'admin') THEN
        CREATE ROLE admin;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'super_admin') THEN
        CREATE ROLE super_admin;
    END IF;
END $$;

-- ============================================================================
-- STEP 2: Grant new role hierarchy
-- ============================================================================

GRANT guest TO employee;
GRANT employee TO manager;
GRANT manager TO admin;
GRANT admin TO super_admin;

-- Grant super_admin role to postgraphile_app
GRANT super_admin TO postgraphile_app;

-- ============================================================================
-- STEP 3: Update all user role assignments from old to new roles
-- ============================================================================

-- Update users table - change role column values
UPDATE hr_public.users SET role = 'guest' WHERE role = 'hr_guest';
UPDATE hr_public.users SET role = 'employee' WHERE role = 'hr_employee';
UPDATE hr_public.users SET role = 'manager' WHERE role = 'hr_manager';
UPDATE hr_public.users SET role = 'admin' WHERE role = 'hr_admin';
UPDATE hr_public.users SET role = 'super_admin' WHERE role = 'hr_super_admin';

-- ============================================================================
-- STEP 4: Revoke old role grants and drop old roles
-- ============================================================================

DO $$
BEGIN
    -- Revoke old role hierarchy
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'hr_guest') THEN
        REVOKE hr_guest FROM hr_employee;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'hr_employee') THEN
        REVOKE hr_employee FROM hr_manager;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'hr_manager') THEN
        REVOKE hr_manager FROM hr_admin;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'hr_admin') THEN
        REVOKE hr_admin FROM hr_super_admin;
        REVOKE hr_super_admin FROM postgraphile_app;
    END IF;

    -- Drop old roles
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'hr_super_admin') THEN
        DROP ROLE hr_super_admin;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'hr_admin') THEN
        DROP ROLE hr_admin;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'hr_manager') THEN
        DROP ROLE hr_manager;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'hr_employee') THEN
        DROP ROLE hr_employee;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'hr_guest') THEN
        DROP ROLE hr_guest;
    END IF;
END $$;

-- ============================================================================
-- STEP 5: Update schema permissions to use new roles
-- ============================================================================

-- Grant schema access to new roles
GRANT USAGE ON SCHEMA hr_public TO guest, employee, manager, admin, super_admin;
GRANT USAGE ON SCHEMA hr_private TO admin, super_admin;
GRANT USAGE ON SCHEMA hr_hidden TO super_admin;

-- Grant all sequences and tables in hr_public to new roles
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA hr_public TO guest, employee, manager, admin, super_admin;
GRANT SELECT ON ALL TABLES IN SCHEMA hr_public TO guest, employee, manager, admin, super_admin;
GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA hr_public TO employee, manager, admin, super_admin;

-- ============================================================================
-- VALIDATION
-- ============================================================================

DO $$
DECLARE
    old_role_count INTEGER;
    new_role_count INTEGER;
    user_role_check INTEGER;
BEGIN
    -- Check that old roles are gone
    SELECT COUNT(*) INTO old_role_count
    FROM pg_roles
    WHERE rolname IN ('hr_guest', 'hr_employee', 'hr_manager', 'hr_admin', 'hr_super_admin');

    IF old_role_count > 0 THEN
        RAISE WARNING 'Old roles still exist: % roles found', old_role_count;
    ELSE
        RAISE NOTICE '✓ All old hr_ prefixed roles have been removed';
    END IF;

    -- Check that new roles exist
    SELECT COUNT(*) INTO new_role_count
    FROM pg_roles
    WHERE rolname IN ('guest', 'employee', 'manager', 'admin', 'super_admin');

    IF new_role_count = 5 THEN
        RAISE NOTICE '✓ All new roles (guest, employee, manager, admin, super_admin) exist';
    ELSE
        RAISE WARNING 'Expected 5 new roles, but found %', new_role_count;
    END IF;

    -- Check that no users have old role values
    SELECT COUNT(*) INTO user_role_check
    FROM hr_public.users
    WHERE role LIKE 'hr_%';

    IF user_role_check = 0 THEN
        RAISE NOTICE '✓ All user role assignments updated successfully';
    ELSE
        RAISE WARNING '% users still have hr_ prefixed roles', user_role_check;
    END IF;

    RAISE NOTICE '=== Migration completed successfully ===';
END $$;
