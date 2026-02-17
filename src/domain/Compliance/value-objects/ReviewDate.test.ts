// src/domain/Compliance/value-objects/ReviewDate.test.ts
import { describe, it, expect } from 'vitest';
import { ReviewDate } from './ReviewDate';

describe('ReviewDate', () => {
	describe('create()', () => {
		it('should create a valid ReviewDate from a Date object', () => {
			const date = new Date('2026-06-01');
			const result = ReviewDate.create(date);
			expect(result.isOk).toBe(true);
		});

		it('should create a valid ReviewDate from an ISO string', () => {
			const result = ReviewDate.create('2026-12-31');
			expect(result.isOk).toBe(true);
		});

		it('should reject an invalid date string', () => {
			const result = ReviewDate.create('not-a-date');
			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('Invalid review date');
		});

		it('should reject an invalid Date object (NaN)', () => {
			const result = ReviewDate.create(new Date('invalid'));
			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('Invalid review date');
		});

		it('should create a defensive copy (prevent external mutation)', () => {
			const originalDate = new Date('2026-06-01');
			const result = ReviewDate.create(originalDate);
			expect(result.isOk).toBe(true);

			// Mutate original
			originalDate.setFullYear(2000);

			// ReviewDate should be unaffected
			expect(result.value.value.getFullYear()).toBe(2026);
		});

		it('should return a defensive copy from value getter', () => {
			const result = ReviewDate.create('2026-06-01');
			const value1 = result.value.value;
			const value2 = result.value.value;

			// Mutate one copy
			value1.setFullYear(2000);

			// The other copy should be unaffected
			expect(value2.getFullYear()).toBe(2026);
		});
	});

	describe('isPast()', () => {
		it('should return true for a date in the past', () => {
			const pastDate = new Date('2020-01-01');
			const reviewDate = ReviewDate.create(pastDate).value;
			expect(reviewDate.isPast()).toBe(true);
		});

		it('should return false for a date in the future', () => {
			const futureDate = new Date('2099-12-31');
			const reviewDate = ReviewDate.create(futureDate).value;
			expect(reviewDate.isPast()).toBe(false);
		});
	});

	describe('daysUntil()', () => {
		it('should return a positive number for a future date', () => {
			const futureDate = new Date();
			futureDate.setDate(futureDate.getDate() + 30);
			const reviewDate = ReviewDate.create(futureDate).value;
			expect(reviewDate.daysUntil()).toBe(30);
		});

		it('should return a negative number for a past date', () => {
			const pastDate = new Date();
			pastDate.setDate(pastDate.getDate() - 10);
			const reviewDate = ReviewDate.create(pastDate).value;
			expect(reviewDate.daysUntil()).toBe(-10);
		});

		it('should return 0 for today', () => {
			const today = new Date();
			const reviewDate = ReviewDate.create(today).value;
			expect(reviewDate.daysUntil()).toBe(0);
		});
	});

	describe('equals()', () => {
		it('should return true for two ReviewDates with the same date', () => {
			const date = '2026-06-01T00:00:00.000Z';
			const a = ReviewDate.create(date).value;
			const b = ReviewDate.create(date).value;
			expect(a.equals(b)).toBe(true);
		});

		it('should return false for two ReviewDates with different dates', () => {
			const a = ReviewDate.create('2026-06-01').value;
			const b = ReviewDate.create('2026-12-01').value;
			expect(a.equals(b)).toBe(false);
		});
	});

	describe('toString()', () => {
		it('should return an ISO string representation', () => {
			const result = ReviewDate.create(new Date('2026-06-01T00:00:00.000Z'));
			expect(result.value.toString()).toBe('2026-06-01T00:00:00.000Z');
		});
	});
});
