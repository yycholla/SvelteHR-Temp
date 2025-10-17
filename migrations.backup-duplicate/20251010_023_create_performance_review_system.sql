-- Migration: Create comprehensive Performance Review System
-- Date: 2025-10-10
-- Purpose: Create review_cycles, extend performance_reviews, add review_goals and review_feedback tables

BEGIN;

-- ============================================================================
-- STEP 1: Create Review Cycle Status Enum
-- ============================================================================

CREATE TYPE hr_public.review_cycle_status AS ENUM (
  'draft',
  'active',
  'closed'
);

COMMENT ON TYPE hr_public.review_cycle_status IS 'Status of a review cycle: draft, active, closed';

-- ============================================================================
-- STEP 2: Create Review Cycles Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS hr_public.review_cycles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  review_type hr_public.review_type NOT NULL,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  status hr_public.review_cycle_status NOT NULL DEFAULT 'draft',
  created_by UUID NOT NULL REFERENCES hr_public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMPTZ,

  CONSTRAINT review_cycles_date_range CHECK (end_date > start_date)
);

COMMENT ON TABLE hr_public.review_cycles IS 'Performance review cycles for organizing review periods';

CREATE INDEX idx_review_cycles_status ON hr_public.review_cycles(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_review_cycles_dates ON hr_public.review_cycles(start_date, end_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_review_cycles_type ON hr_public.review_cycles(review_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_review_cycles_created_by ON hr_public.review_cycles(created_by);
CREATE INDEX idx_review_cycles_deleted_at ON hr_public.review_cycles(deleted_at);

-- ============================================================================
-- STEP 3: Extend Performance Reviews Table
-- ============================================================================

-- Add new columns to performance_reviews
ALTER TABLE hr_public.performance_reviews
  ADD COLUMN IF NOT EXISTS review_cycle_id UUID REFERENCES hr_public.review_cycles(id),
  ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS employee_self_review TEXT,
  ADD COLUMN IF NOT EXISTS strengths TEXT,
  ADD COLUMN IF NOT EXISTS manager_comments TEXT;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_performance_reviews_cycle ON hr_public.performance_reviews(review_cycle_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_performance_reviews_due_date ON hr_public.performance_reviews(due_date) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_performance_reviews_deleted_at ON hr_public.performance_reviews(deleted_at);

COMMENT ON COLUMN hr_public.performance_reviews.review_cycle_id IS 'Reference to the review cycle this review belongs to';
COMMENT ON COLUMN hr_public.performance_reviews.due_date IS 'Deadline for completing the review';
COMMENT ON COLUMN hr_public.performance_reviews.completed_at IS 'Timestamp when review was marked as completed';
COMMENT ON COLUMN hr_public.performance_reviews.deleted_at IS 'Soft delete timestamp';
COMMENT ON COLUMN hr_public.performance_reviews.employee_self_review IS 'Employee self-assessment text';
COMMENT ON COLUMN hr_public.performance_reviews.strengths IS 'Key strengths identified during review';
COMMENT ON COLUMN hr_public.performance_reviews.manager_comments IS 'Manager comments and feedback';

-- ============================================================================
-- STEP 4: Create Goal Completion Status Enum
-- ============================================================================

CREATE TYPE hr_public.goal_completion_status AS ENUM (
  'not_started',
  'in_progress',
  'completed',
  'deferred',
  'cancelled'
);

COMMENT ON TYPE hr_public.goal_completion_status IS 'Completion status of a review goal';

-- ============================================================================
-- STEP 5: Rename Existing Junction Table and Create Standalone Review Goals
-- ============================================================================

-- Rename existing review_goals junction table to review_goal_links
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'hr_public' AND table_name = 'review_goals') THEN
    -- Drop old indexes first
    DROP INDEX IF EXISTS hr_public.idx_review_goals_review;
    DROP INDEX IF EXISTS hr_public.idx_review_goals_goal;

    -- Rename table
    ALTER TABLE hr_public.review_goals RENAME TO review_goal_links;
  END IF;
END$$;

-- Create new review_goals table for standalone goals
CREATE TABLE IF NOT EXISTS hr_public.review_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  performance_review_id UUID NOT NULL REFERENCES hr_public.performance_reviews(id) ON DELETE CASCADE,
  goal_title VARCHAR(500) NOT NULL,
  goal_description TEXT,
  target_value NUMERIC(10, 2),
  actual_value NUMERIC(10, 2),
  completion_status hr_public.goal_completion_status NOT NULL DEFAULT 'not_started',
  weight INTEGER DEFAULT 1 CHECK (weight >= 1 AND weight <= 10),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMPTZ,

  CONSTRAINT review_goals_weight_range CHECK (weight >= 1 AND weight <= 10)
);

COMMENT ON TABLE hr_public.review_goals IS 'Individual goals and objectives for performance reviews';

CREATE INDEX IF NOT EXISTS idx_review_goals_review ON hr_public.review_goals(performance_review_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_review_goals_status ON hr_public.review_goals(completion_status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_review_goals_deleted_at ON hr_public.review_goals(deleted_at);

-- ============================================================================
-- STEP 6: Create Feedback Type Enum
-- ============================================================================

CREATE TYPE hr_public.feedback_type AS ENUM (
  'manager',
  'peer',
  'self_review',
  'skip_level',
  'direct_report',
  'customer'
);

COMMENT ON TYPE hr_public.feedback_type IS '360-degree feedback types: manager, peer, self, skip-level, direct report, customer';

-- ============================================================================
-- STEP 7: Create Review Feedback Table (360-degree Feedback)
-- ============================================================================

CREATE TABLE IF NOT EXISTS hr_public.review_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  performance_review_id UUID NOT NULL REFERENCES hr_public.performance_reviews(id) ON DELETE CASCADE,
  feedback_provider_id UUID NOT NULL REFERENCES hr_public.users(id),
  feedback_type hr_public.feedback_type NOT NULL,
  feedback_text TEXT NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMPTZ,

  CONSTRAINT review_feedback_rating_range CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5))
);

COMMENT ON TABLE hr_public.review_feedback IS '360-degree feedback for performance reviews';

CREATE INDEX idx_review_feedback_review ON hr_public.review_feedback(performance_review_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_review_feedback_provider ON hr_public.review_feedback(feedback_provider_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_review_feedback_type ON hr_public.review_feedback(feedback_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_review_feedback_deleted_at ON hr_public.review_feedback(deleted_at);

-- ============================================================================
-- STEP 8: Create Update Timestamp Triggers
-- ============================================================================

-- Trigger for review_cycles
DROP TRIGGER IF EXISTS update_review_cycles_updated_at ON hr_public.review_cycles;
CREATE TRIGGER update_review_cycles_updated_at
  BEFORE UPDATE ON hr_public.review_cycles
  FOR EACH ROW
  EXECUTE FUNCTION hr_public.update_updated_at_column();

-- Trigger for review_goals
DROP TRIGGER IF EXISTS update_review_goals_updated_at ON hr_public.review_goals;
CREATE TRIGGER update_review_goals_updated_at
  BEFORE UPDATE ON hr_public.review_goals
  FOR EACH ROW
  EXECUTE FUNCTION hr_public.update_updated_at_column();

-- Trigger for review_feedback
DROP TRIGGER IF EXISTS update_review_feedback_updated_at ON hr_public.review_feedback;
CREATE TRIGGER update_review_feedback_updated_at
  BEFORE UPDATE ON hr_public.review_feedback
  FOR EACH ROW
  EXECUTE FUNCTION hr_public.update_updated_at_column();

COMMIT;
