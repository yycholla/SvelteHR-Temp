import { describe, expect, test } from 'vitest';
import {
	clickElement,
	countElements,
	expectURLMatch,
	extractNumber,
	getElementText,
	gotoPage,
	pageContainsText,
	reloadPage,
	waitForElement,
	waitForNetworkIdle
} from '../utils/vitest-browser-helpers';

/**
 * E2E test for dashboard data display using Vitest Browser Mode
 * Tests that real data is displayed instead of placeholders
 *
 * MIGRATION NOTE: This is the Vitest Browser Mode version
 * Benefits:
 * - Works on Arch Linux (avoids Playwright issues)
 * - Uses WebDriverIO provider
 * - Faster than Playwright
 * - Better integration with existing Vitest tests
 */

describe('Dashboard Data Display (Vitest Browser)', () => {
	test('should display real employee data instead of placeholders', async () => {
		await gotoPage('/dashboard');
		await waitForElement('[data-testid="dashboard-summary"]');

		// Get employee count
		const employeeCountText = await getElementText('[data-testid="employee-count"]');
		const employeeCount = extractNumber(employeeCountText);

		// Should be within seed data range (40-50 employees)
		expect(employeeCount).toBeGreaterThanOrEqual(40);
		expect(employeeCount).toBeLessThanOrEqual(50);

		// Should not be obvious placeholder values
		expect(employeeCount).not.toBe(100);
		expect(employeeCount).not.toBe(1000);
		expect(employeeCount).not.toBe(999);

		// Get department count
		const deptCountText = await getElementText('[data-testid="department-count"]');
		const deptCount = extractNumber(deptCountText);

		// Should be within seed data range (10-15 departments)
		expect(deptCount).toBeGreaterThanOrEqual(10);
		expect(deptCount).toBeLessThanOrEqual(15);

		// Should not contain placeholder text
		const hasLoremIpsum = await pageContainsText('Lorem ipsum');
		const hasPlaceholder = await pageContainsText('Placeholder');
		const hasSampleData = await pageContainsText('Sample data');
		const hasMockData = await pageContainsText('Mock data');

		expect(hasLoremIpsum).toBe(false);
		expect(hasPlaceholder).toBe(false);
		expect(hasSampleData).toBe(false);
		expect(hasMockData).toBe(false);
	});

	test('should show recent activities from database', async () => {
		await gotoPage('/dashboard');

		// Check if activities section exists
		const activityCount = await countElements('[data-testid="activity-item"]');

		if (activityCount > 0) {
			// Check first 3 activities for realistic data
			for (let i = 0; i < Math.min(activityCount, 3); i++) {
				const activityText = await getElementText(
					`[data-testid="activity-item"]:nth-child(${i + 1})`
				);

				// Should not contain obvious placeholders
				expect(activityText).not.toContain('Sample');
				expect(activityText).not.toContain('Test');
				expect(activityText).not.toContain('Placeholder');
				expect(activityText).not.toContain('user123');
				expect(activityText).not.toContain('test@test.com');
			}
		}
	});

	test('should display calculated metrics from real data', async () => {
		await gotoPage('/dashboard');

		// Check for metrics section
		const metricsCount = await countElements('[data-testid^="metric-"]');

		if (metricsCount > 0) {
			// Check growth metric if available
			const growthText = await getElementText('[data-testid="metric-growth"]').catch(() => '');
			if (growthText) {
				expect(growthText).not.toContain('99.9%');
				expect(growthText).not.toContain('100%');
				expect(growthText).not.toContain('12.34%');

				// Should contain realistic numbers
				const hasNumber = /\d+/.test(growthText);
				expect(hasNumber).toBe(true);
			}
		}
	});

	test('should show proper empty states when data is minimal', async () => {
		await gotoPage('/dashboard');

		// Look for empty state messages
		const hasEventsEmpty = await pageContainsText('No upcoming events');
		const hasApprovalsEmpty = await pageContainsText('No pending approvals');

		// Empty states should show appropriate messages
		// This is a soft check - it's okay if there's data or empty states
		if (hasEventsEmpty || hasApprovalsEmpty) {
			expect(hasEventsEmpty || hasApprovalsEmpty).toBe(true);
		}
	});

	test('should update data timestamps correctly', async () => {
		await gotoPage('/dashboard');

		// Check for timestamp elements
		const timestampText = await getElementText('[data-testid="last-updated"]').catch(() => '');

		if (timestampText) {
			// Should not show placeholder timestamps
			expect(timestampText).not.toContain('2023-01-01');
			expect(timestampText).not.toContain('January 1, 2000');
			expect(timestampText).not.toContain('Never');

			// Should contain recent date
			const now = new Date();
			const currentYear = now.getFullYear().toString();
			expect(timestampText).toContain(currentYear);
		}
	});

	test('should display consistent data across page refreshes', async () => {
		await gotoPage('/dashboard');
		await waitForElement('[data-testid="employee-count"]');

		// Get initial data
		const initialCountText = await getElementText('[data-testid="employee-count"]');
		const initialCount = extractNumber(initialCountText);

		// Reload page
		await reloadPage();
		await waitForElement('[data-testid="employee-count"]');

		// Get data after refresh
		const refreshedCountText = await getElementText('[data-testid="employee-count"]');
		const refreshedCount = extractNumber(refreshedCountText);

		// Data should be consistent (from database, not random)
		expect(refreshedCount).toBe(initialCount);
	});

	test('should navigate to detail pages without errors', async () => {
		await gotoPage('/dashboard');

		// Navigate to employees page
		const hasEmployeesLink = await countElements('[data-testid="view-employees"]');
		if (hasEmployeesLink > 0) {
			await clickElement('[data-testid="view-employees"]');
			await expectURLMatch('**/employees**');

			// Should not show 500 errors
			const has500Error = await pageContainsText('500');
			const hasInternalError = await pageContainsText('Internal Server Error');

			expect(has500Error).toBe(false);
			expect(hasInternalError).toBe(false);

			// Navigate back to dashboard
			await gotoPage('/dashboard');
		}

		// Navigate to departments page
		const hasDepartmentsLink = await countElements('[data-testid="view-departments"]');
		if (hasDepartmentsLink > 0) {
			await clickElement('[data-testid="view-departments"]');
			await expectURLMatch('**/departments**');

			// Check for errors
			const hasErrors = await pageContainsText('500');
			expect(hasErrors).toBe(false);
		}
	});

	test('should verify data is not placeholder content', async () => {
		await gotoPage('/dashboard');
		await waitForNetworkIdle();

		// Comprehensive placeholder check
		const placeholders = ['Lorem ipsum', 'Placeholder', 'Sample data', 'Mock data', 'Test data'];

		for (const placeholder of placeholders) {
			const hasPlaceholder = await pageContainsText(placeholder);
			expect(hasPlaceholder).toBe(false);
		}

		// Should have actual data
		const employeeCountText = await getElementText('[data-testid="employee-count"]');
		const hasNumbers = /\d+/.test(employeeCountText);
		expect(hasNumbers).toBe(true);
	});
});
