/**
 * E2E Test: View Event History
 * Feature: 027-we-need-to
 * Quickstart Scenario 7
 *
 * Tests event history timeline showing changes, RSVPs, and comments.
 * MUST FAIL until event history functionality is implemented.
 */

import { expect, test } from '@playwright/test';

test.describe('View Event History', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/dashboard/events');
		await page.waitForSelector('.fc-daygrid-body');
	});

	test('should switch to History tab in EventDetailsDialog', async ({ page }) => {
		const event = page.locator('.fc-event').first();
		await event.click();

		const dialog = page.locator('[role="dialog"]').first();

		// Click History tab
		const historyTab = dialog.locator('[role="tab"]:has-text("History")');
		await historyTab.click();

		// Verify History tab is now active
		await expect(historyTab).toHaveAttribute('aria-selected', 'true');

		// Verify history section is visible
		const historySection = dialog
			.locator('[role="tabpanel"]')
			.filter({ hasText: /History|Timeline/ });
		await expect(historySection).toBeVisible();
	});

	test('should display event creation in history timeline', async ({ page }) => {
		const event = page.locator('.fc-event').first();
		await event.click();

		const dialog = page.locator('[role="dialog"]').first();
		await page.click('[role="tab"]:has-text("History")');

		// Wait for history to load
		await page.waitForTimeout(500);

		const historyTimeline = dialog.locator('.history-timeline, [data-history-timeline]');

		// Verify "Event created" entry exists
		const createdEntry = historyTimeline.locator('text=/Event created|Created by/');
		await expect(createdEntry).toBeVisible();
	});

	test('should show RSVP history entries', async ({ page }) => {
		const event = page.locator('.fc-event').first();
		await event.click();

		const dialog = page.locator('[role="dialog"]').first();
		await page.click('[role="tab"]:has-text("History")');

		await page.waitForTimeout(500);

		const historyTimeline = dialog.locator('.history-timeline');

		// Look for RSVP entries
		const rsvpEntries = historyTimeline.locator('text=/RSVP|accepted|declined|tentative/i');

		if ((await rsvpEntries.count()) > 0) {
			const firstRsvpEntry = rsvpEntries.first();
			await expect(firstRsvpEntry).toBeVisible();

			// Verify entry has user name
			const historyItem = firstRsvpEntry.locator('..');
			const userName = historyItem.locator('.user-name, [data-user-name]');

			if ((await userName.count()) > 0) {
				await expect(userName).toBeVisible();
			}

			// Verify timestamp
			const timestamp = historyItem.locator('time, .timestamp');
			await expect(timestamp).toBeVisible();
		}
	});

	test('should show event modification history', async ({ page }) => {
		const event = page.locator('.fc-event').first();
		await event.click();

		const dialog = page.locator('[role="dialog"]').first();
		await page.click('[role="tab"]:has-text("History")');

		await page.waitForTimeout(500);

		const historyTimeline = dialog.locator('.history-timeline');

		// Look for modification entries
		const modificationEntries = historyTimeline.locator('text=/updated|changed|modified|edited/i');

		if ((await modificationEntries.count()) > 0) {
			const firstModEntry = modificationEntries.first();
			await expect(firstModEntry).toBeVisible();

			// Verify what was changed (e.g., "Title changed from X to Y")
			const changeDetails = firstModEntry.locator('..');
			const changeText = await changeDetails.textContent();

			expect(changeText).toMatch(/changed|updated|modified/i);
		}
	});

	test('should show rescheduling history', async ({ page }) => {
		const event = page.locator('.fc-event').first();
		await event.click();

		const dialog = page.locator('[role="dialog"]').first();
		await page.click('[role="tab"]:has-text("History")');

		await page.waitForTimeout(500);

		const historyTimeline = dialog.locator('.history-timeline');

		// Look for reschedule entries
		const rescheduleEntries = historyTimeline.locator('text=/rescheduled|moved/i');

		if ((await rescheduleEntries.count()) > 0) {
			const rescheduleEntry = rescheduleEntries.first();
			await expect(rescheduleEntry).toBeVisible();

			// Verify old and new dates are shown
			const entryText = await rescheduleEntry.textContent();
			expect(entryText).toMatch(/from|to/i);
		}
	});

	test('should show capacity changes in history', async ({ page }) => {
		const event = page.locator('.fc-event').first();
		await event.click();

		const dialog = page.locator('[role="dialog"]').first();
		await page.click('[role="tab"]:has-text("History")');

		await page.waitForTimeout(500);

		const historyTimeline = dialog.locator('.history-timeline');

		// Look for capacity change entries
		const capacityEntries = historyTimeline.locator('text=/capacity.*changed|capacity.*set/i');

		if ((await capacityEntries.count()) > 0) {
			const capacityEntry = capacityEntries.first();
			await expect(capacityEntry).toBeVisible();
		}
	});

	test('should display history entries in chronological order (newest first)', async ({ page }) => {
		const event = page.locator('.fc-event').first();
		await event.click();

		const dialog = page.locator('[role="dialog"]').first();
		await page.click('[role="tab"]:has-text("History")');

		await page.waitForTimeout(500);

		const historyItems = dialog.locator('.history-item, [data-history-item]');

		if ((await historyItems.count()) >= 2) {
			// Get first two items
			const firstItem = historyItems.nth(0);
			const secondItem = historyItems.nth(1);

			// Get timestamps
			const firstTimestamp = await firstItem.locator('time').getAttribute('datetime');
			const secondTimestamp = await secondItem.locator('time').getAttribute('datetime');

			if (firstTimestamp && secondTimestamp) {
				const firstDate = new Date(firstTimestamp);
				const secondDate = new Date(secondTimestamp);

				// First item should be newer than second
				expect(firstDate.getTime()).toBeGreaterThanOrEqual(secondDate.getTime());
			}
		}
	});

	test('should show comment history entries', async ({ page }) => {
		const event = page.locator('.fc-event').first();
		await event.click();

		const dialog = page.locator('[role="dialog"]').first();
		await page.click('[role="tab"]:has-text("History")');

		await page.waitForTimeout(500);

		const historyTimeline = dialog.locator('.history-timeline');

		// Look for comment entries
		const commentEntries = historyTimeline.locator('text=/commented|posted a comment/i');

		if ((await commentEntries.count()) > 0) {
			const commentEntry = commentEntries.first();
			await expect(commentEntry).toBeVisible();

			// Verify comment preview is shown
			const commentPreview = commentEntry.locator('.. .comment-preview, .. [data-comment-preview]');

			if ((await commentPreview.count()) > 0) {
				await expect(commentPreview).toBeVisible();
			}
		}
	});

	test('should show waitlist promotion history', async ({ page }) => {
		const event = page.locator('.fc-event').first();
		await event.click();

		const dialog = page.locator('[role="dialog"]').first();
		await page.click('[role="tab"]:has-text("History")');

		await page.waitForTimeout(500);

		const historyTimeline = dialog.locator('.history-timeline');

		// Look for waitlist promotion entries
		const promotionEntries = historyTimeline.locator(
			'text=/promoted from waitlist|joined waitlist/i'
		);

		if ((await promotionEntries.count()) > 0) {
			await expect(promotionEntries.first()).toBeVisible();
		}
	});

	test('should show attendee added/removed history', async ({ page }) => {
		const event = page.locator('.fc-event').first();
		await event.click();

		const dialog = page.locator('[role="dialog"]').first();
		await page.click('[role="tab"]:has-text("History")');

		await page.waitForTimeout(500);

		const historyTimeline = dialog.locator('.history-timeline');

		// Look for attendee management entries
		const attendeeEntries = historyTimeline.locator('text=/added.*attendee|removed.*attendee/i');

		if ((await attendeeEntries.count()) > 0) {
			const entry = attendeeEntries.first();
			await expect(entry).toBeVisible();

			// Verify user name is shown
			const userName = entry.locator('.. .user-name, .. [data-user-name]');

			if ((await userName.count()) > 0) {
				await expect(userName).toBeVisible();
			}
		}
	});

	test('should group similar history entries', async ({ page }) => {
		const event = page.locator('.fc-event').first();
		await event.click();

		const dialog = page.locator('[role="dialog"]').first();
		await page.click('[role="tab"]:has-text("History")');

		await page.waitForTimeout(500);

		// Look for grouped entries (e.g., "3 people accepted")
		const groupedEntry = dialog.locator('text=/\\d+ people|\\d+ users/i');

		if ((await groupedEntry.count()) > 0) {
			await expect(groupedEntry.first()).toBeVisible();

			// Verify can expand to see individual actions
			const expandButton = groupedEntry.locator(
				'.. button:has-text("Show all"), .. button:has-text("Expand")'
			);

			if ((await expandButton.count()) > 0) {
				await expandButton.click();

				// Verify individual entries appear
				await page.waitForTimeout(300);
			}
		}
	});

	test('should show user avatars in history entries', async ({ page }) => {
		const event = page.locator('.fc-event').first();
		await event.click();

		const dialog = page.locator('[role="dialog"]').first();
		await page.click('[role="tab"]:has-text("History")');

		await page.waitForTimeout(500);

		const historyItems = dialog.locator('.history-item');

		if ((await historyItems.count()) > 0) {
			const firstItem = historyItems.first();

			// Verify avatar or user icon is present
			const avatar = firstItem.locator('img[alt*="avatar"], .avatar, .user-icon');

			if ((await avatar.count()) > 0) {
				await expect(avatar).toBeVisible();
			}
		}
	});

	test('should show relative timestamps (e.g., "2 hours ago")', async ({ page }) => {
		const event = page.locator('.fc-event').first();
		await event.click();

		const dialog = page.locator('[role="dialog"]').first();
		await page.click('[role="tab"]:has-text("History")');

		await page.waitForTimeout(500);

		const historyItems = dialog.locator('.history-item');

		if ((await historyItems.count()) > 0) {
			const timestamp = historyItems.first().locator('.timestamp, time');
			const timestampText = await timestamp.textContent();

			// Verify relative format
			expect(timestampText).toMatch(/ago|just now|yesterday|hours|minutes/i);
		}
	});

	test('should show absolute timestamp on hover', async ({ page }) => {
		const event = page.locator('.fc-event').first();
		await event.click();

		const dialog = page.locator('[role="dialog"]').first();
		await page.click('[role="tab"]:has-text("History")');

		await page.waitForTimeout(500);

		const historyItems = dialog.locator('.history-item');

		if ((await historyItems.count()) > 0) {
			const timestamp = historyItems.first().locator('time');

			// Hover over timestamp
			await timestamp.hover();

			// Verify tooltip with absolute time appears
			const tooltip = page.locator('[role="tooltip"], .tooltip');

			if ((await tooltip.count()) > 0) {
				await expect(tooltip).toBeVisible();

				const tooltipText = await tooltip.textContent();
				// Should contain full date format
				expect(tooltipText).toMatch(/\d{4}|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/);
			}
		}
	});

	test('should handle empty history gracefully', async ({ page }) => {
		// This would be for a newly created event with minimal history
		const event = page.locator('.fc-event').first();
		await event.click();

		const dialog = page.locator('[role="dialog"]').first();
		await page.click('[role="tab"]:has-text("History")');

		await page.waitForTimeout(500);

		const historyTimeline = dialog.locator('.history-timeline');

		// At minimum, "Event created" entry should exist
		const entries = historyTimeline.locator('.history-item');
		expect(await entries.count()).toBeGreaterThanOrEqual(1);
	});

	test('should load more history with pagination', async ({ page }) => {
		const event = page.locator('.fc-event').first();
		await event.click();

		const dialog = page.locator('[role="dialog"]').first();
		await page.click('[role="tab"]:has-text("History")');

		await page.waitForTimeout(500);

		// If there's a "Load More" button
		const loadMoreButton = dialog.locator(
			'button:has-text("Load More"), button:has-text("Show More")'
		);

		if ((await loadMoreButton.count()) > 0) {
			// Count initial history items
			const initialCount = await dialog.locator('.history-item').count();

			// Click load more
			await loadMoreButton.click();

			await page.waitForTimeout(500);

			// Verify more items loaded
			const newCount = await dialog.locator('.history-item').count();
			expect(newCount).toBeGreaterThan(initialCount);
		}
	});
});
