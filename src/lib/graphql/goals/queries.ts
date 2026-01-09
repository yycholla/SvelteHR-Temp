import { gql } from '@urql/svelte';

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Query: Get employee goals for manager's department only
 * RLS Policy: manager_view_department_goals
 * Covers: FR-004, FR-015
 * Backend: Uses employeeGoals from Rust GraphQL schema
 */
export const GET_EMPLOYEE_GOALS = gql`
	query GetEmployeeGoals(
		$employeeId: UUID
		$status: String
		$limit: Int = 20
		$offset: Int = 0
	) {
		employeeGoals(employeeId: $employeeId, status: $status, limit: $limit, offset: $offset) {
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
 * Query: Get single goal by ID (department-scoped)
 * RLS Policy: manager_view_department_goals
 * Backend: Uses employeeGoal (singular) from Rust GraphQL schema
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
 * Backend: Uses employeeGoals from Rust GraphQL schema
 * Note: Statistics calculated client-side for now
 */
export const GET_GOAL_STATISTICS = gql`
	query GetGoalStatistics($employeeId: UUID, $limit: Int = 1000) {
		employeeGoals(employeeId: $employeeId, limit: $limit, offset: 0) {
			id
			status
			progress
			priority
			targetDate
		}
	}
`;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Goal status options
 */
export const goalStatusOptions = [
	{ value: 'not_started', label: 'Not Started' },
	{ value: 'in_progress', label: 'In Progress' },
	{ value: 'completed', label: 'Completed' },
	{ value: 'cancelled', label: 'Cancelled' }
];

/**
 * Goal priority options
 */
export const goalPriorityOptions = [
	{ value: 'low', label: 'Low' },
	{ value: 'medium', label: 'Medium' },
	{ value: 'high', label: 'High' }
];

/**
 * Normalize status to consistent format
 */
export function normalizeStatus(status: string): string {
	return status.toLowerCase().replace(/-/g, '_');
}

/**
 * Get status information including color and variant
 */
export function getStatusInfo(status: string): {
	label: string;
	color: string;
	variant: 'default' | 'secondary' | 'destructive' | 'outline';
} {
	const statusLower = normalizeStatus(status);
	switch (statusLower) {
		case 'not_started':
			return { label: 'Not Started', color: 'gray', variant: 'outline' };
		case 'in_progress':
			return { label: 'In Progress', color: 'blue', variant: 'secondary' };
		case 'completed':
			return { label: 'Completed', color: 'green', variant: 'default' };
		case 'cancelled':
			return { label: 'Cancelled', color: 'red', variant: 'destructive' };
		default:
			return { label: 'Unknown', color: 'gray', variant: 'outline' };
	}
}

/**
 * Get priority information including color
 */
export function getPriorityInfo(priority: string): {
	label: string;
	color: string;
} {
	const priorityLower = priority.toLowerCase();
	switch (priorityLower) {
		case 'low':
			return { label: 'Low', color: 'gray' };
		case 'medium':
			return { label: 'Medium', color: 'yellow' };
		case 'high':
			return { label: 'High', color: 'red' };
		default:
			return { label: 'Unknown', color: 'gray' };
	}
}

/**
 * Check if goal is overdue
 */
export function isGoalOverdue(goal: { status: string; targetDate: string }): boolean {
	const statusLower = normalizeStatus(goal.status);
	if (statusLower === 'completed' || statusLower === 'cancelled') {
		return false;
	}

	const targetDate = new Date(goal.targetDate);
	const now = new Date();
	return targetDate < now;
}

/**
 * Calculate goal statistics from goal data (client-side)
 */
// GoalStatistics interface is defined in types.ts
import type { GoalStatistics } from './types';

export function calculateGoalStats(
	goals: Array<{
		status: string;
		progress: number;
		priority: string;
		targetDate: string;
	}>
): GoalStatistics {
	const totalGoals = goals.length;

	const activeGoals = goals.filter((g) => normalizeStatus(g.status) === 'in_progress').length;

	const completedGoals = goals.filter((g) => normalizeStatus(g.status) === 'completed').length;

	const overdueGoals = goals.filter((g) => {
		const statusLower = normalizeStatus(g.status);
		if (statusLower === 'completed' || statusLower === 'cancelled') {
			return false;
		}
		const targetDate = new Date(g.targetDate);
		const now = new Date();
		return targetDate < now;
	}).length;

	const highPriorityGoals = goals.filter((g) => g.priority.toLowerCase() === 'high').length;

	const progressSum = goals.reduce((sum, g) => sum + (g.progress || 0), 0);
	const averageProgress = totalGoals > 0 ? Math.round(progressSum / totalGoals) : 0;

	const completionRate = totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0;

	return {
		totalGoals,
		activeGoals,
		completedGoals,
		overdueGoals,
		highPriorityGoals,
		averageProgress,
		completionRate
	};
}

/**
 * Filter goals by department (client-side)
 */
export function filterGoalsByDepartment<
	T extends { employee?: { department?: { id: string } } }
>(goals: T[], departmentId: string): T[] {
	return goals.filter((goal) => goal.employee?.department?.id === departmentId);
}

/**
 * Format goal progress for display
 */
export function formatProgress(progress: number): string {
	return `${Math.round(progress)}%`;
}

/**
 * Format target date for display
 */
export function formatTargetDate(targetDate: string): string {
	const date = new Date(targetDate);
	return date.toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric'
	});
}

/**
 * Get quarter label from quarter number
 */
export function getQuarterLabel(quarter: number, year: number): string {
	return `Q${quarter} ${year}`;
}
