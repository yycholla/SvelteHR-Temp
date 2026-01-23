import { randomUUID } from 'crypto';
import type { User } from '$lib/types/domain/user';
import type { Employee } from '$lib/types/contracts/employee';
import type { Department } from '$lib/types/domain/department';

let counter = 0;

/**
 * Generates a unique ID for test data
 * Combines UUID for uniqueness with a counter for additional distinction
 */
function getUniqueId(): string {
	return `test-${randomUUID()}-${counter++}`;
}

/**
 * Creates a mock user for testing
 * @param overrides - Partial user object to override default values
 * @returns Mock user object with all required fields
 */
export function createMockUser(overrides?: Partial<User>): User {
	const id = getUniqueId();
	const firstName = 'Test';
	const lastName = 'User';
	const displayName = `${firstName} ${lastName}`;
	const fullName = displayName;
	const createdAt = new Date().toISOString();
	const updatedAt = createdAt;

	return {
		id,
		email: `user-${id}@test.com`,
		password_hash: 'hashed_password',
		first_name: firstName,
		last_name: lastName,
		display_name: displayName,
		full_name: fullName,
		role: 'employee',
		is_active: true,
		failed_login_attempts: 0,
		created_at: createdAt,
		updated_at: updatedAt,
		// CamelCase aliases
		firstName,
		lastName,
		displayName,
		fullName,
		isActive: true,
		...overrides
	};
}

/**
 * Creates a mock employee for testing
 * @param overrides - Partial employee object to override default values
 * @returns Mock employee object with all required fields
 */
export function createMockEmployee(overrides?: Partial<Employee>): Employee {
	const id = getUniqueId();
	return {
		id,
		email: `employee-${id}@test.com`,
		displayName: 'Test Employee',
		role: 'employee',
		department: 'Engineering',
		isActive: true,
		startDate: new Date('2020-01-15').toISOString(),
		...overrides
	};
}

/**
 * Creates a mock department for testing
 * @param overrides - Partial department object to override default values
 * @returns Mock department object with all required fields
 */
export function createMockDepartment(overrides?: Partial<Department>): Department {
	const id = getUniqueId();
	const createdAt = new Date().toISOString();
	const updatedAt = createdAt;

	return {
		id,
		name: `Department ${id}`,
		code: `DEPT-${id.substring(5, 13).toUpperCase()}`,
		description: 'Test department',
		childDepartments: [],
		employees: [],
		employeeCount: 0,
		isActive: true,
		createdAt,
		updatedAt,
		...overrides
	};
}
