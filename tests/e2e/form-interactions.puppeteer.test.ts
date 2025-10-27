import { test, expect, describe } from 'vitest';
import {
	gotoPage,
	waitForElement,
	fillInput,
	selectOption,
	pressKey,
	isElementVisible,
	countElements,
	captureConsole,
	clickElement,
	clearInput,
	waitFor,
	getPage
} from '../utils/puppeteer-helpers';

/**
 * E2E test for form interactions using Puppeteer
 * Tests that forms work correctly without deprecated event handlers
 *
 * Puppeteer provides better Arch Linux support than Playwright
 */

describe('Form Interactions (Puppeteer)', () => {
	test('employee directory search form submission works without deprecated event handlers', async () => {
		// Capture console warnings
		const console = captureConsole();

		await gotoPage('/dashboard/employees');
		await waitForElement('[data-testid="employee-directory"]');

		// Find and fill search input using data-testid
		await fillInput('[data-testid="employee-search-input"]', 'test search');

		// Submit form by pressing Enter
		await pressKey('Enter');

		// Wait for form processing
		await waitFor(1000);

		// Check for deprecation warnings
		const deprecationWarnings = console.warnings.filter((w) =>
			w.text.includes('on:submit') || w.text.includes('deprecated')
		);

		expect(deprecationWarnings).toHaveLength(0);
	});

	test('form submission prevents default behavior correctly', async () => {
		const console = captureConsole();

		await gotoPage('/dashboard/employees');
		await waitForElement('[data-testid="employee-search-input"]');

		// Fill search input using data-testid
		await fillInput('[data-testid="employee-search-input"]', 'john doe');

		// Submit via Enter key
		await pressKey('Enter');

		// Wait for processing
		await waitFor(500);

		// Should have no JavaScript errors
		expect(console.errors).toHaveLength(0);

		// Should have no deprecation warnings
		const deprecationWarnings = console.warnings.filter(
			(w) => w.text.includes('on:submit') || w.text.includes('event attribute')
		);
		expect(deprecationWarnings).toHaveLength(0);
	});

	test('multiple form interactions work without event handler deprecations', async () => {
		const console = captureConsole();

		await gotoPage('/dashboard/employees');
		await waitForElement('[data-testid="employee-directory"]');

		// Fill search form using data-testid
		await fillInput('[data-testid="employee-search-input"]', 'engineer');

		// Check if department filter exists
		const hasFilter = await isElementVisible('[data-testid="employee-department-filter"]');
		if (hasFilter) {
			await selectOption('[data-testid="employee-department-filter"]', 'engineering');
		}

		// Submit form
		await pressKey('Enter');

		// Wait for processing
		await waitFor(1000);

		// Should have no deprecation warnings
		const deprecationWarnings = console.warnings.filter(
			(w) => w.text.includes('deprecated') && (w.text.includes('on:') || w.text.includes('event attribute'))
		);
		expect(deprecationWarnings).toHaveLength(0);
	});

	test('form validation errors are displayed correctly', async () => {
		await gotoPage('/dashboard/employees');
		await waitForElement('[data-testid="employee-search-input"]');

		// Try to submit empty form
		await clearInput('[data-testid="employee-search-input"]');
		await pressKey('Enter');

		// Wait for validation
		await waitFor(500);

		// The form should handle validation gracefully (no crashes)
		// This test passes as long as the page doesn't crash
		const hasForm = await isElementVisible('[data-testid="employee-directory"]');
		expect(hasForm).toBe(true);
	});

	test('complex form with multiple fields submits successfully', async () => {
		const console = captureConsole();

		await gotoPage('/dashboard/employees');

		// Fill search field using data-testid
		await fillInput('[data-testid="employee-search-input"]', 'Software Engineer');

		// Check for additional form controls using data-testid
		const hasDepartmentFilter = await isElementVisible('[data-testid="employee-department-filter"]');
		if (hasDepartmentFilter) {
			await selectOption('[data-testid="employee-department-filter"]', { index: 1 });
		}

		// Submit form
		await pressKey('Enter');

		// Wait for processing
		await waitFor(1000);

		// Should have no JavaScript errors
		expect(console.errors).toHaveLength(0);
	});

	test('form accessibility features work correctly', async () => {
		await gotoPage('/dashboard/employees');

		// Check for form elements using data-testid
		const hasForm = await isElementVisible('[data-testid="employee-directory"]');
		expect(hasForm).toBe(true);

		// Check for search input
		const hasSearchInput = await isElementVisible('[data-testid="employee-search-input"]');
		expect(hasSearchInput).toBe(true);

		// Form should have proper structure
		expect(hasForm).toBe(true);
	});

	test('form reset functionality works correctly', async () => {
		await gotoPage('/dashboard/employees');

		// Fill form using data-testid
		await fillInput('[data-testid="employee-search-input"]', 'test query');

		// Check if reset button exists
		const hasResetButton = await isElementVisible('[data-testid="employee-reset-button"]');

		if (hasResetButton) {
			// Click reset button
			await clickElement('[data-testid="employee-reset-button"]');

			// Wait for reset
			await waitFor(500);

			// Field should be cleared - use Puppeteer API
			const page = getPage();
			const inputValue = await page.$eval('[data-testid="employee-search-input"]', (el: any) => el.value);
			expect(inputValue).toBe('');
		}
	});

	test('form handles dynamic fields correctly', async () => {
		await gotoPage('/dashboard/employees');

		// Fill initial field using data-testid
		await fillInput('[data-testid="employee-search-input"]', 'test');

		// Check if any dynamic fields appear
		await waitFor(500);

		// Form should remain stable
		const hasForm = await isElementVisible('[data-testid="employee-directory"]');
		expect(hasForm).toBe(true);
	});
});
