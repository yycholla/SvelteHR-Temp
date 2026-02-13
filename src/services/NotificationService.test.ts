// src/services/NotificationService.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotificationService } from './NotificationService';
import type {
	NotificationRepository,
	CreateNotificationData,
	UpdateNotificationData,
	NotificationFilter
} from './ports/NotificationRepository';
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
	NotificationError,
	NotificationTypeValidationError,
	NotificationCategoryValidationError,
	NotificationPriorityValidationError,
	NotificationTitleValidationError,
	NotificationMessageValidationError,
	ResourceLinkValidationError,
	type NotificationProps
} from '$domain/Notification';
import { Result } from '$domain/Result';
import { DomainError } from '$domain/errors';

// Mock Repository Implementation
class MockNotificationRepository implements NotificationRepository {
	private notifications = new Map<string, Notification>();

	async findById(id: string): Promise<Result<Notification, NotificationNotFoundError>> {
		const notification = this.notifications.get(id);
		if (!notification) {
			return Result.error(new NotificationNotFoundError(id));
		}
		return Result.ok(notification);
	}

	async findAll(filter?: NotificationFilter): Promise<Result<Notification[], NotificationError>> {
		let results = Array.from(this.notifications.values());

		if (filter?.recipientId) {
			results = results.filter((n) => n.recipientId === filter.recipientId);
		}

		if (filter?.type) {
			results = results.filter((n) => n.type.value === filter.type);
		}

		if (filter?.category) {
			results = results.filter((n) => n.category.value === filter.category);
		}

		if (filter?.priority) {
			results = results.filter((n) => n.priority.value === filter.priority);
		}

		if (filter?.isRead !== undefined) {
			results = results.filter((n) => n.readStatus.isRead() === filter.isRead);
		}

		// Apply pagination
		const offset = filter?.offset ?? 0;
		const limit = filter?.limit ?? results.length;
		results = results.slice(offset, offset + limit);

		return Result.ok(results);
	}

	async create(data: CreateNotificationData): Promise<Result<Notification, NotificationError>> {
		const id = crypto.randomUUID();
		const notificationProps: NotificationProps = {
			id,
			recipientId: data.recipientId,
			type: NotificationType.create(data.type).value,
			category: NotificationCategory.create(data.category).value,
			priority: NotificationPriority.create(data.priority).value,
			title: NotificationTitle.create(data.title).value,
			message: NotificationMessage.create(data.message).value,
			readStatus: ReadStatus.create('unread').value,
			resourceLink: data.resourceLink ? ResourceLink.create(data.resourceLink).value : undefined,
			createdAt: new Date()
		};

		const result = Notification.create(notificationProps);
		if (result.isError) {
			return Result.error(result.error);
		}

		this.notifications.set(id, result.value);
		return Result.ok(result.value);
	}

	async update(
		id: string,
		data: UpdateNotificationData
	): Promise<Result<Notification, NotificationError>> {
		const existing = this.notifications.get(id);
		if (!existing) {
			return Result.error(new NotificationNotFoundError(id));
		}

		// Validate updated fields
		let type = existing.type;
		if (data.type !== undefined) {
			const typeResult = NotificationType.create(data.type);
			if (typeResult.isError) return Result.error(typeResult.error);
			type = typeResult.value;
		}

		let category = existing.category;
		if (data.category !== undefined) {
			const categoryResult = NotificationCategory.create(data.category);
			if (categoryResult.isError) return Result.error(categoryResult.error);
			category = categoryResult.value;
		}

		let priority = existing.priority;
		if (data.priority !== undefined) {
			const priorityResult = NotificationPriority.create(data.priority);
			if (priorityResult.isError) return Result.error(priorityResult.error);
			priority = priorityResult.value;
		}

		let title = existing.title;
		if (data.title !== undefined) {
			const titleResult = NotificationTitle.create(data.title);
			if (titleResult.isError) return Result.error(titleResult.error);
			title = titleResult.value;
		}

		let message = existing.message;
		if (data.message !== undefined) {
			const messageResult = NotificationMessage.create(data.message);
			if (messageResult.isError) return Result.error(messageResult.error);
			message = messageResult.value;
		}

		let resourceLink = existing.resourceLink;
		if (data.resourceLink !== undefined) {
			const linkResult = ResourceLink.create(data.resourceLink);
			if (linkResult.isError) return Result.error(linkResult.error);
			resourceLink = linkResult.value;
		}

		// Build updated props
		const updatedProps: NotificationProps = {
			id: existing.id,
			recipientId: existing.recipientId,
			type,
			category,
			priority,
			title,
			message,
			readStatus: existing.readStatus,
			resourceLink,
			createdAt: existing.createdAt,
			deliveredAt: existing.deliveredAt,
			readAt: existing.readAt
		};

		const result = Notification.create(updatedProps);
		if (result.isError) {
			return Result.error(result.error);
		}

		this.notifications.set(id, result.value);
		return Result.ok(result.value);
	}

	async delete(id: string): Promise<Result<void, NotificationNotFoundError>> {
		if (!this.notifications.has(id)) {
			return Result.error(new NotificationNotFoundError(id));
		}
		this.notifications.delete(id);
		return Result.ok(undefined);
	}

	async getNotificationsForRecipient(
		recipientId: string
	): Promise<Result<Notification[], NotificationError>> {
		const results = Array.from(this.notifications.values()).filter(
			(n) => n.recipientId === recipientId
		);
		return Result.ok(results);
	}

	async getUnreadNotifications(
		recipientId: string
	): Promise<Result<Notification[], NotificationError>> {
		const results = Array.from(this.notifications.values()).filter(
			(n) => n.recipientId === recipientId && n.isUnread()
		);
		return Result.ok(results);
	}

	async markAsRead(id: string, readAt?: Date): Promise<Result<Notification, NotificationError>> {
		const notification = this.notifications.get(id);
		if (!notification) {
			return Result.error(new NotificationNotFoundError(id));
		}

		const updated = notification.markAsRead(readAt);
		this.notifications.set(id, updated);
		return Result.ok(updated);
	}

	async markAsUnread(id: string): Promise<Result<Notification, NotificationError>> {
		const notification = this.notifications.get(id);
		if (!notification) {
			return Result.error(new NotificationNotFoundError(id));
		}

		const updated = notification.markAsUnread();
		this.notifications.set(id, updated);
		return Result.ok(updated);
	}

	async markAllAsRead(recipientId: string): Promise<Result<number, NotificationError>> {
		const notifications = Array.from(this.notifications.values()).filter(
			(n) => n.recipientId === recipientId && n.isUnread()
		);

		for (const notification of notifications) {
			const updated = notification.markAsRead();
			this.notifications.set(notification.id, updated);
		}

		return Result.ok(notifications.length);
	}

	// Test helpers
	clear(): void {
		this.notifications.clear();
	}
}

// Helper to create test notification
const createTestNotification = (overrides?: Partial<NotificationProps>): Notification => {
	const props: NotificationProps = {
		id: crypto.randomUUID(),
		recipientId: 'user-123',
		type: NotificationType.create('info').value,
		category: NotificationCategory.create('general').value,
		priority: NotificationPriority.create('normal').value,
		title: NotificationTitle.create('Test Notification').value,
		message: NotificationMessage.create('This is a test notification').value,
		readStatus: ReadStatus.create('unread').value,
		createdAt: new Date(),
		...overrides
	};

	return Notification.create(props).value;
};

describe('NotificationService - getById', () => {
	let service: NotificationService;
	let repository: MockNotificationRepository;

	beforeEach(() => {
		repository = new MockNotificationRepository();
		service = new NotificationService(repository);
	});

	it('returns notification with valid ID', async () => {
		const created = await repository.create({
			recipientId: 'user-123',
			type: 'info',
			category: 'general',
			priority: 'normal',
			title: 'Test Notification',
			message: 'This is a test notification'
		});

		const result = await service.getById(created.value.id);

		expect(result.isOk).toBe(true);
		expect(result.value.recipientId).toBe('user-123');
	});

	it('returns NotificationNotFoundError for invalid ID', async () => {
		const result = await service.getById('nonexistent-id');

		expect(result.isError).toBe(true);
		expect(result.error).toBeInstanceOf(NotificationNotFoundError);
	});

	it('handles repository errors gracefully', async () => {
		vi.spyOn(repository, 'findById').mockRejectedValueOnce(new Error('Database error'));

		const result = await service.getById('test-id');

		expect(result.isError).toBe(true);
		expect(result.error).toBeInstanceOf(DomainError);
		expect(result.error.code).toBe('NOTIFICATION_FETCH_FAILED');
	});
});

describe('NotificationService - getAll', () => {
	let service: NotificationService;
	let repository: MockNotificationRepository;

	beforeEach(() => {
		repository = new MockNotificationRepository();
		service = new NotificationService(repository);
	});

	it('returns all notifications without filters', async () => {
		await repository.create({
			recipientId: 'user-1',
			type: 'info',
			category: 'general',
			priority: 'normal',
			title: 'Test 1',
			message: 'Message 1'
		});
		await repository.create({
			recipientId: 'user-2',
			type: 'warning',
			category: 'task',
			priority: 'high',
			title: 'Test 2',
			message: 'Message 2'
		});

		const result = await service.getAll();

		expect(result.isOk).toBe(true);
		expect(result.value).toHaveLength(2);
	});

	it('filters by recipientId', async () => {
		await repository.create({
			recipientId: 'user-1',
			type: 'info',
			category: 'general',
			priority: 'normal',
			title: 'Test 1',
			message: 'Message 1'
		});
		await repository.create({
			recipientId: 'user-2',
			type: 'warning',
			category: 'task',
			priority: 'high',
			title: 'Test 2',
			message: 'Message 2'
		});

		const result = await service.getAll({ recipientId: 'user-1' });

		expect(result.isOk).toBe(true);
		expect(result.value).toHaveLength(1);
		expect(result.value[0].recipientId).toBe('user-1');
	});

	it('filters by type', async () => {
		await repository.create({
			recipientId: 'user-1',
			type: 'info',
			category: 'general',
			priority: 'normal',
			title: 'Test 1',
			message: 'Message 1'
		});
		await repository.create({
			recipientId: 'user-1',
			type: 'warning',
			category: 'general',
			priority: 'high',
			title: 'Test 2',
			message: 'Message 2'
		});

		const result = await service.getAll({ type: 'warning' });

		expect(result.isOk).toBe(true);
		expect(result.value).toHaveLength(1);
		expect(result.value[0].type.value).toBe('warning');
	});

	it('filters by category', async () => {
		await repository.create({
			recipientId: 'user-1',
			type: 'info',
			category: 'general',
			priority: 'normal',
			title: 'Test 1',
			message: 'Message 1'
		});
		await repository.create({
			recipientId: 'user-1',
			type: 'info',
			category: 'task',
			priority: 'normal',
			title: 'Test 2',
			message: 'Message 2'
		});

		const result = await service.getAll({ category: 'task' });

		expect(result.isOk).toBe(true);
		expect(result.value).toHaveLength(1);
		expect(result.value[0].category.value).toBe('task');
	});

	it('filters by priority', async () => {
		await repository.create({
			recipientId: 'user-1',
			type: 'info',
			category: 'general',
			priority: 'low',
			title: 'Test 1',
			message: 'Message 1'
		});
		await repository.create({
			recipientId: 'user-1',
			type: 'info',
			category: 'general',
			priority: 'high',
			title: 'Test 2',
			message: 'Message 2'
		});

		const result = await service.getAll({ priority: 'high' });

		expect(result.isOk).toBe(true);
		expect(result.value).toHaveLength(1);
		expect(result.value[0].priority.value).toBe('high');
	});

	it('filters by read status', async () => {
		const notification = await repository.create({
			recipientId: 'user-1',
			type: 'info',
			category: 'general',
			priority: 'normal',
			title: 'Test 1',
			message: 'Message 1'
		});
		await repository.create({
			recipientId: 'user-1',
			type: 'info',
			category: 'general',
			priority: 'normal',
			title: 'Test 2',
			message: 'Message 2'
		});

		// Mark one as read
		if (notification.isOk) {
			await repository.markAsRead(notification.value.id);
		}

		const unreadResult = await service.getAll({ isRead: false });

		expect(unreadResult.isOk).toBe(true);
		expect(unreadResult.value).toHaveLength(1);
	});

	it('applies pagination with limit', async () => {
		for (let i = 0; i < 5; i++) {
			await repository.create({
				recipientId: 'user-1',
				type: 'info',
				category: 'general',
				priority: 'normal',
				title: `Test ${i}`,
				message: `Message ${i}`
			});
		}

		const result = await service.getAll({ limit: 2 });

		expect(result.isOk).toBe(true);
		expect(result.value).toHaveLength(2);
	});

	it('applies pagination with offset', async () => {
		for (let i = 0; i < 5; i++) {
			await repository.create({
				recipientId: 'user-1',
				type: 'info',
				category: 'general',
				priority: 'normal',
				title: `Test ${i}`,
				message: `Message ${i}`
			});
		}

		const result = await service.getAll({ offset: 2, limit: 2 });

		expect(result.isOk).toBe(true);
		expect(result.value).toHaveLength(2);
	});

	it('returns empty array when no notifications match', async () => {
		const result = await service.getAll({ recipientId: 'nonexistent-user' });

		expect(result.isOk).toBe(true);
		expect(result.value).toHaveLength(0);
	});

	it('handles repository errors gracefully', async () => {
		vi.spyOn(repository, 'findAll').mockRejectedValueOnce(new Error('Database error'));

		const result = await service.getAll();

		expect(result.isError).toBe(true);
		expect(result.error).toBeInstanceOf(DomainError);
		expect(result.error.code).toBe('NOTIFICATIONS_FETCH_FAILED');
	});
});

describe('NotificationService - create', () => {
	let service: NotificationService;
	let repository: MockNotificationRepository;

	beforeEach(() => {
		repository = new MockNotificationRepository();
		service = new NotificationService(repository);
	});

	it('creates notification with valid data', async () => {
		const data: CreateNotificationData = {
			recipientId: 'user-123',
			type: 'info',
			category: 'general',
			priority: 'normal',
			title: 'Welcome',
			message: 'Welcome to the system'
		};

		const result = await service.create(data);

		expect(result.isOk).toBe(true);
		expect(result.value.recipientId).toBe('user-123');
		expect(result.value.title.value).toBe('Welcome');
	});

	it('creates notification with resource link', async () => {
		const data: CreateNotificationData = {
			recipientId: 'user-123',
			type: 'info',
			category: 'general',
			priority: 'normal',
			title: 'Task Assigned',
			message: 'You have a new task',
			resourceLink: 'https://app.example.com/tasks/123'
		};

		const result = await service.create(data);

		expect(result.isOk).toBe(true);
		expect(result.value.resourceLink?.value).toBe('https://app.example.com/tasks/123');
	});

	it('returns error for invalid type', async () => {
		const data: CreateNotificationData = {
			recipientId: 'user-123',
			type: 'invalid-type',
			category: 'general',
			priority: 'normal',
			title: 'Test',
			message: 'Test message'
		};

		const result = await service.create(data);

		expect(result.isError).toBe(true);
		expect(result.error).toBeInstanceOf(NotificationTypeValidationError);
	});

	it('returns error for invalid category', async () => {
		const data: CreateNotificationData = {
			recipientId: 'user-123',
			type: 'info',
			category: 'invalid-category',
			priority: 'normal',
			title: 'Test',
			message: 'Test message'
		};

		const result = await service.create(data);

		expect(result.isError).toBe(true);
		expect(result.error).toBeInstanceOf(NotificationCategoryValidationError);
	});

	it('returns error for invalid priority', async () => {
		const data: CreateNotificationData = {
			recipientId: 'user-123',
			type: 'info',
			category: 'general',
			priority: 'invalid-priority',
			title: 'Test',
			message: 'Test message'
		};

		const result = await service.create(data);

		expect(result.isError).toBe(true);
		expect(result.error).toBeInstanceOf(NotificationPriorityValidationError);
	});

	it('returns error for empty title', async () => {
		const data: CreateNotificationData = {
			recipientId: 'user-123',
			type: 'info',
			category: 'general',
			priority: 'normal',
			title: '',
			message: 'Test message'
		};

		const result = await service.create(data);

		expect(result.isError).toBe(true);
		expect(result.error).toBeInstanceOf(NotificationTitleValidationError);
	});

	it('returns error for title exceeding max length', async () => {
		const data: CreateNotificationData = {
			recipientId: 'user-123',
			type: 'info',
			category: 'general',
			priority: 'normal',
			title: 'A'.repeat(201),
			message: 'Test message'
		};

		const result = await service.create(data);

		expect(result.isError).toBe(true);
		expect(result.error).toBeInstanceOf(NotificationTitleValidationError);
	});

	it('returns error for empty message', async () => {
		const data: CreateNotificationData = {
			recipientId: 'user-123',
			type: 'info',
			category: 'general',
			priority: 'normal',
			title: 'Test',
			message: ''
		};

		const result = await service.create(data);

		expect(result.isError).toBe(true);
		expect(result.error).toBeInstanceOf(NotificationMessageValidationError);
	});

	it('returns error for message exceeding max length', async () => {
		const data: CreateNotificationData = {
			recipientId: 'user-123',
			type: 'info',
			category: 'general',
			priority: 'normal',
			title: 'Test',
			message: 'A'.repeat(1001)
		};

		const result = await service.create(data);

		expect(result.isError).toBe(true);
		expect(result.error).toBeInstanceOf(NotificationMessageValidationError);
	});

	it('returns error for invalid resource link', async () => {
		const data: CreateNotificationData = {
			recipientId: 'user-123',
			type: 'info',
			category: 'general',
			priority: 'normal',
			title: 'Test',
			message: 'Test message',
			resourceLink: 'invalid-url'
		};

		const result = await service.create(data);

		expect(result.isError).toBe(true);
		expect(result.error).toBeInstanceOf(ResourceLinkValidationError);
	});

	it('handles repository errors gracefully', async () => {
		vi.spyOn(repository, 'create').mockRejectedValueOnce(new Error('Database error'));

		const data: CreateNotificationData = {
			recipientId: 'user-123',
			type: 'info',
			category: 'general',
			priority: 'normal',
			title: 'Test',
			message: 'Test message'
		};

		const result = await service.create(data);

		expect(result.isError).toBe(true);
		expect(result.error).toBeInstanceOf(DomainError);
		expect(result.error.code).toBe('NOTIFICATION_CREATE_FAILED');
	});
});

describe('NotificationService - update', () => {
	let service: NotificationService;
	let repository: MockNotificationRepository;

	beforeEach(() => {
		repository = new MockNotificationRepository();
		service = new NotificationService(repository);
	});

	it('updates notification title', async () => {
		const created = await repository.create({
			recipientId: 'user-123',
			type: 'info',
			category: 'general',
			priority: 'normal',
			title: 'Original Title',
			message: 'Original Message'
		});

		const result = await service.update(created.value.id, {
			title: 'Updated Title'
		});

		expect(result.isOk).toBe(true);
		expect(result.value.title.value).toBe('Updated Title');
	});

	it('updates notification message', async () => {
		const created = await repository.create({
			recipientId: 'user-123',
			type: 'info',
			category: 'general',
			priority: 'normal',
			title: 'Title',
			message: 'Original Message'
		});

		const result = await service.update(created.value.id, {
			message: 'Updated Message'
		});

		expect(result.isOk).toBe(true);
		expect(result.value.message.value).toBe('Updated Message');
	});

	it('updates notification type', async () => {
		const created = await repository.create({
			recipientId: 'user-123',
			type: 'info',
			category: 'general',
			priority: 'normal',
			title: 'Title',
			message: 'Message'
		});

		const result = await service.update(created.value.id, {
			type: 'warning'
		});

		expect(result.isOk).toBe(true);
		expect(result.value.type.value).toBe('warning');
	});

	it('updates notification category', async () => {
		const created = await repository.create({
			recipientId: 'user-123',
			type: 'info',
			category: 'general',
			priority: 'normal',
			title: 'Title',
			message: 'Message'
		});

		const result = await service.update(created.value.id, {
			category: 'task'
		});

		expect(result.isOk).toBe(true);
		expect(result.value.category.value).toBe('task');
	});

	it('updates notification priority', async () => {
		const created = await repository.create({
			recipientId: 'user-123',
			type: 'info',
			category: 'general',
			priority: 'normal',
			title: 'Title',
			message: 'Message'
		});

		const result = await service.update(created.value.id, {
			priority: 'high'
		});

		expect(result.isOk).toBe(true);
		expect(result.value.priority.value).toBe('high');
	});

	it('updates notification resource link', async () => {
		const created = await repository.create({
			recipientId: 'user-123',
			type: 'info',
			category: 'general',
			priority: 'normal',
			title: 'Title',
			message: 'Message'
		});

		const result = await service.update(created.value.id, {
			resourceLink: 'https://app.example.com/tasks/456'
		});

		expect(result.isOk).toBe(true);
		expect(result.value.resourceLink?.value).toBe('https://app.example.com/tasks/456');
	});

	it('updates multiple fields at once', async () => {
		const created = await repository.create({
			recipientId: 'user-123',
			type: 'info',
			category: 'general',
			priority: 'normal',
			title: 'Original',
			message: 'Original'
		});

		const result = await service.update(created.value.id, {
			title: 'Updated Title',
			message: 'Updated Message',
			priority: 'high'
		});

		expect(result.isOk).toBe(true);
		expect(result.value.title.value).toBe('Updated Title');
		expect(result.value.message.value).toBe('Updated Message');
		expect(result.value.priority.value).toBe('high');
	});

	it('returns error for invalid type', async () => {
		const created = await repository.create({
			recipientId: 'user-123',
			type: 'info',
			category: 'general',
			priority: 'normal',
			title: 'Title',
			message: 'Message'
		});

		const result = await service.update(created.value.id, {
			type: 'invalid-type'
		});

		expect(result.isError).toBe(true);
		expect(result.error).toBeInstanceOf(NotificationTypeValidationError);
	});

	it('returns error for invalid category', async () => {
		const created = await repository.create({
			recipientId: 'user-123',
			type: 'info',
			category: 'general',
			priority: 'normal',
			title: 'Title',
			message: 'Message'
		});

		const result = await service.update(created.value.id, {
			category: 'invalid-category'
		});

		expect(result.isError).toBe(true);
		expect(result.error).toBeInstanceOf(NotificationCategoryValidationError);
	});

	it('returns error for invalid priority', async () => {
		const created = await repository.create({
			recipientId: 'user-123',
			type: 'info',
			category: 'general',
			priority: 'normal',
			title: 'Title',
			message: 'Message'
		});

		const result = await service.update(created.value.id, {
			priority: 'invalid-priority'
		});

		expect(result.isError).toBe(true);
		expect(result.error).toBeInstanceOf(NotificationPriorityValidationError);
	});

	it('returns error for invalid title', async () => {
		const created = await repository.create({
			recipientId: 'user-123',
			type: 'info',
			category: 'general',
			priority: 'normal',
			title: 'Title',
			message: 'Message'
		});

		const result = await service.update(created.value.id, {
			title: ''
		});

		expect(result.isError).toBe(true);
		expect(result.error).toBeInstanceOf(NotificationTitleValidationError);
	});

	it('returns error for invalid message', async () => {
		const created = await repository.create({
			recipientId: 'user-123',
			type: 'info',
			category: 'general',
			priority: 'normal',
			title: 'Title',
			message: 'Message'
		});

		const result = await service.update(created.value.id, {
			message: ''
		});

		expect(result.isError).toBe(true);
		expect(result.error).toBeInstanceOf(NotificationMessageValidationError);
	});

	it('returns error for invalid resource link', async () => {
		const created = await repository.create({
			recipientId: 'user-123',
			type: 'info',
			category: 'general',
			priority: 'normal',
			title: 'Title',
			message: 'Message'
		});

		const result = await service.update(created.value.id, {
			resourceLink: 'not-a-valid-url'
		});

		expect(result.isError).toBe(true);
		expect(result.error).toBeInstanceOf(ResourceLinkValidationError);
	});

	it('returns error for nonexistent notification', async () => {
		const result = await service.update('nonexistent-id', {
			title: 'Updated'
		});

		expect(result.isError).toBe(true);
		expect(result.error).toBeInstanceOf(NotificationNotFoundError);
	});

	it('handles repository errors gracefully', async () => {
		const created = await repository.create({
			recipientId: 'user-123',
			type: 'info',
			category: 'general',
			priority: 'normal',
			title: 'Title',
			message: 'Message'
		});

		vi.spyOn(repository, 'update').mockRejectedValueOnce(new Error('Database error'));

		const result = await service.update(created.value.id, {
			title: 'Updated'
		});

		expect(result.isError).toBe(true);
		expect(result.error).toBeInstanceOf(DomainError);
		expect(result.error.code).toBe('NOTIFICATION_UPDATE_FAILED');
	});
});

describe('NotificationService - delete', () => {
	let service: NotificationService;
	let repository: MockNotificationRepository;

	beforeEach(() => {
		repository = new MockNotificationRepository();
		service = new NotificationService(repository);
	});

	it('deletes existing notification', async () => {
		const created = await repository.create({
			recipientId: 'user-123',
			type: 'info',
			category: 'general',
			priority: 'normal',
			title: 'Title',
			message: 'Message'
		});

		const result = await service.delete(created.value.id);

		expect(result.isOk).toBe(true);

		const getResult = await service.getById(created.value.id);
		expect(getResult.isError).toBe(true);
	});

	it('returns error for nonexistent notification', async () => {
		const result = await service.delete('nonexistent-id');

		expect(result.isError).toBe(true);
		expect(result.error).toBeInstanceOf(NotificationNotFoundError);
	});

	it('handles repository errors gracefully', async () => {
		vi.spyOn(repository, 'delete').mockRejectedValueOnce(new Error('Database error'));

		const result = await service.delete('test-id');

		expect(result.isError).toBe(true);
		expect(result.error).toBeInstanceOf(DomainError);
		expect(result.error.code).toBe('NOTIFICATION_DELETE_FAILED');
	});
});

describe('NotificationService - getForRecipient', () => {
	let service: NotificationService;
	let repository: MockNotificationRepository;

	beforeEach(() => {
		repository = new MockNotificationRepository();
		service = new NotificationService(repository);
	});

	it('returns all notifications for recipient', async () => {
		await repository.create({
			recipientId: 'user-123',
			type: 'info',
			category: 'general',
			priority: 'normal',
			title: 'Test 1',
			message: 'Message 1'
		});
		await repository.create({
			recipientId: 'user-123',
			type: 'warning',
			category: 'task',
			priority: 'high',
			title: 'Test 2',
			message: 'Message 2'
		});
		await repository.create({
			recipientId: 'user-456',
			type: 'info',
			category: 'general',
			priority: 'low',
			title: 'Test 3',
			message: 'Message 3'
		});

		const result = await service.getForRecipient('user-123');

		expect(result.isOk).toBe(true);
		expect(result.value).toHaveLength(2);
		expect(result.value.every((n) => n.recipientId === 'user-123')).toBe(true);
	});

	it('returns empty array for recipient with no notifications', async () => {
		const result = await service.getForRecipient('user-123');

		expect(result.isOk).toBe(true);
		expect(result.value).toHaveLength(0);
	});

	it('handles repository errors gracefully', async () => {
		vi.spyOn(repository, 'getNotificationsForRecipient').mockRejectedValueOnce(
			new Error('Database error')
		);

		const result = await service.getForRecipient('user-123');

		expect(result.isError).toBe(true);
		expect(result.error).toBeInstanceOf(DomainError);
		expect(result.error.code).toBe('RECIPIENT_FETCH_FAILED');
	});
});

describe('NotificationService - getUnread', () => {
	let service: NotificationService;
	let repository: MockNotificationRepository;

	beforeEach(() => {
		repository = new MockNotificationRepository();
		service = new NotificationService(repository);
	});

	it('returns only unread notifications for recipient', async () => {
		const notification1 = await repository.create({
			recipientId: 'user-123',
			type: 'info',
			category: 'general',
			priority: 'normal',
			title: 'Test 1',
			message: 'Message 1'
		});
		await repository.create({
			recipientId: 'user-123',
			type: 'warning',
			category: 'task',
			priority: 'high',
			title: 'Test 2',
			message: 'Message 2'
		});

		// Mark one as read
		await repository.markAsRead(notification1.value.id);

		const result = await service.getUnread('user-123');

		expect(result.isOk).toBe(true);
		expect(result.value).toHaveLength(1);
		expect(result.value[0].isUnread()).toBe(true);
	});

	it('returns empty array when all notifications are read', async () => {
		const notification1 = await repository.create({
			recipientId: 'user-123',
			type: 'info',
			category: 'general',
			priority: 'normal',
			title: 'Test 1',
			message: 'Message 1'
		});
		const notification2 = await repository.create({
			recipientId: 'user-123',
			type: 'warning',
			category: 'task',
			priority: 'high',
			title: 'Test 2',
			message: 'Message 2'
		});

		await repository.markAsRead(notification1.value.id);
		await repository.markAsRead(notification2.value.id);

		const result = await service.getUnread('user-123');

		expect(result.isOk).toBe(true);
		expect(result.value).toHaveLength(0);
	});

	it('returns empty array for recipient with no notifications', async () => {
		const result = await service.getUnread('user-123');

		expect(result.isOk).toBe(true);
		expect(result.value).toHaveLength(0);
	});

	it('handles repository errors gracefully', async () => {
		vi.spyOn(repository, 'getUnreadNotifications').mockRejectedValueOnce(
			new Error('Database error')
		);

		const result = await service.getUnread('user-123');

		expect(result.isError).toBe(true);
		expect(result.error).toBeInstanceOf(DomainError);
		expect(result.error.code).toBe('UNREAD_FETCH_FAILED');
	});
});

describe('NotificationService - markAsRead', () => {
	let service: NotificationService;
	let repository: MockNotificationRepository;

	beforeEach(() => {
		repository = new MockNotificationRepository();
		service = new NotificationService(repository);
	});

	it('marks notification as read without timestamp', async () => {
		const created = await repository.create({
			recipientId: 'user-123',
			type: 'info',
			category: 'general',
			priority: 'normal',
			title: 'Test',
			message: 'Message'
		});

		const result = await service.markAsRead(created.value.id);

		expect(result.isOk).toBe(true);
		expect(result.value.readStatus.isRead()).toBe(true);
		expect(result.value.readAt).toBeDefined();
	});

	it('marks notification as read with custom timestamp', async () => {
		const created = await repository.create({
			recipientId: 'user-123',
			type: 'info',
			category: 'general',
			priority: 'normal',
			title: 'Test',
			message: 'Message'
		});

		const customTimestamp = new Date('2024-01-01T10:00:00Z');
		const result = await service.markAsRead(created.value.id, customTimestamp);

		expect(result.isOk).toBe(true);
		expect(result.value.readStatus.isRead()).toBe(true);
		expect(result.value.readAt?.getTime()).toBe(customTimestamp.getTime());
	});

	it('returns error for nonexistent notification', async () => {
		const result = await service.markAsRead('nonexistent-id');

		expect(result.isError).toBe(true);
		expect(result.error).toBeInstanceOf(NotificationNotFoundError);
	});

	it('handles repository errors gracefully', async () => {
		vi.spyOn(repository, 'markAsRead').mockRejectedValueOnce(new Error('Database error'));

		const result = await service.markAsRead('test-id');

		expect(result.isError).toBe(true);
		expect(result.error).toBeInstanceOf(DomainError);
		expect(result.error.code).toBe('MARK_READ_FAILED');
	});
});

describe('NotificationService - markAsUnread', () => {
	let service: NotificationService;
	let repository: MockNotificationRepository;

	beforeEach(() => {
		repository = new MockNotificationRepository();
		service = new NotificationService(repository);
	});

	it('marks notification as unread', async () => {
		const created = await repository.create({
			recipientId: 'user-123',
			type: 'info',
			category: 'general',
			priority: 'normal',
			title: 'Test',
			message: 'Message'
		});

		// First mark as read
		await repository.markAsRead(created.value.id);

		// Then mark as unread
		const result = await service.markAsUnread(created.value.id);

		expect(result.isOk).toBe(true);
		expect(result.value.isUnread()).toBe(true);
		expect(result.value.readAt).toBeUndefined();
	});

	it('returns error for nonexistent notification', async () => {
		const result = await service.markAsUnread('nonexistent-id');

		expect(result.isError).toBe(true);
		expect(result.error).toBeInstanceOf(NotificationNotFoundError);
	});

	it('handles repository errors gracefully', async () => {
		vi.spyOn(repository, 'markAsUnread').mockRejectedValueOnce(new Error('Database error'));

		const result = await service.markAsUnread('test-id');

		expect(result.isError).toBe(true);
		expect(result.error).toBeInstanceOf(DomainError);
		expect(result.error.code).toBe('MARK_UNREAD_FAILED');
	});
});

describe('NotificationService - markAllAsRead', () => {
	let service: NotificationService;
	let repository: MockNotificationRepository;

	beforeEach(() => {
		repository = new MockNotificationRepository();
		service = new NotificationService(repository);
	});

	it('marks all unread notifications as read for recipient', async () => {
		await repository.create({
			recipientId: 'user-123',
			type: 'info',
			category: 'general',
			priority: 'normal',
			title: 'Test 1',
			message: 'Message 1'
		});
		await repository.create({
			recipientId: 'user-123',
			type: 'warning',
			category: 'task',
			priority: 'high',
			title: 'Test 2',
			message: 'Message 2'
		});

		const result = await service.markAllAsRead('user-123');

		expect(result.isOk).toBe(true);
		expect(result.value).toBe(2);

		const unreadResult = await service.getUnread('user-123');
		expect(unreadResult.value).toHaveLength(0);
	});

	it('returns count of 0 when no unread notifications exist', async () => {
		const notification = await repository.create({
			recipientId: 'user-123',
			type: 'info',
			category: 'general',
			priority: 'normal',
			title: 'Test',
			message: 'Message'
		});

		// Mark as read first
		await repository.markAsRead(notification.value.id);

		const result = await service.markAllAsRead('user-123');

		expect(result.isOk).toBe(true);
		expect(result.value).toBe(0);
	});

	it('only marks notifications for specified recipient', async () => {
		await repository.create({
			recipientId: 'user-123',
			type: 'info',
			category: 'general',
			priority: 'normal',
			title: 'Test 1',
			message: 'Message 1'
		});
		await repository.create({
			recipientId: 'user-456',
			type: 'info',
			category: 'general',
			priority: 'normal',
			title: 'Test 2',
			message: 'Message 2'
		});

		const result = await service.markAllAsRead('user-123');

		expect(result.isOk).toBe(true);
		expect(result.value).toBe(1);

		const user456Unread = await service.getUnread('user-456');
		expect(user456Unread.value).toHaveLength(1);
	});

	it('handles repository errors gracefully', async () => {
		vi.spyOn(repository, 'markAllAsRead').mockRejectedValueOnce(new Error('Database error'));

		const result = await service.markAllAsRead('user-123');

		expect(result.isError).toBe(true);
		expect(result.error).toBeInstanceOf(DomainError);
		expect(result.error.code).toBe('MARK_ALL_READ_FAILED');
	});
});
