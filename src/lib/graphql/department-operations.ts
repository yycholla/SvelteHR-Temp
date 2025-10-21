/**
 * Department Operations - Migrated to Rust Idiomatic GraphQL
 *
 * Simplified to use only backend-supported features.
 * Advanced features (budget, location, metrics, hierarchy) will be added when backend supports them.
 */

import { gql } from '@urql/svelte';
import type { Client } from '@urql/core';
import type { UserCredentials } from '$lib/models/data-request';

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Query: Get all departments with pagination
 * Backend: Rust idiomatic - departments(limit, offset) returns direct array
 */
export const GET_DEPARTMENTS_QUERY = gql`
	query GetDepartments($limit: Int = 100, $offset: Int = 0) {
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
				displayName
			}
		}
	}
`;

/**
 * Query: Get single department by ID
 * Backend: Rust idiomatic - department(id) not departmentById
 */
export const GET_DEPARTMENT_BY_ID_QUERY = gql`
	query GetDepartmentById($id: UUID!) {
		department(id: $id) {
			id
			name
			description
			managerId
			createdAt
			updatedAt
			manager {
				id
				fullName
				displayName
				email
			}
		}
	}
`;

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Mutation: Create department
 * Backend: Rust idiomatic - createDepartment(input) returns Department directly
 */
export const CREATE_DEPARTMENT_MUTATION = gql`
	mutation CreateDepartment($input: CreateDepartmentInput!) {
		createDepartment(input: $input) {
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
 * Mutation: Update department
 * Backend: Rust idiomatic - updateDepartment(id, input) returns Department directly
 */
export const UPDATE_DEPARTMENT_MUTATION = gql`
	mutation UpdateDepartment($id: UUID!, $input: UpdateDepartmentInput!) {
		updateDepartment(id: $id, input: $input) {
			id
			name
			description
			managerId
			updatedAt
			manager {
				id
				fullName
			}
		}
	}
`;

/**
 * Mutation: Delete department
 * Backend: Rust idiomatic - deleteDepartment(id) returns Boolean
 */
export const DELETE_DEPARTMENT_MUTATION = gql`
	mutation DeleteDepartment($id: UUID!) {
		deleteDepartment(id: $id)
	}
`;

// ============================================================================
// TYPESCRIPT INTERFACES
// ============================================================================

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
		displayName?: string;
		email?: string;
	};
}

export interface DepartmentFilter {
	isActive?: boolean;
	managerId?: string;
	search?: string;
}

export interface CreateDepartmentInput {
	name: string;
	description?: string;
	managerId?: string;
}

export interface UpdateDepartmentInput {
	name?: string;
	description?: string;
	managerId?: string;
}

// ============================================================================
// OPERATIONS CLASS
// ============================================================================

/**
 * Department Operations with Idiomatic Rust GraphQL Patterns
 */
export class DepartmentOperations {
	private client: Client;

	constructor(client: Client) {
		this.client = client;
	}

	/**
	 * Get paginated list of departments
	 */
	async getDepartments(params: {
		limit?: number;
		offset?: number;
		filter?: DepartmentFilter;
		userCredentials: UserCredentials;
	}): Promise<{
		departments: Department[];
		totalCount: number;
		hasNextPage: boolean;
	}> {
		const { createDataRequest } = await import('$lib/models/data-request');
		const { createErrorResponse } = await import('$lib/models/error-response');

		const limit = params.limit || 100;
		const dataRequest = createDataRequest({
			operationName: 'GetDepartments',
			variables: {
				limit,
				offset: params.offset || 0
			},
			userCredentials: params.userCredentials,
			timeoutMs: 5000
		});

		try {
			const result = await this.client
				.query(GET_DEPARTMENTS_QUERY, dataRequest.variables)
				.toPromise();

			if (result.error) {
				const errorResponse = createErrorResponse(result.error, {
					type: 'graphql',
					userMessage: 'Unable to load department list. Please check your permissions and try again.'
				});
				throw errorResponse;
			}

			if (!result.data?.departments) {
				throw createErrorResponse(new Error('No data returned'), {
					type: 'graphql',
					userMessage: 'No department data returned. Please try again.'
				});
			}

			const departments = result.data.departments;

			// Apply client-side filtering if needed
			let filteredDepartments = departments;
			if (params.filter) {
				filteredDepartments = this.applyClientFilter(departments, params.filter);
			}

			return {
				departments: filteredDepartments,
				totalCount: filteredDepartments.length,
				hasNextPage: departments.length === limit
			};
		} catch (error: any) {
			if (error.userMessage) {
				throw error;
			}
			throw createErrorResponse(error, {
				type: 'graphql',
				userMessage: 'Failed to load departments. Please try again.'
			});
		}
	}

	/**
	 * Get single department by ID
	 */
	async getDepartmentById(params: {
		id: string;
		userCredentials: UserCredentials;
	}): Promise<Department> {
		const { createDataRequest } = await import('$lib/models/data-request');
		const { createErrorResponse } = await import('$lib/models/error-response');

		const dataRequest = createDataRequest({
			operationName: 'GetDepartmentById',
			variables: { id: params.id },
			userCredentials: params.userCredentials,
			timeoutMs: 4000
		});

		try {
			const result = await this.client
				.query(GET_DEPARTMENT_BY_ID_QUERY, dataRequest.variables)
				.toPromise();

			if (result.error) {
				const errorResponse = createErrorResponse(result.error, {
					type: 'graphql',
					userMessage: 'Unable to load department details. Please check the department ID and try again.'
				});
				throw errorResponse;
			}

			if (!result.data?.department) {
				throw createErrorResponse(new Error('Department not found'), {
					type: 'validation',
					userMessage: 'Department not found. Please check the department ID.'
				});
			}

			return result.data.department;
		} catch (error: any) {
			if (error.userMessage) {
				throw error;
			}
			throw createErrorResponse(error, {
				type: 'graphql',
				userMessage: 'Failed to load department details. Please try again.'
			});
		}
	}

	/**
	 * Create new department
	 */
	async createDepartment(params: {
		input: CreateDepartmentInput;
		userCredentials: UserCredentials;
	}): Promise<Department> {
		const { createDataRequest } = await import('$lib/models/data-request');
		const { createErrorResponse } = await import('$lib/models/error-response');

		const dataRequest = createDataRequest({
			operationName: 'CreateDepartment',
			variables: { input: params.input },
			userCredentials: params.userCredentials,
			timeoutMs: 8000
		});

		try {
			const result = await this.client
				.mutation(CREATE_DEPARTMENT_MUTATION, dataRequest.variables)
				.toPromise();

			if (result.error) {
				const errorResponse = createErrorResponse(result.error, {
					type: 'validation',
					userMessage: 'Unable to create department. Please check the information and try again.'
				});
				throw errorResponse;
			}

			if (!result.data?.createDepartment) {
				throw createErrorResponse(new Error('No data returned'), {
					type: 'graphql',
					userMessage: 'No department data returned. Please try again.'
				});
			}

			return result.data.createDepartment;
		} catch (error: any) {
			if (error.userMessage) {
				throw error;
			}
			throw createErrorResponse(error, {
				type: 'graphql',
				userMessage: 'Failed to create department. Please try again.'
			});
		}
	}

	/**
	 * Update existing department
	 */
	async updateDepartment(params: {
		id: string;
		input: UpdateDepartmentInput;
		userCredentials: UserCredentials;
	}): Promise<Department> {
		const { createDataRequest } = await import('$lib/models/data-request');
		const { createErrorResponse } = await import('$lib/models/error-response');

		const dataRequest = createDataRequest({
			operationName: 'UpdateDepartment',
			variables: { id: params.id, input: params.input },
			userCredentials: params.userCredentials,
			timeoutMs: 6000
		});

		try {
			const result = await this.client
				.mutation(UPDATE_DEPARTMENT_MUTATION, dataRequest.variables)
				.toPromise();

			if (result.error) {
				const errorResponse = createErrorResponse(result.error, {
					type: 'validation',
					userMessage: 'Unable to update department. Please check the information and try again.'
				});
				throw errorResponse;
			}

			if (!result.data?.updateDepartment) {
				throw createErrorResponse(new Error('No data returned'), {
					type: 'graphql',
					userMessage: 'No department data returned. Please try again.'
				});
			}

			return result.data.updateDepartment;
		} catch (error: any) {
			if (error.userMessage) {
				throw error;
			}
			throw createErrorResponse(error, {
				type: 'graphql',
				userMessage: 'Failed to update department. Please try again.'
			});
		}
	}

	/**
	 * Delete department - soft delete
	 * Returns: Boolean indicating success
	 */
	async deleteDepartment(params: {
		id: string;
		userCredentials: UserCredentials;
	}): Promise<boolean> {
		const { createDataRequest } = await import('$lib/models/data-request');
		const { createErrorResponse } = await import('$lib/models/error-response');

		const dataRequest = createDataRequest({
			operationName: 'DeleteDepartment',
			variables: { id: params.id },
			userCredentials: params.userCredentials,
			timeoutMs: 10000
		});

		try {
			const result = await this.client
				.mutation(DELETE_DEPARTMENT_MUTATION, dataRequest.variables)
				.toPromise();

			if (result.error) {
				const errorResponse = createErrorResponse(result.error, {
					type: 'permission',
					userMessage:
						'Unable to delete department. Please check your permissions and ensure all employees are reassigned.'
				});
				throw errorResponse;
			}

			return result.data?.deleteDepartment || false;
		} catch (error: any) {
			if (error.userMessage) {
				throw error;
			}
			throw createErrorResponse(error, {
				type: 'graphql',
				userMessage: 'Failed to delete department. Please try again.'
			});
		}
	}

	/**
	 * Apply client-side filtering (temporary until backend supports filters)
	 */
	private applyClientFilter(departments: Department[], filter: DepartmentFilter): Department[] {
		return departments.filter((dept) => {
			// Filter by manager
			if (filter.managerId && dept.managerId !== filter.managerId) {
				return false;
			}

			// Search across name and description
			if (filter.search) {
				const searchLower = filter.search.toLowerCase();
				const matchesSearch =
					dept.name?.toLowerCase().includes(searchLower) ||
					dept.description?.toLowerCase().includes(searchLower);

				if (!matchesSearch) {
					return false;
				}
			}

			return true;
		});
	}
}

/**
 * Factory function to create DepartmentOperations instance
 */
export function createDepartmentOperations(client: Client): DepartmentOperations {
	return new DepartmentOperations(client);
}

/**
 * Helper function to check if user can manage department
 */
export function canManageDepartment(
	department: Department,
	userCredentials: UserCredentials
): boolean {
	// Admin can manage all departments
	if (
		userCredentials.permissions.includes('*') ||
		userCredentials.permissions.includes('departments:write')
	) {
		return true;
	}

	// Department managers can manage their own department
	if (department.manager?.id === userCredentials.userId) {
		return true;
	}

	return false;
}
