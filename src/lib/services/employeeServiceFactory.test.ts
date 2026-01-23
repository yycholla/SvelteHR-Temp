// src/lib/services/employeeServiceFactory.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createEmployeeService, createEmployeeServiceWithClient } from './employeeServiceFactory';
import { EmployeeService } from '$services/EmployeeService';
import type { RequestEvent } from '@sveltejs/kit';
import type { Client } from '@urql/core';

// Mock the GraphQL client
vi.mock('$lib/graphql/client', () => ({
	createUrqlClient: vi.fn(() => ({
		query: vi.fn(),
		mutation: vi.fn()
	}))
}));

describe('employeeServiceFactory', () => {
	let mockEvent: RequestEvent;
	let mockClient: Client;

	beforeEach(() => {
		mockEvent = {
			request: {
				headers: new Headers({
					cookie: 'session_id=test-session-123'
				})
			}
		} as unknown as RequestEvent;

		mockClient = {
			query: vi.fn(),
			mutation: vi.fn()
		} as unknown as Client;
	});

	describe('createEmployeeService', () => {
		it('should create an EmployeeService instance', () => {
			const service = createEmployeeService(mockEvent);

			expect(service).toBeInstanceOf(EmployeeService);
		});

		it('should create service with proper authentication context', () => {
			const service = createEmployeeService(mockEvent);

			// Verify service has required methods
			expect(service).toHaveProperty('getEmployees');
			expect(service).toHaveProperty('getEmployeeById');
			expect(service).toHaveProperty('createEmployee');
			expect(service).toHaveProperty('updateEmployee');
			expect(service).toHaveProperty('deleteEmployee');
		});

		it('should extract cookies from request event', async () => {
			const { createUrqlClient } = await import('$lib/graphql/client');
			const mockedCreateUrqlClient = vi.mocked(createUrqlClient);

			createEmployeeService(mockEvent);

			// Verify cookies were passed to client creation
			expect(mockedCreateUrqlClient).toHaveBeenCalledWith(
				undefined,
				undefined,
				undefined,
				'session_id=test-session-123'
			);
		});

		it('should handle missing cookies gracefully', () => {
			const eventWithoutCookies = {
				request: {
					headers: new Headers()
				}
			} as unknown as RequestEvent;

			const service = createEmployeeService(eventWithoutCookies);

			expect(service).toBeInstanceOf(EmployeeService);
		});
	});

	describe('createEmployeeServiceWithClient', () => {
		it('should create service with provided client', () => {
			const service = createEmployeeServiceWithClient(mockClient);

			expect(service).toBeInstanceOf(EmployeeService);
		});

		it('should not create a new client', async () => {
			const { createUrqlClient } = await import('$lib/graphql/client');
			const mockedCreateUrqlClient = vi.mocked(createUrqlClient);

			createEmployeeServiceWithClient(mockClient);

			// Should use provided client, not create a new one
			expect(mockedCreateUrqlClient).not.toHaveBeenCalled();
		});

		it('should be useful for testing', () => {
			// This pattern allows tests to inject mock clients
			const mockTestClient = {
				query: vi.fn().mockResolvedValue({
					data: { employees: [] }
				}),
				mutation: vi.fn()
			} as unknown as Client;

			const service = createEmployeeServiceWithClient(mockTestClient);

			expect(service).toBeInstanceOf(EmployeeService);
		});
	});
});
