import type { ActivityAction, ActivityLog, ActivityLogFilter, ResourceType } from './types';

/**
 * Helper: Build activity log filter
 */
export function buildActivityFilter({
	action,
	resourceType,
	resourceId,
	employeeId,
	startDate,
	endDate
}: {
	action?: ActivityAction;
	resourceType?: ResourceType;
	resourceId?: string;
	employeeId?: string;
	startDate?: string;
	endDate?: string;
}): ActivityLogFilter {
	const filter: ActivityLogFilter = {};

	if (action) {
		filter.action = { equalTo: action };
	}

	if (resourceType) {
		filter.resourceType = { equalTo: resourceType };
	}

	if (resourceId) {
		filter.resourceId = { equalTo: resourceId };
	}

	if (employeeId) {
		filter.employeeId = { equalTo: employeeId };
	}

	if (startDate || endDate) {
		filter.createdAt = {};
		if (startDate) {
			filter.createdAt.greaterThanOrEqualTo = startDate;
		}
		if (endDate) {
			filter.createdAt.lessThanOrEqualTo = endDate;
		}
	}

	return filter;
}

/**
 * Helper: Group activities by date
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
 * Helper: Get activity icon based on resource type and action
 */
export function getActivityIcon(resourceType: ResourceType, action: ActivityAction): string {
	const iconMap: Record<string, string> = {
		'event-create': '📅',
		'event-update': '✏️',
		'event-delete': '🗑️',
		'task-create': '✅',
		'task-update': '📝',
		'task-delete': '🗑️',
		'leave_request-create': '🏖️',
		'leave_request-update': '📋',
		'profile-update': '👤',
		'document-create': '📄',
		'document-delete': '🗑️',
		'employee-create': '👥',
		'employee-update': '✏️',
		'department-create': '🏢',
		'performance_review-create': '⭐',
		'notification-create': '🔔',
		'system-login': '🔐',
		'system-logout': '🚪'
	};

	const key = `${resourceType}-${action}`;
	return iconMap[key] || '📌';
}

/**
 * Helper: Format activity message
 */
export function formatActivityMessage(activity: ActivityLog): string {
	const actionVerbs: Record<ActivityAction, string> = {
		create: 'created',
		update: 'updated',
		delete: 'deleted',
		view: 'viewed',
		login: 'logged in',
		logout: 'logged out'
	};

	const resourceLabels: Record<ResourceType, string> = {
		event: 'event',
		task: 'task',
		leave_request: 'leave request',
		profile: 'profile',
		document: 'document',
		employee: 'employee',
		department: 'department',
		performance_review: 'performance review',
		notification: 'notification',
		system: 'system'
	};

	const verb = actionVerbs[activity.action] || activity.action;
	const resource = resourceLabels[activity.resourceType] || activity.resourceType;

	// Include title/name from details if available
	let displayName = resource;
	if (activity.details) {
		const title = (activity.details as any).title || (activity.details as any).name;
		if (title) {
			displayName = `${resource} "${title}"`;
		}
	}

	return `${verb} ${displayName}`;
}

/**
 * Helper: Filter activities by resource type
 */
export function filterActivitiesByResourceType(
	activities: ActivityLog[],
	resourceType: ResourceType
): ActivityLog[] {
	return activities.filter((activity) => activity.resourceType === resourceType);
}

/**
 * Helper: Get relative time string (e.g., "2 hours ago")
 */
export function getRelativeTime(timestamp: string): string {
	const now = new Date();
	const activityDate = new Date(timestamp);
	const diffMs = now.getTime() - activityDate.getTime();
	const diffMins = Math.floor(diffMs / (1000 * 60));
	const diffHours = Math.floor(diffMins / 60);
	const diffDays = Math.floor(diffHours / 24);

	if (diffMins < 1) {
		return 'Just now';
	} else if (diffMins < 60) {
		return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
	} else if (diffHours < 24) {
		return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
	} else if (diffDays < 7) {
		return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
	} else {
		return activityDate.toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: activityDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
		});
	}
}
