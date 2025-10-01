-- Create attendance_records table
-- Migration: Add attendance tracking functionality
-- Date: 2025-10-01

-- Create attendance_records table
CREATE TABLE IF NOT EXISTS hr_public.attendance_records (
    id uuid DEFAULT uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    date date NOT NULL,
    clock_in timestamp with time zone,
    clock_out timestamp with time zone,
    hours_worked numeric(5,2),
    status character varying(50) DEFAULT 'present'::character varying,
    location character varying(255),
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT attendance_records_pkey PRIMARY KEY (id),
    CONSTRAINT attendance_records_user_date_unique UNIQUE (user_id, date),
    CONSTRAINT attendance_records_user_id_fkey FOREIGN KEY (user_id) REFERENCES hr_public.users(id) ON DELETE CASCADE,
    CONSTRAINT attendance_records_clock_times_valid CHECK (clock_out IS NULL OR clock_out >= clock_in),
    CONSTRAINT attendance_records_hours_valid CHECK (hours_worked IS NULL OR (hours_worked >= 0 AND hours_worked <= 24)),
    CONSTRAINT attendance_records_status_valid CHECK (status IN ('present', 'partial', 'absent', 'leave', 'holiday'))
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_attendance_records_user_id ON hr_public.attendance_records(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_date ON hr_public.attendance_records(date);
CREATE INDEX IF NOT EXISTS idx_attendance_records_user_date ON hr_public.attendance_records(user_id, date DESC);

-- Add comments
COMMENT ON TABLE hr_public.attendance_records IS 'Employee attendance and time tracking records';
COMMENT ON COLUMN hr_public.attendance_records.user_id IS 'Reference to the user/employee';
COMMENT ON COLUMN hr_public.attendance_records.date IS 'Date of the attendance record';
COMMENT ON COLUMN hr_public.attendance_records.clock_in IS 'Time the employee clocked in';
COMMENT ON COLUMN hr_public.attendance_records.clock_out IS 'Time the employee clocked out';
COMMENT ON COLUMN hr_public.attendance_records.hours_worked IS 'Total hours worked (calculated or manually entered)';
COMMENT ON COLUMN hr_public.attendance_records.status IS 'Attendance status: present, partial, absent, leave, holiday';
COMMENT ON COLUMN hr_public.attendance_records.location IS 'Work location (e.g., Office, Remote, Field)';
COMMENT ON COLUMN hr_public.attendance_records.notes IS 'Additional notes or comments about the attendance';

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON hr_public.attendance_records TO hr_employee;
GRANT ALL ON hr_public.attendance_records TO hr_admin;
GRANT ALL ON hr_public.attendance_records TO hr_manager;

-- Create trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION hr_public.update_attendance_records_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_attendance_records_updated_at
    BEFORE UPDATE ON hr_public.attendance_records
    FOR EACH ROW
    EXECUTE FUNCTION hr_public.update_attendance_records_updated_at();
