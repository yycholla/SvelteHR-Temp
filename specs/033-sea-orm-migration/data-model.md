# Data Model: SeaORM Migration

**Date**: 2025-10-14
**Feature**: 033-sea-orm-migration

## Entity Definitions

### User

**Purpose**: Core user entity with authentication and profile data
**Fields**:

- `id`: UUID primary key
- `email`: String (unique, indexed)
- `password_hash`: String (encrypted)
- `full_name`: String
- `role`: Enum (Admin, HR_Manager, Manager, Employee)
- `department_id`: UUID foreign key → Department
- `created_at`: DateTime
- `updated_at`: DateTime
- `is_active`: Boolean

**Relationships**:

- Belongs to Department (many-to-one)
- Has many Tasks (one-to-many)
- Has many LeaveRequests (one-to-many)
- Has many PerformanceReviews (one-to-many)
- Has many AuditLogs (one-to-many)

**Validation Rules**:

- Email must be valid format and unique
- Password hash required for active users
- Role must be valid enum value

### Department

**Purpose**: Organizational structure with hierarchical relationships
**Fields**:

- `id`: UUID primary key
- `name`: String (unique)
- `description`: String (optional)
- `parent_id`: UUID foreign key → Department (self-referencing)
- `manager_id`: UUID foreign key → User
- `created_at`: DateTime
- `updated_at`: DateTime

**Relationships**:

- Belongs to Department (parent, many-to-one, optional)
- Has many Departments (children, one-to-many)
- Belongs to User (manager, many-to-one)
- Has many Users (one-to-many)

**Validation Rules**:

- Name required and unique
- Cannot create circular parent relationships

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

**Purpose**: Work items with assignments and status tracking
**Fields**:

- `id`: UUID primary key
- `title`: String
- `description`: String
- `status`: Enum (pending, in_progress, completed, cancelled)
- `priority`: Enum (low, medium, high)
- `assignee_id`: UUID foreign key → User
- `created_by_id`: UUID foreign key → User
- `due_date`: DateTime (optional)
- `created_at`: DateTime
- `updated_at`: DateTime

**Relationships**:

- Belongs to User (assignee, many-to-one)
- Belongs to User (creator, many-to-one)

**State Transitions**:

- pending → in_progress (by assignee)
- in_progress → completed (by assignee)
- in_progress → cancelled (by assignee or admin)
- pending → cancelled (by creator or admin)

**Validation Rules**:

- Title and description required
- Assignee must be active user
- Due date must be in future if specified

### Leave Requests

**Purpose**: Time-off management with approval workflows
**Fields**:

- `id`: UUID primary key
- `user_id`: UUID foreign key → User
- `leave_type`: Enum (vacation, sick, personal, maternity)
- `start_date`: Date
- `end_date`: Date
- `status`: Enum (pending, approved, rejected, cancelled)
- `reason`: String
- `approved_by_id`: UUID foreign key → User (optional)
- `approved_at`: DateTime (optional)
- `created_at`: DateTime
- `updated_at`: DateTime

**Relationships**:

- Belongs to User (requester, many-to-one)
- Belongs to User (approver, many-to-one, optional)

**State Transitions**:

- pending → approved (by manager/HR)
- pending → rejected (by manager/HR)
- pending → cancelled (by requester)
- approved → cancelled (by requester, with notice)

**Validation Rules**:

- End date must be after start date
- Leave type must be valid enum
- Approval requires appropriate role permissions

### Performance Reviews

**Purpose**: Evaluation data with goals and feedback
**Fields**:

- `id`: UUID primary key
- `employee_id`: UUID foreign key → User
- `reviewer_id`: UUID foreign key → User
- `review_period_start`: Date
- `review_period_end`: Date
- `status`: Enum (draft, submitted, in_review, completed)
- `overall_rating`: Integer 1-5 (optional)
- `goals`: JSON array of goal objects
- `feedback`: String
- `created_at`: DateTime
- `updated_at`: DateTime

**Relationships**:

- Belongs to User (employee, many-to-one)
- Belongs to User (reviewer, many-to-one)

**State Transitions**:

- draft → submitted (by reviewer)
- submitted → in_review (by HR)
- in_review → completed (by HR)

**Validation Rules**:

- Review period dates must be valid range
- Overall rating must be 1-5 when completed
- Goals stored as structured JSON

### Audit Logs

**Purpose**: System activity tracking with rollback capabilities
**Fields**:

- `id`: UUID primary key
- `user_id`: UUID foreign key → User (optional)
- `action`: String
- `entity_type`: String
- `entity_id`: UUID
- `old_values`: JSON (optional)
- `new_values`: JSON (optional)
- `ip_address`: String (optional)
- `user_agent`: String (optional)
- `created_at`: DateTime

**Relationships**:

- Belongs to User (many-to-one, optional)

**Validation Rules**:

- Action and entity_type required
- JSON fields for value tracking

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
