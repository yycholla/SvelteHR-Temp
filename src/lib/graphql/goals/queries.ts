import { gql } from '@urql/svelte';

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Query: Get employee goals for manager's department only
 * RLS Policy: manager_view_department_goals
 * Covers: FR-004, FR-015
 */
export const GET_EMPLOYEE_GOALS = gql`
	query GetEmployeeGoals(
		$first: Int = 20
		$offset: Int = 0
		$orderBy: [EmployeeGoalsOrderBy!] = [TARGET_DATE_ASC]
		$filter: EmployeeGoalFilter
	) {
		employeeGoals(first: $first, offset: $offset, orderBy: $orderBy, filter: $filter) {
			nodes {
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
				updatedAt
				completedAt
			}
			totalCount
			pageInfo {
				hasNextPage
				hasPreviousPage
				startCursor
				endCursor
			}
		}
	}
`;

/**
 * Query: Get single goal by ID (department-scoped)
 * RLS Policy: manager_view_department_goals
 */
export const GET_EMPLOYEE_GOAL_BY_ID = gql`
	query GetEmployeeGoalById($id: UUID!) {
		employeeGoal(id: $id) {
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
			updatedAt
			completedAt
		}
	}
`;

/**
 * Query: Get goal statistics for manager's department
 * Covers: FR-015
 */
export const GET_GOAL_STATISTICS = gql`
	query GetGoalStatistics($departmentId: UUID!) {
		totalGoals: employeeGoals(filter: { employee: { departmentId: { equalTo: $departmentId } } }) {
			totalCount
		}
		activeGoals: employeeGoals(
			filter: {
				status: { equalTo: "in_progress" }
				employee: { departmentId: { equalTo: $departmentId } }
			}
		) {
			totalCount
			nodes {
				progress
			}
		}
		completedGoals: employeeGoals(
			filter: {
				status: { equalTo: "completed" }
				employee: { departmentId: { equalTo: $departmentId } }
			}
		) {
			totalCount
		}
		overdueGoals: employeeGoals(
			filter: {
				status: { in: ["not_started", "in_progress"] }
				targetDate: { lessThan: "now()" }
				employee: { departmentId: { equalTo: $departmentId } }
			}
		) {
			totalCount
		}
		highPriorityGoals: employeeGoals(
			filter: {
				priority: { equalTo: "high" }
				employee: { departmentId: { equalTo: $departmentId } }
			}
		) {
			totalCount
		}
	}
`;
