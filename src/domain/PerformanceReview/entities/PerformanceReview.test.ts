// src/domain/PerformanceReview/entities/PerformanceReview.test.ts
import { describe, it, expect } from 'vitest';
import { PerformanceReview } from './PerformanceReview';
import { ReviewStatus } from '../value-objects/ReviewStatus';
import { Rating } from '../value-objects/Rating';
import { ReviewPeriod } from '../value-objects/ReviewPeriod';
import { ReviewDate } from '../value-objects/ReviewDate';
import {
	PerformanceReviewValidationError,
	InvalidStatusTransitionError
} from '../errors/PerformanceReviewErrors';

describe('PerformanceReview', () => {
	const validProps = {
		id: 'review-123',
		employeeId: 'emp-456',
		reviewerId: 'mgr-789',
		reviewPeriod: ReviewPeriod.create('Q1-2025').value,
		reviewDate: ReviewDate.create('2025-03-31').value,
		status: ReviewStatus.create('draft').value,
		overallRating: Rating.create(3).value,
		goalsAchievement: Rating.create(4).value,
		collaboration: Rating.create(3).value,
		communication: Rating.create(4).value,
		leadership: Rating.create(3).value,
		strengths: 'Strong technical skills and good communication',
		areasForImprovement: 'Could improve time management',
		createdAt: new Date('2025-01-01'),
		updatedAt: new Date('2025-01-01')
	};

	describe('create', () => {
		it('should create performance review with all fields', () => {
			const result = PerformanceReview.create(validProps);

			expect(result.isOk).toBe(true);
			expect(result.value.id).toBe('review-123');
			expect(result.value.employeeId).toBe('emp-456');
			expect(result.value.status.value).toBe('draft');
		});

		it('should create without optional technicalSkills rating', () => {
			const props = { ...validProps };
			const result = PerformanceReview.create(props);

			expect(result.isOk).toBe(true);
			expect(result.value.technicalSkills).toBeUndefined();
		});

		it('should create without optional comments', () => {
			const props = { ...validProps };
			const result = PerformanceReview.create(props);

			expect(result.isOk).toBe(true);
			expect(result.value.comments).toBeUndefined();
		});

		it('should reject missing required employeeId', () => {
			const props = { ...validProps, employeeId: '' };
			const result = PerformanceReview.create(props);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(PerformanceReviewValidationError);
		});

		it('should reject missing strengths', () => {
			const props = { ...validProps, strengths: '' };
			const result = PerformanceReview.create(props);

			expect(result.isError).toBe(true);
		});

		it('should reject missing areasForImprovement', () => {
			const props = { ...validProps, areasForImprovement: '' };
			const result = PerformanceReview.create(props);

			expect(result.isError).toBe(true);
		});
	});

	describe('status transitions', () => {
		it('should allow transition from draft to in_progress', () => {
			const review = PerformanceReview.create(validProps).value;
			const newStatus = ReviewStatus.create('in_progress').value;

			const result = review.updateStatus(newStatus);

			expect(result.isOk).toBe(true);
			expect(result.value.status.value).toBe('in_progress');
		});

		it('should reject invalid transition', () => {
			const props = {
				...validProps,
				status: ReviewStatus.create('completed').value
			};
			const review = PerformanceReview.create(props).value;
			const newStatus = ReviewStatus.create('draft').value;

			const result = review.updateStatus(newStatus);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidStatusTransitionError);
		});

		it('should update updatedAt on status change', () => {
			const review = PerformanceReview.create(validProps).value;
			const originalUpdatedAt = review.updatedAt;

			// Small delay to ensure different timestamp
			const newStatus = ReviewStatus.create('in_progress').value;
			const updated = review.updateStatus(newStatus).value;

			expect(updated.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
		});
	});

	describe('rating updates', () => {
		it('should update individual ratings', () => {
			const review = PerformanceReview.create(validProps).value;
			const newRating = Rating.create(5).value;

			const updated = review.updateRatings({
				goalsAchievement: newRating
			});

			expect(updated.goalsAchievement.value).toBe(5);
			expect(updated.collaboration.value).toBe(3); // Unchanged
		});

		it('should update multiple ratings at once', () => {
			const review = PerformanceReview.create(validProps).value;

			const updated = review.updateRatings({
				collaboration: Rating.create(5).value,
				communication: Rating.create(5).value
			});

			expect(updated.collaboration.value).toBe(5);
			expect(updated.communication.value).toBe(5);
		});

		it('should calculate average rating', () => {
			const props = {
				...validProps,
				overallRating: Rating.create(4).value,
				goalsAchievement: Rating.create(4).value,
				collaboration: Rating.create(3).value,
				communication: Rating.create(5).value,
				leadership: Rating.create(4).value
			};
			const review = PerformanceReview.create(props).value;

			// Average: (4+4+3+5+4) / 5 = 4.0
			expect(review.getAverageRating()).toBe(4.0);
		});

		it('should include technicalSkills in average when present', () => {
			const props = {
				...validProps,
				overallRating: Rating.create(3).value,
				goalsAchievement: Rating.create(3).value,
				collaboration: Rating.create(3).value,
				communication: Rating.create(3).value,
				leadership: Rating.create(3).value,
				technicalSkills: Rating.create(5).value
			};
			const review = PerformanceReview.create(props).value;

			// Average: (3+3+3+3+3+5) / 6 = 3.33...
			expect(review.getAverageRating()).toBeCloseTo(3.33, 2);
		});
	});

	describe('completion check', () => {
		it('should check if review is complete', () => {
			const props = {
				...validProps,
				status: ReviewStatus.create('completed').value
			};
			const review = PerformanceReview.create(props).value;

			expect(review.isComplete()).toBe(true);
		});

		it('should return false for incomplete reviews', () => {
			const review = PerformanceReview.create(validProps).value;

			expect(review.isComplete()).toBe(false);
		});

		it('should check if review is overdue', () => {
			const props = {
				...validProps,
				status: ReviewStatus.create('in_progress').value,
				reviewDate: ReviewDate.create('2020-01-01').value
			};
			const review = PerformanceReview.create(props).value;

			expect(review.isOverdue()).toBe(true);
		});
	});

	describe('immutability', () => {
		it('should return new instance on update', () => {
			const review = PerformanceReview.create(validProps).value;
			const newStatus = ReviewStatus.create('in_progress').value;

			const updated = review.updateStatus(newStatus).value;

			expect(updated).not.toBe(review);
			expect(review.status.value).toBe('draft'); // Original unchanged
		});
	});

	describe('equals', () => {
		it('should return true for same ID', () => {
			const review1 = PerformanceReview.create(validProps).value;
			const review2 = PerformanceReview.create(validProps).value;

			expect(review1.equals(review2)).toBe(true);
		});

		it('should return false for different ID', () => {
			const review1 = PerformanceReview.create(validProps).value;
			const props2 = { ...validProps, id: 'different-id' };
			const review2 = PerformanceReview.create(props2).value;

			expect(review1.equals(review2)).toBe(false);
		});
	});
});
