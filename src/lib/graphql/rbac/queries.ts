// RBAC Queries
import { gql } from '@urql/svelte';

/**
 * Query: Get role by ID
 * Backend: Rust idiomatic pattern - role(id) not roleById
 */
export const GET_ROLE_BY_ID = gql`
	query GetRoleById($id: UUID!) {
		role(id: $id) {
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
 * Query: Get all roles
 * Backend: roles(limit, offset) without RoleFilter input
 */
export const GET_ALL_ROLES = gql`
	query GetAllRoles {
		roles {
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
 * Query: Get roles assigned to a user
 * Backend: Returns array of roles for the specified user
 */
export const GET_USER_ROLES = gql`
	query GetUserRoles($userId: UUID!) {
		userRoles(userId: $userId) {
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
