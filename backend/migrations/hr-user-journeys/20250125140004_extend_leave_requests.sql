-- HR User Journeys Migration: Extend Leave Requests Table
-- Created: 2025-01-25T14:00:04.000Z
--
-- This migration extends the existing leave_requests table with additional fields
-- needed for comprehensive leave management functionality.

BEGIN;

-- Add missing columns to existing leave_requests table
ALTER TABLE hr_public.leave_requests
  ADD COLUMN IF NOT EXISTS employee_id UUID REFERENCES hr_public.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS total_days NUMERIC(4,1) CHECK (total_days > 0 AND total_days <= 365),
  ADD COLUMN IF NOT EXISTS emergency_contact_during_leave VARCHAR(200),
  ADD COLUMN IF NOT EXISTS work_coverage_plan TEXT,
  ADD COLUMN IF NOT EXISTS leave_balance_before NUMERIC(5,1),
  ADD COLUMN IF NOT EXISTS leave_balance_after NUMERIC(5,1),
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES hr_public.users(id),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES hr_public.users(id);

-- Copy user_id to employee_id for compatibility (if employee_id was added and is null)
UPDATE hr_public.leave_requests
SET employee_id = user_id
WHERE employee_id IS NULL AND user_id IS NOT NULL;

-- Normalize status values to uppercase for consistency
UPDATE hr_public.leave_requests
SET status = UPPER(status)
WHERE status IN ('pending', 'approved', 'rejected', 'cancelled');

-- Set default values for submitted_at if missing
UPDATE hr_public.leave_requests
SET submitted_at = created_at
WHERE submitted_at IS NULL AND UPPER(status) != 'PENDING';

-- Update constraint names to avoid conflicts
DO $$
BEGIN
  -- Add constraints for status values if not already present
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'leave_requests_status_check_extended'
    AND conrelid = 'hr_public.leave_requests'::regclass
  ) THEN
    ALTER TABLE hr_public.leave_requests
      ADD CONSTRAINT leave_requests_status_check_extended
      CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'));
  END IF;
END $$;

-- Add indexes for new fields
CREATE INDEX IF NOT EXISTS idx_leave_requests_employee_id ON hr_public.leave_requests(employee_id) WHERE employee_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leave_requests_total_days ON hr_public.leave_requests(total_days) WHERE total_days IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leave_requests_submitted_at ON hr_public.leave_requests(submitted_at) WHERE submitted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leave_requests_approved_at ON hr_public.leave_requests(approved_at) WHERE approved_at IS NOT NULL;

-- Create leave balances table for tracking annual allowances
CREATE TABLE IF NOT EXISTS hr_public.leave_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES hr_public.users(id) ON DELETE CASCADE,
  leave_type VARCHAR(20) NOT NULL,
  year INTEGER NOT NULL,
  annual_allowance NUMERIC(5,1) NOT NULL DEFAULT 20,
  used_days NUMERIC(5,1) NOT NULL DEFAULT 0,
  remaining_days NUMERIC(5,1) GENERATED ALWAYS AS (annual_allowance - used_days) STORED,

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  UNIQUE(employee_id, leave_type, year)
);

-- Add constraints for leave_balances
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'leave_balances_leave_type_check'
    AND conrelid = 'hr_public.leave_balances'::regclass
  ) THEN
    ALTER TABLE hr_public.leave_balances
      ADD CONSTRAINT leave_balances_leave_type_check
      CHECK (leave_type IN ('VACATION', 'SICK', 'PERSONAL', 'MATERNITY', 'PATERNITY', 'BEREAVEMENT', 'JURY_DUTY', 'MILITARY'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'leave_balances_year_check'
    AND conrelid = 'hr_public.leave_balances'::regclass
  ) THEN
    ALTER TABLE hr_public.leave_balances
      ADD CONSTRAINT leave_balances_year_check
      CHECK (year >= 2020 AND year <= 2050);
  END IF;
END $$;

-- Create indexes for leave_balances
CREATE INDEX IF NOT EXISTS idx_leave_balances_employee_id ON hr_public.leave_balances(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_balances_employee_type_year ON hr_public.leave_balances(employee_id, leave_type, year);

-- Create business days calculation function
CREATE OR REPLACE FUNCTION hr_public.calculate_business_days(start_date DATE, end_date DATE)
RETURNS NUMERIC AS $$
DECLARE
  total_days INTEGER;
  full_weeks INTEGER;
  remaining_days INTEGER;
  start_day_of_week INTEGER;
  business_days INTEGER;
BEGIN
  IF start_date > end_date THEN
    RETURN 0;
  END IF;

  total_days := end_date - start_date + 1;
  full_weeks := total_days / 7;
  remaining_days := total_days % 7;
  business_days := full_weeks * 5;

  start_day_of_week := EXTRACT(DOW FROM start_date);

  FOR i IN 0..remaining_days-1 LOOP
    IF ((start_day_of_week + i) % 7) BETWEEN 1 AND 5 THEN
      business_days := business_days + 1;
    END IF;
  END LOOP;

  RETURN business_days;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create function to calculate total_days and manage leave workflow
CREATE OR REPLACE FUNCTION hr_public.update_leave_request_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate total days as business days if not already set
  IF NEW.total_days IS NULL AND NEW.start_date IS NOT NULL AND NEW.end_date IS NOT NULL THEN
    NEW.total_days := hr_public.calculate_business_days(NEW.start_date, NEW.end_date);
  END IF;

  -- Set submitted_at when status changes to non-PENDING
  IF NEW.status != 'PENDING' AND (OLD IS NULL OR OLD.status = 'PENDING' OR OLD.status IS NULL) AND NEW.submitted_at IS NULL THEN
    NEW.submitted_at := NOW();
  END IF;

  -- Set approved_at when status changes to APPROVED
  IF NEW.status = 'APPROVED' AND (OLD IS NULL OR OLD.status != 'APPROVED') AND NEW.approved_at IS NULL THEN
    NEW.approved_at := NOW();
  END IF;

  -- Set updated_at
  NEW.updated_at := NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for leave request field updates
DROP TRIGGER IF EXISTS tr_update_leave_request_fields ON hr_public.leave_requests;
CREATE TRIGGER tr_update_leave_request_fields
  BEFORE INSERT OR UPDATE ON hr_public.leave_requests
  FOR EACH ROW
  EXECUTE FUNCTION hr_public.update_leave_request_fields();

-- Create helper functions for GraphQL operations
CREATE OR REPLACE FUNCTION hr_public.get_leave_balance(
  p_employee_id UUID,
  p_leave_type VARCHAR(20),
  p_year INTEGER DEFAULT NULL
)
RETURNS NUMERIC AS $$
DECLARE
  balance_year INTEGER;
  current_balance NUMERIC(5,1);
BEGIN
  balance_year := COALESCE(p_year, EXTRACT(YEAR FROM CURRENT_DATE));

  SELECT remaining_days INTO current_balance
  FROM hr_public.leave_balances
  WHERE employee_id = p_employee_id
  AND leave_type = p_leave_type
  AND year = balance_year;

  RETURN COALESCE(current_balance, 0);
END;
$$ LANGUAGE plpgsql STABLE;

-- Create function for getting user's leave requests
CREATE OR REPLACE FUNCTION hr_public.get_my_leave_requests(
  p_employee_id UUID,
  p_status VARCHAR(20) DEFAULT NULL,
  p_leave_type VARCHAR(20) DEFAULT NULL
)
RETURNS TABLE(
  id UUID,
  leave_type VARCHAR(50),
  start_date DATE,
  end_date DATE,
  total_days NUMERIC,
  reason TEXT,
  status VARCHAR(20),
  submitted_at TIMESTAMPTZ,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  leave_balance_before NUMERIC,
  leave_balance_after NUMERIC,
  emergency_contact_during_leave VARCHAR(200),
  work_coverage_plan TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    lr.id,
    lr.leave_type,
    lr.start_date,
    lr.end_date,
    lr.total_days,
    lr.reason,
    lr.status,
    lr.submitted_at,
    lr.approved_by,
    lr.approved_at,
    lr.rejection_reason,
    lr.leave_balance_before,
    lr.leave_balance_after,
    lr.emergency_contact_during_leave,
    lr.work_coverage_plan
  FROM hr_public.leave_requests lr
  WHERE (lr.employee_id = p_employee_id OR lr.user_id = p_employee_id)
  AND (p_status IS NULL OR lr.status = p_status)
  AND (p_leave_type IS NULL OR lr.leave_type = p_leave_type)
  ORDER BY lr.created_at DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON hr_public.leave_balances TO hr_graphile_role;
GRANT EXECUTE ON FUNCTION hr_public.calculate_business_days(DATE, DATE) TO hr_graphile_role;
GRANT EXECUTE ON FUNCTION hr_public.update_leave_request_fields() TO hr_graphile_role;
GRANT EXECUTE ON FUNCTION hr_public.get_leave_balance(UUID, VARCHAR, INTEGER) TO hr_graphile_role;
GRANT EXECUTE ON FUNCTION hr_public.get_my_leave_requests(UUID, VARCHAR, VARCHAR) TO hr_graphile_role;

-- Enable RLS on new tables
ALTER TABLE hr_public.leave_balances ENABLE ROW LEVEL SECURITY;

-- Add comments
COMMENT ON COLUMN hr_public.leave_requests.employee_id IS 'Employee submitting the leave request (compatibility with user_id)';
COMMENT ON COLUMN hr_public.leave_requests.total_days IS 'Total business days requested (calculated automatically)';
COMMENT ON COLUMN hr_public.leave_requests.emergency_contact_during_leave IS 'Contact information for emergencies during leave';
COMMENT ON COLUMN hr_public.leave_requests.work_coverage_plan IS 'Plan for covering work responsibilities during leave';
COMMENT ON COLUMN hr_public.leave_requests.leave_balance_before IS 'Leave balance before this request';
COMMENT ON COLUMN hr_public.leave_requests.leave_balance_after IS 'Leave balance after this request';

COMMENT ON TABLE hr_public.leave_balances IS 'Annual leave allowances and usage tracking by employee and leave type';
COMMENT ON FUNCTION hr_public.calculate_business_days(DATE, DATE) IS 'Calculates business days between two dates (excluding weekends)';
COMMENT ON FUNCTION hr_public.get_leave_balance(UUID, VARCHAR, INTEGER) IS 'Returns current leave balance for employee and leave type';
COMMENT ON FUNCTION hr_public.get_my_leave_requests(UUID, VARCHAR, VARCHAR) IS 'Returns employee''s own leave requests with filtering';

COMMIT;