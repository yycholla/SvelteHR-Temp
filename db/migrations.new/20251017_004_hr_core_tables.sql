-- Migration: HR Core Tables
-- Created: 2025-10-17
-- Description: Departments, leave_types, time_off_policies

BEGIN;

-- ============================================================================
-- DEPARTMENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS hr_public.departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    parent_department_id UUID REFERENCES hr_public.departments(id) ON DELETE SET NULL,
    manager_id UUID REFERENCES hr_public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,

    CONSTRAINT departments_name_not_empty CHECK (LENGTH(TRIM(name)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_departments_name ON hr_public.departments(name) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_departments_parent ON hr_public.departments(parent_department_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_departments_manager ON hr_public.departments(manager_id) WHERE deleted_at IS NULL;

COMMENT ON TABLE hr_public.departments IS 'Organizational departments with hierarchical relationships';
COMMENT ON COLUMN hr_public.departments.parent_department_id IS 'Self-referential foreign key for department hierarchy';

-- Add foreign key from users to departments (circular dependency resolved)
ALTER TABLE hr_public.users
ADD CONSTRAINT users_department_fkey
FOREIGN KEY (department_id) REFERENCES hr_public.departments(id) ON DELETE SET NULL;

-- ============================================================================
-- LEAVE_TYPES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS hr_public.leave_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    days_per_year INTEGER NOT NULL DEFAULT 0,
    requires_approval BOOLEAN NOT NULL DEFAULT TRUE,
    is_paid BOOLEAN NOT NULL DEFAULT TRUE,
    max_consecutive_days INTEGER,
    min_notice_days INTEGER DEFAULT 0,
    carryover_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    max_carryover_days INTEGER,
    accrual_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT leave_types_days_non_negative CHECK (days_per_year >= 0),
    CONSTRAINT leave_types_min_notice_non_negative CHECK (min_notice_days >= 0),
    CONSTRAINT leave_types_max_carryover_valid CHECK (max_carryover_days IS NULL OR max_carryover_days >= 0),
    CONSTRAINT leave_types_max_consecutive_valid CHECK (max_consecutive_days IS NULL OR max_consecutive_days > 0),
    CONSTRAINT leave_types_carryover_requires_max CHECK (
        NOT carryover_enabled OR max_carryover_days IS NOT NULL
    )
);

CREATE INDEX IF NOT EXISTS idx_leave_types_name ON hr_public.leave_types(name);

COMMENT ON TABLE hr_public.leave_types IS 'Leave type definitions (annual, sick, personal, etc.) with accrual and carryover rules';
COMMENT ON COLUMN hr_public.leave_types.days_per_year IS 'Annual leave allocation in days';
COMMENT ON COLUMN hr_public.leave_types.carryover_enabled IS 'Whether unused days can carry over to next year';
COMMENT ON COLUMN hr_public.leave_types.accrual_enabled IS 'Whether leave accrues monthly or is granted upfront';

-- ============================================================================
-- TIME_OFF_POLICIES TABLE (Renamed from time_off_balances schema)
-- ============================================================================
CREATE TABLE IF NOT EXISTS hr_public.time_off_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    days_per_year INTEGER NOT NULL,
    requires_approval BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT time_off_policies_days_positive CHECK (days_per_year > 0),
    CONSTRAINT time_off_policies_name_not_empty CHECK (LENGTH(TRIM(name)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_time_off_policies_name ON hr_public.time_off_policies(name);

COMMENT ON TABLE hr_public.time_off_policies IS 'Time-off policy definitions with approval requirements';

-- ============================================================================
-- TIME_OFF_BALANCES TABLE (Employee balances per policy per year)
-- ============================================================================
CREATE TABLE IF NOT EXISTS hr_public.time_off_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES hr_public.users(id) ON DELETE CASCADE,
    leave_type_id UUID NOT NULL REFERENCES hr_public.leave_types(id) ON DELETE CASCADE,
    policy_id UUID REFERENCES hr_public.time_off_policies(id) ON DELETE SET NULL,
    year INTEGER NOT NULL,
    allocated_days DECIMAL(5,2) NOT NULL DEFAULT 0.0,
    used_days DECIMAL(5,2) NOT NULL DEFAULT 0.0,
    pending_days DECIMAL(5,2) NOT NULL DEFAULT 0.0,
    carried_over_days DECIMAL(5,2) NOT NULL DEFAULT 0.0,
    balance_days DECIMAL(5,2) GENERATED ALWAYS AS (allocated_days + carried_over_days - used_days - pending_days) STORED,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT time_off_balances_user_leave_year_unique UNIQUE (user_id, leave_type_id, year),
    CONSTRAINT time_off_balances_year_valid CHECK (year >= 2020 AND year <= 2100),
    CONSTRAINT time_off_balances_allocated_non_negative CHECK (allocated_days >= 0),
    CONSTRAINT time_off_balances_used_non_negative CHECK (used_days >= 0),
    CONSTRAINT time_off_balances_pending_non_negative CHECK (pending_days >= 0),
    CONSTRAINT time_off_balances_carried_over_non_negative CHECK (carried_over_days >= 0)
);

CREATE INDEX IF NOT EXISTS idx_time_off_balances_user ON hr_public.time_off_balances(user_id);
CREATE INDEX IF NOT EXISTS idx_time_off_balances_leave_type ON hr_public.time_off_balances(leave_type_id);
CREATE INDEX IF NOT EXISTS idx_time_off_balances_policy ON hr_public.time_off_balances(policy_id);
CREATE INDEX IF NOT EXISTS idx_time_off_balances_year ON hr_public.time_off_balances(year);
CREATE INDEX IF NOT EXISTS idx_time_off_balances_user_year ON hr_public.time_off_balances(user_id, year);

COMMENT ON TABLE hr_public.time_off_balances IS 'Employee time-off balances per leave type per year';
COMMENT ON COLUMN hr_public.time_off_balances.balance_days IS 'Computed: allocated + carried_over - used - pending';

-- ============================================================================
-- LEAVE_REQUESTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS hr_public.leave_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES hr_public.users(id) ON DELETE CASCADE,
    leave_type_id UUID NOT NULL REFERENCES hr_public.leave_types(id) ON DELETE RESTRICT,
    manager_id UUID REFERENCES hr_public.users(id) ON DELETE SET NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days_requested DECIMAL(5,2) NOT NULL,
    status hr_public.leave_status NOT NULL DEFAULT 'pending',
    reason TEXT,
    manager_comments TEXT,
    approved_at TIMESTAMPTZ,
    rejected_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,

    CONSTRAINT leave_requests_dates_valid CHECK (end_date >= start_date),
    CONSTRAINT leave_requests_days_positive CHECK (days_requested > 0),
    CONSTRAINT leave_requests_no_self_approval CHECK (user_id != manager_id)
);

CREATE INDEX IF NOT EXISTS idx_leave_requests_user ON hr_public.leave_requests(user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_leave_requests_manager ON hr_public.leave_requests(manager_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_leave_requests_leave_type ON hr_public.leave_requests(leave_type_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON hr_public.leave_requests(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_leave_requests_dates ON hr_public.leave_requests(start_date, end_date) WHERE deleted_at IS NULL;

COMMENT ON TABLE hr_public.leave_requests IS 'Employee leave requests with approval workflow';
COMMENT ON COLUMN hr_public.leave_requests.days_requested IS 'Number of leave days requested (can be fractional for half-days)';

COMMIT;
