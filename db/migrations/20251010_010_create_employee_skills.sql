-- Migration: Create employee_skills table
-- Date: 2025-10-10
-- Purpose: Track employee skills with proficiency levels and endorsements
--          Priority: P2 (Medium - Feature Tables)

BEGIN;

-- ========================================
-- Create employee_skills table
-- ========================================

CREATE TABLE IF NOT EXISTS hr_public.employee_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES hr_public.users(id) ON DELETE CASCADE,
  skill_name VARCHAR(255) NOT NULL,
  proficiency_level INTEGER CHECK (proficiency_level BETWEEN 1 AND 5),
  endorsed_by UUID[],
  years_experience INTEGER CHECK (years_experience >= 0),
  last_used_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, skill_name)
);

COMMENT ON TABLE hr_public.employee_skills IS
'Employee skills tracking with proficiency levels and endorsements';

COMMENT ON COLUMN hr_public.employee_skills.proficiency_level IS
'Skill proficiency level (1-5 scale): 1=Beginner, 2=Intermediate, 3=Proficient, 4=Advanced, 5=Expert';

COMMENT ON COLUMN hr_public.employee_skills.endorsed_by IS
'Array of user IDs who have endorsed this skill';

-- ========================================
-- Create indexes
-- ========================================

CREATE INDEX IF NOT EXISTS idx_employee_skills_user_id
ON hr_public.employee_skills(user_id);

CREATE INDEX IF NOT EXISTS idx_employee_skills_skill_name
ON hr_public.employee_skills USING GIN (to_tsvector('english', skill_name));

CREATE INDEX IF NOT EXISTS idx_employee_skills_proficiency
ON hr_public.employee_skills(proficiency_level DESC);

-- ========================================
-- Create updated_at trigger
-- ========================================

CREATE OR REPLACE FUNCTION hr_public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_employee_skills_updated_at ON hr_public.employee_skills;
CREATE TRIGGER update_employee_skills_updated_at
BEFORE UPDATE ON hr_public.employee_skills
FOR EACH ROW EXECUTE FUNCTION hr_public.update_updated_at_column();

-- ========================================
-- RLS policies
-- ========================================

ALTER TABLE hr_public.employee_skills ENABLE ROW LEVEL SECURITY;

-- All users can view skills
CREATE POLICY employee_skills_select ON hr_public.employee_skills
FOR SELECT USING (true);

-- Users can only insert their own skills
CREATE POLICY employee_skills_insert ON hr_public.employee_skills
FOR INSERT WITH CHECK (user_id = current_setting('jwt.claims.user_id', true)::UUID);

-- Users can only update their own skills
CREATE POLICY employee_skills_update ON hr_public.employee_skills
FOR UPDATE USING (user_id = current_setting('jwt.claims.user_id', true)::UUID);

-- Users can only delete their own skills
CREATE POLICY employee_skills_delete ON hr_public.employee_skills
FOR DELETE USING (user_id = current_setting('jwt.claims.user_id', true)::UUID);

-- Update table statistics
ANALYZE hr_public.employee_skills;

COMMIT;
