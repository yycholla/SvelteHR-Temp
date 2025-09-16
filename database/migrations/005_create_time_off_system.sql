-- Migration: Create Time-Off Management System
-- Created: 2025-09-15
-- Description: Comprehensive time-off management with policies, requests, and balances

-- Create ENUM types for time-off system
CREATE TYPE hr_public.time_off_type AS ENUM (
    'VACATION',
    'SICK_LEAVE', 
    'PERSONAL_TIME',
    'BEREAVEMENT',
    'JURY_DUTY',
    'MATERNITY_PATERNITY',
    'UNPAID_LEAVE',
    'COMP_TIME',
    'HOLIDAY'
);

CREATE TYPE hr_public.request_status AS ENUM (
    'PENDING',
    'APPROVED', 
    'REJECTED',
    'CANCELLED',
    'IN_REVIEW'
);

CREATE TYPE hr_public.accrual_frequency AS ENUM (
    'MONTHLY',
    'BIWEEKLY', 
    'QUARTERLY',
    'ANNUALLY',
    'PER_PAY_PERIOD'
);

-- Time-off policies table
CREATE TABLE hr_public.time_off_policies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    policy_name VARCHAR(255) NOT NULL,
    time_off_type hr_public.time_off_type NOT NULL,
    description TEXT,
    
    -- Accrual settings
    accrual_frequency hr_public.accrual_frequency DEFAULT 'MONTHLY',
    accrual_rate DECIMAL(5,2) NOT NULL DEFAULT 0, -- hours per period
    max_accrual DECIMAL(6,2) DEFAULT 240, -- max hours that can be accrued
    max_carry_forward DECIMAL(6,2) DEFAULT 40, -- max hours carried to next year
    
    -- Usage settings
    min_increment DECIMAL(4,2) DEFAULT 0.5, -- minimum request increment (0.5 = 30min)
    max_consecutive_days INTEGER DEFAULT 30,
    advance_notice_days INTEGER DEFAULT 1,
    requires_approval BOOLEAN DEFAULT true,
    
    -- Eligibility
    eligibility_months INTEGER DEFAULT 0, -- months of employment required
    applies_to_roles TEXT[], -- array of role names, null = all roles
    
    -- System settings
    is_active BOOLEAN DEFAULT true,
    effective_date DATE DEFAULT CURRENT_DATE,
    created_by UUID REFERENCES hr_public.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT time_off_policy_accrual_positive CHECK (accrual_rate >= 0),
    CONSTRAINT time_off_policy_max_accrual_positive CHECK (max_accrual >= 0),
    CONSTRAINT time_off_policy_carry_forward_reasonable CHECK (max_carry_forward <= max_accrual),
    CONSTRAINT time_off_policy_min_increment_reasonable CHECK (min_increment > 0 AND min_increment <= 24),
    CONSTRAINT time_off_policy_advance_notice_reasonable CHECK (advance_notice_days >= 0 AND advance_notice_days <= 365),
    CONSTRAINT time_off_policy_eligibility_reasonable CHECK (eligibility_months >= 0 AND eligibility_months <= 120)
);

-- Time-off balances table (current balances for each employee)
CREATE TABLE hr_public.time_off_balances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES hr_public.users(id) ON DELETE CASCADE,
    policy_id UUID NOT NULL REFERENCES hr_public.time_off_policies(id),
    
    -- Balance information
    current_balance DECIMAL(6,2) NOT NULL DEFAULT 0,
    pending_balance DECIMAL(6,2) NOT NULL DEFAULT 0, -- balance minus pending requests
    used_this_year DECIMAL(6,2) NOT NULL DEFAULT 0,
    carry_forward_balance DECIMAL(6,2) NOT NULL DEFAULT 0,
    
    -- Tracking
    last_accrual_date DATE,
    year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
    
    -- System fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(user_id, policy_id, year),
    CONSTRAINT time_off_balance_amounts_non_negative CHECK (
        current_balance >= 0 AND 
        pending_balance >= 0 AND 
        used_this_year >= 0 AND 
        carry_forward_balance >= 0
    ),
    CONSTRAINT time_off_balance_pending_logical CHECK (pending_balance <= current_balance)
);

-- Time-off requests table
CREATE TABLE hr_public.time_off_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES hr_public.users(id) ON DELETE CASCADE,
    policy_id UUID NOT NULL REFERENCES hr_public.time_off_policies(id),
    
    -- Request details
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    hours_requested DECIMAL(5,2) NOT NULL,
    reason TEXT,
    notes TEXT,
    
    -- Status and workflow
    status hr_public.request_status DEFAULT 'PENDING',
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Approval workflow
    reviewed_by UUID REFERENCES hr_public.users(id),
    reviewed_at TIMESTAMPTZ,
    reviewer_notes TEXT,
    approval_level INTEGER DEFAULT 1, -- support multi-level approval
    
    -- System fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT time_off_request_dates_valid CHECK (start_date <= end_date),
    CONSTRAINT time_off_request_hours_positive CHECK (hours_requested > 0),
    CONSTRAINT time_off_request_hours_reasonable CHECK (hours_requested <= 2000), -- ~1 year max
    CONSTRAINT time_off_request_approval_logic CHECK (
        (status IN ('APPROVED', 'REJECTED') AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL) OR
        (status IN ('PENDING', 'CANCELLED', 'IN_REVIEW'))
    ),
    CONSTRAINT time_off_request_future_dates CHECK (start_date >= CURRENT_DATE - INTERVAL '1 year'),
    CONSTRAINT time_off_request_no_self_approval CHECK (user_id != reviewed_by)
);

-- Time-off accrual history (for audit trail)
CREATE TABLE hr_hidden.time_off_accruals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    balance_id UUID NOT NULL REFERENCES hr_public.time_off_balances(id) ON DELETE CASCADE,
    
    -- Accrual details
    accrual_date DATE NOT NULL,
    hours_accrued DECIMAL(5,2) NOT NULL,
    accrual_reason VARCHAR(100) NOT NULL, -- 'monthly_accrual', 'adjustment', 'carry_forward', etc.
    
    -- Balance snapshots
    balance_before DECIMAL(6,2) NOT NULL,
    balance_after DECIMAL(6,2) NOT NULL,
    
    -- Metadata
    created_by UUID REFERENCES hr_public.users(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT time_off_accrual_balance_logic CHECK (balance_after = balance_before + hours_accrued)
);

-- Insert default time-off policies
INSERT INTO hr_public.time_off_policies (
    policy_name, 
    time_off_type, 
    description,
    accrual_frequency,
    accrual_rate,
    max_accrual,
    max_carry_forward,
    advance_notice_days,
    eligibility_months
) VALUES 
    ('Standard Vacation', 'VACATION', 'Standard vacation policy for full-time employees', 'MONTHLY', 13.33, 160, 40, 14, 3),
    ('Sick Leave', 'SICK_LEAVE', 'Paid sick leave for illness and medical appointments', 'MONTHLY', 6.67, 80, 24, 0, 0),
    ('Personal Time', 'PERSONAL_TIME', 'Personal time for errands and appointments', 'QUARTERLY', 8, 32, 8, 1, 6),
    ('Bereavement Leave', 'BEREAVEMENT', 'Time off for death of family member', 'ANNUALLY', 24, 24, 0, 0, 0),
    ('Jury Duty', 'JURY_DUTY', 'Time off for civic jury duty', 'ANNUALLY', 40, 40, 0, 0, 0);

-- Create indexes for performance
CREATE INDEX idx_time_off_balances_user_year ON hr_public.time_off_balances(user_id, year);
CREATE INDEX idx_time_off_balances_policy ON hr_public.time_off_balances(policy_id);
CREATE INDEX idx_time_off_requests_user_status ON hr_public.time_off_requests(user_id, status);
CREATE INDEX idx_time_off_requests_dates ON hr_public.time_off_requests(start_date, end_date);
CREATE INDEX idx_time_off_requests_reviewer ON hr_public.time_off_requests(reviewed_by, status) WHERE reviewed_by IS NOT NULL;
CREATE INDEX idx_time_off_requests_submitted ON hr_public.time_off_requests(submitted_at DESC);
CREATE INDEX idx_time_off_policies_type_active ON hr_public.time_off_policies(time_off_type, is_active) WHERE is_active = true;
CREATE INDEX idx_time_off_accruals_balance_date ON hr_hidden.time_off_accruals(balance_id, accrual_date);

-- Add PostGraphile comments
COMMENT ON TABLE hr_public.time_off_policies IS '@name TimeOffPolicy
Time-off policies defining accrual rates and usage rules';

COMMENT ON TABLE hr_public.time_off_balances IS '@name TimeOffBalance  
Current time-off balances for employees by policy and year';

COMMENT ON TABLE hr_public.time_off_requests IS '@name TimeOffRequest
Employee time-off requests with approval workflow';

COMMENT ON COLUMN hr_public.time_off_requests.hours_requested IS 
'Hours requested for time off (8 hours = 1 day typically)';

COMMENT ON COLUMN hr_public.time_off_balances.pending_balance IS
'Available balance minus pending requests';

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON hr_public.time_off_policies TO postgraphile_user;
GRANT SELECT, INSERT, UPDATE ON hr_public.time_off_balances TO postgraphile_user; 
GRANT SELECT, INSERT, UPDATE, DELETE ON hr_public.time_off_requests TO postgraphile_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA hr_public TO postgraphile_user;