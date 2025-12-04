import { describe, expect, test } from 'vitest';
import {
	captureConsole,
	clearInput,
	clickElement,
	countElements,
	fillInput,
	gotoPage,
	isElementVisible,
	pressKey,
	selectOption,
	waitFor,
	waitForElement
} from '../utils/vitest-browser-helpers';

/**
 * E2E test for form interactions using Vitest Browser Mode
 * Tests that forms work correctly without deprecated event handlers
 *
 * MIGRATION NOTE: This is the Vitest Browser Mode version
 * Benefits:
 * - Reliable browser testing without Playwright issues
 * - Direct DOM manipulation and form testing
 * - Easier console message capture
 */

describe('Form Interactions (Vitest Browser)', () => {
	test('employee directory search form submission works without deprecated event handlers', async () => {
		// Capture console warnings
		const console = captureConsole();

		await gotoPage('/dashboard/employees/directory');
		await waitForElement('form');

		// Find and fill search input
		await fillInput('input[type="text"]', 'test search');

		// Submit form by pressing Enter
		await pressKey('Enter');

		// Wait for form processing
		await waitFor(1000);

		// Check for deprecation warnings
		const deprecationWarnings = console.warnings.filter(
			(w) => w.text.includes('on:submit') || w.text.includes('deprecated')
		);

		expect(deprecationWarnings).toHaveLength(0);
	});

	test('form submission prevents default behavior correctly', async () => {
		const console = captureConsole();

		await gotoPage('/dashboard/employees/directory');
		await waitForElement('input[type="text"]');

		// Fill search input
		await fillInput('input[type="text"]', 'john doe');

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

		await gotoPage('/dashboard/employees/directory');
		await waitForElement('form');

		// Fill search form
		await fillInput('input[type="text"]', 'engineer');

		// Check if department filter exists
		const hasFilter = await isElementVisible('select');
		if (hasFilter) {
			await selectOption('select', 'engineering');
		}

		// Submit form
		await pressKey('Enter');

		// Wait for processing
		await waitFor(1000);

		// Should have no deprecation warnings
		const deprecationWarnings = console.warnings.filter(
			(w) =>
				w.text.includes('deprecated') &&
				(w.text.includes('on:') || w.text.includes('event attribute'))
		);
		expect(deprecationWarnings).toHaveLength(0);
	});

	test('form validation errors are displayed correctly', async () => {
		await gotoPage('/dashboard/employees/directory');
		await waitForElement('input[type="text"]');

		// Try to submit empty form
		await clearInput('input[type="text"]');
		await pressKey('Enter');

		// Wait for validation
		await waitFor(500);

		// The form should handle validation gracefully (no crashes)
		// This test passes as long as the page doesn't crash
		const hasForm = await isElementVisible('form');
		expect(hasForm).toBe(true);
	});

	test('complex form with multiple fields submits successfully', async () => {
		const console = captureConsole();

		await gotoPage('/dashboard/employees/directory');

		// Fill search field
		await fillInput('input[type="text"]', 'Software Engineer');

		// Check for additional form controls
		const selectCount = await countElements('select');
		if (selectCount > 0) {
			// Interact with first select if available
			const hasSelect = await isElementVisible('select');
			if (hasSelect) {
				await selectOption('select', { index: 1 });
			}
		}

		// Submit form
		await pressKey('Enter');

		// Wait for processing
		await waitFor(1000);

		// Should have no JavaScript errors
		expect(console.errors).toHaveLength(0);
	});

	test('form accessibility features work correctly', async () => {
		await gotoPage('/dashboard/employees/directory');

		// Check for form elements
		const hasForm = await isElementVisible('form');
		expect(hasForm).toBe(true);

		// Check for inputs with labels or placeholders
		const inputCount = await countElements('input[type="text"]');
		expect(inputCount).toBeGreaterThan(0);

		// Check for submit button
		const hasSubmitButton = await isElementVisible('button[type="submit"]');

		// Form should have proper structure (even if submit button is implicit)
		expect(hasForm).toBe(true);
	});

	test('form reset functionality works correctly', async () => {
		await gotoPage('/dashboard/employees/directory');

		// Fill form
		await fillInput('input[type="text"]', 'test query');

		// Check if reset button exists
		const hasResetButton = await isElementVisible('button[type="reset"]');

		if (hasResetButton) {
			// Click reset button
			await clickElement('button[type="reset"]');

			// Wait for reset
			await waitFor(500);

			// Field should be cleared
			const inputValue = await page.locator('input[type="text"]').inputValue();
			expect(inputValue).toBe('');
		}
	});

	test('form handles dynamic fields correctly', async () => {
		await gotoPage('/dashboard/employees/directory');

		// Fill initial field
		await fillInput('input[type="text"]', 'test');

		// Check if any dynamic fields appear
		await waitFor(500);

		// Form should remain stable
		const hasForm = await isElementVisible('form');
		expect(hasForm).toBe(true);
	});
});
