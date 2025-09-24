-- Fix attendance record fields to match frontend GraphQL expectations
-- Add missing fields and rename existing ones

-- First, add the totalHours column
ALTER TABLE hr_public.attendance_records
ADD COLUMN IF NOT EXISTS total_hours DECIMAL(4,2);

-- Add computed columns or views for the expected field names
-- PostGraphile will use these column names directly in GraphQL

-- Rename check_in to clock_in_time and check_out to clock_out_time
ALTER TABLE hr_public.attendance_records
RENAME COLUMN check_in TO clock_in_time;

ALTER TABLE hr_public.attendance_records
RENAME COLUMN check_out TO clock_out_time;

-- Update the total_hours calculation function
CREATE OR REPLACE FUNCTION hr_public.calculate_total_hours(clock_in_time TIME, clock_out_time TIME)
RETURNS DECIMAL(4,2)
LANGUAGE plpgsql
AS $$
BEGIN
  IF clock_in_time IS NULL OR clock_out_time IS NULL THEN
    RETURN 0.0;
  END IF;

  -- Calculate difference in hours
  RETURN EXTRACT(EPOCH FROM (clock_out_time - clock_in_time)) / 3600.0;
END;
$$;

-- Create a trigger to automatically calculate total_hours
CREATE OR REPLACE FUNCTION hr_public.update_total_hours()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.total_hours = hr_public.calculate_total_hours(NEW.clock_in_time, NEW.clock_out_time);
  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_update_total_hours ON hr_public.attendance_records;

-- Create the trigger
CREATE TRIGGER trigger_update_total_hours
  BEFORE INSERT OR UPDATE ON hr_public.attendance_records
  FOR EACH ROW
  EXECUTE FUNCTION hr_public.update_total_hours();

-- Update existing records to calculate total_hours
UPDATE hr_public.attendance_records
SET total_hours = hr_public.calculate_total_hours(clock_in_time, clock_out_time)
WHERE total_hours IS NULL;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION hr_public.calculate_total_hours(TIME, TIME) TO hr_employee, hr_manager, hr_admin, hr_super_admin;
GRANT EXECUTE ON FUNCTION hr_public.update_total_hours() TO hr_employee, hr_manager, hr_admin, hr_super_admin;

-- Refresh PostGraphile schema cache by updating comment
COMMENT ON TABLE hr_public.attendance_records IS 'Employee attendance tracking with clock in/out times and calculated hours';