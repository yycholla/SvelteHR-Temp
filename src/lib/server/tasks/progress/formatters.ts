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

	// Heuristic: Use a more reasonable expectation based on days remaining
	// With 30+ days: expect at least 10% progress
	// With 14-29 days: expect at least 30% progress
	// With 7-13 days: expect at least 50% progress
	// With 3-6 days: expect at least 70% progress
	// With 1-2 days: expect at least 85% progress
	let expectedProgress = 0;
	if (daysRemaining >= 30) {
		expectedProgress = 10;
	} else if (daysRemaining >= 14) {
		expectedProgress = 30;
	} else if (daysRemaining >= 7) {
		expectedProgress = 50;
	} else if (daysRemaining >= 3) {
		expectedProgress = 70;
	} else {
		expectedProgress = 85;
	}

	// Allow 20% tolerance below expected progress
	if (completionPercentage < expectedProgress - 20) {
		return { onTrack: false, reason: 'Progress behind schedule' };
	}

	return { onTrack: true, reason: 'On track' };
}
