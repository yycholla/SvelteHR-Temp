-- Migration: Create testing framework entities for comprehensive test validation
-- Created: 2025-09-24
-- Task: T004 - Initialize test database schema for testing framework entities

-- Create test_scenarios table for user journey validation
CREATE TABLE IF NOT EXISTS hr_public.test_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  scenario_type VARCHAR(50) NOT NULL CHECK (scenario_type IN (
    'unit', 'integration', 'e2e', 'performance', 'accessibility', 'security', 'regression'
  )),
  category VARCHAR(50) NOT NULL CHECK (category IN (
    'authentication', 'employee_management', 'leave_requests', 'performance_reviews',
    'team_goals', 'reporting', 'navigation', 'collaboration', 'data_validation'
  )),
  priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('draft', 'active', 'deprecated', 'archived')),

  -- Test configuration
  test_data JSONB, -- Test input data and expectations
  expected_outcome JSONB, -- Expected results and success criteria
  prerequisites JSONB, -- Setup requirements and dependencies
  cleanup_steps JSONB, -- Teardown and cleanup instructions

  -- Execution tracking
  execution_count INTEGER DEFAULT 0,
  success_rate DECIMAL(5,2) DEFAULT 0.00 CHECK (success_rate BETWEEN 0.00 AND 100.00),
  avg_execution_time DECIMAL(10,3), -- Average execution time in milliseconds
  last_executed_at TIMESTAMPTZ,
  last_execution_result VARCHAR(20) CHECK (last_execution_result IN ('pass', 'fail', 'skip', 'error')),

  -- Metadata
  created_by UUID NOT NULL REFERENCES hr_public.users(id) ON DELETE RESTRICT,
  assigned_to UUID REFERENCES hr_public.users(id) ON DELETE SET NULL,
  tags TEXT[], -- Array of tags for organization
  environment VARCHAR(50) DEFAULT 'test' CHECK (environment IN ('dev', 'test', 'staging', 'prod')),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Business constraints
  CONSTRAINT valid_execution_count CHECK (execution_count >= 0),
  CONSTRAINT valid_avg_execution_time CHECK (avg_execution_time IS NULL OR avg_execution_time > 0)
);

-- Create graphql_operations table for GraphQL operation best practices tracking
CREATE TABLE IF NOT EXISTS hr_public.graphql_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_name VARCHAR(200) NOT NULL,
  operation_type VARCHAR(20) NOT NULL CHECK (operation_type IN ('query', 'mutation', 'subscription')),
  module VARCHAR(100) NOT NULL, -- Module/feature area (e.g., 'employee_management', 'leave_requests')

  -- Operation definition
  operation_definition TEXT NOT NULL, -- GraphQL operation string
  variables_schema JSONB, -- JSON schema for required variables
  response_schema JSONB, -- Expected response structure

  -- Performance and quality metrics
  complexity_score INTEGER DEFAULT 0 CHECK (complexity_score >= 0), -- Query complexity analysis
  avg_response_time DECIMAL(10,3), -- Average response time in milliseconds
  error_rate DECIMAL(5,2) DEFAULT 0.00 CHECK (error_rate BETWEEN 0.00 AND 100.00),
  cache_hit_rate DECIMAL(5,2) DEFAULT 0.00 CHECK (cache_hit_rate BETWEEN 0.00 AND 100.00),

  -- Usage statistics
  usage_count INTEGER DEFAULT 0 CHECK (usage_count >= 0),
  last_used_at TIMESTAMPTZ,

  -- Best practices validation
  follows_naming_conventions BOOLEAN DEFAULT TRUE,
  has_proper_error_handling BOOLEAN DEFAULT TRUE,
  includes_field_selection BOOLEAN DEFAULT TRUE,
  uses_variables_properly BOOLEAN DEFAULT TRUE,
  has_rate_limiting BOOLEAN DEFAULT FALSE,

  -- Security and permissions
  requires_authentication BOOLEAN DEFAULT TRUE,
  required_permissions TEXT[], -- Array of required permissions
  rbac_level INTEGER DEFAULT 20 CHECK (rbac_level IN (20, 60, 80, 100)), -- Employee=20, Manager=60, HR=80, Admin=100

  -- Documentation
  description TEXT,
  usage_examples JSONB, -- Example usage patterns
  related_operations UUID[], -- Array of related operation IDs

  created_by UUID NOT NULL REFERENCES hr_public.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create navigation_flows table for UI navigation pattern validation
CREATE TABLE IF NOT EXISTS hr_public.navigation_flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_name VARCHAR(200) NOT NULL,
  description TEXT,
  flow_type VARCHAR(50) NOT NULL CHECK (flow_type IN (
    'user_journey', 'feature_workflow', 'error_handling', 'accessibility', 'mobile_responsive'
  )),

  -- Flow definition
  start_route VARCHAR(255) NOT NULL,
  steps JSONB NOT NULL, -- Array of navigation steps with actions and validations
  expected_end_state JSONB, -- Expected final state after flow completion

  -- Flow categorization
  user_role VARCHAR(50) DEFAULT 'employee' CHECK (user_role IN ('admin', 'hr_manager', 'manager', 'employee')),
  feature_area VARCHAR(100) NOT NULL, -- Feature module this flow tests
  complexity VARCHAR(20) DEFAULT 'medium' CHECK (complexity IN ('simple', 'medium', 'complex')),

  -- Validation metrics
  success_rate DECIMAL(5,2) DEFAULT 0.00 CHECK (success_rate BETWEEN 0.00 AND 100.00),
  avg_completion_time DECIMAL(10,3), -- Average time to complete flow in milliseconds
  execution_count INTEGER DEFAULT 0 CHECK (execution_count >= 0),

  -- Accessibility and usability
  accessibility_score INTEGER CHECK (accessibility_score BETWEEN 0 AND 100),
  usability_score INTEGER CHECK (usability_score BETWEEN 0 AND 100),
  mobile_compatibility_score INTEGER CHECK (mobile_compatibility_score BETWEEN 0 AND 100),

  -- Flow status
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('draft', 'active', 'deprecated', 'broken')),
  last_validated_at TIMESTAMPTZ,
  validation_result VARCHAR(20) CHECK (validation_result IN ('pass', 'fail', 'warning', 'skip')),

  -- Dependencies and prerequisites
  prerequisites JSONB, -- Required setup before flow execution
  browser_requirements JSONB, -- Browser compatibility requirements
  device_requirements JSONB, -- Device/screen size requirements

  created_by UUID NOT NULL REFERENCES hr_public.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create performance_metrics table for performance measurement and monitoring
CREATE TABLE IF NOT EXISTS hr_public.performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name VARCHAR(200) NOT NULL,
  metric_type VARCHAR(50) NOT NULL CHECK (metric_type IN (
    'page_load', 'api_response', 'database_query', 'memory_usage', 'cpu_usage',
    'network_latency', 'bundle_size', 'lighthouse_score', 'core_web_vitals'
  )),
  category VARCHAR(100) NOT NULL, -- Feature or page category

  -- Metric measurements
  value DECIMAL(15,6) NOT NULL,
  unit VARCHAR(50) NOT NULL, -- ms, mb, kb, percentage, score, etc.
  baseline_value DECIMAL(15,6), -- Baseline for comparison
  threshold_warning DECIMAL(15,6), -- Warning threshold
  threshold_critical DECIMAL(15,6), -- Critical threshold

  -- Performance context
  measurement_context JSONB, -- Browser, device, network conditions, etc.
  test_environment VARCHAR(50) DEFAULT 'test' CHECK (test_environment IN ('dev', 'test', 'staging', 'prod')),
  user_agent TEXT,
  network_conditions VARCHAR(50), -- 'fast_3g', 'slow_3g', 'offline', etc.
  device_type VARCHAR(50), -- 'desktop', 'mobile', 'tablet'

  -- Comparative analysis
  previous_value DECIMAL(15,6), -- Previous measurement for trend analysis
  performance_trend VARCHAR(20) CHECK (performance_trend IN ('improving', 'stable', 'degrading')),
  percentage_change DECIMAL(8,2), -- Percentage change from previous measurement

  -- Alert and monitoring
  status VARCHAR(20) DEFAULT 'normal' CHECK (status IN ('normal', 'warning', 'critical')),
  alert_triggered BOOLEAN DEFAULT FALSE,
  alert_acknowledged_at TIMESTAMPTZ,
  alert_acknowledged_by UUID REFERENCES hr_public.users(id) ON DELETE SET NULL,

  -- Measurement metadata
  measured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  measured_by UUID REFERENCES hr_public.users(id) ON DELETE SET NULL, -- NULL for automated measurements
  measurement_source VARCHAR(100), -- 'playwright', 'lighthouse', 'custom_monitor', etc.
  related_test_scenario UUID REFERENCES hr_public.test_scenarios(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create collaboration_sessions table for real-time collaboration tracking
CREATE TABLE IF NOT EXISTS hr_public.collaboration_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_name VARCHAR(200),
  session_type VARCHAR(50) NOT NULL CHECK (session_type IN (
    'code_review', 'pair_programming', 'testing_session', 'bug_triage',
    'planning_meeting', 'design_review', 'performance_analysis'
  )),

  -- Session details
  description TEXT,
  feature_area VARCHAR(100), -- Feature being worked on
  repository_branch VARCHAR(255), -- Git branch if applicable

  -- Participants
  host_user_id UUID NOT NULL REFERENCES hr_public.users(id) ON DELETE RESTRICT,
  participants JSONB NOT NULL, -- Array of participant user IDs and roles
  max_participants INTEGER DEFAULT 10 CHECK (max_participants > 0),

  -- Session state
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('scheduled', 'active', 'paused', 'completed', 'cancelled')),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration_minutes INTEGER, -- Calculated duration

  -- Collaboration data
  shared_resources JSONB, -- URLs, documents, code snippets shared
  decisions_made JSONB, -- Key decisions and outcomes
  action_items JSONB, -- Follow-up tasks and assignments
  meeting_notes TEXT,

  -- Real-time features
  active_participants INTEGER DEFAULT 0 CHECK (active_participants >= 0),
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  screen_sharing_active BOOLEAN DEFAULT FALSE,
  voice_chat_active BOOLEAN DEFAULT FALSE,

  -- Privacy and security
  is_public BOOLEAN DEFAULT FALSE,
  recording_enabled BOOLEAN DEFAULT FALSE,
  recording_url TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Business constraints
  CONSTRAINT valid_session_duration CHECK (
    (started_at IS NULL AND ended_at IS NULL) OR
    (started_at IS NOT NULL AND ended_at IS NULL) OR
    (started_at IS NOT NULL AND ended_at IS NOT NULL AND started_at <= ended_at)
  )
);

-- Create validation_results table for test execution results and outcomes
CREATE TABLE IF NOT EXISTS hr_public.validation_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_scenario_id UUID NOT NULL REFERENCES hr_public.test_scenarios(id) ON DELETE CASCADE,

  -- Execution details
  execution_id VARCHAR(255) NOT NULL, -- Unique execution identifier (can be external)
  execution_type VARCHAR(50) NOT NULL CHECK (execution_type IN (
    'manual', 'automated', 'ci_cd', 'scheduled', 'on_demand'
  )),

  -- Test results
  result VARCHAR(20) NOT NULL CHECK (result IN ('pass', 'fail', 'skip', 'error', 'timeout')),
  success BOOLEAN GENERATED ALWAYS AS (result = 'pass') STORED,

  -- Execution metrics
  execution_time DECIMAL(10,3) NOT NULL CHECK (execution_time > 0), -- Execution time in milliseconds
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,

  -- Detailed results
  test_output TEXT, -- Raw test output/logs
  error_message TEXT, -- Error details if failed
  stack_trace TEXT, -- Stack trace for errors
  screenshots JSONB, -- Array of screenshot URLs/paths
  video_recording TEXT, -- Video recording URL/path if available

  -- Test environment
  environment VARCHAR(50) NOT NULL CHECK (environment IN ('dev', 'test', 'staging', 'prod')),
  browser VARCHAR(50), -- Browser used for web tests
  browser_version VARCHAR(50),
  operating_system VARCHAR(50),
  device_info JSONB, -- Device specifications for mobile tests

  -- Metrics and analysis
  assertions_total INTEGER DEFAULT 0 CHECK (assertions_total >= 0),
  assertions_passed INTEGER DEFAULT 0 CHECK (assertions_passed >= 0),
  assertions_failed INTEGER DEFAULT 0 CHECK (assertions_failed >= 0),
  coverage_percentage DECIMAL(5,2) CHECK (coverage_percentage BETWEEN 0.00 AND 100.00),

  -- CI/CD integration
  build_number VARCHAR(100), -- Build/deployment identifier
  commit_hash VARCHAR(255), -- Git commit hash
  branch_name VARCHAR(255), -- Git branch name
  pull_request_id VARCHAR(100), -- PR/MR identifier

  -- Analysis and reporting
  regression_detected BOOLEAN DEFAULT FALSE,
  performance_regression BOOLEAN DEFAULT FALSE,
  flaky_test_indicator BOOLEAN DEFAULT FALSE,
  retry_count INTEGER DEFAULT 0 CHECK (retry_count >= 0),

  -- Execution context
  executed_by UUID REFERENCES hr_public.users(id) ON DELETE SET NULL, -- NULL for automated runs
  execution_trigger VARCHAR(100), -- What triggered this execution
  related_collaboration_session UUID REFERENCES hr_public.collaboration_sessions(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Business constraints
  CONSTRAINT valid_execution_time_range CHECK (start_time <= end_time),
  CONSTRAINT valid_assertions CHECK (assertions_passed + assertions_failed <= assertions_total),
  CONSTRAINT consistent_result_success CHECK (
    (result = 'pass' AND (assertions_failed = 0 OR assertions_total = 0)) OR
    (result != 'pass')
  )
);

-- Create performance indexes for optimal query performance
CREATE INDEX IF NOT EXISTS idx_test_scenarios_type_status ON hr_public.test_scenarios(scenario_type, status);
CREATE INDEX IF NOT EXISTS idx_test_scenarios_category_priority ON hr_public.test_scenarios(category, priority);
CREATE INDEX IF NOT EXISTS idx_test_scenarios_created_by ON hr_public.test_scenarios(created_by);
CREATE INDEX IF NOT EXISTS idx_test_scenarios_assigned_to ON hr_public.test_scenarios(assigned_to);
CREATE INDEX IF NOT EXISTS idx_test_scenarios_last_executed ON hr_public.test_scenarios(last_executed_at);
CREATE INDEX IF NOT EXISTS idx_test_scenarios_tags ON hr_public.test_scenarios USING GIN(tags);

CREATE INDEX IF NOT EXISTS idx_graphql_operations_type_module ON hr_public.graphql_operations(operation_type, module);
CREATE INDEX IF NOT EXISTS idx_graphql_operations_rbac_level ON hr_public.graphql_operations(rbac_level);
CREATE INDEX IF NOT EXISTS idx_graphql_operations_usage_count ON hr_public.graphql_operations(usage_count DESC);
CREATE INDEX IF NOT EXISTS idx_graphql_operations_performance ON hr_public.graphql_operations(avg_response_time, error_rate);
CREATE INDEX IF NOT EXISTS idx_graphql_operations_permissions ON hr_public.graphql_operations USING GIN(required_permissions);

CREATE INDEX IF NOT EXISTS idx_navigation_flows_type_role ON hr_public.navigation_flows(flow_type, user_role);
CREATE INDEX IF NOT EXISTS idx_navigation_flows_feature_area ON hr_public.navigation_flows(feature_area);
CREATE INDEX IF NOT EXISTS idx_navigation_flows_status ON hr_public.navigation_flows(status);
CREATE INDEX IF NOT EXISTS idx_navigation_flows_success_rate ON hr_public.navigation_flows(success_rate DESC);

CREATE INDEX IF NOT EXISTS idx_performance_metrics_type_category ON hr_public.performance_metrics(metric_type, category);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_status ON hr_public.performance_metrics(status);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_measured_at ON hr_public.performance_metrics(measured_at);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_environment ON hr_public.performance_metrics(test_environment);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_trend ON hr_public.performance_metrics(performance_trend);

CREATE INDEX IF NOT EXISTS idx_collaboration_sessions_host ON hr_public.collaboration_sessions(host_user_id);
CREATE INDEX IF NOT EXISTS idx_collaboration_sessions_status ON hr_public.collaboration_sessions(status);
CREATE INDEX IF NOT EXISTS idx_collaboration_sessions_type_area ON hr_public.collaboration_sessions(session_type, feature_area);
CREATE INDEX IF NOT EXISTS idx_collaboration_sessions_activity ON hr_public.collaboration_sessions(last_activity_at);

CREATE INDEX IF NOT EXISTS idx_validation_results_scenario ON hr_public.validation_results(test_scenario_id);
CREATE INDEX IF NOT EXISTS idx_validation_results_execution_type ON hr_public.validation_results(execution_type, result);
CREATE INDEX IF NOT EXISTS idx_validation_results_environment ON hr_public.validation_results(environment);
CREATE INDEX IF NOT EXISTS idx_validation_results_time_range ON hr_public.validation_results(start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_validation_results_build_commit ON hr_public.validation_results(build_number, commit_hash);
CREATE INDEX IF NOT EXISTS idx_validation_results_regression ON hr_public.validation_results(regression_detected, performance_regression);

-- Create updated_at triggers for timestamp management
DO $$
BEGIN
    -- Check if the update_updated_at_column function exists
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
        CREATE OR REPLACE FUNCTION hr_public.update_updated_at_column()
        RETURNS TRIGGER AS $func$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $func$ LANGUAGE plpgsql;
    END IF;

    -- Create triggers for tables with updated_at columns
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_test_scenarios_updated_at') THEN
        CREATE TRIGGER trigger_test_scenarios_updated_at
            BEFORE UPDATE ON hr_public.test_scenarios
            FOR EACH ROW
            EXECUTE FUNCTION hr_public.update_updated_at_column();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_graphql_operations_updated_at') THEN
        CREATE TRIGGER trigger_graphql_operations_updated_at
            BEFORE UPDATE ON hr_public.graphql_operations
            FOR EACH ROW
            EXECUTE FUNCTION hr_public.update_updated_at_column();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_navigation_flows_updated_at') THEN
        CREATE TRIGGER trigger_navigation_flows_updated_at
            BEFORE UPDATE ON hr_public.navigation_flows
            FOR EACH ROW
            EXECUTE FUNCTION hr_public.update_updated_at_column();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_collaboration_sessions_updated_at') THEN
        CREATE TRIGGER trigger_collaboration_sessions_updated_at
            BEFORE UPDATE ON hr_public.collaboration_sessions
            FOR EACH ROW
            EXECUTE FUNCTION hr_public.update_updated_at_column();
    END IF;
END $$;

-- Enable Row-Level Security on all testing framework tables
ALTER TABLE hr_public.test_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_public.graphql_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_public.navigation_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_public.performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_public.collaboration_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_public.validation_results ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for test_scenarios
-- Admin (100) and HR (80) can access all, Manager (60) can access team-related, Employee (20) can access assigned
CREATE POLICY test_scenarios_admin_access ON hr_public.test_scenarios
  FOR ALL TO hr_admin, hr_super_admin
  USING (true);

CREATE POLICY test_scenarios_hr_access ON hr_public.test_scenarios
  FOR ALL TO hr_manager
  USING (true);

CREATE POLICY test_scenarios_manager_access ON hr_public.test_scenarios
  FOR ALL TO hr_manager
  USING (
    created_by = (current_setting('jwt.claims.user_id', true))::uuid OR
    assigned_to = (current_setting('jwt.claims.user_id', true))::uuid OR
    category IN ('employee_management', 'leave_requests', 'performance_reviews', 'team_goals')
  );

CREATE POLICY test_scenarios_employee_access ON hr_public.test_scenarios
  FOR SELECT TO hr_employee
  USING (
    assigned_to = (current_setting('jwt.claims.user_id', true))::uuid OR
    created_by = (current_setting('jwt.claims.user_id', true))::uuid
  );

-- Create RLS policies for graphql_operations
CREATE POLICY graphql_operations_rbac_access ON hr_public.graphql_operations
  FOR ALL TO hr_admin, hr_manager, hr_employee, hr_super_admin
  USING (
    current_setting('jwt.claims.role', true) IN ('hr_super_admin', 'hr_admin') OR
    (current_setting('jwt.claims.role', true) = 'hr_manager' AND rbac_level <= 80) OR
    (current_setting('jwt.claims.role', true) = 'hr_employee' AND rbac_level <= 60) OR
    created_by = (current_setting('jwt.claims.user_id', true))::uuid
  );

-- Create RLS policies for navigation_flows
CREATE POLICY navigation_flows_role_based_access ON hr_public.navigation_flows
  FOR ALL TO hr_admin, hr_manager, hr_employee, hr_super_admin
  USING (
    current_setting('jwt.claims.role', true) IN ('hr_super_admin', 'hr_admin') OR
    (current_setting('jwt.claims.role', true) = 'hr_manager' AND user_role IN ('manager', 'employee', 'hr_manager')) OR
    (current_setting('jwt.claims.role', true) = 'hr_employee' AND user_role = 'employee') OR
    created_by = (current_setting('jwt.claims.user_id', true))::uuid
  );

-- Create RLS policies for performance_metrics
CREATE POLICY performance_metrics_access ON hr_public.performance_metrics
  FOR ALL TO hr_admin, hr_manager, hr_employee, hr_super_admin
  USING (
    current_setting('jwt.claims.role', true) IN ('hr_super_admin', 'hr_admin', 'hr_manager') OR
    measured_by = (current_setting('jwt.claims.user_id', true))::uuid
  );

-- Create RLS policies for collaboration_sessions
CREATE POLICY collaboration_sessions_participant_access ON hr_public.collaboration_sessions
  FOR ALL TO hr_admin, hr_manager, hr_employee, hr_super_admin
  USING (
    host_user_id = (current_setting('jwt.claims.user_id', true))::uuid OR
    participants ? (current_setting('jwt.claims.user_id', true)) OR
    current_setting('jwt.claims.role', true) IN ('hr_super_admin', 'hr_admin') OR
    is_public = true
  );

-- Create RLS policies for validation_results
CREATE POLICY validation_results_scenario_based_access ON hr_public.validation_results
  FOR ALL TO hr_admin, hr_manager, hr_employee, hr_super_admin
  USING (
    test_scenario_id IN (
      SELECT id FROM hr_public.test_scenarios
      WHERE created_by = (current_setting('jwt.claims.user_id', true))::uuid
      OR assigned_to = (current_setting('jwt.claims.user_id', true))::uuid
      OR current_setting('jwt.claims.role', true) IN ('hr_super_admin', 'hr_admin', 'hr_manager')
    ) OR
    executed_by = (current_setting('jwt.claims.user_id', true))::uuid
  );

-- Grant appropriate permissions to roles
GRANT SELECT, INSERT, UPDATE, DELETE ON hr_public.test_scenarios TO hr_admin, hr_manager, hr_super_admin;
GRANT SELECT, INSERT ON hr_public.test_scenarios TO hr_employee;

GRANT SELECT, INSERT, UPDATE, DELETE ON hr_public.graphql_operations TO hr_admin, hr_manager, hr_super_admin;
GRANT SELECT ON hr_public.graphql_operations TO hr_employee;

GRANT SELECT, INSERT, UPDATE, DELETE ON hr_public.navigation_flows TO hr_admin, hr_manager, hr_super_admin;
GRANT SELECT ON hr_public.navigation_flows TO hr_employee;

GRANT SELECT, INSERT, UPDATE, DELETE ON hr_public.performance_metrics TO hr_admin, hr_manager, hr_super_admin;
GRANT SELECT, INSERT ON hr_public.performance_metrics TO hr_employee;

GRANT SELECT, INSERT, UPDATE, DELETE ON hr_public.collaboration_sessions TO hr_admin, hr_manager, hr_employee, hr_super_admin;

GRANT SELECT, INSERT, UPDATE, DELETE ON hr_public.validation_results TO hr_admin, hr_manager, hr_super_admin;
GRANT SELECT, INSERT ON hr_public.validation_results TO hr_employee;

-- Add comprehensive table and column comments for documentation
COMMENT ON TABLE hr_public.test_scenarios IS 'User journey validation scenarios with execution tracking and success metrics';
COMMENT ON COLUMN hr_public.test_scenarios.scenario_type IS 'Type of test: unit, integration, e2e, performance, accessibility, security, regression';
COMMENT ON COLUMN hr_public.test_scenarios.category IS 'Functional category: authentication, employee_management, leave_requests, etc.';
COMMENT ON COLUMN hr_public.test_scenarios.test_data IS 'JSON configuration for test inputs, mocks, and setup data';
COMMENT ON COLUMN hr_public.test_scenarios.expected_outcome IS 'JSON definition of expected results and success criteria';
COMMENT ON COLUMN hr_public.test_scenarios.success_rate IS 'Historical success rate percentage (0.00-100.00)';
COMMENT ON COLUMN hr_public.test_scenarios.tags IS 'Array of organizational tags for filtering and grouping';

COMMENT ON TABLE hr_public.graphql_operations IS 'GraphQL operation tracking for best practices and performance monitoring';
COMMENT ON COLUMN hr_public.graphql_operations.operation_definition IS 'Complete GraphQL operation string (query/mutation/subscription)';
COMMENT ON COLUMN hr_public.graphql_operations.complexity_score IS 'Query complexity analysis score for performance optimization';
COMMENT ON COLUMN hr_public.graphql_operations.rbac_level IS 'Required RBAC level: Employee=20, Manager=60, HR=80, Admin=100';
COMMENT ON COLUMN hr_public.graphql_operations.required_permissions IS 'Array of specific permissions required for operation execution';

COMMENT ON TABLE hr_public.navigation_flows IS 'UI navigation pattern validation with usability metrics';
COMMENT ON COLUMN hr_public.navigation_flows.steps IS 'JSON array defining navigation steps, actions, and validations';
COMMENT ON COLUMN hr_public.navigation_flows.accessibility_score IS 'Accessibility compliance score (0-100) based on WCAG guidelines';
COMMENT ON COLUMN hr_public.navigation_flows.mobile_compatibility_score IS 'Mobile responsiveness score (0-100)';

COMMENT ON TABLE hr_public.performance_metrics IS 'Performance measurement and monitoring with alerting thresholds';
COMMENT ON COLUMN hr_public.performance_metrics.metric_type IS 'Type of metric: page_load, api_response, database_query, memory_usage, etc.';
COMMENT ON COLUMN hr_public.performance_metrics.baseline_value IS 'Baseline measurement for regression detection';
COMMENT ON COLUMN hr_public.performance_metrics.measurement_context IS 'JSON context: browser, device, network conditions';
COMMENT ON COLUMN hr_public.performance_metrics.performance_trend IS 'Trend analysis: improving, stable, degrading';

COMMENT ON TABLE hr_public.collaboration_sessions IS 'Real-time collaboration tracking for development teams';
COMMENT ON COLUMN hr_public.collaboration_sessions.participants IS 'JSON array of participant user IDs and their roles';
COMMENT ON COLUMN hr_public.collaboration_sessions.shared_resources IS 'JSON array of shared URLs, documents, code snippets';
COMMENT ON COLUMN hr_public.collaboration_sessions.decisions_made IS 'JSON record of key decisions and outcomes';
COMMENT ON COLUMN hr_public.collaboration_sessions.action_items IS 'JSON array of follow-up tasks and assignments';

COMMENT ON TABLE hr_public.validation_results IS 'Test execution results with detailed metrics and CI/CD integration';
COMMENT ON COLUMN hr_public.validation_results.execution_id IS 'Unique identifier for test run (can reference external test systems)';
COMMENT ON COLUMN hr_public.validation_results.test_output IS 'Raw test execution output and logs';
COMMENT ON COLUMN hr_public.validation_results.screenshots IS 'JSON array of screenshot URLs/paths for visual validation';
COMMENT ON COLUMN hr_public.validation_results.device_info IS 'JSON device specifications for mobile/responsive testing';
COMMENT ON COLUMN hr_public.validation_results.flaky_test_indicator IS 'Flag indicating potential test flakiness for investigation';