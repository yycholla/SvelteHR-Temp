// src/services/GoalService.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { GoalService } from './GoalService';
import { Result } from '$domain/Result';
import {
	Goal,
	GoalStatus,
	GoalPriority,
	GoalTitle,
	GoalDescription,
	TargetDate,
	Progress,
	Quarter,
	GoalNotFoundError,
	GoalValidationError,
	GoalError
} from '$domain/Goal';
import type {
	GoalRepository,
	CreateGoalData,
	UpdateGoalData,
	GoalFilter
} from './ports/GoalRepository';

// Mock Repository Implementation
class MockGoalRepository implements GoalRepository {
	private goals = new Map<string, Goal>();
	private nextId = 1;

	async findById(id: string): Promise<Result<Goal, GoalNotFoundError>> {
		const goal = this.goals.get(id);
		if (!goal) {
			return Result.error(new GoalNotFoundError(`Goal with ID ${id} not found`));
		}
		return Result.ok(goal);
	}

	async findAll(filter?: GoalFilter): Promise<Result<Goal[], GoalError>> {
		let goals = Array.from(this.goals.values());

		if (filter) {
			if (filter.employeeId) {
				goals = goals.filter((g) => g.employeeId === filter.employeeId);
			}
			if (filter.status) {
				goals = goals.filter((g) => g.status.value === filter.status);
			}
			if (filter.priority) {
				goals = goals.filter((g) => g.priority.value === filter.priority);
			}
			if (filter.quarter && filter.year) {
				goals = goals.filter((g) => g.quarter?.value === filter.quarter && g.year === filter.year);
			}
		}

		return Result.ok(goals);
	}

	async create(data: CreateGoalData): Promise<Result<Goal, GoalValidationError>> {
		const id = `goal-${this.nextId++}`;

		const titleResult = GoalTitle.create(data.title);
		if (titleResult.isError) {
			return Result.error(titleResult.error);
		}

		const descriptionResult = GoalDescription.create(data.description);
		if (descriptionResult.isError) {
			return Result.error(descriptionResult.error);
		}

		const targetDateResult = TargetDate.create(data.targetDate);
		if (targetDateResult.isError) {
			return Result.error(targetDateResult.error);
		}

		const statusResult = GoalStatus.create(data.status ?? 'not_started');
		if (statusResult.isError) {
			return Result.error(statusResult.error);
		}

		const priorityResult = GoalPriority.create(data.priority ?? 'medium');
		if (priorityResult.isError) {
			return Result.error(priorityResult.error);
		}

		const progressResult = Progress.create(data.progress ?? 0);
		if (progressResult.isError) {
			return Result.error(progressResult.error);
		}

		let quarter: Quarter | undefined;
		if (data.quarter) {
			const quarterResult = Quarter.create(data.quarter);
			if (quarterResult.isError) {
				return Result.error(quarterResult.error);
			}
			quarter = quarterResult.value;
		}

		const goalResult = Goal.create({
			id,
			employeeId: data.employeeId,
			title: titleResult.value,
			description: descriptionResult.value,
			targetDate: targetDateResult.value,
			progress: progressResult.value,
			status: statusResult.value,
			priority: priorityResult.value,
			quarter,
			year: data.year,
			createdBy: data.createdBy,
			createdAt: new Date(),
			updatedAt: new Date()
		});

		if (goalResult.isError) {
			return Result.error(goalResult.error);
		}

		this.goals.set(id, goalResult.value);
		return Result.ok(goalResult.value);
	}

	async update(id: string, data: UpdateGoalData): Promise<Result<Goal, GoalError>> {
		const goal = this.goals.get(id);
		if (!goal) {
			return Result.error(new GoalNotFoundError(`Goal with ID ${id} not found`));
		}

		let updatedGoal = goal;

		if (data.progress !== undefined) {
			const progressResult = Progress.create(data.progress);
			if (progressResult.isError) {
				return Result.error(progressResult.error);
			}
			const updateResult = updatedGoal.updateProgress(progressResult.value);
			if (updateResult.isError) {
				return Result.error(updateResult.error);
			}
			updatedGoal = updateResult.value;
		}

		if (data.status) {
			const statusResult = GoalStatus.create(data.status);
			if (statusResult.isError) {
				return Result.error(statusResult.error);
			}
			const updateResult = updatedGoal.updateStatus(statusResult.value);
			if (updateResult.isError) {
				return Result.error(updateResult.error);
			}
			updatedGoal = updateResult.value;
		}

		this.goals.set(id, updatedGoal);
		return Result.ok(updatedGoal);
	}

	async delete(id: string): Promise<Result<void, GoalNotFoundError>> {
		const goal = this.goals.get(id);
		if (!goal) {
			return Result.error(new GoalNotFoundError(`Goal with ID ${id} not found`));
		}

		this.goals.delete(id);
		return Result.ok(undefined);
	}

	async getGoalsForEmployee(employeeId: string): Promise<Result<Goal[], GoalError>> {
		const goals = Array.from(this.goals.values()).filter((g) => g.employeeId === employeeId);
		return Result.ok(goals);
	}

	async getGoalsByStatus(status: string): Promise<Result<Goal[], GoalError>> {
		const goals = Array.from(this.goals.values()).filter((g) => g.status.value === status);
		return Result.ok(goals);
	}

	// Helper method for tests
	clear(): void {
		this.goals.clear();
		this.nextId = 1;
	}
}

describe('GoalService', () => {
	let repository: MockGoalRepository;
	let service: GoalService;

	beforeEach(() => {
		repository = new MockGoalRepository();
		service = new GoalService(repository);
	});

	describe('getGoalById', () => {
		it('should return goal when found', async () => {
			// Arrange
			const createResult = await repository.create({
				employeeId: 'emp-1',
				title: 'Test Goal',
				description: 'Test Description',
				targetDate: '2026-12-31',
				createdBy: 'user-1'
			});
			expect(createResult.isOk).toBe(true);
			const goalId = createResult.value.id;

			// Act
			const result = await service.getGoalById(goalId);

			// Assert
			expect(result.isOk).toBe(true);
			expect(result.value.id).toBe(goalId);
			expect(result.value.title.value).toBe('Test Goal');
		});

		it('should return error when goal not found', async () => {
			// Act
			const result = await service.getGoalById('nonexistent-id');

			// Assert
			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(GoalNotFoundError);
		});

		it('should handle invalid ID format', async () => {
			// Act
			const result = await service.getGoalById('');

			// Assert
			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(GoalNotFoundError);
		});
	});

	describe('getAllGoals', () => {
		it('should return all goals without filter', async () => {
			// Arrange
			await repository.create({
				employeeId: 'emp-1',
				title: 'Goal 1',
				description: 'Description 1',
				targetDate: '2026-12-31',
				createdBy: 'user-1'
			});
			await repository.create({
				employeeId: 'emp-2',
				title: 'Goal 2',
				description: 'Description 2',
				targetDate: '2026-12-31',
				createdBy: 'user-1'
			});

			// Act
			const result = await service.getAllGoals();

			// Assert
			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(2);
		});

		it('should return filtered goals by status', async () => {
			// Arrange
			await repository.create({
				employeeId: 'emp-1',
				title: 'Goal 1',
				description: 'Description 1',
				targetDate: '2026-12-31',
				status: 'in_progress',
				createdBy: 'user-1'
			});
			await repository.create({
				employeeId: 'emp-2',
				title: 'Goal 2',
				description: 'Description 2',
				targetDate: '2026-12-31',
				status: 'completed',
				createdBy: 'user-1'
			});

			// Act
			const result = await service.getAllGoals({ status: 'in_progress' });

			// Assert
			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(1);
			expect(result.value[0].status.value).toBe('in_progress');
		});

		it('should return empty array when no goals exist', async () => {
			// Act
			const result = await service.getAllGoals();

			// Assert
			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(0);
		});
	});

	describe('createGoal', () => {
		it('should create goal with valid data', async () => {
			// Arrange
			const data: CreateGoalData = {
				employeeId: 'emp-1',
				title: 'New Goal',
				description: 'Goal Description',
				targetDate: '2026-12-31',
				createdBy: 'user-1'
			};

			// Act
			const result = await service.createGoal(data);

			// Assert
			expect(result.isOk).toBe(true);
			expect(result.value.title.value).toBe('New Goal');
			expect(result.value.employeeId).toBe('emp-1');
		});

		it('should create goal with all optional fields', async () => {
			// Arrange
			const data: CreateGoalData = {
				employeeId: 'emp-1',
				title: 'Comprehensive Goal',
				description: 'Detailed Description',
				targetDate: '2026-12-31',
				progress: 50,
				status: 'in_progress',
				priority: 'high',
				quarter: 'Q1',
				year: 2026,
				createdBy: 'user-1'
			};

			// Act
			const result = await service.createGoal(data);

			// Assert
			expect(result.isOk).toBe(true);
			expect(result.value.progress.value).toBe(50);
			expect(result.value.status.value).toBe('in_progress');
			expect(result.value.priority.value).toBe('high');
			expect(result.value.quarter?.value).toBe(1);
			expect(result.value.year).toBe(2026);
		});

		it('should create goal with minimal required fields', async () => {
			// Arrange
			const data: CreateGoalData = {
				employeeId: 'emp-1',
				title: 'Minimal Goal',
				description: 'Min Description',
				targetDate: '2026-12-31',
				createdBy: 'user-1'
			};

			// Act
			const result = await service.createGoal(data);

			// Assert
			expect(result.isOk).toBe(true);
			expect(result.value.progress.value).toBe(0);
			expect(result.value.status.value).toBe('not_started');
			expect(result.value.priority.value).toBe('medium');
		});
	});

	describe('updateGoal', () => {
		it('should update goal successfully', async () => {
			// Arrange
			const createResult = await repository.create({
				employeeId: 'emp-1',
				title: 'Original Title',
				description: 'Original Description',
				targetDate: '2026-12-31',
				createdBy: 'user-1'
			});
			expect(createResult.isOk).toBe(true);
			const goalId = createResult.value.id;

			// Act
			const result = await service.updateGoal(goalId, { progress: 50 });

			// Assert
			expect(result.isOk).toBe(true);
			expect(result.value.progress.value).toBe(50);
		});

		it('should return error for nonexistent goal', async () => {
			// Act
			const result = await service.updateGoal('nonexistent-id', { progress: 50 });

			// Assert
			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(GoalNotFoundError);
		});

		it('should update multiple fields at once', async () => {
			// Arrange
			const createResult = await repository.create({
				employeeId: 'emp-1',
				title: 'Original Title',
				description: 'Original Description',
				targetDate: '2026-12-31',
				createdBy: 'user-1'
			});
			expect(createResult.isOk).toBe(true);
			const goalId = createResult.value.id;

			// Act
			const result = await service.updateGoal(goalId, {
				progress: 75,
				status: 'in_progress'
			});

			// Assert
			expect(result.isOk).toBe(true);
			expect(result.value.progress.value).toBe(75);
			expect(result.value.status.value).toBe('in_progress');
		});
	});

	describe('deleteGoal', () => {
		it('should delete goal successfully', async () => {
			// Arrange
			const createResult = await repository.create({
				employeeId: 'emp-1',
				title: 'To Be Deleted',
				description: 'Description',
				targetDate: '2026-12-31',
				createdBy: 'user-1'
			});
			expect(createResult.isOk).toBe(true);
			const goalId = createResult.value.id;

			// Act
			const deleteResult = await service.deleteGoal(goalId);

			// Assert
			expect(deleteResult.isOk).toBe(true);
		});

		it('should return error for nonexistent goal', async () => {
			// Act
			const result = await service.deleteGoal('nonexistent-id');

			// Assert
			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(GoalNotFoundError);
		});

		it('should verify goal is actually deleted', async () => {
			// Arrange
			const createResult = await repository.create({
				employeeId: 'emp-1',
				title: 'To Be Deleted',
				description: 'Description',
				targetDate: '2026-12-31',
				createdBy: 'user-1'
			});
			expect(createResult.isOk).toBe(true);
			const goalId = createResult.value.id;

			// Act
			await service.deleteGoal(goalId);
			const findResult = await service.getGoalById(goalId);

			// Assert
			expect(findResult.isError).toBe(true);
			expect(findResult.error).toBeInstanceOf(GoalNotFoundError);
		});
	});

	describe('getGoalsForEmployee', () => {
		it('should return goals for specific employee', async () => {
			// Arrange
			await repository.create({
				employeeId: 'emp-1',
				title: 'Employee 1 Goal 1',
				description: 'Description',
				targetDate: '2026-12-31',
				createdBy: 'user-1'
			});
			await repository.create({
				employeeId: 'emp-1',
				title: 'Employee 1 Goal 2',
				description: 'Description',
				targetDate: '2026-12-31',
				createdBy: 'user-1'
			});
			await repository.create({
				employeeId: 'emp-2',
				title: 'Employee 2 Goal',
				description: 'Description',
				targetDate: '2026-12-31',
				createdBy: 'user-1'
			});

			// Act
			const result = await service.getGoalsForEmployee('emp-1');

			// Assert
			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(2);
			expect(result.value.every((g) => g.employeeId === 'emp-1')).toBe(true);
		});

		it('should return empty array for employee with no goals', async () => {
			// Act
			const result = await service.getGoalsForEmployee('emp-999');

			// Assert
			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(0);
		});
	});

	describe('getGoalsByStatus', () => {
		it('should return goals by status', async () => {
			// Arrange
			await repository.create({
				employeeId: 'emp-1',
				title: 'In Progress Goal',
				description: 'Description',
				targetDate: '2026-12-31',
				status: 'in_progress',
				createdBy: 'user-1'
			});
			await repository.create({
				employeeId: 'emp-2',
				title: 'Another In Progress Goal',
				description: 'Description',
				targetDate: '2026-12-31',
				status: 'in_progress',
				createdBy: 'user-1'
			});
			await repository.create({
				employeeId: 'emp-3',
				title: 'Completed Goal',
				description: 'Description',
				targetDate: '2026-12-31',
				status: 'completed',
				createdBy: 'user-1'
			});

			// Act
			const result = await service.getGoalsByStatus('in_progress');

			// Assert
			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(2);
			expect(result.value.every((g) => g.status.value === 'in_progress')).toBe(true);
		});

		it('should return empty array when no goals match status', async () => {
			// Arrange
			await repository.create({
				employeeId: 'emp-1',
				title: 'In Progress Goal',
				description: 'Description',
				targetDate: '2026-12-31',
				status: 'in_progress',
				createdBy: 'user-1'
			});

			// Act
			const result = await service.getGoalsByStatus('cancelled');

			// Assert
			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(0);
		});
	});

	describe('calculateStatistics', () => {
		it('should calculate statistics correctly for mixed goals', async () => {
			// Arrange
			const goals: Goal[] = [];

			// Create goals with different states
			const goal1Result = await repository.create({
				employeeId: 'emp-1',
				title: 'Active High Priority',
				description: 'Description',
				targetDate: '2026-12-31',
				status: 'in_progress',
				priority: 'high',
				progress: 50,
				createdBy: 'user-1'
			});
			goals.push(goal1Result.value);

			const goal2Result = await repository.create({
				employeeId: 'emp-1',
				title: 'Completed Goal',
				description: 'Description',
				targetDate: '2026-01-01',
				status: 'completed',
				progress: 100,
				createdBy: 'user-1'
			});
			goals.push(goal2Result.value);

			const goal3Result = await repository.create({
				employeeId: 'emp-1',
				title: 'Overdue Goal',
				description: 'Description',
				targetDate: '2025-12-31', // Past date
				status: 'in_progress',
				priority: 'high',
				progress: 25,
				createdBy: 'user-1'
			});
			goals.push(goal3Result.value);

			// Act
			const stats = service.calculateStatistics(goals);

			// Assert
			expect(stats.totalGoals).toBe(3);
			expect(stats.activeGoals).toBe(2); // in_progress goals
			expect(stats.completedGoals).toBe(1);
			expect(stats.overdueGoals).toBe(1);
			expect(stats.highPriorityGoals).toBe(2);
			expect(stats.averageProgress).toBe(58); // (50 + 100 + 25) / 3 = 58.33 -> 58
			expect(stats.completionRate).toBe(33); // 1/3 * 100 = 33.33 -> 33
		});

		it('should handle empty goal list', () => {
			// Act
			const stats = service.calculateStatistics([]);

			// Assert
			expect(stats.totalGoals).toBe(0);
			expect(stats.activeGoals).toBe(0);
			expect(stats.completedGoals).toBe(0);
			expect(stats.overdueGoals).toBe(0);
			expect(stats.highPriorityGoals).toBe(0);
			expect(stats.averageProgress).toBe(0);
			expect(stats.completionRate).toBe(0);
		});

		it('should handle all completed goals', async () => {
			// Arrange
			const goals: Goal[] = [];

			for (let i = 0; i < 5; i++) {
				const goalResult = await repository.create({
					employeeId: 'emp-1',
					title: `Completed Goal ${i}`,
					description: 'Description',
					targetDate: '2026-12-31',
					status: 'completed',
					progress: 100,
					createdBy: 'user-1'
				});
				goals.push(goalResult.value);
			}

			// Act
			const stats = service.calculateStatistics(goals);

			// Assert
			expect(stats.totalGoals).toBe(5);
			expect(stats.completedGoals).toBe(5);
			expect(stats.completionRate).toBe(100);
			expect(stats.averageProgress).toBe(100);
		});

		it('should handle all overdue goals', async () => {
			// Arrange
			const goals: Goal[] = [];

			for (let i = 0; i < 3; i++) {
				const goalResult = await repository.create({
					employeeId: 'emp-1',
					title: `Overdue Goal ${i}`,
					description: 'Description',
					targetDate: '2025-01-01', // Past date
					status: 'in_progress',
					progress: 30,
					createdBy: 'user-1'
				});
				goals.push(goalResult.value);
			}

			// Act
			const stats = service.calculateStatistics(goals);

			// Assert
			expect(stats.totalGoals).toBe(3);
			expect(stats.overdueGoals).toBe(3);
			expect(stats.completedGoals).toBe(0);
			expect(stats.completionRate).toBe(0);
		});

		it('should calculate average progress with precision', async () => {
			// Arrange
			const goals: Goal[] = [];

			const goal1Result = await repository.create({
				employeeId: 'emp-1',
				title: 'Goal 1',
				description: 'Description',
				targetDate: '2026-12-31',
				progress: 33,
				createdBy: 'user-1'
			});
			goals.push(goal1Result.value);

			const goal2Result = await repository.create({
				employeeId: 'emp-1',
				title: 'Goal 2',
				description: 'Description',
				targetDate: '2026-12-31',
				progress: 66,
				createdBy: 'user-1'
			});
			goals.push(goal2Result.value);

			const goal3Result = await repository.create({
				employeeId: 'emp-1',
				title: 'Goal 3',
				description: 'Description',
				targetDate: '2026-12-31',
				progress: 99,
				createdBy: 'user-1'
			});
			goals.push(goal3Result.value);

			// Act
			const stats = service.calculateStatistics(goals);

			// Assert
			expect(stats.averageProgress).toBe(66); // (33 + 66 + 99) / 3 = 66
		});
	});
});
