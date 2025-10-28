-- Migration: Time & Attendance
-- Created: 2025-10-17
-- Description: attendance_records

BEGIN;

-- ============================================================================
-- ATTENDANCE_RECORDS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS hr_public.attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES hr_public.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    clock_in TIMESTAMPTZ,
    clock_out TIMESTAMPTZ,
    hours_worked DECIMAL(5,2),
    status VARCHAR(50) NOT NULL DEFAULT 'present',
    break_duration_minutes INTEGER DEFAULT 0,
    overtime_hours DECIMAL(5,2) DEFAULT 0.0,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT attendance_records_user_date_unique UNIQUE (user_id, date),
    CONSTRAINT attendance_records_hours_valid CHECK (
        hours_worked IS NULL OR (hours_worked >= 0 AND hours_worked <= 24)
    ),
    CONSTRAINT attendance_records_overtime_valid CHECK (overtime_hours >= 0),
    CONSTRAINT attendance_records_break_valid CHECK (break_duration_minutes >= 0),
    CONSTRAINT attendance_records_clock_out_after_in CHECK (
        clock_in IS NULL OR clock_out IS NULL OR clock_out > clock_in
    ),
    CONSTRAINT attendance_records_status_valid CHECK (status IN (
        'present', 'absent', 'late', 'half_day', 'on_leave', 'holiday', 'work_from_home'
    ))
);

CREATE INDEX IF NOT EXISTS idx_attendance_records_user ON hr_public.attendance_records(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_records_date ON hr_public.attendance_records(date DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_records_status ON hr_public.attendance_records(status);
CREATE INDEX IF NOT EXISTS idx_attendance_records_user_month ON hr_public.attendance_records(user_id, date)
WHERE EXTRACT(MONTH FROM date) = EXTRACT(MONTH FROM CURRENT_DATE);

COMMENT ON TABLE hr_public.attendance_records IS 'Daily attendance tracking with clock in/out times and status';
COMMENT ON COLUMN hr_public.attendance_records.status IS 'Attendance status: present, absent, late, half_day, on_leave, holiday, work_from_home';
COMMENT ON COLUMN hr_public.attendance_records.hours_worked IS 'Total hours worked (calculated from clock_in/clock_out minus breaks)';
COMMENT ON COLUMN hr_public.attendance_records.overtime_hours IS 'Overtime hours beyond regular working hours';

COMMIT;
