import { test, expect } from '@playwright/test';

/**
 * E2E Tests: Admin Onboarding Forms Management
 * Tests CRUD operations for onboarding forms within modules
 */

test.describe('Admin Onboarding Forms Management', () => {
	let moduleId: string;

	test.beforeEach(async ({ page }) => {
		// Login as admin
		await page.goto('/login');
		await page.fill('[data-testid="email-input"]', 'admin@example.com');
		await page.fill('[data-testid="password-input"]', 'admin');
		await page.click('[data-testid="login-button"]');
		await page.waitForURL('/dashboard', { timeout: 10000 });

		// Navigate to onboarding modules
		await page.goto('/dashboard/admin/onboarding');
		await page.waitForSelector('[data-testid="onboarding-modules-list"]', { timeout: 10000 });

		// Get the first module ID or create one for testing
		const moduleCard = page.locator('[data-testid^="module-card-"]').first();
		if (await moduleCard.isVisible()) {
			const testId = await moduleCard.getAttribute('data-testid');
			moduleId = testId?.replace('module-card-', '') || '';
		}
	});

	test('should display Forms management page', async ({ page }) => {
		// Navigate to Forms management
		await page.goto(`/dashboard/admin/onboarding/${moduleId}/forms`);
		await page.waitForSelector('h1:has-text("Manage Forms")', { timeout: 10000 });

		// Check for Forms list
		const formsList = page.locator('[data-testid="forms-list"]');
		await expect(formsList).toBeVisible();

		// Check for Create Form button
		const createButton = page.locator('button:has-text("Create Form")');
		await expect(createButton).toBeVisible();
	});

	test('should create a new form', async ({ page }) => {
		await page.goto(`/dashboard/admin/onboarding/${moduleId}/forms`);
		await page.waitForSelector('h1:has-text("Manage Forms")', { timeout: 10000 });

		// Click Create Form button
		await page.click('button:has-text("Create Form")');

		// Fill form dialog
		await page.waitForSelector('[data-testid="form-dialog"]', { timeout: 5000 });
		await page.fill('[data-testid="form-title-input"]', 'Employee Information Form');
		await page.fill(
			'[data-testid="form-description-input"]',
			'Collect basic employee information'
		);
		await page.check('[data-testid="form-required-checkbox"]');

		// Submit form
		await page.click('[data-testid="save-form-button"]');

		// Should navigate to Form Builder
		await page.waitForURL(/\/dashboard\/admin\/forms\/.*/, { timeout: 10000 });

		// Verify form was created
		await expect(page.locator('h1:has-text("Employee Information Form")')).toBeVisible();
	});

	test('should edit an existing form', async ({ page }) => {
		await page.goto(`/dashboard/admin/onboarding/${moduleId}/forms`);
		await page.waitForSelector('[data-testid="forms-list"]', { timeout: 10000 });

		// Find first form and click edit
		const firstFormEditButton = page.locator('[data-testid^="edit-form-"]').first();
		if (await firstFormEditButton.isVisible()) {
			await firstFormEditButton.click();

			// Wait for dialog
			await page.waitForSelector('[data-testid="form-dialog"]', { timeout: 5000 });

			// Edit form details
			await page.fill('[data-testid="form-title-input"]', 'Updated Form Title');
			await page.fill('[data-testid="form-description-input"]', 'Updated description');

			// Save changes
			await page.click('[data-testid="save-form-button"]');

			// Wait for success message
			await page.waitForSelector('text=Form updated successfully', { timeout: 5000 });

			// Verify update
			await expect(page.locator('text=Updated Form Title')).toBeVisible();
		}
	});

	test('should reorder forms using up/down buttons', async ({ page }) => {
		await page.goto(`/dashboard/admin/onboarding/${moduleId}/forms`);
		await page.waitForSelector('[data-testid="forms-list"]', { timeout: 10000 });

		// Get initial order of forms
		const formTitles = await page.locator('[data-testid^="form-title-"]').allTextContents();

		if (formTitles.length >= 2) {
			// Click "Move Down" on first form
			const moveDownButton = page.locator('[data-testid^="move-form-down-"]').first();
			await moveDownButton.click();

			// Wait for reorder to complete
			await page.waitForTimeout(1000);

			// Get new order
			const newFormTitles = await page.locator('[data-testid^="form-title-"]').allTextContents();

			// First form should now be in second position
			expect(newFormTitles[1]).toBe(formTitles[0]);
			expect(newFormTitles[0]).toBe(formTitles[1]);
		}
	});

	test('should delete a form with confirmation', async ({ page }) => {
		await page.goto(`/dashboard/admin/onboarding/${moduleId}/forms`);
		await page.waitForSelector('[data-testid="forms-list"]', { timeout: 10000 });

		// Get initial count of forms
		const initialFormCount = await page.locator('[data-testid^="form-card-"]').count();

		if (initialFormCount > 0) {
			// Click delete on first form
			const deleteButton = page.locator('[data-testid^="delete-form-"]').first();
			await deleteButton.click();

			// Confirm deletion
			await page.waitForSelector('[data-testid="confirm-delete-dialog"]', { timeout: 5000 });
			await page.click('[data-testid="confirm-delete-button"]');

			// Wait for success message
			await page.waitForSelector('text=Form deleted successfully', { timeout: 5000 });

			// Verify form count decreased
			const newFormCount = await page.locator('[data-testid^="form-card-"]').count();
			expect(newFormCount).toBe(initialFormCount - 1);
		}
	});

	test('should cancel form deletion', async ({ page }) => {
		await page.goto(`/dashboard/admin/onboarding/${moduleId}/forms`);
		await page.waitForSelector('[data-testid="forms-list"]', { timeout: 10000 });

		const initialFormCount = await page.locator('[data-testid^="form-card-"]').count();

		if (initialFormCount > 0) {
			// Click delete
			const deleteButton = page.locator('[data-testid^="delete-form-"]').first();
			await deleteButton.click();

			// Cancel deletion
			await page.waitForSelector('[data-testid="confirm-delete-dialog"]', { timeout: 5000 });
			await page.click('[data-testid="cancel-delete-button"]');

			// Verify form count unchanged
			const newFormCount = await page.locator('[data-testid^="form-card-"]').count();
			expect(newFormCount).toBe(initialFormCount);
		}
	});

	test('should navigate to Form Builder via "Edit Blocks" button', async ({ page }) => {
		await page.goto(`/dashboard/admin/onboarding/${moduleId}/forms`);
		await page.waitForSelector('[data-testid="forms-list"]', { timeout: 10000 });

		// Find first form and click "Edit Blocks"
		const editBlocksButton = page.locator('[data-testid^="edit-blocks-"]').first();
		if (await editBlocksButton.isVisible()) {
			await editBlocksButton.click();

			// Should navigate to Form Builder
			await page.waitForURL(/\/dashboard\/admin\/forms\/.*/, { timeout: 10000 });

			// Verify Form Builder UI elements
			await expect(page.locator('text=Blocks')).toBeVisible();
			await expect(page.locator('button:has-text("Add Block")')).toBeVisible();
		}
	});

	test('should show required indicator for required forms', async ({ page }) => {
		await page.goto(`/dashboard/admin/onboarding/${moduleId}/forms`);
		await page.waitForSelector('[data-testid="forms-list"]', { timeout: 10000 });

		// Find a required form
		const requiredBadge = page.locator('[data-testid="form-required-badge"]').first();
		if (await requiredBadge.isVisible()) {
			await expect(requiredBadge).toContainText('Required');
		}
	});

	test('should display form sequence order', async ({ page }) => {
		await page.goto(`/dashboard/admin/onboarding/${moduleId}/forms`);
		await page.waitForSelector('[data-testid="forms-list"]', { timeout: 10000 });

		// Verify forms are numbered
		const stepLabels = await page.locator('[data-testid^="form-step-"]').allTextContents();

		if (stepLabels.length > 0) {
			// Should start with "Step 1"
			expect(stepLabels[0]).toContain('Step 1');

			if (stepLabels.length > 1) {
				// Should increment
				expect(stepLabels[1]).toContain('Step 2');
			}
		}
	});

	test('should validate form creation with empty title', async ({ page }) => {
		await page.goto(`/dashboard/admin/onboarding/${moduleId}/forms`);
		await page.waitForSelector('h1:has-text("Manage Forms")', { timeout: 10000 });

		// Click Create Form button
		await page.click('button:has-text("Create Form")');
		await page.waitForSelector('[data-testid="form-dialog"]', { timeout: 5000 });

		// Try to submit without title
		await page.click('[data-testid="save-form-button"]');

		// Should show validation error
		await expect(page.locator('text=Title is required')).toBeVisible({ timeout: 3000 });
	});

	test('should close form dialog on cancel', async ({ page }) => {
		await page.goto(`/dashboard/admin/onboarding/${moduleId}/forms`);
		await page.waitForSelector('h1:has-text("Manage Forms")', { timeout: 10000 });

		// Open create form dialog
		await page.click('button:has-text("Create Form")');
		await page.waitForSelector('[data-testid="form-dialog"]', { timeout: 5000 });

		// Click cancel
		await page.click('[data-testid="cancel-form-button"]');

		// Dialog should be closed
		await expect(page.locator('[data-testid="form-dialog"]')).not.toBeVisible();
	});
});
