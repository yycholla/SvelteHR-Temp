// src/domain/Vehicle/value-objects/VehicleYear.test.ts
import { describe, it, expect } from 'vitest';
import { VehicleYear } from './VehicleYear';

const CURRENT_YEAR = new Date().getFullYear();

describe('VehicleYear', () => {
	describe('create()', () => {
		it('should create a valid VehicleYear from a number', () => {
			const result = VehicleYear.create(2023);
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe(2023);
		});

		it('should create a valid VehicleYear from a numeric string', () => {
			const result = VehicleYear.create('2023');
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe(2023);
		});

		it('should accept the minimum year (1900)', () => {
			const result = VehicleYear.create(1900);
			expect(result.isOk).toBe(true);
		});

		it('should accept the current year', () => {
			const result = VehicleYear.create(CURRENT_YEAR);
			expect(result.isOk).toBe(true);
		});

		it('should accept current year + 1 (next-year models)', () => {
			const result = VehicleYear.create(CURRENT_YEAR + 1);
			expect(result.isOk).toBe(true);
		});

		it('should reject a year before 1900', () => {
			const result = VehicleYear.create(1899);
			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('1900');
		});

		it('should reject a year after current year + 1', () => {
			const result = VehicleYear.create(CURRENT_YEAR + 2);
			expect(result.isError).toBe(true);
			expect(result.error.message).toContain(String(CURRENT_YEAR + 1));
		});

		it('should reject a non-integer (float)', () => {
			const result = VehicleYear.create(2023.5);
			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('integer');
		});

		it('should reject NaN', () => {
			const result = VehicleYear.create(NaN);
			expect(result.isError).toBe(true);
		});

		it('should reject a non-numeric string', () => {
			const result = VehicleYear.create('twenty-twenty');
			expect(result.isError).toBe(true);
		});

		it('should reject null', () => {
			const result = VehicleYear.create(null);
			expect(result.isError).toBe(true);
		});

		it('should reject undefined', () => {
			const result = VehicleYear.create(undefined);
			expect(result.isError).toBe(true);
		});

		it('should have error code INVALID_VEHICLE on failure', () => {
			const result = VehicleYear.create(1800);
			expect(result.isError).toBe(true);
			expect(result.error.code).toBe('INVALID_VEHICLE');
		});
	});

	describe('isVintage()', () => {
		it('should return true for year before 1980', () => {
			const year = VehicleYear.create(1979).value;
			expect(year.isVintage()).toBe(true);
		});

		it('should return true for year 1900', () => {
			const year = VehicleYear.create(1900).value;
			expect(year.isVintage()).toBe(true);
		});

		it('should return false for year 1980', () => {
			const year = VehicleYear.create(1980).value;
			expect(year.isVintage()).toBe(false);
		});

		it('should return false for year after 1980', () => {
			const year = VehicleYear.create(2023).value;
			expect(year.isVintage()).toBe(false);
		});
	});

	describe('value', () => {
		it('should return the year as a number', () => {
			const year = VehicleYear.create(2020).value;
			expect(year.value).toBe(2020);
		});
	});

	describe('equals()', () => {
		it('should return true for equal years', () => {
			const year1 = VehicleYear.create(2022).value;
			const year2 = VehicleYear.create(2022).value;
			expect(year1.equals(year2)).toBe(true);
		});

		it('should return false for different years', () => {
			const year1 = VehicleYear.create(2021).value;
			const year2 = VehicleYear.create(2022).value;
			expect(year1.equals(year2)).toBe(false);
		});
	});

	describe('toString()', () => {
		it('should return the year as a string', () => {
			const year = VehicleYear.create(2023).value;
			expect(year.toString()).toBe('2023');
		});
	});
});
