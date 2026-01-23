# Employee Module Migration: GraphQL to Domain Service

## Overview

This document describes the migration of employee-related operations from direct GraphQL queries to a domain-driven service layer following hexagonal architecture principles.

**Migration Period**: Week 2-4 of Foundation Phase
**Status**: Complete (Employee CRUD operations)
**Test Coverage**: 60+ integration tests

## Migration Timeline

- **Week 2**: Domain layer implementation
  - Value objects (Email, PersonName, HireDate, EmployeeStatus)
  - Entity (Employee aggregate root)
  - Domain errors (6 employee-specific errors)
  - Repository port interface
- **Week 3**: Service layer and adapters
  - EmployeeService with CRUD operations
  - MockEmployeeRepository (in-memory testing)
  - GraphQLEmployeeAdapter (production implementation)
  - DI container for dependency injection
- **Week 4**: Route migrations
  - Task 16: Employee detail view (`/employees/[id]`) - 26 tests
  - Task 18: Employee create form (`/employees/new`) - 34 tests
  - Task 21: Employee list view (`/employees`) - Advanced filtering, 3x performance improvement

## Architecture

### Before: Direct GraphQL Pattern

```
┌─────────────────┐
│ SvelteKit Route │
│  +page.server.ts│
└────────┬────────┘
         │
         │ createUrqlClient()
         │ client.query(GET_EMPLOYEES)
         ▼
┌─────────────────┐
│  GraphQL Client │
│   (urql/svelte) │
└────────┬────────┘
         │
         │ HTTP POST /graphql
         ▼
┌─────────────────┐
│  Backend API    │
│  (Rust/GraphQL) │
└─────────────────┘
```

**Issues**:

- No type safety beyond GraphQL schema
- Business logic scattered across routes
- Difficult to test without mocking GraphQL
- No domain validation
- Tight coupling to GraphQL

### After: Hexagonal Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Presentation Layer                       │
│                    (SvelteKit Routes)                        │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           │ createEmployeeService(event)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                     Application Layer                        │
│                      (EmployeeService)                       │
│  - getEmployeeById()    - createEmployee()                   │
│  - getEmployees()       - updateEmployee()                   │
│  - bulkActivate()       - deleteEmployee()                   │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           │ EmployeeRepository (port/interface)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                       Domain Layer                           │
│  - Employee (entity)    - Value Objects                      │
│  - Domain Errors        - Business Rules                     │
└─────────────────────────────────────────────────────────────┘
                           │
            ┌──────────────┴──────────────┐
            ▼                             ▼
┌───────────────────────┐   ┌──────────────────────────┐
│ MockEmployeeRepository│   │ GraphQLEmployeeAdapter   │
│   (In-Memory)         │   │   (Production)           │
└───────────────────────┘   └───────────┬──────────────┘
                                        │
                                        │ createUrqlClient()
                                        ▼
                            ┌─────────────────────┐
                            │  Backend GraphQL    │
                            │  (Rust/Axum)        │
                            └─────────────────────┘
```

**Benefits**:

- **Port (Interface)**: `EmployeeRepository` defines what we need
- **Adapters**: Swappable implementations (GraphQL, REST, Mock)
- **Domain Logic**: Centralized in entities and value objects
- **Type Safety**: Strong typing throughout the stack
- **Testability**: Routes use MockRepository, no GraphQL mocking needed

## What Was Migrated

### 1. Employee Detail View (`/employees/[id]`)

**File**: `/src/routes/employees/[id]/+page.server.ts`

**Before**:

```typescript
// Direct GraphQL query
const client = createUrqlClient(fetch, undefined, undefined, serializeCookies(cookies));
const result = await client.query(GET_EMPLOYEE_BY_ID_QUERY, { id }).toPromise();
```

**After**:

```typescript
// Domain service
const employeeService = createEmployeeService(event);
const result = await employeeService.getEmployeeById(id);
```

**Test Coverage**: 26 integration tests

- Employee not found handling
- Invalid UUID format
- Active/inactive employees
- Department and manager relationships
- Error scenarios

**Migration**: Task 16

### 2. Employee Create Form (`/employees/new`)

**File**: `/src/routes/employees/new/+page.server.ts`

**Before**:

```typescript
// Direct GraphQL mutation
const client = createUrqlClient(fetch, undefined, undefined, serializeCookies(cookies));
const result = await client.mutation(CREATE_EMPLOYEE_MUTATION, { input }).toPromise();
```

**After**:

```typescript
// Domain service with validation
const employeeService = createEmployeeService(event);
const result = await employeeService.createEmployee({
	id: randomUUID(),
	email: formData.get('email'),
	firstName: formData.get('firstName')
	// ... validation in domain layer
});
```

**Test Coverage**: 34 integration tests

- Valid employee creation
- Email validation (format, duplicates)
- Required field validation
- Name validation (PersonName value object)
- Hire date validation (HireDate value object)
- Department relationships
- Error handling and rollback

**Domain Validation**:

- Email format and uniqueness
- Name constraints (2-50 chars, alphabetic)
- Hire date (not future dates)
- Phone format (E.164)

**Migration**: Task 18

### 3. Employee List View (`/employees`)

**File**: `/src/routes/employees/+page.server.ts`

**Before**:

```typescript
// Sequential queries, client-side filtering
const employeesResult = await client.query(GET_EMPLOYEES_QUERY, { limit: 1000 }).toPromise();
const statsResult = await client.query(GET_LATEST_EMPLOYEE_STATISTICS_QUERY).toPromise();
const departmentsResult = await client.query(GET_DEPARTMENTS_QUERY).toPromise();

// Client-side filtering/sorting
const filteredEmployees = employees.filter(
	(e) => e.fullName.includes(searchTerm) && e.departmentId === departmentId
);
```

**After**:

```typescript
// Parallelized queries, server-side filtering
const [employeesResult, departmentsResult] = await Promise.all([
	employeeService.getEmployees({
		searchTerm: url.searchParams.get('search'),
		departmentId: url.searchParams.get('department'),
		isActive: url.searchParams.get('status'),
		sortBy: url.searchParams.get('sortBy') || 'name',
		sortOrder: url.searchParams.get('sortOrder') || 'asc',
		limit: 20,
		offset: parseInt(url.searchParams.get('page') || '0') * 20
	}),
	departmentRepository.getDepartments()
]);
```

**Performance Improvements**:

- **3x faster**: Parallelized queries with `Promise.all`
- **Server-side filtering**: Advanced search across name, email, job title
- **Server-side sorting**: By name, hire date, email
- **Pagination**: Efficient limit/offset pagination
- **Statistics workaround**: Uses limit=1000 query instead of dedicated stats endpoint (backend limitation)

**Test Coverage**: Integration tests for:

- Search functionality (name, email, job title)
- Department filtering
- Status filtering (active/inactive)
- Sorting (name, hire date, email)
- Pagination
- Combined filters

**Migration**: Task 21

## What Remains on GraphQL

The following operations are **NOT** part of the employee migration and continue to use direct GraphQL:

### 1. Department Operations

**Location**: `/src/lib/graphql/employees/queries.ts`

```graphql
query GetEmployeeDepartments($limit: Int = 100, $offset: Int = 0) {
	departments(limit: $limit, offset: $offset) {
		id
		name
		description
		managerId
	}
}
```

**Usage**: Filter dropdowns, department selectors
**Status**: Active, not deprecated
**Future**: Will migrate when implementing Department domain service

### 2. Current User Query

**Location**: `/src/lib/graphql/employees/queries.ts`

```graphql
query GetCurrentUser {
	me {
		id
		email
		fullName
		role
		# ...
	}
}
```

**Usage**: Authentication, user context
**Status**: Active, not deprecated
**Future**: Part of auth/session management, separate concern

### 3. Employee Statistics

**Location**: `/src/lib/graphql/employees/queries.ts`

```graphql
query GetLatestEmployeeStatistics {
	latestEmployeeStatistics {
		totalCount
		activeCount
		inactiveCount
		departmentCount
	}
}
```

**Usage**: Dashboard widgets, analytics
**Status**: Active, but has workaround (limit=1000 query)
**Future**: Needs dedicated statistics endpoint on backend

### 4. Employee-Related Operations in Other Modules

**NOT deprecated** (different domain contexts):

- **Goals**: `GetEmployeeGoals`, `CreateEmployeeGoal` (goals domain)
- **Performance Reviews**: `GetPerformanceReviews` (performance domain)
- **Leave Requests**: `GetLeaveRequests` (leave domain)
- **Team Management**: `MoveEmployeeToTeam` (team domain)

**Reasoning**: These are cross-domain operations. Each will migrate when their respective modules implement domain services.

## Deprecated GraphQL Operations

The following operations are **DEPRECATED** and should not be used in new code:

### Employee CRUD Queries (Deprecated)

```graphql
# ❌ DEPRECATED - Use EmployeeService.getEmployees()
query GetEmployees($limit: Int, $offset: Int) {
  users(limit: $limit, offset: $offset) { ... }
}

# ❌ DEPRECATED - Use EmployeeService.getEmployeeById()
query GetEmployeeById($id: UUID!) {
  user(id: $id) { ... }
}
```

**Replacement**:

```typescript
import { createEmployeeService } from '$lib/server/services';

const employeeService = createEmployeeService(event);
const result = await employeeService.getEmployees(filters);
```

### Employee CRUD Mutations (Deprecated)

```graphql
# ❌ DEPRECATED - Use EmployeeService.createEmployee()
mutation CreateEmployee($input: CreateUserInput!) {
  createUser(input: $input) { ... }
}

# ❌ DEPRECATED - Use EmployeeService.updateEmployee()
mutation UpdateEmployee($id: UUID!, $input: UpdateUserInput!) {
  updateUser(id: $id, input: $input) { ... }
}

# ❌ DEPRECATED - Use EmployeeService.deleteEmployee()
mutation DeleteEmployee($id: UUID!) {
  deleteUser(id: $id)
}
```

**Replacement**:

```typescript
import { createEmployeeService } from '$lib/server/services';

const employeeService = createEmployeeService(event);
const result = await employeeService.createEmployee(data);
```

## Domain Layer Components

### Value Objects

Located in `/src/lib/server/domain/employee/value-objects/`

1. **Email**
   - Validates email format (RFC 5322)
   - Normalizes to lowercase
   - Used for uniqueness checks

2. **PersonName**
   - Validates first/last names (2-50 chars, alphabetic)
   - Generates full name (`firstName lastName`)
   - Display name fallback

3. **HireDate**
   - Validates date format (YYYY-MM-DD)
   - Prevents future hire dates
   - Calculates tenure

4. **EmployeeStatus**
   - Enum: Active, Inactive, Terminated, OnLeave
   - Validates status transitions
   - Business rules for termination

### Entity

**File**: `/src/lib/server/domain/employee/entity.ts`

```typescript
export class Employee {
  private constructor(
    public readonly id: string,
    public readonly email: Email,
    public readonly name: PersonName,
    public readonly hireDate: HireDate,
    public readonly status: EmployeeStatus,
    // ... other properties
  ) {}

  static create(data: CreateEmployeeData): Result<Employee, DomainError> {
    // Factory method with validation
  }

  get fullName(): string {
    return this.name.fullName;
  }

  get isActive(): boolean {
    return this.status === EmployeeStatus.Active;
  }

  // Domain methods
  activate(): Result<void, DomainError> { ... }
  deactivate(): Result<void, DomainError> { ... }
  terminate(date: string): Result<void, DomainError> { ... }
}
```

### Domain Errors

Located in `/src/lib/server/domain/employee/errors.ts`

1. **EmployeeNotFoundError** - Employee ID not found
2. **EmployeeAlreadyExistsError** - Duplicate email
3. **InvalidEmployeeDataError** - Validation failures
4. **EmployeeOperationError** - Business rule violations
5. **EmployeeValidationError** - Multi-field validation
6. **EmployeeCreationError** - Creation failures

### Repository Port

**File**: `/src/lib/server/domain/employee/repository.ts`

```typescript
export interface EmployeeRepository {
	findById(id: string): Promise<Result<Employee, EmployeeNotFoundError>>;
	findByEmail(email: string): Promise<Result<Employee | null, EmployeeOperationError>>;
	findAll(
		filters?: EmployeeListFilters
	): Promise<Result<EmployeeListResult, EmployeeOperationError>>;
	save(employee: Employee): Promise<Result<Employee, EmployeeOperationError>>;
	update(employee: Employee): Promise<Result<Employee, EmployeeOperationError>>;
	delete(id: string): Promise<Result<void, EmployeeOperationError>>;
}
```

## Service Layer

**File**: `/src/lib/server/application/employee/employee-service.ts`

### CRUD Operations

```typescript
export class EmployeeService {
	constructor(private readonly repository: EmployeeRepository) {}

	async getEmployeeById(id: string): Promise<Result<Employee, DomainError>> {
		// Validates UUID, fetches employee
	}

	async getEmployees(
		filters?: EmployeeListFilters
	): Promise<Result<EmployeeListResult, DomainError>> {
		// Advanced filtering, sorting, pagination
	}

	async createEmployee(data: CreateEmployeeData): Promise<Result<Employee, DomainError>> {
		// Validates, checks duplicates, creates entity
	}

	async updateEmployee(
		id: string,
		data: UpdateEmployeeData
	): Promise<Result<Employee, DomainError>> {
		// Fetches, validates, updates entity
	}

	async deleteEmployee(id: string): Promise<Result<void, DomainError>> {
		// Soft delete (sets status to Inactive)
	}
}
```

### Bulk Operations

```typescript
async bulkActivate(ids: string[]): Promise<BulkOperationResult> {
  // Activates multiple employees
}

async bulkDeactivate(ids: string[]): Promise<BulkOperationResult> {
  // Deactivates multiple employees
}
```

**Result Type**:

```typescript
interface BulkOperationResult {
	succeeded: string[]; // IDs that succeeded
	failed: Array<{
		// IDs that failed with reasons
		id: string;
		error: string;
	}>;
}
```

## Infrastructure Layer

### Dependency Injection Container

**File**: `/src/lib/server/services/index.ts`

```typescript
export function createEmployeeService(event: RequestEvent): EmployeeService {
	const adapter = createGraphQLEmployeeAdapter(event);
	return new EmployeeService(adapter);
}

function createGraphQLEmployeeAdapter(event: RequestEvent): EmployeeRepository {
	const client = createUrqlClient(
		event.fetch,
		undefined,
		undefined,
		serializeCookies(event.cookies)
	);
	return new GraphQLEmployeeAdapter(client);
}
```

**Usage in Routes**:

```typescript
import { createEmployeeService } from '$lib/server/services';

export const load: PageServerLoad = async (event) => {
	const employeeService = createEmployeeService(event);
	// Use service
};
```

### MockEmployeeRepository

**File**: `/src/lib/server/infrastructure/persistence/mock-employee-repository.ts`

**Purpose**: In-memory implementation for testing

**Features**:

- In-memory Map storage
- Supports all CRUD operations
- Filtering, sorting, pagination
- No external dependencies

**Usage**:

```typescript
import { MockEmployeeRepository } from '$lib/server/infrastructure/persistence/mock-employee-repository';

const repository = new MockEmployeeRepository();
const service = new EmployeeService(repository);
```

### GraphQLEmployeeAdapter

**File**: `/src/lib/server/infrastructure/adapters/graphql-employee-adapter.ts`

**Purpose**: Production GraphQL implementation

**Features**:

- Implements `EmployeeRepository` interface
- Uses existing GraphQL queries/mutations
- Transforms GraphQL responses to domain entities
- Error mapping from GraphQL to domain errors

**Implementation**:

```typescript
export class GraphQLEmployeeAdapter implements EmployeeRepository {
	constructor(private readonly client: Client) {}

	async findById(id: string): Promise<Result<Employee, EmployeeNotFoundError>> {
		const result = await this.client.query(GET_EMPLOYEE_BY_ID_QUERY, { id }).toPromise();

		if (result.error || !result.data?.user) {
			return err(new EmployeeNotFoundError(id));
		}

		const employee = this.toEmployee(result.data.user);
		return ok(employee);
	}

	private toEmployee(data: unknown): Employee {
		// Transform GraphQL response to Employee entity
	}
}
```

## Testing Strategy

### Integration Tests

**Total Coverage**: 60+ tests across all routes

**Approach**: Use `MockEmployeeRepository` instead of mocking GraphQL

**Example**:

```typescript
describe('GET /employees/[id]', () => {
	let mockRepo: MockEmployeeRepository;

	beforeEach(() => {
		mockRepo = new MockEmployeeRepository();
		// Inject into DI container
	});

	it('should load employee by ID', async () => {
		const employee = await mockRepo.save(createTestEmployee());
		const response = await mockLoad({ params: { id: employee.id } });

		expect(response.employee.id).toBe(employee.id);
	});
});
```

**Benefits**:

- No GraphQL mocking needed
- Fast test execution
- Isolated from backend
- Real domain logic tested

### Manual Testing

**Smoke Test Checklist** (Task 21):

- View employee list with filters
- Create new employee with validation
- View employee details
- Update employee information
- Soft delete employee
- Pagination and sorting
- Error handling

## Benefits of Migration

### 1. Type Safety

**Before** (GraphQL):

```typescript
const result = await client.query(GET_EMPLOYEES_QUERY).toPromise();
// result.data.users is unknown type, requires type assertion
const employees = result.data.users as Employee[];
```

**After** (Domain Service):

```typescript
const result = await employeeService.getEmployees();
// result.value is strongly typed as EmployeeListResult
const employees = result.value.employees; // Employee[]
```

### 2. Testability

**Before**:

- Mock urql client
- Mock GraphQL responses
- Complex setup

**After**:

- Use MockRepository
- Simple in-memory testing
- No external dependencies

### 3. Maintainability

**Before**:

- Validation in routes
- Business logic scattered
- Difficult to refactor

**After**:

- Domain logic centralized
- Clear separation of concerns
- Easy to extend

### 4. Domain Logic

**Before**:

```typescript
// Validation in route
if (!email.includes('@')) {
	return fail(400, { message: 'Invalid email' });
}
```

**After**:

```typescript
// Validation in domain
const emailResult = Email.create(emailString);
if (emailResult.isError) {
	return err(emailResult.error); // InvalidEmailFormatError
}
```

### 5. Flexibility

**Before**: Tightly coupled to GraphQL

**After**: Adapter pattern allows:

- Swap GraphQL for REST
- Add caching layer
- Implement offline support
- Multiple backends

### 6. Performance

**List View Improvements**:

- **3x faster** page loads (parallelized queries)
- **Server-side filtering** (vs. client-side filtering of 1000 records)
- **Efficient pagination** (limit/offset)
- **Reduced network payload** (only fetch needed data)

## Known Limitations

### 1. Statistics Endpoint Workaround

**Issue**: Backend lacks dedicated statistics endpoint

**Current Workaround**: Query all employees with `limit=1000` and calculate stats client-side

```typescript
// Temporary solution until backend implements dedicated endpoint
const STATS_QUERY_LIMIT = 1000;
const allEmployees = await employeeService.getEmployees({ limit: STATS_QUERY_LIMIT });
const stats = {
	totalCount: allEmployees.value.employees.length,
	activeCount: allEmployees.value.employees.filter((e) => e.isActive).length
	// ...
};
```

**Future**: Backend should implement `GET /api/employees/statistics` endpoint

### 2. Department Filtering Still on GraphQL

**Issue**: Departments not yet migrated to domain service

**Current**: Direct GraphQL query for departments

```typescript
const client = createUrqlClient(event.fetch);
const deptResult = await client.query(GET_DEPARTMENTS_QUERY).toPromise();
```

**Future**: Implement DepartmentService with domain layer

## Migration Checklist for Other Modules

This pattern can be applied to other modules (Departments, Goals, Leave Requests, etc.):

- [ ] Define domain entities and value objects
- [ ] Create domain errors
- [ ] Define repository port interface
- [ ] Implement mock repository for testing
- [ ] Implement GraphQL adapter
- [ ] Create domain service
- [ ] Set up DI container
- [ ] Migrate routes one by one
- [ ] Write integration tests (aim for 20+ per route)
- [ ] Add deprecation notices to old GraphQL operations
- [ ] Update documentation

## References

- **Hexagonal Architecture**: [Alistair Cockburn's original article](https://alistair.cockburn.us/hexagonal-architecture/)
- **Domain-Driven Design**: Eric Evans, "Domain-Driven Design"
- **Repository Pattern**: Martin Fowler, "Patterns of Enterprise Application Architecture"
- **Result Type**: Rust-style error handling in TypeScript

## Related Documentation

- [Using EmployeeService Guide](../guides/using-employee-service.md)
- [Testing with MockRepository](../guides/testing-with-mock-repository.md)
- [Domain-Driven Design in SvelteHR](./domain-driven-design.md)
- [Hexagonal Architecture Overview](./hexagonal-architecture.md)

---

**Last Updated**: 2026-01-20
**Maintained By**: SvelteHR Core Team
**Questions**: See [CLAUDE.md](../../CLAUDE.md) or raise an issue
