// src/adapters/graphql/GraphQLNotificationAdapter.ts
import { gql } from '@urql/core';
import { Result } from '$domain/Result';
import {
	Notification,
	NotificationType,
	NotificationCategory,
	NotificationPriority,
	NotificationTitle,
	NotificationMessage,
	ReadStatus,
	ResourceLink,
	NotificationNotFoundError,
	NotificationValidationError,
	NotificationError
} from '$domain/Notification';
import type {
	NotificationRepository,
	CreateNotificationData,
	UpdateNotificationData,
	NotificationFilter
} from '$services/ports/NotificationRepository';
import type { GraphQLPort } from '$services/ports/GraphQLPort';

/**
 * GraphQL schema response shape for notifications
 */
interface GraphQLNotification {
	id: string;
	recipientId: string;
	type: string;
	category: string;
	priority: string;
	title: string;
	message: string;
	resourceLink?: string | null;
	readStatus: string;
	createdAt: string;
	deliveredAt?: string | null;
	readAt?: string | null;
}

/**
 * GraphQLNotificationAdapter implements NotificationRepository port for GraphQL backend integration.
 *
 * Responsibilities:
 * - Translate between GraphQL API and domain entities
 * - Handle GraphQL errors and map to domain errors
 * - Resilient error handling (skip invalid data, don't throw)
 *
 * @example
 * ```typescript
 * const adapter = new GraphQLNotificationAdapter(graphqlPort);
 * const result = await adapter.findById('notification-123');
 * if (result.isOk) {
 *   console.log(result.value.title.value);
 * }
 * ```
 */
export class GraphQLNotificationAdapter implements NotificationRepository {
	constructor(private readonly graphql: GraphQLPort) {}

	async findById(id: string): Promise<Result<Notification, NotificationNotFoundError>> {
		const query = gql`
			query GetNotification($id: UUID!) {
				notification(id: $id) {
					id
					recipientId
					type
					category
					priority
					title
					message
					resourceLink
					readStatus
					createdAt
					deliveredAt
					readAt
				}
			}
		`;

		try {
			const result = await this.graphql.query<{ notification: GraphQLNotification | null }>(query, {
				id
			});

			if (!result?.notification) {
				return Result.error(new NotificationNotFoundError(id));
			}

			const notification = this.mapToNotification(result.notification);
			if (!notification) {
				return Result.error(new NotificationNotFoundError(id));
			}

			return Result.ok(notification);
		} catch (error) {
			return Result.error(new NotificationNotFoundError(id));
		}
	}

	async findAll(filter?: NotificationFilter): Promise<Result<Notification[], NotificationError>> {
		const query = gql`
			query GetNotifications(
				$recipientId: UUID
				$type: String
				$category: String
				$priority: String
				$isRead: Boolean
				$limit: Int
				$offset: Int
			) {
				notifications(
					recipientId: $recipientId
					type: $type
					category: $category
					priority: $priority
					isRead: $isRead
					limit: $limit
					offset: $offset
				) {
					id
					recipientId
					type
					category
					priority
					title
					message
					resourceLink
					readStatus
					createdAt
					deliveredAt
					readAt
				}
			}
		`;

		try {
			const result = await this.graphql.query<{ notifications: GraphQLNotification[] }>(
				query,
				filter ?? {}
			);

			const notifications = (result?.notifications ?? [])
				.map((n) => this.mapToNotification(n))
				.filter((n): n is Notification => n !== null);

			return Result.ok(notifications);
		} catch (error) {
			return Result.error(
				new NotificationError(
					`Failed to fetch notifications: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	async create(
		data: CreateNotificationData
	): Promise<Result<Notification, NotificationValidationError>> {
		const mutation = gql`
			mutation CreateNotification($input: CreateNotificationInput!) {
				createNotification(input: $input) {
					id
					recipientId
					type
					category
					priority
					title
					message
					resourceLink
					readStatus
					createdAt
					deliveredAt
					readAt
				}
			}
		`;

		try {
			const result = await this.graphql.mutation<{
				createNotification: GraphQLNotification;
			}>(mutation, { input: data });

			if (!result?.createNotification) {
				return Result.error(new NotificationValidationError('Failed to create notification'));
			}

			const notification = this.mapToNotification(result.createNotification);
			if (!notification) {
				return Result.error(new NotificationValidationError('Invalid notification data returned'));
			}

			return Result.ok(notification);
		} catch (error) {
			return Result.error(
				new NotificationValidationError(
					`Failed to create notification: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	async update(
		id: string,
		data: UpdateNotificationData
	): Promise<Result<Notification, NotificationError>> {
		const mutation = gql`
			mutation UpdateNotification($id: UUID!, $input: UpdateNotificationInput!) {
				updateNotification(id: $id, input: $input) {
					id
					recipientId
					type
					category
					priority
					title
					message
					resourceLink
					readStatus
					createdAt
					deliveredAt
					readAt
				}
			}
		`;

		try {
			const result = await this.graphql.mutation<{
				updateNotification: GraphQLNotification;
			}>(mutation, { id, input: data });

			if (!result?.updateNotification) {
				return Result.error(new NotificationNotFoundError(id));
			}

			const notification = this.mapToNotification(result.updateNotification);
			if (!notification) {
				return Result.error(new NotificationError('Invalid notification data returned'));
			}

			return Result.ok(notification);
		} catch (error) {
			return Result.error(
				new NotificationError(
					`Failed to update notification: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	async delete(id: string): Promise<Result<void, NotificationNotFoundError>> {
		const mutation = gql`
			mutation DeleteNotification($id: UUID!) {
				deleteNotification(id: $id)
			}
		`;

		try {
			const result = await this.graphql.mutation<{ deleteNotification: boolean }>(mutation, {
				id
			});

			if (!result?.deleteNotification) {
				return Result.error(new NotificationNotFoundError(id));
			}

			return Result.ok(undefined);
		} catch (error) {
			return Result.error(new NotificationNotFoundError(id));
		}
	}

	async getNotificationsForRecipient(
		recipientId: string
	): Promise<Result<Notification[], NotificationError>> {
		return this.findAll({ recipientId });
	}

	async getUnreadNotifications(
		recipientId: string
	): Promise<Result<Notification[], NotificationError>> {
		return this.findAll({ recipientId, isRead: false });
	}

	async markAsRead(id: string, readAt?: Date): Promise<Result<Notification, NotificationError>> {
		const mutation = gql`
			mutation MarkNotificationAsRead($id: UUID!, $readAt: DateTime) {
				markNotificationAsRead(id: $id, readAt: $readAt) {
					id
					recipientId
					type
					category
					priority
					title
					message
					resourceLink
					readStatus
					createdAt
					deliveredAt
					readAt
				}
			}
		`;

		try {
			const result = await this.graphql.mutation<{
				markNotificationAsRead: GraphQLNotification;
			}>(mutation, { id, readAt: readAt?.toISOString() });

			if (!result?.markNotificationAsRead) {
				return Result.error(new NotificationNotFoundError(id));
			}

			const notification = this.mapToNotification(result.markNotificationAsRead);
			if (!notification) {
				return Result.error(new NotificationError('Invalid notification data returned'));
			}

			return Result.ok(notification);
		} catch (error) {
			return Result.error(
				new NotificationError(
					`Failed to mark notification as read: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	async markAsUnread(id: string): Promise<Result<Notification, NotificationError>> {
		const mutation = gql`
			mutation MarkNotificationAsUnread($id: UUID!) {
				markNotificationAsUnread(id: $id) {
					id
					recipientId
					type
					category
					priority
					title
					message
					resourceLink
					readStatus
					createdAt
					deliveredAt
					readAt
				}
			}
		`;

		try {
			const result = await this.graphql.mutation<{
				markNotificationAsUnread: GraphQLNotification;
			}>(mutation, { id });

			if (!result?.markNotificationAsUnread) {
				return Result.error(new NotificationNotFoundError(id));
			}

			const notification = this.mapToNotification(result.markNotificationAsUnread);
			if (!notification) {
				return Result.error(new NotificationError('Invalid notification data returned'));
			}

			return Result.ok(notification);
		} catch (error) {
			return Result.error(
				new NotificationError(
					`Failed to mark notification as unread: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	async markAllAsRead(recipientId: string): Promise<Result<number, NotificationError>> {
		const mutation = gql`
			mutation MarkAllNotificationsAsRead($recipientId: UUID!) {
				markAllNotificationsAsRead(recipientId: $recipientId)
			}
		`;

		try {
			const result = await this.graphql.mutation<{ markAllNotificationsAsRead: number }>(mutation, {
				recipientId
			});

			return Result.ok(result?.markAllNotificationsAsRead ?? 0);
		} catch (error) {
			return Result.error(
				new NotificationError(
					`Failed to mark all as read: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	/**
	 * Map GraphQL notification data to domain Notification entity
	 * @private
	 * @returns Notification entity or null if data is invalid (resilient error handling)
	 */
	private mapToNotification(data: GraphQLNotification): Notification | null {
		try {
			// Create value objects with validation
			const typeResult = NotificationType.create(data.type);
			if (typeResult.isError) return null;

			const categoryResult = NotificationCategory.create(data.category);
			if (categoryResult.isError) return null;

			const priorityResult = NotificationPriority.create(data.priority);
			if (priorityResult.isError) return null;

			const titleResult = NotificationTitle.create(data.title);
			if (titleResult.isError) return null;

			const messageResult = NotificationMessage.create(data.message);
			if (messageResult.isError) return null;

			const readStatusResult = ReadStatus.create(data.readStatus);
			if (readStatusResult.isError) return null;

			let resourceLink: ResourceLink | undefined;
			if (data.resourceLink) {
				const resourceLinkResult = ResourceLink.create(data.resourceLink);
				if (resourceLinkResult.isError) return null;
				resourceLink = resourceLinkResult.value;
			}

			// Create entity
			const notificationResult = Notification.create({
				id: data.id,
				recipientId: data.recipientId,
				type: typeResult.value,
				category: categoryResult.value,
				priority: priorityResult.value,
				title: titleResult.value,
				message: messageResult.value,
				readStatus: readStatusResult.value,
				resourceLink,
				createdAt: new Date(data.createdAt),
				deliveredAt: data.deliveredAt ? new Date(data.deliveredAt) : undefined,
				readAt: data.readAt ? new Date(data.readAt) : undefined
			});

			if (notificationResult.isError) return null;

			return notificationResult.value;
		} catch (error) {
			return null; // Resilient - return null for invalid data
		}
	}
}
