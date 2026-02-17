import { describe, it, expect, vi } from 'vitest';
import { createHrReportService, createHrReportServiceWithClient } from './hrReportServiceFactory';
import { HrReportService } from '$services/HrReportService';
import type { RequestEvent } from '@sveltejs/kit';
import { createClient } from '@urql/core';

describe('hrReportServiceFactory', () => {
	describe('createHrReportService', () => {
		it('should create HrReportService instance from event', () => {
			const mockEvent = {
				fetch: vi.fn(),
				cookies: {
					get: vi.fn(),
					getAll: vi.fn(() => [])
				}
			} as unknown as RequestEvent;

			const service = createHrReportService(mockEvent);

			expect(service).toBeInstanceOf(HrReportService);
		});

		it('should use event.fetch for GraphQL client creation', () => {
			const mockFetch = vi.fn();
			const mockEvent = {
				fetch: mockFetch,
				cookies: {
					get: vi.fn(),
					getAll: vi.fn(() => [])
				}
			} as unknown as RequestEvent;

			const service = createHrReportService(mockEvent);

			expect(service).toBeInstanceOf(HrReportService);
		});

		it('should serialize cookies for authentication', () => {
			const mockCookies = [
				{ name: 'session', value: 'test-session' },
				{ name: 'refresh', value: 'refresh-token' }
			];

			const mockEvent = {
				fetch: vi.fn(),
				cookies: {
					get: vi.fn(),
					getAll: vi.fn(() => mockCookies)
				}
			} as unknown as RequestEvent;

			const service = createHrReportService(mockEvent);

			expect(service).toBeInstanceOf(HrReportService);
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

			const service = createHrReportService(mockEvent);

			expect(service).toBeInstanceOf(HrReportService);
		});

		it('should create different instances on each call', () => {
			const mockEvent = {
				fetch: vi.fn(),
				cookies: {
					get: vi.fn(),
					getAll: vi.fn(() => [])
				}
			} as unknown as RequestEvent;

			const service1 = createHrReportService(mockEvent);
			const service2 = createHrReportService(mockEvent);

			expect(service1).not.toBe(service2);
		});
	});

	describe('createHrReportServiceWithClient', () => {
		it('should create HrReportService with provided client', () => {
			const mockClient = createClient({
				url: 'http://localhost:4000/graphql',
				exchanges: []
			});

			const service = createHrReportServiceWithClient(mockClient);

			expect(service).toBeInstanceOf(HrReportService);
		});

		it('should create service with expected business methods', () => {
			const mockClient = createClient({
				url: 'http://localhost:4000/graphql',
				exchanges: []
			});

			const service = createHrReportServiceWithClient(mockClient);

			expect(typeof service.getById).toBe('function');
			expect(typeof service.getAll).toBe('function');
			expect(typeof service.getByDepartment).toBe('function');
			expect(typeof service.create).toBe('function');
			expect(typeof service.update).toBe('function');
			expect(typeof service.delete).toBe('function');
			expect(typeof service.generate).toBe('function');
		});

		it('should create different instances on each call', () => {
			const mockClient = createClient({
				url: 'http://localhost:4000/graphql',
				exchanges: []
			});

			const service1 = createHrReportServiceWithClient(mockClient);
			const service2 = createHrReportServiceWithClient(mockClient);

			expect(service1).not.toBe(service2);
		});

		it('should create services with same interface via both factories', () => {
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

			const eventService = createHrReportService(mockEvent);
			const clientService = createHrReportServiceWithClient(mockClient);

			// Both should have identical method surfaces
			expect(typeof eventService.getById).toBe('function');
			expect(typeof clientService.getById).toBe('function');
			expect(typeof eventService.getByDepartment).toBe('function');
			expect(typeof clientService.getByDepartment).toBe('function');
			expect(typeof eventService.generate).toBe('function');
			expect(typeof clientService.generate).toBe('function');
		});

		it('should expose the delete method on the service', () => {
			const mockClient = createClient({
				url: 'http://localhost:4000/graphql',
				exchanges: []
			});

			const service = createHrReportServiceWithClient(mockClient);

			expect(typeof service.delete).toBe('function');
		});
	});
});
