-- Migration: Add hierarchical structure to departments
-- Date: 2025-10-10
-- Purpose: Add parent_dept_id for department tree with circular reference prevention
--          Priority: P3 (Low - Enhancements)

BEGIN;

-- ========================================
-- Add parent_dept_id field
-- ========================================

ALTER TABLE hr_public.departments
ADD COLUMN IF NOT EXISTS parent_dept_id UUID
  REFERENCES hr_public.departments(id) ON DELETE SET NULL;

COMMENT ON COLUMN hr_public.departments.parent_dept_id IS
'Self-referencing FK for hierarchical department structure. NULL for root-level departments.';

-- ========================================
-- Circular reference prevention trigger
-- ========================================

CREATE OR REPLACE FUNCTION hr_public.prevent_circular_dept_hierarchy()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.parent_dept_id IS NOT NULL THEN
    -- Check if parent_dept_id creates a cycle using recursive CTE
    IF EXISTS (
      WITH RECURSIVE dept_chain AS (
        -- Start with the proposed parent department
        SELECT id, parent_dept_id
        FROM hr_public.departments
        WHERE id = NEW.parent_dept_id

        UNION ALL

        -- Walk up the chain
        SELECT d.id, d.parent_dept_id
        FROM hr_public.departments d
        JOIN dept_chain dc ON d.id = dc.parent_dept_id
      )
      -- Check if we encounter the current department in the chain
      SELECT 1 FROM dept_chain WHERE id = NEW.id
    ) THEN
      RAISE EXCEPTION 'Cannot create circular department hierarchy for department %', NEW.id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_circular_dept_hierarchy ON hr_public.departments;
CREATE TRIGGER check_circular_dept_hierarchy
BEFORE INSERT OR UPDATE OF parent_dept_id ON hr_public.departments
FOR EACH ROW EXECUTE FUNCTION hr_public.prevent_circular_dept_hierarchy();

-- ========================================
-- Create index for hierarchy queries
-- ========================================

CREATE INDEX IF NOT EXISTS idx_departments_parent_dept_id
ON hr_public.departments(parent_dept_id)
WHERE parent_dept_id IS NOT NULL;

-- Update table statistics
ANALYZE hr_public.departments;

COMMIT;
