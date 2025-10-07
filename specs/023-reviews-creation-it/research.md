# Research & Technical Decisions

**Feature**: Performance Reviews Creation with Goals Integration
**Date**: 2025-10-06

## Overview

This document consolidates research findings and technical decisions for implementing the performance reviews feature with integrated goal management.

## Database Schema Design

### Decision: Extend Existing Tables with Review Types and Draft Support

**Rationale**:
- Leverage existing `performance_reviews` table structure
- Add `review_type` enum field for 10 review types
- Add `status` enum for draft/in-progress/completed workflow
- Extend `goals` table with soft-delete fields
- Create junction table `review_goals` for many-to-many relationship

**Database Changes Required**:

```sql
-- Review Types enum
CREATE TYPE review_type AS ENUM (
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
);

-- Review Status enum
CREATE TYPE review_status AS ENUM (
  'draft',
  'in_progress',
  'completed'
);

-- Extend performance_reviews table
ALTER TABLE performance_reviews
  ADD COLUMN review_type review_type NOT NULL DEFAULT 'annual_review',
  ADD COLUMN status review_status NOT NULL DEFAULT 'draft',
  ADD COLUMN review_period_start DATE,
  ADD COLUMN review_period_end DATE,
  ADD COLUMN notes TEXT;

-- Extend goals table for soft delete
ALTER TABLE goals
  ADD COLUMN deleted_at TIMESTAMP,
  ADD COLUMN deleted BOOLEAN NOT NULL DEFAULT FALSE;

-- Create review_goals junction table
CREATE TABLE review_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES performance_reviews(id) ON DELETE CASCADE,
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE RESTRICT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(review_id, goal_id)
);

-- Create indexes
CREATE INDEX idx_performance_reviews_status ON performance_reviews(status);
CREATE INDEX idx_performance_reviews_employee_type ON performance_reviews(employee_id, review_type);
CREATE INDEX idx_goals_deleted ON goals(deleted);
CREATE INDEX idx_review_goals_review ON review_goals(review_id);
CREATE INDEX idx_review_goals_goal ON review_goals(goal_id);
```

**Alternatives Considered**:
- **Separate review_types table**: Rejected - enums sufficient for fixed list, simpler schema
- **Hard delete goals**: Rejected - violates audit requirements, loses historical data
- **Store goals as JSONB in review**: Rejected - poor query performance, data duplication

## RBAC Implementation

### Decision: Server-Side Manager-Employee Relationship Validation

**Rationale**:
- Security-critical: Cannot trust client-side validation
- Query `reporting_relationships` or `department_managers` tables
- Cache validation results in Redis for performance
- Enforce at GraphQL resolver level before mutations

**Implementation Pattern**:

```typescript
// Server-side validation in GraphQL resolver
async function validateReviewCreation(userId: string, employeeId: string, userRole: string) {
  // Admin can create for anyone
  if (userRole === 'admin' || userRole === 'super_admin') {
    return true;
  }

  // Manager must verify direct report relationship
  if (userRole === 'manager' || userRole === 'hr_manager') {
    const isDirectReport = await checkDirectReport(userId, employeeId);
    if (!isDirectReport) {
      throw new Error('Managers can only create reviews for direct reports');
    }
    return true;
  }

  throw new Error('Insufficient permissions to create reviews');
}
```

**Alternatives Considered**:
- **Client-side only**: Rejected - security vulnerability
- **RLS policies alone**: Considered but resolver validation provides clearer error messages

## Draft Persistence Strategy

### Decision: Debounced Auto-Save with Explicit "Save Draft" Button

**Rationale**:
- User can explicitly save progress via button
- Auto-save after 3 seconds of inactivity (debounced)
- Store all form state: employee, type, dates, goals, notes
- Use optimistic UI updates for responsiveness

**Implementation**:

```typescript
// Svelte 5 runes pattern
let reviewForm = $state({
  employeeId: '',
  reviewType: '',
  periodStart: '',
  periodEnd: '',
  goals: [],
  notes: ''
});

let saveDebounceTimer = $state<number | null>(null);

function autoSaveDraft() {
  if (saveDebounceTimer) clearTimeout(saveDebounceTimer);

  saveDebounceTimer = setTimeout(async () => {
    await saveDraftMutation(reviewForm);
  }, 3000);
}

// Watch for changes
$effect(() => {
  // Trigger on any form field change
  if (reviewForm.employeeId || reviewForm.reviewType) {
    autoSaveDraft();
  }
});
```

**Alternatives Considered**:
- **No auto-save**: Rejected - poor UX, risk of data loss
- **Immediate save on every change**: Rejected - excessive database writes
- **Local storage only**: Rejected - doesn't sync across devices/sessions

## Goal Association UI Pattern

### Decision: Dual-Tab Interface (Create New / Link Existing)

**Rationale**:
- Clear separation of concerns
- "Create New Goal" tab: Inline form for new goal entry
- "Link Existing Goals" tab: Searchable list with checkboxes
- Goals can be added during initial creation or later during editing

**UI Component Structure**:

```
<GoalAssociationDialog>
  <Tabs>
    <Tab label="Create New Goal">
      <GoalForm onSubmit={createAndLinkGoal} />
    </Tab>
    <Tab label="Link Existing Goals">
      <GoalSearchList
        existingGoals={employeeGoals}
        selectedGoals={reviewGoals}
        onToggle={toggleGoalAssociation}
      />
    </Tab>
  </Tabs>
  <GoalsList goals={reviewGoals} onRemove={unlinkGoal} />
</GoalAssociationDialog>
```

**Alternatives Considered**:
- **Single modal with toggle**: Rejected - cluttered UI
- **Separate workflows**: Rejected - forces users to navigate away
- **Inline dropdowns**: Rejected - doesn't scale for many goals

## Duplicate Review Prevention

### Decision: Composite Index + GraphQL Query Validation

**Rationale**:
- Database constraint prevents duplicates at data layer
- GraphQL resolver validates before insert
- "Active" reviews = status IN ('draft', 'in_progress')
- Completed reviews don't block new reviews of same type

**Implementation**:

```sql
-- Partial unique index (only for active reviews)
CREATE UNIQUE INDEX idx_active_reviews_unique
  ON performance_reviews(employee_id, review_type)
  WHERE status IN ('draft', 'in_progress');
```

```typescript
// GraphQL resolver validation
async function createReview(employeeId, reviewType, status) {
  // Check for existing active review
  const existingActive = await db.query(`
    SELECT id FROM performance_reviews
    WHERE employee_id = $1
      AND review_type = $2
      AND status IN ('draft', 'in_progress')
  `, [employeeId, reviewType]);

  if (existingActive.length > 0) {
    throw new Error(`Active ${reviewType} review already exists. Complete it before creating a new one.`);
  }

  // Proceed with creation...
}
```

**Alternatives Considered**:
- **Application-level only**: Rejected - race conditions possible
- **Block all duplicates**: Rejected - prevents multiple reviews over time

## GraphQL Operations Design

### Decision: Mutations for CRUD + Custom Queries for Business Logic

**Rationale**:
- PostGraphile auto-generates CRUD mutations
- Add custom mutations for complex operations (e.g., `createReviewWithGoals`)
- Custom queries for filtered data (e.g., `activeReviewsForEmployee`)

**Key Operations**:

```graphql
# Create review with goals in single transaction
mutation CreateReviewWithGoals {
  createReviewWithGoals(input: {
    employeeId: "uuid"
    reviewType: ANNUAL_REVIEW
    reviewPeriodStart: "2025-01-01"
    reviewPeriodEnd: "2025-12-31"
    goalIds: ["uuid1", "uuid2"]
    newGoals: [{title: "...", description: "..."}]
    notes: "..."
  }) {
    review {
      id
      status
      goals { id title }
    }
  }
}

# Update draft review
mutation UpdateReviewDraft {
  updatePerformanceReview(input: {
    id: "uuid"
    patch: {
      notes: "..."
      reviewPeriodEnd: "2025-12-31"
    }
  }) {
    performanceReview { id }
  }
}

# Query active reviews for duplicate check
query ActiveReviewsForEmployee($employeeId: UUID!) {
  performanceReviews(
    condition: { employeeId: $employeeId }
    filter: { status: { in: [DRAFT, IN_PROGRESS] } }
  ) {
    nodes {
      id
      reviewType
      status
    }
  }
}
```

**Alternatives Considered**:
- **REST API**: Rejected - GraphQL already integrated
- **Multiple separate mutations**: Rejected - atomicity concerns

## Performance Optimization

### Decision: Redis Caching for Static and Frequently Accessed Data

**Rationale**:
- Review types (10 types) cached indefinitely
- Reporting relationships cached with 5-minute TTL
- Employee goal lists cached with 1-minute TTL
- Invalidate caches on relevant mutations

**Caching Strategy**:

```typescript
// Review types - cache indefinitely
const REVIEW_TYPES_CACHE_KEY = 'review_types:all';
const REVIEW_TYPES_TTL = null; // No expiration

// Reporting relationships - 5 min TTL
const DIRECT_REPORTS_CACHE_KEY = (managerId: string) => `manager:${managerId}:direct_reports`;
const DIRECT_REPORTS_TTL = 300;

// Employee goals - 1 min TTL
const EMPLOYEE_GOALS_CACHE_KEY = (employeeId: string) => `employee:${employeeId}:goals`;
const EMPLOYEE_GOALS_TTL = 60;
```

**Alternatives Considered**:
- **No caching**: Rejected - repeated queries for same data
- **Application-level caching**: Rejected - doesn't persist across instances

## Testing Strategy

### Decision: Contract Tests → Unit Tests → Integration Tests → E2E Tests

**Test Layers**:

1. **Contract Tests** (GraphQL Schema):
   - Validate request/response schemas
   - Ensure mutations accept correct input types
   - Verify enum values for review_type and status

2. **Unit Tests** (Components & Utilities):
   - RBAC validation logic
   - Form validation with Zod schemas
   - Draft auto-save debounce logic
   - Goal association state management

3. **Integration Tests** (GraphQL Resolvers):
   - Create review with goals (transaction)
   - Duplicate review prevention
   - Manager direct report validation
   - Soft-delete goal handling

4. **E2E Tests** (User Workflows):
   - Admin creates review for any employee
   - Manager creates review for direct report only
   - Manager cannot create review for non-report
   - Draft save and resume across sessions
   - Goal creation and linking workflows

**Alternatives Considered**:
- **E2E only**: Rejected - slow feedback, hard to debug
- **No contract tests**: Rejected - GraphQL schema can drift

## Accessibility Considerations

### Decision: WCAG 2.1 AA Compliance with Keyboard Navigation

**Key Requirements**:
- All form controls keyboard accessible (Tab, Enter, Escape)
- Dialogs trap focus and return focus on close
- ARIA labels for screen readers
- Clear error messages and validation feedback
- Sufficient color contrast (4.5:1 minimum)

**Implementation Pattern**:

```svelte
<Dialog.Root bind:open={showDialog}>
  <Dialog.Trigger asChild let:builder>
    <Button builders={[builder]} aria-label="Start Performance Review">
      Start Review
    </Button>
  </Dialog.Trigger>

  <Dialog.Content aria-describedby="review-creation-description">
    <Dialog.Header>
      <Dialog.Title>Create Performance Review</Dialog.Title>
      <Dialog.Description id="review-creation-description">
        Select review type and add goals for {employeeName}
      </Dialog.Description>
    </Dialog.Header>

    <!-- Form with proper labels and error messages -->
  </Dialog.Content>
</Dialog.Root>
```

**Alternatives Considered**:
- **Manual accessibility**: Rejected - shadcn/ui provides built-in patterns

## Summary of Decisions

| Area | Decision | Rationale |
|------|----------|-----------|
| Database | Extend existing tables with enums | Leverage existing schema, simpler migrations |
| RBAC | Server-side manager validation | Security-critical, cannot trust client |
| Drafts | Debounced auto-save + explicit save | Balance UX and performance |
| Goals UI | Dual-tab interface | Clear separation, scalable |
| Duplicates | DB partial index + resolver check | Data integrity at multiple layers |
| GraphQL | Custom mutations for complex ops | Leverage PostGraphile, add business logic |
| Caching | Redis for static/frequent data | Reduce DB load, improve response time |
| Testing | 4-layer pyramid strategy | Fast feedback, comprehensive coverage |
| A11y | shadcn/ui + keyboard nav | WCAG 2.1 AA compliance, better UX |

## Open Questions (Low Priority)

1. **Bulk Review Creation**: Should users be able to create reviews for multiple employees simultaneously?
   - **Recommendation**: Defer to v2 - complex UX and edge cases

2. **Variable Form Fields by Review Type**: Should different review types have different form fields?
   - **Recommendation**: Start with common fields, add type-specific fields in v2 if needed

3. **Additional Goal Fields**: Are there additional goal fields beyond title, description, date, metrics?
   - **Recommendation**: Start with core fields, gather user feedback for v2 additions

---

**Research Complete**: All critical technical decisions documented and justified. Ready to proceed to Phase 1 (Design & Contracts).
