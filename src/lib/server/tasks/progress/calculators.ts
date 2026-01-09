import type { Task } from '$lib/types/task';
import type { TaskWithSubtasks } from './types';

/**
 * Calculate basic subtask completion progress
 */
export function calculateSubtaskProgress(subtasks: Task[]): number {
	if (subtasks.length === 0) return 0;

	const completedCount = subtasks.filter((t) => t.status === 'DONE').length;
	return Math.round((completedCount / subtasks.length) * 10000) / 100; // Round to 2 decimal places
}

/**
 * Count all descendants (subtasks at all levels)
 */
export function countAllDescendants(task: TaskWithSubtasks): number {
	let count = 0;

	const level1 = task.tasksByParentTaskId?.nodes || [];
	count += level1.length;

	for (const level1Task of level1) {
		const level2 = level1Task.tasksByParentTaskId?.nodes || [];
		count += level2.length;

		for (const level2Task of level2) {
			const level3Count = level2Task.tasksByParentTaskId?.totalCount || 0;
			count += level3Count;
		}
	}

	return count;
}

/**
 * Count completed descendants at all levels
 */
export function countCompletedDescendants(task: TaskWithSubtasks): number {
	let count = 0;

	const level1 = task.tasksByParentTaskId?.nodes || [];
	count += level1.filter((t) => t.status === 'DONE').length;

	for (const level1Task of level1) {
		const level2 = level1Task.tasksByParentTaskId?.nodes || [];
		count += level2.filter((t) => t.status === 'DONE').length;

		for (const level2Task of level2) {
			const level3 = level2Task.tasksByParentTaskId?.nodes || [];
			count += level3.filter((t) => t.status === 'DONE').length;
		}
	}

	return count;
}

/**
 * Helper to calculate completion percentage safely
 */
export function calculateCompletionPercentage(completed: number, total: number): number {
	return total > 0 ? Math.round((completed / total) * 10000) / 100 : 0;
}
