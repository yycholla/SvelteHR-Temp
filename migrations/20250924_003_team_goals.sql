-- Migration: Create team goals and key results tables for OKR tracking
-- Created: 2025-09-24
-- Task: T003 - Team goals database migration

-- Create team_goals table in hr_public schema
CREATE TABLE IF NOT EXISTS hr_public.team_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  team_id UUID REFERENCES hr_public.departments(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES hr_public.users(id) ON DELETE RESTRICT,
  goal_type VARCHAR(20) DEFAULT 'okr' CHECK (goal_type IN ('okr', 'kpi', 'project')),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),
  priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  target_value DECIMAL(10,2),
  current_value DECIMAL(10,2) DEFAULT 0,
  unit VARCHAR(50), -- '%', 'count', 'hours', 'revenue', etc.
  start_date DATE NOT NULL,
  target_date DATE NOT NULL,
  completion_percentage INTEGER DEFAULT 0 CHECK (completion_percentage BETWEEN 0 AND 100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Business logic constraints
  CONSTRAINT valid_goal_dates CHECK (start_date <= target_date),
  CONSTRAINT valid_target_value CHECK (target_value IS NULL OR target_value > 0),
  CONSTRAINT valid_current_value CHECK (current_value >= 0)
);

-- Create goal_key_results table for OKR key results
CREATE TABLE IF NOT EXISTS hr_public.goal_key_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES hr_public.team_goals(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  target_value DECIMAL(10,2) NOT NULL CHECK (target_value > 0),
  current_value DECIMAL(10,2) DEFAULT 0 CHECK (current_value >= 0),
  unit VARCHAR(50),
  weight INTEGER DEFAULT 25 CHECK (weight BETWEEN 1 AND 100), -- Contribution to goal %
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create performance indexes
CREATE INDEX IF NOT EXISTS idx_team_goals_team_status ON hr_public.team_goals(team_id, status);
CREATE INDEX IF NOT EXISTS idx_team_goals_owner_status ON hr_public.team_goals(owner_id, status);
CREATE INDEX IF NOT EXISTS idx_team_goals_dates ON hr_public.team_goals(start_date, target_date);
CREATE INDEX IF NOT EXISTS idx_team_goals_status_created ON hr_public.team_goals(status, created_at);
CREATE INDEX IF NOT EXISTS idx_goal_key_results_goal_id ON hr_public.goal_key_results(goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_key_results_status ON hr_public.goal_key_results(status);

-- Create updated_at triggers
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_team_goals_updated_at') THEN
        CREATE TRIGGER trigger_team_goals_updated_at
            BEFORE UPDATE ON hr_public.team_goals
            FOR EACH ROW
            EXECUTE FUNCTION hr_public.update_updated_at_column();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_goal_key_results_updated_at') THEN
        CREATE TRIGGER trigger_goal_key_results_updated_at
            BEFORE UPDATE ON hr_public.goal_key_results
            FOR EACH ROW
            EXECUTE FUNCTION hr_public.update_updated_at_column();
    END IF;
END $$;

-- Enable Row-Level Security
ALTER TABLE hr_public.team_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_public.goal_key_results ENABLE ROW LEVEL SECURITY;

-- RLS Policy for team_goals: Team members + managers + goal owners
CREATE POLICY team_goals_access ON hr_public.team_goals
  FOR ALL TO hr_admin, hr_manager, hr_employee, hr_super_admin
  USING (
    owner_id = (current_setting('jwt.claims.user_id', true))::uuid OR
    team_id IN (
      SELECT department_id
      FROM hr_public.users
      WHERE id = (current_setting('jwt.claims.user_id', true))::uuid
    ) OR
    current_setting('jwt.claims.role', true) IN ('hr_manager', 'hr_admin', 'hr_super_admin')
  );

-- RLS Policy for goal_key_results: Same as parent goal access
CREATE POLICY goal_key_results_access ON hr_public.goal_key_results
  FOR ALL TO hr_admin, hr_manager, hr_employee, hr_super_admin
  USING (
    goal_id IN (
      SELECT id FROM hr_public.team_goals
      WHERE owner_id = (current_setting('jwt.claims.user_id', true))::uuid
      OR team_id IN (
        SELECT department_id
        FROM hr_public.users
        WHERE id = (current_setting('jwt.claims.user_id', true))::uuid
      )
      OR (current_setting('jwt.claims.role', true) IN ('hr_manager', 'hr_admin', 'hr_super_admin'))
    )
  );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON hr_public.team_goals TO hr_admin, hr_manager, hr_employee, hr_super_admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON hr_public.goal_key_results TO hr_admin, hr_manager, hr_employee, hr_super_admin;

-- Add comments for documentation
COMMENT ON TABLE hr_public.team_goals IS 'Measurable team objectives with key results tracking (OKRs)';
COMMENT ON TABLE hr_public.goal_key_results IS 'Key results for team goals - measurable outcomes that indicate goal achievement';
COMMENT ON COLUMN hr_public.team_goals.goal_type IS 'Type of goal: okr, kpi, project';
COMMENT ON COLUMN hr_public.team_goals.status IS 'Goal status: draft, active, completed, cancelled';
COMMENT ON COLUMN hr_public.team_goals.priority IS 'Goal priority: high, medium, low';
COMMENT ON COLUMN hr_public.team_goals.unit IS 'Unit of measurement for target/current values (%, count, hours, revenue, etc.)';
COMMENT ON COLUMN hr_public.team_goals.completion_percentage IS 'Overall completion percentage (0-100)';
COMMENT ON COLUMN hr_public.goal_key_results.weight IS 'Contribution weight to parent goal percentage (1-100)';