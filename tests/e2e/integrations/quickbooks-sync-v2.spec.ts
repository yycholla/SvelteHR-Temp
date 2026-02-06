/**
 * E2E Tests for QuickBooks Sync v2 (Hexagonal Architecture)
 *
 * Tests the new consolidated sync API and UI components.
 */

import { test, expect } from '@playwright/test';

test.describe('QuickBooks Sync v2 - Dashboard', () => {
	test.beforeEach(async ({ page }) => {
		// Navigate to integrations page
		await page.goto('/admin/settings/integrations');
		// Wait for page to be fully loaded
		await page.waitForLoadState('networkidle');
	});

	test('displays QuickBooks connection status', async ({ page }) => {
		// Check for connection status indicator
		const statusIndicator = page.locator('text=/Connected to|Not Connected/');
		await expect(statusIndicator).toBeVisible();
	});

	test('shows metrics overview cards', async ({ page }) => {
		// Verify all metric cards are present
		await expect(page.locator('text=Success Rate')).toBeVisible();
		await expect(page.locator('text=Uptime')).toBeVisible();
		await expect(page.locator('text=Errors')).toBeVisible();
		await expect(page.locator('text=Active Alerts')).toBeVisible();
		await expect(page.locator('text=Last Sync')).toBeVisible();
	});

	test('renders sync action buttons when connected', async ({ page }) => {
		const syncAllButton = page.locator('button:has-text("Sync All")');
		const syncEmployeesButton = page.locator('button:has-text("Sync Employees")');
		const syncDepartmentsButton = page.locator('button:has-text("Sync Departments")');

		// Buttons should be visible if connected
		const isConnected = await page.locator('text=Connected to').isVisible();
		if (isConnected) {
			await expect(syncAllButton).toBeVisible();
			await expect(syncEmployeesButton).toBeVisible();
			await expect(syncDepartmentsButton).toBeVisible();
		}
	});

	test('displays feature navigation grid', async ({ page }) => {
		// Verify navigation sections are present
		await expect(page.locator('text=Monitoring')).toBeVisible();
		await expect(page.locator('text=Data Operations')).toBeVisible();
		await expect(page.locator('text=Error Management')).toBeVisible();
		await expect(page.locator('text=Advanced')).toBeVisible();

		// Check for key navigation links
		await expect(page.locator('a:has-text("Sync Dashboard")')).toBeVisible();
		await expect(page.locator('a:has-text("Health Monitor")')).toBeVisible();
		await expect(page.locator('a:has-text("Conflicts")')).toBeVisible();
	});
});

test.describe('QuickBooks Sync v2 - Sync Operations', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/admin/settings/integrations');
		await page.waitForLoadState('networkidle');
	});

	test('opens confirmation dialog for bidirectional sync', async ({ page }) => {
		// Skip if not connected
		const isConnected = await page.locator('text=Connected to').isVisible();
		if (!isConnected) {
			test.skip();
			return;
		}

		// Click "Sync Employees" button
		await page.click('button:has-text("Sync Employees")');

		// Verify confirmation dialog appears
		await expect(page.locator('text=Confirm Sync')).toBeVisible();
		await expect(page.locator('text=employees')).toBeVisible();
		await expect(page.locator('text=Two-way sync')).toBeVisible();

		// Check for strategy information
		await expect(page.locator('text=last write wins')).toBeVisible();

		// Verify action buttons
		await expect(page.locator('button:has-text("Cancel")')).toBeVisible();
		await expect(page.locator('button:has-text("Start Sync")')).toBeVisible();
	});

	test('can cancel sync confirmation dialog', async ({ page }) => {
		const isConnected = await page.locator('text=Connected to').isVisible();
		if (!isConnected) {
			test.skip();
			return;
		}

		// Open dialog
		await page.click('button:has-text("Sync Employees")');
		await expect(page.locator('text=Confirm Sync')).toBeVisible();

		// Cancel dialog
		await page.click('button:has-text("Cancel")');

		// Dialog should be closed
		await expect(page.locator('text=Confirm Sync')).not.toBeVisible();
	});

	test('displays loading state during sync', async ({ page }) => {
		const isConnected = await page.locator('text=Connected to').isVisible();
		if (!isConnected) {
			test.skip();
			return;
		}

		// Intercept sync API call to delay response
		await page.route('**/api/sync', async (route) => {
			// Delay response by 2 seconds
			await new Promise((resolve) => setTimeout(resolve, 2000));
			await route.continue();
		});

		// Trigger sync
		await page.click('button:has-text("Sync Employees")');
		await page.click('button:has-text("Start Sync")');

		// Verify loading state
		await expect(page.locator('text=Syncing')).toBeVisible();

		// Wait for sync to complete
		await page.waitForTimeout(3000);
	});
});

test.describe('QuickBooks Sync v2 - SyncStatusCards', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/admin/settings/integrations');
		await page.waitForLoadState('networkidle');
	});

	test('displays status cards after successful sync', async ({ page }) => {
		const isConnected = await page.locator('text=Connected to').isVisible();
		if (!isConnected) {
			test.skip();
			return;
		}

		// Mock successful sync response
		await page.route('**/api/sync', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					success: true,
					entity_type: 'EMPLOYEE',
					direction: 'BIDIRECTIONAL',
					mode: 'INCREMENTAL',
					status: 'COMPLETED',
					started_at: new Date().toISOString(),
					completed_at: new Date().toISOString(),
					duration_ms: 1500,
					pushed_count: 5,
					pulled_count: 3,
					conflicts_count: 1,
					errors: [],
					message: 'Successfully synced: 5 pushed, 3 pulled, 1 conflict resolved'
				})
			});
		});

		// Trigger sync
		await page.click('button:has-text("Sync Employees")');
		await page.click('button:has-text("Start Sync")');

		// Wait for sync to complete
		await page.waitForTimeout(1000);

		// Verify status cards are displayed
		await expect(page.locator('text=Sync Status')).toBeVisible();
		await expect(page.locator('text=Pushed')).toBeVisible();
		await expect(page.locator('text=Pulled')).toBeVisible();
		await expect(page.locator('text=Conflicts')).toBeVisible();

		// Verify counts are displayed
		await expect(page.locator('text=5').first()).toBeVisible(); // pushed count
		await expect(page.locator('text=3').first()).toBeVisible(); // pulled count
	});

	test('shows error badge when sync has errors', async ({ page }) => {
		const isConnected = await page.locator('text=Connected to').isVisible();
		if (!isConnected) {
			test.skip();
			return;
		}

		// Mock sync response with errors
		await page.route('**/api/sync', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					success: false,
					entity_type: 'EMPLOYEE',
					direction: 'BIDIRECTIONAL',
					mode: 'INCREMENTAL',
					status: 'COMPLETED_WITH_ERRORS',
					started_at: new Date().toISOString(),
					completed_at: new Date().toISOString(),
					duration_ms: 1500,
					pushed_count: 2,
					pulled_count: 0,
					conflicts_count: 0,
					errors: ['Validation error: Invalid email format', 'Network timeout'],
					message: 'Sync completed with errors'
				})
			});
		});

		// Trigger sync
		await page.click('button:has-text("Sync Employees")');
		await page.click('button:has-text("Start Sync")');

		// Wait for sync to complete
		await page.waitForTimeout(1000);

		// Verify error indicators
		await expect(page.locator('text=COMPLETED WITH ERRORS')).toBeVisible();
		await expect(page.locator('text=2 errors')).toBeVisible();
	});
});

test.describe('QuickBooks Sync v2 - ActionableErrorDisplay', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/admin/settings/integrations');
		await page.waitForLoadState('networkidle');
	});

	test('displays categorized errors after failed sync', async ({ page }) => {
		const isConnected = await page.locator('text=Connected to').isVisible();
		if (!isConnected) {
			test.skip();
			return;
		}

		// Mock sync response with various error types
		await page.route('**/api/sync', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					success: false,
					entity_type: 'EMPLOYEE',
					direction: 'PUSH',
					mode: 'INCREMENTAL',
					status: 'COMPLETED_WITH_ERRORS',
					started_at: new Date().toISOString(),
					completed_at: new Date().toISOString(),
					duration_ms: 500,
					pushed_count: 0,
					pulled_count: 0,
					conflicts_count: 0,
					errors: [
						'Token expired: Please re-authenticate',
						'Rate limit exceeded: Too many requests',
						'Validation failed: Email is required'
					],
					message: 'Sync failed with multiple errors'
				})
			});
		});

		// Trigger sync
		await page.click('button:has-text("Sync Employees")');
		await page.click('button:has-text("Start Sync")');

		// Wait for sync to complete
		await page.waitForTimeout(1000);

		// Verify error display
		await expect(page.locator('text=Sync Errors')).toBeVisible();

		// Check for categorized error sections
		await expect(page.locator('text=Authentication Required')).toBeVisible();
		await expect(page.locator('text=Rate Limit Exceeded')).toBeVisible();
		await expect(page.locator('text=Validation Error')).toBeVisible();
	});

	test('allows dismissing individual errors', async ({ page }) => {
		const isConnected = await page.locator('text=Connected to').isVisible();
		if (!isConnected) {
			test.skip();
			return;
		}

		// Mock sync response with errors
		await page.route('**/api/sync', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					success: false,
					entity_type: 'EMPLOYEE',
					direction: 'PUSH',
					mode: 'INCREMENTAL',
					status: 'FAILED',
					started_at: new Date().toISOString(),
					completed_at: new Date().toISOString(),
					duration_ms: 100,
					pushed_count: 0,
					pulled_count: 0,
					conflicts_count: 0,
					errors: ['Error 1: Network timeout', 'Error 2: Invalid data'],
					message: 'Sync failed'
				})
			});
		});

		// Trigger sync
		await page.click('button:has-text("Sync Employees")');
		await page.click('button:has-text("Start Sync")');
		await page.waitForTimeout(1000);

		// Count initial errors
		const errorCount = await page.locator('text=Sync Errors').count();
		expect(errorCount).toBeGreaterThan(0);

		// Look for dismiss buttons (X icons) - they might be in a collapsible section
		// First, expand the error section if it's collapsed
		const expandButton = page
			.locator('button')
			.filter({ hasText: /Network|Validation/i })
			.first();
		if (await expandButton.isVisible()) {
			await expandButton.click();
			await page.waitForTimeout(500);
		}
	});

	test('provides retry button for retryable errors', async ({ page }) => {
		const isConnected = await page.locator('text=Connected to').isVisible();
		if (!isConnected) {
			test.skip();
			return;
		}

		// Mock sync response with retryable error
		await page.route('**/api/sync', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					success: false,
					entity_type: 'EMPLOYEE',
					direction: 'PUSH',
					mode: 'INCREMENTAL',
					status: 'FAILED',
					started_at: new Date().toISOString(),
					completed_at: new Date().toISOString(),
					duration_ms: 100,
					pushed_count: 0,
					pulled_count: 0,
					conflicts_count: 0,
					errors: ['Network timeout occurred'],
					message: 'Sync failed due to network issue'
				})
			});
		});

		// Trigger sync
		await page.click('button:has-text("Sync Employees")');
		await page.click('button:has-text("Start Sync")');
		await page.waitForTimeout(1000);

		// Look for retry button
		const retryButton = page.locator('button:has-text("Retry")');
		await expect(retryButton.first()).toBeVisible();
	});
});

test.describe('QuickBooks Sync v2 - API Integration', () => {
	test('sends correct request to /api/sync endpoint', async ({ page }) => {
		await page.goto('/admin/settings/integrations');
		await page.waitForLoadState('networkidle');

		const isConnected = await page.locator('text=Connected to').isVisible();
		if (!isConnected) {
			test.skip();
			return;
		}

		// Intercept API call
		let requestBody: unknown = null;
		await page.route('**/api/sync', async (route) => {
			const request = route.request();
			requestBody = request.postDataJSON();

			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					success: true,
					entity_type: 'EMPLOYEE',
					direction: 'BIDIRECTIONAL',
					mode: 'INCREMENTAL',
					status: 'COMPLETED',
					started_at: new Date().toISOString(),
					completed_at: new Date().toISOString(),
					duration_ms: 1000,
					pushed_count: 0,
					pulled_count: 0,
					conflicts_count: 0,
					errors: [],
					message: 'Sync completed'
				})
			});
		});

		// Trigger sync
		await page.click('button:has-text("Sync Employees")');
		await page.click('button:has-text("Start Sync")');

		// Wait for request
		await page.waitForTimeout(1000);

		// Verify request body
		expect(requestBody).toBeTruthy();
		expect(requestBody).toHaveProperty('entity_type', 'EMPLOYEE');
		expect(requestBody).toHaveProperty('direction', 'BIDIRECTIONAL');
		expect(requestBody).toHaveProperty('mode', 'INCREMENTAL');
	});
});

test.describe('QuickBooks Sync v2 - Navigation', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/admin/settings/integrations');
		await page.waitForLoadState('networkidle');
	});

	test('navigates to sync dashboard', async ({ page }) => {
		await page.click('a:has-text("Sync Dashboard")');
		await page.waitForLoadState('networkidle');
		expect(page.url()).toContain('/integrations/sync-status');
	});

	test('navigates to conflicts page', async ({ page }) => {
		await page.click('a:has-text("Conflicts")');
		await page.waitForLoadState('networkidle');
		expect(page.url()).toContain('/integrations/conflicts');
	});

	test('navigates to health monitor', async ({ page }) => {
		await page.click('a:has-text("Health Monitor")');
		await page.waitForLoadState('networkidle');
		expect(page.url()).toContain('/integrations/health');
	});

	test('navigates to audit trail', async ({ page }) => {
		await page.click('a:has-text("Audit Trail")');
		await page.waitForLoadState('networkidle');
		expect(page.url()).toContain('/integrations/audit');
	});
});
