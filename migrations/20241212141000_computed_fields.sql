-- Migration: Computed Fields for Hasura
-- Created: 2024-12-12T14:10:00.000Z
-- Adds database functions for computed fields referenced in Hasura metadata

-- UP
-- Function to get user's current active roles
CREATE OR REPLACE FUNCTION get_user_current_roles(user_row users, hasura_session json)
RETURNS SETOF user_roles
LANGUAGE sql
STABLE
AS $$
    SELECT ur.*
    FROM user_roles ur
    JOIN user_role_assignments ura ON ur.id = ura.role_id
    WHERE ura.user_id = user_row.id
      AND ura.is_active = true
      AND (ura.expires_at IS NULL OR ura.expires_at > NOW())
    ORDER BY ur.level DESC;
$$;

-- Function to get department employee count
CREATE OR REPLACE FUNCTION get_department_employee_count(department_row departments)
RETURNS INTEGER
LANGUAGE sql
STABLE
AS $$
    SELECT COUNT(*)::INTEGER
    FROM job_information ji
    WHERE ji.department_id = department_row.id;
$$;

-- Function to get department active employee count
CREATE OR REPLACE FUNCTION get_department_active_employee_count(department_row departments)
RETURNS INTEGER
LANGUAGE sql
STABLE
AS $$
    SELECT COUNT(*)::INTEGER
    FROM job_information ji
    JOIN users u ON ji.employee_id = u.id
    WHERE ji.department_id = department_row.id
      AND u.is_active = true
      AND u.onboarding_status = 'Active';
$$;

-- Function to get department subdepartment count
CREATE OR REPLACE FUNCTION get_department_subdepartment_count(department_row departments)
RETURNS INTEGER
LANGUAGE sql
STABLE
AS $$
    SELECT COUNT(*)::INTEGER
    FROM departments d
    WHERE d.parent_department_id = department_row.id
      AND d.is_active = true;
$$;

-- Function to get department budget per employee
CREATE OR REPLACE FUNCTION get_department_budget_per_employee(department_row departments)
RETURNS NUMERIC(12,2)
LANGUAGE sql
STABLE
AS $$
    SELECT CASE 
        WHEN department_row.budget IS NULL THEN NULL
        WHEN get_department_active_employee_count(department_row) = 0 THEN NULL
        ELSE department_row.budget / get_department_active_employee_count(department_row)
    END;
$$;

-- Function to check if user has specific role
CREATE OR REPLACE FUNCTION current_user_has_role(role_name TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM user_roles ur
        JOIN user_role_assignments ura ON ur.id = ura.role_id
        WHERE ura.user_id = NULLIF(current_setting('hasura.user-id', true), '')::UUID
          AND ur.name = role_name
          AND ura.is_active = true
          AND (ura.expires_at IS NULL OR ura.expires_at > NOW())
    );
$$;

-- Function to check if user manages specific department
CREATE OR REPLACE FUNCTION current_user_manages_department(department_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM departments d
        WHERE d.id = department_id
          AND d.manager_id = NULLIF(current_setting('hasura.user-id', true), '')::UUID
    );
$$;

-- Function to get user's role level
CREATE OR REPLACE FUNCTION get_user_role_level(user_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
AS $$
    SELECT COALESCE(MAX(ur.level), 0)
    FROM user_roles ur
    JOIN user_role_assignments ura ON ur.id = ura.role_id
    WHERE ura.user_id = user_id
      AND ura.is_active = true
      AND (ura.expires_at IS NULL OR ura.expires_at > NOW());
$$;

-- Function to check if current user can access user data
CREATE OR REPLACE FUNCTION current_user_can_access_user(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
    DECLARE
        current_user_id UUID := NULLIF(current_setting('hasura.user-id', true), '')::UUID;
        current_user_level INTEGER;
        target_user_level INTEGER;
    BEGIN
        -- User can always access their own data
        IF current_user_id = target_user_id THEN
            RETURN true;
        END IF;

        -- Get role levels
        SELECT get_user_role_level(current_user_id) INTO current_user_level;
        SELECT get_user_role_level(target_user_id) INTO target_user_level;

        -- Higher role level can access lower role level
        IF current_user_level >= 60 AND current_user_level > target_user_level THEN
            RETURN true;
        END IF;

        -- Manager can access employees in their department
        IF current_user_has_role('Manager') THEN
            RETURN EXISTS (
                SELECT 1
                FROM job_information ji
                JOIN departments d ON ji.department_id = d.id
                WHERE ji.employee_id = target_user_id
                  AND d.manager_id = current_user_id
            );
        END IF;

        RETURN false;
    END;
$$;

-- Function for user search (full-text search optimization)
CREATE OR REPLACE FUNCTION search_users(search_term TEXT)
RETURNS SETOF users
LANGUAGE sql
STABLE
AS $$
    SELECT u.*
    FROM users u
    WHERE u.is_active = true
      AND (
          u.display_name ILIKE '%' || search_term || '%'
          OR u.email ILIKE '%' || search_term || '%'
          OR u.job_title ILIKE '%' || search_term || '%'
          OR to_tsvector('english', u.display_name || ' ' || COALESCE(u.job_title, '')) @@ plainto_tsquery('english', search_term)
      )
    ORDER BY 
        CASE WHEN u.display_name ILIKE search_term || '%' THEN 1 ELSE 2 END,
        u.display_name
    LIMIT 50;
$$;

-- Function for department search
CREATE OR REPLACE FUNCTION search_departments(search_term TEXT)
RETURNS SETOF departments
LANGUAGE sql
STABLE
AS $$
    SELECT d.*
    FROM departments d
    WHERE d.is_active = true
      AND (
          d.name ILIKE '%' || search_term || '%'
          OR d.description ILIKE '%' || search_term || '%'
          OR to_tsvector('english', d.name || ' ' || COALESCE(d.description, '')) @@ plainto_tsquery('english', search_term)
      )
    ORDER BY 
        CASE WHEN d.name ILIKE search_term || '%' THEN 1 ELSE 2 END,
        d.name
    LIMIT 20;
$$;

-- Function to get user permissions (for JWT claims)
CREATE OR REPLACE FUNCTION get_user_permissions(user_id UUID)
RETURNS TEXT[]
LANGUAGE sql
STABLE
AS $$
    SELECT ARRAY_AGG(DISTINCT permission)
    FROM (
        SELECT jsonb_array_elements_text(ur.permissions) AS permission
        FROM user_roles ur
        JOIN user_role_assignments ura ON ur.id = ura.role_id
        WHERE ura.user_id = user_id
          AND ura.is_active = true
          AND (ura.expires_at IS NULL OR ura.expires_at > NOW())
    ) permissions
    WHERE permission IS NOT NULL;
$$;

-- Function to get user allowed roles (for JWT claims)
CREATE OR REPLACE FUNCTION get_user_allowed_roles(user_id UUID)
RETURNS TEXT[]
LANGUAGE sql
STABLE
AS $$
    SELECT ARRAY_AGG(ur.name ORDER BY ur.level DESC)
    FROM user_roles ur
    JOIN user_role_assignments ura ON ur.id = ura.role_id
    WHERE ura.user_id = user_id
      AND ura.is_active = true
      AND (ura.expires_at IS NULL OR ura.expires_at > NOW());
$$;

-- Function to get user default role (highest level active role)
CREATE OR REPLACE FUNCTION get_user_default_role(user_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
    SELECT ur.name
    FROM user_roles ur
    JOIN user_role_assignments ura ON ur.id = ura.role_id
    WHERE ura.user_id = user_id
      AND ura.is_active = true
      AND (ura.expires_at IS NULL OR ura.expires_at > NOW())
    ORDER BY ur.level DESC
    LIMIT 1;
$$;

-- Performance: Add indexes for computed field functions
CREATE INDEX IF NOT EXISTS idx_user_role_assignments_computed ON user_role_assignments(user_id, is_active, expires_at);
CREATE INDEX IF NOT EXISTS idx_job_information_department_computed ON job_information(department_id);
CREATE INDEX IF NOT EXISTS idx_departments_parent_computed ON departments(parent_department_id, is_active);
CREATE INDEX IF NOT EXISTS idx_users_active_computed ON users(is_active, onboarding_status);

-- DOWN
DROP INDEX IF EXISTS idx_users_active_computed;
DROP INDEX IF EXISTS idx_departments_parent_computed;
DROP INDEX IF EXISTS idx_job_information_department_computed;
DROP INDEX IF EXISTS idx_user_role_assignments_computed;

DROP FUNCTION IF EXISTS get_user_default_role(UUID);
DROP FUNCTION IF EXISTS get_user_allowed_roles(UUID);
DROP FUNCTION IF EXISTS get_user_permissions(UUID);
DROP FUNCTION IF EXISTS search_departments(TEXT);
DROP FUNCTION IF EXISTS search_users(TEXT);
DROP FUNCTION IF EXISTS current_user_can_access_user(UUID);
DROP FUNCTION IF EXISTS get_user_role_level(UUID);
DROP FUNCTION IF EXISTS current_user_manages_department(UUID);
DROP FUNCTION IF EXISTS current_user_has_role(TEXT);
DROP FUNCTION IF EXISTS get_department_budget_per_employee(departments);
DROP FUNCTION IF EXISTS get_department_subdepartment_count(departments);
DROP FUNCTION IF EXISTS get_department_active_employee_count(departments);
DROP FUNCTION IF EXISTS get_department_employee_count(departments);
DROP FUNCTION IF EXISTS get_user_current_roles(users, json);