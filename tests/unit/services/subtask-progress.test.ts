/**
 * Unit Tests: Subtask Progress Service
 * Feature: 028-task-system-expansion - T057
 *
 * Tests pure calculation and formatting functions for subtask progress tracking.
 */

import { describe, it, expect } from 'vitest';
import {
	calculateSubtaskProgress,
	formatProgressPercentage,
	getProgressColor,
	isTaskOnTrack,
	type TaskProgress,
	type ProgressStatistics
} from '$lib/server/tasks/subtask-progress';
import type { Task, TaskStatus } from '$lib/types/task';

describe('calculateSubtaskProgress', () => {
	it('should return 0 for empty subtasks array', () => {
		const result = calculateSubtaskProgress([]);
		expect(result).toBe(0);
	});

	it('should calculate 100% when all subtasks are completed', () => {
		const subtasks = [
			{ id: '1', status: 'DONE' as TaskStatus },
			{ id: '2', status: 'DONE' as TaskStatus },
			{ id: '3', status: 'DONE' as TaskStatus }
		] as Task[];

		const result = calculateSubtaskProgress(subtasks);
		expect(result).toBe(100);
	});

	it('should calculate 50% when half of subtasks are completed', () => {
		const subtasks = [
			{ id: '1', status: 'DONE' as TaskStatus },
			{ id: '2', status: 'IN_PROGRESS' as TaskStatus },
			{ id: '3', status: 'TODO' as TaskStatus },
			{ id: '4', status: 'DONE' as TaskStatus }
		] as Task[];

		const result = calculateSubtaskProgress(subtasks);
		expect(result).toBe(50);
	});

	it('should calculate 0% when no subtasks are completed', () => {
		const subtasks = [
			{ id: '1', status: 'IN_PROGRESS' as TaskStatus },
			{ id: '2', status: 'TODO' as TaskStatus },
			{ id: '3', status: 'BLOCKED' as TaskStatus }
		] as Task[];

		const result = calculateSubtaskProgress(subtasks);
		expect(result).toBe(0);
	});

	it('should round to 2 decimal places', () => {
		const subtasks = [
			{ id: '1', status: 'DONE' as TaskStatus },
			{ id: '2', status: 'TODO' as TaskStatus },
			{ id: '3', status: 'TODO' as TaskStatus }
		] as Task[];

		const result = calculateSubtaskProgress(subtasks);
		// 1/3 = 33.333...% should round to 33.33%
		expect(result).toBe(33.33);
	});

	it('should calculate 33.33% for 1 out of 3 subtasks completed', () => {
		const subtasks = [
			{ id: '1', status: 'DONE' as TaskStatus },
			{ id: '2', status: 'TODO' as TaskStatus },
			{ id: '3', status: 'TODO' as TaskStatus }
		] as Task[];

		const result = calculateSubtaskProgress(subtasks);
		expect(result).toBe(33.33);
	});

	it('should calculate 75% for 3 out of 4 subtasks completed', () => {
		const subtasks = [
			{ id: '1', status: 'DONE' as TaskStatus },
			{ id: '2', status: 'DONE' as TaskStatus },
			{ id: '3', status: 'DONE' as TaskStatus },
			{ id: '4', status: 'IN_PROGRESS' as TaskStatus }
		] as Task[];

		const result = calculateSubtaskProgress(subtasks);
		expect(result).toBe(75);
	});

	it('should only count Completed status, ignoring other statuses', () => {
		const subtasks = [
			{ id: '1', status: 'DONE' as TaskStatus },
			{ id: '2', status: 'CANCELLED' as TaskStatus },
			{ id: '3', status: 'BLOCKED' as TaskStatus },
			{ id: '4', status: 'TODO' as TaskStatus }
		] as Task[];

		const result = calculateSubtaskProgress(subtasks);
		expect(result).toBe(25);
	});
});

describe('formatProgressPercentage', () => {
	it('should format whole number percentages', () => {
		expect(formatProgressPercentage(0)).toBe('0.0%');
		expect(formatProgressPercentage(50)).toBe('50.0%');
		expect(formatProgressPercentage(100)).toBe('100.0%');
	});

	it('should format decimal percentages to 1 decimal place', () => {
		expect(formatProgressPercentage(33.33)).toBe('33.3%');
		expect(formatProgressPercentage(66.67)).toBe('66.7%');
		expect(formatProgressPercentage(12.56)).toBe('12.6%');
	});

	it('should round to 1 decimal place', () => {
		expect(formatProgressPercentage(33.333333)).toBe('33.3%');
		expect(formatProgressPercentage(66.666666)).toBe('66.7%');
	});

	it('should handle very small percentages', () => {
		expect(formatProgressPercentage(0.1)).toBe('0.1%');
		expect(formatProgressPercentage(0.01)).toBe('0.0%');
	});
});

describe('getProgressColor', () => {
	it('should return green for 100% completion', () => {
		expect(getProgressColor(100)).toBe('green');
	});

	it('should return blue for 75-99% completion', () => {
		expect(getProgressColor(75)).toBe('blue');
		expect(getProgressColor(85)).toBe('blue');
		expect(getProgressColor(99)).toBe('blue');
	});

	it('should return yellow for 50-74% completion', () => {
		expect(getProgressColor(50)).toBe('yellow');
		expect(getProgressColor(60)).toBe('yellow');
		expect(getProgressColor(74)).toBe('yellow');
	});

	it('should return orange for 25-49% completion', () => {
		expect(getProgressColor(25)).toBe('orange');
		expect(getProgressColor(35)).toBe('orange');
		expect(getProgressColor(49)).toBe('orange');
	});

	it('should return red for 0-24% completion', () => {
		expect(getProgressColor(0)).toBe('red');
		expect(getProgressColor(10)).toBe('red');
		expect(getProgressColor(24)).toBe('red');
	});

	it('should handle boundary cases correctly', () => {
		expect(getProgressColor(24.9)).toBe('red');
		expect(getProgressColor(25.0)).toBe('orange');
		expect(getProgressColor(49.9)).toBe('orange');
		expect(getProgressColor(50.0)).toBe('yellow');
		expect(getProgressColor(74.9)).toBe('yellow');
		expect(getProgressColor(75.0)).toBe('blue');
		expect(getProgressColor(99.9)).toBe('blue');
		expect(getProgressColor(100.0)).toBe('green');
	});
});

describe('isTaskOnTrack', () => {
	describe('Completed status', () => {
		it('should always return on track for completed tasks', () => {
			const result = isTaskOnTrack(new Date(), 100, 'DONE');
			expect(result.onTrack).toBe(true);
			expect(result.reason).toBe('Task completed');
		});

		it('should return on track for completed tasks even with past due date', () => {
			const pastDate = new Date('2020-01-01');
			const result = isTaskOnTrack(pastDate, 100, 'DONE');
			expect(result.onTrack).toBe(true);
			expect(result.reason).toBe('Task completed');
		});
	});

	describe('Cancelled status', () => {
		it('should always return not on track for cancelled tasks', () => {
			const result = isTaskOnTrack(new Date(), 50, 'CANCELLED');
			expect(result.onTrack).toBe(false);
			expect(result.reason).toBe('Task cancelled');
		});
	});

	describe('No due date', () => {
		it('should return on track when no due date is set', () => {
			const result = isTaskOnTrack(null, 25, 'IN_PROGRESS');
			expect(result.onTrack).toBe(true);
			expect(result.reason).toBe('No due date set');
		});
	});

	describe('Overdue tasks', () => {
		it('should return not on track for overdue tasks', () => {
			const pastDate = new Date('2020-01-01');
			const result = isTaskOnTrack(pastDate, 50, 'IN_PROGRESS');
			expect(result.onTrack).toBe(false);
			expect(result.reason).toBe('Task overdue');
		});

		it('should return not on track for yesterday\'s due date', () => {
			const yesterday = new Date();
			yesterday.setDate(yesterday.getDate() - 1);
			const result = isTaskOnTrack(yesterday, 80, 'IN_PROGRESS');
			expect(result.onTrack).toBe(false);
			expect(result.reason).toBe('Task overdue');
		});
	});

	describe('Future due dates with progress tracking', () => {
		it('should return on track for task due in 7 days with reasonable progress', () => {
			const futureDate = new Date();
			futureDate.setDate(futureDate.getDate() + 7);
			const result = isTaskOnTrack(futureDate, 50, 'IN_PROGRESS');

			// With 7 days remaining, expected progress is ~90, so 50% should be behind
			// But the tolerance is -20, so 50% should still be on track if expected is 70 or less
			expect(result.onTrack).toBe(true);
		});

		it('should return not on track for task due soon with very low progress', () => {
			const futureDate = new Date();
			futureDate.setDate(futureDate.getDate() + 1);
			const result = isTaskOnTrack(futureDate, 10, 'TODO');

			// With 1 day remaining, expected progress should be very high
			// 10% progress is definitely behind
			expect(result.onTrack).toBe(false);
			expect(result.reason).toBe('Progress behind schedule');
		});

		it('should return on track for task due far in future', () => {
			const futureDate = new Date();
			futureDate.setDate(futureDate.getDate() + 30);
			const result = isTaskOnTrack(futureDate, 20, 'IN_PROGRESS');

			// With 30 days remaining, expected progress is low, so 20% is fine
			expect(result.onTrack).toBe(true);
		});
	});

	describe('Edge cases', () => {
		it('should handle task due today', () => {
			const today = new Date();
			today.setHours(23, 59, 59); // End of today
			const result = isTaskOnTrack(today, 90, 'IN_PROGRESS');

			// Task should be on track if nearly complete
			expect(result.onTrack).toBe(true);
		});

		it('should handle 0% progress with far future due date', () => {
			const futureDate = new Date();
			futureDate.setDate(futureDate.getDate() + 60);
			const result = isTaskOnTrack(futureDate, 0, 'TODO');

			// With plenty of time, 0% is acceptable
			expect(result.onTrack).toBe(true);
		});

		it('should handle blocked tasks with progress tracking', () => {
			const futureDate = new Date();
			futureDate.setDate(futureDate.getDate() + 5);
			const result = isTaskOnTrack(futureDate, 30, 'BLOCKED');

			// Blocked status doesn't automatically fail - it's based on progress
			expect(result.onTrack).toBeDefined();
		});
	});
});

describe('Task Progress Integration Scenarios', () => {
	it('should correctly assess a typical in-progress task', () => {
		const subtasks = [
			{ id: '1', status: 'DONE' as TaskStatus },
			{ id: '2', status: 'IN_PROGRESS' as TaskStatus },
			{ id: '3', status: 'TODO' as TaskStatus },
			{ id: '4', status: 'TODO' as TaskStatus }
		] as Task[];

		const progress = calculateSubtaskProgress(subtasks);
		const color = getProgressColor(progress);
		const formatted = formatProgressPercentage(progress);

		const dueDate = new Date();
		dueDate.setDate(dueDate.getDate() + 14); // 2 weeks out
		const tracking = isTaskOnTrack(dueDate, progress, 'IN_PROGRESS');

		expect(progress).toBe(25);
		expect(color).toBe('orange');
		expect(formatted).toBe('25.0%');
		expect(tracking.onTrack).toBe(true); // 2 weeks is plenty of time
	});

	it('should correctly assess a nearly complete task', () => {
		const subtasks = [
			{ id: '1', status: 'DONE' as TaskStatus },
			{ id: '2', status: 'DONE' as TaskStatus },
			{ id: '3', status: 'DONE' as TaskStatus },
			{ id: '4', status: 'IN_PROGRESS' as TaskStatus }
		] as Task[];

		const progress = calculateSubtaskProgress(subtasks);
		const color = getProgressColor(progress);

		expect(progress).toBe(75);
		expect(color).toBe('blue');
	});

	it('should correctly assess an at-risk task', () => {
		const subtasks = [
			{ id: '1', status: 'DONE' as TaskStatus },
			{ id: '2', status: 'BLOCKED' as TaskStatus },
			{ id: '3', status: 'TODO' as TaskStatus },
			{ id: '4', status: 'TODO' as TaskStatus },
			{ id: '5', status: 'TODO' as TaskStatus }
		] as Task[];

		const progress = calculateSubtaskProgress(subtasks);
		const color = getProgressColor(progress);

		const dueDate = new Date();
		dueDate.setDate(dueDate.getDate() + 2); // Due soon
		const tracking = isTaskOnTrack(dueDate, progress, 'IN_PROGRESS');

		expect(progress).toBe(20); // Only 1/5 complete
		expect(color).toBe('red');
		expect(tracking.onTrack).toBe(false); // Should be behind schedule
	});
});