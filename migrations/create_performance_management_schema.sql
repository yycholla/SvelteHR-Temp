-- Performance Management System Schema
-- Create tables for performance reviews, cycles, and goals

-- Performance cycles table
CREATE TABLE IF NOT EXISTS hr_public.performance_cycles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

    CONSTRAINT valid_date_range CHECK (end_date > start_date)
);

-- Performance reviews table
CREATE TABLE IF NOT EXISTS hr_public.performance_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES hr_public.users(id) ON DELETE CASCADE,
    reviewer_id UUID REFERENCES hr_public.users(id) ON DELETE SET NULL,
    cycle_id UUID NOT NULL REFERENCES hr_public.performance_cycles(id) ON DELETE CASCADE,
    review_period_start DATE NOT NULL,
    review_period_end DATE NOT NULL,
    overall_rating VARCHAR(50), -- EXCEEDED_EXPECTATIONS, MET_EXPECTATIONS, PARTIALLY_MET_EXPECTATIONS, DID_NOT_MEET_EXPECTATIONS
    status VARCHAR(50) DEFAULT 'NOT_STARTED', -- NOT_STARTED, IN_PROGRESS, COMPLETED, OVERDUE
    self_assessment TEXT,
    manager_comments TEXT,
    employee_comments TEXT,
    development_goals TEXT,
    goals_rating VARCHAR(50),
    competencies_rating VARCHAR(50),
    submitted_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

    CONSTRAINT valid_review_period CHECK (review_period_end > review_period_start),
    CONSTRAINT unique_employee_cycle UNIQUE(employee_id, cycle_id)
);

-- Performance goals table
CREATE TABLE IF NOT EXISTS hr_public.performance_goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES hr_public.users(id) ON DELETE CASCADE,
    cycle_id UUID NOT NULL REFERENCES hr_public.performance_cycles(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    target_date DATE,
    status VARCHAR(50) DEFAULT 'NOT_STARTED', -- NOT_STARTED, IN_PROGRESS, COMPLETED, CANCELLED
    progress_percentage INTEGER DEFAULT 0,
    final_rating VARCHAR(50), -- EXCEEDED, MET, PARTIALLY_MET, NOT_MET
    manager_comments TEXT,
    employee_comments TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

    CONSTRAINT valid_progress CHECK (progress_percentage >= 0 AND progress_percentage <= 100)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_performance_reviews_employee_id ON hr_public.performance_reviews(employee_id);
CREATE INDEX IF NOT EXISTS idx_performance_reviews_reviewer_id ON hr_public.performance_reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_performance_reviews_cycle_id ON hr_public.performance_reviews(cycle_id);
CREATE INDEX IF NOT EXISTS idx_performance_reviews_status ON hr_public.performance_reviews(status);

CREATE INDEX IF NOT EXISTS idx_performance_goals_employee_id ON hr_public.performance_goals(employee_id);
CREATE INDEX IF NOT EXISTS idx_performance_goals_cycle_id ON hr_public.performance_goals(cycle_id);
CREATE INDEX IF NOT EXISTS idx_performance_goals_status ON hr_public.performance_goals(status);

CREATE INDEX IF NOT EXISTS idx_performance_cycles_is_active ON hr_public.performance_cycles(is_active);
CREATE INDEX IF NOT EXISTS idx_performance_cycles_dates ON hr_public.performance_cycles(start_date, end_date);

-- Create update timestamp triggers
CREATE OR REPLACE FUNCTION hr_public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_performance_cycles_updated_at
    BEFORE UPDATE ON hr_public.performance_cycles
    FOR EACH ROW EXECUTE PROCEDURE hr_public.update_updated_at_column();

CREATE TRIGGER update_performance_reviews_updated_at
    BEFORE UPDATE ON hr_public.performance_reviews
    FOR EACH ROW EXECUTE PROCEDURE hr_public.update_updated_at_column();

CREATE TRIGGER update_performance_goals_updated_at
    BEFORE UPDATE ON hr_public.performance_goals
    FOR EACH ROW EXECUTE PROCEDURE hr_public.update_updated_at_column();

-- Insert sample data for testing
INSERT INTO hr_public.performance_cycles (name, description, start_date, end_date, is_active) VALUES
('2024 Annual Review', '2024 Annual Performance Review Cycle', '2024-01-01', '2024-12-31', true),
('Q4 2024 Review', 'Q4 2024 Quarterly Performance Review', '2024-10-01', '2024-12-31', false)
ON CONFLICT DO NOTHING;

-- Set up Row Level Security policies
ALTER TABLE hr_public.performance_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_public.performance_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_public.performance_goals ENABLE ROW LEVEL SECURITY;

-- Performance cycles policies (readable by all authenticated users)
CREATE POLICY performance_cycles_select_policy ON hr_public.performance_cycles
    FOR SELECT TO hr_employee, hr_manager, hr_admin, hr_super_admin
    USING (true);

-- Performance reviews policies (users can see their own reviews + managers/admins see all)
CREATE POLICY performance_reviews_select_policy ON hr_public.performance_reviews
    FOR SELECT TO hr_employee, hr_manager, hr_admin, hr_super_admin
    USING (
        current_setting('jwt.claims.role', true) = ANY(ARRAY['hr_super_admin', 'hr_admin', 'hr_manager']) OR
        employee_id = (current_setting('jwt.claims.user_id', true))::uuid OR
        reviewer_id = (current_setting('jwt.claims.user_id', true))::uuid
    );

-- Performance goals policies (users can see their own goals + managers/admins see all)
CREATE POLICY performance_goals_select_policy ON hr_public.performance_goals
    FOR SELECT TO hr_employee, hr_manager, hr_admin, hr_super_admin
    USING (
        current_setting('jwt.claims.role', true) = ANY(ARRAY['hr_super_admin', 'hr_admin', 'hr_manager']) OR
        employee_id = (current_setting('jwt.claims.user_id', true))::uuid
    );

-- Grant permissions
GRANT SELECT ON hr_public.performance_cycles TO hr_employee, hr_manager, hr_admin, hr_super_admin;
GRANT SELECT ON hr_public.performance_reviews TO hr_employee, hr_manager, hr_admin, hr_super_admin;
GRANT SELECT ON hr_public.performance_goals TO hr_employee, hr_manager, hr_admin, hr_super_admin;

GRANT INSERT, UPDATE ON hr_public.performance_reviews TO hr_manager, hr_admin, hr_super_admin;
GRANT INSERT, UPDATE ON hr_public.performance_goals TO hr_employee, hr_manager, hr_admin, hr_super_admin;
GRANT ALL ON hr_public.performance_cycles TO hr_admin, hr_super_admin;

-- Add table comments for PostGraphile introspection
COMMENT ON TABLE hr_public.performance_cycles IS 'Performance review cycles and periods';
COMMENT ON TABLE hr_public.performance_reviews IS 'Employee performance reviews and assessments';
COMMENT ON TABLE hr_public.performance_goals IS 'Employee performance goals and objectives';

-- Add column comments
COMMENT ON COLUMN hr_public.performance_reviews.overall_rating IS 'Overall performance rating';
COMMENT ON COLUMN hr_public.performance_reviews.status IS 'Review completion status';
COMMENT ON COLUMN hr_public.performance_goals.status IS 'Goal completion status';
COMMENT ON COLUMN hr_public.performance_goals.progress_percentage IS 'Goal completion progress (0-100)';