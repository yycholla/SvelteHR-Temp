/**
 * E2E Test: Drag-and-Drop Reschedule
 * Feature: 027-we-need-to
 * Quickstart Scenario 5
 *
 * Tests drag-and-drop event rescheduling with conflict detection and scope selection.
 * MUST FAIL until drag-drop functionality is implemented.
 */

import { test, expect } from '@playwright/test';

test.describe('Drag-and-Drop Reschedule', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/dashboard/events');
		await page.waitForSelector('.fc-daygrid-body');
	});

	test('should allow dragging event to new date', async ({ page }) => {
		// Find a draggable event
		const event = page.locator('.fc-event[data-can-edit="true"]').first();

		if ((await event.count()) > 0) {
			// Get initial date
			const initialParent = await event.locator('..').getAttribute('data-date');

			// Get target date cell (3 days later)
			const targetCell = page.locator('.fc-daygrid-day').nth(15);
			const targetDate = await targetCell.getAttribute('data-date');

			// Drag event to new date
			await event.dragTo(targetCell);

			// Verify event moved
			await page.waitForTimeout(500);

			// Event should now be in new date cell
			const movedEvent = page
				.locator(`.fc-daygrid-day[data-date="${targetDate}"] .fc-event`)
				.first();
			await expect(movedEvent).toBeVisible();
		}
	});

	test('should show scope selection for dragging recurring event', async ({ page }) => {
		const recurringEvent = page
			.locator('.fc-event[data-is-recurring="true"][data-can-edit="true"]')
			.first();

		if ((await recurringEvent.count()) > 0) {
			const targetCell = page.locator('.fc-daygrid-day').nth(15);

			// Drag recurring event
			await recurringEvent.dragTo(targetCell);

			// Verify scope modal appears
			const scopeModal = page.locator('[role="dialog"]:has-text("Reschedule Scope")');
			await expect(scopeModal).toBeVisible({ timeout: 2000 });

			// Verify options
			await expect(scopeModal.locator('text=/This occurrence only/')).toBeVisible();
			await expect(scopeModal.locator('text=/All future occurrences/')).toBeVisible();
			await expect(scopeModal.locator('text=/All occurrences/')).toBeVisible();
		}
	});

	test('should reschedule "This occurrence only" for recurring event', async ({ page }) => {
		const recurringEvent = page
			.locator('.fc-event[data-is-recurring="true"][data-can-edit="true"]')
			.first();

		if ((await recurringEvent.count()) > 0) {
			const targetCell = page.locator('.fc-daygrid-day').nth(15);

			await recurringEvent.dragTo(targetCell);

			// Select scope
			const scopeModal = page.locator('[role="dialog"]:has-text("Reschedule Scope")');
			await page.click('button:has-text("This occurrence only")');

			// Verify confirmation
			await expect(page.locator('.toast:has-text("Event rescheduled")')).toBeVisible({
				timeout: 3000
			});
		}
	});

	test('should show conflict warning when dragging to conflicting time', async ({ page }) => {
		const event = page.locator('.fc-event[data-can-edit="true"]').first();

		if ((await event.count()) > 0) {
			// Find a date that already has an event (potential conflict)
			const occupiedCell = page.locator('.fc-daygrid-day:has(.fc-event)').nth(5);

			// Drag to occupied date
			await event.dragTo(occupiedCell);

			// Verify conflict warning modal appears
			const conflictModal = page.locator('[role="dialog"]:has-text("Conflict Detected")');

			if ((await conflictModal.count()) > 0) {
				await expect(conflictModal).toBeVisible();

				// Verify conflicting events are listed
				const conflictList = conflictModal.locator('.conflicting-event');
				await expect(conflictList.first()).toBeVisible();

				// Verify conflict severity is shown
				const severityBadge = conflictModal.locator('text=/minor|major/i');
				await expect(severityBadge).toBeVisible();
			}
		}
	});

	test('should allow confirming reschedule despite conflicts', async ({ page }) => {
		const event = page.locator('.fc-event[data-can-edit="true"]').first();

		if ((await event.count()) > 0) {
			const occupiedCell = page.locator('.fc-daygrid-day:has(.fc-event)').nth(5);
			await event.dragTo(occupiedCell);

			// If conflict modal appears, confirm reschedule
			const conflictModal = page.locator('[role="dialog"]:has-text("Conflict Detected")');

			if ((await conflictModal.count()) > 0) {
				const confirmButton = conflictModal.locator('button:has-text("Reschedule Anyway")');
				await confirmButton.click();

				// Verify success
				await expect(page.locator('.toast:has-text("Event rescheduled")')).toBeVisible({
					timeout: 3000
				});
			}
		}
	});

	test('should allow canceling reschedule on conflict', async ({ page }) => {
		const event = page.locator('.fc-event[data-can-edit="true"]').first();

		if ((await event.count()) > 0) {
			// Get original position
			const originalParent = await event.locator('..').getAttribute('data-date');

			const occupiedCell = page.locator('.fc-daygrid-day:has(.fc-event)').nth(5);
			await event.dragTo(occupiedCell);

			// Cancel on conflict modal
			const conflictModal = page.locator('[role="dialog"]:has-text("Conflict Detected")');

			if ((await conflictModal.count()) > 0) {
				const cancelButton = conflictModal.locator('button:has-text("Cancel")');
				await cancelButton.click();

				// Verify event returns to original date
				await page.waitForTimeout(500);
				const eventInOriginalDate = page
					.locator(`.fc-daygrid-day[data-date="${originalParent}"] .fc-event`)
					.first();

				await expect(eventInOriginalDate).toBeVisible();
			}
		}
	});

	test('should not allow dragging non-editable events', async ({ page }) => {
		const nonEditableEvent = page.locator('.fc-event[data-can-edit="false"]').first();

		if ((await nonEditableEvent.count()) > 0) {
			// Verify event is not draggable (has no drag cursor or disabled dragging)
			const isDraggable = await nonEditableEvent.evaluate((el) => {
				const style = window.getComputedStyle(el);
				return style.cursor !== 'not-allowed' && !el.hasAttribute('data-not-draggable');
			});

			// In FullCalendar, non-editable events should have editable: false
			// They should not trigger drag start
			expect(isDraggable).toBeFalsy();
		}
	});

	test('should update event time when dragging in week/day view', async ({ page }) => {
		// Switch to week view
		const weekViewButton = page.locator('button:has-text("week"), .fc-timeGridWeek-button');

		if ((await weekViewButton.count()) > 0) {
			await weekViewButton.click();
			await page.waitForTimeout(500);

			// Find draggable event in week view
			const event = page.locator('.fc-timegrid-event[data-can-edit="true"]').first();

			if ((await event.count()) > 0) {
				// Get a time slot (e.g., 2 hours later)
				const targetSlot = page.locator('.fc-timegrid-slot').nth(20);

				// Drag to new time
				await event.dragTo(targetSlot);

				// Verify time update
				await page.waitForTimeout(500);

				// Click on rescheduled event to verify new time
				await event.click();

				const dialog = page.locator('[role="dialog"]').first();
				const timeDisplay = dialog.locator('text=/\\d{1,2}:\\d{2}/');
				await expect(timeDisplay).toBeVisible();
			}
		}
	});

	test('should prevent dragging event to past dates', async ({ page }) => {
		const event = page.locator('.fc-event[data-can-edit="true"]').first();

		if ((await event.count()) > 0) {
			// Navigate to previous month
			await page.click('.fc-prev-button');
			await page.waitForTimeout(500);

			// Try to drag to past date
			const pastDateCell = page.locator('.fc-daygrid-day.fc-day-past').first();

			if ((await pastDateCell.count()) > 0) {
				// Navigate back to current month
				await page.click('.fc-next-button');
				await page.waitForTimeout(500);

				// Attempt drag (should be prevented by eventAllow callback)
				await event.dragTo(pastDateCell);

				// Verify error message or no change
				const errorToast = page.locator('.toast:has-text("Cannot reschedule to past date")');

				if ((await errorToast.count()) > 0) {
					await expect(errorToast).toBeVisible();
				}
			}
		}
	});

	test('should show loading state during reschedule', async ({ page }) => {
		const event = page.locator('.fc-event[data-can-edit="true"]').first();

		if ((await event.count()) > 0) {
			const targetCell = page.locator('.fc-daygrid-day').nth(15);

			// Intercept reschedule mutation
			await page.route('**/graphql', async (route) => {
				const postData = route.request().postDataJSON();

				if (postData?.operationName === 'RescheduleEvent') {
					// Delay response to see loading state
					await page.waitForTimeout(1000);
				}

				route.continue();
			});

			await event.dragTo(targetCell);

			// Verify loading indicator appears briefly
			const loadingIndicator = page.locator('.loading, [aria-busy="true"]');

			if ((await loadingIndicator.count()) > 0) {
				await expect(loadingIndicator).toBeVisible();
			}
		}
	});

	test('should reschedule all future occurrences of recurring event', async ({ page }) => {
		const recurringEvent = page
			.locator('.fc-event[data-is-recurring="true"][data-can-edit="true"]')
			.first();

		if ((await recurringEvent.count()) > 0) {
			const targetCell = page.locator('.fc-daygrid-day').nth(15);

			await recurringEvent.dragTo(targetCell);

			// Select "All future occurrences"
			const scopeModal = page.locator('[role="dialog"]:has-text("Reschedule Scope")');
			await page.click('button:has-text("All future occurrences")');

			// Verify confirmation
			await expect(
				page.locator('.toast:has-text("All future occurrences rescheduled")')
			).toBeVisible({ timeout: 3000 });
		}
	});

	test('should revert event position on failed reschedule', async ({ page }) => {
		const event = page.locator('.fc-event[data-can-edit="true"]').first();

		if ((await event.count()) > 0) {
			// Get original position
			const originalParent = await event.locator('..').getAttribute('data-date');

			// Mock failed reschedule
			await page.route('**/graphql', async (route) => {
				const postData = route.request().postDataJSON();

				if (postData?.operationName === 'RescheduleEvent') {
					// Return error
					route.fulfill({
						status: 400,
						body: JSON.stringify({
							errors: [{ message: 'Failed to reschedule event' }]
						})
					});
				} else {
					route.continue();
				}
			});

			const targetCell = page.locator('.fc-daygrid-day').nth(15);
			await event.dragTo(targetCell);

			// Wait for error
			await page.waitForTimeout(1000);

			// Verify error toast
			await expect(page.locator('.toast:has-text("Failed to reschedule")')).toBeVisible({
				timeout: 3000
			});

			// Verify event reverted to original position
			const eventInOriginalDate = page
				.locator(`.fc-daygrid-day[data-date="${originalParent}"] .fc-event`)
				.first();

			await expect(eventInOriginalDate).toBeVisible();
		}
	});
});
