import type { Client } from '@urql/core';
import type { UserCredentials } from '$lib/models/data-request';
import { createDataRequest } from '$lib/models/data-request';
import { createErrorResponse } from '$lib/models/error-response';
import {
	GET_USER_NOTIFICATIONS,
	GET_UNREAD_COUNT,
	GET_NOTIFICATION_BY_ID
} from './queries';
import {
	MARK_NOTIFICATION_READ,
	MARK_ALL_READ,
	DELETE_NOTIFICATION
} from './mutations';
import type { Notification, UpdateNotificationInput, DeleteNotificationInput } from './types';

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
