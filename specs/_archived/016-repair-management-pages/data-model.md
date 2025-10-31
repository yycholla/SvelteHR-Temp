# Data Model: Management Pages Repair & Admin Implementation

**Feature**: 016-repair-management-pages
**Status**: Design Phase
**Last Updated**: 2025-09-30

---

## Entity Definitions

### 1. Manager

**Description**: A user with managerial role, assigned to manage a specific department with CRUD permissions scoped to their department.

**Table**: `hr_public.users` (role-based entity)

**Fields**:
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PK, NOT NULL | User identifier (inherited from users table) |
| `email` | VARCHAR(255) | UNIQUE, NOT NULL | Manager email address |
| `display_name` | VARCHAR(255) | NOT NULL | Full name of manager |
| `role` | VARCHAR(50) | NOT NULL, CHECK(role='manager') | Must be 'manager' |
| `department_id` | UUID | FK → departments.id | Department this manager belongs to |
| `is_active` | BOOLEAN | DEFAULT true | Account status |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Account creation timestamp |
| `updated_at` | TIMESTAMP | DEFAULT NOW() | Last update timestamp |

**Relationships**:
- `department_id` → `hr_public.departments.id` (Many-to-One: Manager belongs to one department)
- `id` ← `hr_public.departments.manager_id` (One-to-One: Manager manages one department)
- `id` ← `hr_public.leave_requests.reviewer_id` (One-to-Many: Manager reviews leave requests)
- `id` ← `hr_public.performance_reviews.reviewer_id` (One-to-Many: Manager conducts reviews)
- `id` ← `hr_public.goals.manager_id` (One-to-Many: Manager sets team goals)
- `id` ← `hr_public.tasks.assigner_id` (One-to-Many: Manager assigns tasks)
- `id` ← `hr_public.reports.creator_id` (One-to-Many: Manager generates reports)

**Validation Rules**:
- FR-008: Manager's department assignment must be validated on every data access
- FR-001: Manager can only access data where `department_id` matches their assigned department
- Manager must be unique per department (enforced via `departments.manager_id` unique constraint)

**State Transitions**:
- `is_active: true → false` (User deactivation by admin)
- `department_id: A → B` (Department transfer triggers FR-029: auto-refresh permissions)

---

### 2. Admin

**Description**: A user with administrative role, having unrestricted access to all departments and admin-specific pages.

**Table**: `hr_public.users` (role-based entity)

**Fields**:
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PK, NOT NULL | User identifier (inherited from users table) |
| `email` | VARCHAR(255) | UNIQUE, NOT NULL | Admin email address |
| `display_name` | VARCHAR(255) | NOT NULL | Full name of admin |
| `role` | VARCHAR(50) | NOT NULL, CHECK(role='admin') | Must be 'admin' |
| `department_id` | UUID | FK → departments.id, NULLABLE | Optional department assignment |
| `is_active` | BOOLEAN | DEFAULT true | Account status |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Account creation timestamp |
| `updated_at` | TIMESTAMP | DEFAULT NOW() | Last update timestamp |

**Relationships**:
- `department_id` → `hr_public.departments.id` (Many-to-One: Optional department association)
- `id` ← `hr_public.audit_logs.user_id` (One-to-Many: Admin actions logged)
- `id` ← `hr_public.system_settings.updated_by` (One-to-Many: Admin modifies settings)

**Validation Rules**:
- FR-030: Admin role takes precedence when user has both manager and admin roles
- FR-010: Admins bypass department-scoped RLS policies
- FR-023: Only admins can access admin-specific pages (`/dashboard/admin/*`)

**State Transitions**:
- `is_active: true → false` (Admin deactivation - requires super-admin)

---

### 3. Department

**Description**: An organizational unit with a single assigned manager, containing multiple employees.

**Table**: `hr_public.departments`

**Fields**:
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PK, NOT NULL | Department identifier |
| `name` | VARCHAR(255) | UNIQUE, NOT NULL | Department name |
| `description` | TEXT | NULLABLE | Department description |
| `manager_id` | UUID | FK → users.id, UNIQUE | Manager assigned to this department |
| `parent_department_id` | UUID | FK → departments.id, NULLABLE | Parent department (for hierarchy) |
| `is_active` | BOOLEAN | DEFAULT true | Department status |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Department creation timestamp |
| `updated_at` | TIMESTAMP | DEFAULT NOW() | Last update timestamp |

**Relationships**:
- `manager_id` → `hr_public.users.id` (One-to-One: Department has one manager)
- `id` ← `hr_public.users.department_id` (One-to-Many: Department has many employees)
- `id` ← `hr_public.leave_requests.department_id` (One-to-Many: Leave requests from department)
- `id` ← `hr_public.performance_reviews.department_id` (One-to-Many: Reviews within department)
- `id` ← `hr_public.goals.department_id` (One-to-Many: Goals for department)
- `id` ← `hr_public.tasks.department_id` (One-to-Many: Tasks within department)
- `id` ← `hr_public.reports.department_id` (One-to-Many: Reports for department)

**Validation Rules**:
- FR-018: Department must have `manager_id` foreign key constraint
- FR-024: Referential integrity enforced for all relationships
- Department name must be unique across organization

**State Transitions**:
- `is_active: true → false` (Department deactivation)
- `manager_id: NULL → UUID` (Manager assignment)
- `manager_id: UUID_A → UUID_B` (Manager reassignment)

---

### 4. User

**Description**: Base user entity representing any employee in the system (employee, manager, admin, HR manager).

**Table**: `hr_public.users`

**Fields**:
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PK, NOT NULL | User identifier |
| `email` | VARCHAR(255) | UNIQUE, NOT NULL | User email address |
| `display_name` | VARCHAR(255) | NOT NULL | Full name of user |
| `role` | VARCHAR(50) | NOT NULL | Role: 'employee', 'manager', 'admin', 'hr_manager' |
| `department_id` | UUID | FK → departments.id | Department assignment |
| `is_active` | BOOLEAN | DEFAULT true | Account status |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Account creation timestamp |
| `updated_at` | TIMESTAMP | DEFAULT NOW() | Last update timestamp |

**Relationships**:
- `department_id` → `hr_public.departments.id` (Many-to-One: User belongs to department)
- `id` ← `hr_public.leave_requests.user_id` (One-to-Many: User creates leave requests)
- `id` ← `hr_public.performance_reviews.reviewee_id` (One-to-Many: User receives reviews)
- `id` ← `hr_public.goals.user_id` (One-to-Many: User has goals)
- `id` ← `hr_public.tasks.assignee_id` (One-to-Many: User assigned tasks)
- `id` ← `hr_public.audit_logs.user_id` (One-to-Many: User actions logged)

**Validation Rules**:
- FR-019: `department_id` must reference valid department
- FR-026: Role and department assignment must be consistent
- Email must be unique across system

**State Transitions**:
- `is_active: true → false` (User deactivation)
- `role: employee → manager` (Role promotion)
- `department_id: A → B` (Department transfer triggers FR-029)

---

### 5. LeaveRequest

**Description**: A request from an employee for time off, requiring approval from their department manager or admin.

**Table**: `hr_public.leave_requests`

**Fields**:
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PK, NOT NULL | Leave request identifier |
| `user_id` | UUID | FK → users.id, NOT NULL | Employee requesting leave |
| `department_id` | UUID | FK → departments.id, NOT NULL | Department of requester |
| `start_date` | DATE | NOT NULL | Leave start date |
| `end_date` | DATE | NOT NULL, CHECK(end_date >= start_date) | Leave end date |
| `leave_type` | VARCHAR(50) | NOT NULL | Type: 'vacation', 'sick', 'personal', 'unpaid' |
| `status` | VARCHAR(50) | NOT NULL, DEFAULT 'pending' | Status: 'pending', 'approved', 'rejected' |
| `reason` | TEXT | NULLABLE | Employee's reason for leave |
| `reviewer_id` | UUID | FK → users.id, NULLABLE | Manager/admin who reviewed |
| `review_notes` | TEXT | NULLABLE | Manager's notes on decision |
| `reviewed_at` | TIMESTAMP | NULLABLE | Timestamp of review |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Request creation timestamp |
| `updated_at` | TIMESTAMP | DEFAULT NOW() | Last update timestamp |

**Relationships**:
- `user_id` → `hr_public.users.id` (Many-to-One: Request by employee)
- `department_id` → `hr_public.departments.id` (Many-to-One: Request in department)
- `reviewer_id` → `hr_public.users.id` (Many-to-One: Reviewed by manager/admin)

**Validation Rules**:
- FR-001: Managers can only view/approve requests where `department_id` matches theirs
- FR-002: Managers can only approve/reject requests from their department
- FR-013: Admins can approve/reject requests from any department
- `end_date` must be >= `start_date`

**State Transitions**:
- `pending → approved` (Manager/admin approves)
- `pending → rejected` (Manager/admin rejects)
- Approved/rejected requests cannot transition back to pending

---

### 6. PerformanceReview

**Description**: An evaluation of an employee's performance, typically conducted by their manager.

**Table**: `hr_public.performance_reviews`

**Fields**:
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PK, NOT NULL | Review identifier |
| `reviewee_id` | UUID | FK → users.id, NOT NULL | Employee being reviewed |
| `reviewer_id` | UUID | FK → users.id, NOT NULL | Manager conducting review |
| `department_id` | UUID | FK → departments.id, NOT NULL | Department of reviewee |
| `review_period` | VARCHAR(50) | NOT NULL | Period: 'Q1 2025', 'Annual 2025', etc. |
| `status` | VARCHAR(50) | NOT NULL, DEFAULT 'draft' | Status: 'draft', 'submitted', 'completed' |
| `overall_rating` | INTEGER | CHECK(overall_rating BETWEEN 1 AND 5) | Overall rating (1-5) |
| `goals_achievement` | INTEGER | CHECK(goals_achievement BETWEEN 1 AND 5) | Goals rating (1-5) |
| `collaboration` | INTEGER | CHECK(collaboration BETWEEN 1 AND 5) | Collaboration rating (1-5) |
| `communication` | INTEGER | CHECK(communication BETWEEN 1 AND 5) | Communication rating (1-5) |
| `leadership` | INTEGER | CHECK(leadership BETWEEN 1 AND 5), NULLABLE | Leadership rating (1-5, optional) |
| `strengths` | TEXT | NULLABLE | Employee strengths |
| `areas_for_improvement` | TEXT | NULLABLE | Areas to improve |
| `comments` | TEXT | NULLABLE | Additional comments |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Review creation timestamp |
| `updated_at` | TIMESTAMP | DEFAULT NOW() | Last update timestamp |
| `completed_at` | TIMESTAMP | NULLABLE | Review completion timestamp |

**Relationships**:
- `reviewee_id` → `hr_public.users.id` (Many-to-One: Employee reviewed)
- `reviewer_id` → `hr_public.users.id` (Many-to-One: Manager reviewing)
- `department_id` → `hr_public.departments.id` (Many-to-One: Review in department)

**Validation Rules**:
- FR-003: Managers can only create/edit/delete reviews for their team members
- FR-014: Admins can create/edit/delete reviews for any employee
- All rating fields must be between 1 and 5

**State Transitions**:
- `draft → submitted` (Manager submits review)
- `submitted → completed` (Review finalized)

---

### 7. Goal

**Description**: Objectives and key results (OKRs) set for individuals or teams within a department.

**Table**: `hr_public.goals`

**Fields**:
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PK, NOT NULL | Goal identifier |
| `user_id` | UUID | FK → users.id, NOT NULL | Employee assigned goal |
| `manager_id` | UUID | FK → users.id, NOT NULL | Manager who set goal |
| `department_id` | UUID | FK → departments.id, NOT NULL | Department of goal |
| `title` | VARCHAR(255) | NOT NULL | Goal title |
| `description` | TEXT | NULLABLE | Detailed goal description |
| `quarter` | VARCHAR(10) | NOT NULL | Quarter: 'Q1', 'Q2', 'Q3', 'Q4' |
| `year` | INTEGER | NOT NULL | Year: 2025, 2026, etc. |
| `progress` | INTEGER | DEFAULT 0, CHECK(progress BETWEEN 0 AND 100) | Progress percentage (0-100) |
| `status` | VARCHAR(50) | NOT NULL, DEFAULT 'active' | Status: 'active', 'completed', 'cancelled' |
| `target_date` | DATE | NULLABLE | Target completion date |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Goal creation timestamp |
| `updated_at` | TIMESTAMP | DEFAULT NOW() | Last update timestamp |

**Relationships**:
- `user_id` → `hr_public.users.id` (Many-to-One: Goal assigned to employee)
- `manager_id` → `hr_public.users.id` (Many-to-One: Goal set by manager)
- `department_id` → `hr_public.departments.id` (Many-to-One: Goal in department)

**Validation Rules**:
- FR-004: Managers can only create/edit/delete goals for their team
- FR-015: Admins can create/edit/delete goals for any team
- Progress must be between 0 and 100

**State Transitions**:
- `active → completed` (Goal achieved)
- `active → cancelled` (Goal cancelled)
- `progress: 0 → 100` (Incremental progress)

---

### 8. Task

**Description**: Work assignments created by managers for their team members.

**Table**: `hr_public.tasks`

**Fields**:
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PK, NOT NULL | Task identifier |
| `assignee_id` | UUID | FK → users.id, NOT NULL | Employee assigned task |
| `assigner_id` | UUID | FK → users.id, NOT NULL | Manager who assigned task |
| `department_id` | UUID | FK → departments.id, NOT NULL | Department of task |
| `title` | VARCHAR(255) | NOT NULL | Task title |
| `description` | TEXT | NULLABLE | Detailed task description |
| `priority` | VARCHAR(50) | NOT NULL, DEFAULT 'medium' | Priority: 'low', 'medium', 'high', 'urgent' |
| `status` | VARCHAR(50) | NOT NULL, DEFAULT 'todo' | Status: 'todo', 'in_progress', 'review', 'done' |
| `due_date` | DATE | NULLABLE | Task due date |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Task creation timestamp |
| `updated_at` | TIMESTAMP | DEFAULT NOW() | Last update timestamp |
| `completed_at` | TIMESTAMP | NULLABLE | Task completion timestamp |

**Relationships**:
- `assignee_id` → `hr_public.users.id` (Many-to-One: Task assigned to employee)
- `assigner_id` → `hr_public.users.id` (Many-to-One: Task created by manager)
- `department_id` → `hr_public.departments.id` (Many-to-One: Task in department)

**Validation Rules**:
- FR-005: Managers can only assign tasks to team members in their department
- FR-016: Admins can assign tasks to any employee
- FR-022-TASKS: Tasks table must have proper foreign keys to users and departments

**State Transitions**:
- `todo → in_progress` (Employee starts task)
- `in_progress → review` (Employee completes, awaits review)
- `review → done` (Manager approves)
- `review → in_progress` (Needs revision)

---

### 9. Report

**Description**: Analytics and data summaries for department or organizational metrics.

**Table**: `hr_public.reports`

**Fields**:
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PK, NOT NULL | Report identifier |
| `creator_id` | UUID | FK → users.id, NOT NULL | User who generated report |
| `department_id` | UUID | FK → departments.id, NULLABLE | Department report (NULL for org-wide) |
| `title` | VARCHAR(255) | NOT NULL | Report title |
| `report_type` | VARCHAR(50) | NOT NULL | Type: 'employee', 'leave', 'performance', 'compliance' |
| `category` | VARCHAR(50) | NOT NULL | Category: 'hr', 'payroll', 'compliance', 'performance' |
| `status` | VARCHAR(50) | NOT NULL, DEFAULT 'active' | Status: 'active', 'archived' |
| `data` | JSONB | NOT NULL | Report data (JSON format) |
| `filters` | JSONB | NULLABLE | Applied filters (JSON format) |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Report generation timestamp |
| `updated_at` | TIMESTAMP | DEFAULT NOW() | Last update timestamp |

**Relationships**:
- `creator_id` → `hr_public.users.id` (Many-to-One: Report created by user)
- `department_id` → `hr_public.departments.id` (Many-to-One: Report for department)

**Validation Rules**:
- FR-006: Managers can only generate/edit/delete reports for their department
- FR-017: Admins can generate/edit/delete reports for any department or org-wide
- `data` field must be valid JSONB

**State Transitions**:
- `active → archived` (Report archived)

---

### 10. AuditLog

**Description**: Security events, data access logs, and user actions for compliance tracking.

**Table**: `hr_public.audit_logs`

**Fields**:
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PK, NOT NULL | Audit log identifier |
| `user_id` | UUID | FK → users.id, NOT NULL | User who performed action |
| `action` | VARCHAR(100) | NOT NULL | Action type: 'CREATE', 'UPDATE', 'DELETE', 'VIEW', 'LOGIN', 'LOGOUT' |
| `resource` | VARCHAR(100) | NOT NULL | Resource affected: 'leave_request', 'performance_review', etc. |
| `resource_id` | UUID | NULLABLE | ID of affected resource |
| `department_id` | UUID | FK → departments.id, NULLABLE | Department context (if applicable) |
| `ip_address` | VARCHAR(45) | NULLABLE | Client IP address |
| `user_agent` | TEXT | NULLABLE | Client user agent |
| `metadata` | JSONB | NULLABLE | Additional context (JSON format) |
| `timestamp` | TIMESTAMP | DEFAULT NOW(), NOT NULL | Action timestamp |

**Relationships**:
- `user_id` → `hr_public.users.id` (Many-to-One: Action by user)
- `department_id` → `hr_public.departments.id` (Many-to-One: Action in department context)

**Validation Rules**:
- FR-028: All management actions must be logged
- FR-020: Admins can view audit logs for entire organization
- Logs are append-only (no updates or deletes)

**State Transitions**:
- No state transitions (immutable logs)

---

### 11. SystemSetting

**Description**: Application configuration, feature toggles, and integrations managed by admins.

**Table**: `hr_public.system_settings`

**Fields**:
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PK, NOT NULL | Setting identifier |
| `key` | VARCHAR(255) | UNIQUE, NOT NULL | Setting key (e.g., 'max_leave_days') |
| `value` | TEXT | NOT NULL | Setting value (string, number, or JSON) |
| `category` | VARCHAR(50) | NOT NULL | Category: 'general', 'security', 'integrations', 'features' |
| `description` | TEXT | NULLABLE | Human-readable description |
| `is_public` | BOOLEAN | DEFAULT false | Whether setting is visible to non-admins |
| `updated_by` | UUID | FK → users.id, NOT NULL | Admin who last updated setting |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Setting creation timestamp |
| `updated_at` | TIMESTAMP | DEFAULT NOW() | Last update timestamp |

**Relationships**:
- `updated_by` → `hr_public.users.id` (Many-to-One: Setting updated by admin)

**Validation Rules**:
- FR-019: Only admins can access System Settings page
- Setting keys must be unique
- `updated_by` must reference a user with admin role

**State Transitions**:
- `value: A → B` (Setting value changed by admin)
- `is_public: false → true` (Setting made visible to non-admins)

---

## Entity Relationship Diagram (ERD)

```
┌──────────────┐
│  Department  │
│──────────────│
│ id (PK)      │◄────┐
│ name         │     │
│ description  │     │
│ manager_id   │─────┼───────────────────┐
│ is_active    │     │                   │
└──────────────┘     │                   │
       ▲             │                   │
       │             │                   │
       │             │                   ▼
       │             │            ┌──────────────┐
       │             │            │     User     │
       │             │            │──────────────│
       │             └────────────┤ id (PK)      │
       │                          │ email        │
       │                          │ display_name │
       │                     ┌────┤ role         │
       │                     │    │ department_id│◄───┐
       │                     │    │ is_active    │    │
       │                     │    └──────────────┘    │
       │                     │           ▲            │
       │                     │           │            │
       │                     │           │            │
┌──────┴──────────┐  ┌───────┴────────┐ │ ┌──────────┴─────────┐
│  LeaveRequest   │  │PerformanceReview│ │ │       Goal         │
│─────────────────│  │─────────────────│ │ │────────────────────│
│ id (PK)         │  │ id (PK)         │ │ │ id (PK)            │
│ user_id (FK)    │  │ reviewee_id (FK)│ │ │ user_id (FK)       │
│ department_id   │  │ reviewer_id (FK)│ │ │ manager_id (FK)    │
│ start_date      │  │ department_id   │ │ │ department_id (FK) │
│ end_date        │  │ review_period   │ │ │ title              │
│ status          │  │ status          │ │ │ progress           │
│ reviewer_id (FK)│  │ overall_rating  │ │ │ status             │
└─────────────────┘  └─────────────────┘ │ └────────────────────┘
                                         │
       ┌─────────────────────────────────┤
       │                                 │
┌──────┴──────────┐  ┌──────────────────┴┐  ┌─────────────────┐
│      Task       │  │      Report       │  │   AuditLog      │
│─────────────────│  │───────────────────│  │─────────────────│
│ id (PK)         │  │ id (PK)           │  │ id (PK)         │
│ assignee_id (FK)│  │ creator_id (FK)   │  │ user_id (FK)    │
│ assigner_id (FK)│  │ department_id (FK)│  │ action          │
│ department_id   │  │ title             │  │ resource        │
│ title           │  │ report_type       │  │ resource_id     │
│ status          │  │ data (JSONB)      │  │ department_id   │
│ priority        │  │ status            │  │ timestamp       │
└─────────────────┘  └───────────────────┘  └─────────────────┘

                     ┌───────────────────┐
                     │  SystemSetting    │
                     │───────────────────│
                     │ id (PK)           │
                     │ key (UNIQUE)      │
                     │ value             │
                     │ category          │
                     │ updated_by (FK)   │◄────┐
                     └───────────────────┘     │
                                               │
                                         (Admin User)
```

---

## Database Schema Validation Checklist

Based on FR-018 to FR-025 requirements:

- [x] `hr_public.departments` table exists with `manager_id` FK to `users.id`
- [x] `hr_public.users` table exists with `department_id` FK to `departments.id`
- [x] `hr_public.leave_requests` table exists with proper FKs to users and departments
- [x] `hr_public.performance_reviews` table exists with FKs to users (reviewee, reviewer) and departments
- [x] `hr_public.goals` table exists with FKs to users and departments
- [x] `hr_public.tasks` table exists with FKs to users (assignee, assigner) and departments
- [x] `hr_public.reports` table exists with metadata linking to departments and users
- [x] `hr_public.audit_logs` table exists for logging management actions
- [x] `hr_public.system_settings` table exists for admin configuration
- [x] All foreign key constraints enforce referential integrity

---

## Notes

- All entities use UUID primary keys for better distribution and security
- Timestamps use `TIMESTAMP` type with `DEFAULT NOW()` for automatic tracking
- JSON fields (`JSONB` in PostgreSQL) used for flexible data storage in reports and settings
- Department transfer detection (FR-029) requires subscription on `users.department_id` changes
- RLS policies will be implemented at database level to enforce manager department-scoping
- Admin role bypasses RLS policies for unrestricted access (FR-010)
