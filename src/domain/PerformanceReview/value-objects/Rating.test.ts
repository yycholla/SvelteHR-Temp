// src/domain/PerformanceReview/value-objects/Rating.test.ts
import { describe, it, expect } from 'vitest';
import { Rating } from './Rating';
import { RatingValidationError } from '../errors/PerformanceReviewErrors';

describe('Rating', () => {
	describe('create', () => {
		it('should create rating with value 1', () => {
			const result = Rating.create(1);

			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe(1);
			expect(result.value.label).toBe('Needs Improvement');
		});

		it('should create rating with value 5', () => {
			const result = Rating.create(5);

			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe(5);
			expect(result.value.label).toBe('Outstanding');
		});

		it('should create rating with value 2', () => {
			const result = Rating.create(2);

			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe(2);
			expect(result.value.label).toBe('Below Expectations');
		});

		it('should create rating with value 3', () => {
			const result = Rating.create(3);

			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe(3);
			expect(result.value.label).toBe('Meets Expectations');
		});

		it('should create rating with value 4', () => {
			const result = Rating.create(4);

			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe(4);
			expect(result.value.label).toBe('Exceeds Expectations');
		});

		it('should reject rating below 1', () => {
			const result = Rating.create(0);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(RatingValidationError);
			expect(result.error.message).toContain('must be between 1 and 5');
		});

		it('should reject rating above 5', () => {
			const result = Rating.create(6);

			expect(result.isError).toBe(true);
		});

		it('should reject decimal ratings', () => {
			const result = Rating.create(3.5);

			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('must be a whole number');
		});

		it('should reject non-numeric ratings', () => {
			const result = Rating.create(NaN);

			expect(result.isError).toBe(true);
		});

		it('should reject negative ratings', () => {
			const result = Rating.create(-1);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(RatingValidationError);
			expect(result.error.message).toContain('must be between 1 and 5');
		});
	});

	describe('labels', () => {
		it('should return correct label for each rating', () => {
			expect(Rating.create(1).value.label).toBe('Needs Improvement');
			expect(Rating.create(2).value.label).toBe('Below Expectations');
			expect(Rating.create(3).value.label).toBe('Meets Expectations');
			expect(Rating.create(4).value.label).toBe('Exceeds Expectations');
			expect(Rating.create(5).value.label).toBe('Outstanding');
		});
	});

	describe('comparison', () => {
		it('should check if rating is high (4-5)', () => {
			expect(Rating.create(5).value.isHigh()).toBe(true);
			expect(Rating.create(4).value.isHigh()).toBe(true);
			expect(Rating.create(3).value.isHigh()).toBe(false);
		});

		it('should check if rating is low (1-2)', () => {
			expect(Rating.create(1).value.isLow()).toBe(true);
			expect(Rating.create(2).value.isLow()).toBe(true);
			expect(Rating.create(3).value.isLow()).toBe(false);
		});

		it('should check if rating is average (3)', () => {
			expect(Rating.create(3).value.isAverage()).toBe(true);
			expect(Rating.create(4).value.isAverage()).toBe(false);
		});
	});

	describe('equals', () => {
		it('should return true for same rating', () => {
			const rating1 = Rating.create(3).value;
			const rating2 = Rating.create(3).value;

			expect(rating1.equals(rating2)).toBe(true);
		});

		it('should return false for different rating', () => {
			const rating1 = Rating.create(3).value;
			const rating2 = Rating.create(4).value;

			expect(rating1.equals(rating2)).toBe(false);
		});
	});
});
