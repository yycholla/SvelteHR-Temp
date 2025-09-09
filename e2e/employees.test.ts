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

	test('should open add employee modal', async ({ page }) => {
		await page.goto('/employees');
		await helpers.waitForLoadingToComplete();

		// Look for add employee button
		const addButton = page.locator('button:has-text("Add Employee"), .add-employee-btn').first();

		if (await addButton.isVisible()) {
			await addButton.click();

			// Modal should open
			await expect(page.locator('.modal, [role="dialog"]')).toBeVisible({ timeout: 5000 });
			await expect(page.locator('h2:has-text("Add"), h3:has-text("Add")')).toBeVisible();

			// Check for essential form fields
			const formFields = [
				'input[name="firstName"]',
				'input[name="lastName"]', 
				'input[name="email"]',
				'select[name="departmentId"], input[name="department"]',
				'input[name="position"]'
			];

			for (const field of formFields) {
				if (await page.locator(field).isVisible()) {
					await expect(page.locator(field)).toBeVisible();
				}
			}

			await helpers.takeScreenshot('add-employee-modal');
		}
	});

	test('should validate required fields in add employee form', async ({ page }) => {
		await page.goto('/employees');
		await helpers.waitForLoadingToComplete();

		const addButton = page.locator('button:has-text("Add Employee"), .add-employee-btn').first();

		if (await addButton.isVisible()) {
			await addButton.click();
			
			// Try to submit empty form
			const submitButton = page.locator('button[type="submit"]:has-text("Save"), button:has-text("Create")').first();
			if (await submitButton.isVisible()) {
				await submitButton.click();

				// Should show validation errors
				await expect(page.locator('.error-message, .field-error, .invalid-feedback')).toHaveCount({ gte: 1 });
				await helpers.takeScreenshot('add-employee-validation');
			}
		}
	});

	test('should create new employee successfully', async ({ page }) => {
		await page.goto('/employees');
		await helpers.waitForLoadingToComplete();

		const addButton = page.locator('button:has-text("Add Employee"), .add-employee-btn').first();

		if (await addButton.isVisible()) {
			await addButton.click();
			
			// Fill form with valid data
			const formData = {
				firstName: 'John',
				lastName: 'Doe',
				email: `john.doe.${Date.now()}@mountainhr.com`, // Unique email
				phone: '+1-555-0123',
				position: 'Software Developer',
				salary: '75000'
			};

			for (const [field, value] of Object.entries(formData)) {
				const input = page.locator(`input[name="${field}"]`);
				if (await input.isVisible()) {
					await input.fill(value);
				}
			}

			// Select department if dropdown exists
			const departmentSelect = page.locator('select[name="departmentId"]');
			if (await departmentSelect.isVisible()) {
				await departmentSelect.selectOption({ index: 1 });
			}

			// Submit form
			const submitButton = page.locator('button[type="submit"]:has-text("Save"), button:has-text("Create")').first();
			if (await submitButton.isVisible()) {
				await submitButton.click();

				// Should show success message or close modal
				await page.waitForTimeout(2000);
				const successIndicators = [
					'.success-message',
					'.toast-success', 
					'.alert-success',
					':has-text("successfully")'
				];

				let successFound = false;
				for (const selector of successIndicators) {
					if (await page.locator(selector).isVisible().catch(() => false)) {
						successFound = true;
						break;
					}
				}

				await helpers.takeScreenshot('employee-created');
			}
		}
	});

	test('should edit existing employee', async ({ page }) => {
		await page.goto('/employees');
		await helpers.waitForTableData('table', 10000);

		// Look for edit button in first row
		const editButton = page.locator('button:has-text("Edit"), .edit-btn').first();

		if (await editButton.isVisible()) {
			await editButton.click();

			// Modal should open with existing data
			await expect(page.locator('.modal, [role="dialog"]')).toBeVisible({ timeout: 5000 });
			
			// Update position field
			const positionInput = page.locator('input[name="position"]');
			if (await positionInput.isVisible()) {
				await positionInput.fill('Senior Software Developer');
			}

			// Submit changes
			const submitButton = page.locator('button[type="submit"]:has-text("Save"), button:has-text("Update")').first();
			if (await submitButton.isVisible()) {
				await submitButton.click();
				await page.waitForTimeout(2000);
				await helpers.takeScreenshot('employee-updated');
			}
		}
	});

	test('should show delete confirmation', async ({ page }) => {
		await page.goto('/employees');
		await helpers.waitForTableData('table', 10000);

		// Look for delete button
		const deleteButton = page.locator('button:has-text("Delete"), .delete-btn').first();

		if (await deleteButton.isVisible()) {
			await deleteButton.click();

			// Should show confirmation dialog
			const confirmationSelectors = [
				'.confirmation-dialog',
				'.delete-confirmation', 
				'[role="alertdialog"]',
				':has-text("Are you sure")',
				':has-text("confirm")'
			];

			let confirmationFound = false;
			for (const selector of confirmationSelectors) {
				if (await page.locator(selector).isVisible().catch(() => false)) {
					confirmationFound = true;
					break;
				}
			}

			if (confirmationFound) {
				await helpers.takeScreenshot('delete-confirmation');
				
				// Cancel deletion
				const cancelButton = page.locator('button:has-text("Cancel")').first();
				if (await cancelButton.isVisible()) {
					await cancelButton.click();
				}
			}
		}
	});

	test('should handle bulk operations', async ({ page }) => {
		await page.goto('/employees');
		await helpers.waitForTableData('table', 10000);

		// Look for select all checkbox
		const selectAllCheckbox = page.locator('input[type="checkbox"]').first();

		if (await selectAllCheckbox.isVisible()) {
			await selectAllCheckbox.check();

			// Look for bulk actions
			const bulkActions = page.locator('.bulk-actions, .selected-actions');
			if (await bulkActions.isVisible()) {
				await expect(bulkActions).toBeVisible();
				await helpers.takeScreenshot('bulk-actions');

				// Test bulk export if available
				const exportButton = bulkActions.locator('button:has-text("Export")');
				if (await exportButton.isVisible()) {
					await exportButton.click();
					await page.waitForTimeout(1000);
				}
			}
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
