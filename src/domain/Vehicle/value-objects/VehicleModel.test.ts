// src/domain/Vehicle/value-objects/VehicleModel.test.ts
import { describe, it, expect } from 'vitest';
import { VehicleModel } from './VehicleModel';

describe('VehicleModel', () => {
	describe('create()', () => {
		it('should create a valid VehicleModel', () => {
			const result = VehicleModel.create('Camry');
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('Camry');
		});

		it('should trim whitespace', () => {
			const result = VehicleModel.create('  Civic  ');
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('Civic');
		});

		it('should accept a single character', () => {
			const result = VehicleModel.create('X');
			expect(result.isOk).toBe(true);
		});

		it('should accept exactly 50 characters', () => {
			const result = VehicleModel.create('M'.repeat(50));
			expect(result.isOk).toBe(true);
		});

		it('should accept model with spaces', () => {
			const result = VehicleModel.create('Model S');
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('Model S');
		});

		it('should accept model with alphanumeric characters', () => {
			const result = VehicleModel.create('F-150');
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('F-150');
		});

		it('should reject an empty string', () => {
			const result = VehicleModel.create('');
			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('empty');
		});

		it('should reject a whitespace-only string', () => {
			const result = VehicleModel.create('   ');
			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('empty');
		});

		it('should reject a string exceeding 50 characters', () => {
			const result = VehicleModel.create('M'.repeat(51));
			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('50');
		});

		it('should have error code INVALID_VEHICLE on failure', () => {
			const result = VehicleModel.create('');
			expect(result.isError).toBe(true);
			expect(result.error.code).toBe('INVALID_VEHICLE');
		});

		it('should reject a non-string value (number)', () => {
			// @ts-expect-error - testing runtime validation
			const result = VehicleModel.create(42);
			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('string');
		});
	});

	describe('value', () => {
		it('should return the trimmed model string', () => {
			const result = VehicleModel.create('  Mustang  ');
			expect(result.value.value).toBe('Mustang');
		});
	});

	describe('equals()', () => {
		it('should return true for equal models', () => {
			const model1 = VehicleModel.create('Accord').value;
			const model2 = VehicleModel.create('Accord').value;
			expect(model1.equals(model2)).toBe(true);
		});

		it('should return false for different models', () => {
			const model1 = VehicleModel.create('Accord').value;
			const model2 = VehicleModel.create('Civic').value;
			expect(model1.equals(model2)).toBe(false);
		});
	});

	describe('toString()', () => {
		it('should return the model string', () => {
			const model = VehicleModel.create('Corolla').value;
			expect(model.toString()).toBe('Corolla');
		});
	});
});
