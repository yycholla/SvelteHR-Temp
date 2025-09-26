-- Migration: Create team reports table for analytics and reporting
-- Created: 2025-09-24
-- Task: T004 - Team reports database migration

-- Create team_reports table in hr_public schema
CREATE TABLE IF NOT EXISTS hr_public.team_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  report_type VARCHAR(50) NOT NULL CHECK (report_type IN ('attendance', 'performance', 'goals', 'productivity', 'leave', 'custom')),
  team_id UUID REFERENCES hr_public.departments(id) ON DELETE CASCADE,
  generated_by UUID NOT NULL REFERENCES hr_public.users(id) ON DELETE RESTRICT,
  date_from DATE NOT NULL,
  date_to DATE NOT NULL,
  parameters JSONB, -- Filter/grouping parameters
  data JSONB NOT NULL, -- Report results/metrics
  summary TEXT, -- Executive summary
  status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('generating', 'completed', 'failed')),
  is_scheduled BOOLEAN DEFAULT FALSE,
  schedule_cron VARCHAR(50), -- For recurring reports
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Business logic constraints
  CONSTRAINT valid_report_dates CHECK (date_from <= date_to),
  CONSTRAINT scheduled_cron_check CHECK ((is_scheduled = TRUE AND schedule_cron IS NOT NULL) OR (is_scheduled = FALSE))
);

-- Create performance indexes
CREATE INDEX IF NOT EXISTS idx_team_reports_type_date ON hr_public.team_reports(report_type, date_to);
CREATE INDEX IF NOT EXISTS idx_team_reports_team_type ON hr_public.team_reports(team_id, report_type);
CREATE INDEX IF NOT EXISTS idx_team_reports_generated_by ON hr_public.team_reports(generated_by);
CREATE INDEX IF NOT EXISTS idx_team_reports_status_created ON hr_public.team_reports(status, created_at);
CREATE INDEX IF NOT EXISTS idx_team_reports_scheduled ON hr_public.team_reports(is_scheduled) WHERE is_scheduled = TRUE;
CREATE INDEX IF NOT EXISTS idx_team_reports_date_range ON hr_public.team_reports(date_from, date_to);

-- Create updated_at trigger
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_team_reports_updated_at') THEN
        CREATE TRIGGER trigger_team_reports_updated_at
            BEFORE UPDATE ON hr_public.team_reports
            FOR EACH ROW
            EXECUTE FUNCTION hr_public.update_updated_at_column();
    END IF;
END $$;

-- Enable Row-Level Security
ALTER TABLE hr_public.team_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Team members + managers + report generators + HR/Admin
CREATE POLICY team_reports_access ON hr_public.team_reports
  FOR ALL TO hr_admin, hr_manager, hr_employee, hr_super_admin
  USING (
    generated_by = (current_setting('jwt.claims.user_id', true))::uuid OR
    team_id IN (
      SELECT department_id
      FROM hr_public.users
      WHERE id = (current_setting('jwt.claims.user_id', true))::uuid
    ) OR
    current_setting('jwt.claims.role', true) IN ('hr_manager', 'hr_admin', 'hr_super_admin')
  );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON hr_public.team_reports TO hr_admin, hr_manager, hr_employee, hr_super_admin;

-- Add comments for documentation
COMMENT ON TABLE hr_public.team_reports IS 'Generated analytics and performance metrics reports';
COMMENT ON COLUMN hr_public.team_reports.report_type IS 'Type of report: attendance, performance, goals, productivity, leave, custom';
COMMENT ON COLUMN hr_public.team_reports.parameters IS 'JSON filter and grouping parameters used to generate the report';
COMMENT ON COLUMN hr_public.team_reports.data IS 'JSON report results including metrics, breakdowns, and visualizations';
COMMENT ON COLUMN hr_public.team_reports.status IS 'Report generation status: generating, completed, failed';
COMMENT ON COLUMN hr_public.team_reports.is_scheduled IS 'Whether this is a recurring scheduled report';
COMMENT ON COLUMN hr_public.team_reports.schedule_cron IS 'Cron expression for recurring report generation';