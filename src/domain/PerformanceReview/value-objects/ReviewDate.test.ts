// src/domain/PerformanceReview/value-objects/ReviewDate.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ReviewDate } from './ReviewDate';
import { ReviewDateValidationError } from '../errors/PerformanceReviewErrors';

describe('ReviewDate', () => {
	describe('create', () => {
		it('should create date from ISO string', () => {
			const result = ReviewDate.create('2025-03-15');

			expect(result.isOk).toBe(true);
			expect(result.value.toISOString()).toContain('2025-03-15');
		});

		it('should create date from Date object', () => {
			const date = new Date('2025-03-15');
			const result = ReviewDate.create(date);

			expect(result.isOk).toBe(true);
		});

		it('should reject invalid date string', () => {
			const result = ReviewDate.create('invalid-date');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(ReviewDateValidationError);
		});

		it('should reject empty date', () => {
			const result = ReviewDate.create('');

			expect(result.isError).toBe(true);
		});

		it('should reject dates too far in future', () => {
			const result = ReviewDate.create('2100-01-01');

			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('too far in the future');
		});

		it('should reject dates too far in past', () => {
			const result = ReviewDate.create('1999-01-01');

			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('too far in the past');
		});
	});

	describe('overdue detection', () => {
		beforeEach(() => {
			vi.useFakeTimers();
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it('should detect overdue date', () => {
			vi.setSystemTime(new Date('2025-03-20'));

			const pastDate = ReviewDate.create('2025-03-10').value;

			expect(pastDate.isOverdue()).toBe(true);
		});

		it('should not mark future date as overdue', () => {
			vi.setSystemTime(new Date('2025-03-10'));

			const futureDate = ReviewDate.create('2025-03-20').value;

			expect(futureDate.isOverdue()).toBe(false);
		});

		it('should not mark today as overdue', () => {
			vi.setSystemTime(new Date('2025-03-15'));

			const today = ReviewDate.create('2025-03-15').value;

			expect(today.isOverdue()).toBe(false);
		});

		it('should calculate days overdue', () => {
			vi.setSystemTime(new Date('2025-03-20'));

			const pastDate = ReviewDate.create('2025-03-10').value;

			expect(pastDate.getDaysOverdue()).toBe(10);
		});

		it('should return 0 for future dates', () => {
			vi.setSystemTime(new Date('2025-03-10'));

			const futureDate = ReviewDate.create('2025-03-20').value;

			expect(futureDate.getDaysOverdue()).toBe(0);
		});
	});

	describe('comparison', () => {
		it('should check if date is in past', () => {
			const pastDate = ReviewDate.create('2020-01-01').value;

			expect(pastDate.isPast()).toBe(true);
		});

		it('should check if date is in future', () => {
			const futureDate = ReviewDate.create('2030-01-01').value;

			expect(futureDate.isFuture()).toBe(true);
		});

		it('should format for display', () => {
			const date = ReviewDate.create('2025-03-15').value;

			expect(date.toDisplayString()).toMatch(/Mar|March/);
			expect(date.toDisplayString()).toContain('2025');
		});
	});

	describe('equals', () => {
		it('should return true for same date', () => {
			const date1 = ReviewDate.create('2025-03-15').value;
			const date2 = ReviewDate.create('2025-03-15').value;

			expect(date1.equals(date2)).toBe(true);
		});

		it('should return false for different date', () => {
			const date1 = ReviewDate.create('2025-03-15').value;
			const date2 = ReviewDate.create('2025-03-16').value;

			expect(date1.equals(date2)).toBe(false);
		});
	});
});
