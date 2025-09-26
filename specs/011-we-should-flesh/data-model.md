# Data Model: Complete Sidebar Page Implementation

**Feature**: Complete Sidebar Page Implementation
**Created**: 2025-09-24
**Schema**: PostgreSQL with Row-Level Security (hr_public schema)

## Entity Overview

This document defines the data model for implementing the missing sidebar pages in the SvelteHR management system. The entities leverage existing PostgreSQL tables via PostGraphile auto-generated GraphQL schema.

## Core Entities

### 1. Leave Request

**Purpose**: Employee leave applications with manager approval workflow

```sql
-- Extends existing hr_public.leave_requests table
TABLE hr_public.leave_requests {
  id: UUID PRIMARY KEY DEFAULT gen_random_uuid()
  employee_id: UUID NOT NULL REFERENCES hr_public.employees(id)
  manager_id: UUID REFERENCES hr_public.employees(id)
  leave_type: VARCHAR(50) NOT NULL -- 'annual', 'sick', 'personal', 'maternity', 'paternity'
  start_date: DATE NOT NULL
  end_date: DATE NOT NULL
  days_requested: INTEGER NOT NULL
  reason: TEXT
  status: VARCHAR(20) DEFAULT 'pending' -- 'pending', 'approved', 'denied', 'cancelled'
  manager_comments: TEXT
  approved_at: TIMESTAMPTZ
  created_at: TIMESTAMPTZ DEFAULT NOW()
  updated_at: TIMESTAMPTZ DEFAULT NOW()
}
```

**Validation Rules**:

- `start_date` must be <= `end_date`
- `days_requested` must match calculated business days between dates
- `employee_id` cannot equal `manager_id`
- Status transitions: pending → approved/denied, approved/denied → cancelled (by employee)

**Relationships**:

- `employee_id` → `hr_public.employees` (many-to-one)
- `manager_id` → `hr_public.employees` (many-to-one)

### 2. Performance Review

**Purpose**: Structured performance evaluations with ratings and goals

```sql
-- Extends existing hr_public.performance_reviews table
TABLE hr_public.performance_reviews {
  id: UUID PRIMARY KEY DEFAULT gen_random_uuid()
  employee_id: UUID NOT NULL REFERENCES hr_public.employees(id)
  reviewer_id: UUID NOT NULL REFERENCES hr_public.employees(id)
  review_period_start: DATE NOT NULL
  review_period_end: DATE NOT NULL
  status: VARCHAR(20) DEFAULT 'draft' -- 'draft', 'in_progress', 'completed', 'submitted'
  overall_rating: INTEGER CHECK (overall_rating BETWEEN 1 AND 5)
  goals_achievement: INTEGER CHECK (goals_achievement BETWEEN 1 AND 5)
  collaboration: INTEGER CHECK (collaboration BETWEEN 1 AND 5)
  communication: INTEGER CHECK (communication BETWEEN 1 AND 5)
  leadership: INTEGER CHECK (leadership BETWEEN 1 AND 5)
  strengths: TEXT
  areas_for_improvement: TEXT
  goals_for_next_period: TEXT
  employee_comments: TEXT
  development_plan: TEXT
  submitted_at: TIMESTAMPTZ
  created_at: TIMESTAMPTZ DEFAULT NOW()
  updated_at: TIMESTAMPTZ DEFAULT NOW()
}
```

**Validation Rules**:

- All rating fields must be 1-5 scale
- `review_period_start` must be < `review_period_end`
- Cannot submit review without overall_rating
- Only reviewer or employee can modify (RLS policies)

**State Transitions**:

- draft → in_progress → completed → submitted

### 3. Team Goal/OKR

**Purpose**: Measurable team objectives with key results tracking

```sql
-- New table hr_public.team_goals
TABLE hr_public.team_goals {
  id: UUID PRIMARY KEY DEFAULT gen_random_uuid()
  title: VARCHAR(200) NOT NULL
  description: TEXT
  team_id: UUID REFERENCES hr_public.departments(id)
  owner_id: UUID NOT NULL REFERENCES hr_public.employees(id) -- Team lead/manager
  goal_type: VARCHAR(20) DEFAULT 'okr' -- 'okr', 'kpi', 'project'
  status: VARCHAR(20) DEFAULT 'active' -- 'draft', 'active', 'completed', 'cancelled'
  priority: VARCHAR(10) DEFAULT 'medium' -- 'high', 'medium', 'low'
  target_value: DECIMAL(10,2)
  current_value: DECIMAL(10,2) DEFAULT 0
  unit: VARCHAR(50) -- '%', 'count', 'hours', 'revenue', etc.
  start_date: DATE NOT NULL
  target_date: DATE NOT NULL
  completion_percentage: INTEGER DEFAULT 0 CHECK (completion_percentage BETWEEN 0 AND 100)
  created_at: TIMESTAMPTZ DEFAULT NOW()
  updated_at: TIMESTAMPTZ DEFAULT NOW()
}
```

**Key Results** (One-to-many relationship):

```sql
TABLE hr_public.goal_key_results {
  id: UUID PRIMARY KEY DEFAULT gen_random_uuid()
  goal_id: UUID NOT NULL REFERENCES hr_public.team_goals(id) ON DELETE CASCADE
  title: VARCHAR(200) NOT NULL
  description: TEXT
  target_value: DECIMAL(10,2) NOT NULL
  current_value: DECIMAL(10,2) DEFAULT 0
  unit: VARCHAR(50)
  weight: INTEGER DEFAULT 25 CHECK (weight BETWEEN 1 AND 100) -- Contribution to goal %
  status: VARCHAR(20) DEFAULT 'active'
  created_at: TIMESTAMPTZ DEFAULT NOW()
  updated_at: TIMESTAMPTZ DEFAULT NOW()
}
```

### 4. Team Report

**Purpose**: Generated analytics and performance metrics

```sql
-- New table hr_public.team_reports
TABLE hr_public.team_reports {
  id: UUID PRIMARY KEY DEFAULT gen_random_uuid()
  title: VARCHAR(200) NOT NULL
  report_type: VARCHAR(50) NOT NULL -- 'attendance', 'performance', 'goals', 'productivity'
  team_id: UUID REFERENCES hr_public.departments(id)
  generated_by: UUID NOT NULL REFERENCES hr_public.employees(id)
  date_from: DATE NOT NULL
  date_to: DATE NOT NULL
  parameters: JSONB -- Filter/grouping parameters
  data: JSONB NOT NULL -- Report results/metrics
  summary: TEXT -- Executive summary
  status: VARCHAR(20) DEFAULT 'completed' -- 'generating', 'completed', 'failed'
  is_scheduled: BOOLEAN DEFAULT FALSE
  schedule_cron: VARCHAR(50) -- For recurring reports
  created_at: TIMESTAMPTZ DEFAULT NOW()
  updated_at: TIMESTAMPTZ DEFAULT NOW()
}
```

**Report Data Structure** (JSONB examples):

```json
{
	"metrics": {
		"total_employees": 25,
		"attendance_rate": 94.5,
		"goals_completed": 12,
		"avg_performance_rating": 4.2
	},
	"breakdown": [
		{ "period": "2025-01", "attendance": 96.2, "goals": 3 },
		{ "period": "2025-02", "attendance": 92.8, "goals": 4 }
	],
	"top_performers": [{ "employee_id": "uuid", "name": "John Doe", "score": 4.8 }]
}
```

### 5. Approval Workflow

**Purpose**: Track approval processes across different entity types

```sql
-- New table hr_public.approval_workflows
TABLE hr_public.approval_workflows {
  id: UUID PRIMARY KEY DEFAULT gen_random_uuid()
  entity_type: VARCHAR(50) NOT NULL -- 'leave_request', 'performance_review', 'goal'
  entity_id: UUID NOT NULL -- Foreign key to specific entity
  requester_id: UUID NOT NULL REFERENCES hr_public.employees(id)
  approver_id: UUID NOT NULL REFERENCES hr_public.employees(id)
  status: VARCHAR(20) DEFAULT 'pending' -- 'pending', 'approved', 'denied', 'escalated'
  priority: VARCHAR(10) DEFAULT 'normal' -- 'low', 'normal', 'high', 'urgent'
  request_data: JSONB -- Snapshot of entity at request time
  approver_notes: TEXT
  auto_approve: BOOLEAN DEFAULT FALSE
  escalation_level: INTEGER DEFAULT 0
  escalated_to: UUID REFERENCES hr_public.employees(id)
  deadline: TIMESTAMPTZ
  approved_at: TIMESTAMPTZ
  created_at: TIMESTAMPTZ DEFAULT NOW()
  updated_at: TIMESTAMPTZ DEFAULT NOW()
}
```

### 6. Audit Entry

**Purpose**: Compliance logging for all data modifications

```sql
-- Extends existing hr_public.audit_logs table
TABLE hr_public.audit_logs {
  id: UUID PRIMARY KEY DEFAULT gen_random_uuid()
  table_name: VARCHAR(50) NOT NULL
  record_id: UUID NOT NULL
  action: VARCHAR(20) NOT NULL -- 'INSERT', 'UPDATE', 'DELETE', 'SELECT' (sensitive)
  user_id: UUID REFERENCES hr_public.users(id)
  role: VARCHAR(50) -- Role at time of action
  old_values: JSONB
  new_values: JSONB
  changed_fields: VARCHAR[] -- Array of modified column names
  ip_address: INET
  user_agent: TEXT
  session_id: VARCHAR(100)
  metadata: JSONB -- Additional context (page, feature, etc.)
  created_at: TIMESTAMPTZ DEFAULT NOW()
}
```

## Indexes and Performance

```sql
-- Performance indexes
CREATE INDEX idx_leave_requests_employee_status ON hr_public.leave_requests(employee_id, status);
CREATE INDEX idx_leave_requests_manager_status ON hr_public.leave_requests(manager_id, status);
CREATE INDEX idx_performance_reviews_employee_period ON hr_public.performance_reviews(employee_id, review_period_end);
CREATE INDEX idx_team_goals_team_status ON hr_public.team_goals(team_id, status);
CREATE INDEX idx_team_reports_type_date ON hr_public.team_reports(report_type, date_to);
CREATE INDEX idx_approval_workflows_approver_status ON hr_public.approval_workflows(approver_id, status);
CREATE INDEX idx_audit_logs_table_record ON hr_public.audit_logs(table_name, record_id);
CREATE INDEX idx_audit_logs_user_created ON hr_public.audit_logs(user_id, created_at);
```

## Row-Level Security Policies

```sql
-- Leave Requests: Users can see their own + managers can see their team's
ALTER TABLE hr_public.leave_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY leave_requests_access ON hr_public.leave_requests
  FOR ALL TO hr_authenticated
  USING (
    employee_id = current_user_id() OR
    manager_id = current_user_id() OR
    has_role('hr_admin') OR
    has_role('admin')
  );

-- Performance Reviews: Employee + reviewer + HR access
ALTER TABLE hr_public.performance_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY performance_reviews_access ON hr_public.performance_reviews
  FOR ALL TO hr_authenticated
  USING (
    employee_id = current_user_id() OR
    reviewer_id = current_user_id() OR
    has_role('hr_admin') OR
    has_role('admin')
  );

-- Team Goals: Team members + managers + goal owners
ALTER TABLE hr_public.team_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY team_goals_access ON hr_public.team_goals
  FOR ALL TO hr_authenticated
  USING (
    owner_id = current_user_id() OR
    team_id IN (SELECT department_id FROM hr_public.employees WHERE user_id = current_user_id()) OR
    has_role('manager') OR
    has_role('hr_admin') OR
    has_role('admin')
  );
```

## GraphQL Schema Integration

PostGraphile will automatically generate the following GraphQL types and operations:

**Queries**:

- `leaveRequests`, `leaveRequest(id: UUID!)`
- `performanceReviews`, `performanceReview(id: UUID!)`
- `teamGoals`, `teamGoal(id: UUID!)`
- `teamReports`, `teamReport(id: UUID!)`

**Mutations**:

- `createLeaveRequest`, `updateLeaveRequest`, `deleteLeaveRequest`
- `createPerformanceReview`, `updatePerformanceReview`
- `createTeamGoal`, `updateTeamGoal`
- `approveLeaveRequest`, `denyLeaveRequest`

**Relationships** (Auto-generated):

- `LeaveRequest.employee`, `LeaveRequest.manager`
- `PerformanceReview.employee`, `PerformanceReview.reviewer`
- `TeamGoal.team`, `TeamGoal.owner`, `TeamGoal.keyResults`

This data model provides comprehensive support for all missing sidebar pages while maintaining consistency with existing SvelteHR patterns and PostgreSQL best practices.
