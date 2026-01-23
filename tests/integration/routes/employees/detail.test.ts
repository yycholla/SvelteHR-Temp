/**
 * Integration Tests for Employee Detail View Route
 * Tests the /dashboard/employees/[id] route behavior
 *
 * These tests validate:
 * - Server-side data loading via EmployeeService
 * - Permission-based data filtering
 * - Error handling (404, service errors, network errors)
 * - RBAC enforcement
 *
 * Tests CURRENT implementation (using EmployeeService + GraphQL for related data)
 * Created: Week 3, Task 1 (Migration Foundation)
 */

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { faker } from '@faker-js/faker';
import type { RequestEvent } from '@sveltejs/kit';
import { Employee } from '$domain/Employee/Employee';
import { Result } from '$domain/Result';
import { EmployeeFactory } from '../../../../tests/helpers/factories';

// Mock the service factory
vi.mock('$lib/server/services', () => ({
	createEmployeeService: vi.fn()
}));

// Mock API URL
vi.mock('$lib/server/api-url', () => ({
	getGraphQLEndpoint: () => 'http://localhost:4000/graphql'
}));

// Mock database
vi.mock('$lib/server/db', () => ({
	transaction: vi.fn(async (callback: any) => {
		const mockClient = {
			query: vi.fn().mockResolvedValue({ rows: [{ total: 0 }] })
		};
		return callback(mockClient);
	}),
	setJWTClaims: vi.fn()
}));

describe('Employee Detail View Integration Tests', () => {
	// Mock data
	let mockEmployee: Employee;
	let mockEmployeeService: any;
	let mockEvent: Partial<RequestEvent>;

	beforeEach(async () => {
		// Create mock employee using factory
		mockEmployee = EmployeeFactory.create();

		// Mock EmployeeService
		mockEmployeeService = {
			getEmployeeById: vi.fn()
		};

		// Mock fetch for GraphQL queries
		global.fetch = vi.fn((url: string, options?: any) => {
			const body = JSON.parse(options?.body || '{}');
			const query = body.query;

			// Mock GetEmployeeAdditionalData query (department, address, roles)
			if (query.includes('GetEmployeeAdditionalData')) {
				return Promise.resolve({
					ok: true,
					json: async () => ({
						data: {
							user: {
								roles: [{ id: faker.string.uuid(), name: 'Employee' }],
								alternatePhone: '+12085555678',
								createdAt: faker.date.past().toISOString(),
								updatedAt: faker.date.recent().toISOString(),
								department: {
									id: mockEmployee.departmentId,
									name: 'Engineering',
									description: 'Software Development Team'
								},
								primaryAddress: {
									id: faker.string.uuid(),
									addressLine1: faker.location.streetAddress(),
									addressLine2: null,
									city: faker.location.city(),
									stateProvince: faker.location.state(),
									postalCode: faker.location.zipCode(),
									country: 'USA'
								}
							}
						}
					})
				} as Response);
			}

			// Mock emergency contacts
			if (query.includes('GetEmergencyContacts')) {
				return Promise.resolve({
					ok: true,
					json: async () => ({
						data: {
							emergencyContacts: []
						}
					})
				} as Response);
			}

			// Mock vehicles
			if (query.includes('GetEmployeeVehicles')) {
				return Promise.resolve({
					ok: true,
					json: async () => ({
						data: {
							employeeVehicles: []
						}
					})
				} as Response);
			}

			// Mock leave requests
			if (query.includes('GetLeaveRequests')) {
				return Promise.resolve({
					ok: true,
					json: async () => ({
						data: {
							leaveRequests: []
						}
					})
				} as Response);
			}

			// Mock performance reviews
			if (query.includes('GetPerformanceReviews')) {
				return Promise.resolve({
					ok: true,
					json: async () => ({
						data: {
							performanceReviews: []
						}
					})
				} as Response);
			}

			// Mock leave balances
			if (query.includes('GetLeaveBalances')) {
				return Promise.resolve({
					ok: true,
					json: async () => ({
						data: {
							leaveBalances: []
						}
					})
				} as Response);
			}

			// Mock activity logs
			if (query.includes('GetEmployeeActivityLogs')) {
				return Promise.resolve({
					ok: true,
					json: async () => ({
						data: {
							activityLogs: []
						}
					})
				} as Response);
			}

			return Promise.resolve({
				ok: true,
				json: async () => ({ data: {} })
			} as Response);
		}) as Mock;

		// Setup mock service to return successful result
		mockEmployeeService.getEmployeeById.mockResolvedValue(Result.ok(mockEmployee));

		// Mock createEmployeeService
		const { createEmployeeService } = await import('$lib/server/services');
		(createEmployeeService as Mock).mockReturnValue(mockEmployeeService);

		// Create base mock event
		mockEvent = {
			params: { id: mockEmployee.id },
			cookies: {
				get: vi.fn(),
				set: vi.fn(),
				delete: vi.fn(),
				serialize: vi.fn()
			} as any,
			request: {
				headers: new Headers({
					cookie: 'session=test-session-id'
				})
			} as Request,
			locals: {
				user: {
					id: faker.string.uuid(),
					email: faker.internet.email(),
					display_name: faker.person.fullName(),
					role: 'Admin'
				},
				roles: ['Admin'],
				permissions: ['employees:write:all']
			} as any
		};
	});

	describe('Setup Tests', () => {
		it('loads successfully with valid employee ID', async () => {
			const { load } = await import('../../../../src/routes/dashboard/employees/[id]/+page.server');
			const result = await load(mockEvent as RequestEvent);

			expect(result).toBeDefined();
			expect(result.employee).toBeDefined();
			expect(result.employee.id).toBe(mockEmployee.id);
		});

		it('returns 404 with invalid employee ID', async () => {
			// Mock employee not found
			mockEmployeeService.getEmployeeById.mockResolvedValue(
				Result.error({
					code: 'EMPLOYEE_NOT_FOUND',
					message: 'Employee not found',
					name: 'EmployeeNotFoundError'
				})
			);

			const { load } = await import('../../../../src/routes/dashboard/employees/[id]/+page.server');

			try {
				await load(mockEvent as RequestEvent);
				expect(true).toBe(false); // Should not reach here
			} catch (error: any) {
				expect(error.status).toBe(404);
			}
		});
	});

	describe('Data Loading Tests', () => {
		it('displays employee personal information', async () => {
			const { load } = await import('../../../../src/routes/dashboard/employees/[id]/+page.server');
			const result = await load(mockEvent as RequestEvent);

			expect(result.employee.firstName).toBe(mockEmployee.name.first);
			expect(result.employee.lastName).toBe(mockEmployee.name.last);
			expect(result.employee.email).toBe(mockEmployee.email.value);
			expect(result.employee.hireDate).toBeDefined();
			expect(result.employee.jobTitle).toBe(mockEmployee.jobTitle);
		});

		it('displays employee department information', async () => {
			const { load } = await import('../../../../src/routes/dashboard/employees/[id]/+page.server');
			const result = await load(mockEvent as RequestEvent);

			expect(result.employee.department).toBeDefined();
			expect(result.employee.departmentId).toBe(mockEmployee.departmentId);
		});

		it('displays employee status', async () => {
			const { load } = await import('../../../../src/routes/dashboard/employees/[id]/+page.server');
			const result = await load(mockEvent as RequestEvent);

			expect(result.employee.status).toBe(mockEmployee.status);
			expect(result.employee.isActive).toBe(mockEmployee.isActive);
		});
	});

	describe('Permission Tests', () => {
		it('Admin/HR can view all employee details', async () => {
			// Set up admin user
			mockEvent.locals = {
				user: {
					id: faker.string.uuid(),
					email: faker.internet.email(),
					display_name: faker.person.fullName(),
					role: 'Admin'
				},
				roles: ['Admin'],
				permissions: ['employees:write:all']
			} as any;

			const { load } = await import('../../../../src/routes/dashboard/employees/[id]/+page.server');
			const result = await load(mockEvent as RequestEvent);

			// Permission flags should be set correctly for admin
			expect(result.permissions.canViewContactInfo).toBe(true);
			expect(result.permissions.canViewEmergencyContacts).toBe(true);
			expect(result.permissions.canViewVehicles).toBe(true);
		});

		it('Regular employees can view their own details', async () => {
			// Set up employee viewing their own profile
			mockEvent.params!.id = mockEmployee.id;
			mockEvent.locals = {
				user: {
					id: mockEmployee.id,
					email: mockEmployee.email.value,
					display_name: mockEmployee.fullName,
					role: 'Employee'
				},
				roles: ['Employee'],
				permissions: ['employees:write:self']
			} as any;

			const { load } = await import('../../../../src/routes/dashboard/employees/[id]/+page.server');
			const result = await load(mockEvent as RequestEvent);

			// Permission flags should reflect self-view
			expect(result.permissions.isViewingSelf).toBe(true);
			expect(result.permissions.canViewContactInfo).toBe(true);
		});
	});

	describe('Error Handling Tests', () => {
		it('handles service errors gracefully', async () => {
			// Mock service error
			mockEmployeeService.getEmployeeById.mockResolvedValue(
				Result.error({
					code: 'INTERNAL_ERROR',
					message: 'Internal server error',
					name: 'InternalError'
				})
			);

			const { load } = await import('../../../../src/routes/dashboard/employees/[id]/+page.server');

			try {
				await load(mockEvent as RequestEvent);
				expect(true).toBe(false); // Should not reach here
			} catch (error: any) {
				expect(error.status).toBe(500);
			}
		});

		it('handles network errors gracefully', async () => {
			// Mock network failure
			mockEmployeeService.getEmployeeById.mockRejectedValue(new Error('Network error'));

			const { load } = await import('../../../../src/routes/dashboard/employees/[id]/+page.server');

			try {
				await load(mockEvent as RequestEvent);
				expect(true).toBe(false); // Should not reach here
			} catch (error: any) {
				expect(error.status).toBe(500);
			}
		});

		it('shows appropriate error message when employee not found', async () => {
			// Mock employee not found
			mockEmployeeService.getEmployeeById.mockResolvedValue(
				Result.error({
					code: 'EMPLOYEE_NOT_FOUND',
					message: 'Employee not found',
					name: 'EmployeeNotFoundError'
				})
			);

			const { load } = await import('../../../../src/routes/dashboard/employees/[id]/+page.server');

			try {
				await load(mockEvent as RequestEvent);
				expect(true).toBe(false); // Should not reach here
			} catch (error: any) {
				expect(error.status).toBe(404);
				expect(error.body?.message).toContain('Employee not found');
			}
		});
	});
});
