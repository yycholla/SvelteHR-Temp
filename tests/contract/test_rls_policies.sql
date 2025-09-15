-- Row-Level Security Policies Contract Test
-- This test validates RLS policies are correctly implemented for data security
-- MUST FAIL until RLS policies are implemented in T049

\echo 'Testing Row-Level Security policies contract...'

-- Test RLS is enabled on all sensitive tables
DO $$
BEGIN
    -- Users table RLS
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'users' AND rowsecurity = true) THEN
        RAISE EXCEPTION 'Row-Level Security not enabled on users table';
    END IF;
    
    -- Departments table RLS
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'departments' AND rowsecurity = true) THEN
        RAISE EXCEPTION 'Row-Level Security not enabled on departments table';
    END IF;
    
    -- Job information table RLS
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'job_information' AND rowsecurity = true) THEN
        RAISE EXCEPTION 'Row-Level Security not enabled on job_information table';
    END IF;
    
    -- Compensation table RLS (critical for salary data)
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'compensation' AND rowsecurity = true) THEN
        RAISE EXCEPTION 'Row-Level Security not enabled on compensation table';
    END IF;
    
    -- Personal information table RLS (critical for PII)
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'personal_information' AND rowsecurity = true) THEN
        RAISE EXCEPTION 'Row-Level Security not enabled on personal_information table';
    END IF;
END $$;

-- Test required RLS policies exist for users table
DO $$
BEGIN
    -- User can select own data policy
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'user_select_own') THEN
        RAISE EXCEPTION 'RLS policy user_select_own not found on users table';
    END IF;
    
    -- HR admin can select all users policy  
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'hr_admin_select_all_users') THEN
        RAISE EXCEPTION 'RLS policy hr_admin_select_all_users not found on users table';
    END IF;
    
    -- Manager can select department users policy
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'manager_select_department_users') THEN
        RAISE EXCEPTION 'RLS policy manager_select_department_users not found on users table';
    END IF;
END $$;

-- Test compensation table has strict RLS policies
DO $$
BEGIN
    -- User can select own compensation policy
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'compensation' AND policyname = 'user_select_own_compensation') THEN
        RAISE EXCEPTION 'RLS policy user_select_own_compensation not found on compensation table';
    END IF;
    
    -- Only HR admin can access all compensation policy
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'compensation' AND policyname = 'hr_admin_compensation_access') THEN
        RAISE EXCEPTION 'RLS policy hr_admin_compensation_access not found on compensation table';
    END IF;
    
    -- Finance can access for payroll policy
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'compensation' AND policyname = 'finance_compensation_access') THEN
        RAISE EXCEPTION 'RLS policy finance_compensation_access not found on compensation table';
    END IF;
END $$;

-- Test personal information has strictest RLS policies
DO $$
BEGIN
    -- User can access own personal info policy
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'personal_information' AND policyname = 'user_personal_info_access') THEN
        RAISE EXCEPTION 'RLS policy user_personal_info_access not found on personal_information table';
    END IF;
    
    -- Only HR admin can access all personal info policy
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'personal_information' AND policyname = 'hr_admin_personal_info_access') THEN
        RAISE EXCEPTION 'RLS policy hr_admin_personal_info_access not found on personal_information table';
    END IF;
END $$;

-- Test department RLS policies
DO $$
BEGIN
    -- All authenticated users can see active departments policy
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'departments' AND policyname = 'authenticated_select_departments') THEN
        RAISE EXCEPTION 'RLS policy authenticated_select_departments not found on departments table';
    END IF;
    
    -- Manager can update own department policy
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'departments' AND policyname = 'manager_update_own_department') THEN
        RAISE EXCEPTION 'RLS policy manager_update_own_department not found on departments table';
    END IF;
END $$;

-- Test helper functions exist for RLS policies
DO $$
BEGIN
    -- Function to check if user has specific role
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'current_user_has_role') THEN
        RAISE EXCEPTION 'RLS helper function current_user_has_role not found';
    END IF;
    
    -- Function to check if user manages department
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'current_user_manages_department') THEN
        RAISE EXCEPTION 'RLS helper function current_user_manages_department not found';
    END IF;
END $$;

-- Test audit log table has proper RLS
DO $$
BEGIN
    -- Audit log RLS enabled
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'audit_log' AND rowsecurity = true) THEN
        RAISE EXCEPTION 'Row-Level Security not enabled on audit_log table';
    END IF;
    
    -- Only admins can access audit logs policy
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'audit_log' AND policyname = 'admin_audit_log_access') THEN
        RAISE EXCEPTION 'RLS policy admin_audit_log_access not found on audit_log table';
    END IF;
END $$;

-- Test authentication tables have proper RLS
DO $$
BEGIN
    -- Auth sessions RLS
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'auth_sessions' AND rowsecurity = true) THEN
        RAISE EXCEPTION 'Row-Level Security not enabled on auth_sessions table';
    END IF;
    
    -- User can only see own sessions policy
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'auth_sessions' AND policyname = 'user_own_sessions') THEN
        RAISE EXCEPTION 'RLS policy user_own_sessions not found on auth_sessions table';
    END IF;
END $$;

-- Test RLS policies use Hasura session variables
DO $$
DECLARE
    policy_definition TEXT;
BEGIN
    -- Check that policies reference hasura session variables
    SELECT INTO policy_definition definition 
    FROM pg_policies 
    WHERE tablename = 'users' AND policyname = 'user_select_own' 
    LIMIT 1;
    
    IF policy_definition IS NULL THEN
        RAISE EXCEPTION 'Cannot find user_select_own policy definition';
    END IF;
    
    -- Check if policy uses hasura.user-id session variable
    IF position('hasura.user-id' in policy_definition) = 0 THEN
        RAISE EXCEPTION 'RLS policy does not use hasura.user-id session variable';
    END IF;
END $$;

\echo 'Row-Level Security policies contract test completed successfully!';