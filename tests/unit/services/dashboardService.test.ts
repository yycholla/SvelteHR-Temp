import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DashboardService } from '$lib/services/dashboardService';
import { GraphQLClient } from '$lib/server/graphql-client';
import {
	GET_USERS_QUERY,
	GET_DEPARTMENTS_QUERY,
	GET_USER_ATTENDANCE_QUERY
} from '$lib/graphql/dashboard/queries';

// Mock GraphQL Client
const mockQuery = vi.fn();
const mockSetCookies = vi.fn();

vi.mock('$lib/server/graphql-client', () => {
	return {
		GraphQLClient: vi.fn().mockImplementation(() => ({
			query: mockQuery,
			setCookies: mockSetCookies
		}))
	};
});

describe('DashboardService', () => {
	let service: DashboardService;
	// We don't need a separate mockClient variable if we use the global mock functions
	const userId = 'user-123';
	const roles = ['Employee'];

	beforeEach(() => {
		// Reset mocks
		mockQuery.mockReset();
		mockSetCookies.mockReset();

		// Create a mock object that matches GraphQLClient interface
		const clientMock = {
			query: mockQuery,
			setCookies: mockSetCookies
		} as unknown as GraphQLClient;

		service = new DashboardService(clientMock, userId, roles);
	});

	describe('getCriticalData', () => {
		it('should fetch users and departments successfully', async () => {
			const mockUsers = [{ id: '1', firstName: 'John' }];
			const mockDepts = [{ id: '1', name: 'Engineering' }];

			mockQuery.mockImplementation((query: string) => {
				if (query === GET_USERS_QUERY) {
					return Promise.resolve({ data: { users: mockUsers } });
				}
				if (query === GET_DEPARTMENTS_QUERY) {
					return Promise.resolve({ data: { departments: mockDepts } });
				}
				return Promise.resolve({ data: {} });
			});

			const result = await service.getCriticalData();

			expect(result.users).toEqual(mockUsers);
			expect(result.departments).toEqual(mockDepts);
			expect(mockQuery).toHaveBeenCalledTimes(2);
		});

		it('should handle failures gracefully', async () => {
			mockQuery.mockRejectedValue(new Error('Network error'));

			const result = await service.getCriticalData();

			expect(result.users).toEqual([]);
			expect(result.departments).toEqual([]);
		});
	});

	describe('getSlowData', () => {
		it('should fetch all slow data sources', async () => {
			// Mock successful responses for all queries
			mockQuery.mockResolvedValue({
				data: {
					attendanceRecords: [],
					leaveRequests: [],
					employeeGoals: [],
					tasks: [],
					events: [],
					activityLogs: []
				}
			});

			const result = await service.getSlowData();

			expect(result.attendance).toEqual([]);
			expect(result.leaveRequests).toEqual([]);
			expect(result.goals).toEqual([]);
			expect(result.tasks).toEqual([]);
			expect(result.events).toEqual([]);
			expect(result.activityLogs).toEqual([]);

			// Admin/SuperAdmin fields should be empty/zero
			expect(result.systemAuditLogs).toEqual([]);
			expect(result.rollbackRequests).toEqual([]);
			expect(result.rollbackStats).toBe(0);
		});

		it('should fetch admin data when user is admin', async () => {
			const mockQueryAdmin = vi.fn();
			const clientMock = {
				query: mockQueryAdmin,
				setCookies: vi.fn()
			} as unknown as GraphQLClient;

			const adminService = new DashboardService(clientMock, userId, ['Admin']);

			mockQueryAdmin.mockResolvedValue({
				data: {
					// ... other fields
					attendanceRecords: [],
					leaveRequests: [],
					employeeGoals: [],
					tasks: [],
					events: [],
					activityLogs: [{ id: 'audit-1' }], // For system audit logs
					rollbackRequests: [{ id: 'roll-1' }],
					rollbackRequestsCount: 5
				}
			});

			const result = await adminService.getSlowData();

			// Should have called admin queries
			// We can verify by checking if systemAuditLogs is populated (mock returns activityLogs for both user and system logs)
			expect(result.systemAuditLogs).toHaveLength(1);
			expect(result.rollbackRequests).toHaveLength(1);
			expect(result.rollbackStats).toBe(5);
		});
	});
});
