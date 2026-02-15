// src/domain/Compensation/value-objects/PaymentFrequency.test.ts
import { describe, expect, it } from 'vitest';
import { PaymentFrequency } from './PaymentFrequency';
import { InvalidCompensationError } from '../errors';

describe('PaymentFrequency', () => {
	describe('create', () => {
		it('returns Ok with valid weekly frequency', () => {
			const result = PaymentFrequency.create('weekly');

			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('weekly');
		});

		it('returns Ok with valid biweekly frequency', () => {
			const result = PaymentFrequency.create('biweekly');

			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('biweekly');
		});

		it('returns Ok with valid semimonthly frequency', () => {
			const result = PaymentFrequency.create('semimonthly');

			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('semimonthly');
		});

		it('returns Ok with valid monthly frequency', () => {
			const result = PaymentFrequency.create('monthly');

			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('monthly');
		});

		it('returns Ok with valid annually frequency', () => {
			const result = PaymentFrequency.create('annually');

			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('annually');
		});

		it('normalizes case (uppercase)', () => {
			const result = PaymentFrequency.create('MONTHLY');

			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('monthly');
		});

		it('normalizes case (mixed case)', () => {
			const result = PaymentFrequency.create('BiWeekly');

			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('biweekly');
		});

		it('trims whitespace', () => {
			const result = PaymentFrequency.create('  monthly  ');

			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('monthly');
		});

		it('returns InvalidCompensationError with invalid frequency', () => {
			const result = PaymentFrequency.create('quarterly');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidCompensationError);
			expect(result.error.message).toContain('Invalid payment frequency');
		});

		it('returns InvalidCompensationError with empty string', () => {
			const result = PaymentFrequency.create('');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidCompensationError);
		});
	});

	describe('equals', () => {
		it('returns true for same frequency', () => {
			const freq1 = PaymentFrequency.create('monthly').value;
			const freq2 = PaymentFrequency.create('monthly').value;

			expect(freq1.equals(freq2)).toBe(true);
		});

		it('returns false for different frequencies', () => {
			const freq1 = PaymentFrequency.create('monthly').value;
			const freq2 = PaymentFrequency.create('biweekly').value;

			expect(freq1.equals(freq2)).toBe(false);
		});
	});

	describe('getPeriodsPerYear', () => {
		it('returns 52 for weekly', () => {
			const frequency = PaymentFrequency.create('weekly').value;

			expect(frequency.getPeriodsPerYear()).toBe(52);
		});

		it('returns 26 for biweekly', () => {
			const frequency = PaymentFrequency.create('biweekly').value;

			expect(frequency.getPeriodsPerYear()).toBe(26);
		});

		it('returns 24 for semimonthly', () => {
			const frequency = PaymentFrequency.create('semimonthly').value;

			expect(frequency.getPeriodsPerYear()).toBe(24);
		});

		it('returns 12 for monthly', () => {
			const frequency = PaymentFrequency.create('monthly').value;

			expect(frequency.getPeriodsPerYear()).toBe(12);
		});

		it('returns 1 for annually', () => {
			const frequency = PaymentFrequency.create('annually').value;

			expect(frequency.getPeriodsPerYear()).toBe(1);
		});
	});

	describe('toAnnual', () => {
		it('calculates annual amount for weekly', () => {
			const frequency = PaymentFrequency.create('weekly').value;

			expect(frequency.toAnnual(1000)).toBe(52000);
		});

		it('calculates annual amount for biweekly', () => {
			const frequency = PaymentFrequency.create('biweekly').value;

			expect(frequency.toAnnual(2000)).toBe(52000);
		});

		it('calculates annual amount for monthly', () => {
			const frequency = PaymentFrequency.create('monthly').value;

			expect(frequency.toAnnual(5000)).toBe(60000);
		});

		it('returns same amount for annually', () => {
			const frequency = PaymentFrequency.create('annually').value;

			expect(frequency.toAnnual(75000)).toBe(75000);
		});
	});

	describe('fromAnnual', () => {
		it('calculates per-period amount for weekly', () => {
			const frequency = PaymentFrequency.create('weekly').value;

			expect(frequency.fromAnnual(52000)).toBe(1000);
		});

		it('calculates per-period amount for biweekly', () => {
			const frequency = PaymentFrequency.create('biweekly').value;

			expect(frequency.fromAnnual(52000)).toBe(2000);
		});

		it('calculates per-period amount for monthly', () => {
			const frequency = PaymentFrequency.create('monthly').value;

			expect(frequency.fromAnnual(60000)).toBe(5000);
		});

		it('returns same amount for annually', () => {
			const frequency = PaymentFrequency.create('annually').value;

			expect(frequency.fromAnnual(75000)).toBe(75000);
		});

		it('handles fractional amounts', () => {
			const frequency = PaymentFrequency.create('monthly').value;

			expect(frequency.fromAnnual(55000)).toBeCloseTo(4583.33, 2);
		});
	});
});
