import { describe, expect, it } from 'vitest';
import { ProgressStatus } from './ProgressStatus';
import { InvalidAssignmentError } from '../errors/TrainingErrors';

describe('ProgressStatus', () => {
	describe('create', () => {
		it('returns Ok with not_started status', () => {
			const result = ProgressStatus.create('not_started');

			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('not_started');
		});

		it('returns Ok with in_progress status', () => {
			const result = ProgressStatus.create('in_progress');

			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('in_progress');
		});

		it('returns Ok with completed status', () => {
			const result = ProgressStatus.create('completed');

			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('completed');
		});

		it('returns InvalidAssignmentError for empty string', () => {
			const result = ProgressStatus.create('');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidAssignmentError);
		});

		it('returns InvalidAssignmentError for unknown status', () => {
			const result = ProgressStatus.create('pending');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidAssignmentError);
			expect(result.error.message).toContain('pending');
		});

		it('is case-sensitive - uppercase is invalid', () => {
			const result = ProgressStatus.create('COMPLETED');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidAssignmentError);
		});

		it('is case-sensitive - mixed case is invalid', () => {
			const result = ProgressStatus.create('In_Progress');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidAssignmentError);
		});

		it('returns InvalidAssignmentError for whitespace-only string', () => {
			const result = ProgressStatus.create('   ');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidAssignmentError);
		});

		it('includes valid options in error message', () => {
			const result = ProgressStatus.create('invalid');

			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('not_started');
			expect(result.error.message).toContain('in_progress');
			expect(result.error.message).toContain('completed');
		});

		it('returns InvalidAssignmentError has correct error code', () => {
			const result = ProgressStatus.create('invalid');

			expect(result.isError).toBe(true);
			expect(result.error.code).toBe('INVALID_TRAINING_ASSIGNMENT');
		});
	});

	describe('isCompleted', () => {
		it('returns true for completed status', () => {
			const status = ProgressStatus.create('completed').value;

			expect(status.isCompleted()).toBe(true);
		});

		it('returns false for not_started status', () => {
			const status = ProgressStatus.create('not_started').value;

			expect(status.isCompleted()).toBe(false);
		});

		it('returns false for in_progress status', () => {
			const status = ProgressStatus.create('in_progress').value;

			expect(status.isCompleted()).toBe(false);
		});
	});

	describe('isStarted', () => {
		it('returns false for not_started status', () => {
			const status = ProgressStatus.create('not_started').value;

			expect(status.isStarted()).toBe(false);
		});

		it('returns true for in_progress status', () => {
			const status = ProgressStatus.create('in_progress').value;

			expect(status.isStarted()).toBe(true);
		});

		it('returns true for completed status', () => {
			const status = ProgressStatus.create('completed').value;

			expect(status.isStarted()).toBe(true);
		});
	});

	describe('equals', () => {
		it('returns true for same status', () => {
			const status1 = ProgressStatus.create('in_progress').value;
			const status2 = ProgressStatus.create('in_progress').value;

			expect(status1.equals(status2)).toBe(true);
		});

		it('returns false for different statuses', () => {
			const status1 = ProgressStatus.create('not_started').value;
			const status2 = ProgressStatus.create('completed').value;

			expect(status1.equals(status2)).toBe(false);
		});

		it('returns false for not_started vs in_progress', () => {
			const status1 = ProgressStatus.create('not_started').value;
			const status2 = ProgressStatus.create('in_progress').value;

			expect(status1.equals(status2)).toBe(false);
		});
	});

	describe('toString', () => {
		it('returns the string value for not_started', () => {
			const status = ProgressStatus.create('not_started').value;

			expect(status.toString()).toBe('not_started');
		});

		it('returns the string value for in_progress', () => {
			const status = ProgressStatus.create('in_progress').value;

			expect(status.toString()).toBe('in_progress');
		});

		it('returns the string value for completed', () => {
			const status = ProgressStatus.create('completed').value;

			expect(status.toString()).toBe('completed');
		});
	});

	describe('value', () => {
		it('returns the ProgressStatusValue', () => {
			const status = ProgressStatus.create('in_progress').value;

			expect(status.value).toBe('in_progress');
		});
	});
});
