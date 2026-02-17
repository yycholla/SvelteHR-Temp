// src/lib/services/certificationServiceFactory.test.ts
import { describe, it, expect, vi } from 'vitest';
import {
	createCertificationService,
	createCertificationServiceWithClient,
	createCertificationServiceWithPort
} from './certificationServiceFactory';
import { CertificationService } from '$services/CertificationService';
import type { RequestEvent } from '@sveltejs/kit';
import { createClient } from '@urql/core';
import type { GraphQLPort } from '$services/ports/GraphQLPort';

describe('certificationServiceFactory', () => {
	describe('createCertificationService', () => {
		it('should create CertificationService instance', () => {
			const mockEvent = {
				fetch: vi.fn(),
				cookies: {
					get: vi.fn(),
					getAll: vi.fn(() => [])
				}
			} as unknown as RequestEvent;

			const service = createCertificationService(mockEvent);

			expect(service).toBeInstanceOf(CertificationService);
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

			const service = createCertificationService(mockEvent);

			expect(service).toBeInstanceOf(CertificationService);
		});

		it('should serialize cookies for authentication', () => {
			const mockCookies = [
				{ name: 'session', value: 'test-session' },
				{ name: 'token', value: 'token-value' }
			];

			const mockEvent = {
				fetch: vi.fn(),
				cookies: {
					get: vi.fn(),
					getAll: vi.fn(() => mockCookies)
				}
			} as unknown as RequestEvent;

			const service = createCertificationService(mockEvent);

			expect(service).toBeInstanceOf(CertificationService);
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

			const service = createCertificationService(mockEvent);

			expect(service).toBeInstanceOf(CertificationService);
		});
	});

	describe('createCertificationServiceWithClient', () => {
		it('should create CertificationService with provided URQL client', () => {
			const client = createClient({ url: 'http://localhost:4000/graphql', exchanges: [] });

			const service = createCertificationServiceWithClient(client);

			expect(service).toBeInstanceOf(CertificationService);
		});

		it('should return different instances each time', () => {
			const client = createClient({ url: 'http://localhost:4000/graphql', exchanges: [] });

			const service1 = createCertificationServiceWithClient(client);
			const service2 = createCertificationServiceWithClient(client);

			expect(service1).not.toBe(service2);
		});
	});

	describe('createCertificationServiceWithPort', () => {
		it('should create CertificationService with provided GraphQLPort', () => {
			const mockPort: GraphQLPort = {
				query: vi.fn(),
				mutation: vi.fn()
			};

			const service = createCertificationServiceWithPort(mockPort);

			expect(service).toBeInstanceOf(CertificationService);
		});

		it('should create independent service instances', () => {
			const mockPort: GraphQLPort = {
				query: vi.fn(),
				mutation: vi.fn()
			};

			const service1 = createCertificationServiceWithPort(mockPort);
			const service2 = createCertificationServiceWithPort(mockPort);

			expect(service1).not.toBe(service2);
		});
	});
});
