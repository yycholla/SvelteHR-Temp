import type { EmployeeGoalFilter, GoalStatistics } from './types';

/**
 * Helper: Build employee goal filter safely
 */
export function buildEmployeeGoalFilter({
	status,
	priority,
	employeeId,
	employeeName,
	departmentId,
	quarter,
	year,
	minProgress,
	maxProgress
}: {
	status?: 'not_started' | 'in_progress' | 'completed' | 'cancelled';
	priority?: 'low' | 'medium' | 'high';
	employeeId?: string;
	employeeName?: string;
	departmentId?: string;
	quarter?: string;
	year?: number;
	minProgress?: number;
	maxProgress?: number;
}): EmployeeGoalFilter {
	const filter: EmployeeGoalFilter = {};

	if (status) {
		filter.status = { equalTo: status };
	}

	if (priority) {
		filter.priority = { equalTo: priority };
	}

	if (employeeId) {
		filter.employeeId = { equalTo: employeeId };
	}

	if (quarter) {
		filter.quarter = { equalTo: quarter };
	}

	if (year) {
		filter.year = { equalTo: year };
	}

	if (employeeName || departmentId) {
		filter.employee = {};
		if (employeeName) {
			filter.employee.displayName = { includesInsensitive: employeeName };
		}
		if (departmentId) {
			filter.employee.departmentId = { equalTo: departmentId };
		}
	}

	if (minProgress !== undefined || maxProgress !== undefined) {
		filter.progress = {};
		if (minProgress !== undefined) {
			filter.progress.greaterThanOrEqualTo = minProgress;
		}
		if (maxProgress !== undefined) {
			filter.progress.lessThanOrEqualTo = maxProgress;
		}
	}

	return filter;
}

/**
 * Helper: Calculate goal statistics from raw data
 */
export function calculateGoalStatistics(data: {
	totalGoals: { totalCount: number };
	activeGoals: { totalCount: number; nodes: Array<{ progress: number }> };
	completedGoals: { totalCount: number };
	overdueGoals: { totalCount: number };
	highPriorityGoals: { totalCount: number };
}): GoalStatistics {
	const totalCount = data.totalGoals.totalCount;
	const completedCount = data.completedGoals.totalCount;
	const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

	// Calculate average progress from active goals
	const activeNodes = data.activeGoals.nodes;
	const averageProgress =
		activeNodes.length > 0
			? Math.round(activeNodes.reduce((sum, goal) => sum + goal.progress, 0) / activeNodes.length)
			: 0;

	return {
		totalGoals: totalCount,
		activeGoals: data.activeGoals.totalCount,
		completedGoals: completedCount,
		overdueGoals: data.overdueGoals.totalCount,
		highPriorityGoals: data.highPriorityGoals.totalCount,
		averageProgress,
		completionRate
	};
}

/**
 * Helper: Validate progress percentage (0-100)
 */
export function validateProgress(progress: number): { valid: boolean; error?: string } {
	if (progress < 0 || progress > 100) {
		return {
			valid: false,
			error: 'Progress must be between 0 and 100'
		};
	}
	return { valid: true };
}

/**
 * Helper: Validate goal input
 */
export function validateGoalInput(input: {
	title: string;
	description: string;
	targetDate: string;
	progress?: number;
}): { valid: boolean; errors: string[] } {
	const errors: string[] = [];

	if (!input.title || input.title.trim().length === 0) {
		errors.push('Title is required');
	}

	if (input.title && input.title.length > 255) {
		errors.push('Title must be less than 255 characters');
	}

	if (!input.description || input.description.trim().length === 0) {
		errors.push('Description is required');
	}

	if (input.description && input.description.length > 2000) {
		errors.push('Description must be less than 2000 characters');
	}

	if (!input.targetDate) {
		errors.push('Target date is required');
	}

	if (input.progress !== undefined) {
		const progressValidation = validateProgress(input.progress);
		if (!progressValidation.valid) {
			errors.push(progressValidation.error!);
		}
	}

	return {
		valid: errors.length === 0,
		errors
	};
}

/**
 * Helper: Auto-determine status based on progress
 */
export function determineGoalStatus(progress: number): 'not_started' | 'in_progress' | 'completed' {
	if (progress === 0) return 'not_started';
	if (progress === 100) return 'completed';
	return 'in_progress';
}

/**
 * Helper: Get priority badge color
 */
export function getPriorityBadgeColor(priority: string): string {
	const priorityColors: Record<string, string> = {
		low: 'gray',
		medium: 'blue',
		high: 'red'
	};
	return priorityColors[priority.toLowerCase()] || 'gray';
}

/**
 * Helper: Get status badge color
 */
export function getGoalStatusBadgeColor(status: string): string {
	const statusColors: Record<string, string> = {
		not_started: 'gray',
		in_progress: 'blue',
		completed: 'green',
		cancelled: 'red'
	};
	return statusColors[status.toLowerCase()] || 'gray';
}

/**
 * Helper: Format quarter display
 */
export function formatQuarter(quarter: string, year?: number): string {
	if (year) {
		return `${quarter} ${year}`;
	}
	return quarter;
}
