// src/domain/Compensation/value-objects/EffectiveDate.test.ts
import { describe, expect, it } from 'vitest';
import { EffectiveDate } from './EffectiveDate';
import { InvalidCompensationError } from '../errors';

describe('EffectiveDate', () => {
	describe('create', () => {
		it('returns Ok with valid Date object', () => {
			const date = new Date('2026-02-15T00:00:00Z');
			const result = EffectiveDate.create(date);

			expect(result.isOk).toBe(true);
			expect(result.value.value.getTime()).toBe(date.getTime());
		});

		it('returns Ok with valid ISO string', () => {
			const dateStr = '2026-02-15T00:00:00.000Z';
			const result = EffectiveDate.create(dateStr);

			expect(result.isOk).toBe(true);
			expect(result.value.toISOString()).toBe(dateStr);
		});

		it('returns InvalidCompensationError with invalid Date', () => {
			const invalidDate = new Date('invalid');
			const result = EffectiveDate.create(invalidDate);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidCompensationError);
			expect(result.error.message).toContain('Invalid effective date');
		});

		it('returns InvalidCompensationError with invalid string', () => {
			const result = EffectiveDate.create('not-a-date');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidCompensationError);
		});

		it('creates defensive copy of Date (immutability)', () => {
			const originalDate = new Date('2026-02-15T00:00:00Z');
			const result = EffectiveDate.create(originalDate);

			expect(result.isOk).toBe(true);

			// Mutate original
			originalDate.setUTCFullYear(2025);

			// Value should not be affected
			expect(result.value.value.getUTCFullYear()).toBe(2026);
		});

		it('value getter returns defensive copy', () => {
			const result = EffectiveDate.create(new Date('2026-02-15T00:00:00Z'));
			expect(result.isOk).toBe(true);

			const value1 = result.value.value;
			const value2 = result.value.value;

			// Should be different objects
			expect(value1).not.toBe(value2);

			// But same time
			expect(value1.getTime()).toBe(value2.getTime());

			// Mutating one should not affect the other
			value1.setUTCFullYear(2025);
			expect(value2.getUTCFullYear()).toBe(2026);
		});
	});

	describe('equals', () => {
		it('returns true for same date', () => {
			const date = new Date('2026-02-15T00:00:00Z');
			const date1 = EffectiveDate.create(date).value;
			const date2 = EffectiveDate.create(date).value;

			expect(date1.equals(date2)).toBe(true);
		});

		it('returns false for different dates', () => {
			const date1 = EffectiveDate.create(new Date('2026-02-15T00:00:00Z')).value;
			const date2 = EffectiveDate.create(new Date('2026-03-15T00:00:00Z')).value;

			expect(date1.equals(date2)).toBe(false);
		});
	});

	describe('isBefore', () => {
		it('returns true when this date is before other', () => {
			const earlier = EffectiveDate.create(new Date('2026-01-01T00:00:00Z')).value;
			const later = EffectiveDate.create(new Date('2026-02-01T00:00:00Z')).value;

			expect(earlier.isBefore(later)).toBe(true);
		});

		it('returns false when this date is after other', () => {
			const earlier = EffectiveDate.create(new Date('2026-01-01T00:00:00Z')).value;
			const later = EffectiveDate.create(new Date('2026-02-01T00:00:00Z')).value;

			expect(later.isBefore(earlier)).toBe(false);
		});

		it('returns false when dates are equal', () => {
			const date = new Date('2026-01-01T00:00:00Z');
			const date1 = EffectiveDate.create(date).value;
			const date2 = EffectiveDate.create(date).value;

			expect(date1.isBefore(date2)).toBe(false);
		});
	});

	describe('isAfter', () => {
		it('returns true when this date is after other', () => {
			const earlier = EffectiveDate.create(new Date('2026-01-01T00:00:00Z')).value;
			const later = EffectiveDate.create(new Date('2026-02-01T00:00:00Z')).value;

			expect(later.isAfter(earlier)).toBe(true);
		});

		it('returns false when this date is before other', () => {
			const earlier = EffectiveDate.create(new Date('2026-01-01T00:00:00Z')).value;
			const later = EffectiveDate.create(new Date('2026-02-01T00:00:00Z')).value;

			expect(earlier.isAfter(later)).toBe(false);
		});

		it('returns false when dates are equal', () => {
			const date = new Date('2026-01-01T00:00:00Z');
			const date1 = EffectiveDate.create(date).value;
			const date2 = EffectiveDate.create(date).value;

			expect(date1.isAfter(date2)).toBe(false);
		});
	});

	describe('toISOString', () => {
		it('returns ISO string representation', () => {
			const dateStr = '2026-02-15T00:00:00.000Z';
			const effectiveDate = EffectiveDate.create(dateStr).value;

			expect(effectiveDate.toISOString()).toBe(dateStr);
		});
	});
});
