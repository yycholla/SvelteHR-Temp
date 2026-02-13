// src/services/ports/NotificationRepository.ts
import { Result } from '$domain/Result';
import {
	Notification,
	NotificationNotFoundError,
	NotificationValidationError,
	NotificationError
} from '$domain/Notification';

export interface NotificationFilter {
	recipientId?: string;
	type?: string;
	category?: string;
	priority?: string;
	isRead?: boolean;
	limit?: number;
	offset?: number;
}

export interface CreateNotificationData {
	recipientId: string;
	type: string;
	category: string;
	priority: string;
	title: string;
	message: string;
	resourceLink?: string;
}

export interface UpdateNotificationData {
	type?: string;
	category?: string;
	priority?: string;
	title?: string;
	message?: string;
	resourceLink?: string;
}

export interface NotificationRepository {
	/**
	 * Find a notification by ID
	 * @returns Notification if found, NotFoundError otherwise
	 */
	findById(id: string): Promise<Result<Notification, NotificationNotFoundError>>;

	/**
	 * Find all notifications with optional filtering
	 * @returns Array of notifications or error
	 */
	findAll(filter?: NotificationFilter): Promise<Result<Notification[], NotificationError>>;

	/**
	 * Create a new notification
	 * @returns Created notification or validation error
	 */
	create(data: CreateNotificationData): Promise<Result<Notification, NotificationValidationError>>;

	/**
	 * Update an existing notification
	 * @returns Updated notification or error
	 */
	update(
		id: string,
		data: UpdateNotificationData
	): Promise<Result<Notification, NotificationError>>;

	/**
	 * Delete a notification
	 * @returns Success or not found error
	 */
	delete(id: string): Promise<Result<void, NotificationNotFoundError>>;

	/**
	 * Get all notifications for a specific recipient
	 * @returns Array of notifications for the recipient
	 */
	getNotificationsForRecipient(
		recipientId: string
	): Promise<Result<Notification[], NotificationError>>;

	/**
	 * Get unread notifications for a specific recipient
	 * @returns Array of unread notifications
	 */
	getUnreadNotifications(recipientId: string): Promise<Result<Notification[], NotificationError>>;

	/**
	 * Mark a notification as read
	 * @returns Updated notification or error
	 */
	markAsRead(id: string, readAt?: Date): Promise<Result<Notification, NotificationError>>;

	/**
	 * Mark a notification as unread
	 * @returns Updated notification or error
	 */
	markAsUnread(id: string): Promise<Result<Notification, NotificationError>>;

	/**
	 * Mark all notifications for a recipient as read
	 * @returns Count of notifications marked as read
	 */
	markAllAsRead(recipientId: string): Promise<Result<number, NotificationError>>;
}
