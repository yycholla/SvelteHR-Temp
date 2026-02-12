// src/domain/Goal/value-objects/Quarter.test.ts
import { describe, it, expect } from 'vitest';
import { Quarter } from './Quarter';
import { QuarterValidationError } from '../errors/GoalErrors';

describe('Quarter', () => {
	describe('create', () => {
		it('should create from Q1 string', () => {
			const result = Quarter.create('Q1');
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe(1);
		});

		it('should create from Q2 string', () => {
			const result = Quarter.create('Q2');
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe(2);
		});

		it('should create from Q3 string', () => {
			const result = Quarter.create('Q3');
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe(3);
		});

		it('should create from Q4 string', () => {
			const result = Quarter.create('Q4');
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe(4);
		});

		it('should create from number 1', () => {
			const result = Quarter.create(1);
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe(1);
		});

		it('should normalize lowercase', () => {
			const result = Quarter.create('q2');
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe(2);
		});

		it('should trim whitespace', () => {
			const result = Quarter.create('  Q3  ');
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe(3);
		});

		it('should parse number string without Q', () => {
			const result = Quarter.create('4');
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe(4);
		});

		it('should reject Q0', () => {
			const result = Quarter.create('Q0');
			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(QuarterValidationError);
		});

		it('should reject Q5', () => {
			const result = Quarter.create('Q5');
			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(QuarterValidationError);
		});

		it('should reject invalid string', () => {
			const result = Quarter.create('invalid');
			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(QuarterValidationError);
		});
	});

	describe('format', () => {
		it('should format as Q1', () => {
			const quarter = Quarter.create(1).value;
			expect(quarter.format()).toBe('Q1');
		});

		it('should format as Q4', () => {
			const quarter = Quarter.create(4).value;
			expect(quarter.format()).toBe('Q4');
		});
	});

	describe('getMonthRange', () => {
		it('should return months for Q1', () => {
			const quarter = Quarter.create(1).value;
			expect(quarter.getMonthRange()).toEqual([1, 3]);
		});

		it('should return months for Q2', () => {
			const quarter = Quarter.create(2).value;
			expect(quarter.getMonthRange()).toEqual([4, 6]);
		});

		it('should return months for Q3', () => {
			const quarter = Quarter.create(3).value;
			expect(quarter.getMonthRange()).toEqual([7, 9]);
		});

		it('should return months for Q4', () => {
			const quarter = Quarter.create(4).value;
			expect(quarter.getMonthRange()).toEqual([10, 12]);
		});
	});

	describe('equals', () => {
		it('should return true for same quarter', () => {
			const q1a = Quarter.create(1).value;
			const q1b = Quarter.create('Q1').value;
			expect(q1a.equals(q1b)).toBe(true);
		});

		it('should return false for different quarters', () => {
			const q1 = Quarter.create(1).value;
			const q2 = Quarter.create(2).value;
			expect(q1.equals(q2)).toBe(false);
		});
	});

	describe('toString', () => {
		it('should return formatted string for Q1', () => {
			const quarter = Quarter.create(1).value;
			expect(quarter.toString()).toBe('Q1');
		});

		it('should return formatted string for Q3', () => {
			const quarter = Quarter.create('q3').value;
			expect(quarter.toString()).toBe('Q3');
		});
	});
});
