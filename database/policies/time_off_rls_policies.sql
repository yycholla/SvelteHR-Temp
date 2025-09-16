-- Row-Level Security Policies for Time-Off System
-- Created: 2025-09-15
-- Description: RLS policies for time-off management with role-based access

-- Enable RLS on time-off tables
ALTER TABLE hr_public.time_off_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_public.time_off_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_public.time_off_requests ENABLE ROW LEVEL SECURITY;

-- Time-off policies: HR Admin and above can manage, everyone can view active policies
CREATE POLICY "time_off_policies_select" ON hr_public.time_off_policies
    FOR SELECT
    USING (
        is_active = true OR 
        EXISTS (
            SELECT 1 FROM hr_public.user_role_assignments ura
            JOIN hr_public.user_roles ur ON ura.role_id = ur.id
            WHERE ura.user_id = current_setting('jwt.claims.user_id', true)::UUID
              AND ur.level >= 80  -- HR Admin and above
              AND ura.is_active = true
        )
    );

CREATE POLICY "time_off_policies_insert" ON hr_public.time_off_policies
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM hr_public.user_role_assignments ura
            JOIN hr_public.user_roles ur ON ura.role_id = ur.id
            WHERE ura.user_id = current_setting('jwt.claims.user_id', true)::UUID
              AND ur.level >= 80  -- HR Admin and above
              AND ura.is_active = true
        )
    );

CREATE POLICY "time_off_policies_update" ON hr_public.time_off_policies
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM hr_public.user_role_assignments ura
            JOIN hr_public.user_roles ur ON ura.role_id = ur.id
            WHERE ura.user_id = current_setting('jwt.claims.user_id', true)::UUID
              AND ur.level >= 80  -- HR Admin and above
              AND ura.is_active = true
        )
    );

-- Time-off balances: Users can view their own, managers can view their reports', HR can view all
CREATE POLICY "time_off_balances_select" ON hr_public.time_off_balances
    FOR SELECT
    USING (
        user_id = current_setting('jwt.claims.user_id', true)::UUID OR  -- Own balance
        EXISTS (
            -- Manager viewing direct report's balance
            SELECT 1 FROM hr_public.job_information ji
            WHERE ji.employee_id = user_id
              AND (ji.manager_id = current_setting('jwt.claims.user_id', true)::UUID OR
                   ji.reports_to = current_setting('jwt.claims.user_id', true)::UUID)
              AND ji.end_date IS NULL
        ) OR
        EXISTS (
            -- HR Admin and above can view all
            SELECT 1 FROM hr_public.user_role_assignments ura
            JOIN hr_public.user_roles ur ON ura.role_id = ur.id
            WHERE ura.user_id = current_setting('jwt.claims.user_id', true)::UUID
              AND ur.level >= 80
              AND ura.is_active = true
        )
    );

-- Time-off requests: Users can manage their own, managers can approve/view reports', HR can manage all
CREATE POLICY "time_off_requests_select" ON hr_public.time_off_requests
    FOR SELECT
    USING (
        user_id = current_setting('jwt.claims.user_id', true)::UUID OR  -- Own requests
        reviewed_by = current_setting('jwt.claims.user_id', true)::UUID OR  -- Requests I reviewed
        EXISTS (
            -- Manager viewing direct report's requests
            SELECT 1 FROM hr_public.job_information ji
            WHERE ji.employee_id = user_id
              AND (ji.manager_id = current_setting('jwt.claims.user_id', true)::UUID OR
                   ji.reports_to = current_setting('jwt.claims.user_id', true)::UUID)
              AND ji.end_date IS NULL
        ) OR
        EXISTS (
            -- HR Admin and above can view all
            SELECT 1 FROM hr_public.user_role_assignments ura
            JOIN hr_public.user_roles ur ON ura.role_id = ur.id
            WHERE ura.user_id = current_setting('jwt.claims.user_id', true)::UUID
              AND ur.level >= 80
              AND ura.is_active = true
        )
    );

CREATE POLICY "time_off_requests_insert" ON hr_public.time_off_requests
    FOR INSERT
    WITH CHECK (
        user_id = current_setting('jwt.claims.user_id', true)::UUID  -- Can only create own requests
    );

CREATE POLICY "time_off_requests_update" ON hr_public.time_off_requests
    FOR UPDATE
    USING (
        -- Users can update their own pending requests
        (user_id = current_setting('jwt.claims.user_id', true)::UUID AND status IN ('PENDING', 'IN_REVIEW')) OR
        -- Managers can approve/reject direct reports' requests
        EXISTS (
            SELECT 1 FROM hr_public.job_information ji
            WHERE ji.employee_id = user_id
              AND (ji.manager_id = current_setting('jwt.claims.user_id', true)::UUID OR
                   ji.reports_to = current_setting('jwt.claims.user_id', true)::UUID)
              AND ji.end_date IS NULL
        ) OR
        -- HR Admin and above can manage all requests
        EXISTS (
            SELECT 1 FROM hr_public.user_role_assignments ura
            JOIN hr_public.user_roles ur ON ura.role_id = ur.id
            WHERE ura.user_id = current_setting('jwt.claims.user_id', true)::UUID
              AND ur.level >= 80
              AND ura.is_active = true
        )
    );

CREATE POLICY "time_off_requests_delete" ON hr_public.time_off_requests
    FOR DELETE
    USING (
        -- Users can delete their own pending requests
        user_id = current_setting('jwt.claims.user_id', true)::UUID AND status = 'PENDING'
    );

-- Grant appropriate permissions to roles
GRANT SELECT ON hr_public.time_off_policies TO hr_employee, hr_manager, hr_admin, hr_super_admin;
GRANT INSERT, UPDATE ON hr_public.time_off_policies TO hr_admin, hr_super_admin;

GRANT SELECT ON hr_public.time_off_balances TO hr_employee, hr_manager, hr_admin, hr_super_admin;
GRANT INSERT, UPDATE ON hr_public.time_off_balances TO hr_admin, hr_super_admin;

GRANT SELECT, INSERT, UPDATE ON hr_public.time_off_requests TO hr_employee, hr_manager, hr_admin, hr_super_admin;
GRANT DELETE ON hr_public.time_off_requests TO hr_employee, hr_manager, hr_admin, hr_super_admin;