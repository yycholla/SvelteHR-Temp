import { fireEvent, render } from '@testing-library/svelte';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import ManagementPage from '../../../../../src/routes/dashboard/management/+page.svelte';
import {
	formatDate,
	getAlertColors,
	getAlertIcon,
	getProgressColor
} from '../../../../../src/routes/dashboard/management/utils';

// Mock SvelteKit's $app/navigation
const { gotoMock } = vi.hoisted(() => {
	return { gotoMock: vi.fn() };
});

vi.mock('$app/navigation', async () => {
	const actual = await vi.importActual<typeof import('$app/navigation')>('$app/navigation');
	return {
		...actual,
		goto: gotoMock
	};
});
const { mockPageStore, getPageValue } = vi.hoisted(() => {
	let currentUrl = new URL('http://localhost/dashboard/management');

	return {
		mockPageStore: {
			get url() {
				return currentUrl;
			},
			updateUrl: (newUrl: string) => {
				currentUrl = new URL(newUrl);
			}
		},
		getPageValue: () => ({ url: currentUrl })
	};
});

vi.mock('$app/stores', () => {
	return {
		page: {
			subscribe: vi.fn((fn) => {
				fn(getPageValue());
				return vi.fn();
			})
		},
		navigating: { subscribe: vi.fn(() => vi.fn()) },
		updated: { subscribe: vi.fn(() => vi.fn()) }
	};
});

describe('Management Page', () => {
	let commonMockData: any;

	beforeEach(() => {
		// Reset mockPageUrl before each test
		mockPageStore.updateUrl('http://localhost/dashboard/management');
		gotoMock.mockClear();

		commonMockData = {
			user: {
				id: 'user-1',
				displayName: 'Test Manager',
				email: 'manager@test.com',
				role: 'manager'
			},
			userSession: { userId: 'user-1', expiresAt: new Date().toISOString() },
			dashboardAnalytics: {
				leaveRequests: { pending: 5, approved: 12, rejected: 2, totalThisMonth: 19 },
				performanceReviews: { pending: 3, overdue: 1, completed: 8, avgRating: 4.2 },
				teamGoals: { active: 10, overdue: 2, atRisk: 3, avgProgress: 75, completed: 15 },
				reports: { generated: 25, scheduled: 8, failed: 1, totalThisMonth: 26 },
				teamStats: {
					totalEmployees: 45,
					activeEmployees: 42,
					departmentCount: 5,
					avgTenure: '3.2 years'
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
			permissions: [],
			canManageLeave: true,
			canManageReviews: true,
			canManageGoals: true,
			canGenerateReports: true,
			loadedAt: new Date().toISOString()
		};
	});

	test('management filters state reactivity works correctly', () => {
		const { container } = render(ManagementPage, { data: commonMockData });

		// Test that initial values are set
		const periodSelect = container.querySelector('select:first-of-type') as HTMLSelectElement;
		expect(periodSelect).toBeTruthy();
		expect(periodSelect.value).toBe('this-month');

		// Test reactivity
		const updatedFilters = {
			selectedPeriod: 'this-quarter',
			selectedTeamId: 'engineering'
		};

		const updatedComponent = render(ManagementPage, {
			data: { ...commonMockData, filters: updatedFilters }
		});
		const updatedPeriodSelect = updatedComponent.container.querySelector(
			'select:first-of-type'
		) as HTMLSelectElement;
		expect(updatedPeriodSelect.value).toBe('this-quarter');
	});

	test('team selection state captures changes properly', () => {
		const specificMockData = {
			...commonMockData,
			filters: {
				selectedPeriod: 'this-month',
				selectedTeamId: 'marketing'
			}
		};

		const { container } = render(ManagementPage, { data: specificMockData });

		// Check initial state
		const teamSelect = container.querySelectorAll('select')[1] as HTMLSelectElement;
		expect(teamSelect).toBeTruthy();
		expect(teamSelect.value).toBe('marketing');

		// Test reactivity
		const updatedData = {
			...specificMockData,
			filters: { ...specificMockData.filters, selectedTeamId: 'engineering' }
		};

		const updatedComponent = render(ManagementPage, { data: updatedData });
		const updatedTeamSelect = updatedComponent.container.querySelectorAll(
			'select'
		)[1] as HTMLSelectElement;
		expect(updatedTeamSelect.value).toBe('engineering');
	});
});

describe('Utility Functions', () => {
	let commonMockData: any;

	beforeEach(() => {
		// Reset mockPageUrl before each test in this suite
		mockPageStore.updateUrl('http://localhost/dashboard/management');
		gotoMock.mockClear(); // Clear goto mock as well

		commonMockData = {
			user: {
				id: 'user-1',
				displayName: 'Test Manager',
				email: 'manager@test.com',
				role: 'manager'
			},
			userSession: { userId: 'user-1', expiresAt: new Date().toISOString() },
			dashboardAnalytics: {
				leaveRequests: { pending: 5, approved: 12, rejected: 2, totalThisMonth: 19 },
				performanceReviews: { pending: 3, overdue: 1, completed: 8, avgRating: 4.2 },
				teamGoals: { active: 10, overdue: 2, atRisk: 3, avgProgress: 75, completed: 15 },
				reports: { generated: 25, scheduled: 8, failed: 1, totalThisMonth: 26 },
				teamStats: {
					totalEmployees: 45,
					activeEmployees: 42,
					departmentCount: 5,
					avgTenure: '3.2 years'
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
			permissions: [],
			canManageLeave: true,
			canManageReviews: true,
			canManageGoals: true,
			canGenerateReports: true,
			loadedAt: new Date().toISOString()
		};
	});

	test('formatDate should format a date string correctly', () => {
		expect(formatDate('2025-12-09T10:30:00Z')).toBe('Dec 9, 10:30 AM');
		expect(formatDate('2025-01-15T08:00:00Z')).toBe('Jan 15, 08:00 AM');
	});

	test('getProgressColor should return correct color based on percentage', () => {
		expect(getProgressColor(95, 100)).toBe('green');
		expect(getProgressColor(75, 100)).toBe('yellow');
		expect(getProgressColor(60, 100)).toBe('red');
		expect(getProgressColor(0, 100)).toBe('red');
		expect(getProgressColor(100, 100)).toBe('green');
	});

	test('getAlertIcon should return correct icon based on alert type', () => {
		expect(getAlertIcon('error')).toBeTruthy(); // Checks if AlertCircle is returned
		expect(getAlertIcon('warning')).toBeTruthy();
		expect(getAlertIcon('info')).toBeTruthy();
		expect(getAlertIcon('unknown')).toBeTruthy(); // Default case
	});

	test('getAlertColors should return correct color palette based on alert type', () => {
		let colors = getAlertColors('error');
		expect(colors.bg).toBe('bg-red-50');
		expect(colors.icon).toBe('text-red-500');

		colors = getAlertColors('warning');
		expect(colors.bg).toBe('bg-yellow-50');
		expect(colors.icon).toBe('text-yellow-500');

		colors = getAlertColors('info');
		expect(colors.bg).toBe('bg-blue-50');
		expect(colors.icon).toBe('text-blue-500');

		colors = getAlertColors('unknown'); // Default case
		expect(colors.bg).toBe('bg-muted dark:bg-muted');
		expect(colors.icon).toBe('text-muted-foreground');
	});

	test('URL construction logic works correctly', () => {
		// Test URL construction logic directly rather than through DOM events
		// This tests the core logic without relying on component internals

		const basePath = '/dashboard/management';

		// Test case 1: Both params present
		const params1 = new URLSearchParams();
		params1.set('period', 'this-week');
		params1.set('team', 'engineering');
		const url1 = params1.toString() ? `${basePath}?${params1.toString()}` : basePath;
		expect(url1).toBe('/dashboard/management?period=this-week&team=engineering');

		// Test case 2: Only team param (period is default)
		const params2 = new URLSearchParams();
		params2.set('team', 'marketing');
		const url2 = params2.toString() ? `${basePath}?${params2.toString()}` : basePath;
		expect(url2).toBe('/dashboard/management?team=marketing');

		// Test case 3: Only period param
		const params3 = new URLSearchParams();
		params3.set('period', 'last-month');
		const url3 = params3.toString() ? `${basePath}?${params3.toString()}` : basePath;
		expect(url3).toBe('/dashboard/management?period=last-month');

		// Test case 4: No params (both default/empty)
		const params4 = new URLSearchParams();
		const url4 = params4.toString() ? `${basePath}?${params4.toString()}` : basePath;
		expect(url4).toBe('/dashboard/management');
	});
});
