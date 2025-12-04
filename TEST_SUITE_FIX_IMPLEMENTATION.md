# Test Suite Fix Implementation Guide

**Date**: 2025-12-04
**Status**: Ready to implement

## Overview

This document provides exact code changes needed to fix the test suite configuration based on the audit findings in TEST_SUITE_AUDIT.md.

---

## Priority 1 Fixes

### Fix 1: Update `unit-client` Project (Line 111-115)

**Current Code**:

```typescript
include: [
	'src/**/*.svelte.{test,spec}.{js,ts}',
	'tests/unit/**/*.svelte.{test,spec}.{js,ts}',
	'src/lib/components/**/*.{test,spec}.{js,ts}'
],
```

**Updated Code**:

```typescript
include: [
	'tests/unit/components/**/*.{test,spec}.{js,ts}',
	'src/lib/components/**/*.{test,spec}.{js,ts}'
],
```

**Reason**: Actual component test files don't use `.svelte.test.ts` naming pattern.

---

### Fix 2: Update `component-browser` Project (Line 143-146)

**Current Code**:

```typescript
include: [
	'tests/unit/components/**/*.browser.{test,spec}.{js,ts}',
	'src/lib/components/**/*.browser.{test,spec}.{js,ts}'
],
```

**Updated Code**:

```typescript
include: [
	'tests/e2e/**/*.browser.{test,spec}.{js,ts}',
	'src/lib/components/**/*.browser.{test,spec}.{js,ts}'
],
```

**Reason**: Browser test files are located in `tests/e2e/` not `tests/unit/components/`.

---

### Fix 3: Update `graphql-performance` Project (Line 285-288)

**Current Code**:

```typescript
include: [
	'tests/performance/graphql/**/*.{test,spec}.{js,ts}',
	'tests/unit/graphql/**/*performance*.{test,spec}.{js,ts}'
],
```

**Updated Code**:

```typescript
include: [
	'tests/performance/**/*graphql*.{test,spec}.{js,ts}',
	'tests/performance/graphql-performance.test.ts'
],
```

**Reason**: `tests/performance/graphql/` directory doesn't exist; performance file is in parent directory.

---

### Fix 4: Update `graphql-schema` Project (Line 249-253)

**Current Code**:

```typescript
include: [
	'tests/contract/graphql-schema-validation.test.ts',
	'tests/contract/test_graphql_schema.spec.ts',
	'tests/contract/graphql/**/*.{test,spec}.{js,ts}'
],
```

**Updated Code**:

```typescript
include: [
	'tests/contract/graphql-schema-validation.test.ts',
	'tests/contract/test_graphql_schema.spec.ts'
],
```

**Reason**: `tests/contract/graphql/` subdirectory doesn't exist.

---

### Fix 5: Add `e2e-playwright` Project (After line 396, before closing bracket)

**Add New Project**:

```typescript
			// E2E Playwright Tests (main E2E test suite)
			{
				name: 'e2e-playwright',
				test: {
					name: 'e2e-playwright',
					globals: true,
					environment: 'node',
					include: ['tests/e2e/**/*.spec.ts'],
					exclude: [
						'tests/e2e/**/*.puppeteer.{test,spec}.{js,ts}',
						'tests/e2e/**/*.stagehand.spec.ts',
						'tests/e2e/**/*.browser.{test,spec}.{js,ts}',
						'tests/unit/**',
						'tests/integration/**',
						'tests/contract/**'
					],
					setupFiles: ['./tests/setup/vitest-setup-e2e-playwright.ts'],
					testTimeout: 60000,
					hookTimeout: 30000,
					// Disable coverage for E2E tests
					coverage: {
						enabled: false
					},
					env: {
						NODE_ENV: 'test',
						VITEST: 'true',
						BASE_URL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173',
						BROWSER_HEADLESS: process.env.HEADED ? 'false' : 'true'
					}
				}
			},
```

**Reason**: 60+ Playwright `.spec.ts` files in tests/e2e/ have no project configuration.

---

### Fix 6: Add `security` Project (After line 396, before closing bracket)

**Add New Project**:

```typescript
			// Security Tests
			{
				name: 'security',
				extends: './vitest.config.ts',
				test: {
					name: 'security',
					environment: 'node',
					include: ['tests/security/**/*.{test,spec}.{js,ts}'],
					exclude: ['tests/unit/**', 'tests/integration/**', 'tests/contract/**', 'tests/e2e/**'],
					setupFiles: ['./tests/setup/vitest-setup-security.ts'],
					testTimeout: 30000,
					hookTimeout: 15000,
					// Disable coverage for security tests
					coverage: {
						enabled: false
					},
					env: {
						NODE_ENV: 'test',
						VITEST: 'true',
						BASE_URL: process.env.BASE_URL || 'http://localhost:5173'
					}
				}
			},
```

**Reason**: 4 security test files have no project configuration.

---

### Fix 7: Optional - Remove or Comment Out `graphql-subscriptions` Project

**Current Project** (Lines 326-365):

```typescript
// GraphQL subscription testing
{
	name: 'graphql-subscriptions',
	// ... (entire project definition)
}
```

**Action**: Comment out or remove this entire project

**Reason**: No subscription test files exist, project serves no purpose.

---

## Package.json Script Updates

### Current Scripts to Update:

**Line in package.json**:

```json
"test:unit": "vitest --project=unit-server,unit-client",
```

### Recommended New Scripts:

Add these to package.json `scripts` section:

```json
"test:unit": "vitest --project=unit-server,unit-client",
"test:unit:all": "vitest --project=unit-server,unit-client,graphql",
"test:integration": "vitest --project=integration",
"test:contract": "vitest --project=contract",
"test:e2e": "vitest --project=e2e-playwright,e2e-puppeteer",
"test:e2e:playwright": "vitest --project=e2e-playwright",
"test:e2e:puppeteer": "vitest --project=e2e-puppeteer",
"test:security": "vitest --project=security",
"test:performance": "vitest --project=performance",
"test:graphql": "vitest --project=graphql,graphql-schema",
"test:all": "vitest run --project=unit-server,unit-client,integration,contract,e2e-playwright,e2e-puppeteer,security",
"test:watch": "vitest --project=unit-server,unit-client",
"test:coverage": "vitest run --coverage --project=unit-server,unit-client,integration"
```

---

## Implementation Steps

### Step 1: Apply vitest.config.ts Changes

1. Open `vitest.config.ts`
2. Apply Fix 1: Update unit-client includes (line 111-115)
3. Apply Fix 2: Update component-browser includes (line 143-146)
4. Apply Fix 3: Update graphql-performance includes (line 285-288)
5. Apply Fix 4: Update graphql-schema includes (line 249-253)
6. Apply Fix 5: Add e2e-playwright project after line 396
7. Apply Fix 6: Add security project after line 396
8. (Optional) Apply Fix 7: Comment out graphql-subscriptions project

### Step 2: Update package.json Scripts

1. Open `package.json`
2. Add recommended test scripts to `scripts` section

### Step 3: Verify Setup Files Exist

All required setup files have been created:

- ✅ `tests/setup/vitest-setup-security.ts` (created)
- ✅ `tests/setup/vitest-setup-e2e-playwright.ts` (created)
- ✅ All other setup files already exist

### Step 4: Test Each Project

Run each project individually to verify configuration:

```bash
# Test unit tests
npm run vitest -- --project=unit-server --run
npm run vitest -- --project=unit-client --run

# Test integration
npm run vitest -- --project=integration --run

# Test contract
npm run vitest -- --project=contract --run

# Test E2E
npm run vitest -- --project=e2e-playwright --run
npm run vitest -- --project=e2e-puppeteer --run

# Test security
npm run vitest -- --project=security --run

# Test performance
npm run vitest -- --project=performance --run

# Test GraphQL
npm run vitest -- --project=graphql --run
npm run vitest -- --project=graphql-schema --run
```

### Step 5: Run Full Test Suite

After verifying individual projects work:

```bash
npm run test:all
```

---

## Expected Results After Implementation

### Test Coverage:

- ✅ ~40 unit test files (unit-server, unit-client)
- ✅ ~30 integration test files (integration)
- ✅ ~50 contract test files (contract)
- ✅ ~60 Playwright E2E files (e2e-playwright) 🆕
- ✅ ~6 Puppeteer E2E files (e2e-puppeteer)
- ✅ ~4 security test files (security) 🆕
- ✅ ~3 performance test files (performance)
- ✅ ~6 GraphQL test files (graphql, graphql-schema)

**Total**: ~200 test files covered (up from ~140)

### CI/CD Impact:

- ❌ Current CI fails with "No projects matched the filter"
- ✅ After fixes, CI will run all configured test projects
- ✅ Security tests will run automatically
- ✅ Playwright E2E tests will run in CI

---

## Rollback Plan

If issues occur after implementation:

1. **Git Revert**:

   ```bash
   git checkout HEAD~1 -- vitest.config.ts package.json
   ```

2. **Backup Files**: Before implementing, backup current config:

   ```bash
   cp vitest.config.ts vitest.config.ts.backup
   cp package.json package.json.backup
   ```

3. **Restore Backup**:
   ```bash
   cp vitest.config.ts.backup vitest.config.ts
   cp package.json.backup package.json
   ```

---

## Success Criteria

- [ ] All vitest projects match actual test file structure
- [ ] `npm run test:unit` executes without "No projects matched" error
- [ ] `npm run test:e2e:playwright` runs 60+ Playwright tests
- [ ] `npm run test:security` runs 4 security tests
- [ ] `npm run test:all` completes successfully
- [ ] CI/CD passes on next commit
- [ ] No test files are orphaned (all belong to a project)

---

## Maintenance Notes

### Adding New Tests:

**Unit Tests**: Place in `tests/unit/` - will run with `unit-server` project
**Component Tests**: Place in `tests/unit/components/` - will run with `unit-client` project
**E2E Tests**: Place in `tests/e2e/` with `.spec.ts` extension - will run with `e2e-playwright` project
**Security Tests**: Place in `tests/security/` - will run with `security` project
**Integration Tests**: Place in `tests/integration/` - will run with `integration` project
**Contract Tests**: Place in `tests/contract/` - will run with `contract` project

### File Naming Conventions:

- **Unit tests**: `*.test.ts` or `*.spec.ts`
- **E2E Playwright**: `*.spec.ts` (in tests/e2e/)
- **E2E Puppeteer**: `*.puppeteer.test.ts` (in tests/e2e/)
- **Browser tests**: `*.browser.test.ts` (in tests/e2e/)
- **Security tests**: `*.test.ts` or `*.security.spec.ts` (in tests/security/)
- **Contract tests**: `*.contract.ts` or `*.contract.spec.ts` (in tests/contract/)

---

## Estimated Time

- **Applying Changes**: 15-20 minutes
- **Testing**: 30-45 minutes
- **Total**: ~1 hour

---

## Questions?

If any issues arise during implementation:

1. Check TEST_SUITE_AUDIT.md for detailed analysis
2. Verify setup files exist in tests/setup/
3. Ensure BASE_URL environment variable is set correctly
4. Run individual projects to isolate issues
