import type { Client } from '@urql/core';
import type { UserCredentials } from '$lib/models/data-request';
import { createDataRequest } from '$lib/models/data-request';
import { createErrorResponse } from '$lib/models/error-response';
import { GET_EMPLOYEE_GOALS, GET_GOAL_STATISTICS } from './queries';
import { CREATE_EMPLOYEE_GOAL, UPDATE_EMPLOYEE_GOAL, DELETE_EMPLOYEE_GOAL } from './mutations';
import type {
	EmployeeGoalFilter,
	CreateEmployeeGoalInput,
	UpdateEmployeeGoalInput,
	DeleteEmployeeGoalInput,
	EmployeeGoal,
	GoalStatistics
} from './types';
import { validateGoalInput, validateProgress, calculateGoalStatistics } from './utils';

/**
 * T016: Manager Goals & OKRs Operations with Department-Scoped RLS
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
				.mutation(CREATE_EMPLOYEE_GOAL, dataRequest.variables)
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
				.mutation(UPDATE_EMPLOYEE_GOAL, dataRequest.variables)
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
				.mutation(DELETE_EMPLOYEE_GOAL, dataRequest.variables)
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
			atRiskGoals: 0,
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
