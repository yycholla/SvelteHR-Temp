import { expect, test } from '@playwright/test';

test.describe('Form Interactions - RED Phase', () => {
	test('employee directory search form submission works without deprecated event handlers', async ({
		page
	}) => {
		// RED PHASE: This should fail initially due to deprecated on:submit event handler

		const consoleWarnings: string[] = [];

		// Capture deprecation warnings
		page.on('console', (msg) => {
			if (msg.type() === 'warning') {
				consoleWarnings.push(msg.text());
			}
		});

		await page.goto('/dashboard/employees/directory');
		await page.waitForLoadState('networkidle');

		// Find the search form
		const searchForm = page.locator('form').first();
		await expect(searchForm).toBeVisible();

		// Find search input and enter test data
		const searchInput = page.locator('input[type="text"]').first();
		await searchInput.fill('test search');

		// Submit the form
		await searchForm.dispatchEvent('submit');

		// RED PHASE: This will fail due to deprecated on:submit usage on line 240
		const eventHandlerWarnings = consoleWarnings.filter(
			(warning) => warning.includes('on:submit') && warning.includes('deprecated')
		);
		expect(eventHandlerWarnings).toHaveLength(0);
	});

	test('form submission prevents default behavior correctly', async ({ page }) => {
		// RED PHASE: Test that form submission works but without deprecation warnings

		const consoleWarnings: string[] = [];
		const consoleErrors: string[] = [];

		page.on('console', (msg) => {
			if (msg.type() === 'warning') {
				consoleWarnings.push(msg.text());
			} else if (msg.type() === 'error') {
				consoleErrors.push(msg.text());
			}
		});

		await page.goto('/dashboard/employees/directory');
		await page.waitForLoadState('networkidle');

		// Interact with the search form
		const searchInput = page.locator('input[placeholder*="Search"], input[type="text"]').first();
		await searchInput.fill('john doe');

		// Submit via Enter key
		await searchInput.press('Enter');

		// Wait for any form processing
		await page.waitForTimeout(500);

		// RED PHASE: Should have no JavaScript errors
		expect(consoleErrors).toHaveLength(0);

		// RED PHASE: This will fail due to on:submit deprecation warning
		const deprecationWarnings = consoleWarnings.filter(
			(warning) => warning.includes('on:submit') && warning.includes('event attribute')
		);
		expect(deprecationWarnings).toHaveLength(0);
	});

	test('multiple form interactions work without event handler deprecations', async ({ page }) => {
		// RED PHASE: Test comprehensive form interaction scenarios

		const consoleWarnings: string[] = [];

		page.on('console', (msg) => {
			if (msg.type() === 'warning') {
				consoleWarnings.push(msg.text());
			}
		});

		await page.goto('/dashboard/employees/directory');
		await page.waitForLoadState('networkidle');

		// Test search form
		const searchInput = page.locator('input[type="text"]').first();
		await searchInput.fill('engineer');

		// Test department filter if available
		const departmentSelect = page.locator('select').first();
		if (await departmentSelect.isVisible()) {
			await departmentSelect.selectOption('engineering');
		}

		// Submit the form using form submission
		const form = page.locator('form').first();
		await form.dispatchEvent('submit');

		// Wait for form processing
		await page.waitForTimeout(1000);

		// RED PHASE: This will fail due to deprecated event handlers throughout the form
		const allDeprecationWarnings = consoleWarnings.filter(
			(warning) =>
				warning.includes('deprecated') &&
				(warning.includes('on:') || warning.includes('event attribute'))
		);
		expect(allDeprecationWarnings).toHaveLength(0);
	});
});
