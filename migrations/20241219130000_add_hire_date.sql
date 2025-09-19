-- Add hire_date column to users table
-- This represents the actual date the employee was hired/started work

BEGIN;

-- Add the hire_date column to the users table
ALTER TABLE hr_public.users
ADD COLUMN hire_date DATE;

-- Comment on the new column
COMMENT ON COLUMN hr_public.users.hire_date IS 'The date the employee was hired/started working at the company';

-- For existing users, set hire_date to the date portion of created_at as a default
-- You can update these manually later with accurate hire dates
UPDATE hr_public.users
SET hire_date = DATE(created_at)
WHERE hire_date IS NULL;

-- Add an index on hire_date for better query performance on analytics
CREATE INDEX idx_users_hire_date ON hr_public.users(hire_date);

-- Permissions are already handled by existing table permissions
-- The new column inherits the table's permissions automatically

COMMIT;