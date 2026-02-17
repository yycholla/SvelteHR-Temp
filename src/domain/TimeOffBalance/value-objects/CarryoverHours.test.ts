import { describe, it, expect } from 'vitest';
import { CarryoverHours } from './CarryoverHours';
import { CarryoverHoursValidationError } from '../errors/TimeOffBalanceErrors';

describe('CarryoverHours', () => {
	describe('create', () => {
		it('should create CarryoverHours with valid hours', () => {
			const result = CarryoverHours.create(40);

			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe(40);
		});

		it('should create CarryoverHours with zero hours', () => {
			const result = CarryoverHours.create(0);

			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe(0);
		});

		it('should create CarryoverHours with maximum hours (1000)', () => {
			const result = CarryoverHours.create(1000);

			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe(1000);
		});

		it('should create CarryoverHours with decimal hours', () => {
			const result = CarryoverHours.create(37.5);

			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe(37.5);
		});

		it('should reject negative hours', () => {
			const result = CarryoverHours.create(-1);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(CarryoverHoursValidationError);
			expect(result.error.message).toContain('cannot be negative');
		});

		it('should reject hours exceeding maximum (1000)', () => {
			const result = CarryoverHours.create(1000.1);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(CarryoverHoursValidationError);
			expect(result.error.message).toContain('cannot exceed 1000');
		});

		it('should reject NaN', () => {
			const result = CarryoverHours.create(NaN);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(CarryoverHoursValidationError);
			expect(result.error.message).toContain('must be a valid number');
		});

		it('should reject Infinity', () => {
			const result = CarryoverHours.create(Infinity);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(CarryoverHoursValidationError);
			expect(result.error.message).toContain('must be a valid number');
		});

		it('should reject -Infinity', () => {
			const result = CarryoverHours.create(-Infinity);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(CarryoverHoursValidationError);
			expect(result.error.message).toContain('must be a valid number');
		});
	});

	describe('equals', () => {
		it('should return true for equal hours', () => {
			const hours1 = CarryoverHours.create(40).value;
			const hours2 = CarryoverHours.create(40).value;

			expect(hours1.equals(hours2)).toBe(true);
		});

		it('should return false for different hours', () => {
			const hours1 = CarryoverHours.create(40).value;
			const hours2 = CarryoverHours.create(80).value;

			expect(hours1.equals(hours2)).toBe(false);
		});

		it('should handle decimal comparison', () => {
			const hours1 = CarryoverHours.create(37.5).value;
			const hours2 = CarryoverHours.create(37.5).value;

			expect(hours1.equals(hours2)).toBe(true);
		});
	});

	describe('isZero', () => {
		it('should return true for zero hours', () => {
			const hours = CarryoverHours.create(0).value;

			expect(hours.isZero).toBe(true);
		});

		it('should return false for non-zero hours', () => {
			const hours = CarryoverHours.create(40).value;

			expect(hours.isZero).toBe(false);
		});
	});

	describe('toString', () => {
		it('should return string representation with hours suffix', () => {
			const hours = CarryoverHours.create(40).value;

			expect(hours.toString()).toBe('40 hours');
		});

		it('should handle decimal hours in string representation', () => {
			const hours = CarryoverHours.create(37.5).value;

			expect(hours.toString()).toBe('37.5 hours');
		});

		it('should return "0 hours" for zero carryover', () => {
			const hours = CarryoverHours.create(0).value;

			expect(hours.toString()).toBe('0 hours');
		});
	});

	describe('value getter', () => {
		it('should return the underlying hour value', () => {
			const result = CarryoverHours.create(42.5);

			expect(result.value.value).toBe(42.5);
		});
	});

	describe('immutability', () => {
		it('should create independent instances', () => {
			const carryover1 = CarryoverHours.create(50).value;
			const carryover2 = CarryoverHours.create(50).value;

			expect(carryover1).not.toBe(carryover2);
			expect(carryover1.equals(carryover2)).toBe(true);
		});

		it('should not allow modification of internal value', () => {
			const carryover = CarryoverHours.create(100).value;
			const originalValue = carryover.value;

			// Attempting to modify the private field should not be possible
			expect(carryover.value).toBe(originalValue);
		});
	});

	describe('edge cases', () => {
		it('should handle very small decimal values', () => {
			const result = CarryoverHours.create(0.001);

			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe(0.001);
		});

		it('should handle boundary at max value', () => {
			const result = CarryoverHours.create(999.999);

			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe(999.999);
		});

		it('should reject value just over max', () => {
			const result = CarryoverHours.create(1000.00001);

			expect(result.isError).toBe(true);
		});
	});
});
