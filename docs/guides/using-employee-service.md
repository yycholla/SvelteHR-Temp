# Using EmployeeService: Practical Guide

This guide provides practical examples for using the EmployeeService in SvelteKit routes.

## Quick Start

### Basic Setup

```typescript
// In +page.server.ts
import { createEmployeeService } from '$lib/server/services';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const employeeService = createEmployeeService(event);

	// Use the service
	const result = await employeeService.getEmployees();

	if (result.isError) {
		throw error(500, result.error.message);
	}

	return {
		employees: result.value.employees
	};
};
```

### Understanding Result Types

All EmployeeService methods return a `Result<T, E>` type:

```typescript
type Result<T, E> = Ok<T> | Err<E>;

interface Ok<T> {
	isOk: true;
	isError: false;
	value: T;
}

interface Err<E> {
	isOk: false;
	isError: true;
	error: E;
}
```

**Always check `isError` before accessing `value`**:

```typescript
const result = await employeeService.getEmployeeById(id);

if (result.isError) {
	// Handle error
	console.error(result.error.message);
	throw error(404, result.error.message);
}

// Safe to access value
const employee = result.value;
```

## Getting Employees

### Get All Employees

```typescript
export const load: PageServerLoad = async (event) => {
	const employeeService = createEmployeeService(event);

	const result = await employeeService.getEmployees();

	if (result.isError) {
		throw error(500, 'Failed to load employees');
	}

	return {
		employees: result.value.employees,
		total: result.value.total
	};
};
```

### Get Employee by ID

```typescript
export const load: PageServerLoad = async ({ params }) => {
	const employeeService = createEmployeeService(event);

	const result = await employeeService.getEmployeeById(params.id);

	if (result.isError) {
		// Domain error with specific code
		if (result.error.code === 'EMPLOYEE_NOT_FOUND') {
			throw error(404, `Employee ${params.id} not found`);
		}
		throw error(500, result.error.message);
	}

	return {
		employee: result.value
	};
};
```

### Advanced Filtering

```typescript
export const load: PageServerLoad = async ({ url }) => {
	const employeeService = createEmployeeService(event);

	const filters = {
		searchTerm: url.searchParams.get('search') ?? undefined,
		departmentId: url.searchParams.get('department') ?? undefined,
		isActive:
			url.searchParams.get('status') === 'active'
				? true
				: url.searchParams.get('status') === 'inactive'
					? false
					: undefined,
		sortBy: (url.searchParams.get('sortBy') as 'name' | 'hireDate' | 'email') ?? 'name',
		sortOrder: (url.searchParams.get('sortOrder') as 'asc' | 'desc') ?? 'asc',
		limit: 20,
		offset: parseInt(url.searchParams.get('page') ?? '0') * 20
	};

	const result = await employeeService.getEmployees(filters);

	if (result.isError) {
		throw error(500, result.error.message);
	}

	return {
		employees: result.value.employees,
		total: result.value.total,
		currentPage: Math.floor(result.value.offset / result.value.limit),
		totalPages: Math.ceil(result.value.total / result.value.limit)
	};
};
```

**Available Filter Options**:

```typescript
interface EmployeeListFilters {
	searchTerm?: string; // Searches name, email, job title
	departmentId?: string; // Filter by department
	isActive?: boolean; // true = active only, false = inactive only, undefined = all
	sortBy?: 'name' | 'hireDate' | 'email';
	sortOrder?: 'asc' | 'desc';
	limit?: number; // Default: 20
	offset?: number; // Default: 0
}
```

## Creating Employees

### Basic Creation

```typescript
import { fail } from '@sveltejs/kit';
import { randomUUID } from 'crypto';
import type { Actions } from './$types';

export const actions: Actions = {
	create: async (event) => {
		const employeeService = createEmployeeService(event);
		const formData = await event.request.formData();

		const result = await employeeService.createEmployee({
			id: randomUUID(),
			email: formData.get('email') as string,
			firstName: formData.get('firstName') as string,
			lastName: formData.get('lastName') as string,
			hireDate: formData.get('hireDate') as string,
			jobTitle: formData.get('jobTitle') as string,
			departmentId: formData.get('departmentId') as string,
			phone: formData.get('phone') as string | undefined
		});

		if (result.isError) {
			return fail(400, {
				error: result.error.message,
				formData: Object.fromEntries(formData)
			});
		}

		return {
			success: true,
			employee: result.value
		};
	}
};
```

### Handling Validation Errors

```typescript
export const actions: Actions = {
	create: async (event) => {
		const employeeService = createEmployeeService(event);
		const formData = await event.request.formData();

		const result = await employeeService.createEmployee({
			id: randomUUID(),
			email: formData.get('email') as string,
			firstName: formData.get('firstName') as string,
			lastName: formData.get('lastName') as string,
			hireDate: formData.get('hireDate') as string,
			jobTitle: formData.get('jobTitle') as string,
			departmentId: formData.get('departmentId') as string
		});

		if (result.isError) {
			// Check error type
			switch (result.error.code) {
				case 'EMPLOYEE_ALREADY_EXISTS':
					return fail(409, {
						error: 'An employee with this email already exists',
						field: 'email',
						formData: Object.fromEntries(formData)
					});

				case 'INVALID_EMPLOYEE_DATA':
					return fail(400, {
						error: result.error.message,
						formData: Object.fromEntries(formData)
					});

				default:
					return fail(500, {
						error: 'Failed to create employee',
						formData: Object.fromEntries(formData)
					});
			}
		}

		// Redirect to new employee
		throw redirect(303, `/employees/${result.value.id}`);
	}
};
```

### Domain Validation

The service performs validation automatically:

1. **Email Validation**:
   - Valid email format (RFC 5322)
   - Normalized to lowercase
   - Uniqueness check

2. **Name Validation** (PersonName value object):
   - 2-50 characters
   - Alphabetic characters only (a-z, A-Z, spaces, hyphens, apostrophes)

3. **Hire Date Validation** (HireDate value object):
   - Valid date format (YYYY-MM-DD)
   - Cannot be in the future

4. **Phone Validation** (optional):
   - E.164 format (+1234567890)

**Example Error**:

```typescript
const result = await employeeService.createEmployee({
	email: 'invalid-email', // ❌ Invalid format
	firstName: 'J', // ❌ Too short
	hireDate: '2030-01-01' // ❌ Future date
	// ...
});

if (result.isError) {
	console.log(result.error.message);
	// "Invalid email format: invalid-email"
}
```

## Updating Employees

### Full Update

```typescript
export const actions: Actions = {
	update: async ({ params, request }) => {
		const employeeService = createEmployeeService(event);
		const formData = await request.formData();

		const result = await employeeService.updateEmployee(params.id, {
			email: formData.get('email') as string,
			firstName: formData.get('firstName') as string,
			lastName: formData.get('lastName') as string,
			jobTitle: formData.get('jobTitle') as string,
			departmentId: formData.get('departmentId') as string,
			phone: formData.get('phone') as string | undefined
		});

		if (result.isError) {
			if (result.error.code === 'EMPLOYEE_NOT_FOUND') {
				throw error(404, `Employee ${params.id} not found`);
			}
			return fail(400, {
				error: result.error.message,
				formData: Object.fromEntries(formData)
			});
		}

		return {
			success: true,
			employee: result.value
		};
	}
};
```

### Partial Update

```typescript
// Update only specific fields
const result = await employeeService.updateEmployee(id, {
	jobTitle: 'Senior Engineer',
	departmentId: 'dept-123'
	// Other fields remain unchanged
});
```

### Updating Status

```typescript
// Activate employee
const result = await employeeService.updateEmployee(id, {
	isActive: true
});

// Deactivate employee
const result = await employeeService.updateEmployee(id, {
	isActive: false
});
```

## Deleting Employees

**Note**: Delete is a soft delete (sets status to Inactive).

```typescript
export const actions: Actions = {
	delete: async ({ params }) => {
		const employeeService = createEmployeeService(event);

		const result = await employeeService.deleteEmployee(params.id);

		if (result.isError) {
			if (result.error.code === 'EMPLOYEE_NOT_FOUND') {
				throw error(404, `Employee ${params.id} not found`);
			}
			return fail(500, {
				error: 'Failed to delete employee'
			});
		}

		// Redirect to list
		throw redirect(303, '/employees');
	}
};
```

## Bulk Operations

### Bulk Activate

```typescript
export const actions: Actions = {
	bulkActivate: async ({ request }) => {
		const employeeService = createEmployeeService(event);
		const formData = await request.formData();
		const ids = formData.getAll('employeeIds') as string[];

		const result = await employeeService.bulkActivate(ids);

		return {
			succeeded: result.succeeded,
			failed: result.failed,
			message: `Activated ${result.succeeded.length} employees, ${result.failed.length} failed`
		};
	}
};
```

### Bulk Deactivate

```typescript
export const actions: Actions = {
	bulkDeactivate: async ({ request }) => {
		const employeeService = createEmployeeService(event);
		const formData = await request.formData();
		const ids = formData.getAll('employeeIds') as string[];

		const result = await employeeService.bulkDeactivate(ids);

		// Handle partial failures
		if (result.failed.length > 0) {
			console.warn('Some operations failed:', result.failed);
		}

		return {
			succeeded: result.succeeded,
			failed: result.failed
		};
	}
};
```

**Bulk Operation Result**:

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

## Working with Domain Entities

### Accessing Value Objects

```typescript
const result = await employeeService.getEmployeeById(id);
const employee = result.value;

// Email value object
console.log(employee.email.value); // "john@example.com"
console.log(employee.email.domain); // "example.com"

// PersonName value object
console.log(employee.name.firstName); // "John"
console.log(employee.name.lastName); // "Doe"
console.log(employee.name.fullName); // "John Doe"

// HireDate value object
console.log(employee.hireDate.value); // "2024-01-15"
console.log(employee.hireDate.formatted); // "January 15, 2024"
console.log(employee.hireDate.tenure); // "1 year, 5 days"

// Status
console.log(employee.status); // EmployeeStatus.Active
console.log(employee.isActive); // true
```

### Using Computed Properties

```typescript
const employee = result.value;

// Full name (computed from PersonName)
console.log(employee.fullName); // "John Doe"

// Active status (computed from EmployeeStatus)
console.log(employee.isActive); // true

// Display name (falls back to fullName if not set)
console.log(employee.displayName); // "John Doe" or custom display name
```

## Error Handling

### Domain Error Types

```typescript
// 1. EmployeeNotFoundError
const result = await employeeService.getEmployeeById('invalid-id');
if (result.isError && result.error.code === 'EMPLOYEE_NOT_FOUND') {
  throw error(404, 'Employee not found');
}

// 2. EmployeeAlreadyExistsError
const result = await employeeService.createEmployee({ email: 'existing@example.com', ... });
if (result.isError && result.error.code === 'EMPLOYEE_ALREADY_EXISTS') {
  return fail(409, { error: 'Email already in use' });
}

// 3. InvalidEmployeeDataError
const result = await employeeService.createEmployee({ email: 'invalid', ... });
if (result.isError && result.error.code === 'INVALID_EMPLOYEE_DATA') {
  return fail(400, { error: result.error.message });
}

// 4. EmployeeOperationError
const result = await employeeService.updateEmployee(id, data);
if (result.isError && result.error.code === 'EMPLOYEE_OPERATION_FAILED') {
  return fail(500, { error: 'Operation failed' });
}
```

### Comprehensive Error Handling

```typescript
export const actions: Actions = {
	create: async (event) => {
		const employeeService = createEmployeeService(event);
		const formData = await event.request.formData();

		const result = await employeeService.createEmployee({
			id: randomUUID(),
			email: formData.get('email') as string,
			firstName: formData.get('firstName') as string,
			lastName: formData.get('lastName') as string,
			hireDate: formData.get('hireDate') as string,
			jobTitle: formData.get('jobTitle') as string,
			departmentId: formData.get('departmentId') as string
		});

		if (result.isError) {
			const { error } = result;

			// Map domain errors to HTTP status codes
			const statusCode =
				{
					EMPLOYEE_ALREADY_EXISTS: 409,
					INVALID_EMPLOYEE_DATA: 400,
					EMPLOYEE_NOT_FOUND: 404,
					EMPLOYEE_OPERATION_FAILED: 500
				}[error.code] ?? 500;

			// User-friendly error messages
			const userMessage =
				{
					EMPLOYEE_ALREADY_EXISTS: 'An employee with this email already exists',
					INVALID_EMPLOYEE_DATA: error.message,
					EMPLOYEE_NOT_FOUND: 'Employee not found',
					EMPLOYEE_OPERATION_FAILED: 'Failed to create employee'
				}[error.code] ?? 'An unexpected error occurred';

			return fail(statusCode, {
				error: userMessage,
				formData: Object.fromEntries(formData)
			});
		}

		throw redirect(303, `/employees/${result.value.id}`);
	}
};
```

## Parallelizing Queries

When loading multiple independent datasets, use `Promise.all`:

```typescript
export const load: PageServerLoad = async (event) => {
	const employeeService = createEmployeeService(event);
	const departmentRepository = createDepartmentRepository(event);

	// Execute in parallel (3x faster)
	const [employeesResult, departmentsResult] = await Promise.all([
		employeeService.getEmployees({ limit: 20 }),
		departmentRepository.getDepartments()
	]);

	if (employeesResult.isError) {
		throw error(500, 'Failed to load employees');
	}

	if (departmentsResult.isError) {
		throw error(500, 'Failed to load departments');
	}

	return {
		employees: employeesResult.value.employees,
		departments: departmentsResult.value
	};
};
```

**Performance Comparison**:

- **Sequential**: 500ms + 500ms = 1000ms
- **Parallel**: max(500ms, 500ms) = 500ms (2x faster)

## Type Safety

### Strong Typing Throughout

```typescript
// 1. Service methods are fully typed
const result: Result<Employee, DomainError> = await employeeService.getEmployeeById(id);

// 2. Domain entities are typed
const employee: Employee = result.value;
const email: Email = employee.email;
const name: PersonName = employee.name;

// 3. Filters are typed
const filters: EmployeeListFilters = {
	searchTerm: 'john',
	sortBy: 'name', // Only 'name' | 'hireDate' | 'email'
	sortOrder: 'asc' // Only 'asc' | 'desc'
};

// 4. Results are typed
const listResult: Result<EmployeeListResult, DomainError> =
	await employeeService.getEmployees(filters);
const employees: Employee[] = listResult.value.employees;
const total: number = listResult.value.total;
```

### No `any` Types

The entire employee module is free of `any` types:

```typescript
// ❌ Never do this
const employee: any = result.value;

// ✅ Always use proper types
const employee: Employee = result.value;
```

## Testing Your Code

### Using MockRepository

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { MockEmployeeRepository } from '$lib/server/infrastructure/persistence/mock-employee-repository';
import { EmployeeService } from '$lib/server/application/employee/employee-service';
import {
	Email,
	PersonName,
	HireDate,
	EmployeeStatus
} from '$lib/server/domain/employee/value-objects';
import { Employee } from '$lib/server/domain/employee/entity';
import { randomUUID } from 'crypto';

describe('Employee Route Tests', () => {
	let repository: MockEmployeeRepository;
	let service: EmployeeService;

	beforeEach(() => {
		repository = new MockEmployeeRepository();
		service = new EmployeeService(repository);
	});

	it('should load employee by ID', async () => {
		// Create test employee
		const employee = Employee.create({
			id: randomUUID(),
			email: 'test@example.com',
			firstName: 'Test',
			lastName: 'User',
			hireDate: '2024-01-15',
			departmentId: 'dept-123',
			jobTitle: 'Engineer'
		}).value!;

		// Save to mock repository
		await repository.save(employee);

		// Test service
		const result = await service.getEmployeeById(employee.id);

		expect(result.isOk).toBe(true);
		expect(result.value.email.value).toBe('test@example.com');
	});

	it('should return error for non-existent employee', async () => {
		const result = await service.getEmployeeById('non-existent-id');

		expect(result.isError).toBe(true);
		expect(result.error.code).toBe('EMPLOYEE_NOT_FOUND');
	});
});
```

## Common Patterns

### Pattern 1: Load + Form Actions

```typescript
// Load employee for editing
export const load: PageServerLoad = async ({ params }) => {
	const employeeService = createEmployeeService(event);

	const result = await employeeService.getEmployeeById(params.id);

	if (result.isError) {
		throw error(404, 'Employee not found');
	}

	return {
		employee: result.value
	};
};

// Update employee
export const actions: Actions = {
	update: async ({ params, request }) => {
		const employeeService = createEmployeeService(event);
		const formData = await request.formData();

		const result = await employeeService.updateEmployee(params.id, {
			jobTitle: formData.get('jobTitle') as string,
			departmentId: formData.get('departmentId') as string
		});

		if (result.isError) {
			return fail(400, { error: result.error.message });
		}

		return { success: true };
	}
};
```

### Pattern 2: Search + Filter

```typescript
export const load: PageServerLoad = async ({ url }) => {
	const employeeService = createEmployeeService(event);

	const search = url.searchParams.get('q') ?? '';
	const department = url.searchParams.get('dept') ?? '';

	const result = await employeeService.getEmployees({
		searchTerm: search || undefined,
		departmentId: department || undefined,
		limit: 20
	});

	if (result.isError) {
		throw error(500, 'Failed to load employees');
	}

	return {
		employees: result.value.employees,
		total: result.value.total,
		filters: { search, department }
	};
};
```

### Pattern 3: Conditional Loading

```typescript
export const load: PageServerLoad = async ({ url, locals }) => {
	const employeeService = createEmployeeService(event);

	// Managers see all employees, employees see only themselves
	const isManager = locals.user.permissions.includes('view_all_employees');

	const result = isManager
		? await employeeService.getEmployees()
		: await employeeService.getEmployeeById(locals.user.id);

	if (result.isError) {
		throw error(403, 'Unauthorized');
	}

	return {
		employees: isManager ? result.value.employees : [result.value]
	};
};
```

## Migration from GraphQL

### Before (Direct GraphQL)

```typescript
import { createUrqlClient, serializeCookies } from '$lib/graphql/client';
import { GET_EMPLOYEES_QUERY } from '$lib/graphql/employees/queries';

export const load: PageServerLoad = async ({ fetch, cookies }) => {
	const client = createUrqlClient(fetch, undefined, undefined, serializeCookies(cookies));
	const result = await client.query(GET_EMPLOYEES_QUERY, { limit: 20 }).toPromise();

	if (result.error) {
		throw error(500, 'Failed to load employees');
	}

	return {
		employees: result.data.users
	};
};
```

### After (Domain Service)

```typescript
import { createEmployeeService } from '$lib/server/services';

export const load: PageServerLoad = async (event) => {
	const employeeService = createEmployeeService(event);
	const result = await employeeService.getEmployees({ limit: 20 });

	if (result.isError) {
		throw error(500, result.error.message);
	}

	return {
		employees: result.value.employees
	};
};
```

**Benefits**:

- Simpler code (no client creation)
- Better error handling (domain errors)
- Type safety (no type assertions)
- Testability (use MockRepository)

## Troubleshooting

### Issue: "Result is undefined"

**Problem**: Forgetting to check `isError`

```typescript
// ❌ Wrong
const employee = result.value; // May be undefined if error

// ✅ Correct
if (result.isError) {
	throw error(500, result.error.message);
}
const employee = result.value; // Safe
```

### Issue: "Employee not found"

**Problem**: Invalid UUID format

```typescript
// ❌ Wrong
const result = await employeeService.getEmployeeById('123');

// ✅ Correct
import { validate as isValidUUID } from 'uuid';

if (!isValidUUID(id)) {
	throw error(400, 'Invalid employee ID format');
}
const result = await employeeService.getEmployeeById(id);
```

### Issue: "Validation errors not shown"

**Problem**: Not returning formData for re-rendering

```typescript
// ❌ Wrong
if (result.isError) {
	return fail(400, { error: result.error.message });
}

// ✅ Correct
if (result.isError) {
	return fail(400, {
		error: result.error.message,
		formData: Object.fromEntries(formData) // Preserve user input
	});
}
```

## Best Practices

1. **Always check isError**: Never access `result.value` without checking `result.isError` first
2. **Use domain errors**: Map error codes to appropriate HTTP status codes
3. **Parallelize queries**: Use `Promise.all` for independent queries
4. **Preserve form data**: Return formData on validation errors
5. **Validate UUIDs**: Check UUID format before querying
6. **Use type inference**: Let TypeScript infer types when possible
7. **Test with MockRepository**: Use in-memory repository for fast tests
8. **Handle partial failures**: Check `failed` array in bulk operations

## Next Steps

- Read [Employee Module Migration](../architecture/employee-module-migration.md) for architecture overview
- See [Testing with MockRepository](./testing-with-mock-repository.md) for testing strategies
- Review [Domain-Driven Design](../architecture/domain-driven-design.md) for domain layer patterns

---

**Last Updated**: 2026-01-20
**Questions**: See [CLAUDE.md](../../CLAUDE.md)
