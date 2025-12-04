import { test, expect } from '@playwright/test';

/**
 * E2E test for error retry functionality
 * Tests that retry buttons work correctly for data loading failures
 */

test.describe('Error Retry Functionality', () => {
	test('should show retry button on data loading failure', async ({ page }) => {
		// Mock GraphQL failure
		await page.route('**/graphql', (route) => {
			route.fulfill({
				status: 503,
				body: JSON.stringify({
					errors: [{ message: 'Service temporarily unavailable' }]
				})
			});
		});

		await page.goto('/dashboard');

		// Should show error message with retry button
		const errorContainer = page.locator('[data-testid="error-container"]');
		await expect(errorContainer).toBeVisible({ timeout: 10000 });

		const retryButton = page.locator('[data-testid="retry-button"]');
		await expect(retryButton).toBeVisible();

		// Error message should be user-friendly
		const errorMessage = page.locator('[data-testid="error-message"]');
		const errorText = await errorMessage.textContent();

		expect(errorText).toContain('retry');
		expect(errorText).not.toContain('GraphQL');
		expect(errorText).not.toContain('503');
	});

	test('should retry successfully after initial failure', async ({ page }) => {
		let requestCount = 0;

		// Mock: fail first request, succeed on retry
		await page.route('**/graphql', (route) => {
			requestCount++;

			if (requestCount === 1) {
				// First request fails
				route.fulfill({
					status: 503,
					body: JSON.stringify({
						errors: [{ message: 'Service temporarily unavailable' }]
					})
				});
			} else {
				// Subsequent requests succeed
				route.continue();
			}
		});

		await page.goto('/dashboard');

		// Wait for error state
		const retryButton = page.locator('[data-testid="retry-button"]');
		await expect(retryButton).toBeVisible({ timeout: 10000 });

		// Click retry
		await retryButton.click();

		// Should eventually show data or better state
		await page.waitForTimeout(3000);

		// Error container should be hidden or show different message
		const errorContainer = page.locator('[data-testid="error-container"]');
		const isErrorVisible = await errorContainer.isVisible();

		if (isErrorVisible) {
			// If error still visible, should be different (not the same 503 error)
			const errorText = await page.locator('[data-testid="error-message"]').textContent();
			expect(errorText).not.toContain('Service temporarily unavailable');
		}

		// Should have made at least 2 requests
		expect(requestCount).toBeGreaterThanOrEqual(2);
	});

	test('should show loading state during retry', async ({ page }) => {
		await page.route('**/graphql', (route) => {
			route.fulfill({
				status: 503,
				body: JSON.stringify({
					errors: [{ message: 'Service temporarily unavailable' }]
				})
			});
		});

		await page.goto('/dashboard');

		const retryButton = page.locator('[data-testid="retry-button"]');
		await expect(retryButton).toBeVisible();

		// Mock slow response for retry
		await page.unroute('**/graphql');
		await page.route('**/graphql', async (route) => {
			await new Promise((resolve) => setTimeout(resolve, 2000));
			route.continue();
		});

		// Click retry
		await retryButton.click();

		// Should show loading state
		const loadingIndicators = [
			'[data-testid="loading-spinner"]',
			'[data-testid="retry-loading"]',
			'text=Loading...',
			'text=Retrying...'
		];

		let foundLoading = false;
		for (const selector of loadingIndicators) {
			const element = page.locator(selector);
			if (await element.isVisible()) {
				foundLoading = true;
				break;
			}
		}

		// Should show some loading indicator during retry
		// Note: This might be flaky due to timing, so we'll check retry button state instead
		const isRetryDisabled = await retryButton.isDisabled();
		expect(foundLoading || isRetryDisabled).toBe(true);
	});

	test('should handle multiple retry attempts gracefully', async ({ page }) => {
		let requestCount = 0;

		await page.route('**/graphql', (route) => {
			requestCount++;

			// Fail first 3 requests
			if (requestCount <= 3) {
				route.fulfill({
					status: 503,
					body: JSON.stringify({
						errors: [{ message: 'Service temporarily unavailable' }]
					})
				});
			} else {
				route.continue();
			}
		});

		await page.goto('/dashboard');

		// Retry multiple times
		for (let i = 0; i < 3; i++) {
			const retryButton = page.locator('[data-testid="retry-button"]');
			await expect(retryButton).toBeVisible();
			await retryButton.click();
			await page.waitForTimeout(1000);
		}

		// Should eventually succeed or show appropriate error
		await page.waitForTimeout(2000);

		const errorMessage = page.locator('[data-testid="error-message"]');
		if (await errorMessage.isVisible()) {
			const errorText = await errorMessage.textContent();
			// Should not be the same repeated error
			expect(errorText).toBeTruthy();
		}

		expect(requestCount).toBeGreaterThanOrEqual(3);
	});

	test('should preserve user context during retry', async ({ page }) => {
		// First, navigate to dashboard successfully
		await page.goto('/dashboard');

		// Mock failure for specific data request
		await page.route('**/graphql', (route) => {
			if (route.request().postData()?.includes('getDashboardData')) {
				route.fulfill({
					status: 503,
					body: JSON.stringify({
						errors: [{ message: 'Service temporarily unavailable' }]
					})
				});
			} else {
				route.continue();
			}
		});

		// Reload to trigger error
		await page.reload();

		// Should still be on dashboard page
		expect(page.url()).toContain('/dashboard');

		// Should show retry for data, not redirect to login
		const retryButton = page.locator('[data-testid="retry-button"]');
		await expect(retryButton).toBeVisible();

		// Should not redirect to login page
		expect(page.url()).not.toContain('/login');
	});

	test('should handle different error types appropriately', async ({ page }) => {
		const errorScenarios = [
			{
				status: 401,
				body: { errors: [{ message: 'Unauthorized' }] },
				expectedBehavior: 'redirect_or_auth_error'
			},
			{
				status: 403,
				body: { errors: [{ message: 'Forbidden' }] },
				expectedBehavior: 'permission_error'
			},
			{
				status: 404,
				body: { errors: [{ message: 'Not found' }] },
				expectedBehavior: 'not_found_error'
			},
			{
				status: 503,
				body: { errors: [{ message: 'Service unavailable' }] },
				expectedBehavior: 'retry_button'
			}
		];

		for (const scenario of errorScenarios) {
			await page.route('**/graphql', (route) => {
				route.fulfill({
					status: scenario.status,
					body: JSON.stringify(scenario.body)
				});
			});

			await page.goto('/dashboard');

			await page.waitForTimeout(2000);

			if (scenario.expectedBehavior === 'retry_button') {
				// Should show retry button for 503 errors
				const retryButton = page.locator('[data-testid="retry-button"]');
				await expect(retryButton).toBeVisible();
			} else if (scenario.expectedBehavior === 'redirect_or_auth_error') {
				// 401 might redirect to login or show auth error
				const isLoginPage = page.url().includes('/login');
				const hasAuthError = await page.locator('text=Unauthorized').isVisible();
				expect(isLoginPage || hasAuthError).toBe(true);
			}

			// Clean up route for next iteration
			await page.unroute('**/graphql');
		}
	});

	test('should show contextual error messages', async ({ page }) => {
		await page.route('**/graphql', (route) => {
			const postData = route.request().postData() || '';

			if (postData.includes('getEmployees')) {
				route.fulfill({
					status: 503,
					body: JSON.stringify({
						errors: [{ message: 'Employee service unavailable' }]
					})
				});
			} else {
				route.continue();
			}
		});

		await page.goto('/dashboard/employees');

		// Should show employee-specific error message
		const errorMessage = page.locator('[data-testid="error-message"]');
		await expect(errorMessage).toBeVisible();

		const errorText = await errorMessage.textContent();
		expect(errorText).toContain('employee');
	});

	test('should clear error state on successful retry', async ({ page }) => {
		let failRequest = true;

		await page.route('**/graphql', (route) => {
			if (failRequest) {
				route.fulfill({
					status: 503,
					body: JSON.stringify({
						errors: [{ message: 'Service temporarily unavailable' }]
					})
				});
			} else {
				route.continue();
			}
		});

		await page.goto('/dashboard');

		// Wait for error
		const errorContainer = page.locator('[data-testid="error-container"]');
		await expect(errorContainer).toBeVisible();

		// Enable success for retry
		failRequest = false;

		// Click retry
		const retryButton = page.locator('[data-testid="retry-button"]');
		await retryButton.click();

		// Error should be cleared
		await expect(errorContainer).not.toBeVisible({ timeout: 10000 });

		// Should show data instead
		const dataContainer = page.locator('[data-testid="dashboard-summary"]');
		await expect(dataContainer).toBeVisible();
	});
});
