// src/domain/Task/enums/TaskStatus.test.ts
import { describe, it, expect } from 'vitest';
import { TaskStatus, isValidTaskStatus, canTransition } from './TaskStatus';

describe('TaskStatus', () => {
	describe('enum values', () => {
		it('should have all status values', () => {
			expect(TaskStatus.TODO).toBe('TODO');
			expect(TaskStatus.IN_PROGRESS).toBe('IN_PROGRESS');
			expect(TaskStatus.BLOCKED).toBe('BLOCKED');
			expect(TaskStatus.REVIEW).toBe('REVIEW');
			expect(TaskStatus.DONE).toBe('DONE');
			expect(TaskStatus.CANCELLED).toBe('CANCELLED');
		});
	});

	describe('isValidTaskStatus', () => {
		it('should return true for valid status', () => {
			expect(isValidTaskStatus('TODO')).toBe(true);
			expect(isValidTaskStatus('DONE')).toBe(true);
		});

		it('should return false for invalid status', () => {
			expect(isValidTaskStatus('INVALID')).toBe(false);
			expect(isValidTaskStatus('')).toBe(false);
		});
	});

	describe('canTransition', () => {
		it('should allow TODO → IN_PROGRESS', () => {
			expect(canTransition(TaskStatus.TODO, TaskStatus.IN_PROGRESS)).toBe(true);
		});

		it('should allow IN_PROGRESS → REVIEW', () => {
			expect(canTransition(TaskStatus.IN_PROGRESS, TaskStatus.REVIEW)).toBe(true);
		});

		it('should allow REVIEW → DONE', () => {
			expect(canTransition(TaskStatus.REVIEW, TaskStatus.DONE)).toBe(true);
		});

		it('should allow any status → CANCELLED', () => {
			expect(canTransition(TaskStatus.TODO, TaskStatus.CANCELLED)).toBe(true);
			expect(canTransition(TaskStatus.IN_PROGRESS, TaskStatus.CANCELLED)).toBe(true);
		});

		it('should not allow DONE → IN_PROGRESS', () => {
			expect(canTransition(TaskStatus.DONE, TaskStatus.IN_PROGRESS)).toBe(false);
		});

		it('should not allow TODO → DONE (skipping steps)', () => {
			expect(canTransition(TaskStatus.TODO, TaskStatus.DONE)).toBe(false);
		});

		it('should allow same status transition', () => {
			expect(canTransition(TaskStatus.IN_PROGRESS, TaskStatus.IN_PROGRESS)).toBe(true);
		});
	});
});
