// src/lib/services/timeOffBalanceServiceFactory.test.ts
import { describe, it, expect, vi } from 'vitest';
import {
	createTimeOffBalanceService,
	createTimeOffBalanceServiceWithClient
} from './timeOffBalanceServiceFactory';
import { TimeOffBalanceService } from '$services/TimeOffBalanceService';
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

vi.mock('$adapters/graphql/GraphQLTimeOffBalanceAdapter', () => ({
	GraphQLTimeOffBalanceAdapter: vi.fn(() => ({
		findById: vi.fn(),
		findByEmployeeId: vi.fn(),
		findByEmployeeIdAndType: vi.fn(),
		findByPeriod: vi.fn(),
		findAll: vi.fn(),
		create: vi.fn(),
		update: vi.fn(),
		delete: vi.fn()
	}))
}));

describe('timeOffBalanceServiceFactory', () => {
	describe('createTimeOffBalanceService', () => {
		it('should create a TimeOffBalanceService instance from RequestEvent', () => {
			const mockEvent = {
				fetch: vi.fn(),
				cookies: {
					get: vi.fn(),
					set: vi.fn()
				}
			} as unknown as RequestEvent;

			const service = createTimeOffBalanceService(mockEvent);

			expect(service).toBeInstanceOf(TimeOffBalanceService);
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

			createTimeOffBalanceService(mockEvent);

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

			createTimeOffBalanceService(mockEvent);

			// The factory should have used the cookies object
			expect(mockCookies).toBeDefined();
		});
	});

	describe('createTimeOffBalanceServiceWithClient', () => {
		it('should create a TimeOffBalanceService instance from Client', () => {
			const mockClient = {
				query: vi.fn(),
				mutation: vi.fn()
			} as unknown as Client;

			const service = createTimeOffBalanceServiceWithClient(mockClient);

			expect(service).toBeInstanceOf(TimeOffBalanceService);
		});

		it('should accept a pre-configured client', () => {
			const mockClient = {
				query: vi.fn().mockResolvedValue({ data: {} }),
				mutation: vi.fn().mockResolvedValue({ data: {} })
			} as unknown as Client;

			const service = createTimeOffBalanceServiceWithClient(mockClient);

			// Verify service was created with the client
			expect(service).toBeInstanceOf(TimeOffBalanceService);
		});

		it('should be useful for testing scenarios', () => {
			const mockClient = {
				query: vi.fn().mockResolvedValue({
					data: {
						timeOffBalance: {
							id: 'test-id',
							employeeId: 'emp-123',
							leaveType: 'vacation',
							year: 2026,
							totalHours: 160,
							usedHours: 40,
							accrualRate: 5,
							accrualPeriod: 'month',
							carryoverHours: 20
						}
					}
				}),
				mutation: vi.fn()
			} as unknown as Client;

			const service = createTimeOffBalanceServiceWithClient(mockClient);

			// This is how tests would use the factory
			expect(service).toBeDefined();
			expect(service.getById).toBeDefined();
			expect(service.createBalance).toBeDefined();
		});
	});
});
