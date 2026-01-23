/**
 * Unit Tests: Task Utility Functions
 * Feature: 028-task-system-expansion - T060
 *
 * Tests all task utility functions including filtering, sorting, grouping, and formatting.
 */

import { describe, expect, it } from 'vitest';
import {
	calculateTaskCompletionRate,
	canUserViewTask,
	filterTasksByAssignee,
	filterTasksByDepartment,
	filterTasksByPriority,
	filterTasksByStatus,
	formatTaskDueDate,
	getOverdueTasks,
	getTaskAssigneeDisplay,
	getTaskCreatedRelativeTime,
	getTaskPriorityColor,
	getTaskPriorityIcon,
	getTaskPriorityLabel,
	getTaskStatistics,
	getTaskStatusColor,
	getTaskStatusIcon,
	getTasksDueSoon,
	groupTasksByAssignee,
	groupTasksByPriority,
	groupTasksByStatus,
	isTaskDepartmentAssigned,
	isTaskDueSoon,
	isTaskEmployeeAssigned,
	isTaskOverdue,
	sortTasksByCreatedDate,
	sortTasksByDueDate,
	sortTasksByPriority
} from '$lib/utils/tasks';
import type { Task, TaskPriority, TaskStatus } from '$lib/graphql/types';

// Mock task factory
function createMockTask(overrides: Partial<Task> = {}): Task {
	return {
		id: '1',
		title: 'Test Task',
		description: 'Test description',
		status: 'todo' as TaskStatus,
		priority: 'medium' as TaskPriority,
		assigneeId: 'user-1',
		assignerId: 'manager-1',
		departmentId: 'dept-1',
		assignedToDepartmentId: null,
		dueDate: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		...overrides
	} as Task;
}

describe('canUserViewTask', () => {
	it('should allow admin to view any task', () => {
		const task = createMockTask();
		const result = canUserViewTask(task, 'different-user', 'different-dept', 100);
		expect(result).toBe(true);
	});

	it('should allow HR (level 80+) to view any task', () => {
		const task = createMockTask();
		const result = canUserViewTask(task, 'different-user', 'different-dept', 80);
		expect(result).toBe(true);
	});

	it('should allow manager to view tasks in their department', () => {
		const task = createMockTask({ departmentId: 'dept-1' });
		const result = canUserViewTask(task, 'manager-user', 'dept-1', 60);
		expect(result).toBe(true);
	});

	it('should not allow manager to view tasks in other departments', () => {
		const task = createMockTask({ departmentId: 'dept-2' });
		const result = canUserViewTask(task, 'manager-user', 'dept-1', 60);
		expect(result).toBe(false);
	});

	it('should allow assigned employee to view their task', () => {
		const task = createMockTask({ assigneeId: 'user-1' });
		const result = canUserViewTask(task, 'user-1', null, 20);
		expect(result).toBe(true);
	});

	it('should allow employee to view department-assigned tasks', () => {
		const task = createMockTask({ assigneeId: undefined, assignedToDepartmentId: 'dept-1' });
		const result = canUserViewTask(task, 'user-1', 'dept-1', 20);
		expect(result).toBe(true);
	});

	it('should allow task assigner to view tasks they assigned', () => {
		const task = createMockTask({ assignerId: 'manager-1' });
		const result = canUserViewTask(task, 'manager-1', 'different-dept', 20);
		expect(result).toBe(true);
	});

	it('should deny access if no criteria met', () => {
		const task = createMockTask({
			assigneeId: 'other-user',
			departmentId: 'other-dept',
			assignedToDepartmentId: 'other-dept',
			assignerId: 'other-manager'
		});
		const result = canUserViewTask(task, 'user-1', 'dept-1', 20);
		expect(result).toBe(false);
	});
});

describe('isTaskOverdue', () => {
	it('should return false for task without due date', () => {
		const task = createMockTask({ dueDate: undefined });
		expect(isTaskOverdue(task)).toBe(false);
	});

	it('should return false for completed task', () => {
		const pastDate = new Date(Date.now() - 86400000).toISOString(); // Yesterday
		const task = createMockTask({ dueDate: pastDate, status: 'completed' });
		expect(isTaskOverdue(task)).toBe(false);
	});

	it('should return false for cancelled task', () => {
		const pastDate = new Date(Date.now() - 86400000).toISOString(); // Yesterday
		const task = createMockTask({ dueDate: pastDate, status: 'cancelled' });
		expect(isTaskOverdue(task)).toBe(false);
	});

	it('should return true for overdue task', () => {
		const pastDate = new Date(Date.now() - 86400000).toISOString(); // Yesterday
		const task = createMockTask({ dueDate: pastDate, status: 'in_progress' });
		expect(isTaskOverdue(task)).toBe(true);
	});

	it('should return false for future due date', () => {
		const futureDate = new Date(Date.now() + 86400000).toISOString(); // Tomorrow
		const task = createMockTask({ dueDate: futureDate });
		expect(isTaskOverdue(task)).toBe(false);
	});
});

describe('isTaskDueSoon', () => {
	it('should return false for task without due date', () => {
		const task = createMockTask({ dueDate: undefined });
		expect(isTaskDueSoon(task)).toBe(false);
	});

	it('should return false for completed task', () => {
		const soonDate = new Date(Date.now() + 86400000).toISOString(); // Tomorrow
		const task = createMockTask({ dueDate: soonDate, status: 'completed' });
		expect(isTaskDueSoon(task)).toBe(false);
	});

	it('should return true for task due tomorrow', () => {
		const tomorrow = new Date(Date.now() + 86400000).toISOString();
		const task = createMockTask({ dueDate: tomorrow });
		expect(isTaskDueSoon(task)).toBe(true);
	});

	it('should return true for task due in 2 days', () => {
		const in2Days = new Date(Date.now() + 172800000).toISOString();
		const task = createMockTask({ dueDate: in2Days });
		expect(isTaskDueSoon(task)).toBe(true);
	});

	it('should return false for task due in 4 days (beyond default 3 days)', () => {
		const in4Days = new Date(Date.now() + 345600000).toISOString();
		const task = createMockTask({ dueDate: in4Days });
		expect(isTaskDueSoon(task)).toBe(false);
	});

	it('should respect custom daysAhead parameter', () => {
		const in5Days = new Date(Date.now() + 432000000).toISOString();
		const task = createMockTask({ dueDate: in5Days });
		expect(isTaskDueSoon(task, 7)).toBe(true);
		expect(isTaskDueSoon(task, 3)).toBe(false);
	});

	it('should return false for overdue tasks', () => {
		const yesterday = new Date(Date.now() - 86400000).toISOString();
		const task = createMockTask({ dueDate: yesterday });
		expect(isTaskDueSoon(task)).toBe(false);
	});
});

describe('Task Display Functions', () => {
	describe('getTaskPriorityLabel', () => {
		it('should return correct labels for all priorities', () => {
			expect(getTaskPriorityLabel('low')).toBe('Low');
			expect(getTaskPriorityLabel('medium')).toBe('Medium');
			expect(getTaskPriorityLabel('high')).toBe('High');
			expect(getTaskPriorityLabel('urgent')).toBe('Urgent');
		});
	});

	describe('getTaskPriorityColor', () => {
		it('should return correct color classes for all priorities', () => {
			expect(getTaskPriorityColor('low')).toBe('bg-gray-100 text-gray-800');
			expect(getTaskPriorityColor('medium')).toBe('bg-blue-100 text-blue-800');
			expect(getTaskPriorityColor('high')).toBe('bg-orange-100 text-orange-800');
			expect(getTaskPriorityColor('urgent')).toBe('bg-red-100 text-red-800');
		});
	});

	describe('getTaskStatusColor', () => {
		it('should return correct color classes for all statuses', () => {
			expect(getTaskStatusColor('todo')).toBe('bg-gray-100 text-gray-800');
			expect(getTaskStatusColor('in_progress')).toBe('bg-blue-100 text-blue-800');
			expect(getTaskStatusColor('completed')).toBe('bg-green-100 text-green-800');
			expect(getTaskStatusColor('cancelled')).toBe('bg-red-100 text-red-800');
		});
	});

	describe('getTaskStatusIcon', () => {
		it('should return correct icons for all statuses', () => {
			expect(getTaskStatusIcon('todo')).toBe('○');
			expect(getTaskStatusIcon('in_progress')).toBe('◐');
			expect(getTaskStatusIcon('completed')).toBe('●');
			expect(getTaskStatusIcon('cancelled')).toBe('✗');
		});
	});

	describe('getTaskPriorityIcon', () => {
		it('should return correct icons for all priorities', () => {
			expect(getTaskPriorityIcon('low')).toBe('⬇');
			expect(getTaskPriorityIcon('medium')).toBe('→');
			expect(getTaskPriorityIcon('high')).toBe('⬆');
			expect(getTaskPriorityIcon('urgent')).toBe('‼');
		});
	});
});

describe('Task Assignment Functions', () => {
	describe('getTaskAssigneeDisplay', () => {
		it('should return employee display name when assigned to employee', () => {
			const task = createMockTask({
				assigneeId: 'user-1',
				assignee: { displayName: 'John Doe' } as any
			});
			expect(getTaskAssigneeDisplay(task)).toBe('John Doe');
		});

		it('should return department name when assigned to department', () => {
			const task = createMockTask({
				assigneeId: undefined,
				assignedToDepartmentId: 'dept-1',
				assignedToDepartment: { name: 'Engineering' } as any
			});
			expect(getTaskAssigneeDisplay(task)).toBe('Department: Engineering');
		});

		it('should return Unassigned when no assignee', () => {
			const task = createMockTask({
				assigneeId: undefined,
				assignedToDepartmentId: undefined
			});
			expect(getTaskAssigneeDisplay(task)).toBe('Unassigned');
		});
	});

	describe('isTaskEmployeeAssigned', () => {
		it('should return true when assigned to employee only', () => {
			const task = createMockTask({
				assigneeId: 'user-1',
				assignedToDepartmentId: undefined
			});
			expect(isTaskEmployeeAssigned(task)).toBe(true);
		});

		it('should return false when assigned to department', () => {
			const task = createMockTask({
				assigneeId: undefined,
				assignedToDepartmentId: 'dept-1'
			});
			expect(isTaskEmployeeAssigned(task)).toBe(false);
		});

		it('should return false when assigned to both (prefers department)', () => {
			const task = createMockTask({
				assigneeId: 'user-1',
				assignedToDepartmentId: 'dept-1'
			});
			expect(isTaskEmployeeAssigned(task)).toBe(false);
		});
	});

	describe('isTaskDepartmentAssigned', () => {
		it('should return true when assigned to department only', () => {
			const task = createMockTask({
				assigneeId: undefined,
				assignedToDepartmentId: 'dept-1'
			});
			expect(isTaskDepartmentAssigned(task)).toBe(true);
		});

		it('should return false when assigned to employee', () => {
			const task = createMockTask({
				assigneeId: 'user-1',
				assignedToDepartmentId: undefined
			});
			expect(isTaskDepartmentAssigned(task)).toBe(false);
		});
	});
});

describe('Filter Functions', () => {
	const tasks: Task[] = [
		createMockTask({
			id: '1',
			assigneeId: 'user-1',
			status: 'todo',
			priority: 'high',
			assignedToDepartmentId: undefined
		}),
		createMockTask({
			id: '2',
			assigneeId: 'user-2',
			status: 'in_progress',
			priority: 'medium',
			assignedToDepartmentId: 'dept-1'
		}),
		createMockTask({
			id: '3',
			assigneeId: 'user-1',
			status: 'completed',
			priority: 'low',
			assignedToDepartmentId: undefined
		}),
		createMockTask({
			id: '4',
			assigneeId: 'user-3',
			status: 'todo',
			priority: 'urgent',
			assignedToDepartmentId: 'dept-2'
		})
	];

	describe('filterTasksByDepartment', () => {
		it('should filter tasks by department', () => {
			const result = filterTasksByDepartment(tasks, 'dept-1');
			expect(result).toHaveLength(1);
			expect(result[0].id).toBe('2');
		});

		it('should return tasks with no department when null passed', () => {
			const result = filterTasksByDepartment(tasks, undefined);
			expect(result).toHaveLength(2);
		});
	});

	describe('filterTasksByAssignee', () => {
		it('should filter tasks by assignee', () => {
			const result = filterTasksByAssignee(tasks, 'user-1');
			expect(result).toHaveLength(2);
			expect(result.map((t) => t.id)).toEqual(['1', '3']);
		});
	});

	describe('filterTasksByStatus', () => {
		it('should filter tasks by status', () => {
			const result = filterTasksByStatus(tasks, 'todo');
			expect(result).toHaveLength(2);
		});
	});

	describe('filterTasksByPriority', () => {
		it('should filter tasks by priority', () => {
			const result = filterTasksByPriority(tasks, 'high');
			expect(result).toHaveLength(1);
			expect(result[0].priority).toBe('high');
		});
	});
});

describe('Sorting Functions', () => {
	describe('sortTasksByPriority', () => {
		const tasks: Task[] = [
			createMockTask({ id: '1', priority: 'low' }),
			createMockTask({ id: '2', priority: 'urgent' }),
			createMockTask({ id: '3', priority: 'medium' }),
			createMockTask({ id: '4', priority: 'high' })
		];

		it('should sort by priority descending (urgent first)', () => {
			const sorted = sortTasksByPriority(tasks);
			expect(sorted.map((t) => t.id)).toEqual(['2', '4', '3', '1']);
		});

		it('should sort by priority ascending when specified', () => {
			const sorted = sortTasksByPriority(tasks, true);
			expect(sorted.map((t) => t.id)).toEqual(['1', '3', '4', '2']);
		});

		it('should not mutate original array', () => {
			const original = [...tasks];
			sortTasksByPriority(tasks);
			expect(tasks).toEqual(original);
		});
	});

	describe('sortTasksByDueDate', () => {
		const tasks: Task[] = [
			createMockTask({ id: '1', dueDate: '2024-03-15' }),
			createMockTask({ id: '2', dueDate: '2024-01-10' }),
			createMockTask({ id: '3', dueDate: undefined }),
			createMockTask({ id: '4', dueDate: '2024-02-20' })
		];

		it('should sort by due date ascending (earliest first)', () => {
			const sorted = sortTasksByDueDate(tasks);
			expect(sorted.map((t) => t.id)).toEqual(['2', '4', '1', '3']);
		});

		it('should sort by due date descending', () => {
			const sorted = sortTasksByDueDate(tasks, false);
			expect(sorted.map((t) => t.id)).toEqual(['1', '4', '2', '3']);
		});

		it('should place tasks without due date at end', () => {
			const sorted = sortTasksByDueDate(tasks);
			expect(sorted[sorted.length - 1].id).toBe('3');
		});
	});

	describe('sortTasksByCreatedDate', () => {
		const now = Date.now();
		const tasks: Task[] = [
			createMockTask({ id: '1', createdAt: new Date(now - 86400000).toISOString() }), // 1 day ago
			createMockTask({ id: '2', createdAt: new Date(now - 172800000).toISOString() }), // 2 days ago
			createMockTask({ id: '3', createdAt: new Date(now).toISOString() }) // Now
		];

		it('should sort by created date descending (newest first)', () => {
			const sorted = sortTasksByCreatedDate(tasks);
			expect(sorted.map((t) => t.id)).toEqual(['3', '1', '2']);
		});

		it('should sort by created date ascending when specified', () => {
			const sorted = sortTasksByCreatedDate(tasks, true);
			expect(sorted.map((t) => t.id)).toEqual(['2', '1', '3']);
		});
	});
});

describe('Grouping Functions', () => {
	const tasks: Task[] = [
		createMockTask({
			id: '1',
			status: 'todo',
			priority: 'high',
			assigneeId: 'user-1',
			assignee: { displayName: 'John' } as any
		}),
		createMockTask({
			id: '2',
			status: 'todo',
			priority: 'medium',
			assigneeId: 'user-2',
			assignee: { displayName: 'Jane' } as any
		}),
		createMockTask({
			id: '3',
			status: 'in_progress',
			priority: 'high',
			assigneeId: 'user-1',
			assignee: { displayName: 'John' } as any
		}),
		createMockTask({
			id: '4',
			status: 'completed',
			priority: 'low',
			assigneeId: 'user-2',
			assignee: { displayName: 'Jane' } as any
		})
	];

	describe('groupTasksByStatus', () => {
		it('should group tasks by status', () => {
			const grouped = groupTasksByStatus(tasks);
			expect(grouped.get('todo')).toHaveLength(2);
			expect(grouped.get('in_progress')).toHaveLength(1);
			expect(grouped.get('completed')).toHaveLength(1);
		});
	});

	describe('groupTasksByPriority', () => {
		it('should group tasks by priority', () => {
			const grouped = groupTasksByPriority(tasks);
			expect(grouped.get('high')).toHaveLength(2);
			expect(grouped.get('medium')).toHaveLength(1);
			expect(grouped.get('low')).toHaveLength(1);
		});
	});

	describe('groupTasksByAssignee', () => {
		it('should group tasks by assignee display name', () => {
			const grouped = groupTasksByAssignee(tasks);
			expect(grouped.get('John')).toHaveLength(2);
			expect(grouped.get('Jane')).toHaveLength(2);
		});
	});
});

describe('Statistics Functions', () => {
	describe('calculateTaskCompletionRate', () => {
		it('should return 0 for empty task list', () => {
			expect(calculateTaskCompletionRate([])).toBe(0);
		});

		it('should return 100 when all tasks completed', () => {
			const tasks = [
				createMockTask({ status: 'completed' }),
				createMockTask({ status: 'completed' })
			];
			expect(calculateTaskCompletionRate(tasks)).toBe(100);
		});

		it('should return 50 when half completed', () => {
			const tasks = [createMockTask({ status: 'completed' }), createMockTask({ status: 'todo' })];
			expect(calculateTaskCompletionRate(tasks)).toBe(50);
		});
	});

	describe('getTaskStatistics', () => {
		const tasks: Task[] = [
			createMockTask({
				id: '1',
				status: 'todo',
				dueDate: new Date(Date.now() - 86400000).toISOString()
			}), // Overdue
			createMockTask({
				id: '2',
				status: 'in_progress',
				dueDate: new Date(Date.now() + 86400000).toISOString()
			}), // Due soon
			createMockTask({ id: '3', status: 'completed' }),
			createMockTask({ id: '4', status: 'cancelled' })
		];

		it('should return correct statistics', () => {
			const stats = getTaskStatistics(tasks);
			expect(stats.total).toBe(4);
			expect(stats.todo).toBe(1);
			expect(stats.inProgress).toBe(1);
			expect(stats.completed).toBe(1);
			expect(stats.cancelled).toBe(1);
			expect(stats.overdue).toBe(1);
			expect(stats.dueSoon).toBe(1);
			expect(stats.completionRate).toBe(25); // 1/4 = 25%
		});
	});
});

describe('Formatting Functions', () => {
	describe('formatTaskDueDate', () => {
		it('should return "No due date" for undefined', () => {
			expect(formatTaskDueDate(undefined)).toBe('No due date');
		});

		it('should return "Due today" for today', () => {
			const today = new Date();
			today.setHours(23, 59, 59); // End of today
			expect(formatTaskDueDate(today.toISOString())).toBe('Due today');
		});

		it('should return "Due tomorrow" for tomorrow', () => {
			// Use 25 hours from now to ensure Math.floor(25/24) = 1 day
			// This matches the function's logic of counting 24-hour periods
			const tomorrow = new Date(Date.now() + 25 * 60 * 60 * 1000);
			expect(formatTaskDueDate(tomorrow.toISOString())).toBe('Due tomorrow');
		});

		it('should return "Due in X days" for near future', () => {
			const in3Days = new Date(Date.now() + 302400000); // 3.5 days to ensure floor(3.5) = 3
			expect(formatTaskDueDate(in3Days.toISOString())).toBe('Due in 3 days');
		});

		it('should return "Overdue by X days" for past dates', () => {
			// Use fixed time to avoid flaky timezone issues
			const fixedNow = new Date('2026-01-22T12:00:00Z');
			vi.setSystemTime(fixedNow);

			const threeDaysAgo = new Date('2026-01-19T12:00:00Z');
			expect(formatTaskDueDate(threeDaysAgo.toISOString())).toBe('Overdue by 3 days');
			vi.useRealTimers();
		});

		it('should return formatted date for distant future', () => {
			const in30Days = new Date(Date.now() + 2592000000);
			const result = formatTaskDueDate(in30Days.toISOString());
			expect(result).toMatch(/\w+ \d+, \d{4}/); // e.g., "Jan 15, 2024"
		});
	});

	describe('getTaskCreatedRelativeTime', () => {
		it('should return "Just now" for very recent', () => {
			const now = new Date().toISOString();
			expect(getTaskCreatedRelativeTime(now)).toBe('Just now');
		});

		it('should return "X minutes ago" for minutes', () => {
			const fiveMinutesAgo = new Date(Date.now() - 300000).toISOString();
			expect(getTaskCreatedRelativeTime(fiveMinutesAgo)).toBe('5 minutes ago');
		});

		it('should return "1 minute ago" for singular', () => {
			const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
			expect(getTaskCreatedRelativeTime(oneMinuteAgo)).toBe('1 minute ago');
		});

		it('should return "X hours ago" for hours', () => {
			const twoHoursAgo = new Date(Date.now() - 7200000).toISOString();
			expect(getTaskCreatedRelativeTime(twoHoursAgo)).toBe('2 hours ago');
		});

		it('should return "1 hour ago" for singular', () => {
			const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
			expect(getTaskCreatedRelativeTime(oneHourAgo)).toBe('1 hour ago');
		});

		it('should return "X days ago" for days', () => {
			const threeDaysAgo = new Date(Date.now() - 259200000).toISOString();
			expect(getTaskCreatedRelativeTime(threeDaysAgo)).toBe('3 days ago');
		});

		it('should return "1 day ago" for singular', () => {
			const oneDayAgo = new Date(Date.now() - 86400000).toISOString();
			expect(getTaskCreatedRelativeTime(oneDayAgo)).toBe('1 day ago');
		});
	});
});

describe('Integration Scenarios', () => {
	it('should correctly identify and count overdue tasks', () => {
		const tasks: Task[] = [
			createMockTask({
				id: '1',
				dueDate: new Date(Date.now() - 86400000).toISOString(),
				status: 'todo'
			}),
			createMockTask({
				id: '2',
				dueDate: new Date(Date.now() + 86400000).toISOString(),
				status: 'todo'
			}),
			createMockTask({
				id: '3',
				dueDate: new Date(Date.now() - 172800000).toISOString(),
				status: 'in_progress'
			}),
			createMockTask({
				id: '4',
				dueDate: new Date(Date.now() - 86400000).toISOString(),
				status: 'completed'
			})
		];

		const overdue = getOverdueTasks(tasks);
		expect(overdue).toHaveLength(2); // Tasks 1 and 3
		expect(overdue.map((t) => t.id)).toEqual(['1', '3']);
	});

	it('should correctly filter and sort tasks by priority and due date', () => {
		const tasks: Task[] = [
			createMockTask({ id: '1', priority: 'medium', dueDate: '2024-03-15' }),
			createMockTask({ id: '2', priority: 'urgent', dueDate: '2024-01-10' }),
			createMockTask({ id: '3', priority: 'urgent', dueDate: '2024-02-20' }),
			createMockTask({ id: '4', priority: 'low', dueDate: '2024-01-05' })
		];

		// Filter urgent tasks
		const urgentTasks = filterTasksByPriority(tasks, 'urgent');
		// Sort by due date
		const sorted = sortTasksByDueDate(urgentTasks);

		expect(sorted).toHaveLength(2);
		expect(sorted.map((t) => t.id)).toEqual(['2', '3']); // Earliest first
	});

	it('should provide comprehensive task statistics', () => {
		const yesterday = new Date(Date.now() - 86400000).toISOString();
		const tomorrow = new Date(Date.now() + 86400000).toISOString();

		const tasks: Task[] = [
			createMockTask({ status: 'todo', dueDate: yesterday }),
			createMockTask({ status: 'todo', dueDate: tomorrow }),
			createMockTask({ status: 'in_progress', dueDate: tomorrow }),
			createMockTask({ status: 'completed' }),
			createMockTask({ status: 'cancelled' })
		];

		const stats = getTaskStatistics(tasks);

		expect(stats.total).toBe(5);
		expect(stats.todo).toBe(2);
		expect(stats.inProgress).toBe(1);
		expect(stats.completed).toBe(1);
		expect(stats.cancelled).toBe(1);
		expect(stats.overdue).toBe(1);
		expect(stats.dueSoon).toBe(2);
		expect(stats.completionRate).toBe(20); // 1/5 = 20%
	});
});
