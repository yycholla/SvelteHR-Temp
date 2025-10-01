-- ============================================================================
-- SvelteHR Development Seed Data
-- Purpose: Populate database with realistic test data for development
-- Tables: users, employee_goals, performance_reviews, leave_requests, tasks
-- ============================================================================

-- ============================================================================
-- 1. SEED USERS (Employees across departments)
-- ============================================================================
-- Note: Password for all test users is 'password123' (hashed with bcrypt)

-- Engineering Department Employees
INSERT INTO hr_public.users (id, email, password_hash, first_name, last_name, role, department_id, hire_date, is_active, created_at, updated_at)
SELECT
    gen_random_uuid(),
    email,
    crypt('password123', gen_salt('bf')),
    first_name,
    last_name,
    role,
    dept.id,
    hire_date,
    true,
    NOW(),
    NOW()
FROM (VALUES
    ('sarah.chen@company.com', 'Sarah', 'Chen', 'hr_employee', '2022-03-15'),
    ('mike.rodriguez@company.com', 'Mike', 'Rodriguez', 'hr_employee', '2021-07-01'),
    ('emily.watson@company.com', 'Emily', 'Watson', 'hr_manager', '2020-01-10'),
    ('david.kim@company.com', 'David', 'Kim', 'hr_employee', '2023-02-01'),
    ('jessica.patel@company.com', 'Jessica', 'Patel', 'hr_employee', '2022-09-20')
) AS temp(email, first_name, last_name, role, hire_date)
CROSS JOIN (SELECT id FROM hr_public.departments WHERE name = 'Engineering' LIMIT 1) AS dept
ON CONFLICT (email) DO NOTHING;

-- Sales Department Employees
INSERT INTO hr_public.users (id, email, password_hash, first_name, last_name, role, department_id, hire_date, is_active, created_at, updated_at)
SELECT
    gen_random_uuid(),
    email,
    crypt('password123', gen_salt('bf')),
    first_name,
    last_name,
    role,
    dept.id,
    hire_date,
    true,
    NOW(),
    NOW()
FROM (VALUES
    ('james.thompson@company.com', 'James', 'Thompson', 'hr_manager', '2019-05-15'),
    ('lisa.martinez@company.com', 'Lisa', 'Martinez', 'hr_employee', '2021-11-03'),
    ('robert.anderson@company.com', 'Robert', 'Anderson', 'hr_employee', '2022-04-12'),
    ('amanda.brown@company.com', 'Amanda', 'Brown', 'hr_employee', '2023-01-20')
) AS temp(email, first_name, last_name, role, hire_date)
CROSS JOIN (SELECT id FROM hr_public.departments WHERE name = 'Sales' LIMIT 1) AS dept
ON CONFLICT (email) DO NOTHING;

-- Marketing Department Employees
INSERT INTO hr_public.users (id, email, password_hash, first_name, last_name, role, department_id, hire_date, is_active, created_at, updated_at)
SELECT
    gen_random_uuid(),
    email,
    crypt('password123', gen_salt('bf')),
    first_name,
    last_name,
    role,
    dept.id,
    hire_date,
    true,
    NOW(),
    NOW()
FROM (VALUES
    ('sophia.lee@company.com', 'Sophia', 'Lee', 'hr_manager', '2020-08-01'),
    ('daniel.garcia@company.com', 'Daniel', 'Garcia', 'hr_employee', '2022-06-15'),
    ('olivia.wilson@company.com', 'Olivia', 'Wilson', 'hr_employee', '2023-03-10'),
    ('ryan.taylor@company.com', 'Ryan', 'Taylor', 'hr_employee', '2021-12-05')
) AS temp(email, first_name, last_name, role, hire_date)
CROSS JOIN (SELECT id FROM hr_public.departments WHERE name = 'Marketing' LIMIT 1) AS dept
ON CONFLICT (email) DO NOTHING;

-- HR Department Employees
INSERT INTO hr_public.users (id, email, password_hash, first_name, last_name, role, department_id, hire_date, is_active, created_at, updated_at)
SELECT
    gen_random_uuid(),
    email,
    crypt('password123', gen_salt('bf')),
    first_name,
    last_name,
    role,
    dept.id,
    hire_date,
    true,
    NOW(),
    NOW()
FROM (VALUES
    ('jennifer.white@company.com', 'Jennifer', 'White', 'hr_manager', '2019-02-15'),
    ('michael.davis@company.com', 'Michael', 'Davis', 'hr_employee', '2021-09-01'),
    ('rachel.moore@company.com', 'Rachel', 'Moore', 'hr_employee', '2022-11-20')
) AS temp(email, first_name, last_name, role, hire_date)
CROSS JOIN (SELECT id FROM hr_public.departments WHERE name = 'Human Resources' LIMIT 1) AS dept
ON CONFLICT (email) DO NOTHING;

-- ============================================================================
-- 2. SEED EMPLOYEE GOALS (20-30 goals across departments)
-- ============================================================================

INSERT INTO hr_public.employee_goals (
    id, employee_id, title, description, target_date, status,
    progress_percentage, created_by, created_at, updated_at
)
SELECT
    gen_random_uuid(),
    emp.id,
    title,
    description,
    target_date,
    status,
    progress,
    mgr.id,
    created_at,
    NOW()
FROM (VALUES
    -- Engineering Goals (Q1 2025)
    ('Complete API Migration', 'Migrate legacy REST APIs to GraphQL with full test coverage', '2025-03-31', 'in_progress', 65),
    ('Implement OAuth2 Flow', 'Add OAuth2 authentication support for third-party integrations', '2025-02-28', 'in_progress', 40),
    ('Database Optimization', 'Optimize slow queries and add appropriate indexes', '2025-03-15', 'in_progress', 75),
    ('CI/CD Pipeline Enhancement', 'Improve deployment pipeline with automated rollback', '2025-02-15', 'completed', 100),
    ('Security Audit Remediation', 'Address all high-priority security findings', '2025-01-31', 'completed', 100),

    -- Engineering Goals (Q2 2025)
    ('Microservices Architecture', 'Break monolith into microservices starting with auth service', '2025-06-30', 'not_started', 0),
    ('Performance Monitoring', 'Implement comprehensive APM solution', '2025-05-15', 'in_progress', 25),
    ('API Documentation', 'Complete OpenAPI 3.0 spec for all endpoints', '2025-04-30', 'in_progress', 50),

    -- Sales Goals (Q1 2025)
    ('Q1 Revenue Target', 'Achieve $500K in new business revenue', '2025-03-31', 'in_progress', 70),
    ('Customer Retention', 'Maintain 95% customer retention rate', '2025-03-31', 'in_progress', 92),
    ('Pipeline Development', 'Build $2M qualified pipeline for Q2', '2025-03-31', 'in_progress', 60),
    ('Product Training', 'Complete advanced product certification', '2025-02-28', 'completed', 100),
    ('CRM Optimization', 'Improve data quality in Salesforce to 98%', '2025-03-15', 'in_progress', 80),

    -- Sales Goals (Q2 2025)
    ('Enterprise Expansion', 'Close 5 enterprise deals ($100K+ ARR)', '2025-06-30', 'not_started', 0),
    ('Partner Program Launch', 'Establish channel partner program', '2025-05-31', 'in_progress', 20),

    -- Marketing Goals (Q1 2025)
    ('Content Marketing', 'Publish 20 high-quality blog posts', '2025-03-31', 'in_progress', 75),
    ('Lead Generation', 'Generate 500 marketing qualified leads', '2025-03-31', 'in_progress', 85),
    ('Social Media Growth', 'Grow LinkedIn followers to 10K', '2025-03-31', 'in_progress', 60),
    ('Website Redesign', 'Launch new company website', '2025-02-28', 'completed', 100),
    ('Brand Refresh', 'Complete brand identity refresh project', '2025-01-31', 'completed', 100),

    -- Marketing Goals (Q2 2025)
    ('Event Marketing', 'Execute 3 major industry events', '2025-06-30', 'not_started', 0),
    ('Marketing Automation', 'Implement Marketo lead nurturing workflows', '2025-05-15', 'in_progress', 15),

    -- HR Goals (Q1 2025)
    ('Talent Acquisition', 'Hire 15 new employees across departments', '2025-03-31', 'in_progress', 60),
    ('Employee Engagement', 'Achieve 4.5+ employee satisfaction score', '2025-03-31', 'in_progress', 70),
    ('Benefits Review', 'Complete annual benefits package review', '2025-02-28', 'completed', 100),
    ('HRIS Implementation', 'Deploy new HRIS system company-wide', '2025-03-15', 'in_progress', 55),

    -- HR Goals (Q2 2025)
    ('Learning & Development', 'Launch leadership development program', '2025-06-30', 'not_started', 0),
    ('Performance Management', 'Implement OKR framework company-wide', '2025-05-31', 'in_progress', 30)
) AS goals(title, description, target_date, status, progress),
(
    SELECT u.id, u.department_id
    FROM hr_public.users u
    WHERE u.role = 'hr_employee'
    ORDER BY RANDOM()
    LIMIT 1
) AS emp,
(
    SELECT m.id
    FROM hr_public.users m
    WHERE m.role = 'hr_manager'
    AND m.department_id = emp.department_id
    LIMIT 1
) AS mgr,
LATERAL (SELECT NOW() - (RANDOM() * INTERVAL '90 days')) AS created_at_calc(created_at);

-- ============================================================================
-- 3. SEED PERFORMANCE REVIEWS (20-30 reviews)
-- ============================================================================

INSERT INTO hr_public.performance_reviews (
    id, employee_id, reviewer_id, review_period, status,
    overall_rating, goals, achievements, areas_for_improvement,
    manager_feedback, created_at, updated_at
)
SELECT
    gen_random_uuid(),
    emp.id,
    rev.id,
    review_period,
    status,
    rating,
    goals_text,
    achievements_text,
    improvement_text,
    feedback_text,
    created_at,
    NOW()
FROM (VALUES
    -- 2024 Q4 Reviews (Completed)
    ('2024-Q4', 'completed', 4.5,
     'Complete API migration, improve code coverage to 90%',
     'Successfully delivered 3 major features, mentored 2 junior developers, reduced bug rate by 40%',
     'Improve time management for large projects, enhance documentation practices',
     'Excellent technical contributions. Strong team player. Continue leadership development.'),

    ('2024-Q4', 'completed', 4.0,
     'Achieve sales quota, improve customer relationships',
     'Exceeded Q4 quota by 125%, closed 2 enterprise deals, maintained 98% customer satisfaction',
     'Develop stronger product knowledge, improve proposal writing',
     'Outstanding sales performance. Focus on longer-term strategic accounts.'),

    ('2024-Q4', 'completed', 3.5,
     'Increase marketing engagement, launch new campaigns',
     'Launched 4 successful campaigns, increased social media engagement by 60%',
     'Better alignment with sales team, more data-driven decision making',
     'Good progress on digital marketing. Need tighter coordination with sales.'),

    ('2024-Q4', 'completed', 4.8,
     'Complete hiring targets, improve onboarding process',
     'Hired 12 employees (120% of target), reduced time-to-hire by 25%, implemented new onboarding system',
     'Continue building employer brand, enhance diversity initiatives',
     'Exceptional performance. Key contributor to company growth.'),

    -- 2025 Q1 Reviews (In Progress)
    ('2025-Q1', 'in_progress', NULL,
     'Complete database optimization, implement caching layer',
     'Database optimization 75% complete, improved API response times by 35%',
     'Complete remaining optimization tasks, improve monitoring',
     NULL),

    ('2025-Q1', 'in_progress', NULL,
     'Build Q2 pipeline, maintain customer retention',
     'Pipeline at 60% of target, customer retention at 92%',
     'Accelerate pipeline development, focus on upsell opportunities',
     NULL),

    ('2025-Q1', 'in_progress', NULL,
     'Content marketing execution, lead generation',
     'Published 15/20 blog posts, generated 425 MQLs',
     'Meet content publishing targets, improve lead quality',
     NULL),

    ('2025-Q1', 'in_progress', NULL,
     'Talent acquisition, employee engagement initiatives',
     'Hired 9/15 targets, employee satisfaction at 4.3',
     'Accelerate hiring for critical roles, improve engagement score',
     NULL)
) AS reviews(review_period, status, rating, goals_text, achievements_text, improvement_text, feedback_text)
CROSS JOIN LATERAL (
    SELECT u.id, u.department_id
    FROM hr_public.users u
    WHERE u.role = 'hr_employee'
    ORDER BY RANDOM()
    LIMIT 1
) AS emp
CROSS JOIN LATERAL (
    SELECT m.id
    FROM hr_public.users m
    WHERE m.role = 'hr_manager'
    AND m.department_id = emp.department_id
    LIMIT 1
) AS rev
CROSS JOIN LATERAL (
    SELECT
        CASE
            WHEN status = 'completed' THEN NOW() - (RANDOM() * INTERVAL '120 days')
            ELSE NOW() - (RANDOM() * INTERVAL '30 days')
        END AS created_at
) AS created_at_calc;

-- ============================================================================
-- 4. SEED LEAVE REQUESTS (30-40 requests with various statuses)
-- ============================================================================

INSERT INTO hr_public.leave_requests (
    id, employee_id, manager_id, leave_type, start_date, end_date,
    days_requested, status, reason, manager_comments, created_at, updated_at
)
SELECT
    gen_random_uuid(),
    emp.id,
    mgr.id,
    leave_type,
    start_date,
    end_date,
    (end_date - start_date) + 1,
    status,
    reason,
    comments,
    created_at,
    NOW()
FROM (VALUES
    -- Recent approved requests
    ('annual'::hr_public.leave_type, '2025-03-10', '2025-03-14', 'approved',
     'Family vacation in Hawaii', 'Approved. Enjoy your trip!'),
    ('annual'::hr_public.leave_type, '2025-04-15', '2025-04-19', 'approved',
     'Spring break with family', 'Approved. Have a great time.'),
    ('sick'::hr_public.leave_type, '2025-01-15', '2025-01-16', 'approved',
     'Flu symptoms', 'Hope you feel better soon.'),
    ('personal'::hr_public.leave_type, '2025-02-20', '2025-02-20', 'approved',
     'Personal appointment', 'Approved.'),

    -- Pending requests
    ('annual'::hr_public.leave_type, '2025-06-01', '2025-06-14', 'pending',
     'Summer vacation in Europe', NULL),
    ('annual'::hr_public.leave_type, '2025-05-20', '2025-05-23', 'pending',
     'Long weekend getaway', NULL),
    ('maternity'::hr_public.leave_type, '2025-07-01', '2025-09-30', 'pending',
     'Maternity leave', NULL),
    ('personal'::hr_public.leave_type, '2025-04-10', '2025-04-11', 'pending',
     'Moving to new apartment', NULL),

    -- Recent rejected requests
    ('annual'::hr_public.leave_type, '2025-02-10', '2025-02-14', 'rejected',
     'Short notice vacation', 'Cannot approve - critical project deadline.'),

    -- Older approved requests
    ('annual'::hr_public.leave_type, '2024-12-23', '2025-01-02', 'approved',
     'Year-end holidays', 'Approved. Happy holidays!'),
    ('annual'::hr_public.leave_type, '2024-11-25', '2024-11-29', 'approved',
     'Thanksgiving week', 'Approved.'),
    ('sick'::hr_public.leave_type, '2024-10-15', '2024-10-17', 'approved',
     'Medical appointment and recovery', 'Hope everything went well.')
) AS leaves(leave_type, start_date, end_date, status, reason, comments)
CROSS JOIN LATERAL (
    SELECT u.id, u.department_id
    FROM hr_public.users u
    WHERE u.role IN ('hr_employee', 'hr_manager')
    AND u.email != 'admin@mountainhr.dev'
    ORDER BY RANDOM()
    LIMIT 1
) AS emp
CROSS JOIN LATERAL (
    SELECT m.id
    FROM hr_public.users m
    WHERE m.role = 'hr_manager'
    AND m.department_id = emp.department_id
    AND m.id != emp.id
    LIMIT 1
) AS mgr
CROSS JOIN LATERAL (
    SELECT
        CASE
            WHEN status = 'pending' THEN NOW() - (RANDOM() * INTERVAL '7 days')
            ELSE start_date - (RANDOM() * INTERVAL '30 days')
        END AS created_at
) AS created_at_calc;

-- ============================================================================
-- 5. SEED TASKS (40-50 tasks with various priorities and statuses)
-- ============================================================================

INSERT INTO hr_public.tasks (
    id, assignee_id, assigner_id, department_id, title, description,
    priority, status, due_date, created_at, updated_at, completed_at
)
SELECT
    gen_random_uuid(),
    assignee.id,
    manager.id,
    dept.id,
    title,
    description,
    priority,
    status,
    due_date,
    created_at,
    NOW(),
    CASE WHEN status = 'completed' THEN NOW() - (RANDOM() * INTERVAL '10 days') ELSE NULL END
FROM (VALUES
    -- Engineering Tasks
    ('Urgent', 'Code Review: Authentication Module', 'Review PR #234 for OAuth2 implementation', 'urgent'::hr_public.task_priority, 'todo', CURRENT_DATE + INTERVAL '1 day'),
    ('High', 'Fix Production Bug: Memory Leak', 'Investigate and fix memory leak in worker process', 'high'::hr_public.task_priority, 'in_progress', CURRENT_DATE + INTERVAL '2 days'),
    ('Medium', 'Update Dependencies', 'Update all npm packages to latest stable versions', 'medium'::hr_public.task_priority, 'todo', CURRENT_DATE + INTERVAL '7 days'),
    ('High', 'Database Migration', 'Create migration for new performance_metrics table', 'high'::hr_public.task_priority, 'completed', CURRENT_DATE - INTERVAL '5 days'),
    ('Medium', 'API Documentation', 'Document new GraphQL mutations for goals module', 'medium'::hr_public.task_priority, 'completed', CURRENT_DATE - INTERVAL '10 days'),
    ('Low', 'Refactor Legacy Code', 'Refactor user authentication helper functions', 'low'::hr_public.task_priority, 'todo', CURRENT_DATE + INTERVAL '30 days'),
    ('Medium', 'Write Unit Tests', 'Add test coverage for reports module', 'medium'::hr_public.task_priority, 'in_progress', CURRENT_DATE + INTERVAL '5 days'),
    ('Urgent', 'Security Patch', 'Apply critical security patch to production servers', 'urgent'::hr_public.task_priority, 'completed', CURRENT_DATE - INTERVAL '2 days'),

    -- Sales Tasks
    ('High', 'Follow up: Enterprise Corp', 'Schedule demo call with VP of Operations', 'high'::hr_public.task_priority, 'todo', CURRENT_DATE + INTERVAL '1 day'),
    ('Medium', 'Prepare Q1 Forecast', 'Update pipeline forecast for executive review', 'medium'::hr_public.task_priority, 'in_progress', CURRENT_DATE + INTERVAL '3 days'),
    ('High', 'Contract Negotiation', 'Finalize terms with Global Industries deal', 'high'::hr_public.task_priority, 'in_progress', CURRENT_DATE + INTERVAL '2 days'),
    ('Medium', 'CRM Data Cleanup', 'Update and clean contact data in Salesforce', 'medium'::hr_public.task_priority, 'todo', CURRENT_DATE + INTERVAL '7 days'),
    ('Urgent', 'Proposal: Tech Solutions Inc', 'Submit final proposal before Friday deadline', 'urgent'::hr_public.task_priority, 'in_progress', CURRENT_DATE + INTERVAL '2 days'),
    ('Low', 'Training: New Product Features', 'Complete certification course on new product line', 'low'::hr_public.task_priority, 'todo', CURRENT_DATE + INTERVAL '14 days'),
    ('High', 'Customer Success Check-in', 'Quarterly business review with top 5 accounts', 'high'::hr_public.task_priority, 'completed', CURRENT_DATE - INTERVAL '7 days'),

    -- Marketing Tasks
    ('Medium', 'Blog Post: AI Trends 2025', 'Write and publish industry insights article', 'medium'::hr_public.task_priority, 'in_progress', CURRENT_DATE + INTERVAL '5 days'),
    ('High', 'Campaign Launch: Spring Sale', 'Launch email and social media campaign', 'high'::hr_public.task_priority, 'todo', CURRENT_DATE + INTERVAL '3 days'),
    ('Medium', 'Social Media Calendar', 'Plan content calendar for next month', 'medium'::hr_public.task_priority, 'todo', CURRENT_DATE + INTERVAL '7 days'),
    ('Low', 'Update Website Copy', 'Refresh landing page messaging and CTAs', 'low'::hr_public.task_priority, 'todo', CURRENT_DATE + INTERVAL '14 days'),
    ('High', 'Event Planning: Tech Summit', 'Coordinate booth setup and demos for conference', 'high'::hr_public.task_priority, 'in_progress', CURRENT_DATE + INTERVAL '10 days'),
    ('Medium', 'SEO Audit', 'Review and optimize website SEO performance', 'medium'::hr_public.task_priority, 'completed', CURRENT_DATE - INTERVAL '15 days'),
    ('Urgent', 'Press Release', 'Draft and distribute new partnership announcement', 'urgent'::hr_public.task_priority, 'completed', CURRENT_DATE - INTERVAL '5 days'),

    -- HR Tasks
    ('High', 'Interview: Senior Engineer', 'Conduct final round interviews for 3 candidates', 'high'::hr_public.task_priority, 'todo', CURRENT_DATE + INTERVAL '2 days'),
    ('Medium', 'Policy Update: Remote Work', 'Draft updated remote work policy for review', 'medium'::hr_public.task_priority, 'in_progress', CURRENT_DATE + INTERVAL '7 days'),
    ('Urgent', 'Benefits Enrollment', 'Process open enrollment changes by deadline', 'urgent'::hr_public.task_priority, 'in_progress', CURRENT_DATE + INTERVAL '1 day'),
    ('Medium', 'Onboarding Prep', 'Prepare onboarding materials for 5 new hires', 'medium'::hr_public.task_priority, 'todo', CURRENT_DATE + INTERVAL '5 days'),
    ('High', 'Performance Review Schedule', 'Schedule Q1 performance reviews for all teams', 'high'::hr_public.task_priority, 'completed', CURRENT_DATE - INTERVAL '10 days'),
    ('Low', 'Update Job Descriptions', 'Review and update all engineering job descriptions', 'low'::hr_public.task_priority, 'todo', CURRENT_DATE + INTERVAL '21 days'),
    ('Medium', 'Employee Survey', 'Launch quarterly engagement survey', 'medium'::hr_public.task_priority, 'completed', CURRENT_DATE - INTERVAL '12 days')
) AS task_data(dept_name, title, description, priority, status, due_date)
CROSS JOIN LATERAL (
    SELECT d.id, d.name
    FROM hr_public.departments d
    WHERE d.name = CASE
        WHEN dept_name IN ('Urgent', 'High', 'Medium', 'Low') THEN
            CASE (RANDOM() * 4)::int
                WHEN 0 THEN 'Engineering'
                WHEN 1 THEN 'Sales'
                WHEN 2 THEN 'Marketing'
                ELSE 'Human Resources'
            END
        ELSE dept_name
    END
    LIMIT 1
) AS dept
CROSS JOIN LATERAL (
    SELECT u.id
    FROM hr_public.users u
    WHERE u.role = 'hr_employee'
    AND u.department_id = dept.id
    ORDER BY RANDOM()
    LIMIT 1
) AS assignee
CROSS JOIN LATERAL (
    SELECT m.id
    FROM hr_public.users m
    WHERE m.role = 'hr_manager'
    AND m.department_id = dept.id
    AND m.id != assignee.id
    LIMIT 1
) AS manager
CROSS JOIN LATERAL (
    SELECT NOW() - (RANDOM() * INTERVAL '30 days') AS created_at
) AS created_at_calc;

-- ============================================================================
-- 6. SEED TIME OFF BALANCES (for all employees)
-- ============================================================================

INSERT INTO hr_public.time_off_balances (
    id, employee_id, policy_id, balance_days, used_days, year, created_at, updated_at
)
SELECT
    gen_random_uuid(),
    u.id,
    p.id,
    CASE
        WHEN p.name = 'Annual Leave' THEN 25.0 - (RANDOM() * 10)::numeric(5,2)
        WHEN p.name = 'Sick Leave' THEN 10.0 - (RANDOM() * 5)::numeric(5,2)
        WHEN p.name = 'Personal Leave' THEN 5.0 - (RANDOM() * 3)::numeric(5,2)
    END,
    CASE
        WHEN p.name = 'Annual Leave' THEN (RANDOM() * 10)::numeric(5,2)
        WHEN p.name = 'Sick Leave' THEN (RANDOM() * 5)::numeric(5,2)
        WHEN p.name = 'Personal Leave' THEN (RANDOM() * 3)::numeric(5,2)
    END,
    2025,
    NOW(),
    NOW()
FROM hr_public.users u
CROSS JOIN hr_public.time_off_policies p
WHERE u.role IN ('hr_employee', 'hr_manager')
AND u.email != 'admin@mountainhr.dev'
ON CONFLICT (employee_id, policy_id, year) DO NOTHING;

-- ============================================================================
-- 7. SEED HR REPORTS (10-15 reports with various types and statuses)
-- ============================================================================

INSERT INTO hr_public.hr_reports (
    id, creator_id, department_id, title, report_type, category,
    filters, data, status, scheduled_at, generated_at, created_at, updated_at
)
SELECT
    gen_random_uuid(),
    creator.id,
    dept.id,
    title,
    report_type,
    category,
    filters::jsonb,
    data::jsonb,
    status,
    CASE
        WHEN status = 'scheduled' THEN NOW() + (RANDOM() * INTERVAL '30 days')
        ELSE NULL
    END,
    CASE
        WHEN status = 'completed' THEN NOW() - (RANDOM() * INTERVAL '15 days')
        ELSE NULL
    END,
    created_at,
    NOW()
FROM (VALUES
    -- Employee Reports
    ('Monthly Employee Roster', 'employee', 'hr',
     '{"department":"all","includeInactive":false}',
     '{"totalEmployees":16,"byDepartment":{"Engineering":5,"Sales":4,"Marketing":4,"HR":3}}',
     'completed'),

    ('New Hires Report Q1 2025', 'employee', 'hr',
     '{"dateFrom":"2025-01-01","dateTo":"2025-03-31"}',
     '{"newHires":5,"departments":["Engineering","Sales","Marketing"]}',
     'completed'),

    ('Employee Turnover Analysis', 'employee', 'hr',
     '{"year":2024}',
     '{"turnoverRate":8.5,"voluntaryRate":6.2,"involuntaryRate":2.3}',
     'completed'),

    -- Attendance Reports
    ('Weekly Attendance Summary', 'attendance', 'operations',
     '{"week":"2025-W05","departments":["all"]}',
     '{"totalDays":80,"presentDays":76,"absences":4,"attendanceRate":95}',
     'completed'),

    ('Monthly Attendance Trends', 'attendance', 'operations',
     '{"month":"2025-01","department":"Engineering"}',
     '{"avgAttendance":96.5,"lateArrivals":3,"earlyDepartures":2}',
     'completed'),

    -- Performance Reports
    ('Q4 2024 Performance Reviews', 'performance', 'hr',
     '{"quarter":"2024-Q4","status":"completed"}',
     '{"totalReviews":12,"avgRating":4.2,"distributionByRating":{"5":2,"4":6,"3":4}}',
     'completed'),

    ('Performance Improvement Plans', 'performance', 'hr',
     '{"status":"active","department":"all"}',
     '{"activePIPs":2,"completedPIPs":5,"successRate":80}',
     'active'),

    -- Payroll Reports
    ('Monthly Payroll Summary', 'payroll', 'finance',
     '{"month":"2025-01","includeBonus":true}',
     '{"totalPayroll":125000,"employees":16,"avgSalary":7812.50}',
     'completed'),

    ('Annual Compensation Analysis', 'payroll', 'finance',
     '{"year":2024,"breakdown":"department"}',
     '{"totalCompensation":1500000,"byDepartment":{"Engineering":600000,"Sales":450000,"Marketing":300000,"HR":150000}}',
     'completed'),

    -- Compliance Reports
    ('Quarterly Compliance Audit', 'compliance', 'compliance',
     '{"quarter":"2025-Q1","areas":["GDPR","SOC2","ISO27001"]}',
     '{"complianceScore":94,"findings":3,"resolved":2}',
     'active'),

    ('Training Completion Status', 'compliance', 'compliance',
     '{"training":"Security Awareness","deadline":"2025-03-31"}',
     '{"totalEmployees":16,"completed":12,"pending":4,"completionRate":75}',
     'active'),

    -- Scheduled Reports
    ('Weekly Team Performance', 'performance', 'management',
     '{"frequency":"weekly","departments":["all"]}',
     '{}',
     'scheduled'),

    ('Monthly HR Metrics Dashboard', 'analytics', 'management',
     '{"frequency":"monthly","includeAll":true}',
     '{}',
     'scheduled')
) AS report_data(title, report_type, category, filters, data, status)
CROSS JOIN LATERAL (
    SELECT d.id
    FROM hr_public.departments d
    WHERE d.name = CASE category
        WHEN 'hr' THEN 'Human Resources'
        WHEN 'finance' THEN 'Human Resources'  -- No finance dept, use HR
        WHEN 'operations' THEN 'Engineering'
        WHEN 'management' THEN 'Engineering'
        WHEN 'compliance' THEN 'Human Resources'
        ELSE 'Human Resources'
    END
    LIMIT 1
) AS dept
CROSS JOIN LATERAL (
    SELECT m.id
    FROM hr_public.users m
    WHERE m.role IN ('hr_manager', 'hr_admin')
    AND m.department_id = dept.id
    ORDER BY RANDOM()
    LIMIT 1
) AS creator
CROSS JOIN LATERAL (
    SELECT NOW() - (RANDOM() * INTERVAL '60 days') AS created_at
) AS created_at_calc;

-- ============================================================================
-- 8. SEED REVIEW TEMPLATES (optional but useful)
-- ============================================================================

INSERT INTO hr_public.review_templates (
    id, name, description, template_data, is_active, created_by, created_at, updated_at
)
SELECT
    gen_random_uuid(),
    name,
    description,
    template_data::jsonb,
    true,
    admin.id,
    NOW(),
    NOW()
FROM (VALUES
    ('Quarterly Performance Review',
     'Standard quarterly performance review template',
     '{"sections":[{"title":"Goals","questions":["What were your primary goals this quarter?","What progress did you make?"]},{"title":"Achievements","questions":["What were your key accomplishments?","What impact did your work have?"]},{"title":"Challenges","questions":["What obstacles did you face?","How did you overcome them?"]},{"title":"Development","questions":["What skills did you develop?","What areas need improvement?"]}]}'),

    ('Annual Performance Review',
     'Comprehensive annual performance review template',
     '{"sections":[{"title":"Year in Review","questions":["Summarize your year","Major achievements and projects"]},{"title":"Goal Achievement","questions":["Goals met vs. set","Quantifiable results"]},{"title":"Core Competencies","questions":["Technical skills","Leadership abilities","Communication"]},{"title":"Career Development","questions":["Growth areas","Future goals"]}]}'),

    ('90-Day New Hire Review',
     'Initial review for new employees after 90 days',
     '{"sections":[{"title":"Onboarding Experience","questions":["How was your onboarding?","What could be improved?"]},{"title":"Role Understanding","questions":["Do you understand your role?","Are expectations clear?"]},{"title":"Integration","questions":["How are you fitting in?","Team collaboration"]},{"title":"Initial Performance","questions":["Early wins","Learning progress"]}]}')
) AS templates(name, description, template_data)
CROSS JOIN (SELECT id FROM hr_public.users WHERE email = 'admin@mountainhr.dev' LIMIT 1) AS admin
ON CONFLICT DO NOTHING;

-- ============================================================================
-- VERIFICATION QUERIES (for development testing)
-- ============================================================================

-- Count inserted records
DO $$
DECLARE
    user_count INTEGER;
    goal_count INTEGER;
    review_count INTEGER;
    leave_count INTEGER;
    task_count INTEGER;
    balance_count INTEGER;
    report_count INTEGER;
    template_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO user_count FROM hr_public.users WHERE email != 'admin@mountainhr.dev';
    SELECT COUNT(*) INTO goal_count FROM hr_public.employee_goals;
    SELECT COUNT(*) INTO review_count FROM hr_public.performance_reviews;
    SELECT COUNT(*) INTO leave_count FROM hr_public.leave_requests;
    SELECT COUNT(*) INTO task_count FROM hr_public.tasks;
    SELECT COUNT(*) INTO balance_count FROM hr_public.time_off_balances;
    SELECT COUNT(*) INTO report_count FROM hr_public.hr_reports;
    SELECT COUNT(*) INTO template_count FROM hr_public.review_templates;

    RAISE NOTICE '========================================';
    RAISE NOTICE 'Seed Data Summary:';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Users (employees): %', user_count;
    RAISE NOTICE 'Employee Goals: %', goal_count;
    RAISE NOTICE 'Performance Reviews: %', review_count;
    RAISE NOTICE 'Leave Requests: %', leave_count;
    RAISE NOTICE 'Tasks: %', task_count;
    RAISE NOTICE 'Time Off Balances: %', balance_count;
    RAISE NOTICE 'HR Reports: %', report_count;
    RAISE NOTICE 'Review Templates: %', template_count;
    RAISE NOTICE '========================================';
END $$;
