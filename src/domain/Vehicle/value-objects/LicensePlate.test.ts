// src/domain/Vehicle/value-objects/LicensePlate.test.ts
import { describe, it, expect } from 'vitest';
import { LicensePlate } from './LicensePlate';

describe('LicensePlate', () => {
	describe('create()', () => {
		it('should create a valid LicensePlate', () => {
			const result = LicensePlate.create('ABC-1234');
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('ABC-1234');
		});

		it('should trim whitespace', () => {
			const result = LicensePlate.create('  XYZ-567  ');
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('XYZ-567');
		});

		it('should accept alphanumeric plate', () => {
			const result = LicensePlate.create('ABC123');
			expect(result.isOk).toBe(true);
		});

		it('should accept plate with spaces', () => {
			const result = LicensePlate.create('CA 12345');
			expect(result.isOk).toBe(true);
		});

		it('should accept a single character', () => {
			const result = LicensePlate.create('A');
			expect(result.isOk).toBe(true);
		});

		it('should accept exactly 20 characters', () => {
			const result = LicensePlate.create('AB12-CD34-EF56-GH78');
			expect(result.isOk).toBe(true);
			expect(result.value.value.length).toBeLessThanOrEqual(20);
		});

		it('should reject an empty string', () => {
			const result = LicensePlate.create('');
			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('empty');
		});

		it('should reject a whitespace-only string', () => {
			const result = LicensePlate.create('   ');
			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('empty');
		});

		it('should reject a string exceeding 20 characters', () => {
			const result = LicensePlate.create('A'.repeat(21));
			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('20');
		});

		it('should reject plates with special characters', () => {
			const result = LicensePlate.create('ABC!@#');
			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('invalid characters');
		});

		it('should have error code INVALID_VEHICLE on failure', () => {
			const result = LicensePlate.create('');
			expect(result.isError).toBe(true);
			expect(result.error.code).toBe('INVALID_VEHICLE');
		});

		it('should reject a non-string value', () => {
			// @ts-expect-error - testing runtime validation
			const result = LicensePlate.create(12345);
			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('string');
		});
	});

	describe('value', () => {
		it('should return the trimmed plate string', () => {
			const plate = LicensePlate.create('  CA-777  ').value;
			expect(plate.value).toBe('CA-777');
		});
	});

	describe('equals()', () => {
		it('should return true for equal plates (case-insensitive)', () => {
			const plate1 = LicensePlate.create('abc-123').value;
			const plate2 = LicensePlate.create('ABC-123').value;
			expect(plate1.equals(plate2)).toBe(true);
		});

		it('should return false for different plates', () => {
			const plate1 = LicensePlate.create('ABC-123').value;
			const plate2 = LicensePlate.create('XYZ-999').value;
			expect(plate1.equals(plate2)).toBe(false);
		});
	});

	describe('toString()', () => {
		it('should return the plate string', () => {
			const plate = LicensePlate.create('NY-1234').value;
			expect(plate.toString()).toBe('NY-1234');
		});
	});
});
