# SvelteHR Testing Strategy

## Overview

This project uses a pragmatic testing approach that balances comprehensive testing with maintainability. Tests are designed to run with the full stack locally, while CI runs only frontend-isolated tests.

## Testing Architecture

### 1. **Backend GraphQL Testing** → Rust Codebase
```
graphql-rust-server/tests/
├── contract/           # API contract tests
│   ├── test_auth_login.rs
│   ├── test_employee_contract.rs
│   ├── test_security.rs
│   └── test_documents_contract.rs
├── integration/        # Integration tests
└── load/              # Load and performance tests
```

**Run with:** `cd graphql-rust-server && cargo test`

### 2. **Frontend Unit Tests** → No Backend Required
```
tests/unit/
├── components/        # Svelte component tests
├── utils/            # Utility function tests
└── services/         # Service layer tests (mocked)
```

**Run with:** `npm run test:unit`
**CI:** ✅ Runs in CI (no backend needed)

### 3. **E2E/Integration Tests** → Requires Full Stack
```
tests/e2e/            # Playwright E2E tests
tests/integration/    # Full-stack integration tests
tests/contract/       # GraphQL contract tests
```

**Prerequisites:**
- Rust GraphQL backend running on `http://localhost:4000/graphql`
- PostgreSQL database initialized
- Frontend dev server on `http://localhost:5173`

**Run with:** `npm run test:e2e` or `npm run test:integration`
**CI:** ⏭️ Skipped in CI (uses `describeOrSkip` pattern)

## Local Development Workflow

### Full Stack Testing (Recommended)

1. **Start Backend Services:**
   ```bash
   # Terminal 1: Start Rust GraphQL backend
   cd graphql-rust-server
   cargo run

   # Terminal 2: Start Frontend dev server
   npm run dev
   ```

2. **Run All Tests:**
   ```bash
   # Backend tests
   cd graphql-rust-server && cargo test

   # Frontend unit tests
   npm run test:unit

   # E2E tests
   npm run test:e2e

   # Integration tests
   npm run test:integration

   # Contract tests
   npm run test:contract
   ```

### Quick Frontend-Only Testing

If you only need to test frontend components without backend:

```bash
npm run test:unit -- --run
```

## CI/CD Testing

GitHub Actions CI runs **only frontend unit tests** that don't require the backend:

```yaml
# .github/workflows/ci.yml
- name: Run unit tests
  run: npm run test:unit -- --run
```

**Backend-dependent tests are skipped** using this pattern:

```typescript
// tests/contract/example.spec.ts
const describeOrSkip = process.env.CI ? describe.skip : describe;

describeOrSkip('Backend Integration Tests', () => {
  // These tests require Rust GraphQL backend
  it('should query employees', async () => {
    const response = await fetch('http://localhost:4000/graphql', {
      method: 'POST',
      body: JSON.stringify({ query: '{ employees { id } }' })
    });
    // ...
  });
});
```

## Why No MSW (Mock Service Worker)?

We deliberately **don't use MSW** for API mocking because:

1. **Maintenance Burden:** Every new endpoint requires updating mocks
2. **Drift from Reality:** Mocks can become outdated when API changes
3. **False Confidence:** Tests pass with mocks but fail with real API
4. **Local Testing is Better:** Running full stack locally catches real integration issues

Instead, we:
- Run full-stack tests locally with real backend
- Skip backend tests in CI
- Keep frontend unit tests truly isolated (no API calls)

## Test Organization Guidelines

### ✅ **Good:** Frontend Unit Test (No Backend)
```typescript
// tests/unit/utils/format-date.test.ts
import { formatDate } from '$lib/utils/format-date';

describe('formatDate', () => {
  it('should format date correctly', () => {
    expect(formatDate(new Date('2025-01-01'))).toBe('Jan 1, 2025');
  });
});
```

### ✅ **Good:** Backend Test (In Rust Codebase)
```rust
// graphql-rust-server/tests/contract/test_auth_login.rs
#[tokio::test]
async fn test_login_success() {
    let response = client
        .post("/graphql")
        .json(&json!({
            "query": "mutation { login(email: \"admin@test.com\") { token } }"
        }))
        .send()
        .await?;

    assert_eq!(response.status(), StatusCode::OK);
}
```

### ✅ **Good:** E2E Test (Skipped in CI)
```typescript
// tests/e2e/dashboard.spec.ts
const describeOrSkip = process.env.CI ? describe.skip : describe;

describeOrSkip('Dashboard E2E', () => {
  it('should load dashboard with real data', async ({ page }) => {
    await page.goto('http://localhost:5173/dashboard');
    await expect(page.locator('h1')).toContainText('Dashboard');
  });
});
```

### ❌ **Avoid:** Mocking Backend in Frontend Tests
```typescript
// ❌ Don't do this
import { setupServer } from 'msw/node';

const server = setupServer(
  graphql.query('GetEmployees', (req, res, ctx) => {
    return res(ctx.data({ employees: [] }));
  })
);
// This creates maintenance burden and mocks can drift
```

## Running Specific Test Suites

```bash
# Unit tests only
npm run test:unit

# E2E tests only
npm run test:e2e

# Specific E2E test file
npm run test:e2e -- tests/e2e/dashboard.spec.ts

# Contract tests (requires backend)
npm run test:contract

# Integration tests (requires backend)
npm run test:integration

# All frontend tests (unit + e2e + integration)
npm run test
```

## Test Environment Variables

```bash
# Skip backend-dependent tests
CI=true npm run test

# Run all tests (including backend-dependent)
npm run test

# GraphQL endpoint (for contract tests)
GRAPHQL_ENDPOINT=http://localhost:4000/graphql npm run test:contract

# Test database (for Rust backend tests)
TEST_DATABASE_URL=postgresql://test:test@localhost:5432/sveltehr_test
```

## Future Improvements

- [ ] Add Rust backend CI workflow to run `cargo test`
- [ ] Set up test database seeding for consistent E2E tests
- [ ] Add visual regression testing for UI components
- [ ] Consider component testing with Testing Library
