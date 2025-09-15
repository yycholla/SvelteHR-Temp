-- PostgreSQL Schema Contract Test
-- This test validates the database schema structure matches the data model specification
-- MUST FAIL until schema is implemented in T047

\echo 'Testing PostgreSQL schema contract...'

-- Test required extensions exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'uuid-ossp') THEN
        RAISE EXCEPTION 'Extension uuid-ossp not found';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto') THEN
        RAISE EXCEPTION 'Extension pgcrypto not found';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_stat_statements') THEN
        RAISE EXCEPTION 'Extension pg_stat_statements not found';
    END IF;
END $$;

-- Test required enums exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'onboarding_status') THEN
        RAISE EXCEPTION 'Enum onboarding_status not found';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pay_type') THEN
        RAISE EXCEPTION 'Enum pay_type not found';
    END IF;
END $$;

-- Test core tables exist with correct structure
DO $$
BEGIN
    -- Users table
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        RAISE EXCEPTION 'Table users not found';
    END IF;
    
    -- Check users table has required columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'id' AND data_type = 'uuid') THEN
        RAISE EXCEPTION 'Users table missing uuid id column';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'email' AND is_nullable = 'NO') THEN
        RAISE EXCEPTION 'Users table missing required email column';
    END IF;
    
    -- Departments table
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'departments') THEN
        RAISE EXCEPTION 'Table departments not found';
    END IF;
    
    -- User roles table
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_roles') THEN
        RAISE EXCEPTION 'Table user_roles not found';
    END IF;
    
    -- Job information table
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'job_information') THEN
        RAISE EXCEPTION 'Table job_information not found';
    END IF;
    
    -- Compensation table
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'compensation') THEN
        RAISE EXCEPTION 'Table compensation not found';
    END IF;
END $$;

-- Test required indexes exist for performance
DO $$
BEGIN
    -- Users email index
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'users' AND indexname = 'idx_users_email') THEN
        RAISE EXCEPTION 'Performance index idx_users_email not found';
    END IF;
    
    -- Departments name index
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'departments' AND indexname = 'idx_departments_name') THEN
        RAISE EXCEPTION 'Performance index idx_departments_name not found';
    END IF;
    
    -- Job information department index
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'job_information' AND indexname = 'idx_job_info_department') THEN
        RAISE EXCEPTION 'Performance index idx_job_info_department not found';
    END IF;
END $$;

-- Test foreign key constraints exist
DO $$
BEGIN
    -- Check user_role_assignments has foreign keys
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE table_name = 'user_role_assignments' AND constraint_type = 'FOREIGN KEY') THEN
        RAISE EXCEPTION 'user_role_assignments table missing foreign key constraints';
    END IF;
    
    -- Check job_information has department foreign key
    IF NOT EXISTS (SELECT 1 FROM information_schema.referential_constraints rc
                   JOIN information_schema.key_column_usage kcu 
                   ON rc.constraint_name = kcu.constraint_name
                   WHERE kcu.table_name = 'job_information' AND kcu.column_name = 'department_id') THEN
        RAISE EXCEPTION 'job_information table missing department_id foreign key';
    END IF;
END $$;

-- Test views exist for computed properties
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'departments_with_stats') THEN
        RAISE EXCEPTION 'View departments_with_stats not found';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'users_with_roles') THEN
        RAISE EXCEPTION 'View users_with_roles not found';
    END IF;
END $$;

-- Test triggers exist for updated_at columns
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.triggers 
                   WHERE trigger_name = 'update_users_updated_at') THEN
        RAISE EXCEPTION 'Trigger update_users_updated_at not found';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.triggers 
                   WHERE trigger_name = 'update_departments_updated_at') THEN
        RAISE EXCEPTION 'Trigger update_departments_updated_at not found';
    END IF;
END $$;

-- Test sample data exists
DO $$
BEGIN
    -- Check admin user exists
    IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@svelteHR.com') THEN
        RAISE EXCEPTION 'Admin user not seeded in users table';
    END IF;
    
    -- Check sample roles exist
    IF (SELECT COUNT(*) FROM user_roles) < 5 THEN
        RAISE EXCEPTION 'Insufficient roles seeded (expected at least 5)';
    END IF;
    
    -- Check sample departments exist
    IF (SELECT COUNT(*) FROM departments WHERE is_active = true) < 3 THEN
        RAISE EXCEPTION 'Insufficient active departments seeded (expected at least 3)';
    END IF;
END $$;

\echo 'PostgreSQL schema contract test completed successfully!';