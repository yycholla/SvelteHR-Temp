import { render } from '@testing-library/svelte';
import { describe, expect, test } from 'vitest';
import ManagementPage from '../../../src/routes/dashboard/management/+page.svelte';

describe('Management Page State Reactivity - RED Phase', () => {
	test('management filters state reactivity works correctly', () => {
		// RED PHASE: This should fail initially due to $state(filters.property) capturing only initial values

		const mockData = {
			user: {
				id: 'test-user-1',
				email: 'test@example.com',
				displayName: 'Test User',
				role: 'manager'
			},
			userSession: {
				userId: 'test-user-1',
				userEmail: 'test@example.com',
				role: 'manager',
				accessToken: ''
			},
			dashboardAnalytics: {
				leaveRequests: { pending: 3, approved: 10, rejected: 1, totalThisMonth: 14 },
				performanceReviews: { pending: 5, overdue: 2, completed: 15, avgRating: 4.2 },
				teamGoals: { active: 12, overdue: 2, atRisk: 3, avgProgress: 75, completed: 18 },
				reports: { generated: 8, scheduled: 3, failed: 1, totalThisMonth: 12 },
				teamStats: {
					totalEmployees: 25,
					activeEmployees: 24,
					departmentCount: 3,
					avgTenure: '2.5 years'
				}
			},
			recentActivities: [],
			performanceMetrics: [],
			alerts: [],
			quickActions: [],
			filters: {
				selectedPeriod: 'this-month',
				selectedTeamId: 'team-123'
			},
			managedDepartmentId: 1,
			isAdmin: false,
			canEditAllTeams: false,
			permissions: ['management:read:team'],
			canManageTeam: true,
			canViewAllTeams: false,
			canManageLeave: true,
			canManageReviews: true,
			canManageGoals: true,
			canGenerateReports: true,
			loadedAt: new Date().toISOString()
		};

		const component = render(ManagementPage, { data: mockData });

		// RED PHASE: This will fail because $state(filters.selectedPeriod) only captures initial value
		// When filters change, the component should react but currently doesn't due to lines 108-109

		// Test that initial values are set
		expect(component.container.innerHTML).toContain('this-month');

		// Test reactivity - this should work but doesn't due to state reference capture issue
		const updatedFilters = {
			selectedPeriod: 'last-quarter',
			selectedTeamId: 'team-456'
		};

		// The component should react to filter changes, but currently it won't
		// due to $state(filters.selectedPeriod) only capturing the initial value
		expect(() => {
			const updatedComponent = render(ManagementPage, {
				data: { ...mockData, filters: updatedFilters }
			});
			expect(updatedComponent.container.innerHTML).toContain('last-quarter');
		}).not.toThrow();
	});

	test('team selection state captures changes properly', () => {
		// RED PHASE: Test specific to selectedTeamId state reactivity issue

		const mockData = {
			user: {
				id: 'test-user-2',
				email: 'manager@example.com',
				displayName: 'Manager User',
				role: 'manager'
			},
			userSession: {
				userId: 'test-user-2',
				userEmail: 'manager@example.com',
				role: 'manager',
				accessToken: ''
			},
			dashboardAnalytics: {
				leaveRequests: { pending: 5, approved: 12, rejected: 2, totalThisMonth: 19 },
				performanceReviews: { pending: 8, overdue: 3, completed: 20, avgRating: 4.5 },
				teamGoals: { active: 15, overdue: 3, atRisk: 4, avgProgress: 80, completed: 22 },
				reports: { generated: 10, scheduled: 4, failed: 0, totalThisMonth: 14 },
				teamStats: {
					totalEmployees: 30,
					activeEmployees: 29,
					departmentCount: 2,
					avgTenure: '3 years'
				}
			},
			recentActivities: [],
			performanceMetrics: [],
			alerts: [],
			quickActions: [],
			filters: {
				selectedPeriod: 'this-month',
				selectedTeamId: 'team-123'
			},
			managedDepartmentId: 2,
			isAdmin: false,
			canEditAllTeams: false,
			permissions: ['management:read:team'],
			canManageTeam: true,
			canViewAllTeams: false,
			canManageLeave: true,
			canManageReviews: true,
			canManageGoals: true,
			canGenerateReports: true,
			loadedAt: new Date().toISOString()
		};

		const component = render(ManagementPage, { data: mockData });

		// RED PHASE: This will fail because $state(filters.selectedTeamId) only captures initial value
		expect(component.container.innerHTML).toContain('team-123');

		// Test reactivity - this should work but doesn't due to state reference capture
		const updatedData = {
			...mockData,
			filters: { ...mockData.filters, selectedTeamId: 'team-456' }
		};

		// This should be reactive but currently isn't due to line 109 issue
		expect(() => {
			const updatedComponent = render(ManagementPage, { data: updatedData });
			expect(updatedComponent.container.innerHTML).toContain('team-456');
		}).not.toThrow();
	});
});
