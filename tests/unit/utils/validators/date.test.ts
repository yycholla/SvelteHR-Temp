import { describe, expect, it } from 'vitest';
import { isDateInRange, isFutureDate, isPastDate, isValidDate } from '$lib/utils/validators/date';

describe('isValidDate', () => {
	it('returns true for valid dates', () => {
		expect(isValidDate(new Date())).toBe(true);
		expect(isValidDate('2026-01-22')).toBe(true);
	});

	it('returns false for invalid dates', () => {
		expect(isValidDate('invalid')).toBe(false);
		expect(isValidDate(null)).toBe(false);
		expect(isValidDate(undefined)).toBe(false);
	});

	it('rejects impossible dates that JavaScript auto-corrects', () => {
		expect(isValidDate('2026-02-30')).toBe(false); // Feb 30 doesn't exist
		expect(isValidDate('2026-02-31')).toBe(false); // Feb 31 doesn't exist
		expect(isValidDate('2026-04-31')).toBe(false); // April 31 doesn't exist
		expect(isValidDate('2026-13-01')).toBe(false); // Month 13 doesn't exist
	});
});

describe('isPastDate', () => {
	it('returns true for past dates', () => {
		const yesterday = new Date(Date.now() - 86400000);
		expect(isPastDate(yesterday)).toBe(true);
	});

	it('returns false for future dates', () => {
		const tomorrow = new Date(Date.now() + 86400000);
		expect(isPastDate(tomorrow)).toBe(false);
	});

	it('validates input and returns false for invalid dates', () => {
		expect(isPastDate('invalid')).toBe(false);
		expect(isPastDate('2026-02-30')).toBe(false);
	});
});

describe('isFutureDate', () => {
	it('returns true for future dates', () => {
		const tomorrow = new Date(Date.now() + 86400000);
		expect(isFutureDate(tomorrow)).toBe(true);
	});

	it('returns false for past dates', () => {
		const yesterday = new Date(Date.now() - 86400000);
		expect(isFutureDate(yesterday)).toBe(false);
	});

	it('validates input and returns false for invalid dates', () => {
		expect(isFutureDate('invalid')).toBe(false);
		expect(isFutureDate('2026-02-30')).toBe(false);
	});
});

describe('isDateInRange', () => {
	it('returns true if date is within range', () => {
		const date = new Date('2026-01-22');
		const start = new Date('2026-01-01');
		const end = new Date('2026-01-31');
		expect(isDateInRange(date, start, end)).toBe(true);
	});

	it('returns false if date is outside range', () => {
		const date = new Date('2026-02-01');
		const start = new Date('2026-01-01');
		const end = new Date('2026-01-31');
		expect(isDateInRange(date, start, end)).toBe(false);
	});

	it('validates all inputs and returns false for any invalid date', () => {
		expect(isDateInRange('invalid', '2026-01-01', '2026-01-31')).toBe(false);
		expect(isDateInRange('2026-01-22', 'invalid', '2026-01-31')).toBe(false);
		expect(isDateInRange('2026-01-22', '2026-01-01', 'invalid')).toBe(false);
	});

	it('rejects impossible dates in any parameter', () => {
		expect(isDateInRange('2026-02-30', '2026-01-01', '2026-03-31')).toBe(false);
		expect(isDateInRange('2026-01-22', '2026-02-30', '2026-03-31')).toBe(false);
		expect(isDateInRange('2026-01-22', '2026-01-01', '2026-02-30')).toBe(false);
	});
});
