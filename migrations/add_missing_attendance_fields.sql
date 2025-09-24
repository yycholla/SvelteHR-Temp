-- Add missing fields to attendance_records table

-- Add overtime_hours field
ALTER TABLE hr_public.attendance_records
ADD COLUMN IF NOT EXISTS overtime_hours DECIMAL(4,2) DEFAULT 0.0;

-- Add notes field
ALTER TABLE hr_public.attendance_records
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Update the total_hours calculation to handle overtime
CREATE OR REPLACE FUNCTION hr_public.calculate_total_hours(clock_in_time TIME, clock_out_time TIME)
RETURNS DECIMAL(4,2)
LANGUAGE plpgsql
AS $$
DECLARE
  regular_hours DECIMAL(4,2);
  standard_work_day DECIMAL(4,2) := 8.0; -- Standard 8-hour work day
BEGIN
  IF clock_in_time IS NULL OR clock_out_time IS NULL THEN
    RETURN 0.0;
  END IF;

  -- Calculate difference in hours
  regular_hours := EXTRACT(EPOCH FROM (clock_out_time - clock_in_time)) / 3600.0;

  -- Return the calculated hours (can be more than 8 for overtime)
  RETURN regular_hours;
END;
$$;

-- Create function to calculate overtime hours
CREATE OR REPLACE FUNCTION hr_public.calculate_overtime_hours(total_hours DECIMAL(4,2))
RETURNS DECIMAL(4,2)
LANGUAGE plpgsql
AS $$
DECLARE
  standard_work_day DECIMAL(4,2) := 8.0; -- Standard 8-hour work day
BEGIN
  IF total_hours IS NULL OR total_hours <= standard_work_day THEN
    RETURN 0.0;
  END IF;

  -- Return overtime hours (anything over 8 hours)
  RETURN total_hours - standard_work_day;
END;
$$;

-- Update the trigger function to also calculate overtime
CREATE OR REPLACE FUNCTION hr_public.update_total_hours()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.total_hours = hr_public.calculate_total_hours(NEW.clock_in_time, NEW.clock_out_time);
  NEW.overtime_hours = hr_public.calculate_overtime_hours(NEW.total_hours);
  RETURN NEW;
END;
$$;

-- Update existing records to calculate overtime_hours
UPDATE hr_public.attendance_records
SET overtime_hours = hr_public.calculate_overtime_hours(total_hours)
WHERE overtime_hours IS NULL;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION hr_public.calculate_overtime_hours(DECIMAL(4,2)) TO hr_employee, hr_manager, hr_admin, hr_super_admin;

-- Update table comment to trigger PostGraphile schema refresh
COMMENT ON TABLE hr_public.attendance_records IS 'Employee attendance tracking with clock in/out times, calculated hours, overtime, and notes';

-- Update column comments for better GraphQL documentation
COMMENT ON COLUMN hr_public.attendance_records.total_hours IS 'Total hours worked for the day';
COMMENT ON COLUMN hr_public.attendance_records.overtime_hours IS 'Overtime hours (hours worked beyond standard 8-hour day)';
COMMENT ON COLUMN hr_public.attendance_records.notes IS 'Additional notes or comments about the attendance record';