// Task Utils
import type { Task, TaskStatus, TaskPriority } from '$lib/types/task';

/**
 * Helper: Validate task input
 */
export function validateTaskInput(input: {
	title: string;
	description?: string;
	dueDate?: string;
}): { valid: boolean; errors: string[] } {
	const errors: string[] = [];

	if (!input.title || input.title.trim().length === 0) {
		errors.push('Title is required');
	}

	if (input.title && input.title.length > 255) {
		errors.push('Title must be less than 255 characters');
	}

	if (input.description && input.description.length > 5000) {
		errors.push('Description must be less than 5000 characters');
	}

	if (input.dueDate) {
		const dueDate = new Date(input.dueDate);
		const now = new Date();
		if (dueDate < now) {
			errors.push('Due date cannot be in the past');
		}
	}

	return {
		valid: errors.length === 0,
		errors
	};
}

/**
 * Helper: Check if task is overdue
 */
export function isTaskOverdue(task: Task): boolean {
	if (!task.dueDate || task.status === 'DONE') {
		return false;
	}
	const dueDate = new Date(task.dueDate);
	const now = new Date();
	return dueDate < now;
}

/**
 * Helper: Get task status color with Tailwind classes
 */
export function getTaskStatusColor(status: TaskStatus): string {
	const statusColors: Record<TaskStatus, string> = {
		TODO: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
		IN_PROGRESS: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
		BLOCKED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
		REVIEW: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
		DONE: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
		CANCELLED: 'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400'
	};
	return statusColors[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
}

/**
 * Helper: Get task priority color with Tailwind classes
 */
export function getTaskPriorityColor(priority: TaskPriority): string {
	const priorityColors: Record<TaskPriority, string> = {
		LOW: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
		MEDIUM: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
		HIGH: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
		URGENT: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
	};
	return (
		priorityColors[priority] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
	);
}
