-- Migration: Performance Reviews System
-- Created: 2025-10-17
-- Description: performance_reviews, review_cycles, review_goals, review_feedback, review_templates

BEGIN;

-- ============================================================================
-- REVIEW_CYCLES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS hr_public.review_cycles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    review_template_id UUID REFERENCES hr_public.review_templates(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID NOT NULL REFERENCES hr_public.users(id) ON DELETE RESTRICT,
    self_review_due_date DATE,
    manager_review_due_date DATE,
    peer_review_due_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT review_cycles_dates_valid CHECK (end_date >= start_date),
    CONSTRAINT review_cycles_name_not_empty CHECK (LENGTH(TRIM(name)) > 0),
    CONSTRAINT review_cycles_self_due_valid CHECK (
        self_review_due_date IS NULL OR
        (self_review_due_date >= start_date AND self_review_due_date <= end_date)
    ),
    CONSTRAINT review_cycles_manager_due_valid CHECK (
        manager_review_due_date IS NULL OR
        (manager_review_due_date >= start_date AND manager_review_due_date <= end_date)
    ),
    CONSTRAINT review_cycles_peer_due_valid CHECK (
        peer_review_due_date IS NULL OR
        (peer_review_due_date >= start_date AND peer_review_due_date <= end_date)
    )
);

CREATE INDEX IF NOT EXISTS idx_review_cycles_name ON hr_public.review_cycles(name);
CREATE INDEX IF NOT EXISTS idx_review_cycles_active ON hr_public.review_cycles(is_active, start_date DESC);
CREATE INDEX IF NOT EXISTS idx_review_cycles_template ON hr_public.review_cycles(review_template_id);
CREATE INDEX IF NOT EXISTS idx_review_cycles_created_by ON hr_public.review_cycles(created_by);

COMMENT ON TABLE hr_public.review_cycles IS 'Performance review periods with due dates for self, manager, and peer reviews';
COMMENT ON COLUMN hr_public.review_cycles.is_active IS 'Only one review cycle should be active at a time';

-- ============================================================================
-- REVIEW_TEMPLATES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS hr_public.review_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    template_data JSONB NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID REFERENCES hr_public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT review_templates_name_not_empty CHECK (LENGTH(TRIM(name)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_review_templates_name ON hr_public.review_templates(name);
CREATE INDEX IF NOT EXISTS idx_review_templates_active ON hr_public.review_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_review_templates_created_by ON hr_public.review_templates(created_by);

COMMENT ON TABLE hr_public.review_templates IS 'Review form templates with customizable questions and rating scales';
COMMENT ON COLUMN hr_public.review_templates.template_data IS 'JSONB structure defining form fields, questions, and rating scales';

-- ============================================================================
-- PERFORMANCE_REVIEWS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS hr_public.performance_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES hr_public.users(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES hr_public.users(id) ON DELETE RESTRICT,
    review_cycle_id UUID REFERENCES hr_public.review_cycles(id) ON DELETE SET NULL,
    review_period VARCHAR(100) NOT NULL,
    review_type VARCHAR(50) NOT NULL DEFAULT 'annual',
    status hr_public.review_status NOT NULL DEFAULT 'not_started',
    overall_rating DECIMAL(3,1),
    goals TEXT,
    achievements TEXT,
    areas_for_improvement TEXT,
    strengths TEXT,
    manager_feedback TEXT,
    employee_comments TEXT,
    review_data JSONB,
    submitted_at TIMESTAMPTZ,
    approved_at TIMESTAMPTZ,
    approved_by UUID REFERENCES hr_public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,

    CONSTRAINT performance_reviews_no_self_review CHECK (employee_id != reviewer_id),
    CONSTRAINT performance_reviews_rating_range CHECK (
        overall_rating IS NULL OR (overall_rating >= 1.0 AND overall_rating <= 5.0)
    ),
    CONSTRAINT performance_reviews_type_valid CHECK (review_type IN (
        'annual', 'mid_year', 'quarterly', 'probation', 'promotion', 'pip'
    )),
    CONSTRAINT performance_reviews_period_not_empty CHECK (LENGTH(TRIM(review_period)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_performance_reviews_employee ON hr_public.performance_reviews(employee_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_performance_reviews_reviewer ON hr_public.performance_reviews(reviewer_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_performance_reviews_cycle ON hr_public.performance_reviews(review_cycle_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_performance_reviews_status ON hr_public.performance_reviews(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_performance_reviews_type ON hr_public.performance_reviews(review_type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_performance_reviews_period ON hr_public.performance_reviews(review_period) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_performance_reviews_rating ON hr_public.performance_reviews(overall_rating) WHERE deleted_at IS NULL AND overall_rating IS NOT NULL;

COMMENT ON TABLE hr_public.performance_reviews IS 'Employee performance reviews with ratings, feedback, and goal tracking';
COMMENT ON COLUMN hr_public.performance_reviews.review_type IS 'Review type: annual, mid_year, quarterly, probation, promotion, pip (performance improvement plan)';
COMMENT ON COLUMN hr_public.performance_reviews.overall_rating IS 'Overall rating (1.0-5.0 scale)';
COMMENT ON COLUMN hr_public.performance_reviews.review_data IS 'JSONB structure containing responses to review_template questions';

-- ============================================================================
-- REVIEW_GOALS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS hr_public.review_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    performance_review_id UUID NOT NULL REFERENCES hr_public.performance_reviews(id) ON DELETE CASCADE,
    goal_title VARCHAR(500) NOT NULL,
    goal_description TEXT,
    target_completion_date DATE,
    progress_percentage INTEGER DEFAULT 0,
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT review_goals_title_not_empty CHECK (LENGTH(TRIM(goal_title)) > 0),
    CONSTRAINT review_goals_progress_range CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    CONSTRAINT review_goals_completed_requires_timestamp CHECK (
        NOT is_completed OR completed_at IS NOT NULL
    )
);

CREATE INDEX IF NOT EXISTS idx_review_goals_review ON hr_public.review_goals(performance_review_id);
CREATE INDEX IF NOT EXISTS idx_review_goals_completion ON hr_public.review_goals(is_completed, target_completion_date);
CREATE INDEX IF NOT EXISTS idx_review_goals_progress ON hr_public.review_goals(progress_percentage);

COMMENT ON TABLE hr_public.review_goals IS 'Goals set during performance reviews with progress tracking';
COMMENT ON COLUMN hr_public.review_goals.progress_percentage IS 'Goal completion progress (0-100%)';

-- ============================================================================
-- REVIEW_FEEDBACK TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS hr_public.review_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    performance_review_id UUID NOT NULL REFERENCES hr_public.performance_reviews(id) ON DELETE CASCADE,
    provided_by UUID NOT NULL REFERENCES hr_public.users(id) ON DELETE RESTRICT,
    feedback_type VARCHAR(50) NOT NULL DEFAULT 'peer',
    rating DECIMAL(3,1),
    comments TEXT,
    is_anonymous BOOLEAN NOT NULL DEFAULT FALSE,
    submitted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT review_feedback_type_valid CHECK (feedback_type IN (
        'self', 'manager', 'peer', 'direct_report', 'skip_level'
    )),
    CONSTRAINT review_feedback_rating_range CHECK (
        rating IS NULL OR (rating >= 1.0 AND rating <= 5.0)
    )
);

CREATE INDEX IF NOT EXISTS idx_review_feedback_review ON hr_public.review_feedback(performance_review_id);
CREATE INDEX IF NOT EXISTS idx_review_feedback_provided_by ON hr_public.review_feedback(provided_by);
CREATE INDEX IF NOT EXISTS idx_review_feedback_type ON hr_public.review_feedback(feedback_type);
CREATE INDEX IF NOT EXISTS idx_review_feedback_submitted ON hr_public.review_feedback(submitted_at DESC) WHERE submitted_at IS NOT NULL;

COMMENT ON TABLE hr_public.review_feedback IS '360-degree feedback from peers, managers, direct reports, and self';
COMMENT ON COLUMN hr_public.review_feedback.feedback_type IS 'Type: self, manager, peer, direct_report, skip_level';
COMMENT ON COLUMN hr_public.review_feedback.is_anonymous IS 'Anonymous feedback hides provider identity from employee';

COMMIT;
