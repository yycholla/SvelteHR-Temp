import { describe, it, expect } from 'vitest';
import { Notification, type NotificationProps } from './Notification';
import { NotificationType } from '../value-objects/NotificationType';
import { NotificationCategory } from '../value-objects/NotificationCategory';
import { NotificationPriority } from '../value-objects/NotificationPriority';
import { NotificationTitle } from '../value-objects/NotificationTitle';
import { NotificationMessage } from '../value-objects/NotificationMessage';
import { ReadStatus } from '../value-objects/ReadStatus';
import { ResourceLink } from '../value-objects/ResourceLink';
import { NotificationValidationError } from '../errors/NotificationErrors';

describe('Notification', () => {
	const createValidProps = (): NotificationProps => ({
		id: 'notif-123',
		recipientId: 'user-456',
		type: NotificationType.create('task_assigned').value,
		category: NotificationCategory.create('task').value,
		priority: NotificationPriority.create('normal').value,
		title: NotificationTitle.create('New Task').value,
		message: NotificationMessage.create('You have been assigned a new task.').value,
		readStatus: ReadStatus.create('unread').value,
		createdAt: new Date('2026-01-15T10:00:00Z')
	});

	describe('create()', () => {
		it('should create notification with minimum required fields', () => {
			const result = Notification.create(createValidProps());

			expect(result.isOk).toBe(true);
			expect(result.value.id).toBe('notif-123');
			expect(result.value.recipientId).toBe('user-456');
		});

		it('should create notification with resource link', () => {
			const props = {
				...createValidProps(),
				resourceLink: ResourceLink.create('https://example.com/tasks/123').value
			};
			const result = Notification.create(props);

			expect(result.isOk).toBe(true);
			expect(result.value.resourceLink).toBeDefined();
			expect(result.value.resourceLink!.toString()).toBe('https://example.com/tasks/123');
		});

		it('should create notification without resource link', () => {
			const result = Notification.create(createValidProps());

			expect(result.isOk).toBe(true);
			expect(result.value.resourceLink).toBeUndefined();
		});

		it('should create defensive copy of createdAt', () => {
			const createdAt = new Date('2026-01-15T10:00:00Z');
			const props = { ...createValidProps(), createdAt };
			const result = Notification.create(props);

			createdAt.setFullYear(2025);

			expect(result.value.createdAt.getFullYear()).toBe(2026);
		});

		it('should create defensive copy of deliveredAt', () => {
			const deliveredAt = new Date('2026-01-15T10:00:01Z');
			const props = { ...createValidProps(), deliveredAt };
			const result = Notification.create(props);

			deliveredAt.setFullYear(2025);

			expect(result.value.deliveredAt!.getFullYear()).toBe(2026);
		});

		it('should create defensive copy of readAt', () => {
			const readAt = new Date('2026-01-15T10:05:00Z');
			const props = {
				...createValidProps(),
				readStatus: ReadStatus.create('read').value,
				readAt
			};
			const result = Notification.create(props);

			readAt.setFullYear(2025);

			expect(result.value.readAt!.getFullYear()).toBe(2026);
		});

		it('should reject empty recipientId', () => {
			const props = { ...createValidProps(), recipientId: '' };
			const result = Notification.create(props);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(NotificationValidationError);
			expect(result.error.message).toContain('recipientId');
		});

		it('should reject empty id', () => {
			const props = { ...createValidProps(), id: '' };
			const result = Notification.create(props);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(NotificationValidationError);
			expect(result.error.message).toContain('id');
		});
	});

	describe('markAsRead()', () => {
		it('should mark notification as read', () => {
			const notification = Notification.create(createValidProps()).value;
			const marked = notification.markAsRead();

			expect(marked.readStatus.isRead()).toBe(true);
			expect(marked.readAt).toBeDefined();
		});

		it('should return new instance when marking as read', () => {
			const notification = Notification.create(createValidProps()).value;
			const marked = notification.markAsRead();

			expect(marked).not.toBe(notification);
			expect(notification.readStatus.isRead()).toBe(false);
		});

		it('should accept specific readAt timestamp', () => {
			const notification = Notification.create(createValidProps()).value;
			const readAt = new Date('2026-01-15T12:00:00Z');
			const marked = notification.markAsRead(readAt);

			expect(marked.readAt!.toISOString()).toBe(readAt.toISOString());
		});

		it('should use current timestamp if readAt not provided', () => {
			const notification = Notification.create(createValidProps()).value;
			const before = new Date();
			const marked = notification.markAsRead();
			const after = new Date();

			expect(marked.readAt!.getTime()).toBeGreaterThanOrEqual(before.getTime());
			expect(marked.readAt!.getTime()).toBeLessThanOrEqual(after.getTime());
		});
	});

	describe('markAsUnread()', () => {
		it('should mark notification as unread', () => {
			const props = {
				...createValidProps(),
				readStatus: ReadStatus.create('read').value,
				readAt: new Date('2026-01-15T10:05:00Z')
			};
			const notification = Notification.create(props).value;
			const unmarked = notification.markAsUnread();

			expect(unmarked.readStatus.isRead()).toBe(false);
			expect(unmarked.readAt).toBeUndefined();
		});

		it('should return new instance when marking as unread', () => {
			const props = {
				...createValidProps(),
				readStatus: ReadStatus.create('read').value,
				readAt: new Date('2026-01-15T10:05:00Z')
			};
			const notification = Notification.create(props).value;
			const unmarked = notification.markAsUnread();

			expect(unmarked).not.toBe(notification);
			expect(notification.readStatus.isRead()).toBe(true);
		});
	});

	describe('isUnread()', () => {
		it('should return true for unread notification', () => {
			const notification = Notification.create(createValidProps()).value;
			expect(notification.isUnread()).toBe(true);
		});

		it('should return false for read notification', () => {
			const props = {
				...createValidProps(),
				readStatus: ReadStatus.create('read').value,
				readAt: new Date('2026-01-15T10:05:00Z')
			};
			const notification = Notification.create(props).value;
			expect(notification.isUnread()).toBe(false);
		});
	});

	describe('hasHighPriority()', () => {
		it('should return true for urgent priority', () => {
			const props = {
				...createValidProps(),
				priority: NotificationPriority.create('urgent').value
			};
			const notification = Notification.create(props).value;
			expect(notification.hasHighPriority()).toBe(true);
		});

		it('should return true for high priority', () => {
			const props = {
				...createValidProps(),
				priority: NotificationPriority.create('high').value
			};
			const notification = Notification.create(props).value;
			expect(notification.hasHighPriority()).toBe(true);
		});

		it('should return false for normal priority', () => {
			const notification = Notification.create(createValidProps()).value;
			expect(notification.hasHighPriority()).toBe(false);
		});

		it('should return false for low priority', () => {
			const props = {
				...createValidProps(),
				priority: NotificationPriority.create('low').value
			};
			const notification = Notification.create(props).value;
			expect(notification.hasHighPriority()).toBe(false);
		});
	});

	describe('getters', () => {
		it('should return defensive copy of createdAt', () => {
			const notification = Notification.create(createValidProps()).value;
			const retrieved = notification.createdAt;

			retrieved.setFullYear(2025);

			expect(notification.createdAt.getFullYear()).toBe(2026);
		});

		it('should return defensive copy of deliveredAt', () => {
			const props = {
				...createValidProps(),
				deliveredAt: new Date('2026-01-15T10:00:01Z')
			};
			const notification = Notification.create(props).value;
			const retrieved = notification.deliveredAt!;

			retrieved.setFullYear(2025);

			expect(notification.deliveredAt!.getFullYear()).toBe(2026);
		});

		it('should return defensive copy of readAt', () => {
			const props = {
				...createValidProps(),
				readStatus: ReadStatus.create('read').value,
				readAt: new Date('2026-01-15T10:05:00Z')
			};
			const notification = Notification.create(props).value;
			const retrieved = notification.readAt!;

			retrieved.setFullYear(2025);

			expect(notification.readAt!.getFullYear()).toBe(2026);
		});
	});
});
