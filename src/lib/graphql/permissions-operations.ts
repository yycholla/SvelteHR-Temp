import { logger } from '$lib/utils/logger';
/**
 * Permissions and Roles Operations - GraphQL Integration
 *
 * Comprehensive operations for managing roles, permissions, and user-role assignments
 * following SvelteKit and GraphQL Rust backend patterns.
 */

import { gql } from '@urql/svelte';
import type { Client } from '@urql/core';

/**
 * GraphQL Query: Get all roles with their permissions
 */
export const GET_ROLES_WITH_PERMISSIONS = gql`
	query GetRolesWithPermissions($limit: Int, $offset: Int) {
		roles(limit: $limit, offset: $offset) {
			id
			name
			level
			description
			createdAt
			updatedAt
			permissions {
				id
				resource
				action
				fullPermission
				description
				createdAt
			}
		}
	}
`;

/**
 * GraphQL Query: Get all available permissions
 */
export const GET_ALL_PERMISSIONS = gql`
	query GetAllPermissions($limit: Int, $offset: Int) {
		permissions(limit: $limit, offset: $offset) {
			id
			resource
			action
			fullPermission
			description
			createdAt
		}
	}
`;

/**
 * GraphQL Query: Get users with their assigned roles
 */
export const GET_USERS_WITH_ROLES = gql`
	query GetUsersWithRoles($limit: Int, $offset: Int) {
		users(limit: $limit, offset: $offset) {
			id
			email
			displayName
			isActive
			roles {
				id
				name
				description
			}
			department {
				id
				name
			}
		}
	}
`;

/**
 * GraphQL Query: Get specific role by ID with permissions
 */
export const GET_ROLE_BY_ID = gql`
	query GetRoleById($roleId: UUID!) {
		role(id: $roleId) {
			id
			name
			level
			description
			createdAt
			updatedAt
			permissions {
				id
				resource
				action
				fullPermission
				description
			}
			users {
				id
				email
				displayName
			}
		}
	}
`;

/**
 * GraphQL Mutation: Create new role
 */
export const CREATE_ROLE = gql`
	mutation CreateRole($input: CreateRoleInput!) {
		createRole(input: $input) {
			id
			name
			level
			description
			createdAt
			updatedAt
		}
	}
`;

/**
 * GraphQL Mutation: Update existing role
 */
export const UPDATE_ROLE = gql`
	mutation UpdateRole($id: UUID!, $input: UpdateRoleInput!) {
		updateRole(id: $id, input: $input) {
			id
			name
			level
			description
			updatedAt
		}
	}
`;

/**
 * GraphQL Mutation: Delete role
 */
export const DELETE_ROLE = gql`
	mutation DeleteRole($id: UUID!) {
		deleteRole(id: $id)
	}
`;

/**
 * GraphQL Mutation: Assign permission to role
 */
export const ASSIGN_PERMISSION_TO_ROLE = gql`
	mutation AssignPermissionToRole($roleId: UUID!, $permissionId: UUID!) {
		assignPermissionToRole(roleId: $roleId, permissionId: $permissionId)
	}
`;

/**
 * GraphQL Mutation: Remove permission from role
 */
export const REMOVE_PERMISSION_FROM_ROLE = gql`
	mutation RemovePermissionFromRole($roleId: UUID!, $permissionId: UUID!) {
		removePermissionFromRole(roleId: $roleId, permissionId: $permissionId)
	}
`;

/**
 * GraphQL Mutation: Assign role to user
 * Uses top-level assignRoleToUser mutation with AssignRoleInput.
 */
export const ASSIGN_ROLE_TO_USER = gql`
	mutation AssignRoleToUser($input: AssignRoleInput!) {
		assignRoleToUser(input: $input) {
			id
			userId
			roleId
			createdAt
		}
	}
`;

/**
 * GraphQL Mutation: Remove role from user
 * Uses top-level removeRoleFromUser mutation with direct parameters.
 */
export const REMOVE_ROLE_FROM_USER = gql`
	mutation RemoveRoleFromUser($userId: UUID!, $roleId: UUID!) {
		removeRoleFromUser(userId: $userId, roleId: $roleId)
	}
`;

/**
 * GraphQL Mutation: Bulk assign permissions to role
 */
export const BULK_ASSIGN_PERMISSIONS = gql`
	mutation BulkAssignPermissions($input: BulkAssignPermissionsInput!) {
		bulkAssignPermissions(input: $input) {
			success
			assignedCount
			message
		}
	}
`;

/**
 * GraphQL Mutation: Bulk remove permissions from role
 */
export const BULK_REMOVE_PERMISSIONS = gql`
	mutation BulkRemovePermissions($input: BulkRemovePermissionsInput!) {
		bulkRemovePermissions(input: $input) {
			success
			removedCount
			message
		}
	}
`;

// TypeScript Interfaces for type safety

export interface Permission {
	id: string;
	resource: string;
	action: string;
	fullPermission?: string;
	description?: string;
	createdAt: string;
}

export interface Role {
	id: string;
	name: string;
	level?: number;
	description?: string;
	createdAt: string;
	updatedAt?: string;
	permissions: Permission[];
	users?: Array<{
		id: string;
		email: string;
		displayName?: string;
	}>;
}

export interface UserWithRoles {
	id: string;
	email: string;
	displayName?: string;
	isActive: boolean;
	roles: Array<{
		id: string;
		name: string;
		description?: string;
	}>;
	department?: {
		id: string;
		name: string;
	};
}

export interface CreateRoleInput {
	name: string;
	description?: string;
	level: number;
}

export interface UpdateRoleInput {
	name?: string;
	description?: string;
	level?: number;
}

export interface DeleteRoleInput {
	id: string;
}

export interface AssignPermissionToRoleInput {
	roleId: string;
	permissionId: string;
}

export interface RemovePermissionFromRoleInput {
	roleId: string;
	permissionId: string;
}

export interface AssignRoleInput {
	userId: string;
	roleId: string;
}

// Note: RemoveRoleFromUser uses direct parameters, not an input object
// Variables format: { userId: string, roleId: string }

export interface BulkAssignPermissionsInput {
	roleId: string;
	permissionIds: string[];
}

export interface BulkRemovePermissionsInput {
	roleId: string;
	permissionIds: string[];
}

/**
 * Helper function to execute query with error handling
 */
export const executePermissionsQuery = async <T = any>(
	client: Client,
	query: string,
	variables?: any
): Promise<T> => {
	const result = await client.query(query, variables).toPromise();

	if (result.error) {
		logger.error('Permissions query error:', result.error);
		throw result.error;
	}

	return result.data;
};

/**
 * Helper function to execute mutation with error handling
 */
export const executePermissionsMutation = async <T = any>(
	client: Client,
	mutation: string,
	variables?: any
): Promise<T> => {
	const result = await client.mutation(mutation, variables).toPromise();

	if (result.error) {
		logger.error('Permissions mutation error:', result.error);
		throw result.error;
	}

	return result.data;
};
