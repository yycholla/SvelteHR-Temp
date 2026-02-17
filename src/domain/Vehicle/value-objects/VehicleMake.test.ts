// src/domain/Vehicle/value-objects/VehicleMake.test.ts
import { describe, it, expect } from 'vitest';
import { VehicleMake } from './VehicleMake';

describe('VehicleMake', () => {
	describe('create()', () => {
		it('should create a valid VehicleMake', () => {
			const result = VehicleMake.create('Toyota');
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('Toyota');
		});

		it('should trim whitespace', () => {
			const result = VehicleMake.create('  Honda  ');
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('Honda');
		});

		it('should accept a single character', () => {
			const result = VehicleMake.create('A');
			expect(result.isOk).toBe(true);
		});

		it('should accept exactly 50 characters', () => {
			const result = VehicleMake.create('A'.repeat(50));
			expect(result.isOk).toBe(true);
		});

		it('should accept make with spaces (e.g. Alfa Romeo)', () => {
			const result = VehicleMake.create('Alfa Romeo');
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('Alfa Romeo');
		});

		it('should reject an empty string', () => {
			const result = VehicleMake.create('');
			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('empty');
		});

		it('should reject a whitespace-only string', () => {
			const result = VehicleMake.create('   ');
			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('empty');
		});

		it('should reject a string exceeding 50 characters', () => {
			const result = VehicleMake.create('A'.repeat(51));
			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('50');
		});

		it('should have error code INVALID_VEHICLE on failure', () => {
			const result = VehicleMake.create('');
			expect(result.isError).toBe(true);
			expect(result.error.code).toBe('INVALID_VEHICLE');
		});

		it('should reject a non-string value (number)', () => {
			// @ts-expect-error - testing runtime validation
			const result = VehicleMake.create(42);
			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('string');
		});
	});

	describe('value', () => {
		it('should return the trimmed make string', () => {
			const result = VehicleMake.create('  BMW  ');
			expect(result.value.value).toBe('BMW');
		});
	});

	describe('equals()', () => {
		it('should return true for equal makes', () => {
			const make1 = VehicleMake.create('Ford').value;
			const make2 = VehicleMake.create('Ford').value;
			expect(make1.equals(make2)).toBe(true);
		});

		it('should return false for different makes', () => {
			const make1 = VehicleMake.create('Ford').value;
			const make2 = VehicleMake.create('GM').value;
			expect(make1.equals(make2)).toBe(false);
		});
	});

	describe('toString()', () => {
		it('should return the make string', () => {
			const make = VehicleMake.create('Volkswagen').value;
			expect(make.toString()).toBe('Volkswagen');
		});
	});
});
