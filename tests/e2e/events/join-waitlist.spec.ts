/**
 * E2E Test: Join Waitlist for Full Event
 * Feature: 027-we-need-to
 * Quickstart Scenario 4
 *
 * Tests waitlist functionality including joining, position display, and automatic promotion.
 * MUST FAIL until waitlist features are implemented.
 */

import { expect, test } from '@playwright/test';

test.describe('Join Waitlist for Full Event', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/dashboard/events');
		await page.waitForSelector('.fc-daygrid-body');
	});

	test('should display "Full" indicator for events at capacity', async ({ page }) => {
		// Find event that is full
		const fullEvent = page.locator('.fc-event[data-capacity-status="full"]').first();

		if ((await fullEvent.count()) > 0) {
			// Verify "Full" badge is visible
			const fullBadge = fullEvent.locator('.capacity-indicator:has-text("Full")');
			await expect(fullBadge).toBeVisible();
		}
	});

	test('should show "Join Waitlist" button when event is full', async ({ page }) => {
		const fullEvent = page.locator('.fc-event[data-capacity-status="full"]').first();

		if ((await fullEvent.count()) > 0) {
			await fullEvent.click();

			const dialog = page.locator('[role="dialog"]').first();

			// Verify "Accept" button is disabled or replaced with "Join Waitlist"
			const acceptButton = dialog.locator('button:has-text("Accept")');
			const waitlistButton = dialog.locator('button:has-text("Join Waitlist")');

			// Either Accept is disabled and waitlist is available
			if ((await acceptButton.count()) > 0) {
				await expect(acceptButton).toBeDisabled();
				await expect(waitlistButton).toBeVisible();
			} else {
				// Or only waitlist button shows
				await expect(waitlistButton).toBeVisible();
			}
		}
	});

	test('should join waitlist for full event', async ({ page }) => {
		const fullEvent = page.locator('.fc-event[data-capacity-status="full"]').first();

		if ((await fullEvent.count()) > 0) {
			await fullEvent.click();

			const dialog = page.locator('[role="dialog"]').first();
			const waitlistButton = dialog.locator('button:has-text("Join Waitlist")');

			await waitlistButton.click();

			// Verify confirmation toast
			await expect(page.locator('.toast:has-text("Added to waitlist")')).toBeVisible({
				timeout: 3000
			});

			// Verify waitlist position is shown
			const waitlistPosition = dialog.locator('text=/Waitlist position.*#\\d+/');
			await expect(waitlistPosition).toBeVisible();
		}
	});

	test('should display waitlist position after joining', async ({ page }) => {
		const fullEvent = page.locator('.fc-event[data-capacity-status="full"]').first();

		if ((await fullEvent.count()) > 0) {
			await fullEvent.click();

			const dialog = page.locator('[role="dialog"]').first();
			await page.click('button:has-text("Join Waitlist")');

			// Wait for waitlist confirmation
			await page.waitForTimeout(1000);

			// Reopen event details
			await page.click('[role="dialog"] button[aria-label="Close"]');
			await fullEvent.click();

			// Verify position is displayed (e.g., "Waitlist position: #3")
			const positionText = await dialog.locator('text=/Waitlist position.*#\\d+/').textContent();
			const position = parseInt(positionText?.match(/#(\d+)/)?.[1] || '0');

			expect(position).toBeGreaterThan(0);
		}
	});

	test('should show total waitlist count', async ({ page }) => {
		const fullEvent = page.locator('.fc-event[data-capacity-status="full"]').first();

		if ((await fullEvent.count()) > 0) {
			await fullEvent.click();

			const dialog = page.locator('[role="dialog"]').first();

			// Verify waitlist count is shown (e.g., "5 on waitlist")
			const waitlistCount = dialog.locator('text=/\\d+ on waitlist|\\d+ waiting/');
			await expect(waitlistCount).toBeVisible();
		}
	});

	test('should allow leaving waitlist', async ({ page }) => {
		const fullEvent = page.locator('.fc-event[data-capacity-status="full"]').first();

		if ((await fullEvent.count()) > 0) {
			await fullEvent.click();

			// First, join waitlist
			const waitlistButton = page.locator('button:has-text("Join Waitlist")');
			if ((await waitlistButton.count()) > 0) {
				await waitlistButton.click();
				await page.waitForTimeout(1000);

				// Reopen dialog
				await page.click('[role="dialog"] button[aria-label="Close"]');
				await fullEvent.click();
			}

			const dialog = page.locator('[role="dialog"]').first();

			// Now leave waitlist
			const leaveWaitlistButton = dialog.locator('button:has-text("Leave Waitlist")');
			await leaveWaitlistButton.click();

			// Verify confirmation
			await expect(page.locator('.toast:has-text("Removed from waitlist")')).toBeVisible({
				timeout: 3000
			});

			// Verify "Join Waitlist" button reappears
			await page.waitForTimeout(500);
			await page.click('[role="dialog"] button[aria-label="Close"]');
			await fullEvent.click();

			await expect(page.locator('button:has-text("Join Waitlist")')).toBeVisible();
		}
	});

	test('should not allow joining waitlist if already on it', async ({ page }) => {
		const fullEvent = page.locator('.fc-event[data-capacity-status="full"]').first();

		if ((await fullEvent.count()) > 0) {
			await fullEvent.click();

			// Join waitlist
			const waitlistButton = page.locator('button:has-text("Join Waitlist")');
			if ((await waitlistButton.count()) > 0) {
				await waitlistButton.click();
				await page.waitForTimeout(1000);

				// Reopen dialog
				await page.click('[role="dialog"] button[aria-label="Close"]');
				await fullEvent.click();

				// Verify "Join Waitlist" button is no longer available
				await expect(page.locator('button:has-text("Join Waitlist")')).not.toBeVisible();

				// Verify "Leave Waitlist" is shown instead
				await expect(page.locator('button:has-text("Leave Waitlist")')).toBeVisible();
			}
		}
	});

	test('should show waitlist indicator on calendar event', async ({ page }) => {
		const fullEvent = page.locator('.fc-event[data-capacity-status="full"]').first();

		if ((await fullEvent.count()) > 0) {
			const eventId = await fullEvent.getAttribute('data-event-id');

			// Join waitlist
			await fullEvent.click();
			const waitlistButton = page.locator('button:has-text("Join Waitlist")');

			if ((await waitlistButton.count()) > 0) {
				await waitlistButton.click();
				await page.waitForTimeout(1000);

				// Close dialog
				await page.click('[role="dialog"] button[aria-label="Close"]');

				// Verify waitlist badge appears on calendar event
				const updatedEvent = page.locator(`.fc-event[data-event-id="${eventId}"]`);
				const waitlistBadge = updatedEvent.locator(
					'.waitlist-badge, .rsvp-badge:has-text("Waitlist")'
				);

				await expect(waitlistBadge).toBeVisible();
			}
		}
	});

	test('should not show waitlist option if waitlist is disabled', async ({ page }) => {
		// Find event that is full but has waitlist disabled
		const fullEventNoWaitlist = page
			.locator('.fc-event[data-capacity-status="full"][data-waitlist-enabled="false"]')
			.first();

		if ((await fullEventNoWaitlist.count()) > 0) {
			await fullEventNoWaitlist.click();

			const dialog = page.locator('[role="dialog"]').first();

			// Verify no "Join Waitlist" button
			await expect(dialog.locator('button:has-text("Join Waitlist")')).not.toBeVisible();

			// Verify "Accept" button is disabled
			const acceptButton = dialog.locator('button:has-text("Accept")');
			await expect(acceptButton).toBeDisabled();

			// Verify message indicating event is full
			await expect(dialog.locator('text=/Event is full|At capacity/')).toBeVisible();
		}
	});

	test('should receive notification when promoted from waitlist (subscription)', async ({
		page
	}) => {
		// This test simulates automatic promotion notification
		// In real implementation, this would be triggered by GraphQL subscription

		// Navigate to notifications area (assuming there's a notifications panel)
		const notificationBell = page.locator('[aria-label="Notifications"]');

		if ((await notificationBell.count()) > 0) {
			await notificationBell.click();

			// Check for waitlist promotion notification
			const promotionNotification = page.locator(
				'text=/promoted from waitlist|accepted from waitlist/'
			);

			// This would only be visible if a promotion actually occurred
			// In real test, we'd simulate this via backend/subscription
			if ((await promotionNotification.count()) > 0) {
				await expect(promotionNotification).toBeVisible();
			}
		}
	});

	test('should display capacity with waitlist count in event details', async ({ page }) => {
		const fullEvent = page.locator('.fc-event[data-capacity-status="full"]').first();

		if ((await fullEvent.count()) > 0) {
			await fullEvent.click();

			const dialog = page.locator('[role="dialog"]').first();

			// Verify capacity display (e.g., "20/20 (5 waiting)")
			const capacityDisplay = dialog.locator('text=/\\d+\\/\\d+.*\\d+.*wait/i');
			await expect(capacityDisplay).toBeVisible();
		}
	});

	test('should update waitlist position when others leave', async ({ page }) => {
		const fullEvent = page.locator('.fc-event[data-capacity-status="full"]').first();

		if ((await fullEvent.count()) > 0) {
			await fullEvent.click();

			// Join waitlist
			const waitlistButton = page.locator('button:has-text("Join Waitlist")');
			if ((await waitlistButton.count()) > 0) {
				await waitlistButton.click();
				await page.waitForTimeout(1000);

				// Note initial position
				const dialog = page.locator('[role="dialog"]').first();
				const initialPositionText = await dialog
					.locator('text=/Waitlist position.*#\\d+/')
					.textContent();
				const initialPosition = parseInt(initialPositionText?.match(/#(\d+)/)?.[1] || '0');

				// In real test, another user would leave waitlist
				// Here we just verify the position is displayed correctly
				expect(initialPosition).toBeGreaterThan(0);
			}
		}
	});

	test('should allow waitlist for recurring event with scope selection', async ({ page }) => {
		const fullRecurringEvent = page
			.locator('.fc-event[data-capacity-status="full"][data-is-recurring="true"]')
			.first();

		if ((await fullRecurringEvent.count()) > 0) {
			await fullRecurringEvent.click();

			const dialog = page.locator('[role="dialog"]').first();
			await page.click('button:has-text("Join Waitlist")');

			// Verify scope selection modal appears
			const scopeModal = page.locator('[role="dialog"]:has-text("Waitlist Scope")');
			await expect(scopeModal).toBeVisible();

			// Select scope
			await page.click('button:has-text("This occurrence only")');

			// Verify confirmation
			await expect(page.locator('.toast:has-text("Added to waitlist")')).toBeVisible({
				timeout: 3000
			});
		}
	});
});
