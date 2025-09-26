-- Migration: Extend leave requests table for management functionality
-- Created: 2025-09-24
-- Task: T001 - Leave requests database migration

-- Add missing columns to existing leave_requests table
ALTER TABLE hr_public.leave_requests
ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES hr_public.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS days_requested INTEGER,
ADD COLUMN IF NOT EXISTS manager_comments TEXT;

-- Update days_requested from existing total_days column where possible
UPDATE hr_public.leave_requests
SET days_requested = COALESCE(total_days::INTEGER, 1)
WHERE days_requested IS NULL;

-- Standardize existing data values
UPDATE hr_public.leave_requests SET leave_type = 'annual' WHERE UPPER(leave_type) = 'VACATION';
UPDATE hr_public.leave_requests SET leave_type = 'sick' WHERE UPPER(leave_type) = 'SICK';
UPDATE hr_public.leave_requests SET status = LOWER(status);

-- Add constraints for new columns (PostgreSQL doesn't support IF NOT EXISTS for constraints)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'leave_requests_days_requested_check') THEN
        ALTER TABLE hr_public.leave_requests ADD CONSTRAINT leave_requests_days_requested_check CHECK (days_requested > 0);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'leave_requests_no_self_approval') THEN
        ALTER TABLE hr_public.leave_requests ADD CONSTRAINT leave_requests_no_self_approval CHECK (employee_id != manager_id);
    END IF;
END $$;

-- Create additional performance indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_leave_requests_manager_status ON hr_public.leave_requests(manager_id, status);

-- Update leave_type constraint to include new values
ALTER TABLE hr_public.leave_requests DROP CONSTRAINT IF EXISTS leave_requests_leave_type_check;
ALTER TABLE hr_public.leave_requests
ADD CONSTRAINT leave_requests_leave_type_check CHECK (leave_type IN ('annual', 'sick', 'personal', 'maternity', 'paternity', 'emergency', 'unpaid'));

-- Update status constraint to use lowercase values
ALTER TABLE hr_public.leave_requests DROP CONSTRAINT IF EXISTS leave_requests_status_check_extended;
ALTER TABLE hr_public.leave_requests
ADD CONSTRAINT leave_requests_status_check CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled'));

-- Add comments for documentation
COMMENT ON TABLE hr_public.leave_requests IS 'Employee leave requests with approval workflow';
COMMENT ON COLUMN hr_public.leave_requests.leave_type IS 'Type of leave: annual, sick, personal, maternity, paternity, emergency, unpaid';
COMMENT ON COLUMN hr_public.leave_requests.status IS 'Request status: pending, approved, denied, cancelled';
COMMENT ON COLUMN hr_public.leave_requests.days_requested IS 'Number of business days requested';
COMMENT ON COLUMN hr_public.leave_requests.manager_comments IS 'Manager feedback on approval/denial';