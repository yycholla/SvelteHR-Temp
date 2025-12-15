import type { TaskStatus } from '$lib/types/task';

/**
 * Format progress percentage as string
 */
export function formatProgressPercentage(percentage: number): string {
	return `${percentage.toFixed(1)}%`;
}

/**
 * Get progress color based on completion percentage
 */
export function getProgressColor(percentage: number): string {
	if (percentage >= 100) return 'green';
	if (percentage >= 75) return 'blue';
	if (percentage >= 50) return 'yellow';
	if (percentage >= 25) return 'orange';
	return 'red';
}

/**
 * Determine if a task is on track based on due date and progress
 */
export function isTaskOnTrack(
	dueDate: Date | null,
	completionPercentage: number,
	status: TaskStatus
): { onTrack: boolean; reason: string } {
	if (status === 'DONE') {
		return { onTrack: true, reason: 'Task completed' };
	}

	if (status === 'CANCELLED') {
		return { onTrack: false, reason: 'Task cancelled' };
	}

	if (!dueDate) {
		return { onTrack: true, reason: 'No due date set' };
	}

	const now = new Date();
	const timeTotal = dueDate.getTime() - now.getTime();
	const daysRemaining = Math.ceil(timeTotal / (1000 * 60 * 60 * 24));

	if (daysRemaining < 0) {
		return { onTrack: false, reason: 'Task overdue' };
	}

	// Simple heuristic: if completion % is less than expected based on time elapsed
	// For example, if 50% of time has passed, we expect at least 40% completion
	const expectedProgress = 100 - (daysRemaining / 7) * 10; // Rough estimate
	if (completionPercentage < expectedProgress - 20) {
		return { onTrack: false, reason: 'Progress behind schedule' };
	}

	return { onTrack: true, reason: 'On track' };
}
