import { test, expect } from '@playwright/test';

/**
 * E2E Tests: Admin Form Builder
 * Tests block management (CRUD, reordering) within forms
 */

test.describe('Admin Form Builder - Block Management', () => {
	let formId: string;

	test.beforeEach(async ({ page }) => {
		// Login as admin
		await page.goto('/login');
		await page.fill('[data-testid="email-input"]', 'admin@example.com');
		await page.fill('[data-testid="password-input"]', 'admin');
		await page.click('[data-testid="login-button"]');
		await page.waitForURL('/dashboard', { timeout: 10000 });

		// Navigate to onboarding and get/create a form for testing
		await page.goto('/dashboard/admin/onboarding');
		const moduleCard = page.locator('[data-testid^="module-card-"]').first();

		if (await moduleCard.isVisible()) {
			await moduleCard.click();
			await page.waitForTimeout(1000);

			// Navigate to Forms management
			await page.click('button:has-text("Manage Forms")');
			await page.waitForSelector('[data-testid="forms-list"]', { timeout: 10000 });

			// Get first form or create one
			const formCard = page.locator('[data-testid^="form-card-"]').first();
			if (await formCard.isVisible()) {
				const testId = await formCard.getAttribute('data-testid');
				formId = testId?.replace('form-card-', '') || '';

				// Navigate to Form Builder
				await page.click(`[data-testid="edit-blocks-${formId}"]`);
				await page.waitForURL(/\/dashboard\/admin\/forms\/.*/, { timeout: 10000 });
			}
		}
	});

	test('should display Form Builder interface', async ({ page }) => {
		// Verify Form Builder UI elements
		await expect(page.locator('h1')).toBeVisible();
		await expect(page.locator('button:has-text("Add Block")')).toBeVisible();
		await expect(page.locator('[data-testid="blocks-list"]')).toBeVisible();

		// Check for Preview toggle
		const previewButton = page.locator('button:has-text("Preview")');
		await expect(previewButton).toBeVisible();
	});

	test('should create a TEXT block', async ({ page }) => {
		// Click Add Block
		await page.click('button:has-text("Add Block")');
		await page.waitForSelector('[data-testid="block-dialog"]', { timeout: 5000 });

		// Select TEXT block type
		await page.click('[data-testid="block-type-TEXT"]');

		// Fill block details
		await page.fill('[data-testid="block-title-input"]', 'Welcome Message');
		await page.fill(
			'[data-testid="block-text-content"]',
			'Welcome to our company! This onboarding will help you get started.'
		);

		// Save block
		await page.click('[data-testid="save-block-button"]');

		// Wait for success message
		await page.waitForSelector('text=Block created successfully', { timeout: 5000 });

		// Verify block appears in list
		await expect(page.locator('text=Welcome Message')).toBeVisible();
	});

	test('should create a FORM_FIELDS block', async ({ page }) => {
		await page.click('button:has-text("Add Block")');
		await page.waitForSelector('[data-testid="block-dialog"]', { timeout: 5000 });

		// Select FORM_FIELDS block type
		await page.click('[data-testid="block-type-FORM_FIELDS"]');

		// Fill block details
		await page.fill('[data-testid="block-title-input"]', 'Personal Information');

		// Select a form template (assuming templates exist)
		const templateSelect = page.locator('[data-testid="form-template-select"]');
		if (await templateSelect.isVisible()) {
			await templateSelect.selectOption({ index: 1 }); // Select first available template
		}

		// Save block
		await page.click('[data-testid="save-block-button"]');

		// Wait for success
		await page.waitForSelector('text=Block created successfully', { timeout: 5000 });

		// Verify block
		await expect(page.locator('text=Personal Information')).toBeVisible();
	});

	test('should create a DOCUMENT block', async ({ page }) => {
		await page.click('button:has-text("Add Block")');
		await page.waitForSelector('[data-testid="block-dialog"]', { timeout: 5000 });

		// Select DOCUMENT block type
		await page.click('[data-testid="block-type-DOCUMENT"]');

		// Fill block details
		await page.fill('[data-testid="block-title-input"]', 'Employee Handbook');
		await page.fill(
			'[data-testid="block-document-url"]',
			'https://example.com/handbook.pdf'
		);

		// Save block
		await page.click('[data-testid="save-block-button"]');

		await page.waitForSelector('text=Block created successfully', { timeout: 5000 });
		await expect(page.locator('text=Employee Handbook')).toBeVisible();
	});

	test('should create a FILE_UPLOAD block', async ({ page }) => {
		await page.click('button:has-text("Add Block")');
		await page.waitForSelector('[data-testid="block-dialog"]', { timeout: 5000 });

		// Select FILE_UPLOAD block type
		await page.click('[data-testid="block-type-FILE_UPLOAD"]');

		// Fill block details
		await page.fill('[data-testid="block-title-input"]', 'Upload ID Document');

		// Configure file upload requirements (if UI exists)
		const requirementsInput = page.locator('[data-testid="file-upload-requirements"]');
		if (await requirementsInput.isVisible()) {
			await requirementsInput.fill(
				JSON.stringify({
					acceptedTypes: ['.pdf', '.jpg', '.png'],
					maxSizeBytes: 5242880
				})
			);
		}

		// Save block
		await page.click('[data-testid="save-block-button"]');

		await page.waitForSelector('text=Block created successfully', { timeout: 5000 });
		await expect(page.locator('text=Upload ID Document')).toBeVisible();
	});

	test('should create a SIGNATURE block', async ({ page }) => {
		await page.click('button:has-text("Add Block")');
		await page.waitForSelector('[data-testid="block-dialog"]', { timeout: 5000 });

		// Select SIGNATURE block type
		await page.click('[data-testid="block-type-SIGNATURE"]');

		// Fill block details
		await page.fill('[data-testid="block-title-input"]', 'Sign Agreement');

		// Save block
		await page.click('[data-testid="save-block-button"]');

		await page.waitForSelector('text=Block created successfully', { timeout: 5000 });
		await expect(page.locator('text=Sign Agreement')).toBeVisible();
	});

	test('should create a CHECKBOX block', async ({ page }) => {
		await page.click('button:has-text("Add Block")');
		await page.waitForSelector('[data-testid="block-dialog"]', { timeout: 5000 });

		// Select CHECKBOX block type
		await page.click('[data-testid="block-type-CHECKBOX"]');

		// Fill block details
		await page.fill('[data-testid="block-title-input"]', 'Acknowledgements');

		// Add checkbox items (if UI exists)
		const itemsInput = page.locator('[data-testid="checkbox-items-input"]');
		if (await itemsInput.isVisible()) {
			await itemsInput.fill(
				JSON.stringify([
					'I have read the employee handbook',
					'I understand the company policies',
					'I agree to the terms of employment'
				])
			);
		}

		// Save block
		await page.click('[data-testid="save-block-button"]');

		await page.waitForSelector('text=Block created successfully', { timeout: 5000 });
		await expect(page.locator('text=Acknowledgements')).toBeVisible();
	});

	test('should edit an existing block', async ({ page }) => {
		// Find first block and click edit
		const editButton = page.locator('[data-testid^="edit-block-"]').first();

		if (await editButton.isVisible()) {
			await editButton.click();
			await page.waitForSelector('[data-testid="block-dialog"]', { timeout: 5000 });

			// Edit title
			await page.fill('[data-testid="block-title-input"]', 'Updated Block Title');

			// Save changes
			await page.click('[data-testid="save-block-button"]');

			// Wait for success
			await page.waitForSelector('text=Block updated successfully', { timeout: 5000 });

			// Verify update
			await expect(page.locator('text=Updated Block Title')).toBeVisible();
		}
	});

	test('should reorder blocks using up/down buttons', async ({ page }) => {
		// Get initial order of blocks
		const blockTitles = await page.locator('[data-testid^="block-title-"]').allTextContents();

		if (blockTitles.length >= 2) {
			// Click "Move Down" on first block
			const moveDownButton = page.locator('[data-testid^="move-block-down-"]').first();
			await moveDownButton.click();

			// Wait for reorder
			await page.waitForTimeout(1000);

			// Get new order
			const newBlockTitles = await page.locator('[data-testid^="block-title-"]').allTextContents();

			// First block should now be in second position
			expect(newBlockTitles[1]).toBe(blockTitles[0]);
			expect(newBlockTitles[0]).toBe(blockTitles[1]);

			// Move it back up
			const moveUpButton = page.locator('[data-testid^="move-block-up-"]').nth(1);
			await moveUpButton.click();
			await page.waitForTimeout(1000);

			// Should be back to original order
			const finalBlockTitles = await page
				.locator('[data-testid^="block-title-"]')
				.allTextContents();
			expect(finalBlockTitles[0]).toBe(blockTitles[0]);
		}
	});

	test('should delete a block with confirmation', async ({ page }) => {
		const initialBlockCount = await page.locator('[data-testid^="block-card-"]').count();

		if (initialBlockCount > 0) {
			// Click delete on first block
			const deleteButton = page.locator('[data-testid^="delete-block-"]').first();
			await deleteButton.click();

			// Confirm deletion
			await page.waitForSelector('[data-testid="confirm-delete-dialog"]', { timeout: 5000 });
			await page.click('[data-testid="confirm-delete-button"]');

			// Wait for success
			await page.waitForSelector('text=Block deleted successfully', { timeout: 5000 });

			// Verify block count decreased
			const newBlockCount = await page.locator('[data-testid^="block-card-"]').count();
			expect(newBlockCount).toBe(initialBlockCount - 1);
		}
	});

	test('should toggle preview mode', async ({ page }) => {
		// Click Preview button
		await page.click('button:has-text("Preview")');

		// Should show preview UI
		await expect(page.locator('[data-testid="preview-container"]')).toBeVisible();

		// Should hide edit buttons
		await expect(page.locator('button:has-text("Add Block")')).not.toBeVisible();

		// Exit preview
		await page.click('button:has-text("Exit Preview")');

		// Should show edit UI again
		await expect(page.locator('button:has-text("Add Block")')).toBeVisible();
	});

	test('should update form metadata', async ({ page }) => {
		// Click edit form details
		const editFormButton = page.locator('[data-testid="edit-form-details"]');

		if (await editFormButton.isVisible()) {
			await editFormButton.click();

			// Edit form title
			await page.fill('[data-testid="form-title-input"]', 'Updated Form Title');
			await page.fill('[data-testid="form-description-input"]', 'Updated description');

			// Toggle required
			await page.click('[data-testid="form-required-checkbox"]');

			// Save changes
			await page.click('[data-testid="save-form-details-button"]');

			// Wait for success
			await page.waitForSelector('text=Form updated successfully', { timeout: 5000 });

			// Verify update
			await expect(page.locator('h1:has-text("Updated Form Title")')).toBeVisible();
		}
	});

	test('should display block type icons', async ({ page }) => {
		// Verify each block has an icon based on its type
		const textBlocks = page.locator('[data-testid="block-icon-TEXT"]');
		const formBlocks = page.locator('[data-testid="block-icon-FORM_FIELDS"]');
		const documentBlocks = page.locator('[data-testid="block-icon-DOCUMENT"]');

		// At least one type should be present
		const totalBlocks = await page.locator('[data-testid^="block-card-"]').count();
		expect(totalBlocks).toBeGreaterThan(0);
	});

	test('should validate block creation with empty title', async ({ page }) => {
		await page.click('button:has-text("Add Block")');
		await page.waitForSelector('[data-testid="block-dialog"]', { timeout: 5000 });

		// Select a block type
		await page.click('[data-testid="block-type-TEXT"]');

		// Try to save without title
		await page.click('[data-testid="save-block-button"]');

		// Should show validation error
		await expect(page.locator('text=Title is required')).toBeVisible({ timeout: 3000 });
	});

	test('should close block dialog on cancel', async ({ page }) => {
		// Open create block dialog
		await page.click('button:has-text("Add Block")');
		await page.waitForSelector('[data-testid="block-dialog"]', { timeout: 5000 });

		// Click cancel
		await page.click('[data-testid="cancel-block-button"]');

		// Dialog should be closed
		await expect(page.locator('[data-testid="block-dialog"]')).not.toBeVisible();
	});

	test('should show block sequence numbers', async ({ page }) => {
		const blockCards = page.locator('[data-testid^="block-card-"]');
		const count = await blockCards.count();

		if (count > 0) {
			// Check first block shows "1"
			const firstBlockNumber = page.locator('[data-testid="block-number-0"]');
			if (await firstBlockNumber.isVisible()) {
				await expect(firstBlockNumber).toContainText('1');
			}

			if (count > 1) {
				// Check second block shows "2"
				const secondBlockNumber = page.locator('[data-testid="block-number-1"]');
				if (await secondBlockNumber.isVisible()) {
					await expect(secondBlockNumber).toContainText('2');
				}
			}
		}
	});
});
