-- Migration: Create department_metrics materialized view
-- Date: 2025-10-10
-- Purpose: Precompute department statistics for fast dashboard queries
--          Priority: P4 (Performance)

BEGIN;

-- ========================================
-- Create department_metrics materialized view
-- ========================================

CREATE MATERIALIZED VIEW IF NOT EXISTS hr_public.department_metrics AS
SELECT
  d.id as department_id,
  d.name as department_name,
  COUNT(u.id) FILTER (WHERE u.is_active) as active_employee_count,
  COUNT(u.id) as total_employee_count,
  AVG(pr.overall_rating) FILTER (WHERE pr.created_at >= CURRENT_DATE - INTERVAL '1 year') as avg_performance_rating,
  COUNT(DISTINCT t.id) FILTER (WHERE t.status IN ('todo', 'in_progress')) as active_tasks_count,
  COUNT(DISTINCT lr.id) FILTER (WHERE lr.status = 'pending') as pending_leave_requests,
  NOW() as last_refreshed_at
FROM hr_public.departments d
LEFT JOIN hr_public.users u ON u.department_id = d.id
LEFT JOIN hr_public.performance_reviews pr ON pr.employee_id = u.id
LEFT JOIN hr_public.tasks t ON t.department_id = d.id
LEFT JOIN hr_public.leave_requests lr ON lr.employee_id = u.id
GROUP BY d.id, d.name;

COMMENT ON MATERIALIZED VIEW hr_public.department_metrics IS
'Precomputed department statistics for dashboard performance. Refresh via: REFRESH MATERIALIZED VIEW CONCURRENTLY hr_public.department_metrics;';

-- ========================================
-- Create unique index for CONCURRENTLY refresh
-- ========================================

CREATE UNIQUE INDEX IF NOT EXISTS department_metrics_pkey
ON hr_public.department_metrics(department_id);

-- ========================================
-- Grant permissions
-- ========================================

-- Grant SELECT to authenticated users (PostGraphile role)
-- GRANT SELECT ON hr_public.department_metrics TO postgraphile;
-- Note: Grant statement commented out - apply manually based on your PostGraphile setup

COMMENT ON COLUMN hr_public.department_metrics.last_refreshed_at IS
'Timestamp of last materialized view refresh. Use to show data freshness in UI.';

ANALYZE hr_public.department_metrics;

COMMIT;
