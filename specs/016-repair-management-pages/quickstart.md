# Quickstart Guide: Management Pages Repair & Admin Implementation

**Feature**: 016-repair-management-pages
**Purpose**: TDD workflow guide for implementing manager CRUD and admin pages

---

## Test-First Development Workflow

This feature follows **strict TDD (RED-GREEN-REFACTOR)** methodology as mandated by the project constitution.

### TDD Cycle

```
1. RED:    Write failing test that defines expected behavior
2. GREEN:  Write minimal code to make test pass
3. REFACTOR: Clean up code while keeping tests passing
4. REPEAT: Move to next requirement
```

---

## Prerequisites

Before starting implementation, ensure:

- [x] Database schema validated (departments, users, leave_requests, performance_reviews, goals, tasks, reports tables exist)
- [x] Foreign key constraints exist and are correct
- [x] PostGraphile server is running on configured endpoint
- [x] Better Auth 1.3.4 is configured with JWT tokens
- [x] Redis is running (for caching department/permission data)
- [x] Test databases are seeded with fixture data

---

## Phase 1: Contract Tests (RED Phase)

### Step 1.1: Create Failing Contract Tests

**Location**: `backend/tests/contract/`

**Purpose**: Validate GraphQL schema matches expected operations

```bash
# Run contract tests (should FAIL initially)
npm run test:contract

# Expected output: All tests fail because GraphQL operations not implemented
```

**Test Files to Create**:
- `manager-leave-operations.test.ts` - Tests manager leave request CRUD
- `manager-performance-operations.test.ts` - Tests manager performance review CRUD
- `manager-goals-operations.test.ts` - Tests manager goals CRUD
- `manager-tasks-operations.test.ts` - Tests manager task assignment
- `manager-reports-operations.test.ts` - Tests manager report generation
- `admin-operations.test.ts` - Tests admin unrestricted access

**Example Contract Test Structure**:
```typescript
// backend/tests/contract/manager-leave-operations.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { executeGraphQLQuery } from '../helpers/graphql-client';
import { GetPendingLeaveRequests, ApproveLeaveRequest } from '../../graphql/generated';

describe('Manager Leave Operations Contract', () => {
  let managerToken: string;
  let managerId: string;
  let departmentId: string;

  beforeAll(async () => {
    // Setup test manager with department assignment
    ({ managerToken, managerId, departmentId } = await setupTestManager());
  });

  it('should fetch pending leave requests for manager department only', async () => {
    const result = await executeGraphQLQuery(
      GetPendingLeaveRequests,
      { managerId, first: 20, offset: 0 },
      { authorization: `Bearer ${managerToken}` }
    );

    expect(result.errors).toBeUndefined();
    expect(result.data.leaveRequests.nodes).toBeInstanceOf(Array);

    // CRITICAL: All returned leave requests must belong to manager's department
    result.data.leaveRequests.nodes.forEach((request) => {
      expect(request.departmentId).toBe(departmentId);
    });
  });

  it('should allow manager to approve leave request from their department', async () => {
    const testRequestId = await createTestLeaveRequest(departmentId);

    const result = await executeGraphQLQuery(
      ApproveLeaveRequest,
      {
        id: testRequestId,
        reviewerId: managerId,
        reviewNotes: 'Approved by test manager'
      },
      { authorization: `Bearer ${managerToken}` }
    );

    expect(result.errors).toBeUndefined();
    expect(result.data.updateLeaveRequest.leaveRequest.status).toBe('approved');
    expect(result.data.updateLeaveRequest.leaveRequest.reviewerId).toBe(managerId);
  });

  it('should reject manager attempt to approve request from other department', async () => {
    const otherDeptRequestId = await createTestLeaveRequest('other-department-id');

    const result = await executeGraphQLQuery(
      ApproveLeaveRequest,
      {
        id: otherDeptRequestId,
        reviewerId: managerId,
        reviewNotes: 'Should fail'
      },
      { authorization: `Bearer ${managerToken}` }
    );

    // Should fail with permission error
    expect(result.errors).toBeDefined();
    expect(result.errors[0].message).toContain('Insufficient permissions');
  });
});
```

---

## Phase 2: E2E Tests (RED Phase)

### Step 2.1: Create Failing E2E Tests

**Location**: `frontend/tests/e2e/management/`

**Purpose**: Validate complete user journeys for managers and admins

```bash
# Run E2E tests (should FAIL initially)
npm run test:e2e

# Expected output: All tests fail because UI not implemented
```

**Test Files to Create**:
- `manager-leave-approvals.spec.ts` - Manager approves/rejects leave requests
- `manager-performance-reviews.spec.ts` - Manager creates/edits reviews
- `manager-goals.spec.ts` - Manager sets team goals
- `manager-tasks.spec.ts` - Manager assigns tasks to team
- `manager-reports.spec.ts` - Manager generates department reports
- `admin-user-management.spec.ts` - Admin manages users
- `admin-system-settings.spec.ts` - Admin configures system
- `admin-audit-logs.spec.ts` - Admin views audit logs
- `theme-consistency.spec.ts` - Theme switching across all pages

**Example E2E Test Structure**:
```typescript
// frontend/tests/e2e/management/manager-leave-approvals.spec.ts
import { test, expect } from '@playwright/test';
import { loginAsManager, createTestLeaveRequest } from '../helpers/test-helpers';

test.describe('Manager Leave Approvals Journey', () => {
  test('manager can view and approve leave requests from their department', async ({ page }) => {
    // Step 1: Login as manager
    await loginAsManager(page, 'manager@test.com', 'TestPassword123!');

    // Step 2: Navigate to leave approvals page
    await page.goto('/dashboard/management/leave-approvals');
    await expect(page).toHaveURL(/\/leave-approvals/);

    // Step 3: Verify page shows department-scoped requests
    const departmentBadge = page.locator('[data-testid="department-badge"]');
    await expect(departmentBadge).toContainText('My Team');

    // Step 4: Verify pending requests table is visible
    const requestsTable = page.locator('[data-testid="leave-requests-table"]');
    await expect(requestsTable).toBeVisible();

    // Step 5: Create test leave request for manager's department
    const testRequestId = await createTestLeaveRequest(page, {
      userId: 'test-employee-id',
      departmentId: 'manager-department-id',
      startDate: '2025-10-01',
      endDate: '2025-10-05',
      leaveType: 'vacation'
    });

    // Step 6: Find the test request in table
    const requestRow = page.locator(`[data-testid="leave-request-${testRequestId}"]`);
    await expect(requestRow).toBeVisible();

    // Step 7: Click approve button
    const approveButton = requestRow.locator('[data-testid="approve-button"]');
    await approveButton.click();

    // Step 8: Fill approval modal
    const approvalModal = page.locator('[data-testid="approval-modal"]');
    await expect(approvalModal).toBeVisible();
    await page.fill('[data-testid="review-notes"]', 'Approved - team coverage confirmed');

    // Step 9: Submit approval
    await page.click('[data-testid="confirm-approval"]');

    // Step 10: Verify success toast
    const successToast = page.locator('[data-testid="success-toast"]');
    await expect(successToast).toContainText('Leave request approved');

    // Step 11: Verify request status updated in table
    await expect(requestRow.locator('[data-testid="status-badge"]')).toContainText('Approved');
  });

  test('manager cannot see leave requests from other departments', async ({ page }) => {
    await loginAsManager(page, 'manager@test.com', 'TestPassword123!');

    // Create request in different department
    const otherDeptRequestId = await createTestLeaveRequest(page, {
      userId: 'other-employee-id',
      departmentId: 'other-department-id',
      startDate: '2025-10-01',
      endDate: '2025-10-05'
    });

    await page.goto('/dashboard/management/leave-approvals');

    // Verify request NOT visible in table
    const requestRow = page.locator(`[data-testid="leave-request-${otherDeptRequestId}"]`);
    await expect(requestRow).not.toBeVisible();
  });
});
```

---

## Phase 3: Implementation (GREEN Phase)

### Step 3.1: Database Migrations

**Location**: `backend/migrations/`

**Order**:
1. Create tasks table migration (if not exists)
2. Add RLS policies for department-scoped access
3. Create audit log trigger functions

```bash
# Apply migrations
npm run db:migrate

# Verify schema
npm run db:validate-schema
```

**Example RLS Policy**:
```sql
-- Migration: 20250930_add_rls_policies_for_managers.sql

-- Enable RLS on leave_requests table
ALTER TABLE hr_public.leave_requests ENABLE ROW LEVEL SECURITY;

-- Manager can view leave requests from their department
CREATE POLICY manager_department_access ON hr_public.leave_requests
  FOR SELECT
  USING (
    department_id = (
      SELECT department_id
      FROM hr_public.users
      WHERE id = current_setting('jwt.claims.user_id')::uuid
    )
    AND EXISTS (
      SELECT 1 FROM hr_public.departments
      WHERE id = department_id
      AND manager_id = current_setting('jwt.claims.user_id')::uuid
    )
  );

-- Manager can update leave requests from their department
CREATE POLICY manager_department_update ON hr_public.leave_requests
  FOR UPDATE
  USING (
    department_id = (
      SELECT department_id
      FROM hr_public.users
      WHERE id = current_setting('jwt.claims.user_id')::uuid
    )
    AND EXISTS (
      SELECT 1 FROM hr_public.departments
      WHERE id = department_id
      AND manager_id = current_setting('jwt.claims.user_id')::uuid
    )
  );

-- Admins bypass RLS (full access)
CREATE POLICY admin_full_access ON hr_public.leave_requests
  FOR ALL
  USING (
    current_setting('jwt.claims.role')::text = 'admin'
  );
```

### Step 3.2: GraphQL Operations Implementation

**Location**: `src/lib/graphql/`

**Order**:
1. Extend `leave-management-operations.ts` with real GraphQL queries
2. Extend `performance-management-operations.ts` with real GraphQL mutations
3. Extend `goals-okrs-operations.ts` with CRUD operations
4. Create `tasks-operations.ts` for task assignment
5. Extend `reports-operations.ts` with report generation

**Example Implementation**:
```typescript
// src/lib/graphql/leave-management-operations.ts
import { GraphQLClient } from './client';
import type { UserCredentials } from '$lib/models/user-session';

const GET_PENDING_LEAVE_REQUESTS = `
  query GetPendingLeaveRequests($managerId: UUID!, $first: Int, $offset: Int, $filter: LeaveRequestFilter) {
    leaveRequests(first: $first, offset: $offset, filter: $filter, orderBy: ["CREATED_AT_DESC"]) {
      nodes {
        id
        userId
        departmentId
        startDate
        endDate
        leaveType
        status
        reason
        createdAt
        userByUserId {
          id
          email
          displayName
        }
        departmentByDepartmentId {
          id
          name
        }
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
      }
      totalCount
    }
  }
`;

export function createLeaveManagementOperations(client: GraphQLClient) {
  return {
    async getPendingLeaveRequests(params: {
      first: number;
      offset: number;
      filter?: {
        status?: string;
        departmentId?: string;
      };
      userCredentials: UserCredentials;
    }) {
      const { first, offset, filter, userCredentials } = params;

      const result = await client.query(GET_PENDING_LEAVE_REQUESTS, {
        managerId: userCredentials.userId,
        first,
        offset,
        filter
      }, {
        authorization: `Bearer ${userCredentials.accessToken}`
      });

      return result.data.leaveRequests;
    },

    // ... other operations
  };
}
```

### Step 3.3: UI Components Implementation

**Location**: `src/routes/dashboard/management/` and `src/routes/dashboard/admin/`

**Order**:
1. Fix existing management pages (+page.server.ts files)
2. Create admin page structure with RBAC guards
3. Implement theme-aware card components
4. Add department transfer detection

**Example Admin Page Structure**:
```typescript
// src/routes/dashboard/admin/+layout.server.ts
import type { LayoutServerLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: LayoutServerLoad = async ({ locals }) => {
  const { user, roles } = locals;

  if (!user) {
    throw error(401, 'Unauthorized');
  }

  // FR-023: Only admins can access admin pages
  const isAdmin = roles?.includes('admin') || user.role === 'admin';
  if (!isAdmin) {
    throw error(403, 'Insufficient permissions - Admin access required');
  }

  return {
    user,
    isAdmin: true
  };
};
```

---

## Phase 4: Refactor (GREEN Phase Continued)

### Step 4.1: Code Quality

- Extract common RBAC logic to `src/lib/server/rbac-utils.ts`
- Create reusable theme-aware card component
- Add Redis caching for department lookups
- Implement GraphQL subscription for department changes

### Step 4.2: Performance Optimization

- Add database indexes on foreign keys
- Implement query result caching
- Optimize RLS policy queries
- Add batch operations for bulk updates

---

## Phase 5: Validation

### Step 5.1: Run All Tests

```bash
# Contract tests should PASS
npm run test:contract

# E2E tests should PASS
npm run test:e2e

# Unit tests should PASS
npm run test:unit

# Coverage report should show >90%
npm run test:coverage
```

### Step 5.2: Manual Testing Checklist

- [ ] Manager can view only their department's data on all management pages
- [ ] Manager can perform CRUD operations on leave requests, reviews, goals, tasks, reports
- [ ] Admin can view all departments without restrictions
- [ ] Admin pages (User Management, System Settings, Audit Logs, Analytics, Compliance) are accessible to admins only
- [ ] Theme switching works correctly on all pages (light/dark mode)
- [ ] Department transfer triggers automatic permission refresh without logout
- [ ] Role precedence works (admin role overrides manager when both assigned)

---

## Troubleshooting

### Contract Tests Failing

**Symptom**: GraphQL queries return permission errors

**Fix**: Verify JWT token includes correct role and department claims:
```typescript
// Check JWT payload in test
const decoded = jwt.verify(token, JWT_SECRET);
console.log('JWT Claims:', decoded);
// Should include: { user_id, role, department_id }
```

### RLS Policies Not Applying

**Symptom**: Manager sees data from other departments

**Fix**: Verify RLS is enabled and policies are correct:
```sql
-- Check RLS status
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'leave_requests';

-- Check policies
SELECT * FROM pg_policies
WHERE tablename = 'leave_requests';
```

### E2E Tests Timing Out

**Symptom**: Playwright tests fail with timeout errors

**Fix**: Increase timeout and add explicit waits:
```typescript
test.setTimeout(60000); // 60 second timeout

// Wait for network idle before assertions
await page.waitForLoadState('networkidle');
```

### Theme Not Switching

**Symptom**: Cards remain light mode when dark mode is enabled

**Fix**: Verify CSS custom properties and Tailwind config:
```css
/* Check app.css has correct CSS variables */
:root {
  --card-bg-light: #ffffff;
  --card-border-light: #e5e7eb;
}

.dark {
  --card-bg-dark: #1f2937;
  --card-border-dark: #374151;
}
```

---

## Success Criteria

✅ All contract tests passing (validates GraphQL schema)
✅ All E2E tests passing (validates user journeys)
✅ All unit tests passing (validates business logic)
✅ Test coverage >90% (constitution requirement)
✅ Manual testing checklist complete
✅ Database schema validated
✅ RLS policies working correctly
✅ Theme consistency across all pages
✅ Department transfer detection working
✅ No TypeScript errors (`npm run check` passes)
✅ No linting errors (`npm run lint` passes)

---

## Next Steps

After all tests pass and manual testing is complete:
1. Create PR with test reports
2. Request code review
3. Deploy to staging environment
4. Perform QA testing with real users
5. Deploy to production
