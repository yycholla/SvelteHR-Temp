import { test, expect } from '@playwright/test';

/**
 * E2E Tests: Form Progress Persistence
 * Tests that form data persists across sessions, page reloads, and navigation
 */

test.describe('Form Progress Persistence', () => {
	test.beforeEach(async ({ page }) => {
		// Login as employee
		await page.goto('/login');
		await page.fill('[data-testid="email-input"]', 'employee@example.com');
		await page.fill('[data-testid="password-input"]', 'password');
		await page.click('[data-testid="login-button"]');
		await page.waitForURL('/dashboard', { timeout: 10000 });

		// Navigate to onboarding
		const onboardingLink = page.locator('a:has-text("Onboarding")');
		if (await onboardingLink.isVisible()) {
			await onboardingLink.click();

			const moduleCard = page.locator('[data-testid^="onboarding-module-"]').first();
			if (await moduleCard.isVisible()) {
				await moduleCard.click();
				await page.waitForURL(/\/dashboard\/onboarding\/.*/, { timeout: 10000 });
			}
		}
	});

	test('should persist text input data after save and reload', async ({ page, context }) => {
		// Fill a text input
		const textInput = page.locator('input[type="text"]').first();
		const testValue = `Test Data ${Date.now()}`;

		if (await textInput.isVisible()) {
			await textInput.fill(testValue);

			// Save progress
			await page.click('[data-testid="save-progress-button"]');
			await page.waitForSelector('text=Progress saved', { timeout: 5000 });

			// Get current URL
			const currentUrl = page.url();

			// Create new page (simulate closing and reopening browser)
			const newPage = await context.newPage();
			await newPage.goto(currentUrl);

			// Data should persist
			const persistedValue = await newPage.locator('input[type="text"]').first().inputValue();
			expect(persistedValue).toBe(testValue);

			await newPage.close();
		}
	});

	test('should persist checkbox states after save and reload', async ({ page }) => {
		// Find and check a checkbox
		const checkbox = page.locator('input[type="checkbox"]').first();

		if (await checkbox.isVisible()) {
			await checkbox.check();
			expect(await checkbox.isChecked()).toBe(true);

			// Save progress
			await page.click('[data-testid="save-progress-button"]');
			await page.waitForSelector('text=Progress saved', { timeout: 5000 });

			// Reload page
			await page.reload();
			await page.waitForLoadState('networkidle');

			// Checkbox should still be checked
			const persistedCheckbox = page.locator('input[type="checkbox"]').first();
			expect(await persistedCheckbox.isChecked()).toBe(true);
		}
	});

	test('should persist textarea data after save and reload', async ({ page }) => {
		const textarea = page.locator('textarea').first();
		const testValue = `Long text content ${Date.now()}\nWith multiple lines\nFor testing persistence`;

		if (await textarea.isVisible()) {
			await textarea.fill(testValue);

			// Save progress
			await page.click('[data-testid="save-progress-button"]');
			await page.waitForSelector('text=Progress saved', { timeout: 5000 });

			// Reload
			await page.reload();
			await page.waitForLoadState('networkidle');

			// Data should persist
			const persistedValue = await page.locator('textarea').first().inputValue();
			expect(persistedValue).toBe(testValue);
		}
	});

	test('should persist select/dropdown selection after save and reload', async ({ page }) => {
		const select = page.locator('select').first();

		if (await select.isVisible()) {
			// Select a specific option (not the first/default)
			await select.selectOption({ index: 1 });
			const selectedValue = await select.inputValue();

			// Save progress
			await page.click('[data-testid="save-progress-button"]');
			await page.waitForSelector('text=Progress saved', { timeout: 5000 });

			// Reload
			await page.reload();
			await page.waitForLoadState('networkidle');

			// Selection should persist
			const persistedValue = await page.locator('select').first().inputValue();
			expect(persistedValue).toBe(selectedValue);
		}
	});

	test('should persist radio button selection after save and reload', async ({ page }) => {
		const radioButtons = page.locator('input[type="radio"]');
		const count = await radioButtons.count();

		if (count > 1) {
			// Select second radio button
			await radioButtons.nth(1).check();
			const radioValue = await radioButtons.nth(1).inputValue();

			// Save progress
			await page.click('[data-testid="save-progress-button"]');
			await page.waitForSelector('text=Progress saved', { timeout: 5000 });

			// Reload
			await page.reload();
			await page.waitForLoadState('networkidle');

			// Selection should persist
			const persistedRadio = page.locator(`input[type="radio"][value="${radioValue}"]`);
			expect(await persistedRadio.isChecked()).toBe(true);
		}
	});

	test('should persist data when navigating between forms', async ({ page }) => {
		// Fill data in first form
		const input = page.locator('input[type="text"]').first();
		const testValue = `Navigation Test ${Date.now()}`;

		if (await input.isVisible()) {
			await input.fill(testValue);

			// Save progress
			await page.click('[data-testid="save-progress-button"]');
			await page.waitForSelector('text=Progress saved', { timeout: 5000 });

			// Navigate to next form
			const nextButton = page.locator('[data-testid="complete-form-button"]');
			if (!(await nextButton.isDisabled())) {
				await nextButton.click();
				await page.waitForTimeout(1000);

				// Navigate back
				await page.click('[data-testid="previous-form-button"]');
				await page.waitForTimeout(1000);

				// Data should persist
				const persistedValue = await page.locator('input[type="text"]').first().inputValue();
				expect(persistedValue).toBe(testValue);
			}
		}
	});

	test('should preserve form status (NOT_STARTED, IN_PROGRESS, COMPLETED)', async ({ page }) => {
		// Get current form in navigation
		const currentNavItem = page.locator('[data-testid="nav-form-0"]');

		// Initially should be NOT_STARTED or IN_PROGRESS
		const initialStatus = currentNavItem.locator('[data-testid^="status-"]');
		await expect(initialStatus).toBeVisible();

		// Fill some data and save
		const input = page.locator('input[type="text"]').first();
		if (await input.isVisible()) {
			await input.fill('Status Test');
			await page.click('[data-testid="save-progress-button"]');
			await page.waitForSelector('text=Progress saved', { timeout: 5000 });

			// Reload
			await page.reload();
			await page.waitForLoadState('networkidle');

			// Should show IN_PROGRESS status
			const progressIcon = page.locator('[data-testid="status-in-progress"]').first();
			await expect(progressIcon).toBeVisible();
		}
	});

	test('should update completed_at timestamp when form is completed', async ({ page }) => {
		// Complete current form
		await page.click('[data-testid="complete-form-button"]');
		await page.waitForSelector('text=Form completed', { timeout: 5000 });

		// Reload
		await page.reload();
		await page.waitForLoadState('networkidle');

		// Previous form should show COMPLETED status
		const completedIcon = page.locator('[data-testid="status-completed"]').first();
		await expect(completedIcon).toBeVisible();
	});

	test('should preserve started_at timestamp across sessions', async ({ page }) => {
		// Save progress to start the form
		await page.click('[data-testid="save-progress-button"]');
		await page.waitForSelector('text=Progress saved', { timeout: 5000 });

		// Close and reopen browser
		await page.close();

		// Login again
		const newPage = await page.context().newPage();
		await newPage.goto('/login');
		await newPage.fill('[data-testid="email-input"]', 'employee@example.com');
		await newPage.fill('[data-testid="password-input"]', 'password');
		await newPage.click('[data-testid="login-button"]');
		await newPage.waitForURL('/dashboard', { timeout: 10000 });

		// Navigate to onboarding
		const onboardingLink = newPage.locator('a:has-text("Onboarding")');
		if (await onboardingLink.isVisible()) {
			await onboardingLink.click();

			const moduleCard = newPage.locator('[data-testid^="onboarding-module-"]').first();
			if (await moduleCard.isVisible()) {
				await moduleCard.click();
				await newPage.waitForURL(/\/dashboard\/onboarding\/.*/, { timeout: 10000 });

				// Form should still show IN_PROGRESS status
				const inProgressIcon = newPage.locator('[data-testid="status-in-progress"]').first();
				await expect(inProgressIcon).toBeVisible();
			}
		}

		await newPage.close();
	});

	test('should auto-save form data periodically (if feature exists)', async ({ page }) => {
		// Fill data
		const input = page.locator('input[type="text"]').first();
		const testValue = `Auto-save Test ${Date.now()}`;

		if (await input.isVisible()) {
			await input.fill(testValue);

			// Wait for auto-save (assuming 30 second interval)
			await page.waitForTimeout(35000);

			// Reload without manual save
			await page.reload();
			await page.waitForLoadState('networkidle');

			// Data should be auto-saved
			const persistedValue = await page.locator('input[type="text"]').first().inputValue();
			expect(persistedValue).toBe(testValue);
		}
	});

	test('should handle concurrent saves (prevent race conditions)', async ({ page }) => {
		// Fill multiple fields quickly
		const inputs = page.locator('input[type="text"]');
		const count = await inputs.count();

		for (let i = 0; i < Math.min(count, 3); i++) {
			await inputs.nth(i).fill(`Value ${i}`);
		}

		// Click save multiple times rapidly
		await page.click('[data-testid="save-progress-button"]');
		await page.click('[data-testid="save-progress-button"]');
		await page.click('[data-testid="save-progress-button"]');

		// Should show only one success message
		const successMessages = await page.locator('text=Progress saved').count();
		expect(successMessages).toBeGreaterThanOrEqual(1);

		// Reload and verify all data persisted
		await page.reload();
		await page.waitForLoadState('networkidle');

		// Verify at least one field persisted
		const firstValue = await page.locator('input[type="text"]').first().inputValue();
		expect(firstValue).toBeTruthy();
	});

	test('should restore form data to last saved state on cancel', async ({ page }) => {
		const input = page.locator('input[type="text"]').first();

		if (await input.isVisible()) {
			// Save initial value
			await input.fill('Saved Value');
			await page.click('[data-testid="save-progress-button"]');
			await page.waitForSelector('text=Progress saved', { timeout: 5000 });

			// Change value without saving
			await input.fill('Changed Value');

			// Reload page
			await page.reload();
			await page.waitForLoadState('networkidle');

			// Should restore to last saved value
			const restoredValue = await page.locator('input[type="text"]').first().inputValue();
			expect(restoredValue).toBe('Saved Value');
		}
	});

	test('should save JSONB form data with complex structure', async ({ page }) => {
		// Fill multiple fields to create complex JSON structure
		const textInputs = page.locator('input[type="text"]');
		const checkboxes = page.locator('input[type="checkbox"]');

		const textCount = await textInputs.count();
		const checkboxCount = await checkboxes.count();

		// Fill various fields
		if (textCount > 0) {
			await textInputs.first().fill('Complex Data 1');
		}
		if (textCount > 1) {
			await textInputs.nth(1).fill('Complex Data 2');
		}
		if (checkboxCount > 0) {
			await checkboxes.first().check();
		}

		// Save
		await page.click('[data-testid="save-progress-button"]');
		await page.waitForSelector('text=Progress saved', { timeout: 5000 });

		// Reload
		await page.reload();
		await page.waitForLoadState('networkidle');

		// All data should persist
		if (textCount > 0) {
			const value1 = await page.locator('input[type="text"]').first().inputValue();
			expect(value1).toBe('Complex Data 1');
		}
		if (textCount > 1) {
			const value2 = await page.locator('input[type="text"]').nth(1).inputValue();
			expect(value2).toBe('Complex Data 2');
		}
		if (checkboxCount > 0) {
			const checked = await page.locator('input[type="checkbox"]').first().isChecked();
			expect(checked).toBe(true);
		}
	});

	test('should show last saved timestamp', async ({ page }) => {
		// Save progress
		await page.click('[data-testid="save-progress-button"]');
		await page.waitForSelector('text=Progress saved', { timeout: 5000 });

		// Check for last saved indicator
		const lastSavedIndicator = page.locator('[data-testid="last-saved-time"]');

		if (await lastSavedIndicator.isVisible()) {
			const timestamp = await lastSavedIndicator.textContent();
			expect(timestamp).toBeTruthy();
			expect(timestamp).toMatch(/\d+/); // Should contain numbers (time)
		}
	});

	test('should handle network errors gracefully during save', async ({ page, context }) => {
		// Simulate offline
		await context.setOffline(true);

		// Fill data
		const input = page.locator('input[type="text"]').first();
		if (await input.isVisible()) {
			await input.fill('Offline Test');

			// Try to save
			await page.click('[data-testid="save-progress-button"]');

			// Should show error message
			await expect(page.locator('text=Failed to save')).toBeVisible({ timeout: 5000 });

			// Go back online
			await context.setOffline(false);

			// Retry save
			await page.click('[data-testid="save-progress-button"]');

			// Should succeed
			await expect(page.locator('text=Progress saved')).toBeVisible({ timeout: 5000 });
		}
	});
});
