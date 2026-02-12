// src/services/GoalService.ts
import { Result } from '$domain/Result';
import { Goal, GoalNotFoundError, GoalValidationError, GoalError } from '$domain/Goal';
import type {
	GoalRepository,
	CreateGoalData,
	UpdateGoalData,
	GoalFilter
} from './ports/GoalRepository';

export interface GoalStatistics {
	totalGoals: number;
	activeGoals: number;
	completedGoals: number;
	overdueGoals: number;
	highPriorityGoals: number;
	averageProgress: number;
	completionRate: number;
}

export class GoalService {
	constructor(private readonly repository: GoalRepository) {}

	async getGoalById(id: string): Promise<Result<Goal, GoalNotFoundError>> {
		try {
			return await this.repository.findById(id);
		} catch (error) {
			return Result.error(
				new GoalError(
					`Failed to fetch goal: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			) as Result<Goal, GoalNotFoundError>;
		}
	}

	async getAllGoals(filter?: GoalFilter): Promise<Result<Goal[], GoalError>> {
		try {
			return await this.repository.findAll(filter);
		} catch (error) {
			return Result.error(
				new GoalError(
					`Failed to fetch goals: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	async createGoal(data: CreateGoalData): Promise<Result<Goal, GoalValidationError>> {
		try {
			return await this.repository.create(data);
		} catch (error) {
			return Result.error(
				new GoalValidationError(
					`Failed to create goal: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	async updateGoal(id: string, data: UpdateGoalData): Promise<Result<Goal, GoalError>> {
		try {
			return await this.repository.update(id, data);
		} catch (error) {
			return Result.error(
				new GoalError(
					`Failed to update goal: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	async deleteGoal(id: string): Promise<Result<void, GoalNotFoundError>> {
		try {
			return await this.repository.delete(id);
		} catch (error) {
			return Result.error(
				new GoalError(
					`Failed to delete goal: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			) as Result<void, GoalNotFoundError>;
		}
	}

	async getGoalsForEmployee(employeeId: string): Promise<Result<Goal[], GoalError>> {
		try {
			return await this.repository.getGoalsForEmployee(employeeId);
		} catch (error) {
			return Result.error(
				new GoalError(
					`Failed to fetch goals for employee: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	async getGoalsByStatus(status: string): Promise<Result<Goal[], GoalError>> {
		try {
			return await this.repository.getGoalsByStatus(status);
		} catch (error) {
			return Result.error(
				new GoalError(
					`Failed to fetch goals by status: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	calculateStatistics(goals: Goal[]): GoalStatistics {
		const totalGoals = goals.length;
		const activeGoals = goals.filter((g) => g.isActive()).length;
		const completedGoals = goals.filter((g) => g.isComplete()).length;
		const overdueGoals = goals.filter((g) => g.isOverdue()).length;
		const highPriorityGoals = goals.filter((g) => g.priority.isHigh()).length;

		const avgProgress =
			totalGoals > 0 ? goals.reduce((sum, g) => sum + g.progress.value, 0) / totalGoals : 0;

		const completionRate = totalGoals > 0 ? (completedGoals / totalGoals) * 100 : 0;

		return {
			totalGoals,
			activeGoals,
			completedGoals,
			overdueGoals,
			highPriorityGoals,
			averageProgress: Math.round(avgProgress),
			completionRate: Math.round(completionRate)
		};
	}
}
