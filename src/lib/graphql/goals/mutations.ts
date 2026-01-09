import { gql } from '@urql/svelte';

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Mutation: Create employee goal
 * RLS Policy: manager_create_department_goals
 * Covers: FR-004
 * Backend: Uses createEmployeeGoal from Rust GraphQL schema
 */
export const CREATE_EMPLOYEE_GOAL = gql`
	mutation CreateEmployeeGoal($input: CreateEmployeeGoalInput!) {
		createEmployeeGoal(input: $input) {
			id
			employeeId
			employee {
				id
				displayName
				email
				jobTitle
				department {
					id
					name
				}
			}
			title
			description
			targetDate
			progress
			status
			priority
			quarter
			year
			createdBy
			creator {
				id
				displayName
				email
			}
			createdAt
		}
	}
`;

/**
 * Mutation: Update employee goal
 * RLS Policy: manager_update_department_goals
 * Covers: FR-004
 * Note: Progress at 100% auto-sets status to 'completed'
 * Backend: Uses updateEmployeeGoal from Rust GraphQL schema
 */
export const UPDATE_EMPLOYEE_GOAL = gql`
	mutation UpdateEmployeeGoal($input: UpdateEmployeeGoalInput!) {
		updateEmployeeGoal(input: $input) {
			id
			employeeId
			employee {
				id
				displayName
				email
				department {
					id
					name
				}
			}
			title
			description
			targetDate
			progress
			status
			priority
			quarter
			year
			updatedAt
			completedAt
		}
	}
`;

/**
 * Mutation: Delete employee goal
 * RLS Policy: manager_delete_department_goals
 * Covers: FR-004
 * Backend: Uses deleteEmployeeGoal from Rust GraphQL schema
 */
export const DELETE_EMPLOYEE_GOAL = gql`
	mutation DeleteEmployeeGoal($id: UUID!) {
		deleteEmployeeGoal(id: $id)
	}
`;
