/**
 * Unit Tests: Activity Log (Audit Trail) Display Logic
 * Feature: 028-task-system-expansion - T061
 *
 * Tests all activity log formatting, grouping, and display utility functions.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
	groupActivitiesByDate,
	groupActivitiesByResourceType,
	groupActivitiesByAction,
	getActivityIcon,
	getActivityActionColor,
	getResourceTypeColor,
	formatActivityMessage,
	formatResourceTypeName,
	filterActivitiesByResourceType,
	filterActivitiesByAction,
	filterActivitiesByDateRange,
	filterActivitiesByEmployee,
	getRelativeTime,
	sortActivitiesByTimestamp,
	getRecentActivities,
	getTodayActivities,
	getWeekActivities,
	getActivityStatistics,
	formatActivityDetails,
	isCriticalActivity,
	getMostActiveUsers,
	getMostCommonActions,
	getMostCommonResourceTypes
} from '$lib/utils/activities';
import type { ActivityLog, ActivityAction, ResourceType } from '$lib/graphql/types';

// Mock activity factory
function createMockActivity(overrides: Partial<ActivityLog> = {}): ActivityLog {
	return {
		id: '1',
		action: 'create' as ActivityAction,
		resourceType: 'task' as ResourceType,
		resourceId: 'task-1',
		employeeId: 'user-1',
		employee: { displayName: 'John Doe' } as any,
		createdAt: new Date().toISOString(),
		beforeSnapshot: null,
		afterSnapshot: null,
		details: null,
		...overrides
	} as ActivityLog;
}

describe('Grouping Functions', () => {
	describe('groupActivitiesByDate', () => {
		it('should group activities by date', () => {
			const today = new Date();
			const yesterday = new Date(today);
			yesterday.setDate(yesterday.getDate() - 1);

			const activities = [
				createMockActivity({ id: '1', createdAt: today.toISOString() }),
				createMockActivity({ id: '2', createdAt: today.toISOString() }),
				createMockActivity({ id: '3', createdAt: yesterday.toISOString() })
			];

			const grouped = groupActivitiesByDate(activities);
			expect(grouped.size).toBe(2);

			const todayActivities = Array.from(grouped.values())[0];
			expect(todayActivities.length).toBeGreaterThanOrEqual(2);
		});

		it('should format dates correctly', () => {
			const activities = [createMockActivity({ createdAt: new Date('2024-01-15').toISOString() })];
			const grouped = groupActivitiesByDate(activities);
			const dateKey = Array.from(grouped.keys())[0];

			expect(dateKey).toMatch(/January 15, 2024/);
		});

		it('should handle empty array', () => {
			const grouped = groupActivitiesByDate([]);
			expect(grouped.size).toBe(0);
		});
	});

	describe('groupActivitiesByResourceType', () => {
		it('should group activities by resource type', () => {
			const activities = [
				createMockActivity({ resourceType: 'task' }),
				createMockActivity({ resourceType: 'task' }),
				createMockActivity({ resourceType: 'event' })
			];

			const grouped = groupActivitiesByResourceType(activities);
			expect(grouped.get('task')).toHaveLength(2);
			expect(grouped.get('event')).toHaveLength(1);
		});
	});

	describe('groupActivitiesByAction', () => {
		it('should group activities by action', () => {
			const activities = [
				createMockActivity({ action: 'create' }),
				createMockActivity({ action: 'update' }),
				createMockActivity({ action: 'create' })
			];

			const grouped = groupActivitiesByAction(activities);
			expect(grouped.get('create')).toHaveLength(2);
			expect(grouped.get('update')).toHaveLength(1);
		});
	});
});

describe('Icon and Color Functions', () => {
	describe('getActivityIcon', () => {
		it('should return action-based icons', () => {
			expect(getActivityIcon('task', 'create')).toBe('➕');
			expect(getActivityIcon('task', 'update')).toBe('✏️');
			expect(getActivityIcon('task', 'delete')).toBe('🗑️');
			expect(getActivityIcon('task', 'view')).toBe('👁️');
			expect(getActivityIcon('system', 'login')).toBe('🔓');
			expect(getActivityIcon('system', 'logout')).toBe('🔒');
		});

		it('should return resource-based icons as fallback', () => {
			expect(getActivityIcon('event', 'view')).toBe('👁️'); // Action takes precedence
			expect(getActivityIcon('task', 'some_action' as any)).toBe('✅'); // Resource fallback
			expect(getActivityIcon('document', 'some_action' as any)).toBe('📄');
			expect(getActivityIcon('employee', 'some_action' as any)).toBe('👥');
		});

		it('should handle plural resource types', () => {
			expect(getActivityIcon('tasks' as any, 'some_action' as any)).toBe('✅');
			expect(getActivityIcon('events' as any, 'some_action' as any)).toBe('📅');
		});

		it('should return default icon for unknown resources', () => {
			expect(getActivityIcon('unknown' as any, 'unknown' as any)).toBe('📝');
		});
	});

	describe('getActivityActionColor', () => {
		it('should return correct colors for all actions', () => {
			expect(getActivityActionColor('create')).toBe('bg-green-100 text-green-800');
			expect(getActivityActionColor('update')).toBe('bg-blue-100 text-blue-800');
			expect(getActivityActionColor('delete')).toBe('bg-red-100 text-red-800');
			expect(getActivityActionColor('view')).toBe('bg-gray-100 text-gray-800');
			expect(getActivityActionColor('login')).toBe('bg-purple-100 text-purple-800');
			expect(getActivityActionColor('logout')).toBe('bg-orange-100 text-orange-800');
		});

		it('should return default color for unknown action', () => {
			expect(getActivityActionColor('unknown' as any)).toBe('bg-gray-100 text-gray-800');
		});
	});

	describe('getResourceTypeColor', () => {
		it('should return correct colors for resource types', () => {
			expect(getResourceTypeColor('task')).toBe('bg-green-100 text-green-800');
			expect(getResourceTypeColor('event')).toBe('bg-blue-100 text-blue-800');
			expect(getResourceTypeColor('employee')).toBe('bg-indigo-100 text-indigo-800');
		});

		it('should handle plural forms', () => {
			expect(getResourceTypeColor('tasks' as any)).toBe('bg-green-100 text-green-800');
		});

		it('should return default color for unknown type', () => {
			expect(getResourceTypeColor('unknown' as any)).toBe('bg-gray-100 text-gray-800');
		});
	});
});

describe('Message Formatting Functions', () => {
	describe('formatActivityMessage', () => {
		it('should format create action', () => {
			const activity = createMockActivity({
				action: 'create',
				resourceType: 'task',
				afterSnapshot: { title: 'New Task' }
			});
			expect(formatActivityMessage(activity)).toBe('created task "New Task"');
		});

		it('should format update action', () => {
			const activity = createMockActivity({
				action: 'update',
				resourceType: 'task',
				afterSnapshot: { title: 'Updated Task' }
			});
			expect(formatActivityMessage(activity)).toBe('updated task "Updated Task"');
		});

		it('should format delete action using beforeSnapshot', () => {
			const activity = createMockActivity({
				action: 'delete',
				resourceType: 'task',
				beforeSnapshot: { title: 'Deleted Task' },
				afterSnapshot: null
			});
			expect(formatActivityMessage(activity)).toBe('deleted task "Deleted Task"');
		});

		it('should handle missing item name', () => {
			const activity = createMockActivity({
				action: 'create',
				resourceType: 'task'
			});
			expect(formatActivityMessage(activity)).toBe('created task');
		});

		it('should handle login action', () => {
			const activity = createMockActivity({
				action: 'login',
				resourceType: 'system'
			});
			expect(formatActivityMessage(activity)).toBe('logged in to the system');
		});

		it('should try multiple name fields', () => {
			const activity1 = createMockActivity({
				action: 'create',
				resourceType: 'employee',
				afterSnapshot: { displayName: 'Jane Smith' }
			});
			expect(formatActivityMessage(activity1)).toContain('Jane Smith');

			const activity2 = createMockActivity({
				action: 'create',
				resourceType: 'document',
				afterSnapshot: { name: 'Report.pdf' }
			});
			expect(formatActivityMessage(activity2)).toContain('Report.pdf');
		});

		it('should fallback to details if snapshot missing', () => {
			const activity = createMockActivity({
				action: 'update',
				resourceType: 'task',
				afterSnapshot: null,
				details: { title: 'Task from details' }
			});
			expect(formatActivityMessage(activity)).toContain('Task from details');
		});
	});

	describe('formatResourceTypeName', () => {
		it('should format resource names correctly', () => {
			expect(formatResourceTypeName('task')).toBe('task');
			expect(formatResourceTypeName('leave_request')).toBe('leave request');
			expect(formatResourceTypeName('performance_review')).toBe('performance review');
		});

		it('should handle plural forms', () => {
			expect(formatResourceTypeName('tasks' as any)).toBe('task');
			expect(formatResourceTypeName('events' as any)).toBe('event');
		});

		it('should return original for unknown type', () => {
			expect(formatResourceTypeName('unknown' as any)).toBe('unknown');
		});
	});

	describe('formatActivityDetails', () => {
		it('should format details object', () => {
			const details = {
				title: 'Test Task',
				status: 'In Progress',
				priority: 'High'
			};
			const formatted = formatActivityDetails(details);
			expect(formatted).toContain('Title: Test Task');
			expect(formatted).toContain('Status: In Progress');
			expect(formatted).toContain('Priority: High');
		});

		it('should return empty string for empty details', () => {
			expect(formatActivityDetails({})).toBe('');
			expect(formatActivityDetails(undefined)).toBe('');
		});

		it('should only include available fields', () => {
			const details = { title: 'Test' };
			const formatted = formatActivityDetails(details);
			expect(formatted).toBe('Title: Test');
		});
	});
});

describe('Filtering Functions', () => {
	const activities = [
		createMockActivity({ id: '1', resourceType: 'task', action: 'create', employeeId: 'user-1' }),
		createMockActivity({ id: '2', resourceType: 'event', action: 'update', employeeId: 'user-2' }),
		createMockActivity({ id: '3', resourceType: 'task', action: 'delete', employeeId: 'user-1' })
	];

	describe('filterActivitiesByResourceType', () => {
		it('should filter by resource type', () => {
			const taskActivities = filterActivitiesByResourceType(activities, 'task');
			expect(taskActivities).toHaveLength(2);
			expect(taskActivities.every((a) => a.resourceType === 'task')).toBe(true);
		});
	});

	describe('filterActivitiesByAction', () => {
		it('should filter by action', () => {
			const creates = filterActivitiesByAction(activities, 'create');
			expect(creates).toHaveLength(1);
			expect(creates[0].action).toBe('create');
		});
	});

	describe('filterActivitiesByDateRange', () => {
		it('should filter by date range', () => {
			const today = new Date();
			const yesterday = new Date(today);
			yesterday.setDate(yesterday.getDate() - 1);
			const tomorrow = new Date(today);
			tomorrow.setDate(tomorrow.getDate() + 1);

			const testActivities = [
				createMockActivity({ id: '1', createdAt: yesterday.toISOString() }),
				createMockActivity({ id: '2', createdAt: today.toISOString() }),
				createMockActivity({ id: '3', createdAt: tomorrow.toISOString() })
			];

			const filtered = filterActivitiesByDateRange(testActivities, yesterday, today);
			expect(filtered.length).toBeGreaterThanOrEqual(1);
		});
	});

	describe('filterActivitiesByEmployee', () => {
		it('should filter by employee ID', () => {
			const user1Activities = filterActivitiesByEmployee(activities, 'user-1');
			expect(user1Activities).toHaveLength(2);
			expect(user1Activities.every((a) => a.employeeId === 'user-1')).toBe(true);
		});
	});
});

describe('Time and Date Functions', () => {
	describe('getRelativeTime', () => {
		it('should return "Just now" for very recent', () => {
			const now = new Date().toISOString();
			expect(getRelativeTime(now)).toBe('Just now');
		});

		it('should return minutes ago', () => {
			const fiveMinutesAgo = new Date(Date.now() - 300000).toISOString();
			expect(getRelativeTime(fiveMinutesAgo)).toBe('5 minutes ago');
		});

		it('should return hours ago', () => {
			const twoHoursAgo = new Date(Date.now() - 7200000).toISOString();
			expect(getRelativeTime(twoHoursAgo)).toBe('2 hours ago');
		});

		it('should return days ago', () => {
			const threeDaysAgo = new Date(Date.now() - 259200000).toISOString();
			expect(getRelativeTime(threeDaysAgo)).toBe('3 days ago');
		});

		it('should return weeks ago', () => {
			const twoWeeksAgo = new Date(Date.now() - 1209600000).toISOString();
			expect(getRelativeTime(twoWeeksAgo)).toBe('2 weeks ago');
		});

		it('should return months ago', () => {
			const twoMonthsAgo = new Date(Date.now() - 5184000000).toISOString();
			expect(getRelativeTime(twoMonthsAgo)).toBe('2 months ago');
		});

		it('should use singular form for 1 unit', () => {
			const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
			expect(getRelativeTime(oneMinuteAgo)).toBe('1 minute ago');

			const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
			expect(getRelativeTime(oneHourAgo)).toBe('1 hour ago');

			const oneDayAgo = new Date(Date.now() - 86400000).toISOString();
			expect(getRelativeTime(oneDayAgo)).toBe('1 day ago');
		});
	});

	describe('sortActivitiesByTimestamp', () => {
		it('should sort descending by default (most recent first)', () => {
			const activities = [
				createMockActivity({ id: '1', createdAt: new Date('2024-01-01').toISOString() }),
				createMockActivity({ id: '2', createdAt: new Date('2024-03-01').toISOString() }),
				createMockActivity({ id: '3', createdAt: new Date('2024-02-01').toISOString() })
			];

			const sorted = sortActivitiesByTimestamp(activities);
			expect(sorted.map((a) => a.id)).toEqual(['2', '3', '1']);
		});

		it('should sort ascending when specified', () => {
			const activities = [
				createMockActivity({ id: '1', createdAt: new Date('2024-03-01').toISOString() }),
				createMockActivity({ id: '2', createdAt: new Date('2024-01-01').toISOString() }),
				createMockActivity({ id: '3', createdAt: new Date('2024-02-01').toISOString() })
			];

			const sorted = sortActivitiesByTimestamp(activities, true);
			expect(sorted.map((a) => a.id)).toEqual(['2', '3', '1']);
		});

		it('should not mutate original array', () => {
			const activities = [
				createMockActivity({ id: '1', createdAt: new Date('2024-01-01').toISOString() }),
				createMockActivity({ id: '2', createdAt: new Date('2024-02-01').toISOString() })
			];
			const original = [...activities];

			sortActivitiesByTimestamp(activities);
			expect(activities).toEqual(original);
		});
	});

	describe('getRecentActivities', () => {
		it('should return activities from last 7 days by default', () => {
			const now = new Date();
			const sixDaysAgo = new Date(now);
			sixDaysAgo.setDate(sixDaysAgo.getDate() - 6);
			const eightDaysAgo = new Date(now);
			eightDaysAgo.setDate(eightDaysAgo.getDate() - 8);

			const activities = [
				createMockActivity({ id: '1', createdAt: sixDaysAgo.toISOString() }),
				createMockActivity({ id: '2', createdAt: eightDaysAgo.toISOString() })
			];

			const recent = getRecentActivities(activities);
			expect(recent).toHaveLength(1);
			expect(recent[0].id).toBe('1');
		});

		it('should respect custom days back parameter', () => {
			const now = new Date();
			const twoDaysAgo = new Date(now);
			twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
			const fourDaysAgo = new Date(now);
			fourDaysAgo.setDate(fourDaysAgo.getDate() - 4);

			const activities = [
				createMockActivity({ id: '1', createdAt: twoDaysAgo.toISOString() }),
				createMockActivity({ id: '2', createdAt: fourDaysAgo.toISOString() })
			];

			const recent = getRecentActivities(activities, 3);
			expect(recent).toHaveLength(1);
			expect(recent[0].id).toBe('1');
		});
	});

	describe('getTodayActivities', () => {
		it('should return only today\'s activities', () => {
			const now = new Date();
			const yesterday = new Date(now);
			yesterday.setDate(yesterday.getDate() - 1);

			const activities = [
				createMockActivity({ id: '1', createdAt: now.toISOString() }),
				createMockActivity({ id: '2', createdAt: yesterday.toISOString() })
			];

			const today = getTodayActivities(activities);
			expect(today).toHaveLength(1);
			expect(today[0].id).toBe('1');
		});
	});

	describe('getWeekActivities', () => {
		it('should return activities for current week', () => {
			const now = new Date();
			const lastWeek = new Date(now);
			lastWeek.setDate(lastWeek.getDate() - 8);

			const activities = [
				createMockActivity({ id: '1', createdAt: now.toISOString() }),
				createMockActivity({ id: '2', createdAt: lastWeek.toISOString() })
			];

			const thisWeek = getWeekActivities(activities);
			expect(thisWeek.length).toBeGreaterThanOrEqual(1);
		});
	});
});

describe('Statistics and Analysis Functions', () => {
	describe('getActivityStatistics', () => {
		const activities = [
			createMockActivity({ action: 'create', resourceType: 'task' }),
			createMockActivity({ action: 'create', resourceType: 'event' }),
			createMockActivity({ action: 'update', resourceType: 'task' }),
			createMockActivity({ action: 'delete', resourceType: 'document' }),
			createMockActivity({ action: 'view', resourceType: 'task' })
		];

		it('should calculate total activities', () => {
			const stats = getActivityStatistics(activities);
			expect(stats.total).toBe(5);
		});

		it('should count by action type', () => {
			const stats = getActivityStatistics(activities);
			expect(stats.creates).toBe(2);
			expect(stats.updates).toBe(1);
			expect(stats.deletes).toBe(1);
			expect(stats.views).toBe(1);
		});

		it('should count by resource type', () => {
			const stats = getActivityStatistics(activities);
			expect(stats.byResourceType['task']).toBe(3);
			expect(stats.byResourceType['event']).toBe(1);
			expect(stats.byResourceType['document']).toBe(1);
		});

		it('should count by action in byAction map', () => {
			const stats = getActivityStatistics(activities);
			expect(stats.byAction['create']).toBe(2);
			expect(stats.byAction['update']).toBe(1);
		});
	});

	describe('isCriticalActivity', () => {
		it('should identify critical activities', () => {
			expect(isCriticalActivity(createMockActivity({ action: 'create' }))).toBe(true);
			expect(isCriticalActivity(createMockActivity({ action: 'update' }))).toBe(true);
			expect(isCriticalActivity(createMockActivity({ action: 'delete' }))).toBe(true);
		});

		it('should identify non-critical activities', () => {
			expect(isCriticalActivity(createMockActivity({ action: 'view' }))).toBe(false);
			expect(isCriticalActivity(createMockActivity({ action: 'login' }))).toBe(false);
		});
	});

	describe('getMostActiveUsers', () => {
		const activities = [
			createMockActivity({ employeeId: 'user-1', employee: { displayName: 'Alice' } as any }),
			createMockActivity({ employeeId: 'user-1', employee: { displayName: 'Alice' } as any }),
			createMockActivity({ employeeId: 'user-2', employee: { displayName: 'Bob' } as any }),
			createMockActivity({ employeeId: 'user-3', employee: { displayName: 'Charlie' } as any }),
			createMockActivity({ employeeId: 'user-2', employee: { displayName: 'Bob' } as any }),
			createMockActivity({ employeeId: 'user-2', employee: { displayName: 'Bob' } as any })
		];

		it('should return most active users sorted by count', () => {
			const mostActive = getMostActiveUsers(activities, 3);
			expect(mostActive).toHaveLength(3);
			expect(mostActive[0].employeeName).toBe('Bob');
			expect(mostActive[0].activityCount).toBe(3);
			expect(mostActive[1].employeeName).toBe('Alice');
			expect(mostActive[1].activityCount).toBe(2);
		});

		it('should respect limit parameter', () => {
			const mostActive = getMostActiveUsers(activities, 2);
			expect(mostActive).toHaveLength(2);
		});
	});

	describe('getMostCommonActions', () => {
		const activities = [
			createMockActivity({ action: 'create' }),
			createMockActivity({ action: 'create' }),
			createMockActivity({ action: 'update' }),
			createMockActivity({ action: 'view' }),
			createMockActivity({ action: 'view' }),
			createMockActivity({ action: 'view' })
		];

		it('should return most common actions', () => {
			const commonActions = getMostCommonActions(activities, 2);
			expect(commonActions).toHaveLength(2);
			expect(commonActions[0].action).toBe('view');
			expect(commonActions[0].count).toBe(3);
		});
	});

	describe('getMostCommonResourceTypes', () => {
		const activities = [
			createMockActivity({ resourceType: 'task' }),
			createMockActivity({ resourceType: 'task' }),
			createMockActivity({ resourceType: 'task' }),
			createMockActivity({ resourceType: 'event' }),
			createMockActivity({ resourceType: 'event' }),
			createMockActivity({ resourceType: 'document' })
		];

		it('should return most common resource types', () => {
			const commonTypes = getMostCommonResourceTypes(activities, 2);
			expect(commonTypes).toHaveLength(2);
			expect(commonTypes[0].resourceType).toBe('task');
			expect(commonTypes[0].count).toBe(3);
			expect(commonTypes[1].resourceType).toBe('event');
			expect(commonTypes[1].count).toBe(2);
		});
	});
});

describe('Integration Scenarios', () => {
	it('should process activity feed with formatting and filtering', () => {
		const activities = [
			createMockActivity({
				id: '1',
				action: 'create',
				resourceType: 'task',
				employeeId: 'user-1',
				afterSnapshot: { title: 'New Task' },
				createdAt: new Date().toISOString()
			}),
			createMockActivity({
				id: '2',
				action: 'update',
				resourceType: 'event',
				employeeId: 'user-2',
				afterSnapshot: { title: 'Team Meeting' },
				createdAt: new Date(Date.now() - 3600000).toISOString()
			}),
			createMockActivity({
				id: '3',
				action: 'delete',
				resourceType: 'task',
				employeeId: 'user-1',
				beforeSnapshot: { title: 'Deleted Task' },
				createdAt: new Date(Date.now() - 86400000).toISOString()
			})
		];

		// Filter task activities
		const taskActivities = filterActivitiesByResourceType(activities, 'task');
		expect(taskActivities).toHaveLength(2);

		// Format messages
		const messages = taskActivities.map((a) => formatActivityMessage(a));
		expect(messages[0]).toContain('New Task');

		// Get recent activities
		const recent = getRecentActivities(activities, 7);
		expect(recent).toHaveLength(3);

		// Get statistics
		const stats = getActivityStatistics(activities);
		expect(stats.total).toBe(3);
		expect(stats.creates).toBe(1);
		expect(stats.updates).toBe(1);
		expect(stats.deletes).toBe(1);
	});

	it('should support audit trail dashboard workflow', () => {
		const now = new Date();
		const activities = [
			createMockActivity({
				id: '1',
				action: 'create',
				resourceType: 'task',
				employeeId: 'user-1',
				employee: { displayName: 'Alice' } as any,
				afterSnapshot: { title: 'Task 1' },
				createdAt: now.toISOString()
			}),
			createMockActivity({
				id: '2',
				action: 'create',
				resourceType: 'task',
				employeeId: 'user-1',
				employee: { displayName: 'Alice' } as any,
				afterSnapshot: { title: 'Task 2' },
				createdAt: now.toISOString()
			}),
			createMockActivity({
				id: '3',
				action: 'update',
				resourceType: 'event',
				employeeId: 'user-2',
				employee: { displayName: 'Bob' } as any,
				afterSnapshot: { title: 'Event 1' },
				createdAt: new Date(now.getTime() - 3600000).toISOString()
			})
		];

		// Group by date
		const byDate = groupActivitiesByDate(activities);
		expect(byDate.size).toBeGreaterThanOrEqual(1);

		// Group by action
		const byAction = groupActivitiesByAction(activities);
		expect(byAction.get('create')).toHaveLength(2);

		// Get most active users
		const mostActive = getMostActiveUsers(activities, 5);
		expect(mostActive[0].employeeName).toBe('Alice');
		expect(mostActive[0].activityCount).toBe(2);

		// Sort by timestamp
		const sorted = sortActivitiesByTimestamp(activities);
		expect(sorted[0].id).toBe('1'); // Most recent first

		// Check critical activities
		const critical = activities.filter(isCriticalActivity);
		expect(critical).toHaveLength(3);
	});
});
