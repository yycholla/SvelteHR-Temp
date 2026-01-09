import type { Client } from '@urql/core';
import type { UserCredentials } from '$lib/models/data-request';
import { createDataRequest } from '$lib/models/data-request';
import { createErrorResponse } from '$lib/models/error-response';
import {
	GET_USER_NOTIFICATIONS,
	GET_UNREAD_COUNT,
	GET_NOTIFICATION_BY_ID,
	findNotificationById,
	type Notification
} from './queries';
import {
	MARK_NOTIFICATION_READ,
	DELETE_NOTIFICATION,
	CREATE_NOTIFICATION
} from './mutations';
import type { UpdateNotificationInput, CreateNotificationInput } from './types';

/**
 * T016: Notifications Operations with Read/Unread Tracking
 * Updated for Rust backend (async-graphql) schema
 */
export class NotificationsOperations {
	private client: Client;

	constructor(client: Client) {
		this.client = client;
	}

	/**
	 * Get user notifications with filtering
	 * Backend: Uses notifications from Rust GraphQL schema
	 */
	async getUserNotifications(params: {
		userId: string;
		first?: number;
		offset?: number;
		unreadOnly?: boolean;
		userCredentials: UserCredentials;
	}): Promise<{
		notifications: Notification[];
		totalCount: number;
		hasNextPage: boolean;
	}> {
		const limit = params.first || 50;
		const offset = params.offset || 0;

		const dataRequest = createDataRequest({
			operationName: 'GetUserNotifications',
			variables: {
				userId: params.userId,
				unreadOnly: params.unreadOnly || false,
				limit,
				offset
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

			const notifications = result.data.notifications || [];
			const hasMore = notifications.length === limit;

			return {
				notifications,
				totalCount: hasMore ? offset + limit + 1 : offset + notifications.length,
				hasNextPage: hasMore
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
	 * Backend: Uses notifications with unreadOnly filter, count client-side
	 */
	async getUnreadCount(params: {
		userId: string;
		userCredentials: UserCredentials;
	}): Promise<number> {
		const dataRequest = createDataRequest({
			operationName: 'GetUnreadCount',
			variables: {
				userId: params.userId,
				limit: 1000
			},
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

			// Count client-side
			const notifications = result.data.notifications || [];
			return notifications.length;
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
	 * Backend: Uses notifications query with client-side filtering
	 */
	async getNotificationById(params: {
		userId: string;
		notificationId: string;
		userCredentials: UserCredentials;
	}): Promise<Notification> {
		const dataRequest = createDataRequest({
			operationName: 'GetNotificationById',
			variables: {
				userId: params.userId,
				notificationId: params.notificationId
			},
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

			// Find notification by ID client-side
			const notifications = result.data.notifications || [];
			const notification = findNotificationById(notifications, params.notificationId);

			if (!notification) {
				throw createErrorResponse(new Error('Notification not found'), {
					type: 'graphql',
					userMessage: 'Notification not found.'
				});
			}

			return notification;
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
	 * Backend: Uses updateNotification from Rust GraphQL schema
	 */
	async markNotificationRead(params: {
		notificationId: string;
		userCredentials: UserCredentials;
	}): Promise<Notification> {
		const input: UpdateNotificationInput = {
			isRead: true
		};

		const dataRequest = createDataRequest({
			operationName: 'MarkNotificationRead',
			variables: {
				id: params.notificationId,
				input
			},
			userCredentials: params.userCredentials,
			timeoutMs: 5000
		});

		try {
			// Server-side mutation using toPromise()
			const result = await this.client
				.mutation(MARK_NOTIFICATION_READ, dataRequest.variables)
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

			return result.data.updateNotification;
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
	 * Backend: Uses updateNotification for each notification individually
	 */
	async markAllRead(params: {
		userId: string;
		userCredentials: UserCredentials;
	}): Promise<boolean> {
		try {
			// Get all unread notifications
			const { notifications } = await this.getUserNotifications({
				userId: params.userId,
				unreadOnly: true,
				first: 1000,
				userCredentials: params.userCredentials
			});

			// Mark each as read
			const promises = notifications.map((notification) =>
				this.markNotificationRead({
					notificationId: notification.id,
					userCredentials: params.userCredentials
				})
			);

			await Promise.all(promises);
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
	 * Backend: Uses deleteNotification from Rust GraphQL schema
	 */
	async deleteNotification(params: {
		notificationId: string;
		userCredentials: UserCredentials;
	}): Promise<boolean> {
		const dataRequest = createDataRequest({
			operationName: 'DeleteNotification',
			variables: { id: params.notificationId },
			userCredentials: params.userCredentials,
			timeoutMs: 5000
		});

		try {
			// Server-side mutation using toPromise()
			const result = await this.client
				.mutation(DELETE_NOTIFICATION, dataRequest.variables)
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

			return result.data.deleteNotification || false;
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

	/**
	 * Create notification
	 * Backend: Uses createNotification from Rust GraphQL schema
	 */
	async createNotification(params: {
		input: CreateNotificationInput;
		userCredentials: UserCredentials;
	}): Promise<Notification> {
		const dataRequest = createDataRequest({
			operationName: 'CreateNotification',
			variables: { input: params.input },
			userCredentials: params.userCredentials,
			timeoutMs: 5000
		});

		try {
			// Server-side mutation using toPromise()
			const result = await this.client
				.mutation(CREATE_NOTIFICATION, dataRequest.variables)
				.toPromise();

			if (result.error) {
				const errorResponse = createErrorResponse(result.error, {
					type: 'graphql',
					userMessage: 'Unable to create notification. Please try again.'
				});
				throw errorResponse;
			}

			if (!result.data) {
				throw createErrorResponse(new Error('No data returned'), {
					type: 'graphql',
					userMessage: 'No notification data returned. Please try again.'
				});
			}

			return result.data.createNotification;
		} catch (error: any) {
			if (error.userMessage) {
				throw error; // Already formatted error
			}
			throw createErrorResponse(error, {
				type: 'graphql',
				userMessage: 'Failed to create notification. Please try again.'
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
