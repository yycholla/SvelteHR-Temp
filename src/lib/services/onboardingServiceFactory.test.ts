import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	createOnboardingService,
	createOnboardingServiceWithClient
} from './onboardingServiceFactory';
import { OnboardingService } from '$services/OnboardingService';
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

describe('onboardingServiceFactory', () => {
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

	describe('createOnboardingService', () => {
		it('should create OnboardingService instance', () => {
			const service = createOnboardingService(mockEvent);

			expect(service).toBeInstanceOf(OnboardingService);
		});

		it('should create service with all required methods', () => {
			const service = createOnboardingService(mockEvent);

			// Module methods
			expect(service).toHaveProperty('getModuleById');
			expect(service).toHaveProperty('getAllModules');
			expect(service).toHaveProperty('createModule');
			expect(service).toHaveProperty('updateModule');
			expect(service).toHaveProperty('deleteModule');

			// Assignment methods
			expect(service).toHaveProperty('getAssignmentById');
			expect(service).toHaveProperty('getAssignmentsByUserId');
			expect(service).toHaveProperty('getAssignmentsByModuleId');
			expect(service).toHaveProperty('createAssignment');
			expect(service).toHaveProperty('completeAssignment');
			expect(service).toHaveProperty('deleteAssignment');
		});

		it('should forward cookies from request event', async () => {
			const { createUrqlClient, serializeCookies } = await import('$lib/graphql/client');
			const mockedCreateUrqlClient = vi.mocked(createUrqlClient);
			const mockedSerializeCookies = vi.mocked(serializeCookies);

			createOnboardingService(mockEvent);

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

			const service = createOnboardingService(eventWithoutCookies);

			expect(service).toBeInstanceOf(OnboardingService);
		});

		it('should create new instance on each call', () => {
			const service1 = createOnboardingService(mockEvent);
			const service2 = createOnboardingService(mockEvent);

			expect(service1).not.toBe(service2);
		});
	});

	describe('createOnboardingServiceWithClient', () => {
		it('should create service with provided client', () => {
			const service = createOnboardingServiceWithClient(mockClient);

			expect(service).toBeInstanceOf(OnboardingService);
		});

		it('should have all required methods', () => {
			const service = createOnboardingServiceWithClient(mockClient);

			expect(service).toHaveProperty('getModuleById');
			expect(service).toHaveProperty('getAllModules');
			expect(service).toHaveProperty('createModule');
			expect(service).toHaveProperty('getAssignmentsByUserId');
			expect(service).toHaveProperty('completeAssignment');
		});

		it('should not create a new URQL client', async () => {
			const { createUrqlClient } = await import('$lib/graphql/client');
			const mockedCreateUrqlClient = vi.mocked(createUrqlClient);

			// Reset call count
			mockedCreateUrqlClient.mockClear();

			createOnboardingServiceWithClient(mockClient);

			// Should use provided client, not create a new one
			expect(mockedCreateUrqlClient).not.toHaveBeenCalled();
		});

		it('should be useful for testing', () => {
			// This pattern allows tests to inject mock clients
			const mockTestClient = {
				query: vi.fn().mockResolvedValue({
					data: { onboardingModules: [] }
				}),
				mutation: vi.fn()
			} as unknown as Client;

			const service = createOnboardingServiceWithClient(mockTestClient);

			expect(service).toBeInstanceOf(OnboardingService);
		});

		it('should create new instance on each call', () => {
			const service1 = createOnboardingServiceWithClient(mockClient);
			const service2 = createOnboardingServiceWithClient(mockClient);

			expect(service1).not.toBe(service2);
		});
	});
});
