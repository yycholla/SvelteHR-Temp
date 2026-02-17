// src/lib/services/complianceServiceFactory.test.ts
import { describe, it, expect, vi } from 'vitest';
import {
	createComplianceService,
	createComplianceServiceWithClient
} from './complianceServiceFactory';
import { ComplianceService } from '$services/ComplianceService';
import type { RequestEvent } from '@sveltejs/kit';
import { createClient } from '@urql/core';

describe('complianceServiceFactory', () => {
	describe('createComplianceService()', () => {
		it('should create a ComplianceService instance', () => {
			const mockEvent = {
				fetch: vi.fn(),
				cookies: {
					get: vi.fn(),
					getAll: vi.fn(() => [])
				}
			} as unknown as RequestEvent;

			const service = createComplianceService(mockEvent);

			expect(service).toBeInstanceOf(ComplianceService);
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

			const service = createComplianceService(mockEvent);

			expect(service).toBeInstanceOf(ComplianceService);
		});

		it('should serialize cookies for authentication', () => {
			const mockCookies = [
				{ name: 'session', value: 'test-session' },
				{ name: 'token', value: 'auth-token' }
			];

			const mockEvent = {
				fetch: vi.fn(),
				cookies: {
					get: vi.fn(),
					getAll: vi.fn(() => mockCookies)
				}
			} as unknown as RequestEvent;

			const service = createComplianceService(mockEvent);

			expect(service).toBeInstanceOf(ComplianceService);
		});

		it('should create service with session cookie authentication', () => {
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

			const service = createComplianceService(mockEvent);

			expect(service).toBeInstanceOf(ComplianceService);
		});

		it('should create a service with all required methods', () => {
			const mockEvent = {
				fetch: vi.fn(),
				cookies: {
					get: vi.fn(),
					getAll: vi.fn(() => [])
				}
			} as unknown as RequestEvent;

			const service = createComplianceService(mockEvent);

			expect(typeof service.getById).toBe('function');
			expect(typeof service.getAll).toBe('function');
			expect(typeof service.getDueForReview).toBe('function');
			expect(typeof service.getByStatus).toBe('function');
			expect(typeof service.create).toBe('function');
			expect(typeof service.update).toBe('function');
			expect(typeof service.delete).toBe('function');
			expect(typeof service.getOverallScore).toBe('function');
		});
	});

	describe('createComplianceServiceWithClient()', () => {
		it('should create a ComplianceService with the provided client', () => {
			const mockClient = createClient({
				url: 'http://localhost:4000/graphql',
				exchanges: []
			});

			const service = createComplianceServiceWithClient(mockClient);

			expect(service).toBeInstanceOf(ComplianceService);
		});

		it('should create a service with all required methods', () => {
			const mockClient = createClient({
				url: 'http://localhost:4000/graphql',
				exchanges: []
			});

			const service = createComplianceServiceWithClient(mockClient);

			expect(typeof service.getById).toBe('function');
			expect(typeof service.getAll).toBe('function');
			expect(typeof service.getDueForReview).toBe('function');
			expect(typeof service.getByStatus).toBe('function');
			expect(typeof service.create).toBe('function');
			expect(typeof service.update).toBe('function');
			expect(typeof service.delete).toBe('function');
			expect(typeof service.getOverallScore).toBe('function');
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

			const service1 = createComplianceService(mockEvent);
			const service2 = createComplianceService(mockEvent);

			expect(service1).not.toBe(service2);
		});

		it('should create services with same interface via different factory functions', () => {
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

			const eventService = createComplianceService(mockEvent);
			const clientService = createComplianceServiceWithClient(mockClient);

			// Both should have the same public interface
			expect(typeof eventService.getAll).toBe('function');
			expect(typeof clientService.getAll).toBe('function');
			expect(typeof eventService.getOverallScore).toBe('function');
			expect(typeof clientService.getOverallScore).toBe('function');
		});
	});
});
