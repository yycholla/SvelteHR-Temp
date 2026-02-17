// src/domain/Training/TrainingProgress.test.ts
import { describe, it, expect } from 'vitest';
import { TrainingProgress } from './TrainingProgress';
import { ProgressStatus } from './value-objects/ProgressStatus';
import { InvalidAssignmentError } from './errors/TrainingErrors';

const VALID_ID = '123e4567-e89b-12d3-a456-426614174000';
const VALID_USER_ID = '123e4567-e89b-12d3-a456-426614174001';
const VALID_CONTENT_ID = '123e4567-e89b-12d3-a456-426614174002';

function makeStatus(value: string): ProgressStatus {
	return ProgressStatus.create(value).value;
}

function makeValidProgress(overrides: Partial<{
	id: string;
	userId: string;
	trainingContentId: string;
	status: ProgressStatus;
	completedAt: Date | null;
}> = {}) {
	return TrainingProgress.create({
		id: overrides.id ?? VALID_ID,
		userId: overrides.userId ?? VALID_USER_ID,
		trainingContentId: overrides.trainingContentId ?? VALID_CONTENT_ID,
		status: overrides.status ?? makeStatus('not_started'),
		completedAt: overrides.completedAt !== undefined ? overrides.completedAt : null
	});
}

describe('TrainingProgress', () => {
	describe('create()', () => {
		it('should create valid progress with not_started status', () => {
			const result = makeValidProgress();

			expect(result.isOk).toBe(true);
			expect(result.value.id).toBe(VALID_ID);
			expect(result.value.userId).toBe(VALID_USER_ID);
			expect(result.value.trainingContentId).toBe(VALID_CONTENT_ID);
			expect(result.value.status.value).toBe('not_started');
			expect(result.value.completedAt).toBeNull();
		});

		it('should create progress with in_progress status', () => {
			const result = makeValidProgress({ status: makeStatus('in_progress') });

			expect(result.isOk).toBe(true);
			expect(result.value.status.value).toBe('in_progress');
		});

		it('should create progress with completed status and completedAt date', () => {
			const completedAt = new Date('2026-01-15T09:00:00Z');
			const result = makeValidProgress({
				status: makeStatus('completed'),
				completedAt
			});

			expect(result.isOk).toBe(true);
			expect(result.value.status.value).toBe('completed');
			expect(result.value.completedAt).toEqual(completedAt);
		});

		it('should return error for invalid progress ID', () => {
			const result = makeValidProgress({ id: 'not-a-uuid' });

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidAssignmentError);
			expect(result.error.message).toContain('Invalid progress ID format');
		});

		it('should return error for empty progress ID', () => {
			const result = makeValidProgress({ id: '' });

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidAssignmentError);
		});

		it('should return error for invalid user ID', () => {
			const result = makeValidProgress({ userId: 'not-a-uuid' });

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidAssignmentError);
			expect(result.error.message).toContain('Invalid user ID format');
		});

		it('should return error for empty user ID', () => {
			const result = makeValidProgress({ userId: '' });

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidAssignmentError);
		});

		it('should return error for invalid trainingContentId', () => {
			const result = makeValidProgress({ trainingContentId: 'not-a-uuid' });

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidAssignmentError);
			expect(result.error.message).toContain('Invalid training content ID format');
		});
	});

	describe('defensive copies for completedAt', () => {
		it('should store a defensive copy of completedAt', () => {
			const completedAt = new Date('2026-01-15T09:00:00Z');
			const result = makeValidProgress({ status: makeStatus('completed'), completedAt });
			expect(result.isOk).toBe(true);

			const originalTime = completedAt.getTime();
			completedAt.setFullYear(2000);
			expect(result.value.completedAt?.getTime()).toBe(originalTime);
		});

		it('should return a defensive copy from the getter', () => {
			const completedAt = new Date('2026-01-15T09:00:00Z');
			const result = makeValidProgress({ status: makeStatus('completed'), completedAt });
			expect(result.isOk).toBe(true);

			const got1 = result.value.completedAt;
			const got2 = result.value.completedAt;
			expect(got1?.getTime()).toBe(got2?.getTime());
			expect(got1).not.toBe(got2);
		});
	});

	describe('isCompleted()', () => {
		it('should return false for not_started status', () => {
			const result = makeValidProgress({ status: makeStatus('not_started') });
			expect(result.value.isCompleted()).toBe(false);
		});

		it('should return false for in_progress status', () => {
			const result = makeValidProgress({ status: makeStatus('in_progress') });
			expect(result.value.isCompleted()).toBe(false);
		});

		it('should return true for completed status', () => {
			const result = makeValidProgress({
				status: makeStatus('completed'),
				completedAt: new Date()
			});
			expect(result.value.isCompleted()).toBe(true);
		});
	});

	describe('complete()', () => {
		it('should return a new instance with completed status', () => {
			const progress = makeValidProgress({ status: makeStatus('not_started') }).value;
			const completed = progress.complete();

			expect(completed.isCompleted()).toBe(true);
			expect(completed.status.value).toBe('completed');
			expect(completed.completedAt).toBeInstanceOf(Date);
		});

		it('should set provided completedAt date', () => {
			const progress = makeValidProgress({ status: makeStatus('in_progress') }).value;
			const completionDate = new Date('2026-02-01T10:00:00Z');
			const completed = progress.complete(completionDate);

			expect(completed.completedAt?.getTime()).toBe(completionDate.getTime());
		});

		it('should not mutate the original instance', () => {
			const progress = makeValidProgress({ status: makeStatus('not_started') }).value;
			const _completed = progress.complete();

			expect(progress.status.value).toBe('not_started');
			expect(progress.isCompleted()).toBe(false);
		});

		it('should default to current time if no date provided', () => {
			const before = Date.now();
			const progress = makeValidProgress({ status: makeStatus('in_progress') }).value;
			const completed = progress.complete();
			const after = Date.now();

			const completedTime = completed.completedAt!.getTime();
			expect(completedTime).toBeGreaterThanOrEqual(before);
			expect(completedTime).toBeLessThanOrEqual(after);
		});
	});
});
