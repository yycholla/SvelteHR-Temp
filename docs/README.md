# SvelteHR Documentation

This directory contains comprehensive documentation for the SvelteHR application architecture, patterns, and best practices.

## Table of Contents

### Architecture Documentation

- [**Employee Module Migration**](./architecture/employee-module-migration.md)
  - Complete migration from GraphQL to domain services
  - Hexagonal architecture implementation
  - Before/after comparisons
  - Benefits and lessons learned

### Developer Guides

- [**Using EmployeeService**](./guides/using-employee-service.md)
  - Practical examples for all CRUD operations
  - Error handling patterns
  - Filtering, sorting, and pagination
  - Bulk operations
  - Testing with MockRepository

## Quick Links

### For New Developers

1. Start with [Employee Module Migration](./architecture/employee-module-migration.md) to understand the architecture
2. Read [Using EmployeeService](./guides/using-employee-service.md) for practical coding examples
3. Review [CLAUDE.md](../CLAUDE.md) for tech stack and development commands

### For Claude Code (AI Agent)

- **Tech Stack**: See [CLAUDE.md](../CLAUDE.md) for SvelteKit 2.43+, Svelte 5 (Runes), TypeScript, Tailwind CSS
- **Development Commands**: `npm run dev`, `npm run check`, `npm run test`
- **Data Fetching**: Server-side only (`+page.server.ts`), never in components
- **Authentication**: Session-based, HTTP-only cookies
- **Domain Services**: Use `createEmployeeService(event)` instead of direct GraphQL

## Architecture Overview

### Current State (January 2026)

**Migrated to Domain Services:**

- ✅ Employee CRUD operations
  - Detail view (`/employees/[id]`)
  - Create form (`/employees/new`)
  - List view with advanced filtering (`/employees`)
  - 60+ integration tests

**Still on GraphQL:**

- Departments (filter dropdowns)
- Current user query (authentication)
- Employee statistics (dashboard widgets)
- Cross-domain operations (goals, reviews, leave requests)

### Technology Stack

```
┌─────────────────────────────────────────────────────────────┐
│                  Frontend (Presentation)                     │
│  SvelteKit 2.43+ • Svelte 5 (Runes) • TypeScript 5          │
│  Tailwind CSS 4 • Bits UI • Skeleton UI                     │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           │ Domain Services
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              Application Layer (Services)                    │
│  EmployeeService • (Future: DepartmentService, etc.)         │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           │ Repository Ports
                           ▼
┌─────────────────────────────────────────────────────────────┐
│           Domain Layer (Entities & Value Objects)            │
│  Employee • Email • PersonName • HireDate • Status           │
└─────────────────────────────────────────────────────────────┘
                           │
            ┌──────────────┴──────────────┐
            ▼                             ▼
┌───────────────────────┐   ┌──────────────────────────┐
│  MockRepository       │   │  GraphQLAdapter          │
│  (Testing)            │   │  (Production)            │
└───────────────────────┘   └───────────┬──────────────┘
                                        │
                                        ▼
                            ┌─────────────────────┐
                            │  Rust GraphQL API   │
                            │  (Axum • SeaORM)    │
                            └─────────────────────┘
```

## Domain-Driven Design Principles

### 1. Hexagonal Architecture (Ports & Adapters)

**Core Idea**: Business logic is independent of infrastructure concerns.

- **Domain Layer**: Entities, value objects, business rules (no external dependencies)
- **Application Layer**: Use cases, services, orchestration
- **Infrastructure Layer**: Adapters for databases, APIs, external services
- **Ports**: Interfaces defining what the domain needs (e.g., `EmployeeRepository`)
- **Adapters**: Implementations of ports (e.g., `GraphQLEmployeeAdapter`, `MockEmployeeRepository`)

### 2. Value Objects

Immutable objects defined by their values, not identity:

- `Email`: Validates format, normalizes to lowercase
- `PersonName`: Validates name constraints, computes full name
- `HireDate`: Validates date, prevents future dates
- `EmployeeStatus`: Enum with validation

### 3. Entities

Objects with identity and lifecycle:

- `Employee`: Aggregate root with ID, composed of value objects
- Factory methods for creation (`Employee.create()`)
- Domain methods for state transitions (`activate()`, `terminate()`)

### 4. Repository Pattern

Abstraction over data access:

- **Port**: Interface defining data operations (`EmployeeRepository`)
- **Adapters**: Multiple implementations (GraphQL, Mock, future: REST, gRPC)
- **Benefits**: Testability, flexibility, clear boundaries

### 5. Result Type (Railway-Oriented Programming)

Explicit error handling without exceptions:

```typescript
type Result<T, E> = Ok<T> | Err<E>;

// Always check before accessing value
if (result.isError) {
	// Handle error
} else {
	// Use result.value
}
```

## Testing Strategy

### Integration Tests (60+ tests)

**Approach**: Use `MockEmployeeRepository` instead of mocking GraphQL

**Benefits**:

- Fast execution (in-memory)
- No external dependencies
- Tests real domain logic
- Easy to set up

**Example**:

```typescript
describe('Employee Routes', () => {
	let mockRepo: MockEmployeeRepository;

	beforeEach(() => {
		mockRepo = new MockEmployeeRepository();
		// Inject into service
	});

	it('should create employee', async () => {
		const result = await service.createEmployee(testData);
		expect(result.isOk).toBe(true);
	});
});
```

### Manual Testing

Comprehensive smoke test checklist:

- Create employee with valid data
- Create employee with invalid data (validation)
- View employee list with filters
- View employee details
- Update employee
- Soft delete employee

## Performance Improvements

### Employee List View

**Before**: Sequential queries

```typescript
const employees = await query1(); // 500ms
const stats = await query2(); // 500ms
const depts = await query3(); // 500ms
// Total: 1500ms
```

**After**: Parallelized queries

```typescript
const [employees, depts] = await Promise.all([
	employeeService.getEmployees(), // 500ms
	deptRepo.getDepartments() // 500ms
]);
// Total: 500ms (3x faster!)
```

### Server-Side Filtering

**Before**: Client-side filtering of 1000 records

- Fetch all employees (limit: 1000)
- Filter in JavaScript
- Sort in JavaScript
- Paginate in JavaScript

**After**: Server-side filtering

- Fetch only needed page (limit: 20)
- Filter in service layer
- Sort in service layer
- Efficient pagination

## Migration Path for Other Modules

Use this checklist when migrating other modules (Departments, Goals, Leave, etc.):

1. **Domain Layer** (Week 1-2)
   - [ ] Define value objects
   - [ ] Define entities (aggregate roots)
   - [ ] Define domain errors
   - [ ] Define repository port interface

2. **Infrastructure Layer** (Week 2)
   - [ ] Implement mock repository (for testing)
   - [ ] Implement GraphQL adapter (for production)

3. **Application Layer** (Week 2-3)
   - [ ] Implement domain service with CRUD operations
   - [ ] Set up DI container
   - [ ] Write unit tests for service methods

4. **Route Migration** (Week 3-4)
   - [ ] Migrate detail view (+ integration tests)
   - [ ] Migrate create form (+ integration tests)
   - [ ] Migrate list view (+ integration tests)
   - [ ] Migrate update form (+ integration tests)
   - [ ] Migrate delete action (+ integration tests)

5. **Documentation & Cleanup** (Week 4)
   - [ ] Add deprecation notices to old GraphQL operations
   - [ ] Create migration documentation
   - [ ] Create usage guide
   - [ ] Update CLAUDE.md

## Code Organization

```
src/lib/
├── server/
│   ├── domain/              # Domain layer (entities, value objects)
│   │   └── employee/
│   │       ├── entity.ts           # Employee aggregate root
│   │       ├── errors.ts           # Domain errors
│   │       ├── repository.ts       # Repository port
│   │       ├── types.ts            # Domain types
│   │       └── value-objects/
│   │           ├── email.ts
│   │           ├── person-name.ts
│   │           ├── hire-date.ts
│   │           └── employee-status.ts
│   │
│   ├── application/         # Application layer (services)
│   │   └── employee/
│   │       └── employee-service.ts
│   │
│   ├── infrastructure/      # Infrastructure layer (adapters)
│   │   ├── adapters/
│   │   │   └── graphql-employee-adapter.ts
│   │   └── persistence/
│   │       └── mock-employee-repository.ts
│   │
│   └── services/           # DI container
│       └── index.ts
│
├── graphql/                # Legacy GraphQL (being phased out)
│   ├── client.ts
│   ├── employees/
│   │   ├── queries.ts      # ⚠️ Deprecated for employee CRUD
│   │   └── mutations.ts    # ⚠️ Deprecated for employee CRUD
│   └── ...
│
└── components/             # Reusable UI components
    └── ...
```

## Best Practices

### 1. Type Safety

- ❌ Never use `any`
- ✅ Use strict TypeScript interfaces
- ✅ Leverage type inference
- ✅ Use domain types (Employee, not unknown)

### 2. Error Handling

- ❌ Don't throw exceptions in domain layer
- ✅ Use Result type for explicit errors
- ✅ Map domain errors to HTTP status codes
- ✅ Provide user-friendly error messages

### 3. Data Fetching

- ❌ Never fetch in components
- ✅ Always fetch in `+page.server.ts` or `+layout.server.ts`
- ✅ Use domain services, not direct GraphQL
- ✅ Parallelize independent queries with `Promise.all`

### 4. Testing

- ✅ Use MockRepository for route tests
- ✅ Write integration tests for all routes (aim for 20+)
- ✅ Test happy path and error scenarios
- ✅ Test validation edge cases

### 5. Documentation

- ✅ Add JSDoc comments to public APIs
- ✅ Document complex business logic
- ✅ Add deprecation notices to old code
- ✅ Keep architecture docs up to date

## Common Patterns

### Pattern 1: Load + Create Form

```typescript
// Load data for form (departments, managers, etc.)
export const load: PageServerLoad = async (event) => {
	const deptRepo = createDepartmentRepository(event);
	const result = await deptRepo.getDepartments();
	return { departments: result.value };
};

// Handle form submission
export const actions: Actions = {
	create: async (event) => {
		const service = createEmployeeService(event);
		const formData = await event.request.formData();
		const result = await service.createEmployee(extractData(formData));

		if (result.isError) {
			return fail(400, { error: result.error.message });
		}

		throw redirect(303, `/employees/${result.value.id}`);
	}
};
```

### Pattern 2: List with Filters

```typescript
export const load: PageServerLoad = async ({ url, event }) => {
	const service = createEmployeeService(event);

	const filters = {
		searchTerm: url.searchParams.get('search') ?? undefined,
		departmentId: url.searchParams.get('dept') ?? undefined,
		sortBy: (url.searchParams.get('sortBy') as 'name') ?? 'name',
		limit: 20,
		offset: parseInt(url.searchParams.get('page') ?? '0') * 20
	};

	const result = await service.getEmployees(filters);
	return { employees: result.value.employees };
};
```

### Pattern 3: Detail with Related Data

```typescript
export const load: PageServerLoad = async ({ params, event }) => {
	const employeeService = createEmployeeService(event);
	const goalService = createGoalService(event);

	const [employeeResult, goalsResult] = await Promise.all([
		employeeService.getEmployeeById(params.id),
		goalService.getGoalsForEmployee(params.id)
	]);

	return {
		employee: employeeResult.value,
		goals: goalsResult.value
	};
};
```

## Future Work

### Short-term (Next 2-4 weeks)

- [ ] Migrate Department module to domain service
- [ ] Add dedicated statistics endpoint (remove limit=1000 workaround)
- [ ] Implement employee update form route
- [ ] Implement employee delete action route

### Medium-term (Next 1-3 months)

- [ ] Migrate Goals module to domain service
- [ ] Migrate Leave Requests module to domain service
- [ ] Migrate Performance Reviews module to domain service
- [ ] Add caching layer for frequently accessed data

### Long-term (Next 3-6 months)

- [ ] Implement audit logging for all entity changes
- [ ] Add event sourcing for critical operations
- [ ] Implement CQRS pattern for read-heavy operations
- [ ] Add real-time updates with WebSockets/SSE

## References

### Books

- **Domain-Driven Design** by Eric Evans
- **Implementing Domain-Driven Design** by Vaughn Vernon
- **Clean Architecture** by Robert C. Martin
- **Patterns of Enterprise Application Architecture** by Martin Fowler

### Articles

- [Hexagonal Architecture](https://alistair.cockburn.us/hexagonal-architecture/) by Alistair Cockburn
- [Railway Oriented Programming](https://fsharpforfunandprofit.com/rop/) by Scott Wlaschin
- [Domain Modeling Made Functional](https://fsharpforfunandprofit.com/ddd/) by Scott Wlaschin

### Project Documentation

- [CLAUDE.md](../CLAUDE.md) - Tech stack and development guide
- [Employee Module Migration](./architecture/employee-module-migration.md) - Detailed migration documentation
- [Using EmployeeService](./guides/using-employee-service.md) - Practical usage guide

## Getting Help

- **For Claude Code**: See [CLAUDE.md](../CLAUDE.md) for core mandates and patterns
- **For Developers**: Start with architecture docs, then read usage guides
- **Questions**: Raise an issue or contact the SvelteHR Core Team

---

**Last Updated**: 2026-01-20
**Maintained By**: SvelteHR Core Team
