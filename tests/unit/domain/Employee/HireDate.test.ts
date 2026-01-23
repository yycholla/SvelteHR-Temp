// tests/unit/domain/Employee/HireDate.test.ts
import { describe, it, expect } from 'vitest';
import { HireDate } from '$domain/Employee/HireDate';
import { InvalidHireDateError } from '$domain/errors';

describe('HireDate', () => {
	describe('create', () => {
		it('creates hire date from valid date string', () => {
			const result = HireDate.create('2020-01-15');

			expect(result.isOk).toBe(true);
			expect(result.value.value).toBeInstanceOf(Date);
		});

		it('creates hire date from Date object', () => {
			const date = new Date('2020-01-15');
			const result = HireDate.create(date);

			expect(result.isOk).toBe(true);
			// Verify the date is normalized to midnight
			const normalized = new Date('2020-01-15');
			normalized.setHours(0, 0, 0, 0);
			expect(result.value.value.getTime()).toEqual(normalized.getTime());
		});

		it('accepts hire date from past', () => {
			const result = HireDate.create('2020-01-15');
			expect(result.isOk).toBe(true);
		});

		it('accepts hire date from today', () => {
			const today = new Date();
			today.setHours(0, 0, 0, 0);
			const result = HireDate.create(today);

			expect(result.isOk).toBe(true);
		});

		it('returns error for future date', () => {
			// Use a date far in the future to avoid timezone edge cases
			const futureDate = new Date();
			futureDate.setFullYear(futureDate.getFullYear() + 1);
			const result = HireDate.create(futureDate);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidHireDateError);
			expect(result.error.message).toContain('cannot be in the future');
		});

		it('returns error for invalid date string', () => {
			const result = HireDate.create('not-a-date');

			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('Invalid date format');
		});

		it('normalizes time component - treats same day as equal', () => {
			const morning = HireDate.create('2020-01-15T09:00:00').value;
			const evening = HireDate.create('2020-01-15T17:00:00').value;

			expect(morning.equals(evening)).toBe(true);
		});
	});

	describe('isBefore', () => {
		it('returns true when this date is before other', () => {
			const date1 = HireDate.create('2020-01-01').value;
			const date2 = HireDate.create('2020-12-31').value;

			expect(date1.isBefore(date2)).toBe(true);
		});

		it('returns false when this date is after other', () => {
			const date1 = HireDate.create('2020-12-31').value;
			const date2 = HireDate.create('2020-01-01').value;

			expect(date1.isBefore(date2)).toBe(false);
		});

		it('returns false when dates are equal', () => {
			const date1 = HireDate.create('2020-01-15').value;
			const date2 = HireDate.create('2020-01-15').value;

			expect(date1.isBefore(date2)).toBe(false);
		});
	});

	describe('getDaysEmployed', () => {
		it('calculates days from hire date to today', () => {
			const oneYearAgo = new Date();
			oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

			const hireDate = HireDate.create(oneYearAgo).value;
			const days = hireDate.getDaysEmployed();

			// Approximately 365 days (accounting for leap years)
			expect(days).toBeGreaterThanOrEqual(364);
			expect(days).toBeLessThanOrEqual(366);
		});
	});

	describe('equals', () => {
		it('returns true for equal dates', () => {
			const date1 = HireDate.create('2020-01-15').value;
			const date2 = HireDate.create('2020-01-15').value;

			expect(date1.equals(date2)).toBe(true);
		});

		it('returns true for equal Date objects', () => {
			const date = new Date('2020-01-15');
			const hireDate1 = HireDate.create(date).value;
			const hireDate2 = HireDate.create(date).value;

			expect(hireDate1.equals(hireDate2)).toBe(true);
		});

		it('returns false for different dates', () => {
			const date1 = HireDate.create('2020-01-15').value;
			const date2 = HireDate.create('2020-01-16').value;

			expect(date1.equals(date2)).toBe(false);
		});
	});
});
