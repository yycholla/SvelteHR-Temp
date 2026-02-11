// src/domain/Task/enums/TaskPriority.test.ts
import { describe, it, expect } from 'vitest';
import { TaskPriority, isValidTaskPriority, comparePriority } from './TaskPriority';

describe('TaskPriority', () => {
	describe('enum values', () => {
		it('should have all priority values', () => {
			expect(TaskPriority.LOW).toBe('LOW');
			expect(TaskPriority.MEDIUM).toBe('MEDIUM');
			expect(TaskPriority.HIGH).toBe('HIGH');
			expect(TaskPriority.URGENT).toBe('URGENT');
		});
	});

	describe('isValidTaskPriority', () => {
		it('should return true for valid priority', () => {
			expect(isValidTaskPriority('LOW')).toBe(true);
			expect(isValidTaskPriority('URGENT')).toBe(true);
		});

		it('should return false for invalid priority', () => {
			expect(isValidTaskPriority('INVALID')).toBe(false);
			expect(isValidTaskPriority('')).toBe(false);
		});
	});

	describe('comparePriority', () => {
		it('should return 0 for equal priorities', () => {
			expect(comparePriority(TaskPriority.HIGH, TaskPriority.HIGH)).toBe(0);
		});

		it('should return negative for lower priority', () => {
			expect(comparePriority(TaskPriority.LOW, TaskPriority.HIGH)).toBeLessThan(0);
			expect(comparePriority(TaskPriority.MEDIUM, TaskPriority.URGENT)).toBeLessThan(0);
		});

		it('should return positive for higher priority', () => {
			expect(comparePriority(TaskPriority.HIGH, TaskPriority.LOW)).toBeGreaterThan(0);
			expect(comparePriority(TaskPriority.URGENT, TaskPriority.MEDIUM)).toBeGreaterThan(0);
		});

		it('should maintain correct order: LOW < MEDIUM < HIGH < URGENT', () => {
			expect(comparePriority(TaskPriority.LOW, TaskPriority.MEDIUM)).toBeLessThan(0);
			expect(comparePriority(TaskPriority.MEDIUM, TaskPriority.HIGH)).toBeLessThan(0);
			expect(comparePriority(TaskPriority.HIGH, TaskPriority.URGENT)).toBeLessThan(0);
		});
	});
});
