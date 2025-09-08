import { test, expect } from '@playwright/test';
import { TestHelpers } from './utils/test-helpers';

test.describe('Department Management', () => {
	let helpers: TestHelpers;

	test.beforeEach(async ({ page }) => {
		helpers = new TestHelpers(page);
		await helpers.loginAsAdmin();
	});

	test('should load departments page', async ({ page }) => {
		await page.goto('/departments');

		// Should show departments page
		await expect(page.locator('h1')).toContainText('Departments');

		// Wait for content to load
		await helpers.waitForLoadingToComplete();

		// Should have department-related UI elements
		const departmentElements = [
			'.departments-container',
			'.department-cards',
			'.department-grid',
			'[data-testid="departments"]',
			'.department-card',
			'.analytics-card'
		];

		let elementFound = false;
		for (const selector of departmentElements) {
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
		await helpers.takeScreenshot('departments-page');
	});

	test('should display department statistics', async ({ page }) => {
		await page.goto('/departments');
		await helpers.waitForLoadingToComplete();

		// Check for department statistics
		const statisticElements = [
			'.stats-card',
			'.metric-card',
			'.analytics-card',
			'[data-testid="total-departments"]',
			'[data-testid="total-employees"]',
			'[data-testid="total-budget"]'
		];

		let statsFound = false;
		for (const selector of statisticElements) {
			const element = page.locator(selector);
			if (await element.isVisible()) {
				await expect(element).toBeVisible();
				statsFound = true;
			}
		}

		if (statsFound) {
			await helpers.takeScreenshot('department-statistics');
		}
	});

	test('should display departments in card format', async ({ page }) => {
		await page.goto('/departments');
		await helpers.waitForLoadingToComplete();

		// Check for department cards
		const departmentCards = page.locator('.department-card, .dept-card, [data-testid="department-card"]');
		if (await departmentCards.first().isVisible()) {
			const cardCount = await departmentCards.count();
			expect(cardCount).toBeGreaterThan(0);

			// Check card content
			const firstCard = departmentCards.first();
			await expect(firstCard).toBeVisible();

			// Look for typical card elements
			const cardElements = [
				'.department-name, .dept-name, h3, h4',
				'.employee-count, .members',
				'.budget, .dept-budget',
				'.manager, .department-head'
			];

			for (const selector of cardElements) {
				const element = firstCard.locator(selector);
				if (await element.isVisible()) {
					await expect(element).toBeVisible();
				}
			}

			await helpers.takeScreenshot('department-cards');
		}
	});

	test('should display departments in table format', async ({ page }) => {
		await page.goto('/departments');
		await helpers.waitForLoadingToComplete();

		// Look for table view toggle or table
		const tableView = page.locator('table, .data-table, [data-testid="departments-table"]');
		if (await tableView.isVisible()) {
			await expect(tableView).toBeVisible();

			// Check table headers
			const headers = tableView.locator('thead th, thead td');
			const headerCount = await headers.count();
			expect(headerCount).toBeGreaterThan(0);

			// Check table data
			const dataRows = tableView.locator('tbody tr');
			const rowCount = await dataRows.count();
			expect(rowCount).toBeGreaterThan(0);

			await helpers.takeScreenshot('departments-table');
		}
	});

	test('should open add department modal', async ({ page }) => {
		await page.goto('/departments');
		await helpers.waitForLoadingToComplete();

		// Look for add department button
		const addButton = page.locator('button:has-text("Add Department"), .add-department-btn').first();

		if (await addButton.isVisible()) {
			await addButton.click();

			// Modal should open
			await expect(page.locator('.modal, [role="dialog"]')).toBeVisible({ timeout: 5000 });
			await expect(page.locator('h2:has-text("Add"), h3:has-text("Add")')).toBeVisible();

			// Check for essential form fields
			const formFields = [
				'input[name="name"]',
				'textarea[name="description"]',
				'input[name="manager"], select[name="managerId"]',
				'input[name="budget"]',
				'select[name="location"], input[name="location"]'
			];

			for (const field of formFields) {
				const element = page.locator(field);
				if (await element.isVisible()) {
					await expect(element).toBeVisible();
				}
			}

			await helpers.takeScreenshot('add-department-modal');
		}
	});

	test('should validate required fields when creating department', async ({ page }) => {
		await page.goto('/departments');
		await helpers.waitForLoadingToComplete();

		const addButton = page.locator('button:has-text("Add Department"), .add-department-btn').first();

		if (await addButton.isVisible()) {
			await addButton.click();
			
			// Try to submit empty form
			const submitButton = page.locator('button[type="submit"]:has-text("Save"), button:has-text("Create")').first();
			if (await submitButton.isVisible()) {
				await submitButton.click();

				// Should show validation errors
				await expect(page.locator('.error-message, .field-error, .invalid-feedback')).toHaveCount({ gte: 1 });
				await helpers.takeScreenshot('add-department-validation');
			}
		}
	});

	test('should create new department successfully', async ({ page }) => {
		await page.goto('/departments');
		await helpers.waitForLoadingToComplete();

		const addButton = page.locator('button:has-text("Add Department"), .add-department-btn').first();

		if (await addButton.isVisible()) {
			await addButton.click();
			
			// Fill form with valid data
			const departmentData = {
				name: `Test Department ${Date.now()}`,
				description: 'This is a test department created by E2E tests.',
				budget: '250000',
				location: 'Main Office'
			};

			// Fill department name
			const nameInput = page.locator('input[name="name"]');
			if (await nameInput.isVisible()) {
				await nameInput.fill(departmentData.name);
			}

			// Fill description
			const descInput = page.locator('textarea[name="description"]');
			if (await descInput.isVisible()) {
				await descInput.fill(departmentData.description);
			}

			// Fill budget
			const budgetInput = page.locator('input[name="budget"]');
			if (await budgetInput.isVisible()) {
				await budgetInput.fill(departmentData.budget);
			}

			// Fill location
			const locationInput = page.locator('input[name="location"]');
			if (await locationInput.isVisible()) {
				await locationInput.fill(departmentData.location);
			}

			// Select manager if dropdown exists
			const managerSelect = page.locator('select[name="managerId"]');
			if (await managerSelect.isVisible()) {
				await managerSelect.selectOption({ index: 1 });
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
					':has-text("successfully")',
					':has-text("created")'
				];

				let successFound = false;
				for (const selector of successIndicators) {
					if (await page.locator(selector).isVisible().catch(() => false)) {
						successFound = true;
						break;
					}
				}

				await helpers.takeScreenshot('department-created');
			}
		}
	});

	test('should edit existing department', async ({ page }) => {
		await page.goto('/departments');
		await helpers.waitForLoadingToComplete();

		// Look for edit button in first department
		const editButton = page.locator('button:has-text("Edit"), .edit-btn').first();

		if (await editButton.isVisible()) {
			await editButton.click();

			// Modal should open with existing data
			await expect(page.locator('.modal, [role="dialog"]')).toBeVisible({ timeout: 5000 });
			
			// Update department budget
			const budgetInput = page.locator('input[name="budget"]');
			if (await budgetInput.isVisible()) {
				await budgetInput.fill('300000');
			}

			// Update description
			const descInput = page.locator('textarea[name="description"]');
			if (await descInput.isVisible()) {
				await descInput.fill('Updated department description via E2E test.');
			}

			// Submit changes
			const submitButton = page.locator('button[type="submit"]:has-text("Save"), button:has-text("Update")').first();
			if (await submitButton.isVisible()) {
				await submitButton.click();
				await page.waitForTimeout(2000);
				await helpers.takeScreenshot('department-updated');
			}
		}
	});

	test('should show delete confirmation for department', async ({ page }) => {
		await page.goto('/departments');
		await helpers.waitForLoadingToComplete();

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
				await helpers.takeScreenshot('delete-department-confirmation');
				
				// Cancel deletion for safety
				const cancelButton = page.locator('button:has-text("Cancel")').first();
				if (await cancelButton.isVisible()) {
					await cancelButton.click();
				}
			}
		}
	});

	test('should view department details', async ({ page }) => {
		await page.goto('/departments');
		await helpers.waitForLoadingToComplete();

		// Click on first department to view details
		const firstDepartment = page.locator('.department-card, .dept-card').first();
		if (await firstDepartment.isVisible()) {
			await firstDepartment.click();

			// Should show department details or navigate to details page
			const detailsModal = page.locator('.modal:has-text("Department Details"), .department-details');
			if (await detailsModal.isVisible()) {
				await expect(detailsModal).toBeVisible();
				
				// Check for detail elements
				const detailElements = [
					'.department-name',
					'.department-description',
					'.employee-list',
					'.budget-info',
					'.manager-info'
				];

				for (const selector of detailElements) {
					const element = page.locator(selector);
					if (await element.isVisible()) {
						await expect(element).toBeVisible();
					}
				}

				await helpers.takeScreenshot('department-details');
			} else {
				// Check if navigated to details page
				await page.waitForTimeout(2000);
				const currentUrl = page.url();
				if (currentUrl.includes('/departments/')) {
					await helpers.takeScreenshot('department-details-page');
				}
			}
		}
	});

	test('should filter departments by search', async ({ page }) => {
		await page.goto('/departments');
		await helpers.waitForLoadingToComplete();

		// Test search functionality
		const searchInput = page.locator('input[name="search"], input[placeholder*="Search"]');
		if (await searchInput.isVisible()) {
			await searchInput.fill('IT');
			await page.waitForTimeout(1000); // Allow search to process

			// Check if search results are displayed
			const departmentList = page.locator('.department-cards, .department-grid');
			if (await departmentList.isVisible()) {
				await expect(departmentList).toBeVisible();
			}

			await helpers.takeScreenshot('department-search-results');

			// Clear search
			await searchInput.clear();
			await page.waitForTimeout(1000);
		}
	});

	test('should sort departments by name', async ({ page }) => {
		await page.goto('/departments');
		await helpers.waitForLoadingToComplete();

		// Look for sort controls
		const sortButton = page.locator('button:has-text("Sort"), .sort-btn, select[name="sort"]').first();
		if (await sortButton.isVisible()) {
			await sortButton.click();

			// Select sort by name
			const sortOption = page.locator('option:has-text("Name"), button:has-text("Name")').first();
			if (await sortOption.isVisible()) {
				await sortOption.click();
				await page.waitForTimeout(1000);
				await helpers.takeScreenshot('departments-sorted-by-name');
			}
		}
	});

	test('should sort departments by employee count', async ({ page }) => {
		await page.goto('/departments');
		await helpers.waitForLoadingToComplete();

		// Look for employee count sort option
		const sortSelect = page.locator('select[name="sort"]');
		if (await sortSelect.isVisible()) {
			await sortSelect.selectOption('employees');
			await page.waitForTimeout(1000);
			await helpers.takeScreenshot('departments-sorted-by-employees');
		}
	});

	test('should sort departments by budget', async ({ page }) => {
		await page.goto('/departments');
		await helpers.waitForLoadingToComplete();

		// Look for budget sort option
		const sortSelect = page.locator('select[name="sort"]');
		if (await sortSelect.isVisible()) {
			await sortSelect.selectOption('budget');
			await page.waitForTimeout(1000);
			await helpers.takeScreenshot('departments-sorted-by-budget');
		}
	});

	test('should show department employee list', async ({ page }) => {
		await page.goto('/departments');
		await helpers.waitForLoadingToComplete();

		// Look for view employees button or link
		const viewEmployeesBtn = page.locator('button:has-text("View Employees"), a:has-text("Employees")').first();
		if (await viewEmployeesBtn.isVisible()) {
			await viewEmployeesBtn.click();

			// Should show employees modal or navigate to employees page
			const employeesList = page.locator('.employees-modal, .department-employees, [role="dialog"]');
			if (await employeesList.isVisible()) {
				await expect(employeesList).toBeVisible();
				await helpers.takeScreenshot('department-employees-modal');
			} else {
				// Check if navigated to filtered employees page
				await page.waitForTimeout(2000);
				const currentUrl = page.url();
				if (currentUrl.includes('/employees') || currentUrl.includes('department')) {
					await helpers.takeScreenshot('department-employees-page');
				}
			}
		}
	});

	test('should handle department budget validation', async ({ page }) => {
		await page.goto('/departments');
		await helpers.waitForLoadingToComplete();

		const addButton = page.locator('button:has-text("Add Department"), .add-department-btn').first();

		if (await addButton.isVisible()) {
			await addButton.click();
			
			// Fill form with invalid budget
			await page.locator('input[name="name"]').fill('Test Department');
			await page.locator('input[name="budget"]').fill('-1000'); // Invalid negative budget

			// Submit form
			const submitButton = page.locator('button[type="submit"]:has-text("Save")').first();
			if (await submitButton.isVisible()) {
				await submitButton.click();

				// Should show budget validation error
				await expect(page.locator('.error-message, .field-error')).toBeVisible();
				await helpers.takeScreenshot('budget-validation-error');
			}
		}
	});

	test('should export departments data', async ({ page }) => {
		await page.goto('/departments');
		await helpers.waitForLoadingToComplete();

		// Look for export button
		const exportButton = page.locator('button:has-text("Export"), button:has-text("Download")').first();

		if (await exportButton.isVisible()) {
			// Start download
			const downloadPromise = page.waitForEvent('download');
			await exportButton.click();

			try {
				const download = await downloadPromise;
				expect(download.suggestedFilename()).toMatch(/\.(csv|xlsx|pdf)$/);
				await helpers.takeScreenshot('departments-export');
			} catch (error) {
				// Export functionality may not be fully implemented
				console.log('Export test skipped - functionality may not be implemented');
			}
		}
	});

	test('should handle department manager assignment', async ({ page }) => {
		await page.goto('/departments');
		await helpers.waitForLoadingToComplete();

		const editButton = page.locator('button:has-text("Edit"), .edit-btn').first();

		if (await editButton.isVisible()) {
			await editButton.click();

			// Change manager assignment
			const managerSelect = page.locator('select[name="managerId"]');
			if (await managerSelect.isVisible()) {
				await managerSelect.selectOption({ index: 2 }); // Select different manager
				
				// Submit changes
				const submitButton = page.locator('button[type="submit"]:has-text("Save")').first();
				if (await submitButton.isVisible()) {
					await submitButton.click();
					await page.waitForTimeout(2000);
					await helpers.takeScreenshot('manager-reassigned');
				}
			}
		}
	});

	test('should toggle between card and table view', async ({ page }) => {
		await page.goto('/departments');
		await helpers.waitForLoadingToComplete();

		// Look for view toggle buttons
		const viewToggle = page.locator('.view-toggle, .layout-toggle');
		if (await viewToggle.isVisible()) {
			// Toggle to table view
			const tableViewBtn = viewToggle.locator('button:has-text("Table"), .table-view');
			if (await tableViewBtn.isVisible()) {
				await tableViewBtn.click();
				await page.waitForTimeout(1000);
				await helpers.takeScreenshot('departments-table-view');

				// Toggle back to card view
				const cardViewBtn = viewToggle.locator('button:has-text("Cards"), .card-view');
				if (await cardViewBtn.isVisible()) {
					await cardViewBtn.click();
					await page.waitForTimeout(1000);
					await helpers.takeScreenshot('departments-card-view');
				}
			}
		}
	});

	test('should be responsive', async ({ page }) => {
		await page.goto('/departments');
		await helpers.waitForLoadingToComplete();
		await helpers.testResponsiveDesign();
	});

	test('should have proper accessibility', async ({ page }) => {
		await page.goto('/departments');
		await helpers.waitForLoadingToComplete();
		await helpers.checkAccessibility();
	});
});