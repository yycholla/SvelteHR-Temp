import { test, expect } from '@playwright/test';

/**
 * E2E test for dashboard data display
 * Tests that real data is displayed instead of placeholders
 */

test.describe('Dashboard Data Display', () => {
	test.beforeEach(async ({ page }) => {
		// This test will initially fail until real data replaces placeholders
		await page.goto('/dashboard');
	});

	test('should display real employee data instead of placeholders', async ({ page }) => {
		// Wait for dashboard to load
		await page.waitForSelector('[data-testid="dashboard-summary"]', { timeout: 10000 });

		// Check employee count
		const employeeCountElement = page.locator('[data-testid="employee-count"]');
		if (await employeeCountElement.isVisible()) {
			const countText = await employeeCountElement.textContent();
			const count = parseInt(countText?.replace(/\D/g, '') || '0');

			// Should be within seed data range (40-50 employees)
			expect(count).toBeGreaterThanOrEqual(40);
			expect(count).toBeLessThanOrEqual(50);

			// Should not be obvious placeholder values
			expect(count).not.toBe(100);
			expect(count).not.toBe(1000);
			expect(count).not.toBe(999);
		}

		// Check department count
		const deptCountElement = page.locator('[data-testid="department-count"]');
		if (await deptCountElement.isVisible()) {
			const countText = await deptCountElement.textContent();
			const count = parseInt(countText?.replace(/\D/g, '') || '0');

			// Should be within seed data range (10-15 departments)
			expect(count).toBeGreaterThanOrEqual(10);
			expect(count).toBeLessThanOrEqual(15);
		}

		// Should not contain placeholder text
		const pageContent = await page.textContent('body');
		expect(pageContent).not.toContain('Lorem ipsum');
		expect(pageContent).not.toContain('Placeholder');
		expect(pageContent).not.toContain('Sample data');
		expect(pageContent).not.toContain('Mock data');
	});

	test('should show recent activities from database', async ({ page }) => {
		// Check for recent activities section
		const activitiesSection = page.locator('[data-testid="recent-activities"]');

		if (await activitiesSection.isVisible()) {
			const activityItems = page.locator('[data-testid="activity-item"]');
			const count = await activityItems.count();

			if (count > 0) {
				// Activities should have realistic data
				for (let i = 0; i < Math.min(count, 3); i++) {
					const activity = activityItems.nth(i);
					const activityText = await activity.textContent();

					// Should not contain obvious placeholders
					expect(activityText).not.toContain('Sample');
					expect(activityText).not.toContain('Test');
					expect(activityText).not.toContain('Placeholder');

					// Should have realistic usernames
					expect(activityText).not.toContain('user123');
					expect(activityText).not.toContain('test@test.com');
				}
			}
		}
	});

	test('should display calculated metrics from real data', async ({ page }) => {
		// Check for metrics section
		const metricsSection = page.locator('[data-testid="dashboard-metrics"]');

		if (await metricsSection.isVisible()) {
			// Check for specific metrics
			const metrics = [
				'[data-testid="metric-growth"]',
				'[data-testid="metric-retention"]',
				'[data-testid="metric-satisfaction"]'
			];

			for (const metricSelector of metrics) {
				const metric = page.locator(metricSelector);
				if (await metric.isVisible()) {
					const metricText = await metric.textContent();

					// Should not be obvious placeholder percentages
					expect(metricText).not.toContain('99.9%');
					expect(metricText).not.toContain('100%');
					expect(metricText).not.toContain('12.34%');

					// Should contain realistic percentage or number
					const hasNumber = /\d+/.test(metricText || '');
					expect(hasNumber).toBe(true);
				}
			}
		}
	});

	test('should show proper empty states when data is minimal', async ({ page }) => {
		// This tests the requirement for "No data available" messages

		// Look for sections that might be empty
		const emptySections = [
			'[data-testid="upcoming-events"]',
			'[data-testid="pending-approvals"]',
			'[data-testid="team-announcements"]'
		];

		for (const sectionSelector of emptySections) {
			const section = page.locator(sectionSelector);
			if (await section.isVisible()) {
				const sectionText = await section.textContent();

				// If section has no data items, should show proper empty state
				const hasDataItems = await section.locator('[data-testid*="item"]').count() > 0;

				if (!hasDataItems && sectionText) {
					// Should show "No data available" message as per requirements
					const hasEmptyMessage =
						sectionText.includes('No data available') ||
						sectionText.includes('No items') ||
						sectionText.includes('Nothing to show');

					expect(hasEmptyMessage).toBe(true);
				}
			}
		}
	});

	test('should handle data loading errors gracefully', async ({ page }) => {
		// Mock GraphQL failure to test error handling
		await page.route('**/graphql', route => {
			if (route.request().postData()?.includes('getDashboardData')) {
				route.fulfill({
					status: 500,
					body: JSON.stringify({
						errors: [{ message: 'Database connection failed' }]
					})
				});
			} else {
				route.continue();
			}
		});

		await page.reload();

		// Should show error message with retry button
		const errorMessage = page.locator('[data-testid="error-message"]');
		await expect(errorMessage).toBeVisible({ timeout: 10000 });

		// Should show retry button
		const retryButton = page.locator('[data-testid="retry-button"]');
		await expect(retryButton).toBeVisible();

		// Error message should be user-friendly
		const errorText = await errorMessage.textContent();
		expect(errorText).not.toContain('undefined');
		expect(errorText).not.toContain('null');
		expect(errorText).not.toContain('GraphQL');
		expect(errorText).not.toContain('500');
	});

	test('should update data timestamps correctly', async ({ page }) => {
		// Check for "last updated" timestamps
		const timestampElements = [
			'[data-testid="last-updated"]',
			'[data-testid="data-timestamp"]',
			'text=Updated'
		];

		for (const selector of timestampElements) {
			const element = page.locator(selector);
			if (await element.isVisible()) {
				const timestampText = await element.textContent();

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
			}
		}
	});

	test('should display consistent data across page refreshes', async ({ page }) => {
		// Get initial data
		await page.waitForSelector('[data-testid="employee-count"]', { timeout: 10000 });
		const initialEmployeeCount = await page.locator('[data-testid="employee-count"]').textContent();

		// Refresh page
		await page.reload();

		// Wait for data to load again
		await page.waitForSelector('[data-testid="employee-count"]', { timeout: 10000 });
		const refreshedEmployeeCount = await page.locator('[data-testid="employee-count"]').textContent();

		// Data should be consistent (from database, not random)
		expect(refreshedEmployeeCount).toBe(initialEmployeeCount);
	});

	test('should navigate to detail pages without errors', async ({ page }) => {
		// Test navigation to ensure all pages work with real data
		const navigationLinks = [
			{ selector: '[data-testid="view-employees"]', expectedUrl: '/dashboard/employees' },
			{ selector: '[data-testid="view-departments"]', expectedUrl: '/dashboard/departments' }
		];

		for (const link of navigationLinks) {
			const linkElement = page.locator(link.selector);
			if (await linkElement.isVisible()) {
				await linkElement.click();

				// Should navigate successfully
				await page.waitForURL(`**${link.expectedUrl}`, { timeout: 10000 });

				// Should not show 500 errors
				const pageContent = await page.textContent('body');
				expect(pageContent).not.toContain('500');
				expect(pageContent).not.toContain('Internal Server Error');

				// Navigate back to dashboard
				await page.goto('/dashboard');
			}
		}
	});
});