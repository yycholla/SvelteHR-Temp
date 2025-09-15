-- Migration: Create HR Tables
-- Created: 2025-01-16
-- Description: Creates time-off requests, performance reviews, and compensation tables

-- Time off requests table
CREATE TABLE hr_public.time_off_requests (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL REFERENCES hr_public.employees(id),
    request_type hr_public.time_off_type NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days_requested DECIMAL(4,2) NOT NULL,
    reason TEXT,
    status hr_public.request_status DEFAULT 'PENDING',
    approved_by INTEGER REFERENCES hr_public.employees(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT time_off_dates_valid CHECK (start_date <= end_date),
    CONSTRAINT time_off_days_positive CHECK (days_requested > 0),
    CONSTRAINT time_off_days_reasonable CHECK (days_requested <= 365),
    CONSTRAINT time_off_future_dates CHECK (start_date >= CURRENT_DATE - INTERVAL '1 year'),
    CONSTRAINT time_off_approval_logic CHECK (
        (status = 'APPROVED' AND approved_by IS NOT NULL AND approved_at IS NOT NULL) OR
        (status = 'REJECTED' AND approved_by IS NOT NULL AND approved_at IS NOT NULL AND rejection_reason IS NOT NULL) OR
        (status IN ('PENDING', 'CANCELLED'))
    )
);

-- Performance reviews table
CREATE TABLE hr_public.performance_reviews (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL REFERENCES hr_public.employees(id),
    reviewer_id INTEGER NOT NULL REFERENCES hr_public.employees(id),
    review_period VARCHAR(50) NOT NULL, -- e.g., "2024-Q4", "2024-Annual"
    status hr_public.review_status DEFAULT 'NOT_STARTED',
    overall_rating DECIMAL(3,2), -- 1.00 to 5.00 scale
    goals TEXT,
    achievements TEXT,
    areas_for_improvement TEXT,
    feedback TEXT,
    employee_comments TEXT,
    next_review_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT performance_review_rating_valid CHECK (
        overall_rating IS NULL OR (overall_rating >= 1.00 AND overall_rating <= 5.00)
    ),
    CONSTRAINT performance_review_completion_logic CHECK (
        (status = 'COMPLETED' AND completed_at IS NOT NULL AND overall_rating IS NOT NULL) OR
        (status != 'COMPLETED')
    ),
    CONSTRAINT performance_review_no_self_review CHECK (employee_id != reviewer_id),
    CONSTRAINT performance_review_period_format CHECK (
        review_period ~* '^[0-9]{4}-(Q[1-4]|Annual|Mid-Year)$'
    )
);

-- Employee compensation table (private schema - highly sensitive)
CREATE TABLE hr_private.employee_compensation (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL REFERENCES hr_public.employees(id),
    base_salary DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    salary_type VARCHAR(20) DEFAULT 'ANNUAL', -- ANNUAL, HOURLY
    effective_date DATE NOT NULL,
    end_date DATE,
    bonus_eligible BOOLEAN DEFAULT true,
    equity_grants DECIMAL(12,2) DEFAULT 0,
    benefits_package VARCHAR(100),
    created_by INTEGER NOT NULL REFERENCES hr_public.employees(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT compensation_salary_positive CHECK (base_salary > 0),
    CONSTRAINT compensation_currency_valid CHECK (currency ~* '^[A-Z]{3}$'),
    CONSTRAINT compensation_salary_type_valid CHECK (salary_type IN ('ANNUAL', 'HOURLY')),
    CONSTRAINT compensation_dates_valid CHECK (end_date IS NULL OR end_date >= effective_date),
    CONSTRAINT compensation_equity_non_negative CHECK (equity_grants >= 0),
    CONSTRAINT compensation_salary_reasonable CHECK (
        (salary_type = 'ANNUAL' AND base_salary BETWEEN 20000 AND 10000000) OR
        (salary_type = 'HOURLY' AND base_salary BETWEEN 7.25 AND 5000)
    )
);

-- Time off balances table (computed/cached data)
CREATE TABLE hr_hidden.time_off_balances (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL REFERENCES hr_public.employees(id),
    year INTEGER NOT NULL,
    vacation_days_total DECIMAL(4,2) DEFAULT 0,
    vacation_days_used DECIMAL(4,2) DEFAULT 0,
    sick_days_total DECIMAL(4,2) DEFAULT 0,
    sick_days_used DECIMAL(4,2) DEFAULT 0,
    personal_days_total DECIMAL(4,2) DEFAULT 0,
    personal_days_used DECIMAL(4,2) DEFAULT 0,
    last_calculated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT time_off_balances_year_valid CHECK (year BETWEEN 2020 AND 2050),
    CONSTRAINT time_off_balances_non_negative CHECK (
        vacation_days_total >= 0 AND vacation_days_used >= 0 AND
        sick_days_total >= 0 AND sick_days_used >= 0 AND
        personal_days_total >= 0 AND personal_days_used >= 0
    ),
    CONSTRAINT time_off_balances_usage_not_exceed_total CHECK (
        vacation_days_used <= vacation_days_total AND
        sick_days_used <= sick_days_total AND
        personal_days_used <= personal_days_total
    ),
    
    UNIQUE(employee_id, year)
);

-- Performance Indexes for time-off requests
CREATE INDEX idx_time_off_requests_employee_id ON hr_public.time_off_requests(employee_id);
CREATE INDEX idx_time_off_requests_status ON hr_public.time_off_requests(status);
CREATE INDEX idx_time_off_requests_approved_by ON hr_public.time_off_requests(approved_by);
CREATE INDEX idx_time_off_requests_dates ON hr_public.time_off_requests(start_date, end_date);
CREATE INDEX idx_time_off_requests_type_status ON hr_public.time_off_requests(request_type, status);

-- Manager queries: pending requests in their department
CREATE INDEX idx_time_off_requests_status_start_date ON hr_public.time_off_requests(status, start_date) 
WHERE status = 'PENDING';

-- Performance review indexes
CREATE INDEX idx_performance_reviews_employee_id ON hr_public.performance_reviews(employee_id);
CREATE INDEX idx_performance_reviews_reviewer_id ON hr_public.performance_reviews(reviewer_id);
CREATE INDEX idx_performance_reviews_status ON hr_public.performance_reviews(status);
CREATE INDEX idx_performance_reviews_period ON hr_public.performance_reviews(review_period);
CREATE INDEX idx_performance_reviews_completed_at ON hr_public.performance_reviews(completed_at);

-- Compensation indexes (private data)
CREATE INDEX idx_employee_compensation_employee_id ON hr_private.employee_compensation(employee_id);
CREATE INDEX idx_employee_compensation_effective_date ON hr_private.employee_compensation(effective_date);
CREATE INDEX idx_employee_compensation_created_by ON hr_private.employee_compensation(created_by);

-- Active compensation records (no end_date)
CREATE INDEX idx_employee_compensation_active ON hr_private.employee_compensation(employee_id, effective_date) 
WHERE end_date IS NULL;

-- Time off balances indexes
CREATE INDEX idx_time_off_balances_employee_year ON hr_hidden.time_off_balances(employee_id, year);
CREATE INDEX idx_time_off_balances_year ON hr_hidden.time_off_balances(year);

-- Update timestamp triggers
CREATE TRIGGER tr_time_off_requests_updated_at
    BEFORE UPDATE ON hr_public.time_off_requests
    FOR EACH ROW EXECUTE FUNCTION hr_hidden.update_updated_at();

CREATE TRIGGER tr_performance_reviews_updated_at
    BEFORE UPDATE ON hr_public.performance_reviews
    FOR EACH ROW EXECUTE FUNCTION hr_hidden.update_updated_at();

CREATE TRIGGER tr_employee_compensation_updated_at
    BEFORE UPDATE ON hr_private.employee_compensation
    FOR EACH ROW EXECUTE FUNCTION hr_hidden.update_updated_at();

-- Comments for documentation
COMMENT ON TABLE hr_public.time_off_requests IS 'Employee time-off requests with approval workflow';
COMMENT ON TABLE hr_public.performance_reviews IS 'Performance review cycles with ratings and feedback';
COMMENT ON TABLE hr_private.employee_compensation IS 'Highly sensitive salary and compensation data';
COMMENT ON TABLE hr_hidden.time_off_balances IS 'Calculated time-off balances cache for performance';

COMMENT ON COLUMN hr_public.time_off_requests.days_requested IS 'Number of business days requested (can include partial days)';
COMMENT ON COLUMN hr_public.performance_reviews.overall_rating IS 'Overall performance rating on 1.00-5.00 scale';
COMMENT ON COLUMN hr_public.performance_reviews.review_period IS 'Review period in format: YYYY-Q[1-4], YYYY-Annual, or YYYY-Mid-Year';
COMMENT ON COLUMN hr_private.employee_compensation.base_salary IS 'Base salary amount in specified currency';
COMMENT ON COLUMN hr_private.employee_compensation.salary_type IS 'ANNUAL for yearly salary, HOURLY for hourly wage';