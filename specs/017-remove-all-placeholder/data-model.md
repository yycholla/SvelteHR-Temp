# Data Model

**Feature**: Replace Placeholder Data with Database Integration
**Generated**: 2025-01-23

## Entity Definitions

### 1. SeedDataConfiguration
**Purpose**: Manages seed data generation parameters
**Fields**:
- `entityType`: string (enum: 'user', 'department', 'employee', 'hr_transaction')
- `minRecords`: number (minimum: 10)
- `maxRecords`: number (maximum: 50)
- `relationships`: boolean (generate related data)
- `createdAt`: timestamp
- `updatedAt`: timestamp

**Validation Rules**:
- minRecords >= 10
- maxRecords <= 50
- minRecords <= maxRecords

### 2. HealthCheckStatus
**Purpose**: Tracks backend service health
**Fields**:
- `id`: uuid
- `status`: enum ('healthy', 'initializing', 'error')
- `services`: jsonb {database: boolean, graphql: boolean, auth: boolean}
- `message`: string (nullable)
- `timestamp`: timestamp
- `responseTime`: number (milliseconds)

**State Transitions**:
- initializing → healthy (all services true)
- initializing → error (any service false after timeout)
- error → initializing (retry initiated)
- healthy → error (health check failure)

### 3. DataLoadStatus
**Purpose**: Tracks data loading state for each page
**Fields**:
- `pageRoute`: string (unique)
- `status`: enum ('loading', 'loaded', 'error', 'empty')
- `recordCount`: number
- `lastFetch`: timestamp
- `errorMessage`: string (nullable)
- `retryCount`: number (default: 0)

**Validation Rules**:
- retryCount <= 3
- recordCount >= 0
- Show "No data available" when recordCount < 5

### 4. SeedUser
**Purpose**: Test user with complete profile
**Fields**:
- `id`: number (auto-increment)
- `email`: string (unique)
- `firstName`: string
- `lastName`: string
- `role`: enum ('Admin', 'HR Manager', 'Manager', 'Employee')
- `departmentId`: number (foreign key)
- `isActive`: boolean
- `hireDate`: date
- `phoneNumber`: string (nullable)
- `address`: jsonb
- `createdAt`: timestamp
- `updatedAt`: timestamp

**Relationships**:
- belongsTo: Department
- hasMany: LeaveRequests
- hasMany: PerformanceReviews
- hasMany: Goals

### 5. SeedDepartment
**Purpose**: Organizational unit with hierarchy
**Fields**:
- `id`: number (auto-increment)
- `name`: string (unique)
- `code`: string (unique, uppercase, 3-5 chars)
- `parentDepartmentId`: number (nullable, foreign key)
- `managerId`: number (foreign key to User)
- `budget`: decimal (nullable)
- `headcount`: number
- `location`: string
- `isActive`: boolean
- `createdAt`: timestamp

**Relationships**:
- belongsTo: User (as manager)
- hasMany: Users (as employees)
- belongsTo: Department (as parent)
- hasMany: Departments (as children)

### 6. SeedLeaveRequest
**Purpose**: Time-off request with approval workflow
**Fields**:
- `id`: number (auto-increment)
- `employeeId`: number (foreign key)
- `leaveType`: enum ('vacation', 'sick', 'personal', 'maternity', 'paternity')
- `startDate`: date
- `endDate`: date
- `status`: enum ('pending', 'approved', 'rejected', 'cancelled')
- `approverId`: number (nullable, foreign key)
- `reason`: text
- `comments`: text (nullable)
- `createdAt`: timestamp
- `processedAt`: timestamp (nullable)

**State Transitions**:
- pending → approved (by manager/HR)
- pending → rejected (by manager/HR)
- pending → cancelled (by employee)
- No transitions from terminal states

### 7. SeedPerformanceReview
**Purpose**: Employee performance evaluation
**Fields**:
- `id`: number (auto-increment)
- `employeeId`: number (foreign key)
- `reviewerId`: number (foreign key)
- `reviewPeriod`: string (e.g., '2024-Q1')
- `overallRating`: number (1-5)
- `categories`: jsonb (array of {name, rating, comments})
- `strengths`: text
- `improvements`: text
- `goals`: text
- `status`: enum ('draft', 'submitted', 'acknowledged')
- `submittedAt`: timestamp (nullable)
- `acknowledgedAt`: timestamp (nullable)

**Validation Rules**:
- overallRating between 1 and 5
- All category ratings between 1 and 5
- Cannot edit after acknowledged

### 8. SeedGoal
**Purpose**: Employee objectives and key results
**Fields**:
- `id`: number (auto-increment)
- `employeeId`: number (foreign key)
- `title`: string
- `description`: text
- `category`: enum ('performance', 'development', 'project', 'team')
- `priority`: enum ('low', 'medium', 'high', 'critical')
- `status`: enum ('not_started', 'in_progress', 'completed', 'cancelled')
- `progress`: number (0-100)
- `dueDate`: date
- `completedAt`: timestamp (nullable)
- `createdBy`: number (foreign key)
- `createdAt`: timestamp

**State Transitions**:
- not_started → in_progress
- in_progress → completed
- in_progress → cancelled
- Any state → not_started (reset)

### 9. AnalyticsSnapshot
**Purpose**: Pre-calculated metrics for dashboards
**Fields**:
- `id`: uuid
- `snapshotDate`: date
- `metricType`: string
- `dimensions`: jsonb (e.g., {department: 'Engineering'})
- `metrics`: jsonb (e.g., {count: 45, growth: 0.12})
- `calculatedAt`: timestamp

**Validation Rules**:
- No future dates
- Metrics must be numeric
- Dimensions must match defined schema

## Relationships Diagram

```
User (1) ──────────┬──> (N) LeaveRequest
                   ├──> (N) PerformanceReview (as employee)
                   ├──> (N) PerformanceReview (as reviewer)
                   ├──> (N) Goal
                   └──> (1) Department (as manager)

Department (1) ────┬──> (N) User
                   ├──> (N) Department (children)
                   └──> (1) Department (parent)

LeaveRequest (N) ──┬──> (1) User (employee)
                   └──> (1) User (approver)

PerformanceReview (N) ─┬──> (1) User (employee)
                       └──> (1) User (reviewer)

Goal (N) ──────────┬──> (1) User (employee)
                   └──> (1) User (creator)
```

## Data Integrity Rules

1. **Referential Integrity**
   - All foreign keys must reference existing records
   - Cascade delete for dependent records
   - Restrict delete for records with dependencies

2. **Business Rules**
   - Manager must be in same or parent department
   - Leave requests cannot overlap for same employee
   - Performance reviews unique per employee/period
   - Goals must have due date in future when created

3. **Seed Data Constraints**
   - Maintain realistic ratios (e.g., 1 manager per 5-10 employees)
   - Ensure date ranges are logical (hire dates before review dates)
   - Generate complete object graphs (user with department, manager, etc.)

## Seed Data Generation Rules

### Distribution Guidelines

1. **Users** (40-50 records)
   - 1-2 Admin (2-4%)
   - 3-5 HR Manager (8-10%)
   - 8-10 Manager (20%)
   - 25-35 Employee (68-70%)

2. **Departments** (10-15 records)
   - 1 root (company)
   - 3-4 level 1 (divisions)
   - 6-10 level 2 (departments)

3. **Leave Requests** (30-50 records)
   - 40% approved
   - 30% pending
   - 20% rejected
   - 10% cancelled

4. **Performance Reviews** (30-40 records)
   - Distribution across rating scale (bell curve)
   - One per employee for current period
   - Some employees with historical reviews

5. **Goals** (40-50 records)
   - Mix of statuses weighted toward in_progress
   - Various priorities with business logic
   - Realistic progress percentages

## Migration Requirements

1. **Preserve Existing Data**
   - Backup before seeding
   - Non-destructive seed (only add, don't delete)
   - Flag seed data for easy cleanup

2. **Idempotent Operations**
   - Check existence before insert
   - Use upsert where appropriate
   - Track seed version for updates

---

*Data model designed to support comprehensive testing with realistic data relationships*