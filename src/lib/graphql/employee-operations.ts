/**
 * Employee/User Operations - Migrated to Rust Idiomatic GraphQL
 *
 * Backend uses "users" terminology, but we maintain "employee" naming in frontend
 * for consistency with existing UI. All PostGraphile patterns removed.
 */

import { gql } from '@urql/svelte';
import type { Client } from '@urql/core';
import type { UserCredentials } from '$lib/models/data-request';
import { BaseOperations } from './base-operations';

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Query: Get all users (employees) with pagination
 * Backend: Rust idiomatic - users(limit, offset) returns direct array
 */
export const GET_EMPLOYEES_QUERY = gql`
	query GetEmployees($limit: Int = 20, $offset: Int = 0) {
		users(limit: $limit, offset: $offset) {
			id
			email
			displayName
			firstName
			lastName
			fullName
			role
			phone
			jobTitle
			departmentId
			managerId
			hireDate
			terminationDate
			isActive
			status
			createdAt
			updatedAt
			department {
				id
				name
				description
			}
			manager {
				id
				fullName
				displayName
				email
			}
		}
	}
`;

/**
 * Query: Get single user (employee) by ID
 * Backend: Rust idiomatic - user(id) not userById
 */
export const GET_EMPLOYEE_BY_ID_QUERY = gql`
	query GetEmployeeById($id: UUID!) {
		user(id: $id) {
			id
			email
			displayName
			firstName
			lastName
			fullName
			role
			phone
			jobTitle
			departmentId
			managerId
			hireDate
			terminationDate
			isActive
			status
			createdAt
			updatedAt
			department {
				id
				name
				description
				managerId
			}
			manager {
				id
				fullName
				displayName
				email
			}
		}
	}
`;

/**
 * Query: Get current authenticated user
 * Backend: Rust idiomatic - me() returns current user
 */
export const GET_CURRENT_USER_QUERY = gql`
	query GetCurrentUser {
		me {
			id
			email
			displayName
			firstName
			lastName
			fullName
			role
			phone
			jobTitle
			departmentId
			managerId
			isActive
			status
			department {
				id
				name
			}
			manager {
				id
				fullName
			}
		}
	}
`;

/**
 * Query: Get all departments
 * Backend: Rust idiomatic - departments(limit, offset) returns direct array
 */
export const GET_DEPARTMENTS_QUERY = gql`
	query GetEmployeeDepartments($limit: Int = 100, $offset: Int = 0) {
		departments(limit: $limit, offset: $offset) {
			id
			name
			description
			managerId
			createdAt
			updatedAt
			manager {
				id
				fullName
			}
		}
	}
`;

/**
 * Query: Get employee statistics for a date range (for time-series charts)
 * Backend: Rust idiomatic - employeeStatistics(startDate, endDate) returns array of daily snapshots
 */
export const GET_EMPLOYEE_STATISTICS_QUERY = gql`
	query GetEmployeeStatistics($startDate: String!, $endDate: String!) {
		employeeStatistics(startDate: $startDate, endDate: $endDate) {
			id
			snapshotDate
			totalCount
			activeCount
			inactiveCount
			departmentCount
			createdAt
			updatedAt
		}
	}
`;

/**
 * Query: Get the most recent employee statistics snapshot
 * Backend: Rust idiomatic - latestEmployeeStatistics() returns single snapshot
 */
export const GET_LATEST_EMPLOYEE_STATISTICS_QUERY = gql`
	query GetLatestEmployeeStatistics {
		latestEmployeeStatistics {
			id
			snapshotDate
			totalCount
			activeCount
			inactiveCount
			departmentCount
			createdAt
			updatedAt
		}
	}
`;

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Mutation: Create user (employee)
 * Backend: Rust idiomatic - createUser(input) returns User directly (no wrapper)
 */
export const CREATE_EMPLOYEE_MUTATION = gql`
	mutation CreateEmployee($input: CreateUserInput!) {
		createUser(input: $input) {
			id
			email
			displayName
			firstName
			lastName
			fullName
			phone
			jobTitle
			departmentId
			managerId
			hireDate
			status
			isActive
			createdAt
			updatedAt
			department {
				id
				name
			}
			manager {
				id
				fullName
			}
		}
	}
`;

/**
 * Mutation: Update user (employee)
 * Backend: Rust idiomatic - updateUser(id, input) returns User directly
 */
export const UPDATE_EMPLOYEE_MUTATION = gql`
	mutation UpdateEmployee($id: UUID!, $input: UpdateUserInput!) {
		updateUser(id: $id, input: $input) {
			id
			email
			displayName
			firstName
			lastName
			fullName
			phone
			jobTitle
			departmentId
			managerId
			hireDate
			terminationDate
			status
			isActive
			updatedAt
			department {
				id
				name
			}
			manager {
				id
				fullName
			}
		}
	}
`;

/**
 * Mutation: Delete user (employee) - soft delete
 * Backend: Rust idiomatic - deleteUser(id) returns Boolean
 */
export const DELETE_EMPLOYEE_MUTATION = gql`
	mutation DeleteEmployee($id: UUID!) {
		deleteUser(id: $id)
	}
`;

// ============================================================================
// TYPESCRIPT INTERFACES
// ============================================================================

export interface Employee {
	id: string;
	email: string;
	displayName: string;
	firstName: string;
	lastName: string;
	fullName: string;
	role?: string;
	phone?: string;
	jobTitle?: string;
	departmentId?: string;
	managerId?: string;
	hireDate?: string;
	terminationDate?: string;
	isActive: boolean;
	status: string;
	createdAt: string;
	updatedAt: string;
	avatarUrl?: string;
	profileImage?: string;
	department?: {
		id: string;
		name: string;
		description?: string;
		managerId?: string;
		manager?: {
			id: string;
			fullName: string;
			displayName?: string;
			email?: string;
		};
	};
	manager?: {
		id: string;
		fullName: string;
		displayName?: string;
		email?: string;
	};
}

export interface EmployeeFilter {
	isActive?: boolean;
	departmentId?: string;
	managerId?: string;
	jobTitle?: string;
	search?: string;
}

export interface Department {
	id: string;
	name: string;
	description?: string;
	managerId?: string;
	createdAt: string;
	updatedAt: string;
	manager?: {
		id: string;
		fullName: string;
	};
}

export interface CreateUserInput {
	email: string;
	firstName: string;
	lastName: string;
	phone?: string;
	departmentId?: string;
	managerId?: string;
	hireDate?: string;
	status: string;
}

export interface UpdateUserInput {
	email?: string;
	firstName?: string;
	lastName?: string;
	phone?: string;
	departmentId?: string;
	managerId?: string;
	hireDate?: string;
	terminationDate?: string;
	status?: string;
}

export interface EmployeeStatistic {
	id: string;
	snapshotDate: string;
	totalCount: number;
	activeCount: number;
	inactiveCount: number;
	departmentCount: number;
	createdAt: string;
	updatedAt: string;
}

// ============================================================================
// OPERATIONS CLASS
// ============================================================================

/**
 * Employee Operations with Idiomatic Rust GraphQL Patterns
 */
export class EmployeeOperations extends BaseOperations {
	constructor(client: Client) {
		super(client);
	}

	/**
	 * Get paginated list of employees (users)
	 */
	async getEmployees(params: {
		limit?: number;
		offset?: number;
		filter?: EmployeeFilter;
		userCredentials: UserCredentials;
	}): Promise<{
		employees: Employee[];
		totalCount: number;
		hasNextPage: boolean;
	}> {
		const limit = params.limit || 20;

		const result = await this.executeQuery(
			GET_EMPLOYEES_QUERY,
			{
				limit,
				offset: params.offset || 0
			},
			{
				operationName: 'GetEmployees',
				errorMessage: 'Unable to load employee list. Please try again.'
			}
		);

		const employees = result.users;

		// Apply client-side filtering if needed (backend doesn't support filters yet)
		let filteredEmployees = employees;
		if (params.filter) {
			filteredEmployees = this.applyClientFilter(employees, params.filter);
		}

		return {
			employees: filteredEmployees,
			totalCount: filteredEmployees.length,
			hasNextPage: employees.length === limit
		};
	}

	/**
	 * Get departments list
	 */
	async getDepartments(params: {
		limit?: number;
		offset?: number;
		userCredentials: UserCredentials;
	}): Promise<{ departments: Department[] }> {
		const result = await this.executeQuery(
			GET_DEPARTMENTS_QUERY,
			{
				limit: params.limit || 100,
				offset: params.offset || 0
			},
			{
				operationName: 'GetDepartments',
				errorMessage: 'Unable to load departments. Please try again.'
			}
		);

		return { departments: result.departments };
	}

	/**
	 * Get single employee by ID
	 */
	async getEmployeeById(params: {
		id: string;
		userCredentials: UserCredentials;
	}): Promise<Employee> {
		const result = await this.executeQuery(
			GET_EMPLOYEE_BY_ID_QUERY,
			{ id: params.id },
			{
				operationName: 'GetEmployeeById',
				errorMessage: 'Unable to load employee details. Please try again.'
			}
		);

		return result.user;
	}

	/**
	 * Get current authenticated user
	 */
	async getCurrentUser(params: { userCredentials: UserCredentials }): Promise<Employee> {
		const result = await this.executeQuery(
			GET_CURRENT_USER_QUERY,
			{},
			{
				operationName: 'GetCurrentUser',
				errorMessage: 'Unable to load your profile. Please try again.'
			}
		);

		return result.me;
	}

	/**
	 * Create new employee (user)
	 */
	async createEmployee(params: {
		input: CreateUserInput;
		userCredentials: UserCredentials;
	}): Promise<Employee> {
		const result = await this.executeMutation(
			CREATE_EMPLOYEE_MUTATION,
			{ input: params.input },
			{
				operationName: 'CreateEmployee',
				errorMessage: 'Unable to create employee. Please try again.'
			}
		);

		return result.createUser;
	}

	/**
	 * Update existing employee (user)
	 */
	async updateEmployee(params: {
		id: string;
		input: UpdateUserInput;
		userCredentials: UserCredentials;
	}): Promise<Employee> {
		const result = await this.executeMutation(
			UPDATE_EMPLOYEE_MUTATION,
			{ id: params.id, input: params.input },
			{
				operationName: 'UpdateEmployee',
				errorMessage: 'Unable to update employee. Please try again.'
			}
		);

		return result.updateUser;
	}

	/**
	 * Delete employee (user) - soft delete
	 * Returns: Boolean indicating success
	 */
	async deleteEmployee(params: { id: string; userCredentials: UserCredentials }): Promise<boolean> {
		const result = await this.executeMutation(
			DELETE_EMPLOYEE_MUTATION,
			{ id: params.id },
			{
				operationName: 'DeleteEmployee',
				errorMessage: 'Unable to delete employee. Please try again.'
			}
		);

		return result.deleteUser || false;
	}

	/**
	 * Deactivate employee (alias for delete)
	 */
	async deactivateEmployee(params: {
		id: string;
		userCredentials: UserCredentials;
	}): Promise<boolean> {
		return this.deleteEmployee(params);
	}

	/**
	 * Apply client-side filtering (temporary until backend supports filters)
	 */
	private applyClientFilter(employees: Employee[], filter: EmployeeFilter): Employee[] {
		return employees.filter((employee) => {
			// Filter by active status
			if (filter.isActive !== undefined && employee.isActive !== filter.isActive) {
				return false;
			}

			// Filter by department
			if (filter.departmentId && employee.departmentId !== filter.departmentId) {
				return false;
			}

			// Filter by manager
			if (filter.managerId && employee.managerId !== filter.managerId) {
				return false;
			}

			// Filter by job title
			if (filter.jobTitle && employee.jobTitle !== filter.jobTitle) {
				return false;
			}

			// Search across name and email
			if (filter.search) {
				const searchLower = filter.search.toLowerCase();
				const matchesSearch =
					employee.fullName?.toLowerCase().includes(searchLower) ||
					employee.displayName?.toLowerCase().includes(searchLower) ||
					employee.email?.toLowerCase().includes(searchLower);

				if (!matchesSearch) {
					return false;
				}
			}

			return true;
		});
	}
}

/**
 * Factory function to create EmployeeOperations instance
 */
export function createEmployeeOperations(client: Client): EmployeeOperations {
	return new EmployeeOperations(client);
}

/**
 * Helper function to format employee display name
 */
export function formatEmployeeName(employee: Employee): string {
	if (employee.fullName) {
		return employee.fullName;
	}
	if (employee.firstName && employee.lastName) {
		return `${employee.firstName} ${employee.lastName}`;
	}
	return employee.displayName || employee.email;
}

/**
 * Helper function to check if user can view employee
 */
export function canViewEmployee(employee: Employee, userCredentials: UserCredentials): boolean {
	// Admin can view all employees
	if (
		userCredentials.permissions.includes('*') ||
		userCredentials.permissions.includes('*:*') ||
		userCredentials.permissions.includes('employees:read')
	) {
		return true;
	}

	// Users can view their own profile
	if (employee.id === userCredentials.userId) {
		return true;
	}

	// Managers can view their direct reports
	if (employee.managerId === userCredentials.userId) {
		return true;
	}

	return false;
}
