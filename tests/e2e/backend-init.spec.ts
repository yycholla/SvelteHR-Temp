import { expect, test } from '@playwright/test';

/**
 * E2E test for backend initialization flow
 * Tests that pages load correctly after backend startup
 */

test.describe('Backend Initialization', () => {
	test.beforeEach(async ({ page }) => {
		// This test will initially fail until proper backend initialization is implemented
	});

	test('should handle cold start gracefully', async ({ page }) => {
		// Test the scenario where backend services are starting up

		// First, check health endpoint directly
		const healthResponse = await page.request.get('/api/health');
		const healthData = await healthResponse.json();

		// Health check should work regardless of backend status
		expect(['healthy', 'initializing', 'error']).toContain(healthData.status);

		// Navigate to dashboard - should handle initialization state
		await page.goto('/dashboard');

		// Page should load without throwing errors
		await expect(page).toHaveTitle(/SvelteHR|Dashboard/);

		// Should not show 500 errors
		const errorMessages = page.locator('[data-testid="error-message"]');
		const errorText = await errorMessages.textContent();

		if (errorText) {
			// If error is shown, it should be user-friendly, not a 500 error
			expect(errorText).not.toContain('500');
			expect(errorText).not.toContain('Internal Server Error');

			// Should show retry button
			const retryButton = page.locator('[data-testid="retry-button"]');
			await expect(retryButton).toBeVisible();
		}
	});

	test('should display appropriate loading states during initialization', async ({ page }) => {
		await page.goto('/dashboard');

		// Check for loading indicators
		const loadingStates = [
			'[data-testid="loading-spinner"]',
			'[data-testid="skeleton-loader"]',
			'text=Loading...',
			'text=Initializing...'
		];

		// At least one loading indicator should be present or data should be loaded
		let hasLoadingOrData = false;

		for (const selector of loadingStates) {
			const element = page.locator(selector);
			if (await element.isVisible()) {
				hasLoadingOrData = true;
				break;
			}
		}

		// Or check if data is already loaded
		const dataElements = [
			'[data-testid="employee-count"]',
			'[data-testid="department-count"]',
			'[data-testid="dashboard-metrics"]'
		];

		for (const selector of dataElements) {
			const element = page.locator(selector);
			if (await element.isVisible()) {
				hasLoadingOrData = true;
				break;
			}
		}

		// Should show either loading state or data
		expect(hasLoadingOrData).toBe(true);
	});

	test('should retry failed requests automatically', async ({ page }) => {
		// Mock network failures to test retry logic
		await page.route('**/graphql', (route) => {
			// Fail first request, succeed on retry
			const url = route.request().url();
			const headers = route.request().headers();

			// Allow health checks to pass
			if (route.request().url().includes('/api/health')) {
				route.continue();
				return;
			}

			// Simulate backend not ready
			route.fulfill({
				status: 503,
				body: JSON.stringify({
					errors: [{ message: 'Service temporarily unavailable' }]
				})
			});
		});

		await page.goto('/dashboard');

		// Should show error with retry button
		const retryButton = page.locator('[data-testid="retry-button"]');
		await expect(retryButton).toBeVisible({ timeout: 10000 });

		// Remove route mock to allow retry to succeed
		await page.unroute('**/graphql');

		// Click retry button
		await retryButton.click();

		// Should eventually load successfully or show better error
		await page.waitForTimeout(2000);

		// Verify we don't get stuck in error state
		const errorMessage = page.locator('[data-testid="error-message"]');
		if (await errorMessage.isVisible()) {
			const text = await errorMessage.textContent();
			// Error should be informative, not a generic 500
			expect(text).not.toContain('Unexpected error');
		}
	});

	test('should handle partial service availability', async ({ page }) => {
		// Test scenario where some services are up but others are not
		await page.goto('/dashboard');

		// Wait for page to stabilize
		await page.waitForTimeout(3000);

		// Check if health endpoint shows mixed service status
		const healthResponse = await page.request.get('/api/health');
		const healthData = await healthResponse.json();

		if (healthData.status === 'initializing') {
			// Some services might be ready
			const services = healthData.services;
			const serviceStates = Object.values(services);

			// Should have at least one service status
			expect(serviceStates.length).toBeGreaterThan(0);

			// Should show appropriate message for partial availability
			expect(healthData.message).toBeTruthy();
		}

		// Page should still be functional even with partial services
		const pageTitle = await page.title();
		expect(pageTitle).toBeTruthy();
	});

	test('should prevent HTTP 500 errors on newer pages', async ({ page }) => {
		// This specifically tests the issue mentioned in requirements
		const pagesToTest = [
			'/dashboard',
			'/dashboard/employees',
			'/dashboard/departments',
			'/admin/analytics',
			'/dashboard/management',
			'/dashboard/management/goals'
		];

		for (const pagePath of pagesToTest) {
			const response = await page.goto(pagePath);

			// Should not return 500 status
			expect(response?.status()).not.toBe(500);

			// Page should load with title
			await expect(page).toHaveTitle(/SvelteHR|Dashboard/);

			// Should not show generic server errors
			const errorElements = page.locator('text=Internal Server Error');
			expect(await errorElements.count()).toBe(0);

			const httpErrorElements = page.locator('text=500');
			expect(await httpErrorElements.count()).toBe(0);
		}
	});

	test('should handle concurrent page loads during initialization', async ({ browser }) => {
		// Test multiple pages loading simultaneously during backend startup
		const context = await browser.newContext();

		const pages = await Promise.all([context.newPage(), context.newPage(), context.newPage()]);

		const urls = ['/dashboard', '/dashboard/employees', '/dashboard/departments'];

		// Load all pages simultaneously
		const loadPromises = pages.map((page, index) => page.goto(urls[index]));

		const responses = await Promise.all(loadPromises);

		// All pages should load without 500 errors
		responses.forEach((response, index) => {
			expect(response?.status()).not.toBe(500);
		});

		// All pages should have proper titles
		for (const page of pages) {
			await expect(page).toHaveTitle(/SvelteHR|Dashboard/);
		}

		// Clean up
		await context.close();
	});

	test('should maintain session during backend initialization', async ({ page }) => {
		// Navigate to protected page
		await page.goto('/dashboard');

		// Should either show login page or dashboard
		const isLoggedIn = await page.locator('[data-testid="user-menu"]').isVisible();
		const isLoginPage = await page.locator('[data-testid="login-form"]').isVisible();

		expect(isLoggedIn || isLoginPage).toBe(true);

		// If logged in, session should be maintained through backend restarts
		if (isLoggedIn) {
			// Reload page to simulate backend restart
			await page.reload();

			// Should either stay logged in or gracefully redirect to login
			await page.waitForTimeout(3000);

			// Should not show error state
			const errorMessage = page.locator('[data-testid="error-message"]');
			if (await errorMessage.isVisible()) {
				const text = await errorMessage.textContent();
				expect(text).not.toContain('Unexpected error');
			}
		}
	});
});
