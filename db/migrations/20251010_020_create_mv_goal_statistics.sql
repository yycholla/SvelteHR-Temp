-- Migration: Create goal_statistics materialized view
-- Date: 2025-10-10
-- Purpose: Precompute goal completion analytics for fast dashboard queries
--          Priority: P4 (Performance)

BEGIN;

-- ========================================
-- Create goal_statistics materialized view
-- ========================================

CREATE MATERIALIZED VIEW IF NOT EXISTS hr_public.goal_statistics AS
SELECT
  u.id as user_id,
  u.first_name,
  u.last_name,
  u.department_id,
  eg.quarter,
  eg.year,
  COUNT(*) as total_goals,
  COUNT(*) FILTER (WHERE eg.status = 'completed') as completed_goals,
  COUNT(*) FILTER (WHERE eg.status = 'in_progress') as in_progress_goals,
  COUNT(*) FILTER (WHERE eg.status = 'not_started') as not_started_goals,
  COUNT(*) FILTER (WHERE eg.status = 'cancelled') as cancelled_goals,
  ROUND(
    (COUNT(*) FILTER (WHERE eg.status = 'completed')::NUMERIC /
     NULLIF(COUNT(*) FILTER (WHERE eg.status != 'cancelled'), 0)) * 100,
    2
  ) as completion_percentage,
  NOW() as last_refreshed_at
FROM hr_public.users u
LEFT JOIN hr_public.employee_goals eg ON eg.employee_id = u.id
WHERE u.is_active = true
GROUP BY u.id, u.first_name, u.last_name, u.department_id, eg.quarter, eg.year;

COMMENT ON MATERIALIZED VIEW hr_public.goal_statistics IS
'Precomputed goal completion analytics per user/quarter/year. Refresh via: REFRESH MATERIALIZED VIEW CONCURRENTLY hr_public.goal_statistics;';

-- ========================================
-- Create unique index for CONCURRENTLY refresh
-- ========================================

-- Composite unique index on user_id, quarter, year
CREATE UNIQUE INDEX IF NOT EXISTS goal_statistics_pkey
ON hr_public.goal_statistics(user_id, COALESCE(quarter, 'NULL'), COALESCE(year, 0));

-- ========================================
-- Additional indexes for common queries
-- ========================================

CREATE INDEX IF NOT EXISTS idx_goal_statistics_department
ON hr_public.goal_statistics(department_id);

CREATE INDEX IF NOT EXISTS idx_goal_statistics_completion
ON hr_public.goal_statistics(completion_percentage DESC)
WHERE completion_percentage IS NOT NULL;

-- ========================================
-- Grant permissions
-- ========================================

-- GRANT SELECT ON hr_public.goal_statistics TO postgraphile;
-- Note: Grant statement commented out - apply manually based on your PostGraphile setup

ANALYZE hr_public.goal_statistics;

COMMIT;
