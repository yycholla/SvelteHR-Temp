// GraphQL Operations: Notifications (Dual-Channel: Email + In-App)
import type { Client } from '@urql/core';
// Feature: 019-we-need-to - Task T016
// Purpose: Notification center with read/unread tracking and recipient-only RLS

import { gql } from '@urql/svelte';
import type { UserCredentials } from '$lib/models/data-request';

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Query: Get user notifications (unread + recent read)
 * RLS Policy: notification_recipient_access (user sees only their own notifications)
 * PostGraphile: Uses allNotifications and NotificationCondition
 */
export const GET_USER_NOTIFICATIONS = gql`
	query GetUserNotifications(
		$first: Int = 50
		$offset: Int = 0
		$orderBy: [NotificationsOrderBy!] = [CREATED_AT_DESC]
		$condition: NotificationCondition
	) {
		allNotifications(first: $first, offset: $offset, orderBy: $orderBy, condition: $condition) {
			nodes {
				id
				recipientId
				type
				category
				title
				message
				relatedResourceType
				relatedResourceId
				readStatus
				deliveredAt
				readAt
				createdAt
			}
			totalCount
			pageInfo {
				hasNextPage
				hasPreviousPage
			}
		}
	}
`;

/**
 * Query: Get unread notification count
 * PostGraphile: Uses condition with direct values
 */
export const GET_UNREAD_COUNT = gql`
	query GetUnreadCount($condition: NotificationCondition) {
		allNotifications(condition: $condition) {
			totalCount
		}
	}
`;

/**
 * Query: Get single notification by ID
 * PostGraphile: Uses notificationById(id)
 */
export const GET_NOTIFICATION_BY_ID = gql`
	query GetNotificationById($id: UUID!) {
		notificationById(id: $id) {
			id
			recipientId
			type
			category
			title
			message
			relatedResourceType
			relatedResourceId
			readStatus
			deliveredAt
			readAt
			createdAt
		}
	}
`;

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Mutation: Mark notification as read
 */
export const MARK_NOTIFICATION_READ = gql`
	mutation MarkNotificationRead($input: UpdateNotificationInput!) {
		updateNotification(input: $input) {
			notification {
				id
				readStatus
				readAt
			}
			clientMutationId
		}
	}
`;

/**
 * Mutation: Mark all user notifications as read
 * PostGraphile: Uses updateNotificationsByCondition with direct condition values
 */
export const MARK_ALL_READ = gql`
	mutation MarkAllRead($condition: NotificationCondition!, $patch: NotificationPatch!) {
		updateNotifications(condition: $condition, patch: $patch) {
			notifications {
				id
				readStatus
				readAt
			}
		}
	}
`;

/**
 * Mutation: Delete notification
 */
export const DELETE_NOTIFICATION = gql`
	mutation DeleteNotification($input: DeleteNotificationInput!) {
		deleteNotification(input: $input) {
			deletedNotificationId
			clientMutationId
		}
	}
`;

// ============================================================================
// TYPESCRIPT INTERFACES
// ============================================================================

export type NotificationType = 'email' | 'in_app';
export type NotificationCategory =
	| 'event_invitation'
	| 'task_assignment'
	| 'event_reminder'
	| 'task_due_soon'
	| 'leave_approved'
	| 'leave_rejected'
	| 'performance_review'
	| 'system_announcement';

// PostGraphile condition uses direct values, not wrapped in equalTo
export interface NotificationCondition {
	type?: NotificationType;
	category?: NotificationCategory;
	readStatus?: boolean;
	relatedResourceType?: string;
	recipientId?: string;
}

export interface UpdateNotificationInput {
	clientMutationId?: string;
	id: string;
	patch: {
		readStatus?: boolean;
		readAt?: string;
	};
}

export interface DeleteNotificationInput {
	clientMutationId?: string;
	id: string;
}

export interface Notification {
	id: string;
	recipientId: string;
	type: NotificationType;
	category: NotificationCategory;
	title: string;
	message: string;
	relatedResourceType?: string;
	relatedResourceId?: string;
	readStatus: boolean;
	deliveredAt?: string;
	readAt?: string;
	createdAt: string;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

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

// ============================================================================
// OPERATIONS CLASS
// ============================================================================

/**
 * T016: Notifications Operations with Read/Unread Tracking
 */
export class NotificationsOperations {
	private client: Client;

	constructor(client: Client) {
		this.client = client;
	}

	/**
	 * Get user notifications with filtering
	 * PostGraphile: Uses condition parameter with direct values
	 */
	async getUserNotifications(params: {
		recipientId: string;
		first?: number;
		offset?: number;
		filter?: any;
		userCredentials: UserCredentials;
	}): Promise<{
		notifications: Notification[];
		totalCount: number;
		hasNextPage: boolean;
	}> {
		const { createDataRequest } = await import('$lib/models/data-request');
		const { createErrorResponse } = await import('$lib/models/error-response');

		// Build condition with recipientId and any additional filters
		const condition = {
			recipientId: params.recipientId,
			...(params.filter || {})
		};

		const dataRequest = createDataRequest({
			operationName: 'GetUserNotifications',
			variables: {
				first: params.first || 50,
				offset: params.offset || 0,
				condition
			},
			userCredentials: params.userCredentials,
			timeoutMs: 5000
		});

		try {
			// Server-side query using toPromise()
			const result = await this.client
				.query(GET_USER_NOTIFICATIONS, dataRequest.variables)
				.toPromise();

			if (result.error) {
				const errorResponse = createErrorResponse(result.error, {
					type: 'graphql',
					userMessage: 'Unable to load notifications. Please try again.'
				});
				throw errorResponse;
			}

			if (!result.data) {
				throw createErrorResponse(new Error('No data returned'), {
					type: 'graphql',
					userMessage: 'No notifications data returned. Please try again.'
				});
			}

			return {
				notifications: result.data.allNotifications.nodes,
				totalCount: result.data.allNotifications.totalCount,
				hasNextPage: result.data.allNotifications.pageInfo.hasNextPage
			};
		} catch (error: any) {
			if (error.userMessage) {
				throw error; // Already formatted error
			}
			throw createErrorResponse(error, {
				type: 'graphql',
				userMessage: 'Failed to load notifications. Please try again.'
			});
		}
	}

	/**
	 * Get unread notification count
	 * PostGraphile: Uses condition parameter with direct values
	 */
	async getUnreadCount(params: {
		recipientId: string;
		userCredentials: UserCredentials;
	}): Promise<number> {
		const { createDataRequest } = await import('$lib/models/data-request');
		const { createErrorResponse } = await import('$lib/models/error-response');

		const condition = {
			recipientId: params.recipientId,
			readStatus: false
		};

		const dataRequest = createDataRequest({
			operationName: 'GetUnreadCount',
			variables: { condition },
			userCredentials: params.userCredentials,
			timeoutMs: 5000
		});

		try {
			// Server-side query using toPromise()
			const result = await this.client.query(GET_UNREAD_COUNT, dataRequest.variables).toPromise();

			if (result.error) {
				const errorResponse = createErrorResponse(result.error, {
					type: 'graphql',
					userMessage: 'Unable to load unread count.'
				});
				throw errorResponse;
			}

			if (!result.data) {
				throw createErrorResponse(new Error('No data returned'), {
					type: 'graphql',
					userMessage: 'No unread count data returned. Please try again.'
				});
			}

			return result.data.allNotifications.totalCount;
		} catch (error: any) {
			if (error.userMessage) {
				throw error; // Already formatted error
			}
			throw createErrorResponse(error, {
				type: 'graphql',
				userMessage: 'Failed to load unread count. Please try again.'
			});
		}
	}

	/**
	 * Get notification by ID
	 * PostGraphile: Uses notificationById(id)
	 */
	async getNotificationById(params: {
		notificationId: string;
		userCredentials: UserCredentials;
	}): Promise<Notification> {
		const { createDataRequest } = await import('$lib/models/data-request');
		const { createErrorResponse } = await import('$lib/models/error-response');

		const dataRequest = createDataRequest({
			operationName: 'GetNotificationById',
			variables: { id: params.notificationId },
			userCredentials: params.userCredentials,
			timeoutMs: 5000
		});

		try {
			// Server-side query using toPromise()
			const result = await this.client
				.query(GET_NOTIFICATION_BY_ID, dataRequest.variables)
				.toPromise();

			if (result.error) {
				const errorResponse = createErrorResponse(result.error, {
					type: 'graphql',
					userMessage: 'Unable to load notification. Please try again.'
				});
				throw errorResponse;
			}

			if (!result.data) {
				throw createErrorResponse(new Error('No data returned'), {
					type: 'graphql',
					userMessage: 'No notification data returned. Please try again.'
				});
			}

			return result.data.notificationById;
		} catch (error: any) {
			if (error.userMessage) {
				throw error; // Already formatted error
			}
			throw createErrorResponse(error, {
				type: 'graphql',
				userMessage: 'Failed to load notification. Please try again.'
			});
		}
	}

	/**
	 * Mark notification as read
	 */
	async markNotificationRead(params: {
		notificationId: string;
		userCredentials: UserCredentials;
	}): Promise<Notification> {
		const { createDataRequest } = await import('$lib/models/data-request');
		const { createErrorResponse } = await import('$lib/models/error-response');

		const input: UpdateNotificationInput = {
			id: params.notificationId,
			patch: {
				readStatus: true,
				readAt: new Date().toISOString()
			}
		};

		const dataRequest = createDataRequest({
			operationName: 'MarkNotificationRead',
			variables: { input },
			userCredentials: params.userCredentials,
			timeoutMs: 5000
		});

		try {
			// Server-side query using toPromise()
			const result = await this.client
				.query(MARK_NOTIFICATION_READ, dataRequest.variables)
				.toPromise();

			if (result.error) {
				const errorResponse = createErrorResponse(result.error, {
					type: 'graphql',
					userMessage: 'Unable to mark notification as read. Please try again.'
				});
				throw errorResponse;
			}

			if (!result.data) {
				throw createErrorResponse(new Error('No data returned'), {
					type: 'graphql',
					userMessage: 'No notification data returned. Please try again.'
				});
			}

			return result.data.updateNotification.notification;
		} catch (error: any) {
			if (error.userMessage) {
				throw error; // Already formatted error
			}
			throw createErrorResponse(error, {
				type: 'graphql',
				userMessage: 'Failed to mark notification as read. Please try again.'
			});
		}
	}

	/**
	 * Mark all user notifications as read
	 * PostGraphile: Uses condition and patch parameters
	 */
	async markAllRead(params: {
		recipientId: string;
		userCredentials: UserCredentials;
	}): Promise<boolean> {
		const { createDataRequest } = await import('$lib/models/data-request');
		const { createErrorResponse } = await import('$lib/models/error-response');

		const condition = {
			recipientId: params.recipientId,
			readStatus: false
		};

		const patch = {
			readStatus: true,
			readAt: new Date().toISOString()
		};

		const dataRequest = createDataRequest({
			operationName: 'MarkAllRead',
			variables: { condition, patch },
			userCredentials: params.userCredentials,
			timeoutMs: 5000
		});

		try {
			// Server-side query using toPromise()
			const result = await this.client.query(MARK_ALL_READ, dataRequest.variables).toPromise();

			if (result.error) {
				const errorResponse = createErrorResponse(result.error, {
					type: 'graphql',
					userMessage: 'Unable to mark all notifications as read. Please try again.'
				});
				throw errorResponse;
			}

			if (!result.data) {
				throw createErrorResponse(new Error('No data returned'), {
					type: 'graphql',
					userMessage: 'No data returned. Please try again.'
				});
			}

			return true;
		} catch (error: any) {
			if (error.userMessage) {
				throw error; // Already formatted error
			}
			throw createErrorResponse(error, {
				type: 'graphql',
				userMessage: 'Failed to mark all notifications as read. Please try again.'
			});
		}
	}

	/**
	 * Delete notification
	 */
	async deleteNotification(params: {
		notificationId: string;
		userCredentials: UserCredentials;
	}): Promise<string> {
		const { createDataRequest } = await import('$lib/models/data-request');
		const { createErrorResponse } = await import('$lib/models/error-response');

		const input: DeleteNotificationInput = {
			id: params.notificationId
		};

		const dataRequest = createDataRequest({
			operationName: 'DeleteNotification',
			variables: { input },
			userCredentials: params.userCredentials,
			timeoutMs: 5000
		});

		try {
			// Server-side query using toPromise()
			const result = await this.client
				.query(DELETE_NOTIFICATION, dataRequest.variables)
				.toPromise();

			if (result.error) {
				const errorResponse = createErrorResponse(result.error, {
					type: 'graphql',
					userMessage: 'Unable to delete notification. Please try again.'
				});
				throw errorResponse;
			}

			if (!result.data) {
				throw createErrorResponse(new Error('No data returned'), {
					type: 'graphql',
					userMessage: 'No data returned. Please try again.'
				});
			}

			return result.data.deleteNotification.deletedNotificationId;
		} catch (error: any) {
			if (error.userMessage) {
				throw error; // Already formatted error
			}
			throw createErrorResponse(error, {
				type: 'graphql',
				userMessage: 'Failed to delete notification. Please try again.'
			});
		}
	}
}

/**
 * Factory function to create NotificationsOperations instance
 */
export function createNotificationsOperations(client: Client): NotificationsOperations {
	return new NotificationsOperations(client);
}
