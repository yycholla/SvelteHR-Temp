-- Add missing columns to time_off_balances table to match LeaveBalance model
ALTER TABLE hr_public.time_off_balances
ADD COLUMN IF NOT EXISTS pending_days integer DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS carried_over_days integer DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;

-- Add check constraints
ALTER TABLE hr_public.time_off_balances
ADD CONSTRAINT time_off_balances_pending_days_non_negative CHECK (pending_days >= 0),
ADD CONSTRAINT time_off_balances_carried_over_days_non_negative CHECK (carried_over_days >= 0);

-- Add index for soft deletes
CREATE INDEX IF NOT EXISTS idx_time_off_balances_deleted_at ON hr_public.time_off_balances(deleted_at) WHERE deleted_at IS NULL;