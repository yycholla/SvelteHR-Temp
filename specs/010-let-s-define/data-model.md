# Data Model: HR User Journeys System

**Feature**: Comprehensive HR User Journeys System
**Date**: 2025-01-25
**Schema Strategy**: Extend existing PostgreSQL schemas (hr_public, hr_private, hr_hidden)

## Schema Organization

### Existing Schemas (to extend)
- **hr_public**: User-accessible data with RLS policies
- **hr_private**: Internal system data, admin-only access
- **hr_hidden**: Audit logs, system metadata, never exposed via GraphQL

### Security Model
- Row-Level Security (RLS) policies enforce role-based access
- Hierarchical permissions: Employee ⊆ Manager ⊆ HR Admin ⊆ System Admin
- Audit triggers on all tables for compliance

## Core Entities

### 1. Users (Extend Existing)

**Table**: `hr_public.users`

**Extensions Needed**:
```sql
-- Add role hierarchy support
role_level INTEGER NOT NULL DEFAULT 20, -- 20=Employee, 60=Manager, 80=HR Admin, 100=System Admin
manager_id UUID REFERENCES hr_public.users(id),
department_id UUID REFERENCES hr_public.departments(id),
job_title VARCHAR(100),
hire_date DATE,
employment_status VARCHAR(20) DEFAULT 'active', -- active, inactive, terminated
work_location VARCHAR(100),
time_zone VARCHAR(50) DEFAULT 'UTC',

-- Employee details
employee_id VARCHAR(20) UNIQUE, -- Human-readable employee ID
emergency_contact_name VARCHAR(100),
emergency_contact_phone VARCHAR(20),
emergency_contact_relationship VARCHAR(50),

-- System preferences
notification_preferences JSONB DEFAULT '{}',
dashboard_preferences JSONB DEFAULT '{}',

-- Metadata
created_at TIMESTAMPTZ DEFAULT NOW(),
updated_at TIMESTAMPTZ DEFAULT NOW(),
created_by UUID REFERENCES hr_public.users(id),
updated_by UUID REFERENCES hr_public.users(id)
```

**Key Relationships**:
- Self-referencing manager hierarchy
- Department membership
- Audit trail for all changes

### 2. Departments (Extend Existing)

**Table**: `hr_public.departments`

**Extensions Needed**:
```sql
-- Hierarchy support
parent_department_id UUID REFERENCES hr_public.departments(id),
department_head_id UUID REFERENCES hr_public.users(id),
budget_code VARCHAR(20),
cost_center VARCHAR(20),

-- Department details
description TEXT,
location VARCHAR(100),
employee_count INTEGER DEFAULT 0, -- Calculated field
is_active BOOLEAN DEFAULT TRUE,

-- Metadata
created_at TIMESTAMPTZ DEFAULT NOW(),
updated_at TIMESTAMPTZ DEFAULT NOW(),
created_by UUID REFERENCES hr_public.users(id),
updated_by UUID REFERENCES hr_public.users(id)
```

### 3. Time Entries (New)

**Table**: `hr_public.time_entries`

```sql
CREATE TABLE hr_public.time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES hr_public.users(id),
  project_id UUID REFERENCES hr_public.projects(id),

  -- Time tracking
  entry_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  total_hours NUMERIC(5,2) NOT NULL,
  break_hours NUMERIC(4,2) DEFAULT 0,

  -- Categorization
  activity_type VARCHAR(50), -- regular, overtime, holiday, sick
  task_description TEXT,
  billable BOOLEAN DEFAULT FALSE,
  billing_rate NUMERIC(10,2),

  -- Approval workflow
  status VARCHAR(20) DEFAULT 'draft', -- draft, submitted, approved, rejected
  submitted_at TIMESTAMPTZ,
  approved_by UUID REFERENCES hr_public.users(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES hr_public.users(id),
  updated_by UUID REFERENCES hr_public.users(id)
);
```

**Business Rules**:
- Total hours must be positive and ≤ 24
- End time must be after start time
- Only employee or manager can approve
- Cannot modify after approval without manager permission

### 4. Leave Requests (New)

**Table**: `hr_public.leave_requests`

```sql
CREATE TABLE hr_public.leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES hr_public.users(id),

  -- Leave details
  leave_type VARCHAR(30) NOT NULL, -- vacation, sick, personal, parental, bereavement
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_days NUMERIC(4,1) NOT NULL,
  is_partial_day BOOLEAN DEFAULT FALSE,

  -- Request details
  reason TEXT,
  emergency_contact_during_leave TEXT,
  work_coverage_plan TEXT,

  -- Approval workflow
  status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected, cancelled
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  approved_by UUID REFERENCES hr_public.users(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,

  -- Balance tracking
  leave_balance_before NUMERIC(5,1),
  leave_balance_after NUMERIC(5,1),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES hr_public.users(id),
  updated_by UUID REFERENCES hr_public.users(id)
);
```

### 5. Goals (New)

**Table**: `hr_public.goals`

```sql
CREATE TABLE hr_public.goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES hr_public.users(id),
  manager_id UUID REFERENCES hr_public.users(id),

  -- Goal details
  title VARCHAR(200) NOT NULL,
  description TEXT,
  goal_type VARCHAR(30) NOT NULL, -- performance, development, project, team
  category VARCHAR(50), -- sales, quality, efficiency, leadership

  -- Timeline
  start_date DATE NOT NULL,
  target_date DATE NOT NULL,
  completion_date DATE,

  -- Progress tracking
  status VARCHAR(20) DEFAULT 'active', -- active, completed, cancelled, on_hold
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage BETWEEN 0 AND 100),
  measurement_criteria TEXT,
  success_metrics JSONB, -- Flexible metrics storage

  -- Review cycle connection
  review_cycle_id UUID REFERENCES hr_public.performance_review_cycles(id),
  weight_percentage INTEGER DEFAULT 100, -- Importance weighting

  -- Progress updates
  last_update_date DATE,
  last_update_notes TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES hr_public.users(id),
  updated_by UUID REFERENCES hr_public.users(id)
);
```

### 6. Performance Reviews (New)

**Table**: `hr_public.performance_reviews`

```sql
CREATE TABLE hr_public.performance_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES hr_public.users(id),
  reviewer_id UUID NOT NULL REFERENCES hr_public.users(id),
  review_cycle_id UUID NOT NULL REFERENCES hr_public.performance_review_cycles(id),

  -- Review details
  review_period_start DATE NOT NULL,
  review_period_end DATE NOT NULL,
  review_type VARCHAR(30) NOT NULL, -- annual, semi_annual, quarterly, probationary

  -- Ratings (1-5 scale)
  overall_rating INTEGER CHECK (overall_rating BETWEEN 1 AND 5),
  goal_achievement_rating INTEGER CHECK (goal_achievement_rating BETWEEN 1 AND 5),
  competency_rating INTEGER CHECK (competency_rating BETWEEN 1 AND 5),
  leadership_rating INTEGER CHECK (leadership_rating BETWEEN 1 AND 5),

  -- Structured feedback
  strengths TEXT,
  areas_for_improvement TEXT,
  achievements TEXT,
  development_goals TEXT,
  manager_comments TEXT,
  employee_comments TEXT,

  -- Career development
  promotion_ready BOOLEAN DEFAULT FALSE,
  next_role_suggestions TEXT,
  training_recommendations TEXT,

  -- Review status
  status VARCHAR(30) DEFAULT 'draft', -- draft, employee_review, manager_review, hr_review, completed
  employee_self_review_completed BOOLEAN DEFAULT FALSE,
  manager_review_completed BOOLEAN DEFAULT FALSE,
  hr_review_completed BOOLEAN DEFAULT FALSE,

  -- Timeline
  due_date DATE,
  completed_date DATE,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES hr_public.users(id),
  updated_by UUID REFERENCES hr_public.users(id)
);
```

### 7. Performance Review Cycles (New)

**Table**: `hr_public.performance_review_cycles`

```sql
CREATE TABLE hr_public.performance_review_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Cycle details
  name VARCHAR(100) NOT NULL, -- "2025 Annual Review", "Q1 2025 Check-in"
  description TEXT,
  cycle_type VARCHAR(30) NOT NULL, -- annual, semi_annual, quarterly

  -- Timeline
  cycle_year INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  review_deadline DATE NOT NULL,

  -- Status
  status VARCHAR(20) DEFAULT 'planned', -- planned, active, completed, cancelled

  -- Configuration
  requires_self_review BOOLEAN DEFAULT TRUE,
  requires_manager_review BOOLEAN DEFAULT TRUE,
  requires_hr_review BOOLEAN DEFAULT FALSE,
  allow_peer_feedback BOOLEAN DEFAULT FALSE,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES hr_public.users(id),
  updated_by UUID REFERENCES hr_public.users(id)
);
```

### 8. Projects (New)

**Table**: `hr_public.projects`

```sql
CREATE TABLE hr_public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Project details
  name VARCHAR(200) NOT NULL,
  description TEXT,
  project_code VARCHAR(20) UNIQUE,
  client_name VARCHAR(100),

  -- Timeline
  start_date DATE,
  end_date DATE,
  estimated_hours NUMERIC(8,2),
  actual_hours NUMERIC(8,2) DEFAULT 0,

  -- Financial
  budget NUMERIC(12,2),
  hourly_rate NUMERIC(8,2),
  is_billable BOOLEAN DEFAULT FALSE,

  -- Management
  project_manager_id UUID REFERENCES hr_public.users(id),
  department_id UUID REFERENCES hr_public.departments(id),

  -- Status
  status VARCHAR(20) DEFAULT 'planned', -- planned, active, on_hold, completed, cancelled
  priority VARCHAR(10) DEFAULT 'medium', -- low, medium, high, critical

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES hr_public.users(id),
  updated_by UUID REFERENCES hr_public.users(id)
);
```

### 9. Expenses (New)

**Table**: `hr_public.expenses`

```sql
CREATE TABLE hr_public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES hr_public.users(id),
  project_id UUID REFERENCES hr_public.projects(id),

  -- Expense details
  expense_date DATE NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  category VARCHAR(50) NOT NULL, -- travel, meals, office_supplies, training, etc.
  description TEXT NOT NULL,
  merchant_name VARCHAR(100),

  -- Receipt management
  receipt_url TEXT,
  receipt_filename VARCHAR(255),
  has_receipt BOOLEAN DEFAULT FALSE,

  -- Reimbursement
  is_reimbursable BOOLEAN DEFAULT TRUE,
  reimbursed BOOLEAN DEFAULT FALSE,
  reimbursed_date DATE,
  reimbursed_amount NUMERIC(10,2),

  -- Approval workflow
  status VARCHAR(20) DEFAULT 'draft', -- draft, submitted, approved, rejected, paid
  submitted_at TIMESTAMPTZ,
  approved_by UUID REFERENCES hr_public.users(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES hr_public.users(id),
  updated_by UUID REFERENCES hr_public.users(id)
);
```

### 10. Training Programs (New)

**Table**: `hr_public.training_programs`

```sql
CREATE TABLE hr_public.training_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Program details
  title VARCHAR(200) NOT NULL,
  description TEXT,
  category VARCHAR(50), -- technical, soft_skills, compliance, leadership
  training_type VARCHAR(30), -- online, in_person, workshop, certification

  -- Content
  duration_hours NUMERIC(5,2),
  prerequisites TEXT,
  learning_objectives TEXT,
  external_provider VARCHAR(100),
  external_url TEXT,

  -- Scheduling
  is_mandatory BOOLEAN DEFAULT FALSE,
  completion_deadline DATE,
  max_participants INTEGER,

  -- Status
  status VARCHAR(20) DEFAULT 'draft', -- draft, published, archived

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES hr_public.users(id),
  updated_by UUID REFERENCES hr_public.users(id)
);
```

### 11. Training Enrollments (New)

**Table**: `hr_public.training_enrollments`

```sql
CREATE TABLE hr_public.training_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES hr_public.users(id),
  training_program_id UUID NOT NULL REFERENCES hr_public.training_programs(id),

  -- Enrollment details
  enrolled_date DATE DEFAULT CURRENT_DATE,
  assigned_by UUID REFERENCES hr_public.users(id),
  due_date DATE,

  -- Progress tracking
  status VARCHAR(20) DEFAULT 'enrolled', -- enrolled, in_progress, completed, cancelled
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage BETWEEN 0 AND 100),
  started_date DATE,
  completed_date DATE,

  -- Assessment
  final_score NUMERIC(5,2),
  passed BOOLEAN,
  certificate_url TEXT,

  -- Feedback
  employee_feedback TEXT,
  employee_rating INTEGER CHECK (employee_rating BETWEEN 1 AND 5),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES hr_public.users(id),
  updated_by UUID REFERENCES hr_public.users(id),

  UNIQUE(employee_id, training_program_id)
);
```

### 12. Attendance Records (New)

**Table**: `hr_public.attendance_records`

```sql
CREATE TABLE hr_public.attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES hr_public.users(id),

  -- Attendance details
  attendance_date DATE NOT NULL,
  check_in_time TIMESTAMPTZ,
  check_out_time TIMESTAMPTZ,
  break_start_time TIMESTAMPTZ,
  break_end_time TIMESTAMPTZ,

  -- Calculated fields
  total_work_hours NUMERIC(5,2),
  break_duration_minutes INTEGER DEFAULT 0,
  overtime_hours NUMERIC(5,2) DEFAULT 0,

  -- Attendance status
  status VARCHAR(20) NOT NULL, -- present, absent, late, half_day, remote
  absence_reason VARCHAR(50), -- sick, vacation, personal, bereavement, etc.
  is_remote_work BOOLEAN DEFAULT FALSE,

  -- Location tracking
  check_in_location VARCHAR(100),
  check_out_location VARCHAR(100),

  -- Notes
  notes TEXT,
  manager_notes TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES hr_public.users(id),
  updated_by UUID REFERENCES hr_public.users(id),

  UNIQUE(employee_id, attendance_date)
);
```

### 13. Notifications (New)

**Table**: `hr_public.notifications`

```sql
CREATE TABLE hr_public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL REFERENCES hr_public.users(id),
  sender_id UUID REFERENCES hr_public.users(id),

  -- Notification content
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  notification_type VARCHAR(50) NOT NULL, -- approval, deadline, system, training, etc.
  priority VARCHAR(10) DEFAULT 'normal', -- low, normal, high, urgent

  -- Delivery channels
  send_email BOOLEAN DEFAULT TRUE,
  send_push BOOLEAN DEFAULT TRUE,
  send_sms BOOLEAN DEFAULT FALSE,

  -- Status tracking
  status VARCHAR(20) DEFAULT 'pending', -- pending, sent, delivered, read, failed
  read_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,

  -- Related entity
  related_entity_type VARCHAR(50), -- time_entry, leave_request, goal, etc.
  related_entity_id UUID,

  -- Action required
  requires_action BOOLEAN DEFAULT FALSE,
  action_url TEXT,
  action_deadline TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES hr_public.users(id),
  updated_by UUID REFERENCES hr_public.users(id)
);
```

## Entity Relationships

### Primary Relationships

1. **User Hierarchy**: Users → Manager (self-referencing)
2. **Department Structure**: Users → Departments (many-to-one)
3. **Time Tracking**: Users → Time Entries → Projects
4. **Leave Management**: Users → Leave Requests
5. **Goal Management**: Users → Goals ← Performance Reviews
6. **Training Flow**: Users → Training Enrollments → Training Programs
7. **Expense Workflow**: Users → Expenses → Projects
8. **Attendance Tracking**: Users → Attendance Records
9. **Communication**: Users → Notifications

### Approval Workflows

All approval entities (Time Entries, Leave Requests, Expenses) follow this pattern:
- **Requester**: Employee who creates the request
- **Approver**: Manager or HR admin who approves/rejects
- **Status Flow**: draft → submitted → approved/rejected
- **Audit Trail**: All status changes logged with timestamps

### Data Access Patterns

#### Role-Based Access (RLS Policies)

1. **Employee (Level 20)**:
   - Own data: Full CRUD
   - Team data: Read-only (limited fields)
   - Department data: Read-only (public fields)

2. **Manager (Level 60)**:
   - Own data: Full CRUD
   - Direct reports: Full CRUD (except sensitive fields)
   - Department data: Read/update (public fields)
   - Approval workflows: Approve/reject for direct reports

3. **HR Admin (Level 80)**:
   - All employee data: Full CRUD
   - All approval workflows: Override capabilities
   - Organizational structure: Full CRUD
   - Compliance reports: Generate/export

4. **System Admin (Level 100)**:
   - All data: Full CRUD
   - System configuration: Full access
   - User management: Create/disable/restore
   - Audit logs: Read access

## Indexes Strategy

### Performance-Critical Indexes

```sql
-- User hierarchy and department lookups
CREATE INDEX idx_users_manager_id ON hr_public.users(manager_id);
CREATE INDEX idx_users_department_id ON hr_public.users(department_id);
CREATE INDEX idx_users_role_level ON hr_public.users(role_level);

-- Time tracking queries
CREATE INDEX idx_time_entries_employee_date ON hr_public.time_entries(employee_id, entry_date);
CREATE INDEX idx_time_entries_project_id ON hr_public.time_entries(project_id);
CREATE INDEX idx_time_entries_status ON hr_public.time_entries(status);

-- Leave request queries
CREATE INDEX idx_leave_requests_employee_id ON hr_public.leave_requests(employee_id);
CREATE INDEX idx_leave_requests_date_range ON hr_public.leave_requests(start_date, end_date);
CREATE INDEX idx_leave_requests_status ON hr_public.leave_requests(status);

-- Performance review cycles
CREATE INDEX idx_performance_reviews_cycle_id ON hr_public.performance_reviews(review_cycle_id);
CREATE INDEX idx_performance_reviews_employee_id ON hr_public.performance_reviews(employee_id);

-- Goal tracking
CREATE INDEX idx_goals_employee_id ON hr_public.goals(employee_id);
CREATE INDEX idx_goals_manager_id ON hr_public.goals(manager_id);
CREATE INDEX idx_goals_review_cycle_id ON hr_public.goals(review_cycle_id);

-- Notification queries
CREATE INDEX idx_notifications_recipient_id ON hr_public.notifications(recipient_id);
CREATE INDEX idx_notifications_status ON hr_public.notifications(status);
CREATE INDEX idx_notifications_created_at ON hr_public.notifications(created_at);

-- Attendance tracking
CREATE INDEX idx_attendance_records_employee_date ON hr_public.attendance_records(employee_id, attendance_date);
```

## Data Validation Rules

### Business Logic Constraints

1. **Time Entries**:
   - Total hours must be between 0 and 24
   - End time must be after start time
   - Cannot overlap with existing entries for same employee/date

2. **Leave Requests**:
   - End date must be after start date
   - Cannot have overlapping approved leave requests
   - Must have sufficient leave balance (calculated)

3. **Goals**:
   - Target date must be after start date
   - Progress percentage must be 0-100
   - Weight percentage must be 1-100

4. **Performance Reviews**:
   - All ratings must be 1-5 scale
   - Review period must align with cycle dates
   - Cannot have multiple reviews for same employee/cycle

5. **Expenses**:
   - Amount must be positive
   - Expense date cannot be future date
   - Receipt required for expenses > $25 (configurable)

## Migration Strategy

### Phase 1: Core Entities
- Extend users and departments tables
- Create time_entries, leave_requests tables
- Implement basic RLS policies

### Phase 2: Performance Management
- Create goals, performance_reviews, review_cycles tables
- Add performance tracking triggers

### Phase 3: Extended Features
- Create projects, expenses, training tables
- Add attendance tracking
- Implement notification system

### Phase 4: Optimization
- Add all indexes
- Implement materialized views for reporting
- Performance tuning

This data model provides the foundation for all HR user journeys while maintaining data integrity, security, and performance.