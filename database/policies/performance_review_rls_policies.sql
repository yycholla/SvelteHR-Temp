-- Row-Level Security Policies for Performance Review System
-- Created: 2025-09-15
-- Description: RLS policies for performance reviews with role-based access

-- Enable RLS on performance review tables
ALTER TABLE hr_public.review_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_public.performance_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_public.competencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_public.competency_ratings ENABLE ROW LEVEL SECURITY;

-- Review cycles: HR Admin and above can manage, managers and employees can view active cycles
CREATE POLICY "review_cycles_select" ON hr_public.review_cycles
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

CREATE POLICY "review_cycles_insert" ON hr_public.review_cycles
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

CREATE POLICY "review_cycles_update" ON hr_public.review_cycles
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

-- Performance reviews: Employees can view/edit their own, managers can view/edit their reports', HR can manage all
CREATE POLICY "performance_reviews_select" ON hr_public.performance_reviews
    FOR SELECT
    USING (
        employee_id = current_setting('jwt.claims.user_id', true)::UUID OR  -- Own reviews
        manager_id = current_setting('jwt.claims.user_id', true)::UUID OR   -- Reviews I manage
        hr_reviewer_id = current_setting('jwt.claims.user_id', true)::UUID OR  -- Reviews I HR-review
        EXISTS (
            -- HR Admin and above can view all
            SELECT 1 FROM hr_public.user_role_assignments ura
            JOIN hr_public.user_roles ur ON ura.role_id = ur.id
            WHERE ura.user_id = current_setting('jwt.claims.user_id', true)::UUID
              AND ur.level >= 80
              AND ura.is_active = true
        )
    );

CREATE POLICY "performance_reviews_insert" ON hr_public.performance_reviews
    FOR INSERT
    WITH CHECK (
        -- Only managers can create reviews for their reports or HR Admin can create any
        manager_id = current_setting('jwt.claims.user_id', true)::UUID OR
        EXISTS (
            SELECT 1 FROM hr_public.user_role_assignments ura
            JOIN hr_public.user_roles ur ON ura.role_id = ur.id
            WHERE ura.user_id = current_setting('jwt.claims.user_id', true)::UUID
              AND ur.level >= 80
              AND ura.is_active = true
        )
    );

CREATE POLICY "performance_reviews_update" ON hr_public.performance_reviews
    FOR UPDATE
    USING (
        employee_id = current_setting('jwt.claims.user_id', true)::UUID OR  -- Employee updating self-assessment
        manager_id = current_setting('jwt.claims.user_id', true)::UUID OR   -- Manager updating review
        hr_reviewer_id = current_setting('jwt.claims.user_id', true)::UUID OR  -- HR reviewer
        EXISTS (
            SELECT 1 FROM hr_public.user_role_assignments ura
            JOIN hr_public.user_roles ur ON ura.role_id = ur.id
            WHERE ura.user_id = current_setting('jwt.claims.user_id', true)::UUID
              AND ur.level >= 80
              AND ura.is_active = true
        )
    );

-- Goals: Employees can manage their own goals, managers can view/create goals for reports, HR can manage all
CREATE POLICY "goals_select" ON hr_public.goals
    FOR SELECT
    USING (
        employee_id = current_setting('jwt.claims.user_id', true)::UUID OR  -- Own goals
        created_by = current_setting('jwt.claims.user_id', true)::UUID OR   -- Goals I created
        EXISTS (
            -- Manager viewing direct report's goals
            SELECT 1 FROM hr_public.job_information ji
            WHERE ji.employee_id = goals.employee_id
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

CREATE POLICY "goals_insert" ON hr_public.goals
    FOR INSERT
    WITH CHECK (
        -- Users can create goals for themselves, managers for their reports, HR for anyone
        employee_id = current_setting('jwt.claims.user_id', true)::UUID OR
        EXISTS (
            SELECT 1 FROM hr_public.job_information ji
            WHERE ji.employee_id = goals.employee_id
              AND (ji.manager_id = current_setting('jwt.claims.user_id', true)::UUID OR
                   ji.reports_to = current_setting('jwt.claims.user_id', true)::UUID)
              AND ji.end_date IS NULL
        ) OR
        EXISTS (
            SELECT 1 FROM hr_public.user_role_assignments ura
            JOIN hr_public.user_roles ur ON ura.role_id = ur.id
            WHERE ura.user_id = current_setting('jwt.claims.user_id', true)::UUID
              AND ur.level >= 80
              AND ura.is_active = true
        )
    );

CREATE POLICY "goals_update" ON hr_public.goals
    FOR UPDATE
    USING (
        employee_id = current_setting('jwt.claims.user_id', true)::UUID OR  -- Own goals
        created_by = current_setting('jwt.claims.user_id', true)::UUID OR   -- Goals I created
        EXISTS (
            -- Manager can update direct report's goals
            SELECT 1 FROM hr_public.job_information ji
            WHERE ji.employee_id = goals.employee_id
              AND (ji.manager_id = current_setting('jwt.claims.user_id', true)::UUID OR
                   ji.reports_to = current_setting('jwt.claims.user_id', true)::UUID)
              AND ji.end_date IS NULL
        ) OR
        EXISTS (
            SELECT 1 FROM hr_public.user_role_assignments ura
            JOIN hr_public.user_roles ur ON ura.role_id = ur.id
            WHERE ura.user_id = current_setting('jwt.claims.user_id', true)::UUID
              AND ur.level >= 80
              AND ura.is_active = true
        )
    );

CREATE POLICY "goals_delete" ON hr_public.goals
    FOR DELETE
    USING (
        employee_id = current_setting('jwt.claims.user_id', true)::UUID OR  -- Own goals
        created_by = current_setting('jwt.claims.user_id', true)::UUID OR   -- Goals I created
        EXISTS (
            SELECT 1 FROM hr_public.user_role_assignments ura
            JOIN hr_public.user_roles ur ON ura.role_id = ur.id
            WHERE ura.user_id = current_setting('jwt.claims.user_id', true)::UUID
              AND ur.level >= 80
              AND ura.is_active = true
        )
    );

-- Competencies: Everyone can view active competencies, HR Admin can manage
CREATE POLICY "competencies_select" ON hr_public.competencies
    FOR SELECT
    USING (is_active = true);

CREATE POLICY "competencies_insert" ON hr_public.competencies
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM hr_public.user_role_assignments ura
            JOIN hr_public.user_roles ur ON ura.role_id = ur.id
            WHERE ura.user_id = current_setting('jwt.claims.user_id', true)::UUID
              AND ur.level >= 80
              AND ura.is_active = true
        )
    );

CREATE POLICY "competencies_update" ON hr_public.competencies
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM hr_public.user_role_assignments ura
            JOIN hr_public.user_roles ur ON ura.role_id = ur.id
            WHERE ura.user_id = current_setting('jwt.claims.user_id', true)::UUID
              AND ur.level >= 80
              AND ura.is_active = true
        )
    );

-- Competency ratings: Same access as performance reviews since they're linked
CREATE POLICY "competency_ratings_select" ON hr_public.competency_ratings
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM hr_public.performance_reviews pr
            WHERE pr.id = competency_ratings.review_id
              AND (pr.employee_id = current_setting('jwt.claims.user_id', true)::UUID OR
                   pr.manager_id = current_setting('jwt.claims.user_id', true)::UUID OR
                   pr.hr_reviewer_id = current_setting('jwt.claims.user_id', true)::UUID)
        ) OR
        EXISTS (
            SELECT 1 FROM hr_public.user_role_assignments ura
            JOIN hr_public.user_roles ur ON ura.role_id = ur.id
            WHERE ura.user_id = current_setting('jwt.claims.user_id', true)::UUID
              AND ur.level >= 80
              AND ura.is_active = true
        )
    );

CREATE POLICY "competency_ratings_insert" ON hr_public.competency_ratings
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM hr_public.performance_reviews pr
            WHERE pr.id = competency_ratings.review_id
              AND (pr.employee_id = current_setting('jwt.claims.user_id', true)::UUID OR
                   pr.manager_id = current_setting('jwt.claims.user_id', true)::UUID OR
                   pr.hr_reviewer_id = current_setting('jwt.claims.user_id', true)::UUID)
        )
    );

CREATE POLICY "competency_ratings_update" ON hr_public.competency_ratings
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM hr_public.performance_reviews pr
            WHERE pr.id = competency_ratings.review_id
              AND (pr.employee_id = current_setting('jwt.claims.user_id', true)::UUID OR
                   pr.manager_id = current_setting('jwt.claims.user_id', true)::UUID OR
                   pr.hr_reviewer_id = current_setting('jwt.claims.user_id', true)::UUID)
        ) OR
        EXISTS (
            SELECT 1 FROM hr_public.user_role_assignments ura
            JOIN hr_public.user_roles ur ON ura.role_id = ur.id
            WHERE ura.user_id = current_setting('jwt.claims.user_id', true)::UUID
              AND ur.level >= 80
              AND ura.is_active = true
        )
    );

-- Grant appropriate permissions to roles
GRANT SELECT ON hr_public.review_cycles TO hr_employee, hr_manager, hr_admin, hr_super_admin;
GRANT INSERT, UPDATE ON hr_public.review_cycles TO hr_admin, hr_super_admin;

GRANT SELECT, INSERT, UPDATE ON hr_public.performance_reviews TO hr_employee, hr_manager, hr_admin, hr_super_admin;

GRANT SELECT, INSERT, UPDATE, DELETE ON hr_public.goals TO hr_employee, hr_manager, hr_admin, hr_super_admin;

GRANT SELECT ON hr_public.competencies TO hr_employee, hr_manager, hr_admin, hr_super_admin;
GRANT INSERT, UPDATE ON hr_public.competencies TO hr_admin, hr_super_admin;

GRANT SELECT, INSERT, UPDATE ON hr_public.competency_ratings TO hr_employee, hr_manager, hr_admin, hr_super_admin;