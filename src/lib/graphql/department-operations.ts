/**
 * Department Operations - Migrated to Rust Idiomatic GraphQL
 *
 * Simplified to use only backend-supported features.
 * Advanced features (budget, location, metrics, hierarchy) will be added when backend supports them.
 */

import { gql } from '@urql/svelte';
import type { Client } from '@urql/core';
import type { UserCredentials } from '$lib/models/data-request';
import { BaseOperations } from './base-operations';

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
export class DepartmentOperations extends BaseOperations {
	constructor(client: Client) {
		super(client);
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
		const limit = params.limit || 100;

		const result = await this.executeQuery(
			GET_DEPARTMENTS_QUERY,
			{
				limit,
				offset: params.offset || 0
			},
			{
				operationName: 'GetDepartments',
				errorMessage: 'Unable to load department list. Please try again.'
			}
		);

		const departments = result.departments;

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
	}

	/**
	 * Get single department by ID
	 */
	async getDepartmentById(params: {
		id: string;
		userCredentials: UserCredentials;
	}): Promise<Department> {
		const result = await this.executeQuery(
			GET_DEPARTMENT_BY_ID_QUERY,
			{ id: params.id },
			{
				operationName: 'GetDepartmentById',
				errorMessage: 'Unable to load department details. Please try again.'
			}
		);

		return result.department;
	}

	/**
	 * Create new department
	 */
	async createDepartment(params: {
		input: CreateDepartmentInput;
		userCredentials: UserCredentials;
	}): Promise<Department> {
		const result = await this.executeMutation(
			CREATE_DEPARTMENT_MUTATION,
			{ input: params.input },
			{
				operationName: 'CreateDepartment',
				errorMessage: 'Unable to create department. Please try again.'
			}
		);

		return result.createDepartment;
	}

	/**
	 * Update existing department
	 */
	async updateDepartment(params: {
		id: string;
		input: UpdateDepartmentInput;
		userCredentials: UserCredentials;
	}): Promise<Department> {
		const result = await this.executeMutation(
			UPDATE_DEPARTMENT_MUTATION,
			{ id: params.id, input: params.input },
			{
				operationName: 'UpdateDepartment',
				errorMessage: 'Unable to update department. Please try again.'
			}
		);

		return result.updateDepartment;
	}

	/**
	 * Delete department - soft delete
	 * Returns: Boolean indicating success
	 */
	async deleteDepartment(params: {
		id: string;
		userCredentials: UserCredentials;
	}): Promise<boolean> {
		const result = await this.executeMutation(
			DELETE_DEPARTMENT_MUTATION,
			{ id: params.id },
			{
				operationName: 'DeleteDepartment',
				errorMessage: 'Unable to delete department. Please try again.'
			}
		);

		return result.deleteDepartment || false;
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
		userCredentials.permissions.includes('*:*') ||
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
