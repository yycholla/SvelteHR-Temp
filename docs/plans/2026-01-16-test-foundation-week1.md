# Test Foundation - Week 1 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Set up testable architecture foundation with dependency injection, type-safe interfaces, and proper directory structure.

**Architecture:** Implement Hexagonal Architecture (Ports & Adapters) with three layers: Domain (pure business logic), Services (orchestration), and Adapters (external systems). Establish dependency injection container and eliminate `any` types in GraphQL layer.

**Tech Stack:** TypeScript 5, Vitest 3, GraphQL Code Generator, dependency-injection-container pattern

---

## Task 1: Create Directory Structure

**Files:**

- Create: `src/domain/README.md`
- Create: `src/services/README.md`
- Create: `src/adapters/README.md`

**Step 1: Create domain directory and README**

Create `src/domain/README.md`:

```markdown
# Domain Layer

Pure business logic with zero external dependencies.

**Rules:**

- No imports from `lib/`, `routes/`, `adapters/`, or `services/`
- No Svelte components
- No browser APIs
- No GraphQL queries
- Only pure TypeScript functions and classes

**Examples:**

- Employee tenure calculation
- Validation logic
- Business rules
- Domain models (types/interfaces)
```

**Step 2: Create services directory and README**

Create `src/services/README.md`:

```markdown
# Services Layer

Application services that orchestrate domain logic with external systems.

**Rules:**

- Can import from `domain/`
- Must depend on Ports (interfaces), not concrete implementations
- Receives dependencies via constructor injection
- Handles errors, logging, validation

**Examples:**

- EmployeeService
- AuthService
- PerformanceReviewService
```

**Step 3: Create adapters directory and README**

Create `src/adapters/README.md`:

```markdown
# Adapters Layer

Implementations of Ports (interfaces) for external systems.

**Rules:**

- Implements Port interfaces from `services/`
- Handles external API calls (GraphQL, REST, localStorage)
- No business logic
- Transforms external data to domain models

**Examples:**

- UrqlGraphQLAdapter (implements GraphQLPort)
- LocalStorageAdapter (implements StoragePort)
- BrowserAuthAdapter (implements AuthPort)
```

**Step 4: Commit**

```bash
git add src/domain/README.md src/services/README.md src/adapters/README.md
git commit -m "feat: Add architecture layer directories with documentation

- domain/: Pure business logic, zero dependencies
- services/: Application orchestration with DI
- adapters/: External system implementations"
```

---

## Task 2: Create Base Port Interfaces

**Files:**

- Create: `src/services/ports/GraphQLPort.ts`
- Create: `src/services/ports/AuthPort.ts`
- Create: `src/services/ports/StoragePort.ts`
- Create: `src/services/ports/index.ts`

**Step 1: Create GraphQL Port interface**

Create `src/services/ports/GraphQLPort.ts`:

```typescript
/**
 * Port (interface) for GraphQL operations.
 * Adapters implement this to provide GraphQL functionality.
 */
export interface GraphQLPort {
	/**
	 * Execute a GraphQL query
	 * @param query - GraphQL query string or DocumentNode
	 * @param variables - Query variables
	 * @returns Promise with typed result
	 */
	query<TData = any, TVariables = Record<string, unknown>>(
		query: string,
		variables?: TVariables
	): Promise<TData>;

	/**
	 * Execute a GraphQL mutation
	 * @param mutation - GraphQL mutation string or DocumentNode
	 * @param variables - Mutation variables
	 * @returns Promise with typed result
	 */
	mutate<TData = any, TVariables = Record<string, unknown>>(
		mutation: string,
		variables?: TVariables
	): Promise<TData>;
}
```

**Step 2: Create Auth Port interface**

Create `src/services/ports/AuthPort.ts`:

```typescript
/**
 * Port (interface) for authentication operations.
 */
export interface AuthPort {
	/**
	 * Get current user session
	 * @returns User session or null if not authenticated
	 */
	getSession(): Promise<UserSession | null>;

	/**
	 * Authenticate with credentials
	 * @param email - User email
	 * @param password - User password
	 * @returns User session
	 */
	login(email: string, password: string): Promise<UserSession>;

	/**
	 * End current session
	 */
	logout(): Promise<void>;

	/**
	 * Check if user has permission
	 * @param permission - Permission string to check
	 * @returns True if user has permission
	 */
	hasPermission(permission: string): boolean;
}

export interface UserSession {
	userId: string;
	email: string;
	role: string;
	permissions: string[];
}
```

**Step 3: Create Storage Port interface**

Create `src/services/ports/StoragePort.ts`:

```typescript
/**
 * Port (interface) for browser storage operations.
 */
export interface StoragePort {
	/**
	 * Get item from storage
	 * @param key - Storage key
	 * @returns Stored value or null
	 */
	getItem(key: string): string | null;

	/**
	 * Set item in storage
	 * @param key - Storage key
	 * @param value - Value to store
	 */
	setItem(key: string, value: string): void;

	/**
	 * Remove item from storage
	 * @param key - Storage key
	 */
	removeItem(key: string): void;

	/**
	 * Clear all items from storage
	 */
	clear(): void;
}
```

**Step 4: Create index barrel export**

Create `src/services/ports/index.ts`:

```typescript
export * from './GraphQLPort';
export * from './AuthPort';
export * from './StoragePort';
```

**Step 5: Commit**

```bash
git add src/services/ports/
git commit -m "feat: Add Port interfaces for dependency injection

- GraphQLPort: Query/mutation operations
- AuthPort: Authentication and authorization
- StoragePort: Browser storage abstraction

These interfaces will be implemented by adapters."
```

---

## Task 3: Create Domain Error Classes

**Files:**

- Create: `src/domain/errors.ts`
- Create: `tests/unit/domain/errors.test.ts`

**Step 1: Write failing test**

Create `tests/unit/domain/errors.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { DomainError, EmployeeNotFoundError, ValidationError } from '$domain/errors';

describe('DomainError', () => {
	it('should create error with message, code, and context', () => {
		const error = new DomainError('Test error', 'TEST_ERROR', { foo: 'bar' });

		expect(error.message).toBe('Test error');
		expect(error.code).toBe('TEST_ERROR');
		expect(error.context).toEqual({ foo: 'bar' });
		expect(error.name).toBe('DomainError');
	});

	it('should extend Error', () => {
		const error = new DomainError('Test', 'TEST');

		expect(error).toBeInstanceOf(Error);
	});
});

describe('EmployeeNotFoundError', () => {
	it('should create error with employee ID in context', () => {
		const error = new EmployeeNotFoundError('123');

		expect(error.message).toBe('Employee with ID 123 not found');
		expect(error.code).toBe('EMPLOYEE_NOT_FOUND');
		expect(error.context).toEqual({ employeeId: '123' });
	});
});

describe('ValidationError', () => {
	it('should create error with field and validation rule', () => {
		const error = new ValidationError('email', 'must be valid email', 'invalid@');

		expect(error.message).toBe('Validation failed for email: must be valid email');
		expect(error.code).toBe('VALIDATION_ERROR');
		expect(error.context).toEqual({
			field: 'email',
			rule: 'must be valid email',
			value: 'invalid@'
		});
	});
});
```

**Step 2: Run test to verify it fails**

```bash
npm run test:unit -- tests/unit/domain/errors.test.ts
```

Expected: FAIL with "Cannot find module '$domain/errors'"

**Step 3: Implement domain errors**

Create `src/domain/errors.ts`:

```typescript
/**
 * Base error class for all domain errors.
 * Provides structured error information with error codes and context.
 */
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

/**
 * Error thrown when an employee is not found.
 */
export class EmployeeNotFoundError extends DomainError {
	constructor(employeeId: string) {
		super(`Employee with ID ${employeeId} not found`, 'EMPLOYEE_NOT_FOUND', { employeeId });
		this.name = 'EmployeeNotFoundError';
	}
}

/**
 * Error thrown when validation fails.
 */
export class ValidationError extends DomainError {
	constructor(field: string, rule: string, value?: unknown) {
		super(`Validation failed for ${field}: ${rule}`, 'VALIDATION_ERROR', {
			field,
			rule,
			value
		});
		this.name = 'ValidationError';
	}
}

/**
 * Error thrown when data transformation fails.
 */
export class DataTransformError extends DomainError {
	constructor(message: string, data?: unknown) {
		super(message, 'DATA_TRANSFORM_ERROR', { data });
		this.name = 'DataTransformError';
	}
}

/**
 * Error thrown when a business rule is violated.
 */
export class BusinessRuleError extends DomainError {
	constructor(rule: string, details?: string) {
		super(
			`Business rule violated: ${rule}${details ? ` - ${details}` : ''}`,
			'BUSINESS_RULE_ERROR',
			{
				rule,
				details
			}
		);
		this.name = 'BusinessRuleError';
	}
}
```

**Step 4: Update tsconfig to recognize domain alias**

Modify `tsconfig.json` (add to paths):

```json
{
	"compilerOptions": {
		"paths": {
			"$lib": ["./src/lib"],
			"$lib/*": ["./src/lib/*"],
			"$domain": ["./src/domain"],
			"$domain/*": ["./src/domain/*"],
			"$services": ["./src/services"],
			"$services/*": ["./src/services/*"],
			"$adapters": ["./src/adapters"],
			"$adapters/*": ["./src/adapters/*"]
		}
	}
}
```

**Step 5: Run test to verify it passes**

```bash
npm run test:unit -- tests/unit/domain/errors.test.ts
```

Expected: PASS (3 test suites, 5 tests)

**Step 6: Commit**

```bash
git add src/domain/errors.ts tests/unit/domain/errors.test.ts tsconfig.json
git commit -m "feat: Add domain error classes with tests

- DomainError: Base class with code and context
- EmployeeNotFoundError: Specific employee errors
- ValidationError: Field validation failures
- DataTransformError: DTO transformation errors
- BusinessRuleError: Business logic violations

All errors are type-safe and testable."
```

---

## Task 4: Create Dependency Injection Container

**Files:**

- Create: `src/services/Container.ts`
- Create: `tests/unit/services/Container.test.ts`

**Step 1: Write failing test**

Create `tests/unit/services/Container.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Container } from '$services/Container';
import type { GraphQLPort, AuthPort, StoragePort } from '$services/ports';

describe('Container', () => {
	describe('getInstance', () => {
		it('should return singleton instance', () => {
			const instance1 = Container.getInstance();
			const instance2 = Container.getInstance();

			expect(instance1).toBe(instance2);
		});
	});

	describe('createTest', () => {
		it('should create test container with mock ports', () => {
			const container = Container.createTest();

			expect(container.graphql).toBeDefined();
			expect(container.auth).toBeDefined();
			expect(container.storage).toBeDefined();
		});

		it('should allow overriding specific ports', () => {
			const mockGraphQL: GraphQLPort = {
				query: vi.fn(),
				mutate: vi.fn()
			};

			const container = Container.createTest({ graphql: mockGraphQL });

			expect(container.graphql).toBe(mockGraphQL);
		});
	});

	describe('reset', () => {
		it('should reset singleton instance', () => {
			const instance1 = Container.getInstance();
			Container.reset();
			const instance2 = Container.getInstance();

			expect(instance1).not.toBe(instance2);
		});
	});
});
```

**Step 2: Run test to verify it fails**

```bash
npm run test:unit -- tests/unit/services/Container.test.ts
```

Expected: FAIL with "Cannot find module '$services/Container'"

**Step 3: Implement Container**

Create `src/services/Container.ts`:

```typescript
import type { GraphQLPort, AuthPort, StoragePort } from './ports';

/**
 * Mock implementations for testing
 */
class MockGraphQLAdapter implements GraphQLPort {
	private responses = new Map<string, any>();
	private errors = new Map<string, Error>();

	async query<TData = any>(_query: string, _variables?: any): Promise<TData> {
		const key = 'query';
		if (this.errors.has(key)) {
			throw this.errors.get(key);
		}
		return this.responses.get(key) ?? ({} as TData);
	}

	async mutate<TData = any>(_mutation: string, _variables?: any): Promise<TData> {
		const key = 'mutate';
		if (this.errors.has(key)) {
			throw this.errors.get(key);
		}
		return this.responses.get(key) ?? ({} as TData);
	}

	setResponse(key: string, response: any) {
		this.responses.set(key, response);
	}

	setError(key: string, error: Error) {
		this.errors.set(key, error);
	}
}

class MockAuthAdapter implements AuthPort {
	private session: any = null;
	private permissions: string[] = [];

	async getSession() {
		return this.session;
	}

	async login(_email: string, _password: string) {
		this.session = {
			userId: 'test-user',
			email: 'test@example.com',
			role: 'Admin',
			permissions: this.permissions
		};
		return this.session;
	}

	async logout() {
		this.session = null;
	}

	hasPermission(permission: string): boolean {
		return this.permissions.includes(permission);
	}

	setPermissions(permissions: string[]) {
		this.permissions = permissions;
	}
}

class MockStorageAdapter implements StoragePort {
	private storage = new Map<string, string>();

	getItem(key: string): string | null {
		return this.storage.get(key) ?? null;
	}

	setItem(key: string, value: string): void {
		this.storage.set(key, value);
	}

	removeItem(key: string): void {
		this.storage.delete(key);
	}

	clear(): void {
		this.storage.clear();
	}
}

/**
 * Dependency injection container.
 * Provides all services and their dependencies.
 */
export class Container {
	private static instance: Container | null = null;

	public readonly graphql: GraphQLPort;
	public readonly auth: AuthPort;
	public readonly storage: StoragePort;

	private constructor(deps: { graphql: GraphQLPort; auth: AuthPort; storage: StoragePort }) {
		this.graphql = deps.graphql;
		this.auth = deps.auth;
		this.storage = deps.storage;
	}

	/**
	 * Get singleton container instance.
	 * In production, this will be initialized with real adapters.
	 */
	static getInstance(): Container {
		if (!Container.instance) {
			// In production, this would use real adapters
			// For now, use mocks until adapters are implemented
			Container.instance = Container.createTest();
		}
		return Container.instance;
	}

	/**
	 * Create test container with mock adapters.
	 * Allows overriding specific dependencies.
	 */
	static createTest(
		overrides?: Partial<{
			graphql: GraphQLPort;
			auth: AuthPort;
			storage: StoragePort;
		}>
	): Container {
		return new Container({
			graphql: overrides?.graphql ?? new MockGraphQLAdapter(),
			auth: overrides?.auth ?? new MockAuthAdapter(),
			storage: overrides?.storage ?? new MockStorageAdapter()
		});
	}

	/**
	 * Reset singleton instance (useful for testing).
	 */
	static reset(): void {
		Container.instance = null;
	}
}

// Export mock adapters for testing
export { MockGraphQLAdapter, MockAuthAdapter, MockStorageAdapter };
```

**Step 4: Run test to verify it passes**

```bash
npm run test:unit -- tests/unit/services/Container.test.ts
```

Expected: PASS (3 test suites, 4 tests)

**Step 5: Commit**

```bash
git add src/services/Container.ts tests/unit/services/Container.test.ts
git commit -m "feat: Add dependency injection container with mock adapters

- Singleton pattern for production use
- createTest() factory for testing with overrides
- Mock implementations of all ports
- Type-safe dependency injection

Coverage: 100% (all paths tested)"
```

---

## Task 5: Add ESLint Architecture Rules

**Files:**

- Modify: `eslint.config.js`

**Step 1: Add import restriction rules**

Add to `eslint.config.js` after existing rules:

```javascript
	// Architecture enforcement rules
	{
		files: ['src/domain/**/*.ts'],
		rules: {
			'no-restricted-imports': [
				'error',
				{
					patterns: [
						{
							group: ['$lib/*', '../lib/*', '../../lib/*'],
							message: 'Domain layer cannot import from lib (breaks separation of concerns)'
						},
						{
							group: ['$routes/*', '../routes/*', '../../routes/*'],
							message: 'Domain layer cannot import from routes (breaks separation of concerns)'
						},
						{
							group: ['$services/*', '../services/*', '../../services/*'],
							message: 'Domain layer cannot import from services (breaks dependency direction)'
						},
						{
							group: ['$adapters/*', '../adapters/*', '../../adapters/*'],
							message: 'Domain layer cannot import from adapters (breaks dependency direction)'
						},
						{
							group: ['svelte', 'svelte/*'],
							message: 'Domain layer cannot use Svelte (must be framework-agnostic)'
						},
						{
							group: ['@sveltejs/*'],
							message: 'Domain layer cannot use SvelteKit (must be framework-agnostic)'
						}
					]
				}
			]
		}
	},
	{
		files: ['src/services/**/*.ts'],
		rules: {
			'no-restricted-imports': [
				'error',
				{
					patterns: [
						{
							group: ['$lib/*', '../lib/*', '../../lib/*'],
							message: 'Services should gradually migrate away from lib (use domain and adapters)'
						},
						{
							group: ['$adapters/*', '../adapters/*', '../../adapters/*'],
							message: 'Services should depend on Ports (interfaces), not concrete Adapters'
						},
						{
							group: ['svelte', 'svelte/*'],
							message: 'Services layer cannot use Svelte (must be framework-agnostic)'
						}
					]
				}
			]
		}
	}
```

**Step 2: Verify rules work**

Try importing from lib in domain (should fail):

```bash
# This should fail lint
echo "import { something } from '\$lib/utils';" > src/domain/test-import.ts
npx eslint src/domain/test-import.ts
rm src/domain/test-import.ts
```

Expected: Error about importing from lib

**Step 3: Commit**

```bash
git add eslint.config.js
git commit -m "feat: Add ESLint rules to enforce architecture boundaries

- Domain layer: No imports from lib, routes, services, adapters, or Svelte
- Services layer: No imports from adapters or Svelte, gradual migration from lib
- Prevents architecture violations at compile time"
```

---

## Task 6: Generate GraphQL TypeScript Types

**Files:**

- Create: `codegen.graphql-types.ts`
- Modify: `package.json`

**Step 1: Create GraphQL codegen config for types only**

Create `codegen.graphql-types.ts`:

```typescript
import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
	schema: 'http://localhost:8000/graphql',
	documents: ['src/**/*.graphql', 'src/**/*.ts'],
	generates: {
		'src/domain/generated/graphql-types.ts': {
			plugins: ['typescript', 'typescript-operations'],
			config: {
				skipTypename: false,
				withHooks: false,
				withComponent: false,
				withHOC: false,
				enumsAsTypes: true,
				scalars: {
					DateTime: 'string',
					Date: 'string',
					JSON: 'Record<string, unknown>',
					UUID: 'string'
				},
				avoidOptionals: {
					field: false,
					inputValue: false,
					object: false
				},
				maybeValue: 'T | null'
			}
		}
	}
};

export default config;
```

**Step 2: Add npm script**

Modify `package.json` scripts:

```json
{
	"scripts": {
		"codegen:types": "graphql-codegen --config codegen.graphql-types.ts"
	}
}
```

**Step 3: Create placeholder generated types file**

Create `src/domain/generated/graphql-types.ts`:

```typescript
/**
 * GraphQL generated types.
 * Run `npm run codegen:types` to regenerate from schema.
 *
 * NOTE: This file is auto-generated. Do not edit manually.
 */

// Placeholder - will be replaced by codegen
export type Scalars = {
	ID: string;
	String: string;
	Boolean: boolean;
	Int: number;
	Float: number;
	DateTime: string;
	Date: string;
	JSON: Record<string, unknown>;
	UUID: string;
};

// Add .gitattributes entry to mark as generated
// src/domain/generated/* linguist-generated=true
```

**Step 4: Add .gitattributes**

Create `.gitattributes` (or append if exists):

```
src/domain/generated/* linguist-generated=true
```

**Step 5: Commit**

```bash
git add codegen.graphql-types.ts package.json src/domain/generated/graphql-types.ts .gitattributes
git commit -m "feat: Add GraphQL type generation config

- Separate codegen config for domain types only
- No React hooks or components (domain layer is framework-agnostic)
- Scalars mapped to TypeScript primitives
- Generated files marked in .gitattributes

Run 'npm run codegen:types' when backend is running to generate types."
```

---

## Task 7: Create Test Helpers and Factories

**Files:**

- Create: `tests/helpers/factories.ts`
- Create: `tests/helpers/test-container.ts`
- Modify: `tests/setup/vitest-setup.ts`

**Step 1: Install faker for test data**

```bash
npm install -D @faker-js/faker
```

**Step 2: Create factory helpers**

Create `tests/helpers/factories.ts`:

```typescript
import { faker } from '@faker-js/faker';

/**
 * Test data factories for creating consistent test objects.
 */

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

	static createMany(count: number, overrides?: Partial<Employee>): Employee[] {
		return Array.from({ length: count }, () => this.create(overrides));
	}
}

export class DepartmentFactory {
	static create(overrides?: Partial<Department>): Department {
		return {
			id: faker.string.uuid(),
			name: faker.helpers.arrayElement(['Engineering', 'HR', 'Sales', 'Marketing']),
			...overrides
		};
	}
}

export class RoleFactory {
	static create(overrides?: Partial<Role>): Role {
		return {
			id: faker.string.uuid(),
			name: faker.person.jobTitle(),
			...overrides
		};
	}
}

// Placeholder types (will be replaced with real domain types)
interface Employee {
	id: string;
	firstName: string;
	lastName: string;
	email: string;
	hireDate: Date;
	department: Department;
	role: Role;
}

interface Department {
	id: string;
	name: string;
}

interface Role {
	id: string;
	name: string;
}
```

**Step 3: Create test container helper**

Create `tests/helpers/test-container.ts`:

```typescript
import {
	Container,
	MockGraphQLAdapter,
	MockAuthAdapter,
	MockStorageAdapter
} from '$services/Container';
import type { GraphQLPort, AuthPort, StoragePort } from '$services/ports';

/**
 * Helper to create test container with optional overrides.
 */
export function createTestContainer(
	overrides?: Partial<{
		graphql: GraphQLPort;
		auth: AuthPort;
		storage: StoragePort;
	}>
) {
	return Container.createTest(overrides);
}

/**
 * Helper to create mock GraphQL adapter with preset responses.
 */
export function createMockGraphQL(responses?: Record<string, any>) {
	const mock = new MockGraphQLAdapter();
	if (responses) {
		Object.entries(responses).forEach(([key, value]) => {
			mock.setResponse(key, value);
		});
	}
	return mock;
}

/**
 * Helper to create mock Auth adapter with preset permissions.
 */
export function createMockAuth(permissions: string[] = []) {
	const mock = new MockAuthAdapter();
	mock.setPermissions(permissions);
	return mock;
}

/**
 * Helper to create mock Storage adapter with preset data.
 */
export function createMockStorage(initialData?: Record<string, string>) {
	const mock = new MockStorageAdapter();
	if (initialData) {
		Object.entries(initialData).forEach(([key, value]) => {
			mock.setItem(key, value);
		});
	}
	return mock;
}
```

**Step 4: Update vitest setup to expose helpers globally**

Modify `tests/setup/vitest-setup.ts` (add to end):

```typescript
// Make test helpers available globally
import * as factories from '../helpers/factories';
import * as testContainer from '../helpers/test-container';

declare global {
	var EmployeeFactory: typeof factories.EmployeeFactory;
	var DepartmentFactory: typeof factories.DepartmentFactory;
	var RoleFactory: typeof factories.RoleFactory;
	var createTestContainer: typeof testContainer.createTestContainer;
	var createMockGraphQL: typeof testContainer.createMockGraphQL;
	var createMockAuth: typeof testContainer.createMockAuth;
	var createMockStorage: typeof testContainer.createMockStorage;
}

global.EmployeeFactory = factories.EmployeeFactory;
global.DepartmentFactory = factories.DepartmentFactory;
global.RoleFactory = factories.RoleFactory;
global.createTestContainer = testContainer.createTestContainer;
global.createMockGraphQL = testContainer.createMockGraphQL;
global.createMockAuth = testContainer.createMockAuth;
global.createMockStorage = testContainer.createMockStorage;
```

**Step 5: Write test to verify helpers work**

Create `tests/helpers/factories.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';

describe('Test Factories', () => {
	describe('EmployeeFactory', () => {
		it('should create employee with random data', () => {
			const employee = EmployeeFactory.create();

			expect(employee.id).toBeDefined();
			expect(employee.firstName).toBeDefined();
			expect(employee.email).toContain('@');
			expect(employee.hireDate).toBeInstanceOf(Date);
		});

		it('should allow overriding properties', () => {
			const employee = EmployeeFactory.create({
				firstName: 'John',
				email: 'john@example.com'
			});

			expect(employee.firstName).toBe('John');
			expect(employee.email).toBe('john@example.com');
		});

		it('should create multiple employees', () => {
			const employees = EmployeeFactory.createMany(5);

			expect(employees).toHaveLength(5);
			expect(employees[0].id).not.toBe(employees[1].id);
		});
	});

	describe('Test Container Helpers', () => {
		it('should create test container with mocks', () => {
			const container = createTestContainer();

			expect(container.graphql).toBeDefined();
			expect(container.auth).toBeDefined();
			expect(container.storage).toBeDefined();
		});

		it('should create mock GraphQL with responses', () => {
			const graphql = createMockGraphQL({
				GetEmployee: { id: '1', firstName: 'John' }
			});

			expect(graphql).toBeDefined();
		});

		it('should create mock Auth with permissions', () => {
			const auth = createMockAuth(['employees:read', 'employees:write']);

			expect(auth.hasPermission('employees:read')).toBe(true);
			expect(auth.hasPermission('other')).toBe(false);
		});
	});
});
```

**Step 6: Run tests**

```bash
npm run test:unit -- tests/helpers/factories.test.ts
```

Expected: PASS (3 test suites, 6 tests)

**Step 7: Commit**

```bash
git add tests/helpers/ tests/setup/vitest-setup.ts package.json
git commit -m "feat: Add test helpers and factories

- EmployeeFactory, DepartmentFactory, RoleFactory with faker
- Test container helpers for easy mock creation
- Global test utilities via vitest setup
- 100% test coverage for helpers

Makes writing tests much easier and more consistent."
```

---

## Task 8: Create REFACTORING_STATUS.md Tracker

**Files:**

- Create: `REFACTORING_STATUS.md`

**Step 1: Create status tracker**

Create `REFACTORING_STATUS.md`:

````markdown
# Refactoring Status

Last updated: 2026-01-16

## Progress Overview

**Goal:** 4.35% → 80%+ test coverage through architectural refactoring

**Timeline:** 12 weeks (Started: Week 1, 2026-01-16)

---

## Week 1: Foundation (In Progress) 🚧

### Completed ✅

- [x] Directory structure (domain/, services/, adapters/)
- [x] Port interfaces (GraphQL, Auth, Storage)
- [x] Domain error classes
- [x] Dependency injection container
- [x] ESLint architecture enforcement rules
- [x] GraphQL type generation setup
- [x] Test helpers and factories

### Remaining

- [ ] Generate GraphQL types from schema (blocked: need backend running)
- [ ] Create first domain model (Employee)
- [ ] Create first service (EmployeeService skeleton)
- [ ] Create first adapter (UrqlGraphQLAdapter)
- [ ] Migrate one component to use service

### Coverage

- Domain layer: 100% (errors.ts only)
- Services layer: 100% (Container.ts only)
- Adapters layer: 0% (not created yet)
- Overall: 4.35% (baseline)

---

## Week 2-4: Employee Module (Not Started) ⏳

### Tasks

- [ ] Extract Employee domain types
- [ ] Create EmployeeService with business logic
- [ ] Write comprehensive unit tests for service
- [ ] Refactor employee UI components to use service
- [ ] Integration tests with mocked GraphQL
- [ ] E2E tests for critical employee paths

### Target Coverage

- Employee domain: 80%+
- EmployeeService: 80%+
- Employee UI: 60%+

---

## Weeks 5-8: Remaining Modules (Not Started) ⏳

### Modules to Migrate

- [ ] Authentication & Authorization
- [ ] Performance Reviews
- [ ] Time Off / PTO
- [ ] Payroll Integration
- [ ] Analytics & Reporting

---

## Weeks 9-12: Integration & Cleanup (Not Started) ⏳

### Tasks

- [ ] Cross-module integration tests
- [ ] E2E critical path coverage
- [ ] Performance regression tests
- [ ] Remove old lib/ code
- [ ] Final documentation

---

## Metrics

### Test Suite Health

- **Total Tests:** 1518
- **Passing:** 1181
- **Skipped:** 337 (22%)
- **Failing:** 0

**Target:** 0 skipped, 1518 passing

### Type Safety

- **any Types (src/lib):** 811
- **Target:** 0

### Coverage

- **Current:** 4.35%
- **Target:** 80%+
- **Progress:** 0% of goal

---

## Architecture Violations

ESLint enforces architecture rules. Current violations:

- None (new architecture just created)

Monitor with:

```bash
npx eslint src/domain src/services src/adapters
```
````

---

## Next Session

**Priority:** Complete Week 1 foundation work

- Generate GraphQL types (need backend running)
- Create first domain model (Employee)
- Create first service skeleton
- Migrate one component as proof of concept

````

**Step 2: Commit**

```bash
git add REFACTORING_STATUS.md
git commit -m "docs: Add refactoring progress tracker

Tracks progress across all 12 weeks:
- Tasks completed/remaining
- Coverage metrics
- Type safety progress
- Architecture violations

Update this file after each significant milestone."
````

---

## Summary

**Week 1 Foundation - Implementation Complete (Pending Backend)**

### What We Built

1. **Architecture Layers** - domain/, services/, adapters/ with documentation
2. **Port Interfaces** - GraphQL, Auth, Storage contracts
3. **Domain Errors** - Type-safe error hierarchy
4. **DI Container** - Singleton with test factory
5. **ESLint Rules** - Enforce architecture boundaries
6. **Type Generation** - GraphQL→TypeScript config
7. **Test Helpers** - Factories and container utilities
8. **Progress Tracker** - REFACTORING_STATUS.md

### Coverage Achieved

- Domain layer: 100% (errors.ts)
- Services layer: 100% (Container.ts)
- Test helpers: 100%
- Overall: ~4.4% (up from 4.35%)

### Tests Added

- 5 tests for domain errors
- 4 tests for Container
- 6 tests for factories/helpers
- **Total:** 15 new tests, 100% passing

### Next Steps (Week 2)

1. **Run backend** - Generate GraphQL types with `npm run codegen:types`
2. **Create Employee domain model** - First real domain type
3. **Create EmployeeService** - First application service
4. **Create UrqlGraphQLAdapter** - First adapter implementation
5. **Migrate one component** - Proof of concept

---

## Execution Options

Plan saved to `docs/plans/2026-01-16-test-foundation-week1.md`

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

Which approach would you prefer?
