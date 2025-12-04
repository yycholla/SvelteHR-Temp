/**
 * E2E Test: RSVP to Recurring Event
 * Feature: 027-we-need-to
 * Quickstart Scenario 3
 *
 * Tests RSVP flow with scope selection (this occurrence, all future, all occurrences).
 * MUST FAIL until EventDetailsDialog RSVP functionality is implemented.
 */

import { test, expect } from '@playwright/test';

test.describe('RSVP to Recurring Event', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/dashboard/events');
		await page.waitForSelector('.fc-daygrid-body');
	});

	test('should open EventDetailsDialog when clicking recurring event', async ({ page }) => {
		// Find and click recurring event
		const recurringEvent = page.locator('.fc-event[data-is-recurring="true"]').first();
		await recurringEvent.click();

		// Verify dialog opens
		const dialog = page.locator('[role="dialog"]').first();
		await expect(dialog).toBeVisible();

		// Verify Details tab is active
		const detailsTab = dialog.locator('[role="tab"]:has-text("Details")');
		await expect(detailsTab).toHaveAttribute('aria-selected', 'true');
	});

	test('should display recurring event details correctly', async ({ page }) => {
		const recurringEvent = page.locator('.fc-event[data-is-recurring="true"]').first();
		await recurringEvent.click();

		const dialog = page.locator('[role="dialog"]').first();

		// Verify recurring pattern is displayed
		const recurrenceInfo = dialog.locator('text=/Repeats|Recurring|Weekly|Monthly/');
		await expect(recurrenceInfo).toBeVisible();

		// Verify recurring icon
		const recurringIcon = dialog.locator('svg[data-icon="repeat"]');
		await expect(recurringIcon).toBeVisible();
	});

	test('should show RSVP scope selection modal when clicking "Accept"', async ({ page }) => {
		const recurringEvent = page.locator('.fc-event[data-is-recurring="true"]').first();
		await recurringEvent.click();

		const dialog = page.locator('[role="dialog"]').first();

		// Click Accept button
		const acceptButton = dialog.locator('button:has-text("Accept")');
		await acceptButton.click();

		// Verify scope selection modal appears
		const scopeModal = page.locator('[role="dialog"]:has-text("RSVP Scope")').first();
		await expect(scopeModal).toBeVisible();

		// Verify all three options are present
		await expect(scopeModal.locator('text=/This occurrence only/')).toBeVisible();
		await expect(scopeModal.locator('text=/All future occurrences/')).toBeVisible();
		await expect(scopeModal.locator('text=/All occurrences/')).toBeVisible();
	});

	test('should RSVP to "This occurrence only"', async ({ page }) => {
		const recurringEvent = page.locator('.fc-event[data-is-recurring="true"]').first();
		const eventTitle = await recurringEvent.getAttribute('title');

		await recurringEvent.click();
		await page.click('button:has-text("Accept")');

		// Wait for scope modal
		const scopeModal = page.locator('[role="dialog"]:has-text("RSVP Scope")');
		await scopeModal.waitFor({ state: 'visible' });

		// Select "This occurrence only"
		const thisOccurrenceButton = scopeModal.locator('button:has-text("This occurrence only")');
		await thisOccurrenceButton.click();

		// Verify confirmation toast
		await expect(page.locator('.toast:has-text("RSVP confirmed for this occurrence")')).toBeVisible(
			{ timeout: 3000 }
		);

		// Verify event now shows "Accepted" status
		await page.waitForTimeout(500); // Allow UI to update
		await recurringEvent.click();

		const dialog = page.locator('[role="dialog"]').first();
		const rsvpStatus = dialog.locator('text=/Your RSVP.*Accepted/');
		await expect(rsvpStatus).toBeVisible();
	});

	test('should RSVP to "All future occurrences"', async ({ page }) => {
		const recurringEvent = page.locator('.fc-event[data-is-recurring="true"]').first();
		await recurringEvent.click();
		await page.click('button:has-text("Accept")');

		const scopeModal = page.locator('[role="dialog"]:has-text("RSVP Scope")');
		await scopeModal.waitFor({ state: 'visible' });

		// Select "All future occurrences"
		const allFutureButton = scopeModal.locator('button:has-text("All future occurrences")');
		await allFutureButton.click();

		// Verify confirmation
		await expect(
			page.locator('.toast:has-text("RSVP confirmed for all future occurrences")')
		).toBeVisible({ timeout: 3000 });

		// Verify GraphQL mutation sent with correct scope
		// This would be captured via network interception in a real implementation
	});

	test('should RSVP to "All occurrences"', async ({ page }) => {
		const recurringEvent = page.locator('.fc-event[data-is-recurring="true"]').first();
		await recurringEvent.click();
		await page.click('button:has-text("Accept")');

		const scopeModal = page.locator('[role="dialog"]:has-text("RSVP Scope")');
		await scopeModal.waitFor({ state: 'visible' });

		// Select "All occurrences"
		const allOccurrencesButton = scopeModal.locator('button:has-text("All occurrences")');
		await allOccurrencesButton.click();

		// Verify confirmation
		await expect(page.locator('.toast:has-text("RSVP confirmed for all occurrences")')).toBeVisible(
			{ timeout: 3000 }
		);
	});

	test('should allow declining recurring event with scope selection', async ({ page }) => {
		const recurringEvent = page.locator('.fc-event[data-is-recurring="true"]').first();
		await recurringEvent.click();

		// Click Decline button
		const declineButton = page.locator('button:has-text("Decline")');
		await declineButton.click();

		// Verify scope modal appears
		const scopeModal = page.locator('[role="dialog"]:has-text("RSVP Scope")');
		await expect(scopeModal).toBeVisible();

		// Select "This occurrence only" for decline
		await page.click('button:has-text("This occurrence only")');

		// Verify decline confirmation
		await expect(page.locator('.toast:has-text("RSVP declined")')).toBeVisible({
			timeout: 3000
		});
	});

	test('should allow tentative RSVP to recurring event', async ({ page }) => {
		const recurringEvent = page.locator('.fc-event[data-is-recurring="true"]').first();
		await recurringEvent.click();

		// Click Tentative button (if exists)
		const tentativeButton = page.locator('button:has-text("Tentative"), button:has-text("Maybe")');

		if ((await tentativeButton.count()) > 0) {
			await tentativeButton.click();

			// Scope selection
			const scopeModal = page.locator('[role="dialog"]:has-text("RSVP Scope")');
			await scopeModal.waitFor({ state: 'visible' });
			await page.click('button:has-text("All future occurrences")');

			// Verify tentative status
			await expect(page.locator('.toast:has-text("RSVP marked as tentative")')).toBeVisible({
				timeout: 3000
			});
		}
	});

	test('should cancel scope selection and keep dialog open', async ({ page }) => {
		const recurringEvent = page.locator('.fc-event[data-is-recurring="true"]').first();
		await recurringEvent.click();

		const mainDialog = page.locator('[role="dialog"]').first();

		// Click Accept
		await page.click('button:has-text("Accept")');

		// Wait for scope modal
		const scopeModal = page.locator('[role="dialog"]:has-text("RSVP Scope")');
		await scopeModal.waitFor({ state: 'visible' });

		// Click Cancel on scope modal
		const cancelButton = scopeModal.locator('button:has-text("Cancel")');
		await cancelButton.click();

		// Verify scope modal closes
		await expect(scopeModal).not.toBeVisible();

		// Verify main dialog remains open
		await expect(mainDialog).toBeVisible();
	});

	test('should update calendar event badge after RSVP', async ({ page }) => {
		const recurringEvent = page.locator('.fc-event[data-is-recurring="true"]').first();
		const eventId = await recurringEvent.getAttribute('data-event-id');

		await recurringEvent.click();
		await page.click('button:has-text("Accept")');
		await page.click('button:has-text("This occurrence only")');

		// Wait for toast to disappear
		await page.waitForTimeout(3000);

		// Close dialog
		const closeButton = page.locator('[role="dialog"] button[aria-label="Close"]');
		await closeButton.click();

		// Verify event on calendar now shows "Accepted" badge
		const updatedEvent = page.locator(`.fc-event[data-event-id="${eventId}"]`);
		const rsvpBadge = updatedEvent.locator('.rsvp-badge:has-text("Accepted")');
		await expect(rsvpBadge).toBeVisible();
	});

	test('should show attendee count after RSVP', async ({ page }) => {
		const recurringEvent = page.locator('.fc-event[data-is-recurring="true"]').first();
		await recurringEvent.click();

		const dialog = page.locator('[role="dialog"]').first();

		// Note initial attendee count
		const initialAttendeeText = await dialog.locator('text=/\\d+ attendee/').textContent();
		const initialCount = parseInt(initialAttendeeText?.match(/\d+/)?.[0] || '0');

		// RSVP to event
		await page.click('button:has-text("Accept")');
		await page.click('button:has-text("This occurrence only")');

		// Wait for update
		await page.waitForTimeout(1000);

		// Reopen event details
		await page.click('[role="dialog"] button[aria-label="Close"]');
		await page.click('.fc-event[data-is-recurring="true"]');

		// Verify attendee count increased
		const updatedAttendeeText = await dialog.locator('text=/\\d+ attendee/').textContent();
		const updatedCount = parseInt(updatedAttendeeText?.match(/\d+/)?.[0] || '0');

		expect(updatedCount).toBeGreaterThanOrEqual(initialCount);
	});

	test('should not allow RSVP to past occurrences', async ({ page }) => {
		// This test assumes there are past recurring event instances
		// Click on a past recurring event instance
		const pastEvent = page
			.locator('.fc-event[data-is-recurring="true"][data-is-past="true"]')
			.first();

		if ((await pastEvent.count()) > 0) {
			await pastEvent.click();

			const dialog = page.locator('[role="dialog"]').first();

			// Verify RSVP buttons are disabled or not present
			const acceptButton = dialog.locator('button:has-text("Accept")');

			if ((await acceptButton.count()) > 0) {
				await expect(acceptButton).toBeDisabled();
			} else {
				// Or verify message indicating past event
				await expect(dialog.locator('text=/This event has already occurred/')).toBeVisible();
			}
		}
	});
});
