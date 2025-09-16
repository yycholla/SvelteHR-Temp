-- Migration: Create Analytics & Reporting System
-- Created: 2025-09-15
-- Description: Analytics views and reporting functions for HR metrics and insights

-- Create analytics views for HR metrics
CREATE VIEW hr_public.employee_overview AS
SELECT 
    u.id,
    u.email,
    u.display_name,
    u.is_active,
    u.onboarding_status,
    u.created_at as hire_date,
    u.last_login,
    
    -- Job information
    ji.job_title,
    ji.employment_type,
    ji.start_date,
    ji.end_date,
    
    -- Department info
    d.name as department_name,
    d.id as department_id,
    
    -- Manager info
    manager.display_name as manager_name,
    manager.id as manager_id,
    
    -- Role information
    ur.name as primary_role,
    ur.level as role_level,
    
    -- Tenure calculation
    CASE 
        WHEN u.is_active AND ji.end_date IS NULL THEN 
            EXTRACT(YEAR FROM AGE(CURRENT_DATE, COALESCE(ji.start_date, u.created_at::DATE))) * 12 + 
            EXTRACT(MONTH FROM AGE(CURRENT_DATE, COALESCE(ji.start_date, u.created_at::DATE)))
        ELSE NULL
    END as tenure_months,
    
    -- Status indicators
    CASE 
        WHEN NOT u.is_active THEN 'INACTIVE'
        WHEN ji.end_date IS NOT NULL THEN 'TERMINATED'
        WHEN u.onboarding_status = 'Pending' THEN 'ONBOARDING'
        ELSE 'ACTIVE'
    END as employee_status

FROM hr_public.users u
LEFT JOIN hr_public.job_information ji ON u.id = ji.employee_id AND ji.end_date IS NULL
LEFT JOIN hr_public.departments d ON ji.department_id = d.id
LEFT JOIN hr_public.users manager ON ji.manager_id = manager.id
LEFT JOIN hr_public.user_role_assignments ura ON u.id = ura.user_id AND ura.is_active = true
LEFT JOIN hr_public.user_roles ur ON ura.role_id = ur.id
WHERE ur.level = (
    SELECT MAX(ur2.level) 
    FROM hr_public.user_role_assignments ura2 
    JOIN hr_public.user_roles ur2 ON ura2.role_id = ur2.id
    WHERE ura2.user_id = u.id AND ura2.is_active = true
) OR ur.level IS NULL;

-- Department analytics view
CREATE VIEW hr_public.department_analytics AS
SELECT 
    d.id,
    d.name,
    d.description,
    d.is_active,
    
    -- Manager info
    manager.display_name as manager_name,
    manager.id as manager_id,
    
    -- Employee counts
    COUNT(CASE WHEN eo.employee_status = 'ACTIVE' THEN 1 END) as active_employees,
    COUNT(CASE WHEN eo.employee_status = 'ONBOARDING' THEN 1 END) as onboarding_employees,
    COUNT(CASE WHEN eo.employee_status = 'INACTIVE' THEN 1 END) as inactive_employees,
    COUNT(eo.id) as total_employees,
    
    -- Tenure statistics
    ROUND(AVG(CASE WHEN eo.employee_status = 'ACTIVE' THEN eo.tenure_months END), 1) as avg_tenure_months,
    MIN(CASE WHEN eo.employee_status = 'ACTIVE' THEN eo.tenure_months END) as min_tenure_months,
    MAX(CASE WHEN eo.employee_status = 'ACTIVE' THEN eo.tenure_months END) as max_tenure_months,
    
    -- Role distribution
    COUNT(CASE WHEN eo.role_level >= 60 THEN 1 END) as management_count,
    COUNT(CASE WHEN eo.role_level = 20 THEN 1 END) as employee_count,
    
    -- Recent activity
    COUNT(CASE WHEN eo.hire_date >= CURRENT_DATE - INTERVAL '90 days' AND eo.employee_status = 'ACTIVE' THEN 1 END) as recent_hires,
    
    d.created_at,
    d.updated_at

FROM hr_public.departments d
LEFT JOIN hr_public.users manager ON d.manager_id = manager.id
LEFT JOIN hr_public.employee_overview eo ON d.id = eo.department_id
WHERE d.is_active = true
GROUP BY d.id, d.name, d.description, d.is_active, manager.display_name, manager.id, d.created_at, d.updated_at;

-- Time-off analytics view
CREATE VIEW hr_public.time_off_analytics AS
SELECT 
    TOP.id as policy_id,
    TOP.policy_name,
    TOP.time_off_type,
    
    -- Request statistics
    COUNT(tor.id) as total_requests,
    COUNT(CASE WHEN tor.status = 'PENDING' THEN 1 END) as pending_requests,
    COUNT(CASE WHEN tor.status = 'APPROVED' THEN 1 END) as approved_requests,
    COUNT(CASE WHEN tor.status = 'REJECTED' THEN 1 END) as rejected_requests,
    
    -- Hours statistics
    COALESCE(SUM(CASE WHEN tor.status = 'APPROVED' THEN tor.hours_requested END), 0) as total_approved_hours,
    COALESCE(SUM(CASE WHEN tor.status = 'PENDING' THEN tor.hours_requested END), 0) as total_pending_hours,
    COALESCE(AVG(CASE WHEN tor.status = 'APPROVED' THEN tor.hours_requested END), 0) as avg_approved_hours,
    
    -- Recent activity (last 90 days)
    COUNT(CASE WHEN tor.submitted_at >= CURRENT_DATE - INTERVAL '90 days' THEN 1 END) as recent_requests,
    
    -- Approval rate
    CASE 
        WHEN COUNT(CASE WHEN tor.status IN ('APPROVED', 'REJECTED') THEN 1 END) > 0 THEN
            ROUND(
                COUNT(CASE WHEN tor.status = 'APPROVED' THEN 1 END)::DECIMAL / 
                COUNT(CASE WHEN tor.status IN ('APPROVED', 'REJECTED') THEN 1 END) * 100, 
                1
            )
        ELSE 0
    END as approval_rate_percent

FROM hr_public.time_off_policies TOP
LEFT JOIN hr_public.time_off_requests tor ON TOP.id = tor.policy_id
WHERE TOP.is_active = true
GROUP BY TOP.id, TOP.policy_name, TOP.time_off_type;

-- Performance review analytics view
CREATE VIEW hr_public.performance_review_analytics AS
SELECT 
    rc.id as cycle_id,
    rc.cycle_name,
    rc.cycle_type,
    rc.start_date,
    rc.end_date,
    rc.review_due_date,
    
    -- Review statistics
    COUNT(pr.id) as total_reviews,
    COUNT(CASE WHEN pr.status = 'NOT_STARTED' THEN 1 END) as not_started_reviews,
    COUNT(CASE WHEN pr.status = 'IN_PROGRESS' THEN 1 END) as in_progress_reviews,
    COUNT(CASE WHEN pr.status = 'EMPLOYEE_SUBMITTED' THEN 1 END) as employee_submitted_reviews,
    COUNT(CASE WHEN pr.status = 'MANAGER_REVIEW' THEN 1 END) as manager_review_reviews,
    COUNT(CASE WHEN pr.status = 'COMPLETED' THEN 1 END) as completed_reviews,
    
    -- Completion rate
    CASE 
        WHEN COUNT(pr.id) > 0 THEN
            ROUND(COUNT(CASE WHEN pr.status = 'COMPLETED' THEN 1 END)::DECIMAL / COUNT(pr.id) * 100, 1)
        ELSE 0
    END as completion_rate_percent,
    
    -- Rating statistics
    ROUND(AVG(pr.overall_rating), 2) as avg_overall_rating,
    MIN(pr.overall_rating) as min_overall_rating,
    MAX(pr.overall_rating) as max_overall_rating,
    
    -- Rating distribution
    COUNT(CASE WHEN pr.overall_rating >= 4.5 THEN 1 END) as outstanding_count,
    COUNT(CASE WHEN pr.overall_rating >= 3.5 AND pr.overall_rating < 4.5 THEN 1 END) as exceeds_expectations_count,
    COUNT(CASE WHEN pr.overall_rating >= 2.5 AND pr.overall_rating < 3.5 THEN 1 END) as meets_expectations_count,
    COUNT(CASE WHEN pr.overall_rating < 2.5 THEN 1 END) as below_expectations_count,
    
    -- Timing statistics
    ROUND(AVG(EXTRACT(EPOCH FROM (pr.completed_at - pr.created_at)) / 86400), 1) as avg_completion_days,
    
    rc.is_active

FROM hr_public.review_cycles rc
LEFT JOIN hr_public.performance_reviews pr ON rc.id = pr.cycle_id
GROUP BY rc.id, rc.cycle_name, rc.cycle_type, rc.start_date, rc.end_date, rc.review_due_date, rc.is_active;

-- Create materialized view for dashboard metrics (refreshed periodically)
CREATE MATERIALIZED VIEW hr_public.dashboard_metrics AS
SELECT 
    'employees' as metric_category,
    jsonb_build_object(
        'total_active', COUNT(CASE WHEN employee_status = 'ACTIVE' THEN 1 END),
        'total_onboarding', COUNT(CASE WHEN employee_status = 'ONBOARDING' THEN 1 END),
        'total_inactive', COUNT(CASE WHEN employee_status = 'INACTIVE' THEN 1 END),
        'avg_tenure_months', ROUND(AVG(CASE WHEN employee_status = 'ACTIVE' THEN tenure_months END), 1),
        'recent_hires_90d', COUNT(CASE WHEN hire_date >= CURRENT_DATE - INTERVAL '90 days' AND employee_status = 'ACTIVE' THEN 1 END),
        'management_count', COUNT(CASE WHEN role_level >= 60 THEN 1 END)
    ) as metrics,
    NOW() as last_updated
FROM hr_public.employee_overview

UNION ALL

SELECT 
    'time_off' as metric_category,
    jsonb_build_object(
        'total_requests', COUNT(tor.id),
        'pending_requests', COUNT(CASE WHEN tor.status = 'PENDING' THEN 1 END),
        'approved_requests', COUNT(CASE WHEN tor.status = 'APPROVED' THEN 1 END),
        'approval_rate', ROUND(
            CASE WHEN COUNT(CASE WHEN tor.status IN ('APPROVED', 'REJECTED') THEN 1 END) > 0 THEN
                COUNT(CASE WHEN tor.status = 'APPROVED' THEN 1 END)::DECIMAL / 
                COUNT(CASE WHEN tor.status IN ('APPROVED', 'REJECTED') THEN 1 END) * 100
            ELSE 0 END, 1
        ),
        'recent_requests_30d', COUNT(CASE WHEN tor.submitted_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END)
    ) as metrics,
    NOW() as last_updated
FROM hr_public.time_off_requests tor

UNION ALL

SELECT 
    'performance_reviews' as metric_category,
    jsonb_build_object(
        'active_cycles', COUNT(CASE WHEN rc.is_active THEN 1 END),
        'total_reviews', COUNT(pr.id),
        'completed_reviews', COUNT(CASE WHEN pr.status = 'COMPLETED' THEN 1 END),
        'avg_rating', ROUND(AVG(pr.overall_rating), 2),
        'completion_rate', ROUND(
            CASE WHEN COUNT(pr.id) > 0 THEN
                COUNT(CASE WHEN pr.status = 'COMPLETED' THEN 1 END)::DECIMAL / COUNT(pr.id) * 100
            ELSE 0 END, 1
        )
    ) as metrics,
    NOW() as last_updated
FROM hr_public.review_cycles rc
LEFT JOIN hr_public.performance_reviews pr ON rc.id = pr.cycle_id

UNION ALL

SELECT 
    'departments' as metric_category,
    jsonb_build_object(
        'total_departments', COUNT(da.id),
        'avg_department_size', ROUND(AVG(da.active_employees), 1),
        'largest_department', MAX(da.active_employees),
        'departments_with_managers', COUNT(CASE WHEN da.manager_id IS NOT NULL THEN 1 END)
    ) as metrics,
    NOW() as last_updated
FROM hr_public.department_analytics da;

-- Function to refresh dashboard metrics
CREATE OR REPLACE FUNCTION hr_public.refresh_dashboard_metrics()
RETURNS VOID
LANGUAGE sql SECURITY DEFINER
AS $$
    REFRESH MATERIALIZED VIEW hr_public.dashboard_metrics;
$$;

-- Function to get employee turnover rate
CREATE OR REPLACE FUNCTION hr_public.get_turnover_rate(
    p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '1 year',
    p_end_date DATE DEFAULT CURRENT_DATE
) RETURNS TABLE(
    period_start DATE,
    period_end DATE,
    total_employees_start INTEGER,
    new_hires INTEGER,
    terminations INTEGER,
    avg_employees DECIMAL(10,2),
    turnover_rate_percent DECIMAL(5,2)
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
DECLARE
    start_count INTEGER;
    end_count INTEGER;
    hires INTEGER;
    terms INTEGER;
    avg_emp DECIMAL(10,2);
BEGIN
    -- Count employees at start of period
    SELECT COUNT(*) INTO start_count
    FROM hr_public.employee_overview eo
    WHERE eo.hire_date <= p_start_date
      AND (eo.end_date IS NULL OR eo.end_date > p_start_date);
    
    -- Count new hires during period
    SELECT COUNT(*) INTO hires
    FROM hr_public.employee_overview eo
    WHERE eo.hire_date BETWEEN p_start_date AND p_end_date;
    
    -- Count terminations during period
    SELECT COUNT(*) INTO terms
    FROM hr_public.employee_overview eo
    WHERE eo.end_date BETWEEN p_start_date AND p_end_date;
    
    -- Calculate average employees
    avg_emp := (start_count + (start_count + hires - terms)) / 2.0;
    
    RETURN QUERY SELECT 
        p_start_date,
        p_end_date,
        start_count,
        hires,
        terms,
        avg_emp,
        CASE WHEN avg_emp > 0 THEN ROUND((terms / avg_emp) * 100, 2) ELSE 0 END;
END;
$$;

-- Create indexes for analytics performance
CREATE INDEX idx_employee_overview_department ON hr_public.employee_overview USING btree(department_id) WHERE employee_status = 'ACTIVE';
CREATE INDEX idx_employee_overview_hire_date ON hr_public.employee_overview USING btree(hire_date DESC);
CREATE INDEX idx_employee_overview_status ON hr_public.employee_overview USING btree(employee_status);

-- Add PostGraphile comments for GraphQL generation
COMMENT ON VIEW hr_public.employee_overview IS '@name EmployeeOverview
Comprehensive employee information with calculated fields';

COMMENT ON VIEW hr_public.department_analytics IS '@name DepartmentAnalytics  
Department statistics and employee distribution';

COMMENT ON VIEW hr_public.time_off_analytics IS '@name TimeOffAnalytics
Time-off request statistics and approval rates';

COMMENT ON VIEW hr_public.performance_review_analytics IS '@name PerformanceReviewAnalytics
Performance review cycle statistics and ratings';

COMMENT ON MATERIALIZED VIEW hr_public.dashboard_metrics IS '@name DashboardMetrics
Pre-calculated metrics for dashboard display';

COMMENT ON FUNCTION hr_public.refresh_dashboard_metrics() IS
'Refresh the dashboard metrics materialized view';

COMMENT ON FUNCTION hr_public.get_turnover_rate(DATE, DATE) IS
'Calculate employee turnover rate for a given period';

-- Grant permissions for analytics
GRANT SELECT ON hr_public.employee_overview TO hr_manager, hr_admin, hr_super_admin;
GRANT SELECT ON hr_public.department_analytics TO hr_manager, hr_admin, hr_super_admin;
GRANT SELECT ON hr_public.time_off_analytics TO hr_manager, hr_admin, hr_super_admin;
GRANT SELECT ON hr_public.performance_review_analytics TO hr_manager, hr_admin, hr_super_admin;
GRANT SELECT ON hr_public.dashboard_metrics TO hr_manager, hr_admin, hr_super_admin;

GRANT EXECUTE ON FUNCTION hr_public.refresh_dashboard_metrics() TO hr_admin, hr_super_admin;
GRANT EXECUTE ON FUNCTION hr_public.get_turnover_rate(DATE, DATE) TO hr_manager, hr_admin, hr_super_admin;

-- Schedule periodic refresh of dashboard metrics (would be handled by a job scheduler)
-- This is a placeholder for demonstration
-- SELECT cron.schedule('refresh-dashboard-metrics', '0 6 * * *', 'SELECT hr_public.refresh_dashboard_metrics();');