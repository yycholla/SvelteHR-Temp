import { gql } from '@urql/svelte';

/**
 * Mutation: Create user (employee)
 * Backend: Rust idiomatic - createUser(input) returns User directly (no wrapper)
 */
export const CREATE_EMPLOYEE_MUTATION = gql`
	mutation CreateEmployee($input: CreateUserInput!) {
		createUser(input: $input) {
			id
			email
			displayName
			firstName
			lastName
			fullName
			phone
			jobTitle
			departmentId
			managerId
			hireDate
			status
			isActive
			createdAt
			updatedAt
			department {
				id
				name
			}
			manager {
				id
				fullName
			}
		}
	}
`;

/**
 * Mutation: Update user (employee)
 * Backend: Rust idiomatic - updateUser(id, input) returns User directly
 */
export const UPDATE_EMPLOYEE_MUTATION = gql`
	mutation UpdateEmployee($id: UUID!, $input: UpdateUserInput!) {
		updateUser(id: $id, input: $input) {
			id
			email
			displayName
			firstName
			lastName
			fullName
			phone
			jobTitle
			departmentId
			managerId
			hireDate
			terminationDate
			status
			isActive
			updatedAt
			department {
				id
				name
			}
			manager {
				id
				fullName
			}
		}
	}
`;

/**
 * Mutation: Delete user (employee) - soft delete
 * Backend: Rust idiomatic - deleteUser(id) returns Boolean
 */
export const DELETE_EMPLOYEE_MUTATION = gql`
	mutation DeleteEmployee($id: UUID!) {
		deleteUser(id: $id)
	}
`;
