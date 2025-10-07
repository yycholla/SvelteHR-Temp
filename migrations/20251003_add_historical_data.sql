-- ============================================================================
-- Add Historical Data for Management Dashboard
-- Purpose: Populate historical data spanning past 12 months for realistic metrics
-- Created: 2025-10-03
-- ============================================================================

-- ============================================================================
-- 1. HISTORICAL LEAVE REQUESTS (Past 12 months)
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
    start_date::date,
    end_date::date,
    (end_date::date - start_date::date) + 1,
    status::hr_public.leave_status,
    reason,
    comments,
    created_at,
    NOW()
FROM (VALUES
    -- 2024 January - March (Q1)
    ('annual'::hr_public.leave_type, '2024-01-08', '2024-01-12', 'approved',
     'New Year extended break', 'Approved.', '2023-12-15'),
    ('sick'::hr_public.leave_type, '2024-01-22', '2024-01-23', 'approved',
     'Seasonal flu', 'Get well soon.', '2024-01-22'),
    ('annual'::hr_public.leave_type, '2024-02-14', '2024-02-16', 'approved',
     'Valentine''s weekend trip', 'Approved.', '2024-01-25'),
    ('sick'::hr_public.leave_type, '2024-02-20', '2024-02-21', 'approved',
     'Doctor appointment and recovery', 'Hope it went well.', '2024-02-19'),
    ('personal'::hr_public.leave_type, '2024-03-05', '2024-03-05', 'approved',
     'DMV appointment', 'Approved.', '2024-02-28'),
    ('annual'::hr_public.leave_type, '2024-03-18', '2024-03-22', 'approved',
     'Spring break with kids', 'Enjoy!', '2024-02-15'),
    ('annual'::hr_public.leave_type, '2024-03-25', '2024-03-29', 'rejected',
     'Last minute trip', 'Cannot approve - project deadline.', '2024-03-20'),

    -- 2024 April - June (Q2)
    ('annual'::hr_public.leave_type, '2024-04-01', '2024-04-05', 'approved',
     'Easter week vacation', 'Approved. Have a great time.', '2024-03-10'),
    ('sick'::hr_public.leave_type, '2024-04-15', '2024-04-16', 'approved',
     'Migraine', 'Feel better.', '2024-04-15'),
    ('annual'::hr_public.leave_type, '2024-05-20', '2024-05-24', 'approved',
     'Memorial Day week', 'Approved.', '2024-04-20'),
    ('personal'::hr_public.leave_type, '2024-05-10', '2024-05-10', 'approved',
     'House closing', 'Congratulations!', '2024-05-05'),
    ('annual'::hr_public.leave_type, '2024-06-10', '2024-06-21', 'approved',
     'Summer vacation - Europe', 'Approved. Safe travels.', '2024-04-15'),
    ('sick'::hr_public.leave_type, '2024-06-25', '2024-06-26', 'approved',
     'Food poisoning', 'Rest up.', '2024-06-25'),

    -- 2024 July - September (Q3)
    ('annual'::hr_public.leave_type, '2024-07-01', '2024-07-05', 'approved',
     'July 4th holiday week', 'Approved.', '2024-06-01'),
    ('annual'::hr_public.leave_type, '2024-07-15', '2024-07-26', 'approved',
     'Family reunion and vacation', 'Approved. Enjoy your time.', '2024-05-20'),
    ('sick'::hr_public.leave_type, '2024-07-30', '2024-07-31', 'approved',
     'Summer cold', 'Get well.', '2024-07-30'),
    ('annual'::hr_public.leave_type, '2024-08-05', '2024-08-16', 'approved',
     'Summer break with family', 'Approved.', '2024-06-15'),
    ('personal'::hr_public.leave_type, '2024-08-20', '2024-08-21', 'approved',
     'Wedding attendance', 'Congratulations to the couple!', '2024-08-10'),
    ('annual'::hr_public.leave_type, '2024-09-02', '2024-09-06', 'approved',
     'Labor Day extended weekend', 'Approved.', '2024-08-01'),
    ('sick'::hr_public.leave_type, '2024-09-18', '2024-09-19', 'approved',
     'Dental surgery recovery', 'Hope recovery goes well.', '2024-09-17'),

    -- 2024 October - December (Q4)
    ('annual'::hr_public.leave_type, '2024-10-14', '2024-10-18', 'approved',
     'Fall break', 'Approved. Enjoy the autumn.', '2024-09-15'),
    ('sick'::hr_public.leave_type, '2024-10-25', '2024-10-25', 'approved',
     'Medical checkup', 'Stay healthy.', '2024-10-24'),
    ('annual'::hr_public.leave_type, '2024-11-04', '2024-11-08', 'approved',
     'Diwali celebration', 'Approved. Happy Diwali!', '2024-10-10'),
    ('annual'::hr_public.leave_type, '2024-11-25', '2024-11-29', 'approved',
     'Thanksgiving week', 'Approved. Happy Thanksgiving!', '2024-10-25'),
    ('personal'::hr_public.leave_type, '2024-11-15', '2024-11-15', 'approved',
     'Parent teacher conference', 'Approved.', '2024-11-10'),
    ('annual'::hr_public.leave_type, '2024-12-23', '2025-01-03', 'approved',
     'Year-end holidays', 'Approved. Happy holidays!', '2024-11-20'),
    ('annual'::hr_public.leave_type, '2024-12-16', '2024-12-20', 'approved',
     'Pre-Christmas vacation', 'Approved. Merry Christmas!', '2024-11-15'),
    ('sick'::hr_public.leave_type, '2024-12-10', '2024-12-11', 'approved',
     'Winter flu', 'Get better soon.', '2024-12-10'),

    -- 2025 January - February (Recent)
    ('annual'::hr_public.leave_type, '2025-01-06', '2025-01-10', 'approved',
     'Post-holiday recovery', 'Approved.', '2024-12-20'),
    ('sick'::hr_public.leave_type, '2025-01-20', '2025-01-21', 'approved',
     'Flu symptoms', 'Rest well.', '2025-01-20'),
    ('annual'::hr_public.leave_type, '2025-02-10', '2025-02-14', 'approved',
     'Ski trip', 'Approved. Have fun!', '2025-01-15'),
    ('personal'::hr_public.leave_type, '2025-02-25', '2025-02-25', 'approved',
     'Car maintenance', 'Approved.', '2025-02-20'),
    ('annual'::hr_public.leave_type, '2025-02-17', '2025-02-21', 'rejected',
     'Short notice booking', 'Cannot approve - insufficient notice.', '2025-02-14')
) AS leaves(leave_type, start_date, end_date, status, reason, comments, created_date)
CROSS JOIN LATERAL (
    SELECT u.id, u.department_id
    FROM hr_public.users u
    WHERE u.role IN ('employee', 'manager')
    ORDER BY RANDOM()
    LIMIT 1
) AS emp
CROSS JOIN LATERAL (
    SELECT m.id
    FROM hr_public.users m
    WHERE m.role IN ('manager', 'admin', 'super_admin', 'hr_super_admin')
    AND (m.department_id = emp.department_id OR m.role IN ('admin', 'super_admin', 'hr_super_admin'))
    AND m.id != emp.id
    LIMIT 1
) AS mgr
CROSS JOIN LATERAL (
    SELECT created_date::timestamp AS created_at
) AS created_at_calc
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 2. HISTORICAL PERFORMANCE REVIEWS (Past 12 months)
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
    status::hr_public.review_status,
    rating,
    goals_text,
    achievements_text,
    improvement_text,
    feedback_text,
    created_at,
    NOW()
FROM (VALUES
    -- 2024 Q1 Reviews (Completed)
    ('2024-Q1', 'completed', 4.2,
     'Launch new product features, improve deployment pipeline',
     'Launched 2 major features, reduced deployment time by 40%, mentored junior developer',
     'Improve code documentation, better time estimates',
     'Strong technical execution. Good progress on mentorship.', '2024-04-15'),

    ('2024-Q1', 'completed', 3.8,
     'Achieve Q1 sales targets, improve customer retention',
     'Achieved 110% of quota, closed 3 enterprise deals, customer satisfaction at 94%',
     'Improve presentation skills, faster response times',
     'Exceeded sales goals. Continue building relationships.', '2024-04-10'),

    ('2024-Q1', 'completed', 4.0,
     'Execute marketing campaigns, increase brand awareness',
     'Ran 5 successful campaigns, social engagement up 45%, generated 350 MQLs',
     'Better cross-team collaboration, more data analysis',
     'Solid campaign execution. Good creative work.', '2024-04-12'),

    -- 2024 Q2 Reviews (Completed)
    ('2024-Q2', 'completed', 4.5,
     'Complete database migration, implement caching',
     'Migration completed on time, reduced query times by 60%, zero downtime',
     'Expand knowledge of distributed systems',
     'Excellent technical achievement. Outstanding execution.', '2024-07-20'),

    ('2024-Q2', 'completed', 4.1,
     'Build Q2 pipeline, close enterprise deals',
     'Pipeline at 180% of target, closed 4 deals, upsold 2 existing customers',
     'Improve proposal writing, faster contract negotiations',
     'Great pipeline building. Strong closer.', '2024-07-15'),

    ('2024-Q2', 'completed', 3.9,
     'Launch summer campaigns, improve SEO',
     'Summer campaign ROI 250%, organic traffic up 35%, 3 viral posts',
     'Better budget management, more strategic planning',
     'Strong campaign results. Good SEO improvements.', '2024-07-18'),

    -- 2024 Q3 Reviews (Completed)
    ('2024-Q3', 'completed', 4.3,
     'Implement microservices architecture, improve monitoring',
     'Auth service migrated successfully, full observability implemented',
     'Improve system design documentation',
     'Excellent architectural work. Strong technical leadership.', '2024-10-20'),

    ('2024-Q3', 'completed', 4.6,
     'Exceed Q3 targets, expand into new verticals',
     'Achieved 135% of quota, opened 2 new market segments, trained 2 new reps',
     'Continue leadership development',
     'Outstanding performance. Top performer this quarter.', '2024-10-15'),

    ('2024-Q3', 'completed', 4.1,
     'Fall campaign execution, event marketing',
     'Executed 3 events successfully, 500+ leads, brand awareness up 40%',
     'Better event ROI tracking, post-event nurturing',
     'Great event execution. Strong brand building.', '2024-10-18'),

    -- 2024 Q4 Reviews (Recently Completed)
    ('2024-Q4', 'completed', 4.4,
     'Complete security audit, implement fixes',
     'All critical issues resolved, security score improved to A+, compliance achieved',
     'Expand security knowledge to cloud infrastructure',
     'Excellent security work. Critical for company.', '2025-01-15'),

    ('2024-Q4', 'completed', 4.2,
     'End year strong, prepare for 2025',
     'Hit annual quota at 120%, customer retention 96%, built strong Q1 pipeline',
     'Strategic account planning, longer sales cycles',
     'Great year-end finish. Well positioned for 2025.', '2025-01-10'),

    ('2024-Q4', 'completed', 4.0,
     'Year-end campaigns, plan 2025 strategy',
     'Holiday campaign conversion 12%, 2025 strategy approved, budget increased 25%',
     'More competitive analysis, better attribution modeling',
     'Solid year-end results. Good strategic planning.', '2025-01-12')

) AS reviews(review_period, status, rating, goals_text, achievements_text, improvement_text, feedback_text, created_date)
CROSS JOIN LATERAL (
    SELECT u.id, u.department_id
    FROM hr_public.users u
    WHERE u.role IN ('employee', 'manager')
    ORDER BY RANDOM()
    LIMIT 1
) AS emp
CROSS JOIN LATERAL (
    SELECT m.id
    FROM hr_public.users m
    WHERE m.role IN ('manager', 'admin', 'super_admin', 'hr_super_admin')
    AND (m.department_id = emp.department_id OR m.role IN ('admin', 'super_admin', 'hr_super_admin'))
    AND m.id != emp.id
    LIMIT 1
) AS rev
CROSS JOIN LATERAL (
    SELECT created_date::timestamp AS created_at
) AS created_at_calc
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 3. HISTORICAL HR REPORTS (Past 12 months)
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
    'completed',
    NULL,
    generated_date::timestamp,
    created_date::timestamp,
    NOW()
FROM (VALUES
    -- Monthly Reports (Past 12 months)
    ('January 2024 Payroll Report', 'payroll', 'finance',
     '{"month":"2024-01"}',
     '{"totalPayroll":115000,"employees":14,"avgSalary":8214}',
     '2024-02-01', '2024-02-01'),

    ('February 2024 Attendance Report', 'attendance', 'operations',
     '{"month":"2024-02"}',
     '{"avgAttendance":95.2,"totalDays":280,"absences":13}',
     '2024-03-01', '2024-03-01'),

    ('March 2024 Performance Summary', 'performance', 'hr',
     '{"month":"2024-03"}',
     '{"avgRating":4.1,"reviewsCompleted":8,"pending":2}',
     '2024-04-01', '2024-04-01'),

    ('April 2024 Hiring Report', 'employee', 'hr',
     '{"month":"2024-04"}',
     '{"newHires":2,"openPositions":3,"timeToHire":28}',
     '2024-05-01', '2024-05-01'),

    ('May 2024 Payroll Report', 'payroll', 'finance',
     '{"month":"2024-05"}',
     '{"totalPayroll":118000,"employees":15,"avgSalary":7867}',
     '2024-06-01', '2024-06-01'),

    ('June 2024 Leave Balance Report', 'employee', 'hr',
     '{"month":"2024-06"}',
     '{"totalDaysUsed":85,"avgBalance":18.5,"mostUsedType":"annual"}',
     '2024-07-01', '2024-07-01'),

    ('July 2024 Attendance Report', 'attendance', 'operations',
     '{"month":"2024-07"}',
     '{"avgAttendance":92.5,"totalDays":310,"absences":23}',
     '2024-08-01', '2024-08-01'),

    ('August 2024 Performance Summary', 'performance', 'hr',
     '{"month":"2024-08"}',
     '{"avgRating":4.2,"reviewsCompleted":10,"pending":1}',
     '2024-09-01', '2024-09-01'),

    ('September 2024 Hiring Report', 'employee', 'hr',
     '{"month":"2024-09"}',
     '{"newHires":1,"openPositions":2,"timeToHire":32}',
     '2024-10-01', '2024-10-01'),

    ('October 2024 Payroll Report', 'payroll', 'finance',
     '{"month":"2024-10"}',
     '{"totalPayroll":122000,"employees":16,"avgSalary":7625}',
     '2024-11-01', '2024-11-01'),

    ('November 2024 Attendance Report', 'attendance', 'operations',
     '{"month":"2024-11"}',
     '{"avgAttendance":94.8,"totalDays":320,"absences":17}',
     '2024-12-01', '2024-12-01'),

    ('December 2024 Year End Report', 'analytics', 'management',
     '{"year":2024}',
     '{"totalHired":15,"avgRating":4.2,"turnoverRate":7.5,"attendanceRate":94.1}',
     '2025-01-05', '2025-01-05'),

    -- Quarterly Reports
    ('Q1 2024 Quarterly Business Review', 'analytics', 'management',
     '{"quarter":"2024-Q1"}',
     '{"revenue":1200000,"employeeGrowth":2,"avgRating":4.0,"customerSatisfaction":93}',
     '2024-04-10', '2024-04-10'),

    ('Q2 2024 Quarterly Business Review', 'analytics', 'management',
     '{"quarter":"2024-Q2"}',
     '{"revenue":1350000,"employeeGrowth":1,"avgRating":4.2,"customerSatisfaction":94}',
     '2024-07-10', '2024-07-10'),

    ('Q3 2024 Quarterly Business Review', 'analytics', 'management',
     '{"quarter":"2024-Q3"}',
     '{"revenue":1400000,"employeeGrowth":0,"avgRating":4.3,"customerSatisfaction":95}',
     '2024-10-10', '2024-10-10'),

    ('Q4 2024 Quarterly Business Review', 'analytics', 'management',
     '{"quarter":"2024-Q4"}',
     '{"revenue":1550000,"employeeGrowth":1,"avgRating":4.2,"customerSatisfaction":96}',
     '2025-01-15', '2025-01-15'),

    -- Compliance Reports
    ('Q1 2024 Compliance Audit', 'compliance', 'compliance',
     '{"quarter":"2024-Q1"}',
     '{"complianceScore":92,"findings":5,"resolved":4}',
     '2024-04-15', '2024-04-15'),

    ('Q2 2024 Compliance Audit', 'compliance', 'compliance',
     '{"quarter":"2024-Q2"}',
     '{"complianceScore":94,"findings":3,"resolved":3}',
     '2024-07-15', '2024-07-15'),

    ('Q3 2024 Compliance Audit', 'compliance', 'compliance',
     '{"quarter":"2024-Q3"}',
     '{"complianceScore":95,"findings":2,"resolved":2}',
     '2024-10-15', '2024-10-15'),

    ('Q4 2024 Compliance Audit', 'compliance', 'compliance',
     '{"quarter":"2024-Q4"}',
     '{"complianceScore":96,"findings":2,"resolved":1}',
     '2025-01-20', '2025-01-20')

) AS report_data(title, report_type, category, filters, data, generated_date, created_date)
CROSS JOIN LATERAL (
    SELECT d.id
    FROM hr_public.departments d
    LIMIT 1
) AS dept
CROSS JOIN LATERAL (
    SELECT m.id
    FROM hr_public.users m
    WHERE m.role IN ('manager', 'admin', 'super_admin', 'hr_super_admin')
    ORDER BY RANDOM()
    LIMIT 1
) AS creator
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 4. HISTORICAL EMPLOYEE GOALS (Past 12 months - Completed)
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
    target_date::date,
    'completed',
    100,
    mgr.id,
    created_at,
    NOW()
FROM (VALUES
    -- 2024 Q1 Completed Goals
    ('Complete React Migration', 'Migrate all class components to functional components with hooks',
     '2024-03-31', '2024-01-15', '2024-03-28'),
    ('Security Training Completion', 'Complete mandatory cybersecurity certification',
     '2024-03-15', '2024-01-20', '2024-03-10'),
    ('Customer Onboarding Improvement', 'Reduce onboarding time by 30%',
     '2024-03-31', '2024-01-10', '2024-03-25'),

    -- 2024 Q2 Completed Goals
    ('API Performance Optimization', 'Improve API response times by 50%',
     '2024-06-30', '2024-04-10', '2024-06-20'),
    ('Sales Process Automation', 'Implement automated lead scoring system',
     '2024-06-15', '2024-04-05', '2024-06-12'),
    ('Content Strategy Overhaul', 'Develop new content marketing strategy',
     '2024-06-30', '2024-04-15', '2024-06-28'),

    -- 2024 Q3 Completed Goals
    ('Docker Migration', 'Containerize all services with Docker',
     '2024-09-30', '2024-07-10', '2024-09-25'),
    ('Enterprise Sales Certification', 'Complete enterprise sales training program',
     '2024-09-15', '2024-07-05', '2024-09-10'),
    ('Marketing Automation Setup', 'Implement and configure HubSpot automation',
     '2024-09-30', '2024-07-20', '2024-09-27'),

    -- 2024 Q4 Completed Goals
    ('Cloud Migration Phase 1', 'Migrate 50% of infrastructure to AWS',
     '2024-12-31', '2024-10-10', '2024-12-20'),
    ('Customer Success Program', 'Launch customer success initiative',
     '2024-12-15', '2024-10-05', '2024-12-10'),
    ('Year-End Marketing Campaign', 'Execute holiday marketing campaign',
     '2024-12-31', '2024-10-20', '2024-12-30')

) AS goals(title, description, target_date, created_date, completed_date)
CROSS JOIN LATERAL (
    SELECT u.id, u.department_id
    FROM hr_public.users u
    WHERE u.role IN ('employee', 'manager')
    ORDER BY RANDOM()
    LIMIT 1
) AS emp
CROSS JOIN LATERAL (
    SELECT m.id
    FROM hr_public.users m
    WHERE m.role IN ('manager', 'admin', 'super_admin', 'hr_super_admin')
    AND (m.department_id = emp.department_id OR m.role IN ('admin', 'super_admin', 'hr_super_admin'))
    AND m.id != emp.id
    LIMIT 1
) AS mgr
CROSS JOIN LATERAL (
    SELECT created_date::timestamp AS created_at
) AS dates
ON CONFLICT DO NOTHING;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
    new_leave_count INTEGER;
    new_review_count INTEGER;
    new_report_count INTEGER;
    new_goal_count INTEGER;
    total_leave_count INTEGER;
    total_review_count INTEGER;
    total_report_count INTEGER;
    total_goal_count INTEGER;
BEGIN
    -- Count newly inserted records (approximate - within last minute)
    SELECT COUNT(*) INTO new_leave_count FROM hr_public.leave_requests WHERE updated_at >= NOW() - INTERVAL '1 minute';
    SELECT COUNT(*) INTO new_review_count FROM hr_public.performance_reviews WHERE updated_at >= NOW() - INTERVAL '1 minute';
    SELECT COUNT(*) INTO new_report_count FROM hr_public.hr_reports WHERE updated_at >= NOW() - INTERVAL '1 minute';
    SELECT COUNT(*) INTO new_goal_count FROM hr_public.employee_goals WHERE updated_at >= NOW() - INTERVAL '1 minute';

    -- Count total records
    SELECT COUNT(*) INTO total_leave_count FROM hr_public.leave_requests;
    SELECT COUNT(*) INTO total_review_count FROM hr_public.performance_reviews;
    SELECT COUNT(*) INTO total_report_count FROM hr_public.hr_reports;
    SELECT COUNT(*) INTO total_goal_count FROM hr_public.employee_goals;

    RAISE NOTICE '========================================';
    RAISE NOTICE 'Historical Data Added:';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'New Leave Requests: % (Total: %)', new_leave_count, total_leave_count;
    RAISE NOTICE 'New Performance Reviews: % (Total: %)', new_review_count, total_review_count;
    RAISE NOTICE 'New HR Reports: % (Total: %)', new_report_count, total_report_count;
    RAISE NOTICE 'New Employee Goals: % (Total: %)', new_goal_count, total_goal_count;
    RAISE NOTICE '========================================';
END $$;
