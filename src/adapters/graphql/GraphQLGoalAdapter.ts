// src/adapters/graphql/GraphQLGoalAdapter.ts
import { Client } from '@urql/core';
import { Result } from '$domain/Result';
import {
	Goal,
	GoalTitle,
	GoalDescription,
	TargetDate,
	Progress,
	GoalStatus,
	GoalPriority,
	Quarter,
	GoalError,
	GoalNotFoundError,
	GoalValidationError
} from '$domain/Goal';
import type {
	GoalRepository,
	CreateGoalData,
	UpdateGoalData,
	GoalFilter
} from '$services/ports/GoalRepository';
import { GET_EMPLOYEE_GOALS, GET_EMPLOYEE_GOAL_BY_ID } from '$lib/graphql/goals/queries';
import {
	CREATE_EMPLOYEE_GOAL,
	UPDATE_EMPLOYEE_GOAL,
	DELETE_EMPLOYEE_GOAL
} from '$lib/graphql/goals/mutations';

/**
 * GraphQL schema response shape
 */
interface GraphQLGoal {
	id: string;
	employeeId: string;
	title: string;
	description: string | null;
	targetDate: string;
	progress: number;
	status: string;
	priority: string;
	quarter?: string | null;
	year?: number | null;
	createdBy: string;
	createdAt: string;
	updatedAt: string;
	completedAt?: string | null;
}

/**
 * GraphQLGoalAdapter implements GoalRepository port for GraphQL backend integration.
 *
 * Responsibilities:
 * - Translate between GraphQL API and domain entities
 * - Handle GraphQL errors and map to domain errors
 * - Resilient error handling (skip invalid data, don't throw)
 *
 * @example
 * ```typescript
 * const adapter = new GraphQLGoalAdapter(urqlClient);
 * const result = await adapter.findById('goal-123');
 * if (result.isOk) {
 *   console.log(result.value.title.value);
 * }
 * ```
 */
export class GraphQLGoalAdapter implements GoalRepository {
	constructor(private readonly client: Client) {}

	async findById(id: string): Promise<Result<Goal, GoalNotFoundError>> {
		try {
			const result = await this.client.query(GET_EMPLOYEE_GOAL_BY_ID, { id }).toPromise();

			if (result.error) {
				return Result.error(new GoalNotFoundError(id));
			}

			if (!result.data?.employeeGoal) {
				return Result.error(new GoalNotFoundError(id));
			}

			return this.mapToGoal(result.data.employeeGoal);
		} catch (error) {
			return Result.error(new GoalNotFoundError(id));
		}
	}

	async findAll(filter?: GoalFilter): Promise<Result<Goal[], GoalError>> {
		try {
			// Map domain filter to GraphQL filter
			const graphqlFilter = filter
				? {
						employeeId: filter.employeeId,
						status: filter.status,
						limit: filter.limit ?? 20,
						offset: filter.offset ?? 0
					}
				: { limit: 20, offset: 0 };

			const result = await this.client.query(GET_EMPLOYEE_GOALS, graphqlFilter).toPromise();

			if (result.error) {
				return Result.error(new GoalError(result.error.message));
			}

			const goals = result.data?.employeeGoals ?? [];
			const mappedGoals: Goal[] = [];

			// Resilient error handling: skip invalid goals instead of failing
			for (const goalData of goals) {
				const goalResult = this.mapToGoal(goalData);
				if (goalResult.isOk) {
					mappedGoals.push(goalResult.value);
				}
				// Skip invalid goals (e.g., invalid title, description, dates)
			}

			return Result.ok(mappedGoals);
		} catch (error) {
			return Result.error(
				new GoalError(
					`Failed to fetch goals: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	async create(data: CreateGoalData): Promise<Result<Goal, GoalValidationError>> {
		try {
			// Map domain data to GraphQL input
			const input = {
				employeeId: data.employeeId,
				title: data.title,
				description: data.description ?? '',
				targetDate: data.targetDate,
				progress: data.progress ?? 0,
				status: data.status ?? 'not_started',
				priority: data.priority ?? 'medium',
				quarter: data.quarter,
				year: data.year
			};

			const result = await this.client.mutation(CREATE_EMPLOYEE_GOAL, { input }).toPromise();

			if (result.error) {
				return Result.error(new GoalValidationError(result.error.message));
			}

			if (!result.data?.createEmployeeGoal) {
				return Result.error(new GoalValidationError('Failed to create goal'));
			}

			return this.mapToGoal(result.data.createEmployeeGoal);
		} catch (error) {
			return Result.error(
				new GoalValidationError(
					`Failed to create goal: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	async update(id: string, data: UpdateGoalData): Promise<Result<Goal, GoalError>> {
		try {
			// Map domain data to GraphQL input
			const input = {
				id,
				title: data.title,
				description: data.description,
				targetDate: data.targetDate,
				progress: data.progress,
				status: data.status,
				priority: data.priority,
				quarter: data.quarter,
				year: data.year
			};

			const result = await this.client.mutation(UPDATE_EMPLOYEE_GOAL, { input }).toPromise();

			if (result.error) {
				return Result.error(new GoalError(result.error.message));
			}

			if (!result.data?.updateEmployeeGoal) {
				return Result.error(new GoalNotFoundError(id));
			}

			return this.mapToGoal(result.data.updateEmployeeGoal);
		} catch (error) {
			return Result.error(
				new GoalError(
					`Failed to update goal: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	async delete(id: string): Promise<Result<void, GoalNotFoundError>> {
		try {
			const result = await this.client.mutation(DELETE_EMPLOYEE_GOAL, { id }).toPromise();

			if (result.error) {
				return Result.error(new GoalNotFoundError(id));
			}

			return Result.ok(undefined);
		} catch (error) {
			return Result.error(new GoalNotFoundError(id));
		}
	}

	async getGoalsForEmployee(employeeId: string): Promise<Result<Goal[], GoalError>> {
		return this.findAll({ employeeId });
	}

	async getGoalsByStatus(status: string): Promise<Result<Goal[], GoalError>> {
		return this.findAll({ status });
	}

	/**
	 * Map GraphQL goal data to domain Goal entity
	 * @private
	 */
	private mapToGoal(data: GraphQLGoal): Result<Goal, GoalValidationError> {
		// Validate and create GoalTitle
		const titleResult = GoalTitle.create(data.title);
		if (titleResult.isError) {
			return Result.error(titleResult.error);
		}

		// Validate and create GoalDescription
		const descriptionResult = GoalDescription.create(data.description ?? '');
		if (descriptionResult.isError) {
			return Result.error(descriptionResult.error);
		}

		// Validate and create TargetDate
		const targetDateResult = TargetDate.create(new Date(data.targetDate));
		if (targetDateResult.isError) {
			return Result.error(targetDateResult.error);
		}

		// Validate and create Progress
		const progressResult = Progress.create(data.progress);
		if (progressResult.isError) {
			return Result.error(progressResult.error);
		}

		// Validate and create GoalStatus
		const statusResult = GoalStatus.create(data.status);
		if (statusResult.isError) {
			return Result.error(statusResult.error);
		}

		// Validate and create GoalPriority
		const priorityResult = GoalPriority.create(data.priority);
		if (priorityResult.isError) {
			return Result.error(priorityResult.error);
		}

		// Create Quarter if present
		let quarter: Quarter | undefined;
		if (data.quarter) {
			const quarterResult = Quarter.create(data.quarter);
			if (quarterResult.isOk) {
				quarter = quarterResult.value;
			}
			// Skip invalid quarter (don't fail the entire goal)
		}

		// Create Goal entity
		return Goal.create({
			id: data.id,
			employeeId: data.employeeId,
			title: titleResult.value,
			description: descriptionResult.value,
			targetDate: targetDateResult.value,
			progress: progressResult.value,
			status: statusResult.value,
			priority: priorityResult.value,
			quarter,
			year: data.year ?? undefined,
			createdBy: data.createdBy,
			createdAt: new Date(data.createdAt),
			updatedAt: new Date(data.updatedAt),
			completedAt: data.completedAt ? new Date(data.completedAt) : undefined
		});
	}
}
