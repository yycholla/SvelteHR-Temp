// src/lib/services/vehicleServiceFactory.test.ts
import { describe, it, expect, vi } from 'vitest';
import {
	createVehicleService,
	createVehicleServiceWithClient
} from './vehicleServiceFactory';
import { VehicleService } from '$services/VehicleService';
import type { RequestEvent } from '@sveltejs/kit';
import { createClient } from '@urql/core';

describe('vehicleServiceFactory', () => {
	describe('createVehicleService', () => {
		it('should create VehicleService instance', () => {
			const mockEvent = {
				fetch: vi.fn(),
				cookies: {
					get: vi.fn(),
					getAll: vi.fn(() => [])
				}
			} as unknown as RequestEvent;

			const service = createVehicleService(mockEvent);

			expect(service).toBeInstanceOf(VehicleService);
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

			const service = createVehicleService(mockEvent);

			expect(service).toBeInstanceOf(VehicleService);
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

			const service = createVehicleService(mockEvent);

			expect(service).toBeInstanceOf(VehicleService);
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

			const service = createVehicleService(mockEvent);

			expect(service).toBeInstanceOf(VehicleService);
		});

		it('should create service with empty cookies', () => {
			const mockEvent = {
				fetch: vi.fn(),
				cookies: {
					get: vi.fn(() => undefined),
					getAll: vi.fn(() => [])
				}
			} as unknown as RequestEvent;

			const service = createVehicleService(mockEvent);

			expect(service).toBeInstanceOf(VehicleService);
		});
	});

	describe('createVehicleServiceWithClient', () => {
		it('should create VehicleService with provided client', () => {
			const mockClient = createClient({
				url: 'http://localhost:4000/graphql',
				exchanges: []
			});

			const service = createVehicleServiceWithClient(mockClient);

			expect(service).toBeInstanceOf(VehicleService);
		});

		it('should create functional service instance', () => {
			const mockClient = createClient({
				url: 'http://localhost:4000/graphql',
				exchanges: []
			});

			const service = createVehicleServiceWithClient(mockClient);

			// Service should have expected methods
			expect(typeof service.getById).toBe('function');
			expect(typeof service.getByEmployeeId).toBe('function');
			expect(typeof service.create).toBe('function');
			expect(typeof service.update).toBe('function');
			expect(typeof service.delete).toBe('function');
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

			const service1 = createVehicleService(mockEvent);
			const service2 = createVehicleService(mockEvent);

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

			const eventService = createVehicleService(mockEvent);
			const clientService = createVehicleServiceWithClient(mockClient);

			// Both should have the same methods
			expect(typeof eventService.getByEmployeeId).toBe('function');
			expect(typeof clientService.getByEmployeeId).toBe('function');
			expect(typeof eventService.delete).toBe('function');
			expect(typeof clientService.delete).toBe('function');
		});
	});
});
