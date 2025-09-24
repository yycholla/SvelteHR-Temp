-- HR User Journeys Migration: Extend Departments Table
-- Created: 2025-01-25T14:00:09.000Z
--
-- This migration extends the existing departments table with HR-specific fields
-- to support department hierarchies, budgeting, and organizational structure management.

BEGIN;

-- Add HR-specific fields to departments table
ALTER TABLE hr_public.departments
  ADD COLUMN IF NOT EXISTS parent_department_id UUID REFERENCES hr_public.departments(id),
  ADD COLUMN IF NOT EXISTS department_head_id UUID REFERENCES hr_public.users(id),
  ADD COLUMN IF NOT EXISTS budget_code VARCHAR(20),
  ADD COLUMN IF NOT EXISTS cost_center VARCHAR(20),
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS location VARCHAR(100),
  ADD COLUMN IF NOT EXISTS employee_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- Add audit trail fields if they don't exist
ALTER TABLE hr_public.departments
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES hr_public.users(id),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES hr_public.users(id);

-- Add budget and capacity fields
ALTER TABLE hr_public.departments
  ADD COLUMN IF NOT EXISTS annual_budget NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS budget_utilized NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_headcount INTEGER,
  ADD COLUMN IF NOT EXISTS target_headcount INTEGER;

-- Create constraints for department hierarchy
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'departments_no_self_parent_check'
    AND conrelid = 'hr_public.departments'::regclass
  ) THEN
    ALTER TABLE hr_public.departments
      ADD CONSTRAINT departments_no_self_parent_check
      CHECK (parent_department_id != id);
  END IF;
END $$;

-- Create constraints for budget values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'departments_budget_check'
    AND conrelid = 'hr_public.departments'::regclass
  ) THEN
    ALTER TABLE hr_public.departments
      ADD CONSTRAINT departments_budget_check
      CHECK (
        (annual_budget IS NULL OR annual_budget >= 0) AND
        budget_utilized >= 0 AND
        (max_headcount IS NULL OR max_headcount > 0) AND
        (target_headcount IS NULL OR target_headcount > 0) AND
        (max_headcount IS NULL OR target_headcount IS NULL OR target_headcount <= max_headcount)
      );
  END IF;
END $$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_departments_parent_department_id ON hr_public.departments(parent_department_id) WHERE parent_department_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_departments_department_head_id ON hr_public.departments(department_head_id) WHERE department_head_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_departments_is_active ON hr_public.departments(is_active);
CREATE INDEX IF NOT EXISTS idx_departments_budget_code ON hr_public.departments(budget_code) WHERE budget_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_departments_cost_center ON hr_public.departments(cost_center) WHERE cost_center IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_departments_location ON hr_public.departments(location) WHERE location IS NOT NULL;

-- Create unique constraints for business identifiers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'departments_budget_code_unique'
    AND conrelid = 'hr_public.departments'::regclass
  ) THEN
    ALTER TABLE hr_public.departments
      ADD CONSTRAINT departments_budget_code_unique
      UNIQUE (budget_code);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'departments_cost_center_unique'
    AND conrelid = 'hr_public.departments'::regclass
  ) THEN
    ALTER TABLE hr_public.departments
      ADD CONSTRAINT departments_cost_center_unique
      UNIQUE (cost_center);
  END IF;
END $$;

-- Create function to validate department hierarchy
CREATE OR REPLACE FUNCTION hr_public.validate_department_hierarchy()
RETURNS TRIGGER AS $$
DECLARE
  hierarchy_depth INTEGER;
  max_depth INTEGER := 10; -- Configurable maximum hierarchy depth
BEGIN
  -- Only check if parent_department_id is being set
  IF NEW.parent_department_id IS NOT NULL THEN
    -- Check for circular references using recursive CTE
    WITH RECURSIVE dept_hierarchy AS (
      -- Base case: start with the parent department
      SELECT
        id,
        parent_department_id,
        1 as depth
      FROM hr_public.departments
      WHERE id = NEW.parent_department_id

      UNION ALL

      -- Recursive case: traverse up the hierarchy
      SELECT
        d.id,
        d.parent_department_id,
        dh.depth + 1
      FROM hr_public.departments d
      INNER JOIN dept_hierarchy dh ON d.id = dh.parent_department_id
      WHERE dh.depth < max_depth + 1 -- Prevent infinite recursion
    )
    SELECT MAX(depth) INTO hierarchy_depth
    FROM dept_hierarchy;

    -- Check if we found the current department in its own hierarchy (circular reference)
    IF EXISTS (
      WITH RECURSIVE dept_hierarchy AS (
        SELECT id, parent_department_id, 1 as depth
        FROM hr_public.departments
        WHERE id = NEW.parent_department_id

        UNION ALL

        SELECT d.id, d.parent_department_id, dh.depth + 1
        FROM hr_public.departments d
        INNER JOIN dept_hierarchy dh ON d.id = dh.parent_department_id
        WHERE dh.depth < max_depth + 1
      )
      SELECT 1 FROM dept_hierarchy WHERE id = NEW.id
    ) THEN
      RAISE EXCEPTION 'Circular reference detected in department hierarchy';
    END IF;

    -- Check maximum depth
    IF hierarchy_depth >= max_depth THEN
      RAISE EXCEPTION 'Department hierarchy depth cannot exceed % levels', max_depth;
    END IF;
  END IF;

  -- Validate department head has appropriate role level
  IF NEW.department_head_id IS NOT NULL THEN
    -- Ensure department head has at least Manager role level (60)
    IF EXISTS (
      SELECT 1 FROM hr_public.users
      WHERE id = NEW.department_head_id
      AND role_level < 60
    ) THEN
      RAISE EXCEPTION 'Department head must have Manager role level or higher';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for department hierarchy validation
DROP TRIGGER IF EXISTS tr_validate_department_hierarchy ON hr_public.departments;
CREATE TRIGGER tr_validate_department_hierarchy
  BEFORE INSERT OR UPDATE ON hr_public.departments
  FOR EACH ROW
  WHEN (NEW.parent_department_id IS NOT NULL OR NEW.department_head_id IS NOT NULL)
  EXECUTE FUNCTION hr_public.validate_department_hierarchy();

-- Create function to auto-update employee count
CREATE OR REPLACE FUNCTION hr_public.update_department_employee_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Update employee count for old department (if changed and not an INSERT)
  IF TG_OP = 'UPDATE' AND OLD.department_id IS NOT NULL AND OLD.department_id != NEW.department_id THEN
    UPDATE hr_public.departments
    SET employee_count = (
      SELECT COUNT(*)
      FROM hr_public.users
      WHERE department_id = OLD.department_id
      AND employment_status = 'active'
    ),
    updated_at = NOW()
    WHERE id = OLD.department_id;
  END IF;

  -- Update employee count for new department
  IF NEW.department_id IS NOT NULL THEN
    UPDATE hr_public.departments
    SET employee_count = (
      SELECT COUNT(*)
      FROM hr_public.users
      WHERE department_id = NEW.department_id
      AND employment_status = 'active'
    ),
    updated_at = NOW()
    WHERE id = NEW.department_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-updating employee count
DROP TRIGGER IF EXISTS tr_update_department_employee_count ON hr_public.users;
CREATE TRIGGER tr_update_department_employee_count
  AFTER INSERT OR UPDATE OF department_id, employment_status ON hr_public.users
  FOR EACH ROW
  EXECUTE FUNCTION hr_public.update_department_employee_count();

-- Create function to get department hierarchy
CREATE OR REPLACE FUNCTION hr_public.get_department_hierarchy(dept_id UUID)
RETURNS TABLE(
  level INTEGER,
  department_id UUID,
  name TEXT,
  parent_id UUID,
  employee_count INTEGER,
  department_head_name TEXT,
  is_root BOOLEAN
) AS $$
WITH RECURSIVE dept_hierarchy AS (
  -- Base case: start with the given department
  SELECT
    0 as level,
    d.id,
    d.name,
    d.parent_department_id,
    d.employee_count,
    d.department_head_id
  FROM hr_public.departments d
  WHERE d.id = $1

  UNION ALL

  -- Recursive case: get all child departments
  SELECT
    dh.level + 1,
    d.id,
    d.name,
    d.parent_department_id,
    d.employee_count,
    d.department_head_id
  FROM hr_public.departments d
  INNER JOIN dept_hierarchy dh ON d.parent_department_id = dh.id
  WHERE dh.level < 10 -- Prevent infinite recursion
)
SELECT
  dh.level,
  dh.id,
  dh.name,
  dh.parent_department_id,
  dh.employee_count,
  u.display_name as department_head_name,
  (dh.parent_department_id IS NULL) as is_root
FROM dept_hierarchy dh
LEFT JOIN hr_public.users u ON dh.department_head_id = u.id
ORDER BY level, name;
$$ LANGUAGE sql STABLE;

-- Create function to get department tree (all departments in hierarchy)
CREATE OR REPLACE FUNCTION hr_public.get_department_tree()
RETURNS TABLE(
  id UUID,
  name TEXT,
  parent_department_id UUID,
  level INTEGER,
  path TEXT,
  employee_count INTEGER,
  department_head_name TEXT,
  budget_code VARCHAR(20),
  cost_center VARCHAR(20),
  location VARCHAR(100),
  annual_budget NUMERIC,
  budget_utilized NUMERIC,
  budget_utilization_percent NUMERIC,
  is_over_budget BOOLEAN,
  headcount_utilization_percent NUMERIC,
  is_over_headcount BOOLEAN
) AS $$
WITH RECURSIVE dept_tree AS (
  -- Base case: root departments (no parent)
  SELECT
    d.id,
    d.name,
    d.parent_department_id,
    0 as level,
    d.name::TEXT as path
  FROM hr_public.departments d
  WHERE d.parent_department_id IS NULL
  AND d.is_active = true

  UNION ALL

  -- Recursive case: child departments
  SELECT
    d.id,
    d.name,
    d.parent_department_id,
    dt.level + 1,
    (dt.path || ' > ' || d.name)::TEXT
  FROM hr_public.departments d
  INNER JOIN dept_tree dt ON d.parent_department_id = dt.id
  WHERE d.is_active = true
  AND dt.level < 10 -- Prevent infinite recursion
)
SELECT
  dt.id,
  dt.name,
  dt.parent_department_id,
  dt.level,
  dt.path,
  d.employee_count,
  u.display_name as department_head_name,
  d.budget_code,
  d.cost_center,
  d.location,
  d.annual_budget,
  d.budget_utilized,
  CASE
    WHEN d.annual_budget > 0 THEN (d.budget_utilized * 100.0 / d.annual_budget)
    ELSE NULL
  END as budget_utilization_percent,
  (d.annual_budget IS NOT NULL AND d.budget_utilized > d.annual_budget) as is_over_budget,
  CASE
    WHEN d.max_headcount > 0 THEN (d.employee_count * 100.0 / d.max_headcount)
    ELSE NULL
  END as headcount_utilization_percent,
  (d.max_headcount IS NOT NULL AND d.employee_count > d.max_headcount) as is_over_headcount
FROM dept_tree dt
JOIN hr_public.departments d ON dt.id = d.id
LEFT JOIN hr_public.users u ON d.department_head_id = u.id
ORDER BY dt.level, dt.name;
$$ LANGUAGE sql STABLE;

-- Create function to get department statistics
CREATE OR REPLACE FUNCTION hr_public.get_department_statistics(p_department_id UUID DEFAULT NULL)
RETURNS TABLE(
  department_id UUID,
  department_name TEXT,
  total_employees INTEGER,
  active_employees INTEGER,
  managers_count INTEGER,
  average_tenure_months NUMERIC,
  total_budget NUMERIC,
  budget_utilized NUMERIC,
  budget_remaining NUMERIC,
  open_positions INTEGER,
  recent_hires_30_days INTEGER,
  recent_departures_30_days INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id as department_id,
    d.name as department_name,
    d.employee_count as total_employees,
    (SELECT COUNT(*)::INTEGER FROM hr_public.users u
     WHERE u.department_id = d.id AND u.employment_status = 'active') as active_employees,
    (SELECT COUNT(*)::INTEGER FROM hr_public.users u
     WHERE u.department_id = d.id AND u.role_level >= 60 AND u.employment_status = 'active') as managers_count,
    (SELECT AVG(EXTRACT(EPOCH FROM NOW() - u.hire_date) / 2629746) -- Convert to months
     FROM hr_public.users u
     WHERE u.department_id = d.id AND u.employment_status = 'active' AND u.hire_date IS NOT NULL) as average_tenure_months,
    d.annual_budget as total_budget,
    d.budget_utilized,
    (d.annual_budget - COALESCE(d.budget_utilized, 0)) as budget_remaining,
    COALESCE(d.max_headcount - d.employee_count, 0) as open_positions,
    (SELECT COUNT(*)::INTEGER FROM hr_public.users u
     WHERE u.department_id = d.id AND u.hire_date >= CURRENT_DATE - INTERVAL '30 days') as recent_hires_30_days,
    (SELECT COUNT(*)::INTEGER FROM hr_public.users u
     WHERE u.department_id = d.id AND u.employment_status = 'terminated'
     AND u.updated_at >= CURRENT_DATE - INTERVAL '30 days') as recent_departures_30_days
  FROM hr_public.departments d
  WHERE d.is_active = true
  AND (p_department_id IS NULL OR d.id = p_department_id)
  ORDER BY d.name;
END;
$$ LANGUAGE plpgsql STABLE;

-- Create function to update budget utilization
CREATE OR REPLACE FUNCTION hr_public.update_department_budget_utilization(
  p_department_id UUID,
  p_amount NUMERIC,
  p_operation VARCHAR(10) DEFAULT 'ADD'
)
RETURNS NUMERIC AS $$
DECLARE
  new_utilization NUMERIC;
BEGIN
  -- Update budget utilization
  UPDATE hr_public.departments
  SET budget_utilized = CASE
    WHEN p_operation = 'ADD' THEN COALESCE(budget_utilized, 0) + p_amount
    WHEN p_operation = 'SUBTRACT' THEN COALESCE(budget_utilized, 0) - p_amount
    WHEN p_operation = 'SET' THEN p_amount
    ELSE budget_utilized
  END,
  updated_at = NOW()
  WHERE id = p_department_id
  RETURNING budget_utilized INTO new_utilization;

  RETURN new_utilization;
END;
$$ LANGUAGE plpgsql;

-- Initialize employee counts for existing departments
UPDATE hr_public.departments
SET employee_count = (
  SELECT COUNT(*)
  FROM hr_public.users u
  WHERE u.department_id = hr_public.departments.id
  AND u.employment_status = 'active'
)
WHERE employee_count = 0;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION hr_public.validate_department_hierarchy() TO hr_graphile_role;
GRANT EXECUTE ON FUNCTION hr_public.update_department_employee_count() TO hr_graphile_role;
GRANT EXECUTE ON FUNCTION hr_public.get_department_hierarchy(UUID) TO hr_graphile_role;
GRANT EXECUTE ON FUNCTION hr_public.get_department_tree() TO hr_graphile_role;
GRANT EXECUTE ON FUNCTION hr_public.get_department_statistics(UUID) TO hr_graphile_role;
GRANT EXECUTE ON FUNCTION hr_public.update_department_budget_utilization(UUID, NUMERIC, VARCHAR) TO hr_graphile_role;

-- Add comments for documentation
COMMENT ON COLUMN hr_public.departments.parent_department_id IS 'Parent department for creating hierarchical organization structure';
COMMENT ON COLUMN hr_public.departments.department_head_id IS 'User who heads this department (must have Manager role or higher)';
COMMENT ON COLUMN hr_public.departments.budget_code IS 'Unique budget identifier for financial tracking';
COMMENT ON COLUMN hr_public.departments.cost_center IS 'Unique cost center code for accounting';
COMMENT ON COLUMN hr_public.departments.employee_count IS 'Current number of active employees (automatically calculated)';
COMMENT ON COLUMN hr_public.departments.annual_budget IS 'Annual budget allocation for this department';
COMMENT ON COLUMN hr_public.departments.budget_utilized IS 'Amount of budget currently utilized';
COMMENT ON COLUMN hr_public.departments.max_headcount IS 'Maximum allowed number of employees';
COMMENT ON COLUMN hr_public.departments.target_headcount IS 'Target number of employees';

COMMENT ON FUNCTION hr_public.validate_department_hierarchy() IS 'Validates department hierarchy rules and prevents circular references';
COMMENT ON FUNCTION hr_public.update_department_employee_count() IS 'Auto-updates employee count when users change departments';
COMMENT ON FUNCTION hr_public.get_department_hierarchy(UUID) IS 'Returns hierarchical tree starting from given department ID';
COMMENT ON FUNCTION hr_public.get_department_tree() IS 'Returns complete department tree with budget and headcount metrics';
COMMENT ON FUNCTION hr_public.get_department_statistics(UUID) IS 'Returns comprehensive statistics for department(s)';
COMMENT ON FUNCTION hr_public.update_department_budget_utilization(UUID, NUMERIC, VARCHAR) IS 'Updates department budget utilization';

COMMIT;