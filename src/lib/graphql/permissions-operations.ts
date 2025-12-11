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
			description
			createdAt
			updatedAt
			permissions {
				id
				resource
				action
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
	query GetRoleById($roleId: ID!) {
		role(id: $roleId) {
			id
			name
			description
			createdAt
			updatedAt
			permissions {
				id
				resource
				action
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
			role {
				id
				name
				description
				createdAt
			}
		}
	}
`;

/**
 * GraphQL Mutation: Update existing role
 */
export const UPDATE_ROLE = gql`
	mutation UpdateRole($input: UpdateRoleInput!) {
		updateRole(input: $input) {
			role {
				id
				name
				description
				updatedAt
			}
		}
	}
`;

/**
 * GraphQL Mutation: Delete role
 */
export const DELETE_ROLE = gql`
	mutation DeleteRole($input: DeleteRoleInput!) {
		deleteRole(input: $input) {
			success
			message
		}
	}
`;

/**
 * GraphQL Mutation: Assign permission to role
 */
export const ASSIGN_PERMISSION_TO_ROLE = gql`
	mutation AssignPermissionToRole($input: AssignPermissionToRoleInput!) {
		assignPermissionToRole(input: $input) {
			rolePermission {
				id
				roleId
				permissionId
				assignedAt
			}
		}
	}
`;

/**
 * GraphQL Mutation: Remove permission from role
 */
export const REMOVE_PERMISSION_FROM_ROLE = gql`
	mutation RemovePermissionFromRole($input: RemovePermissionFromRoleInput!) {
		removePermissionFromRole(input: $input) {
			success
			message
		}
	}
`;

/**
 * GraphQL Mutation: Assign role to user
 * IMPORTANT: Uses rbac namespace and AssignRoleInput type (matches Rust backend)
 */
export const ASSIGN_ROLE_TO_USER = gql`
	mutation AssignRoleToUser($input: AssignRoleInput!) {
		rbac {
			assignRoleToUser(input: $input) {
				id
				userId
				roleId
				createdAt
			}
		}
	}
`;

/**
 * GraphQL Mutation: Remove role from user
 * IMPORTANT: Uses rbac namespace and direct parameters (matches Rust backend)
 */
export const REMOVE_ROLE_FROM_USER = gql`
	mutation RemoveRoleFromUser($userId: UUID!, $roleId: UUID!) {
		rbac {
			removeRoleFromUser(userId: $userId, roleId: $roleId) {
				success
				message
			}
		}
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
	description?: string;
	createdAt: string;
}

export interface Role {
	id: string;
	name: string;
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
}

export interface UpdateRoleInput {
	id: string;
	name?: string;
	description?: string;
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
