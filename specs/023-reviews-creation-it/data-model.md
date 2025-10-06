# Data Model

**Feature**: Performance Reviews Creation with Goals Integration
**Date**: 2025-10-06

## Entity Relationship Diagram

```
┌─────────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│  performance_       │         │  review_goals    │         │     goals       │
│  reviews            │◄────────┤  (junction)      ├────────►│                 │
└─────────────────────┘  1:N    └──────────────────┘  N:1    └─────────────────┘
         │                                                              │
         │ N:1                                                      N:1 │
         ▼                                                              ▼
┌─────────────────────┐                                      ┌─────────────────┐
│      users          │                                      │      users      │
│   (employees)       │                                      │   (employees)   │
└─────────────────────┘                                      └─────────────────┘
         │
         │ N:1
         ▼
┌─────────────────────┐
│   users             │
│  (reviewers)        │
└─────────────────────┘
```

## Entity Definitions

### performance_reviews

**Purpose**: Represents a formal performance review for an employee

**Fields**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, NOT NULL | Primary key |
| employee_id | UUID | FK → users.id, NOT NULL | Employee being reviewed |
| reviewer_id | UUID | FK → users.id, NOT NULL | Admin or manager conducting review |
| review_type | review_type | NOT NULL, DEFAULT 'annual_review' | Type of review (see enum) |
| status | review_status | NOT NULL, DEFAULT 'draft' | Review lifecycle status |
| review_period_start | DATE | NULLABLE | Start of review period |
| review_period_end | DATE | NULLABLE | End of review period |
| notes | TEXT | NULLABLE | General notes and comments |
| overall_rating | INTEGER | NULLABLE, CHECK (overall_rating BETWEEN 1 AND 5) | Optional rating |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Last update timestamp |
| completed_at | TIMESTAMP | NULLABLE | When review was completed |

**Enums**:

```typescript
enum ReviewType {
  ANNUAL_REVIEW = 'annual_review',
  MID_YEAR_REVIEW = 'mid_year_review',
  QUARTERLY_REVIEW = 'quarterly_review',
  PROBATIONARY_REVIEW = 'probationary_review',
  PERFORMANCE_IMPROVEMENT_PLAN = 'performance_improvement_plan',
  NINETY_DAY_REVIEW = 'ninety_day_review',
  PROJECT_BASED_REVIEW = 'project_based_review',
  PROMOTION_REVIEW = 'promotion_review',
  EXIT_REVIEW = 'exit_review',
  SELF_REVIEW = 'self_review'
}

enum ReviewStatus {
  DRAFT = 'draft',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed'
}
```

**Indexes**:
- `idx_performance_reviews_employee` ON (employee_id)
- `idx_performance_reviews_reviewer` ON (reviewer_id)
- `idx_performance_reviews_status` ON (status)
- `idx_performance_reviews_employee_type` ON (employee_id, review_type)
- `idx_active_reviews_unique` UNIQUE (employee_id, review_type) WHERE status IN ('draft', 'in_progress')

**RLS Policies**:
```sql
-- Employees can view their own reviews
CREATE POLICY view_own_reviews ON performance_reviews
  FOR SELECT
  USING (employee_id = current_user_id() OR reviewer_id = current_user_id());

-- Admins can view all reviews
CREATE POLICY admin_view_all ON performance_reviews
  FOR SELECT
  USING (has_role('admin') OR has_role('super_admin'));

-- Managers can view reviews for their direct reports
CREATE POLICY manager_view_direct_reports ON performance_reviews
  FOR SELECT
  USING (
    has_role('manager') AND
    employee_id IN (SELECT id FROM users WHERE manager_id = current_user_id())
  );

-- Admins and managers can create/update reviews
CREATE POLICY create_update_reviews ON performance_reviews
  FOR ALL
  USING (has_role('admin') OR has_role('super_admin') OR has_role('manager'))
  WITH CHECK (has_role('admin') OR has_role('super_admin') OR has_role('manager'));
```

**State Transitions**:
```
draft → in_progress → completed
  ↓         ↓
  ↓    → → → (can save draft at any time)
  └─────────┘
```

**Validation Rules**:
- `employee_id` and `reviewer_id` must reference valid users
- `review_period_end` must be >= `review_period_start` if both provided
- Cannot create duplicate active reviews (enforced by partial unique index)
- `completed_at` timestamp required when status = 'completed'
- Manager creating review must have `employee_id` as direct report (resolver validation)

---

### goals

**Purpose**: Represents a performance objective for an employee

**Fields**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, NOT NULL | Primary key |
| employee_id | UUID | FK → users.id, NOT NULL | Employee who owns the goal |
| title | VARCHAR(255) | NOT NULL | Goal title |
| description | TEXT | NOT NULL | Detailed goal description |
| target_completion_date | DATE | NOT NULL | When goal should be completed |
| actual_completion_date | DATE | NULLABLE | When goal was actually completed |
| status | goal_status | NOT NULL, DEFAULT 'active' | Goal lifecycle status |
| success_metrics | TEXT | NOT NULL | How success is measured |
| progress_percentage | INTEGER | NOT NULL, DEFAULT 0, CHECK (progress_percentage BETWEEN 0 AND 100) | Progress tracking |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Last update timestamp |
| deleted | BOOLEAN | NOT NULL, DEFAULT FALSE | Soft delete flag |
| deleted_at | TIMESTAMP | NULLABLE | When goal was soft-deleted |

**Enums**:

```typescript
enum GoalStatus {
  ACTIVE = 'active',
  ACHIEVED = 'achieved',
  MISSED = 'missed',
  CANCELLED = 'cancelled',
  DELETED = 'deleted'
}
```

**Indexes**:
- `idx_goals_employee` ON (employee_id)
- `idx_goals_status` ON (status)
- `idx_goals_deleted` ON (deleted)
- `idx_goals_employee_active` ON (employee_id, status) WHERE deleted = FALSE

**RLS Policies**:
```sql
-- Employees can view their own goals
CREATE POLICY view_own_goals ON goals
  FOR SELECT
  USING (employee_id = current_user_id());

-- Admins and managers can view goals for employees under their purview
CREATE POLICY view_managed_goals ON goals
  FOR SELECT
  USING (
    has_role('admin') OR has_role('super_admin') OR
    (has_role('manager') AND employee_id IN (
      SELECT id FROM users WHERE manager_id = current_user_id()
    ))
  );

-- Admins and managers can create/update goals
CREATE POLICY manage_goals ON goals
  FOR ALL
  USING (
    has_role('admin') OR has_role('super_admin') OR
    (has_role('manager') AND employee_id IN (
      SELECT id FROM users WHERE manager_id = current_user_id()
    ))
  );
```

**Validation Rules**:
- `employee_id` must reference valid user
- `title` cannot be empty
- `description` and `success_metrics` cannot be empty
- `target_completion_date` must be in the future at creation time
- When `status` = 'achieved', `actual_completion_date` should be set
- Soft delete sets `deleted` = TRUE and `deleted_at` timestamp

---

### review_goals (Junction Table)

**Purpose**: Many-to-many relationship between performance reviews and goals

**Fields**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, NOT NULL | Primary key |
| review_id | UUID | FK → performance_reviews.id ON DELETE CASCADE, NOT NULL | Review reference |
| goal_id | UUID | FK → goals.id ON DELETE RESTRICT, NOT NULL | Goal reference |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | When association was created |

**Indexes**:
- `idx_review_goals_review` ON (review_id)
- `idx_review_goals_goal` ON (goal_id)
- `idx_review_goals_unique` UNIQUE (review_id, goal_id)

**RLS Policies**:
```sql
-- Inherit visibility from parent performance_reviews table
CREATE POLICY view_review_goals ON review_goals
  FOR SELECT
  USING (
    review_id IN (
      SELECT id FROM performance_reviews
      WHERE employee_id = current_user_id() OR reviewer_id = current_user_id()
    )
  );

-- Admins and managers can manage associations
CREATE POLICY manage_review_goals ON review_goals
  FOR ALL
  USING (
    review_id IN (
      SELECT id FROM performance_reviews
      WHERE reviewer_id = current_user_id()
    )
  );
```

**Constraints**:
- `ON DELETE CASCADE` for `review_id`: If review deleted, associations removed
- `ON DELETE RESTRICT` for `goal_id`: Cannot delete goal if linked to active reviews (use soft delete)
- UNIQUE constraint prevents duplicate goal associations per review

---

### users (Extended for Reporting Relationships)

**Purpose**: User accounts with manager-employee relationships

**Relevant Fields** (for review feature):

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, NOT NULL | Primary key |
| first_name | VARCHAR(100) | NOT NULL | First name |
| last_name | VARCHAR(100) | NOT NULL | Last name |
| email | VARCHAR(255) | UNIQUE, NOT NULL | Email address |
| role | user_role | NOT NULL | User role (admin, manager, employee) |
| manager_id | UUID | FK → users.id, NULLABLE | Direct manager reference |
| department_id | UUID | FK → departments.id, NULLABLE | Department assignment |

**Indexes** (relevant to reviews):
- `idx_users_manager` ON (manager_id)
- `idx_users_role` ON (role)

**Helper Functions**:

```sql
-- Get current authenticated user ID
CREATE FUNCTION current_user_id() RETURNS UUID AS $$
  SELECT id FROM users WHERE email = current_user_email();
$$ LANGUAGE SQL STABLE;

-- Check if user has specific role
CREATE FUNCTION has_role(role_name TEXT) RETURNS BOOLEAN AS $$
  SELECT EXISTS(
    SELECT 1 FROM users
    WHERE id = current_user_id()
    AND role = role_name
  );
$$ LANGUAGE SQL STABLE;

-- Check if user A is direct report of user B
CREATE FUNCTION is_direct_report(employee_id UUID, manager_id UUID) RETURNS BOOLEAN AS $$
  SELECT EXISTS(
    SELECT 1 FROM users
    WHERE id = employee_id
    AND manager_id = manager_id
  );
$$ LANGUAGE SQL STABLE;
```

---

## TypeScript Type Definitions

### Generated from GraphQL Schema

```typescript
// Auto-generated by graphql-codegen
export type PerformanceReview = {
  id: string;
  employeeId: string;
  reviewerId: string;
  reviewType: ReviewType;
  status: ReviewStatus;
  reviewPeriodStart?: string | null;
  reviewPeriodEnd?: string | null;
  notes?: string | null;
  overallRating?: number | null;
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;

  // Relations
  employee: User;
  reviewer: User;
  goals: Goal[];
};

export type Goal = {
  id: string;
  employeeId: string;
  title: string;
  description: string;
  targetCompletionDate: string;
  actualCompletionDate?: string | null;
  status: GoalStatus;
  successMetrics: string;
  progressPercentage: number;
  createdAt: string;
  updatedAt: string;
  deleted: boolean;
  deletedAt?: string | null;

  // Relations
  employee: User;
  reviews: PerformanceReview[];
};

export type ReviewGoal = {
  id: string;
  reviewId: string;
  goalId: string;
  createdAt: string;

  // Relations
  review: PerformanceReview;
  goal: Goal;
};

export enum ReviewType {
  ANNUAL_REVIEW = 'ANNUAL_REVIEW',
  MID_YEAR_REVIEW = 'MID_YEAR_REVIEW',
  QUARTERLY_REVIEW = 'QUARTERLY_REVIEW',
  PROBATIONARY_REVIEW = 'PROBATIONARY_REVIEW',
  PERFORMANCE_IMPROVEMENT_PLAN = 'PERFORMANCE_IMPROVEMENT_PLAN',
  NINETY_DAY_REVIEW = 'NINETY_DAY_REVIEW',
  PROJECT_BASED_REVIEW = 'PROJECT_BASED_REVIEW',
  PROMOTION_REVIEW = 'PROMOTION_REVIEW',
  EXIT_REVIEW = 'EXIT_REVIEW',
  SELF_REVIEW = 'SELF_REVIEW'
}

export enum ReviewStatus {
  DRAFT = 'DRAFT',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED'
}

export enum GoalStatus {
  ACTIVE = 'ACTIVE',
  ACHIEVED = 'ACHIEVED',
  MISSED = 'MISSED',
  CANCELLED = 'CANCELLED',
  DELETED = 'DELETED'
}
```

### Zod Validation Schemas

```typescript
import { z } from 'zod';

export const ReviewTypeSchema = z.enum([
  'annual_review',
  'mid_year_review',
  'quarterly_review',
  'probationary_review',
  'performance_improvement_plan',
  'ninety_day_review',
  'project_based_review',
  'promotion_review',
  'exit_review',
  'self_review'
]);

export const ReviewStatusSchema = z.enum(['draft', 'in_progress', 'completed']);

export const CreateReviewSchema = z.object({
  employeeId: z.string().uuid(),
  reviewType: ReviewTypeSchema,
  reviewPeriodStart: z.string().date().optional(),
  reviewPeriodEnd: z.string().date().optional(),
  goalIds: z.array(z.string().uuid()).default([]),
  newGoals: z.array(z.object({
    title: z.string().min(1).max(255),
    description: z.string().min(1),
    targetCompletionDate: z.string().date(),
    successMetrics: z.string().min(1)
  })).default([]),
  notes: z.string().optional()
}).refine(data => {
  // Validate period dates if both provided
  if (data.reviewPeriodStart && data.reviewPeriodEnd) {
    return new Date(data.reviewPeriodEnd) >= new Date(data.reviewPeriodStart);
  }
  return true;
}, {
  message: 'Review period end date must be after start date'
});

export const UpdateReviewDraftSchema = z.object({
  id: z.string().uuid(),
  reviewType: ReviewTypeSchema.optional(),
  reviewPeriodStart: z.string().date().optional(),
  reviewPeriodEnd: z.string().date().optional(),
  notes: z.string().optional()
});

export const CreateGoalSchema = z.object({
  employeeId: z.string().uuid(),
  title: z.string().min(1).max(255),
  description: z.string().min(1),
  targetCompletionDate: z.string().date(),
  successMetrics: z.string().min(1)
});

export const LinkGoalToReviewSchema = z.object({
  reviewId: z.string().uuid(),
  goalId: z.string().uuid()
});

export type CreateReviewInput = z.infer<typeof CreateReviewSchema>;
export type UpdateReviewDraftInput = z.infer<typeof UpdateReviewDraftSchema>;
export type CreateGoalInput = z.infer<typeof CreateGoalSchema>;
export type LinkGoalToReviewInput = z.infer<typeof LinkGoalToReviewSchema>;
```

---

## Migration Plan

### Migration 001: Add Review Type and Status Fields

```sql
-- Add enums
CREATE TYPE review_type AS ENUM (
  'annual_review', 'mid_year_review', 'quarterly_review',
  'probationary_review', 'performance_improvement_plan',
  'ninety_day_review', 'project_based_review', 'promotion_review',
  'exit_review', 'self_review'
);

CREATE TYPE review_status AS ENUM ('draft', 'in_progress', 'completed');

-- Alter existing table
ALTER TABLE performance_reviews
  ADD COLUMN review_type review_type NOT NULL DEFAULT 'annual_review',
  ADD COLUMN status review_status NOT NULL DEFAULT 'draft',
  ADD COLUMN review_period_start DATE,
  ADD COLUMN review_period_end DATE,
  ADD COLUMN notes TEXT;

-- Create indexes
CREATE INDEX idx_performance_reviews_status ON performance_reviews(status);
CREATE INDEX idx_performance_reviews_employee_type ON performance_reviews(employee_id, review_type);

-- Create partial unique index for active reviews
CREATE UNIQUE INDEX idx_active_reviews_unique
  ON performance_reviews(employee_id, review_type)
  WHERE status IN ('draft', 'in_progress');
```

### Migration 002: Add Soft Delete to Goals

```sql
-- Add soft delete fields
ALTER TABLE goals
  ADD COLUMN deleted BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN deleted_at TIMESTAMP;

-- Create index
CREATE INDEX idx_goals_deleted ON goals(deleted);
CREATE INDEX idx_goals_employee_active ON goals(employee_id, status) WHERE deleted = FALSE;
```

### Migration 003: Create Review-Goals Junction Table

```sql
-- Create junction table
CREATE TABLE review_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES performance_reviews(id) ON DELETE CASCADE,
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE RESTRICT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(review_id, goal_id)
);

-- Create indexes
CREATE INDEX idx_review_goals_review ON review_goals(review_id);
CREATE INDEX idx_review_goals_goal ON review_goals(goal_id);
```

### Migration 004: Add RLS Policies

```sql
-- Enable RLS
ALTER TABLE performance_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_goals ENABLE ROW LEVEL SECURITY;

-- Create policies (see entity definitions above for full policies)
```

---

## Data Validation Summary

| Validation | Layer | Method |
|------------|-------|--------|
| UUID format | Client | Zod schema |
| Required fields | Client + DB | Zod schema + NOT NULL constraints |
| Date range logic | Client | Zod refine() |
| Duplicate active reviews | Database | Partial unique index |
| Manager-employee relationship | Server (Resolver) | Direct report query |
| Role-based permissions | Database | RLS policies |
| Soft delete integrity | Database | ON DELETE RESTRICT on review_goals |
| Field length limits | Database | VARCHAR constraints |

---

**Data Model Complete**: All entities defined with relationships, constraints, indexes, RLS policies, and TypeScript types. Ready to generate contracts.
