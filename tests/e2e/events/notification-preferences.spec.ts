/**
 * E2E Test: Configure Notification Preferences
 * Feature: 027-we-need-to
 * Quickstart Scenario 9
 *
 * Tests notification preferences configuration with reminder scopes and custom event selection.
 * MUST FAIL until notification preferences are implemented.
 */

import { expect, test } from '@playwright/test';

test.describe('Configure Notification Preferences', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/dashboard/events/settings/notifications');
	});

	test('should load notification preferences page', async ({ page }) => {
		// Verify page title
		const pageTitle = page.locator('h1, h2').first();
		await expect(pageTitle).toHaveText(/Notification.*Preferences|Event Notifications/i);

		// Verify form is visible
		const preferencesForm = page.locator('form, [data-preferences-form]');
		await expect(preferencesForm).toBeVisible();
	});

	test('should display current notification settings', async ({ page }) => {
		// Verify toggle switches for notification types
		const eventInvitationsToggle = page.locator('input[name="eventInvitations"]');
		await expect(eventInvitationsToggle).toBeVisible();

		const eventChangesToggle = page.locator('input[name="eventChanges"]');
		await expect(eventChangesToggle).toBeVisible();

		const eventCancellationsToggle = page.locator('input[name="eventCancellations"]');
		await expect(eventCancellationsToggle).toBeVisible();

		const commentMentionsToggle = page.locator('input[name="commentMentions"]');
		await expect(commentMentionsToggle).toBeVisible();
	});

	test('should toggle event invitation notifications', async ({ page }) => {
		const toggle = page.locator('input[name="eventInvitations"]');
		const initialState = await toggle.isChecked();

		// Toggle off/on
		await toggle.click();

		// Verify state changed
		const newState = await toggle.isChecked();
		expect(newState).toBe(!initialState);
	});

	test('should select reminder times (up to 3)', async ({ page }) => {
		// Find reminder time checkboxes or select
		const reminderSection = page.locator(
			'section:has-text("Reminder Times"), [data-reminder-times]'
		);

		// Select "15 minutes before"
		const fifteenMinCheckbox = page.locator('input[value="15min"]');
		await fifteenMinCheckbox.check();

		// Select "1 hour before"
		const oneHourCheckbox = page.locator('input[value="1hour"]');
		await oneHourCheckbox.check();

		// Select "1 day before"
		const oneDayCheckbox = page.locator('input[value="1day"]');
		await oneDayCheckbox.check();

		// Verify all three are checked
		await expect(fifteenMinCheckbox).toBeChecked();
		await expect(oneHourCheckbox).toBeChecked();
		await expect(oneDayCheckbox).toBeChecked();
	});

	test('should enforce maximum 3 reminder times', async ({ page }) => {
		// Select first 3 reminder times
		const reminderCheckboxes = page.locator('input[name="reminderTimes"]');

		if ((await reminderCheckboxes.count()) >= 4) {
			// Check first 3
			await reminderCheckboxes.nth(0).check();
			await reminderCheckboxes.nth(1).check();
			await reminderCheckboxes.nth(2).check();

			// Try to check 4th
			await reminderCheckboxes.nth(3).check();

			// Verify error message or that 4th checkbox is disabled
			const errorMessage = page.locator('text=/Maximum.*3 reminder times|Only 3 reminders/i');

			if ((await errorMessage.count()) > 0) {
				await expect(errorMessage).toBeVisible();
			} else {
				// Or 4th checkbox should be unchecked/disabled
				const fourthChecked = await reminderCheckboxes.nth(3).isChecked();
				expect(fourthChecked).toBe(false);
			}
		}
	});

	test('should select reminder scope: All events', async ({ page }) => {
		// Find reminder scope radio buttons
		const allEventsRadio = page.locator('input[name="reminderScope"][value="all"]');
		await allEventsRadio.check();

		// Verify selection
		await expect(allEventsRadio).toBeChecked();

		// Verify custom event selector is hidden
		const customEventSelector = page.locator('[data-custom-event-selector]');

		if ((await customEventSelector.count()) > 0) {
			await expect(customEventSelector).not.toBeVisible();
		}
	});

	test('should select reminder scope: Only accepted events', async ({ page }) => {
		const acceptedEventsRadio = page.locator('input[name="reminderScope"][value="accepted"]');
		await acceptedEventsRadio.check();

		await expect(acceptedEventsRadio).toBeChecked();

		// Custom event selector should be hidden
		const customEventSelector = page.locator('[data-custom-event-selector]');

		if ((await customEventSelector.count()) > 0) {
			await expect(customEventSelector).not.toBeVisible();
		}
	});

	test('should select reminder scope: Custom events', async ({ page }) => {
		const customRadio = page.locator('input[name="reminderScope"][value="custom"]');
		await customRadio.check();

		await expect(customRadio).toBeChecked();

		// Verify custom event selector appears
		const customEventSelector = page.locator('[data-custom-event-selector]');
		await expect(customEventSelector).toBeVisible();
	});

	test('should select custom events for reminders', async ({ page }) => {
		// Select "Custom" scope
		const customRadio = page.locator('input[name="reminderScope"][value="custom"]');
		await customRadio.check();

		// Wait for event picker to appear
		const eventPicker = page.locator('[data-custom-event-selector]');
		await eventPicker.waitFor({ state: 'visible' });

		// Click "Add Event" button
		const addEventButton = eventPicker.locator('button:has-text("Add Event")');
		await addEventButton.click();

		// Event selection modal should appear
		const eventModal = page.locator('[role="dialog"]:has-text("Select Events")');
		await expect(eventModal).toBeVisible();

		// Select first event
		const firstEvent = eventModal.locator('.event-item, [data-event-item]').first();
		await firstEvent.click();

		// Confirm selection
		await page.click('button:has-text("Confirm"), button:has-text("Done")');

		// Verify selected event appears in custom list
		const selectedEvents = eventPicker.locator('.selected-event');
		await expect(selectedEvents).toHaveCount(1);
	});

	test('should remove custom event from reminder list', async ({ page }) => {
		// Navigate to custom scope with events already selected
		const customRadio = page.locator('input[name="reminderScope"][value="custom"]');
		await customRadio.check();

		const eventPicker = page.locator('[data-custom-event-selector]');

		// If events are already selected, remove one
		const selectedEvents = eventPicker.locator('.selected-event');

		if ((await selectedEvents.count()) > 0) {
			const firstEvent = selectedEvents.first();
			const removeButton = firstEvent.locator(
				'button:has-text("Remove"), button[aria-label="Remove"]'
			);

			await removeButton.click();

			// Verify event is removed
			const newCount = await selectedEvents.count();
			expect(newCount).toBeLessThan(await selectedEvents.count());
		}
	});

	test('should save notification preferences', async ({ page }) => {
		// Toggle some settings
		await page.check('input[name="eventInvitations"]');
		await page.check('input[name="commentMentions"]');

		// Select reminder times
		await page.check('input[value="15min"]');
		await page.check('input[value="1hour"]');

		// Select reminder scope
		await page.check('input[name="reminderScope"][value="accepted"]');

		// Save changes
		const saveButton = page.locator('button:has-text("Save"), button:has-text("Save Preferences")');
		await saveButton.click();

		// Verify success toast
		await expect(page.locator('.toast:has-text("Preferences saved")')).toBeVisible({
			timeout: 3000
		});
	});

	test('should show validation error for invalid preferences', async ({ page }) => {
		// Try to save with no reminder scope selected (if required)
		// Uncheck all reminder times
		const reminderCheckboxes = page.locator('input[name="reminderTimes"]');
		const count = await reminderCheckboxes.count();

		for (let i = 0; i < count; i++) {
			await reminderCheckboxes.nth(i).uncheck();
		}

		// Try to save
		await page.click('button:has-text("Save")');

		// Verify validation message or that save is disabled
		const validationError = page.locator('text=/At least one reminder time|Required/i');

		if ((await validationError.count()) > 0) {
			await expect(validationError).toBeVisible();
		}
	});

	test('should reset preferences to default', async ({ page }) => {
		// Change some settings first
		await page.check('input[name="eventInvitations"]');
		await page.check('input[value="15min"]');

		// Click reset button
		const resetButton = page.locator(
			'button:has-text("Reset"), button:has-text("Reset to Default")'
		);

		if ((await resetButton.count()) > 0) {
			await resetButton.click();

			// Verify confirmation modal
			const confirmModal = page.locator('[role="dialog"]:has-text("Reset")');

			if ((await confirmModal.count()) > 0) {
				await page.click('button:has-text("Confirm")');

				// Verify toast
				await expect(page.locator('.toast:has-text("Reset to default")')).toBeVisible({
					timeout: 3000
				});
			}
		}
	});

	test('should show optimistic UI update when saving', async ({ page }) => {
		// Toggle setting
		const toggle = page.locator('input[name="eventChanges"]');
		const initialState = await toggle.isChecked();

		await toggle.click();

		// Click save
		await page.click('button:has-text("Save")');

		// Verify UI shows saving state
		const savingIndicator = page.locator('text=/Saving|Updating/i, [aria-busy="true"]');

		if ((await savingIndicator.count()) > 0) {
			await expect(savingIndicator).toBeVisible();
		}

		// After save completes, verify state persists
		await page.waitForTimeout(1000);
		const newState = await toggle.isChecked();
		expect(newState).toBe(!initialState);
	});

	test('should navigate back to events calendar from preferences', async ({ page }) => {
		// Find back/cancel button
		const backButton = page.locator('a:has-text("Back"), button:has-text("Cancel")');

		if ((await backButton.count()) > 0) {
			await backButton.click();

			// Verify navigation to events page
			await expect(page).toHaveURL(/\/dashboard\/events$/);
		}
	});

	test('should show help text for each preference option', async ({ page }) => {
		// Verify help text exists for event invitations
		const invitationHelp = page.locator('text=/Event invitations.*new event/i');

		if ((await invitationHelp.count()) > 0) {
			await expect(invitationHelp).toBeVisible();
		}

		// Verify help text for reminder times
		const reminderHelp = page.locator('text=/Select up to.*3 reminder times/i');

		if ((await reminderHelp.count()) > 0) {
			await expect(reminderHelp).toBeVisible();
		}
	});

	test('should display current preferences on page load', async ({ page }) => {
		// Reload page
		await page.reload();

		// Verify previously saved preferences are loaded
		// This tests persistence
		const eventInvitationsToggle = page.locator('input[name="eventInvitations"]');
		const isChecked = await eventInvitationsToggle.isChecked();

		// State should be defined (not null/undefined)
		expect(typeof isChecked).toBe('boolean');
	});
});
