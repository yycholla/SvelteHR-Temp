// RBAC Mutations
import { gql } from '@urql/svelte';

/**
 * Mutation: Create a new role
 * Backend: Rust idiomatic - createRole not create_role
 */
export const CREATE_ROLE = gql`
	mutation CreateRole($input: CreateRoleInput!) {
		createRole(input: $input) {
			id
			name
			level
			permissions {
				id
				resource
				action
				fullPermission
			}
			description
			createdAt
			updatedAt
		}
	}
`;

/**
 * Mutation: Update an existing role
 * Backend: Rust idiomatic - updateRole(id, input)
 */
export const UPDATE_ROLE = gql`
	mutation UpdateRole($id: UUID!, $input: UpdateRoleInput!) {
		updateRole(id: $id, input: $input) {
			id
			name
			level
			permissions {
				id
				resource
				action
				fullPermission
			}
			description
			createdAt
			updatedAt
		}
	}
`;

/**
 * Mutation: Delete a role
 * Backend: Rust idiomatic - deleteRole(id) returns Boolean
 */
export const DELETE_ROLE = gql`
	mutation DeleteRole($id: UUID!) {
		deleteRole(id: $id)
	}
`;

/**
 * Mutation: Add permission to a role
 * Backend: Dedicated mutation for adding permissions
 */
export const ADD_PERMISSION_TO_ROLE = gql`
	mutation AddPermissionToRole($roleId: UUID!, $permissionId: UUID!) {
		assignPermissionToRole(roleId: $roleId, permissionId: $permissionId)
	}
`;

/**
 * Mutation: Remove permission from a role
 * Backend: Dedicated mutation for removing permissions
 */
export const REMOVE_PERMISSION_FROM_ROLE = gql`
	mutation RemovePermissionFromRole($roleId: UUID!, $permissionId: UUID!) {
		removePermissionFromRole(roleId: $roleId, permissionId: $permissionId)
	}
`;
