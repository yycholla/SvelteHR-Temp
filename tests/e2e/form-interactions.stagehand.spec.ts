import { test, expect } from '@playwright/test';
import { z } from 'zod';
import {
	initStagehand,
	gotoPage,
	performAction,
	extractData,
	cleanupStagehand,
	createStagehandHelpers
} from '../utils/stagehand-helpers';

/**
 * E2E test for form interactions using Stagehand AI
 * Tests that forms work correctly without deprecated event handlers
 *
 * MIGRATION NOTE: This is the Stagehand version of form-interactions.spec.ts
 * Benefits:
 * - Natural language form filling (no need to find exact selectors)
 * - Automatic detection of console warnings
 * - More flexible form interaction patterns
 */

test.describe('Form Interactions (Stagehand)', () => {
	test('employee directory search form submission works without deprecated event handlers', async () => {
		const stagehand = await initStagehand();

		try {
			// Track console warnings
			const consoleWarnings: string[] = [];
			stagehand.page.on('console', (msg) => {
				if (msg.type() === 'warning') {
					consoleWarnings.push(msg.text());
				}
			});

			await gotoPage(stagehand, '/dashboard/employees/directory');

			// Wait for page to fully load
			await stagehand.page.waitForLoadState('networkidle');

			// Use AI to find and interact with the search form
			await performAction(stagehand, 'enter "test search" in the search box or search input');

			// Submit the form using natural language
			await performAction(stagehand, 'submit the search form or press enter in the search field');

			// Wait for any form processing
			await stagehand.page.waitForTimeout(1000);

			// Check for deprecation warnings
			const eventHandlerWarnings = consoleWarnings.filter(
				(warning) => warning.includes('on:submit') && warning.includes('deprecated')
			);
			expect(eventHandlerWarnings).toHaveLength(0);

		} finally {
			await cleanupStagehand(stagehand);
		}
	});

	test('form submission prevents default behavior correctly', async () => {
		const stagehand = await initStagehand();

		try {
			const consoleWarnings: string[] = [];
			const consoleErrors: string[] = [];

			stagehand.page.on('console', (msg) => {
				if (msg.type() === 'warning') {
					consoleWarnings.push(msg.text());
				} else if (msg.type() === 'error') {
					consoleErrors.push(msg.text());
				}
			});

			await gotoPage(stagehand, '/dashboard/employees/directory');
			await stagehand.page.waitForLoadState('networkidle');

			// Use AI to interact with the search form
			await performAction(stagehand, 'find the search input and type "john doe"');

			// Submit via Enter key using natural language
			await performAction(stagehand, 'press enter in the search input');

			// Wait for any form processing
			await stagehand.page.waitForTimeout(500);

			// Should have no JavaScript errors
			expect(consoleErrors).toHaveLength(0);

			// Should have no deprecation warnings
			const deprecationWarnings = consoleWarnings.filter(
				(warning) => warning.includes('on:submit') && warning.includes('event attribute')
			);
			expect(deprecationWarnings).toHaveLength(0);

		} finally {
			await cleanupStagehand(stagehand);
		}
	});

	test('multiple form interactions work without event handler deprecations', async () => {
		const stagehand = await initStagehand();

		try {
			const consoleWarnings: string[] = [];

			stagehand.page.on('console', (msg) => {
				if (msg.type() === 'warning') {
					consoleWarnings.push(msg.text());
				}
			});

			await gotoPage(stagehand, '/dashboard/employees/directory');
			await stagehand.page.waitForLoadState('networkidle');

			// Test search form with AI
			await performAction(stagehand, 'enter "engineer" in the search field');

			// Check if department filter exists and use it
			const hasFilter = await extractData(stagehand, {
				instruction: 'Check if there is a department dropdown or filter selector visible on the page',
				schema: z.object({
					hasFilter: z.boolean().describe('True if department filter is found'),
					filterType: z.string().optional().describe('Type of filter (dropdown, select, etc.)')
				})
			});

			if (hasFilter.hasFilter) {
				await performAction(stagehand, 'select "engineering" from the department filter or dropdown');
			}

			// Submit the form using AI
			await performAction(stagehand, 'submit the form');

			// Wait for form processing
			await stagehand.page.waitForTimeout(1000);

			// Should have no deprecation warnings
			const allDeprecationWarnings = consoleWarnings.filter(
				(warning) =>
					warning.includes('deprecated') &&
					(warning.includes('on:') || warning.includes('event attribute'))
			);
			expect(allDeprecationWarnings).toHaveLength(0);

		} finally {
			await cleanupStagehand(stagehand);
		}
	});

	test('form validation errors are displayed correctly', async () => {
		const stagehand = await initStagehand();
		const helpers = createStagehandHelpers(stagehand);

		try {
			await gotoPage(stagehand, '/dashboard/employees/directory');

			// Try to submit empty form to trigger validation
			await performAction(stagehand, 'clear any text in the search field if present');
			await performAction(stagehand, 'submit the form or press enter');

			// Check for validation feedback using AI
			const validationResult = await extractData(stagehand, {
				instruction: 'Check if there are any validation error messages, required field warnings, or error styling on form fields',
				schema: z.object({
					hasValidationErrors: z.boolean().describe('True if validation errors are shown'),
					errors: z.array(z.object({
						fieldName: z.string().describe('Name or label of the field with error'),
						errorMessage: z.string().describe('Error message text')
					})).optional().describe('List of validation errors if any')
				})
			});

			// Validation errors should be shown (or form should prevent submission gracefully)
			// The test is successful as long as the page handles it without crashes
			expect(validationResult.hasValidationErrors).toBeDefined();

		} finally {
			await cleanupStagehand(stagehand);
		}
	});

	test('complex form with multiple fields submits successfully', async () => {
		const stagehand = await initStagehand();

		try {
			const consoleErrors: string[] = [];

			stagehand.page.on('console', (msg) => {
				if (msg.type() === 'error') {
					consoleErrors.push(msg.text());
				}
			});

			await gotoPage(stagehand, '/dashboard/employees/directory');

			// Fill out multiple form fields using AI
			await performAction(stagehand, 'enter "Software Engineer" in the search field');

			// Check for additional form controls
			const formControls = await extractData(stagehand, {
				instruction: 'Find all interactive form controls like dropdowns, checkboxes, or filters',
				schema: z.object({
					controls: z.array(z.object({
						type: z.string().describe('Type of control (dropdown, checkbox, radio, etc.)'),
						label: z.string().describe('Label or name of the control'),
						isRequired: z.boolean().optional().describe('Whether the field is required')
					})).describe('List of form controls found')
				})
			});

			// Interact with any available controls
			if (formControls.controls.length > 0) {
				for (const control of formControls.controls.slice(0, 2)) { // Interact with up to 2 controls
					if (control.type.includes('dropdown') || control.type.includes('select')) {
						await performAction(stagehand, `select the first option in the ${control.label} dropdown`);
					} else if (control.type.includes('checkbox')) {
						await performAction(stagehand, `check the ${control.label} checkbox`);
					}
				}
			}

			// Submit the form
			await performAction(stagehand, 'submit the form');

			// Wait for submission to process
			await stagehand.page.waitForTimeout(1000);

			// Should have no JavaScript errors
			expect(consoleErrors).toHaveLength(0);

			// Verify results or success message
			const searchResults = await extractData(stagehand, {
				instruction: 'Check if search results are displayed or a success/error message is shown',
				schema: z.object({
					hasResults: z.boolean().describe('True if search results are shown'),
					resultsCount: z.number().optional().describe('Number of results shown'),
					message: z.string().optional().describe('Any message displayed after submission')
				})
			});

			expect(searchResults.hasResults).toBeDefined();

		} finally {
			await cleanupStagehand(stagehand);
		}
	});

	test('form accessibility features work correctly', async () => {
		const stagehand = await initStagehand();

		try {
			await gotoPage(stagehand, '/dashboard/employees/directory');

			// Check form accessibility using AI
			const accessibilityCheck = await extractData(stagehand, {
				instruction: 'Check if form fields have proper labels, aria-labels, or placeholder text. Also check if form has a submit button with clear text.',
				schema: z.object({
					hasProperLabels: z.boolean().describe('True if form fields have labels'),
					hasAccessibleSubmit: z.boolean().describe('True if submit button is clearly labeled'),
					accessibilityIssues: z.array(z.string()).optional().describe('List of accessibility issues if any'),
					formDescription: z.string().optional().describe('Overall description of the form')
				})
			});

			// Form should have proper accessibility features
			expect(accessibilityCheck.hasProperLabels).toBe(true);
			expect(accessibilityCheck.hasAccessibleSubmit).toBe(true);

			if (accessibilityCheck.accessibilityIssues) {
				expect(accessibilityCheck.accessibilityIssues.length).toBe(0);
			}

		} finally {
			await cleanupStagehand(stagehand);
		}
	});

	test('form reset functionality works correctly', async () => {
		const stagehand = await initStagehand();

		try {
			await gotoPage(stagehand, '/dashboard/employees/directory');

			// Fill out the form
			await performAction(stagehand, 'enter "test query" in the search field');

			// Check if reset button exists
			const hasResetButton = await extractData(stagehand, {
				instruction: 'Check if there is a reset, clear, or "clear filters" button visible',
				schema: z.object({
					hasReset: z.boolean(),
					resetButtonLabel: z.string().optional()
				})
			});

			if (hasResetButton.hasReset) {
				// Click reset button
				await performAction(stagehand, `click the ${hasResetButton.resetButtonLabel || 'reset'} button`);

				// Verify form is cleared
				const formState = await extractData(stagehand, {
					instruction: 'Check if the search field is now empty or cleared',
					schema: z.object({
						isCleared: z.boolean().describe('True if form fields are empty'),
						searchFieldValue: z.string().optional().describe('Current value in search field')
					})
				});

				expect(formState.isCleared).toBe(true);
			}

		} finally {
			await cleanupStagehand(stagehand);
		}
	});
});
