// User service for managing user operations
// Provides CRUD operations and user management functionality

import type { User, CreateUserInput, UpdateUserInput } from '$lib/types';
import { createUrqlClient } from '$lib/graphql/client';
import {
	GET_USERS_QUERY,
	GET_USER_QUERY,
	CREATE_USER_MUTATION,
	UPDATE_USER_MUTATION,
	DELETE_USER_MUTATION
} from '$lib/graphql/user-operations';

/**
 * Get all users with optional filtering
 */
export async function getUsers(filters?: {
	limit?: number;
	offset?: number;
	search?: string;
	departmentId?: string;
	isActive?: boolean;
}): Promise<{ users: User[]; totalCount: number }> {
	const client = createUrqlClient();

	try {
		const result = await client.query(GET_USERS_QUERY, {
			limit: filters?.limit || 50,
			offset: filters?.offset || 0,
			where: filters
				? {
						...(filters.search && {
							_or: [
								{ first_name: { _ilike: `%${filters.search}%` } },
								{ last_name: { _ilike: `%${filters.search}%` } },
								{ email: { _ilike: `%${filters.search}%` } }
							]
						}),
						...(filters.departmentId && { department_id: { _eq: filters.departmentId } }),
						...(filters.isActive !== undefined && { is_active: { _eq: filters.isActive } })
					}
				: undefined
		});

		if (result.error) {
			throw new Error(`Failed to fetch users: ${result.error.message}`);
		}

		return {
			users: result.data?.users || [],
			totalCount: result.data?.users_aggregate?.aggregate?.count || 0
		};
	} catch (error) {
		console.error('Error fetching users:', error);
		throw error;
	}
}

/**
 * Get a single user by ID
 */
export async function getUser(id: string): Promise<User | null> {
	const client = createUrqlClient();

	try {
		const result = await client.query(GET_USER_QUERY, { id });

		if (result.error) {
			throw new Error(`Failed to fetch user: ${result.error.message}`);
		}

		return result.data?.user || null;
	} catch (error) {
		console.error('Error fetching user:', error);
		throw error;
	}
}

/**
 * Create a new user
 */
export async function createUser(input: CreateUserInput): Promise<User> {
	const client = createUrqlClient();

	try {
		const result = await client.mutation(CREATE_USER_MUTATION, { input });

		if (result.error) {
			throw new Error(`Failed to create user: ${result.error.message}`);
		}

		if (!result.data?.createUser?.user) {
			throw new Error('User creation failed - no data returned');
		}

		return result.data.createUser.user;
	} catch (error) {
		console.error('Error creating user:', error);
		throw error;
	}
}

/**
 * Update an existing user
 */
export async function updateUser(id: string, input: UpdateUserInput): Promise<User> {
	const client = createUrqlClient();

	try {
		const result = await client.mutation(UPDATE_USER_MUTATION, {
			id,
			input
		});

		if (result.error) {
			throw new Error(`Failed to update user: ${result.error.message}`);
		}

		if (!result.data?.updateUser?.user) {
			throw new Error('User update failed - no data returned');
		}

		return result.data.updateUser.user;
	} catch (error) {
		console.error('Error updating user:', error);
		throw error;
	}
}

/**
 * Delete a user
 */
export async function deleteUser(id: string): Promise<boolean> {
	const client = createUrqlClient();

	try {
		const result = await client.mutation(DELETE_USER_MUTATION, { id });

		if (result.error) {
			throw new Error(`Failed to delete user: ${result.error.message}`);
		}

		return result.data?.deleteUser?.deletedUserId !== null;
	} catch (error) {
		console.error('Error deleting user:', error);
		throw error;
	}
}

/**
 * Search users by query
 */
export async function searchUsers(query: string, limit: number = 10): Promise<User[]> {
	return (await getUsers({ search: query, limit })).users;
}

/**
 * Get users by department
 */
export async function getUsersByDepartment(departmentId: string): Promise<User[]> {
	return (await getUsers({ departmentId })).users;
}

/**
 * Get active users only
 */
export async function getActiveUsers(): Promise<User[]> {
	return (await getUsers({ isActive: true })).users;
}

// Export the service object for consistency with other services
export const userService = {
	getUsers,
	getUser,
	createUser,
	updateUser,
	deleteUser,
	searchUsers,
	getUsersByDepartment,
	getActiveUsers
};
