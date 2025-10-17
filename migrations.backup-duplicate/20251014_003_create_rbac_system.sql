-- Create complete RBAC (Role-Based Access Control) system to match Rust GraphQL server expectations
-- This migration adds the missing tables and columns for proper RBAC functionality

-- Create roles table
CREATE TABLE IF NOT EXISTS hr_public.roles (
    id uuid DEFAULT uuid_generate_v4() NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    level integer NOT NULL DEFAULT 1,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT roles_pkey PRIMARY KEY (id),
    CONSTRAINT roles_name_key UNIQUE (name),
    CONSTRAINT roles_level_positive CHECK ((level > 0))
);

-- Create permissions table
CREATE TABLE IF NOT EXISTS hr_public.permissions (
    id uuid DEFAULT uuid_generate_v4() NOT NULL,
    resource character varying(255) NOT NULL,
    action character varying(255) NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT permissions_pkey PRIMARY KEY (id),
    CONSTRAINT permissions_resource_action_unique UNIQUE (resource, action)
);

-- Create role_permissions junction table
CREATE TABLE IF NOT EXISTS hr_public.role_permissions (
    id uuid DEFAULT uuid_generate_v4() NOT NULL,
    role_id uuid NOT NULL,
    permission_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT role_permissions_pkey PRIMARY KEY (id),
    CONSTRAINT role_permissions_role_permission_unique UNIQUE (role_id, permission_id)
);

-- Add deleted_at column to user_role_assignments
ALTER TABLE hr_public.user_role_assignments
ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;

-- Add role_id column to user_role_assignments (will be populated from migration)
ALTER TABLE hr_public.user_role_assignments
ADD COLUMN IF NOT EXISTS role_id uuid;

-- Insert standard roles
INSERT INTO hr_public.roles (name, description, level) VALUES
('super_admin', 'Super Administrator with full system access', 200),
('admin', 'Administrator with elevated privileges', 100),
('hr_manager', 'HR Manager with HR-specific access', 80),
('manager', 'Department Manager', 60),
('employee', 'Standard Employee', 20)
ON CONFLICT (name) DO NOTHING;

-- Insert standard permissions
INSERT INTO hr_public.permissions (resource, action, description) VALUES
-- User management
('users', 'read', 'View user information'),
('users', 'write', 'Create and modify users'),
('users', 'delete', 'Delete users'),

-- Role management
('roles', 'read', 'View roles'),
('roles', 'write', 'Create and modify roles'),
('roles', 'delete', 'Delete roles'),

-- Department management
('departments', 'read', 'View departments'),
('departments', 'write', 'Create and modify departments'),
('departments', 'delete', 'Delete departments'),

-- Leave management
('leave_requests', 'read', 'View leave requests'),
('leave_requests', 'write', 'Create and modify leave requests'),
('leave_requests', 'approve', 'Approve leave requests'),

-- Performance reviews
('performance_reviews', 'read', 'View performance reviews'),
('performance_reviews', 'write', 'Create and modify performance reviews'),

-- Reports
('reports', 'hr', 'Access HR reports'),
('reports', 'team', 'Access team reports'),

-- Compliance
('compliance', '*', 'Full compliance access'),

-- Payroll
('payroll', '*', 'Full payroll access'),

-- Profile (own data)
('profile', 'read', 'View own profile'),
('profile', 'write', 'Modify own profile'),

-- Timesheets
('timesheet', '*', 'Full timesheet access'),

-- Calendar
('calendar', 'read', 'View calendar events'),
('calendar', 'write', 'Create and modify calendar events'),

-- Documents
('documents', 'own', 'Access own documents'),
('documents', '*', 'Full document access'),

-- Wildcard permissions
('*', '*', 'Full system access')
ON CONFLICT (resource, action) DO NOTHING;

-- Assign permissions to roles
INSERT INTO hr_public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM hr_public.roles r
CROSS JOIN hr_public.permissions p
WHERE
    -- Super admin gets everything
    (r.name = 'super_admin')
    -- Admin gets most permissions except some restricted ones
    OR (r.name = 'admin' AND p.resource NOT IN ('compliance', 'payroll'))
    -- HR Manager gets HR-related permissions
    OR (r.name = 'hr_manager' AND p.resource IN ('users', 'departments', 'leave_requests', 'performance_reviews', 'reports', 'documents', 'calendar', 'profile', 'timesheet'))
    -- Manager gets team management permissions
    OR (r.name = 'manager' AND p.resource IN ('leave_requests', 'performance_reviews', 'reports', 'calendar', 'profile', 'timesheet') AND p.action IN ('read', 'write'))
    -- Employee gets basic permissions
    OR (r.name = 'employee' AND p.resource IN ('profile', 'timesheet', 'calendar') AND p.action IN ('read', 'write'))
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Migrate existing user_role_assignments data
-- Map role_name strings to role_id UUIDs
UPDATE hr_public.user_role_assignments
SET role_id = r.id
FROM hr_public.roles r
WHERE hr_public.user_role_assignments.role_name = r.name
AND hr_public.user_role_assignments.role_id IS NULL;

-- Add foreign key constraints
ALTER TABLE hr_public.role_permissions
ADD CONSTRAINT role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES hr_public.roles(id) ON DELETE CASCADE,
ADD CONSTRAINT role_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES hr_public.permissions(id) ON DELETE CASCADE;

ALTER TABLE hr_public.user_role_assignments
ADD CONSTRAINT user_role_assignments_role_id_fkey FOREIGN KEY (role_id) REFERENCES hr_public.roles(id) ON DELETE CASCADE;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_roles_deleted_at ON hr_public.roles(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_permissions_deleted_at ON hr_public.permissions(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON hr_public.role_permissions(role_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON hr_public.role_permissions(permission_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_role_permissions_deleted_at ON hr_public.role_permissions(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_user_role_assignments_role_id ON hr_public.user_role_assignments(role_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_user_role_assignments_deleted_at ON hr_public.user_role_assignments(deleted_at) WHERE deleted_at IS NULL;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON hr_public.roles TO employee, manager, admin, super_admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON hr_public.permissions TO admin, super_admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON hr_public.role_permissions TO admin, super_admin;

-- Add comments
COMMENT ON TABLE hr_public.roles IS 'RBAC roles with hierarchical levels';
COMMENT ON TABLE hr_public.permissions IS 'Granular permissions for resources and actions';
COMMENT ON TABLE hr_public.role_permissions IS 'Junction table linking roles to permissions';
COMMENT ON COLUMN hr_public.user_role_assignments.role_id IS 'Foreign key to roles table (migrated from role_name)';
COMMENT ON COLUMN hr_public.user_role_assignments.deleted_at IS 'Soft delete timestamp';