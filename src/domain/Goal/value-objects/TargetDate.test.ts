// src/domain/Goal/value-objects/TargetDate.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TargetDate } from './TargetDate';
import { TargetDateValidationError } from '../errors/GoalErrors';

describe('TargetDate', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2025-06-15T12:00:00Z'));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe('create', () => {
		it('should create from ISO string', () => {
			const result = TargetDate.create('2025-12-31');
			expect(result.isOk).toBe(true);
		});

		it('should create from Date object', () => {
			const date = new Date('2025-12-31');
			const result = TargetDate.create(date);
			expect(result.isOk).toBe(true);
		});

		it('should reject invalid date string', () => {
			const result = TargetDate.create('invalid');
			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(TargetDateValidationError);
		});

		it('should reject year before 2000', () => {
			const result = TargetDate.create('1999-12-31');
			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('between 2000 and 2100');
		});

		it('should reject year after 2100', () => {
			const result = TargetDate.create('2101-01-01');
			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('between 2000 and 2100');
		});

		it('should accept year 2000', () => {
			const result = TargetDate.create('2000-01-01');
			expect(result.isOk).toBe(true);
		});

		it('should accept year 2100', () => {
			const result = TargetDate.create('2100-12-31');
			expect(result.isOk).toBe(true);
		});

		it('should create defensive copy from Date object', () => {
			const originalDate = new Date('2025-12-31');
			const result = TargetDate.create(originalDate);
			expect(result.isOk).toBe(true);

			originalDate.setFullYear(2026);
			expect(result.value.value.getFullYear()).toBe(2025);
		});
	});

	describe('value getter', () => {
		it('should return defensive copy', () => {
			const targetDate = TargetDate.create('2025-12-31').value;
			const date1 = targetDate.value;
			const date2 = targetDate.value;

			expect(date1).not.toBe(date2);
			expect(date1.getTime()).toBe(date2.getTime());
		});

		it('should protect against mutation', () => {
			const targetDate = TargetDate.create('2025-12-31').value;
			const date = targetDate.value;
			date.setFullYear(2026);

			expect(targetDate.value.getFullYear()).toBe(2025);
		});
	});

	describe('isOverdue', () => {
		it('should return true for past date', () => {
			const targetDate = TargetDate.create('2025-06-01').value;
			expect(targetDate.isOverdue()).toBe(true);
		});

		it('should return false for future date', () => {
			const targetDate = TargetDate.create('2025-12-31').value;
			expect(targetDate.isOverdue()).toBe(false);
		});

		it('should return false for today', () => {
			const targetDate = TargetDate.create('2025-06-15').value;
			expect(targetDate.isOverdue()).toBe(false);
		});

		it('should use custom reference date', () => {
			const targetDate = TargetDate.create('2025-06-10').value;
			const referenceDate = new Date('2025-06-20');
			expect(targetDate.isOverdue(referenceDate)).toBe(true);
		});
	});

	describe('daysUntil', () => {
		it('should return positive days for future date', () => {
			const targetDate = TargetDate.create('2025-06-20').value;
			expect(targetDate.daysUntil()).toBe(5);
		});

		it('should return negative days for past date', () => {
			const targetDate = TargetDate.create('2025-06-10').value;
			expect(targetDate.daysUntil()).toBe(-5);
		});

		it('should return 0 for today', () => {
			const targetDate = TargetDate.create('2025-06-15').value;
			expect(targetDate.daysUntil()).toBe(0);
		});
	});

	describe('equals', () => {
		it('should return true for same date', () => {
			const date1 = TargetDate.create('2025-12-31').value;
			const date2 = TargetDate.create('2025-12-31').value;
			expect(date1.equals(date2)).toBe(true);
		});

		it('should return false for different dates', () => {
			const date1 = TargetDate.create('2025-12-31').value;
			const date2 = TargetDate.create('2025-12-30').value;
			expect(date1.equals(date2)).toBe(false);
		});
	});

	describe('toISOString', () => {
		it('should return ISO date string without time', () => {
			const targetDate = TargetDate.create('2025-12-31').value;
			expect(targetDate.toISOString()).toBe('2025-12-31');
		});
	});
});
