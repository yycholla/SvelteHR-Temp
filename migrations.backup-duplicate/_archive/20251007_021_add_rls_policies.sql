-- Migration: Add Row-Level Security policies for document access control
-- Feature: 024-we-need-to (Secure Employee Document Management)
-- Date: 2025-10-07
-- Purpose: Implement RBAC with 4-tier access (Admin, HR, Manager, Employee) and direct report hierarchy

-- Set search path
SET search_path TO hr_public, public;

-- ============================================================================
-- DOCUMENTS TABLE RLS POLICIES
-- ============================================================================

-- Policy 1: Employees can see documents assigned to them (via document_assignments)
CREATE POLICY documents_employee_access ON hr_public.documents
    FOR SELECT
    USING (
        -- User can see documents assigned to them individually
        EXISTS (
            SELECT 1 FROM hr_public.document_assignments da
            WHERE da.document_id = documents.id
            AND da.employee_id = current_setting('jwt.claims.user_id', true)::uuid
            AND da.assignment_status = 'active'
        )
        OR
        -- User can see documents assigned to their department
        EXISTS (
            SELECT 1 FROM hr_public.document_assignments da
            JOIN hr_public.users u ON u.id = current_setting('jwt.claims.user_id', true)::uuid
            WHERE da.document_id = documents.id
            AND da.department_id = u.department_id
            AND da.assignment_status = 'active'
        )
    );

-- Policy 2: Managers can see documents assigned to their direct reports (recursive hierarchy)
CREATE POLICY documents_manager_access ON hr_public.documents
    FOR SELECT
    USING (
        current_setting('jwt.claims.role', true) IN ('manager', 'hr_manager', 'super_admin')
        AND (
            -- Manager can see documents assigned to their direct reports
            EXISTS (
                WITH RECURSIVE direct_reports AS (
                    -- Base case: current user is a manager
                    SELECT id FROM hr_public.users
                    WHERE id = current_setting('jwt.claims.user_id', true)::uuid

                    UNION

                    -- Recursive case: employees reporting to managers in the hierarchy
                    SELECT u.id
                    FROM hr_public.users u
                    JOIN direct_reports dr ON u.manager_id = dr.id
                )
                SELECT 1 FROM hr_public.document_assignments da
                JOIN direct_reports dr ON da.employee_id = dr.id
                WHERE da.document_id = documents.id
                AND da.assignment_status = 'active'
            )
            OR
            -- Manager can see documents assigned to their own departments
            EXISTS (
                SELECT 1 FROM hr_public.document_assignments da
                JOIN hr_public.users u ON u.id = current_setting('jwt.claims.user_id', true)::uuid
                WHERE da.document_id = documents.id
                AND da.department_id = u.department_id
                AND da.assignment_status = 'active'
            )
        )
    );

-- Policy 3: HR role can see all non-deleted documents
CREATE POLICY documents_hr_access ON hr_public.documents
    FOR SELECT
    USING (
        current_setting('jwt.claims.role', true) IN ('hr_manager', 'super_admin')
        AND is_deleted = FALSE
    );

-- Policy 4: Admin role can see ALL documents (including soft-deleted)
CREATE POLICY documents_admin_access ON hr_public.documents
    FOR SELECT
    USING (
        current_setting('jwt.claims.role', true) = 'super_admin'
    );

-- Policy 5: HR and Admin can upload documents
CREATE POLICY documents_upload_access ON hr_public.documents
    FOR INSERT
    WITH CHECK (
        current_setting('jwt.claims.role', true) IN ('hr_manager', 'super_admin')
        AND uploaded_by = current_setting('jwt.claims.user_id', true)::uuid
    );

-- Policy 6: HR and Admin can update documents (including soft delete)
CREATE POLICY documents_update_access ON hr_public.documents
    FOR UPDATE
    USING (
        current_setting('jwt.claims.role', true) IN ('hr_manager', 'super_admin')
    )
    WITH CHECK (
        current_setting('jwt.claims.role', true) IN ('hr_manager', 'super_admin')
    );

-- Policy 7: Only Admin can hard delete documents
CREATE POLICY documents_delete_access ON hr_public.documents
    FOR DELETE
    USING (
        current_setting('jwt.claims.role', true) = 'super_admin'
    );

-- ============================================================================
-- DOCUMENT_ASSIGNMENTS TABLE RLS POLICIES
-- ============================================================================

-- Policy 1: Users can see assignments for documents they can access
CREATE POLICY assignments_view_access ON hr_public.document_assignments
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM hr_public.documents d
            WHERE d.id = document_assignments.document_id
            -- If user can see the document, they can see its assignments
        )
    );

-- Policy 2: HR and Admin can create assignments
CREATE POLICY assignments_create_access ON hr_public.document_assignments
    FOR INSERT
    WITH CHECK (
        current_setting('jwt.claims.role', true) IN ('hr_manager', 'super_admin')
        AND assigned_by = current_setting('jwt.claims.user_id', true)::uuid
    );

-- Policy 3: HR and Admin can update assignments (revoke access)
CREATE POLICY assignments_update_access ON hr_public.document_assignments
    FOR UPDATE
    USING (
        current_setting('jwt.claims.role', true) IN ('hr_manager', 'super_admin')
    );

-- ============================================================================
-- DOCUMENT_ACCESS_LOGS TABLE RLS POLICIES
-- ============================================================================

-- Policy 1: Users can see their own access logs
CREATE POLICY access_logs_own_view ON hr_public.document_access_logs
    FOR SELECT
    USING (
        user_id = current_setting('jwt.claims.user_id', true)::uuid
    );

-- Policy 2: HR and Admin can see all access logs
CREATE POLICY access_logs_admin_view ON hr_public.document_access_logs
    FOR SELECT
    USING (
        current_setting('jwt.claims.role', true) IN ('hr_manager', 'super_admin')
    );

-- Policy 3: All authenticated users can insert access logs (append-only audit trail)
CREATE POLICY access_logs_insert ON hr_public.document_access_logs
    FOR INSERT
    WITH CHECK (
        user_id = current_setting('jwt.claims.user_id', true)::uuid
    );

-- Policy 4: Prevent deletion of access logs (audit trail integrity)
-- No DELETE policy = no one can delete logs

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Documents table
GRANT SELECT ON hr_public.documents TO authenticated;
GRANT INSERT ON hr_public.documents TO authenticated; -- Protected by RLS
GRANT UPDATE ON hr_public.documents TO authenticated; -- Protected by RLS
GRANT DELETE ON hr_public.documents TO authenticated; -- Protected by RLS (Admin only)

-- Document assignments table
GRANT SELECT ON hr_public.document_assignments TO authenticated;
GRANT INSERT ON hr_public.document_assignments TO authenticated; -- Protected by RLS
GRANT UPDATE ON hr_public.document_assignments TO authenticated; -- Protected by RLS

-- Access logs table
GRANT SELECT ON hr_public.document_access_logs TO authenticated;
GRANT INSERT ON hr_public.document_access_logs TO authenticated; -- Append-only

-- ============================================================================
-- HELPER FUNCTIONS FOR RBAC
-- ============================================================================

-- Function to check if user can access a document
CREATE OR REPLACE FUNCTION can_access_document(
    p_user_id UUID,
    p_document_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    user_role TEXT;
    has_access BOOLEAN;
BEGIN
    -- Get user role from users table
    SELECT role INTO user_role FROM hr_public.users WHERE id = p_user_id;

    -- Admin can access everything
    IF user_role = 'super_admin' THEN
        RETURN TRUE;
    END IF;

    -- HR can access all non-deleted documents
    IF user_role = 'hr_manager' THEN
        RETURN EXISTS (
            SELECT 1 FROM hr_public.documents
            WHERE id = p_document_id AND is_deleted = FALSE
        );
    END IF;

    -- Check if user has direct assignment or department assignment
    SELECT EXISTS (
        SELECT 1 FROM hr_public.document_assignments da
        WHERE da.document_id = p_document_id
        AND da.assignment_status = 'active'
        AND (
            da.employee_id = p_user_id
            OR da.department_id IN (
                SELECT department_id FROM hr_public.users WHERE id = p_user_id
            )
        )
    ) INTO has_access;

    -- If manager, also check direct reports
    IF NOT has_access AND user_role IN ('manager', 'hr_manager') THEN
        SELECT EXISTS (
            WITH RECURSIVE direct_reports AS (
                SELECT id FROM hr_public.users WHERE id = p_user_id
                UNION
                SELECT u.id FROM hr_public.users u
                JOIN direct_reports dr ON u.manager_id = dr.id
            )
            SELECT 1 FROM hr_public.document_assignments da
            JOIN direct_reports dr ON da.employee_id = dr.id
            WHERE da.document_id = p_document_id
            AND da.assignment_status = 'active'
        ) INTO has_access;
    END IF;

    RETURN has_access;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION can_access_document(UUID, UUID) TO authenticated;

-- Function to get direct reports (recursive CTE)
CREATE OR REPLACE FUNCTION get_direct_reports(p_manager_id UUID)
RETURNS TABLE(employee_id UUID) AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE direct_reports AS (
        SELECT id FROM hr_public.users WHERE id = p_manager_id
        UNION
        SELECT u.id FROM hr_public.users u
        JOIN direct_reports dr ON u.manager_id = dr.id
    )
    SELECT id FROM direct_reports WHERE id != p_manager_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_direct_reports(UUID) TO authenticated;

-- Migration complete
COMMENT ON TABLE hr_public.documents IS 'Migration 20251007_007 complete: RLS policies with 4-tier RBAC and direct report hierarchy enforcement';
