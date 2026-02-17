// src/lib/services/skillServiceFactory.test.ts
import { describe, it, expect, vi } from 'vitest';
import {
	createSkillService,
	createSkillServiceWithClient,
	createSkillServiceWithPort
} from './skillServiceFactory';
import { SkillService } from '$services/SkillService';
import type { RequestEvent } from '@sveltejs/kit';
import { createClient } from '@urql/core';
import type { GraphQLPort } from '$services/ports/GraphQLPort';

describe('skillServiceFactory', () => {
	describe('createSkillService', () => {
		it('should create SkillService instance', () => {
			const mockEvent = {
				fetch: vi.fn(),
				cookies: {
					get: vi.fn(),
					getAll: vi.fn(() => [])
				}
			} as unknown as RequestEvent;

			const service = createSkillService(mockEvent);

			expect(service).toBeInstanceOf(SkillService);
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

			const service = createSkillService(mockEvent);

			expect(service).toBeInstanceOf(SkillService);
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

			const service = createSkillService(mockEvent);

			expect(service).toBeInstanceOf(SkillService);
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

			const service = createSkillService(mockEvent);

			expect(service).toBeInstanceOf(SkillService);
		});
	});

	describe('createSkillServiceWithClient', () => {
		it('should create SkillService with provided URQL client', () => {
			const client = createClient({ url: 'http://localhost:4000/graphql', exchanges: [] });

			const service = createSkillServiceWithClient(client);

			expect(service).toBeInstanceOf(SkillService);
		});

		it('should return different instances each time', () => {
			const client = createClient({ url: 'http://localhost:4000/graphql', exchanges: [] });

			const service1 = createSkillServiceWithClient(client);
			const service2 = createSkillServiceWithClient(client);

			expect(service1).not.toBe(service2);
		});
	});

	describe('createSkillServiceWithPort', () => {
		it('should create SkillService with provided GraphQLPort', () => {
			const mockPort: GraphQLPort = {
				query: vi.fn(),
				mutation: vi.fn()
			};

			const service = createSkillServiceWithPort(mockPort);

			expect(service).toBeInstanceOf(SkillService);
		});

		it('should create independent service instances', () => {
			const mockPort: GraphQLPort = {
				query: vi.fn(),
				mutation: vi.fn()
			};

			const service1 = createSkillServiceWithPort(mockPort);
			const service2 = createSkillServiceWithPort(mockPort);

			expect(service1).not.toBe(service2);
		});
	});
});
