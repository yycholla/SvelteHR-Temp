-- HR User Journeys Migration: Create Projects Table
-- Created: 2025-01-25T14:00:07.000Z
--
-- This migration creates the projects table for project management and time tracking.
-- Supports project hierarchies, budgeting, time allocation, and status tracking.

BEGIN;

-- Create projects table
CREATE TABLE hr_public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Project details
  name VARCHAR(200) NOT NULL,
  description TEXT,
  project_code VARCHAR(20) UNIQUE,
  client_name VARCHAR(100),

  -- Timeline
  start_date DATE,
  end_date DATE,
  estimated_hours NUMERIC(8,2),
  actual_hours NUMERIC(8,2) NOT NULL DEFAULT 0,

  -- Financial
  budget NUMERIC(12,2),
  hourly_rate NUMERIC(8,2),
  is_billable BOOLEAN NOT NULL DEFAULT FALSE,

  -- Management
  project_manager_id UUID REFERENCES hr_public.users(id),
  department_id UUID REFERENCES hr_public.departments(id),

  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'PLANNED',
  priority VARCHAR(10) NOT NULL DEFAULT 'MEDIUM',

  -- Progress tracking
  progress_percentage INTEGER NOT NULL DEFAULT 0 CHECK (progress_percentage BETWEEN 0 AND 100),
  completion_date DATE,

  -- Project hierarchy
  parent_project_id UUID REFERENCES hr_public.projects(id),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_by UUID NOT NULL REFERENCES hr_public.users(id),
  updated_by UUID REFERENCES hr_public.users(id)
);

-- Add constraints for status values
ALTER TABLE hr_public.projects
  ADD CONSTRAINT projects_status_check
  CHECK (status IN ('PLANNED', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED'));

-- Add constraints for priority values
ALTER TABLE hr_public.projects
  ADD CONSTRAINT projects_priority_check
  CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'));

-- Add constraint to ensure end_date is after start_date
ALTER TABLE hr_public.projects
  ADD CONSTRAINT projects_date_range_check
  CHECK (start_date IS NULL OR end_date IS NULL OR end_date >= start_date);

-- Add constraint to ensure completion_date is reasonable
ALTER TABLE hr_public.projects
  ADD CONSTRAINT projects_completion_date_check
  CHECK (completion_date IS NULL OR (start_date IS NULL OR completion_date >= start_date));

-- Add constraint to prevent negative values
ALTER TABLE hr_public.projects
  ADD CONSTRAINT projects_positive_values_check
  CHECK (
    (estimated_hours IS NULL OR estimated_hours > 0) AND
    actual_hours >= 0 AND
    (budget IS NULL OR budget >= 0) AND
    (hourly_rate IS NULL OR hourly_rate >= 0)
  );

-- Add constraint to prevent self-referencing parent
ALTER TABLE hr_public.projects
  ADD CONSTRAINT projects_no_self_parent_check
  CHECK (parent_project_id != id);

-- Create indexes for performance
CREATE INDEX idx_projects_project_manager_id ON hr_public.projects(project_manager_id) WHERE project_manager_id IS NOT NULL;
CREATE INDEX idx_projects_department_id ON hr_public.projects(department_id) WHERE department_id IS NOT NULL;
CREATE INDEX idx_projects_status ON hr_public.projects(status);
CREATE INDEX idx_projects_priority ON hr_public.projects(priority);
CREATE INDEX idx_projects_client_name ON hr_public.projects(client_name) WHERE client_name IS NOT NULL;
CREATE INDEX idx_projects_start_date ON hr_public.projects(start_date) WHERE start_date IS NOT NULL;
CREATE INDEX idx_projects_end_date ON hr_public.projects(end_date) WHERE end_date IS NOT NULL;
CREATE INDEX idx_projects_project_code ON hr_public.projects(project_code) WHERE project_code IS NOT NULL;
CREATE INDEX idx_projects_parent_project_id ON hr_public.projects(parent_project_id) WHERE parent_project_id IS NOT NULL;
CREATE INDEX idx_projects_created_at ON hr_public.projects(created_at);

-- Create composite indexes for common queries
CREATE INDEX idx_projects_manager_status ON hr_public.projects(project_manager_id, status);
CREATE INDEX idx_projects_department_status ON hr_public.projects(department_id, status);
CREATE INDEX idx_projects_active_by_date ON hr_public.projects(status, start_date, end_date) WHERE status = 'ACTIVE';

-- Create function to auto-update project status and progress
CREATE OR REPLACE FUNCTION hr_public.update_project_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-complete projects when progress reaches 100%
  IF NEW.progress_percentage = 100 AND NEW.status IN ('PLANNED', 'ACTIVE', 'ON_HOLD') THEN
    NEW.status := 'COMPLETED';
    NEW.completion_date := CURRENT_DATE;
  END IF;

  -- Reset completion date if progress drops below 100%
  IF NEW.progress_percentage < 100 AND NEW.status = 'COMPLETED' THEN
    NEW.completion_date := NULL;
  END IF;

  -- Auto-activate projects that have started
  IF NEW.status = 'PLANNED' AND NEW.start_date IS NOT NULL AND NEW.start_date <= CURRENT_DATE THEN
    NEW.status := 'ACTIVE';
  END IF;

  -- Validate project manager has appropriate permissions
  IF NEW.project_manager_id IS NOT NULL THEN
    -- Ensure project manager has at least Manager role level (60)
    IF EXISTS (
      SELECT 1 FROM hr_public.users
      WHERE id = NEW.project_manager_id
      AND role_level < 60
    ) THEN
      RAISE EXCEPTION 'Project manager must have Manager role level or higher';
    END IF;
  END IF;

  -- Set updated_at
  NEW.updated_at := NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-updating project status
CREATE TRIGGER tr_update_project_status
  BEFORE INSERT OR UPDATE ON hr_public.projects
  FOR EACH ROW
  EXECUTE FUNCTION hr_public.update_project_status();

-- Create function to validate project hierarchy depth
CREATE OR REPLACE FUNCTION hr_public.validate_project_hierarchy()
RETURNS TRIGGER AS $$
DECLARE
  hierarchy_depth INTEGER;
  max_depth INTEGER := 5; -- Configurable maximum hierarchy depth
BEGIN
  -- Only check if parent_project_id is being set
  IF NEW.parent_project_id IS NOT NULL THEN
    -- Check for circular references using recursive CTE
    WITH RECURSIVE project_hierarchy AS (
      -- Base case: start with the parent project
      SELECT
        id,
        parent_project_id,
        1 as depth
      FROM hr_public.projects
      WHERE id = NEW.parent_project_id

      UNION ALL

      -- Recursive case: traverse up the hierarchy
      SELECT
        p.id,
        p.parent_project_id,
        ph.depth + 1
      FROM hr_public.projects p
      INNER JOIN project_hierarchy ph ON p.id = ph.parent_project_id
      WHERE ph.depth < max_depth + 1 -- Prevent infinite recursion
    )
    SELECT MAX(depth) INTO hierarchy_depth
    FROM project_hierarchy;

    -- Check if we found the current project in its own hierarchy (circular reference)
    IF EXISTS (
      WITH RECURSIVE project_hierarchy AS (
        SELECT id, parent_project_id, 1 as depth
        FROM hr_public.projects
        WHERE id = NEW.parent_project_id

        UNION ALL

        SELECT p.id, p.parent_project_id, ph.depth + 1
        FROM hr_public.projects p
        INNER JOIN project_hierarchy ph ON p.id = ph.parent_project_id
        WHERE ph.depth < max_depth + 1
      )
      SELECT 1 FROM project_hierarchy WHERE id = NEW.id
    ) THEN
      RAISE EXCEPTION 'Circular reference detected in project hierarchy';
    END IF;

    -- Check maximum depth
    IF hierarchy_depth >= max_depth THEN
      RAISE EXCEPTION 'Project hierarchy depth cannot exceed % levels', max_depth;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for project hierarchy validation
CREATE TRIGGER tr_validate_project_hierarchy
  BEFORE INSERT OR UPDATE ON hr_public.projects
  FOR EACH ROW
  WHEN (NEW.parent_project_id IS NOT NULL)
  EXECUTE FUNCTION hr_public.validate_project_hierarchy();

-- Create project team members association table
CREATE TABLE hr_public.project_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES hr_public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES hr_public.users(id) ON DELETE CASCADE,

  -- Role in project
  role VARCHAR(50) NOT NULL DEFAULT 'MEMBER',

  -- Time allocation
  allocation_percentage INTEGER NOT NULL DEFAULT 100 CHECK (allocation_percentage BETWEEN 1 AND 100),
  hourly_rate NUMERIC(8,2), -- Override project rate for specific member

  -- Timeline
  assigned_date DATE NOT NULL DEFAULT CURRENT_DATE,
  start_date DATE,
  end_date DATE,

  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_by UUID NOT NULL REFERENCES hr_public.users(id),
  updated_by UUID REFERENCES hr_public.users(id),

  UNIQUE(project_id, user_id)
);

-- Add constraints for project team member roles
ALTER TABLE hr_public.project_team_members
  ADD CONSTRAINT project_team_members_role_check
  CHECK (role IN ('MEMBER', 'LEAD', 'ARCHITECT', 'ANALYST', 'TESTER', 'DESIGNER', 'CONSULTANT'));

-- Add constraints for project team member status
ALTER TABLE hr_public.project_team_members
  ADD CONSTRAINT project_team_members_status_check
  CHECK (status IN ('ACTIVE', 'INACTIVE', 'COMPLETED'));

-- Add constraint for date ranges
ALTER TABLE hr_public.project_team_members
  ADD CONSTRAINT project_team_members_date_check
  CHECK (start_date IS NULL OR end_date IS NULL OR end_date >= start_date);

-- Create indexes for project team members
CREATE INDEX idx_project_team_members_project_id ON hr_public.project_team_members(project_id);
CREATE INDEX idx_project_team_members_user_id ON hr_public.project_team_members(user_id);
CREATE INDEX idx_project_team_members_status ON hr_public.project_team_members(status);
CREATE INDEX idx_project_team_members_project_status ON hr_public.project_team_members(project_id, status);

-- Create function to get project details with team and progress
CREATE OR REPLACE FUNCTION hr_public.get_project_details(p_project_id UUID)
RETURNS TABLE(
  id UUID,
  name VARCHAR(200),
  description TEXT,
  project_code VARCHAR(20),
  client_name VARCHAR(100),
  status VARCHAR(20),
  priority VARCHAR(10),
  progress_percentage INTEGER,
  start_date DATE,
  end_date DATE,
  completion_date DATE,
  estimated_hours NUMERIC,
  actual_hours NUMERIC,
  budget NUMERIC,
  hourly_rate NUMERIC,
  is_billable BOOLEAN,
  project_manager_name TEXT,
  department_name TEXT,
  team_member_count INTEGER,
  days_remaining INTEGER,
  is_overdue BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.description,
    p.project_code,
    p.client_name,
    p.status,
    p.priority,
    p.progress_percentage,
    p.start_date,
    p.end_date,
    p.completion_date,
    p.estimated_hours,
    p.actual_hours,
    p.budget,
    p.hourly_rate,
    p.is_billable,
    pm.display_name as project_manager_name,
    d.name as department_name,
    (SELECT COUNT(*)::INTEGER FROM hr_public.project_team_members ptm
     WHERE ptm.project_id = p.id AND ptm.status = 'ACTIVE') as team_member_count,
    CASE
      WHEN p.end_date IS NOT NULL THEN (p.end_date - CURRENT_DATE)::INTEGER
      ELSE NULL
    END as days_remaining,
    (p.status IN ('ACTIVE', 'PLANNED') AND p.end_date IS NOT NULL AND p.end_date < CURRENT_DATE) as is_overdue
  FROM hr_public.projects p
  LEFT JOIN hr_public.users pm ON p.project_manager_id = pm.id
  LEFT JOIN hr_public.departments d ON p.department_id = d.id
  WHERE p.id = p_project_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- Create function to get projects for a user (managed or team member)
CREATE OR REPLACE FUNCTION hr_public.get_user_projects(
  p_user_id UUID,
  p_status VARCHAR(20) DEFAULT NULL,
  p_include_completed BOOLEAN DEFAULT FALSE
)
RETURNS TABLE(
  id UUID,
  name VARCHAR(200),
  project_code VARCHAR(20),
  client_name VARCHAR(100),
  status VARCHAR(20),
  priority VARCHAR(10),
  progress_percentage INTEGER,
  user_role VARCHAR(50),
  is_manager BOOLEAN,
  start_date DATE,
  end_date DATE,
  days_remaining INTEGER,
  is_overdue BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    p.id,
    p.name,
    p.project_code,
    p.client_name,
    p.status,
    p.priority,
    p.progress_percentage,
    COALESCE(ptm.role, 'MANAGER') as user_role,
    (p.project_manager_id = p_user_id) as is_manager,
    p.start_date,
    p.end_date,
    CASE
      WHEN p.end_date IS NOT NULL THEN (p.end_date - CURRENT_DATE)::INTEGER
      ELSE NULL
    END as days_remaining,
    (p.status IN ('ACTIVE', 'PLANNED') AND p.end_date IS NOT NULL AND p.end_date < CURRENT_DATE) as is_overdue
  FROM hr_public.projects p
  LEFT JOIN hr_public.project_team_members ptm ON p.id = ptm.project_id AND ptm.user_id = p_user_id
  WHERE (p.project_manager_id = p_user_id OR ptm.user_id = p_user_id)
  AND (p_status IS NULL OR p.status = p_status)
  AND (p_include_completed OR p.status != 'COMPLETED')
  ORDER BY
    CASE p.priority
      WHEN 'CRITICAL' THEN 1
      WHEN 'HIGH' THEN 2
      WHEN 'MEDIUM' THEN 3
      WHEN 'LOW' THEN 4
    END,
    CASE p.status
      WHEN 'ACTIVE' THEN 1
      WHEN 'PLANNED' THEN 2
      WHEN 'ON_HOLD' THEN 3
      WHEN 'COMPLETED' THEN 4
      WHEN 'CANCELLED' THEN 5
    END,
    p.end_date ASC NULLS LAST;
END;
$$ LANGUAGE plpgsql STABLE;

-- Create function to update project actual hours from time entries
CREATE OR REPLACE FUNCTION hr_public.update_project_actual_hours(p_project_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  total_hours NUMERIC;
BEGIN
  -- Calculate total approved hours for the project
  SELECT COALESCE(SUM(total_hours), 0) INTO total_hours
  FROM hr_public.time_entries
  WHERE project_id = p_project_id
  AND status = 'APPROVED';

  -- Update the project's actual hours
  UPDATE hr_public.projects
  SET actual_hours = total_hours,
      updated_at = NOW()
  WHERE id = p_project_id;

  RETURN total_hours;
END;
$$ LANGUAGE plpgsql;

-- Create function to get project statistics
CREATE OR REPLACE FUNCTION hr_public.get_project_statistics(
  p_project_manager_id UUID DEFAULT NULL,
  p_department_id UUID DEFAULT NULL,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE(
  total_projects INTEGER,
  active_projects INTEGER,
  completed_projects INTEGER,
  overdue_projects INTEGER,
  total_budget NUMERIC,
  total_actual_hours NUMERIC,
  average_completion_rate NUMERIC,
  on_time_completion_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::INTEGER as total_projects,
    COUNT(CASE WHEN p.status = 'ACTIVE' THEN 1 END)::INTEGER as active_projects,
    COUNT(CASE WHEN p.status = 'COMPLETED' THEN 1 END)::INTEGER as completed_projects,
    COUNT(CASE WHEN p.status IN ('ACTIVE', 'PLANNED') AND p.end_date < CURRENT_DATE THEN 1 END)::INTEGER as overdue_projects,
    COALESCE(SUM(p.budget), 0) as total_budget,
    COALESCE(SUM(p.actual_hours), 0) as total_actual_hours,
    COALESCE(AVG(p.progress_percentage), 0) as average_completion_rate,
    CASE
      WHEN COUNT(CASE WHEN p.status = 'COMPLETED' THEN 1 END) > 0 THEN
        (COUNT(CASE WHEN p.status = 'COMPLETED' AND (p.completion_date <= p.end_date OR p.end_date IS NULL) THEN 1 END) * 100.0 /
         COUNT(CASE WHEN p.status = 'COMPLETED' THEN 1 END))
      ELSE 0
    END as on_time_completion_rate
  FROM hr_public.projects p
  WHERE (p_project_manager_id IS NULL OR p.project_manager_id = p_project_manager_id)
  AND (p_department_id IS NULL OR p.department_id = p_department_id)
  AND (p_start_date IS NULL OR p.start_date >= p_start_date)
  AND (p_end_date IS NULL OR p.end_date <= p_end_date);
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON hr_public.projects TO hr_graphile_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON hr_public.project_team_members TO hr_graphile_role;
GRANT EXECUTE ON FUNCTION hr_public.update_project_status() TO hr_graphile_role;
GRANT EXECUTE ON FUNCTION hr_public.validate_project_hierarchy() TO hr_graphile_role;
GRANT EXECUTE ON FUNCTION hr_public.get_project_details(UUID) TO hr_graphile_role;
GRANT EXECUTE ON FUNCTION hr_public.get_user_projects(UUID, VARCHAR, BOOLEAN) TO hr_graphile_role;
GRANT EXECUTE ON FUNCTION hr_public.update_project_actual_hours(UUID) TO hr_graphile_role;
GRANT EXECUTE ON FUNCTION hr_public.get_project_statistics(UUID, UUID, DATE, DATE) TO hr_graphile_role;

-- Enable RLS (will be configured in separate RLS migration)
ALTER TABLE hr_public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_public.project_team_members ENABLE ROW LEVEL SECURITY;

-- Add table and column comments
COMMENT ON TABLE hr_public.projects IS 'Project management with time tracking, budgeting, and team assignment';
COMMENT ON TABLE hr_public.project_team_members IS 'Project team member assignments with roles and allocation';

COMMENT ON COLUMN hr_public.projects.project_manager_id IS 'User responsible for managing this project';
COMMENT ON COLUMN hr_public.projects.department_id IS 'Department that owns this project';
COMMENT ON COLUMN hr_public.projects.status IS 'Status: PLANNED, ACTIVE, ON_HOLD, COMPLETED, CANCELLED';
COMMENT ON COLUMN hr_public.projects.priority IS 'Priority: LOW, MEDIUM, HIGH, CRITICAL';
COMMENT ON COLUMN hr_public.projects.progress_percentage IS 'Project completion percentage (0-100)';
COMMENT ON COLUMN hr_public.projects.parent_project_id IS 'Parent project for creating project hierarchies';
COMMENT ON COLUMN hr_public.projects.is_billable IS 'Whether time logged to this project is billable';
COMMENT ON COLUMN hr_public.projects.actual_hours IS 'Total approved hours logged to this project (calculated)';

COMMENT ON FUNCTION hr_public.update_project_status() IS 'Auto-updates project status based on progress and dates';
COMMENT ON FUNCTION hr_public.validate_project_hierarchy() IS 'Prevents circular references and excessive hierarchy depth';
COMMENT ON FUNCTION hr_public.get_project_details(UUID) IS 'Returns comprehensive project information with team and progress';
COMMENT ON FUNCTION hr_public.get_user_projects(UUID, VARCHAR, BOOLEAN) IS 'Returns projects for a user (managed or team member)';
COMMENT ON FUNCTION hr_public.update_project_actual_hours(UUID) IS 'Recalculates actual hours from approved time entries';
COMMENT ON FUNCTION hr_public.get_project_statistics(UUID, UUID, DATE, DATE) IS 'Returns project statistics and metrics';

COMMIT;