-- Migration: Add manager_id field to users for organizational hierarchy
-- Date: 2025-10-10
-- Purpose: Enable manager-employee relationships with self-referencing FK
--          Priority: P1 (High - Core Schema)

BEGIN;

-- ========================================
-- Add manager_id column with self-referencing FK
-- ========================================

ALTER TABLE hr_public.users
ADD COLUMN IF NOT EXISTS manager_id UUID
  REFERENCES hr_public.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN hr_public.users.manager_id IS
'Self-referencing FK to users.id for organizational hierarchy. NULL for CEO/top-level users.';

-- Create index for manager lookups and reporting chains
CREATE INDEX IF NOT EXISTS idx_users_manager_id
ON hr_public.users(manager_id)
WHERE manager_id IS NOT NULL;

-- ========================================
-- Circular reference prevention trigger
-- ========================================

CREATE OR REPLACE FUNCTION hr_public.prevent_circular_manager_reference()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.manager_id IS NOT NULL THEN
    -- Check if setting this manager_id would create a circular reference
    IF EXISTS (
      WITH RECURSIVE manager_chain AS (
        -- Start with the proposed manager
        SELECT id, manager_id
        FROM hr_public.users
        WHERE id = NEW.manager_id

        UNION ALL

        -- Follow the chain upward
        SELECT u.id, u.manager_id
        FROM hr_public.users u
        JOIN manager_chain mc ON u.id = mc.manager_id
      )
      -- If we find the employee in their own manager chain, it's circular
      SELECT 1 FROM manager_chain WHERE id = NEW.id
    ) THEN
      RAISE EXCEPTION 'Cannot create circular manager relationship for user %', NEW.id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_circular_manager ON hr_public.users;
CREATE TRIGGER check_circular_manager
BEFORE INSERT OR UPDATE OF manager_id ON hr_public.users
FOR EACH ROW EXECUTE FUNCTION hr_public.prevent_circular_manager_reference();

-- Update table statistics
ANALYZE hr_public.users;

COMMIT;
