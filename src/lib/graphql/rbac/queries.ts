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
			hierarchyLevel
			permissions
			description
			createdAt
			updatedAt
		}
	}
`;

/**
 * Query: Get all roles with optional filtering
 * Backend: Rust idiomatic pattern - uses RoleFilter input object
 */
export const GET_ALL_ROLES = gql`
	query GetAllRoles($filter: RoleFilter) {
		roles(filter: $filter) {
			id
			name
			hierarchyLevel
			permissions
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
			hierarchyLevel
			permissions
			description
			createdAt
			updatedAt
		}
	}
`;
