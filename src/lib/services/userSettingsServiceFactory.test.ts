// src/lib/services/userSettingsServiceFactory.test.ts
import { describe, it, expect, vi } from 'vitest';
import {
	createUserSettingsService,
	createUserSettingsServiceWithClient,
	createUserSettingsServiceWithPort
} from './userSettingsServiceFactory';
import { UserSettingsService } from '$services/UserSettingsService';
import type { RequestEvent } from '@sveltejs/kit';
import { createClient } from '@urql/core';
import type { GraphQLPort } from '$services/ports/GraphQLPort';

describe('userSettingsServiceFactory', () => {
	describe('createUserSettingsService', () => {
		it('should create UserSettingsService instance', () => {
			const mockEvent = {
				fetch: vi.fn(),
				cookies: {
					get: vi.fn(),
					getAll: vi.fn(() => [])
				}
			} as unknown as RequestEvent;

			const service = createUserSettingsService(mockEvent);

			expect(service).toBeInstanceOf(UserSettingsService);
		});

		it('should use event.fetch for GraphQL client', () => {
			const mockFetch = vi.fn();
			const mockEvent = {
				fetch: mockFetch,
				cookies: {
					get: vi.fn(),
					getAll: vi.fn(() => [])
				}
			} as unknown as RequestEvent;

			const service = createUserSettingsService(mockEvent);

			expect(service).toBeInstanceOf(UserSettingsService);
		});

		it('should serialize cookies for authentication', () => {
			const mockCookies = [
				{ name: 'session', value: 'test-session' },
				{ name: 'other', value: 'other-value' }
			];

			const mockEvent = {
				fetch: vi.fn(),
				cookies: {
					get: vi.fn(),
					getAll: vi.fn(() => mockCookies)
				}
			} as unknown as RequestEvent;

			const service = createUserSettingsService(mockEvent);

			expect(service).toBeInstanceOf(UserSettingsService);
		});

		it('should create service with authenticated GraphQL client', () => {
			const mockEvent = {
				fetch: vi.fn(),
				cookies: {
					get: vi.fn((name: string) => {
						if (name === 'session') return 'test-session-token';
						return undefined;
					}),
					getAll: vi.fn(() => [{ name: 'session', value: 'test-session-token' }])
				}
			} as unknown as RequestEvent;

			const service = createUserSettingsService(mockEvent);

			expect(service).toBeInstanceOf(UserSettingsService);
		});

		it('should create service with empty cookies', () => {
			const mockEvent = {
				fetch: vi.fn(),
				cookies: {
					get: vi.fn(() => undefined),
					getAll: vi.fn(() => [])
				}
			} as unknown as RequestEvent;

			const service = createUserSettingsService(mockEvent);

			expect(service).toBeInstanceOf(UserSettingsService);
		});
	});

	describe('createUserSettingsServiceWithClient', () => {
		it('should create UserSettingsService with provided client', () => {
			const mockClient = createClient({
				url: 'http://localhost:4000/graphql',
				exchanges: []
			});

			const service = createUserSettingsServiceWithClient(mockClient);

			expect(service).toBeInstanceOf(UserSettingsService);
		});

		it('should create functional service instance', () => {
			const mockClient = createClient({
				url: 'http://localhost:4000/graphql',
				exchanges: []
			});

			const service = createUserSettingsServiceWithClient(mockClient);

			expect(typeof service.getByUserId).toBe('function');
			expect(typeof service.updateTimezone).toBe('function');
			expect(typeof service.updateNotifications).toBe('function');
			expect(typeof service.updatePrivacy).toBe('function');
			expect(typeof service.updateAppearance).toBe('function');
			expect(typeof service.upsert).toBe('function');
		});
	});

	describe('createUserSettingsServiceWithPort', () => {
		it('should create UserSettingsService with provided GraphQLPort', () => {
			const mockPort: GraphQLPort = {
				query: vi.fn().mockResolvedValue({}),
				mutation: vi.fn().mockResolvedValue({})
			};

			const service = createUserSettingsServiceWithPort(mockPort);

			expect(service).toBeInstanceOf(UserSettingsService);
		});

		it('should create functional service instance', () => {
			const mockPort: GraphQLPort = {
				query: vi.fn().mockResolvedValue({}),
				mutation: vi.fn().mockResolvedValue({})
			};

			const service = createUserSettingsServiceWithPort(mockPort);

			expect(typeof service.getByUserId).toBe('function');
			expect(typeof service.upsert).toBe('function');
		});
	});

	describe('factory consistency', () => {
		it('should create different instances on each call', () => {
			const mockEvent = {
				fetch: vi.fn(),
				cookies: {
					get: vi.fn(),
					getAll: vi.fn(() => [])
				}
			} as unknown as RequestEvent;

			const service1 = createUserSettingsService(mockEvent);
			const service2 = createUserSettingsService(mockEvent);

			expect(service1).not.toBe(service2);
		});

		it('should create services with same interface via different factories', () => {
			const mockEvent = {
				fetch: vi.fn(),
				cookies: {
					get: vi.fn(),
					getAll: vi.fn(() => [])
				}
			} as unknown as RequestEvent;

			const mockClient = createClient({
				url: 'http://localhost:4000/graphql',
				exchanges: []
			});

			const eventService = createUserSettingsService(mockEvent);
			const clientService = createUserSettingsServiceWithClient(mockClient);

			// Both should have the same methods
			expect(typeof eventService.getByUserId).toBe('function');
			expect(typeof clientService.getByUserId).toBe('function');
			expect(typeof eventService.updateTimezone).toBe('function');
			expect(typeof clientService.updateTimezone).toBe('function');
		});
	});
});
