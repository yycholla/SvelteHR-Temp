import { describe, it, expect } from 'vitest';
import { BalanceHours } from './BalanceHours';
import { BalanceHoursValidationError } from '../errors/TimeOffBalanceErrors';

describe('BalanceHours', () => {
	describe('create', () => {
		it('should create BalanceHours with valid hours', () => {
			const result = BalanceHours.create(40);

			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe(40);
		});

		it('should create BalanceHours with zero hours', () => {
			const result = BalanceHours.create(0);

			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe(0);
		});

		it('should create BalanceHours with maximum hours (1000)', () => {
			const result = BalanceHours.create(1000);

			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe(1000);
		});

		it('should create BalanceHours with decimal hours', () => {
			const result = BalanceHours.create(37.5);

			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe(37.5);
		});

		it('should reject negative hours', () => {
			const result = BalanceHours.create(-1);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(BalanceHoursValidationError);
			expect(result.error.message).toContain('cannot be negative');
		});

		it('should reject hours exceeding maximum (1000)', () => {
			const result = BalanceHours.create(1000.1);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(BalanceHoursValidationError);
			expect(result.error.message).toContain('cannot exceed 1000');
		});

		it('should reject NaN', () => {
			const result = BalanceHours.create(NaN);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(BalanceHoursValidationError);
			expect(result.error.message).toContain('must be a valid number');
		});

		it('should reject Infinity', () => {
			const result = BalanceHours.create(Infinity);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(BalanceHoursValidationError);
			expect(result.error.message).toContain('must be a valid number');
		});

		it('should reject -Infinity', () => {
			const result = BalanceHours.create(-Infinity);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(BalanceHoursValidationError);
			expect(result.error.message).toContain('must be a valid number');
		});
	});

	describe('equals', () => {
		it('should return true for equal hours', () => {
			const hours1 = BalanceHours.create(40).value;
			const hours2 = BalanceHours.create(40).value;

			expect(hours1.equals(hours2)).toBe(true);
		});

		it('should return false for different hours', () => {
			const hours1 = BalanceHours.create(40).value;
			const hours2 = BalanceHours.create(80).value;

			expect(hours1.equals(hours2)).toBe(false);
		});

		it('should handle decimal comparison', () => {
			const hours1 = BalanceHours.create(37.5).value;
			const hours2 = BalanceHours.create(37.5).value;

			expect(hours1.equals(hours2)).toBe(true);
		});
	});

	describe('add', () => {
		it('should add two BalanceHours', () => {
			const hours1 = BalanceHours.create(40).value;
			const hours2 = BalanceHours.create(20).value;

			const result = hours1.add(hours2);

			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe(60);
		});

		it('should reject addition that exceeds maximum', () => {
			const hours1 = BalanceHours.create(800).value;
			const hours2 = BalanceHours.create(300).value;

			const result = hours1.add(hours2);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(BalanceHoursValidationError);
		});

		it('should add decimal hours', () => {
			const hours1 = BalanceHours.create(37.5).value;
			const hours2 = BalanceHours.create(2.5).value;

			const result = hours1.add(hours2);

			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe(40);
		});
	});

	describe('subtract', () => {
		it('should subtract two BalanceHours', () => {
			const hours1 = BalanceHours.create(40).value;
			const hours2 = BalanceHours.create(20).value;

			const result = hours1.subtract(hours2);

			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe(20);
		});

		it('should reject subtraction that results in negative', () => {
			const hours1 = BalanceHours.create(20).value;
			const hours2 = BalanceHours.create(40).value;

			const result = hours1.subtract(hours2);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(BalanceHoursValidationError);
		});

		it('should allow subtraction to zero', () => {
			const hours1 = BalanceHours.create(40).value;
			const hours2 = BalanceHours.create(40).value;

			const result = hours1.subtract(hours2);

			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe(0);
		});

		it('should subtract decimal hours', () => {
			const hours1 = BalanceHours.create(40).value;
			const hours2 = BalanceHours.create(2.5).value;

			const result = hours1.subtract(hours2);

			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe(37.5);
		});
	});

	describe('isZero', () => {
		it('should return true for zero hours', () => {
			const hours = BalanceHours.create(0).value;

			expect(hours.isZero).toBe(true);
		});

		it('should return false for non-zero hours', () => {
			const hours = BalanceHours.create(40).value;

			expect(hours.isZero).toBe(false);
		});
	});

	describe('isSufficient', () => {
		it('should return true when balance is sufficient', () => {
			const balance = BalanceHours.create(40).value;
			const requested = BalanceHours.create(30).value;

			expect(balance.isSufficient(requested)).toBe(true);
		});

		it('should return true when balance exactly equals requested', () => {
			const balance = BalanceHours.create(40).value;
			const requested = BalanceHours.create(40).value;

			expect(balance.isSufficient(requested)).toBe(true);
		});

		it('should return false when balance is insufficient', () => {
			const balance = BalanceHours.create(30).value;
			const requested = BalanceHours.create(40).value;

			expect(balance.isSufficient(requested)).toBe(false);
		});
	});
});
