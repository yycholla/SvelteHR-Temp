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
const { mockPageStore } = vi.hoisted(() => {
	return {
		mockPageStore: {
			url: 'http://localhost/dashboard/management'
		}
	};
});

vi.mock('$app/stores', () => {
	return {
		page: {
			subscribe: vi.fn((fn) => {
				const url = new URL(mockPageStore.url);
				fn({ url });
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
		mockPageStore.url = 'http://localhost/dashboard/management';
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
		mockPageStore.url = 'http://localhost/dashboard/management';
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

	test('updateFilters should update search params and navigate correctly', async () => {
		const { container } = render(ManagementPage, { data: commonMockData }); // Use commonMockData here
		const periodSelect = container.querySelector('select:first-of-type') as HTMLSelectElement;
		const teamSelect = container.querySelectorAll('select')[1] as HTMLSelectElement;

		// Test case 1: selectedPeriod is not 'this-month', selectedTeamId is present
		fireEvent.change(periodSelect, { target: { value: 'this-week' } });
		fireEvent.change(teamSelect, { target: { value: 'engineering' } });

		// Assertions on gotoMock
		expect(gotoMock).toHaveBeenCalledWith(
			'/dashboard/management?period=this-week&team=engineering',
			{ invalidateAll: true }
		);

		// Clear mocks for the next sub-test
		gotoMock.mockClear();

		// Test case 2: selectedPeriod is 'this-month', selectedTeamId is present
		fireEvent.change(periodSelect, { target: { value: 'this-month' } });
		fireEvent.change(teamSelect, { target: { value: 'marketing' } });

		// period is default so it should be removed, only team remains
		expect(gotoMock).toHaveBeenCalledWith('/dashboard/management?team=marketing', {
			invalidateAll: true
		});

		gotoMock.mockClear();

		// Test case 3: selectedPeriod is not 'this-month', selectedTeamId is empty
		fireEvent.change(periodSelect, { target: { value: 'last-month' } });
		fireEvent.change(teamSelect, { target: { value: '' } });

		expect(gotoMock).toHaveBeenCalledWith('/dashboard/management?period=last-month', {
			invalidateAll: true
		});

		gotoMock.mockClear();

		// Test case 4: selectedPeriod is 'this-month', selectedTeamId is empty
		fireEvent.change(periodSelect, { target: { value: 'this-month' } });
		fireEvent.change(teamSelect, { target: { value: '' } });

		// Both are default/empty, so query string should be empty
		expect(gotoMock).toHaveBeenCalledWith('/dashboard/management?', { invalidateAll: true });

		gotoMock.mockClear();
	});
});
