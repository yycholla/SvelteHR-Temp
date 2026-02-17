// src/domain/TimeOffBalance/value-objects/BalancePeriod.test.ts
import { describe, it, expect } from 'vitest';
import { BalancePeriod } from './BalancePeriod';
import { BalancePeriodValidationError } from '../errors/TimeOffBalanceErrors';

describe('BalancePeriod', () => {
	describe('create', () => {
		it('should create BalancePeriod with valid year', () => {
			const result = BalancePeriod.create(2024);

			expect(result.isOk).toBe(true);
			expect(result.value.year).toBe(2024);
		});

		it('should create BalancePeriod with current year', () => {
			const currentYear = new Date().getFullYear();
			const result = BalancePeriod.create(currentYear);

			expect(result.isOk).toBe(true);
			expect(result.value.year).toBe(currentYear);
		});

		it('should reject year before 2000', () => {
			const result = BalancePeriod.create(1999);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(BalancePeriodValidationError);
			expect(result.error.message).toContain('Year must be 2000 or later');
		});

		it('should reject year too far in future (>10 years)', () => {
			const futureYear = new Date().getFullYear() + 11;
			const result = BalancePeriod.create(futureYear);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(BalancePeriodValidationError);
			expect(result.error.message).toContain('Year cannot be more than 10 years in the future');
		});

		it('should accept year 10 years in future', () => {
			const futureYear = new Date().getFullYear() + 10;
			const result = BalancePeriod.create(futureYear);

			expect(result.isOk).toBe(true);
		});

		it('should reject invalid year format', () => {
			const result = BalancePeriod.create(NaN);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(BalancePeriodValidationError);
		});
	});

	describe('isCurrent', () => {
		it('should return true for current year', () => {
			const currentYear = new Date().getFullYear();
			const period = BalancePeriod.create(currentYear).value;

			expect(period.isCurrent).toBe(true);
		});

		it('should return false for past year', () => {
			const period = BalancePeriod.create(2020).value;

			expect(period.isCurrent).toBe(false);
		});

		it('should return false for future year', () => {
			const futureYear = new Date().getFullYear() + 1;
			const period = BalancePeriod.create(futureYear).value;

			expect(period.isCurrent).toBe(false);
		});
	});

	describe('isPast', () => {
		it('should return true for past year', () => {
			const period = BalancePeriod.create(2020).value;

			expect(period.isPast).toBe(true);
		});

		it('should return false for current year', () => {
			const currentYear = new Date().getFullYear();
			const period = BalancePeriod.create(currentYear).value;

			expect(period.isPast).toBe(false);
		});

		it('should return false for future year', () => {
			const futureYear = new Date().getFullYear() + 1;
			const period = BalancePeriod.create(futureYear).value;

			expect(period.isPast).toBe(false);
		});
	});

	describe('isFuture', () => {
		it('should return true for future year', () => {
			const futureYear = new Date().getFullYear() + 1;
			const period = BalancePeriod.create(futureYear).value;

			expect(period.isFuture).toBe(true);
		});

		it('should return false for current year', () => {
			const currentYear = new Date().getFullYear();
			const period = BalancePeriod.create(currentYear).value;

			expect(period.isFuture).toBe(false);
		});

		it('should return false for past year', () => {
			const period = BalancePeriod.create(2020).value;

			expect(period.isFuture).toBe(false);
		});
	});

	describe('equals', () => {
		it('should return true for same year', () => {
			const period1 = BalancePeriod.create(2024).value;
			const period2 = BalancePeriod.create(2024).value;

			expect(period1.equals(period2)).toBe(true);
		});

		it('should return false for different years', () => {
			const period1 = BalancePeriod.create(2024).value;
			const period2 = BalancePeriod.create(2025).value;

			expect(period1.equals(period2)).toBe(false);
		});
	});
});
