// src/domain/Task/value-objects/DueDate.test.ts
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { DueDate } from './DueDate';
import { TaskValidationError } from '../errors/TaskErrors';

describe('DueDate', () => {
	beforeEach(() => {
		// Set fixed time for testing: 2026-02-11 12:00:00 UTC
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-02-11T12:00:00Z'));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe('create', () => {
		it('should create valid future date', () => {
			const tomorrow = new Date('2026-02-12T12:00:00Z');
			const result = DueDate.create(tomorrow);

			expect(result.isOk).toBe(true);
			expect(result.value.value.getTime()).toBe(tomorrow.getTime());
		});

		it('should reject past date', () => {
			const yesterday = new Date('2026-02-10T12:00:00Z');
			const result = DueDate.create(yesterday);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(TaskValidationError);
			expect(result.error.message).toContain('future');
		});

		it('should accept date equal to current time', () => {
			const now = new Date('2026-02-11T12:00:00Z');
			const result = DueDate.create(now);

			expect(result.isOk).toBe(true);
		});

		it('should create defensive copy of date', () => {
			const original = new Date('2026-02-12T12:00:00Z');
			const result = DueDate.create(original);

			// Mutate original
			original.setFullYear(2025);

			// Value should be unchanged
			expect(result.value.value.getFullYear()).toBe(2026);
		});
	});

	describe('isOverdue', () => {
		it('should return false for future date', () => {
			const tomorrow = new Date('2026-02-12T12:00:00Z');
			const dueDate = DueDate.create(tomorrow).value;

			expect(dueDate.isOverdue()).toBe(false);
		});

		it('should return true for past date', () => {
			const tomorrow = new Date('2026-02-12T12:00:00Z');
			const dueDate = DueDate.create(tomorrow).value;

			// Advance time to day after due date
			vi.setSystemTime(new Date('2026-02-13T12:00:00Z'));

			expect(dueDate.isOverdue()).toBe(true);
		});

		it('should return false for current time', () => {
			const now = new Date('2026-02-11T12:00:00Z');
			const dueDate = DueDate.create(now).value;

			expect(dueDate.isOverdue()).toBe(false);
		});
	});

	describe('daysUntilDue', () => {
		it('should return positive days for future date', () => {
			const future = new Date('2026-02-15T12:00:00Z'); // 4 days from now
			const dueDate = DueDate.create(future).value;

			expect(dueDate.daysUntilDue()).toBe(4);
		});

		it('should return negative days for past date', () => {
			const tomorrow = new Date('2026-02-12T12:00:00Z');
			const dueDate = DueDate.create(tomorrow).value;

			// Advance time 3 days
			vi.setSystemTime(new Date('2026-02-14T12:00:00Z'));

			expect(dueDate.daysUntilDue()).toBe(-2);
		});

		it('should return 0 for same day', () => {
			const sameDay = new Date('2026-02-11T18:00:00Z');
			const dueDate = DueDate.create(sameDay).value;

			expect(dueDate.daysUntilDue()).toBe(0);
		});
	});

	describe('equals', () => {
		it('should return true for same date', () => {
			const date1 = DueDate.create(new Date('2026-02-12T12:00:00Z')).value;
			const date2 = DueDate.create(new Date('2026-02-12T12:00:00Z')).value;

			expect(date1.equals(date2)).toBe(true);
		});

		it('should return false for different dates', () => {
			const date1 = DueDate.create(new Date('2026-02-12T12:00:00Z')).value;
			const date2 = DueDate.create(new Date('2026-02-13T12:00:00Z')).value;

			expect(date1.equals(date2)).toBe(false);
		});
	});
});
