# Implementation Tasks: Comprehensive Puppeteer E2E Testing Suite

**Feature**: 039-puppeteer-build-out
**Branch**: `039-puppeteer-build-out`
**Date**: 2025-10-27
**Plan**: [plan.md](./plan.md) | **Spec**: [spec.md](./spec.md)

## Task Overview

This document provides actionable implementation tasks for building out the comprehensive Puppeteer E2E testing suite. Tasks are ordered by dependencies and annotated with `[P]` when they can be executed in parallel.

**Total Estimated Time**: 3-4 weeks
**Total Tasks**: 45 tasks across 6 phases

---

## Phase 1: Setup & Infrastructure (5 tasks, 3-5 days)

### T001: Create test database setup scripts [P]
**File**: `/home/chanway/Projects/SvelteHR/scripts/test-db/create-test-db.sh`
**Dependencies**: None
**Estimated Time**: 2 hours

Create bash script to set up isolated PostgreSQL test database:
```bash
#!/bin/bash
# Create test database if it doesn't exist
createdb sveltehr_test || echo "Database already exists"

# Apply schema migrations
npm run db:migrate --env test

echo "Test database created successfully"
```

**Acceptance Criteria**:
- Script creates `sveltehr_test` database
- Script is idempotent (can run multiple times)
- Script applies schema migrations
- Script exits with code 0 on success

---

### T002: Create test database seed script [P]
**File**: `/home/chanway/Projects/SvelteHR/scripts/test-db/seed-test-data.sh`
**Dependencies**: T001
**Estimated Time**: 3 hours

Create bash script to seed test fixtures into database:
```bash
#!/bin/bash
# Load test fixtures from tests/fixtures/
psql -d sveltehr_test -f tests/fixtures/users.sql
psql -d sveltehr_test -f tests/fixtures/employees.sql
psql -d sveltehr_test -f tests/fixtures/events.sql
psql -d sveltehr_test -f tests/fixtures/tasks.sql
psql -d sveltehr_test -f tests/fixtures/leave-requests.sql

echo "Test data seeded successfully"
```

**Acceptance Criteria**:
- Script inserts all fixture data
- Script handles existing data (truncate/cascade)
- Script verifies data insertion
- Script exits with code 0 on success

---

### T003: Create test database reset script [P]
**File**: `/home/chanway/Projects/SvelteHR/scripts/test-db/reset-test-db.sh`
**Dependencies**: T001, T002
**Estimated Time**: 1 hour

Create bash script to reset test database to clean state:
```bash
#!/bin/bash
dropdb sveltehr_test --if-exists
./scripts/test-db/create-test-db.sh
./scripts/test-db/seed-test-data.sh

echo "Test database reset complete"
```

**Acceptance Criteria**:
- Script drops existing test database
- Script recreates database from scratch
- Script reseeds all fixtures
- Script can be run before test suites

---

### T004: Add npm scripts for test database management
**File**: `/home/chanway/Projects/SvelteHR/package.json`
**Dependencies**: T001, T002, T003
**Estimated Time**: 30 minutes

Add test database management scripts to package.json:
```json
{
  "scripts": {
    "test:db:create": "./scripts/test-db/create-test-db.sh",
    "test:db:seed": "./scripts/test-db/seed-test-data.sh",
    "test:db:reset": "./scripts/test-db/reset-test-db.sh"
  }
}
```

**Acceptance Criteria**:
- `npm run test:db:create` creates database
- `npm run test:db:seed` seeds fixtures
- `npm run test:db:reset` resets to clean state
- Scripts work from repository root

---

### T005: Create test database setup/teardown module
**File**: `/home/chanway/Projects/SvelteHR/tests/setup/test-db-setup.ts`
**Dependencies**: T001, T002, T003
**Estimated Time**: 2 hours

Create TypeScript module for test database lifecycle management:
```typescript
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function setupTestDatabase() {
  await execAsync('npm run test:db:reset');
}

export async function teardownTestDatabase() {
  // Optional: cleanup if needed
}

// Register with Vitest globalSetup
export default setupTestDatabase;
```

**Acceptance Criteria**:
- Module can be imported in Vitest setup
- `setupTestDatabase()` resets database before tests
- Module handles errors gracefully
- Module provides useful logging

---

## Phase 2: Test Fixtures & Test Data (5 tasks, 2-3 days)

### T006: Create test users fixture [P]
**File**: `/home/chanway/Projects/SvelteHR/tests/fixtures/users.json`
**Dependencies**: None
**Estimated Time**: 1 hour

Create JSON fixture with test user accounts:
```json
[
  {
    "email": "admin@test.com",
    "password": "$2a$10$...",  // bcrypt hash of "password123"
    "firstName": "Admin",
    "lastName": "User",
    "role": "admin",
    "isActive": true
  },
  {
    "email": "hr@test.com",
    "password": "$2a$10$...",
    "firstName": "HR",
    "lastName": "Manager",
    "role": "hr_manager",
    "isActive": true
  },
  // ... manager, employee
]
```

**Acceptance Criteria**:
- 4 test users (admin, hr_manager, manager, employee)
- Passwords are bcrypt hashed
- All users have realistic attributes
- Users can log in with credentials

---

### T007: Create test employees fixture [P]
**File**: `/home/chanway/Projects/SvelteHR/tests/fixtures/employees.json`
**Dependencies**: None
**Estimated Time**: 1.5 hours

Create JSON fixture with 20 realistic employee records.

**Acceptance Criteria**:
- 20 employee records with realistic data
- Employees span multiple departments
- Hire dates are within last 5 years
- All employees have valid attributes

---

### T008: Create test events fixture [P]
**File**: `/home/chanway/Projects/SvelteHR/tests/fixtures/events.json`
**Dependencies**: None
**Estimated Time**: 1 hour

Create JSON fixture with 10 event records for calendar testing.

**Acceptance Criteria**:
- 10 events with varied start/end times
- Mix of all-day and timed events
- Events have attendees and RSVP statuses
- Events span past, present, and future

---

### T009: Create test tasks fixture [P]
**File**: `/home/chanway/Projects/SvelteHR/tests/fixtures/tasks.json`
**Dependencies**: None
**Estimated Time**: 1 hour

Create JSON fixture with 15 task records.

**Acceptance Criteria**:
- 15 tasks with varied priorities and statuses
- Tasks assigned to different employees
- Due dates span past and future
- Tasks have realistic titles and descriptions

---

### T010: Create test leave requests fixture [P]
**File**: `/home/chanway/Projects/SvelteHR/tests/fixtures/leave-requests.json`
**Dependencies**: None
**Estimated Time**: 1 hour

Create JSON fixture with 8 leave request records.

**Acceptance Criteria**:
- 8 leave requests with varied statuses
- Requests span different employees
- Date ranges are realistic
- Approved requests have approver IDs

---

## Phase 3: Test Utilities & Helpers (4 tasks, 2-3 days)

### T011: Implement centralized test selectors
**File**: `/home/chanway/Projects/SvelteHR/tests/utils/test-selectors.ts`
**Dependencies**: None
**Estimated Time**: 3 hours

Implement the test-selectors contract from `contracts/test-selectors.contract.ts`:
- Copy contract file as starting point
- Expand selector definitions for all pages
- Add dynamic selector helper functions
- Export type-safe selector access

**Acceptance Criteria**:
- All selector categories defined (dashboard, employees, auth, etc.)
- Dynamic selector helpers for IDs
- Type-safe exports
- Matches contract interface

---

### T012: Implement GraphQL response validators
**File**: `/home/chanway/Projects/SvelteHR/tests/utils/graphql-validators.ts`
**Dependencies**: None
**Estimated Time**: 4 hours

Implement the graphql-responses contract from `contracts/graphql-responses.contract.ts`:
- Copy contract file as starting point
- Implement all validator methods
- Add placeholder data detection
- Add timestamp validation

**Acceptance Criteria**:
- All response validators implemented
- Placeholder data detection works
- Timestamp validation works
- Type guards properly narrow types

---

### T013: Implement test data helpers
**File**: `/home/chanway/Projects/SvelteHR/tests/utils/test-data-helpers.ts`
**Dependencies**: T006, T007, T008, T009, T010
**Estimated Time**: 2 hours

Create utility functions for working with test data:
```typescript
export function getTestUser(role: 'admin' | 'hr_manager' | 'manager' | 'employee') {
  const users = require('../fixtures/users.json');
  return users.find(u => u.role === role);
}

export function getTestEmployee(id: string) {
  const employees = require('../fixtures/employees.json');
  return employees.find(e => e.id === id);
}

// Similar for events, tasks, leave requests
```

**Acceptance Criteria**:
- Functions load fixtures dynamically
- Functions provide type-safe returns
- Functions handle missing data gracefully
- Functions are well-documented

---

### T014: Update vitest.config.ts with retry logic
**File**: `/home/chanway/Projects/SvelteHR/vitest.config.ts`
**Dependencies**: None
**Estimated Time**: 1 hour

Update e2e-puppeteer project configuration with retry logic:
```typescript
{
  name: 'e2e-puppeteer',
  test: {
    // ... existing config
    retry: 2,  // Retry failed tests up to 2 times
    bail: 0,   // Don't stop on first failure
  }
}
```

**Acceptance Criteria**:
- e2e-puppeteer project has `retry: 2` configured
- Failed tests automatically retry
- Test results show retry attempts
- Configuration documented in comments

---

## Phase 4: Add data-testid Attributes to UI Components (10 tasks, 5-7 days)

**Note**: These tasks modify Svelte components to add data-testid attributes. They CANNOT be parallelized as they may modify shared components.

### T015: Add data-testid attributes to dashboard components
**Files**:
- `/home/chanway/Projects/SvelteHR/src/routes/dashboard/+page.svelte`
- Dashboard metric components

**Dependencies**: T011
**Estimated Time**: 2 hours

Add data-testid attributes to all dashboard elements:
- `data-testid="dashboard-attendance-metric"`
- `data-testid="dashboard-tasks-metric"`
- `data-testid="dashboard-leave-requests-metric"`
- `data-testid="dashboard-events-metric"`
- `data-testid="dashboard-recent-activity"`

**Acceptance Criteria**:
- All metrics have testid attributes
- Recent activity list has testid
- Navigation links have testids
- Attributes follow naming convention from T011

---

### T016: Add data-testid attributes to employee directory components
**Files**:
- `/home/chanway/Projects/SvelteHR/src/routes/employees/+page.svelte`
- Employee card components

**Dependencies**: T015
**Estimated Time**: 2 hours

Add data-testid attributes to employee directory:
- `data-testid="employee-list-container"`
- `data-testid="employee-card"`
- `data-testid="employee-search-input"`
- `data-testid="employee-filter-dropdown"`

**Acceptance Criteria**:
- All employee list elements have testids
- Search and filter inputs have testids
- Employee cards have testids
- Pagination controls have testids

---

### T017: Add data-testid attributes to authentication components
**Files**:
- `/home/chanway/Projects/SvelteHR/src/routes/login/+page.svelte`
- Logout button component

**Dependencies**: T016
**Estimated Time**: 1 hour

Add data-testid attributes to auth components:
- `data-testid="login-form"`
- `data-testid="login-username-input"`
- `data-testid="login-password-input"`
- `data-testid="login-submit-button"`
- `data-testid="logout-button"`

**Acceptance Criteria**:
- Login form has testids
- All inputs have testids
- Submit button has testid
- Logout button (in nav) has testid

---

### T018: Add data-testid attributes to navigation components
**Files**:
- `/home/chanway/Projects/SvelteHR/src/lib/components/Navigation.svelte` (or similar)

**Dependencies**: T017
**Estimated Time**: 1 hour

Add data-testid attributes to navigation:
- `data-testid="nav-dashboard"`
- `data-testid="nav-employees"`
- `data-testid="nav-hr"`
- `data-testid="nav-admin"`
- `data-testid="nav-events"`
- `data-testid="nav-tasks"`

**Acceptance Criteria**:
- All nav links have testids
- Mobile nav (if exists) has testids
- User menu has testids
- Attributes consistent across all pages

---

### T019: Add data-testid attributes to HR workflow components
**Files**:
- `/home/chanway/Projects/SvelteHR/src/routes/hr/+page.svelte`
- Leave request components

**Dependencies**: T018
**Estimated Time**: 2 hours

Add data-testid attributes to HR pages:
- `data-testid="hr-leave-requests-table"`
- `data-testid="hr-approve-button"`
- `data-testid="hr-reject-button"`
- `data-testid="hr-reports-page"`

**Acceptance Criteria**:
- Leave requests table has testids
- Action buttons have testids
- Reports page elements have testids
- Filter controls have testids

---

### T020: Add data-testid attributes to admin components
**Files**:
- `/home/chanway/Projects/SvelteHR/src/routes/admin/+page.svelte`
- User management components

**Dependencies**: T019
**Estimated Time**: 2 hours

Add data-testid attributes to admin pages:
- `data-testid="admin-user-management-table"`
- `data-testid="admin-add-user-button"`
- `data-testid="admin-edit-user-button"`
- `data-testid="admin-delete-user-button"`

**Acceptance Criteria**:
- User management table has testids
- All action buttons have testids
- Forms have testids
- Modal dialogs have testids

---

### T021: Add data-testid attributes to events components
**Files**:
- `/home/chanway/Projects/SvelteHR/src/routes/events/+page.svelte`
- Event card components

**Dependencies**: T020
**Estimated Time**: 2 hours

Add data-testid attributes to events pages:
- `data-testid="events-calendar"`
- `data-testid="event-card"`
- `data-testid="event-rsvp-button"`
- `data-testid="event-details-modal"`

**Acceptance Criteria**:
- Calendar component has testid
- Event cards have testids
- RSVP buttons have testids
- Event details modal has testids

---

### T022: Add data-testid attributes to tasks components
**Files**:
- `/home/chanway/Projects/SvelteHR/src/routes/tasks/+page.svelte`
- Task card components

**Dependencies**: T021
**Estimated Time**: 2 hours

Add data-testid attributes to tasks pages:
- `data-testid="tasks-list"`
- `data-testid="task-card"`
- `data-testid="tasks-add-button"`
- `data-testid="task-status-dropdown"`

**Acceptance Criteria**:
- Task list has testid
- Task cards have testids
- Add button has testid
- Status dropdowns have testids

---

### T023: Add data-testid attributes to form components
**Files**:
- `/home/chanway/Projects/SvelteHR/src/lib/components/ui/Form*.svelte`
- Shared form components

**Dependencies**: T022
**Estimated Time**: 2 hours

Add data-testid attributes to shared form components:
- `data-testid="form-submit-button"`
- `data-testid="form-cancel-button"`
- `data-testid="form-validation-error"`
- Generic form field testids

**Acceptance Criteria**:
- All form buttons have testids
- Validation errors have testids
- Form fields follow naming convention
- Changes apply to all forms

---

### T024: Verify data-testid coverage
**Dependencies**: T015-T023
**Estimated Time**: 2 hours

Create script to verify data-testid coverage:
```bash
# Find all interactive elements without data-testid
grep -r "button\|input\|select" src/ | grep -v "data-testid"
```

**Acceptance Criteria**:
- Script identifies elements missing testids
- Coverage report shows > 95% coverage
- All P1 pages have complete coverage
- Documentation updated

---

## Phase 5: E2E Test Implementation (15 tasks, 10-12 days)

### T025: Implement authentication flow tests [P]
**File**: `/home/chanway/Projects/SvelteHR/tests/e2e/auth/login.puppeteer.test.ts`
**Dependencies**: T011, T012, T013, T017
**Estimated Time**: 3 hours

Implement login flow tests:
- Test successful login with admin credentials
- Test successful login with employee credentials
- Test failed login with invalid credentials
- Test redirect to dashboard after login
- Test redirect preservation (`?redirectTo=`)

**Acceptance Criteria**:
- 5+ test cases covering login scenarios
- Uses centralized selectors from T011
- Uses test credentials from fixtures
- All tests pass with live app

---

### T026: Implement logout flow tests [P]
**File**: `/home/chanway/Projects/SvelteHR/tests/e2e/auth/logout.puppeteer.test.ts`
**Dependencies**: T011, T013, T017
**Estimated Time**: 1 hour

Implement logout flow tests:
- Test logout redirects to login page
- Test logout clears session
- Test cannot access protected routes after logout

**Acceptance Criteria**:
- 3+ test cases covering logout scenarios
- Verifies session clearance
- All tests pass with live app

---

### T027: Implement unauthorized access tests [P]
**File**: `/home/chanway/Projects/SvelteHR/tests/e2e/auth/unauthorized-access.puppeteer.test.ts`
**Dependencies**: T011, T013
**Estimated Time**: 2 hours

Implement unauthorized access tests:
- Test unauthenticated user redirected to login
- Test redirectTo parameter preserved
- Test role-based access control (admin vs employee)

**Acceptance Criteria**:
- 4+ test cases covering access control
- Tests different roles and permissions
- All tests pass with live app

---

### T028: Implement employee directory tests [P]
**File**: `/home/chanway/Projects/SvelteHR/tests/e2e/employees/directory.puppeteer.test.ts`
**Dependencies**: T011, T012, T013, T016
**Estimated Time**: 3 hours

Implement employee directory tests:
- Test directory loads with real employee data
- Test employee cards display correct information
- Test pagination works correctly
- Test employee data matches database

**Acceptance Criteria**:
- 5+ test cases covering directory functionality
- Validates real data vs placeholders
- Uses GraphQL validators from T012
- All tests pass with live app

---

### T029: Implement employee search and filter tests [P]
**File**: `/home/chanway/Projects/SvelteHR/tests/e2e/employees/search-filter.puppeteer.test.ts`
**Dependencies**: T011, T013, T016
**Estimated Time**: 3 hours

Implement employee search/filter tests:
- Test search by name filters results
- Test search clears when input cleared
- Test department filter works
- Test combined search + filter

**Acceptance Criteria**:
- 5+ test cases covering search/filter
- Tests update displayed results
- Tests reset functionality
- All tests pass with live app

---

### T030: Implement employee profile tests [P]
**File**: `/home/chanway/Projects/SvelteHR/tests/e2e/employees/profile.puppeteer.test.ts`
**Dependencies**: T011, T012, T013, T016
**Estimated Time**: 2 hours

Implement employee profile tests:
- Test navigation to profile page
- Test profile displays real data
- Test edit profile functionality (if exists)

**Acceptance Criteria**:
- 3+ test cases covering profile page
- Validates data accuracy
- All tests pass with live app

---

### T031: Implement HR leave request tests [P]
**File**: `/home/chanway/Projects/SvelteHR/tests/e2e/hr/leave-requests.puppeteer.test.ts`
**Dependencies**: T011, T012, T013, T019
**Estimated Time**: 4 hours

Implement HR leave request tests:
- Test leave requests table loads with real data
- Test manager can approve leave request
- Test manager can reject leave request
- Test status updates reflected in UI
- Test approval persists after page reload

**Acceptance Criteria**:
- 6+ test cases covering leave request workflow
- Tests approval/rejection flows
- Validates data persistence
- All tests pass with live app

---

### T032: Implement HR reports tests [P]
**File**: `/home/chanway/Projects/SvelteHR/tests/e2e/hr/reports.puppeteer.test.ts`
**Dependencies**: T011, T012, T013, T019
**Estimated Time**: 2 hours

Implement HR reports tests:
- Test reports page loads successfully
- Test reports display real data
- Test report filters work (if exists)

**Acceptance Criteria**:
- 3+ test cases covering reports page
- Validates real data display
- All tests pass with live app

---

### T033: Implement HR approval workflow tests [P]
**File**: `/home/chanway/Projects/SvelteHR/tests/e2e/hr/approval-workflow.puppeteer.test.ts`
**Dependencies**: T011, T012, T013, T019
**Estimated Time**: 3 hours

Implement end-to-end approval workflow tests:
- Test full approval flow from submission to approval
- Test notification system (if exists)
- Test manager comments

**Acceptance Criteria**:
- 4+ test cases covering full workflow
- Tests multiple approval scenarios
- All tests pass with live app

---

### T034: Implement admin user management tests [P]
**File**: `/home/chanway/Projects/SvelteHR/tests/e2e/admin/user-management.puppeteer.test.ts`
**Dependencies**: T011, T012, T013, T020
**Estimated Time**: 4 hours

Implement admin user management tests:
- Test user table loads with real data
- Test add new user functionality
- Test edit user functionality
- Test delete user functionality
- Test role assignment

**Acceptance Criteria**:
- 6+ test cases covering CRUD operations
- Tests data validation
- Tests permission enforcement
- All tests pass with live app

---

### T035: Implement admin permissions tests [P]
**File**: `/home/chanway/Projects/SvelteHR/tests/e2e/admin/permissions.puppeteer.test.ts`
**Dependencies**: T011, T013, T020
**Estimated Time**: 2 hours

Implement admin permission tests:
- Test admin can access admin routes
- Test non-admin cannot access admin routes
- Test permission-based UI rendering

**Acceptance Criteria**:
- 4+ test cases covering permissions
- Tests role-based access
- All tests pass with live app

---

### T036: Implement task list tests [P]
**File**: `/home/chanway/Projects/SvelteHR/tests/e2e/tasks/task-list.puppeteer.test.ts`
**Dependencies**: T011, T012, T013, T022
**Estimated Time**: 3 hours

Implement task list tests:
- Test task list loads with real data
- Test tasks display correct attributes
- Test task status updates
- Test filter by status (if exists)

**Acceptance Criteria**:
- 5+ test cases covering task list
- Validates real data
- Tests interactive features
- All tests pass with live app

---

### T037: Implement task assignment tests [P]
**File**: `/home/chanway/Projects/SvelteHR/tests/e2e/tasks/task-assignment.puppeteer.test.ts`
**Dependencies**: T011, T012, T013, T022
**Estimated Time**: 3 hours

Implement task assignment tests:
- Test assign task to employee
- Test reassign task
- Test task shows correct assignee
- Test assignment persists after reload

**Acceptance Criteria**:
- 4+ test cases covering assignment
- Tests data persistence
- All tests pass with live app

---

### T038: Implement page load performance tests [P]
**File**: `/home/chanway/Projects/SvelteHR/tests/e2e/performance/page-load-times.puppeteer.test.ts`
**Dependencies**: T011, T013
**Estimated Time**: 3 hours

Implement performance tests using Puppeteer's performance APIs:
```typescript
test('Dashboard loads within 3 seconds', async () => {
  const startTime = Date.now();
  await gotoPage('/dashboard');
  await waitForNetworkIdle();
  const loadTime = Date.now() - startTime;

  expect(loadTime).toBeLessThan(3000);
});
```

**Acceptance Criteria**:
- Tests all major pages (dashboard, employees, hr, admin)
- Uses Puppeteer performance metrics
- Fails if load time exceeds threshold
- All tests pass with live app

---

### T039: Implement loading state tests [P]
**File**: `/home/chanway/Projects/SvelteHR/tests/e2e/performance/loading-states.puppeteer.test.ts`
**Dependencies**: T011, T013
**Estimated Time**: 2 hours

Implement loading state tests:
- Test spinner displays during data fetch
- Test skeleton screens display (if exists)
- Test loading states clear when data arrives

**Acceptance Criteria**:
- 3+ test cases for loading states
- Tests various pages
- All tests pass with live app

---

## Phase 6: GraphQL Validation & CI/CD Integration (6 tasks, 3-4 days)

### T040: Implement GraphQL response validation tests [P]
**File**: `/home/chanway/Projects/SvelteHR/tests/e2e/graphql/response-validation.puppeteer.test.ts`
**Dependencies**: T012
**Estimated Time**: 4 hours

Implement GraphQL response structure validation:
```typescript
test('Dashboard GraphQL response has required fields', async () => {
  // Intercept GraphQL request
  const response = await interceptGraphQLRequest('GetUsers');

  // Validate structure
  expect(GraphQLResponseValidator.validateUser(response.data.users[0])).toBe(true);

  // Check for placeholder data
  expect(GraphQLResponseValidator.isPlaceholderData(response.data)).toBe(false);
});
```

**Acceptance Criteria**:
- Tests major GraphQL queries (users, employees, events, tasks)
- Validates response structure matches schema
- Detects placeholder data
- All tests pass with live app

---

### T041: Implement GraphQL schema conformance tests [P]
**File**: `/home/chanway/Projects/SvelteHR/tests/e2e/graphql/schema-conformance.puppeteer.test.ts`
**Dependencies**: T012
**Estimated Time**: 3 hours

Implement schema conformance tests:
- Test pagination responses have correct structure
- Test mutation responses return updated entities
- Test error responses have correct format

**Acceptance Criteria**:
- Tests pagination structure
- Tests mutation responses
- Tests error handling
- All tests pass with live app

---

### T042: Create GitHub Actions workflow for Puppeteer tests
**File**: `/home/chanway/Projects/SvelteHR/.github/workflows/puppeteer-e2e-tests.yml`
**Dependencies**: T001-T041
**Estimated Time**: 4 hours

Create CI/CD workflow based on `contracts/ci-cd-artifacts.contract.md`:
```yaml
name: Puppeteer E2E Tests

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  puppeteer-tests:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Create test database
        run: npm run test:db:create

      - name: Seed test data
        run: npm run test:db:seed

      - name: Start development server
        run: npm run dev &
        # Wait for server to be ready
        run: npx wait-on http://localhost:5173

      - name: Run Puppeteer tests
        run: npm run test:puppeteer

      - name: Upload test artifacts
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: puppeteer-test-results-${{ github.run_id }}
          path: ./test-results/
          retention-days: 30
```

**Acceptance Criteria**:
- Workflow runs on PR and main branch push
- Workflow sets up PostgreSQL service
- Workflow creates and seeds test database
- Workflow starts dev server
- Workflow runs Puppeteer tests
- Workflow uploads artifacts on failure
- Workflow has 30-day retention

---

### T043: Configure test artifact capture
**File**: `/home/chanway/Projects/SvelteHR/tests/setup/vitest-setup-e2e-puppeteer.ts`
**Dependencies**: T042
**Estimated Time**: 3 hours

Enhance Puppeteer setup to capture artifacts:
```typescript
import { afterEach } from 'vitest';

afterEach(async (context) => {
  if (context.task.result?.state === 'fail') {
    // Capture screenshot
    const page = getPage();
    await page.screenshot({
      path: `./test-results/screenshots/${context.task.name}-failed.png`,
      fullPage: true
    });

    // Capture console logs
    const logs = getConsoleLogs();
    fs.writeFileSync(
      `./test-results/logs/${context.task.name}-console.log`,
      logs.join('\n')
    );
  }
});
```

**Acceptance Criteria**:
- Screenshots captured on test failure
- Console logs captured on test failure
- Artifacts saved to ./test-results/
- Artifacts follow naming convention from contract

---

### T044: Add test result reporting
**Dependencies**: T042, T043
**Estimated Time**: 2 hours

Configure HTML test report generation:
```bash
# Add to vitest.config.ts
reporter: ['verbose', 'json', 'html'],
outputFile: {
  json: './test-results/test-results.json',
  html: './test-results/test-report.html'
}
```

**Acceptance Criteria**:
- HTML report generated after test run
- Report shows pass/fail status
- Report links to screenshots
- Report uploaded to CI/CD artifacts

---

### T045: Update project documentation
**Files**:
- `/home/chanway/Projects/SvelteHR/README.md`
- `/home/chanway/Projects/SvelteHR/docs/testing.md` (create if needed)

**Dependencies**: T001-T044
**Estimated Time**: 2 hours

Update documentation with:
- Puppeteer test setup instructions
- How to run tests locally
- How to add new tests
- CI/CD integration details
- Troubleshooting guide

**Acceptance Criteria**:
- README updated with testing section
- Dedicated testing guide created
- All commands documented
- Examples provided

---

## Parallel Execution Strategy

### Phase 2-3: Test Fixtures (Can run in parallel)
```bash
# All fixture creation tasks can run in parallel:
T006, T007, T008, T009, T010 [P]
```

### Phase 4: UI Component Updates (MUST run sequentially)
```bash
# These modify shared components, cannot parallelize:
T015 → T016 → T017 → T018 → T019 → T020 → T021 → T022 → T023 → T024
```

### Phase 5: E2E Test Implementation (Can run in parallel after Phase 4)
```bash
# All test files are independent, can run in parallel:
T025, T026, T027 [P]  # Auth tests
T028, T029, T030 [P]  # Employee tests
T031, T032, T033 [P]  # HR tests
T034, T035 [P]        # Admin tests
T036, T037 [P]        # Task tests
T038, T039 [P]        # Performance tests
```

### Phase 6: GraphQL & CI/CD (Can run in parallel)
```bash
# GraphQL tests independent, can run in parallel:
T040, T041 [P]

# CI/CD setup depends on all tests:
T042 → T043 → T044 → T045
```

---

## Task Dependencies Graph

```
Setup Phase:
T001 [P] ────┐
T002 [P] ────┼─→ T003 → T004
T005 [P] ────┘

Fixtures Phase:
T006, T007, T008, T009, T010 [P] ───→ T013

Utilities Phase:
T011 [P] ────┐
T012 [P] ────┼─→ (All test phases)
T013 [P] ────┤
T014 [P] ────┘

UI Updates Phase (Sequential):
T015 → T016 → T017 → T018 → T019 → T020 → T021 → T022 → T023 → T024

E2E Tests Phase (Parallel groups):
T025, T026, T027 [P] ─┐
T028, T029, T030 [P] ─┤
T031, T032, T033 [P] ─┼─→ T042
T034, T035 [P] ───────┤
T036, T037 [P] ───────┤
T038, T039 [P] ───────┤
T040, T041 [P] ───────┘

CI/CD Phase:
T042 → T043 → T044 → T045
```

---

## Quick Start Guide

1. **Start with infrastructure** (T001-T005): Set up test database scripts
2. **Create test data** (T006-T010): Generate fixture files
3. **Build utilities** (T011-T014): Implement helpers and validators
4. **Update UI** (T015-T024): Add data-testid attributes (sequential)
5. **Write tests** (T025-T041): Implement comprehensive E2E tests (parallel)
6. **Setup CI/CD** (T042-T045): Integrate with GitHub Actions

**Total Timeline**: 3-4 weeks with parallel execution

---

**Next Action**: Begin with T001-T005 to establish test infrastructure foundation.
