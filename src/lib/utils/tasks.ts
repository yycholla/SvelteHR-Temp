// Task Utility Functions
// Feature: 019-we-need-to - Task T018
// Purpose: Business logic helpers for task operations

import type { Task, TaskStatus, TaskPriority } from '$lib/graphql/types';

/**
 * Check if a user can view a task based on assignment rules
 * @param task - The task to check
 * @param userId - Current user's employee ID
 * @param userDepartmentId - Current user's department ID
 * @param userRoleLevel - User's RBAC role level (Admin=100, HR=80, Manager=60, Employee=20)
 * @returns true if user can view the task
 */
export function canUserViewTask(
	task: Task,
	userId: string,
	userDepartmentId: string | null,
	userRoleLevel: number
): boolean {
	// Admins and HR can see all tasks
	if (userRoleLevel >= 80) {
		return true;
	}

	// Managers can see tasks in their department
	if (userRoleLevel >= 60 && task.departmentId === userDepartmentId) {
		return true;
	}

	// Employee assigned to the task can see it
	if (task.assigneeId === userId) {
		return true;
	}

	// Employee in department can see department-assigned tasks
	if (task.assignedToDepartmentId === userDepartmentId) {
		return true;
	}

	// Task assigner can see their assigned tasks
	if (task.assignerId === userId) {
		return true;
	}

	return false;
}

/**
 * Check if a task is overdue
 */
export function isTaskOverdue(task: Task): boolean {
	if (!task.dueDate) return false;
	if (task.status === 'completed' || task.status === 'cancelled') return false;

	const now = new Date();
	const dueDate = new Date(task.dueDate);
	return dueDate < now;
}

/**
 * Check if a task is due soon (within next 3 days)
 */
export function isTaskDueSoon(task: Task, daysAhead = 3): boolean {
	if (!task.dueDate) return false;
	if (task.status === 'completed' || task.status === 'cancelled') return false;

	const now = new Date();
	const dueDate = new Date(task.dueDate);
	const futureCutoff = new Date();
	futureCutoff.setDate(now.getDate() + daysAhead);

	return dueDate >= now && dueDate <= futureCutoff;
}

/**
 * Get human-readable label for task priority
 */
export function getTaskPriorityLabel(priority: TaskPriority): string {
	const labels: Record<TaskPriority, string> = {
		low: 'Low',
		medium: 'Medium',
		high: 'High',
		urgent: 'Urgent'
	};
	return labels[priority] || priority;
}

/**
 * Get Tailwind CSS color class for task priority badge
 */
export function getTaskPriorityColor(priority: TaskPriority): string {
	const colorMap: Record<TaskPriority, string> = {
		low: 'bg-gray-100 text-gray-800',
		medium: 'bg-blue-100 text-blue-800',
		high: 'bg-orange-100 text-orange-800',
		urgent: 'bg-red-100 text-red-800'
	};
	return colorMap[priority] || 'bg-gray-100 text-gray-800';
}

/**
 * Get Tailwind CSS color class for task status badge
 */
export function getTaskStatusColor(status: TaskStatus): string {
	const colorMap: Record<TaskStatus, string> = {
		todo: 'bg-gray-100 text-gray-800',
		in_progress: 'bg-blue-100 text-blue-800',
		completed: 'bg-green-100 text-green-800',
		cancelled: 'bg-red-100 text-red-800'
	};
	return colorMap[status] || 'bg-gray-100 text-gray-800';
}

/**
 * Get icon for task status
 */
export function getTaskStatusIcon(status: TaskStatus): string {
	const iconMap: Record<TaskStatus, string> = {
		todo: '○',
		in_progress: '◐',
		completed: '●',
		cancelled: '✗'
	};
	return iconMap[status] || '○';
}

/**
 * Get icon for task priority
 */
export function getTaskPriorityIcon(priority: TaskPriority): string {
	const iconMap: Record<TaskPriority, string> = {
		low: '⬇',
		medium: '→',
		high: '⬆',
		urgent: '‼'
	};
	return iconMap[priority] || '→';
}

/**
 * Get display name for task assignee (employee name or department name)
 */
export function getTaskAssigneeDisplay(task: Task): string {
	if (task.assigneeId && task.assignee) {
		return task.assignee.displayName;
	} else if (task.assignedToDepartmentId && task.assignedToDepartment) {
		return `Department: ${task.assignedToDepartment.name}`;
	} else {
		return 'Unassigned';
	}
}

/**
 * Check if task is assigned to an employee (vs department)
 */
export function isTaskEmployeeAssigned(task: Task): boolean {
	return !!task.assigneeId && !task.assignedToDepartmentId;
}

/**
 * Check if task is assigned to a department
 */
export function isTaskDepartmentAssigned(task: Task): boolean {
	return !!task.assignedToDepartmentId && !task.assigneeId;
}

/**
 * Filter tasks by department
 */
export function filterTasksByDepartment(
	tasks: Task[],
	departmentId: string | undefined
): Task[] {
	if (!departmentId) {
		// Return tasks with no department assignment
		return tasks.filter((task) => !task.assignedToDepartmentId);
	}

	return tasks.filter((task) => task.assignedToDepartmentId === departmentId);
}

/**
 * Filter tasks by assignee
 */
export function filterTasksByAssignee(tasks: Task[], assigneeId: string): Task[] {
	return tasks.filter((task) => task.assigneeId === assigneeId);
}

/**
 * Filter tasks by status
 */
export function filterTasksByStatus(tasks: Task[], status: TaskStatus): Task[] {
	return tasks.filter((task) => task.status === status);
}

/**
 * Filter tasks by priority
 */
export function filterTasksByPriority(tasks: Task[], priority: TaskPriority): Task[] {
	return tasks.filter((task) => task.priority === priority);
}

/**
 * Get overdue tasks from a list
 */
export function getOverdueTasks(tasks: Task[]): Task[] {
	return tasks.filter((task) => isTaskOverdue(task));
}

/**
 * Get tasks due soon from a list
 */
export function getTasksDueSoon(tasks: Task[], daysAhead = 3): Task[] {
	return tasks.filter((task) => isTaskDueSoon(task, daysAhead));
}

/**
 * Sort tasks by priority (urgent first)
 */
export function sortTasksByPriority(tasks: Task[], ascending = false): Task[] {
	const priorityOrder: Record<TaskPriority, number> = {
		urgent: 4,
		high: 3,
		medium: 2,
		low: 1
	};

	return [...tasks].sort((a, b) => {
		const orderA = priorityOrder[a.priority];
		const orderB = priorityOrder[b.priority];
		return ascending ? orderA - orderB : orderB - orderA;
	});
}

/**
 * Sort tasks by due date (earliest first)
 */
export function sortTasksByDueDate(tasks: Task[], ascending = true): Task[] {
	return [...tasks].sort((a, b) => {
		if (!a.dueDate && !b.dueDate) return 0;
		if (!a.dueDate) return 1;
		if (!b.dueDate) return -1;

		const dateA = new Date(a.dueDate).getTime();
		const dateB = new Date(b.dueDate).getTime();
		return ascending ? dateA - dateB : dateB - dateA;
	});
}

/**
 * Sort tasks by creation date
 */
export function sortTasksByCreatedDate(tasks: Task[], ascending = false): Task[] {
	return [...tasks].sort((a, b) => {
		const dateA = new Date(a.createdAt).getTime();
		const dateB = new Date(b.createdAt).getTime();
		return ascending ? dateA - dateB : dateB - dateA;
	});
}

/**
 * Group tasks by status
 */
export function groupTasksByStatus(tasks: Task[]): Map<TaskStatus, Task[]> {
	const grouped = new Map<TaskStatus, Task[]>();

	tasks.forEach((task) => {
		if (!grouped.has(task.status)) {
			grouped.set(task.status, []);
		}
		grouped.get(task.status)!.push(task);
	});

	return grouped;
}

/**
 * Group tasks by priority
 */
export function groupTasksByPriority(tasks: Task[]): Map<TaskPriority, Task[]> {
	const grouped = new Map<TaskPriority, Task[]>();

	tasks.forEach((task) => {
		if (!grouped.has(task.priority)) {
			grouped.set(task.priority, []);
		}
		grouped.get(task.priority)!.push(task);
	});

	return grouped;
}

/**
 * Group tasks by assignee
 */
export function groupTasksByAssignee(tasks: Task[]): Map<string, Task[]> {
	const grouped = new Map<string, Task[]>();

	tasks.forEach((task) => {
		const assigneeKey = getTaskAssigneeDisplay(task);

		if (!grouped.has(assigneeKey)) {
			grouped.set(assigneeKey, []);
		}
		grouped.get(assigneeKey)!.push(task);
	});

	return grouped;
}

/**
 * Calculate task completion percentage for a list of tasks
 */
export function calculateTaskCompletionRate(tasks: Task[]): number {
	if (tasks.length === 0) return 0;

	const completedCount = tasks.filter((task) => task.status === 'completed').length;
	return Math.round((completedCount / tasks.length) * 100);
}

/**
 * Get task statistics for a list of tasks
 */
export function getTaskStatistics(tasks: Task[]): {
	total: number;
	todo: number;
	inProgress: number;
	completed: number;
	cancelled: number;
	overdue: number;
	dueSoon: number;
	completionRate: number;
} {
	return {
		total: tasks.length,
		todo: tasks.filter((t) => t.status === 'todo').length,
		inProgress: tasks.filter((t) => t.status === 'in_progress').length,
		completed: tasks.filter((t) => t.status === 'completed').length,
		cancelled: tasks.filter((t) => t.status === 'cancelled').length,
		overdue: getOverdueTasks(tasks).length,
		dueSoon: getTasksDueSoon(tasks).length,
		completionRate: calculateTaskCompletionRate(tasks)
	};
}

/**
 * Format task due date for display
 */
export function formatTaskDueDate(dueDate: string | undefined): string {
	if (!dueDate) return 'No due date';

	const due = new Date(dueDate);
	const now = new Date();
	const diffMs = due.getTime() - now.getTime();
	const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

	if (diffDays < 0) {
		return `Overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''}`;
	}

	if (diffDays === 0) {
		return 'Due today';
	}

	if (diffDays === 1) {
		return 'Due tomorrow';
	}

	if (diffDays <= 7) {
		return `Due in ${diffDays} days`;
	}

	return due.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Get relative time description for task creation
 */
export function getTaskCreatedRelativeTime(createdAt: string): string {
	const created = new Date(createdAt);
	const now = new Date();
	const diffMs = now.getTime() - created.getTime();

	const minutes = Math.floor(diffMs / (1000 * 60));
	const hours = Math.floor(minutes / 60);
	const days = Math.floor(hours / 24);

	if (days > 0) {
		return days === 1 ? '1 day ago' : `${days} days ago`;
	}

	if (hours > 0) {
		return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
	}

	if (minutes > 0) {
		return minutes === 1 ? '1 minute ago' : `${minutes} minutes ago`;
	}

	return 'Just now';
}
