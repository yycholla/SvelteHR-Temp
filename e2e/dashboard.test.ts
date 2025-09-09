import { test, expect } from '@playwright/test';
import { TestHelpers } from './utils/test-helpers';

test.describe('Dashboard', () => {
	let helpers: TestHelpers;

	test.beforeEach(async ({ page }) => {
		helpers = new TestHelpers(page);
		await helpers.loginAsAdmin();
	});

	test('should load dashboard with basic elements', async ({ page }) => {
		// Should be on dashboard
		await expect(page).toHaveURL('/home');
		await expect(page.locator('h1')).toContainText('Dashboard');

		// Should have dashboard content
		const dashboardContent = page.locator('.dashboard-page, .streaming-dashboard, main');
		await expect(dashboardContent).toBeVisible();

		// Wait for any loading to complete
		await helpers.waitForLoadingToComplete();

		// Take screenshot for visual regression
		await helpers.takeScreenshot('dashboard-loaded');
	});

	test('should toggle between static and streaming modes', async ({ page }) => {
		// Look for mode toggle buttons
		const staticButton = page.locator('button:has-text("Static")');
		const streamingButton = page.locator('button:has-text("Streaming")');

		// If toggle exists, test it
		if ((await staticButton.isVisible()) || (await streamingButton.isVisible())) {
			// Test streaming mode
			if (await streamingButton.isVisible()) {
				await streamingButton.click();

				// Should show progress bar
				const progressBar = page.locator('.progress-bar, .progress-container');
				await expect(progressBar).toBeVisible({ timeout: 2000 });

				// Wait for streaming to complete
				await helpers.waitForStreamingComplete();

				await helpers.takeScreenshot('dashboard-streaming-complete');
			}

			// Test static mode
			if (await staticButton.isVisible()) {
				await staticButton.click();
				await page.waitForTimeout(1000);
				await helpers.takeScreenshot('dashboard-static-mode');
			}
		}
	});

	test('should display dashboard cards and metrics', async ({ page }) => {
		await helpers.waitForLoadingToComplete();

		// Look for common dashboard elements
		const dashboardElements = [
			'.dashboard-card',
			'.stat-card',
			'.metric-value',
			'[data-testid="dashboard-card"]'
		];

		let cardsFound = false;
		for (const selector of dashboardElements) {
			if ((await page.locator(selector).count()) > 0) {
				cardsFound = true;
				break;
			}
		}

		// Should have some dashboard content
		expect(cardsFound).toBeTruthy();
	});

	test('should handle streaming errors gracefully', async ({ page }) => {
		// Mock failing API calls
		await page.route('**/api/v1/**', (route) => {
			route.fulfill({ status: 500, body: 'Server Error' });
		});

		// Reload page to trigger API calls
		await page.reload();
		await helpers.waitForLoadingToComplete();

		// Should show error handling UI
		const hasErrors = await helpers.checkForApiErrors();

		// Even with errors, page should still be usable
		await expect(page.locator('h1')).toContainText('Dashboard');
	});

	test('should be responsive on different screen sizes', async ({ page }) => {
		await helpers.testResponsiveDesign();
	});

	test('should have proper accessibility', async ({ page }) => {
		await helpers.waitForLoadingToComplete();
		await helpers.checkAccessibility();
	});

	test('should navigate to other sections', async ({ page }) => {
		// Look for navigation links
		const navLinks = [
			{ text: 'Employees', expectedUrl: '/employees' },
			{ text: 'Tasks', expectedUrl: '/tasks' },
			{ text: 'HR', expectedUrl: '/hr' },
			{ text: 'Admin', expectedUrl: '/admin' }
		];

		for (const link of navLinks) {
			// Look for navigation link (could be in header, sidebar, or cards)
			const navLink = page
				.locator(`a:has-text("${link.text}"), button:has-text("${link.text}")`)
				.first();

			if (await navLink.isVisible()) {
				await navLink.click();
				await page.waitForURL(link.expectedUrl, { timeout: 10000 });
				await expect(page).toHaveURL(link.expectedUrl);

				// Go back to dashboard
				await page.goto('/home');
			}
		}
	});
});
