// src/domain/Vehicle/value-objects/VehicleColor.test.ts
import { describe, it, expect } from 'vitest';
import { VehicleColor } from './VehicleColor';

describe('VehicleColor', () => {
	describe('create()', () => {
		it('should create a valid VehicleColor', () => {
			const result = VehicleColor.create('Red');
			expect(result.isOk).toBe(true);
			expect(result.value?.value).toBe('Red');
		});

		it('should trim whitespace', () => {
			const result = VehicleColor.create('  Blue  ');
			expect(result.isOk).toBe(true);
			expect(result.value?.value).toBe('Blue');
		});

		it('should return null for an empty string', () => {
			const result = VehicleColor.create('');
			expect(result.isOk).toBe(true);
			expect(result.value).toBeNull();
		});

		it('should return null for a whitespace-only string', () => {
			const result = VehicleColor.create('   ');
			expect(result.isOk).toBe(true);
			expect(result.value).toBeNull();
		});

		it('should return null for null input', () => {
			const result = VehicleColor.create(null);
			expect(result.isOk).toBe(true);
			expect(result.value).toBeNull();
		});

		it('should return null for undefined input', () => {
			const result = VehicleColor.create(undefined);
			expect(result.isOk).toBe(true);
			expect(result.value).toBeNull();
		});

		it('should accept exactly 30 characters', () => {
			const result = VehicleColor.create('M'.repeat(30));
			expect(result.isOk).toBe(true);
		});

		it('should reject a string exceeding 30 characters', () => {
			const result = VehicleColor.create('M'.repeat(31));
			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('30');
		});

		it('should have error code INVALID_VEHICLE on failure', () => {
			const result = VehicleColor.create('M'.repeat(31));
			expect(result.isError).toBe(true);
			expect(result.error.code).toBe('INVALID_VEHICLE');
		});

		it('should accept multi-word color names', () => {
			const result = VehicleColor.create('Midnight Blue');
			expect(result.isOk).toBe(true);
			expect(result.value?.value).toBe('Midnight Blue');
		});
	});

	describe('equals()', () => {
		it('should return true for equal colors (case-insensitive)', () => {
			const color1 = VehicleColor.create('Red').value!;
			const color2 = VehicleColor.create('red').value!;
			expect(color1.equals(color2)).toBe(true);
		});

		it('should return false for different colors', () => {
			const color1 = VehicleColor.create('Red').value!;
			const color2 = VehicleColor.create('Blue').value!;
			expect(color1.equals(color2)).toBe(false);
		});
	});

	describe('toString()', () => {
		it('should return the color string', () => {
			const color = VehicleColor.create('Silver').value!;
			expect(color.toString()).toBe('Silver');
		});
	});
});
