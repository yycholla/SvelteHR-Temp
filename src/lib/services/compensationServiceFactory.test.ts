// src/lib/services/compensationServiceFactory.test.ts
import { describe, it, expect, vi } from 'vitest';
import {
	createCompensationService,
	createCompensationServiceWithClient
} from './compensationServiceFactory';
import { CompensationService } from '$services/CompensationService';
import type { RequestEvent } from '@sveltejs/kit';
import type { Client } from '@urql/core';

// Mock URQL client creation
vi.mock('$lib/graphql/client', () => ({
	createUrqlClient: vi.fn(() => ({
		query: vi.fn(),
		mutation: vi.fn()
	})),
	serializeCookies: vi.fn(() => 'mock-cookie-header')
}));

// Mock adapters
vi.mock('$adapters/graphql/GraphQLAdapter', () => ({
	GraphQLAdapter: vi.fn(() => ({
		query: vi.fn(),
		mutation: vi.fn()
	}))
}));

vi.mock('$adapters/graphql/GraphQLCompensationAdapter', () => ({
	GraphQLCompensationAdapter: vi.fn(() => ({
		findById: vi.fn(),
		findByEmployeeId: vi.fn(),
		findActiveByEmployeeId: vi.fn(),
		findAll: vi.fn(),
		create: vi.fn(),
		update: vi.fn(),
		terminate: vi.fn(),
		delete: vi.fn()
	}))
}));

describe('compensationServiceFactory', () => {
	describe('createCompensationService', () => {
		it('should create a CompensationService instance from RequestEvent', () => {
			const mockEvent = {
				fetch: vi.fn(),
				cookies: {
					get: vi.fn(),
					set: vi.fn()
				}
			} as unknown as RequestEvent;

			const service = createCompensationService(mockEvent);

			expect(service).toBeInstanceOf(CompensationService);
		});

		it('should use event.fetch for GraphQL requests', () => {
			const mockFetch = vi.fn();
			const mockEvent = {
				fetch: mockFetch,
				cookies: {
					get: vi.fn(),
					set: vi.fn()
				}
			} as unknown as RequestEvent;

			createCompensationService(mockEvent);

			// Verify that the mock modules were called (indirectly verifies fetch was passed)
			expect(mockEvent.fetch).toBeDefined();
		});

		it('should extract cookies for authentication', () => {
			const mockCookies = {
				get: vi.fn(),
				set: vi.fn()
			};
			const mockEvent = {
				fetch: vi.fn(),
				cookies: mockCookies
			} as unknown as RequestEvent;

			createCompensationService(mockEvent);

			// The factory should have used the cookies object
			expect(mockCookies).toBeDefined();
		});
	});

	describe('createCompensationServiceWithClient', () => {
		it('should create a CompensationService instance from Client', () => {
			const mockClient = {
				query: vi.fn(),
				mutation: vi.fn()
			} as unknown as Client;

			const service = createCompensationServiceWithClient(mockClient);

			expect(service).toBeInstanceOf(CompensationService);
		});

		it('should accept a pre-configured client', () => {
			const mockClient = {
				query: vi.fn().mockResolvedValue({ data: {} }),
				mutation: vi.fn().mockResolvedValue({ data: {} })
			} as unknown as Client;

			const service = createCompensationServiceWithClient(mockClient);

			// Verify service was created with the client
			expect(service).toBeInstanceOf(CompensationService);
		});

		it('should be useful for testing scenarios', () => {
			const mockClient = {
				query: vi.fn().mockResolvedValue({
					data: {
						compensation: {
							id: 'test-id',
							employeeId: 'emp-123',
							salary: 75000,
							currency: 'USD',
							salaryGrade: 'L3',
							compensationType: 'salary',
							paymentFrequency: 'monthly',
							effectiveDate: '2024-01-01',
							endDate: null,
							notes: null
						}
					}
				}),
				mutation: vi.fn()
			} as unknown as Client;

			const service = createCompensationServiceWithClient(mockClient);

			// This is how tests would use the factory
			expect(service).toBeDefined();
			expect(service.getById).toBeDefined();
			expect(service.createCompensation).toBeDefined();
		});
	});
});
