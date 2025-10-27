# Phase 1: Data Model & Contracts

**Feature**: 039-puppeteer-build-out
**Date**: 2025-10-27
**Status**: Template - Requires Design

## Test Fixtures Schema

### Test User Accounts

**Purpose**: Provide pre-configured user accounts for testing different roles and permissions.

**Schema** (TO BE DEFINED):
```typescript
interface TestUser {
  id: string;
  email: string;
  password: string;
  role: 'admin' | 'hr_manager' | 'manager' | 'employee';
  firstName: string;
  lastName: string;
  departmentId?: string;
  isActive: boolean;
}
```

**Fixture Data** (TO BE CREATED): `tests/fixtures/users.json`

---

### Employee Test Data

**Purpose**: Realistic employee records for testing employee directory, search, and profile pages.

**Schema** (TO BE DEFINED):
```typescript
interface TestEmployee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  hireDate: string;
  departmentId: string;
  position: string;
  status: 'active' | 'inactive';
}
```

**Fixture Data** (TO BE CREATED): `tests/fixtures/employees.json`

---

### Event Test Data

**Purpose**: Event records for testing calendar, RSVP workflow, and event details pages.

**Schema** (TO BE DEFINED):
```typescript
interface TestEvent {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  allDay: boolean;
  attendees: string[];
  rsvpStatuses: Record<string, 'yes' | 'no' | 'maybe'>;
}
```

**Fixture Data** (TO BE CREATED): `tests/fixtures/events.json`

---

### Task Test Data

**Purpose**: Task records for testing task list, assignment, and status update functionality.

**Schema** (TO BE DEFINED):
```typescript
interface TestTask {
  id: string;
  title: string;
  description: string;
  assigneeId: string;
  dueDate: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed';
}
```

**Fixture Data** (TO BE CREATED): `tests/fixtures/tasks.json`

---

### Leave Request Test Data

**Purpose**: Leave request records for testing HR approval workflow.

**Schema** (TO BE DEFINED):
```typescript
interface TestLeaveRequest {
  id: string;
  employeeId: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
}
```

**Fixture Data** (TO BE CREATED): `tests/fixtures/leave-requests.json`

---

## Test Database Schema

### Isolated Test Database Structure

**Database Name**: `sveltehr_test`

**Schema** (TO BE DEFINED):
- Mirror production database schema
- Additional test-specific tables if needed
- Foreign key constraints preserved

**Seed Data Scripts** (TO BE CREATED):
- `scripts/test-db/create-test-db.sh` - Creates isolated test database
- `scripts/test-db/seed-test-data.sh` - Inserts fixture data
- `scripts/test-db/reset-test-db.sh` - Drops and recreates database

**Reset Procedure** (TO BE DEFINED):
```bash
# Drop existing test database
dropdb sveltehr_test

# Recreate test database
createdb sveltehr_test

# Apply schema migrations
npm run db:migrate --env test

# Seed test data
npm run test:db:seed
```

---

## Test Selector Definitions

### Centralized data-testid Selector Registry

**Purpose**: Provide type-safe, centralized selector definitions for all Puppeteer tests.

**File**: `tests/utils/test-selectors.ts` (TO BE CREATED)

**Naming Convention** (TO BE DEFINED):
- Format: `[page]-[component]-[action]`
- Examples:
  - `dashboard-attendance-metric`
  - `employee-list-container`
  - `employee-card`
  - `login-form-submit`
  - `nav-dashboard`

**TypeScript Definitions** (TO BE CREATED):
```typescript
export const SELECTORS = {
  dashboard: {
    attendanceMetric: '[data-testid="dashboard-attendance-metric"]',
    tasksMetric: '[data-testid="dashboard-tasks-metric"]',
    // ...
  },
  employees: {
    listContainer: '[data-testid="employee-list-container"]',
    card: '[data-testid="employee-card"]',
    searchInput: '[data-testid="employee-search-input"]',
    // ...
  },
  // ...
} as const;
```

**Dynamic Selector Handling** (TO BE DEFINED):
```typescript
export function getEmployeeCard(employeeId: string): string {
  return `[data-testid="employee-card-${employeeId}"]`;
}
```

---

## Next Steps

1. Conduct Phase 0 research to inform design decisions
2. Define concrete schemas based on existing database structure
3. Create fixture data files with realistic test data
4. Implement test database setup/teardown scripts
5. Create TypeScript selector definitions
6. Move to Phase 2: Task generation with `/tasks` command
