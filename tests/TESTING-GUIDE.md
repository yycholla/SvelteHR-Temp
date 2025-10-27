# E2E Testing Guide - SvelteHR

## Authentication Fix Applied ✅

**Issue Fixed**: Tests were failing because the login helper was using incorrect selectors and invalid credentials.

**Changes Made**:
1. Updated `tests/utils/puppeteer-helpers.ts` login function to:
   - Use proper `data-testid` selectors (`login-form`, `login-username-input`, `login-password-input`, `login-submit-button`)
   - Wait properly for navigation after login (3 seconds + network idle)
   - Handle already-completed navigation gracefully

2. Updated all test files to use valid email format:
   - Changed from `login('admin', 'admin')` to `login('admin@example.com', 'admin')`
   - The login form validates email format and requires `user@domain.com` format

## Prerequisites for Running E2E Tests

### 1. PostgreSQL Database

The tests require a PostgreSQL database to be running:

```bash
# Check if PostgreSQL is running
systemctl status postgresql
# or
pg_isready

# Start PostgreSQL if not running
sudo systemctl start postgresql
# or
pg_ctl -D /path/to/data start
```

### 2. Backend API Server (Go)

The backend must be running on port 8080:

```bash
cd ../MountainHR-Backend  # or wherever your backend is located
# Start the backend server
./start-server.sh
# or
go run main.go
```

**Verify backend is running:**
```bash
curl http://localhost:8080/health
```

### 3. SvelteKit Dev Server

The frontend must be running on port 5173:

```bash
# In the SvelteHR directory
npm run dev
```

**Verify dev server is running:**
```bash
curl http://localhost:5173
```

### 4. Test User Credentials

The tests use these credentials:
- **Email**: `admin@example.com`
- **Password**: `admin`

**Ensure this user exists in your backend database with appropriate permissions.**

If the user doesn't exist, you need to either:
1. Create the user in your backend database
2. Update your backend seed data to include this test user
3. Or modify the tests to use existing credentials from your backend

## Running E2E Tests

### Run All Tests

```bash
# Run all Puppeteer E2E tests
npm run test:puppeteer:all
```

### Run Specific Test Suites

```bash
# Dashboard tests only
npm run test:puppeteer:dashboard

# Forms tests only
npm run test:puppeteer:forms

# Events tests only
npm run test:puppeteer:events

# HR workflows tests only
npm run test:puppeteer:hr

# Admin components tests only
npm run test:puppeteer:admin

# Tasks management tests only
npm run test:puppeteer:tasks
```

### Run Tests with UI

```bash
# Interactive UI mode
npm run test:puppeteer:ui
```

### Run Tests in Watch Mode

```bash
# Runs tests on file changes
npm run test:puppeteer
```

## Test Coverage Reports

### E2E Feature Coverage

View the comprehensive E2E feature coverage matrix:

```bash
cat tests/coverage/e2e-feature-coverage-matrix.md
```

Or open in your editor:
```bash
code tests/coverage/e2e-feature-coverage-matrix.md
```

### Code Coverage

```bash
# Run all tests with code coverage
npm run test:coverage

# View HTML coverage report
npm run test:coverage:report

# Unit tests only with coverage
npm run test:coverage:unit

# CI-formatted coverage output
npm run test:coverage:ci
```

## Troubleshooting

### Issue: "Session invalid" / "Unauthorized → /login"

**Cause**: The test credentials (`admin@example.com` / `admin`) don't exist or are invalid.

**Solutions**:
1. Check if the user exists in your backend database
2. Verify the backend authentication endpoint is working:
   ```bash
   curl -X POST http://localhost:8080/api/v2/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@example.com","password":"admin"}'
   ```
3. Create the test user if it doesn't exist
4. Check backend logs for authentication errors

### Issue: "Connection refused" to PostgreSQL

**Cause**: PostgreSQL is not running.

**Solution**:
```bash
# Start PostgreSQL
sudo systemctl start postgresql

# Verify it's running
pg_isready

# Check the connection
psql -U postgres -h localhost
```

### Issue: "Waiting for selector [data-testid='...'] failed"

**Cause**: The page didn't load properly or the element doesn't exist.

**Solutions**:
1. Verify the dev server is running on http://localhost:5173
2. Check if the component has the correct data-testid attribute
3. Increase timeout in `PUPPETEER_CONFIG.DEFAULT_TIMEOUT` if pages load slowly
4. Check browser console for JavaScript errors

### Issue: Test database reset failing

**Cause**: Database connection issues or permissions.

**Solution**:
```bash
# Check if test database exists
psql -U postgres -l | grep sveltehr_test

# Create test database if needed
createdb sveltehr_test -U postgres

# Grant permissions
psql -U postgres -d sveltehr_test -c "GRANT ALL PRIVILEGES ON DATABASE sveltehr_test TO your_user;"
```

### Issue: Tests fail after updating Node.js/dependencies

**Solution**:
```bash
# Clean install dependencies
rm -rf node_modules package-lock.json
npm install

# Rebuild Puppeteer if needed
npm rebuild puppeteer
```

## Test Structure

### Test Organization

```
tests/e2e/
├── admin/
│   └── admin-components.puppeteer.test.ts    # 17 tests
├── hr/
│   └── hr-workflows.puppeteer.test.ts         # 17 tests
├── tasks/
│   └── task-management.puppeteer.test.ts      # 21 tests
├── events/
│   └── event-rsvp-workflow.puppeteer.test.ts  # 7 tests
├── dashboard-data.puppeteer.test.ts           # 8 tests
└── form-interactions.puppeteer.test.ts        # 8 tests

Total: 78 E2E tests
```

### Test Naming Convention

- **Test files**: `*.puppeteer.test.ts` for Puppeteer-based E2E tests
- **Describe blocks**: Group related tests by feature area
- **Test names**: Descriptive, action-oriented (e.g., "user can access tasks dashboard")

### Data-testid Convention

All data-testid attributes follow the pattern: `[page]-[component]-[action]`

Examples:
- `login-form` - The login form container
- `login-username-input` - Email input field (note: confusing name, but it's for email)
- `login-password-input` - Password input field
- `login-submit-button` - Submit button
- `tasks-dashboard` - Tasks dashboard container
- `task-card` - Individual task card
- `admin-users-table` - Admin users table

## Best Practices

1. **Always use data-testid selectors** instead of CSS classes or element types
2. **Wait for elements before interaction** using `waitForElement()`
3. **Use retry logic** for flaky operations with `withRetry()` helpers
4. **Clear test data** between test runs using database reset scripts
5. **Mock external dependencies** when testing in isolation
6. **Keep tests atomic** - each test should be independent
7. **Use descriptive test names** that explain what's being tested
8. **Verify success conditions** not just absence of errors

## Creating Test User in Backend

If you need to create the test user manually in your PostgreSQL database:

```sql
-- Connect to your database
psql -U postgres -d sveltehr

-- Create test user (adjust based on your schema)
INSERT INTO users (email, password_hash, full_name, role, created_at)
VALUES (
  'admin@example.com',
  '$2a$10$...',  -- bcrypt hash of 'admin'
  'Test Admin',
  'Admin',
  NOW()
);
```

**Note**: You need to generate a proper bcrypt hash for the password. The hash above is just a placeholder.

Or use your backend's user creation API/CLI if available.

## CI/CD Integration

For automated testing in CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Setup PostgreSQL
  run: |
    sudo systemctl start postgresql
    sudo -u postgres createdb sveltehr_test

- name: Start Backend
  run: |
    cd ../MountainHR-Backend
    ./start-server.sh &
    sleep 5

- name: Start Frontend
  run: |
    npm run build
    npm run preview &
    sleep 3

- name: Run E2E Tests
  run: npm run test:puppeteer:all
```

## Performance Optimization

- Tests run in parallel by default (Vitest feature)
- Use `--run` flag for CI to avoid watch mode
- Adjust `PUPPETEER_CONFIG.DEFAULT_TIMEOUT` for slower environments
- Consider headless mode for faster execution (default)

## Debugging Tests

### Enable Headed Mode

```bash
# Run with browser visible
PUPPETEER_HEADLESS=false npm run test:puppeteer:all
```

### Take Screenshots

```typescript
import { takeScreenshot } from '../../utils/puppeteer-helpers';

test('my test', async () => {
  // ... test code
  await takeScreenshot('test-failure-state');
  // ... more test code
});
```

### Capture Console Logs

```typescript
import { captureConsole } from '../../utils/puppeteer-helpers';

test('my test', async () => {
  const { logs, errors } = captureConsole();
  // ... test code
  console.log('Browser errors:', errors);
});
```

### Slow Down Tests

```typescript
// Add delays for debugging
import { waitFor } from '../../utils/puppeteer-helpers';

test('my test', async () => {
  await clickElement('[data-testid="button"]');
  await waitFor(2000); // Wait 2 seconds to observe
  // ... rest of test
});
```

## Contact & Support

If you encounter issues not covered in this guide:

1. Check the E2E Feature Coverage Matrix for known gaps
2. Review test output for specific error messages
3. Check backend logs for API errors
4. Verify all prerequisites are met
5. Consult the project's main README.md

---

**Last Updated**: 2025-10-27
**Test Suite Version**: Feature 039-puppeteer-build-out Phase 5
**Total Tests**: 78 Puppeteer E2E tests
**Target Coverage**: 82% E2E feature coverage
