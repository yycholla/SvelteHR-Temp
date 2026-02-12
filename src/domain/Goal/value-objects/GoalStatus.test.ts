// src/domain/Goal/value-objects/GoalStatus.test.ts
import { describe, it, expect } from 'vitest';
import { GoalStatus } from './GoalStatus';
import { GoalStatusValidationError } from '../errors/GoalErrors';

describe('GoalStatus', () => {
	describe('create', () => {
		it('should create valid not_started status', () => {
			const result = GoalStatus.create('not_started');
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('not_started');
		});

		it('should create valid in_progress status', () => {
			const result = GoalStatus.create('in_progress');
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('in_progress');
		});

		it('should create valid completed status', () => {
			const result = GoalStatus.create('completed');
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('completed');
		});

		it('should create valid cancelled status', () => {
			const result = GoalStatus.create('cancelled');
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('cancelled');
		});

		it('should normalize uppercase status', () => {
			const result = GoalStatus.create('IN_PROGRESS');
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('in_progress');
		});

		it('should normalize hyphenated status', () => {
			const result = GoalStatus.create('in-progress');
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('in_progress');
		});

		it('should trim whitespace', () => {
			const result = GoalStatus.create('  not_started  ');
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('not_started');
		});

		it('should reject empty string', () => {
			const result = GoalStatus.create('');
			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(GoalStatusValidationError);
			expect(result.error.message).toContain('cannot be empty');
		});

		it('should reject whitespace-only string', () => {
			const result = GoalStatus.create('   ');
			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(GoalStatusValidationError);
		});

		it('should reject invalid status', () => {
			const result = GoalStatus.create('invalid');
			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(GoalStatusValidationError);
			expect(result.error.message).toContain('Invalid goal status');
		});
	});

	describe('status checks', () => {
		it('should identify not_started status', () => {
			const status = GoalStatus.create('not_started').value;
			expect(status.isNotStarted()).toBe(true);
			expect(status.isInProgress()).toBe(false);
			expect(status.isCompleted()).toBe(false);
			expect(status.isCancelled()).toBe(false);
		});

		it('should identify in_progress status', () => {
			const status = GoalStatus.create('in_progress').value;
			expect(status.isNotStarted()).toBe(false);
			expect(status.isInProgress()).toBe(true);
			expect(status.isCompleted()).toBe(false);
			expect(status.isCancelled()).toBe(false);
		});

		it('should identify completed status', () => {
			const status = GoalStatus.create('completed').value;
			expect(status.isNotStarted()).toBe(false);
			expect(status.isInProgress()).toBe(false);
			expect(status.isCompleted()).toBe(true);
			expect(status.isCancelled()).toBe(false);
		});

		it('should identify cancelled status', () => {
			const status = GoalStatus.create('cancelled').value;
			expect(status.isNotStarted()).toBe(false);
			expect(status.isInProgress()).toBe(false);
			expect(status.isCompleted()).toBe(false);
			expect(status.isCancelled()).toBe(true);
		});

		it('should identify active status', () => {
			const inProgress = GoalStatus.create('in_progress').value;
			expect(inProgress.isActive()).toBe(true);

			const notStarted = GoalStatus.create('not_started').value;
			expect(notStarted.isActive()).toBe(false);
		});

		it('should identify terminal statuses', () => {
			const completed = GoalStatus.create('completed').value;
			expect(completed.isTerminal()).toBe(true);

			const cancelled = GoalStatus.create('cancelled').value;
			expect(cancelled.isTerminal()).toBe(true);

			const inProgress = GoalStatus.create('in_progress').value;
			expect(inProgress.isTerminal()).toBe(false);
		});
	});

	describe('canTransitionTo', () => {
		it('should allow not_started to in_progress', () => {
			const from = GoalStatus.create('not_started').value;
			const to = GoalStatus.create('in_progress').value;
			expect(from.canTransitionTo(to)).toBe(true);
		});

		it('should allow not_started to cancelled', () => {
			const from = GoalStatus.create('not_started').value;
			const to = GoalStatus.create('cancelled').value;
			expect(from.canTransitionTo(to)).toBe(true);
		});

		it('should allow in_progress to completed', () => {
			const from = GoalStatus.create('in_progress').value;
			const to = GoalStatus.create('completed').value;
			expect(from.canTransitionTo(to)).toBe(true);
		});

		it('should allow in_progress to cancelled', () => {
			const from = GoalStatus.create('in_progress').value;
			const to = GoalStatus.create('cancelled').value;
			expect(from.canTransitionTo(to)).toBe(true);
		});

		it('should allow in_progress to not_started (restart)', () => {
			const from = GoalStatus.create('in_progress').value;
			const to = GoalStatus.create('not_started').value;
			expect(from.canTransitionTo(to)).toBe(true);
		});

		it('should allow cancelled to not_started (reopen)', () => {
			const from = GoalStatus.create('cancelled').value;
			const to = GoalStatus.create('not_started').value;
			expect(from.canTransitionTo(to)).toBe(true);
		});

		it('should not allow completed to any status', () => {
			const from = GoalStatus.create('completed').value;
			const toNotStarted = GoalStatus.create('not_started').value;
			const toInProgress = GoalStatus.create('in_progress').value;
			const toCancelled = GoalStatus.create('cancelled').value;

			expect(from.canTransitionTo(toNotStarted)).toBe(false);
			expect(from.canTransitionTo(toInProgress)).toBe(false);
			expect(from.canTransitionTo(toCancelled)).toBe(false);
		});

		it('should not allow not_started to completed', () => {
			const from = GoalStatus.create('not_started').value;
			const to = GoalStatus.create('completed').value;
			expect(from.canTransitionTo(to)).toBe(false);
		});
	});

	describe('equals', () => {
		it('should return true for same status', () => {
			const status1 = GoalStatus.create('in_progress').value;
			const status2 = GoalStatus.create('in_progress').value;
			expect(status1.equals(status2)).toBe(true);
		});

		it('should return false for different statuses', () => {
			const status1 = GoalStatus.create('in_progress').value;
			const status2 = GoalStatus.create('completed').value;
			expect(status1.equals(status2)).toBe(false);
		});
	});
});
