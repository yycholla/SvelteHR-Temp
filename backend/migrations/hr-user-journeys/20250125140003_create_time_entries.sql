-- HR User Journeys Migration: Create Time Entries Table
-- Created: 2025-01-25T14:00:03.000Z
--
-- This migration creates the time_entries table for time tracking functionality.
-- Supports flexible time tracking with approval workflows and project allocation.

BEGIN;

-- Create time_entries table
CREATE TABLE hr_public.time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES hr_public.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES hr_public.projects(id) ON DELETE SET NULL,

  -- Time tracking details
  entry_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  total_hours NUMERIC(5,2) NOT NULL CHECK (total_hours > 0 AND total_hours <= 24),
  break_hours NUMERIC(4,2) DEFAULT 0 CHECK (break_hours >= 0 AND break_hours < 24),

  -- Categorization and description
  activity_type VARCHAR(50),
  task_description TEXT NOT NULL,
  billable BOOLEAN DEFAULT FALSE,
  billing_rate NUMERIC(10,2) CHECK (billing_rate IS NULL OR billing_rate >= 0),

  -- Approval workflow
  status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
  submitted_at TIMESTAMPTZ,
  approved_by UUID REFERENCES hr_public.users(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,

  -- Audit trail
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_by UUID NOT NULL REFERENCES hr_public.users(id),
  updated_by UUID REFERENCES hr_public.users(id)
);

-- Add constraints for status values
ALTER TABLE hr_public.time_entries
  ADD CONSTRAINT time_entries_status_check
  CHECK (status IN ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED'));

-- Add constraints for activity_type values
ALTER TABLE hr_public.time_entries
  ADD CONSTRAINT time_entries_activity_type_check
  CHECK (activity_type IS NULL OR activity_type IN ('REGULAR', 'OVERTIME', 'HOLIDAY', 'SICK', 'TRAINING'));

-- Add constraint to ensure end_time is after start_time
ALTER TABLE hr_public.time_entries
  ADD CONSTRAINT time_entries_time_range_check
  CHECK (start_time IS NULL OR end_time IS NULL OR end_time > start_time);

-- Add constraint to ensure submitted_at is set when status is not DRAFT
ALTER TABLE hr_public.time_entries
  ADD CONSTRAINT time_entries_submitted_at_check
  CHECK (
    (status = 'DRAFT' AND submitted_at IS NULL) OR
    (status != 'DRAFT' AND submitted_at IS NOT NULL)
  );

-- Add constraint to ensure approval fields are consistent
ALTER TABLE hr_public.time_entries
  ADD CONSTRAINT time_entries_approval_check
  CHECK (
    (status NOT IN ('APPROVED', 'REJECTED')) OR
    (status = 'APPROVED' AND approved_by IS NOT NULL AND approved_at IS NOT NULL) OR
    (status = 'REJECTED' AND rejection_reason IS NOT NULL)
  );

-- Add constraint to prevent future date entries (with some tolerance)
ALTER TABLE hr_public.time_entries
  ADD CONSTRAINT time_entries_date_check
  CHECK (entry_date <= CURRENT_DATE + INTERVAL '1 day');

-- Create indexes for performance
CREATE INDEX idx_time_entries_employee_id ON hr_public.time_entries(employee_id);
CREATE INDEX idx_time_entries_entry_date ON hr_public.time_entries(entry_date);
CREATE INDEX idx_time_entries_employee_date ON hr_public.time_entries(employee_id, entry_date);
CREATE INDEX idx_time_entries_project_id ON hr_public.time_entries(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX idx_time_entries_status ON hr_public.time_entries(status);
CREATE INDEX idx_time_entries_submitted_at ON hr_public.time_entries(submitted_at) WHERE submitted_at IS NOT NULL;
CREATE INDEX idx_time_entries_approved_by ON hr_public.time_entries(approved_by) WHERE approved_by IS NOT NULL;
CREATE INDEX idx_time_entries_created_at ON hr_public.time_entries(created_at);

-- Create composite index for manager approval queries
CREATE INDEX idx_time_entries_approval_queue ON hr_public.time_entries(status, submitted_at)
WHERE status = 'SUBMITTED';

-- Create function to auto-calculate total hours from start/end time
CREATE OR REPLACE FUNCTION hr_public.calculate_time_entry_hours()
RETURNS TRIGGER AS $$
BEGIN
  -- If start_time and end_time are provided, calculate total_hours
  IF NEW.start_time IS NOT NULL AND NEW.end_time IS NOT NULL THEN
    -- Calculate hours between start and end time, subtract break hours
    NEW.total_hours := EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time)) / 3600.0 - COALESCE(NEW.break_hours, 0);

    -- Ensure total_hours is positive
    IF NEW.total_hours <= 0 THEN
      RAISE EXCEPTION 'Calculated total hours must be positive. Check start time, end time, and break hours.';
    END IF;
  END IF;

  -- Set submitted_at when status changes to SUBMITTED
  IF NEW.status = 'SUBMITTED' AND (OLD IS NULL OR OLD.status != 'SUBMITTED') THEN
    NEW.submitted_at := NOW();
  END IF;

  -- Set approved_at when status changes to APPROVED
  IF NEW.status = 'APPROVED' AND (OLD IS NULL OR OLD.status != 'APPROVED') THEN
    NEW.approved_at := NOW();
  END IF;

  -- Validate that employee cannot approve their own time entries
  IF NEW.status IN ('APPROVED', 'REJECTED') AND NEW.approved_by = NEW.employee_id THEN
    RAISE EXCEPTION 'Employee cannot approve their own time entries';
  END IF;

  -- Set updated_at
  NEW.updated_at := NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-calculation
CREATE TRIGGER tr_calculate_time_entry_hours
  BEFORE INSERT OR UPDATE ON hr_public.time_entries
  FOR EACH ROW
  EXECUTE FUNCTION hr_public.calculate_time_entry_hours();

-- Create function to prevent overlapping time entries for same employee/date
CREATE OR REPLACE FUNCTION hr_public.prevent_overlapping_time_entries()
RETURNS TRIGGER AS $$
BEGIN
  -- Only check for overlaps if start_time and end_time are provided
  IF NEW.start_time IS NOT NULL AND NEW.end_time IS NOT NULL THEN
    -- Check for overlapping time entries for the same employee on the same date
    IF EXISTS (
      SELECT 1
      FROM hr_public.time_entries te
      WHERE te.employee_id = NEW.employee_id
      AND te.entry_date = NEW.entry_date
      AND te.id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID)
      AND te.start_time IS NOT NULL
      AND te.end_time IS NOT NULL
      AND (
        -- New entry starts during existing entry
        (NEW.start_time >= te.start_time AND NEW.start_time < te.end_time) OR
        -- New entry ends during existing entry
        (NEW.end_time > te.start_time AND NEW.end_time <= te.end_time) OR
        -- New entry completely encompasses existing entry
        (NEW.start_time <= te.start_time AND NEW.end_time >= te.end_time)
      )
    ) THEN
      RAISE EXCEPTION 'Time entry overlaps with existing entry for employee on date %', NEW.entry_date;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for overlap prevention
CREATE TRIGGER tr_prevent_overlapping_time_entries
  BEFORE INSERT OR UPDATE ON hr_public.time_entries
  FOR EACH ROW
  EXECUTE FUNCTION hr_public.prevent_overlapping_time_entries();

-- Create function to get time entry statistics
CREATE OR REPLACE FUNCTION hr_public.get_time_entry_stats(
  p_employee_id UUID DEFAULT NULL,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE(
  total_hours NUMERIC,
  billable_hours NUMERIC,
  regular_hours NUMERIC,
  overtime_hours NUMERIC,
  entries_count INTEGER,
  approved_entries INTEGER,
  pending_entries INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(te.total_hours), 0) as total_hours,
    COALESCE(SUM(CASE WHEN te.billable THEN te.total_hours ELSE 0 END), 0) as billable_hours,
    COALESCE(SUM(CASE WHEN te.activity_type = 'REGULAR' OR te.activity_type IS NULL THEN te.total_hours ELSE 0 END), 0) as regular_hours,
    COALESCE(SUM(CASE WHEN te.activity_type = 'OVERTIME' THEN te.total_hours ELSE 0 END), 0) as overtime_hours,
    COUNT(*)::INTEGER as entries_count,
    COUNT(CASE WHEN te.status = 'APPROVED' THEN 1 END)::INTEGER as approved_entries,
    COUNT(CASE WHEN te.status = 'SUBMITTED' THEN 1 END)::INTEGER as pending_entries
  FROM hr_public.time_entries te
  WHERE (p_employee_id IS NULL OR te.employee_id = p_employee_id)
  AND (p_start_date IS NULL OR te.entry_date >= p_start_date)
  AND (p_end_date IS NULL OR te.entry_date <= p_end_date);
END;
$$ LANGUAGE plpgsql STABLE;

-- Create function to get pending approvals for managers
CREATE OR REPLACE FUNCTION hr_public.get_pending_time_approvals(manager_id UUID)
RETURNS TABLE(
  id UUID,
  employee_name TEXT,
  entry_date DATE,
  total_hours NUMERIC,
  task_description TEXT,
  submitted_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    te.id,
    u.display_name,
    te.entry_date,
    te.total_hours,
    te.task_description,
    te.submitted_at
  FROM hr_public.time_entries te
  INNER JOIN hr_public.users u ON te.employee_id = u.id
  WHERE u.manager_id = $1
  AND te.status = 'SUBMITTED'
  ORDER BY te.submitted_at ASC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON hr_public.time_entries TO hr_graphile_role;
GRANT EXECUTE ON FUNCTION hr_public.calculate_time_entry_hours() TO hr_graphile_role;
GRANT EXECUTE ON FUNCTION hr_public.prevent_overlapping_time_entries() TO hr_graphile_role;
GRANT EXECUTE ON FUNCTION hr_public.get_time_entry_stats(UUID, DATE, DATE) TO hr_graphile_role;
GRANT EXECUTE ON FUNCTION hr_public.get_pending_time_approvals(UUID) TO hr_graphile_role;

-- Enable RLS (will be configured in separate RLS migration)
ALTER TABLE hr_public.time_entries ENABLE ROW LEVEL SECURITY;

-- Add table and column comments
COMMENT ON TABLE hr_public.time_entries IS 'Time tracking entries for employees with approval workflows';
COMMENT ON COLUMN hr_public.time_entries.employee_id IS 'Employee who logged this time entry';
COMMENT ON COLUMN hr_public.time_entries.project_id IS 'Optional project association for time allocation';
COMMENT ON COLUMN hr_public.time_entries.entry_date IS 'Date of work performed';
COMMENT ON COLUMN hr_public.time_entries.total_hours IS 'Total hours worked (required, calculated from start/end if provided)';
COMMENT ON COLUMN hr_public.time_entries.break_hours IS 'Hours of breaks taken during work';
COMMENT ON COLUMN hr_public.time_entries.activity_type IS 'Type of work: REGULAR, OVERTIME, HOLIDAY, SICK, TRAINING';
COMMENT ON COLUMN hr_public.time_entries.status IS 'Approval status: DRAFT, SUBMITTED, APPROVED, REJECTED';
COMMENT ON COLUMN hr_public.time_entries.billable IS 'Whether this time is billable to client/project';

COMMENT ON FUNCTION hr_public.calculate_time_entry_hours() IS 'Auto-calculates total hours and manages approval timestamps';
COMMENT ON FUNCTION hr_public.prevent_overlapping_time_entries() IS 'Prevents overlapping time entries for same employee/date';
COMMENT ON FUNCTION hr_public.get_time_entry_stats(UUID, DATE, DATE) IS 'Returns time entry statistics for reporting';
COMMENT ON FUNCTION hr_public.get_pending_time_approvals(UUID) IS 'Returns pending time entries for manager approval';

COMMIT;