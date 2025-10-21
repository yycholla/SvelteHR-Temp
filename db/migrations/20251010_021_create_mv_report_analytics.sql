-- Migration: Create report_analytics materialized view
-- Date: 2025-10-10
-- Purpose: Precompute headcount and attendance trends for fast reporting
--          Priority: P4 (Performance)

BEGIN;

-- ========================================
-- Create report_analytics materialized view
-- ========================================

CREATE MATERIALIZED VIEW IF NOT EXISTS hr_public.report_analytics AS
SELECT
  d.id as department_id,
  d.name as department_name,
  DATE_TRUNC('month', u.created_at) as month,
  COUNT(DISTINCT u.id) as headcount,
  COUNT(DISTINCT u.id) FILTER (WHERE u.is_active) as active_headcount,
  COUNT(DISTINCT u.id) FILTER (WHERE NOT u.is_active) as inactive_headcount,
  COUNT(DISTINCT ar.id) as total_attendance_records,
  COUNT(DISTINCT ar.id) FILTER (WHERE ar.status = 'present') as days_present,
  COUNT(DISTINCT ar.id) FILTER (WHERE ar.status = 'absent') as days_absent,
  COUNT(DISTINCT lr.id) FILTER (WHERE lr.status = 'approved') as approved_leave_requests,
  ROUND(
    (COUNT(DISTINCT ar.id) FILTER (WHERE ar.status = 'present')::NUMERIC /
     NULLIF(COUNT(DISTINCT ar.id), 0)) * 100,
    2
  ) as attendance_rate_percentage,
  NOW() as last_refreshed_at
FROM hr_public.departments d
LEFT JOIN hr_public.users u ON u.department_id = d.id
LEFT JOIN hr_public.attendance_records ar ON ar.user_id = u.id AND ar.date >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '12 months')
LEFT JOIN hr_public.leave_requests lr ON lr.employee_id = u.id AND lr.start_date >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '12 months')
GROUP BY d.id, d.name, DATE_TRUNC('month', u.created_at);

COMMENT ON MATERIALIZED VIEW hr_public.report_analytics IS
'Precomputed headcount and attendance trends by department/month. Refresh via: REFRESH MATERIALIZED VIEW CONCURRENTLY hr_public.report_analytics;';

-- ========================================
-- Create unique index for CONCURRENTLY refresh
-- ========================================

CREATE UNIQUE INDEX IF NOT EXISTS report_analytics_pkey
ON hr_public.report_analytics(department_id, month);

-- ========================================
-- Additional indexes for common queries
-- ========================================

CREATE INDEX IF NOT EXISTS idx_report_analytics_month
ON hr_public.report_analytics(month DESC);

CREATE INDEX IF NOT EXISTS idx_report_analytics_attendance_rate
ON hr_public.report_analytics(attendance_rate_percentage DESC)
WHERE attendance_rate_percentage IS NOT NULL;

-- ========================================
-- Grant permissions
-- ========================================

-- GRANT SELECT ON hr_public.report_analytics TO postgraphile;
-- Note: Grant statement commented out - apply manually based on your PostGraphile setup

ANALYZE hr_public.report_analytics;

COMMIT;
