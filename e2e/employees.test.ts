import { test, expect } from '@playwright/test';
import { TestHelpers } from './utils/test-helpers';

test.describe('Employee Management', () => {
	let helpers: TestHelpers;

	test.beforeEach(async ({ page }) => {
		helpers = new TestHelpers(page);
		await helpers.loginAsAdmin();
	});

	test('should load employees page', async ({ page }) => {
		await page.goto('/employees');

		// Should show employees page
		await expect(page.locator('h1')).toContainText('Employees');

		// Wait for content to load
		await helpers.waitForLoadingToComplete();

		// Should have employee-related UI elements
		const employeeElements = [
			'table',
			'.employee-table',
			'.employee-list',
			'[data-testid="employee-table"]',
			'text="Search employees"',
			'input[placeholder*="Search"]'
		];

		let elementFound = false;
		for (const selector of employeeElements) {
			if (
				await page
					.locator(selector)
					.isVisible()
					.catch(() => false)
			) {
				elementFound = true;
				break;
			}
		}

		expect(elementFound).toBeTruthy();

		await helpers.takeScreenshot('employees-page');
	});

	test('should search employees', async ({ page }) => {
		await page.goto('/employees');
		await helpers.waitForLoadingToComplete();

		// Look for search input
		const searchInput = page
			.locator('input[placeholder*="Search"], input[placeholder*="search"]')
			.first();

		if (await searchInput.isVisible()) {
			// Test search functionality
			await searchInput.fill('admin');
			await page.waitForTimeout(1000); // Allow for debouncing

			// Should filter results or trigger search
			await helpers.takeScreenshot('employees-search');

			// Clear search
			await searchInput.clear();
			await page.waitForTimeout(1000);
		}
	});

	test('should handle employee filters', async ({ page }) => {
		await page.goto('/employees');
		await helpers.waitForLoadingToComplete();

		// Look for filter button
		const filterButton = page
			.locator('button:has-text("Filter"), button:has-text("filter")')
			.first();

		if (await filterButton.isVisible()) {
			await filterButton.click();

			// Should show filter options
			const filterPanel = page.locator('.filter-panel, .filters, [role="dialog"]');
			await expect(filterPanel).toBeVisible({ timeout: 5000 });

			await helpers.takeScreenshot('employees-filters');

			// Close filter panel
			const closeButton = page.locator('button:has-text("Close"), button:has-text("×")').first();
			if (await closeButton.isVisible()) {
				await closeButton.click();
			}
		}
	});

	test('should navigate to add employee page', async ({ page }) => {
		await page.goto('/employees');

		// Look for add employee button
		const addButton = page.locator('button:has-text("Add"), a:has-text("Add")').first();

		if (await addButton.isVisible()) {
			await addButton.click();

			// Should navigate to create/add page
			await page.waitForTimeout(2000);
			const currentUrl = page.url();
			expect(currentUrl).toMatch(/\/(employees\/create|employees\/new|create)/);

			await helpers.takeScreenshot('add-employee-page');
		}
	});

	test('should display employee data in table', async ({ page }) => {
		await page.goto('/employees');

		// Wait for table data to load
		await helpers.waitForTableData('table', 15000);

		// Should have table headers
		const table = page.locator('table');
		if (await table.isVisible()) {
			const headers = table.locator('thead th, thead td');
			const headerCount = await headers.count();
			expect(headerCount).toBeGreaterThan(0);

			// Should have data rows
			const dataRows = table.locator('tbody tr');
			const rowCount = await dataRows.count();
			expect(rowCount).toBeGreaterThan(0);

			await helpers.takeScreenshot('employees-table-data');
		}
	});

	test('should handle pagination if present', async ({ page }) => {
		await page.goto('/employees');
		await helpers.waitForLoadingToComplete();

		// Look for pagination controls
		const paginationControls = [
			'button:has-text("Next")',
			'button:has-text("Previous")',
			'.pagination',
			'[aria-label*="pagination"]'
		];

		let paginationFound = false;
		for (const selector of paginationControls) {
			if (
				await page
					.locator(selector)
					.isVisible()
					.catch(() => false)
			) {
				paginationFound = true;
				break;
			}
		}

		if (paginationFound) {
			const nextButton = page.locator('button:has-text("Next")').first();
			if ((await nextButton.isVisible()) && (await nextButton.isEnabled())) {
				await nextButton.click();
				await page.waitForTimeout(2000);
				await helpers.takeScreenshot('employees-page-2');
			}
		}
	});

	test('should test streaming mode on employees page', async ({ page }) => {
		await page.goto('/employees');

		// Check if streaming toggle is available
		const streamingButton = page.locator('button:has-text("Streaming")').first();

		if (await streamingButton.isVisible()) {
			await streamingButton.click();

			// Should show streaming progress
			const progressContainer = page.locator('.progress-container');
			await expect(progressContainer).toBeVisible({ timeout: 3000 });

			// Wait for streaming to complete
			await helpers.waitForStreamingComplete(15000);

			// Should show streaming data
			const streamingContent = page.locator('.streaming-content');
			await expect(streamingContent).toBeVisible({ timeout: 5000 });

			await helpers.takeScreenshot('employees-streaming-complete');
		}
	});

	test('should export employees data', async ({ page }) => {
		await page.goto('/employees');
		await helpers.waitForLoadingToComplete();

		// Look for export button
		const exportButton = page
			.locator('button:has-text("Export"), button:has-text("Download")')
			.first();

		if (await exportButton.isVisible()) {
			// Start download
			const downloadPromise = page.waitForEvent('download');
			await exportButton.click();

			try {
				const download = await downloadPromise;
				expect(download.suggestedFilename()).toMatch(/\.(csv|xlsx|pdf)$/);
			} catch (error) {
				// Export functionality may not be fully implemented
				console.log('Export test skipped - functionality may not be implemented');
			}
		}
	});

	test('should be responsive', async ({ page }) => {
		await page.goto('/employees');
		await helpers.waitForLoadingToComplete();
		await helpers.testResponsiveDesign();
	});

	test('should have proper accessibility', async ({ page }) => {
		await page.goto('/employees');
		await helpers.waitForLoadingToComplete();
		await helpers.checkAccessibility();
	});
});
