-- Migration: Cleanup old hr_ prefixed roles
-- Date: 2025-10-02
-- Purpose: Revoke privileges and drop old hr_ prefixed roles

-- ============================================================================
-- STEP 1: Update remaining users with old roles
-- ============================================================================

UPDATE hr_public.users SET role = 'super_admin' WHERE role = 'hr_super_admin';
UPDATE hr_public.users SET role = 'admin' WHERE role = 'hr_admin';
UPDATE hr_public.users SET role = 'manager' WHERE role = 'hr_manager';
UPDATE hr_public.users SET role = 'employee' WHERE role = 'hr_employee';
UPDATE hr_public.users SET role = 'guest' WHERE role = 'hr_guest';

-- ============================================================================
-- STEP 2: Revoke all privileges from old roles (if they exist)
-- ============================================================================

DO $$
BEGIN
    -- Only revoke if the old roles exist
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname IN ('hr_guest', 'hr_employee', 'hr_manager', 'hr_admin', 'hr_super_admin')) THEN
        -- Revoke schema privileges
        EXECUTE 'REVOKE ALL ON SCHEMA hr_public FROM hr_guest, hr_employee, hr_manager, hr_admin, hr_super_admin';
        EXECUTE 'REVOKE ALL ON SCHEMA hr_private FROM hr_admin, hr_super_admin';
        EXECUTE 'REVOKE ALL ON SCHEMA hr_hidden FROM hr_super_admin';

        -- Revoke table privileges
        EXECUTE 'REVOKE ALL ON ALL TABLES IN SCHEMA hr_public FROM hr_guest, hr_employee, hr_manager, hr_admin, hr_super_admin';
        EXECUTE 'REVOKE ALL ON ALL TABLES IN SCHEMA hr_private FROM hr_admin, hr_super_admin';
        EXECUTE 'REVOKE ALL ON ALL TABLES IN SCHEMA hr_hidden FROM hr_super_admin';

        -- Revoke sequence privileges
        EXECUTE 'REVOKE ALL ON ALL SEQUENCES IN SCHEMA hr_public FROM hr_guest, hr_employee, hr_manager, hr_admin, hr_super_admin';
        EXECUTE 'REVOKE ALL ON ALL SEQUENCES IN SCHEMA hr_private FROM hr_admin, hr_super_admin';

        -- Revoke function privileges
        EXECUTE 'REVOKE ALL ON ALL FUNCTIONS IN SCHEMA hr_public FROM hr_guest, hr_employee, hr_manager, hr_admin, hr_super_admin';
        EXECUTE 'REVOKE ALL ON ALL FUNCTIONS IN SCHEMA hr_private FROM hr_admin, hr_super_admin';
        EXECUTE 'REVOKE ALL ON ALL FUNCTIONS IN SCHEMA hr_hidden FROM hr_super_admin';

        RAISE NOTICE 'Revoked all privileges from old hr_ prefixed roles';
    ELSE
        RAISE NOTICE 'No old hr_ prefixed roles found - skipping privilege revocation';
    END IF;
END $$;

-- ============================================================================
-- STEP 3: Revoke role memberships
-- ============================================================================

DO $$
BEGIN
    -- Revoke old role hierarchy
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'hr_guest') AND
       EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'hr_employee') THEN
        REVOKE hr_guest FROM hr_employee;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'hr_employee') AND
       EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'hr_manager') THEN
        REVOKE hr_employee FROM hr_manager;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'hr_manager') AND
       EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'hr_admin') THEN
        REVOKE hr_manager FROM hr_admin;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'hr_admin') AND
       EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'hr_super_admin') THEN
        REVOKE hr_admin FROM hr_super_admin;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'hr_super_admin') AND
       EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'postgraphile_app') THEN
        REVOKE hr_super_admin FROM postgraphile_app;
    END IF;
END $$;

-- ============================================================================
-- STEP 4: Drop old roles
-- ============================================================================

DO $$
BEGIN
    -- Drop old roles in reverse dependency order
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'hr_super_admin') THEN
        DROP ROLE hr_super_admin;
        RAISE NOTICE '✓ Dropped role hr_super_admin';
    END IF;

    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'hr_admin') THEN
        DROP ROLE hr_admin;
        RAISE NOTICE '✓ Dropped role hr_admin';
    END IF;

    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'hr_manager') THEN
        DROP ROLE hr_manager;
        RAISE NOTICE '✓ Dropped role hr_manager';
    END IF;

    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'hr_employee') THEN
        DROP ROLE hr_employee;
        RAISE NOTICE '✓ Dropped role hr_employee';
    END IF;

    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'hr_guest') THEN
        DROP ROLE hr_guest;
        RAISE NOTICE '✓ Dropped role hr_guest';
    END IF;
END $$;

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

    RAISE NOTICE '=== Old role cleanup completed successfully ===';
END $$;
