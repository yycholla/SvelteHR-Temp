import { logger } from '$lib/utils/logger';
// Department service for managing department operations
// Provides CRUD operations and department management functionality

import type { CreateDepartmentInput, Department, UpdateDepartmentInput } from '$lib/types';
import { createUrqlClient } from '$lib/graphql/client';
import {
	CREATE_DEPARTMENT_MUTATION,
	DELETE_DEPARTMENT_MUTATION,
	GET_DEPARTMENTS_QUERY,
	GET_DEPARTMENT_BY_ID_QUERY,
	UPDATE_DEPARTMENT_MUTATION
} from '$lib/graphql/department-operations';

/**
 * Get all departments with optional filtering
 */
export async function getDepartments(filters?: {
	limit?: number;
	offset?: number;
	search?: string;
	parentId?: string;
	managerId?: string;
}): Promise<{ departments: Department[]; totalCount: number }> {
	const client = createUrqlClient();

	try {
		const result = await client.query(GET_DEPARTMENTS_QUERY, {
			limit: filters?.limit || 50,
			offset: filters?.offset || 0,
			where: filters
				? {
						...(filters.search && {
							name: { _ilike: `%${filters.search}%` }
						}),
						...(filters.parentId && { parent_department_id: { _eq: filters.parentId } }),
						...(filters.managerId && { manager_id: { _eq: filters.managerId } })
					}
				: undefined
		});

		if (result.error) {
			throw new Error(`Failed to fetch departments: ${result.error.message}`);
		}

		return {
			departments: result.data?.departments?.items || [],
			totalCount: result.data?.departments?.totalCount || 0
		};
	} catch (error) {
		logger.error('Catch failed', error as Error);
		throw error;
	}
}

/**
 * Get a single department by ID
 */
export async function getDepartment(id: string): Promise<Department | null> {
	const client = createUrqlClient();

	try {
		const result = await client.query(GET_DEPARTMENT_BY_ID_QUERY, { id });

		if (result.error) {
			throw new Error(`Failed to fetch department: ${result.error.message}`);
		}

		return result.data?.department || null;
	} catch (error) {
		logger.error('Catch failed', error as Error);
		throw error;
	}
}

/**
 * Create a new department
 */
export async function createDepartment(input: CreateDepartmentInput): Promise<Department> {
	const client = createUrqlClient();

	try {
		const result = await client.mutation(CREATE_DEPARTMENT_MUTATION, { input });

		if (result.error) {
			throw new Error(`Failed to create department: ${result.error.message}`);
		}

		if (!result.data?.createDepartment) {
			throw new Error('Department creation failed - no data returned');
		}

		return result.data.createDepartment;
	} catch (error) {
		logger.error('Catch failed', error as Error);
		throw error;
	}
}

/**
 * Update an existing department
 */
export async function updateDepartment(
	id: string,
	input: UpdateDepartmentInput
): Promise<Department> {
	const client = createUrqlClient();

	try {
		const result = await client.mutation(UPDATE_DEPARTMENT_MUTATION, {
			id,
			input
		});

		if (result.error) {
			throw new Error(`Failed to update department: ${result.error.message}`);
		}

		if (!result.data?.updateDepartment) {
			throw new Error('Department update failed - no data returned');
		}

		return result.data.updateDepartment;
	} catch (error) {
		logger.error('Catch failed', error as Error);
		throw error;
	}
}

/**
 * Delete a department
 */
export async function deleteDepartment(id: string): Promise<boolean> {
	const client = createUrqlClient();

	try {
		const result = await client.mutation(DELETE_DEPARTMENT_MUTATION, { id });

		if (result.error) {
			throw new Error(`Failed to delete department: ${result.error.message}`);
		}

		return result.data?.deleteDepartment === true;
	} catch (error) {
		logger.error('Catch failed', error as Error);
		throw error;
	}
}

/**
 * Get departments by manager
 */
export async function getDepartmentsByManager(managerId: string): Promise<Department[]> {
	return (await getDepartments({ managerId })).departments;
}

/**
 * Search departments by name
 */
export async function searchDepartments(query: string, limit: number = 10): Promise<Department[]> {
	return (await getDepartments({ search: query, limit })).departments;
}

import { writable } from 'svelte/store';

/**
 * Store for departments list
 */
export const departments = writable<Department[]>([]);

/**
 * Store for department loading errors
 */
export const departmentError = writable<string | null>(null);

/**
 * Load departments into the store
 */
export async function loadDepartments(): Promise<void> {
	departmentError.set(null);
	try {
		const result = await getDepartments();
		departments.set(result.departments);
	} catch (error: any) {
		logger.error('Catch failed', error as Error);
		departmentError.set(error.message || 'Failed to load departments');
	}
}

// Export the service object for consistency with other services
export const departmentService = {
	getDepartments,
	getDepartment,
	createDepartment,
	updateDepartment,
	deleteDepartment,
	getDepartmentsByManager,
	searchDepartments,
	departments,
	departmentError,
	loadDepartments
};
