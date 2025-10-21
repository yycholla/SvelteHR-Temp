-- Migration: Create dashboard_summaries materialized view
-- Date: 2025-10-10
-- Purpose: Precompute multi-table KPIs for fast dashboard loading
--          Priority: P4 (Performance)

BEGIN;

-- ========================================
-- Create dashboard_summaries materialized view
-- ========================================

CREATE MATERIALIZED VIEW IF NOT EXISTS hr_public.dashboard_summaries AS
SELECT
  'global'::TEXT as summary_key,

  -- Employee metrics
  COUNT(DISTINCT u.id) FILTER (WHERE u.is_active) as total_active_employees,
  COUNT(DISTINCT u.id) as total_employees,
  COUNT(DISTINCT u.id) FILTER (WHERE u.created_at >= CURRENT_DATE - INTERVAL '30 days') as new_hires_last_30_days,

  -- Department metrics
  COUNT(DISTINCT d.id) as total_departments,

  -- Task metrics
  COUNT(DISTINCT t.id) as total_tasks,
  COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'in_progress') as tasks_in_progress,
  COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'completed') as tasks_completed,
  COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'todo' AND t.due_date < CURRENT_DATE) as tasks_overdue,

  -- Leave request metrics
  COUNT(DISTINCT lr.id) FILTER (WHERE lr.status = 'pending') as pending_leave_requests,
  COUNT(DISTINCT lr.id) FILTER (WHERE lr.status = 'approved' AND lr.start_date <= CURRENT_DATE AND lr.end_date >= CURRENT_DATE) as employees_on_leave_today,

  -- Event metrics
  COUNT(DISTINCT e.id) FILTER (WHERE e.start_time >= CURRENT_DATE AND e.start_time < CURRENT_DATE + INTERVAL '7 days') as upcoming_events_next_7_days,

  -- Performance review metrics
  COUNT(DISTINCT pr.id) FILTER (WHERE pr.created_at >= CURRENT_DATE - INTERVAL '1 year') as reviews_last_year,
  AVG(pr.overall_rating) FILTER (WHERE pr.created_at >= CURRENT_DATE - INTERVAL '1 year') as avg_performance_rating_last_year,

  -- Skills & certifications metrics
  COUNT(DISTINCT es.id) as total_skills_tracked,
  COUNT(DISTINCT ec.id) FILTER (WHERE ec.expiry_date IS NOT NULL AND ec.expiry_date < CURRENT_DATE) as expired_certifications,
  COUNT(DISTINCT ec.id) FILTER (WHERE ec.expiry_date IS NOT NULL AND ec.expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days') as certifications_expiring_soon,

  -- Timestamp
  NOW() as last_refreshed_at

FROM (SELECT 'global'::TEXT as summary_key) sk
CROSS JOIN hr_public.users u
CROSS JOIN hr_public.departments d
LEFT JOIN hr_public.tasks t ON true
LEFT JOIN hr_public.leave_requests lr ON true
LEFT JOIN hr_public.events e ON true
LEFT JOIN hr_public.performance_reviews pr ON true
LEFT JOIN hr_public.employee_skills es ON true
LEFT JOIN hr_public.employee_certifications ec ON true
WHERE 1=1  -- Placeholder for consistent WHERE clause structure
GROUP BY sk.summary_key;

COMMENT ON MATERIALIZED VIEW hr_public.dashboard_summaries IS
'Precomputed global dashboard KPIs across all tables. Refresh via: REFRESH MATERIALIZED VIEW CONCURRENTLY hr_public.dashboard_summaries;';

-- ========================================
-- Create unique index for CONCURRENTLY refresh
-- ========================================

CREATE UNIQUE INDEX IF NOT EXISTS dashboard_summaries_pkey
ON hr_public.dashboard_summaries(summary_key);

-- ========================================
-- Grant permissions
-- ========================================

-- GRANT SELECT ON hr_public.dashboard_summaries TO postgraphile;
-- Note: Grant statement commented out - apply manually based on your PostGraphile setup

COMMENT ON COLUMN hr_public.dashboard_summaries.summary_key IS
'Always "global" for now. Can be extended to department-specific summaries in future (e.g., "dept_{uuid}").';

ANALYZE hr_public.dashboard_summaries;

COMMIT;
