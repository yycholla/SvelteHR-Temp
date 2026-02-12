// src/domain/PerformanceReview/value-objects/ReviewStatus.test.ts
import { describe, it, expect } from 'vitest';
import { ReviewStatus } from './ReviewStatus';
import { ReviewStatusValidationError } from '../errors/PerformanceReviewErrors';

describe('ReviewStatus', () => {
	describe('create', () => {
		it('should create draft status', () => {
			const result = ReviewStatus.create('draft');

			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('draft');
			expect(result.value.isDraft()).toBe(true);
		});

		it('should create in_progress status', () => {
			const result = ReviewStatus.create('in_progress');

			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('in_progress');
			expect(result.value.isInProgress()).toBe(true);
		});

		it('should create completed status', () => {
			const result = ReviewStatus.create('completed');

			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('completed');
			expect(result.value.isCompleted()).toBe(true);
		});

		it('should create overdue status', () => {
			const result = ReviewStatus.create('overdue');

			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('overdue');
			expect(result.value.isOverdue()).toBe(true);
		});

		it('should reject invalid status', () => {
			const result = ReviewStatus.create('invalid');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(ReviewStatusValidationError);
			expect(result.error.message).toContain('Invalid review status');
		});

		it('should reject empty status', () => {
			const result = ReviewStatus.create('');

			expect(result.isError).toBe(true);
		});
	});

	describe('canTransitionTo', () => {
		it('should allow draft to in_progress', () => {
			const draft = ReviewStatus.create('draft').value;
			const inProgress = ReviewStatus.create('in_progress').value;

			expect(draft.canTransitionTo(inProgress)).toBe(true);
		});

		it('should allow in_progress to completed', () => {
			const inProgress = ReviewStatus.create('in_progress').value;
			const completed = ReviewStatus.create('completed').value;

			expect(inProgress.canTransitionTo(completed)).toBe(true);
		});

		it('should not allow completed to draft', () => {
			const completed = ReviewStatus.create('completed').value;
			const draft = ReviewStatus.create('draft').value;

			expect(completed.canTransitionTo(draft)).toBe(false);
		});

		it('should allow any status to overdue', () => {
			const draft = ReviewStatus.create('draft').value;
			const overdue = ReviewStatus.create('overdue').value;

			expect(draft.canTransitionTo(overdue)).toBe(true);
		});

		it('should allow in_progress to overdue', () => {
			const inProgress = ReviewStatus.create('in_progress').value;
			const overdue = ReviewStatus.create('overdue').value;

			expect(inProgress.canTransitionTo(overdue)).toBe(true);
		});

		it('should allow completed to overdue', () => {
			const completed = ReviewStatus.create('completed').value;
			const overdue = ReviewStatus.create('overdue').value;

			expect(completed.canTransitionTo(overdue)).toBe(true);
		});

		it('should allow overdue to in_progress', () => {
			const overdue = ReviewStatus.create('overdue').value;
			const inProgress = ReviewStatus.create('in_progress').value;

			expect(overdue.canTransitionTo(inProgress)).toBe(true);
		});

		it('should allow overdue to completed', () => {
			const overdue = ReviewStatus.create('overdue').value;
			const completed = ReviewStatus.create('completed').value;

			expect(overdue.canTransitionTo(completed)).toBe(true);
		});
	});

	describe('equals', () => {
		it('should return true for same status', () => {
			const status1 = ReviewStatus.create('draft').value;
			const status2 = ReviewStatus.create('draft').value;

			expect(status1.equals(status2)).toBe(true);
		});

		it('should return false for different status', () => {
			const draft = ReviewStatus.create('draft').value;
			const completed = ReviewStatus.create('completed').value;

			expect(draft.equals(completed)).toBe(false);
		});
	});

	describe('helper methods', () => {
		it('should correctly identify draft status', () => {
			const draft = ReviewStatus.create('draft').value;

			expect(draft.isDraft()).toBe(true);
			expect(draft.isInProgress()).toBe(false);
			expect(draft.isCompleted()).toBe(false);
			expect(draft.isOverdue()).toBe(false);
		});

		it('should correctly identify in_progress status', () => {
			const inProgress = ReviewStatus.create('in_progress').value;

			expect(inProgress.isDraft()).toBe(false);
			expect(inProgress.isInProgress()).toBe(true);
			expect(inProgress.isCompleted()).toBe(false);
			expect(inProgress.isOverdue()).toBe(false);
		});

		it('should correctly identify completed status', () => {
			const completed = ReviewStatus.create('completed').value;

			expect(completed.isDraft()).toBe(false);
			expect(completed.isInProgress()).toBe(false);
			expect(completed.isCompleted()).toBe(true);
			expect(completed.isOverdue()).toBe(false);
		});

		it('should correctly identify overdue status', () => {
			const overdue = ReviewStatus.create('overdue').value;

			expect(overdue.isDraft()).toBe(false);
			expect(overdue.isInProgress()).toBe(false);
			expect(overdue.isCompleted()).toBe(false);
			expect(overdue.isOverdue()).toBe(true);
		});
	});

	describe('normalization', () => {
		it('should normalize uppercase status', () => {
			const result = ReviewStatus.create('DRAFT');

			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('draft');
		});

		it('should normalize mixed case status', () => {
			const result = ReviewStatus.create('In_Progress');

			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('in_progress');
		});

		it('should normalize status with whitespace', () => {
			const result = ReviewStatus.create('  completed  ');

			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('completed');
		});
	});
});
