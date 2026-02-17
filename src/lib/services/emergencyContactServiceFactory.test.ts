// src/lib/services/emergencyContactServiceFactory.test.ts
import { describe, it, expect, vi } from 'vitest';
import {
	createEmergencyContactService,
	createEmergencyContactServiceWithClient
} from './emergencyContactServiceFactory';
import { EmergencyContactService } from '$services/EmergencyContactService';
import type { RequestEvent } from '@sveltejs/kit';
import { createClient } from '@urql/core';

describe('emergencyContactServiceFactory', () => {
	describe('createEmergencyContactService', () => {
		it('should create EmergencyContactService instance', () => {
			const mockEvent = {
				fetch: vi.fn(),
				cookies: {
					get: vi.fn(),
					getAll: vi.fn(() => [])
				}
			} as unknown as RequestEvent;

			const service = createEmergencyContactService(mockEvent);

			expect(service).toBeInstanceOf(EmergencyContactService);
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

			const service = createEmergencyContactService(mockEvent);

			expect(service).toBeInstanceOf(EmergencyContactService);
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

			const service = createEmergencyContactService(mockEvent);

			expect(service).toBeInstanceOf(EmergencyContactService);
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

			const service = createEmergencyContactService(mockEvent);

			expect(service).toBeInstanceOf(EmergencyContactService);
		});
	});

	describe('createEmergencyContactServiceWithClient', () => {
		it('should create EmergencyContactService with provided client', () => {
			const mockClient = createClient({
				url: 'http://localhost:4000/graphql',
				exchanges: []
			});

			const service = createEmergencyContactServiceWithClient(mockClient);

			expect(service).toBeInstanceOf(EmergencyContactService);
		});

		it('should create functional service instance', () => {
			const mockClient = createClient({
				url: 'http://localhost:4000/graphql',
				exchanges: []
			});

			const service = createEmergencyContactServiceWithClient(mockClient);

			// Service should have expected methods
			expect(typeof service.getById).toBe('function');
			expect(typeof service.getByEmployeeId).toBe('function');
			expect(typeof service.getPrimary).toBe('function');
			expect(typeof service.create).toBe('function');
			expect(typeof service.update).toBe('function');
			expect(typeof service.delete).toBe('function');
			expect(typeof service.setPrimary).toBe('function');
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

			const service1 = createEmergencyContactService(mockEvent);
			const service2 = createEmergencyContactService(mockEvent);

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

			const eventService = createEmergencyContactService(mockEvent);
			const clientService = createEmergencyContactServiceWithClient(mockClient);

			// Both should have the same methods
			expect(typeof eventService.getByEmployeeId).toBe('function');
			expect(typeof clientService.getByEmployeeId).toBe('function');
			expect(typeof eventService.setPrimary).toBe('function');
			expect(typeof clientService.setPrimary).toBe('function');
		});

		it('should create service with empty cookies', () => {
			const mockEvent = {
				fetch: vi.fn(),
				cookies: {
					get: vi.fn(() => undefined),
					getAll: vi.fn(() => [])
				}
			} as unknown as RequestEvent;

			const service = createEmergencyContactService(mockEvent);

			expect(service).toBeInstanceOf(EmergencyContactService);
		});
	});
});
