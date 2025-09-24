-- HR User Journeys Migration: Create Goals Table
-- Created: 2025-01-25T14:00:05.000Z
--
-- This migration creates the goals table for performance and development goal tracking.
-- Supports comprehensive goal management with progress tracking and performance review integration.

BEGIN;

-- Create goals table
CREATE TABLE hr_public.goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES hr_public.users(id) ON DELETE CASCADE,
  manager_id UUID REFERENCES hr_public.users(id),

  -- Goal details
  title VARCHAR(200) NOT NULL,
  description TEXT,
  goal_type VARCHAR(30) NOT NULL,
  category VARCHAR(50),

  -- Timeline
  start_date DATE NOT NULL,
  target_date DATE NOT NULL,
  completion_date DATE,

  -- Progress tracking
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  progress_percentage INTEGER NOT NULL DEFAULT 0 CHECK (progress_percentage BETWEEN 0 AND 100),
  measurement_criteria TEXT,
  success_metrics JSONB DEFAULT '{}',

  -- Review cycle connection
  review_cycle_id UUID, -- Will reference hr_public.performance_review_cycles when created
  weight_percentage INTEGER NOT NULL DEFAULT 100 CHECK (weight_percentage BETWEEN 1 AND 100),

  -- Progress updates
  last_update_date DATE,
  last_update_notes TEXT,

  -- Audit trail
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_by UUID NOT NULL REFERENCES hr_public.users(id),
  updated_by UUID REFERENCES hr_public.users(id)
);

-- Add constraints for goal_type values
ALTER TABLE hr_public.goals
  ADD CONSTRAINT goals_goal_type_check
  CHECK (goal_type IN ('PERFORMANCE', 'DEVELOPMENT', 'PROJECT', 'TEAM', 'LEARNING', 'LEADERSHIP'));

-- Add constraints for category values
ALTER TABLE hr_public.goals
  ADD CONSTRAINT goals_category_check
  CHECK (category IS NULL OR category IN ('SALES', 'QUALITY', 'EFFICIENCY', 'LEADERSHIP', 'TECHNICAL', 'COMMUNICATION', 'INNOVATION', 'COMPLIANCE'));

-- Add constraints for status values
ALTER TABLE hr_public.goals
  ADD CONSTRAINT goals_status_check
  CHECK (status IN ('ACTIVE', 'COMPLETED', 'CANCELLED', 'ON_HOLD', 'OVERDUE'));

-- Add constraint to ensure target_date is after start_date
ALTER TABLE hr_public.goals
  ADD CONSTRAINT goals_date_range_check
  CHECK (target_date >= start_date);

-- Add constraint to ensure completion_date is reasonable
ALTER TABLE hr_public.goals
  ADD CONSTRAINT goals_completion_date_check
  CHECK (completion_date IS NULL OR completion_date >= start_date);

-- Add constraint to prevent future start dates beyond reasonable limits (1 year)
ALTER TABLE hr_public.goals
  ADD CONSTRAINT goals_future_start_date_check
  CHECK (start_date <= CURRENT_DATE + INTERVAL '1 year');

-- Create indexes for performance
CREATE INDEX idx_goals_employee_id ON hr_public.goals(employee_id);
CREATE INDEX idx_goals_manager_id ON hr_public.goals(manager_id) WHERE manager_id IS NOT NULL;
CREATE INDEX idx_goals_status ON hr_public.goals(status);
CREATE INDEX idx_goals_goal_type ON hr_public.goals(goal_type);
CREATE INDEX idx_goals_category ON hr_public.goals(category) WHERE category IS NOT NULL;
CREATE INDEX idx_goals_target_date ON hr_public.goals(target_date);
CREATE INDEX idx_goals_employee_status ON hr_public.goals(employee_id, status);
CREATE INDEX idx_goals_review_cycle_id ON hr_public.goals(review_cycle_id) WHERE review_cycle_id IS NOT NULL;
CREATE INDEX idx_goals_created_at ON hr_public.goals(created_at);

-- Create composite index for dashboard queries (active goals by employee)
CREATE INDEX idx_goals_dashboard ON hr_public.goals(employee_id, status, target_date)
WHERE status = 'ACTIVE';

-- Create composite index for overdue goals monitoring
CREATE INDEX idx_goals_overdue ON hr_public.goals(status, target_date)
WHERE status IN ('ACTIVE', 'OVERDUE');

-- Create function to auto-update goal status based on dates and progress
CREATE OR REPLACE FUNCTION hr_public.update_goal_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-complete goals when progress reaches 100%
  IF NEW.progress_percentage = 100 AND NEW.status = 'ACTIVE' THEN
    NEW.status := 'COMPLETED';
    NEW.completion_date := CURRENT_DATE;
  END IF;

  -- Mark goals as overdue if past target date and still active
  IF NEW.status = 'ACTIVE' AND NEW.target_date < CURRENT_DATE THEN
    NEW.status := 'OVERDUE';
  END IF;

  -- Set last_update_date when progress changes
  IF NEW.progress_percentage != COALESCE(OLD.progress_percentage, 0) THEN
    NEW.last_update_date := CURRENT_DATE;
  END IF;

  -- Validate manager relationship
  IF NEW.manager_id IS NOT NULL THEN
    -- Ensure manager has higher role level than employee
    IF EXISTS (
      SELECT 1 FROM hr_public.users emp, hr_public.users mgr
      WHERE emp.id = NEW.employee_id
      AND mgr.id = NEW.manager_id
      AND mgr.role_level <= emp.role_level
    ) THEN
      RAISE EXCEPTION 'Manager must have higher role level than employee for goal assignment';
    END IF;
  END IF;

  -- Set updated_at
  NEW.updated_at := NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-updating goal status
CREATE TRIGGER tr_update_goal_status
  BEFORE INSERT OR UPDATE ON hr_public.goals
  FOR EACH ROW
  EXECUTE FUNCTION hr_public.update_goal_status();

-- Create function to validate goal ownership and permissions
CREATE OR REPLACE FUNCTION hr_public.validate_goal_permissions()
RETURNS TRIGGER AS $$
BEGIN
  -- Only employee, their manager, or HR admin can create/modify goals for an employee
  IF NOT EXISTS (
    SELECT 1 FROM hr_public.users u
    WHERE u.id = NEW.employee_id
    AND (
      -- Employee themselves
      NEW.created_by = NEW.employee_id OR
      -- Their direct manager
      u.manager_id = NEW.created_by OR
      -- HR admin or higher
      EXISTS (
        SELECT 1 FROM hr_public.users creator
        WHERE creator.id = NEW.created_by
        AND creator.role_level >= 80
      )
    )
  ) THEN
    RAISE EXCEPTION 'Insufficient permissions to create or modify goals for this employee';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for goal permissions validation
CREATE TRIGGER tr_validate_goal_permissions
  BEFORE INSERT OR UPDATE ON hr_public.goals
  FOR EACH ROW
  EXECUTE FUNCTION hr_public.validate_goal_permissions();

-- Create goal progress tracking table for detailed history
CREATE TABLE hr_public.goal_progress_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES hr_public.goals(id) ON DELETE CASCADE,
  updated_by UUID NOT NULL REFERENCES hr_public.users(id),

  -- Progress details
  previous_progress INTEGER NOT NULL CHECK (previous_progress BETWEEN 0 AND 100),
  new_progress INTEGER NOT NULL CHECK (new_progress BETWEEN 0 AND 100),
  update_notes TEXT,

  -- Status changes
  previous_status VARCHAR(20),
  new_status VARCHAR(20),

  -- Milestone or achievement details
  milestone_achieved VARCHAR(200),
  evidence_url TEXT,
  manager_feedback TEXT,

  -- Metadata
  update_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Add indexes for goal progress updates
CREATE INDEX idx_goal_progress_updates_goal_id ON hr_public.goal_progress_updates(goal_id);
CREATE INDEX idx_goal_progress_updates_updated_by ON hr_public.goal_progress_updates(updated_by);
CREATE INDEX idx_goal_progress_updates_date ON hr_public.goal_progress_updates(update_date);
CREATE INDEX idx_goal_progress_updates_goal_date ON hr_public.goal_progress_updates(goal_id, update_date);

-- Create function to track goal progress changes
CREATE OR REPLACE FUNCTION hr_public.track_goal_progress_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Only track if progress percentage or status changed
  IF OLD.progress_percentage != NEW.progress_percentage OR OLD.status != NEW.status THEN
    INSERT INTO hr_public.goal_progress_updates (
      goal_id,
      updated_by,
      previous_progress,
      new_progress,
      update_notes,
      previous_status,
      new_status,
      update_date
    ) VALUES (
      NEW.id,
      COALESCE(NEW.updated_by, NEW.created_by),
      OLD.progress_percentage,
      NEW.progress_percentage,
      NEW.last_update_notes,
      OLD.status,
      NEW.status,
      CURRENT_DATE
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for tracking progress changes
CREATE TRIGGER tr_track_goal_progress_changes
  AFTER UPDATE ON hr_public.goals
  FOR EACH ROW
  EXECUTE FUNCTION hr_public.track_goal_progress_changes();

-- Create function to get employee goals with progress statistics
CREATE OR REPLACE FUNCTION hr_public.get_employee_goals(
  p_employee_id UUID,
  p_status VARCHAR(20) DEFAULT NULL,
  p_include_completed BOOLEAN DEFAULT FALSE
)
RETURNS TABLE(
  id UUID,
  title VARCHAR(200),
  description TEXT,
  goal_type VARCHAR(30),
  category VARCHAR(50),
  start_date DATE,
  target_date DATE,
  completion_date DATE,
  status VARCHAR(20),
  progress_percentage INTEGER,
  weight_percentage INTEGER,
  last_update_date DATE,
  is_overdue BOOLEAN,
  days_remaining INTEGER,
  manager_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    g.id,
    g.title,
    g.description,
    g.goal_type,
    g.category,
    g.start_date,
    g.target_date,
    g.completion_date,
    g.status,
    g.progress_percentage,
    g.weight_percentage,
    g.last_update_date,
    (g.status IN ('ACTIVE', 'OVERDUE') AND g.target_date < CURRENT_DATE) as is_overdue,
    (g.target_date - CURRENT_DATE)::INTEGER as days_remaining,
    m.display_name as manager_name
  FROM hr_public.goals g
  LEFT JOIN hr_public.users m ON g.manager_id = m.id
  WHERE g.employee_id = p_employee_id
  AND (p_status IS NULL OR g.status = p_status)
  AND (p_include_completed OR g.status != 'COMPLETED')
  ORDER BY
    CASE g.status
      WHEN 'OVERDUE' THEN 1
      WHEN 'ACTIVE' THEN 2
      WHEN 'ON_HOLD' THEN 3
      WHEN 'COMPLETED' THEN 4
      WHEN 'CANCELLED' THEN 5
    END,
    g.target_date ASC,
    g.created_at DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Create function to get manager's team goals overview
CREATE OR REPLACE FUNCTION hr_public.get_team_goals_overview(
  p_manager_id UUID,
  p_status VARCHAR(20) DEFAULT NULL
)
RETURNS TABLE(
  employee_id UUID,
  employee_name TEXT,
  goal_count INTEGER,
  active_goals INTEGER,
  completed_goals INTEGER,
  overdue_goals INTEGER,
  average_progress NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id as employee_id,
    u.display_name as employee_name,
    COUNT(g.id)::INTEGER as goal_count,
    COUNT(CASE WHEN g.status = 'ACTIVE' THEN 1 END)::INTEGER as active_goals,
    COUNT(CASE WHEN g.status = 'COMPLETED' THEN 1 END)::INTEGER as completed_goals,
    COUNT(CASE WHEN g.status = 'OVERDUE' THEN 1 END)::INTEGER as overdue_goals,
    COALESCE(AVG(g.progress_percentage), 0) as average_progress
  FROM hr_public.users u
  LEFT JOIN hr_public.goals g ON u.id = g.employee_id
    AND (p_status IS NULL OR g.status = p_status)
  WHERE u.manager_id = p_manager_id
  AND u.employment_status = 'active'
  GROUP BY u.id, u.display_name
  ORDER BY overdue_goals DESC, average_progress ASC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Create function to get goal progress history
CREATE OR REPLACE FUNCTION hr_public.get_goal_progress_history(p_goal_id UUID)
RETURNS TABLE(
  update_date DATE,
  progress_change INTEGER,
  new_progress INTEGER,
  status_change TEXT,
  update_notes TEXT,
  updated_by_name TEXT,
  milestone_achieved VARCHAR(200),
  manager_feedback TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    gpu.update_date,
    (gpu.new_progress - gpu.previous_progress) as progress_change,
    gpu.new_progress,
    CASE
      WHEN gpu.previous_status != gpu.new_status THEN
        gpu.previous_status || ' → ' || gpu.new_status
      ELSE NULL
    END as status_change,
    gpu.update_notes,
    u.display_name as updated_by_name,
    gpu.milestone_achieved,
    gpu.manager_feedback
  FROM hr_public.goal_progress_updates gpu
  JOIN hr_public.users u ON gpu.updated_by = u.id
  WHERE gpu.goal_id = p_goal_id
  ORDER BY gpu.update_date DESC, gpu.created_at DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Create function for goal statistics and reporting
CREATE OR REPLACE FUNCTION hr_public.get_goal_statistics(
  p_employee_id UUID DEFAULT NULL,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE(
  total_goals INTEGER,
  active_goals INTEGER,
  completed_goals INTEGER,
  overdue_goals INTEGER,
  cancelled_goals INTEGER,
  average_progress NUMERIC,
  completion_rate NUMERIC,
  overdue_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::INTEGER as total_goals,
    COUNT(CASE WHEN g.status = 'ACTIVE' THEN 1 END)::INTEGER as active_goals,
    COUNT(CASE WHEN g.status = 'COMPLETED' THEN 1 END)::INTEGER as completed_goals,
    COUNT(CASE WHEN g.status = 'OVERDUE' THEN 1 END)::INTEGER as overdue_goals,
    COUNT(CASE WHEN g.status = 'CANCELLED' THEN 1 END)::INTEGER as cancelled_goals,
    COALESCE(AVG(g.progress_percentage), 0) as average_progress,
    CASE
      WHEN COUNT(*) > 0 THEN
        (COUNT(CASE WHEN g.status = 'COMPLETED' THEN 1 END) * 100.0 / COUNT(*))
      ELSE 0
    END as completion_rate,
    CASE
      WHEN COUNT(*) > 0 THEN
        (COUNT(CASE WHEN g.status = 'OVERDUE' THEN 1 END) * 100.0 / COUNT(*))
      ELSE 0
    END as overdue_rate
  FROM hr_public.goals g
  WHERE (p_employee_id IS NULL OR g.employee_id = p_employee_id)
  AND (p_start_date IS NULL OR g.start_date >= p_start_date)
  AND (p_end_date IS NULL OR g.target_date <= p_end_date);
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON hr_public.goals TO hr_graphile_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON hr_public.goal_progress_updates TO hr_graphile_role;
GRANT EXECUTE ON FUNCTION hr_public.update_goal_status() TO hr_graphile_role;
GRANT EXECUTE ON FUNCTION hr_public.validate_goal_permissions() TO hr_graphile_role;
GRANT EXECUTE ON FUNCTION hr_public.track_goal_progress_changes() TO hr_graphile_role;
GRANT EXECUTE ON FUNCTION hr_public.get_employee_goals(UUID, VARCHAR, BOOLEAN) TO hr_graphile_role;
GRANT EXECUTE ON FUNCTION hr_public.get_team_goals_overview(UUID, VARCHAR) TO hr_graphile_role;
GRANT EXECUTE ON FUNCTION hr_public.get_goal_progress_history(UUID) TO hr_graphile_role;
GRANT EXECUTE ON FUNCTION hr_public.get_goal_statistics(UUID, DATE, DATE) TO hr_graphile_role;

-- Enable RLS (will be configured in separate RLS migration)
ALTER TABLE hr_public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_public.goal_progress_updates ENABLE ROW LEVEL SECURITY;

-- Add table and column comments
COMMENT ON TABLE hr_public.goals IS 'Performance and development goals with progress tracking and review integration';
COMMENT ON TABLE hr_public.goal_progress_updates IS 'Historical tracking of goal progress changes and milestones';

COMMENT ON COLUMN hr_public.goals.employee_id IS 'Employee who owns this goal';
COMMENT ON COLUMN hr_public.goals.manager_id IS 'Manager who assigned or oversees this goal';
COMMENT ON COLUMN hr_public.goals.goal_type IS 'Type: PERFORMANCE, DEVELOPMENT, PROJECT, TEAM, LEARNING, LEADERSHIP';
COMMENT ON COLUMN hr_public.goals.category IS 'Category: SALES, QUALITY, EFFICIENCY, LEADERSHIP, TECHNICAL, etc.';
COMMENT ON COLUMN hr_public.goals.status IS 'Status: ACTIVE, COMPLETED, CANCELLED, ON_HOLD, OVERDUE';
COMMENT ON COLUMN hr_public.goals.progress_percentage IS 'Progress percentage (0-100)';
COMMENT ON COLUMN hr_public.goals.weight_percentage IS 'Importance weighting in performance review (1-100)';
COMMENT ON COLUMN hr_public.goals.success_metrics IS 'JSON object storing measurable success criteria';
COMMENT ON COLUMN hr_public.goals.review_cycle_id IS 'Associated performance review cycle (when available)';

COMMENT ON FUNCTION hr_public.update_goal_status() IS 'Auto-updates goal status based on progress and dates';
COMMENT ON FUNCTION hr_public.validate_goal_permissions() IS 'Validates goal creation/modification permissions';
COMMENT ON FUNCTION hr_public.track_goal_progress_changes() IS 'Tracks history of goal progress changes';
COMMENT ON FUNCTION hr_public.get_employee_goals(UUID, VARCHAR, BOOLEAN) IS 'Returns employee goals with progress statistics';
COMMENT ON FUNCTION hr_public.get_team_goals_overview(UUID, VARCHAR) IS 'Returns team goals overview for managers';
COMMENT ON FUNCTION hr_public.get_goal_progress_history(UUID) IS 'Returns detailed progress history for a goal';
COMMENT ON FUNCTION hr_public.get_goal_statistics(UUID, DATE, DATE) IS 'Returns goal statistics and metrics';

COMMIT;