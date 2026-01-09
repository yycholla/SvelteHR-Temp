import { gql } from '@urql/svelte';

/**
 * GraphQL Mutations for Team Management
 *
 * Updated for Rust backend (async-graphql) schema
 * Removed PostGraphile patterns (nested returns, clientMutationId)
 */

/**
 * Mutation: Create new team/department
 * Backend: Uses createDepartment from Rust GraphQL schema
 */
export const CREATE_TEAM = gql`
	mutation CreateTeam($input: CreateDepartmentInput!) {
		createDepartment(input: $input) {
			id
			name
			description
			parentDepartmentId
			createdAt
		}
	}
`;

/**
 * Mutation: Update team/department
 * Backend: Uses updateDepartment from Rust GraphQL schema
 */
export const UPDATE_TEAM = gql`
	mutation UpdateTeam($id: UUID!, $input: UpdateDepartmentInput!) {
		updateDepartment(id: $id, input: $input) {
			id
			name
			description
			parentDepartmentId
			updatedAt
		}
	}
`;

/**
 * Mutation: Delete team/department
 * Backend: Uses deleteDepartment from Rust GraphQL schema
 */
export const DELETE_TEAM = gql`
	mutation DeleteTeam($id: UUID!) {
		deleteDepartment(id: $id)
	}
`;

/**
 * Mutation: Assign department head
 * Backend: Uses updateDepartment from Rust GraphQL schema
 * Note: This is the same as UPDATE_TEAM but kept for semantic clarity
 */
export const ASSIGN_DEPARTMENT_HEAD = gql`
	mutation AssignDepartmentHead($id: UUID!, $input: UpdateDepartmentInput!) {
		updateDepartment(id: $id, input: $input) {
			id
			name
			updatedAt
		}
	}
`;

/**
 * Mutation: Move employee to different team
 * Backend: Uses updateUser from Rust GraphQL schema
 */
export const MOVE_EMPLOYEE_TO_TEAM = gql`
	mutation MoveEmployeeToTeam($id: UUID!, $input: UpdateUserInput!) {
		updateUser(id: $id, input: $input) {
			id
			displayName
			departmentId
			updatedAt
		}
	}
`;
