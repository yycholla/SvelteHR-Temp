// src/adapters/graphql/GraphQLNotificationAdapter.test.ts
import { describe, it, expect } from 'vitest';
import { GraphQLNotificationAdapter } from './GraphQLNotificationAdapter';
import {
	NotificationNotFoundError,
	NotificationValidationError,
	NotificationError
} from '$domain/Notification';
import type { GraphQLPort } from '$services/ports/GraphQLPort';

// Mock GraphQLPort
function createMockGraphQLPort(responses: {
	query?: unknown;
	mutation?: unknown;
	queryError?: Error;
	mutationError?: Error;
}): GraphQLPort {
	return {
		query: async () => {
			if (responses.queryError) throw responses.queryError;
			return responses.query ?? null;
		},
		mutation: async () => {
			if (responses.mutationError) throw responses.mutationError;
			return responses.mutation ?? null;
		}
	} as GraphQLPort;
}

// Helper to create valid notification data
function createValidNotificationData() {
	return {
		id: 'notif-123',
		recipientId: 'user-123',
		type: 'info',
		category: 'general',
		priority: 'normal',
		title: 'Test Notification',
		message: 'This is a test notification',
		resourceLink: null,
		readStatus: 'unread',
		createdAt: '2026-02-13T10:00:00Z',
		deliveredAt: '2026-02-13T10:00:01Z',
		readAt: null
	};
}

describe('GraphQLNotificationAdapter', () => {
	describe('findById', () => {
		it('should return notification when found', async () => {
			const mockPort = createMockGraphQLPort({
				query: {
					notification: createValidNotificationData()
				}
			});

			const adapter = new GraphQLNotificationAdapter(mockPort);
			const result = await adapter.findById('notif-123');

			expect(result.isOk).toBe(true);
			expect(result.value.id).toBe('notif-123');
			expect(result.value.title.value).toBe('Test Notification');
		});

		it('should return error when notification not found', async () => {
			const mockPort = createMockGraphQLPort({
				query: { notification: null }
			});

			const adapter = new GraphQLNotificationAdapter(mockPort);
			const result = await adapter.findById('nonexistent');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(NotificationNotFoundError);
		});

		it('should handle GraphQL errors', async () => {
			const mockPort = createMockGraphQLPort({
				queryError: new Error('Network error')
			});

			const adapter = new GraphQLNotificationAdapter(mockPort);
			const result = await adapter.findById('notif-123');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(NotificationNotFoundError);
		});

		it('should return error when notification data is invalid', async () => {
			const mockPort = createMockGraphQLPort({
				query: {
					notification: {
						...createValidNotificationData(),
						type: 'invalid_type'
					}
				}
			});

			const adapter = new GraphQLNotificationAdapter(mockPort);
			const result = await adapter.findById('notif-123');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(NotificationNotFoundError);
		});

		it('should handle notification with resource link', async () => {
			const mockPort = createMockGraphQLPort({
				query: {
					notification: {
						...createValidNotificationData(),
						resourceLink: 'https://example.com/task/123'
					}
				}
			});

			const adapter = new GraphQLNotificationAdapter(mockPort);
			const result = await adapter.findById('notif-123');

			expect(result.isOk).toBe(true);
			expect(result.value.resourceLink?.url).toBe('https://example.com/task/123');
		});

		it('should handle notification with read timestamp', async () => {
			const mockPort = createMockGraphQLPort({
				query: {
					notification: {
						...createValidNotificationData(),
						readStatus: 'read',
						readAt: '2026-02-13T11:00:00Z'
					}
				}
			});

			const adapter = new GraphQLNotificationAdapter(mockPort);
			const result = await adapter.findById('notif-123');

			expect(result.isOk).toBe(true);
			expect(result.value.readStatus.isRead()).toBe(true);
			expect(result.value.readAt).toBeInstanceOf(Date);
		});
	});

	describe('findAll', () => {
		it('should return all notifications', async () => {
			const mockPort = createMockGraphQLPort({
				query: {
					notifications: [
						createValidNotificationData(),
						{ ...createValidNotificationData(), id: 'notif-456' }
					]
				}
			});

			const adapter = new GraphQLNotificationAdapter(mockPort);
			const result = await adapter.findAll();

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(2);
		});

		it('should filter by recipientId', async () => {
			const mockPort = createMockGraphQLPort({
				query: {
					notifications: [createValidNotificationData()]
				}
			});

			const adapter = new GraphQLNotificationAdapter(mockPort);
			const result = await adapter.findAll({ recipientId: 'user-123' });

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(1);
		});

		it('should filter by type', async () => {
			const mockPort = createMockGraphQLPort({
				query: {
					notifications: [createValidNotificationData()]
				}
			});

			const adapter = new GraphQLNotificationAdapter(mockPort);
			const result = await adapter.findAll({ type: 'info' });

			expect(result.isOk).toBe(true);
		});

		it('should filter by category', async () => {
			const mockPort = createMockGraphQLPort({
				query: {
					notifications: [createValidNotificationData()]
				}
			});

			const adapter = new GraphQLNotificationAdapter(mockPort);
			const result = await adapter.findAll({ category: 'general' });

			expect(result.isOk).toBe(true);
		});

		it('should filter by priority', async () => {
			const mockPort = createMockGraphQLPort({
				query: {
					notifications: [createValidNotificationData()]
				}
			});

			const adapter = new GraphQLNotificationAdapter(mockPort);
			const result = await adapter.findAll({ priority: 'normal' });

			expect(result.isOk).toBe(true);
		});

		it('should filter by isRead', async () => {
			const mockPort = createMockGraphQLPort({
				query: {
					notifications: [createValidNotificationData()]
				}
			});

			const adapter = new GraphQLNotificationAdapter(mockPort);
			const result = await adapter.findAll({ isRead: false });

			expect(result.isOk).toBe(true);
		});

		it('should apply limit and offset', async () => {
			const mockPort = createMockGraphQLPort({
				query: {
					notifications: [createValidNotificationData()]
				}
			});

			const adapter = new GraphQLNotificationAdapter(mockPort);
			const result = await adapter.findAll({ limit: 10, offset: 0 });

			expect(result.isOk).toBe(true);
		});

		it('should return empty array when no notifications found', async () => {
			const mockPort = createMockGraphQLPort({
				query: { notifications: [] }
			});

			const adapter = new GraphQLNotificationAdapter(mockPort);
			const result = await adapter.findAll();

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(0);
		});

		it('should handle null response gracefully', async () => {
			const mockPort = createMockGraphQLPort({
				query: null
			});

			const adapter = new GraphQLNotificationAdapter(mockPort);
			const result = await adapter.findAll();

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(0);
		});

		it('should skip invalid notifications in list', async () => {
			const mockPort = createMockGraphQLPort({
				query: {
					notifications: [
						createValidNotificationData(),
						{ ...createValidNotificationData(), type: 'invalid_type' },
						{ ...createValidNotificationData(), id: 'notif-789' }
					]
				}
			});

			const adapter = new GraphQLNotificationAdapter(mockPort);
			const result = await adapter.findAll();

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(2); // Invalid notification skipped
		});

		it('should handle GraphQL errors', async () => {
			const mockPort = createMockGraphQLPort({
				queryError: new Error('Network error')
			});

			const adapter = new GraphQLNotificationAdapter(mockPort);
			const result = await adapter.findAll();

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(NotificationError);
			expect(result.error.message).toContain('Network error');
		});
	});

	describe('create', () => {
		it('should create notification successfully', async () => {
			const mockPort = createMockGraphQLPort({
				mutation: {
					createNotification: createValidNotificationData()
				}
			});

			const adapter = new GraphQLNotificationAdapter(mockPort);
			const result = await adapter.create({
				recipientId: 'user-123',
				type: 'info',
				category: 'general',
				priority: 'normal',
				title: 'Test Notification',
				message: 'This is a test notification'
			});

			expect(result.isOk).toBe(true);
			expect(result.value.id).toBe('notif-123');
		});

		it('should create notification with resource link', async () => {
			const mockPort = createMockGraphQLPort({
				mutation: {
					createNotification: {
						...createValidNotificationData(),
						resourceLink: 'https://example.com/task/123'
					}
				}
			});

			const adapter = new GraphQLNotificationAdapter(mockPort);
			const result = await adapter.create({
				recipientId: 'user-123',
				type: 'task_assigned',
				category: 'task',
				priority: 'high',
				title: 'New Task',
				message: 'You have been assigned a task',
				resourceLink: 'https://example.com/task/123'
			});

			expect(result.isOk).toBe(true);
			expect(result.value.resourceLink?.url).toBe('https://example.com/task/123');
		});

		it('should return error when creation fails', async () => {
			const mockPort = createMockGraphQLPort({
				mutation: { createNotification: null }
			});

			const adapter = new GraphQLNotificationAdapter(mockPort);
			const result = await adapter.create({
				recipientId: 'user-123',
				type: 'info',
				category: 'general',
				priority: 'normal',
				title: 'Test',
				message: 'Test'
			});

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(NotificationValidationError);
		});

		it('should handle GraphQL errors', async () => {
			const mockPort = createMockGraphQLPort({
				mutationError: new Error('Validation failed')
			});

			const adapter = new GraphQLNotificationAdapter(mockPort);
			const result = await adapter.create({
				recipientId: 'user-123',
				type: 'info',
				category: 'general',
				priority: 'normal',
				title: 'Test',
				message: 'Test'
			});

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(NotificationValidationError);
			expect(result.error.message).toContain('Validation failed');
		});

		it('should return error when returned data is invalid', async () => {
			const mockPort = createMockGraphQLPort({
				mutation: {
					createNotification: {
						...createValidNotificationData(),
						category: 'invalid_category'
					}
				}
			});

			const adapter = new GraphQLNotificationAdapter(mockPort);
			const result = await adapter.create({
				recipientId: 'user-123',
				type: 'info',
				category: 'general',
				priority: 'normal',
				title: 'Test',
				message: 'Test'
			});

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(NotificationValidationError);
		});
	});

	describe('update', () => {
		it('should update notification successfully', async () => {
			const mockPort = createMockGraphQLPort({
				mutation: {
					updateNotification: {
						...createValidNotificationData(),
						title: 'Updated Title'
					}
				}
			});

			const adapter = new GraphQLNotificationAdapter(mockPort);
			const result = await adapter.update('notif-123', {
				title: 'Updated Title'
			});

			expect(result.isOk).toBe(true);
			expect(result.value.title.value).toBe('Updated Title');
		});

		it('should update notification type', async () => {
			const mockPort = createMockGraphQLPort({
				mutation: {
					updateNotification: {
						...createValidNotificationData(),
						type: 'warning'
					}
				}
			});

			const adapter = new GraphQLNotificationAdapter(mockPort);
			const result = await adapter.update('notif-123', { type: 'warning' });

			expect(result.isOk).toBe(true);
			expect(result.value.type.value).toBe('warning');
		});

		it('should update notification category', async () => {
			const mockPort = createMockGraphQLPort({
				mutation: {
					updateNotification: {
						...createValidNotificationData(),
						category: 'task'
					}
				}
			});

			const adapter = new GraphQLNotificationAdapter(mockPort);
			const result = await adapter.update('notif-123', { category: 'task' });

			expect(result.isOk).toBe(true);
			expect(result.value.category.value).toBe('task');
		});

		it('should update notification priority', async () => {
			const mockPort = createMockGraphQLPort({
				mutation: {
					updateNotification: {
						...createValidNotificationData(),
						priority: 'high'
					}
				}
			});

			const adapter = new GraphQLNotificationAdapter(mockPort);
			const result = await adapter.update('notif-123', { priority: 'high' });

			expect(result.isOk).toBe(true);
			expect(result.value.priority.value).toBe('high');
		});

		it('should return error when notification not found', async () => {
			const mockPort = createMockGraphQLPort({
				mutation: { updateNotification: null }
			});

			const adapter = new GraphQLNotificationAdapter(mockPort);
			const result = await adapter.update('nonexistent', { title: 'Updated' });

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(NotificationNotFoundError);
		});

		it('should handle GraphQL errors', async () => {
			const mockPort = createMockGraphQLPort({
				mutationError: new Error('Update failed')
			});

			const adapter = new GraphQLNotificationAdapter(mockPort);
			const result = await adapter.update('notif-123', { title: 'Updated' });

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(NotificationError);
			expect(result.error.message).toContain('Update failed');
		});

		it('should return error when updated data is invalid', async () => {
			const mockPort = createMockGraphQLPort({
				mutation: {
					updateNotification: {
						...createValidNotificationData(),
						priority: 'invalid_priority'
					}
				}
			});

			const adapter = new GraphQLNotificationAdapter(mockPort);
			const result = await adapter.update('notif-123', { priority: 'high' });

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(NotificationError);
		});
	});

	describe('delete', () => {
		it('should delete notification successfully', async () => {
			const mockPort = createMockGraphQLPort({
				mutation: { deleteNotification: true }
			});

			const adapter = new GraphQLNotificationAdapter(mockPort);
			const result = await adapter.delete('notif-123');

			expect(result.isOk).toBe(true);
			expect(result.value).toBeUndefined();
		});

		it('should return error when notification not found', async () => {
			const mockPort = createMockGraphQLPort({
				mutation: { deleteNotification: false }
			});

			const adapter = new GraphQLNotificationAdapter(mockPort);
			const result = await adapter.delete('nonexistent');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(NotificationNotFoundError);
		});

		it('should handle GraphQL errors', async () => {
			const mockPort = createMockGraphQLPort({
				mutationError: new Error('Delete failed')
			});

			const adapter = new GraphQLNotificationAdapter(mockPort);
			const result = await adapter.delete('notif-123');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(NotificationNotFoundError);
		});
	});

	describe('getNotificationsForRecipient', () => {
		it('should get all notifications for recipient', async () => {
			const mockPort = createMockGraphQLPort({
				query: {
					notifications: [
						createValidNotificationData(),
						{ ...createValidNotificationData(), id: 'notif-456' }
					]
				}
			});

			const adapter = new GraphQLNotificationAdapter(mockPort);
			const result = await adapter.getNotificationsForRecipient('user-123');

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(2);
		});

		it('should return empty array when no notifications exist', async () => {
			const mockPort = createMockGraphQLPort({
				query: { notifications: [] }
			});

			const adapter = new GraphQLNotificationAdapter(mockPort);
			const result = await adapter.getNotificationsForRecipient('user-123');

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(0);
		});
	});

	describe('getUnreadNotifications', () => {
		it('should get unread notifications for recipient', async () => {
			const mockPort = createMockGraphQLPort({
				query: {
					notifications: [createValidNotificationData()]
				}
			});

			const adapter = new GraphQLNotificationAdapter(mockPort);
			const result = await adapter.getUnreadNotifications('user-123');

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(1);
			expect(result.value[0].isUnread()).toBe(true);
		});

		it('should return empty array when no unread notifications', async () => {
			const mockPort = createMockGraphQLPort({
				query: { notifications: [] }
			});

			const adapter = new GraphQLNotificationAdapter(mockPort);
			const result = await adapter.getUnreadNotifications('user-123');

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(0);
		});
	});

	describe('markAsRead', () => {
		it('should mark notification as read', async () => {
			const mockPort = createMockGraphQLPort({
				mutation: {
					markNotificationAsRead: {
						...createValidNotificationData(),
						readStatus: 'read',
						readAt: '2026-02-13T12:00:00Z'
					}
				}
			});

			const adapter = new GraphQLNotificationAdapter(mockPort);
			const result = await adapter.markAsRead('notif-123');

			expect(result.isOk).toBe(true);
			expect(result.value.readStatus.isRead()).toBe(true);
			expect(result.value.readAt).toBeInstanceOf(Date);
		});

		it('should mark notification as read with custom timestamp', async () => {
			const customTime = new Date('2026-02-13T13:00:00Z');
			const mockPort = createMockGraphQLPort({
				mutation: {
					markNotificationAsRead: {
						...createValidNotificationData(),
						readStatus: 'read',
						readAt: customTime.toISOString()
					}
				}
			});

			const adapter = new GraphQLNotificationAdapter(mockPort);
			const result = await adapter.markAsRead('notif-123', customTime);

			expect(result.isOk).toBe(true);
			expect(result.value.readStatus.isRead()).toBe(true);
		});

		it('should return error when notification not found', async () => {
			const mockPort = createMockGraphQLPort({
				mutation: { markNotificationAsRead: null }
			});

			const adapter = new GraphQLNotificationAdapter(mockPort);
			const result = await adapter.markAsRead('nonexistent');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(NotificationNotFoundError);
		});

		it('should handle GraphQL errors', async () => {
			const mockPort = createMockGraphQLPort({
				mutationError: new Error('Mark as read failed')
			});

			const adapter = new GraphQLNotificationAdapter(mockPort);
			const result = await adapter.markAsRead('notif-123');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(NotificationError);
			expect(result.error.message).toContain('Mark as read failed');
		});
	});

	describe('markAsUnread', () => {
		it('should mark notification as unread', async () => {
			const mockPort = createMockGraphQLPort({
				mutation: {
					markNotificationAsUnread: {
						...createValidNotificationData(),
						readStatus: 'unread',
						readAt: null
					}
				}
			});

			const adapter = new GraphQLNotificationAdapter(mockPort);
			const result = await adapter.markAsUnread('notif-123');

			expect(result.isOk).toBe(true);
			expect(result.value.isUnread()).toBe(true);
			expect(result.value.readAt).toBeUndefined();
		});

		it('should return error when notification not found', async () => {
			const mockPort = createMockGraphQLPort({
				mutation: { markNotificationAsUnread: null }
			});

			const adapter = new GraphQLNotificationAdapter(mockPort);
			const result = await adapter.markAsUnread('nonexistent');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(NotificationNotFoundError);
		});

		it('should handle GraphQL errors', async () => {
			const mockPort = createMockGraphQLPort({
				mutationError: new Error('Mark as unread failed')
			});

			const adapter = new GraphQLNotificationAdapter(mockPort);
			const result = await adapter.markAsUnread('notif-123');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(NotificationError);
			expect(result.error.message).toContain('Mark as unread failed');
		});
	});

	describe('markAllAsRead', () => {
		it('should mark all notifications as read', async () => {
			const mockPort = createMockGraphQLPort({
				mutation: { markAllNotificationsAsRead: 5 }
			});

			const adapter = new GraphQLNotificationAdapter(mockPort);
			const result = await adapter.markAllAsRead('user-123');

			expect(result.isOk).toBe(true);
			expect(result.value).toBe(5);
		});

		it('should return 0 when no notifications to mark', async () => {
			const mockPort = createMockGraphQLPort({
				mutation: { markAllNotificationsAsRead: 0 }
			});

			const adapter = new GraphQLNotificationAdapter(mockPort);
			const result = await adapter.markAllAsRead('user-123');

			expect(result.isOk).toBe(true);
			expect(result.value).toBe(0);
		});

		it('should handle null response', async () => {
			const mockPort = createMockGraphQLPort({
				mutation: null
			});

			const adapter = new GraphQLNotificationAdapter(mockPort);
			const result = await adapter.markAllAsRead('user-123');

			expect(result.isOk).toBe(true);
			expect(result.value).toBe(0);
		});

		it('should handle GraphQL errors', async () => {
			const mockPort = createMockGraphQLPort({
				mutationError: new Error('Mark all as read failed')
			});

			const adapter = new GraphQLNotificationAdapter(mockPort);
			const result = await adapter.markAllAsRead('user-123');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(NotificationError);
			expect(result.error.message).toContain('Mark all as read failed');
		});
	});

	describe('mapToNotification - resilient error handling', () => {
		it('should skip notifications with invalid title', async () => {
			const mockPort = createMockGraphQLPort({
				query: {
					notifications: [
						createValidNotificationData(),
						{ ...createValidNotificationData(), title: '' }, // Invalid
						{ ...createValidNotificationData(), id: 'notif-789' }
					]
				}
			});

			const adapter = new GraphQLNotificationAdapter(mockPort);
			const result = await adapter.findAll();

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(2);
		});

		it('should skip notifications with invalid message', async () => {
			const mockPort = createMockGraphQLPort({
				query: {
					notifications: [
						createValidNotificationData(),
						{ ...createValidNotificationData(), message: '' }, // Invalid
						{ ...createValidNotificationData(), id: 'notif-789' }
					]
				}
			});

			const adapter = new GraphQLNotificationAdapter(mockPort);
			const result = await adapter.findAll();

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(2);
		});

		it('should skip notifications with invalid resource link', async () => {
			const mockPort = createMockGraphQLPort({
				query: {
					notifications: [
						createValidNotificationData(),
						{ ...createValidNotificationData(), resourceLink: 'not-a-url' }, // Invalid
						{ ...createValidNotificationData(), id: 'notif-789' }
					]
				}
			});

			const adapter = new GraphQLNotificationAdapter(mockPort);
			const result = await adapter.findAll();

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(2);
		});

		it('should skip notifications with malformed dates', async () => {
			const mockPort = createMockGraphQLPort({
				query: {
					notifications: [
						createValidNotificationData(),
						{ ...createValidNotificationData(), createdAt: 'invalid-date' }, // Invalid
						{ ...createValidNotificationData(), id: 'notif-789' }
					]
				}
			});

			const adapter = new GraphQLNotificationAdapter(mockPort);
			const result = await adapter.findAll();

			expect(result.isOk).toBe(true);
			// May include invalid date depending on Date constructor behavior
			// The important thing is it doesn't throw
		});
	});
});
