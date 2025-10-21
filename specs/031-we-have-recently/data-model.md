# Data Model: Rust GraphQL API Complete Coverage

**Feature**: 031-we-have-recently
**Date**: 2025-10-11
**Source**: PostgreSQL hr_public schema (43+ tables)

## Design Principles

1. **Direct Database Mapping**: Rust structs map 1:1 to PostgreSQL tables
2. **camelCase GraphQL Fields**: Field names use camelCase for PostGraphile compatibility
3. **snake_case Rust Fields**: Rust struct fields use snake_case (sqlx derives camelCase via `#[graphql(name)]`)
4. **Soft Delete Support**: All queries exclude `deleted_at IS NOT NULL` by default
5. **Relationship Lazy Loading**: Use DataLoader for N+1 prevention on foreign key relationships

---

## Domain 1: Employee Management (5 new models)

### EmployeeSkill

**Table**: `hr_public.employee_skills`
**Purpose**: Track employee skillsets with proficiency levels

```rust
#[derive(SimpleObject, sqlx::FromRow)]
#[graphql(name = "EmployeeSkill")]
pub struct EmployeeSkill {
    #[graphql(name = "id")]
    pub id: Uuid,

    #[graphql(name = "employeeId")]
    pub employee_id: Uuid,

    #[graphql(name = "skillName")]
    pub skill_name: String,

    #[graphql(name = "proficiencyLevel")]
    pub proficiency_level: ProficiencyLevel,

    #[graphql(name = "yearsExperience")]
    pub years_experience: Option<f64>,

    #[graphql(name = "verified")]
    pub verified: bool,

    #[graphql(name = "verifierId")]
    pub verifier_id: Option<Uuid>,

    #[graphql(name = "createdAt")]
    pub created_at: DateTime<Utc>,

    #[graphql(name = "updatedAt")]
    pub updated_at: DateTime<Utc>,
}

#[derive(Enum, Copy, Clone, Eq, PartialEq, sqlx::Type)]
#[sqlx(type_name = "proficiency_level", rename_all = "lowercase")]
pub enum ProficiencyLevel {
    Beginner,
    Intermediate,
    Advanced,
    Expert,
}

// Relationships
#[Object]
impl EmployeeSkill {
    async fn employee(&self, ctx: &Context<'_>) -> Result<User> {
        // DataLoader lookup
    }

    async fn verifier(&self, ctx: &Context<'_>) -> Result<Option<User>> {
        // DataLoader lookup
    }
}
```

### EmployeeCertification

**Table**: `hr_public.employee_certifications`
**Purpose**: Track professional certifications with expiration dates

```rust
#[derive(SimpleObject, sqlx::FromRow)]
#[graphql(name = "EmployeeCertification")]
pub struct EmployeeCertification {
    #[graphql(name = "id")]
    pub id: Uuid,

    #[graphql(name = "employeeId")]
    pub employee_id: Uuid,

    #[graphql(name = "certificationName")]
    pub certification_name: String,

    #[graphql(name = "issuingOrganization")]
    pub issuing_organization: String,

    #[graphql(name = "issueDate")]
    pub issue_date: NaiveDate,

    #[graphql(name = "expirationDate")]
    pub expiration_date: Option<NaiveDate>,

    #[graphql(name = "certificationNumber")]
    pub certification_number: Option<String>,

    #[graphql(name = "createdAt")]
    pub created_at: DateTime<Utc>,

    #[graphql(name = "updatedAt")]
    pub updated_at: DateTime<Utc>,
}
```

### EmployeeVehicle

**Table**: `hr_public.employee_vehicles`
**Purpose**: Vehicle registration for parking and access control

```rust
#[derive(SimpleObject, sqlx::FromRow)]
#[graphql(name = "EmployeeVehicle")]
pub struct EmployeeVehicle {
    #[graphql(name = "id")]
    pub id: Uuid,

    #[graphql(name = "employeeId")]
    pub employee_id: Uuid,

    #[graphql(name = "make")]
    pub make: String,

    #[graphql(name = "model")]
    pub model: String,

    #[graphql(name = "year")]
    pub year: i32,

    #[graphql(name = "licensePlate")]
    pub license_plate: String,

    #[graphql(name = "color")]
    pub color: Option<String>,

    #[graphql(name = "createdAt")]
    pub created_at: DateTime<Utc>,

    #[graphql(name = "updatedAt")]
    pub updated_at: DateTime<Utc>,
}
```

### EmergencyContact

**Table**: `hr_public.emergency_contacts`
**Purpose**: Emergency contact information for employees

```rust
#[derive(SimpleObject, sqlx::FromRow)]
#[graphql(name = "EmergencyContact")]
pub struct EmergencyContact {
    #[graphql(name = "id")]
    pub id: Uuid,

    #[graphql(name = "employeeId")]
    pub employee_id: Uuid,

    #[graphql(name = "contactName")]
    pub contact_name: String,

    #[graphql(name = "relationship")]
    pub relationship: String,

    #[graphql(name = "phoneNumber")]
    pub phone_number: String,

    #[graphql(name = "email")]
    pub email: Option<String>,

    #[graphql(name = "isPrimary")]
    pub is_primary: bool,

    #[graphql(name = "createdAt")]
    pub created_at: DateTime<Utc>,

    #[graphql(name = "updatedAt")]
    pub updated_at: DateTime<Utc>,
}
```

### EmployeeGoal

**Table**: `hr_public.employee_goals`
**Purpose**: Individual goal tracking separate from performance reviews

```rust
#[derive(SimpleObject, sqlx::FromRow)]
#[graphql(name = "EmployeeGoal")]
pub struct EmployeeGoal {
    #[graphql(name = "id")]
    pub id: Uuid,

    #[graphql(name = "employeeId")]
    pub employee_id: Uuid,

    #[graphql(name = "goalTitle")]
    pub goal_title: String,

    #[graphql(name = "goalDescription")]
    pub goal_description: Option<String>,

    #[graphql(name = "targetDate")]
    pub target_date: Option<NaiveDate>,

    #[graphql(name = "status")]
    pub status: GoalStatus,

    #[graphql(name = "progressPercentage")]
    pub progress_percentage: i32,

    #[graphql(name = "createdAt")]
    pub created_at: DateTime<Utc>,

    #[graphql(name = "updatedAt")]
    pub updated_at: DateTime<Utc>,
}

#[derive(Enum, Copy, Clone, Eq, PartialEq, sqlx::Type)]
#[sqlx(type_name = "goal_status", rename_all = "snake_case")]
pub enum GoalStatus {
    NotStarted,
    InProgress,
    Completed,
    Cancelled,
}
```

---

## Domain 2: Document Management (6 new models)

### Document

**Table**: `hr_public.documents`
**Purpose**: Core document metadata and storage references

```rust
#[derive(SimpleObject, sqlx::FromRow)]
#[graphql(name = "Document")]
pub struct Document {
    #[graphql(name = "id")]
    pub id: Uuid,

    #[graphql(name = "title")]
    pub title: String,

    #[graphql(name = "description")]
    pub description: Option<String>,

    #[graphql(name = "categoryId")]
    pub category_id: Option<Uuid>,

    #[graphql(name = "filePath")]
    pub file_path: String,

    #[graphql(name = "fileSize")]
    pub file_size: i32,

    #[graphql(name = "mimeType")]
    pub mime_type: String,

    #[graphql(name = "uploaderId")]
    pub uploader_id: Uuid,

    #[graphql(name = "createdAt")]
    pub created_at: DateTime<Utc>,

    #[graphql(name = "updatedAt")]
    pub updated_at: DateTime<Utc>,

    #[graphql(name = "deletedAt")]
    pub deleted_at: Option<DateTime<Utc>>,
}

// Relationships
#[Object]
impl Document {
    async fn category(&self, ctx: &Context<'_>) -> Result<Option<DocumentCategory>> { }
    async fn uploader(&self, ctx: &Context<'_>) -> Result<User> { }
    async fn versions(&self, ctx: &Context<'_>) -> Result<Vec<DocumentVersion>> { }
    async fn assignments(&self, ctx: &Context<'_>) -> Result<Vec<DocumentAssignment>> { }
}
```

### DocumentVersion, DocumentCategory, DocumentAssignment, DocumentAccessLog, EncryptedFileStorage

_(Similar pattern - see full models in implementation)_

---

## Domain 3: Time Management (2 new models)

### TimeOffPolicy

**Table**: `hr_public.time_off_policies`
**Purpose**: Leave accrual rules and policies

### AttendanceRecord

**Table**: `hr_public.attendance_records`
**Purpose**: Daily attendance and time tracking

---

## Domain 4: Analytics (4 new read-only models)

### DashboardSummary

**Materialized View**: `hr_public.dashboard_summaries`
**Purpose**: Global KPIs across all tables

```rust
#[derive(SimpleObject, sqlx::FromRow)]
#[graphql(name = "DashboardSummary")]
pub struct DashboardSummary {
    #[graphql(name = "summaryKey")]
    pub summary_key: String,  // Always "global"

    #[graphql(name = "totalActiveEmployees")]
    pub total_active_employees: i32,

    #[graphql(name = "tasksInProgress")]
    pub tasks_in_progress: i32,

    #[graphql(name = "pendingLeaveRequests")]
    pub pending_leave_requests: i32,

    #[graphql(name = "expiredCertifications")]
    pub expired_certifications: i32,

    #[graphql(name = "lastRefreshedAt")]
    pub last_refreshed_at: DateTime<Utc>,
}
```

### DepartmentMetric, GoalStatistic, ReportAnalytic

_(Similar read-only materialized view pattern)_

---

## Domain 5: System Administration (7 new models)

### RollbackRequest, BulkRollbackBatch, BulkRollbackItem, ActivityLog, HRReport, CompensationBand, PayrollRecord

_(See implementation for full models)_

---

## Domain 6: Event Extensions (3 new models)

### EventComment, EventHistory, EventWaitlist

---

## Domain 7: Task Extensions (1 new model)

### TaskType

---

## Domain 8: Review Extensions (1 new model)

### ReviewTemplate

---

## Validation Rules

### Required Fields
- All `id` fields are UUIDs and non-null
- All `*_id` foreign keys must reference existing records
- Email fields must match RFC 5322 format
- Phone fields must match E.164 format

### Business Logic
- `proficiency_level` progression: beginner → intermediate → advanced → expert
- `certification expiration_date` must be after `issue_date`
- `attendance_record.total_hours` calculated from `clock_in` - `clock_out`
- Materialized views are read-only (no mutations)

### Soft Delete
- Default queries exclude `deleted_at IS NOT NULL`
- Use `includeDeleted: true` filter to retrieve soft-deleted records
- Only Admins can permanently delete records (hard delete)

---

## Relationship Summary

**New Relationships Added**:
- `User.skills` → `EmployeeSkill[]` (1-to-many via DataLoader)
- `User.certifications` → `EmployeeCertification[]` (1-to-many)
- `User.vehicles` → `EmployeeVehicle[]` (1-to-many)
- `User.emergencyContacts` → `EmergencyContact[]` (1-to-many)
- `User.goals` → `EmployeeGoal[]` (1-to-many)
- `Document.category` → `DocumentCategory` (many-to-1)
- `Event.comments` → `EventComment[]` (1-to-many)
- `Event.history` → `EventHistory[]` (1-to-many)
- `Event.waitlist` → `EventWaitlist[]` (1-to-many)
- `Task.taskType` → `TaskType` (many-to-1)
- `PerformanceReview.template` → `ReviewTemplate` (many-to-1)

**Total New Relationships**: ~30 (with DataLoader batching)

---

## State Transitions

### EmployeeGoal Status
```
NOT_STARTED → IN_PROGRESS → COMPLETED
           ↓             ↘
       CANCELLED ← ← ← ← ← ←
```

### RollbackRequest Status
```
PENDING → APPROVED → COMPLETED
       ↘ REJECTED
```

---

**Model Count**: 23 new models + 20 existing = 43 total
**Relationship Count**: ~30 new + 70 existing = 100+ total
**Materialized Views**: 4 (read-only with explicit refresh mutations)
