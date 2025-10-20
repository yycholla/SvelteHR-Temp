-- Validation Script for SvelteHR Database Migrations
-- Run this after applying all migrations to verify correctness

BEGIN;

-- ============================================================================
-- 1. Verify Schema Exists
-- ============================================================================
SELECT 'Checking schemas...' as step;

DO $$
DECLARE
    schema_count INT;
BEGIN
    SELECT COUNT(*) INTO schema_count
    FROM information_schema.schemata
    WHERE schema_name IN ('hr_public', 'hr_private', 'hr_hidden');

    IF schema_count != 3 THEN
        RAISE EXCEPTION 'Expected 3 schemas (hr_public, hr_private, hr_hidden), found %', schema_count;
    END IF;

    RAISE NOTICE '✓ All 3 schemas exist';
END $$;

-- ============================================================================
-- 2. Verify Table Count
-- ============================================================================
SELECT 'Checking table count...' as step;

DO $$
DECLARE
    table_count INT;
BEGIN
    SELECT COUNT(*) INTO table_count
    FROM pg_tables
    WHERE schemaname = 'hr_public';

    IF table_count < 49 THEN
        RAISE EXCEPTION 'Expected 49+ tables in hr_public, found %', table_count;
    END IF;

    RAISE NOTICE '✓ Found % tables in hr_public schema', table_count;
END $$;

-- ============================================================================
-- 3. Verify ENUM Types
-- ============================================================================
SELECT 'Checking ENUM types...' as step;

DO $$
DECLARE
    enum_count INT;
BEGIN
    SELECT COUNT(*) INTO enum_count
    FROM pg_type
    WHERE typnamespace = 'hr_public'::regnamespace
    AND typtype = 'e';

    IF enum_count < 13 THEN
        RAISE EXCEPTION 'Expected 13+ ENUM types, found %', enum_count;
    END IF;

    RAISE NOTICE '✓ Found % ENUM types', enum_count;
END $$;

-- ============================================================================
-- 4. Verify Core Tables Exist
-- ============================================================================
SELECT 'Checking core tables...' as step;

DO $$
DECLARE
    missing_tables TEXT[] := ARRAY[]::TEXT[];
    core_tables TEXT[] := ARRAY[
        'users', 'roles', 'permissions', 'role_permissions', 'user_role_assignments',
        'sessions', 'user_sessions', 'departments', 'leave_types', 'time_off_policies',
        'time_off_balances', 'leave_requests', 'tasks', 'task_types', 'task_assignees',
        'task_dependencies', 'task_audit_entries', 'events', 'event_attendees',
        'event_waitlist', 'event_comments', 'event_history', 'documents',
        'document_categories', 'documents_versions', 'document_assignments',
        'document_access_logs', 'encrypted_file_storage', 'performance_reviews',
        'review_cycles', 'review_templates', 'review_goals', 'review_feedback',
        'emergency_contacts', 'employee_skills', 'employee_certifications',
        'employee_vehicles', 'employee_goals', 'attendance_records', 'activity_logs',
        'rollback_requests', 'bulk_rollback_batches', 'bulk_rollback_items',
        'payroll_records', 'compensation_bands', 'hr_reports', 'encryption_keys',
        'linked_resources', 'notifications', 'system_settings'
    ];
    table_name TEXT;
    table_exists BOOLEAN;
BEGIN
    FOREACH table_name IN ARRAY core_tables
    LOOP
        SELECT EXISTS (
            SELECT 1 FROM pg_tables
            WHERE schemaname = 'hr_public' AND tablename = table_name
        ) INTO table_exists;

        IF NOT table_exists THEN
            missing_tables := array_append(missing_tables, table_name);
        END IF;
    END LOOP;

    IF array_length(missing_tables, 1) > 0 THEN
        RAISE EXCEPTION 'Missing tables: %', array_to_string(missing_tables, ', ');
    END IF;

    RAISE NOTICE '✓ All core tables exist';
END $$;

-- ============================================================================
-- 5. Verify Foreign Key Constraints
-- ============================================================================
SELECT 'Checking foreign keys...' as step;

DO $$
DECLARE
    fk_count INT;
BEGIN
    SELECT COUNT(*) INTO fk_count
    FROM pg_constraint
    WHERE contype = 'f' AND connamespace = 'hr_public'::regnamespace;

    IF fk_count < 60 THEN
        RAISE EXCEPTION 'Expected 60+ foreign key constraints, found %', fk_count;
    END IF;

    RAISE NOTICE '✓ Found % foreign key constraints', fk_count;
END $$;

-- ============================================================================
-- 6. Verify Indexes
-- ============================================================================
SELECT 'Checking indexes...' as step;

DO $$
DECLARE
    index_count INT;
BEGIN
    SELECT COUNT(*) INTO index_count
    FROM pg_indexes
    WHERE schemaname = 'hr_public';

    IF index_count < 180 THEN
        RAISE EXCEPTION 'Expected 180+ indexes, found %', index_count;
    END IF;

    RAISE NOTICE '✓ Found % indexes', index_count;
END $$;

-- ============================================================================
-- 7. Verify Triggers
-- ============================================================================
SELECT 'Checking triggers...' as step;

DO $$
DECLARE
    trigger_count INT;
BEGIN
    SELECT COUNT(*) INTO trigger_count
    FROM pg_trigger t
    WHERE tgrelid::regclass::text LIKE 'hr_public.%';

    IF trigger_count < 45 THEN
        RAISE EXCEPTION 'Expected 45+ triggers, found %', trigger_count;
    END IF;

    RAISE NOTICE '✓ Found % triggers', trigger_count;
END $$;

-- ============================================================================
-- 8. Verify Extensions
-- ============================================================================
SELECT 'Checking extensions...' as step;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'uuid-ossp') THEN
        RAISE EXCEPTION 'Extension uuid-ossp not installed';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto') THEN
        RAISE EXCEPTION 'Extension pgcrypto not installed';
    END IF;

    RAISE NOTICE '✓ Required extensions installed';
END $$;

-- ============================================================================
-- 9. Verify Specific Critical Tables
-- ============================================================================
SELECT 'Checking critical table structures...' as step;

-- Check users table has all required columns
DO $$
DECLARE
    column_count INT;
BEGIN
    SELECT COUNT(*) INTO column_count
    FROM information_schema.columns
    WHERE table_schema = 'hr_public' AND table_name = 'users';

    IF column_count < 23 THEN
        RAISE EXCEPTION 'users table should have 23+ columns, found %', column_count;
    END IF;

    RAISE NOTICE '✓ users table has % columns', column_count;
END $$;

-- Check tasks table
DO $$
DECLARE
    column_count INT;
BEGIN
    SELECT COUNT(*) INTO column_count
    FROM information_schema.columns
    WHERE table_schema = 'hr_public' AND table_name = 'tasks';

    IF column_count < 22 THEN
        RAISE EXCEPTION 'tasks table should have 22+ columns, found %', column_count;
    END IF;

    RAISE NOTICE '✓ tasks table has % columns', column_count;
END $$;

-- Check events table
DO $$
DECLARE
    column_count INT;
BEGIN
    SELECT COUNT(*) INTO column_count
    FROM information_schema.columns
    WHERE table_schema = 'hr_public' AND table_name = 'events';

    IF column_count < 21 THEN
        RAISE EXCEPTION 'events table should have 21+ columns, found %', column_count;
    END IF;

    RAISE NOTICE '✓ events table has % columns', column_count;
END $$;

-- ============================================================================
-- 10. Verify ENUM Values
-- ============================================================================
SELECT 'Checking ENUM values...' as step;

-- Check task_status ENUM
DO $$
DECLARE
    value_count INT;
BEGIN
    SELECT COUNT(*) INTO value_count
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'task_status' AND t.typnamespace = 'hr_public'::regnamespace;

    IF value_count != 6 THEN
        RAISE EXCEPTION 'task_status should have 6 values, found %', value_count;
    END IF;

    RAISE NOTICE '✓ task_status ENUM has % values', value_count;
END $$;

-- Check event_type ENUM
DO $$
DECLARE
    value_count INT;
BEGIN
    SELECT COUNT(*) INTO value_count
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'event_type' AND t.typnamespace = 'hr_public'::regnamespace;

    IF value_count != 9 THEN
        RAISE EXCEPTION 'event_type should have 9 values, found %', value_count;
    END IF;

    RAISE NOTICE '✓ event_type ENUM has % values', value_count;
END $$;

-- ============================================================================
-- FINAL SUMMARY
-- ============================================================================
SELECT 'Generating summary report...' as step;

WITH
schemas AS (
    SELECT COUNT(*) as count FROM information_schema.schemata
    WHERE schema_name IN ('hr_public', 'hr_private', 'hr_hidden')
),
tables AS (
    SELECT COUNT(*) as count FROM pg_tables WHERE schemaname = 'hr_public'
),
enums AS (
    SELECT COUNT(*) as count FROM pg_type
    WHERE typnamespace = 'hr_public'::regnamespace AND typtype = 'e'
),
fkeys AS (
    SELECT COUNT(*) as count FROM pg_constraint
    WHERE contype = 'f' AND connamespace = 'hr_public'::regnamespace
),
indexes AS (
    SELECT COUNT(*) as count FROM pg_indexes WHERE schemaname = 'hr_public'
),
triggers AS (
    SELECT COUNT(*) as count FROM pg_trigger
    WHERE tgrelid::regclass::text LIKE 'hr_public.%'
)
SELECT
    '========================================' as summary_line
UNION ALL SELECT 'DATABASE VALIDATION SUMMARY'
UNION ALL SELECT '========================================'
UNION ALL SELECT ''
UNION ALL SELECT '✓ Schemas: ' || schemas.count::TEXT FROM schemas
UNION ALL SELECT '✓ Tables: ' || tables.count::TEXT FROM tables
UNION ALL SELECT '✓ ENUM Types: ' || enums.count::TEXT FROM enums
UNION ALL SELECT '✓ Foreign Keys: ' || fkeys.count::TEXT FROM fkeys
UNION ALL SELECT '✓ Indexes: ' || indexes.count::TEXT FROM indexes
UNION ALL SELECT '✓ Triggers: ' || triggers.count::TEXT FROM triggers
UNION ALL SELECT ''
UNION ALL SELECT '========================================'
UNION ALL SELECT 'ALL VALIDATIONS PASSED ✓'
UNION ALL SELECT '========================================';

ROLLBACK;  -- This is a read-only validation script
