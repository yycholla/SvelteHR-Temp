// src/domain/Compensation/value-objects/CompensationType.test.ts
import { describe, expect, it } from 'vitest';
import { CompensationType } from './CompensationType';
import { InvalidCompensationError } from '../errors';

describe('CompensationType', () => {
	describe('create', () => {
		it('returns Ok with valid base_salary type', () => {
			const result = CompensationType.create('base_salary');

			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('base_salary');
		});

		it('returns Ok with valid bonus type', () => {
			const result = CompensationType.create('bonus');

			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('bonus');
		});

		it('returns Ok with valid commission type', () => {
			const result = CompensationType.create('commission');

			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('commission');
		});

		it('returns Ok with valid equity type', () => {
			const result = CompensationType.create('equity');

			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('equity');
		});

		it('returns Ok with valid stock_options type', () => {
			const result = CompensationType.create('stock_options');

			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('stock_options');
		});

		it('normalizes case (uppercase)', () => {
			const result = CompensationType.create('BASE_SALARY');

			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('base_salary');
		});

		it('normalizes case (mixed case)', () => {
			const result = CompensationType.create('Stock_Options');

			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('stock_options');
		});

		it('trims whitespace', () => {
			const result = CompensationType.create('  bonus  ');

			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('bonus');
		});

		it('returns InvalidCompensationError with invalid type', () => {
			const result = CompensationType.create('invalid_type');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidCompensationError);
			expect(result.error.message).toContain('Invalid compensation type');
		});

		it('returns InvalidCompensationError with empty string', () => {
			const result = CompensationType.create('');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidCompensationError);
		});
	});

	describe('equals', () => {
		it('returns true for same type', () => {
			const type1 = CompensationType.create('bonus').value;
			const type2 = CompensationType.create('bonus').value;

			expect(type1.equals(type2)).toBe(true);
		});

		it('returns false for different types', () => {
			const type1 = CompensationType.create('bonus').value;
			const type2 = CompensationType.create('commission').value;

			expect(type1.equals(type2)).toBe(false);
		});
	});

	describe('isRecurring', () => {
		it('returns true for base_salary', () => {
			const type = CompensationType.create('base_salary').value;

			expect(type.isRecurring()).toBe(true);
		});

		it('returns false for bonus', () => {
			const type = CompensationType.create('bonus').value;

			expect(type.isRecurring()).toBe(false);
		});

		it('returns false for commission', () => {
			const type = CompensationType.create('commission').value;

			expect(type.isRecurring()).toBe(false);
		});

		it('returns false for equity', () => {
			const type = CompensationType.create('equity').value;

			expect(type.isRecurring()).toBe(false);
		});
	});

	describe('isVariable', () => {
		it('returns false for base_salary', () => {
			const type = CompensationType.create('base_salary').value;

			expect(type.isVariable()).toBe(false);
		});

		it('returns true for bonus', () => {
			const type = CompensationType.create('bonus').value;

			expect(type.isVariable()).toBe(true);
		});

		it('returns true for commission', () => {
			const type = CompensationType.create('commission').value;

			expect(type.isVariable()).toBe(true);
		});

		it('returns true for equity', () => {
			const type = CompensationType.create('equity').value;

			expect(type.isVariable()).toBe(true);
		});
	});

	describe('isEquityBased', () => {
		it('returns false for base_salary', () => {
			const type = CompensationType.create('base_salary').value;

			expect(type.isEquityBased()).toBe(false);
		});

		it('returns false for bonus', () => {
			const type = CompensationType.create('bonus').value;

			expect(type.isEquityBased()).toBe(false);
		});

		it('returns true for equity', () => {
			const type = CompensationType.create('equity').value;

			expect(type.isEquityBased()).toBe(true);
		});

		it('returns true for stock_options', () => {
			const type = CompensationType.create('stock_options').value;

			expect(type.isEquityBased()).toBe(true);
		});
	});
});
