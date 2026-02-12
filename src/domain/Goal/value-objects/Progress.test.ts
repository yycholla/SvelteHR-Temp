// src/domain/Goal/value-objects/Progress.test.ts
import { describe, it, expect } from 'vitest';
import { Progress } from './Progress';
import { ProgressValidationError } from '../errors/GoalErrors';

describe('Progress', () => {
	describe('create', () => {
		it('should create progress at 0', () => {
			const result = Progress.create(0);
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe(0);
		});

		it('should create progress at 100', () => {
			const result = Progress.create(100);
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe(100);
		});

		it('should create progress at 50', () => {
			const result = Progress.create(50);
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe(50);
		});

		it('should round decimal values', () => {
			const result = Progress.create(45.7);
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe(46);
		});

		it('should reject negative progress', () => {
			const result = Progress.create(-1);
			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(ProgressValidationError);
		});

		it('should reject progress over 100', () => {
			const result = Progress.create(101);
			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(ProgressValidationError);
		});

		it('should reject NaN', () => {
			const result = Progress.create(NaN);
			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(ProgressValidationError);
		});

		it('should reject Infinity', () => {
			const result = Progress.create(Infinity);
			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(ProgressValidationError);
		});
	});

	describe('static constructors', () => {
		it('should create zero progress', () => {
			const progress = Progress.zero();
			expect(progress.value).toBe(0);
		});

		it('should create complete progress', () => {
			const progress = Progress.complete();
			expect(progress.value).toBe(100);
		});
	});

	describe('status checks', () => {
		it('should identify zero progress', () => {
			const progress = Progress.create(0).value;
			expect(progress.isZero()).toBe(true);
			expect(progress.isComplete()).toBe(false);
			expect(progress.isPartial()).toBe(false);
		});

		it('should identify complete progress', () => {
			const progress = Progress.create(100).value;
			expect(progress.isZero()).toBe(false);
			expect(progress.isComplete()).toBe(true);
			expect(progress.isPartial()).toBe(false);
		});

		it('should identify partial progress', () => {
			const progress = Progress.create(50).value;
			expect(progress.isZero()).toBe(false);
			expect(progress.isComplete()).toBe(false);
			expect(progress.isPartial()).toBe(true);
		});
	});

	describe('increment', () => {
		it('should increment progress', () => {
			const progress = Progress.create(30).value;
			const result = progress.increment(20);
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe(50);
		});

		it('should reject increment exceeding 100', () => {
			const progress = Progress.create(90).value;
			const result = progress.increment(20);
			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(ProgressValidationError);
		});
	});

	describe('decrement', () => {
		it('should decrement progress', () => {
			const progress = Progress.create(50).value;
			const result = progress.decrement(20);
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe(30);
		});

		it('should reject decrement below 0', () => {
			const progress = Progress.create(10).value;
			const result = progress.decrement(20);
			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(ProgressValidationError);
		});
	});

	describe('formatPercentage', () => {
		it('should format as percentage', () => {
			const progress = Progress.create(75).value;
			expect(progress.formatPercentage()).toBe('75%');
		});
	});

	describe('equals', () => {
		it('should return true for same progress', () => {
			const progress1 = Progress.create(50).value;
			const progress2 = Progress.create(50).value;
			expect(progress1.equals(progress2)).toBe(true);
		});

		it('should return false for different progress', () => {
			const progress1 = Progress.create(50).value;
			const progress2 = Progress.create(75).value;
			expect(progress1.equals(progress2)).toBe(false);
		});
	});
});
