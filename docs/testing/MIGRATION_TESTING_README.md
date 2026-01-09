# PostGraphile to Rust GraphQL - Migration Testing Guide

**Generated**: 2025-10-20
**Phase**: 0 - Foundation

---

## 📋 Overview

This directory contains smoke tests and integration tests for validating the migration from PostGraphile to Rust idiomatic GraphQL patterns.

---

## 🧪 Test Suites

### 1. Migration Smoke Tests (`migration-smoke-tests.test.ts`)

Validates that the migration is working correctly by testing:

**Query Pattern Validation**:

- ✅ Uses idiomatic query names (`events`, not `allEvents`)
- ✅ Returns direct arrays (not `.nodes`)
- ✅ Uses `limit`/`offset` pagination (not `first`/`after`)
- ❌ Rejects PostGraphile patterns (`allEvents`, `.nodes`)

**Single Entity Query Validation**:

- ✅ Uses `event(id)` (not `eventById`)
- ❌ Rejects PostGraphile single entity patterns

**Relationship Resolver Validation**:

- ✅ Uses idiomatic names (`organizer`, not `userByOrganizerId`)
- ✅ Uses direct arrays for one-to-many (`attendees`, not `.nodes`)
- ❌ Rejects PostGraphile relationship patterns

**Mutation Pattern Validation**:

- ✅ Uses `createEvent(input)` (not nested wrappers)
- ✅ Uses `updateEvent(id, input)` (not `ByNodeId`)
- ❌ Rejects PostGraphile mutation patterns

**Critical Path Integration**:

- ✅ Events list with organizers loads correctly
- ✅ Tasks list with assignees loads correctly
- ✅ Users list with departments loads correctly
- ✅ Departments list loads correctly
- ✅ Leave requests load correctly

**Field Existence Validation**:

- ❌ `nodeId` field doesn't exist (PostGraphile artifact)
- ❌ `icon` field doesn't exist on LeaveType (removed)

**Performance Validation**:

- ⚡ Events query completes under 2 seconds
- ⚡ Pagination performs efficiently

---

## 🚀 Running Tests

### Run All Migration Tests

```bash
npm run test:unit -- tests/integration/graphql/migration-smoke-tests.test.ts
```

### Run Specific Test Suite

```bash
# Query pattern validation
npm run test:unit -- tests/integration/graphql/migration-smoke-tests.test.ts -t "Query Pattern Validation"

# Relationship resolver validation
npm run test:unit -- tests/integration/graphql/migration-smoke-tests.test.ts -t "Relationship Resolver Validation"

# Critical path integration
npm run test:unit -- tests/integration/graphql/migration-smoke-tests.test.ts -t "Critical Path Integration"
```

### Run with Coverage

```bash
npm run test:unit -- --coverage tests/integration/graphql/migration-smoke-tests.test.ts
```

### Run in Watch Mode

```bash
npm run test:unit -- --watch tests/integration/graphql/migration-smoke-tests.test.ts
```

---

## 🔧 Configuration

### Environment Variables

Tests use the following environment variables (configured in `vitest.config.ts`):

```bash
GRAPHQL_ENDPOINT=http://localhost:4000/graphql
NODE_ENV=test
VITEST=true
```

### Backend Requirements

**Before running tests, ensure**:

1. Rust GraphQL server is running on port 4000
2. Database is populated with test data
3. Authentication is disabled or test JWT token is configured

### Starting Test Environment

```bash
# Terminal 1: Start Rust backend
cd graphql-rust-server
cargo run

# Terminal 2: Run tests
npm run test:unit -- tests/integration/graphql/migration-smoke-tests.test.ts
```

---

## 📊 Test Results Interpretation

### ✅ All Tests Pass

Migration is complete and working correctly. All idiomatic Rust patterns are functioning, and PostGraphile patterns are properly rejected.

### ⚠️ Some Tests Fail

**Common Issues**:

1. **"allEvents not found" test passes**
   - ❌ **Problem**: Backend still supports PostGraphile patterns
   - ✅ **Fix**: Remove PostGraphile aliases from backend

2. **"organizer not found" test fails**
   - ❌ **Problem**: Relationship resolver not implemented
   - ✅ **Fix**: Add relationship resolver to backend model

3. **"events returns undefined" test fails**
   - ❌ **Problem**: Query not migrated yet
   - ✅ **Fix**: Update GraphQL operation file to use idiomatic pattern

4. **Performance tests fail**
   - ❌ **Problem**: N+1 queries or missing indexes
   - ✅ **Fix**: Add DataLoader or database indexes

---

## 📝 Test Development Guidelines

### Adding New Migration Tests

1. **Identify pattern to test**

   ```typescript
   // Example: Testing new mutation pattern
   describe('New Mutation Pattern', () => {
   	it('should use idiomatic pattern', async () => {
   		// Test idiomatic pattern works
   	});

   	it('should NOT accept PostGraphile pattern', async () => {
   		// Test PostGraphile pattern fails
   	});
   });
   ```

2. **Follow naming convention**
   - Test file: `*-migration-tests.test.ts`
   - Test suite: Descriptive name of what's being validated
   - Test case: Clear expectation ("should ...", "should NOT ...")

3. **Test both positive and negative cases**
   - ✅ Positive: Verify idiomatic pattern works
   - ❌ Negative: Verify PostGraphile pattern is rejected

---

## 🎯 Test Coverage Goals

### Phase 0 (Foundation)

- [x] Basic query patterns
- [x] Single entity queries
- [x] Relationship resolvers
- [x] Mutation patterns
- [x] Critical paths

### Phase 1 (Operations)

- [ ] Events operations migration
- [ ] Tasks operations migration
- [ ] Employee operations migration
- [ ] Department operations migration
- [ ] Leave management operations migration

### Phase 2 (Pages)

- [ ] Events pages
- [ ] Tasks pages
- [ ] Performance reviews pages

### Phase 3 (Components)

- [ ] Event components
- [ ] Task components
- [ ] Employee components

---

## 🐛 Debugging Failed Tests

### Enable Verbose Logging

```bash
DEBUG=* npm run test:unit -- tests/integration/graphql/migration-smoke-tests.test.ts
```

### Inspect GraphQL Errors

```typescript
// Add to test
const result = await client.query(query, {}).toPromise();
if (result.error) {
	console.error('GraphQL Error:', JSON.stringify(result.error, null, 2));
}
```

### Test Against Live Backend

```bash
# Point to running backend
GRAPHQL_ENDPOINT=http://localhost:4000/graphql npm run test:unit -- tests/integration/graphql/migration-smoke-tests.test.ts
```

### Use GraphQL Playground

```bash
# Open GraphQL Playground
open http://localhost:4000/graphql

# Test query manually:
query {
  events(limit: 5) {
    id
    title
    organizer {
      displayName
    }
  }
}
```

---

## 📚 Related Documentation

- **Backend API Reference**: `/BACKEND_API_REFERENCE.md` - Complete list of queries, mutations, types
- **Migration Pattern Guide**: `/MIGRATION_PATTERN_GUIDE.md` - Before/after examples for all patterns
- **Comprehensive Tasks**: `/COMPREHENSIVE_MIGRATION_TASKS.md` - Detailed task-by-task guide
- **Execution Plan**: `/MIGRATION_EXECUTION_PLAN.md` - Week-by-week schedule

---

## 🔍 Continuous Integration

### GitHub Actions Integration

Tests run automatically on:

- Pull requests to `main`
- Commits to migration branches
- Nightly builds

### CI Configuration

```yaml
# .github/workflows/migration-tests.yml
name: Migration Tests

on:
  pull_request:
    branches: [main]
  push:
    branches: [migration-*]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - name: Install dependencies
        run: npm ci
      - name: Start Rust backend
        run: |
          cd graphql-rust-server
          cargo run &
          sleep 10
      - name: Run migration tests
        run: npm run test:unit -- tests/integration/graphql/migration-smoke-tests.test.ts
```

---

## 🎓 Best Practices

1. **Always run tests before committing**

   ```bash
   npm run test:unit -- tests/integration/graphql/migration-smoke-tests.test.ts
   ```

2. **Update tests when adding new patterns**
   - Add test for new idiomatic pattern
   - Add test to reject old PostGraphile pattern

3. **Keep tests independent**
   - No shared state between tests
   - Each test should pass/fail independently

4. **Use descriptive test names**
   - Good: `'should use organizer field instead of userByOrganizerId'`
   - Bad: `'test relationships'`

5. **Test both success and failure cases**
   - Verify idiomatic pattern works
   - Verify PostGraphile pattern fails

---

## 📞 Support

**Issues with tests?**

- Check backend is running: `curl http://localhost:4000/graphql`
- Check database has data: Query via GraphQL Playground
- Review test logs: `npm run test:unit -- --reporter=verbose`

**Questions about patterns?**

- Consult `/MIGRATION_PATTERN_GUIDE.md` for examples
- Check `/BACKEND_API_REFERENCE.md` for available queries/mutations

---

**Last Updated**: 2025-10-20
**Next Review**: After Phase 1 completion
