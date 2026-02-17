// src/domain/TimeOffBalance/value-objects/AccrualRate.test.ts
import { describe, it, expect } from 'vitest';
import { AccrualRate } from './AccrualRate';
import { AccrualRateValidationError } from '../errors/TimeOffBalanceErrors';

describe('AccrualRate', () => {
	describe('create', () => {
		it('should create AccrualRate with valid hours per period', () => {
			const result = AccrualRate.create(10, 'month');

			expect(result.isOk).toBe(true);
			expect(result.value.hoursPerPeriod).toBe(10);
			expect(result.value.period).toBe('month');
		});

		it('should create AccrualRate with zero hours', () => {
			const result = AccrualRate.create(0, 'year');

			expect(result.isOk).toBe(true);
			expect(result.value.hoursPerPeriod).toBe(0);
		});

		it('should create AccrualRate with decimal hours', () => {
			const result = AccrualRate.create(3.33, 'biweek');

			expect(result.isOk).toBe(true);
			expect(result.value.hoursPerPeriod).toBe(3.33);
		});

		it('should reject negative hours', () => {
			const result = AccrualRate.create(-5, 'month');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(AccrualRateValidationError);
			expect(result.error.message).toContain('cannot be negative');
		});

		it('should reject hours exceeding maximum (40)', () => {
			const result = AccrualRate.create(40.1, 'month');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(AccrualRateValidationError);
			expect(result.error.message).toContain('cannot exceed 40');
		});

		it('should reject invalid period', () => {
			const result = AccrualRate.create(10, 'invalid' as any);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(AccrualRateValidationError);
			expect(result.error.message).toContain('Invalid period');
		});

		it('should reject NaN hours', () => {
			const result = AccrualRate.create(NaN, 'month');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(AccrualRateValidationError);
		});
	});

	describe('toAnnual', () => {
		it('should calculate annual hours for monthly accrual', () => {
			const rate = AccrualRate.create(10, 'month').value;

			expect(rate.toAnnual()).toBe(120);
		});

		it('should calculate annual hours for biweekly accrual', () => {
			const rate = AccrualRate.create(4, 'biweek').value;

			expect(rate.toAnnual()).toBe(104);
		});

		it('should calculate annual hours for yearly accrual', () => {
			const rate = AccrualRate.create(120, 'year').value;

			expect(rate.toAnnual()).toBe(120);
		});

		it('should handle decimal hours', () => {
			const rate = AccrualRate.create(3.33, 'month').value;

			expect(rate.toAnnual()).toBeCloseTo(39.96, 2);
		});
	});

	describe('equals', () => {
		it('should return true for same rate and period', () => {
			const rate1 = AccrualRate.create(10, 'month').value;
			const rate2 = AccrualRate.create(10, 'month').value;

			expect(rate1.equals(rate2)).toBe(true);
		});

		it('should return false for different hours', () => {
			const rate1 = AccrualRate.create(10, 'month').value;
			const rate2 = AccrualRate.create(15, 'month').value;

			expect(rate1.equals(rate2)).toBe(false);
		});

		it('should return false for different periods', () => {
			const rate1 = AccrualRate.create(10, 'month').value;
			const rate2 = AccrualRate.create(10, 'biweek').value;

			expect(rate1.equals(rate2)).toBe(false);
		});
	});
});
