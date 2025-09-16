-- Migration: Create Payroll & Compensation Management System
-- Created: 2025-09-15
-- Description: Comprehensive payroll and compensation tracking with audit trails

-- Create ENUM types for compensation system
CREATE TYPE hr_public.pay_frequency AS ENUM (
    'WEEKLY',
    'BI_WEEKLY', 
    'SEMI_MONTHLY',
    'MONTHLY',
    'QUARTERLY',
    'ANNUALLY'
);

CREATE TYPE hr_public.employment_status AS ENUM (
    'FULL_TIME',
    'PART_TIME',
    'CONTRACT',
    'INTERN',
    'TEMPORARY',
    'CONSULTANT'
);

CREATE TYPE hr_public.compensation_type AS ENUM (
    'BASE_SALARY',
    'HOURLY_WAGE',
    'COMMISSION',
    'BONUS',
    'OVERTIME',
    'STOCK_OPTIONS',
    'BENEFITS',
    'REIMBURSEMENT'
);

CREATE TYPE hr_public.payroll_status AS ENUM (
    'DRAFT',
    'PROCESSING',
    'APPROVED',
    'PAID',
    'CANCELLED',
    'ERROR'
);

-- Employee compensation table (highly sensitive)
CREATE TABLE hr_private.employee_compensation (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Employee details
    employee_id UUID NOT NULL REFERENCES hr_public.users(id) ON DELETE CASCADE,
    employment_status hr_public.employment_status DEFAULT 'FULL_TIME',
    
    -- Base compensation
    base_amount DECIMAL(12,2) NOT NULL,
    compensation_type hr_public.compensation_type DEFAULT 'BASE_SALARY',
    currency VARCHAR(3) DEFAULT 'USD',
    pay_frequency hr_public.pay_frequency DEFAULT 'BI_WEEKLY',
    
    -- Additional compensation
    overtime_eligible BOOLEAN DEFAULT true,
    overtime_rate_multiplier DECIMAL(3,2) DEFAULT 1.5,
    commission_rate DECIMAL(5,4) DEFAULT 0,
    
    -- Benefits and deductions
    health_insurance_eligible BOOLEAN DEFAULT true,
    retirement_plan_eligible BOOLEAN DEFAULT true,
    retirement_match_rate DECIMAL(5,4) DEFAULT 0.04, -- 4% match
    
    -- Validity period
    effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE,
    
    -- Approval and audit
    approved_by UUID NOT NULL REFERENCES hr_public.users(id),
    approved_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- System fields
    created_by UUID NOT NULL REFERENCES hr_public.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT compensation_amount_positive CHECK (base_amount > 0),
    CONSTRAINT compensation_currency_valid CHECK (currency ~* '^[A-Z]{3}$'),
    CONSTRAINT compensation_dates_valid CHECK (end_date IS NULL OR end_date >= effective_date),
    CONSTRAINT compensation_overtime_rate_valid CHECK (overtime_rate_multiplier >= 1.0 AND overtime_rate_multiplier <= 3.0),
    CONSTRAINT compensation_commission_rate_valid CHECK (commission_rate >= 0 AND commission_rate <= 1),
    CONSTRAINT compensation_retirement_match_valid CHECK (retirement_match_rate >= 0 AND retirement_match_rate <= 0.15),
    CONSTRAINT compensation_salary_reasonable CHECK (
        (compensation_type = 'BASE_SALARY' AND base_amount BETWEEN 20000 AND 10000000) OR
        (compensation_type = 'HOURLY_WAGE' AND base_amount BETWEEN 7.25 AND 500) OR
        (compensation_type IN ('COMMISSION', 'BONUS') AND base_amount >= 0)
    )
);

-- Payroll periods table
CREATE TABLE hr_public.payroll_periods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Period details
    period_name VARCHAR(100) NOT NULL, -- "2025-P01", "January 2025", etc.
    pay_frequency hr_public.pay_frequency NOT NULL,
    
    -- Period dates
    period_start_date DATE NOT NULL,
    period_end_date DATE NOT NULL,
    pay_date DATE NOT NULL,
    
    -- Status and processing
    status hr_public.payroll_status DEFAULT 'DRAFT',
    total_gross_amount DECIMAL(15,2) DEFAULT 0,
    total_net_amount DECIMAL(15,2) DEFAULT 0,
    total_tax_amount DECIMAL(15,2) DEFAULT 0,
    employee_count INTEGER DEFAULT 0,
    
    -- Processing details
    processed_by UUID REFERENCES hr_public.users(id),
    processed_at TIMESTAMPTZ,
    approved_by UUID REFERENCES hr_public.users(id),
    approved_at TIMESTAMPTZ,
    
    -- System fields
    created_by UUID NOT NULL REFERENCES hr_public.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT payroll_period_dates_valid CHECK (period_start_date <= period_end_date AND period_end_date <= pay_date),
    CONSTRAINT payroll_period_amounts_valid CHECK (
        total_gross_amount >= 0 AND 
        total_net_amount >= 0 AND 
        total_tax_amount >= 0 AND
        total_net_amount <= total_gross_amount
    ),
    CONSTRAINT payroll_period_approval_logic CHECK (
        (status = 'APPROVED' AND approved_by IS NOT NULL AND approved_at IS NOT NULL) OR
        (status != 'APPROVED')
    )
);

-- Individual payroll entries
CREATE TABLE hr_private.payroll_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Links
    payroll_period_id UUID NOT NULL REFERENCES hr_public.payroll_periods(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES hr_public.users(id) ON DELETE CASCADE,
    compensation_id UUID NOT NULL REFERENCES hr_private.employee_compensation(id),
    
    -- Earnings breakdown
    regular_hours DECIMAL(6,2) DEFAULT 0,
    overtime_hours DECIMAL(6,2) DEFAULT 0,
    regular_pay DECIMAL(10,2) DEFAULT 0,
    overtime_pay DECIMAL(10,2) DEFAULT 0,
    commission_pay DECIMAL(10,2) DEFAULT 0,
    bonus_pay DECIMAL(10,2) DEFAULT 0,
    other_pay DECIMAL(10,2) DEFAULT 0,
    
    -- Totals
    gross_pay DECIMAL(12,2) NOT NULL,
    
    -- Deductions
    federal_tax DECIMAL(10,2) DEFAULT 0,
    state_tax DECIMAL(10,2) DEFAULT 0,
    social_security_tax DECIMAL(10,2) DEFAULT 0,
    medicare_tax DECIMAL(10,2) DEFAULT 0,
    health_insurance DECIMAL(10,2) DEFAULT 0,
    retirement_contribution DECIMAL(10,2) DEFAULT 0,
    other_deductions DECIMAL(10,2) DEFAULT 0,
    
    -- Final amounts
    total_deductions DECIMAL(12,2) NOT NULL,
    net_pay DECIMAL(12,2) NOT NULL,
    
    -- YTD tracking
    ytd_gross_pay DECIMAL(15,2) DEFAULT 0,
    ytd_taxes DECIMAL(15,2) DEFAULT 0,
    ytd_deductions DECIMAL(15,2) DEFAULT 0,
    ytd_net_pay DECIMAL(15,2) DEFAULT 0,
    
    -- System fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(payroll_period_id, employee_id),
    CONSTRAINT payroll_entry_hours_valid CHECK (regular_hours >= 0 AND overtime_hours >= 0),
    CONSTRAINT payroll_entry_amounts_valid CHECK (
        regular_pay >= 0 AND overtime_pay >= 0 AND commission_pay >= 0 AND 
        bonus_pay >= 0 AND other_pay >= 0 AND gross_pay >= 0 AND
        federal_tax >= 0 AND state_tax >= 0 AND social_security_tax >= 0 AND
        medicare_tax >= 0 AND health_insurance >= 0 AND retirement_contribution >= 0 AND
        other_deductions >= 0 AND total_deductions >= 0 AND net_pay >= 0
    ),
    CONSTRAINT payroll_entry_calculation_logic CHECK (
        gross_pay = regular_pay + overtime_pay + commission_pay + bonus_pay + other_pay AND
        total_deductions = federal_tax + state_tax + social_security_tax + medicare_tax + 
                          health_insurance + retirement_contribution + other_deductions AND
        net_pay = gross_pay - total_deductions
    )
);

-- Compensation history/audit table
CREATE TABLE hr_hidden.compensation_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Reference to compensation record
    compensation_id UUID NOT NULL REFERENCES hr_private.employee_compensation(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES hr_public.users(id),
    
    -- Change details
    change_type VARCHAR(50) NOT NULL, -- 'CREATED', 'UPDATED', 'TERMINATED', 'PROMOTION', 'ADJUSTMENT'
    change_reason TEXT,
    
    -- Previous and new values (for audit trail)
    previous_values JSONB,
    new_values JSONB,
    changed_fields TEXT[],
    
    -- Amounts (for easy reporting)
    previous_amount DECIMAL(12,2),
    new_amount DECIMAL(12,2),
    percentage_change DECIMAL(5,2),
    
    -- Approval and timing
    effective_date DATE NOT NULL,
    approved_by UUID NOT NULL REFERENCES hr_public.users(id),
    
    -- System fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT compensation_history_change_type_valid CHECK (
        change_type IN ('CREATED', 'UPDATED', 'TERMINATED', 'PROMOTION', 'ADJUSTMENT', 'ANNUAL_REVIEW')
    )
);

-- Tax configuration table (for payroll calculations)
CREATE TABLE hr_hidden.tax_configuration (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Tax details
    tax_name VARCHAR(100) NOT NULL,
    tax_type VARCHAR(50) NOT NULL, -- 'FEDERAL', 'STATE', 'LOCAL', 'SOCIAL_SECURITY', 'MEDICARE'
    jurisdiction VARCHAR(100), -- 'US', 'CA', 'NY', etc.
    
    -- Rate configuration
    tax_rate DECIMAL(6,4), -- Flat rate (e.g., 0.0765 for Social Security)
    
    -- Bracket configuration (for progressive taxes)
    income_min DECIMAL(12,2) DEFAULT 0,
    income_max DECIMAL(12,2),
    
    -- Employer portion (for taxes like Social Security)
    employer_rate DECIMAL(6,4) DEFAULT 0,
    
    -- Applicability
    applies_to_employment_status hr_public.employment_status[],
    
    -- Validity
    effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT true,
    
    -- System fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT tax_config_rate_valid CHECK (tax_rate >= 0 AND tax_rate <= 1),
    CONSTRAINT tax_config_employer_rate_valid CHECK (employer_rate >= 0 AND employer_rate <= 1),
    CONSTRAINT tax_config_income_range_valid CHECK (income_min <= COALESCE(income_max, income_min)),
    CONSTRAINT tax_config_dates_valid CHECK (end_date IS NULL OR end_date >= effective_date)
);

-- Insert default tax configurations (2025 US federal rates)
INSERT INTO hr_hidden.tax_configuration (
    tax_name, tax_type, jurisdiction, tax_rate, income_min, income_max, applies_to_employment_status
) VALUES 
    ('Social Security', 'SOCIAL_SECURITY', 'US', 0.062, 0, 168600, ARRAY['FULL_TIME', 'PART_TIME']::hr_public.employment_status[]),
    ('Medicare', 'MEDICARE', 'US', 0.0145, 0, NULL, ARRAY['FULL_TIME', 'PART_TIME']::hr_public.employment_status[]),
    ('Federal Income Tax - 10%', 'FEDERAL', 'US', 0.10, 0, 11000, ARRAY['FULL_TIME', 'PART_TIME']::hr_public.employment_status[]),
    ('Federal Income Tax - 12%', 'FEDERAL', 'US', 0.12, 11001, 44725, ARRAY['FULL_TIME', 'PART_TIME']::hr_public.employment_status[]),
    ('Federal Income Tax - 22%', 'FEDERAL', 'US', 0.22, 44726, 95375, ARRAY['FULL_TIME', 'PART_TIME']::hr_public.employment_status[]),
    ('Federal Income Tax - 24%', 'FEDERAL', 'US', 0.24, 95376, 182050, ARRAY['FULL_TIME', 'PART_TIME']::hr_public.employment_status[]),
    ('Federal Income Tax - 32%', 'FEDERAL', 'US', 0.32, 182051, 231250, ARRAY['FULL_TIME', 'PART_TIME']::hr_public.employment_status[]),
    ('Federal Income Tax - 35%', 'FEDERAL', 'US', 0.35, 231251, 578125, ARRAY['FULL_TIME', 'PART_TIME']::hr_public.employment_status[]),
    ('Federal Income Tax - 37%', 'FEDERAL', 'US', 0.37, 578126, NULL, ARRAY['FULL_TIME', 'PART_TIME']::hr_public.employment_status[]);

-- Create indexes for performance
CREATE INDEX idx_employee_compensation_employee_active ON hr_private.employee_compensation(employee_id, effective_date, end_date) WHERE end_date IS NULL;
CREATE INDEX idx_employee_compensation_approved_by ON hr_private.employee_compensation(approved_by);
CREATE INDEX idx_employee_compensation_created_by ON hr_private.employee_compensation(created_by);
CREATE INDEX idx_employee_compensation_effective_date ON hr_private.employee_compensation(effective_date DESC);

CREATE INDEX idx_payroll_periods_status_date ON hr_public.payroll_periods(status, period_end_date DESC);
CREATE INDEX idx_payroll_periods_pay_date ON hr_public.payroll_periods(pay_date DESC);
CREATE INDEX idx_payroll_periods_frequency ON hr_public.payroll_periods(pay_frequency, period_start_date);

CREATE INDEX idx_payroll_entries_employee_period ON hr_private.payroll_entries(employee_id, payroll_period_id);
CREATE INDEX idx_payroll_entries_period ON hr_private.payroll_entries(payroll_period_id);
CREATE INDEX idx_payroll_entries_compensation ON hr_private.payroll_entries(compensation_id);

CREATE INDEX idx_compensation_history_employee_date ON hr_hidden.compensation_history(employee_id, effective_date DESC);
CREATE INDEX idx_compensation_history_compensation ON hr_hidden.compensation_history(compensation_id);
CREATE INDEX idx_compensation_history_change_type ON hr_hidden.compensation_history(change_type, effective_date DESC);

CREATE INDEX idx_tax_configuration_active ON hr_hidden.tax_configuration(is_active, effective_date) WHERE is_active = true;
CREATE INDEX idx_tax_configuration_jurisdiction ON hr_hidden.tax_configuration(jurisdiction, tax_type) WHERE is_active = true;

-- Add PostGraphile comments
COMMENT ON TABLE hr_public.payroll_periods IS '@name PayrollPeriod
Payroll processing periods with status and totals';

COMMENT ON TABLE hr_private.employee_compensation IS 
'@omit
Employee compensation records - highly sensitive data';

COMMENT ON TABLE hr_private.payroll_entries IS
'@omit 
Individual payroll entries - sensitive payroll data';

COMMENT ON COLUMN hr_public.payroll_periods.total_gross_amount IS
'Total gross amount for all employees in this payroll period';

COMMENT ON COLUMN hr_public.payroll_periods.employee_count IS
'Number of employees included in this payroll run';

-- Grant appropriate permissions (very restrictive for compensation data)
GRANT SELECT ON hr_public.payroll_periods TO hr_admin, hr_super_admin;
GRANT INSERT, UPDATE ON hr_public.payroll_periods TO hr_admin, hr_super_admin;

-- No direct access to compensation tables - must use functions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA hr_public TO hr_admin, hr_super_admin;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA hr_private TO hr_admin, hr_super_admin;