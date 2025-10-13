-- Migration: Add manager_ids array to departments for co-manager support
-- Date: 2025-10-10
-- Purpose: Replace single manager_id with array to support multiple department managers
--          Priority: P1 (High - Core Schema)

BEGIN;

-- ========================================
-- Add manager_ids array column
-- ========================================

ALTER TABLE hr_public.departments
ADD COLUMN IF NOT EXISTS manager_ids UUID[];

COMMENT ON COLUMN hr_public.departments.manager_ids IS
'Array of user IDs representing co-managers (replaces single manager_id for multi-manager support)';

-- ========================================
-- Migrate existing manager_id data to array
-- ========================================

-- For departments with existing manager_id, convert to array
UPDATE hr_public.departments
SET manager_ids = ARRAY[manager_id]
WHERE manager_id IS NOT NULL AND manager_ids IS NULL;

-- Create GIN index for array containment queries (efficient for "user IN manager_ids" lookups)
CREATE INDEX IF NOT EXISTS idx_departments_manager_ids
ON hr_public.departments USING GIN (manager_ids);

-- ========================================
-- FK validation trigger
-- ========================================

-- Ensures all manager IDs in the array exist in users table
CREATE OR REPLACE FUNCTION hr_public.validate_manager_ids()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.manager_ids IS NOT NULL THEN
    -- Check that all UUIDs in the array correspond to existing users
    IF NOT (
      SELECT bool_and(EXISTS(SELECT 1 FROM hr_public.users WHERE id = mgr_id))
      FROM unnest(NEW.manager_ids) AS mgr_id
    ) THEN
      RAISE EXCEPTION 'One or more manager IDs do not exist in users table';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS validate_department_managers ON hr_public.departments;
CREATE TRIGGER validate_department_managers
BEFORE INSERT OR UPDATE OF manager_ids ON hr_public.departments
FOR EACH ROW EXECUTE FUNCTION hr_public.validate_manager_ids();

-- Update table statistics
ANALYZE hr_public.departments;

COMMIT;
