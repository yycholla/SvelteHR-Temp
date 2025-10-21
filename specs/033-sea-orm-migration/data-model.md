# Data Model: SeaORM Migration

**Date**: 2025-10-14
**Feature**: 033-sea-orm-migration

## Migration Context

This data model maps the existing PostgreSQL schema to SeaORM entities while preserving:

- All existing table structures and constraints (20+ tables across 4 schemas)
- Computed columns and business logic functions
- Complex relationships and self-references
- Frontend GraphQL API compatibility
- Authentication and authorization patterns
- Advanced features: encryption, audit trails, soft deletes, versioning

**Schema Analysis from full_backup.sql**:

- **4 Schemas**: hr_hidden (utilities), hr_private (sensitive data), hr_public (main API), postgraphile_watch (GraphQL)
- **Extensions**: pgcrypto (encryption), uuid-ossp (UUID generation)
- **20+ Tables**: Complete HR system with events, documents, notifications, payroll, etc.
- **Advanced Features**: Event waitlists, document encryption, audit trails, RBAC functions

## Entity Definitions

### User (hr_public.users)

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

**Relationships**:

- Has many Tasks (one-to-many)

### TaskAssignee (hr_public.task_assignees)

**Purpose**: Multi-assignee task management
**Fields**:

- `id`: UUID primary key
- `task_id`: UUID foreign key → Task
- `user_id`: UUID foreign key → User
- `assigned_at`: DateTime
- `assigned_by`: UUID foreign key → User
- `created_at`: DateTime

**Relationships**:

- Belongs to Task (many-to-one)
- Belongs to User (assignee, many-to-one)
- Belongs to User (assigner, many-to-one)

### TaskAuditEntry (hr_public.task_audit_entries)

**Purpose**: Task change audit trail
**Fields**:

- `id`: UUID primary key
- `task_id`: UUID foreign key → Task
- `changed_by`: UUID foreign key → User
- `change_type`: String (required)
- `field_name`: String (optional)
- `old_value`: JSON (optional)
- `new_value`: JSON (optional)
- `created_at`: DateTime

**Relationships**:

- Belongs to Task (many-to-one)
- Belongs to User (changer, many-to-one)

### TaskDependency (hr_public.task_dependencies)

**Purpose**: Task dependency relationships
**Fields**:

- `id`: UUID primary key
- `task_id`: UUID foreign key → Task (dependent task)
- `depends_on_task_id`: UUID foreign key → Task (blocking task)
- `created_at`: DateTime
- `deleted_at`: DateTime (optional)

**Relationships**:

- Belongs to Task (dependent, many-to-one)
- Belongs to Task (blocking, many-to-one)

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

### UserRoleAssignment (hr_public.user_role_assignments)

**Purpose**: Flexible role-based access control assignments
**Fields**:

- `id`: UUID primary key
- `user_id`: UUID foreign key → User
- `role_name`: String (required)
- `assigned_by`: UUID foreign key → User (optional)
- `created_at`: DateTime

**Relationships**:

- Belongs to User (many-to-one)
- Belongs to User (assigner, many-to-one, optional)

### Permission (hr_public.permissions)

**Purpose**: System permissions definitions
**Fields**:

- `id`: UUID primary key
- `resource`: String (required)
- `action`: String (required)
- `description`: String (optional)
- `created_at`: DateTime

**Relationships**:

- Has many UserRoleAssignments (one-to-many, through roles)

### Role (hr_public.roles)

**Purpose**: Role definitions for RBAC
**Fields**:

- `id`: UUID primary key
- `name`: String (unique)
- `description`: String (optional)
- `level`: Integer (optional)
- `created_at`: DateTime
- `updated_at`: DateTime
- `deleted_at`: DateTime (optional)

**Relationships**:

- Has many UserRoleAssignments (one-to-many)
- Has many Permissions (many-to-many, through role_permissions)

### ReviewCycle (hr_public.review_cycles)

**Purpose**: Performance review period definitions
**Fields**:

- `id`: UUID primary key
- `name`: String (required)
- `start_date`: Date (required)
- `end_date`: Date (required)
- `is_active`: Boolean (default true)
- `created_at`: DateTime
- `updated_at`: DateTime

**Relationships**:

- Has many PerformanceReviews (one-to-many)

### ReviewFeedback (hr_public.review_feedback)

**Purpose**: Performance review feedback
**Fields**:

- `id`: UUID primary key
- `review_id`: UUID foreign key → PerformanceReview
- `feedback_type`: String (required)
- `content`: String (required)
- `provided_by`: UUID foreign key → User
- `created_at`: DateTime

**Relationships**:

- Belongs to PerformanceReview (many-to-one)
- Belongs to User (provider, many-to-one)

### ReviewGoal (hr_public.review_goals)

**Purpose**: Performance review goals
**Fields**:

- `id`: UUID primary key
- `review_id`: UUID foreign key → PerformanceReview
- `goal_title`: String (required)
- `goal_description`: String (optional)
- `target_date`: Date (optional)
- `status`: String (default 'in_progress')
- `progress_percentage`: Integer (default 0)
- `created_at`: DateTime
- `updated_at`: DateTime

**Relationships**:

- Belongs to PerformanceReview (many-to-one)

### ReviewTemplate (hr_public.review_templates)

**Purpose**: Performance review templates
**Fields**:

- `id`: UUID primary key
- `name`: String (required)
- `description`: String (optional)
- `template_data`: JSON (required)
- `is_active`: Boolean (default true)
- `created_by`: UUID foreign key → User (optional)
- `created_at`: DateTime
- `updated_at`: DateTime

**Relationships**:

- Belongs to User (creator, many-to-one, optional)

### TimeOffPolicy (hr_public.time_off_policies)

**Purpose**: Leave policies and allowances configuration
**Fields**:

- `id`: UUID primary key
- `name`: String (unique)
- `description`: String (optional)
- `days_per_year`: Integer (required, positive)
- `requires_approval`: Boolean (default true)
- `created_at`: DateTime
- `updated_at`: DateTime

**Relationships**:

- Has many TimeOffBalances (one-to-many)

### TimeOffBalance (hr_public.time_off_balances)

**Purpose**: Employee leave balances tracking by policy and year
**Fields**:

- `id`: UUID primary key
- `employee_id`: UUID foreign key → User
- `policy_id`: UUID foreign key → TimeOffPolicy
- `balance_days`: Decimal (default 0.0)
- `used_days`: Decimal (default 0.0)
- `year`: Integer (required)
- `created_at`: DateTime
- `updated_at`: DateTime

**Relationships**:

- Belongs to User (many-to-one)
- Belongs to TimeOffPolicy (many-to-one)

### EmergencyContact (hr_public.emergency_contacts)

**Purpose**: Employee emergency contact information
**Fields**:

- `id`: UUID primary key
- `employee_id`: UUID foreign key → User
- `full_name`: String (required)
- `relationship`: String (required)
- `phone_number`: String (required)
- `alternate_phone`: String (optional)
- `email`: String (optional)
- `address_line1`: String (optional)
- `address_line2`: String (optional)
- `city`: String (optional)
- `state_province`: String (optional)
- `postal_code`: String (optional)
- `country`: String (default 'United States')
- `is_primary`: Boolean (default false)
- `notes`: String (optional)
- `created_at`: DateTime
- `updated_at`: DateTime

**Relationships**:

- Belongs to User (many-to-one)

### EmployeeGoal (hr_public.employee_goals)

**Purpose**: Individual employee goal tracking
**Fields**:

- `id`: UUID primary key
- `employee_id`: UUID foreign key → User
- `goal_title`: String (required)
- `goal_description`: String (optional)
- `target_date`: Date (optional)
- `status`: String (default 'in_progress')
- `progress_percentage`: Integer (default 0)
- `created_by`: UUID foreign key → User (optional)
- `created_at`: DateTime
- `updated_at`: DateTime

**Relationships**:

- Belongs to User (employee, many-to-one)
- Belongs to User (creator, many-to-one, optional)

### EmployeeVehicle (hr_public.employee_vehicles)

**Purpose**: Employee vehicle information for parking
**Fields**:

- `id`: UUID primary key
- `employee_id`: UUID foreign key → User
- `make`: String (required)
- `model`: String (required)
- `year`: Integer (optional, 1900-current+2)
- `color`: String (optional)
- `license_plate`: String (required)
- `state_province`: String (optional)
- `parking_spot`: String (optional)
- `insurance_company`: String (optional)
- `insurance_policy_number`: String (optional)
- `insurance_expiry`: Date (optional)
- `is_primary`: Boolean (default false)
- `notes`: String (optional)
- `created_at`: DateTime
- `updated_at`: DateTime

**Relationships**:

- Belongs to User (many-to-one)

### Notification (hr_public.notifications)

**Purpose**: User notifications for in-app and email delivery
**Fields**:

- `id`: UUID primary key
- `recipient_id`: UUID foreign key → User
- `type`: Enum (info, warning, success, error, task_assigned, task_completed, leave_request, performance_review, event_reminder, system_announcement)
- `category`: Enum (system, task, leave, performance, event, hr, department)
- `title`: String (required)
- `message`: String (required)
- `related_resource_type`: Enum (task, leave_request, performance_review, event, user, department, goal, report)
- `related_resource_id`: UUID (optional)
- `read_status`: Boolean (default false)
- `delivered_at`: DateTime
- `read_at`: DateTime (optional)
- `created_at`: DateTime

**Relationships**:

- Belongs to User (recipient, many-to-one)

### CompensationRecord (hr_private.compensation_records)

**Purpose**: Sensitive compensation and payment information
**Fields**:

- `id`: UUID primary key
- `employee_id`: UUID foreign key → User
- `salary_amount`: Decimal (required, positive)
- `salary_currency`: String (default 'USD')
- `pay_frequency`: String (default 'monthly')
- `pay_type`: String (default 'salary')
- `hourly_rate`: Decimal (optional)
- `effective_date`: Date (default current_date)
- `end_date`: Date (optional)
- `bank_name`: String (optional)
- `bank_account_type`: String (optional)
- `bank_account_number_last4`: String (optional)
- `bank_routing_number`: String (optional)
- `payment_method`: String (default 'direct_deposit')
- `tax_id_last4`: String (optional)
- `notes`: String (optional)
- `created_by`: UUID foreign key → User (optional)
- `created_at`: DateTime
- `updated_at`: DateTime

**Relationships**:

- Belongs to User (employee, many-to-one)
- Belongs to User (creator, many-to-one, optional)

### BulkRollbackBatch (hr_public.bulk_rollback_batches)

**Purpose**: Batch rollback operations for multiple activity logs
**Fields**:

- `id`: UUID primary key
- `name`: String (required)
- `description`: String (optional)
- `requested_by`: UUID foreign key → User
- `requested_at`: DateTime
- `status`: String (default 'pending')
- `reviewed_by`: UUID foreign key → User (optional)
- `reviewed_at`: DateTime (optional)
- `executed_at`: DateTime (optional)
- `total_count`: Integer (default 0)
- `success_count`: Integer (default 0)
- `failure_count`: Integer (default 0)
- `error_log`: JSON (optional)
- `created_at`: DateTime
- `updated_at`: DateTime

**Relationships**:

- Belongs to User (requester, many-to-one)
- Belongs to User (reviewer, many-to-one, optional)
- Has many BulkRollbackItems (one-to-many)

### BulkRollbackItem (hr_public.bulk_rollback_items)

**Purpose**: Individual activity logs in a bulk rollback batch
**Fields**:

- `id`: UUID primary key
- `batch_id`: UUID foreign key → BulkRollbackBatch
- `activity_log_id`: UUID foreign key → ActivityLog
- `status`: String (default 'pending')
- `error_message`: String (optional)
- `created_at`: DateTime

**Relationships**:

- Belongs to BulkRollbackBatch (many-to-one)
- Belongs to ActivityLog (many-to-one)
