-- Add comprehensive sample data for SvelteHR system

-- First, ensure we have the admin user and add more users (with password hashes)
INSERT INTO hr_public.users (id, email, password_hash, display_name, job_title, hire_date, is_active, created_at, updated_at) VALUES
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'manager@postgraphile-hr.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdpCy8sTa9E8N4W', 'Sarah Johnson', 'HR Manager', '2023-06-15', true, now(), now()),
('cccccccc-cccc-cccc-cccc-cccccccccccc', 'employee1@postgraphile-hr.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdpCy8sTa9E8N4W', 'John Doe', 'Software Engineer', '2024-01-10', true, now(), now()),
('dddddddd-dddd-dddd-dddd-dddddddddddd', 'employee2@postgraphile-hr.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdpCy8sTa9E8N4W', 'Jane Smith', 'Product Manager', '2023-11-20', true, now(), now()),
('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'employee3@postgraphile-hr.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdpCy8sTa9E8N4W', 'Mike Wilson', 'Marketing Specialist', '2024-03-05', true, now(), now())
ON CONFLICT (id) DO NOTHING;

-- Add sample attendance records for the past week
INSERT INTO hr_public.attendance_records (id, user_id, date, clock_in_time, clock_out_time, status, total_hours, overtime_hours, notes, created_at, updated_at) VALUES
('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '2024-12-23', '09:00:00', '17:30:00', 'PRESENT', 8.5, 0.5, 'Regular workday', now(), now()),
('11111111-1111-1111-1111-111111111112', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '2024-12-22', '08:45:00', '17:15:00', 'PRESENT', 8.5, 0.5, 'Early start', now(), now()),
('11111111-1111-1111-1111-111111111113', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '2024-12-21', '09:00:00', '17:00:00', 'PRESENT', 8.0, 0.0, 'Regular workday', now(), now()),
('11111111-1111-1111-1111-111111111114', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '2024-12-23', '09:15:00', '17:45:00', 'PRESENT', 8.5, 0.5, 'Regular workday', now(), now()),
('11111111-1111-1111-1111-111111111115', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '2024-12-22', '09:00:00', '17:00:00', 'PRESENT', 8.0, 0.0, 'Regular workday', now(), now()),
('11111111-1111-1111-1111-111111111116', 'dddddddd-dddd-dddd-dddd-dddddddddddd', '2024-12-23', '08:30:00', '18:00:00', 'PRESENT', 9.5, 1.5, 'Long day with project deadline', now(), now()),
('11111111-1111-1111-1111-111111111117', 'dddddddd-dddd-dddd-dddd-dddddddddddd', '2024-12-22', '09:00:00', '17:00:00', 'PRESENT', 8.0, 0.0, 'Regular workday', now(), now())
ON CONFLICT (id) DO NOTHING;

-- Add sample performance reviews
INSERT INTO hr_public.performance_reviews (id, employee_id, reviewer_id, cycle_id, review_period_start, review_period_end, overall_rating, status, self_assessment, manager_comments, employee_comments, development_goals, goals_rating, competencies_rating, submitted_at, completed_at, created_at, updated_at) VALUES
('22222222-2222-2222-2222-222222222221', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', (SELECT id FROM hr_public.performance_cycles WHERE name = '2024 Annual Review' LIMIT 1), '2024-01-01', '2024-12-31', 'MET_EXPECTATIONS', 'COMPLETED', 'I have successfully delivered all assigned projects and collaborated well with the team.', 'John has shown consistent performance and good teamwork skills.', 'Thank you for the feedback. I look forward to taking on more challenging projects next year.', 'Improve technical leadership skills, Learn new frameworks', 'MET_EXPECTATIONS', 'MET_EXPECTATIONS', now() - interval '7 days', now() - interval '7 days', now(), now()),
('22222222-2222-2222-2222-222222222222', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', (SELECT id FROM hr_public.performance_cycles WHERE name = '2024 Annual Review' LIMIT 1), '2024-01-01', '2024-12-31', 'EXCEEDED_EXPECTATIONS', 'COMPLETED', 'I have exceeded my targets and led several successful product launches.', 'Jane has demonstrated exceptional leadership and strategic thinking.', 'I appreciate the recognition and am excited about the upcoming challenges.', 'Expand team leadership, Strategic planning certification', 'EXCEEDED_EXPECTATIONS', 'EXCEEDED_EXPECTATIONS', now() - interval '5 days', now() - interval '5 days', now(), now())
ON CONFLICT (id) DO NOTHING;

-- Add sample performance goals
INSERT INTO hr_public.performance_goals (id, employee_id, cycle_id, title, description, target_date, status, progress_percentage, final_rating, manager_comments, employee_comments, created_at, updated_at) VALUES
('33333333-3333-3333-3333-333333333331', 'cccccccc-cccc-cccc-cccc-cccccccccccc', (SELECT id FROM hr_public.performance_cycles WHERE name = '2024 Annual Review' LIMIT 1), 'Complete React Migration', 'Migrate legacy components to React 18 with TypeScript', '2024-06-30', 'COMPLETED', 100, 'MET', 'Well executed migration with clean code', 'Migration completed on time with comprehensive testing', now(), now()),
('33333333-3333-3333-3333-333333333332', 'cccccccc-cccc-cccc-cccc-cccccccccccc', (SELECT id FROM hr_public.performance_cycles WHERE name = '2024 Annual Review' LIMIT 1), 'Mentorship Program', 'Mentor 2 junior developers throughout the year', '2024-12-31', 'IN_PROGRESS', 75, null, 'Making good progress with both mentees', 'Really enjoying the mentorship experience', now(), now()),
('33333333-3333-3333-3333-333333333333', 'dddddddd-dddd-dddd-dddd-dddddddddddd', (SELECT id FROM hr_public.performance_cycles WHERE name = '2024 Annual Review' LIMIT 1), 'Product Launch Strategy', 'Lead the strategy for Q3 product launches', '2024-09-30', 'COMPLETED', 100, 'EXCEEDED', 'Exceptional strategic thinking and execution', 'Proud of the successful launches and team coordination', now(), now()),
('33333333-3333-3333-3333-333333333334', 'dddddddd-dddd-dddd-dddd-dddddddddddd', (SELECT id FROM hr_public.performance_cycles WHERE name = '2024 Annual Review' LIMIT 1), 'Market Research Initiative', 'Conduct comprehensive market analysis for 2025 planning', '2024-11-30', 'COMPLETED', 100, 'MET', 'Thorough analysis that will guide our 2025 strategy', 'Learned a lot about market trends and competitive landscape', now(), now())
ON CONFLICT (id) DO NOTHING;

-- Add sample leave requests
INSERT INTO hr_public.leave_requests (id, user_id, leave_type, start_date, end_date, status, reason, approved_by, created_at, updated_at) VALUES
('44444444-4444-4444-4444-444444444441', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'VACATION', '2024-12-28', '2025-01-02', 'APPROVED', 'Year-end vacation', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', now(), now()),
('44444444-4444-4444-4444-444444444442', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'SICK', '2024-12-18', '2024-12-19', 'APPROVED', 'Flu symptoms', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', now(), now()),
('44444444-4444-4444-4444-444444444443', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'VACATION', '2025-01-15', '2025-01-17', 'pending', 'Long weekend trip', null, now(), now())
ON CONFLICT (id) DO NOTHING;

-- Update table comments to trigger PostGraphile schema refresh
COMMENT ON TABLE hr_public.users IS 'System users including employees, managers, and administrators with sample data';
COMMENT ON TABLE hr_public.attendance_records IS 'Employee attendance tracking with clock in/out times and sample attendance data';
COMMENT ON TABLE hr_public.performance_reviews IS 'Performance review records with sample completed reviews';
COMMENT ON TABLE hr_public.performance_goals IS 'Employee performance goals with sample data showing various statuses';
COMMENT ON TABLE hr_public.leave_requests IS 'Employee leave requests with sample approved and pending requests';