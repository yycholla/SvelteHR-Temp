# Data Model: SeaORM Migration

**Date**: 2025-10-14
**Feature**: 033-sea-orm-migration

## Migration Context

This data model maps the existing PostgreSQL schema to SeaORM entities while preserving:

- All existing table structures and constraints
- Computed columns and business logic
- Complex relationships and self-references
- Frontend GraphQL API compatibility
- Authentication and authorization patterns

## Entity Definitions

### User

**Purpose**: Core user entity with authentication, RBAC, and profile data
**Table**: `hr_public.users`
**Fields**:

- `id`: UUID primary key
- `email`: String (unique, indexed, email format validation)
- `password_hash`: String (encrypted, required for authentication)
- `first_name`: String (required, non-empty)
- `last_name`: String (required, non-empty)
- `display_name`: String (computed: first_name || ' ' || last_name)
- `full_name`: String (computed: first_name || ' ' || last_name)
- `role`: String (enum values: hr_employee, hr_manager, admin, super_admin)
- `phone_number`: String (optional)
- `alternate_phone`: String (optional)
- `job_title`: String (optional)
- `status`: String (optional: active, inactive, terminated)
- `department_id`: UUID foreign key → Department (nullable)
- `manager_id`: UUID foreign key → User (self-referential, nullable)
- `hire_date`: Date (optional)
- `is_active`: Boolean (default true)
- `failed_login_attempts`: Integer (default 0)
- `locked_until`: DateTime (optional)
- `last_login`: DateTime (optional)
- `created_at`: DateTime
- `updated_at`: DateTime

**Computed Columns**:

- `display_name`: Concatenation of first_name and last_name
- `full_name`: Same as display_name (for GraphQL compatibility)

**Relationships**:

- Belongs to Department (many-to-one, optional)
- Belongs to Manager (self-referential, many-to-one, optional)
- Has many Direct Reports (self-referential, one-to-many)
- Has many Tasks (one-to-many, as assignee and creator)
- Has many LeaveRequests (one-to-many)
- Has many PerformanceReviews (one-to-many, as employee and reviewer)
- Has many AuditLogs (one-to-many)
- Has many UserRoleAssignments (one-to-many)

**Validation Rules**:

- Email must be valid format and unique
- Password hash required for active users
- First name and last name cannot be empty
- Role must be valid enum value
- Manager cannot be the same as the user (no self-management)

### Department

**Purpose**: Organizational structure with hierarchical relationships and management
**Table**: `hr_public.departments`
**Fields**:

- `id`: UUID primary key
- `name`: String (unique, indexed)
- `description`: String (optional)
- `parent_department_id`: UUID foreign key → Department (self-referencing, optional)
- `manager_id`: UUID foreign key → User (optional)
- `created_at`: DateTime
- `updated_at`: DateTime

**Relationships**:

- Belongs to Department (parent, many-to-one, optional)
- Has many Departments (children, one-to-many)
- Belongs to User (manager, many-to-one, optional)
- Has many Users (one-to-many)
- Has many Tasks (one-to-many, department-specific tasks)

**Validation Rules**:

- Name required and unique
- Cannot create circular parent relationships
- Manager must be an active user if specified

### Employee Records

**Purpose**: Comprehensive employee data including skills and history
**Fields**:

- `id`: UUID primary key
- `user_id`: UUID foreign key → User (unique)
- `employee_id`: String (unique, indexed)
- `hire_date`: Date
- `termination_date`: Date (optional)
- `job_title`: String
- `salary`: Decimal (optional, encrypted)
- `skills`: JSON array of skill objects
- `certifications`: JSON array of certification objects
- `created_at`: DateTime
- `updated_at`: DateTime

**Relationships**:

- Belongs to User (one-to-one)

**Validation Rules**:

- Employee ID must be unique
- Termination date must be after hire date if present
- Skills and certifications stored as structured JSON

### Tasks

**Purpose**: Work items with assignments, dependencies, audit trails, and status tracking
**Table**: `hr_public.tasks` (UUID-based, not integer-based)
**Fields**:

- `id`: UUID primary key
- `title`: String (required, non-empty)
- `description`: String (optional)
- `task_type_id`: UUID foreign key → TaskType (optional)
- `status`: Enum (todo, in_progress, blocked, review, done, cancelled)
- `priority`: Enum (low, medium, high, urgent)
- `due_date`: DateTime (optional)
- `completed_at`: DateTime (optional)
- `estimated_hours`: Integer (optional)
- `actual_hours`: Integer (optional)
- `tags`: JSON array of strings (optional)
- `department_id`: UUID foreign key → Department (optional)
- `created_by`: UUID foreign key → User (required)
- `assignee_id`: UUID foreign key → User (optional)
- `parent_task_id`: UUID foreign key → Task (self-referential, optional)
- `requires_manual_reassignment`: Boolean (optional)
- `archived`: Boolean (default false)
- `archived_at`: DateTime (optional)
- `archived_by`: UUID foreign key → User (optional)
- `created_at`: DateTime
- `updated_at`: DateTime
- `deleted_at`: DateTime (optional, soft delete)

**Relationships**:

- Belongs to User (creator, many-to-one)
- Belongs to User (assignee, many-to-one, optional)
- Belongs to Department (many-to-one, optional)
- Belongs to TaskType (many-to-one, optional)
- Belongs to Task (parent, self-referential, many-to-one, optional)
- Has many Tasks (children, self-referential, one-to-many)
- Has many TaskAssignees (one-to-many, multi-assignee support)
- Has many TaskDependencies (one-to-many, as blocking and blocked)
- Has many LinkedResources (one-to-many, attachments)
- Has many TaskAuditEntries (one-to-many, audit trail)

**State Transitions**:

- todo → in_progress (by assignee)
- in_progress → blocked (by system/assignee)
- blocked → in_progress (by assignee)
- in_progress → review (by assignee)
- review → done (by reviewer)
- in_progress → done (by assignee)
- any → cancelled (by assignee, creator, or admin)

**Validation Rules**:

- Title required and non-empty
- Status must be valid enum value
- Priority must be valid enum value
- Due date must be in future if specified
- Assignee must be active user if specified
- Parent task cannot be the same as current task
- Cannot create circular dependencies

### Leave Requests

**Purpose**: Time-off management with approval workflows and balance tracking
**Table**: `hr_public.leave_requests`
**Fields**:

- `id`: UUID primary key
- `employee_id`: UUID foreign key → User (required)
- `manager_id`: UUID foreign key → User (optional)
- `leave_type`: Enum (annual, sick, personal, maternity, paternity)
- `start_date`: Date (required)
- `end_date`: Date (required)
- `days_requested`: Integer (required, positive)
- `status`: Enum (pending, approved, rejected, cancelled)
- `reason`: String (optional)
- `manager_comments`: String (optional)
- `created_at`: DateTime
- `updated_at`: DateTime
- `deleted_at`: DateTime (optional, soft delete)

**Related Tables**:

- `hr_public.time_off_policies` - Leave policies and allowances
- `hr_public.time_off_balances` - Employee leave balances by policy/year

**Relationships**:

- Belongs to User (employee, many-to-one)
- Belongs to User (manager, many-to-one, optional)
- Has many TimeOffBalances (one-to-many, through policies)

**State Transitions**:

- pending → approved (by manager/HR with appropriate permissions)
- pending → rejected (by manager/HR with rejection reason)
- pending → cancelled (by employee)
- approved → cancelled (by employee, with advance notice)

**Validation Rules**:

- End date must be after or equal to start date
- Days requested must be positive
- Employee and manager cannot be the same user
- Leave type must be valid enum value
- Approval requires manager relationship or HR permissions

### Performance Reviews

**Purpose**: Employee evaluations with goals, feedback, and rating systems
**Table**: `hr_public.performance_reviews`
**Fields**:

- `id`: UUID primary key
- `employee_id`: UUID foreign key → User (required)
- `reviewer_id`: UUID foreign key → User (required)
- `review_period`: String (e.g., "2025-Q1", "2025-Annual")
- `status`: Enum (not_started, in_progress, completed)
- `overall_rating`: Decimal (1.0-5.0 scale, optional)
- `goals`: String (optional, free text)
- `achievements`: String (optional, free text)
- `areas_for_improvement`: String (optional, free text)
- `manager_feedback`: String (optional, free text)
- `review_period_start`: Date (optional)
- `review_period_end`: Date (optional)
- `review_type`: String (optional: annual, quarterly, probationary)
- `notes`: String (optional)
- `created_at`: DateTime
- `updated_at`: DateTime

**Related Tables**:

- `hr_public.review_templates` - Standardized review templates
- `hr_public.review_cycles` - Review period definitions
- `hr_public.review_goals` - Structured goal tracking

**Relationships**:

- Belongs to User (employee, many-to-one)
- Belongs to User (reviewer, many-to-one)
- Belongs to ReviewCycle (many-to-one, optional)

**State Transitions**:

- not_started → in_progress (by reviewer)
- in_progress → completed (by reviewer with all fields filled)
- completed → in_progress (by reviewer for revisions)

**Validation Rules**:

- Employee and reviewer cannot be the same user
- Overall rating must be between 1.0 and 5.0 if provided
- Review period dates must form a valid range if both provided
- Review type must be valid if specified

### Audit Logs

**Purpose**: System activity tracking with rollback capabilities and before/after snapshots
**Table**: `hr_public.activity_logs`
**Fields**:

- `id`: UUID primary key
- `user_id`: UUID foreign key → User (optional, for authenticated actions)
- `employee_id`: UUID foreign key → User (optional, for actions on behalf of others)
- `action`: String (required, e.g., "CREATE", "UPDATE", "DELETE")
- `resource_type`: String (required, e.g., "user", "task", "leave_request")
- `resource_id`: UUID (optional, ID of affected resource)
- `details`: JSON (optional, additional context)
- `before_snapshot`: JSON (optional, state before change)
- `after_snapshot`: JSON (optional, state after change)
- `is_rollback`: Boolean (default false)
- `rolled_back_log_id`: UUID foreign key → ActivityLog (optional, for rollback tracking)
- `ip_address`: String (optional)
- `user_agent`: String (optional)
- `created_at`: DateTime

**Related Tables**:

- `hr_public.rollback_requests` - Rollback request tracking
- `hr_public.bulk_rollback_batch` - Batch rollback operations

**Relationships**:

- Belongs to User (actor, many-to-one, optional)
- Belongs to User (target_employee, many-to-one, optional)
- Belongs to ActivityLog (rollback_source, many-to-one, optional)
- Has many RollbackRequests (one-to-many)

**Validation Rules**:

- Action and resource_type required
- Either user_id or employee_id should be provided for user actions
- JSON fields for structured data storage
- IP address and user agent for security tracking

### Notifications

**Purpose**: User communication and alert system
**Fields**:

- `id`: UUID primary key
- `user_id`: UUID foreign key → User
- `type`: Enum (task_assigned, leave_approved, review_due, system_alert)
- `title`: String
- `message`: String
- `is_read`: Boolean (default false)
- `data`: JSON (optional, for additional context)
- `created_at`: DateTime

**Relationships**:

- Belongs to User (many-to-one)

**Validation Rules**:

- Type must be valid enum
- Title and message required

### Documents

**Purpose**: File management with access controls
**Fields**:

- `id`: UUID primary key
- `user_id`: UUID foreign key → User
- `filename`: String
- `file_path`: String
- `file_size`: Integer
- `mime_type`: String
- `category`: Enum (resume, contract, certification, other)
- `is_public`: Boolean (default false)
- `created_at`: DateTime
- `updated_at`: DateTime

**Relationships**:

- Belongs to User (many-to-one)

**Validation Rules**:

- File path must be secure and validated
- File size within limits
- MIME type must match allowed types

### Reports

**Purpose**: Analytical data and business intelligence
**Fields**:

- `id`: UUID primary key
- `name`: String
- `description`: String
- `query_definition`: JSON
- `created_by_id`: UUID foreign key → User
- `is_public`: Boolean (default false)
- `last_run_at`: DateTime (optional)
- `created_at`: DateTime
- `updated_at`: DateTime

**Relationships**:

- Belongs to User (creator, many-to-one)

**Validation Rules**:

- Query definition stored as structured JSON
- Access control based on is_public flag and user permissions

## Additional Entities (Supporting Infrastructure)

### TaskType

**Purpose**: Categorization and organization of tasks
**Table**: `hr_public.task_types`
**Fields**:

- `id`: UUID primary key
- `name`: String (unique)
- `description`: String (optional)
- `color`: String (hex color code)
- `icon`: String (icon identifier)
- `created_at`: DateTime
- `updated_at`: DateTime

### Event

**Purpose**: Company events, meetings, and activities
**Table**: `hr_public.events`
**Fields**:

- `id`: UUID primary key
- `title`: String (required)
- `description`: String (optional)
- `event_type`: Enum (meeting, training, social, company_event, holiday, interview, review, team_building, other)
- `status`: Enum (draft, scheduled, in_progress, completed, cancelled)
- `visibility_type`: Enum (public, private, department, team)
- `start_time`: DateTime (required)
- `end_time`: DateTime (required)
- `all_day`: Boolean (default false)
- `location`: String (optional)
- `is_public`: Boolean (default true)
- `color`: String (default '#3B82F6')
- `organizer_id`: UUID foreign key → User (required)
- `created_at`: DateTime
- `updated_at`: DateTime

### EventAttendee

**Purpose**: Event attendance tracking and RSVP management
**Table**: `hr_public.event_attendees`
**Fields**:

- `id`: UUID primary key
- `event_id`: UUID foreign key → Event
- `employee_id`: UUID foreign key → User
- `response_status`: Enum (pending, accepted, declined, tentative)
- `is_required`: Boolean (default false)
- `created_at`: DateTime

### Document

**Purpose**: File management with access controls and versioning
**Table**: `hr_public.documents`
**Fields**:

- `id`: UUID primary key
- `user_id`: UUID foreign key → User
- `filename`: String (required)
- `file_path`: String (required)
- `file_size`: Integer (required)
- `mime_type`: String (required)
- `category`: Enum (resume, contract, certification, other)
- `is_public`: Boolean (default false)
- `created_at`: DateTime
- `updated_at`: DateTime

### TimeOffPolicy

**Purpose**: Leave policies and allowances configuration
**Table**: `hr_public.time_off_policies`
**Fields**:

- `id`: UUID primary key
- `name`: String (unique)
- `description`: String (optional)
- `days_per_year`: Integer (required, positive)
- `requires_approval`: Boolean (default true)
- `created_at`: DateTime
- `updated_at`: DateTime

### TimeOffBalance

**Purpose**: Employee leave balances tracking by policy and year
**Table**: `hr_public.time_off_balances`
**Fields**:

- `id`: UUID primary key
- `employee_id`: UUID foreign key → User
- `policy_id`: UUID foreign key → TimeOffPolicy
- `balance_days`: Decimal (default 0.0)
- `used_days`: Decimal (default 0.0)
- `year`: Integer (required)
- `created_at`: DateTime
- `updated_at`: DateTime

### UserRoleAssignment

**Purpose**: Flexible role-based access control assignments
**Table**: `hr_public.user_role_assignments`
**Fields**:

- `id`: UUID primary key
- `user_id`: UUID foreign key → User
- `role_name`: String (required)
- `assigned_by`: UUID foreign key → User (optional)
- `created_at`: DateTime

### CompensationBand

**Purpose**: Salary band definitions for job roles
**Table**: `hr_public.compensation_bands`
**Fields**:

- `id`: UUID primary key
- `title`: String (required)
- `min_salary`: Decimal (required)
- `max_salary`: Decimal (required)
- `currency`: String (default 'USD')
- `created_by`: UUID foreign key → User (optional)
- `created_at`: DateTime
- `updated_at`: DateTime

### PayrollRecord

**Purpose**: Payroll processing and salary records
**Table**: `hr_public.payroll_records`
**Fields**:

- `id`: UUID primary key
- `employee_id`: UUID foreign key → User
- `pay_period_start`: Date (required)
- `pay_period_end`: Date (required)
- `gross_pay`: Decimal (required, positive)
- `net_pay`: Decimal (required, positive)
- `processed_by`: UUID foreign key → User (optional)
- `created_by`: UUID foreign key → User (optional)
- `created_at`: DateTime
- `updated_at`: DateTime

## Migration Considerations

### Computed Columns to Preserve

- `display_name` (first_name || ' ' || last_name)
- `full_name` (same as display_name for GraphQL compatibility)
- Aggregations (employee counts, task statistics)

### Complex Relationships to Maintain

- Self-referential hierarchies (departments, tasks)
- Multi-table joins (users → departments → managers)
- Many-to-many relationships (tasks ↔ assignees, events ↔ attendees)

### Business Logic to Preserve

- State transition validations
- Permission-based access controls
- Audit logging for all modifications
- Soft delete patterns
- Computed field logic
