import type {
	Notification,
	NotificationCategory,
	NotificationCondition,
	NotificationType
} from './types';

/**
 * Helper: Build notification condition (PostGraphile uses direct values)
 */
export function buildNotificationCondition({
	type,
	category,
	readStatus,
	relatedResourceType,
	recipientId
}: {
	type?: NotificationType;
	category?: NotificationCategory;
	readStatus?: boolean;
	relatedResourceType?: string;
	recipientId?: string;
}): NotificationCondition {
	const condition: NotificationCondition = {};

	if (type) {
		condition.type = type;
	}

	if (category) {
		condition.category = category;
	}

	if (readStatus !== undefined) {
		condition.readStatus = readStatus;
	}

	if (relatedResourceType) {
		condition.relatedResourceType = relatedResourceType;
	}

	if (recipientId) {
		condition.recipientId = recipientId;
	}

	return condition;
}

/**
 * Helper: Get notification icon
 */
export function getNotificationIcon(category: NotificationCategory): string {
	const iconMap: Record<NotificationCategory, string> = {
		event_invitation: '📅',
		task_assignment: '✅',
		event_reminder: '⏰',
		task_due_soon: '⚠️',
		leave_approved: '✓',
		leave_rejected: '✗',
		performance_review: '⭐',
		system_announcement: '📢'
	};

	return iconMap[category] || '🔔';
}

/**
 * Helper: Format notification time
 */
export function formatNotificationTime(timestamp: string): string {
	const now = new Date();
	const notificationDate = new Date(timestamp);
	const diffMs = now.getTime() - notificationDate.getTime();
	const diffMins = Math.floor(diffMs / (1000 * 60));
	const diffHours = Math.floor(diffMins / 60);
	const diffDays = Math.floor(diffHours / 24);

	if (diffMins < 1) {
		return 'Just now';
	} else if (diffMins < 60) {
		return `${diffMins}m ago`;
	} else if (diffHours < 24) {
		return `${diffHours}h ago`;
	} else if (diffDays < 7) {
		return `${diffDays}d ago`;
	} else {
		return notificationDate.toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric'
		});
	}
}

/**
 * Helper: Group notifications by category
 */
export function groupNotificationsByCategory(
	notifications: Notification[]
): Map<NotificationCategory, Notification[]> {
	const grouped = new Map<NotificationCategory, Notification[]>();

	notifications.forEach((notification) => {
		if (!grouped.has(notification.category)) {
			grouped.set(notification.category, []);
		}
		grouped.get(notification.category)!.push(notification);
	});

	return grouped;
}

/**
 * Helper: Get notification priority (for sorting)
 */
export function getNotificationPriority(category: NotificationCategory): number {
	const priorityMap: Record<NotificationCategory, number> = {
		task_due_soon: 10,
		event_reminder: 9,
		leave_approved: 8,
		leave_rejected: 8,
		performance_review: 7,
		task_assignment: 6,
		event_invitation: 5,
		system_announcement: 4
	};

	return priorityMap[category] || 0;
}

/**
 * Helper: Sort notifications by priority and time
 */
export function sortNotificationsByPriority(notifications: Notification[]): Notification[] {
	return [...notifications].sort((a, b) => {
		// First by priority
		const priorityDiff = getNotificationPriority(b.category) - getNotificationPriority(a.category);
		if (priorityDiff !== 0) {
			return priorityDiff;
		}
		// Then by time (newest first)
		return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
	});
}

/**
 * Helper: Get notification category label
 */
export function getNotificationCategoryLabel(category: NotificationCategory): string {
	const labels: Record<NotificationCategory, string> = {
		event_invitation: 'Event Invitation',
		task_assignment: 'Task Assignment',
		event_reminder: 'Event Reminder',
		task_due_soon: 'Task Due Soon',
		leave_approved: 'Leave Approved',
		leave_rejected: 'Leave Rejected',
		performance_review: 'Performance Review',
		system_announcement: 'System Announcement'
	};

	return labels[category] || 'Notification';
}
