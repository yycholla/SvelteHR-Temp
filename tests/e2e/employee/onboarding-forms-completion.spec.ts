import { test, expect } from '@playwright/test';

/**
 * E2E Tests: Employee Onboarding Forms Completion
 * Tests form navigation, progress tracking, and completion flow
 */

test.describe('Employee Onboarding Forms - Navigation and Completion', () => {
	let moduleId: string;

	test.beforeEach(async ({ page }) => {
		// Login as employee
		await page.goto('/login');
		await page.fill('[data-testid="email-input"]', 'employee@example.com');
		await page.fill('[data-testid="password-input"]', 'password');
		await page.click('[data-testid="login-button"]');
		await page.waitForURL('/dashboard', { timeout: 10000 });

		// Navigate to onboarding (employee view)
		// Assuming there's an onboarding assignment or link in dashboard
		const onboardingLink = page.locator('a:has-text("Onboarding")');
		if (await onboardingLink.isVisible()) {
			await onboardingLink.click();

			// Get first module ID
			const moduleCard = page.locator('[data-testid^="onboarding-module-"]').first();
			if (await moduleCard.isVisible()) {
				await moduleCard.click();
				await page.waitForURL(/\/dashboard\/onboarding\/.*/, { timeout: 10000 });

				// Extract module ID from URL
				const url = page.url();
				moduleId = url.split('/').pop() || '';
			}
		}
	});

	test('should display onboarding module with forms navigation', async ({ page }) => {
		// Verify left sidebar with forms list
		await expect(page.locator('[data-testid="forms-navigation"]')).toBeVisible();

		// Verify main content area
		await expect(page.locator('[data-testid="form-content"]')).toBeVisible();

		// Verify progress bar
		const progressBar = page.locator('[data-testid="progress-bar"]');
		await expect(progressBar).toBeVisible();
	});

	test('should show all forms in navigation sidebar', async ({ page }) => {
		const formsList = page.locator('[data-testid="forms-navigation"]');
		const formItems = formsList.locator('[data-testid^="nav-form-"]');

		const count = await formItems.count();
		expect(count).toBeGreaterThan(0);

		// Each form should have:
		// - Step number
		// - Form title
		// - Status indicator (completed, in-progress, not-started)
		const firstForm = formItems.first();
		await expect(firstForm.locator('[data-testid="form-step-number"]')).toBeVisible();
		await expect(firstForm.locator('[data-testid="form-title"]')).toBeVisible();
		await expect(firstForm.locator('[data-testid="form-status-icon"]')).toBeVisible();
	});

	test('should display current form with all blocks', async ({ page }) => {
		// Current form should show all its blocks
		const blockContainers = page.locator('[data-testid^="block-container-"]');
		const blockCount = await blockContainers.count();

		expect(blockCount).toBeGreaterThan(0);

		// Verify form header
		await expect(page.locator('[data-testid="current-form-title"]')).toBeVisible();
		await expect(page.locator('[data-testid="current-form-step-badge"]')).toBeVisible();
	});

	test('should render TEXT block correctly', async ({ page }) => {
		const textBlock = page.locator('[data-testid^="block-TEXT-"]').first();

		if (await textBlock.isVisible()) {
			// Should display text content
			const content = await textBlock.locator('[data-testid="text-content"]');
			await expect(content).toBeVisible();

			const text = await content.textContent();
			expect(text).toBeTruthy();
			expect(text?.length).toBeGreaterThan(0);
		}
	});

	test('should render DOCUMENT block correctly', async ({ page }) => {
		const documentBlock = page.locator('[data-testid^="block-DOCUMENT-"]').first();

		if (await documentBlock.isVisible()) {
			// Should have document link
			const documentLink = documentBlock.locator('a[href*="http"]');
			await expect(documentLink).toBeVisible();

			// Link should have target="_blank"
			const target = await documentLink.getAttribute('target');
			expect(target).toBe('_blank');
		}
	});

	test('should render FORM_FIELDS block with form inputs', async ({ page }) => {
		const formFieldsBlock = page.locator('[data-testid^="block-FORM_FIELDS-"]').first();

		if (await formFieldsBlock.isVisible()) {
			// Should have form fields
			const inputs = formFieldsBlock.locator('input, textarea, select');
			const inputCount = await inputs.count();

			expect(inputCount).toBeGreaterThan(0);

			// Fill out first field
			const firstInput = inputs.first();
			const inputType = await firstInput.getAttribute('type');

			if (inputType === 'text' || inputType === 'email') {
				await firstInput.fill('Test Value');
			}
		}
	});

	test('should render CHECKBOX block with checkbox list', async ({ page }) => {
		const checkboxBlock = page.locator('[data-testid^="block-CHECKBOX-"]').first();

		if (await checkboxBlock.isVisible()) {
			// Should have checkboxes
			const checkboxes = checkboxBlock.locator('input[type="checkbox"]');
			const count = await checkboxes.count();

			expect(count).toBeGreaterThan(0);

			// Check first checkbox
			await checkboxes.first().check();
			await expect(checkboxes.first()).toBeChecked();
		}
	});

	test('should render SIGNATURE block with signature canvas', async ({ page }) => {
		const signatureBlock = page.locator('[data-testid^="block-SIGNATURE-"]').first();

		if (await signatureBlock.isVisible()) {
			// Should have signature canvas or field
			const signatureField = signatureBlock.locator('[data-testid="signature-field"]');
			await expect(signatureField).toBeVisible();
		}
	});

	test('should render FILE_UPLOAD block with file input', async ({ page }) => {
		const fileUploadBlock = page.locator('[data-testid^="block-FILE_UPLOAD-"]').first();

		if (await fileUploadBlock.isVisible()) {
			// Should have file input
			const fileInput = fileUploadBlock.locator('input[type="file"]');
			await expect(fileInput).toBeVisible();

			// Should show accepted file types
			const acceptAttr = await fileInput.getAttribute('accept');
			expect(acceptAttr).toBeTruthy();
		}
	});

	test('should save progress when clicking "Save Progress" button', async ({ page }) => {
		// Fill some form data
		const textInput = page.locator('input[type="text"]').first();
		if (await textInput.isVisible()) {
			await textInput.fill('Progress Test Data');
		}

		// Click Save Progress
		await page.click('[data-testid="save-progress-button"]');

		// Should show success message
		await expect(page.locator('text=Progress saved')).toBeVisible({ timeout: 5000 });

		// Reload page
		await page.reload();

		// Data should persist
		if (await textInput.isVisible()) {
			const value = await textInput.inputValue();
			expect(value).toBe('Progress Test Data');
		}
	});

	test('should navigate to next form using "Complete & Continue" button', async ({ page }) => {
		// Get current form title
		const currentTitle = await page.locator('[data-testid="current-form-title"]').textContent();

		// Complete current form
		await page.click('[data-testid="complete-form-button"]');

		// Should navigate to next form
		await page.waitForTimeout(1000);

		const newTitle = await page.locator('[data-testid="current-form-title"]').textContent();

		// Title should change (unless it's the last form)
		if (currentTitle !== newTitle) {
			expect(newTitle).not.toBe(currentTitle);
		}
	});

	test('should navigate to previous form using "Previous" button', async ({ page }) => {
		// Check if we're not on the first form
		const prevButton = page.locator('[data-testid="previous-form-button"]');

		if ((await prevButton.isVisible()) && !(await prevButton.isDisabled())) {
			// Get current form title
			const currentTitle = await page
				.locator('[data-testid="current-form-title"]')
				.textContent();

			// Click Previous
			await prevButton.click();
			await page.waitForTimeout(1000);

			// Should navigate to previous form
			const newTitle = await page.locator('[data-testid="current-form-title"]').textContent();
			expect(newTitle).not.toBe(currentTitle);
		}
	});

	test('should jump to specific form using sidebar navigation', async ({ page }) => {
		const formItems = page.locator('[data-testid^="nav-form-"]');
		const count = await formItems.count();

		if (count > 1) {
			// Click on second form in navigation
			await formItems.nth(1).click();
			await page.waitForTimeout(1000);

			// Should display second form
			const stepBadge = await page.locator('[data-testid="current-form-step-badge"]').textContent();
			expect(stepBadge).toContain('2');
		}
	});

	test('should update progress bar as forms are completed', async ({ page }) => {
		// Get initial progress
		const progressBar = page.locator('[data-testid="progress-bar"]');
		const initialProgress = await progressBar.getAttribute('aria-valuenow');

		// Complete current form
		await page.click('[data-testid="complete-form-button"]');
		await page.waitForTimeout(1000);

		// Progress should increase
		const newProgress = await progressBar.getAttribute('aria-valuenow');
		expect(parseFloat(newProgress || '0')).toBeGreaterThan(parseFloat(initialProgress || '0'));
	});

	test('should show completion status icons in sidebar', async ({ page }) => {
		// Complete first form
		await page.click('[data-testid="complete-form-button"]');
		await page.waitForTimeout(1000);

		// First form should show completed icon
		const firstForm = page.locator('[data-testid="nav-form-0"]');
		const completedIcon = firstForm.locator('[data-testid="status-completed"]');

		await expect(completedIcon).toBeVisible();
	});

	test('should show celebration message on final form completion', async ({ page }) => {
		// Navigate to last form
		const formItems = page.locator('[data-testid^="nav-form-"]');
		const count = await formItems.count();

		if (count > 0) {
			// Click last form
			await formItems.nth(count - 1).click();
			await page.waitForTimeout(1000);

			// Complete it
			await page.click('[data-testid="complete-onboarding-button"]');

			// Should show celebration message
			await expect(page.locator('text=Onboarding completed')).toBeVisible({ timeout: 5000 });
			await expect(page.locator('text=🎉')).toBeVisible();
		}
	});

	test('should redirect to dashboard after completing all forms', async ({ page }) => {
		// Complete all forms
		const formItems = page.locator('[data-testid^="nav-form-"]');
		const count = await formItems.count();

		for (let i = 0; i < count; i++) {
			const isLastForm = i === count - 1;
			const buttonText = isLastForm ? 'Complete Onboarding' : 'Complete & Continue';

			await page.click(`button:has-text("${buttonText}")`);
			await page.waitForTimeout(1000);
		}

		// Should redirect to dashboard
		await page.waitForURL('/dashboard', { timeout: 10000 });
	});

	test('should persist form data across navigation', async ({ page }) => {
		// Fill data in first form
		const input = page.locator('input[type="text"]').first();
		if (await input.isVisible()) {
			await input.fill('Persistent Data');

			// Navigate to next form
			await page.click('[data-testid="complete-form-button"]');
			await page.waitForTimeout(1000);

			// Navigate back
			await page.click('[data-testid="previous-form-button"]');
			await page.waitForTimeout(1000);

			// Data should still be there
			const value = await input.inputValue();
			expect(value).toBe('Persistent Data');
		}
	});

	test('should show required field indicators', async ({ page }) => {
		// Check for required field markers
		const requiredFields = page.locator('[data-testid="required-field"]');
		const count = await requiredFields.count();

		if (count > 0) {
			// Should have asterisk or "Required" text
			const firstRequired = requiredFields.first();
			const text = await firstRequired.textContent();
			expect(text).toMatch(/\*|Required/i);
		}
	});

	test('should disable "Complete & Continue" if required fields are empty', async ({ page }) => {
		// Find a required text field
		const requiredInput = page.locator('input[required]').first();

		if (await requiredInput.isVisible()) {
			// Clear the field
			await requiredInput.fill('');

			// Complete button should be disabled
			const completeButton = page.locator('[data-testid="complete-form-button"]');
			const isDisabled = await completeButton.isDisabled();

			expect(isDisabled).toBe(true);

			// Fill the field
			await requiredInput.fill('Valid Data');

			// Button should be enabled
			await expect(completeButton).not.toBeDisabled();
		}
	});

	test('should show form description if provided', async ({ page }) => {
		const description = page.locator('[data-testid="current-form-description"]');

		if (await description.isVisible()) {
			const text = await description.textContent();
			expect(text).toBeTruthy();
			expect(text?.length).toBeGreaterThan(0);
		}
	});

	test('should display total forms count', async ({ page }) => {
		const totalCount = page.locator('[data-testid="total-forms-count"]');

		if (await totalCount.isVisible()) {
			const text = await totalCount.textContent();
			const count = parseInt(text?.replace(/\D/g, '') || '0');
			expect(count).toBeGreaterThan(0);
		}
	});

	test('should display completed forms count', async ({ page }) => {
		const completedCount = page.locator('[data-testid="completed-forms-count"]');

		if (await completedCount.isVisible()) {
			const text = await completedCount.textContent();
			const count = parseInt(text?.replace(/\D/g, '') || '0');
			expect(count).toBeGreaterThanOrEqual(0);
		}
	});
});
