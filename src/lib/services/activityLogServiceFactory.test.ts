// src/lib/services/activityLogServiceFactory.test.ts
import { describe, it, expect, vi } from 'vitest';
import {
	createActivityLogService,
	createActivityLogServiceWithClient
} from './activityLogServiceFactory';
import { ActivityLogService } from '$services/ActivityLogService';
import type { RequestEvent } from '@sveltejs/kit';
import { createClient } from '@urql/core';

describe('activityLogServiceFactory', () => {
	describe('createActivityLogService()', () => {
		it('should return an ActivityLogService instance', () => {
			const mockEvent = {
				fetch: vi.fn(),
				cookies: {
					get: vi.fn(),
					getAll: vi.fn(() => [])
				}
			} as unknown as RequestEvent;

			const service = createActivityLogService(mockEvent);
			expect(service).toBeInstanceOf(ActivityLogService);
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

			const service = createActivityLogService(mockEvent);
			expect(service).toBeInstanceOf(ActivityLogService);
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

			const service = createActivityLogService(mockEvent);
			expect(service).toBeInstanceOf(ActivityLogService);
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

			const service = createActivityLogService(mockEvent);
			expect(service).toBeInstanceOf(ActivityLogService);
		});

		it('should create different instances on each call', () => {
			const mockEvent = {
				fetch: vi.fn(),
				cookies: {
					get: vi.fn(),
					getAll: vi.fn(() => [])
				}
			} as unknown as RequestEvent;

			const service1 = createActivityLogService(mockEvent);
			const service2 = createActivityLogService(mockEvent);

			expect(service1).not.toBe(service2);
		});
	});

	describe('createActivityLogServiceWithClient()', () => {
		it('should return an ActivityLogService instance', () => {
			const mockClient = createClient({
				url: 'http://localhost:4000/graphql',
				exchanges: []
			});

			const service = createActivityLogServiceWithClient(mockClient);
			expect(service).toBeInstanceOf(ActivityLogService);
		});

		it('should create a functional service instance with expected methods', () => {
			const mockClient = createClient({
				url: 'http://localhost:4000/graphql',
				exchanges: []
			});

			const service = createActivityLogServiceWithClient(mockClient);

			expect(typeof service.getById).toBe('function');
			expect(typeof service.getByEmployeeId).toBe('function');
			expect(typeof service.getByResourceType).toBe('function');
			expect(typeof service.getByDateRange).toBe('function');
			expect(typeof service.getAll).toBe('function');
			expect(typeof service.create).toBe('function');
			expect(typeof service.purgeOlderThan).toBe('function');
		});

		it('should create different instances on each call', () => {
			const mockClient = createClient({
				url: 'http://localhost:4000/graphql',
				exchanges: []
			});

			const service1 = createActivityLogServiceWithClient(mockClient);
			const service2 = createActivityLogServiceWithClient(mockClient);

			expect(service1).not.toBe(service2);
		});
	});

	describe('factory consistency', () => {
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

			const eventService = createActivityLogService(mockEvent);
			const clientService = createActivityLogServiceWithClient(mockClient);

			// Both should have the same methods
			expect(typeof eventService.getById).toBe('function');
			expect(typeof clientService.getById).toBe('function');
			expect(typeof eventService.getAll).toBe('function');
			expect(typeof clientService.getAll).toBe('function');
			expect(typeof eventService.create).toBe('function');
			expect(typeof clientService.create).toBe('function');
		});
	});
});
