-- HR User Journeys Migration: Extend Users Table
-- Created: 2025-01-25T14:00:01.000Z
--
-- This migration extends the existing users table with HR-specific fields
-- to support the comprehensive HR user journeys system.

BEGIN;

-- Add HR-specific fields to users table
ALTER TABLE hr_public.users
  ADD COLUMN IF NOT EXISTS role_level INTEGER NOT NULL DEFAULT 20, -- 20=Employee, 60=Manager, 80=HR Admin, 100=System Admin
  ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES hr_public.users(id),
  ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES hr_public.departments(id),
  ADD COLUMN IF NOT EXISTS job_title VARCHAR(100),
  ADD COLUMN IF NOT EXISTS hire_date DATE,
  ADD COLUMN IF NOT EXISTS employment_status VARCHAR(20) DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS work_location VARCHAR(100),
  ADD COLUMN IF NOT EXISTS time_zone VARCHAR(50) DEFAULT 'UTC',
  ADD COLUMN IF NOT EXISTS employee_id VARCHAR(20) UNIQUE,
  ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(100),
  ADD COLUMN IF NOT EXISTS emergency_contact_phone VARCHAR(20),
  ADD COLUMN IF NOT EXISTS emergency_contact_relationship VARCHAR(50),
  ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS dashboard_preferences JSONB DEFAULT '{}';

-- Add audit trail fields if they don't exist
ALTER TABLE hr_public.users
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES hr_public.users(id),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES hr_public.users(id);

-- Create constraints for employment_status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'users_employment_status_check'
    AND conrelid = 'hr_public.users'::regclass
  ) THEN
    ALTER TABLE hr_public.users
      ADD CONSTRAINT users_employment_status_check
      CHECK (employment_status IN ('active', 'inactive', 'terminated'));
  END IF;
END $$;

-- Create constraints for role_level
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'users_role_level_check'
    AND conrelid = 'hr_public.users'::regclass
  ) THEN
    ALTER TABLE hr_public.users
      ADD CONSTRAINT users_role_level_check
      CHECK (role_level IN (20, 60, 80, 100));
  END IF;
END $$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_manager_id ON hr_public.users(manager_id) WHERE manager_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_department_id ON hr_public.users(department_id) WHERE department_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_role_level ON hr_public.users(role_level);
CREATE INDEX IF NOT EXISTS idx_users_employment_status ON hr_public.users(employment_status);
CREATE INDEX IF NOT EXISTS idx_users_employee_id ON hr_public.users(employee_id) WHERE employee_id IS NOT NULL;

-- Create unique constraint for employee_id if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'users_employee_id_unique'
    AND conrelid = 'hr_public.users'::regclass
  ) THEN
    ALTER TABLE hr_public.users
      ADD CONSTRAINT users_employee_id_unique
      UNIQUE (employee_id);
  END IF;
END $$;

-- Create function to auto-generate employee IDs
CREATE OR REPLACE FUNCTION hr_public.generate_employee_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.employee_id IS NULL THEN
    -- Generate employee ID as EMP + year + sequential number
    SELECT 'EMP' || EXTRACT(YEAR FROM NOW()) ||
           LPAD((COUNT(*) + 1)::text, 4, '0')
    INTO NEW.employee_id
    FROM hr_public.users
    WHERE employee_id IS NOT NULL
    AND employee_id LIKE 'EMP' || EXTRACT(YEAR FROM NOW()) || '%';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-generating employee IDs
DROP TRIGGER IF EXISTS tr_generate_employee_id ON hr_public.users;
CREATE TRIGGER tr_generate_employee_id
  BEFORE INSERT ON hr_public.users
  FOR EACH ROW
  WHEN (NEW.employee_id IS NULL)
  EXECUTE FUNCTION hr_public.generate_employee_id();

-- Create function to enforce manager hierarchy rules
CREATE OR REPLACE FUNCTION hr_public.validate_manager_hierarchy()
RETURNS TRIGGER AS $$
BEGIN
  -- Prevent self-referencing manager
  IF NEW.manager_id = NEW.id THEN
    RAISE EXCEPTION 'User cannot be their own manager';
  END IF;

  -- Prevent circular references (simplified check for direct circles)
  IF NEW.manager_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM hr_public.users
      WHERE id = NEW.manager_id
      AND manager_id = NEW.id
    ) THEN
      RAISE EXCEPTION 'Circular manager relationship detected';
    END IF;

    -- Ensure manager has higher role level
    IF EXISTS (
      SELECT 1 FROM hr_public.users
      WHERE id = NEW.manager_id
      AND role_level <= NEW.role_level
    ) THEN
      RAISE EXCEPTION 'Manager must have higher role level than employee';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for manager hierarchy validation
DROP TRIGGER IF EXISTS tr_validate_manager_hierarchy ON hr_public.users;
CREATE TRIGGER tr_validate_manager_hierarchy
  BEFORE INSERT OR UPDATE ON hr_public.users
  FOR EACH ROW
  WHEN (NEW.manager_id IS NOT NULL)
  EXECUTE FUNCTION hr_public.validate_manager_hierarchy();

-- Update existing users to have default role levels if not set
UPDATE hr_public.users
SET role_level = 20
WHERE role_level IS NULL OR role_level = 0;

-- Create helper function to get user hierarchy
CREATE OR REPLACE FUNCTION hr_public.get_user_hierarchy(user_id UUID)
RETURNS TABLE(
  level INTEGER,
  user_id UUID,
  email TEXT,
  display_name TEXT,
  role_level INTEGER
) AS $$
WITH RECURSIVE user_hierarchy AS (
  -- Base case: start with the given user
  SELECT
    0 as level,
    u.id,
    u.email,
    u.display_name,
    u.role_level,
    u.manager_id
  FROM hr_public.users u
  WHERE u.id = $1

  UNION ALL

  -- Recursive case: get all subordinates
  SELECT
    uh.level + 1,
    u.id,
    u.email,
    u.display_name,
    u.role_level,
    u.manager_id
  FROM hr_public.users u
  INNER JOIN user_hierarchy uh ON u.manager_id = uh.id
  WHERE uh.level < 10 -- Prevent infinite recursion
)
SELECT
  uh.level,
  uh.id,
  uh.email,
  uh.display_name,
  uh.role_level
FROM user_hierarchy uh
ORDER BY level, display_name;
$$ LANGUAGE sql STABLE;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION hr_public.generate_employee_id() TO hr_graphile_role;
GRANT EXECUTE ON FUNCTION hr_public.validate_manager_hierarchy() TO hr_graphile_role;
GRANT EXECUTE ON FUNCTION hr_public.get_user_hierarchy(UUID) TO hr_graphile_role;

-- Add comments for documentation
COMMENT ON COLUMN hr_public.users.role_level IS 'User role hierarchy: 20=Employee, 60=Manager, 80=HR Admin, 100=System Admin';
COMMENT ON COLUMN hr_public.users.manager_id IS 'Reference to the user''s direct manager';
COMMENT ON COLUMN hr_public.users.employee_id IS 'Human-readable employee identifier (auto-generated if not provided)';
COMMENT ON COLUMN hr_public.users.employment_status IS 'Current employment status: active, inactive, terminated';
COMMENT ON COLUMN hr_public.users.notification_preferences IS 'JSON object storing user notification preferences';
COMMENT ON COLUMN hr_public.users.dashboard_preferences IS 'JSON object storing user dashboard customization preferences';

COMMENT ON FUNCTION hr_public.generate_employee_id() IS 'Auto-generates employee ID in format EMPYYYY0000';
COMMENT ON FUNCTION hr_public.validate_manager_hierarchy() IS 'Validates manager hierarchy rules and prevents circular references';
COMMENT ON FUNCTION hr_public.get_user_hierarchy(UUID) IS 'Returns hierarchical tree of users starting from given user ID';

COMMIT;