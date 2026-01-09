/**
 * E2E Test: Delete Event
 * Feature: 027-we-need-to
 *
 * Tests event deletion functionality.
 */

import { expect, test } from '@playwright/test';

test.describe('Delete Event', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/dashboard/events');
		await page.waitForSelector('.fc-daygrid-body');
	});

	test('should delete an event successfully', async ({ page }) => {
		// 1. Create a test event first to ensure we have something to delete
		await page.locator('.fc-daygrid-day').nth(15).click();
		await page.waitForSelector('[role="dialog"]');

		const eventTitle = `Delete Me ${Date.now()}`;
		await page.fill('input[name="title"]', eventTitle);
		await page.fill('textarea[name="description"]', 'This event should be deleted');

		// Submit creation
		await page.click('button:has-text("Create Event")');

		// Verify creation success
		await expect(page.locator('.toast:has-text("Event created")')).toBeVisible({ timeout: 5000 });
		await expect(page.locator(`.fc-event:has-text("${eventTitle}")`)).toBeVisible({
			timeout: 5000
		});

		// 2. Delete the event
		// Click the event to open details
		await page.click(`.fc-event:has-text("${eventTitle}")`);
		await page.waitForSelector('[role="dialog"]');

		// Click delete button (trash icon)
		// Note: The dialog has a delete button only if the user is the organizer (which they are for this new event)
		const deleteButton = page.locator('button[aria-label="Delete event"]');
		await expect(deleteButton).toBeVisible();

		// Handle confirmation dialog
		page.on('dialog', (dialog) => dialog.accept());

		await deleteButton.click();

		// 3. Verify deletion
		// Verify success toast
		await expect(page.locator('.toast:has-text("Event deleted")')).toBeVisible({ timeout: 5000 });

		// Verify event is gone from calendar
		await expect(page.locator(`.fc-event:has-text("${eventTitle}")`)).not.toBeVisible({
			timeout: 5000
		});

		// Reload page to ensure server-side persistence
		await page.reload();
		await page.waitForSelector('.fc-daygrid-body');
		await expect(page.locator(`.fc-event:has-text("${eventTitle}")`)).not.toBeVisible();
	});
});
