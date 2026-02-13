// src/services/NotificationService.ts
import { Result } from '$domain/Result';
import { DomainError } from '$domain/errors';
import {
	type Notification,
	NotificationType,
	NotificationCategory,
	NotificationPriority,
	NotificationTitle,
	NotificationMessage,
	ResourceLink,
	NotificationNotFoundError,
	NotificationError
} from '$domain/Notification';
import type {
	NotificationRepository,
	CreateNotificationData,
	UpdateNotificationData,
	NotificationFilter
} from './ports/NotificationRepository';

/**
 * Application service for managing notifications.
 * Orchestrates domain logic and repository operations.
 */
export class NotificationService {
	constructor(private readonly repository: NotificationRepository) {}

	/**
	 * Get a notification by ID
	 * @param id - The notification ID
	 * @returns Result containing the notification or an error
	 */
	async getById(
		id: string
	): Promise<Result<Notification, NotificationNotFoundError | DomainError>> {
		try {
			const result = await this.repository.findById(id);
			if (result.isError) {
				return result;
			}
			return Result.ok(result.value);
		} catch (error) {
			return Result.error(
				new DomainError('Failed to fetch notification', 'NOTIFICATION_FETCH_FAILED', {
					notificationId: id,
					originalError: error
				})
			);
		}
	}

	/**
	 * Get all notifications with optional filtering
	 * @param filter - Optional filters for the query
	 * @returns Result containing array of notifications or an error
	 */
	async getAll(
		filter?: NotificationFilter
	): Promise<Result<Notification[], NotificationError | DomainError>> {
		try {
			const result = await this.repository.findAll(filter);
			if (result.isError) {
				return result;
			}
			return Result.ok(result.value);
		} catch (error) {
			return Result.error(
				new DomainError('Failed to fetch notifications', 'NOTIFICATIONS_FETCH_FAILED', {
					filter,
					originalError: error
				})
			);
		}
	}

	/**
	 * Create a new notification
	 * @param data - The notification data
	 * @returns Result containing the created notification or an error
	 */
	async create(
		data: CreateNotificationData
	): Promise<Result<Notification, NotificationError | DomainError>> {
		try {
			// Validate and create value objects
			const typeResult = NotificationType.create(data.type);
			if (typeResult.isError) {
				return Result.error(typeResult.error);
			}

			const categoryResult = NotificationCategory.create(data.category);
			if (categoryResult.isError) {
				return Result.error(categoryResult.error);
			}

			const priorityResult = NotificationPriority.create(data.priority);
			if (priorityResult.isError) {
				return Result.error(priorityResult.error);
			}

			const titleResult = NotificationTitle.create(data.title);
			if (titleResult.isError) {
				return Result.error(titleResult.error);
			}

			const messageResult = NotificationMessage.create(data.message);
			if (messageResult.isError) {
				return Result.error(messageResult.error);
			}

			if (data.resourceLink) {
				const resourceLinkResult = ResourceLink.create(data.resourceLink);
				if (resourceLinkResult.isError) {
					return Result.error(resourceLinkResult.error);
				}
			}

			// Delegate to repository
			const result = await this.repository.create(data);
			if (result.isError) {
				return result;
			}

			return Result.ok(result.value);
		} catch (error) {
			return Result.error(
				new DomainError('Failed to create notification', 'NOTIFICATION_CREATE_FAILED', {
					data,
					originalError: error
				})
			);
		}
	}

	/**
	 * Update an existing notification
	 * @param id - The notification ID
	 * @param data - The fields to update
	 * @returns Result containing the updated notification or an error
	 */
	async update(
		id: string,
		data: UpdateNotificationData
	): Promise<Result<Notification, NotificationError | DomainError>> {
		try {
			// Validate value objects if provided
			if (data.type) {
				const typeResult = NotificationType.create(data.type);
				if (typeResult.isError) {
					return Result.error(typeResult.error);
				}
			}

			if (data.category) {
				const categoryResult = NotificationCategory.create(data.category);
				if (categoryResult.isError) {
					return Result.error(categoryResult.error);
				}
			}

			if (data.priority) {
				const priorityResult = NotificationPriority.create(data.priority);
				if (priorityResult.isError) {
					return Result.error(priorityResult.error);
				}
			}

			if (data.title) {
				const titleResult = NotificationTitle.create(data.title);
				if (titleResult.isError) {
					return Result.error(titleResult.error);
				}
			}

			if (data.message) {
				const messageResult = NotificationMessage.create(data.message);
				if (messageResult.isError) {
					return Result.error(messageResult.error);
				}
			}

			if (data.resourceLink) {
				const resourceLinkResult = ResourceLink.create(data.resourceLink);
				if (resourceLinkResult.isError) {
					return Result.error(resourceLinkResult.error);
				}
			}

			const result = await this.repository.update(id, data);
			if (result.isError) {
				return result;
			}

			return Result.ok(result.value);
		} catch (error) {
			return Result.error(
				new DomainError('Failed to update notification', 'NOTIFICATION_UPDATE_FAILED', {
					notificationId: id,
					data,
					originalError: error
				})
			);
		}
	}

	/**
	 * Delete a notification
	 * @param id - The notification ID
	 * @returns Result indicating success or an error
	 */
	async delete(id: string): Promise<Result<void, NotificationNotFoundError | DomainError>> {
		try {
			const result = await this.repository.delete(id);
			if (result.isError) {
				return result;
			}
			return Result.ok(undefined);
		} catch (error) {
			return Result.error(
				new DomainError('Failed to delete notification', 'NOTIFICATION_DELETE_FAILED', {
					notificationId: id,
					originalError: error
				})
			);
		}
	}

	/**
	 * Get all notifications for a specific recipient
	 * @param recipientId - The recipient's ID
	 * @returns Result containing array of notifications or an error
	 */
	async getForRecipient(
		recipientId: string
	): Promise<Result<Notification[], NotificationError | DomainError>> {
		try {
			const result = await this.repository.getNotificationsForRecipient(recipientId);
			if (result.isError) {
				return result;
			}
			return Result.ok(result.value);
		} catch (error) {
			return Result.error(
				new DomainError('Failed to fetch notifications for recipient', 'RECIPIENT_FETCH_FAILED', {
					recipientId,
					originalError: error
				})
			);
		}
	}

	/**
	 * Get unread notifications for a specific recipient
	 * @param recipientId - The recipient's ID
	 * @returns Result containing array of unread notifications or an error
	 */
	async getUnread(
		recipientId: string
	): Promise<Result<Notification[], NotificationError | DomainError>> {
		try {
			const result = await this.repository.getUnreadNotifications(recipientId);
			if (result.isError) {
				return result;
			}
			return Result.ok(result.value);
		} catch (error) {
			return Result.error(
				new DomainError('Failed to fetch unread notifications', 'UNREAD_FETCH_FAILED', {
					recipientId,
					originalError: error
				})
			);
		}
	}

	/**
	 * Mark a notification as read
	 * @param id - The notification ID
	 * @param readAt - Optional timestamp (defaults to current time in repository)
	 * @returns Result containing the updated notification or an error
	 */
	async markAsRead(
		id: string,
		readAt?: Date
	): Promise<Result<Notification, NotificationError | DomainError>> {
		try {
			const result = await this.repository.markAsRead(id, readAt);
			if (result.isError) {
				return result;
			}
			return Result.ok(result.value);
		} catch (error) {
			return Result.error(
				new DomainError('Failed to mark notification as read', 'MARK_READ_FAILED', {
					notificationId: id,
					originalError: error
				})
			);
		}
	}

	/**
	 * Mark a notification as unread
	 * @param id - The notification ID
	 * @returns Result containing the updated notification or an error
	 */
	async markAsUnread(id: string): Promise<Result<Notification, NotificationError | DomainError>> {
		try {
			const result = await this.repository.markAsUnread(id);
			if (result.isError) {
				return result;
			}
			return Result.ok(result.value);
		} catch (error) {
			return Result.error(
				new DomainError('Failed to mark notification as unread', 'MARK_UNREAD_FAILED', {
					notificationId: id,
					originalError: error
				})
			);
		}
	}

	/**
	 * Mark all notifications for a recipient as read
	 * @param recipientId - The recipient's ID
	 * @returns Result containing the count of updated notifications or an error
	 */
	async markAllAsRead(
		recipientId: string
	): Promise<Result<number, NotificationError | DomainError>> {
		try {
			const result = await this.repository.markAllAsRead(recipientId);
			if (result.isError) {
				return result;
			}
			return Result.ok(result.value);
		} catch (error) {
			return Result.error(
				new DomainError('Failed to mark all notifications as read', 'MARK_ALL_READ_FAILED', {
					recipientId,
					originalError: error
				})
			);
		}
	}
}
