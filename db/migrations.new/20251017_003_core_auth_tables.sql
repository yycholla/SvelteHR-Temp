-- Migration: Core Authentication and RBAC Tables
-- Created: 2025-10-17
-- Description: Users, roles, permissions, role_permissions, user_role_assignments, sessions, user_sessions

BEGIN;

-- ============================================================================
-- USERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS hr_public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    display_name VARCHAR(255) GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED,
    full_name VARCHAR(255) GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED,
    role VARCHAR(50) NOT NULL DEFAULT 'hr_employee',
    phone_number VARCHAR(50),
    alternate_phone VARCHAR(50),
    job_title VARCHAR(255),
    status VARCHAR(50),
    department_id UUID,
    manager_id UUID REFERENCES hr_public.users(id) ON DELETE SET NULL,
    hire_date TIMESTAMPTZ,
    termination_date TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    failed_login_attempts INTEGER NOT NULL DEFAULT 0,
    locked_until TIMESTAMPTZ,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,

    CONSTRAINT users_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT users_names_not_empty CHECK (LENGTH(TRIM(first_name)) > 0 AND LENGTH(TRIM(last_name)) > 0),
    CONSTRAINT users_failed_attempts_non_negative CHECK (failed_login_attempts >= 0)
);

CREATE INDEX IF NOT EXISTS idx_users_email ON hr_public.users(email) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_department ON hr_public.users(department_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_manager ON hr_public.users(manager_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_is_active ON hr_public.users(is_active) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_status ON hr_public.users(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_hire_date ON hr_public.users(hire_date) WHERE deleted_at IS NULL;

COMMENT ON TABLE hr_public.users IS 'HR system users with RBAC, soft delete, and relationship loading';
COMMENT ON COLUMN hr_public.users.display_name IS 'Computed column: first_name + last_name';
COMMENT ON COLUMN hr_public.users.full_name IS 'Computed column: first_name + last_name';
COMMENT ON COLUMN hr_public.users.manager_id IS 'Self-referential foreign key to users table';
COMMENT ON COLUMN hr_public.users.deleted_at IS 'Soft delete timestamp (NULL = active)';

-- ============================================================================
-- ROLES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS hr_public.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    level INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,

    CONSTRAINT roles_level_non_negative CHECK (level >= 0),
    CONSTRAINT roles_name_not_empty CHECK (LENGTH(TRIM(name)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_roles_name ON hr_public.roles(name) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_roles_level ON hr_public.roles(level) WHERE deleted_at IS NULL;

COMMENT ON TABLE hr_public.roles IS 'RBAC roles with hierarchical levels (higher level = more privileges)';
COMMENT ON COLUMN hr_public.roles.level IS 'Hierarchy level: Admin=100, HR_Manager=75, Manager=50, Employee=25';

-- ============================================================================
-- PERMISSIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS hr_public.permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,

    CONSTRAINT permissions_resource_action_unique UNIQUE (resource, action),
    CONSTRAINT permissions_resource_not_empty CHECK (LENGTH(TRIM(resource)) > 0),
    CONSTRAINT permissions_action_not_empty CHECK (LENGTH(TRIM(action)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_permissions_resource ON hr_public.permissions(resource) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_permissions_action ON hr_public.permissions(action) WHERE deleted_at IS NULL;

COMMENT ON TABLE hr_public.permissions IS 'RBAC permissions for resource-based access control';
COMMENT ON COLUMN hr_public.permissions.resource IS 'Resource name (e.g., employees, departments, documents)';
COMMENT ON COLUMN hr_public.permissions.action IS 'Action allowed (e.g., read, write, delete, *)';

-- ============================================================================
-- ROLE_PERMISSIONS JUNCTION TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS hr_public.role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID NOT NULL REFERENCES hr_public.roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES hr_public.permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,

    CONSTRAINT role_permissions_unique UNIQUE (role_id, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON hr_public.role_permissions(role_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON hr_public.role_permissions(permission_id) WHERE deleted_at IS NULL;

COMMENT ON TABLE hr_public.role_permissions IS 'Junction table linking roles to permissions (many-to-many)';

-- ============================================================================
-- USER_ROLE_ASSIGNMENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS hr_public.user_role_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES hr_public.users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES hr_public.roles(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES hr_public.users(id) ON DELETE SET NULL,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,

    CONSTRAINT user_role_assignments_unique UNIQUE (user_id, role_id)
);

CREATE INDEX IF NOT EXISTS idx_user_role_assignments_user ON hr_public.user_role_assignments(user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_user_role_assignments_role ON hr_public.user_role_assignments(role_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_user_role_assignments_assigned_by ON hr_public.user_role_assignments(assigned_by) WHERE deleted_at IS NULL;

COMMENT ON TABLE hr_public.user_role_assignments IS 'Junction table assigning roles to users (many-to-many with audit trail)';

-- ============================================================================
-- SESSIONS TABLE (for tower-sessions)
-- ============================================================================
CREATE TABLE IF NOT EXISTS hr_public.sessions (
    id TEXT PRIMARY KEY,
    data BYTEA NOT NULL,
    expiry_date TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON hr_public.sessions(expiry_date);

COMMENT ON TABLE hr_public.sessions IS 'Session storage for tower-sessions (axum session middleware)';
COMMENT ON COLUMN hr_public.sessions.data IS 'Binary-encoded session data';

-- ============================================================================
-- USER_SESSIONS TABLE (for axum-login)
-- ============================================================================
CREATE TABLE IF NOT EXISTS hr_public.user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES hr_public.users(id) ON DELETE CASCADE,
    session_token VARCHAR(500) NOT NULL UNIQUE,
    ip_address VARCHAR(100),
    user_agent TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    last_activity TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT user_sessions_expires_after_creation CHECK (expires_at > created_at)
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON hr_public.user_sessions(user_id) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON hr_public.user_sessions(session_token) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON hr_public.user_sessions(expires_at) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON hr_public.user_sessions(is_active, last_activity DESC);

COMMENT ON TABLE hr_public.user_sessions IS 'User session tracking for axum-login authentication';
COMMENT ON COLUMN hr_public.user_sessions.session_token IS 'Unique session token for Bearer authentication';

COMMIT;
