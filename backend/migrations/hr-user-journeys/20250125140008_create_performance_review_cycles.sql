-- HR User Journeys Migration: Create Performance Review Cycles Table
-- Created: 2025-01-25T14:00:08.000Z
--
-- This migration creates the performance_review_cycles table for managing review periods.
-- Supports annual, quarterly, and custom review cycles with configurable workflows.

BEGIN;

-- Create performance_review_cycles table
CREATE TABLE hr_public.performance_review_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Cycle details
  name VARCHAR(100) NOT NULL,
  description TEXT,
  cycle_type VARCHAR(30) NOT NULL,

  -- Timeline
  cycle_year INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  review_deadline DATE NOT NULL,

  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'PLANNED',

  -- Configuration
  requires_self_review BOOLEAN NOT NULL DEFAULT TRUE,
  requires_manager_review BOOLEAN NOT NULL DEFAULT TRUE,
  requires_hr_review BOOLEAN NOT NULL DEFAULT FALSE,
  allow_peer_feedback BOOLEAN NOT NULL DEFAULT FALSE,

  -- Goal integration
  auto_create_goals BOOLEAN NOT NULL DEFAULT FALSE,
  goal_setting_deadline DATE,

  -- Notification settings
  reminder_days_before_deadline INTEGER[] DEFAULT ARRAY[14, 7, 3, 1],
  escalation_days_after_deadline INTEGER DEFAULT 3,

  -- Templates
  self_review_template_id UUID,
  manager_review_template_id UUID,
  hr_review_template_id UUID,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_by UUID NOT NULL REFERENCES hr_public.users(id),
  updated_by UUID REFERENCES hr_public.users(id)
);

-- Add constraints for cycle_type values
ALTER TABLE hr_public.performance_review_cycles
  ADD CONSTRAINT review_cycles_cycle_type_check
  CHECK (cycle_type IN ('ANNUAL', 'SEMI_ANNUAL', 'QUARTERLY', 'MONTHLY', 'CUSTOM'));

-- Add constraints for status values
ALTER TABLE hr_public.performance_review_cycles
  ADD CONSTRAINT review_cycles_status_check
  CHECK (status IN ('PLANNED', 'ACTIVE', 'COMPLETED', 'CANCELLED'));

-- Add constraint to ensure end_date is after start_date
ALTER TABLE hr_public.performance_review_cycles
  ADD CONSTRAINT review_cycles_date_range_check
  CHECK (end_date >= start_date);

-- Add constraint to ensure review_deadline is after end_date
ALTER TABLE hr_public.performance_review_cycles
  ADD CONSTRAINT review_cycles_deadline_check
  CHECK (review_deadline >= end_date);

-- Add constraint to ensure cycle_year is reasonable
ALTER TABLE hr_public.performance_review_cycles
  ADD CONSTRAINT review_cycles_year_check
  CHECK (cycle_year >= 2020 AND cycle_year <= 2050);

-- Add constraint for goal_setting_deadline
ALTER TABLE hr_public.performance_review_cycles
  ADD CONSTRAINT review_cycles_goal_deadline_check
  CHECK (goal_setting_deadline IS NULL OR goal_setting_deadline >= start_date);

-- Create indexes for performance
CREATE INDEX idx_review_cycles_cycle_year ON hr_public.performance_review_cycles(cycle_year);
CREATE INDEX idx_review_cycles_cycle_type ON hr_public.performance_review_cycles(cycle_type);
CREATE INDEX idx_review_cycles_status ON hr_public.performance_review_cycles(status);
CREATE INDEX idx_review_cycles_start_date ON hr_public.performance_review_cycles(start_date);
CREATE INDEX idx_review_cycles_end_date ON hr_public.performance_review_cycles(end_date);
CREATE INDEX idx_review_cycles_review_deadline ON hr_public.performance_review_cycles(review_deadline);
CREATE INDEX idx_review_cycles_created_at ON hr_public.performance_review_cycles(created_at);

-- Create composite indexes for common queries
CREATE INDEX idx_review_cycles_year_type ON hr_public.performance_review_cycles(cycle_year, cycle_type);
CREATE INDEX idx_review_cycles_status_deadline ON hr_public.performance_review_cycles(status, review_deadline);
CREATE INDEX idx_review_cycles_active ON hr_public.performance_review_cycles(status, start_date, end_date) WHERE status = 'ACTIVE';

-- Create function to auto-update review cycle status
CREATE OR REPLACE FUNCTION hr_public.update_review_cycle_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-activate cycles when start date is reached
  IF NEW.status = 'PLANNED' AND NEW.start_date <= CURRENT_DATE THEN
    NEW.status := 'ACTIVE';
  END IF;

  -- Auto-complete cycles when deadline has passed and all reviews are done
  -- (This will be enhanced when performance_reviews table is created)
  IF NEW.status = 'ACTIVE' AND NEW.review_deadline < CURRENT_DATE THEN
    -- For now, just keep it active - will enhance with review completion check later
    -- NEW.status := 'COMPLETED';
  END IF;

  -- Set updated_at
  NEW.updated_at := NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-updating review cycle status
CREATE TRIGGER tr_update_review_cycle_status
  BEFORE INSERT OR UPDATE ON hr_public.performance_review_cycles
  FOR EACH ROW
  EXECUTE FUNCTION hr_public.update_review_cycle_status();

-- Add foreign key constraint to goals table for review_cycle_id
-- This establishes the relationship now that both tables exist
ALTER TABLE hr_public.goals
  ADD CONSTRAINT goals_review_cycle_id_fkey
  FOREIGN KEY (review_cycle_id) REFERENCES hr_public.performance_review_cycles(id);

-- Create cycle participants table to track who should participate in each cycle
CREATE TABLE hr_public.review_cycle_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_cycle_id UUID NOT NULL REFERENCES hr_public.performance_review_cycles(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES hr_public.users(id) ON DELETE CASCADE,
  manager_id UUID REFERENCES hr_public.users(id),

  -- Participation status
  status VARCHAR(20) NOT NULL DEFAULT 'ASSIGNED',

  -- Review requirements for this participant
  self_review_required BOOLEAN NOT NULL DEFAULT TRUE,
  manager_review_required BOOLEAN NOT NULL DEFAULT TRUE,
  hr_review_required BOOLEAN NOT NULL DEFAULT FALSE,

  -- Progress tracking
  self_review_completed BOOLEAN NOT NULL DEFAULT FALSE,
  manager_review_completed BOOLEAN NOT NULL DEFAULT FALSE,
  hr_review_completed BOOLEAN NOT NULL DEFAULT FALSE,
  self_review_completed_at TIMESTAMPTZ,
  manager_review_completed_at TIMESTAMPTZ,
  hr_review_completed_at TIMESTAMPTZ,

  -- Deadline overrides (if different from cycle defaults)
  custom_deadline DATE,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_by UUID NOT NULL REFERENCES hr_public.users(id),

  UNIQUE(review_cycle_id, employee_id)
);

-- Add constraints for participant status
ALTER TABLE hr_public.review_cycle_participants
  ADD CONSTRAINT review_cycle_participants_status_check
  CHECK (status IN ('ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED', 'OVERDUE'));

-- Create indexes for cycle participants
CREATE INDEX idx_review_cycle_participants_cycle_id ON hr_public.review_cycle_participants(review_cycle_id);
CREATE INDEX idx_review_cycle_participants_employee_id ON hr_public.review_cycle_participants(employee_id);
CREATE INDEX idx_review_cycle_participants_manager_id ON hr_public.review_cycle_participants(manager_id) WHERE manager_id IS NOT NULL;
CREATE INDEX idx_review_cycle_participants_status ON hr_public.review_cycle_participants(status);
CREATE INDEX idx_review_cycle_participants_cycle_status ON hr_public.review_cycle_participants(review_cycle_id, status);

-- Create function to automatically assign employees to review cycles
CREATE OR REPLACE FUNCTION hr_public.assign_employees_to_review_cycle(
  p_review_cycle_id UUID,
  p_department_ids UUID[] DEFAULT NULL,
  p_role_levels INTEGER[] DEFAULT NULL,
  p_manager_ids UUID[] DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  assigned_count INTEGER;
  employee_query TEXT;
BEGIN
  -- Build dynamic query for employee selection
  employee_query := 'SELECT id, manager_id FROM hr_public.users WHERE employment_status = ''active''';

  -- Add department filter
  IF p_department_ids IS NOT NULL THEN
    employee_query := employee_query || ' AND department_id = ANY($2)';
  END IF;

  -- Add role level filter
  IF p_role_levels IS NOT NULL THEN
    employee_query := employee_query || ' AND role_level = ANY($3)';
  END IF;

  -- Add manager filter
  IF p_manager_ids IS NOT NULL THEN
    employee_query := employee_query || ' AND manager_id = ANY($4)';
  END IF;

  -- Execute dynamic query and insert participants
  EXECUTE format('
    INSERT INTO hr_public.review_cycle_participants (
      review_cycle_id, employee_id, manager_id, created_by
    )
    SELECT $1, u.id, u.manager_id, $1
    FROM (%s) u
    ON CONFLICT (review_cycle_id, employee_id) DO NOTHING',
    employee_query
  ) USING p_review_cycle_id, p_department_ids, p_role_levels, p_manager_ids;

  GET DIAGNOSTICS assigned_count = ROW_COUNT;
  RETURN assigned_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to get review cycle progress summary
CREATE OR REPLACE FUNCTION hr_public.get_review_cycle_progress(p_review_cycle_id UUID)
RETURNS TABLE(
  cycle_name VARCHAR(100),
  cycle_status VARCHAR(20),
  total_participants INTEGER,
  completed_participants INTEGER,
  in_progress_participants INTEGER,
  not_started_participants INTEGER,
  overdue_participants INTEGER,
  self_reviews_completed INTEGER,
  manager_reviews_completed INTEGER,
  hr_reviews_completed INTEGER,
  completion_percentage NUMERIC,
  days_until_deadline INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    rc.name as cycle_name,
    rc.status as cycle_status,
    COUNT(rcp.id)::INTEGER as total_participants,
    COUNT(CASE WHEN rcp.status = 'COMPLETED' THEN 1 END)::INTEGER as completed_participants,
    COUNT(CASE WHEN rcp.status = 'IN_PROGRESS' THEN 1 END)::INTEGER as in_progress_participants,
    COUNT(CASE WHEN rcp.status = 'ASSIGNED' THEN 1 END)::INTEGER as not_started_participants,
    COUNT(CASE WHEN rcp.status = 'OVERDUE' THEN 1 END)::INTEGER as overdue_participants,
    COUNT(CASE WHEN rcp.self_review_completed THEN 1 END)::INTEGER as self_reviews_completed,
    COUNT(CASE WHEN rcp.manager_review_completed THEN 1 END)::INTEGER as manager_reviews_completed,
    COUNT(CASE WHEN rcp.hr_review_completed THEN 1 END)::INTEGER as hr_reviews_completed,
    CASE
      WHEN COUNT(rcp.id) > 0 THEN
        (COUNT(CASE WHEN rcp.status = 'COMPLETED' THEN 1 END) * 100.0 / COUNT(rcp.id))
      ELSE 0
    END as completion_percentage,
    (rc.review_deadline - CURRENT_DATE)::INTEGER as days_until_deadline
  FROM hr_public.performance_review_cycles rc
  LEFT JOIN hr_public.review_cycle_participants rcp ON rc.id = rcp.review_cycle_id
  WHERE rc.id = p_review_cycle_id
  GROUP BY rc.id, rc.name, rc.status, rc.review_deadline;
END;
$$ LANGUAGE plpgsql STABLE;

-- Create function to get employee's review cycles
CREATE OR REPLACE FUNCTION hr_public.get_employee_review_cycles(
  p_employee_id UUID,
  p_status VARCHAR(20) DEFAULT NULL,
  p_include_completed BOOLEAN DEFAULT FALSE
)
RETURNS TABLE(
  cycle_id UUID,
  cycle_name VARCHAR(100),
  cycle_type VARCHAR(30),
  cycle_year INTEGER,
  cycle_status VARCHAR(20),
  participant_status VARCHAR(20),
  self_review_required BOOLEAN,
  manager_review_required BOOLEAN,
  hr_review_required BOOLEAN,
  self_review_completed BOOLEAN,
  manager_review_completed BOOLEAN,
  hr_review_completed BOOLEAN,
  review_deadline DATE,
  days_until_deadline INTEGER,
  is_overdue BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    rc.id as cycle_id,
    rc.name as cycle_name,
    rc.cycle_type,
    rc.cycle_year,
    rc.status as cycle_status,
    rcp.status as participant_status,
    rcp.self_review_required,
    rcp.manager_review_required,
    rcp.hr_review_required,
    rcp.self_review_completed,
    rcp.manager_review_completed,
    rcp.hr_review_completed,
    COALESCE(rcp.custom_deadline, rc.review_deadline) as review_deadline,
    (COALESCE(rcp.custom_deadline, rc.review_deadline) - CURRENT_DATE)::INTEGER as days_until_deadline,
    (COALESCE(rcp.custom_deadline, rc.review_deadline) < CURRENT_DATE AND rcp.status != 'COMPLETED') as is_overdue
  FROM hr_public.performance_review_cycles rc
  INNER JOIN hr_public.review_cycle_participants rcp ON rc.id = rcp.review_cycle_id
  WHERE rcp.employee_id = p_employee_id
  AND (p_status IS NULL OR rcp.status = p_status)
  AND (p_include_completed OR rcp.status != 'COMPLETED')
  ORDER BY
    CASE rcp.status
      WHEN 'OVERDUE' THEN 1
      WHEN 'IN_PROGRESS' THEN 2
      WHEN 'ASSIGNED' THEN 3
      WHEN 'COMPLETED' THEN 4
      WHEN 'SKIPPED' THEN 5
    END,
    COALESCE(rcp.custom_deadline, rc.review_deadline) ASC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Create function to get manager's team review assignments
CREATE OR REPLACE FUNCTION hr_public.get_manager_review_assignments(
  p_manager_id UUID,
  p_review_cycle_id UUID DEFAULT NULL
)
RETURNS TABLE(
  cycle_id UUID,
  cycle_name VARCHAR(100),
  employee_id UUID,
  employee_name TEXT,
  employee_email TEXT,
  participant_status VARCHAR(20),
  self_review_completed BOOLEAN,
  manager_review_completed BOOLEAN,
  review_deadline DATE,
  days_until_deadline INTEGER,
  is_overdue BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    rc.id as cycle_id,
    rc.name as cycle_name,
    rcp.employee_id,
    u.display_name as employee_name,
    u.email as employee_email,
    rcp.status as participant_status,
    rcp.self_review_completed,
    rcp.manager_review_completed,
    COALESCE(rcp.custom_deadline, rc.review_deadline) as review_deadline,
    (COALESCE(rcp.custom_deadline, rc.review_deadline) - CURRENT_DATE)::INTEGER as days_until_deadline,
    (COALESCE(rcp.custom_deadline, rc.review_deadline) < CURRENT_DATE AND rcp.status != 'COMPLETED') as is_overdue
  FROM hr_public.performance_review_cycles rc
  INNER JOIN hr_public.review_cycle_participants rcp ON rc.id = rcp.review_cycle_id
  INNER JOIN hr_public.users u ON rcp.employee_id = u.id
  WHERE rcp.manager_id = p_manager_id
  AND rcp.manager_review_required = TRUE
  AND (p_review_cycle_id IS NULL OR rc.id = p_review_cycle_id)
  ORDER BY
    CASE rcp.status
      WHEN 'OVERDUE' THEN 1
      WHEN 'IN_PROGRESS' THEN 2
      WHEN 'ASSIGNED' THEN 3
      WHEN 'COMPLETED' THEN 4
    END,
    COALESCE(rcp.custom_deadline, rc.review_deadline) ASC,
    u.display_name ASC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Create function to update participant status based on review completion
CREATE OR REPLACE FUNCTION hr_public.update_participant_review_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Update participant status based on completed reviews
  IF NEW.self_review_completed AND NEW.manager_review_completed AND
     (NOT NEW.hr_review_required OR NEW.hr_review_completed) THEN
    NEW.status := 'COMPLETED';
  ELSIF NEW.self_review_completed OR NEW.manager_review_completed OR NEW.hr_review_completed THEN
    NEW.status := 'IN_PROGRESS';
  END IF;

  -- Check if overdue
  IF NEW.status NOT IN ('COMPLETED', 'SKIPPED') THEN
    -- Get the applicable deadline
    DECLARE
      applicable_deadline DATE;
    BEGIN
      SELECT COALESCE(NEW.custom_deadline, rc.review_deadline) INTO applicable_deadline
      FROM hr_public.performance_review_cycles rc
      WHERE rc.id = NEW.review_cycle_id;

      IF applicable_deadline < CURRENT_DATE THEN
        NEW.status := 'OVERDUE';
      END IF;
    END;
  END IF;

  -- Set updated_at
  NEW.updated_at := NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating participant status
CREATE TRIGGER tr_update_participant_review_status
  BEFORE UPDATE ON hr_public.review_cycle_participants
  FOR EACH ROW
  EXECUTE FUNCTION hr_public.update_participant_review_status();

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON hr_public.performance_review_cycles TO hr_graphile_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON hr_public.review_cycle_participants TO hr_graphile_role;
GRANT EXECUTE ON FUNCTION hr_public.update_review_cycle_status() TO hr_graphile_role;
GRANT EXECUTE ON FUNCTION hr_public.assign_employees_to_review_cycle(UUID, UUID[], INTEGER[], UUID[]) TO hr_graphile_role;
GRANT EXECUTE ON FUNCTION hr_public.get_review_cycle_progress(UUID) TO hr_graphile_role;
GRANT EXECUTE ON FUNCTION hr_public.get_employee_review_cycles(UUID, VARCHAR, BOOLEAN) TO hr_graphile_role;
GRANT EXECUTE ON FUNCTION hr_public.get_manager_review_assignments(UUID, UUID) TO hr_graphile_role;
GRANT EXECUTE ON FUNCTION hr_public.update_participant_review_status() TO hr_graphile_role;

-- Enable RLS (will be configured in separate RLS migration)
ALTER TABLE hr_public.performance_review_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_public.review_cycle_participants ENABLE ROW LEVEL SECURITY;

-- Add table and column comments
COMMENT ON TABLE hr_public.performance_review_cycles IS 'Performance review cycles with configurable workflows and timelines';
COMMENT ON TABLE hr_public.review_cycle_participants IS 'Employees participating in performance review cycles with progress tracking';

COMMENT ON COLUMN hr_public.performance_review_cycles.cycle_type IS 'Type: ANNUAL, SEMI_ANNUAL, QUARTERLY, MONTHLY, CUSTOM';
COMMENT ON COLUMN hr_public.performance_review_cycles.status IS 'Status: PLANNED, ACTIVE, COMPLETED, CANCELLED';
COMMENT ON COLUMN hr_public.performance_review_cycles.requires_self_review IS 'Whether employees must complete self-review';
COMMENT ON COLUMN hr_public.performance_review_cycles.requires_manager_review IS 'Whether managers must complete review for direct reports';
COMMENT ON COLUMN hr_public.performance_review_cycles.requires_hr_review IS 'Whether HR must complete review';
COMMENT ON COLUMN hr_public.performance_review_cycles.allow_peer_feedback IS 'Whether peer feedback is enabled for this cycle';
COMMENT ON COLUMN hr_public.performance_review_cycles.auto_create_goals IS 'Whether to auto-create goals for next period';

COMMENT ON FUNCTION hr_public.update_review_cycle_status() IS 'Auto-updates review cycle status based on dates';
COMMENT ON FUNCTION hr_public.assign_employees_to_review_cycle(UUID, UUID[], INTEGER[], UUID[]) IS 'Assigns employees to review cycle based on criteria';
COMMENT ON FUNCTION hr_public.get_review_cycle_progress(UUID) IS 'Returns comprehensive progress summary for review cycle';
COMMENT ON FUNCTION hr_public.get_employee_review_cycles(UUID, VARCHAR, BOOLEAN) IS 'Returns employee''s review cycles with completion status';
COMMENT ON FUNCTION hr_public.get_manager_review_assignments(UUID, UUID) IS 'Returns manager''s team review assignments';

COMMIT;