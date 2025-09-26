/**
 * PostGraphile GraphQL Operations
 *
 * GraphQL queries and mutations for PostGraphile-based backend operations.
 * Contains user management, role-based access, and authentication operations.
 */

import { gql } from '@urql/core';

/**
 * Get user by ID with roles and permissions
 */
export const GET_USER_BY_ID = gql`
	query GetUserById($id: UUID!) {
		userById(id: $id) {
			id
			email
			displayName
			firstName
			lastName
			isActive
			createdAt
			updatedAt
			userRolesByUserId {
				nodes {
					id
					roleId
					assignedAt
					roleByRoleId {
						id
						name
						description
						permissions {
							nodes {
								id
								name
								resource
								action
								description
							}
						}
					}
				}
			}
			profileByUserId {
				id
				phoneNumber
				department
				jobTitle
				manager
				hireDate
				avatar
			}
		}
	}
`;

/**
 * Get user roles and permissions
 */
export const GET_USER_ROLES = gql`
	query GetUserRoles($userId: UUID!) {
		userRolesByUserId(condition: { userId: $userId }) {
			nodes {
				id
				roleId
				assignedAt
				assignedBy
				roleByRoleId {
					id
					name
					description
					level
					isActive
					rolePermissionsByRoleId {
						nodes {
							permissionByPermissionId {
								id
								name
								resource
								action
								description
								isActive
							}
						}
					}
				}
			}
		}
	}
`;

/**
 * Get all users with basic information
 */
export const GET_ALL_USERS = gql`
	query GetAllUsers($first: Int, $offset: Int, $orderBy: [UsersOrderBy!]) {
		allUsers(first: $first, offset: $offset, orderBy: $orderBy) {
			nodes {
				id
				email
				displayName
				firstName
				lastName
				isActive
				createdAt
				updatedAt
				profileByUserId {
					id
					phoneNumber
					department
					jobTitle
					manager
					hireDate
					avatar
					emergencyContactName
					emergencyContactPhone
					address
				}
				userRolesByUserId {
					nodes {
						roleByRoleId {
							id
							name
							description
							level
						}
					}
				}
			}
			totalCount
		}
	}
`;

/**
 * Create new user
 */
export const CREATE_USER = gql`
	mutation CreateUser($input: CreateUserInput!) {
		createUser(input: $input) {
			user {
				id
				email
				displayName
				firstName
				lastName
				isActive
				createdAt
			}
			clientMutationId
		}
	}
`;

/**
 * Update user information
 */
export const UPDATE_USER = gql`
	mutation UpdateUser($input: UpdateUserByIdInput!) {
		updateUserById(input: $input) {
			user {
				id
				email
				displayName
				firstName
				lastName
				isActive
				updatedAt
			}
			clientMutationId
		}
	}
`;

/**
 * Assign role to user
 */
export const ASSIGN_USER_ROLE = gql`
	mutation AssignUserRole($input: CreateUserRoleInput!) {
		createUserRole(input: $input) {
			userRole {
				id
				userId
				roleId
				assignedAt
				assignedBy
				roleByRoleId {
					id
					name
					description
				}
			}
			clientMutationId
		}
	}
`;

/**
 * Remove role from user
 */
export const REMOVE_USER_ROLE = gql`
	mutation RemoveUserRole($input: DeleteUserRoleByIdInput!) {
		deleteUserRoleById(input: $input) {
			userRole {
				id
				userId
				roleId
			}
			clientMutationId
		}
	}
`;

/**
 * Get all roles with permissions
 */
export const GET_ALL_ROLES = gql`
	query GetAllRoles {
		allRoles(orderBy: [LEVEL_DESC, NAME_ASC]) {
			nodes {
				id
				name
				description
				level
				isActive
				createdAt
				rolePermissionsByRoleId {
					nodes {
						permissionByPermissionId {
							id
							name
							resource
							action
							description
							isActive
						}
					}
				}
			}
		}
	}
`;

/**
 * Get all permissions
 */
export const GET_ALL_PERMISSIONS = gql`
	query GetAllPermissions {
		allPermissions(orderBy: [RESOURCE_ASC, ACTION_ASC]) {
			nodes {
				id
				name
				resource
				action
				description
				isActive
				createdAt
			}
		}
	}
`;
