// GraphQL Operations: Goals & OKRs Management (Manager Department-Scoped)
// Feature: 016-repair-management-pages - Task T016
// Purpose: Manager CRUD operations for employee goals with department-scoped RLS

import { gql } from '@urql/svelte';
import type { UserCredentials } from '$lib/models/data-request';

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

// ============================================================================
// TYPESCRIPT INTERFACES
// ============================================================================

export interface EmployeeGoalFilter {
	status?: {
		equalTo?: 'not_started' | 'in_progress' | 'completed' | 'cancelled';
		in?: Array<'not_started' | 'in_progress' | 'completed' | 'cancelled'>;
	};
	priority?: {
		equalTo?: 'low' | 'medium' | 'high';
		in?: Array<'low' | 'medium' | 'high'>;
	};
	employeeId?: {
		equalTo?: string;
	};
	targetDate?: {
		greaterThanOrEqualTo?: string;
		lessThanOrEqualTo?: string;
		lessThan?: string;
	};
	quarter?: {
		equalTo?: string;
	};
	year?: {
		equalTo?: number;
	};
	progress?: {
		greaterThanOrEqualTo?: number;
		lessThanOrEqualTo?: number;
	};
	employee?: {
		departmentId?: {
			equalTo?: string;
		};
		displayName?: {
			includesInsensitive?: string;
		};
	};
}

export interface CreateEmployeeGoalInput {
	clientMutationId?: string;
	employeeGoal: {
		employeeId: string;
		title: string;
		description: string;
		targetDate: string;
		progress?: number;
		status?: 'not_started' | 'in_progress' | 'completed';
		priority?: 'low' | 'medium' | 'high';
		quarter?: string;
		year?: number;
		createdBy: string;
	};
}

export interface UpdateEmployeeGoalInput {
	clientMutationId?: string;
	id: string;
	patch: {
		title?: string;
		description?: string;
		targetDate?: string;
		progress?: number;
		status?: 'not_started' | 'in_progress' | 'completed' | 'cancelled';
		priority?: 'low' | 'medium' | 'high';
		quarter?: string;
		year?: number;
	};
}

export interface DeleteEmployeeGoalInput {
	clientMutationId?: string;
	id: string;
}

export interface EmployeeGoal {
	id: string;
	employeeId: string;
	employee: {
		id: string;
		displayName: string;
		email: string;
		jobTitle?: string;
		department: {
			id: string;
			name: string;
		};
	};
	title: string;
	description: string;
	targetDate: string;
	progress: number;
	status: 'not_started' | 'in_progress' | 'completed' | 'cancelled';
	priority: 'low' | 'medium' | 'high';
	quarter?: string;
	year?: number;
	createdBy: string;
	creator: {
		id: string;
		displayName: string;
		email: string;
	};
	createdAt: string;
	updatedAt: string;
	completedAt?: string;
}

export interface GoalStatistics {
	totalGoals: number;
	activeGoals: number;
	completedGoals: number;
	overdueGoals: number;
	highPriorityGoals: number;
	averageProgress: number;
	completionRate: number;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Helper: Build employee goal filter safely
 */
export function buildEmployeeGoalFilter({
	status,
	priority,
	employeeId,
	employeeName,
	departmentId,
	quarter,
	year,
	minProgress,
	maxProgress
}: {
	status?: 'not_started' | 'in_progress' | 'completed' | 'cancelled';
	priority?: 'low' | 'medium' | 'high';
	employeeId?: string;
	employeeName?: string;
	departmentId?: string;
	quarter?: string;
	year?: number;
	minProgress?: number;
	maxProgress?: number;
}): EmployeeGoalFilter {
	const filter: EmployeeGoalFilter = {};

	if (status) {
		filter.status = { equalTo: status };
	}

	if (priority) {
		filter.priority = { equalTo: priority };
	}

	if (employeeId) {
		filter.employeeId = { equalTo: employeeId };
	}

	if (quarter) {
		filter.quarter = { equalTo: quarter };
	}

	if (year) {
		filter.year = { equalTo: year };
	}

	if (employeeName || departmentId) {
		filter.employee = {};
		if (employeeName) {
			filter.employee.displayName = { includesInsensitive: employeeName };
		}
		if (departmentId) {
			filter.employee.departmentId = { equalTo: departmentId };
		}
	}

	if (minProgress !== undefined || maxProgress !== undefined) {
		filter.progress = {};
		if (minProgress !== undefined) {
			filter.progress.greaterThanOrEqualTo = minProgress;
		}
		if (maxProgress !== undefined) {
			filter.progress.lessThanOrEqualTo = maxProgress;
		}
	}

	return filter;
}

/**
 * Helper: Calculate goal statistics from raw data
 */
export function calculateGoalStatistics(data: {
	totalGoals: { totalCount: number };
	activeGoals: { totalCount: number; nodes: Array<{ progress: number }> };
	completedGoals: { totalCount: number };
	overdueGoals: { totalCount: number };
	highPriorityGoals: { totalCount: number };
}): GoalStatistics {
	const totalCount = data.totalGoals.totalCount;
	const completedCount = data.completedGoals.totalCount;
	const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

	// Calculate average progress from active goals
	const activeNodes = data.activeGoals.nodes;
	const averageProgress =
		activeNodes.length > 0
			? Math.round(activeNodes.reduce((sum, goal) => sum + goal.progress, 0) / activeNodes.length)
			: 0;

	return {
		totalGoals: totalCount,
		activeGoals: data.activeGoals.totalCount,
		completedGoals: completedCount,
		overdueGoals: data.overdueGoals.totalCount,
		highPriorityGoals: data.highPriorityGoals.totalCount,
		averageProgress,
		completionRate
	};
}

/**
 * Helper: Validate progress percentage (0-100)
 */
export function validateProgress(progress: number): { valid: boolean; error?: string } {
	if (progress < 0 || progress > 100) {
		return {
			valid: false,
			error: 'Progress must be between 0 and 100'
		};
	}
	return { valid: true };
}

/**
 * Helper: Validate goal input
 */
export function validateGoalInput(input: {
	title: string;
	description: string;
	targetDate: string;
	progress?: number;
}): { valid: boolean; errors: string[] } {
	const errors: string[] = [];

	if (!input.title || input.title.trim().length === 0) {
		errors.push('Title is required');
	}

	if (input.title && input.title.length > 255) {
		errors.push('Title must be less than 255 characters');
	}

	if (!input.description || input.description.trim().length === 0) {
		errors.push('Description is required');
	}

	if (input.description && input.description.length > 2000) {
		errors.push('Description must be less than 2000 characters');
	}

	if (!input.targetDate) {
		errors.push('Target date is required');
	}

	if (input.progress !== undefined) {
		const progressValidation = validateProgress(input.progress);
		if (!progressValidation.valid) {
			errors.push(progressValidation.error!);
		}
	}

	return {
		valid: errors.length === 0,
		errors
	};
}

/**
 * Helper: Auto-determine status based on progress
 */
export function determineGoalStatus(progress: number): 'not_started' | 'in_progress' | 'completed' {
	if (progress === 0) return 'not_started';
	if (progress === 100) return 'completed';
	return 'in_progress';
}

/**
 * Helper: Get priority badge color
 */
export function getPriorityBadgeColor(priority: string): string {
	const priorityColors: Record<string, string> = {
		low: 'gray',
		medium: 'blue',
		high: 'red'
	};
	return priorityColors[priority.toLowerCase()] || 'gray';
}

/**
 * Helper: Get status badge color
 */
export function getGoalStatusBadgeColor(status: string): string {
	const statusColors: Record<string, string> = {
		not_started: 'gray',
		in_progress: 'blue',
		completed: 'green',
		cancelled: 'red'
	};
	return statusColors[status.toLowerCase()] || 'gray';
}

/**
 * Helper: Format quarter display
 */
export function formatQuarter(quarter: string, year?: number): string {
	if (year) {
		return `${quarter} ${year}`;
	}
	return quarter;
}

// ============================================================================
// OPERATIONS CLASS (Standardized Error Handling)
// ============================================================================

/**
 * T016: Manager Goals & OKRs Operations with Department-Scoped RLS
 * This class follows TDD principles - tests are written first in
 * tests/contract/manager-goals-operations.test.ts
 */
export class GoalsOKROperations {
	private client: Client;

	constructor(client: Client) {
		this.client = client;
	}

	/**
	 * Get employee goals for manager's department
	 * RLS automatically filters to department only via JWT claims
	 */
	async getEmployeeGoals(params: {
		first?: number;
		offset?: number;
		filter?: EmployeeGoalFilter;
		userCredentials: UserCredentials;
	}): Promise<{
		goals: EmployeeGoal[];
		totalCount: number;
		hasNextPage: boolean;
	}> {
		const { createDataRequest } = await import('$lib/models/data-request');
		const { createErrorResponse } = await import('$lib/models/error-response');

		const dataRequest = createDataRequest({
			operationName: 'GetEmployeeGoals',
			variables: {
				first: params.first || 20,
				offset: params.offset || 0,
				filter: params.filter || {}
			},
			userCredentials: params.userCredentials,
			timeoutMs: 5000
		});

		try {
			// Server-side query using toPromise()
			const result = await this.client.query(GET_EMPLOYEE_GOALS, dataRequest.variables).toPromise();

			if (result.error) {
				const errorResponse = createErrorResponse(result.error, {
					type: 'graphql',
					userMessage: 'Unable to load goals. Please try again.'
				});
				throw errorResponse;
			}

			if (!result.data) {
				throw createErrorResponse(new Error('No data returned'), {
					type: 'graphql',
					userMessage: 'No goals data returned. Please try again.'
				});
			}

			return {
				goals: result.data.employeeGoals.nodes,
				totalCount: result.data.employeeGoals.totalCount,
				hasNextPage: result.data.employeeGoals.pageInfo.hasNextPage
			};
		} catch (error: any) {
			if (error.userMessage) {
				throw error; // Already formatted error
			}
			throw createErrorResponse(error, {
				type: 'graphql',
				userMessage: 'Failed to load employee goals. Please try again.'
			});
		}
	}

	/**
	 * Get goal statistics for manager's department
	 */
	async getGoalStatistics(params: {
		departmentId: string;
		userCredentials: UserCredentials;
	}): Promise<GoalStatistics> {
		const { createDataRequest } = await import('$lib/models/data-request');
		const { createErrorResponse } = await import('$lib/models/error-response');

		const dataRequest = createDataRequest({
			operationName: 'GetGoalStatistics',
			variables: { departmentId: params.departmentId },
			userCredentials: params.userCredentials,
			timeoutMs: 5000
		});

		try {
			// Server-side query using toPromise()
			const result = await this.client
				.query(GET_GOAL_STATISTICS, dataRequest.variables)
				.toPromise();

			if (result.error) {
				const errorResponse = createErrorResponse(result.error, {
					type: 'graphql',
					userMessage: 'Unable to load statistics. Please try again.'
				});
				throw errorResponse;
			}

			if (!result.data) {
				throw createErrorResponse(new Error('No data returned'), {
					type: 'graphql',
					userMessage: 'No statistics data returned. Please try again.'
				});
			}

			const stats = calculateGoalStatistics(result.data);
			return stats;
		} catch (error: any) {
			if (error.userMessage) {
				throw error; // Already formatted error
			}
			throw createErrorResponse(error, {
				type: 'graphql',
				userMessage: 'Failed to load goal statistics. Please try again.'
			});
		}
	}

	/**
	 * Create employee goal (manager department-scoped)
	 * RLS policy enforces department membership
	 */
	async createEmployeeGoal(params: {
		input: CreateEmployeeGoalInput;
		userCredentials: UserCredentials;
	}): Promise<EmployeeGoal> {
		const { createDataRequest } = await import('$lib/models/data-request');
		const { createErrorResponse } = await import('$lib/models/error-response');

		// Validate input
		const validation = validateGoalInput(params.input.employeeGoal);
		if (!validation.valid) {
			throw createErrorResponse(new Error(validation.errors.join(', ')), {
				type: 'validation',
				userMessage: validation.errors.join(', ')
			});
		}

		const dataRequest = createDataRequest({
			operationName: 'CreateEmployeeGoal',
			variables: { input: params.input },
			userCredentials: params.userCredentials,
			timeoutMs: 5000
		});

		try {
			// Server-side query using toPromise()
			const result = await this.client
				.query(CREATE_EMPLOYEE_GOAL, dataRequest.variables)
				.toPromise();

			if (result.error) {
				const errorResponse = createErrorResponse(result.error, {
					type: 'graphql',
					userMessage: 'Unable to create goal. Please try again.'
				});
				throw errorResponse;
			}

			if (!result.data) {
				throw createErrorResponse(new Error('No data returned'), {
					type: 'graphql',
					userMessage: 'No goal data returned. Please try again.'
				});
			}

			return result.data.createEmployeeGoal.employeeGoal;
		} catch (error: any) {
			if (error.userMessage) {
				throw error; // Already formatted error
			}
			throw createErrorResponse(error, {
				type: 'graphql',
				userMessage: 'Failed to create employee goal. Please try again.'
			});
		}
	}

	/**
	 * Update employee goal (manager department-scoped)
	 * RLS policy enforces department membership
	 * Auto-sets status to 'completed' when progress reaches 100%
	 */
	async updateEmployeeGoal(params: {
		input: UpdateEmployeeGoalInput;
		userCredentials: UserCredentials;
	}): Promise<EmployeeGoal> {
		const { createDataRequest } = await import('$lib/models/data-request');
		const { createErrorResponse } = await import('$lib/models/error-response');

		// Validate progress if provided
		if (params.input.patch.progress !== undefined) {
			const validation = validateProgress(params.input.patch.progress);
			if (!validation.valid) {
				throw createErrorResponse(new Error(validation.error), {
					type: 'validation',
					userMessage: validation.error!
				});
			}

			// Auto-set status to completed if progress is 100%
			if (params.input.patch.progress === 100 && !params.input.patch.status) {
				params.input.patch.status = 'completed';
			}
		}

		const dataRequest = createDataRequest({
			operationName: 'UpdateEmployeeGoal',
			variables: { input: params.input },
			userCredentials: params.userCredentials,
			timeoutMs: 5000
		});

		try {
			// Server-side query using toPromise()
			const result = await this.client
				.query(UPDATE_EMPLOYEE_GOAL, dataRequest.variables)
				.toPromise();

			if (result.error) {
				const errorResponse = createErrorResponse(result.error, {
					type: 'graphql',
					userMessage: 'Unable to update goal. Please try again.'
				});
				throw errorResponse;
			}

			if (!result.data) {
				throw createErrorResponse(new Error('No data returned'), {
					type: 'graphql',
					userMessage: 'No goal data returned. Please try again.'
				});
			}

			return result.data.updateEmployeeGoal.employeeGoal;
		} catch (error: any) {
			if (error.userMessage) {
				throw error; // Already formatted error
			}
			throw createErrorResponse(error, {
				type: 'graphql',
				userMessage: 'Failed to update employee goal. Please try again.'
			});
		}
	}

	/**
	 * Delete employee goal (manager department-scoped)
	 * RLS policy enforces department membership
	 */
	async deleteEmployeeGoal(params: {
		goalId: string;
		userCredentials: UserCredentials;
	}): Promise<string> {
		const { createDataRequest } = await import('$lib/models/data-request');
		const { createErrorResponse } = await import('$lib/models/error-response');

		const input: DeleteEmployeeGoalInput = {
			id: params.goalId
		};

		const dataRequest = createDataRequest({
			operationName: 'DeleteEmployeeGoal',
			variables: { input },
			userCredentials: params.userCredentials,
			timeoutMs: 5000
		});

		try {
			// Server-side query using toPromise()
			const result = await this.client
				.query(DELETE_EMPLOYEE_GOAL, dataRequest.variables)
				.toPromise();

			if (result.error) {
				const errorResponse = createErrorResponse(result.error, {
					type: 'graphql',
					userMessage: 'Unable to delete goal. Please try again.'
				});
				throw errorResponse;
			}

			if (!result.data) {
				throw createErrorResponse(new Error('No data returned'), {
					type: 'graphql',
					userMessage: 'No deletion confirmation returned. Please try again.'
				});
			}

			return result.data.deleteEmployeeGoal.deletedEmployeeGoalId;
		} catch (error: any) {
			if (error.userMessage) {
				throw error; // Already formatted error
			}
			throw createErrorResponse(error, {
				type: 'graphql',
				userMessage: 'Failed to delete employee goal. Please try again.'
			});
		}
	}

	// Legacy method for backwards compatibility
	async getTeamGoals(params: any) {
		return this.getEmployeeGoals({
			first: params.first,
			offset: params.offset,
			filter: params.filter,
			userCredentials: params.userCredentials
		});
	}
}

/**
 * Factory function to create GoalsOKROperations instance
 */
export function createGoalsOKROperations(client: Client): GoalsOKROperations {
	return new GoalsOKROperations(client);
}

/**
 * Legacy export for backwards compatibility
 */
export async function getGoalsAnalytics(params: {
	departmentId: string;
	userCredentials: UserCredentials;
	client: Client;
}): Promise<any> {
	const operations = new GoalsOKROperations(params.client);
	const stats = await operations.getGoalStatistics({
		departmentId: params.departmentId,
		userCredentials: params.userCredentials
	});

	return {
		summary: {
			totalGoals: stats.totalGoals,
			activeGoals: stats.activeGoals,
			completedGoals: stats.completedGoals,
			overdueGoals: stats.overdueGoals,
			atRiskGoals: 0, // Can be derived from progress thresholds
			avgCompletion: stats.averageProgress,
			completionRate: stats.completionRate
		},
		breakdowns: {
			priority: [],
			type: []
		},
		healthScore: stats.completionRate
	};
}
