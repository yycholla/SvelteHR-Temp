import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	createNotificationService,
	createNotificationServiceWithClient
} from './notificationServiceFactory';
import { NotificationService } from '$services/NotificationService';
import type { RequestEvent } from '@sveltejs/kit';
import type { Client } from '@urql/core';

// Mock the GraphQL client
vi.mock('$lib/graphql/client', () => ({
	createUrqlClient: vi.fn(() => ({
		query: vi.fn(),
		mutation: vi.fn()
	})),
	serializeCookies: vi.fn((cookies: { getAll: () => { name: string; value: string }[] }) => {
		const all = cookies.getAll();
		return all.map((c) => `${c.name}=${c.value}`).join('; ');
	})
}));

describe('notificationServiceFactory', () => {
	let mockEvent: RequestEvent;
	let mockClient: Client;

	beforeEach(() => {
		mockEvent = {
			fetch: vi.fn(),
			cookies: {
				getAll: () => [{ name: 'session_id', value: 'test-session-123' }]
			},
			request: {
				headers: new Headers()
			}
		} as unknown as RequestEvent;

		mockClient = {
			query: vi.fn(),
			mutation: vi.fn()
		} as unknown as Client;
	});

	describe('createNotificationService', () => {
		it('should create NotificationService instance', () => {
			const service = createNotificationService(mockEvent);

			expect(service).toBeInstanceOf(NotificationService);
		});

		it('should create service with proper methods', () => {
			const service = createNotificationService(mockEvent);

			// Verify service has required methods
			expect(service).toHaveProperty('getById');
			expect(service).toHaveProperty('getAll');
			expect(service).toHaveProperty('getForRecipient');
			expect(service).toHaveProperty('getUnread');
			expect(service).toHaveProperty('create');
			expect(service).toHaveProperty('update');
			expect(service).toHaveProperty('delete');
			expect(service).toHaveProperty('markAsRead');
			expect(service).toHaveProperty('markAsUnread');
			expect(service).toHaveProperty('markAllAsRead');
		});

		it('should forward cookies from request event', async () => {
			const { createUrqlClient, serializeCookies } = await import('$lib/graphql/client');
			const mockedCreateUrqlClient = vi.mocked(createUrqlClient);
			const mockedSerializeCookies = vi.mocked(serializeCookies);

			createNotificationService(mockEvent);

			// Verify cookies were serialized
			expect(mockedSerializeCookies).toHaveBeenCalledWith(mockEvent.cookies);

			// Verify serialized cookies were passed to client creation
			expect(mockedCreateUrqlClient).toHaveBeenCalledWith(
				mockEvent.fetch,
				undefined,
				undefined,
				'session_id=test-session-123'
			);
		});

		it('should handle missing cookies gracefully', () => {
			const eventWithoutCookies = {
				fetch: vi.fn(),
				cookies: {
					getAll: () => []
				},
				request: {
					headers: new Headers()
				}
			} as unknown as RequestEvent;

			const service = createNotificationService(eventWithoutCookies);

			expect(service).toBeInstanceOf(NotificationService);
		});

		it('should create new instance on each call', () => {
			const service1 = createNotificationService(mockEvent);
			const service2 = createNotificationService(mockEvent);

			expect(service1).not.toBe(service2);
		});
	});

	describe('createNotificationServiceWithClient', () => {
		it('should create service with provided client', () => {
			const service = createNotificationServiceWithClient(mockClient);

			expect(service).toBeInstanceOf(NotificationService);
		});

		it('should have all required methods', () => {
			const service = createNotificationServiceWithClient(mockClient);

			expect(service).toHaveProperty('getById');
			expect(service).toHaveProperty('getForRecipient');
			expect(service).toHaveProperty('markAsRead');
		});

		it('should not create a new client', async () => {
			const { createUrqlClient } = await import('$lib/graphql/client');
			const mockedCreateUrqlClient = vi.mocked(createUrqlClient);

			// Reset call count
			mockedCreateUrqlClient.mockClear();

			createNotificationServiceWithClient(mockClient);

			// Should use provided client, not create a new one
			expect(mockedCreateUrqlClient).not.toHaveBeenCalled();
		});

		it('should be useful for testing', () => {
			// This pattern allows tests to inject mock clients
			const mockTestClient = {
				query: vi.fn().mockResolvedValue({
					data: { notifications: [] }
				}),
				mutation: vi.fn()
			} as unknown as Client;

			const service = createNotificationServiceWithClient(mockTestClient);

			expect(service).toBeInstanceOf(NotificationService);
		});
	});
});
