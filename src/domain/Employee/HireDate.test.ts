import { describe, expect, it } from 'vitest';
import { HireDate } from './HireDate';

describe('HireDate', () => {
	describe('create', () => {
		it('returns Ok with valid date', () => {
			const validDate = new Date('2020-01-15T12:00:00');
			const result = HireDate.create(validDate);

			expect(result.isOk).toBe(true);
			expect(result.value.value.getFullYear()).toBe(2020);
			expect(result.value.value.getMonth()).toBe(0); // January is 0
			expect(result.value.value.getDate()).toBe(15);
		});

		it('returns InvalidHireDateError with future date', () => {
			const futureDate = new Date();
			futureDate.setFullYear(futureDate.getFullYear() + 1);

			const result = HireDate.create(futureDate);

			expect(result.isError).toBe(true);
			expect(result.error.name).toBe('InvalidHireDateError');
			expect(result.error.message).toContain('cannot be in the future');
		});

		it('returns InvalidHireDateError with invalid format', () => {
			const invalidDates = ['not-a-date', 'invalid', '2020-13-45', 'abc123'];

			invalidDates.forEach((date) => {
				const result = HireDate.create(date);

				expect(result.isError).toBe(true);
				expect(result.error.name).toBe('InvalidHireDateError');
				expect(result.error.message).toContain('Invalid date format');
			});
		});
	});

	describe('getDaysEmployed', () => {
		it('calculates days employed correctly', () => {
			// Create a hire date 365 days ago
			const oneYearAgo = new Date();
			oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
			oneYearAgo.setHours(0, 0, 0, 0);

			const result = HireDate.create(oneYearAgo);
			expect(result.isOk).toBe(true);

			const daysEmployed = result.value.getDaysEmployed();

			// Should be approximately 365 days (accounting for leap years)
			expect(daysEmployed).toBeGreaterThanOrEqual(365);
			expect(daysEmployed).toBeLessThanOrEqual(366);
		});
	});

	describe('isBefore', () => {
		it('compares dates correctly', () => {
			const earlier = HireDate.create('2020-01-01').value;
			const later = HireDate.create('2020-12-31').value;

			expect(earlier.isBefore(later)).toBe(true);
			expect(later.isBefore(earlier)).toBe(false);

			const sameDate1 = HireDate.create('2020-06-15').value;
			const sameDate2 = HireDate.create('2020-06-15').value;
			expect(sameDate1.isBefore(sameDate2)).toBe(false);
		});
	});
});
