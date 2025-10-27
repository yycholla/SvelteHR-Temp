# Quickstart Guide: Puppeteer E2E Testing

**Feature**: 039-puppeteer-build-out
**Date**: 2025-10-27
**Status**: Template - Requires Implementation

## Prerequisites

- Node.js 18+ installed
- PostgreSQL installed and running
- SvelteKit application running on http://localhost:5173
- Rust GraphQL backend running on http://localhost:4000

## Local Development Setup

### 1. Create Isolated Test Database

```bash
# Create test database
npm run test:db:create

# Expected output:
# Creating test database: sveltehr_test
# Database created successfully
```

### 2. Apply Schema Migrations

```bash
# Apply database migrations to test database
npm run db:migrate --env test

# Expected output:
# Running migrations on sveltehr_test...
# ✓ Migration 001_initial_schema.sql applied
# ✓ Migration 002_add_events_table.sql applied
# All migrations applied successfully
```

### 3. Seed Test Data

```bash
# Seed test fixtures
npm run test:db:seed

# Expected output:
# Seeding test database with fixtures...
# ✓ Loaded users.json (4 users)
# ✓ Loaded employees.json (20 employees)
# ✓ Loaded events.json (10 events)
# ✓ Loaded tasks.json (15 tasks)
# ✓ Loaded leave-requests.json (8 leave requests)
# Test data seeded successfully
```

### 4. Run Puppeteer Tests

```bash
# Run all Puppeteer tests
npm run test:puppeteer

# Run specific test suite
npm run test:puppeteer:dashboard
npm run test:puppeteer:forms
npm run test:puppeteer:events

# Run in headed mode (see browser)
npm run test:puppeteer:headed

# Run with UI interface
npm run test:puppeteer:ui
```

## Test Credentials

### Test User Accounts

All test users have password: `password123`

| Role | Email | Description |
|------|-------|-------------|
| Admin | admin@test.com | Full system access |
| HR Manager | hr@test.com | HR workflow access |
| Manager | manager@test.com | Team management access |
| Employee | employee@test.com | Standard employee access |

## Running Tests

### Run All Tests

```bash
npm run test:puppeteer
```

**Output**:
```
 ✓ tests/e2e/dashboard-data.puppeteer.test.ts (8 tests) 2.3s
 ✓ tests/e2e/form-interactions.puppeteer.test.ts (8 tests) 3.1s
 ✓ tests/e2e/events/event-rsvp-workflow.puppeteer.test.ts (7 tests) 2.8s
 ✓ tests/e2e/auth/login.puppeteer.test.ts (5 tests) 1.5s
 ... (more test files)

 Test Files  15 passed (15)
      Tests  87 passed (87)
   Start at  14:32:15
   Duration  8.2s (in thread 3.4s, 241% faster than serial)
```

### Run Specific Test File

```bash
# Run dashboard tests only
npm run test:puppeteer:dashboard

# Run with filter pattern
npx vitest --project=e2e-puppeteer --run tests/e2e/auth/
```

### Run in Headed Mode (Visible Browser)

```bash
# See browser actions in real-time
npm run test:puppeteer:headed

# Or set environment variable
BROWSER_HEADLESS=false npm run test:puppeteer
```

### Run with UI Interface

```bash
# Launch Vitest UI for interactive test running
npm run test:puppeteer:ui

# Access at: http://localhost:51204/__vitest__/
```

## Debugging Failed Tests

### 1. Check Test Output

Failed tests show detailed error messages:

```
 FAIL  tests/e2e/dashboard-data.puppeteer.test.ts
  × Dashboard displays real attendance rate metric
    ↳ Expected "85%" but got "0%"

    at tests/e2e/dashboard-data.puppeteer.test.ts:42:5
```

### 2. View Screenshots

Failed tests automatically capture screenshots:

```bash
# Screenshots saved to:
./test-results/screenshots/

# Example:
./test-results/screenshots/dashboard-attendance-metric-failed-2025-10-27.png
```

### 3. Run in Headed Mode

```bash
# Watch test execution in browser
BROWSER_HEADLESS=false npx vitest tests/e2e/dashboard-data.puppeteer.test.ts
```

### 4. Inspect GraphQL Requests

Enable request logging in test:

```typescript
import { captureConsole } from '../utils/puppeteer-helpers';

test('Dashboard loads user data', async () => {
  const { logs, errors } = captureConsole();

  await gotoPage('/dashboard');

  // Check for GraphQL errors
  console.log('GraphQL requests:', logs);
  console.log('Network errors:', errors);
});
```

### 5. Check Test Database State

```bash
# Connect to test database
psql -d sveltehr_test

# Verify test data
SELECT * FROM users WHERE email = 'admin@test.com';
SELECT * FROM employees LIMIT 5;
```

## Resetting Test Environment

### Reset Test Database

```bash
# Drop and recreate test database with fresh seed data
npm run test:db:reset

# Or manually:
dropdb sveltehr_test
npm run test:db:create
npm run db:migrate --env test
npm run test:db:seed
```

### Clear Test Artifacts

```bash
# Remove screenshots, videos, HTML reports
rm -rf ./test-results/
```

## CI/CD Integration

### GitHub Actions Workflow

**File**: `.github/workflows/puppeteer-e2e-tests.yml` (TO BE CREATED)

**Workflow**:
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

      - name: Run Puppeteer tests
        run: npm run test:puppeteer

      - name: Upload test artifacts
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: puppeteer-test-results
          path: ./test-results/
          retention-days: 30
```

### Viewing CI/CD Test Results

1. Navigate to GitHub Actions tab
2. Select the workflow run
3. Click "puppeteer-test-results" under Artifacts
4. Download and extract to view screenshots/reports

## Troubleshooting

### Issue: Tests fail with "ERR_CONNECTION_REFUSED"

**Solution**: Ensure development server is running:
```bash
npm run dev
```

### Issue: "Test database does not exist"

**Solution**: Create test database:
```bash
npm run test:db:create
```

### Issue: Tests timeout waiting for elements

**Solution**: Increase timeout in test or check element selector:
```typescript
await waitForElement('[data-testid="dashboard-metrics"]', { timeout: 30000 });
```

### Issue: Test data is stale or incorrect

**Solution**: Reset test database:
```bash
npm run test:db:reset
```

## Best Practices

1. **Always reset test database before running full suite**
2. **Use data-testid selectors** instead of CSS classes
3. **Wait for network idle** before assertions: `await waitForNetworkIdle()`
4. **Capture screenshots on failure** for debugging
5. **Run tests in parallel** for speed, but ensure test independence
6. **Use descriptive test names** that explain what is being tested

## Next Steps

- Run `/tasks` to generate implementation tasks
- Begin implementation with Phase 0: Research
- Implement test infrastructure (database, CI/CD)
- Add comprehensive test coverage
