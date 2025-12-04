# Test Suite Configuration Audit
**Date**: 2025-12-04
**Purpose**: Align vitest.config.ts with actual test file structure

## Executive Summary

The current vitest.config.ts defines 15 test projects, but several have mismatches with actual test files:
- ❌ **4 projects** have no matching test files
- ⚠️ **3 projects** have partial matches with naming convention issues
- ✅ **4 projects** are correctly configured
- 🔍 **2 test directories** have no project configuration

## Detailed Project Analysis

### ✅ Working Projects (4)

#### 1. `contract` - Schema Validation Tests
**Status**: ✅ Fully functional
**Include Pattern**: `tests/contract/**/*.{test,spec}.{js,ts}`
**Actual Files**: 50+ files in `tests/contract/`
**Setup File**: `tests/setup/vitest-setup-contract.ts` ✅ Exists

#### 2. `integration` - Integration Tests
**Status**: ✅ Fully functional
**Include Pattern**: `tests/integration/**/*.{test,spec}.{js,ts}`
**Actual Files**: 30+ files in `tests/integration/`
**Setup File**: `tests/setup/vitest-setup-integration.ts` ✅ Exists

#### 3. `performance` - Performance Benchmarks
**Status**: ✅ Partially functional
**Include Pattern**: `tests/performance/**/*.{test,spec}.{js,ts}`
**Actual Files**:
- `tests/performance/bulk-upload.spec.ts`
- `tests/performance/document-search.spec.ts`
- `tests/performance/graphql-performance.test.ts`
- Shell scripts (not included in Vitest)
**Setup File**: `tests/setup/vitest-setup-performance.ts` ✅ Exists

#### 4. `e2e-puppeteer` - Puppeteer E2E Tests
**Status**: ✅ Fully functional
**Include Pattern**: `tests/e2e/**/*.puppeteer.{test,spec}.{js,ts}`
**Actual Files**:
- `tests/e2e/admin/admin-components.puppeteer.test.ts`
- `tests/e2e/events/event-rsvp-workflow.puppeteer.test.ts`
- `tests/e2e/tasks/task-management.puppeteer.test.ts`
- `tests/e2e/hr/hr-workflows.puppeteer.test.ts`
- `tests/e2e/dashboard-data.puppeteer.test.ts`
- `tests/e2e/form-interactions.puppeteer.test.ts`
**Setup File**: `tests/setup/vitest-setup-e2e-puppeteer.ts` ✅ Exists

---

### ⚠️ Partially Working Projects (3)

#### 5. `unit-server` - Server-Side Unit Tests
**Status**: ⚠️ Naming convention mismatch
**Include Pattern**:
- `src/**/*.{test,spec}.{js,ts}`
- `tests/unit/**/*.{test,spec}.{js,ts}`
**Excludes**: `.svelte` test files

**Actual Files in src/**:
- `src/lib/components/auth/LoginForm.test.ts` (4 files total)

**Actual Files in tests/unit/**:
- `tests/unit/dashboard-component-syntax.test.ts`
- `tests/unit/management-page-state-reactivity.test.ts`
- `tests/unit/settings-page-state-reactivity.test.ts`
- `tests/unit/rbac-utils.test.ts`
- `tests/unit/crypto-signer.test.ts`
- `tests/unit/documentValidation.spec.ts`
- `tests/unit/encryption.spec.ts`
- Plus files in subdirectories: `api/`, `components/`, `services/`, `utils/`, `schemas/`, `routes/`

**Issue**: Config expects `.test.ts` or `.spec.ts` files in src/ but only 4 exist. Most unit tests are in tests/unit/.

**Recommendation**: ✅ This project should work but may have limited coverage in src/

#### 6. `unit-client` - Client-Side Component Tests
**Status**: ⚠️ Expecting wrong file naming pattern
**Include Pattern**:
- `src/**/*.svelte.{test,spec}.{js,ts}`
- `tests/unit/**/*.svelte.{test,spec}.{js,ts}`
- `src/lib/components/**/*.{test,spec}.{js,ts}`

**Actual Files**:
- Very few files match `.svelte.test.ts` pattern
- Most component tests are in `tests/unit/components/` without `.svelte` in the filename

**Examples of Actual Component Tests**:
- `tests/unit/components/ActivityFeed.test.ts` (NOT `.svelte.test.ts`)
- `tests/unit/components/AuditLogFilters.test.ts`
- `tests/unit/components/Pagination.test.ts`
- `tests/unit/components/events/*.spec.ts` and `*.contract.spec.ts`

**Issue**: Config expects `.svelte.test.ts` naming but actual files use `.test.ts` or `.spec.ts`

**Recommendation**: ⚠️ Update include pattern or rename test files

#### 7. `graphql` - GraphQL Testing Suite
**Status**: ⚠️ Partially functional
**Include Pattern**:
- `tests/unit/graphql/**/*.{test,spec}.{js,ts}`
- `tests/integration/graphql/**/*.{test,spec}.{js,ts}`
- `src/lib/graphql/**/*.{test,spec}.{js,ts}`

**Actual Files**:
- ✅ `tests/unit/graphql/` - 5 files exist
- ✅ `tests/integration/graphql/` - 1 file exists
- ❌ `src/lib/graphql/` - No test files in this directory

**Setup File**: `tests/setup/vitest-setup-graphql.ts` ✅ Exists

**Recommendation**: ✅ Mostly working, consider removing src/lib/graphql pattern

---

### ❌ Non-Functional Projects (4)

#### 8. `component-browser` - Browser-Based Component Testing
**Status**: ❌ No matching test files
**Include Pattern**:
- `tests/unit/components/**/*.browser.{test,spec}.{js,ts}`
- `src/lib/components/**/*.browser.{test,spec}.{js,ts}`

**Actual Files**: None with `.browser.test.ts` pattern in those directories

**Note**: There ARE browser test files but in `tests/e2e/`:
- `tests/e2e/dashboard-data.browser.test.ts`
- `tests/e2e/form-interactions.browser.test.ts`
- `tests/e2e/events/event-rsvp-workflow.browser.test.ts`

**Issue**: Wrong directory pattern - browser tests are in tests/e2e/ not tests/unit/components/

**Recommendation**: ❌ Update include pattern or move tests

#### 9. `graphql-schema` - GraphQL Schema Validation
**Status**: ⚠️ Limited files
**Include Pattern**:
- `tests/contract/graphql-schema-validation.test.ts` ✅ Exists
- `tests/contract/test_graphql_schema.spec.ts` ✅ Exists
- `tests/contract/graphql/**/*.{test,spec}.{js,ts}` ❌ Directory doesn't exist

**Actual Files**: Only 2 explicit schema validation files exist

**Setup File**: `tests/setup/vitest-setup-graphql-schema.ts` ✅ Exists

**Recommendation**: ⚠️ Remove non-existent graphql/ subdirectory pattern

#### 10. `graphql-performance` - GraphQL Performance Testing
**Status**: ❌ Primary directory doesn't exist
**Include Pattern**:
- `tests/performance/graphql/**/*.{test,spec}.{js,ts}` ❌ Directory doesn't exist
- `tests/unit/graphql/**/*performance*.{test,spec}.{js,ts}` ❓ No files match this pattern

**Actual Performance Tests**:
- `tests/performance/graphql-performance.test.ts` (in parent directory, not graphql/)

**Setup File**: `tests/setup/vitest-setup-graphql-performance.ts` ✅ Exists

**Recommendation**: ❌ Update include pattern to `tests/performance/**/*graphql*.{test,spec}.{js,ts}`

#### 11. `graphql-subscriptions` - GraphQL Subscription Testing
**Status**: ❌ No dedicated subscription test files
**Include Pattern**:
- `tests/unit/graphql/**/*subscription*.{test,spec}.{js,ts}` ❌ No matches
- `tests/integration/graphql/subscriptions/**/*.{test,spec}.{js,ts}` ❌ Directory doesn't exist

**Actual Files**: No files match these patterns

**Setup File**: `tests/setup/vitest-setup-graphql-subscriptions.ts` ✅ Exists

**Recommendation**: ❌ Remove this project or create subscription tests

---

### 🔍 Missing Project Configurations (2)

#### 12. Security Tests (Not Configured)
**Directory**: `tests/security/`
**Actual Files**:
- `tests/security/encryption-audit.security.spec.ts`
- `tests/security/rbac-validation.security.spec.ts`
- `tests/security/retention-compliance.security.spec.ts`
- `tests/security/credential-leakage.test.ts`

**Recommendation**: 🆕 Create new `security` project

#### 13. Visual Regression Tests (Not Configured)
**Directory**: `tests/visual/`
**Actual Files**:
- `tests/visual/dashboard.visual.spec.ts`

**Recommendation**: 🆕 Create new `visual` project or add to existing e2e

#### 14. Playwright E2E Tests (Partially Configured)
**Actual Files**: 60+ `.spec.ts` files in `tests/e2e/` that are NOT Puppeteer tests

**Examples**:
- `tests/e2e/admin/teams.spec.ts`
- `tests/e2e/admin/onboarding-forms-management.spec.ts`
- `tests/e2e/admin/form-builder.spec.ts`
- `tests/e2e/dashboard-component-rendering.spec.ts`
- `tests/e2e/management/*.spec.ts`
- `tests/e2e/events/*.spec.ts` (30+ files)
- `tests/e2e/tasks/*.spec.ts` (20+ files)

**Issue**: These are likely Playwright tests but no project is configured for them

**Recommendation**: 🆕 Create `e2e-playwright` project or merge into existing e2e

---

## File Naming Convention Analysis

### Current Test File Extensions in Use:
- `.test.ts` - Most common (unit and integration tests)
- `.spec.ts` - Common (e2e and contract tests)
- `.contract.spec.ts` - Contract tests
- `.security.spec.ts` - Security tests
- `.visual.spec.ts` - Visual regression tests
- `.browser.test.ts` - Browser-based tests
- `.puppeteer.test.ts` - Puppeteer E2E tests
- `.stagehand.spec.ts` - Stagehand AI tests

### Issues:
1. Config expects `.svelte.test.ts` but no files use this pattern
2. Browser tests are in tests/e2e/ not tests/unit/components/
3. Multiple E2E test types (Playwright, Puppeteer, Stagehand) but only Puppeteer configured

---

## Setup Files Analysis

### Existing Setup Files:
✅ `tests/setup/vitest-setup.ts` (global)
✅ `tests/setup/vitest-setup-server.ts`
✅ `tests/setup/vitest-setup-client.ts`
✅ `tests/setup/vitest-browser-setup.ts`
✅ `tests/setup/vitest-setup-integration.ts`
✅ `tests/setup/vitest-setup-contract.ts`
✅ `tests/setup/vitest-setup-performance.ts`
✅ `tests/setup/vitest-setup-graphql.ts`
✅ `tests/setup/vitest-setup-graphql-schema.ts`
✅ `tests/setup/vitest-setup-graphql-performance.ts`
✅ `tests/setup/vitest-setup-graphql-subscriptions.ts`
✅ `tests/setup/vitest-setup-e2e-puppeteer.ts`
✅ `tests/setup/vitest-setup-e2e-browser.ts`

### Missing Setup Files:
❌ `tests/setup/vitest-setup-security.ts` (needed for security tests)
❌ `tests/setup/vitest-setup-visual.ts` (needed for visual tests)
❌ `tests/setup/vitest-setup-e2e-playwright.ts` (if adding Playwright project)

---

## Test Statistics

### Actual Test File Counts by Directory:
- `tests/contract/` - ~50 files
- `tests/e2e/` - ~80 files (60+ Playwright .spec.ts, 6 Puppeteer .puppeteer.test.ts, 2 Stagehand, 2 Browser)
- `tests/integration/` - ~30 files
- `tests/unit/` - ~40 files
- `tests/performance/` - 3 files + shell scripts
- `tests/security/` - 4 files
- `tests/visual/` - 1 file
- `tests/utils/` - ~10 helper files
- `src/` - ~4 test files

**Total Test Files**: ~220+ test files

### Configured vs Actual Coverage:
- **Configured to run**: ~60% of test files
- **Not configured**: ~40% of test files (mainly Playwright E2E and security tests)

---

## Recommended Actions

### Priority 1: Critical Fixes (Immediate)

1. **Fix `component-browser` project** - Update include pattern:
   ```typescript
   include: [
     'tests/e2e/**/*.browser.{test,spec}.{js,ts}', // Correct location
     'src/lib/components/**/*.browser.{test,spec}.{js,ts}'
   ]
   ```

2. **Fix `unit-client` project** - Remove `.svelte` from pattern:
   ```typescript
   include: [
     'tests/unit/components/**/*.{test,spec}.{js,ts}', // Remove .svelte
     'src/lib/components/**/*.{test,spec}.{js,ts}'
   ]
   ```

3. **Fix `graphql-performance` project** - Update include pattern:
   ```typescript
   include: [
     'tests/performance/**/*graphql*.{test,spec}.{js,ts}',
     'tests/performance/graphql-performance.test.ts'
   ]
   ```

4. **Create `e2e-playwright` project** - Add new project for main E2E tests:
   ```typescript
   {
     name: 'e2e-playwright',
     test: {
       name: 'e2e-playwright',
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
       testTimeout: 60000
     }
   }
   ```

5. **Create `security` project** - Add security test configuration:
   ```typescript
   {
     name: 'security',
     test: {
       name: 'security',
       environment: 'node',
       include: ['tests/security/**/*.{test,spec}.{js,ts}'],
       setupFiles: ['./tests/setup/vitest-setup-security.ts'],
       testTimeout: 30000
     }
   }
   ```

### Priority 2: Optimizations (Next Sprint)

6. **Remove or merge `graphql-subscriptions` project** - No tests exist for it
7. **Clean up `graphql-schema` project** - Remove non-existent graphql/ subdirectory pattern
8. **Add visual regression project** - If visual tests will be expanded
9. **Update package.json scripts** - Ensure all projects are runnable

### Priority 3: Documentation (Ongoing)

10. **Create test naming convention guide**
11. **Document which projects to use for new tests**
12. **Add test coverage goals per project**

---

## Updated package.json Script Recommendations

Current problematic script:
```json
"test:unit": "vitest --project=unit-server,unit-client"
```

**Issue**: `unit-server` and `unit-client` don't match many actual test files

**Recommended Changes**:
```json
{
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
  "test:all": "vitest --project=unit-server,unit-client,integration,contract,e2e-playwright,e2e-puppeteer,security"
}
```

---

## Conclusion

The vitest configuration is partially functional but needs updates to match actual test file structure. The main issues are:

1. ❌ Wrong file naming assumptions (`.svelte.test.ts`)
2. ❌ Wrong directory assumptions (browser tests in unit/components/)
3. ❌ Missing projects for 60+ Playwright E2E tests and security tests
4. ❌ Non-existent subdirectory patterns in several projects

**Estimated Work**: 2-4 hours to implement Priority 1 fixes and validate all projects work correctly.

**Testing Strategy**: After fixes, run each project individually to verify:
```bash
npm run vitest -- --project=unit-server --run
npm run vitest -- --project=unit-client --run
npm run vitest -- --project=e2e-playwright --run
# etc.
```
