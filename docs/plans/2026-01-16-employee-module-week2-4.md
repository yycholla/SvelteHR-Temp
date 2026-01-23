# Week 2-4: Employee Module Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans or superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Extract employee domain logic, create EmployeeService with comprehensive tests, migrate all routes to hexagonal architecture.

**Architecture:** Domain (Employee entity + value objects) → Services (EmployeeService) → Adapters (GraphQLEmployeeAdapter) → Components

**Tech Stack:** TypeScript 5, Vitest 3, Faker.js, Result type pattern, Domain-Driven Design

---

## WEEK 2: Build Parallel Architecture

### Task 1: Result Type and Domain Errors

**Files:**

- Create: `src/domain/Result.ts`
- Modify: `src/domain/errors.ts:existing`
- Test: `tests/unit/domain/Result.test.ts`

---

**Step 1: Write failing test for Result type**

Create test file:

```typescript
// tests/unit/domain/Result.test.ts
import { describe, it, expect } from 'vitest';
import { Result } from '$domain/Result';
import { DomainError } from '$domain/errors';

describe('Result', () => {
	describe('ok', () => {
		it('creates successful result', () => {
			const result = Result.ok(42);

			expect(result.isOk).toBe(true);
			expect(result.isError).toBe(false);
			expect(result.value).toBe(42);
		});
	});

	describe('error', () => {
		it('creates error result', () => {
			const error = new DomainError('Test error', 'TEST_ERROR');
			const result = Result.error(error);

			expect(result.isOk).toBe(false);
			expect(result.isError).toBe(true);
			expect(result.error).toBe(error);
		});

		it('throws when accessing value on error result', () => {
			const error = new DomainError('Test error', 'TEST_ERROR');
			const result = Result.error(error);

			expect(() => result.value).toThrow('Cannot get value from error result');
		});
	});

	describe('map', () => {
		it('transforms ok value', () => {
			const result = Result.ok(5);
			const mapped = result.map((x) => x * 2);

			expect(mapped.value).toBe(10);
		});

		it('preserves error', () => {
			const error = new DomainError('Test', 'TEST');
			const result = Result.error<number, DomainError>(error);
			const mapped = result.map((x) => x * 2);

			expect(mapped.error).toBe(error);
		});
	});

	describe('flatMap', () => {
		it('chains ok results', () => {
			const result = Result.ok(5);
			const chained = result.flatMap((x) => Result.ok(x * 2));

			expect(chained.value).toBe(10);
		});

		it('short-circuits on error', () => {
			const error = new DomainError('Test', 'TEST');
			const result = Result.error<number, DomainError>(error);
			const chained = result.flatMap((x) => Result.ok(x * 2));

			expect(chained.error).toBe(error);
		});
	});
});
```

---

**Step 2: Run test to verify it fails**

Run: `npm run test tests/unit/domain/Result.test.ts`

Expected: FAIL with "Cannot find module '$domain/Result'"

---

**Step 3: Implement Result type**

```typescript
// src/domain/Result.ts

/**
 * Result type for operations that can fail
 * Inspired by Rust's Result<T, E>
 */
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
		if (this.isError) {
			return Result.error(this.error);
		}
		return Result.ok(fn(this.value));
	}

	flatMap<U>(fn: (value: T) => Result<U, E>): Result<U, E> {
		if (this.isError) {
			return Result.error(this.error);
		}
		return fn(this.value);
	}
}
```

---

**Step 4: Add employee domain errors**

```typescript
// src/domain/errors.ts (append to existing file)

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

export class DepartmentNotFoundError extends DomainError {
	constructor(departmentId: string) {
		super(`Department with ID ${departmentId} not found`, 'DEPARTMENT_NOT_FOUND', { departmentId });
	}
}

export class ServiceUnavailableError extends DomainError {
	constructor(service: string) {
		super(`Service ${service} is unavailable`, 'SERVICE_UNAVAILABLE', { service });
	}
}
```

---

**Step 5: Run tests to verify they pass**

Run: `npm run test tests/unit/domain/Result.test.ts`

Expected: PASS (8 tests)

---

**Step 6: Commit**

```bash
git add src/domain/Result.ts src/domain/errors.ts tests/unit/domain/Result.test.ts
git commit -m "feat: add Result type and employee domain errors"
```

---

### Task 2: Email Value Object

**Files:**

- Create: `src/domain/Employee/Email.ts`
- Test: `tests/unit/domain/Employee/Email.test.ts`

---

**Step 1: Write failing tests for Email**

```typescript
// tests/unit/domain/Employee/Email.test.ts
import { describe, it, expect } from 'vitest';
import { Email } from '$domain/Employee/Email';
import { InvalidEmailError } from '$domain/errors';

describe('Email', () => {
	describe('create', () => {
		it('creates email with valid address', () => {
			const result = Email.create('john.doe@example.com');

			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('john.doe@example.com');
		});

		it('normalizes email to lowercase', () => {
			const result = Email.create('John.Doe@EXAMPLE.COM');

			expect(result.value.value).toBe('john.doe@example.com');
		});

		it('trims whitespace', () => {
			const result = Email.create('  john@example.com  ');

			expect(result.value.value).toBe('john@example.com');
		});

		it('returns error for empty string', () => {
			const result = Email.create('');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidEmailError);
			expect(result.error.code).toBe('INVALID_EMAIL');
		});

		it('returns error for whitespace-only string', () => {
			const result = Email.create('   ');

			expect(result.isError).toBe(true);
		});

		it('returns error for invalid format - no @', () => {
			const result = Email.create('notanemail');

			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('Invalid email format');
		});

		it('returns error for invalid format - no domain', () => {
			const result = Email.create('test@');

			expect(result.isError).toBe(true);
		});

		it('returns error for invalid format - no TLD', () => {
			const result = Email.create('test@domain');

			expect(result.isError).toBe(true);
		});
	});
});
```

---

**Step 2: Run test to verify it fails**

Run: `npm run test tests/unit/domain/Employee/Email.test.ts`

Expected: FAIL with "Cannot find module '$domain/Employee/Email'"

---

**Step 3: Implement Email value object**

```typescript
// src/domain/Employee/Email.ts
import { Result } from '$domain/Result';
import { InvalidEmailError } from '$domain/errors';

export class Email {
	private constructor(public readonly value: string) {}

	static create(email: string): Result<Email, InvalidEmailError> {
		if (!email || email.trim().length === 0) {
			return Result.error(new InvalidEmailError('Email cannot be empty'));
		}

		// RFC 5322 compliant regex (simplified)
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		const normalizedEmail = email.toLowerCase().trim();

		if (!emailRegex.test(normalizedEmail)) {
			return Result.error(new InvalidEmailError(`Invalid email format: ${email}`));
		}

		return Result.ok(new Email(normalizedEmail));
	}

	equals(other: Email): boolean {
		return this.value === other.value;
	}
}
```

---

**Step 4: Run tests to verify they pass**

Run: `npm run test tests/unit/domain/Employee/Email.test.ts`

Expected: PASS (8 tests)

---

**Step 5: Commit**

```bash
git add src/domain/Employee/Email.ts tests/unit/domain/Employee/Email.test.ts
git commit -m "feat: add Email value object with validation"
```

---

### Task 3: PersonName Value Object

**Files:**

- Create: `src/domain/Employee/PersonName.ts`
- Test: `tests/unit/domain/Employee/PersonName.test.ts`

---

**Step 1: Write failing tests**

```typescript
// tests/unit/domain/Employee/PersonName.test.ts
import { describe, it, expect } from 'vitest';
import { PersonName } from '$domain/Employee/PersonName';
import { ValidationError } from '$domain/errors';

describe('PersonName', () => {
	describe('create', () => {
		it('creates name with valid first and last names', () => {
			const result = PersonName.create('John', 'Doe');

			expect(result.isOk).toBe(true);
			expect(result.value.first).toBe('John');
			expect(result.value.last).toBe('Doe');
		});

		it('trims whitespace from names', () => {
			const result = PersonName.create('  John  ', '  Doe  ');

			expect(result.value.first).toBe('John');
			expect(result.value.last).toBe('Doe');
		});

		it('returns error for empty first name', () => {
			const result = PersonName.create('', 'Doe');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(ValidationError);
			expect(result.error.message).toContain('First name cannot be empty');
		});

		it('returns error for empty last name', () => {
			const result = PersonName.create('John', '');

			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('Last name cannot be empty');
		});

		it('returns error for whitespace-only first name', () => {
			const result = PersonName.create('   ', 'Doe');

			expect(result.isError).toBe(true);
		});
	});

	describe('fullName', () => {
		it('formats as "First Last"', () => {
			const name = PersonName.create('John', 'Doe').value;

			expect(name.fullName).toBe('John Doe');
		});
	});

	describe('displayName', () => {
		it('formats as "Last, First"', () => {
			const name = PersonName.create('John', 'Doe').value;

			expect(name.displayName).toBe('Doe, John');
		});
	});
});
```

---

**Step 2: Run test to verify it fails**

Run: `npm run test tests/unit/domain/Employee/PersonName.test.ts`

Expected: FAIL with "Cannot find module '$domain/Employee/PersonName'"

---

**Step 3: Implement PersonName value object**

```typescript
// src/domain/Employee/PersonName.ts
import { Result } from '$domain/Result';
import { ValidationError } from '$domain/errors';

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

	equals(other: PersonName): boolean {
		return this.first === other.first && this.last === other.last;
	}
}
```

---

**Step 4: Run tests to verify they pass**

Run: `npm run test tests/unit/domain/Employee/PersonName.test.ts`

Expected: PASS (7 tests)

---

**Step 5: Commit**

```bash
git add src/domain/Employee/PersonName.ts tests/unit/domain/Employee/PersonName.test.ts
git commit -m "feat: add PersonName value object"
```

---

### Task 4: HireDate Value Object

**Files:**

- Create: `src/domain/Employee/HireDate.ts`
- Test: `tests/unit/domain/Employee/HireDate.test.ts`

---

**Step 1: Write failing tests**

```typescript
// tests/unit/domain/Employee/HireDate.test.ts
import { describe, it, expect } from 'vitest';
import { HireDate } from '$domain/Employee/HireDate';
import { InvalidHireDateError } from '$domain/errors';

describe('HireDate', () => {
	describe('create', () => {
		it('creates hire date from valid date string', () => {
			const result = HireDate.create('2020-01-15');

			expect(result.isOk).toBe(true);
			expect(result.value.value).toBeInstanceOf(Date);
		});

		it('creates hire date from Date object', () => {
			const date = new Date('2020-01-15');
			const result = HireDate.create(date);

			expect(result.isOk).toBe(true);
			expect(result.value.value).toEqual(date);
		});

		it('accepts hire date from yesterday', () => {
			const yesterday = new Date();
			yesterday.setDate(yesterday.getDate() - 1);
			const result = HireDate.create(yesterday);

			expect(result.isOk).toBe(true);
		});

		it('accepts hire date from today', () => {
			const today = new Date();
			const result = HireDate.create(today);

			expect(result.isOk).toBe(true);
		});

		it('returns error for future date', () => {
			const tomorrow = new Date();
			tomorrow.setDate(tomorrow.getDate() + 1);
			const result = HireDate.create(tomorrow);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidHireDateError);
			expect(result.error.message).toContain('cannot be in the future');
		});

		it('returns error for invalid date string', () => {
			const result = HireDate.create('not-a-date');

			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('Invalid date format');
		});
	});

	describe('isBefore', () => {
		it('returns true when this date is before other', () => {
			const date1 = HireDate.create('2020-01-01').value;
			const date2 = HireDate.create('2020-12-31').value;

			expect(date1.isBefore(date2)).toBe(true);
		});

		it('returns false when this date is after other', () => {
			const date1 = HireDate.create('2020-12-31').value;
			const date2 = HireDate.create('2020-01-01').value;

			expect(date1.isBefore(date2)).toBe(false);
		});
	});

	describe('getDaysEmployed', () => {
		it('calculates days from hire date to today', () => {
			const oneYearAgo = new Date();
			oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

			const hireDate = HireDate.create(oneYearAgo).value;
			const days = hireDate.getDaysEmployed();

			// Approximately 365 days (accounting for leap years)
			expect(days).toBeGreaterThanOrEqual(364);
			expect(days).toBeLessThanOrEqual(366);
		});
	});
});
```

---

**Step 2: Run test to verify it fails**

Run: `npm run test tests/unit/domain/Employee/HireDate.test.ts`

Expected: FAIL with "Cannot find module '$domain/Employee/HireDate'"

---

**Step 3: Implement HireDate value object**

```typescript
// src/domain/Employee/HireDate.ts
import { Result } from '$domain/Result';
import { InvalidHireDateError } from '$domain/errors';

export class HireDate {
	private constructor(public readonly value: Date) {}

	static create(date: string | Date): Result<HireDate, InvalidHireDateError> {
		const hireDate = typeof date === 'string' ? new Date(date) : date;

		if (isNaN(hireDate.getTime())) {
			return Result.error(new InvalidHireDateError('Invalid date format'));
		}

		// Compare dates without time component
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const hireDateNormalized = new Date(hireDate);
		hireDateNormalized.setHours(0, 0, 0, 0);

		if (hireDateNormalized > today) {
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

	equals(other: HireDate): boolean {
		return this.value.getTime() === other.value.getTime();
	}
}
```

---

**Step 4: Run tests to verify they pass**

Run: `npm run test tests/unit/domain/Employee/HireDate.test.ts`

Expected: PASS (10 tests)

---

**Step 5: Commit**

```bash
git add src/domain/Employee/HireDate.ts tests/unit/domain/Employee/HireDate.test.ts
git commit -m "feat: add HireDate value object with validation"
```

---

### Task 5: EmployeeStatus Value Object

**Files:**

- Create: `src/domain/Employee/EmployeeStatus.ts`
- Test: `tests/unit/domain/Employee/EmployeeStatus.test.ts`

---

**Step 1: Write failing tests**

```typescript
// tests/unit/domain/Employee/EmployeeStatus.test.ts
import { describe, it, expect } from 'vitest';
import { EmployeeStatus } from '$domain/Employee/EmployeeStatus';

describe('EmployeeStatus', () => {
	describe('Active', () => {
		it('has value "active"', () => {
			expect(EmployeeStatus.Active.value).toBe('active');
		});

		it('isActive returns true', () => {
			expect(EmployeeStatus.Active.isActive).toBe(true);
		});
	});

	describe('Inactive', () => {
		it('has value "inactive"', () => {
			expect(EmployeeStatus.Inactive.value).toBe('inactive');
		});

		it('isActive returns false', () => {
			expect(EmployeeStatus.Inactive.isActive).toBe(false);
		});
	});

	describe('equals', () => {
		it('returns true for same status', () => {
			expect(EmployeeStatus.Active.equals(EmployeeStatus.Active)).toBe(true);
		});

		it('returns false for different status', () => {
			expect(EmployeeStatus.Active.equals(EmployeeStatus.Inactive)).toBe(false);
		});
	});
});
```

---

**Step 2: Run test to verify it fails**

Run: `npm run test tests/unit/domain/Employee/EmployeeStatus.test.ts`

Expected: FAIL with "Cannot find module '$domain/Employee/EmployeeStatus'"

---

**Step 3: Implement EmployeeStatus value object**

```typescript
// src/domain/Employee/EmployeeStatus.ts

export class EmployeeStatus {
	private constructor(public readonly value: 'active' | 'inactive') {}

	static readonly Active = new EmployeeStatus('active');
	static readonly Inactive = new EmployeeStatus('inactive');

	get isActive(): boolean {
		return this.value === 'active';
	}

	equals(other: EmployeeStatus): boolean {
		return this.value === other.value;
	}

	toString(): string {
		return this.value;
	}
}
```

---

**Step 4: Run tests to verify they pass**

Run: `npm run test tests/unit/domain/Employee/EmployeeStatus.test.ts`

Expected: PASS (5 tests)

---

**Step 5: Commit**

```bash
git add src/domain/Employee/EmployeeStatus.ts tests/unit/domain/Employee/EmployeeStatus.test.ts
git commit -m "feat: add EmployeeStatus value object"
```

---

### Task 6: Employee Entity (Part 1: Creation)

**Files:**

- Create: `src/domain/Employee/Employee.ts`
- Create: `src/domain/Employee/types.ts`
- Test: `tests/unit/domain/Employee/Employee.test.ts`

---

**Step 1: Write failing tests for Employee creation**

```typescript
// tests/unit/domain/Employee/Employee.test.ts
import { describe, it, expect } from 'vitest';
import { Employee } from '$domain/Employee/Employee';
import type { CreateEmployeeData } from '$domain/Employee/types';

describe('Employee', () => {
	const validData: CreateEmployeeData = {
		id: '123e4567-e89b-12d3-a456-426614174000',
		email: 'john.doe@example.com',
		firstName: 'John',
		lastName: 'Doe',
		hireDate: '2020-01-15',
		departmentId: '123e4567-e89b-12d3-a456-426614174001',
		jobTitle: 'Software Engineer',
		phone: '+1234567890'
	};

	describe('create', () => {
		it('creates employee with valid data', () => {
			const result = Employee.create(validData);

			expect(result.isOk).toBe(true);
			expect(result.value.id).toBe(validData.id);
			expect(result.value.email.value).toBe('john.doe@example.com');
			expect(result.value.name.fullName).toBe('John Doe');
			expect(result.value.isActive).toBe(true);
		});

		it('normalizes email to lowercase', () => {
			const result = Employee.create({
				...validData,
				email: 'John.Doe@EXAMPLE.COM'
			});

			expect(result.value.email.value).toBe('john.doe@example.com');
		});

		it('returns error for invalid email', () => {
			const result = Employee.create({
				...validData,
				email: 'not-an-email'
			});

			expect(result.isError).toBe(true);
			expect(result.error.code).toBe('INVALID_EMAIL');
		});

		it('returns error for empty first name', () => {
			const result = Employee.create({
				...validData,
				firstName: ''
			});

			expect(result.isError).toBe(true);
		});

		it('returns error for future hire date', () => {
			const tomorrow = new Date();
			tomorrow.setDate(tomorrow.getDate() + 1);

			const result = Employee.create({
				...validData,
				hireDate: tomorrow.toISOString()
			});

			expect(result.isError).toBe(true);
			expect(result.error.code).toBe('INVALID_HIRE_DATE');
		});

		it('handles optional departmentId', () => {
			const result = Employee.create({
				...validData,
				departmentId: null
			});

			expect(result.isOk).toBe(true);
			expect(result.value.departmentId).toBe(null);
		});

		it('handles optional jobTitle', () => {
			const result = Employee.create({
				...validData,
				jobTitle: null
			});

			expect(result.value.jobTitle).toBe(null);
		});
	});

	describe('fullName', () => {
		it('returns formatted full name', () => {
			const employee = Employee.create(validData).value;

			expect(employee.fullName).toBe('John Doe');
		});
	});

	describe('isActive', () => {
		it('returns true for newly created employee', () => {
			const employee = Employee.create(validData).value;

			expect(employee.isActive).toBe(true);
		});
	});
});
```

---

**Step 2: Create type definitions**

```typescript
// src/domain/Employee/types.ts

export interface CreateEmployeeData {
	id: string;
	email: string;
	firstName: string;
	lastName: string;
	hireDate: string | Date;
	departmentId: string | null;
	jobTitle?: string | null;
	phone?: string | null;
}

export interface UpdateEmployeeData {
	email?: string;
	firstName?: string;
	lastName?: string;
	departmentId?: string | null;
	jobTitle?: string | null;
	phone?: string | null;
}
```

---

**Step 3: Run test to verify it fails**

Run: `npm run test tests/unit/domain/Employee/Employee.test.ts`

Expected: FAIL with "Cannot find module '$domain/Employee/Employee'"

---

**Step 4: Implement Employee entity (creation only)**

```typescript
// src/domain/Employee/Employee.ts
import { Result } from '$domain/Result';
import { DomainError } from '$domain/errors';
import { Email } from './Email';
import { PersonName } from './PersonName';
import { HireDate } from './HireDate';
import { EmployeeStatus } from './EmployeeStatus';
import type { CreateEmployeeData } from './types';

export class Employee {
	private constructor(
		public readonly id: string,
		public readonly email: Email,
		public readonly name: PersonName,
		public readonly hireDate: HireDate,
		private _status: EmployeeStatus,
		private _departmentId: string | null,
		private _jobTitle: string | null,
		private _phone: string | null
	) {}

	static create(data: CreateEmployeeData): Result<Employee, DomainError> {
		// Validate email
		const emailResult = Email.create(data.email);
		if (emailResult.isError) return Result.error(emailResult.error);

		// Validate name
		const nameResult = PersonName.create(data.firstName, data.lastName);
		if (nameResult.isError) return Result.error(nameResult.error);

		// Validate hire date
		const hireDateResult = HireDate.create(data.hireDate);
		if (hireDateResult.isError) return Result.error(hireDateResult.error);

		return Result.ok(
			new Employee(
				data.id,
				emailResult.value,
				nameResult.value,
				hireDateResult.value,
				EmployeeStatus.Active,
				data.departmentId ?? null,
				data.jobTitle ?? null,
				data.phone ?? null
			)
		);
	}

	// Getters
	get status(): string {
		return this._status.value;
	}

	get isActive(): boolean {
		return this._status.isActive;
	}

	get departmentId(): string | null {
		return this._departmentId;
	}

	get jobTitle(): string | null {
		return this._jobTitle;
	}

	get phone(): string | null {
		return this._phone;
	}

	get fullName(): string {
		return this.name.fullName;
	}

	get displayName(): string {
		return this.name.displayName;
	}
}
```

---

**Step 5: Run tests to verify they pass**

Run: `npm run test tests/unit/domain/Employee/Employee.test.ts`

Expected: PASS (9 tests)

---

**Step 6: Commit**

```bash
git add src/domain/Employee/Employee.ts src/domain/Employee/types.ts tests/unit/domain/Employee/Employee.test.ts
git commit -m "feat: add Employee entity with creation and validation"
```

---

### Task 7: Employee Entity (Part 2: Business Methods)

**Files:**

- Modify: `src/domain/Employee/Employee.ts:existing`
- Modify: `tests/unit/domain/Employee/Employee.test.ts:existing`

---

**Step 1: Write failing tests for business methods**

Append to Employee.test.ts:

```typescript
// tests/unit/domain/Employee/Employee.test.ts (append)

describe('deactivate', () => {
	it('sets status to inactive', () => {
		const employee = Employee.create(validData).value;
		const result = employee.deactivate();

		expect(result.isOk).toBe(true);
		expect(employee.isActive).toBe(false);
	});

	it('returns error when already inactive', () => {
		const employee = Employee.create(validData).value;
		employee.deactivate();
		const result = employee.deactivate();

		expect(result.isError).toBe(true);
		expect(result.error.code).toBe('EMPLOYEE_DEACTIVATION_FAILED');
	});
});

describe('activate', () => {
	it('sets status to active', () => {
		const employee = Employee.create(validData).value;
		employee.deactivate();
		const result = employee.activate();

		expect(result.isOk).toBe(true);
		expect(employee.isActive).toBe(true);
	});

	it('returns error when already active', () => {
		const employee = Employee.create(validData).value;
		const result = employee.activate();

		expect(result.isError).toBe(true);
	});
});

describe('changeDepartment', () => {
	it('updates department ID', () => {
		const employee = Employee.create(validData).value;
		const newDeptId = '123e4567-e89b-12d3-a456-426614174099';
		const result = employee.changeDepartment(newDeptId);

		expect(result.isOk).toBe(true);
		expect(employee.departmentId).toBe(newDeptId);
	});

	it('allows setting department to null', () => {
		const employee = Employee.create(validData).value;
		const result = employee.changeDepartment(null);

		expect(result.isOk).toBe(true);
		expect(employee.departmentId).toBe(null);
	});
});

describe('updateJobTitle', () => {
	it('updates job title', () => {
		const employee = Employee.create(validData).value;
		employee.updateJobTitle('Senior Engineer');

		expect(employee.jobTitle).toBe('Senior Engineer');
	});

	it('allows setting to null', () => {
		const employee = Employee.create(validData).value;
		employee.updateJobTitle(null);

		expect(employee.jobTitle).toBe(null);
	});
});
```

---

**Step 2: Run test to verify it fails**

Run: `npm run test tests/unit/domain/Employee/Employee.test.ts`

Expected: FAIL - methods not found

---

**Step 3: Implement business methods**

Add to Employee.ts:

```typescript
// src/domain/Employee/Employee.ts (add methods)

import { EmployeeDeactivationError } from '$domain/errors';

	deactivate(): Result<void, EmployeeDeactivationError> {
		if (!this._status.isActive) {
			return Result.error(
				new EmployeeDeactivationError(this.id, 'Employee is already inactive')
			);
		}
		this._status = EmployeeStatus.Inactive;
		return Result.ok(undefined);
	}

	activate(): Result<void, DomainError> {
		if (this._status.isActive) {
			return Result.error(
				new DomainError('Employee is already active', 'EMPLOYEE_ALREADY_ACTIVE', {
					employeeId: this.id
				})
			);
		}
		this._status = EmployeeStatus.Active;
		return Result.ok(undefined);
	}

	changeDepartment(departmentId: string | null): Result<void, DomainError> {
		this._departmentId = departmentId;
		return Result.ok(undefined);
	}

	updateJobTitle(jobTitle: string | null): void {
		this._jobTitle = jobTitle;
	}

	updatePhone(phone: string | null): void {
		this._phone = phone;
	}
```

---

**Step 4: Run tests to verify they pass**

Run: `npm run test tests/unit/domain/Employee/Employee.test.ts`

Expected: PASS (17 tests total)

---

**Step 5: Commit**

```bash
git add src/domain/Employee/Employee.ts tests/unit/domain/Employee/Employee.test.ts
git commit -m "feat: add Employee business methods (deactivate, activate, changeDepartment)"
```

---

### Task 8: Employee Test Factory

**Files:**

- Modify: `tests/helpers/factories.ts:existing`
- Test: `tests/helpers/factories.test.ts`

---

**Step 1: Write failing tests for EmployeeFactory**

```typescript
// tests/helpers/factories.test.ts
import { describe, it, expect } from 'vitest';
import { EmployeeFactory } from './factories';

describe('EmployeeFactory', () => {
	describe('create', () => {
		it('creates employee with generated data', () => {
			const employee = EmployeeFactory.create();

			expect(employee.id).toBeTruthy();
			expect(employee.email.value).toMatch(/@/);
			expect(employee.fullName).toBeTruthy();
			expect(employee.isActive).toBe(true);
		});

		it('allows overriding email', () => {
			const employee = EmployeeFactory.create({
				email: 'test@example.com'
			});

			expect(employee.email.value).toBe('test@example.com');
		});

		it('allows overriding name', () => {
			const employee = EmployeeFactory.create({
				firstName: 'Alice',
				lastName: 'Smith'
			});

			expect(employee.fullName).toBe('Alice Smith');
		});
	});

	describe('createMany', () => {
		it('creates multiple employees', () => {
			const employees = EmployeeFactory.createMany(5);

			expect(employees).toHaveLength(5);
			expect(employees[0].id).not.toBe(employees[1].id);
		});
	});

	describe('createInactive', () => {
		it('creates inactive employee', () => {
			const employee = EmployeeFactory.createInactive();

			expect(employee.isActive).toBe(false);
		});
	});
});
```

---

**Step 2: Run test to verify it fails**

Run: `npm run test tests/helpers/factories.test.ts`

Expected: FAIL - EmployeeFactory not found

---

**Step 3: Implement EmployeeFactory**

Append to factories.ts:

```typescript
// tests/helpers/factories.ts (append)
import { faker } from '@faker-js/faker';
import { Employee } from '$domain/Employee/Employee';
import type { CreateEmployeeData } from '$domain/Employee/types';

export class EmployeeFactory {
	static create(overrides?: Partial<CreateEmployeeData>): Employee {
		const data: CreateEmployeeData = {
			id: faker.string.uuid(),
			email: faker.internet.email(),
			firstName: faker.person.firstName(),
			lastName: faker.person.lastName(),
			hireDate: faker.date.past({ years: 5 }),
			departmentId: faker.string.uuid(),
			jobTitle: faker.person.jobTitle(),
			phone: faker.phone.number(),
			...overrides
		};

		const result = Employee.create(data);
		if (result.isError) {
			throw new Error(`Failed to create employee: ${result.error.message}`);
		}

		return result.value;
	}

	static createMany(count: number, overrides?: Partial<CreateEmployeeData>): Employee[] {
		return Array.from({ length: count }, () => this.create(overrides));
	}

	static createInactive(overrides?: Partial<CreateEmployeeData>): Employee {
		const employee = this.create(overrides);
		employee.deactivate();
		return employee;
	}

	static createWithDepartment(
		departmentId: string,
		overrides?: Partial<CreateEmployeeData>
	): Employee {
		return this.create({ ...overrides, departmentId });
	}
}
```

---

**Step 4: Run tests to verify they pass**

Run: `npm run test tests/helpers/factories.test.ts`

Expected: PASS (5 tests)

---

**Step 5: Commit**

```bash
git add tests/helpers/factories.ts tests/helpers/factories.test.ts
git commit -m "feat: add EmployeeFactory for test data generation"
```

---

---

### Task 9: EmployeeRepository Port Interface

**Files:**

- Create: `src/services/ports/EmployeeRepository.ts`
- Test: `tests/unit/services/ports/EmployeeRepository.test.ts`

---

**Step 1: Write port interface**

```typescript
// src/services/ports/EmployeeRepository.ts
import type { Employee } from '$domain/Employee/Employee';
import type { Result } from '$domain/Result';
import type { DomainError } from '$domain/errors';

export interface EmployeeFilters {
	departmentId?: string;
	isActive?: boolean;
	searchTerm?: string;
}

export interface EmployeeRepository {
	findById(id: string): Promise<Employee | null>;
	findByEmail(email: string): Promise<Employee | null>;
	findAll(filters?: EmployeeFilters): Promise<Employee[]>;
	save(employee: Employee): Promise<Employee>;
	update(id: string, employee: Employee): Promise<Employee>;
	delete(id: string): Promise<void>;
	exists(id: string): Promise<boolean>;
}
```

---

**Step 2: Commit**

```bash
git add src/services/ports/EmployeeRepository.ts
git commit -m "feat: add EmployeeRepository port interface"
```

---

### Task 10: Mock EmployeeRepository

**Files:**

- Create: `src/adapters/MockEmployeeRepository.ts`
- Test: `tests/unit/adapters/MockEmployeeRepository.test.ts`

---

**Step 1: Write failing tests**

```typescript
// tests/unit/adapters/MockEmployeeRepository.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { MockEmployeeRepository } from '$adapters/MockEmployeeRepository';
import { EmployeeFactory } from '../../../helpers/factories';

describe('MockEmployeeRepository', () => {
	let repo: MockEmployeeRepository;

	beforeEach(() => {
		repo = new MockEmployeeRepository();
	});

	describe('save', () => {
		it('stores employee', async () => {
			const employee = EmployeeFactory.create();
			const saved = await repo.save(employee);

			expect(saved).toBe(employee);
		});
	});

	describe('findById', () => {
		it('returns employee when found', async () => {
			const employee = EmployeeFactory.create();
			await repo.save(employee);

			const found = await repo.findById(employee.id);

			expect(found).toBe(employee);
		});

		it('returns null when not found', async () => {
			const found = await repo.findById('nonexistent-id');

			expect(found).toBe(null);
		});
	});

	describe('findByEmail', () => {
		it('returns employee with matching email', async () => {
			const employee = EmployeeFactory.create({ email: 'test@example.com' });
			await repo.save(employee);

			const found = await repo.findByEmail('test@example.com');

			expect(found).toBe(employee);
		});

		it('returns null when not found', async () => {
			const found = await repo.findByEmail('nonexistent@example.com');

			expect(found).toBe(null);
		});
	});

	describe('findAll', () => {
		it('returns all employees', async () => {
			const employees = EmployeeFactory.createMany(3);
			for (const emp of employees) {
				await repo.save(emp);
			}

			const found = await repo.findAll();

			expect(found).toHaveLength(3);
		});

		it('filters by departmentId', async () => {
			const dept1 = EmployeeFactory.createWithDepartment('dept-1');
			const dept2 = EmployeeFactory.createWithDepartment('dept-2');
			await repo.save(dept1);
			await repo.save(dept2);

			const found = await repo.findAll({ departmentId: 'dept-1' });

			expect(found).toHaveLength(1);
			expect(found[0].id).toBe(dept1.id);
		});

		it('filters by isActive', async () => {
			const active = EmployeeFactory.create();
			const inactive = EmployeeFactory.createInactive();
			await repo.save(active);
			await repo.save(inactive);

			const found = await repo.findAll({ isActive: true });

			expect(found).toHaveLength(1);
			expect(found[0].id).toBe(active.id);
		});
	});

	describe('exists', () => {
		it('returns true when employee exists', async () => {
			const employee = EmployeeFactory.create();
			await repo.save(employee);

			const exists = await repo.exists(employee.id);

			expect(exists).toBe(true);
		});

		it('returns false when employee does not exist', async () => {
			const exists = await repo.exists('nonexistent-id');

			expect(exists).toBe(false);
		});
	});

	describe('delete', () => {
		it('removes employee', async () => {
			const employee = EmployeeFactory.create();
			await repo.save(employee);

			await repo.delete(employee.id);
			const found = await repo.findById(employee.id);

			expect(found).toBe(null);
		});
	});
});
```

---

**Step 2: Run test to verify it fails**

Run: `npm run test tests/unit/adapters/MockEmployeeRepository.test.ts`

Expected: FAIL with "Cannot find module"

---

**Step 3: Implement MockEmployeeRepository**

```typescript
// src/adapters/MockEmployeeRepository.ts
import type { Employee } from '$domain/Employee/Employee';
import type { EmployeeRepository, EmployeeFilters } from '$services/ports/EmployeeRepository';

export class MockEmployeeRepository implements EmployeeRepository {
	private employees = new Map<string, Employee>();

	async findById(id: string): Promise<Employee | null> {
		return this.employees.get(id) ?? null;
	}

	async findByEmail(email: string): Promise<Employee | null> {
		for (const employee of this.employees.values()) {
			if (employee.email.value === email) {
				return employee;
			}
		}
		return null;
	}

	async findAll(filters?: EmployeeFilters): Promise<Employee[]> {
		let results = Array.from(this.employees.values());

		if (filters?.departmentId) {
			results = results.filter((emp) => emp.departmentId === filters.departmentId);
		}

		if (filters?.isActive !== undefined) {
			results = results.filter((emp) => emp.isActive === filters.isActive);
		}

		if (filters?.searchTerm) {
			const term = filters.searchTerm.toLowerCase();
			results = results.filter(
				(emp) =>
					emp.fullName.toLowerCase().includes(term) || emp.email.value.toLowerCase().includes(term)
			);
		}

		return results;
	}

	async save(employee: Employee): Promise<Employee> {
		this.employees.set(employee.id, employee);
		return employee;
	}

	async update(id: string, employee: Employee): Promise<Employee> {
		this.employees.set(id, employee);
		return employee;
	}

	async delete(id: string): Promise<void> {
		this.employees.delete(id);
	}

	async exists(id: string): Promise<boolean> {
		return this.employees.has(id);
	}

	// Test helpers
	clear(): void {
		this.employees.clear();
	}

	count(): number {
		return this.employees.size;
	}
}
```

---

**Step 4: Run tests to verify they pass**

Run: `npm run test tests/unit/adapters/MockEmployeeRepository.test.ts`

Expected: PASS (11 tests)

---

**Step 5: Commit**

```bash
git add src/adapters/MockEmployeeRepository.ts tests/unit/adapters/MockEmployeeRepository.test.ts
git commit -m "feat: add MockEmployeeRepository for testing"
```

---

### Task 11: EmployeeService (Part 1: CRUD)

**Files:**

- Create: `src/services/EmployeeService.ts`
- Test: `tests/unit/services/EmployeeService.test.ts`

---

**Step 1: Write failing tests for getEmployeeById**

```typescript
// tests/unit/services/EmployeeService.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { EmployeeService } from '$services/EmployeeService';
import { MockEmployeeRepository } from '$adapters/MockEmployeeRepository';
import { EmployeeFactory } from '../../helpers/factories';
import { EmployeeNotFoundError } from '$domain/errors';

describe('EmployeeService', () => {
	let service: EmployeeService;
	let repo: MockEmployeeRepository;

	beforeEach(() => {
		repo = new MockEmployeeRepository();
		service = new EmployeeService(repo);
	});

	describe('getEmployeeById', () => {
		it('returns employee when found', async () => {
			const employee = EmployeeFactory.create();
			await repo.save(employee);

			const result = await service.getEmployeeById(employee.id);

			expect(result.isOk).toBe(true);
			expect(result.value.id).toBe(employee.id);
		});

		it('returns error when not found', async () => {
			const result = await service.getEmployeeById('nonexistent-id');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(EmployeeNotFoundError);
			expect(result.error.code).toBe('EMPLOYEE_NOT_FOUND');
		});
	});

	describe('getEmployees', () => {
		it('returns all employees', async () => {
			const employees = EmployeeFactory.createMany(3);
			for (const emp of employees) {
				await repo.save(emp);
			}

			const result = await service.getEmployees();

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(3);
		});

		it('filters by departmentId', async () => {
			const dept1 = EmployeeFactory.createWithDepartment('dept-1');
			const dept2 = EmployeeFactory.createWithDepartment('dept-2');
			await repo.save(dept1);
			await repo.save(dept2);

			const result = await service.getEmployees({ departmentId: 'dept-1' });

			expect(result.value).toHaveLength(1);
			expect(result.value[0].id).toBe(dept1.id);
		});

		it('filters by active status', async () => {
			const active = EmployeeFactory.create();
			const inactive = EmployeeFactory.createInactive();
			await repo.save(active);
			await repo.save(inactive);

			const result = await service.getEmployees({ isActive: true });

			expect(result.value).toHaveLength(1);
			expect(result.value[0].id).toBe(active.id);
		});
	});

	describe('createEmployee', () => {
		it('creates and saves employee', async () => {
			const data = {
				id: '123e4567-e89b-12d3-a456-426614174000',
				email: 'new@example.com',
				firstName: 'New',
				lastName: 'Employee',
				hireDate: '2023-01-01',
				departmentId: 'dept-1',
				jobTitle: 'Engineer',
				phone: null
			};

			const result = await service.createEmployee(data);

			expect(result.isOk).toBe(true);
			expect(result.value.email.value).toBe('new@example.com');

			// Verify saved
			const saved = await repo.findById(data.id);
			expect(saved).not.toBe(null);
		});

		it('returns error for duplicate email', async () => {
			const existing = EmployeeFactory.create({ email: 'duplicate@example.com' });
			await repo.save(existing);

			const result = await service.createEmployee({
				id: '123e4567-e89b-12d3-a456-426614174099',
				email: 'duplicate@example.com',
				firstName: 'Test',
				lastName: 'User',
				hireDate: '2023-01-01',
				departmentId: null,
				jobTitle: null,
				phone: null
			});

			expect(result.isError).toBe(true);
			expect(result.error.code).toBe('EMPLOYEE_ALREADY_EXISTS');
		});

		it('returns error for invalid email', async () => {
			const result = await service.createEmployee({
				id: '123e4567-e89b-12d3-a456-426614174000',
				email: 'not-an-email',
				firstName: 'Test',
				lastName: 'User',
				hireDate: '2023-01-01',
				departmentId: null,
				jobTitle: null,
				phone: null
			});

			expect(result.isError).toBe(true);
			expect(result.error.code).toBe('INVALID_EMAIL');
		});
	});

	describe('updateEmployee', () => {
		it('updates employee fields', async () => {
			const employee = EmployeeFactory.create();
			await repo.save(employee);

			const result = await service.updateEmployee(employee.id, {
				jobTitle: 'Senior Engineer'
			});

			expect(result.isOk).toBe(true);
			expect(result.value.jobTitle).toBe('Senior Engineer');
		});

		it('returns error when employee not found', async () => {
			const result = await service.updateEmployee('nonexistent-id', {
				jobTitle: 'Engineer'
			});

			expect(result.isError).toBe(true);
			expect(result.error.code).toBe('EMPLOYEE_NOT_FOUND');
		});
	});

	describe('deleteEmployee', () => {
		it('soft deletes employee (sets inactive)', async () => {
			const employee = EmployeeFactory.create();
			await repo.save(employee);

			const result = await service.deleteEmployee(employee.id);

			expect(result.isOk).toBe(true);

			const found = await repo.findById(employee.id);
			expect(found?.isActive).toBe(false);
		});

		it('returns error when employee not found', async () => {
			const result = await service.deleteEmployee('nonexistent-id');

			expect(result.isError).toBe(true);
			expect(result.error.code).toBe('EMPLOYEE_NOT_FOUND');
		});
	});
});
```

---

**Step 2: Run test to verify it fails**

Run: `npm run test tests/unit/services/EmployeeService.test.ts`

Expected: FAIL with "Cannot find module"

---

**Step 3: Implement EmployeeService**

```typescript
// src/services/EmployeeService.ts
import type { Employee } from '$domain/Employee/Employee';
import { Employee as EmployeeClass } from '$domain/Employee/Employee';
import type { CreateEmployeeData, UpdateEmployeeData } from '$domain/Employee/types';
import type { EmployeeRepository, EmployeeFilters } from './ports/EmployeeRepository';
import { Result } from '$domain/Result';
import { EmployeeNotFoundError, EmployeeAlreadyExistsError, DomainError } from '$domain/errors';

export class EmployeeService {
	constructor(private readonly employeeRepo: EmployeeRepository) {}

	async getEmployeeById(id: string): Promise<Result<Employee, EmployeeNotFoundError>> {
		const employee = await this.employeeRepo.findById(id);

		if (!employee) {
			return Result.error(new EmployeeNotFoundError(id));
		}

		return Result.ok(employee);
	}

	async getEmployees(filters?: EmployeeFilters): Promise<Result<Employee[], DomainError>> {
		try {
			const employees = await this.employeeRepo.findAll(filters);
			return Result.ok(employees);
		} catch (error) {
			return Result.error(
				new DomainError('Failed to fetch employees', 'EMPLOYEES_FETCH_FAILED', { error })
			);
		}
	}

	async createEmployee(data: CreateEmployeeData): Promise<Result<Employee, DomainError>> {
		// Check for duplicate email
		const existing = await this.employeeRepo.findByEmail(data.email);
		if (existing) {
			return Result.error(new EmployeeAlreadyExistsError(data.email));
		}

		// Create domain entity (validates business rules)
		const employeeResult = EmployeeClass.create(data);
		if (employeeResult.isError) {
			return Result.error(employeeResult.error);
		}

		// Save via repository
		try {
			const saved = await this.employeeRepo.save(employeeResult.value);
			return Result.ok(saved);
		} catch (error) {
			return Result.error(
				new DomainError('Failed to create employee', 'EMPLOYEE_CREATE_FAILED', { error })
			);
		}
	}

	async updateEmployee(
		id: string,
		updates: UpdateEmployeeData
	): Promise<Result<Employee, DomainError>> {
		const employeeResult = await this.getEmployeeById(id);
		if (employeeResult.isError) {
			return Result.error(employeeResult.error);
		}

		const employee = employeeResult.value;

		// Apply updates
		if (updates.jobTitle !== undefined) {
			employee.updateJobTitle(updates.jobTitle);
		}

		if (updates.phone !== undefined) {
			employee.updatePhone(updates.phone);
		}

		if (updates.departmentId !== undefined) {
			const result = employee.changeDepartment(updates.departmentId);
			if (result.isError) {
				return Result.error(result.error);
			}
		}

		// Save updated employee
		try {
			const updated = await this.employeeRepo.update(id, employee);
			return Result.ok(updated);
		} catch (error) {
			return Result.error(
				new DomainError('Failed to update employee', 'EMPLOYEE_UPDATE_FAILED', { error })
			);
		}
	}

	async deleteEmployee(id: string): Promise<Result<void, DomainError>> {
		const employeeResult = await this.getEmployeeById(id);
		if (employeeResult.isError) {
			return Result.error(employeeResult.error);
		}

		const employee = employeeResult.value;

		// Soft delete - deactivate employee
		const deactivateResult = employee.deactivate();
		if (deactivateResult.isError) {
			return Result.error(deactivateResult.error);
		}

		// Save deactivated state
		try {
			await this.employeeRepo.update(id, employee);
			return Result.ok(undefined);
		} catch (error) {
			return Result.error(
				new DomainError('Failed to delete employee', 'EMPLOYEE_DELETE_FAILED', { error })
			);
		}
	}
}
```

---

**Step 4: Run tests to verify they pass**

Run: `npm run test tests/unit/services/EmployeeService.test.ts`

Expected: PASS (12 tests)

---

**Step 5: Commit**

```bash
git add src/services/EmployeeService.ts tests/unit/services/EmployeeService.test.ts
git commit -m "feat: add EmployeeService with CRUD operations"
```

---

### Task 12: GraphQLEmployeeAdapter

**Files:**

- Create: `src/adapters/GraphQLEmployeeAdapter.ts`
- Test: `tests/unit/adapters/GraphQLEmployeeAdapter.test.ts`

---

**Step 1: Write failing tests**

```typescript
// tests/unit/adapters/GraphQLEmployeeAdapter.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GraphQLEmployeeAdapter } from '$adapters/GraphQLEmployeeAdapter';
import { EmployeeNotFoundError } from '$domain/errors';
import type { GraphQLPort } from '$services/ports/GraphQLPort';

describe('GraphQLEmployeeAdapter', () => {
	let adapter: GraphQLEmployeeAdapter;
	let mockGraphQL: GraphQLPort;

	beforeEach(() => {
		mockGraphQL = {
			query: vi.fn(),
			mutate: vi.fn()
		};
		adapter = new GraphQLEmployeeAdapter(mockGraphQL);
	});

	describe('findById', () => {
		it('queries GraphQL and maps to domain entity', async () => {
			const mockUser = {
				id: '123',
				email: 'john@example.com',
				firstName: 'John',
				lastName: 'Doe',
				hireDate: '2020-01-15',
				departmentId: 'dept-1',
				jobTitle: 'Engineer',
				phone: '+1234567890',
				isActive: true
			};

			vi.mocked(mockGraphQL.query).mockResolvedValue({
				user: mockUser
			});

			const employee = await adapter.findById('123');

			expect(employee).not.toBe(null);
			expect(employee?.id).toBe('123');
			expect(employee?.email.value).toBe('john@example.com');
			expect(employee?.fullName).toBe('John Doe');
		});

		it('returns null when user not found', async () => {
			vi.mocked(mockGraphQL.query).mockResolvedValue({
				user: null
			});

			const employee = await adapter.findById('nonexistent');

			expect(employee).toBe(null);
		});

		it('handles GraphQL errors', async () => {
			vi.mocked(mockGraphQL.query).mockRejectedValue(new Error('Network error'));

			await expect(adapter.findById('123')).rejects.toThrow('Network error');
		});
	});

	describe('findByEmail', () => {
		it('queries GraphQL with email filter', async () => {
			const mockUsers = [
				{
					id: '123',
					email: 'john@example.com',
					firstName: 'John',
					lastName: 'Doe',
					hireDate: '2020-01-15',
					departmentId: null,
					jobTitle: null,
					phone: null,
					isActive: true
				}
			];

			vi.mocked(mockGraphQL.query).mockResolvedValue({
				users: mockUsers
			});

			const employee = await adapter.findByEmail('john@example.com');

			expect(employee).not.toBe(null);
			expect(employee?.email.value).toBe('john@example.com');
		});
	});

	describe('save', () => {
		it('calls createUser mutation', async () => {
			const mockUser = {
				id: '123',
				email: 'new@example.com',
				firstName: 'New',
				lastName: 'User',
				hireDate: '2023-01-01',
				departmentId: null,
				jobTitle: null,
				phone: null,
				isActive: true
			};

			vi.mocked(mockGraphQL.mutate).mockResolvedValue({
				createUser: mockUser
			});

			const employeeData = {
				id: '123',
				email: 'new@example.com',
				firstName: 'New',
				lastName: 'User',
				hireDate: '2023-01-01',
				departmentId: null,
				jobTitle: null,
				phone: null
			};

			const employee = await import('$domain/Employee/Employee').then((m) =>
				m.Employee.create(employeeData)
			);

			const saved = await adapter.save(employee.value);

			expect(saved.id).toBe('123');
			expect(vi.mocked(mockGraphQL.mutate)).toHaveBeenCalled();
		});
	});
});
```

---

**Step 2: Run test to verify it fails**

Run: `npm run test tests/unit/adapters/GraphQLEmployeeAdapter.test.ts`

Expected: FAIL with "Cannot find module"

---

**Step 3: Implement GraphQLEmployeeAdapter**

```typescript
// src/adapters/GraphQLEmployeeAdapter.ts
import type { Employee } from '$domain/Employee/Employee';
import { Employee as EmployeeClass } from '$domain/Employee/Employee';
import type { EmployeeRepository, EmployeeFilters } from '$services/ports/EmployeeRepository';
import type { GraphQLPort } from '$services/ports/GraphQLPort';

const GET_EMPLOYEE_BY_ID = `
	query GetEmployeeById($id: UUID!) {
		user(id: $id) {
			id
			email
			firstName
			lastName
			hireDate
			departmentId
			jobTitle
			phone
			isActive
		}
	}
`;

const GET_EMPLOYEES = `
	query GetEmployees($limit: Int, $offset: Int) {
		users(limit: $limit, offset: $offset) {
			id
			email
			firstName
			lastName
			hireDate
			departmentId
			jobTitle
			phone
			isActive
		}
	}
`;

const CREATE_EMPLOYEE = `
	mutation CreateEmployee($input: CreateUserInput!) {
		createUser(input: $input) {
			id
			email
			firstName
			lastName
			hireDate
			departmentId
			jobTitle
			phone
			isActive
		}
	}
`;

const UPDATE_EMPLOYEE = `
	mutation UpdateEmployee($id: UUID!, $input: UpdateUserInput!) {
		updateUser(id: $id, input: $input) {
			id
			email
			firstName
			lastName
			hireDate
			departmentId
			jobTitle
			phone
			isActive
		}
	}
`;

interface GraphQLUser {
	id: string;
	email: string;
	firstName: string;
	lastName: string;
	hireDate: string;
	departmentId: string | null;
	jobTitle: string | null;
	phone: string | null;
	isActive: boolean;
}

export class GraphQLEmployeeAdapter implements EmployeeRepository {
	constructor(private readonly graphql: GraphQLPort) {}

	async findById(id: string): Promise<Employee | null> {
		try {
			const result = await this.graphql.query<{ user: GraphQLUser | null }>(GET_EMPLOYEE_BY_ID, {
				id
			});

			if (!result.user) {
				return null;
			}

			return this.mapToEmployee(result.user);
		} catch (error) {
			throw error;
		}
	}

	async findByEmail(email: string): Promise<Employee | null> {
		try {
			const result = await this.graphql.query<{ users: GraphQLUser[] }>(GET_EMPLOYEES, {
				limit: 10000,
				offset: 0
			});

			const user = result.users.find((u) => u.email.toLowerCase() === email.toLowerCase());

			if (!user) {
				return null;
			}

			return this.mapToEmployee(user);
		} catch (error) {
			throw error;
		}
	}

	async findAll(filters?: EmployeeFilters): Promise<Employee[]> {
		try {
			const result = await this.graphql.query<{ users: GraphQLUser[] }>(GET_EMPLOYEES, {
				limit: 10000,
				offset: 0
			});

			let employees = await Promise.all(result.users.map((u) => this.mapToEmployee(u)));

			// Client-side filtering (backend doesn't support filters yet)
			if (filters?.departmentId) {
				employees = employees.filter((emp) => emp.departmentId === filters.departmentId);
			}

			if (filters?.isActive !== undefined) {
				employees = employees.filter((emp) => emp.isActive === filters.isActive);
			}

			if (filters?.searchTerm) {
				const term = filters.searchTerm.toLowerCase();
				employees = employees.filter(
					(emp) =>
						emp.fullName.toLowerCase().includes(term) ||
						emp.email.value.toLowerCase().includes(term)
				);
			}

			return employees;
		} catch (error) {
			throw error;
		}
	}

	async save(employee: Employee): Promise<Employee> {
		try {
			const input = {
				email: employee.email.value,
				firstName: employee.name.first,
				lastName: employee.name.last,
				hireDate: employee.hireDate.value.toISOString(),
				departmentId: employee.departmentId,
				jobTitle: employee.jobTitle,
				phone: employee.phone
			};

			const result = await this.graphql.mutate<{ createUser: GraphQLUser }>(CREATE_EMPLOYEE, {
				input
			});

			return this.mapToEmployee(result.createUser);
		} catch (error) {
			throw error;
		}
	}

	async update(id: string, employee: Employee): Promise<Employee> {
		try {
			const input = {
				email: employee.email.value,
				firstName: employee.name.first,
				lastName: employee.name.last,
				departmentId: employee.departmentId,
				jobTitle: employee.jobTitle,
				phone: employee.phone,
				isActive: employee.isActive
			};

			const result = await this.graphql.mutate<{ updateUser: GraphQLUser }>(UPDATE_EMPLOYEE, {
				id,
				input
			});

			return this.mapToEmployee(result.updateUser);
		} catch (error) {
			throw error;
		}
	}

	async delete(id: string): Promise<void> {
		// Soft delete handled by update with isActive = false
		// Not implementing hard delete
		throw new Error('Use update with isActive=false for soft delete');
	}

	async exists(id: string): Promise<boolean> {
		const employee = await this.findById(id);
		return employee !== null;
	}

	private async mapToEmployee(user: GraphQLUser): Promise<Employee> {
		const employeeResult = EmployeeClass.create({
			id: user.id,
			email: user.email,
			firstName: user.firstName,
			lastName: user.lastName,
			hireDate: user.hireDate,
			departmentId: user.departmentId,
			jobTitle: user.jobTitle,
			phone: user.phone
		});

		if (employeeResult.isError) {
			throw employeeResult.error;
		}

		const employee = employeeResult.value;

		// Set status based on GraphQL isActive
		if (!user.isActive && employee.isActive) {
			employee.deactivate();
		}

		return employee;
	}
}
```

---

**Step 4: Run tests to verify they pass**

Run: `npm run test tests/unit/adapters/GraphQLEmployeeAdapter.test.ts`

Expected: PASS (5 tests)

---

**Step 5: Commit**

```bash
git add src/adapters/GraphQLEmployeeAdapter.ts tests/unit/adapters/GraphQLEmployeeAdapter.test.ts
git commit -m "feat: add GraphQLEmployeeAdapter for employee persistence"
```

---

### Task 13: Integrate EmployeeService with Container

**Files:**

- Modify: `src/services/Container.ts:existing`
- Modify: `tests/unit/services/Container.test.ts:existing`

---

**Step 1: Write failing tests**

Append to Container.test.ts:

```typescript
// tests/unit/services/Container.test.ts (append)

describe('employeeService', () => {
	it('provides EmployeeService instance', () => {
		const container = Container.getInstance();

		expect(container.employeeService).toBeDefined();
		expect(container.employeeService).toBeInstanceOf(EmployeeService);
	});

	it('uses test employee repository', () => {
		const container = Container.createTest();

		expect(container.employeeService).toBeDefined();
	});
});
```

---

**Step 2: Run test to verify it fails**

Run: `npm run test tests/unit/services/Container.test.ts`

Expected: FAIL - employeeService not defined

---

**Step 3: Update Container**

```typescript
// src/services/Container.ts (add to existing)

import { EmployeeService } from './EmployeeService';
import type { EmployeeRepository } from './ports/EmployeeRepository';
import { MockEmployeeRepository } from '$adapters/MockEmployeeRepository';

export class Container {
	private static instance: Container | null = null;

	public readonly graphql: GraphQLPort;
	public readonly auth: AuthPort;
	public readonly storage: StoragePort;
	public readonly employeeService: EmployeeService; // Add this

	private constructor(deps: {
		graphql: GraphQLPort;
		auth: AuthPort;
		storage: StoragePort;
		employeeRepo: EmployeeRepository; // Add this
	}) {
		this.graphql = deps.graphql;
		this.auth = deps.auth;
		this.storage = deps.storage;
		this.employeeService = new EmployeeService(deps.employeeRepo); // Add this
	}

	static getInstance(): Container {
		if (!Container.instance) {
			Container.instance = Container.createTest();
		}
		return Container.instance;
	}

	static createTest(
		overrides?: Partial<{
			graphql: GraphQLPort;
			auth: AuthPort;
			storage: StoragePort;
			employeeRepo: EmployeeRepository; // Add this
		}>
	): Container {
		return new Container({
			graphql: overrides?.graphql ?? new MockGraphQLAdapter(),
			auth: overrides?.auth ?? new MockAuthAdapter(),
			storage: overrides?.storage ?? new MockStorageAdapter(),
			employeeRepo: overrides?.employeeRepo ?? new MockEmployeeRepository() // Add this
		});
	}

	static reset(): void {
		Container.instance = null;
	}
}
```

---

**Step 4: Run tests to verify they pass**

Run: `npm run test tests/unit/services/Container.test.ts`

Expected: PASS (6 tests total)

---

**Step 5: Commit**

```bash
git add src/services/Container.ts tests/unit/services/Container.test.ts
git commit -m "feat: integrate EmployeeService into DI Container"
```

---

### Task 14: Export Domain Employee Module

**Files:**

- Create: `src/domain/Employee/index.ts`

---

**Step 1: Create barrel export**

```typescript
// src/domain/Employee/index.ts
export { Employee } from './Employee';
export { Email } from './Email';
export { PersonName } from './PersonName';
export { HireDate } from './HireDate';
export { EmployeeStatus } from './EmployeeStatus';
export type { CreateEmployeeData, UpdateEmployeeData } from './types';
```

---

**Step 2: Commit**

```bash
git add src/domain/Employee/index.ts
git commit -m "feat: add Employee module barrel export"
```

---

## Week 2 Summary

After completing Tasks 1-14, you will have:

**Domain Layer:**

- ✅ Result type pattern
- ✅ 7 employee domain errors
- ✅ 5 value objects (Email, PersonName, HireDate, EmployeeStatus, DepartmentId)
- ✅ Employee entity with creation and business methods
- ✅ 40+ domain tests (100% coverage)

**Service Layer:**

- ✅ EmployeeRepository port interface
- ✅ EmployeeService with full CRUD
- ✅ 12+ service tests

**Adapter Layer:**

- ✅ MockEmployeeRepository for testing
- ✅ GraphQLEmployeeAdapter for production
- ✅ 16+ adapter tests

**Infrastructure:**

- ✅ Employee test factory
- ✅ Integration with DI Container
- ✅ **70+ tests passing, 0 failures**

**Status:** Parallel architecture complete. Ready to migrate routes in Week 3.

---

## WEEK 3: Migrate Simple Routes

### Task 15: Integration Tests for Detail View

**Files:**

- Create: `tests/integration/employees/detail-view.test.ts`

---

**Step 1: Write integration tests**

```typescript
// tests/integration/employees/detail-view.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { Container } from '$services/Container';
import { EmployeeFactory } from '../../helpers/factories';
import type { EmployeeService } from '$services/EmployeeService';

describe('Employee Detail View Integration', () => {
	let container: Container;
	let employeeService: EmployeeService;

	beforeEach(() => {
		Container.reset();
		container = Container.createTest();
		employeeService = container.employeeService;
	});

	it('loads employee by ID successfully', async () => {
		// Arrange: Create employee
		const employee = EmployeeFactory.create();
		await employeeService.createEmployee({
			id: employee.id,
			email: employee.email.value,
			firstName: employee.name.first,
			lastName: employee.name.last,
			hireDate: employee.hireDate.value.toISOString(),
			departmentId: employee.departmentId,
			jobTitle: employee.jobTitle,
			phone: employee.phone
		});

		// Act: Load employee
		const result = await employeeService.getEmployeeById(employee.id);

		// Assert: Returns employee
		expect(result.isOk).toBe(true);
		expect(result.value.id).toBe(employee.id);
		expect(result.value.fullName).toBe(employee.fullName);
	});

	it('returns error for nonexistent employee', async () => {
		const result = await employeeService.getEmployeeById('nonexistent-id');

		expect(result.isError).toBe(true);
		expect(result.error.code).toBe('EMPLOYEE_NOT_FOUND');
	});

	it('displays employee full name', async () => {
		const employee = EmployeeFactory.create({
			firstName: 'Jane',
			lastName: 'Smith'
		});

		await employeeService.createEmployee({
			id: employee.id,
			email: employee.email.value,
			firstName: 'Jane',
			lastName: 'Smith',
			hireDate: employee.hireDate.value.toISOString(),
			departmentId: employee.departmentId,
			jobTitle: employee.jobTitle,
			phone: employee.phone
		});

		const result = await employeeService.getEmployeeById(employee.id);

		expect(result.value.fullName).toBe('Jane Smith');
		expect(result.value.displayName).toBe('Smith, Jane');
	});

	it('displays hire date information', async () => {
		const employee = EmployeeFactory.create({
			hireDate: '2020-01-15'
		});

		await employeeService.createEmployee({
			id: employee.id,
			email: employee.email.value,
			firstName: employee.name.first,
			lastName: employee.name.last,
			hireDate: '2020-01-15',
			departmentId: employee.departmentId,
			jobTitle: employee.jobTitle,
			phone: employee.phone
		});

		const result = await employeeService.getEmployeeById(employee.id);

		expect(result.value.hireDate.value).toBeInstanceOf(Date);
		expect(result.value.hireDate.getDaysEmployed()).toBeGreaterThan(0);
	});
});
```

---

**Step 2: Run tests to verify they pass**

Run: `npm run test tests/integration/employees/detail-view.test.ts`

Expected: PASS (4 tests)

---

**Step 3: Commit**

```bash
git add tests/integration/employees/detail-view.test.ts
git commit -m "test: add integration tests for employee detail view"
```

---

### Task 16: Migrate /employees/[id] Server Load

**Files:**

- Modify: `src/routes/dashboard/employees/[id]/+page.server.ts:existing`

---

**Step 1: Update server load function**

Replace existing implementation:

```typescript
// src/routes/dashboard/employees/[id]/+page.server.ts
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { Container } from '$services/Container';

export const load: PageServerLoad = async ({ params }) => {
	const { id } = params;
	const container = Container.getInstance();

	// Use EmployeeService instead of direct GraphQL
	const result = await container.employeeService.getEmployeeById(id);

	if (result.isError) {
		if (result.error.code === 'EMPLOYEE_NOT_FOUND') {
			throw error(404, `Employee with ID ${id} not found`);
		}
		throw error(500, 'Failed to load employee');
	}

	// Convert domain entity to serializable data
	const employee = result.value;

	return {
		employee: {
			id: employee.id,
			email: employee.email.value,
			fullName: employee.fullName,
			displayName: employee.displayName,
			firstName: employee.name.first,
			lastName: employee.name.last,
			hireDate: employee.hireDate.value.toISOString(),
			departmentId: employee.departmentId,
			jobTitle: employee.jobTitle,
			phone: employee.phone,
			isActive: employee.isActive,
			status: employee.status
		}
	};
};
```

---

**Step 2: Test manually**

Run: `npm run dev`

Visit: `http://localhost:5173/dashboard/employees/[valid-id]`

Expected: Page loads successfully with employee data

---

**Step 3: Commit**

```bash
git add src/routes/dashboard/employees/[id]/+page.server.ts
git commit -m "feat: migrate employee detail view to use EmployeeService"
```

---

### Task 17: Integration Tests for Create Form

**Files:**

- Create: `tests/integration/employees/create-form.test.ts`

---

**Step 1: Write integration tests**

```typescript
// tests/integration/employees/create-form.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { Container } from '$services/Container';
import type { EmployeeService } from '$services/EmployeeService';

describe('Employee Create Form Integration', () => {
	let container: Container;
	let employeeService: EmployeeService;

	beforeEach(() => {
		Container.reset();
		container = Container.createTest();
		employeeService = container.employeeService;
	});

	describe('createEmployee', () => {
		it('creates employee with valid data', async () => {
			const data = {
				id: '123e4567-e89b-12d3-a456-426614174000',
				email: 'newemployee@example.com',
				firstName: 'New',
				lastName: 'Employee',
				hireDate: '2023-01-01',
				departmentId: 'dept-1',
				jobTitle: 'Software Engineer',
				phone: '+1234567890'
			};

			const result = await employeeService.createEmployee(data);

			expect(result.isOk).toBe(true);
			expect(result.value.email.value).toBe('newemployee@example.com');
			expect(result.value.fullName).toBe('New Employee');
		});

		it('validates email format', async () => {
			const result = await employeeService.createEmployee({
				id: '123e4567-e89b-12d3-a456-426614174000',
				email: 'not-an-email',
				firstName: 'Test',
				lastName: 'User',
				hireDate: '2023-01-01',
				departmentId: null,
				jobTitle: null,
				phone: null
			});

			expect(result.isError).toBe(true);
			expect(result.error.code).toBe('INVALID_EMAIL');
			expect(result.error.message).toContain('Invalid email');
		});

		it('validates hire date is not in future', async () => {
			const tomorrow = new Date();
			tomorrow.setDate(tomorrow.getDate() + 1);

			const result = await employeeService.createEmployee({
				id: '123e4567-e89b-12d3-a456-426614174000',
				email: 'test@example.com',
				firstName: 'Test',
				lastName: 'User',
				hireDate: tomorrow.toISOString(),
				departmentId: null,
				jobTitle: null,
				phone: null
			});

			expect(result.isError).toBe(true);
			expect(result.error.code).toBe('INVALID_HIRE_DATE');
		});

		it('validates required fields', async () => {
			const result = await employeeService.createEmployee({
				id: '123e4567-e89b-12d3-a456-426614174000',
				email: 'test@example.com',
				firstName: '',
				lastName: 'User',
				hireDate: '2023-01-01',
				departmentId: null,
				jobTitle: null,
				phone: null
			});

			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('First name cannot be empty');
		});

		it('prevents duplicate email', async () => {
			// Create first employee
			await employeeService.createEmployee({
				id: '123e4567-e89b-12d3-a456-426614174001',
				email: 'duplicate@example.com',
				firstName: 'First',
				lastName: 'User',
				hireDate: '2023-01-01',
				departmentId: null,
				jobTitle: null,
				phone: null
			});

			// Try to create second with same email
			const result = await employeeService.createEmployee({
				id: '123e4567-e89b-12d3-a456-426614174002',
				email: 'duplicate@example.com',
				firstName: 'Second',
				lastName: 'User',
				hireDate: '2023-01-01',
				departmentId: null,
				jobTitle: null,
				phone: null
			});

			expect(result.isError).toBe(true);
			expect(result.error.code).toBe('EMPLOYEE_ALREADY_EXISTS');
		});
	});
});
```

---

**Step 2: Run tests to verify they pass**

Run: `npm run test tests/integration/employees/create-form.test.ts`

Expected: PASS (5 tests)

---

**Step 3: Commit**

```bash
git add tests/integration/employees/create-form.test.ts
git commit -m "test: add integration tests for employee create form"
```

---

### Task 18: Migrate /employees/new Form Action

**Files:**

- Modify: `src/routes/dashboard/employees/new/+page.server.ts:existing`

---

**Step 1: Update form actions**

Replace existing implementation:

```typescript
// src/routes/dashboard/employees/new/+page.server.ts
import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { Container } from '$services/Container';

export const load: PageServerLoad = async () => {
	// Load departments for dropdown (keep existing logic)
	// ...existing code...
};

export const actions: Actions = {
	default: async ({ request }) => {
		const container = Container.getInstance();
		const formData = await request.formData();

		const data = {
			id: crypto.randomUUID(),
			email: formData.get('email') as string,
			firstName: formData.get('firstName') as string,
			lastName: formData.get('lastName') as string,
			hireDate: formData.get('hireDate') as string,
			departmentId: (formData.get('departmentId') as string) || null,
			jobTitle: (formData.get('jobTitle') as string) || null,
			phone: (formData.get('phone') as string) || null
		};

		// Use EmployeeService
		const result = await container.employeeService.createEmployee(data);

		if (result.isError) {
			// Return user-friendly error messages
			const errorMessages = {
				INVALID_EMAIL: 'Please enter a valid email address',
				INVALID_HIRE_DATE: 'Hire date cannot be in the future',
				EMPLOYEE_ALREADY_EXISTS: 'An employee with this email already exists',
				default: 'Failed to create employee. Please try again.'
			};

			const message =
				errorMessages[result.error.code as keyof typeof errorMessages] || errorMessages.default;

			return fail(400, {
				error: message,
				values: data
			});
		}

		// Success - redirect to employee detail
		throw redirect(303, `/dashboard/employees/${result.value.id}`);
	}
};
```

---

**Step 2: Test manually**

Run: `npm run dev`

1. Navigate to `/dashboard/employees/new`
2. Fill out form with valid data
3. Submit
4. Verify redirect to detail page

Test validation:

1. Submit with invalid email
2. Verify error message displayed
3. Submit with future hire date
4. Verify error message displayed

---

**Step 3: Commit**

```bash
git add src/routes/dashboard/employees/new/+page.server.ts
git commit -m "feat: migrate employee create form to use EmployeeService"
```

---

### Task 19: Manual Testing & Validation

**Files:**

- None (manual testing)

---

**Step 1: Test employee detail view**

1. Start dev server: `npm run dev`
2. Navigate to existing employee detail page
3. Verify all employee information displays correctly
4. Verify page handles nonexistent IDs (404 error)

---

**Step 2: Test employee create form**

1. Navigate to `/dashboard/employees/new`
2. Test successful creation:
   - Fill all required fields
   - Submit
   - Verify redirect to detail page
   - Verify employee appears in database

3. Test validation errors:
   - Submit with invalid email → verify error message
   - Submit with future hire date → verify error message
   - Submit with empty first name → verify error message
   - Submit with duplicate email → verify error message

---

**Step 3: Run full test suite**

Run: `npm run test`

Expected: All tests pass (85+ tests)

---

**Step 4: Document results**

Create testing report:

```markdown
## Week 3 Testing Report

**Routes Migrated:**

- ✅ /employees/[id] (detail view)
- ✅ /employees/new (create form)

**Test Results:**

- Domain tests: 40 passing
- Service tests: 12 passing
- Adapter tests: 16 passing
- Integration tests: 9 passing
- **Total: 77+ tests, 0 failures**

**Manual Testing:**

- ✅ Detail view loads correctly
- ✅ Detail view handles 404 errors
- ✅ Create form validates all inputs
- ✅ Create form shows user-friendly errors
- ✅ Create form redirects on success
- ✅ Duplicate email detection works

**Issues Found:**

- None

**Status:** Week 3 complete. Ready for Week 4.
```

---

**Step 5: Commit**

```bash
git add -A
git commit -m "docs: add Week 3 testing report"
```

---

## Week 3 Summary

After completing Tasks 15-19, you will have:

**Routes Migrated:**

- ✅ `/employees/[id]` - Detail view using EmployeeService
- ✅ `/employees/new` - Create form using EmployeeService

**Tests Added:**

- ✅ 9 integration tests (detail view + create form)
- ✅ **85+ total tests passing**

**Validation:**

- ✅ Manual testing completed
- ✅ All features working
- ✅ Error handling verified

**Status:** Simple routes migrated successfully. Ready for Week 4 (list view, bulk operations, cleanup).

---

## WEEK 4: Complete Migration & Cleanup

### Task 20: Employee List Filtering Service Methods

**Files:**

- Modify: `src/services/EmployeeService.ts:existing`
- Modify: `tests/unit/services/EmployeeService.test.ts:existing`

---

**Step 1: Write failing tests for advanced filtering**

Append to EmployeeService.test.ts:

```typescript
// tests/unit/services/EmployeeService.test.ts (append)

	describe('filterAndSortEmployees', () => {
		it('filters by search term', async () => {
			await repo.save(EmployeeFactory.create({ firstName: 'Alice', lastName: 'Smith' }));
			await repo.save(EmployeeFactory.create({ firstName: 'Bob', lastName: 'Jones' }));

			const result = await service.getEmployees({ searchTerm: 'alice' });

			expect(result.value).toHaveLength(1);
			expect(result.value[0].name.first).toBe('Alice');
		});

		it('searches by email', async () => {
			await repo.save(EmployeeFactory.create({ email: 'alice@example.com' }));
			await repo.save(EmployeeFactory.create({ email: 'bob@example.com' }));

			const result = await service.getEmployees({ searchTerm: 'alice' }));

			expect(result.value).toHaveLength(1);
		});

		it('combines multiple filters', async () => {
			const dept1Active = EmployeeFactory.createWithDepartment('dept-1');
			const dept1Inactive = EmployeeFactory.createInactive({ departmentId: 'dept-1' });
			const dept2Active = EmployeeFactory.createWithDepartment('dept-2');

			await repo.save(dept1Active);
			await repo.save(dept1Inactive);
			await repo.save(dept2Active);

			const result = await service.getEmployees({
				departmentId: 'dept-1',
				isActive: true
			});

			expect(result.value).toHaveLength(1);
			expect(result.value[0].id).toBe(dept1Active.id);
		});
	});
```

---

**Step 2: Run tests to verify they pass** (already implemented in Task 11)

Run: `npm run test tests/unit/services/EmployeeService.test.ts`

Expected: PASS (15 tests total)

---

**Step 3: Commit**

```bash
git add tests/unit/services/EmployeeService.test.ts
git commit -m "test: add advanced filtering tests for EmployeeService"
```

---

### Task 21: Migrate /employees List View Server

**Files:**

- Modify: `src/routes/dashboard/employees/+page.server.ts:existing`

---

**Step 1: Update server load function**

Replace existing implementation:

```typescript
// src/routes/dashboard/employees/+page.server.ts
import type { PageServerLoad } from './$types';
import { Container } from '$services/Container';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ url }) => {
	const container = Container.getInstance();

	// Extract query parameters
	const searchTerm = url.searchParams.get('search') || undefined;
	const departmentFilter = url.searchParams.get('department') || undefined;
	const statusFilter = url.searchParams.get('status') || 'active';

	// Build filters
	const filters: {
		searchTerm?: string;
		departmentId?: string;
		isActive?: boolean;
	} = {};

	if (searchTerm) filters.searchTerm = searchTerm;
	if (departmentFilter) filters.departmentId = departmentFilter;
	if (statusFilter === 'active') filters.isActive = true;
	if (statusFilter === 'inactive') filters.isActive = false;
	// 'all' status = no isActive filter

	// Use EmployeeService
	const result = await container.employeeService.getEmployees(filters);

	if (result.isError) {
		throw error(500, 'Failed to load employees');
	}

	// Convert domain entities to serializable data
	const employees = result.value.map((emp) => ({
		id: emp.id,
		email: emp.email.value,
		fullName: emp.fullName,
		displayName: emp.displayName,
		firstName: emp.name.first,
		lastName: emp.name.last,
		hireDate: emp.hireDate.value.toISOString(),
		departmentId: emp.departmentId,
		jobTitle: emp.jobTitle,
		phone: emp.phone,
		isActive: emp.isActive,
		status: emp.status
	}));

	// Calculate statistics
	const totalEmployees = employees.length;
	const totalActiveEmployees = employees.filter((e) => e.isActive).length;
	const totalInactiveEmployees = employees.filter((e) => !e.isActive).length;

	return {
		employees,
		totalEmployees,
		totalActiveEmployees,
		totalInactiveEmployees,
		filters: {
			searchTerm: searchTerm || '',
			departmentFilter: departmentFilter || '',
			statusFilter: statusFilter || 'active'
		}
	};
};
```

---

**Step 2: Test manually**

Run: `npm run dev`

1. Navigate to `/dashboard/employees`
2. Verify employee list displays
3. Test search filter
4. Test department filter
5. Test status filter (active/inactive/all)

---

**Step 3: Commit**

```bash
git add src/routes/dashboard/employees/+page.server.ts
git commit -m "feat: migrate employee list view to use EmployeeService"
```

---

### Task 22: Bulk Operations Service Methods

**Files:**

- Modify: `src/services/EmployeeService.ts:existing`
- Modify: `tests/unit/services/EmployeeService.test.ts:existing`

---

**Step 1: Write failing tests for bulk operations**

Append to EmployeeService.test.ts:

```typescript
// tests/unit/services/EmployeeService.test.ts (append)

describe('bulkDeactivate', () => {
	it('deactivates multiple employees', async () => {
		const employees = EmployeeFactory.createMany(3);
		for (const emp of employees) {
			await repo.save(emp);
		}

		const ids = employees.map((e) => e.id);
		const result = await service.bulkDeactivate(ids);

		expect(result.isOk).toBe(true);

		// Verify all deactivated
		for (const id of ids) {
			const emp = await repo.findById(id);
			expect(emp?.isActive).toBe(false);
		}
	});

	it('returns error if any employee not found', async () => {
		const employee = EmployeeFactory.create();
		await repo.save(employee);

		const result = await service.bulkDeactivate([employee.id, 'nonexistent-id']);

		expect(result.isError).toBe(true);
	});
});

describe('bulkActivate', () => {
	it('activates multiple inactive employees', async () => {
		const employees = EmployeeFactory.createMany(3);
		for (const emp of employees) {
			emp.deactivate();
			await repo.save(emp);
		}

		const ids = employees.map((e) => e.id);
		const result = await service.bulkActivate(ids);

		expect(result.isOk).toBe(true);

		// Verify all activated
		for (const id of ids) {
			const emp = await repo.findById(id);
			expect(emp?.isActive).toBe(true);
		}
	});
});
```

---

**Step 2: Run test to verify it fails**

Run: `npm run test tests/unit/services/EmployeeService.test.ts`

Expected: FAIL - methods not found

---

**Step 3: Implement bulk operations**

Add to EmployeeService.ts:

```typescript
// src/services/EmployeeService.ts (add methods)

	async bulkDeactivate(ids: string[]): Promise<Result<void, DomainError>> {
		try {
			// Validate all employees exist first
			for (const id of ids) {
				const exists = await this.employeeRepo.exists(id);
				if (!exists) {
					return Result.error(new EmployeeNotFoundError(id));
				}
			}

			// Deactivate all
			for (const id of ids) {
				const employeeResult = await this.getEmployeeById(id);
				if (employeeResult.isError) {
					return Result.error(employeeResult.error);
				}

				const employee = employeeResult.value;
				const deactivateResult = employee.deactivate();
				if (deactivateResult.isError) {
					// Skip already inactive
					continue;
				}

				await this.employeeRepo.update(id, employee);
			}

			return Result.ok(undefined);
		} catch (error) {
			return Result.error(
				new DomainError('Failed to bulk deactivate employees', 'BULK_DEACTIVATE_FAILED', {
					error
				})
			);
		}
	}

	async bulkActivate(ids: string[]): Promise<Result<void, DomainError>> {
		try {
			// Validate all employees exist first
			for (const id of ids) {
				const exists = await this.employeeRepo.exists(id);
				if (!exists) {
					return Result.error(new EmployeeNotFoundError(id));
				}
			}

			// Activate all
			for (const id of ids) {
				const employeeResult = await this.getEmployeeById(id);
				if (employeeResult.isError) {
					return Result.error(employeeResult.error);
				}

				const employee = employeeResult.value;
				const activateResult = employee.activate();
				if (activateResult.isError) {
					// Skip already active
					continue;
				}

				await this.employeeRepo.update(id, employee);
			}

			return Result.ok(undefined);
		} catch (error) {
			return Result.error(
				new DomainError('Failed to bulk activate employees', 'BULK_ACTIVATE_FAILED', { error })
			);
		}
	}
```

---

**Step 4: Run tests to verify they pass**

Run: `npm run test tests/unit/services/EmployeeService.test.ts`

Expected: PASS (19 tests total)

---

**Step 5: Commit**

```bash
git add src/services/EmployeeService.ts tests/unit/services/EmployeeService.test.ts
git commit -m "feat: add bulk activate/deactivate operations to EmployeeService"
```

---

### Task 23: Cleanup Old GraphQL Operations

**Files:**

- Delete deprecated files
- Update imports

---

**Step 1: Identify deprecated files**

Files to review for removal (if fully replaced):

- `src/lib/graphql/employees/operations.ts` (if no longer used)
- Any old employee-specific GraphQL helpers no longer needed

---

**Step 2: Update documentation**

Update CLAUDE.md with new architecture:

```markdown
## Employee Module Architecture

The employee module follows hexagonal architecture:

**Domain Layer** (`src/domain/Employee/`):

- Employee entity with business logic
- Value objects: Email, PersonName, HireDate, EmployeeStatus
- Domain errors

**Service Layer** (`src/services/`):

- EmployeeService orchestrates employee operations
- Uses EmployeeRepository port for data access
- Fully tested (90%+ coverage)

**Adapter Layer** (`src/adapters/`):

- GraphQLEmployeeAdapter implements EmployeeRepository
- Maps between GraphQL and domain entities

**Component Integration:**

- Server load functions use Container.getInstance().employeeService
- Components receive domain entities (serialized)
- All business logic in domain/service layers (not in components)
```

---

**Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md with employee module architecture"
```

---

### Task 24: Final Validation & Week 4 Summary

**Files:**

- Create: `docs/testing/week4-validation-report.md`

---

**Step 1: Run full test suite**

Run: `npm run test`

Expected: 90+ tests passing, 0 failures

---

**Step 2: Run type checking**

Run: `npm run check`

Expected: 0 errors, all types valid

---

**Step 3: Manual testing checklist**

Test all employee routes:

1. **List View** (`/employees`):
   - ✅ Displays all employees
   - ✅ Search filter works
   - ✅ Department filter works
   - ✅ Status filter works (active/inactive/all)
   - ✅ Statistics calculate correctly

2. **Detail View** (`/employees/[id]`):
   - ✅ Shows employee information
   - ✅ Handles 404 for nonexistent IDs

3. **Create Form** (`/employees/new`):
   - ✅ Creates employee successfully
   - ✅ Validates all inputs
   - ✅ Shows user-friendly error messages
   - ✅ Redirects on success

4. **Bulk Operations**:
   - ✅ Bulk deactivate works
   - ✅ Bulk activate works
   - ✅ Handles errors gracefully

---

**Step 4: Create validation report**

```markdown
# Week 4 Validation Report

## Test Coverage

**Total Tests:** 90+

- Domain: 40 tests (100% coverage)
- Service: 19 tests (90%+ coverage)
- Adapter: 16 tests (80%+ coverage)
- Integration: 15 tests (80%+ coverage)

**All tests passing:** ✅

## Routes Migrated

- ✅ `/employees` - List view with filtering
- ✅ `/employees/[id]` - Detail view
- ✅ `/employees/new` - Create form

## Architecture Compliance

- ✅ Zero `any` types in employee module
- ✅ All business logic in domain/services
- ✅ Components use EmployeeService (not GraphQL directly)
- ✅ Full type safety throughout

## Features Validated

- ✅ Employee CRUD operations
- ✅ Email validation
- ✅ Hire date validation
- ✅ Duplicate email detection
- ✅ Search filtering
- ✅ Department filtering
- ✅ Status filtering
- ✅ Bulk activate/deactivate
- ✅ Error handling
- ✅ User-friendly error messages

## Performance

- ✅ Page load times maintained
- ✅ No regressions detected

## Status

**Week 2-4 Complete:** ✅

Employee module successfully migrated to hexagonal architecture with 80%+ test coverage and zero `any` types.

Ready to use as reference for other module migrations.
```

---

**Step 5: Commit**

```bash
git add docs/testing/week4-validation-report.md
git commit -m "docs: add Week 4 validation report - employee module migration complete"
```

---

## Week 4 Summary

After completing Tasks 20-24, you will have:

**All Employee Routes Migrated:**

- ✅ List view with advanced filtering
- ✅ Detail view
- ✅ Create form
- ✅ Bulk operations

**Full Test Coverage:**

- ✅ 90+ tests passing
- ✅ 80%+ coverage on employee module
- ✅ Zero `any` types

**Documentation:**

- ✅ Architecture documented
- ✅ Validation report created
- ✅ Testing checklist completed

**Status:** Employee module migration complete. Ready to replicate pattern for tasks, departments, and reviews modules.

---

## Complete Implementation Summary

After completing all 24 tasks, you will have:

### Domain Layer

- Result type pattern
- 7 employee domain errors
- 5 value objects with full validation
- Employee entity with business methods
- 40 domain tests (100% coverage)

### Service Layer

- EmployeeRepository port
- EmployeeService with CRUD + bulk operations
- 19 service tests (90%+ coverage)
- DI Container integration

### Adapter Layer

- MockEmployeeRepository for testing
- GraphQLEmployeeAdapter for production
- 16 adapter tests (80%+ coverage)

### Routes (All Migrated)

- `/employees` - List view
- `/employees/[id]` - Detail view
- `/employees/new` - Create form
- 15 integration tests

### Infrastructure

- Employee test factory
- Full type safety (zero `any`)
- 90+ tests passing
- Complete documentation

**Next Modules:** Replicate this pattern for Tasks, Departments, Reviews (Weeks 5-11)
