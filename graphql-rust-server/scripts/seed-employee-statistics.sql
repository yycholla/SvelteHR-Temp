-- Seed historical employee statistics for testing the area chart
-- Creates 30 days of sample data with realistic employee growth trends

DO $$
DECLARE
    snapshot_day DATE;
    base_active_count INT := 35; -- Starting with 35 active employees
    base_inactive_count INT := 5; -- Starting with 5 inactive
    base_dept_count INT := 10; -- 10 departments
    day_offset INT;
    active_variation INT;
    inactive_variation INT;
BEGIN
    -- Generate data for the last 30 days
    FOR day_offset IN 0..29 LOOP
        snapshot_day := (CURRENT_DATE - INTERVAL '1 day' * (29 - day_offset))::DATE;

        -- Add some realistic variation to employee counts
        -- Active employees trend slightly upward with some randomness
        active_variation := FLOOR(RANDOM() * 5)::INT + (day_offset / 3)::INT;
        inactive_variation := FLOOR(RANDOM() * 3)::INT;

        -- Insert the snapshot (skip if already exists)
        INSERT INTO hr_public.employee_statistics (
            id,
            snapshot_date,
            total_count,
            active_count,
            inactive_count,
            department_count,
            created_at,
            updated_at
        )
        VALUES (
            gen_random_uuid(),
            snapshot_day,
            base_active_count + active_variation + base_inactive_count + inactive_variation,
            base_active_count + active_variation,
            base_inactive_count + inactive_variation,
            base_dept_count,
            NOW(),
            NOW()
        )
        ON CONFLICT (snapshot_date) DO NOTHING;
    END LOOP;

    -- Log the result
    RAISE NOTICE 'Seeded employee statistics for the last 30 days';
END $$;

-- Verify the data
SELECT
    snapshot_date,
    total_count,
    active_count,
    inactive_count,
    department_count
FROM hr_public.employee_statistics
ORDER BY snapshot_date DESC
LIMIT 10;
