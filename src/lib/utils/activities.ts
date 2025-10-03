// Activity Log Utility Functions
// Feature: 019-we-need-to - Task T018
// Purpose: Business logic helpers for activity log operations

import type { ActivityLog, ActivityAction, ResourceType } from '$lib/graphql/types';

/**
 * Group activities by date for chronological display
 * @returns Map with date strings as keys and activity arrays as values
 */
export function groupActivitiesByDate(activities: ActivityLog[]): Map<string, ActivityLog[]> {
	const grouped = new Map<string, ActivityLog[]>();

	activities.forEach((activity) => {
		const date = new Date(activity.createdAt).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});

		if (!grouped.has(date)) {
			grouped.set(date, []);
		}
		grouped.get(date)!.push(activity);
	});

	return grouped;
}

/**
 * Group activities by resource type
 */
export function groupActivitiesByResourceType(
	activities: ActivityLog[]
): Map<ResourceType, ActivityLog[]> {
	const grouped = new Map<ResourceType, ActivityLog[]>();

	activities.forEach((activity) => {
		if (!grouped.has(activity.resourceType)) {
			grouped.set(activity.resourceType, []);
		}
		grouped.get(activity.resourceType)!.push(activity);
	});

	return grouped;
}

/**
 * Group activities by action type
 */
export function groupActivitiesByAction(
	activities: ActivityLog[]
): Map<ActivityAction, ActivityLog[]> {
	const grouped = new Map<ActivityAction, ActivityLog[]>();

	activities.forEach((activity) => {
		if (!grouped.has(activity.action)) {
			grouped.set(activity.action, []);
		}
		grouped.get(activity.action)!.push(activity);
	});

	return grouped;
}

/**
 * Get icon for activity based on resource type and action
 */
export function getActivityIcon(resourceType: ResourceType, action: ActivityAction): string {
	// Action-based icons (higher priority)
	if (action === 'create') return '➕';
	if (action === 'update') return '✏️';
	if (action === 'delete') return '🗑️';
	if (action === 'view') return '👁️';
	if (action === 'login') return '🔓';
	if (action === 'logout') return '🔒';

	// Resource-based icons (fallback) - handle both singular and plural forms
	const resourceIcons: Record<string, string> = {
		event: '📅',
		events: '📅',
		task: '✅',
		tasks: '✅',
		leave_request: '🏖️',
		leave_requests: '🏖️',
		profile: '👤',
		profiles: '👤',
		document: '📄',
		documents: '📄',
		employee: '👥',
		employees: '👥',
		user: '👤',
		users: '👤',
		department: '🏢',
		departments: '🏢',
		performance_review: '📊',
		performance_reviews: '📊',
		notification: '🔔',
		notifications: '🔔',
		system: '⚙️'
	};

	return resourceIcons[resourceType] || '📝';
}

/**
 * Get Tailwind CSS color class for activity action
 */
export function getActivityActionColor(action: ActivityAction): string {
	const colorMap: Record<ActivityAction, string> = {
		create: 'bg-green-100 text-green-800',
		update: 'bg-blue-100 text-blue-800',
		delete: 'bg-red-100 text-red-800',
		view: 'bg-gray-100 text-gray-800',
		login: 'bg-purple-100 text-purple-800',
		logout: 'bg-orange-100 text-orange-800'
	};

	return colorMap[action] || 'bg-gray-100 text-gray-800';
}

/**
 * Get Tailwind CSS color class for resource type
 */
export function getResourceTypeColor(resourceType: ResourceType): string {
	const colorMap: Record<string, string> = {
		event: 'bg-blue-100 text-blue-800',
		events: 'bg-blue-100 text-blue-800',
		task: 'bg-green-100 text-green-800',
		tasks: 'bg-green-100 text-green-800',
		leave_request: 'bg-yellow-100 text-yellow-800',
		leave_requests: 'bg-yellow-100 text-yellow-800',
		profile: 'bg-purple-100 text-purple-800',
		profiles: 'bg-purple-100 text-purple-800',
		document: 'bg-gray-100 text-gray-800',
		documents: 'bg-gray-100 text-gray-800',
		employee: 'bg-indigo-100 text-indigo-800',
		employees: 'bg-indigo-100 text-indigo-800',
		user: 'bg-indigo-100 text-indigo-800',
		users: 'bg-indigo-100 text-indigo-800',
		department: 'bg-teal-100 text-teal-800',
		departments: 'bg-teal-100 text-teal-800',
		performance_review: 'bg-orange-100 text-orange-800',
		performance_reviews: 'bg-orange-100 text-orange-800',
		notification: 'bg-pink-100 text-pink-800',
		notifications: 'bg-pink-100 text-pink-800',
		system: 'bg-slate-100 text-slate-800'
	};

	return colorMap[resourceType] || 'bg-gray-100 text-gray-800';
}

/**
 * Format activity message for human-readable display
 */
export function formatActivityMessage(activity: ActivityLog): string {
	const actionVerbs: Record<ActivityAction, string> = {
		create: 'created',
		update: 'updated',
		delete: 'deleted',
		view: 'viewed',
		login: 'logged in to',
		logout: 'logged out of'
	};

	const verb = actionVerbs[activity.action] || activity.action;
	const resource = formatResourceTypeName(activity.resourceType);

	// Extract name/title from snapshots or details
	let itemName: string | null = null;

	// Try to get name from appropriate snapshot based on action
	const snapshot = activity.action === 'delete'
		? activity.beforeSnapshot
		: (activity.afterSnapshot || activity.beforeSnapshot);

	// Check snapshot for common name fields
	if (snapshot) {
		itemName = snapshot.title
			|| snapshot.name
			|| snapshot.displayName
			|| snapshot.display_name
			|| snapshot.full_name
			|| snapshot.event_title
			|| snapshot.task_name
			|| null;
	}

	// Fallback to details if no snapshot name found
	if (!itemName && activity.details) {
		itemName = activity.details.title
			|| activity.details.name
			|| activity.details.displayName
			|| null;
	}

	// Build display name
	const displayName = itemName ? `${resource} "${itemName}"` : resource;

	// Special case for login/logout
	if (activity.action === 'login' || activity.action === 'logout') {
		return `${verb} ${activity.resourceType === 'system' ? 'the system' : resource}`;
	}

	return `${verb} ${displayName}`;
}

/**
 * Format resource type name for display
 */
export function formatResourceTypeName(resourceType: ResourceType): string {
	const nameMap: Record<string, string> = {
		event: 'event',
		events: 'event',
		task: 'task',
		tasks: 'task',
		leave_request: 'leave request',
		leave_requests: 'leave request',
		profile: 'profile',
		profiles: 'profile',
		document: 'document',
		documents: 'document',
		employee: 'employee',
		employees: 'employee',
		user: 'user',
		users: 'user',
		department: 'department',
		departments: 'department',
		performance_review: 'performance review',
		performance_reviews: 'performance review',
		notification: 'notification',
		notifications: 'notification',
		system: 'system'
	};

	return nameMap[resourceType] || resourceType;
}

/**
 * Filter activities by resource type
 */
export function filterActivitiesByResourceType(
	activities: ActivityLog[],
	resourceType: ResourceType
): ActivityLog[] {
	return activities.filter((activity) => activity.resourceType === resourceType);
}

/**
 * Filter activities by action
 */
export function filterActivitiesByAction(
	activities: ActivityLog[],
	action: ActivityAction
): ActivityLog[] {
	return activities.filter((activity) => activity.action === action);
}

/**
 * Filter activities by date range
 */
export function filterActivitiesByDateRange(
	activities: ActivityLog[],
	startDate: Date,
	endDate: Date
): ActivityLog[] {
	return activities.filter((activity) => {
		const activityDate = new Date(activity.createdAt);
		return activityDate >= startDate && activityDate <= endDate;
	});
}

/**
 * Filter activities by employee ID
 */
export function filterActivitiesByEmployee(
	activities: ActivityLog[],
	employeeId: string
): ActivityLog[] {
	return activities.filter((activity) => activity.employeeId === employeeId);
}

/**
 * Get relative time description for activity
 */
export function getRelativeTime(timestamp: string): string {
	const activityTime = new Date(timestamp);
	const now = new Date();
	const diffMs = now.getTime() - activityTime.getTime();

	const minutes = Math.floor(diffMs / (1000 * 60));
	const hours = Math.floor(minutes / 60);
	const days = Math.floor(hours / 24);
	const weeks = Math.floor(days / 7);
	const months = Math.floor(days / 30);

	if (months > 0) {
		return months === 1 ? '1 month ago' : `${months} months ago`;
	}

	if (weeks > 0) {
		return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
	}

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

/**
 * Sort activities by timestamp (most recent first by default)
 */
export function sortActivitiesByTimestamp(
	activities: ActivityLog[],
	ascending = false
): ActivityLog[] {
	return [...activities].sort((a, b) => {
		const timeA = new Date(a.createdAt).getTime();
		const timeB = new Date(b.createdAt).getTime();
		return ascending ? timeA - timeB : timeB - timeA;
	});
}

/**
 * Get activities from the last N days
 */
export function getRecentActivities(activities: ActivityLog[], daysBack = 7): ActivityLog[] {
	const cutoffDate = new Date();
	cutoffDate.setDate(cutoffDate.getDate() - daysBack);

	return activities.filter((activity) => {
		const activityDate = new Date(activity.createdAt);
		return activityDate >= cutoffDate;
	});
}

/**
 * Get activities for today
 */
export function getTodayActivities(activities: ActivityLog[]): ActivityLog[] {
	const today = new Date();
	today.setHours(0, 0, 0, 0);

	const tomorrow = new Date(today);
	tomorrow.setDate(tomorrow.getDate() + 1);

	return filterActivitiesByDateRange(activities, today, tomorrow);
}

/**
 * Get activities for a specific week
 */
export function getWeekActivities(activities: ActivityLog[], weekOffset = 0): ActivityLog[] {
	const now = new Date();
	const dayOfWeek = now.getDay();
	const startOfWeek = new Date(now);
	startOfWeek.setDate(now.getDate() - dayOfWeek + weekOffset * 7);
	startOfWeek.setHours(0, 0, 0, 0);

	const endOfWeek = new Date(startOfWeek);
	endOfWeek.setDate(startOfWeek.getDate() + 7);

	return filterActivitiesByDateRange(activities, startOfWeek, endOfWeek);
}

/**
 * Get activity statistics for a list of activities
 */
export function getActivityStatistics(activities: ActivityLog[]): {
	total: number;
	creates: number;
	updates: number;
	deletes: number;
	views: number;
	byResourceType: Record<ResourceType, number>;
	byAction: Record<ActivityAction, number>;
} {
	const stats = {
		total: activities.length,
		creates: 0,
		updates: 0,
		deletes: 0,
		views: 0,
		byResourceType: {} as Record<ResourceType, number>,
		byAction: {} as Record<ActivityAction, number>
	};

	activities.forEach((activity) => {
		// Count by action
		if (activity.action === 'create') stats.creates++;
		if (activity.action === 'update') stats.updates++;
		if (activity.action === 'delete') stats.deletes++;
		if (activity.action === 'view') stats.views++;

		// Count by resource type
		if (!stats.byResourceType[activity.resourceType]) {
			stats.byResourceType[activity.resourceType] = 0;
		}
		stats.byResourceType[activity.resourceType]++;

		// Count by action
		if (!stats.byAction[activity.action]) {
			stats.byAction[activity.action] = 0;
		}
		stats.byAction[activity.action]++;
	});

	return stats;
}

/**
 * Format activity details for display
 */
export function formatActivityDetails(details: Record<string, any> | undefined): string {
	if (!details || Object.keys(details).length === 0) {
		return '';
	}

	// Extract meaningful fields
	const parts: string[] = [];

	if (details.title) parts.push(`Title: ${details.title}`);
	if (details.name) parts.push(`Name: ${details.name}`);
	if (details.status) parts.push(`Status: ${details.status}`);
	if (details.priority) parts.push(`Priority: ${details.priority}`);
	if (details.assignee_id) parts.push(`Assigned to: ${details.assignee_id}`);
	if (details.department_id) parts.push(`Department: ${details.department_id}`);

	return parts.join(', ');
}

/**
 * Check if activity is a critical action (create/update/delete)
 */
export function isCriticalActivity(activity: ActivityLog): boolean {
	return ['create', 'update', 'delete'].includes(activity.action);
}

/**
 * Get most active users from activities
 */
export function getMostActiveUsers(
	activities: ActivityLog[],
	limit = 5
): Array<{ employeeId: string; employeeName: string; activityCount: number }> {
	const userCounts = new Map<string, { name: string; count: number }>();

	activities.forEach((activity) => {
		const employeeId = activity.employeeId;
		const employeeName = activity.employee?.displayName || 'Unknown User';

		if (!userCounts.has(employeeId)) {
			userCounts.set(employeeId, { name: employeeName, count: 0 });
		}

		const userData = userCounts.get(employeeId)!;
		userData.count++;
	});

	return Array.from(userCounts.entries())
		.map(([employeeId, data]) => ({
			employeeId,
			employeeName: data.name,
			activityCount: data.count
		}))
		.sort((a, b) => b.activityCount - a.activityCount)
		.slice(0, limit);
}

/**
 * Get most common actions from activities
 */
export function getMostCommonActions(
	activities: ActivityLog[],
	limit = 3
): Array<{ action: ActivityAction; count: number }> {
	const actionCounts = new Map<ActivityAction, number>();

	activities.forEach((activity) => {
		const count = actionCounts.get(activity.action) || 0;
		actionCounts.set(activity.action, count + 1);
	});

	return Array.from(actionCounts.entries())
		.map(([action, count]) => ({ action, count }))
		.sort((a, b) => b.count - a.count)
		.slice(0, limit);
}

/**
 * Get most common resource types from activities
 */
export function getMostCommonResourceTypes(
	activities: ActivityLog[],
	limit = 3
): Array<{ resourceType: ResourceType; count: number }> {
	const resourceCounts = new Map<ResourceType, number>();

	activities.forEach((activity) => {
		const count = resourceCounts.get(activity.resourceType) || 0;
		resourceCounts.set(activity.resourceType, count + 1);
	});

	return Array.from(resourceCounts.entries())
		.map(([resourceType, count]) => ({ resourceType, count }))
		.sort((a, b) => b.count - a.count)
		.slice(0, limit);
}
