# Comprehensive Test Implementation - Design Document

**Created:** 2026-01-16
**Status:** Approved
**Timeline:** 12 weeks
**Commitment Level:** Full refactor of entire codebase

---

## Executive Summary

Transform SvelteHR from 4.35% test coverage to 80%+ coverage through comprehensive architectural refactoring. This is not a testing project—it's an architecture project that makes the codebase inherently testable, then writes comprehensive tests.

**Core Philosophy:** Refactor first, test second. Don't lock in bad patterns with tests around poorly designed code.

---

## Goals (All Five Dimensions)

1. **Enable safe refactoring** - Confidence to make changes without breaking things
2. **Catch bugs earlier** - Quality gates that actually prevent issues
3. **CI/CD reliability** - CI validates PRs, not just checkboxes
4. **Code quality culture** - Tests as first-class development practice
5. **Comprehensive improvement** - Not just one area, but the entire system

---

## Current State Analysis

**Problems:**
- 4.35% code coverage (target: 80%)
- 337 skipped tests (22% of test suite)
- 811 `any` types in `src/lib` alone
- Tight coupling preventing unit testing
- Business logic embedded in UI components
- Inconsistent error handling
- No dependency injection
- Mixed concerns (domain + UI + data fetching)

**Impact:**
- Can't safely refactor (no tests to catch breakage)
- ESLint cleanup blocked (can't validate changes)
- Production bugs slip through
- Slow development (fear of breaking things)
- Poor code quality culture

---

## Section 1: Overall Architecture & Three-Phase Strategy

### The Vision: Test-Driven Architecture

Instead of writing tests for existing code, we'll refactor the architecture to be inherently testable, THEN write comprehensive tests.

### Three-Phase Execution

**Phase 1: Foundation (Weeks 1-4)**
- Extract all shared utilities into pure functions
- Implement dependency injection container
- Create TypeScript interfaces to replace `any` types
- Refactor GraphQL client as injectable service
- Build testable auth service architecture
- **Output**: Testable foundation layer with 80%+ coverage

**Phase 2: Business Logic (Weeks 5-8)**
- Extract domain logic from Svelte components into services
- Create view models that components consume
- Implement command/query separation for data operations
- Build error handling infrastructure
- **Output**: Business logic layer, fully tested, zero Svelte dependencies

**Phase 3: Integration & UI (Weeks 9-12)**
- Thin Svelte components that delegate to services
- Component integration tests using vitest-browser-svelte
- E2E critical path coverage with Playwright
- Performance regression tests
- **Output**: Complete test pyramid, 80%+ coverage across all layers

**Why This Works:**
- Each phase delivers value independently
- Tests written against clean architecture are maintainable
- Prevents rewriting tests when refactoring bad code
- Team learns testable patterns early, applies throughout

---

## Section 2: Architectural Patterns & Dependency Injection

### Core Pattern: Ports & Adapters (Hexagonal Architecture)

**Layer 1: Domain Core (Pure Business Logic)**
- No external dependencies (no Svelte, no GraphQL, no browser APIs)
- Pure TypeScript functions and classes
- Input: Plain objects (POJOs/interfaces)
- Output: Plain objects or errors
- **Example**: `calculateEmployeeTenure(hireDate: Date): number`

**Layer 2: Application Services (Orchestration)**
- Depends on Domain Core + Ports (interfaces)
- Coordinates domain logic with external systems
- Handles errors, logging, validation
- **Example**: `EmployeeService` that uses `GraphQLPort` to fetch data, `DomainLogic` to transform it

**Layer 3: Adapters (External Integration)**
- Implements Ports (GraphQL client, auth, storage)
- UI components (Svelte) consume Application Services
- Browser APIs, localStorage, etc.
- **Example**: `UrqlGraphQLAdapter implements GraphQLPort`

### Dependency Injection Container

```typescript
// Container provides all services
class Container {
  private static instance: Container;

  graphql: GraphQLPort;
  auth: AuthService;
  employees: EmployeeService;

  // Inject mocks for testing
  static createTest(overrides?: Partial<Container>): Container {
    return new Container({
      graphql: new MockGraphQLAdapter(),
      ...overrides
    });
  }
}
```

**Benefits:**
- Business logic has zero external dependencies = easy unit tests
- Services receive dependencies = easy integration tests with mocks
- UI components receive services = easy component tests
- Can swap implementations (real GraphQL vs mock) without changing code

---

## Section 3: Type Safety Strategy - Eliminating 811 `any` Types

### The Problem
- 811 `any` types across the codebase (just in `src/lib`)
- Defeats TypeScript's purpose - can't catch errors at compile time
- Makes refactoring dangerous - no compiler help

### The Solution: Progressive Type Extraction

**Step 1: GraphQL Schema Types (Week 1)**

Generate TypeScript interfaces from GraphQL schema:

```typescript
// Before (typical pattern found)
function getEmployee(id: string): any { ... }

// After
interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  hireDate: Date;
  department: Department;
  role: Role;
}

function getEmployee(id: string): Promise<Employee> { ... }
```

**Step 2: Domain Model Types (Week 2)**

Create domain-specific types that may differ from GraphQL:

```typescript
// GraphQL returns snake_case, nullable everything
interface EmployeeDTO {
  first_name: string | null;
  hire_date: string | null;
}

// Domain model: camelCase, non-nullable, typed dates
interface Employee {
  firstName: string;
  hireDate: Date;
}

// Adapter transforms DTO → Domain
class EmployeeMapper {
  static toDomain(dto: EmployeeDTO): Employee {
    if (!dto.first_name) throw new Error("Missing first name");
    return {
      firstName: dto.first_name,
      hireDate: new Date(dto.hire_date!)
    };
  }
}
```

**Step 3: Component Props Types (Week 3)**

Replace `any` in Svelte components:

```typescript
// Before
let { data } = $props<{ data: any }>();

// After
interface EmployeeListProps {
  employees: Employee[];
  canEdit: boolean;
  onSelect: (id: string) => void;
}

let { employees, canEdit, onSelect } = $props<EmployeeListProps>();
```

**Step 4: Utility Function Types (Week 4)**

Type all utilities properly:

```typescript
// Before
export function formatDate(date: any): string { ... }

// After
export function formatDate(date: Date | string | null): string {
  if (!date) return 'N/A';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString();
}
```

### Enforcement

Update `eslint.config.js` to promote `no-explicit-any` from `warn` to `error` AFTER each week:
- Week 1: GraphQL layer must have zero `any`
- Week 2: Domain layer must have zero `any`
- Week 3: Component props must have zero `any`
- Week 4: Utils must have zero `any`

This prevents new `any` types from creeping in as we clean up old ones.

**Expected Impact:**
- From 811 `any` → 0 `any` in 4 weeks
- TypeScript catches errors at compile time
- Refactoring becomes safe (compiler shows all affected code)
- IDE autocomplete works everywhere

---

## Section 4: Testing Strategy - The Test Pyramid

### Test Distribution (Target)
- **70% Unit Tests** - Fast, isolated, test business logic and utilities
- **20% Integration Tests** - Test service interactions (GraphQL, auth, etc.)
- **10% E2E Tests** - Critical user paths through real UI

### Unit Tests (Foundation - Weeks 1-6)

Test pure functions and domain logic in isolation:

```typescript
// Example: Domain logic test
describe('EmployeeTenureCalculator', () => {
  it('calculates years of service correctly', () => {
    const hireDate = new Date('2020-01-15');
    const today = new Date('2026-01-16');

    const tenure = calculateTenure(hireDate, today);

    expect(tenure.years).toBe(6);
    expect(tenure.months).toBe(0);
    expect(tenure.days).toBe(1);
  });

  it('handles leap years correctly', () => {
    const hireDate = new Date('2020-02-29');
    const today = new Date('2024-02-29');

    const tenure = calculateTenure(hireDate, today);

    expect(tenure.years).toBe(4);
  });
});
```

**Characteristics:**
- Zero external dependencies
- Run in milliseconds
- No mocks needed (pure functions)
- Test business rules, edge cases, validation

### Integration Tests (Service Layer - Weeks 5-8)

Test services with mocked external dependencies:

```typescript
// Example: Service test with mocked GraphQL
describe('EmployeeService', () => {
  let service: EmployeeService;
  let mockGraphQL: MockGraphQLAdapter;

  beforeEach(() => {
    mockGraphQL = new MockGraphQLAdapter();
    const container = Container.createTest({ graphql: mockGraphQL });
    service = container.employees;
  });

  it('fetches and transforms employee data', async () => {
    mockGraphQL.setResponse('GetEmployee', {
      employee: { id: '1', first_name: 'John', hire_date: '2020-01-15' }
    });

    const employee = await service.getById('1');

    expect(employee.firstName).toBe('John');
    expect(employee.hireDate).toBeInstanceOf(Date);
    expect(employee.tenure.years).toBeGreaterThan(0);
  });

  it('handles missing employee gracefully', async () => {
    mockGraphQL.setError('GetEmployee', 'Not found');

    await expect(service.getById('999'))
      .rejects.toThrow('Employee not found');
  });
});
```

**Characteristics:**
- Test service orchestration
- Mock external systems (GraphQL, auth)
- Verify error handling
- Run in seconds

### E2E Tests (Critical Paths - Weeks 9-12)

Test real user workflows through the UI:

```typescript
// Example: Critical path E2E test
test('HR manager can create and onboard new employee', async ({ page }) => {
  // Login as HR manager
  await page.goto('/login');
  await page.fill('[name=email]', 'hr@company.com');
  await page.fill('[name=password]', 'password');
  await page.click('button[type=submit]');

  // Navigate to employee creation
  await page.click('text=Employees');
  await page.click('text=Add Employee');

  // Fill out form
  await page.fill('[name=firstName]', 'Jane');
  await page.fill('[name=lastName]', 'Doe');
  await page.fill('[name=email]', 'jane@company.com');
  await page.selectOption('[name=department]', 'Engineering');

  // Submit and verify
  await page.click('button:has-text("Create Employee")');
  await expect(page.locator('text=Employee created successfully')).toBeVisible();

  // Verify appears in list
  await page.goto('/employees');
  await expect(page.locator('text=Jane Doe')).toBeVisible();
});
```

**Characteristics:**
- Test complete user workflows
- Real backend (or realistic test data)
- Catch integration issues
- Run in minutes
- Focus on happy paths + critical error cases

### Managing the 337 Skipped Tests
- Week 1: Audit all skipped tests - categorize as "fix", "rewrite", or "delete"
- Weeks 2-4: Fix/rewrite tests as we refactor their target code
- Week 5: Delete obsolete tests (for deleted/rewritten code)
- Week 6: Zero skipped tests remaining

---

## Section 5: Refactoring Workflow - How We'll Actually Do This

### The Core Challenge
Refactoring everything while keeping the app running and deployable. Can't have a 12-week "code freeze" while we rebuild.

### Solution: Parallel Architecture (Strangler Fig Pattern)

Build the new architecture alongside the old, migrate incrementally.

### Week-by-Week Workflow

**Week 1: Setup Infrastructure**
- Create new directory structure:
  ```
  src/
    domain/          # Pure business logic (new)
    services/        # Application services (new)
    adapters/        # External integrations (new)
    lib/             # Existing code (gradually migrate out)
    routes/          # UI (refactor to use services)
  ```
- Set up dependency injection container
- Create base interfaces (Ports)
- Add linting rules to enforce architecture (imports from `domain/` can't import from `lib/`)

**Week 2-4: Migrate One Module Completely**
- Pick **Employee Management** as pilot (high value, well understood)
- Extract domain types: `Employee`, `Department`, `Role`
- Create `EmployeeService` with all business logic
- Refactor UI components to use service
- Write comprehensive tests (unit + integration)
- **Validation**: Employee module has 80%+ coverage, zero `any`, all tests pass

**Week 5-8: Repeat for Remaining Modules**
- Apply learned patterns to other domains:
  - Authentication & Authorization
  - Performance Reviews
  - Time Off / PTO
  - Payroll Integration
  - Analytics & Reporting
- Each module follows same pattern: extract → test → validate

**Week 9-10: Integration & Cross-Module Tests**
- Test interactions between modules
- Verify error handling across boundaries
- Add E2E tests for critical workflows
- Performance testing

**Week 11-12: Final Migration & Cleanup**
- Remove old code from `lib/` (now empty)
- Update all imports
- Run full test suite (1518 tests, 0 skipped)
- Verify 80%+ coverage across all metrics
- Document architecture for team

### Safety Mechanisms

1. **Feature Flags**: New services behind flags, can toggle back to old code if issues
2. **Parallel Running**: Run old + new code side-by-side, compare results in tests
3. **Incremental Deploys**: Deploy each module migration separately
4. **Rollback Plan**: Old code stays in repo until new code proven in production

### Daily Workflow (For Any Developer)

```bash
# 1. Start work on feature
git checkout -b feature/employee-tenure-display

# 2. Is this in a refactored module?
#    YES → Use new architecture (services, pure functions)
#    NO  → Refactor module first, then add feature

# 3. Write tests first (TDD)
npm run test:unit -- --watch

# 4. Implement using services
# 5. Verify coverage
npm run test:coverage

# 6. Commit (tests + implementation together)
git commit -m "feat: Add tenure display to employee card"
```

### Migration Tracking

Create `REFACTORING_STATUS.md` to track progress:
```markdown
# Refactoring Status

## Completed ✅
- [ ] Foundation (Weeks 1-4)
  - [x] Infrastructure setup
  - [x] Employee module
  - [ ] Auth module

## In Progress 🚧
- [ ] Business Logic (Weeks 5-8)

## Coverage by Module
- Employee: 85% ✅
- Auth: 12% 🚧
- Performance: 3% ⏳
```

---

## Section 6: Error Handling & Testing Infrastructure

### Current Problem
- Inconsistent error handling (some `try/catch`, some ignored)
- No centralized error logging
- Tests can't reliably verify error behavior

### Solution: Standardized Error Architecture

**Domain Errors (Type-Safe, Testable):**

```typescript
// src/domain/errors.ts
export class DomainError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'DomainError';
  }
}

export class EmployeeNotFoundError extends DomainError {
  constructor(employeeId: string) {
    super(
      `Employee with ID ${employeeId} not found`,
      'EMPLOYEE_NOT_FOUND',
      { employeeId }
    );
  }
}

export class InvalidTenureError extends DomainError {
  constructor(hireDate: Date, reason: string) {
    super(
      `Invalid tenure calculation: ${reason}`,
      'INVALID_TENURE',
      { hireDate, reason }
    );
  }
}
```

**Service Layer Error Handling:**

```typescript
// src/services/EmployeeService.ts
export class EmployeeService {
  async getById(id: string): Promise<Employee> {
    try {
      const dto = await this.graphql.query(GET_EMPLOYEE, { id });

      if (!dto) {
        throw new EmployeeNotFoundError(id);
      }

      return EmployeeMapper.toDomain(dto);

    } catch (error) {
      if (error instanceof DomainError) {
        throw error; // Re-throw domain errors
      }

      // Wrap external errors
      throw new DomainError(
        'Failed to fetch employee',
        'EMPLOYEE_FETCH_ERROR',
        { originalError: error, employeeId: id }
      );
    }
  }
}
```

**UI Error Boundaries:**

```svelte
<!-- src/lib/components/ErrorBoundary.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import type { DomainError } from '$domain/errors';

  let { children, fallback } = $props<{
    children: Snippet;
    fallback?: Snippet<[DomainError]>;
  }>();

  let error = $state<DomainError | null>(null);

  function handleError(e: ErrorEvent) {
    error = e.error;
    console.error('Caught error:', e.error);
  }

  onMount(() => {
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  });
</script>

{#if error && fallback}
  {@render fallback(error)}
{:else if error}
  <div class="error-fallback">
    <h2>Something went wrong</h2>
    <p>{error.message}</p>
    <button onclick={() => (error = null)}>Try again</button>
  </div>
{:else}
  {@render children()}
{/if}
```

**Testing Error Handling:**

```typescript
describe('EmployeeService - Error Handling', () => {
  it('throws EmployeeNotFoundError when employee does not exist', async () => {
    mockGraphQL.setResponse('GetEmployee', null);

    await expect(service.getById('999'))
      .rejects.toThrow(EmployeeNotFoundError);
  });

  it('includes context in error', async () => {
    mockGraphQL.setResponse('GetEmployee', null);

    try {
      await service.getById('999');
      fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(EmployeeNotFoundError);
      expect(error.code).toBe('EMPLOYEE_NOT_FOUND');
      expect(error.context.employeeId).toBe('999');
    }
  });

  it('wraps GraphQL errors appropriately', async () => {
    mockGraphQL.setError('GetEmployee', new Error('Network timeout'));

    await expect(service.getById('1'))
      .rejects.toMatchObject({
        code: 'EMPLOYEE_FETCH_ERROR',
        context: { employeeId: '1' }
      });
  });
});
```

### Testing Infrastructure Setup

```typescript
// tests/setup/vitest-setup.ts
import { beforeAll, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/svelte';

// Reset mocks after each test
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// Global test utilities
global.createTestContainer = (overrides) => {
  return Container.createTest(overrides);
};

// Mock browser APIs
global.fetch = vi.fn();
global.localStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};
```

### Test Helpers & Factories

```typescript
// tests/helpers/factories.ts
export class EmployeeFactory {
  static create(overrides?: Partial<Employee>): Employee {
    return {
      id: faker.string.uuid(),
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      email: faker.internet.email(),
      hireDate: faker.date.past({ years: 5 }),
      department: DepartmentFactory.create(),
      role: RoleFactory.create(),
      ...overrides
    };
  }

  static createMany(count: number): Employee[] {
    return Array.from({ length: count }, () => this.create());
  }
}

// Usage in tests
const employee = EmployeeFactory.create({
  firstName: 'John',
  hireDate: new Date('2020-01-15')
});
```

---

## Success Criteria

**Phase 1 Complete When:**
- [ ] 80%+ coverage for foundation layer (utils, services base)
- [ ] Zero `any` types in foundation code
- [ ] Dependency injection container working
- [ ] GraphQL adapter pattern established
- [ ] All foundation tests passing (0 skipped)

**Phase 2 Complete When:**
- [ ] All business modules extracted from UI
- [ ] 80%+ coverage for each module
- [ ] Zero `any` types in business logic
- [ ] Service layer fully tested with mocked dependencies
- [ ] All integration tests passing

**Phase 3 Complete When:**
- [ ] 80%+ overall coverage (lines, functions, branches, statements)
- [ ] Zero skipped tests (1518 tests all running and passing)
- [ ] Zero `any` types in production code
- [ ] CI runs in <10 minutes
- [ ] E2E tests cover all critical user paths
- [ ] Team confident making changes without fear

**Final Validation:**
- [ ] Can safely refactor any module (tests catch breakage)
- [ ] Can complete ESLint cleanup with confidence
- [ ] Production deployments have zero test-preventable bugs
- [ ] Team culture shifted to "tests first"

---

## Timeline

**Weeks 1-4:** Foundation
**Weeks 5-8:** Business Logic
**Weeks 9-12:** Integration & UI

**Total:** 12 weeks

---

## Risks & Mitigation

| Risk | Mitigation |
|------|-----------|
| Breaking production during migration | Feature flags, parallel running, incremental deploys |
| Team resistance to new patterns | Pilot module first, demonstrate value, train as we go |
| Tests become brittle | Focus on behavior over implementation, use factories |
| CI becomes too slow | Parallel test execution, strategic E2E coverage |
| Scope creep beyond 12 weeks | Strict module boundaries, timebox each phase |

---

## Next Steps

1. Get stakeholder buy-in on 12-week commitment
2. Create git worktree for implementation
3. Write detailed implementation plan (tasks.md)
4. Begin Week 1: Infrastructure setup

---

**This is a foundational investment. Future sessions must align all work with this vision.**
