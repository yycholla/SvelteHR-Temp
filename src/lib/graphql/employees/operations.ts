import type { Client } from '@urql/core';
import type { UserCredentials } from '$lib/models/data-request';
import { BaseOperations } from '../base-operations';
import {
	GET_EMPLOYEES_QUERY,
	GET_DEPARTMENTS_QUERY,
	GET_EMPLOYEE_BY_ID_QUERY,
	GET_CURRENT_USER_QUERY
} from './queries';
import {
	CREATE_EMPLOYEE_MUTATION,
	UPDATE_EMPLOYEE_MUTATION,
	DELETE_EMPLOYEE_MUTATION
} from './mutations';
import type {
	Employee,
	EmployeeFilter,
	Department,
	CreateUserInput,
	UpdateUserInput
} from './types';

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
