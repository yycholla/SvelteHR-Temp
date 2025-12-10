import { gql } from '@urql/svelte';

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Mutation: Create employee goal
 * RLS Policy: manager_create_department_goals
 * Covers: FR-004
 */
export const CREATE_EMPLOYEE_GOAL = gql`
	mutation CreateEmployeeGoal($input: CreateEmployeeGoalInput!) {
		createEmployeeGoal(input: $input) {
			employeeGoal {
				id
				employeeId
				employee {
					id
					displayName
					email
					jobTitle
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
			clientMutationId
		}
	}
`;

/**
 * Mutation: Update employee goal
 * RLS Policy: manager_update_department_goals
 * Covers: FR-004
 * Note: Progress at 100% auto-sets status to 'completed'
 */
export const UPDATE_EMPLOYEE_GOAL = gql`
	mutation UpdateEmployeeGoal($input: UpdateEmployeeGoalInput!) {
		updateEmployeeGoal(input: $input) {
			employeeGoal {
				id
				employeeId
				employee {
					id
					displayName
					email
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
			clientMutationId
		}
	}
`;

/**
 * Mutation: Delete employee goal
 * RLS Policy: manager_delete_department_goals
 * Covers: FR-004
 */
export const DELETE_EMPLOYEE_GOAL = gql`
	mutation DeleteEmployeeGoal($input: DeleteEmployeeGoalInput!) {
		deleteEmployeeGoal(input: $input) {
			deletedEmployeeGoalId
			clientMutationId
		}
	}
`;
