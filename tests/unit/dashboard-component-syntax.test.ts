/// <reference types="@testing-library/jest-dom/vitest" />
import { render } from '@testing-library/svelte';
import { describe, expect, test, vi } from 'vitest';
import DashboardPage from '../../src/routes/dashboard/+page.svelte';
import type { PageData } from '../../src/routes/dashboard/$types';

describe('Dashboard Component Syntax Compatibility - RED Phase', () => {
	test('dynamic component rendering works without deprecated svelte:component', () => {
		// RED PHASE: This should fail initially due to <svelte:component> deprecation warnings
		// Mock console.warn to capture deprecation warnings
		const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

		const mockData = {
			roles: ['Employee'],
			notifications: [],
			systemName: 'SvelteHR',
			user: {
				id: 'test-user-id',
				email: 'test@example.com',
				displayName: 'Test User',
				roles: ['Employee'],
				firstName: 'Test',
				lastName: 'User'
			},
			userSession: {
				userId: 'test-user-id',
				userEmail: 'test@example.com',
				roles: ['Employee'],
				accessToken: ''
			},
			preferences: {
				selectedPeriod: 'week',
				viewMode: 'overview',
				theme: 'light',
				showWelcome: true
			},
			permissions: [],
			userPerms: {
				canManageUsers: false,
				canViewReports: false,
				canApproveLeave: false,
				canManageDepartments: false,
				canManageRoles: false,
				canViewAuditLogs: false,
				canManageSettings: false,
				canManagePayroll: false,
				canViewAnalytics: false,
				canManageDocuments: false
			},
			canManageUsers: false,
			canViewReports: false,
			canApproveLeave: false,
			isAdmin: false,
			isSuperAdmin: false,
			weatherPromise: Promise.resolve('Test Weather'),
			loadedAt: new Date().toISOString(),
			dashboardDataPromise: Promise.resolve({
				dashboardData: {
					metrics: {
						attendanceRate: 95,
						pendingRequests: 3,
						taskCount: 5,
						remainingVacationDays: 10
					},
					activities: [],
					tasks: [],
					events: []
				},
				dashboardMetrics: [],
				recentActivities: [],
				upcomingEvents: [],
				quickActions: []
			})
		};

		try {
			const component = render(DashboardPage, { data: mockData as any });

			// Test that components render properly (basic rendering test)
			expect(component.container).toBeDefined();

			// RED PHASE: This will fail initially due to <svelte:component> deprecation warnings
			expect(consoleWarnSpy).not.toHaveBeenCalledWith(expect.stringContaining('svelte:component'));
		} finally {
			consoleWarnSpy.mockRestore();
		}
	});

	test('metric icons render dynamically without svelte:component deprecation', () => {
		// RED PHASE: This test specifically targets the metric icon rendering issue
		const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

		const mockData = {
			roles: ['Employee'],
			notifications: [],
			systemName: 'SvelteHR',
			user: {
				id: 'test-user-id',
				email: 'test@example.com',
				displayName: 'Test User',
				roles: ['Employee'],
				firstName: 'Test',
				lastName: 'User'
			},
			userSession: {
				userId: 'test-user-id',
				userEmail: 'test@example.com',
				roles: ['Employee'],
				accessToken: ''
			},
			preferences: {
				selectedPeriod: 'week',
				viewMode: 'overview',
				theme: 'light',
				showWelcome: true
			},
			permissions: [],
			userPerms: {
				canManageUsers: false,
				canViewReports: false,
				canApproveLeave: false,
				canManageDepartments: false,
				canManageRoles: false,
				canViewAuditLogs: false,
				canManageSettings: false,
				canManagePayroll: false,
				canViewAnalytics: false,
				canManageDocuments: false
			},
			canManageUsers: false,
			canViewReports: false,
			canApproveLeave: false,
			isAdmin: false,
			isSuperAdmin: false,
			weatherPromise: Promise.resolve('Test Weather'),
			loadedAt: new Date().toISOString(),
			dashboardDataPromise: Promise.resolve({
				dashboardData: {
					metrics: {
						attendanceRate: 95,
						pendingRequests: 3,
						taskCount: 5,
						remainingVacationDays: 10
					},
					activities: [],
					tasks: [],
					events: []
				},
				dashboardMetrics: [],
				recentActivities: [],
				upcomingEvents: [],
				quickActions: []
			})
		};

		try {
			render(DashboardPage, { data: mockData as any });

			// RED PHASE: This will fail because dashboard/+page.svelte line 123 uses <svelte:component>
			expect(consoleWarnSpy).not.toHaveBeenCalledWith(
				expect.stringMatching(/svelte:component.*is deprecated/)
			);
		} finally {
			consoleWarnSpy.mockRestore();
		}
	});
});
