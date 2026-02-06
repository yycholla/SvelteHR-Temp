// src/lib/services/departmentServiceFactory.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	createDepartmentService,
	createDepartmentServiceWithClient
} from './departmentServiceFactory';
import { DepartmentService } from '$services/DepartmentService';
import type { RequestEvent } from '@sveltejs/kit';
import type { Client } from '@urql/core';

// Mock the GraphQL client
vi.mock('$lib/graphql/client', () => ({
	createUrqlClient: vi.fn(() => ({
		query: vi.fn(),
		mutation: vi.fn()
	}))
}));

describe('departmentServiceFactory', () => {
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

	describe('createDepartmentService', () => {
		it('should create a DepartmentService instance', () => {
			const service = createDepartmentService(mockEvent);

			expect(service).toBeInstanceOf(DepartmentService);
		});

		it('should create service with proper authentication context', () => {
			const service = createDepartmentService(mockEvent);

			// Verify service has required methods
			expect(service).toHaveProperty('getDepartments');
			expect(service).toHaveProperty('getDepartmentById');
			expect(service).toHaveProperty('createDepartment');
			expect(service).toHaveProperty('updateDepartment');
			expect(service).toHaveProperty('deleteDepartment');
			expect(service).toHaveProperty('moveDepartment');
		});

		it('should extract cookies from request event', async () => {
			const { createUrqlClient } = await import('$lib/graphql/client');
			const mockedCreateUrqlClient = vi.mocked(createUrqlClient);

			createDepartmentService(mockEvent);

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

			const service = createDepartmentService(eventWithoutCookies);

			expect(service).toBeInstanceOf(DepartmentService);
		});
	});

	describe('createDepartmentServiceWithClient', () => {
		it('should create service with provided client', () => {
			const service = createDepartmentServiceWithClient(mockClient);

			expect(service).toBeInstanceOf(DepartmentService);
		});

		it('should not create a new client', async () => {
			const { createUrqlClient } = await import('$lib/graphql/client');
			const mockedCreateUrqlClient = vi.mocked(createUrqlClient);

			createDepartmentServiceWithClient(mockClient);

			// Should use provided client, not create a new one
			expect(mockedCreateUrqlClient).not.toHaveBeenCalled();
		});

		it('should be useful for testing', () => {
			// This pattern allows tests to inject mock clients
			const mockTestClient = {
				query: vi.fn().mockResolvedValue({
					data: { departments: [] }
				}),
				mutation: vi.fn()
			} as unknown as Client;

			const service = createDepartmentServiceWithClient(mockTestClient);

			expect(service).toBeInstanceOf(DepartmentService);
		});
	});
});
