// src/domain/Goal/entities/Goal.test.ts
import { describe, it, expect } from 'vitest';
import { Goal } from './Goal';
import { GoalStatus } from '../value-objects/GoalStatus';
import { GoalPriority } from '../value-objects/GoalPriority';
import { GoalTitle } from '../value-objects/GoalTitle';
import { GoalDescription } from '../value-objects/GoalDescription';
import { TargetDate } from '../value-objects/TargetDate';
import { Progress } from '../value-objects/Progress';
import { Quarter } from '../value-objects/Quarter';
import { GoalValidationError, InvalidStatusTransitionError } from '../errors/GoalErrors';

describe('Goal', () => {
	const createValidProps = () => ({
		id: 'goal-123',
		employeeId: 'emp-456',
		title: GoalTitle.create('Complete training').value,
		description: GoalDescription.create('Complete React training course').value,
		targetDate: TargetDate.create('2025-12-31').value,
		progress: Progress.create(0).value,
		status: GoalStatus.create('not_started').value,
		priority: GoalPriority.create('high').value,
		quarter: Quarter.create('Q4').value,
		year: 2025,
		createdBy: 'manager-789',
		createdAt: new Date('2025-01-01'),
		updatedAt: new Date('2025-01-01')
	});

	describe('create', () => {
		it('should create valid goal', () => {
			const result = Goal.create(createValidProps());
			expect(result.isOk).toBe(true);
		});

		it('should reject empty id', () => {
			const props = { ...createValidProps(), id: '' };
			const result = Goal.create(props);
			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(GoalValidationError);
		});

		it('should reject empty employeeId', () => {
			const props = { ...createValidProps(), employeeId: '' };
			const result = Goal.create(props);
			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(GoalValidationError);
		});

		it('should reject empty createdBy', () => {
			const props = { ...createValidProps(), createdBy: '' };
			const result = Goal.create(props);
			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(GoalValidationError);
		});

		it('should reject invalid year below 2000', () => {
			const props = { ...createValidProps(), year: 1999 };
			const result = Goal.create(props);
			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('between 2000 and 2100');
		});

		it('should reject invalid year above 2100', () => {
			const props = { ...createValidProps(), year: 2101 };
			const result = Goal.create(props);
			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('between 2000 and 2100');
		});

		it('should create without optional quarter', () => {
			const props = { ...createValidProps(), quarter: undefined };
			const result = Goal.create(props);
			expect(result.isOk).toBe(true);
		});

		it('should create without optional year', () => {
			const props = { ...createValidProps(), year: undefined };
			const result = Goal.create(props);
			expect(result.isOk).toBe(true);
		});

		it('should create defensive copies of dates', () => {
			const props = createValidProps();
			const goal = Goal.create(props).value;
			const originalYear = goal.createdAt.getFullYear();

			// Mutate the original input date
			props.createdAt.setFullYear(2099);

			// Goal should be unaffected
			expect(goal.createdAt.getFullYear()).toBe(originalYear);
			expect(goal.createdAt.getFullYear()).not.toBe(2099);
		});
	});

	describe('updateStatus', () => {
		it('should transition from not_started to in_progress', () => {
			const goal = Goal.create(createValidProps()).value;
			const newStatus = GoalStatus.create('in_progress').value;
			const result = goal.updateStatus(newStatus);

			expect(result.isOk).toBe(true);
			expect(result.value.status.value).toBe('in_progress');
		});

		it('should transition from in_progress to completed', () => {
			const props = {
				...createValidProps(),
				status: GoalStatus.create('in_progress').value
			};
			const goal = Goal.create(props).value;
			const newStatus = GoalStatus.create('completed').value;
			const result = goal.updateStatus(newStatus);

			expect(result.isOk).toBe(true);
			expect(result.value.status.value).toBe('completed');
			expect(result.value.completedAt).toBeDefined();
		});

		it('should reject invalid transition from completed', () => {
			const props = {
				...createValidProps(),
				status: GoalStatus.create('completed').value,
				completedAt: new Date()
			};
			const goal = Goal.create(props).value;
			const newStatus = GoalStatus.create('in_progress').value;
			const result = goal.updateStatus(newStatus);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidStatusTransitionError);
		});

		it('should update updatedAt timestamp', () => {
			const goal = Goal.create(createValidProps()).value;
			const originalUpdatedAt = goal.updatedAt.getTime();

			const newStatus = GoalStatus.create('in_progress').value;
			const updatedGoal = goal.updateStatus(newStatus).value;

			expect(updatedGoal.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt);
		});
	});

	describe('updateProgress', () => {
		it('should update progress', () => {
			const goal = Goal.create(createValidProps()).value;
			const newProgress = Progress.create(50).value;
			const result = goal.updateProgress(newProgress);

			expect(result.isOk).toBe(true);
			expect(result.value.progress.value).toBe(50);
		});

		it('should auto-complete when progress reaches 100%', () => {
			const goal = Goal.create(createValidProps()).value;
			const completeProgress = Progress.complete();
			const result = goal.updateProgress(completeProgress);

			expect(result.isOk).toBe(true);
			expect(result.value.progress.value).toBe(100);
			expect(result.value.status.isCompleted()).toBe(true);
			expect(result.value.completedAt).toBeDefined();
		});

		it('should not change status if already completed', () => {
			const props = {
				...createValidProps(),
				status: GoalStatus.create('completed').value,
				progress: Progress.complete(),
				completedAt: new Date('2025-06-01')
			};
			const goal = Goal.create(props).value;
			const result = goal.updateProgress(Progress.complete());

			expect(result.isOk).toBe(true);
			expect(result.value.status.isCompleted()).toBe(true);
		});
	});

	describe('updatePriority', () => {
		it('should update priority', () => {
			const goal = Goal.create(createValidProps()).value;
			const newPriority = GoalPriority.create('low').value;
			const updatedGoal = goal.updatePriority(newPriority);

			expect(updatedGoal.priority.value).toBe('low');
		});
	});

	describe('updateTargetDate', () => {
		it('should update target date', () => {
			const goal = Goal.create(createValidProps()).value;
			const newDate = TargetDate.create('2026-06-30').value;
			const updatedGoal = goal.updateTargetDate(newDate);

			expect(updatedGoal.targetDate.toISOString()).toBe('2026-06-30');
		});
	});

	describe('isComplete', () => {
		it('should return true for completed goal', () => {
			const props = {
				...createValidProps(),
				status: GoalStatus.create('completed').value
			};
			const goal = Goal.create(props).value;
			expect(goal.isComplete()).toBe(true);
		});

		it('should return false for incomplete goal', () => {
			const goal = Goal.create(createValidProps()).value;
			expect(goal.isComplete()).toBe(false);
		});
	});

	describe('isOverdue', () => {
		it('should return true for overdue goal', () => {
			const props = {
				...createValidProps(),
				targetDate: TargetDate.create('2020-01-01').value
			};
			const goal = Goal.create(props).value;
			expect(goal.isOverdue()).toBe(true);
		});

		it('should return false for future goal', () => {
			const props = {
				...createValidProps(),
				targetDate: TargetDate.create('2099-12-31').value
			};
			const goal = Goal.create(props).value;
			expect(goal.isOverdue()).toBe(false);
		});

		it('should return false for completed goal even if past target date', () => {
			const props = {
				...createValidProps(),
				status: GoalStatus.create('completed').value,
				targetDate: TargetDate.create('2020-01-01').value
			};
			const goal = Goal.create(props).value;
			expect(goal.isOverdue()).toBe(false);
		});
	});

	describe('isActive', () => {
		it('should return true for in_progress goal', () => {
			const props = {
				...createValidProps(),
				status: GoalStatus.create('in_progress').value
			};
			const goal = Goal.create(props).value;
			expect(goal.isActive()).toBe(true);
		});

		it('should return false for not_started goal', () => {
			const goal = Goal.create(createValidProps()).value;
			expect(goal.isActive()).toBe(false);
		});
	});

	describe('equals', () => {
		it('should return true for same goal ID', () => {
			const goal1 = Goal.create(createValidProps()).value;
			const goal2 = Goal.create(createValidProps()).value;
			expect(goal1.equals(goal2)).toBe(true);
		});

		it('should return false for different goal IDs', () => {
			const props1 = createValidProps();
			const props2 = { ...createValidProps(), id: 'different-id' };
			const goal1 = Goal.create(props1).value;
			const goal2 = Goal.create(props2).value;
			expect(goal1.equals(goal2)).toBe(false);
		});
	});

	describe('defensive copies', () => {
		it('should protect createdAt from external mutation', () => {
			const goal = Goal.create(createValidProps()).value;
			const originalYear = goal.createdAt.getFullYear();

			// Get the date and mutate it
			const returnedDate = goal.createdAt;
			returnedDate.setFullYear(2099);

			// Goal should be unaffected
			expect(goal.createdAt.getFullYear()).toBe(originalYear);
			expect(goal.createdAt.getFullYear()).not.toBe(2099);
		});

		it('should protect updatedAt from external mutation', () => {
			const goal = Goal.create(createValidProps()).value;
			const originalYear = goal.updatedAt.getFullYear();

			// Get the date and mutate it
			const returnedDate = goal.updatedAt;
			returnedDate.setFullYear(2099);

			// Goal should be unaffected
			expect(goal.updatedAt.getFullYear()).toBe(originalYear);
			expect(goal.updatedAt.getFullYear()).not.toBe(2099);
		});

		it('should protect completedAt from external mutation', () => {
			const props = {
				...createValidProps(),
				completedAt: new Date('2025-06-01')
			};
			const goal = Goal.create(props).value;
			const originalYear = goal.completedAt!.getFullYear();

			// Get the date and mutate it
			const returnedDate = goal.completedAt!;
			returnedDate.setFullYear(2099);

			// Goal should be unaffected
			expect(goal.completedAt!.getFullYear()).toBe(originalYear);
			expect(goal.completedAt!.getFullYear()).not.toBe(2099);
		});
	});
});
