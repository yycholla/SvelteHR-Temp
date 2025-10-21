# Data Model: Database Schema Optimization

**Feature**: 029-let-s-optimize
**Date**: 2025-10-10
**Status**: DESIGN PHASE

## Overview

This document defines the complete database schema changes for Feature 029, organized by priority phase (P0 → P1 → P2 → P3 → P4). All changes are additive where possible to support zero-downtime deployment.

## Entity Relationship Summary

**Existing Tables Modified** (Priority P0-P3):
- users (P0: none, P1: +4 fields)
- event_attendees (P0: +1 field, P3: +2 fields)
- departments (P1: +1 field for co-managers, P3: +4 fields for hierarchy)
- performance_reviews (P2: +6 fields for detailed ratings)
- employee_goals (P2: +3 fields for quarterly tracking)
- hr_reports (P2: +4 fields for recurring schedules)
- notifications (P2: +1 field for delivery channels, ENUM expansions)
- leave_requests (P3: +2 fields for review tracking)

**New Tables Created** (Priority P2):
- employee_skills (many-to-many with users)
- employee_certifications (many-to-many with users)

**Materialized Views Created** (Priority P4):
- department_metrics (aggregated department statistics)
- goal_statistics (goal completion analytics)
- report_analytics (headcount/attendance trends)
- dashboard_summaries (multi-table aggregations)

## Phase P0: Critical Hotfix

### P0.1: event_attendees.reminder_time

**Priority**: 🚨 PRODUCTION BUG - EMERGENCY DEPLOYMENT REQUIRED

**Context**: Frontend queries `reminderTime` field at 4+ locations but database schema missing this field, causing events page crash.

**Field Definition**:
```sql
ALTER TABLE hr_public.event_attendees
ADD COLUMN IF NOT EXISTS reminder_time INTEGER;
```

**Field Details**:
- **Name**: reminder_time
- **Type**: INTEGER
- **Nullable**: YES (null = no reminder set)
- **Constraint**: CHECK (reminder_time IS NULL OR reminder_time > 0) -- Minutes before event start
- **Default**: NULL
- **Comment**: 'Minutes before event start_time to send notification reminder'

**Validation Rules**:
- Must be NULL or positive integer
- Common values: 15 (15 minutes before), 60 (1 hour before), 1440 (1 day before)
- Frontend allows multiple reminders by comma-separating values (e.g., "60,1440")

**Migration**: 20251011_001_add_reminder_time_hotfix.sql

## Phase P1: Core Schema Changes

### P1.1: users.manager_id (Self-Referencing Foreign Key)

**Priority**: HIGH - Required for manager hierarchy navigation

**Field Definition**:
```sql
ALTER TABLE hr_public.users
ADD COLUMN IF NOT EXISTS manager_id UUID
  REFERENCES hr_public.users(id) ON DELETE SET NULL;
```

**Field Details**:
- **Name**: manager_id
- **Type**: UUID
- **Nullable**: YES (null during onboarding or for top-level executives)
- **Foreign Key**: REFERENCES hr_public.users(id) ON DELETE SET NULL
- **Constraint**: Application-level circular reference validation (prevent A→B→A loops)
- **Comment**: 'Employee manager (self-referencing FK). Null for top-level executives or during onboarding.'

**Validation Rules**:
- User cannot be their own manager (user.id != user.manager_id)
- Circular references prevented by application-level traversal before write
- When manager is deactivated (is_active=false), manager_id can remain set or be SET NULL
- Multiple roles scenario: User can be manager of others while having their own manager

**Index**:
```sql
CREATE INDEX IF NOT EXISTS idx_users_manager_id
ON hr_public.users(manager_id)
WHERE manager_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_manager_active
ON hr_public.users(manager_id, is_active)
WHERE is_active = true;
```

**GraphQL Impact**: PostGraphile will auto-generate `manager` relationship field on User type.

### P1.2: users.job_title

**Field Definition**:
```sql
ALTER TABLE hr_public.users
ADD COLUMN IF NOT EXISTS job_title VARCHAR(255);
```

**Field Details**:
- **Name**: job_title
- **Type**: VARCHAR(255)
- **Nullable**: YES (null during onboarding or for non-employee users)
- **Constraint**: CHECK (job_title IS NULL OR LENGTH(TRIM(job_title)) > 0)
- **Comment**: 'Employee position title (e.g., "Senior Software Engineer", "HR Manager")'

**Validation Rules**:
- Must be non-empty string if set (trimmed)
- Free-form text (no predefined job title catalog)
- Common values: "Software Engineer", "HR Manager", "Department Head", "CEO"

**Index**: Not indexed (low-cardinality, infrequent queries by job title)

### P1.3: users.avatar_url

**Field Definition**:
```sql
ALTER TABLE hr_public.users
ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500);
```

**Field Details**:
- **Name**: avatar_url
- **Type**: VARCHAR(500)
- **Nullable**: YES (null = use default avatar)
- **Constraint**: None (URL format validated at application layer)
- **Comment**: 'Profile picture URL. Max 10MB image, aspect ratio validated client-side with cropperjs.'

**Validation Rules**:
- Application-level validation: valid URL format, accessible image resource
- Image upload flow:
  1. Client uploads to storage (S3/Cloudflare R2/etc.)
  2. Returns URL
  3. URL saved to avatar_url field
- Default avatar: Frontend displays initials if avatar_url IS NULL

**Index**: Not indexed (never queried, only displayed)

### P1.4: users.date_of_birth (PII - Encrypted)

**Field Definition**:
```sql
ALTER TABLE hr_public.users
ADD COLUMN IF NOT EXISTS date_of_birth DATE;
```

**Field Details**:
- **Name**: date_of_birth
- **Type**: DATE
- **Nullable**: YES (null for privacy or if user declines to provide)
- **Constraint**: CHECK (date_of_birth IS NULL OR date_of_birth < CURRENT_DATE)
- **Encryption**: ✅ Application-level encryption required (PII per Q18 clarification)
- **Comment**: 'Employee date of birth. ENCRYPTED PII. Used for HR records, birthday reminders.'

**Validation Rules**:
- Must be in the past (cannot be born in the future)
- Application encrypts before INSERT/UPDATE using encryption_keys table
- Application decrypts on SELECT for authorized users only (admin, HR manager, self)

**Access Control**:
- super_admin: Full access
- admin: Full access
- manager: No access (unless employee explicitly shares)
- employee: Own record only

**Index**: Not indexed (encrypted field, cannot index ciphertext)

### P1.5: departments.manager_ids (Array Migration from manager_id)

**Priority**: HIGH - Breaking change for co-managers support

**Field Definition**:
```sql
ALTER TABLE hr_public.departments
ADD COLUMN IF NOT EXISTS manager_ids UUID[];
```

**Field Details**:
- **Name**: manager_ids
- **Type**: UUID[] (array of UUIDs)
- **Nullable**: YES (null = no assigned managers, common for new departments)
- **Constraint**: FOREIGN KEY to users via trigger (each element must reference valid user)
- **Comment**: 'Array of manager UUIDs. Supports co-managers for shared department leadership.'

**Data Migration Strategy**:
```sql
-- Migrate existing single manager_id to array
UPDATE hr_public.departments
SET manager_ids = ARRAY[manager_id]
WHERE manager_id IS NOT NULL AND manager_ids IS NULL;
```

**Validation Rules**:
- Each UUID in array must reference valid user (enforced by trigger or application)
- Duplicate UUIDs prevented (application-level validation)
- Maximum 5 co-managers recommended (soft limit, not enforced by database)

**Index**:
```sql
CREATE INDEX IF NOT EXISTS idx_departments_manager_ids
ON hr_public.departments USING GIN(manager_ids);
```

**Backward Compatibility**:
- **Transition Period**: Keep both manager_id and manager_ids columns during migration
- **Application Update**: Update GraphQL operations to query manager_ids instead of manager_id
- **Deprecation**: Remove manager_id column in future migration (20251012_xxx) after full application migration

**GraphQL Impact**: PostGraphile will auto-generate `managersByManagerIds` connection field on Department type.

**Migration**: 20251011_002_add_users_core_fields.sql + 20251011_003_migrate_departments_managers.sql

## Phase P2: Feature Tables & Field Expansions

### P2.1: CREATE TABLE employee_skills

**Purpose**: Track employee skills with proficiency levels and peer endorsements

**Table Definition**:
```sql
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
```

**Field Details**:
- **id**: UUID primary key
- **user_id**: Foreign key to users table (CASCADE on delete)
- **skill_name**: Free-form skill name (no predefined catalog per Q15)
  - Examples: "TypeScript", "Leadership", "Project Management", "PostgreSQL"
- **proficiency_level**: Integer 1-5 scale
  - 1 = Beginner (learning)
  - 2 = Intermediate (can work with guidance)
  - 3 = Advanced (independent work)
  - 4 = Expert (can teach others)
  - 5 = Master (recognized authority)
- **endorsed_by**: Array of user UUIDs who have endorsed this skill for this employee
- **years_experience**: Number of years using this skill professionally
- **last_used_date**: Last date skill was actively used (self-reported)

**Validation Rules**:
- proficiency_level must be 1-5 (enforced by CHECK constraint)
- years_experience cannot be negative (enforced by CHECK constraint)
- Unique constraint on (user_id, skill_name) prevents duplicate skills per user
- last_used_date should be in the past (validated at application layer)

**Indexes**:
```sql
CREATE INDEX idx_employee_skills_user ON hr_public.employee_skills(user_id);
CREATE INDEX idx_employee_skills_name ON hr_public.employee_skills(skill_name);
CREATE INDEX idx_employee_skills_user_name ON hr_public.employee_skills(user_id, skill_name);
CREATE INDEX idx_employee_skills_proficiency ON hr_public.employee_skills(proficiency_level);

-- Full-text search on skill names
CREATE INDEX idx_employee_skills_fulltext ON hr_public.employee_skills
USING GIN(to_tsvector('english', skill_name));
```

**Triggers**:
```sql
CREATE TRIGGER employee_skills_updated_at_trigger
  BEFORE UPDATE ON hr_public.employee_skills
  FOR EACH ROW
  EXECUTE FUNCTION hr_hidden.update_updated_at_column();
```

**RLS Policies**:
```sql
ALTER TABLE hr_public.employee_skills ENABLE ROW LEVEL SECURITY;

-- Employees can view their own skills
CREATE POLICY employee_skills_view_own ON hr_public.employee_skills
  FOR SELECT USING (user_id = current_setting('app.current_user_id', true)::UUID);

-- Managers can view department employee skills
CREATE POLICY employee_skills_view_department ON hr_public.employee_skills
  FOR SELECT USING (
    hr_hidden.is_user_manager()
    AND user_id IN (
      SELECT id FROM hr_public.users
      WHERE department_id = hr_hidden.current_user_department_id()
    )
  );

-- Admins can view all skills
CREATE POLICY employee_skills_admin_all ON hr_public.employee_skills
  FOR ALL USING (hr_hidden.is_user_admin());

-- Employees can manage their own skills
CREATE POLICY employee_skills_manage_own ON hr_public.employee_skills
  FOR ALL USING (user_id = current_setting('app.current_user_id', true)::UUID);
```

**Migration**: 20251011_004_create_employee_skills.sql

### P2.2: CREATE TABLE employee_certifications

**Purpose**: Track professional certifications with expiry dates and verification URLs

**Table Definition**:
```sql
CREATE TABLE IF NOT EXISTS hr_public.employee_certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES hr_public.users(id) ON DELETE CASCADE,
  certification_name VARCHAR(255) NOT NULL,
  issuer VARCHAR(255) NOT NULL,
  issued_date DATE NOT NULL,
  expiry_date DATE,
  credential_id VARCHAR(255),
  verification_url VARCHAR(500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, certification_name, issuer)
);
```

**Field Details**:
- **id**: UUID primary key
- **user_id**: Foreign key to users table (CASCADE on delete)
- **certification_name**: Free-form certification name (no predefined catalog per Q15)
  - Examples: "AWS Certified Solutions Architect", "PMP", "Certified ScrumMaster", "Series 7"
- **issuer**: Organization that issued certification
  - Examples: "Amazon Web Services", "Project Management Institute", "Scrum Alliance"
- **issued_date**: Date certification was awarded
- **expiry_date**: Date certification expires (NULL if lifetime)
- **credential_id**: Unique identifier for verification (e.g., license number, certificate ID)
- **verification_url**: URL to verify certification validity

**Validation Rules**:
- issued_date must be in the past (validated at application layer)
- expiry_date must be after issued_date (enforced by CHECK constraint)
- Unique constraint on (user_id, certification_name, issuer) prevents duplicates
- credential_id format varies by issuer (no database-level validation)

**Indexes**:
```sql
CREATE INDEX idx_employee_certifications_user ON hr_public.employee_certifications(user_id);
CREATE INDEX idx_employee_certifications_name ON hr_public.employee_certifications(certification_name);
CREATE INDEX idx_employee_certifications_expiry ON hr_public.employee_certifications(expiry_date)
WHERE expiry_date IS NOT NULL;

-- Index for expiring certifications alert
CREATE INDEX idx_employee_certifications_expiring_soon ON hr_public.employee_certifications(expiry_date)
WHERE expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '90 days';

-- Full-text search on certification names
CREATE INDEX idx_employee_certifications_fulltext ON hr_public.employee_certifications
USING GIN(to_tsvector('english', certification_name || ' ' || issuer));
```

**Constraints**:
```sql
ALTER TABLE hr_public.employee_certifications
ADD CONSTRAINT employee_certifications_dates_valid
CHECK (expiry_date IS NULL OR expiry_date > issued_date);
```

**Triggers**:
```sql
CREATE TRIGGER employee_certifications_updated_at_trigger
  BEFORE UPDATE ON hr_public.employee_certifications
  FOR EACH ROW
  EXECUTE FUNCTION hr_hidden.update_updated_at_column();
```

**RLS Policies**:
```sql
ALTER TABLE hr_public.employee_certifications ENABLE ROW LEVEL SECURITY;

-- Same pattern as employee_skills (view own, managers view department, admins view all)
CREATE POLICY employee_certifications_view_own ON hr_public.employee_certifications
  FOR SELECT USING (user_id = current_setting('app.current_user_id', true)::UUID);

CREATE POLICY employee_certifications_view_department ON hr_public.employee_certifications
  FOR SELECT USING (
    hr_hidden.is_user_manager()
    AND user_id IN (
      SELECT id FROM hr_public.users
      WHERE department_id = hr_hidden.current_user_department_id()
    )
  );

CREATE POLICY employee_certifications_admin_all ON hr_public.employee_certifications
  FOR ALL USING (hr_hidden.is_user_admin());

CREATE POLICY employee_certifications_manage_own ON hr_public.employee_certifications
  FOR ALL USING (user_id = current_setting('app.current_user_id', true)::UUID);
```

**Migration**: 20251011_005_create_employee_certifications.sql

### P2.3: performance_reviews - Add Rating Fields

**Purpose**: Add detailed rating categories for comprehensive performance assessment

**Fields to Add**:
```sql
ALTER TABLE hr_public.performance_reviews
ADD COLUMN IF NOT EXISTS collaboration_rating NUMERIC(2,1)
  CHECK (collaboration_rating IS NULL OR collaboration_rating BETWEEN 1.0 AND 5.0),
ADD COLUMN IF NOT EXISTS communication_rating NUMERIC(2,1)
  CHECK (communication_rating IS NULL OR communication_rating BETWEEN 1.0 AND 5.0),
ADD COLUMN IF NOT EXISTS leadership_rating NUMERIC(2,1)
  CHECK (leadership_rating IS NULL OR leadership_rating BETWEEN 1.0 AND 5.0),
ADD COLUMN IF NOT EXISTS technical_skills_rating NUMERIC(2,1)
  CHECK (technical_skills_rating IS NULL OR technical_skills_rating BETWEEN 1.0 AND 5.0),
ADD COLUMN IF NOT EXISTS due_date DATE,
ADD COLUMN IF NOT EXISTS review_date DATE;
```

**Field Details**:
- **collaboration_rating**: Rating for teamwork and collaboration (1.0-5.0 scale)
- **communication_rating**: Rating for verbal and written communication (1.0-5.0 scale)
- **leadership_rating**: Rating for leadership and influence (1.0-5.0 scale, may be N/A for non-manager roles)
- **technical_skills_rating**: Rating for technical/functional expertise (1.0-5.0 scale)
- **due_date**: Deadline for completing the review (manager must submit by this date)
- **review_date**: Actual date when review was completed (auto-set when status changes to 'completed')

**Validation Rules**:
- All rating fields: NUMERIC(2,1) allows values like 1.0, 2.5, 3.0, 4.5, 5.0
- Rating range: 1.0 (needs improvement) to 5.0 (exceptional)
- Ratings are nullable (allows partial reviews, not all categories apply to all roles)
- overall_rating (existing field) should be average of category ratings

**Constraints**:
```sql
ALTER TABLE hr_public.performance_reviews
ADD CONSTRAINT performance_reviews_dates_valid
CHECK (review_date IS NULL OR due_date IS NULL OR review_date <= (due_date + INTERVAL '7 days'));
```

**Comment Updates**:
```sql
COMMENT ON COLUMN hr_public.performance_reviews.collaboration_rating IS 'Teamwork and collaboration rating (1.0-5.0)';
COMMENT ON COLUMN hr_public.performance_reviews.communication_rating IS 'Communication skills rating (1.0-5.0)';
COMMENT ON COLUMN hr_public.performance_reviews.leadership_rating IS 'Leadership and influence rating (1.0-5.0)';
COMMENT ON COLUMN hr_public.performance_reviews.technical_skills_rating IS 'Technical/functional expertise rating (1.0-5.0)';
COMMENT ON COLUMN hr_public.performance_reviews.due_date IS 'Deadline for completing the review';
COMMENT ON COLUMN hr_public.performance_reviews.review_date IS 'Actual date review was completed';
```

**Migration**: 20251011_006_expand_performance_reviews.sql

### P2.4: employee_goals - Add Quarterly Tracking

**Purpose**: Add quarter/year tracking and completion timestamps for goal management

**Fields to Add**:
```sql
ALTER TABLE hr_public.employee_goals
ADD COLUMN IF NOT EXISTS quarter VARCHAR(10)
  CHECK (quarter IS NULL OR quarter IN ('Q1', 'Q2', 'Q3', 'Q4')),
ADD COLUMN IF NOT EXISTS year INTEGER
  CHECK (year IS NULL OR year BETWEEN 2020 AND 2100),
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
```

**Field Details**:
- **quarter**: Fiscal quarter for goal (Q1/Q2/Q3/Q4, nullable for annual goals)
- **year**: Year for goal tracking (2020-2100 range, nullable for ongoing goals)
- **completed_at**: Timestamp when goal status changed to 'completed' (auto-set by trigger)

**Validation Rules**:
- quarter must be one of: 'Q1', 'Q2', 'Q3', 'Q4', or NULL
- year must be realistic range (2020-2100)
- completed_at automatically set when status = 'completed' (handled by trigger)

**Trigger for Auto-Setting completed_at**:
```sql
CREATE OR REPLACE FUNCTION update_goal_completed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    NEW.completed_at = NOW();
  ELSIF NEW.status != 'completed' THEN
    NEW.completed_at = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER goal_completed_at_trigger
  BEFORE UPDATE ON hr_public.employee_goals
  FOR EACH ROW
  EXECUTE FUNCTION update_goal_completed_at();
```

**Index for Quarterly Goal Queries**:
```sql
CREATE INDEX idx_employee_goals_quarter_year ON hr_public.employee_goals(year, quarter, status)
WHERE quarter IS NOT NULL AND year IS NOT NULL;
```

**Migration**: 20251011_007_add_employee_goals_tracking.sql

### P2.5: hr_reports - Add Recurring Report Fields

**Purpose**: Add recurring schedule support with RFC 5545 RRULE patterns

**Fields to Add**:
```sql
ALTER TABLE hr_public.hr_reports
ADD COLUMN IF NOT EXISTS recurrence_pattern VARCHAR(50)
  CHECK (recurrence_pattern IS NULL OR recurrence_pattern IN ('none', 'daily', 'weekly', 'monthly', 'quarterly', 'yearly')),
ADD COLUMN IF NOT EXISTS recurrence_rrule TEXT,
ADD COLUMN IF NOT EXISTS next_run_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_run_at TIMESTAMPTZ;
```

**Field Details**:
- **recurrence_pattern**: Preset recurrence patterns (none/daily/weekly/monthly/quarterly/yearly)
- **recurrence_rrule**: RFC 5545 RRULE string for complex recurrence patterns
  - Example: "FREQ=WEEKLY;INTERVAL=1;BYDAY=MO" = Every Monday
- **next_run_at**: Next scheduled execution timestamp (calculated from RRULE or pattern)
- **last_run_at**: Last execution timestamp (updated after successful generation)

**Validation Rules**:
- recurrence_pattern must be one of the preset values or NULL
- recurrence_rrule syntax validated at application layer (RFC 5545 compliance)
- next_run_at calculated from recurrence_pattern/recurrence_rrule + last_run_at
- Constraint: recurrence_pattern='none' implies recurrence_rrule IS NULL

**Index for Scheduled Reports**:
```sql
CREATE INDEX idx_hr_reports_next_run ON hr_public.hr_reports(next_run_at)
WHERE next_run_at IS NOT NULL AND status = 'active';
```

**Example RRULE Patterns**:
```sql
-- Weekly headcount report every Monday 9 AM
recurrence_pattern = 'weekly'
recurrence_rrule = 'FREQ=WEEKLY;INTERVAL=1;BYDAY=MO'

-- Monthly payroll report last day of month
recurrence_pattern = 'monthly'
recurrence_rrule = 'FREQ=MONTHLY;BYMONTHDAY=-1'

-- Quarterly diversity report first day of Q1/Q2/Q3/Q4
recurrence_pattern = 'quarterly'
recurrence_rrule = 'FREQ=MONTHLY;INTERVAL=3;BYMONTHDAY=1'
```

**Migration**: 20251011_008_add_hr_reports_recurring.sql

### P2.6: notifications - Add Delivery Channel & ENUM Expansions

**Purpose**: Add delivery_channel field and expand notification ENUMs

**Field to Add**:
```sql
ALTER TABLE hr_public.notifications
ADD COLUMN IF NOT EXISTS delivery_channel VARCHAR(20)
  CHECK (delivery_channel IN ('email', 'in_app', 'sms', 'push', 'webhook'));
```

**ENUM Expansions**:
```sql
-- Add new notification types (current has 10, need 15 total per Q7)
ALTER TYPE hr_public.notification_type ADD VALUE IF NOT EXISTS 'goal_milestone';
ALTER TYPE hr_public.notification_type ADD VALUE IF NOT EXISTS 'document_uploaded';
ALTER TYPE hr_public.notification_type ADD VALUE IF NOT EXISTS 'certification_expiring';
ALTER TYPE hr_public.notification_type ADD VALUE IF NOT EXISTS 'birthday_reminder';
ALTER TYPE hr_public.notification_type ADD VALUE IF NOT EXISTS 'anniversary';
ALTER TYPE hr_public.notification_type ADD VALUE IF NOT EXISTS 'onboarding_task';
ALTER TYPE hr_public.notification_type ADD VALUE IF NOT EXISTS 'offboarding_checklist';
```

**Field Details**:
- **delivery_channel**: How notification should be delivered
  - 'email': Send via email
  - 'in_app': Show in application notification center
  - 'sms': Send via text message
  - 'push': Browser/mobile push notification
  - 'webhook': HTTP POST to configured endpoint

**Validation Rules**:
- delivery_channel must be one of the 5 supported channels
- Existing 'type' field remains as notification_type (info/warning/success/error/etc.)
- delivery_channel determines HOW to deliver, type determines WHAT kind of notification

**Index**:
```sql
CREATE INDEX idx_notifications_channel ON hr_public.notifications(delivery_channel, delivered_at);
```

**Migration**: 20251011_009_expand_notifications.sql

## Phase P3: Low Priority Enhancements

### P3.1: departments - Hierarchy & Metadata Fields

**Fields to Add**:
```sql
ALTER TABLE hr_public.departments
ADD COLUMN IF NOT EXISTS parent_department_id UUID
  REFERENCES hr_public.departments(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS code VARCHAR(50) UNIQUE,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE NOT NULL,
ADD COLUMN IF NOT EXISTS budget JSONB;
```

**Field Details**:
- **parent_department_id**: Self-referencing FK for department hierarchy (org chart navigation)
- **code**: Unique department identifier (e.g., "ENG", "HR", "SALES")
- **is_active**: Soft delete flag (false = archived department)
- **budget**: JSONB with structure: {annual, allocated, spent, remaining, currency, lastUpdated}

**Validation Rules**:
- Circular parent references prevented by application-level traversal
- code must be unique across all departments if set
- budget JSONB schema validated at application layer using Zod

**Budget JSONB Example**:
```json
{
  "annual": 1000000.00,
  "allocated": 850000.00,
  "spent": 420000.00,
  "remaining": 430000.00,
  "currency": "USD",
  "lastUpdated": "2025-10-01T00:00:00Z"
}
```

**Indexes**:
```sql
CREATE INDEX idx_departments_parent ON hr_public.departments(parent_department_id)
WHERE parent_department_id IS NOT NULL;

CREATE INDEX idx_departments_code ON hr_public.departments(code)
WHERE code IS NOT NULL;

CREATE INDEX idx_departments_active ON hr_public.departments(is_active)
WHERE is_active = true;
```

**Migration**: 20251011_010_add_departments_hierarchy.sql

### P3.2: leave_requests - Review Tracking Fields

**Fields to Add**:
```sql
ALTER TABLE hr_public.leave_requests
ADD COLUMN IF NOT EXISTS review_notes TEXT,
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
```

**Field Details**:
- **review_notes**: Manager's notes on approval/rejection decision
- **reviewed_at**: Timestamp when decision was made (auto-set when status changes to 'approved' or 'rejected')

**Trigger for Auto-Setting reviewed_at**:
```sql
CREATE OR REPLACE FUNCTION update_leave_reviewed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('approved', 'rejected') AND OLD.status = 'pending' THEN
    NEW.reviewed_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER leave_reviewed_at_trigger
  BEFORE UPDATE ON hr_public.leave_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_leave_reviewed_at();
```

**Migration**: 20251011_011_add_leave_requests_review.sql

### P3.3: event_attendees - Recurring Event Scope

**Fields to Add**:
```sql
ALTER TABLE hr_public.event_attendees
ADD COLUMN IF NOT EXISTS scope VARCHAR(20)
  CHECK (scope IS NULL OR scope IN ('this', 'future', 'all')),
ADD COLUMN IF NOT EXISTS is_organizer BOOLEAN DEFAULT FALSE NOT NULL;
```

**Field Details**:
- **scope**: For recurring events, which occurrences does this RSVP apply to?
  - 'this': Only this occurrence
  - 'future': This and all future occurrences
  - 'all': All occurrences in the series
- **is_organizer**: TRUE if this attendee is the event organizer (can have multiple organizers)

**Validation Rules**:
- scope is NULL for non-recurring events (events.rrule IS NULL)
- scope must be set for recurring events when response_status != 'pending'

**Migration**: 20251011_012_add_event_attendees_scope.sql

## Phase P4: Materialized Views for Performance

### P4.1: department_metrics (Materialized View)

**Purpose**: Cache expensive aggregations for department statistics

**View Definition**:
```sql
CREATE MATERIALIZED VIEW hr_public.department_metrics AS
SELECT
  d.id as department_id,
  d.name as department_name,
  COUNT(u.id) FILTER (WHERE u.is_active) as active_employee_count,
  COUNT(u.id) FILTER (WHERE NOT u.is_active) as inactive_employee_count,
  AVG(cr.salary_amount) FILTER (WHERE u.is_active) as average_salary,
  MIN(cr.salary_amount) FILTER (WHERE u.is_active) as min_salary,
  MAX(cr.salary_amount) FILTER (WHERE u.is_active) as max_salary,
  COUNT(DISTINCT t.id) FILTER (WHERE t.status IN ('todo', 'in_progress')) as active_tasks_count,
  COUNT(DISTINCT pr.id) FILTER (WHERE pr.status IN ('not_started', 'in_progress')) as pending_reviews_count,
  COUNT(DISTINCT lr.id) FILTER (WHERE lr.status = 'pending') as pending_leave_requests_count,
  NOW() as last_refreshed_at
FROM hr_public.departments d
LEFT JOIN hr_public.users u ON u.department_id = d.id
LEFT JOIN hr_private.compensation_records cr ON cr.employee_id = u.id AND cr.end_date IS NULL
LEFT JOIN hr_public.tasks t ON t.department_id = d.id
LEFT JOIN hr_public.performance_reviews pr ON pr.employee_id = u.id
LEFT JOIN hr_public.leave_requests lr ON lr.employee_id = u.id
WHERE d.is_active = TRUE
GROUP BY d.id, d.name;
```

**Unique Index** (required for CONCURRENTLY refresh):
```sql
CREATE UNIQUE INDEX department_metrics_pkey ON hr_public.department_metrics(department_id);
```

**Refresh Strategy**:
```sql
-- Nightly refresh at midnight UTC (scheduled via cron/pg_cron)
REFRESH MATERIALIZED VIEW CONCURRENTLY hr_public.department_metrics;
```

**Migration**: 20251011_013_create_department_metrics_view.sql

### P4.2: goal_statistics (Materialized View)

**Purpose**: Cache goal completion analytics for dashboards

**View Definition**:
```sql
CREATE MATERIALIZED VIEW hr_public.goal_statistics AS
SELECT
  d.id as department_id,
  d.name as department_name,
  eg.year,
  eg.quarter,
  COUNT(*) as total_goals,
  COUNT(*) FILTER (WHERE eg.status = 'completed') as completed_goals,
  COUNT(*) FILTER (WHERE eg.status = 'in_progress') as in_progress_goals,
  COUNT(*) FILTER (WHERE eg.status = 'not_started') as not_started_goals,
  COUNT(*) FILTER (WHERE eg.status = 'cancelled') as cancelled_goals,
  AVG(eg.progress_percentage) FILTER (WHERE eg.status != 'cancelled') as average_progress,
  COUNT(*) FILTER (WHERE eg.target_date < CURRENT_DATE AND eg.status != 'completed') as overdue_goals,
  NOW() as last_refreshed_at
FROM hr_public.employee_goals eg
JOIN hr_public.users u ON u.id = eg.employee_id
JOIN hr_public.departments d ON d.id = u.department_id
WHERE u.is_active = TRUE
GROUP BY d.id, d.name, eg.year, eg.quarter;
```

**Unique Index**:
```sql
CREATE UNIQUE INDEX goal_statistics_pkey ON hr_public.goal_statistics(department_id, year, quarter);
```

**Migration**: 20251011_014_create_goal_statistics_view.sql

### P4.3: report_analytics (Materialized View)

**Purpose**: Cache headcount trends and attendance patterns for reporting

**View Definition**:
```sql
CREATE MATERIALIZED VIEW hr_public.report_analytics AS
SELECT
  d.id as department_id,
  d.name as department_name,
  DATE_TRUNC('month', u.hire_date) as hire_month,
  COUNT(u.id) FILTER (WHERE u.is_active) as active_headcount,
  COUNT(u.id) FILTER (WHERE NOT u.is_active) as terminated_headcount,
  COUNT(ar.id) as attendance_records_count,
  AVG(EXTRACT(EPOCH FROM (ar.clock_out - ar.clock_in))/3600) as avg_hours_worked,
  NOW() as last_refreshed_at
FROM hr_public.departments d
LEFT JOIN hr_public.users u ON u.department_id = d.id
LEFT JOIN hr_public.attendance_records ar ON ar.employee_id = u.id
  AND ar.clock_in >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY d.id, d.name, DATE_TRUNC('month', u.hire_date);
```

**Unique Index**:
```sql
CREATE UNIQUE INDEX report_analytics_pkey ON hr_public.report_analytics(department_id, hire_month);
```

**Migration**: 20251011_015_create_report_analytics_view.sql

### P4.4: dashboard_summaries (Materialized View)

**Purpose**: Cache multi-table aggregations for manager/admin dashboards

**View Definition**:
```sql
CREATE MATERIALIZED VIEW hr_public.dashboard_summaries AS
SELECT
  d.id as department_id,
  d.name as department_name,
  -- User counts
  COUNT(DISTINCT u.id) FILTER (WHERE u.is_active) as total_employees,
  -- Task metrics
  COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'todo') as tasks_todo,
  COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'in_progress') as tasks_in_progress,
  COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'done') as tasks_done,
  -- Leave request metrics
  COUNT(DISTINCT lr.id) FILTER (WHERE lr.status = 'pending') as pending_leave_requests,
  COUNT(DISTINCT lr.id) FILTER (WHERE lr.status = 'approved' AND lr.start_date <= CURRENT_DATE + INTERVAL '7 days') as upcoming_leave,
  -- Performance review metrics
  COUNT(DISTINCT pr.id) FILTER (WHERE pr.status = 'in_progress') as reviews_in_progress,
  COUNT(DISTINCT pr.id) FILTER (WHERE pr.due_date < CURRENT_DATE AND pr.status != 'completed') as overdue_reviews,
  -- Event metrics
  COUNT(DISTINCT e.id) FILTER (WHERE e.start_time >= CURRENT_DATE AND e.start_time <= CURRENT_DATE + INTERVAL '7 days') as upcoming_events,
  NOW() as last_refreshed_at
FROM hr_public.departments d
LEFT JOIN hr_public.users u ON u.department_id = d.id
LEFT JOIN hr_public.tasks t ON t.department_id = d.id
LEFT JOIN hr_public.leave_requests lr ON lr.employee_id = u.id
LEFT JOIN hr_public.performance_reviews pr ON pr.employee_id = u.id
LEFT JOIN hr_public.events e ON e.organizer_id = u.id OR e.id IN (
  SELECT ea.event_id FROM hr_public.event_attendees ea WHERE ea.employee_id = u.id
)
WHERE d.is_active = TRUE
GROUP BY d.id, d.name;
```

**Unique Index**:
```sql
CREATE UNIQUE INDEX dashboard_summaries_pkey ON hr_public.dashboard_summaries(department_id);
```

**Migration**: 20251011_016_create_dashboard_summaries_view.sql

## Migration Execution Order

**P0 Hotfix** (Deploy immediately):
1. 20251011_001_add_reminder_time_hotfix.sql

**P1 Core Schema** (Deploy Week 1):
2. 20251011_002_add_users_core_fields.sql (manager_id, job_title, avatar_url, date_of_birth)
3. 20251011_003_migrate_departments_managers.sql (manager_id → manager_ids migration)

**P2 Feature Tables** (Deploy Week 2-3):
4. 20251011_004_create_employee_skills.sql
5. 20251011_005_create_employee_certifications.sql
6. 20251011_006_expand_performance_reviews.sql
7. 20251011_007_add_employee_goals_tracking.sql
8. 20251011_008_add_hr_reports_recurring.sql
9. 20251011_009_expand_notifications.sql

**P3 Enhancements** (Deploy Week 4):
10. 20251011_010_add_departments_hierarchy.sql
11. 20251011_011_add_leave_requests_review.sql
12. 20251011_012_add_event_attendees_scope.sql

**P4 Materialized Views** (Deploy Week 5):
13. 20251011_013_create_department_metrics_view.sql
14. 20251011_014_create_goal_statistics_view.sql
15. 20251011_015_create_report_analytics_view.sql
16. 20251011_016_create_dashboard_summaries_view.sql

## Testing Strategy

**Schema Validation**:
1. Run `npm run db:verify` after each migration to detect schema drift
2. Update baseline schema snapshot: `npm run db:snapshot`
3. Compare against expected schema changes

**Contract Tests**:
1. PostGraphile schema introspection tests
2. Verify new GraphQL fields appear in generated schema
3. Validate RLS policies via GraphQL query tests (non-admin users shouldn't see restricted data)

**Integration Tests**:
1. Frontend GraphQL operations query new fields successfully
2. Materialized view refresh completes without errors
3. RRULE parsing for recurring reports works correctly

**Migration Rollback Tests**:
1. Each migration includes ROLLBACK script for emergency recovery
2. Test rollback on dev environment before production deployment

## Summary

**Total Schema Changes**: 16 migrations across 4 priority phases
**New Tables**: 2 (employee_skills, employee_certifications)
**Modified Tables**: 8 (users, event_attendees, departments, performance_reviews, employee_goals, hr_reports, notifications, leave_requests)
**New Materialized Views**: 4 (department_metrics, goal_statistics, report_analytics, dashboard_summaries)
**New Indexes**: 20+ composite indexes for query optimization
**RLS Policies**: Full coverage on all new tables

**Critical Path**: P0 hotfix (reminder_time) must deploy ASAP to fix production bug. All other phases can deploy incrementally per schedule.
