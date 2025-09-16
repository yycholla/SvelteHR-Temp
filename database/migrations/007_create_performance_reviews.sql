-- Migration: Create Performance Review System
-- Created: 2025-09-15
-- Description: Performance review system with goals, competencies, and review cycles

-- Create ENUM types for performance review system
CREATE TYPE hr_public.review_status AS ENUM (
    'NOT_STARTED',
    'IN_PROGRESS',
    'EMPLOYEE_SUBMITTED',
    'MANAGER_REVIEW',
    'HR_REVIEW',
    'COMPLETED',
    'CANCELLED'
);

CREATE TYPE hr_public.goal_status AS ENUM (
    'NOT_STARTED',
    'IN_PROGRESS',
    'COMPLETED',
    'CANCELLED',
    'EXCEEDED'
);

CREATE TYPE hr_public.competency_level AS ENUM (
    'BELOW_EXPECTATIONS',
    'MEETS_EXPECTATIONS', 
    'EXCEEDS_EXPECTATIONS',
    'OUTSTANDING'
);

-- Review cycles table (e.g., Annual 2024, Q1 2024, etc.)
CREATE TABLE hr_public.review_cycles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Cycle details
    cycle_name VARCHAR(100) NOT NULL, -- "Annual 2024", "Mid-Year 2024", "Q1 2024"
    cycle_type VARCHAR(50) NOT NULL, -- "ANNUAL", "QUARTERLY", "MID_YEAR", "PROJECT_BASED"
    description TEXT,
    
    -- Timeline
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    review_due_date DATE NOT NULL,
    
    -- Settings
    is_active BOOLEAN DEFAULT true,
    auto_create_reviews BOOLEAN DEFAULT false, -- automatically create reviews for all employees
    template_id UUID, -- reference to review template (future enhancement)
    
    -- System fields
    created_by UUID REFERENCES hr_public.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT review_cycle_dates_valid CHECK (start_date <= end_date AND end_date <= review_due_date),
    CONSTRAINT review_cycle_name_unique_per_year CHECK (cycle_name ~ '^[A-Za-z0-9\s\-_]+$'),
    CONSTRAINT review_cycle_type_valid CHECK (cycle_type IN ('ANNUAL', 'QUARTERLY', 'MID_YEAR', 'PROJECT_BASED', 'AD_HOC'))
);

-- Core competencies table
CREATE TABLE hr_public.competencies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Competency details
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100), -- "TECHNICAL", "LEADERSHIP", "COMMUNICATION", "PROBLEM_SOLVING"
    
    -- Applicability
    applies_to_roles TEXT[], -- array of role names, null = all roles
    weight DECIMAL(3,2) DEFAULT 1.00, -- weighting for overall score calculation
    
    -- Settings
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    
    -- System fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT competency_weight_valid CHECK (weight >= 0 AND weight <= 10),
    CONSTRAINT competency_name_not_empty CHECK (LENGTH(TRIM(name)) > 0)
);

-- Performance reviews table
CREATE TABLE hr_public.performance_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Review participants
    employee_id UUID NOT NULL REFERENCES hr_public.users(id) ON DELETE CASCADE,
    manager_id UUID NOT NULL REFERENCES hr_public.users(id),
    cycle_id UUID NOT NULL REFERENCES hr_public.review_cycles(id),
    
    -- Review details
    status hr_public.review_status DEFAULT 'NOT_STARTED',
    overall_rating DECIMAL(3,2), -- 1.00 to 5.00 scale
    
    -- Employee self-assessment
    employee_self_assessment TEXT,
    employee_achievements TEXT,
    employee_challenges TEXT,
    employee_goals_next_period TEXT,
    employee_submitted_at TIMESTAMPTZ,
    
    -- Manager assessment
    manager_assessment TEXT,
    manager_feedback TEXT,
    manager_development_areas TEXT,
    manager_recommendations TEXT,
    manager_submitted_at TIMESTAMPTZ,
    
    -- HR review (optional)
    hr_reviewer_id UUID REFERENCES hr_public.users(id),
    hr_notes TEXT,
    hr_approved_at TIMESTAMPTZ,
    
    -- Final review meeting
    meeting_date DATE,
    meeting_notes TEXT,
    employee_acknowledgment_date DATE,
    
    -- Next review
    next_review_date DATE,
    
    -- System fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    
    -- Constraints
    UNIQUE(employee_id, cycle_id),
    CONSTRAINT performance_review_rating_valid CHECK (
        overall_rating IS NULL OR (overall_rating >= 1.00 AND overall_rating <= 5.00)
    ),
    CONSTRAINT performance_review_no_self_manage CHECK (employee_id != manager_id),
    CONSTRAINT performance_review_completion_logic CHECK (
        (status = 'COMPLETED' AND completed_at IS NOT NULL AND overall_rating IS NOT NULL) OR
        (status != 'COMPLETED')
    ),
    CONSTRAINT performance_review_submission_logic CHECK (
        (status IN ('EMPLOYEE_SUBMITTED', 'MANAGER_REVIEW', 'HR_REVIEW', 'COMPLETED') AND employee_submitted_at IS NOT NULL) OR
        (status NOT IN ('EMPLOYEE_SUBMITTED', 'MANAGER_REVIEW', 'HR_REVIEW', 'COMPLETED'))
    )
);

-- Goals table (can be linked to performance reviews or standalone)
CREATE TABLE hr_public.goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Goal details
    employee_id UUID NOT NULL REFERENCES hr_public.users(id) ON DELETE CASCADE,
    review_id UUID REFERENCES hr_public.performance_reviews(id) ON DELETE CASCADE,
    
    -- Goal content
    title VARCHAR(255) NOT NULL,
    description TEXT,
    success_criteria TEXT,
    
    -- Timeline
    target_date DATE,
    created_date DATE DEFAULT CURRENT_DATE,
    
    -- Status and progress
    status hr_public.goal_status DEFAULT 'NOT_STARTED',
    progress_percentage INTEGER DEFAULT 0,
    final_outcome TEXT,
    
    -- Weighting and categorization
    category VARCHAR(100), -- "PERFORMANCE", "DEVELOPMENT", "BEHAVIOR", "PROJECT"
    priority VARCHAR(20) DEFAULT 'MEDIUM', -- "HIGH", "MEDIUM", "LOW"
    weight DECIMAL(3,2) DEFAULT 1.00,
    
    -- System fields
    created_by UUID REFERENCES hr_public.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    
    -- Constraints
    CONSTRAINT goal_progress_valid CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    CONSTRAINT goal_weight_valid CHECK (weight >= 0 AND weight <= 10),
    CONSTRAINT goal_priority_valid CHECK (priority IN ('HIGH', 'MEDIUM', 'LOW')),
    CONSTRAINT goal_title_not_empty CHECK (LENGTH(TRIM(title)) > 0),
    CONSTRAINT goal_status_completion_logic CHECK (
        (status = 'COMPLETED' AND completed_at IS NOT NULL) OR
        (status != 'COMPLETED')
    )
);

-- Competency ratings for each performance review
CREATE TABLE hr_public.competency_ratings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Links
    review_id UUID NOT NULL REFERENCES hr_public.performance_reviews(id) ON DELETE CASCADE,
    competency_id UUID NOT NULL REFERENCES hr_public.competencies(id),
    
    -- Ratings
    employee_rating hr_public.competency_level,
    manager_rating hr_public.competency_level,
    final_rating hr_public.competency_level,
    
    -- Comments
    employee_comment TEXT,
    manager_comment TEXT,
    development_actions TEXT,
    
    -- System fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(review_id, competency_id)
);

-- Insert default competencies
INSERT INTO hr_public.competencies (name, description, category, weight) VALUES 
    ('Communication', 'Effectively communicates ideas, feedback, and information', 'CORE', 1.0),
    ('Problem Solving', 'Identifies problems and develops effective solutions', 'CORE', 1.0),
    ('Teamwork', 'Works collaboratively with others to achieve goals', 'CORE', 1.0),
    ('Accountability', 'Takes ownership of responsibilities and outcomes', 'CORE', 1.0),
    ('Adaptability', 'Adjusts effectively to changing conditions and requirements', 'CORE', 1.0),
    ('Technical Skills', 'Demonstrates required technical knowledge and skills', 'TECHNICAL', 1.2),
    ('Leadership', 'Guides and motivates others toward common goals', 'LEADERSHIP', 1.5),
    ('Innovation', 'Brings creative solutions and continuous improvement', 'GROWTH', 1.0),
    ('Customer Focus', 'Prioritizes customer needs and satisfaction', 'BUSINESS', 1.0),
    ('Quality Focus', 'Maintains high standards in work output and processes', 'CORE', 1.0);

-- Create sample review cycle for current year
INSERT INTO hr_public.review_cycles (
    cycle_name, 
    cycle_type, 
    description,
    start_date, 
    end_date, 
    review_due_date,
    auto_create_reviews
) VALUES (
    'Annual ' || EXTRACT(YEAR FROM CURRENT_DATE)::TEXT,
    'ANNUAL',
    'Annual performance review cycle for ' || EXTRACT(YEAR FROM CURRENT_DATE)::TEXT,
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '3 months',
    CURRENT_DATE + INTERVAL '4 months',
    false
);

-- Create indexes for performance
CREATE INDEX idx_performance_reviews_employee_status ON hr_public.performance_reviews(employee_id, status);
CREATE INDEX idx_performance_reviews_manager_status ON hr_public.performance_reviews(manager_id, status);
CREATE INDEX idx_performance_reviews_cycle ON hr_public.performance_reviews(cycle_id, status);
CREATE INDEX idx_performance_reviews_due_date ON hr_public.performance_reviews(next_review_date) WHERE next_review_date IS NOT NULL;

CREATE INDEX idx_goals_employee_status ON hr_public.goals(employee_id, status);
CREATE INDEX idx_goals_review ON hr_public.goals(review_id) WHERE review_id IS NOT NULL;
CREATE INDEX idx_goals_target_date ON hr_public.goals(target_date) WHERE target_date IS NOT NULL;
CREATE INDEX idx_goals_category_priority ON hr_public.goals(category, priority);

CREATE INDEX idx_competency_ratings_review ON hr_public.competency_ratings(review_id);
CREATE INDEX idx_competency_ratings_competency ON hr_public.competency_ratings(competency_id);

CREATE INDEX idx_review_cycles_active ON hr_public.review_cycles(is_active, end_date) WHERE is_active = true;
CREATE INDEX idx_competencies_active_category ON hr_public.competencies(is_active, category) WHERE is_active = true;

-- Add PostGraphile comments
COMMENT ON TABLE hr_public.review_cycles IS '@name ReviewCycle
Performance review cycles (Annual, Quarterly, etc.)';

COMMENT ON TABLE hr_public.performance_reviews IS '@name PerformanceReview
Employee performance reviews with self-assessment and manager feedback';

COMMENT ON TABLE hr_public.goals IS '@name Goal
Employee goals linked to performance reviews or standalone development';

COMMENT ON TABLE hr_public.competencies IS '@name Competency
Core competencies evaluated during performance reviews';

COMMENT ON TABLE hr_public.competency_ratings IS '@name CompetencyRating
Competency ratings by employee and manager for each review';

COMMENT ON COLUMN hr_public.performance_reviews.overall_rating IS
'Overall performance rating on 1.0-5.0 scale';

COMMENT ON COLUMN hr_public.goals.progress_percentage IS
'Goal completion progress as percentage (0-100)';

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON hr_public.review_cycles TO postgraphile_user;
GRANT SELECT, INSERT, UPDATE ON hr_public.performance_reviews TO postgraphile_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON hr_public.goals TO postgraphile_user;
GRANT SELECT ON hr_public.competencies TO postgraphile_user;
GRANT SELECT, INSERT, UPDATE ON hr_public.competency_ratings TO postgraphile_user;