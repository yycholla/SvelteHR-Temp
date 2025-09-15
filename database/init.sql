-- Database Initialization Script for PostGraphile HR System
-- This script sets up the complete database schema and initial data
-- Execute this file to initialize a fresh database

-- Ensure we're connected to the correct database
\echo 'Initializing HR System Database...'

-- Create database if it doesn't exist (run this manually if needed)
-- CREATE DATABASE hr_system;
-- \c hr_system

-- Extensions first (require superuser privileges)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Run migrations in order
\echo 'Running migration 000: Initial setup...'
\i migrations/000_initial_setup.sql

\echo 'Running migration 001: Core tables...'
\i migrations/001_create_core_tables.sql

\echo 'Running migration 002: HR tables...'
\i migrations/002_create_hr_tables.sql

\echo 'Running migration 003: JWT types...'
\i migrations/003_create_jwt_type.sql

\echo 'Running migration 004: Roles and permissions...'
\i migrations/004_create_roles_and_permissions.sql

-- Load functions
\echo 'Loading authentication functions...'
\i functions/authenticate.sql

\echo 'Loading authentication logging functions...'
\i functions/auth_logging.sql

\echo 'Loading computed field functions...'
\i functions/computed_fields.sql

\echo 'Loading business logic functions...'
\i functions/business_logic.sql

-- Load policies
\echo 'Loading Row-Level Security policies...'
\i policies/rls_policies.sql

-- Insert initial seed data
\echo 'Inserting seed data...'

-- Create root department
INSERT INTO hr_public.departments (name, description) VALUES 
('Technology', 'Technology and Engineering Department'),
('Human Resources', 'Human Resources Department'),
('Sales', 'Sales and Business Development'),
('Marketing', 'Marketing and Communications'),
('Finance', 'Finance and Accounting');

-- Get department IDs for reference
DO $$
DECLARE
    tech_dept_id INTEGER;
    hr_dept_id INTEGER;
    sales_dept_id INTEGER;
    marketing_dept_id INTEGER;
    finance_dept_id INTEGER;
BEGIN
    SELECT id INTO tech_dept_id FROM hr_public.departments WHERE name = 'Technology';
    SELECT id INTO hr_dept_id FROM hr_public.departments WHERE name = 'Human Resources';
    SELECT id INTO sales_dept_id FROM hr_public.departments WHERE name = 'Sales';
    SELECT id INTO marketing_dept_id FROM hr_public.departments WHERE name = 'Marketing';
    SELECT id INTO finance_dept_id FROM hr_public.departments WHERE name = 'Finance';
    
    -- Create super admin user
    INSERT INTO hr_public.employees (
        first_name, last_name, email, department_id, hire_date, role_level, status
    ) VALUES (
        'System', 'Administrator', 'admin@company.com', hr_dept_id, CURRENT_DATE, 100, 'ACTIVE'
    );
    
    -- Get the super admin employee ID
    DECLARE admin_id INTEGER;
    BEGIN
        SELECT id INTO admin_id FROM hr_public.employees WHERE email = 'admin@company.com';
        
        -- Create account for super admin
        INSERT INTO hr_private.employee_account (employee_id, email, password_hash)
        VALUES (admin_id, 'admin@company.com', crypt('AdminPass123!', gen_salt('bf')));
        
        -- Initialize time-off balance for admin
        INSERT INTO hr_hidden.time_off_balances (
            employee_id, year, vacation_days_total, sick_days_total, personal_days_total
        ) VALUES (
            admin_id, EXTRACT(year FROM CURRENT_DATE)::INTEGER, 20.0, 10.0, 5.0
        );
    END;
    
    -- Create HR Manager
    INSERT INTO hr_public.employees (
        first_name, last_name, email, department_id, hire_date, role_level, status
    ) VALUES (
        'Jane', 'Smith', 'jane.smith@company.com', hr_dept_id, CURRENT_DATE - INTERVAL '2 years', 80, 'ACTIVE'
    );
    
    DECLARE hr_manager_id INTEGER;
    BEGIN
        SELECT id INTO hr_manager_id FROM hr_public.employees WHERE email = 'jane.smith@company.com';
        
        INSERT INTO hr_private.employee_account (employee_id, email, password_hash)
        VALUES (hr_manager_id, 'jane.smith@company.com', crypt('HRPass123!', gen_salt('bf')));
        
        INSERT INTO hr_hidden.time_off_balances (
            employee_id, year, vacation_days_total, sick_days_total, personal_days_total
        ) VALUES (
            hr_manager_id, EXTRACT(year FROM CURRENT_DATE)::INTEGER, 20.0, 10.0, 5.0
        );
    END;
    
    -- Create Tech Manager
    INSERT INTO hr_public.employees (
        first_name, last_name, email, department_id, manager_id, hire_date, role_level, status
    ) VALUES (
        'John', 'Doe', 'john.doe@company.com', tech_dept_id, hr_manager_id, CURRENT_DATE - INTERVAL '1 year', 60, 'ACTIVE'
    );
    
    DECLARE tech_manager_id INTEGER;
    BEGIN
        SELECT id INTO tech_manager_id FROM hr_public.employees WHERE email = 'john.doe@company.com';
        
        INSERT INTO hr_private.employee_account (employee_id, email, password_hash)
        VALUES (tech_manager_id, 'john.doe@company.com', crypt('TechPass123!', gen_salt('bf')));
        
        INSERT INTO hr_hidden.time_off_balances (
            employee_id, year, vacation_days_total, sick_days_total, personal_days_total
        ) VALUES (
            tech_manager_id, EXTRACT(year FROM CURRENT_DATE)::INTEGER, 15.0, 10.0, 5.0
        );
    END;
    
    -- Create regular employees
    INSERT INTO hr_public.employees (
        first_name, last_name, email, department_id, manager_id, hire_date, role_level, status
    ) VALUES 
    ('Alice', 'Johnson', 'alice.johnson@company.com', tech_dept_id, tech_manager_id, CURRENT_DATE - INTERVAL '6 months', 20, 'ACTIVE'),
    ('Bob', 'Wilson', 'bob.wilson@company.com', tech_dept_id, tech_manager_id, CURRENT_DATE - INTERVAL '3 months', 20, 'ACTIVE'),
    ('Carol', 'Brown', 'carol.brown@company.com', sales_dept_id, hr_manager_id, CURRENT_DATE - INTERVAL '8 months', 20, 'ACTIVE'),
    ('David', 'Davis', 'david.davis@company.com', marketing_dept_id, hr_manager_id, CURRENT_DATE - INTERVAL '4 months', 20, 'ACTIVE');
    
    -- Create accounts for regular employees
    INSERT INTO hr_private.employee_account (employee_id, email, password_hash)
    SELECT e.id, e.email, crypt('EmpPass123!', gen_salt('bf'))
    FROM hr_public.employees e
    WHERE e.email IN (
        'alice.johnson@company.com',
        'bob.wilson@company.com', 
        'carol.brown@company.com',
        'david.davis@company.com'
    );
    
    -- Initialize time-off balances for regular employees
    INSERT INTO hr_hidden.time_off_balances (employee_id, year, vacation_days_total, sick_days_total, personal_days_total)
    SELECT e.id, EXTRACT(year FROM CURRENT_DATE)::INTEGER, 15.0, 10.0, 5.0
    FROM hr_public.employees e
    WHERE e.email IN (
        'alice.johnson@company.com',
        'bob.wilson@company.com',
        'carol.brown@company.com', 
        'david.davis@company.com'
    );
    
END $$;

-- Create sample time-off request
DO $$
DECLARE
    alice_id INTEGER;
    bob_id INTEGER;
BEGIN
    SELECT id INTO alice_id FROM hr_public.employees WHERE email = 'alice.johnson@company.com';
    SELECT id INTO bob_id FROM hr_public.employees WHERE email = 'bob.wilson@company.com';
    
    -- Create a pending time-off request from Alice
    INSERT INTO hr_public.time_off_requests (
        employee_id, request_type, start_date, end_date, days_requested, reason, status
    ) VALUES (
        alice_id, 'VACATION', CURRENT_DATE + INTERVAL '2 weeks', CURRENT_DATE + INTERVAL '3 weeks', 5.0, 
        'Family vacation', 'PENDING'
    );
    
    -- Create an approved time-off request from Bob  
    INSERT INTO hr_public.time_off_requests (
        employee_id, request_type, start_date, end_date, days_requested, reason, status,
        approved_by, approved_at
    ) VALUES (
        bob_id, 'SICK', CURRENT_DATE - INTERVAL '1 week', CURRENT_DATE - INTERVAL '5 days', 3.0,
        'Flu recovery', 'APPROVED',
        (SELECT id FROM hr_public.employees WHERE email = 'john.doe@company.com'),
        CURRENT_DATE - INTERVAL '1 week'
    );
    
    -- Update time-off balance for Bob's approved request
    UPDATE hr_hidden.time_off_balances 
    SET sick_days_used = sick_days_used + 3.0
    WHERE employee_id = bob_id AND year = EXTRACT(year FROM CURRENT_DATE)::INTEGER;
END $$;

-- Create sample performance review
DO $$
DECLARE
    alice_id INTEGER;
    john_id INTEGER;
BEGIN
    SELECT id INTO alice_id FROM hr_public.employees WHERE email = 'alice.johnson@company.com';
    SELECT id INTO john_id FROM hr_public.employees WHERE email = 'john.doe@company.com';
    
    INSERT INTO hr_public.performance_reviews (
        employee_id, reviewer_id, review_period, status, overall_rating,
        goals, achievements, areas_for_improvement, feedback
    ) VALUES (
        alice_id, john_id, '2024-Annual', 'COMPLETED', 4.2,
        'Improve technical skills in React and PostgreSQL',
        'Successfully delivered 3 major features, mentored junior developer',
        'Could improve communication in team meetings',
        'Alice has shown excellent growth this year and is ready for more senior responsibilities'
    );
END $$;

-- Create sample compensation records
DO $$
DECLARE
    admin_id INTEGER;
    hr_manager_id INTEGER;
    tech_manager_id INTEGER;
    alice_id INTEGER;
    bob_id INTEGER;
BEGIN
    SELECT id INTO admin_id FROM hr_public.employees WHERE email = 'admin@company.com';
    SELECT id INTO hr_manager_id FROM hr_public.employees WHERE email = 'jane.smith@company.com';
    SELECT id INTO tech_manager_id FROM hr_public.employees WHERE email = 'john.doe@company.com';
    SELECT id INTO alice_id FROM hr_public.employees WHERE email = 'alice.johnson@company.com';
    SELECT id INTO bob_id FROM hr_public.employees WHERE email = 'bob.wilson@company.com';
    
    INSERT INTO hr_private.employee_compensation (
        employee_id, base_salary, currency, salary_type, effective_date, created_by
    ) VALUES
    (admin_id, 150000.00, 'USD', 'ANNUAL', CURRENT_DATE - INTERVAL '2 years', admin_id),
    (hr_manager_id, 120000.00, 'USD', 'ANNUAL', CURRENT_DATE - INTERVAL '2 years', admin_id),
    (tech_manager_id, 130000.00, 'USD', 'ANNUAL', CURRENT_DATE - INTERVAL '1 year', admin_id),
    (alice_id, 85000.00, 'USD', 'ANNUAL', CURRENT_DATE - INTERVAL '6 months', hr_manager_id),
    (bob_id, 75000.00, 'USD', 'ANNUAL', CURRENT_DATE - INTERVAL '3 months', hr_manager_id);
END $$;

-- Update statistics and optimize
ANALYZE;

-- Set up PostGraphile-specific settings
-- These can be used in the PostGraphile configuration

-- Create a view for PostGraphile introspection (optional)
CREATE OR REPLACE VIEW hr_public.schema_info AS
SELECT 
    'HR Management System' as system_name,
    '1.0.0' as version,
    CURRENT_TIMESTAMP as initialized_at,
    (SELECT COUNT(*) FROM hr_public.employees WHERE status = 'ACTIVE') as total_employees,
    (SELECT COUNT(*) FROM hr_public.departments) as total_departments,
    (SELECT COUNT(*) FROM hr_public.time_off_requests WHERE status = 'PENDING') as pending_requests;

COMMENT ON VIEW hr_public.schema_info IS 'System information and statistics for PostGraphile';

-- Grant access to the view
GRANT SELECT ON hr_public.schema_info TO hr_employee;

\echo 'Database initialization completed successfully!'
\echo 'Default accounts created:'
\echo '  - Super Admin: admin@company.com / AdminPass123!'
\echo '  - HR Manager: jane.smith@company.com / HRPass123!'
\echo '  - Tech Manager: john.doe@company.com / TechPass123!'
\echo '  - Employee: alice.johnson@company.com / EmpPass123!'
\echo '  - Employee: bob.wilson@company.com / EmpPass123!'
\echo '  - Employee: carol.brown@company.com / EmpPass123!'
\echo '  - Employee: david.davis@company.com / EmpPass123!'
\echo ''
\echo 'IMPORTANT: Change all default passwords in production!'
\echo 'Next step: Configure PostGraphile server with the postgraphile_app role.'