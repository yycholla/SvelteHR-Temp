-- Migration: Add review_goals junction table
-- Date: 2025-10-10
-- Purpose: Link performance reviews to employee goals

BEGIN;

CREATE TABLE IF NOT EXISTS hr_public.review_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  review_id UUID NOT NULL REFERENCES hr_public.performance_reviews(id) ON DELETE CASCADE,
  goal_id UUID NOT NULL REFERENCES hr_public.employee_goals(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (review_id, goal_id)
);

COMMENT ON TABLE hr_public.review_goals IS 'Links performance reviews to employee goals being evaluated';

CREATE INDEX idx_review_goals_review ON hr_public.review_goals(review_id);
CREATE INDEX idx_review_goals_goal ON hr_public.review_goals(goal_id);

COMMIT;
