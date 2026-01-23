# Week 2-4: Employee Module Migration Design

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans or superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Extract employee domain logic from UI, create EmployeeService with comprehensive tests, migrate all employee routes to new architecture.

**Architecture:** Hexagonal Architecture (Ports & Adapters) with three-layer separation - Domain (pure business logic), Services (orchestration), Adapters (GraphQL/external systems).

**Tech Stack:** TypeScript 5, Vitest 3, Faker.js, Result type pattern, Value Objects, Domain-Driven Design.

---

## 1. Current State Analysis

The employee module is currently tightly coupled across all layers. Employee data flows from GraphQL queries in `+page.server.ts` directly to Svelte components with minimal abstraction. GraphQL operations live in `src/lib/graphql/employees/` with queries and mutations for CRUD operations. Types are defined in `src/lib/types/contracts/employee.ts`, but they're just interfaces without business logic.

### Main Issues

1. **No Domain Layer**: Business rules scattered across components and server files
2. **Direct GraphQL Coupling**: Testing difficult - can't test employee logic without mocking GraphQL
3. **Weak Type Safety**: Basic interfaces with no validation or invariants enforced
4. **Client-Side Filtering**: Logic duplicated across routes because backend doesn't support filters
5. **Zero Tests**: No employee-specific tests exist (4.35% overall coverage)

Components like `+page.svelte` receive raw data and implement their own filtering, sorting, and permission checks inline. This violates separation of concerns and makes it impossible to unit test business logic independently.

### Current File Structure

```
src/lib/graphql/employees/
├── index.ts          # Re-exports
├── queries.ts        # GET_EMPLOYEES_QUERY, GET_EMPLOYEE_BY_ID_QUERY
├── mutations.ts      # CREATE_EMPLOYEE_MUTATION, UPDATE_EMPLOYEE_MUTATION
├── types.ts          # GraphQL type definitions
├── utils.ts          # Helper functions
└── operations.ts     # Composite operations

src/lib/types/contracts/employee.ts
├── Employee          # Basic interface
├── EmployeeFilter    # Filter interface
└── PaginationInfo    # Pagination interface

src/routes/dashboard/employees/
├── +page.svelte              # List view with inline filtering
├── +page.server.ts           # Direct GraphQL queries
├── [id]/+page.svelte         # Detail view
├── new/+page.svelte          # Create form
└── components/               # Employee-specific components
```

---

## 2. Target Architecture

We'll extract employee domain logic into three layers following the Week 1 foundation.

### Domain Layer (`src/domain/Employee/`)

Pure TypeScript classes with business logic. No dependencies on GraphQL, Svelte, or framework code.

**Components:**

- **Employee Entity**: Core business object with enforced invariants
- **Value Objects**: Email, PersonName, HireDate, EmployeeStatus, DepartmentId
- **Domain Errors**: EmployeeNotFoundError, InvalidHireDateError, InvalidEmailError, etc.

**Rules:**

- Hire date cannot be in future
- Email must be valid format
- Employee must have firstName and lastName
- Status transitions must be valid (active → inactive, not inactive → active → inactive in same operation)

### Service Layer (`src/services/EmployeeService.ts`)

Orchestrates employee operations using ports. No direct framework dependencies.

**Methods:**

- `getEmployees(filters: EmployeeFilters): Promise<Result<Employee[], DomainError>>`
- `getEmployeeById(id: string): Promise<Result<Employee, EmployeeNotFoundError>>`
- `createEmployee(data: CreateEmployeeData): Promise<Result<Employee, DomainError>>`
- `updateEmployee(id: string, data: UpdateEmployeeData): Promise<Result<Employee, DomainError>>`
- `deleteEmployee(id: string): Promise<Result<void, DomainError>>`

**Business Workflows:**

- Creating employee validates department exists
- Deactivating employee reassigns their tasks
- Updating email checks for duplicates
- Deleting employee is soft delete (sets isActive = false)

**Dependencies:**

- EmployeeRepository port (extends GraphQLPort)
- DepartmentRepository port (for validation)
- TaskRepository port (for reassignment)

### Adapter Layer (`src/adapters/GraphQLEmployeeAdapter.ts`)

Implements EmployeeRepository port. Maps between GraphQL responses and domain entities.

**Responsibilities:**

- Translate "users" (backend) to "employees" (frontend)
- Convert GraphQL responses to domain entities
- Convert domain errors to GraphQL errors
- Handle network errors gracefully

**Example Mapping:**

```typescript
// GraphQL Response → Domain Entity
const user = await graphql.query(GET_EMPLOYEE_BY_ID_QUERY, { id });
return Employee.create({
	id: user.id,
	email: user.email,
	name: { first: user.firstName, last: user.lastName },
	hireDate: user.hireDate,
	isActive: user.isActive,
	departmentId: user.departmentId
});
```

### Component Integration

Components depend on EmployeeService, not GraphQL directly.

**Before (Current):**

```typescript
// +page.server.ts
const result = await client.query(GET_EMPLOYEES_QUERY, { limit: 10000 });
return { employees: result.data.users };

// +page.svelte
const employees = $derived(data.employees);
// Inline filtering, sorting, business logic
```

**After (Target):**

```typescript
// +page.server.ts
const container = Container.getInstance();
const result = await container.employeeService.getEmployees({ isActive: true });
if (result.isError) throw error(500, result.error.message);
return { employees: result.value };

// +page.svelte
const employees = $derived(data.employees); // Already domain entities
// No business logic - just presentation
```

---

## 3. Migration Strategy (Strangler Fig Pattern)

We'll migrate incrementally without breaking existing functionality.

### Phase 1: Build Parallel Architecture (Week 2)

**Deliverables:**

- Employee domain entity with value objects
- EmployeeService with basic CRUD
- Extend GraphQLAdapter with employee methods
- 45 tests (30 domain + 15 adapter)

**Status:** Old routes continue working unchanged. New architecture exists alongside old code.

### Phase 2: Migrate Simple Routes (Week 3)

**Routes to Migrate:**

1. `/employees/[id]` - Detail view (simplest, read-only)
2. `/employees/new` - Create form (write operation, validation)

**For Each Route:**

1. Write integration tests for current behavior
2. Update `+page.server.ts` to use EmployeeService
3. Update component to receive domain entities
4. Run tests to validate no regressions
5. Commit with message "feat: migrate /employees/[id] to domain architecture"

**Status:** Two routes use new architecture, others use old. Both work simultaneously.

### Phase 3: Complete Migration (Week 4)

**Routes to Migrate:**

1. `/employees` - List view with filtering/sorting
2. `/employees/import` - Bulk import
3. Bulk operations (activate/deactivate/delete multiple)

**Cleanup:**

1. Remove old GraphQL coupling from components
2. Update all type definitions to use domain types
3. Delete deprecated employee GraphQL operations
4. Remove duplicate filtering/sorting logic

**Status:** All employee functionality flows through domain/services architecture.

### De-Risking

- **One route at a time**: If issues arise, only one route affected
- **Tests first**: Validate new architecture before cutting over
- **Parallel operation**: Old and new coexist until migration complete
- **Frequent commits**: Easy rollback if needed

---

## 4. Type Safety & Domain Model

We'll eliminate all `any` types in employee code and create rich domain model.

### Employee Entity

```typescript
// src/domain/Employee/Employee.ts

export class Employee {
	private constructor(
		public readonly id: string,
		public readonly email: Email, // Value object
		public readonly name: PersonName, // Value object
		public readonly hireDate: HireDate, // Value object
		private _status: EmployeeStatus, // Value object
		private _departmentId: DepartmentId | null, // Value object
		private _jobTitle: string | null,
		private _phone: string | null
	) {}

	// Factory method with validation
	static create(data: CreateEmployeeData): Result<Employee, DomainError> {
		const emailResult = Email.create(data.email);
		if (emailResult.isError) return Result.error(emailResult.error);

		const nameResult = PersonName.create(data.firstName, data.lastName);
		if (nameResult.isError) return Result.error(nameResult.error);

		const hireDateResult = HireDate.create(data.hireDate);
		if (hireDateResult.isError) return Result.error(hireDateResult.error);

		return Result.ok(
			new Employee(
				data.id,
				emailResult.value,
				nameResult.value,
				hireDateResult.value,
				EmployeeStatus.Active,
				data.departmentId ? DepartmentId.create(data.departmentId).value : null,
				data.jobTitle ?? null,
				data.phone ?? null
			)
		);
	}

	// Business methods
	deactivate(): Result<void, EmployeeDeactivationError> {
		if (this._status.value === 'inactive') {
			return Result.error(new EmployeeDeactivationError(this.id, 'Employee is already inactive'));
		}
		this._status = EmployeeStatus.Inactive;
		return Result.ok(undefined);
	}

	changeDepartment(deptId: string): Result<void, InvalidDepartmentError> {
		const deptIdResult = DepartmentId.create(deptId);
		if (deptIdResult.isError) return Result.error(deptIdResult.error);

		this._departmentId = deptIdResult.value;
		return Result.ok(undefined);
	}

	// Getters
	get status(): string {
		return this._status.value;
	}
	get isActive(): boolean {
		return this._status.value === 'active';
	}
	get departmentId(): string | null {
		return this._departmentId?.value ?? null;
	}
	get fullName(): string {
		return this.name.fullName;
	}
}
```

### Value Objects

Each value object enforces invariants:

```typescript
// src/domain/Employee/Email.ts
export class Email {
	private constructor(public readonly value: string) {}

	static create(email: string): Result<Email, InvalidEmailError> {
		if (!email || email.trim().length === 0) {
			return Result.error(new InvalidEmailError('Email cannot be empty'));
		}

		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(email)) {
			return Result.error(new InvalidEmailError(`Invalid email format: ${email}`));
		}

		return Result.ok(new Email(email.toLowerCase().trim()));
	}
}

// src/domain/Employee/HireDate.ts
export class HireDate {
	private constructor(public readonly value: Date) {}

	static create(date: string | Date): Result<HireDate, InvalidHireDateError> {
		const hireDate = typeof date === 'string' ? new Date(date) : date;

		if (isNaN(hireDate.getTime())) {
			return Result.error(new InvalidHireDateError('Invalid date format'));
		}

		const today = new Date();
		today.setHours(0, 0, 0, 0);

		if (hireDate > today) {
			return Result.error(new InvalidHireDateError('Hire date cannot be in the future'));
		}

		return Result.ok(new HireDate(hireDate));
	}

	isBefore(other: HireDate): boolean {
		return this.value < other.value;
	}

	getDaysEmployed(): number {
		const now = new Date();
		const diffMs = now.getTime() - this.value.getTime();
		return Math.floor(diffMs / (1000 * 60 * 60 * 24));
	}
}

// src/domain/Employee/PersonName.ts
export class PersonName {
	private constructor(
		public readonly first: string,
		public readonly last: string
	) {}

	static create(first: string, last: string): Result<PersonName, ValidationError> {
		if (!first || first.trim().length === 0) {
			return Result.error(new ValidationError('First name cannot be empty'));
		}
		if (!last || last.trim().length === 0) {
			return Result.error(new ValidationError('Last name cannot be empty'));
		}

		return Result.ok(new PersonName(first.trim(), last.trim()));
	}

	get fullName(): string {
		return `${this.first} ${this.last}`;
	}

	get displayName(): string {
		return `${this.last}, ${this.first}`;
	}
}
```

### Result Type Pattern

All fallible operations return `Result<T, E>`:

```typescript
// src/domain/Result.ts
export class Result<T, E extends Error> {
	private constructor(
		private readonly _value?: T,
		private readonly _error?: E
	) {}

	static ok<T, E extends Error>(value: T): Result<T, E> {
		return new Result(value, undefined);
	}

	static error<T, E extends Error>(error: E): Result<T, E> {
		return new Result(undefined, error);
	}

	get isOk(): boolean {
		return this._value !== undefined;
	}
	get isError(): boolean {
		return this._error !== undefined;
	}

	get value(): T {
		if (this._value === undefined) {
			throw new Error('Cannot get value from error result');
		}
		return this._value;
	}

	get error(): E {
		if (this._error === undefined) {
			throw new Error('Cannot get error from ok result');
		}
		return this._error;
	}

	map<U>(fn: (value: T) => U): Result<U, E> {
		if (this.isError) return Result.error(this.error);
		return Result.ok(fn(this.value));
	}

	flatMap<U>(fn: (value: T) => Result<U, E>): Result<U, E> {
		if (this.isError) return Result.error(this.error);
		return fn(this.value);
	}
}
```

### Type Safety Guarantees

- **Zero `any` types**: All employee code fully typed
- **Compile-time safety**: Invalid operations caught at compile time
- **Explicit errors**: All failures in return type, not thrown
- **Immutability**: Domain entities immutable (private setters, return new instances)
- **Validation at boundaries**: GraphQL responses validated before creating domain entities

---

## 5. Testing Strategy & Coverage Plan

We'll write 80+ tests to achieve 80%+ coverage on employee module.

### Domain Tests (30 tests)

**Employee Entity Tests (15 tests):**

- `Employee.create with valid data returns Ok`
- `Employee.create with invalid email returns InvalidEmailError`
- `Employee.create with future hire date returns InvalidHireDateError`
- `Employee.create with empty first name returns ValidationError`
- `Employee.deactivate sets status to inactive`
- `Employee.deactivate on already inactive returns error`
- `Employee.changeDepartment updates department`
- `Employee.changeDepartment with invalid ID returns error`
- `Employee.fullName concatenates first and last`
- `Employee.isActive returns true for active status`

**Value Object Tests (15 tests):**

- `Email.create with valid email returns Ok`
- `Email.create with empty string returns InvalidEmailError`
- `Email.create with invalid format returns InvalidEmailError`
- `Email.create normalizes to lowercase`
- `HireDate.create with valid date returns Ok`
- `HireDate.create with future date returns InvalidHireDateError`
- `HireDate.create with invalid format returns InvalidHireDateError`
- `HireDate.getDaysEmployed calculates correctly`
- `PersonName.create with valid names returns Ok`
- `PersonName.create with empty first name returns ValidationError`
- `PersonName.fullName formats correctly`
- `EmployeeStatus.Active is valid`
- `EmployeeStatus transition rules enforced`

### Service Tests (25 tests)

**EmployeeService CRUD Tests (15 tests):**

- `getEmployees returns all employees`
- `getEmployees with filters returns filtered results`
- `getEmployees with no results returns empty array`
- `getEmployeeById with valid ID returns employee`
- `getEmployeeById with invalid ID returns EmployeeNotFoundError`
- `createEmployee with valid data returns new employee`
- `createEmployee with invalid email returns ValidationError`
- `createEmployee with nonexistent department returns DepartmentNotFoundError`
- `updateEmployee with valid data returns updated employee`
- `updateEmployee with invalid ID returns EmployeeNotFoundError`
- `deleteEmployee soft deletes (sets isActive = false)`
- `deleteEmployee with invalid ID returns EmployeeNotFoundError`

**Business Workflow Tests (10 tests):**

- `createEmployee validates department exists`
- `createEmployee checks for duplicate email`
- `updateEmployee reassigns tasks when changing department`
- `deactivateEmployee reassigns active tasks`
- `deactivateEmployee with active tasks fails if no reassignment target`
- `bulkDeactivate processes multiple employees`
- `bulkDeactivate rolls back on any failure`
- `filterEmployees by department works correctly`
- `sortEmployees by hire date works correctly`

### Adapter Tests (15 tests)

**GraphQL Adapter Tests (15 tests):**

- `GraphQLEmployeeAdapter.getEmployees queries GraphQL correctly`
- `GraphQLEmployeeAdapter.getEmployees maps response to domain entities`
- `GraphQLEmployeeAdapter.getEmployees handles GraphQL errors`
- `GraphQLEmployeeAdapter.getEmployeeById queries with correct ID`
- `GraphQLEmployeeAdapter.getEmployeeById maps user to employee`
- `GraphQLEmployeeAdapter.getEmployeeById with 404 returns EmployeeNotFoundError`
- `GraphQLEmployeeAdapter.createEmployee sends correct mutation`
- `GraphQLEmployeeAdapter.createEmployee maps response to domain entity`
- `GraphQLEmployeeAdapter.createEmployee handles validation errors`
- `GraphQLEmployeeAdapter.updateEmployee sends correct variables`
- `GraphQLEmployeeAdapter.deleteEmployee calls deleteUser mutation`
- `GraphQLEmployeeAdapter handles network timeouts gracefully`
- `GraphQLEmployeeAdapter translates GraphQL errors to domain errors`

### Integration Tests (10 tests)

**End-to-End Flow Tests (10 tests):**

- `Full flow: service → adapter → mock GraphQL → domain entity`
- `Create employee flow validates all inputs`
- `Update employee flow preserves unchanged fields`
- `Filter employees by active status returns only active`
- `Sort employees by hire date returns correct order`
- `Deactivate employee flow reassigns tasks`
- `Bulk operations process in transaction`
- `Error propagation from adapter to service to component`
- `Permission checks integrate with RBAC`
- `Component receives correctly formatted domain entities`

### Test Utilities

**Factories (`tests/helpers/factories.ts`):**

```typescript
export class EmployeeFactory {
	static create(overrides?: Partial<CreateEmployeeData>): Employee {
		const data = {
			id: faker.string.uuid(),
			email: faker.internet.email(),
			firstName: faker.person.firstName(),
			lastName: faker.person.lastName(),
			hireDate: faker.date.past({ years: 5 }).toISOString(),
			departmentId: faker.string.uuid(),
			...overrides
		};
		return Employee.create(data).value;
	}

	static createMany(count: number): Employee[] {
		return Array.from({ length: count }, () => this.create());
	}

	static createInactive(): Employee {
		const employee = this.create();
		employee.deactivate();
		return employee;
	}
}
```

**Test Helpers (`tests/helpers/test-container.ts`):**

```typescript
export function createTestEmployeeService(overrides?: {
	employeeRepo?: EmployeeRepository;
	departmentRepo?: DepartmentRepository;
}): EmployeeService {
	return new EmployeeService(
		overrides?.employeeRepo ?? new MockEmployeeRepository(),
		overrides?.departmentRepo ?? new MockDepartmentRepository()
	);
}
```

### Coverage Targets

- **Domain Layer**: 100% coverage (pure logic, no excuses)
- **Service Layer**: 90%+ coverage (comprehensive business logic tests)
- **Adapter Layer**: 80%+ coverage (focus on critical paths, error handling)
- **Integration**: 80%+ coverage (key workflows validated)

**Overall Employee Module**: 80%+ coverage by end of Week 4.

---

## 6. Error Handling & Validation

We'll implement comprehensive error handling at each layer.

### Domain Errors

All domain errors extend `DomainError`:

```typescript
// src/domain/errors.ts (already exists from Week 1)

export class EmployeeNotFoundError extends DomainError {
	constructor(employeeId: string) {
		super(`Employee with ID ${employeeId} not found`, 'EMPLOYEE_NOT_FOUND', { employeeId });
	}
}

export class InvalidHireDateError extends DomainError {
	constructor(reason: string) {
		super(`Invalid hire date: ${reason}`, 'INVALID_HIRE_DATE', { reason });
	}
}

export class InvalidEmailError extends DomainError {
	constructor(reason: string) {
		super(`Invalid email: ${reason}`, 'INVALID_EMAIL', { reason });
	}
}

export class EmployeeAlreadyExistsError extends DomainError {
	constructor(email: string) {
		super(`Employee with email ${email} already exists`, 'EMPLOYEE_ALREADY_EXISTS', { email });
	}
}

export class EmployeeDeactivationError extends DomainError {
	constructor(employeeId: string, reason: string) {
		super(`Cannot deactivate employee ${employeeId}: ${reason}`, 'EMPLOYEE_DEACTIVATION_FAILED', {
			employeeId,
			reason
		});
	}
}
```

### Service Layer Error Handling

Service wraps domain errors with operational context:

```typescript
// src/services/EmployeeService.ts

export class EmployeeService {
	async createEmployee(data: CreateEmployeeData): Promise<Result<Employee, DomainError>> {
		// Validate department exists
		const deptExists = await this.departmentRepo.exists(data.departmentId);
		if (!deptExists) {
			return Result.error(new DepartmentNotFoundError(data.departmentId));
		}

		// Check for duplicate email
		const existing = await this.employeeRepo.findByEmail(data.email);
		if (existing) {
			return Result.error(new EmployeeAlreadyExistsError(data.email));
		}

		// Create domain entity (validates business rules)
		const employeeResult = Employee.create(data);
		if (employeeResult.isError) {
			return Result.error(employeeResult.error);
		}

		// Persist via repository
		try {
			const saved = await this.employeeRepo.save(employeeResult.value);
			return Result.ok(saved);
		} catch (error) {
			logger.error('Failed to save employee', { error, data });
			return Result.error(
				new DomainError('Failed to create employee', 'EMPLOYEE_CREATE_FAILED', {
					originalError: error
				})
			);
		}
	}
}
```

### Adapter Layer Error Translation

Adapter translates external errors to domain errors:

```typescript
// src/adapters/GraphQLEmployeeAdapter.ts

export class GraphQLEmployeeAdapter implements EmployeeRepository {
	async findById(id: string): Promise<Employee | null> {
		try {
			const result = await this.graphql.query(GET_EMPLOYEE_BY_ID_QUERY, { id });

			if (!result.data.user) {
				return null; // Not found
			}

			// Map GraphQL response to domain entity
			const employeeResult = Employee.create({
				id: result.data.user.id,
				email: result.data.user.email,
				firstName: result.data.user.firstName,
				lastName: result.data.user.lastName,
				hireDate: result.data.user.hireDate,
				departmentId: result.data.user.departmentId,
				isActive: result.data.user.isActive
			});

			if (employeeResult.isError) {
				logger.error('Failed to create employee from GraphQL response', {
					error: employeeResult.error,
					data: result.data.user
				});
				throw employeeResult.error;
			}

			return employeeResult.value;
		} catch (error) {
			// Translate GraphQL errors
			if (error.message.includes('404')) {
				return null;
			}
			if (error.message.includes('Network')) {
				throw new ServiceUnavailableError('Employee service unavailable');
			}
			throw error;
		}
	}
}
```

### Component Error Handling

Components show user-friendly error messages:

```typescript
// +page.server.ts
export const load: PageServerLoad = async (event) => {
	const container = Container.getInstance();
	const result = await container.employeeService.getEmployeeById(id);

	if (result.isError) {
		if (result.error.code === 'EMPLOYEE_NOT_FOUND') {
			throw error(404, 'Employee not found');
		}
		logger.error('Failed to load employee', { error: result.error });
		throw error(500, 'Failed to load employee. Please try again.');
	}

	return { employee: result.value };
};
```

### Error Context & Debugging

All errors include context for debugging:

```typescript
// Example error with context
const error = new InvalidHireDateError('Hire date cannot be in the future');
console.log(error.code); // 'INVALID_HIRE_DATE'
console.log(error.context); // { reason: 'Hire date cannot be in the future' }
console.log(error.message); // 'Invalid hire date: Hire date cannot be in the future'
```

---

## 7. Implementation Timeline & Deliverables

### Week 2: Build Parallel Architecture

**Domain Layer (2-3 days):**

- [ ] Create `src/domain/Employee/` directory
- [ ] Implement value objects: Email, PersonName, HireDate, EmployeeStatus, DepartmentId
- [ ] Implement Employee entity with factory method and business methods
- [ ] Add domain errors: EmployeeNotFoundError, InvalidHireDateError, etc.
- [ ] Write 30 domain tests (100% coverage)

**Service Layer (1-2 days):**

- [ ] Create EmployeeRepository port interface
- [ ] Implement EmployeeService with CRUD operations
- [ ] Add business workflows (validate department, check duplicates, etc.)
- [ ] Write 25 service tests

**Adapter Layer (1-2 days):**

- [ ] Extend GraphQLAdapter with employee methods
- [ ] Implement GraphQL → domain entity mapping
- [ ] Add error translation (GraphQL errors → domain errors)
- [ ] Write 15 adapter tests

**Deliverables:**

- 45 tests passing (30 domain + 25 service + 15 adapter)
- Employee domain entity with 5 value objects
- EmployeeService with full CRUD
- GraphQLEmployeeAdapter integrated with existing GraphQL client
- Zero breaking changes to existing routes

### Week 3: Migrate Simple Routes

**Route 1: `/employees/[id]` Detail View (2 days):**

- [ ] Write integration tests for current behavior
- [ ] Update `+page.server.ts` to use EmployeeService
- [ ] Update component to receive domain entities
- [ ] Validate no regressions (visual + functional tests)
- [ ] Commit: "feat: migrate /employees/[id] to domain architecture"

**Route 2: `/employees/new` Create Form (2 days):**

- [ ] Write integration tests for create workflow
- [ ] Update form submission to use EmployeeService.createEmployee
- [ ] Add client-side validation using domain validation rules
- [ ] Handle domain errors in UI (show user-friendly messages)
- [ ] Commit: "feat: migrate /employees/new to domain architecture"

**Testing & Validation (1 day):**

- [ ] Run full test suite (verify 70+ tests passing)
- [ ] Manual testing of migrated routes
- [ ] Performance testing (ensure no regressions)
- [ ] Document any issues or edge cases

**Deliverables:**

- 2 routes migrated to domain architecture
- 10 integration tests added
- All existing features still working
- Performance maintained or improved

### Week 4: Complete Migration & Cleanup

**Route 3: `/employees` List View (2 days):**

- [ ] Write integration tests for filtering/sorting
- [ ] Update `+page.server.ts` to use EmployeeService.getEmployees
- [ ] Remove client-side filtering logic (use service methods)
- [ ] Update components to use domain entity methods
- [ ] Commit: "feat: migrate /employees list to domain architecture"

**Route 4: Bulk Operations (1 day):**

- [ ] Implement bulk activate/deactivate in EmployeeService
- [ ] Update components to use service methods
- [ ] Add transaction support (all or nothing)
- [ ] Test rollback on partial failures

**Cleanup & Documentation (2 days):**

- [ ] Remove old GraphQL operations no longer used
- [ ] Update type definitions (use domain types everywhere)
- [ ] Delete duplicate filtering/sorting logic
- [ ] Update README with new architecture
- [ ] Document migration patterns for other modules

**Deliverables:**

- All employee routes using domain architecture
- Zero old GraphQL coupling remaining
- 80+ tests with 80%+ coverage
- Updated documentation
- Reference implementation for other module migrations

---

## Success Metrics

1. **Test Coverage**: 80+ tests with 80%+ coverage on employee module
2. **Type Safety**: Zero `any` types in employee-related code
3. **Architecture Compliance**: All employee business logic in domain/services (provable via ESLint rules)
4. **Decoupling**: Components depend on EmployeeService, not GraphQL directly
5. **Feature Parity**: All existing employee features still work
6. **Performance**: No regressions in page load times or operation speeds
7. **Error Handling**: All errors handled gracefully with user-friendly messages
8. **Documentation**: Complete architecture docs and migration guide

---

## Reference for Future Modules

By end of Week 4, employee module serves as reference implementation for:

- Tasks module migration (Week 5-7)
- Departments module migration (Week 8-9)
- Reviews module migration (Week 10-11)
- Final integration & optimization (Week 12)

The patterns, tests, and architecture established here will be replicated across all other modules, ensuring consistency and quality throughout the codebase.
