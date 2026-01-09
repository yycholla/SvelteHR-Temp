import { gql } from '@urql/svelte';
import type { Notification } from './types';

// Re-export Notification type for consumers
export type { Notification };

/**
 * GraphQL Queries for Notifications
 *
 * Updated for Rust backend (async-graphql) schema
 * Removed PostGraphile patterns (allNotifications, NotificationCondition, NotificationsOrderBy, Relay connections)
 */

/**
 * Query: Get user notifications (unread + recent read)
 * Backend: Uses notifications from Rust GraphQL schema
 * RLS Policy: notification_recipient_access (user sees only their own notifications)
 */
export const GET_USER_NOTIFICATIONS = gql`
	query GetUserNotifications(
		$userId: UUID!
		$unreadOnly: Boolean
		$limit: Int = 50
		$offset: Int = 0
	) {
		notifications(userId: $userId, unreadOnly: $unreadOnly, limit: $limit, offset: $offset) {
			id
			userId
			title
			message
			type
			priority
			isRead
			actionUrl
			createdAt
			readAt
		}
	}
`;

/**
 * Query: Get unread notification count
 * Backend: Uses notifications with unreadOnly filter
 * Note: Backend doesn't provide count separately, must count client-side
 */
export const GET_UNREAD_COUNT = gql`
	query GetUnreadCount($userId: UUID!, $limit: Int = 1000) {
		notifications(userId: $userId, unreadOnly: true, limit: $limit, offset: 0) {
			id
		}
	}
`;

/**
 * Query: Get single notification by ID
 * Backend: Uses notification (singular) from Rust GraphQL schema
 * Note: Backend may not have singular notification query, use notifications with limit
 */
export const GET_NOTIFICATION_BY_ID = gql`
	query GetNotificationById($userId: UUID!, $notificationId: UUID!) {
		notifications(userId: $userId, limit: 1000, offset: 0) {
			id
			userId
			title
			message
			type
			priority
			isRead
			actionUrl
			createdAt
			readAt
		}
	}
`;

/**
 * Query: Get all notifications for a user (for admin/debugging)
 * Backend: Uses notifications from Rust GraphQL schema
 */
export const GET_ALL_NOTIFICATIONS = gql`
	query GetAllNotifications($userId: UUID!, $limit: Int = 100, $offset: Int = 0) {
		notifications(userId: $userId, unreadOnly: false, limit: $limit, offset: $offset) {
			id
			userId
			title
			message
			type
			priority
			isRead
			actionUrl
			createdAt
			readAt
		}
	}
`;

/**
 * Query: Get recent notifications (last 7 days)
 * Backend: Uses notifications, filtering done client-side
 */
export const GET_RECENT_NOTIFICATIONS = gql`
	query GetRecentNotifications($userId: UUID!, $limit: Int = 20) {
		notifications(userId: $userId, unreadOnly: false, limit: $limit, offset: 0) {
			id
			userId
			title
			message
			type
			priority
			isRead
			actionUrl
			createdAt
		}
	}
`;

// =============================================================================
// CLIENT-SIDE HELPER FUNCTIONS
// =============================================================================

/**
 * Response types for queries
 */
// Notification interface is imported from types.ts at the top of the file

export interface NotificationStats {
	total: number;
	unread: number;
	read: number;
	byType: Record<string, number>;
	byPriority: Record<string, number>;
}

/**
 * Filter notification by ID (client-side)
 */
export function findNotificationById(
	notifications: Notification[],
	id: string
): Notification | undefined {
	return notifications.find((n) => n.id === id);
}

/**
 * Filter unread notifications (client-side)
 */
export function filterUnreadNotifications(notifications: Notification[]): Notification[] {
	return notifications.filter((n) => !n.isRead);
}

/**
 * Filter read notifications (client-side)
 */
export function filterReadNotifications(notifications: Notification[]): Notification[] {
	return notifications.filter((n) => n.isRead);
}

/**
 * Filter notifications by type (client-side)
 */
export function filterByType(notifications: Notification[], type: string): Notification[] {
	return notifications.filter((n) => n.type === type);
}

/**
 * Filter notifications by priority (client-side)
 */
export function filterByPriority(notifications: Notification[], priority: string): Notification[] {
	return notifications.filter((n) => n.priority === priority);
}

/**
 * Filter notifications by date range (client-side)
 */
export function filterByDateRange(
	notifications: Notification[],
	startDate?: string,
	endDate?: string
): Notification[] {
	let filtered = notifications;

	if (startDate) {
		const start = new Date(startDate);
		filtered = filtered.filter((n) => new Date(n.createdAt) >= start);
	}

	if (endDate) {
		const end = new Date(endDate);
		filtered = filtered.filter((n) => new Date(n.createdAt) <= end);
	}

	return filtered;
}

/**
 * Get recent notifications (last N days)
 */
export function getRecentNotifications(
	notifications: Notification[],
	days: number = 7
): Notification[] {
	const cutoffDate = new Date();
	cutoffDate.setDate(cutoffDate.getDate() - days);

	return notifications.filter((n) => new Date(n.createdAt) >= cutoffDate);
}

/**
 * Calculate notification statistics (client-side)
 */
export function calculateNotificationStats(notifications: Notification[]): NotificationStats {
	const total = notifications.length;
	const unread = notifications.filter((n) => !n.isRead).length;
	const read = notifications.filter((n) => n.isRead).length;

	// Count by type
	const byType: Record<string, number> = {};
	notifications.forEach((n) => {
		const type = n.type || 'unknown';
		byType[type] = (byType[type] || 0) + 1;
	});

	// Count by priority
	const byPriority: Record<string, number> = {};
	notifications.forEach((n) => {
		const priority = n.priority || 'normal';
		byPriority[priority] = (byPriority[priority] || 0) + 1;
	});

	return {
		total,
		unread,
		read,
		byType,
		byPriority
	};
}

/**
 * Sort notifications by date (newest first)
 */
export function sortByDateDesc(notifications: Notification[]): Notification[] {
	return [...notifications].sort((a, b) => {
		return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
	});
}

/**
 * Sort notifications by date (oldest first)
 */
export function sortByDateAsc(notifications: Notification[]): Notification[] {
	return [...notifications].sort((a, b) => {
		return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
	});
}

/**
 * Sort notifications by priority (high → low)
 */
export function sortByPriority(notifications: Notification[]): Notification[] {
	const priorityOrder: Record<string, number> = {
		critical: 0,
		high: 1,
		medium: 2,
		normal: 3,
		low: 4
	};

	return [...notifications].sort((a, b) => {
		const aPriority = priorityOrder[a.priority] ?? 3;
		const bPriority = priorityOrder[b.priority] ?? 3;
		return aPriority - bPriority;
	});
}

/**
 * Group notifications by type
 */
export function groupByType(notifications: Notification[]): Record<string, Notification[]> {
	const grouped: Record<string, Notification[]> = {};

	notifications.forEach((n) => {
		const type = n.type || 'unknown';
		if (!grouped[type]) {
			grouped[type] = [];
		}
		grouped[type].push(n);
	});

	return grouped;
}

/**
 * Group notifications by date (day)
 */
export function groupByDate(notifications: Notification[]): Record<string, Notification[]> {
	const grouped: Record<string, Notification[]> = {};

	notifications.forEach((n) => {
		const date = new Date(n.createdAt).toISOString().split('T')[0];
		if (!grouped[date]) {
			grouped[date] = [];
		}
		grouped[date].push(n);
	});

	return grouped;
}

/**
 * Get priority badge info for UI
 */
export function getPriorityInfo(priority: string): {
	label: string;
	color: string;
	variant: 'default' | 'secondary' | 'destructive' | 'outline';
} {
	switch (priority.toLowerCase()) {
		case 'critical':
			return { label: 'Critical', color: 'red', variant: 'destructive' };
		case 'high':
			return { label: 'High', color: 'orange', variant: 'destructive' };
		case 'medium':
			return { label: 'Medium', color: 'yellow', variant: 'secondary' };
		case 'normal':
			return { label: 'Normal', color: 'blue', variant: 'default' };
		case 'low':
			return { label: 'Low', color: 'gray', variant: 'outline' };
		default:
			return { label: 'Normal', color: 'blue', variant: 'default' };
	}
}

/**
 * Get type badge info for UI
 */
export function getTypeInfo(type: string): {
	label: string;
	icon?: string;
	color: string;
} {
	switch (type.toLowerCase()) {
		case 'event':
			return { label: 'Event', icon: 'calendar', color: 'blue' };
		case 'task':
			return { label: 'Task', icon: 'checkbox', color: 'green' };
		case 'leave':
			return { label: 'Leave', icon: 'calendar-check', color: 'purple' };
		case 'approval':
			return { label: 'Approval', icon: 'check-circle', color: 'orange' };
		case 'system':
			return { label: 'System', icon: 'info', color: 'gray' };
		case 'reminder':
			return { label: 'Reminder', icon: 'bell', color: 'yellow' };
		default:
			return { label: 'Notification', icon: 'bell', color: 'blue' };
	}
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(dateString: string): string {
	const date = new Date(dateString);
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffMins = Math.floor(diffMs / 60000);
	const diffHours = Math.floor(diffMs / 3600000);
	const diffDays = Math.floor(diffMs / 86400000);

	if (diffMins < 1) return 'Just now';
	if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
	if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
	if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

	return date.toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
	});
}

/**
 * Check if notification is recent (within last 24 hours)
 */
export function isRecentNotification(notification: Notification): boolean {
	const date = new Date(notification.createdAt);
	const now = new Date();
	const diffHours = (now.getTime() - date.getTime()) / 3600000;
	return diffHours < 24;
}
