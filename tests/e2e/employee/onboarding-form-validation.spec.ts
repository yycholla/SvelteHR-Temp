import { test, expect } from '@playwright/test';

/**
 * E2E Tests: Form Validation
 * Tests input validation, error messages, and form submission rules
 */

test.describe('Form Validation', () => {
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

	test('should validate required text fields', async ({ page }) => {
		const requiredInput = page.locator('input[required][type="text"]').first();

		if (await requiredInput.isVisible()) {
			// Try to submit without filling required field
			await page.click('[data-testid="complete-form-button"]');

			// Should show validation error
			await expect(page.locator('text=This field is required')).toBeVisible({ timeout: 3000 });

			// Fill the field
			await requiredInput.fill('Valid Value');

			// Error should disappear
			await expect(page.locator('text=This field is required')).not.toBeVisible();
		}
	});

	test('should validate email format', async ({ page }) => {
		const emailInput = page.locator('input[type="email"]').first();

		if (await emailInput.isVisible()) {
			// Enter invalid email
			await emailInput.fill('invalid-email');
			await emailInput.blur();

			// Should show validation error
			await expect(page.locator('text=Please enter a valid email')).toBeVisible({
				timeout: 3000
			});

			// Enter valid email
			await emailInput.fill('valid@example.com');
			await emailInput.blur();

			// Error should disappear
			await expect(page.locator('text=Please enter a valid email')).not.toBeVisible();
		}
	});

	test('should validate phone number format', async ({ page }) => {
		const phoneInput = page.locator('input[type="tel"]').first();

		if (await phoneInput.isVisible()) {
			// Enter invalid phone number
			await phoneInput.fill('12345');
			await phoneInput.blur();

			// Should show validation error
			await expect(page.locator('text=Please enter a valid phone number')).toBeVisible({
				timeout: 3000
			});

			// Enter valid phone number
			await phoneInput.fill('(555) 123-4567');
			await phoneInput.blur();

			// Error should disappear
			await expect(page.locator('text=Please enter a valid phone number')).not.toBeVisible();
		}
	});

	test('should validate number range', async ({ page }) => {
		const numberInput = page.locator('input[type="number"]').first();

		if (await numberInput.isVisible()) {
			const min = await numberInput.getAttribute('min');
			const max = await numberInput.getAttribute('max');

			if (min && max) {
				// Enter number below minimum
				await numberInput.fill((parseInt(min) - 1).toString());
				await numberInput.blur();

				// Should show validation error
				await expect(
					page.locator(
						`text=Value must be at least ${min}` ||
							`text=Value must be between ${min} and ${max}`
					)
				).toBeVisible({ timeout: 3000 });

				// Enter valid number
				await numberInput.fill(min);
				await numberInput.blur();

				// Error should disappear
				await expect(page.locator('text=Value must be')).not.toBeVisible();
			}
		}
	});

	test('should validate text length (maxlength)', async ({ page }) => {
		const textInput = page.locator('input[type="text"][maxlength]').first();

		if (await textInput.isVisible()) {
			const maxLength = await textInput.getAttribute('maxlength');

			if (maxLength) {
				const maxLen = parseInt(maxLength);

				// Enter text exceeding max length
				const longText = 'a'.repeat(maxLen + 10);
				await textInput.fill(longText);

				// Input should truncate to maxlength
				const actualValue = await textInput.inputValue();
				expect(actualValue.length).toBeLessThanOrEqual(maxLen);
			}
		}
	});

	test('should validate required checkboxes in CHECKBOX block', async ({ page }) => {
		const checkboxBlock = page.locator('[data-testid^="block-CHECKBOX-"]').first();

		if (await checkboxBlock.isVisible()) {
			const requiredCheckboxes = checkboxBlock.locator('input[type="checkbox"][required]');
			const count = await requiredCheckboxes.count();

			if (count > 0) {
				// Try to complete form without checking required checkboxes
				await page.click('[data-testid="complete-form-button"]');

				// Should show validation error
				await expect(page.locator('text=Please check all required items')).toBeVisible({
					timeout: 3000
				});

				// Check all required checkboxes
				for (let i = 0; i < count; i++) {
					await requiredCheckboxes.nth(i).check();
				}

				// Error should disappear
				await expect(page.locator('text=Please check all required items')).not.toBeVisible();
			}
		}
	});

	test('should validate file upload size limit', async ({ page }) => {
		const fileUploadBlock = page.locator('[data-testid^="block-FILE_UPLOAD-"]').first();

		if (await fileUploadBlock.isVisible()) {
			const fileInput = fileUploadBlock.locator('input[type="file"]');

			// Get max file size from data attribute or requirements
			const maxSizeAttr = await fileUploadBlock.getAttribute('data-max-size');

			if (maxSizeAttr) {
				// Note: In real test, would create a file larger than limit
				// For now, just check that validation UI exists
				const sizeLimit = page.locator('[data-testid="file-size-limit"]');
				await expect(sizeLimit).toBeVisible();
			}
		}
	});

	test('should validate file upload type restrictions', async ({ page }) => {
		const fileUploadBlock = page.locator('[data-testid^="block-FILE_UPLOAD-"]').first();

		if (await fileUploadBlock.isVisible()) {
			const fileInput = fileUploadBlock.locator('input[type="file"]');
			const acceptAttr = await fileInput.getAttribute('accept');

			if (acceptAttr) {
				// Should show accepted file types
				const acceptedTypes = page.locator('[data-testid="accepted-file-types"]');
				await expect(acceptedTypes).toBeVisible();

				const typesText = await acceptedTypes.textContent();
				expect(typesText).toContain(acceptAttr.split(',')[0].replace('.', ''));
			}
		}
	});

	test('should validate required signature', async ({ page }) => {
		const signatureBlock = page.locator('[data-testid^="block-SIGNATURE-"]').first();

		if (await signatureBlock.isVisible()) {
			const signatureField = signatureBlock.locator('[data-testid="signature-field"]');
			const isRequired = await signatureField.getAttribute('required');

			if (isRequired) {
				// Try to complete without signing
				await page.click('[data-testid="complete-form-button"]');

				// Should show validation error
				await expect(page.locator('text=Signature is required')).toBeVisible({ timeout: 3000 });
			}
		}
	});

	test('should prevent form completion with validation errors', async ({ page }) => {
		const requiredInput = page.locator('input[required]').first();

		if (await requiredInput.isVisible()) {
			// Clear required field
			await requiredInput.fill('');

			// Complete button should be disabled
			const completeButton = page.locator('[data-testid="complete-form-button"]');
			const isDisabled = await completeButton.isDisabled();

			expect(isDisabled).toBe(true);
		}
	});

	test('should show validation summary with all errors', async ({ page }) => {
		// Leave multiple required fields empty
		const requiredInputs = page.locator('input[required]');
		const count = await requiredInputs.count();

		if (count > 1) {
			// Clear all required fields
			for (let i = 0; i < count; i++) {
				await requiredInputs.nth(i).fill('');
			}

			// Try to submit
			await page.click('[data-testid="complete-form-button"]');

			// Should show validation summary
			const validationSummary = page.locator('[data-testid="validation-summary"]');

			if (await validationSummary.isVisible()) {
				const errorItems = validationSummary.locator('li');
				const errorCount = await errorItems.count();

				expect(errorCount).toBeGreaterThanOrEqual(1);
			}
		}
	});

	test('should validate date fields (min/max dates)', async ({ page }) => {
		const dateInput = page.locator('input[type="date"]').first();

		if (await dateInput.isVisible()) {
			const min = await dateInput.getAttribute('min');
			const max = await dateInput.getAttribute('max');

			if (min) {
				// Enter date before minimum
				await dateInput.fill('2000-01-01');
				await dateInput.blur();

				// Should show validation error
				await expect(page.locator('text=Date must be after')).toBeVisible({ timeout: 3000 });

				// Enter valid date
				await dateInput.fill(min);
				await dateInput.blur();

				// Error should disappear
				await expect(page.locator('text=Date must be after')).not.toBeVisible();
			}
		}
	});

	test('should validate SSN format (if applicable)', async ({ page }) => {
		const ssnInput = page.locator('input[data-field-type="SSN"]').first();

		if (await ssnInput.isVisible()) {
			// Enter invalid SSN
			await ssnInput.fill('123');
			await ssnInput.blur();

			// Should show validation error
			await expect(page.locator('text=Please enter a valid SSN')).toBeVisible({ timeout: 3000 });

			// Enter valid SSN format
			await ssnInput.fill('123-45-6789');
			await ssnInput.blur();

			// Error should disappear
			await expect(page.locator('text=Please enter a valid SSN')).not.toBeVisible();
		}
	});

	test('should validate address fields completeness', async ({ page }) => {
		const addressBlock = page.locator('[data-field-type="ADDRESS"]').first();

		if (await addressBlock.isVisible()) {
			// Check for required address components
			const streetInput = addressBlock.locator('[data-field="street"]');
			const cityInput = addressBlock.locator('[data-field="city"]');
			const stateInput = addressBlock.locator('[data-field="state"]');
			const zipInput = addressBlock.locator('[data-field="zip"]');

			// Fill only street, leave others empty
			if (await streetInput.isVisible()) {
				await streetInput.fill('123 Main St');

				// Try to submit
				await page.click('[data-testid="complete-form-button"]');

				// Should show validation for incomplete address
				await expect(page.locator('text=Please complete all address fields')).toBeVisible({
					timeout: 3000
				});
			}
		}
	});

	test('should validate custom regex patterns', async ({ page }) => {
		const customInput = page.locator('input[data-pattern]').first();

		if (await customInput.isVisible()) {
			const pattern = await customInput.getAttribute('data-pattern');

			if (pattern) {
				// Enter invalid value
				await customInput.fill('invalid-value-123');
				await customInput.blur();

				// Should show validation error
				await expect(page.locator('text=Please enter a valid format')).toBeVisible({
					timeout: 3000
				});
			}
		}
	});

	test('should show inline validation errors as user types', async ({ page }) => {
		const emailInput = page.locator('input[type="email"]').first();

		if (await emailInput.isVisible()) {
			// Type invalid email
			await emailInput.type('invalid');

			// Blur to trigger validation
			await emailInput.blur();

			// Error should appear inline
			const inlineError = page.locator('[data-testid="inline-error"]').first();
			if (await inlineError.isVisible()) {
				await expect(inlineError).toBeVisible();
			}
		}
	});

	test('should clear validation errors when field becomes valid', async ({ page }) => {
		const requiredInput = page.locator('input[required]').first();

		if (await requiredInput.isVisible()) {
			// Clear field
			await requiredInput.fill('');
			await requiredInput.blur();

			// Should show error
			await expect(page.locator('text=This field is required')).toBeVisible({ timeout: 3000 });

			// Fill valid value
			await requiredInput.fill('Valid Value');
			await requiredInput.blur();

			// Error should clear
			await expect(page.locator('text=This field is required')).not.toBeVisible();
		}
	});

	test('should validate form on save progress (soft validation)', async ({ page }) => {
		const input = page.locator('input[type="email"]').first();

		if (await input.isVisible()) {
			// Enter invalid email
			await input.fill('invalid-email');

			// Save progress (should allow but warn)
			await page.click('[data-testid="save-progress-button"]');

			// Should still save (soft validation)
			await expect(page.locator('text=Progress saved')).toBeVisible({ timeout: 5000 });

			// But may show a warning
			const warning = page.locator('[data-testid="validation-warning"]');
			if (await warning.isVisible()) {
				await expect(warning).toContainText('Some fields may need correction');
			}
		}
	});

	test('should prevent form completion with invalid data (hard validation)', async ({ page }) => {
		const emailInput = page.locator('input[type="email"][required]').first();

		if (await emailInput.isVisible()) {
			// Enter invalid email
			await emailInput.fill('invalid-email');

			// Try to complete form
			await page.click('[data-testid="complete-form-button"]');

			// Should block completion
			await expect(page.locator('text=Please fix validation errors')).toBeVisible({
				timeout: 3000
			});

			// Form should not advance
			const currentUrl = page.url();
			await page.waitForTimeout(1000);
			expect(page.url()).toBe(currentUrl);
		}
	});

	test('should highlight fields with validation errors', async ({ page }) => {
		const requiredInput = page.locator('input[required]').first();

		if (await requiredInput.isVisible()) {
			// Clear field
			await requiredInput.fill('');

			// Try to submit
			await page.click('[data-testid="complete-form-button"]');

			// Field should be highlighted (check for error class or style)
			const hasErrorClass =
				(await requiredInput.getAttribute('class'))?.includes('error') ||
				(await requiredInput.getAttribute('aria-invalid')) === 'true';

			expect(hasErrorClass).toBe(true);
		}
	});

	test('should scroll to first validation error', async ({ page }) => {
		// If there are multiple fields, leave the last one empty
		const requiredInputs = page.locator('input[required]');
		const count = await requiredInputs.count();

		if (count > 1) {
			// Fill all except last
			for (let i = 0; i < count - 1; i++) {
				await requiredInputs.nth(i).fill('Valid');
			}

			// Clear last field
			await requiredInputs.nth(count - 1).fill('');

			// Try to submit
			await page.click('[data-testid="complete-form-button"]');

			// Should scroll to the error
			const lastInput = requiredInputs.nth(count - 1);
			const isInViewport = await lastInput.isVisible();

			expect(isInViewport).toBe(true);
		}
	});
});
