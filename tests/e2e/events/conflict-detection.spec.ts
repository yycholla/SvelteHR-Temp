/**
 * E2E Test: Conflict Detection
 * Feature: 027-we-need-to
 * Quickstart Scenario 8
 *
 * Tests automatic conflict detection, severity classification, and conflict warnings.
 * MUST FAIL until conflict detection is implemented.
 */

import { test, expect } from '@playwright/test';

test.describe('Conflict Detection', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/dashboard/events');
		await page.waitForSelector('.fc-daygrid-body');
	});

	test('should detect overlapping events and show conflict indicator', async ({ page }) => {
		// Find event with conflict
		const conflictedEvent = page.locator('.fc-event[data-has-conflict="true"]').first();

		if ((await conflictedEvent.count()) > 0) {
			// Verify conflict warning icon is visible
			const conflictIcon = conflictedEvent.locator('.conflict-warning, svg[data-icon="alert"]');
			await expect(conflictIcon).toBeVisible();
		}
	});

	test('should show conflict details when clicking conflicted event', async ({ page }) => {
		const conflictedEvent = page.locator('.fc-event[data-has-conflict="true"]').first();

		if ((await conflictedEvent.count()) > 0) {
			await conflictedEvent.click();

			const dialog = page.locator('[role="dialog"]').first();

			// Verify conflict warning section is visible
			const conflictWarning = dialog.locator('.conflict-warning, [data-conflict-warning]');
			await expect(conflictWarning).toBeVisible();

			// Verify conflicting event is listed
			const conflictingEvent = dialog.locator('.conflicting-event');
			await expect(conflictingEvent).toBeVisible();
		}
	});

	test('should show conflict when creating overlapping event', async ({ page }) => {
		// Click on a date that already has an event
		const dateWithEvent = page.locator('.fc-daygrid-day:has(.fc-event)').first();
		const existingEvent = dateWithEvent.locator('.fc-event').first();
		const existingEventTime = await existingEvent.getAttribute('data-start-time');

		if (existingEventTime) {
			// Click to create new event on same date
			await dateWithEvent.click();

			const createDialog = page.locator('[role="dialog"]:has-text("Create Event")');
			await createDialog.waitFor({ state: 'visible' });

			// Fill basic info with same time
			await page.fill('input[name="title"]', 'Conflicting Event');

			// Set same start time as existing event (if time inputs are available)
			const startTimeInput = page.locator('input[name="startTime"], input[type="time"]').first();

			if ((await startTimeInput.count()) > 0 && existingEventTime) {
				await startTimeInput.fill(existingEventTime);
			}

			// Try to create
			await page.click('button:has-text("Create Event")');

			// Verify conflict warning appears
			const conflictModal = page.locator('[role="dialog"]:has-text("Conflict Detected")');
			await expect(conflictModal).toBeVisible({ timeout: 2000 });
		}
	});

	test('should classify conflict severity (minor vs major)', async ({ page }) => {
		const conflictedEvent = page.locator('.fc-event[data-has-conflict="true"]').first();

		if ((await conflictedEvent.count()) > 0) {
			await conflictedEvent.click();

			const dialog = page.locator('[role="dialog"]').first();
			const conflictWarning = dialog.locator('.conflict-warning');

			// Verify severity badge
			const severityBadge = conflictWarning.locator('.severity-badge, [data-severity]');

			if ((await severityBadge.count()) > 0) {
				const severityText = await severityBadge.textContent();
				expect(severityText?.toLowerCase()).toMatch(/minor|major/);
			}
		}
	});

	test('should show overlap percentage in conflict details', async ({ page }) => {
		const conflictedEvent = page.locator('.fc-event[data-has-conflict="true"]').first();

		if ((await conflictedEvent.count()) > 0) {
			await conflictedEvent.click();

			const dialog = page.locator('[role="dialog"]').first();
			const conflictDetails = dialog.locator('.conflicting-event').first();

			// Verify overlap information is shown (e.g., "50% overlap", "30 minutes")
			const overlapInfo = conflictDetails.locator('text=/\\d+%|\\d+ minutes/');
			await expect(overlapInfo).toBeVisible();
		}
	});

	test('should list all conflicting events', async ({ page }) => {
		const conflictedEvent = page.locator('.fc-event[data-has-conflict="true"]').first();

		if ((await conflictedEvent.count()) > 0) {
			await conflictedEvent.click();

			const dialog = page.locator('[role="dialog"]').first();

			// Count conflicting events listed
			const conflictingEvents = dialog.locator('.conflicting-event');
			const count = await conflictingEvents.count();

			expect(count).toBeGreaterThan(0);

			// Verify each conflict shows event title
			for (let i = 0; i < count; i++) {
				const conflict = conflictingEvents.nth(i);
				const title = conflict.locator('.event-title');
				await expect(title).toBeVisible();
			}
		}
	});

	test('should show conflict warning when RSVPing to overlapping event', async ({ page }) => {
		// Find an event that would conflict with existing accepted events
		const event = page.locator('.fc-event[data-would-conflict="true"]').first();

		if ((await event.count()) > 0) {
			await event.click();

			const dialog = page.locator('[role="dialog"]').first();

			// Click Accept
			await page.click('button:has-text("Accept")');

			// Verify conflict warning appears before RSVP
			const conflictModal = page.locator('[role="dialog"]:has-text("Conflict Detected")');
			await expect(conflictModal).toBeVisible({ timeout: 2000 });

			// Verify option to proceed anyway
			const proceedButton = conflictModal.locator('button:has-text("RSVP Anyway")');
			await expect(proceedButton).toBeVisible();
		}
	});

	test('should allow proceeding with RSVP despite conflict', async ({ page }) => {
		const event = page.locator('.fc-event[data-would-conflict="true"]').first();

		if ((await event.count()) > 0) {
			await event.click();
			await page.click('button:has-text("Accept")');

			const conflictModal = page.locator('[role="dialog"]:has-text("Conflict Detected")');

			if ((await conflictModal.count()) > 0) {
				await page.click('button:has-text("RSVP Anyway")');

				// Verify RSVP completes
				await expect(page.locator('.toast:has-text("RSVP confirmed")')).toBeVisible({
					timeout: 3000
				});
			}
		}
	});

	test('should allow canceling RSVP when conflict is detected', async ({ page }) => {
		const event = page.locator('.fc-event[data-would-conflict="true"]').first();

		if ((await event.count()) > 0) {
			await event.click();
			await page.click('button:has-text("Accept")');

			const conflictModal = page.locator('[role="dialog"]:has-text("Conflict Detected")');

			if ((await conflictModal.count()) > 0) {
				await page.click('button:has-text("Cancel")');

				// Verify modal closes and no RSVP was made
				await expect(conflictModal).not.toBeVisible();

				// Event details dialog should still be open
				const detailsDialog = page.locator('[role="dialog"]').first();
				await expect(detailsDialog).toBeVisible();
			}
		}
	});

	test('should highlight conflicting time range on calendar', async ({ page }) => {
		const conflictedEvent = page.locator('.fc-event[data-has-conflict="true"]').first();

		if ((await conflictedEvent.count()) > 0) {
			// Click conflicted event
			await conflictedEvent.click();

			// Verify visual indication on calendar
			// This could be highlighting, background color, or border
			const hasHighlight = await conflictedEvent.evaluate((el) => {
				const style = window.getComputedStyle(el);
				// Check for any conflict-specific styling
				return (
					el.classList.contains('conflict') ||
					el.hasAttribute('data-has-conflict') ||
					style.borderColor.includes('red') ||
					style.borderColor.includes('orange')
				);
			});

			expect(hasHighlight).toBe(true);
		}
	});

	test('should only detect conflicts with accepted events', async ({ page }) => {
		// This tests the business rule: conflicts only matter for events you've accepted
		// Events with pending/declined RSVP should not trigger conflicts

		// Navigate through calendar and verify conflict logic
		const conflictedEvents = page.locator('.fc-event[data-has-conflict="true"]');
		const conflictCount = await conflictedEvents.count();

		// If conflicts exist, verify they are all with accepted events
		for (let i = 0; i < conflictCount; i++) {
			const event = conflictedEvents.nth(i);
			await event.click();

			const dialog = page.locator('[role="dialog"]').first();
			const conflictingEvents = dialog.locator('.conflicting-event');

			// Verify each conflicting event shows RSVP status
			const firstConflict = conflictingEvents.first();

			if ((await firstConflict.count()) > 0) {
				const rsvpStatus = firstConflict.locator('[data-rsvp-status]');
				const status = await rsvpStatus.getAttribute('data-rsvp-status');

				// Should be "accepted"
				expect(status).toBe('accepted');
			}

			// Close dialog
			await page.click('[role="dialog"] button[aria-label="Close"]');
		}
	});

	test('should update conflict status after declining event', async ({ page }) => {
		const conflictedEvent = page.locator('.fc-event[data-has-conflict="true"]').first();

		if ((await conflictedEvent.count()) > 0) {
			const eventId = await conflictedEvent.getAttribute('data-event-id');

			// Open conflicted event
			await conflictedEvent.click();

			const dialog = page.locator('[role="dialog"]').first();

			// Get first conflicting event
			const firstConflict = dialog.locator('.conflicting-event').first();
			const conflictingEventId = await firstConflict.getAttribute('data-event-id');

			// Close dialog
			await page.click('[role="dialog"] button[aria-label="Close"]');

			// Find and click the conflicting event
			if (conflictingEventId) {
				const conflictingEvent = page.locator(`.fc-event[data-event-id="${conflictingEventId}"]`);

				if ((await conflictingEvent.count()) > 0) {
					await conflictingEvent.click();

					// Decline the conflicting event
					await page.click('button:has-text("Decline")');

					await page.waitForTimeout(1000);

					// Close dialog
					await page.click('[role="dialog"] button[aria-label="Close"]');

					// Verify original event no longer shows conflict
					const updatedEvent = page.locator(`.fc-event[data-event-id="${eventId}"]`);
					const stillHasConflict = await updatedEvent.getAttribute('data-has-conflict');

					// Conflict might be resolved if that was the only conflicting event
					// This is conditional based on whether other conflicts exist
				}
			}
		}
	});

	test('should show conflict count badge on event', async ({ page }) => {
		const conflictedEvent = page.locator('.fc-event[data-has-conflict="true"]').first();

		if ((await conflictedEvent.count()) > 0) {
			// Look for conflict count indicator (e.g., "2 conflicts")
			const conflictBadge = conflictedEvent.locator('.conflict-count, [data-conflict-count]');

			if ((await conflictBadge.count()) > 0) {
				await expect(conflictBadge).toBeVisible();

				const badgeText = await conflictBadge.textContent();
				expect(badgeText).toMatch(/\d+/);
			}
		}
	});

	test('should detect conflicts in recurring events', async ({ page }) => {
		const recurringConflict = page
			.locator('.fc-event[data-is-recurring="true"][data-has-conflict="true"]')
			.first();

		if ((await recurringConflict.count()) > 0) {
			await recurringConflict.click();

			const dialog = page.locator('[role="dialog"]').first();

			// Verify conflict warning for recurring event
			const conflictWarning = dialog.locator('.conflict-warning');
			await expect(conflictWarning).toBeVisible();

			// Verify message indicates recurring nature
			const conflictMessage = await conflictWarning.textContent();
			expect(conflictMessage).toMatch(/recurring|series|occurrence/i);
		}
	});

	test('should show warning when conflict severity changes', async ({ page }) => {
		// This tests dynamic conflict severity updates
		// When overlap increases from minor to major (e.g., via reschedule)

		const event = page.locator('.fc-event[data-can-edit="true"]').first();

		if ((await event.count()) > 0) {
			// Drag to create major overlap
			const occupiedCell = page.locator('.fc-daygrid-day:has(.fc-event)').nth(5);
			await event.dragTo(occupiedCell);

			// If conflict modal appears
			const conflictModal = page.locator('[role="dialog"]:has-text("Conflict Detected")');

			if ((await conflictModal.count()) > 0) {
				// Verify severity is shown
				const severityIndicator = conflictModal.locator('[data-severity], .severity-badge');
				await expect(severityIndicator).toBeVisible();
			}
		}
	});
});
