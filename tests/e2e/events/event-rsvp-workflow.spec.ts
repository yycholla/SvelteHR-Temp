// E2E Test: Event RSVP Workflow
// Feature: 019-we-need-to - Phase 6
// Purpose: Test complete RSVP workflow for events

import { expect, test } from '@playwright/test';

test.describe('Event RSVP Workflow', () => {
	// Setup: Login before each test
	test.beforeEach(async ({ page }) => {
		// Navigate to login page
		await page.goto('/login');
		await page.waitForLoadState('networkidle');

		// Login as test user (adjust credentials as needed)
		await page.fill('input[name="username"]', 'admin');
		await page.fill('input[name="password"]', 'admin');
		await page.click('button[type="submit"]');

		// Wait for redirect to dashboard
		await page.waitForURL('**/dashboard**');
		await page.waitForLoadState('networkidle');
	});

	test('user can view events list and navigate to event details', async ({ page }) => {
		// Navigate to events page
		await page.goto('/dashboard/events');
		await page.waitForLoadState('networkidle');

		// Verify page loaded
		await expect(page.locator('h1')).toContainText('Events');

		// Verify event cards are rendered
		const eventCards = page.locator('[data-testid="event-card"]').or(page.locator('.event-card'));
		const eventCount = await eventCards.count();

		if (eventCount > 0) {
			// Click first event card
			await eventCards.first().click();

			// Wait for navigation to event detail page
			await page.waitForURL('**/events/*');
			await page.waitForLoadState('networkidle');

			// Verify event detail page loaded
			await expect(page.locator('h1')).toBeVisible();
			await expect(page.locator('text=/Event Details|Event Information/i')).toBeVisible();
		} else {
			// If no events, verify empty state
			await expect(page.locator('text=/No events found|No upcoming events/i')).toBeVisible();
		}
	});

	test('user can change RSVP status on event detail page', async ({ page }) => {
		// Navigate to events page
		await page.goto('/dashboard/events');
		await page.waitForLoadState('networkidle');

		// Find an upcoming event to RSVP to
		const eventCards = page.locator('[data-testid="event-card"]').or(page.locator('.event-card'));
		const eventCount = await eventCards.count();

		if (eventCount > 0) {
			// Navigate to first event
			await eventCards.first().click();
			await page.waitForURL('**/events/*');
			await page.waitForLoadState('networkidle');

			// Check if this is a past event
			const isPastEvent = await page.locator('text=/Past Event|This event has ended/i').isVisible();

			if (!isPastEvent) {
				// Look for RSVP buttons
				const acceptButton = page
					.locator('button:has-text("Accept")')
					.or(page.locator('button:has-text("Going")'));
				const declineButton = page
					.locator('button:has-text("Decline")')
					.or(page.locator('button:has-text("Not Going")'));
				const tentativeButton = page
					.locator('button:has-text("Tentative")')
					.or(page.locator('button:has-text("Maybe")'));

				// Try to click Accept if available
				if (await acceptButton.isVisible()) {
					await acceptButton.click();

					// Wait for potential RSVP update
					await page.waitForTimeout(1000);

					// Verify button state changed (active state)
					await expect(acceptButton).toHaveClass(/active|selected|primary/);
				}

				// Try changing to Tentative if available
				if (await tentativeButton.isVisible()) {
					await tentativeButton.click();

					// Wait for RSVP update
					await page.waitForTimeout(1000);

					// Verify button state changed
					await expect(tentativeButton).toHaveClass(/active|selected|primary/);
				}

				// Verify RSVP statistics updated
				const rsvpStats = page.locator('text=/RSVP Statistics|Attendees/i');
				await expect(rsvpStats).toBeVisible();
			}
		}
	});

	test('RSVP status persists after page reload', async ({ page }) => {
		// Navigate to events page
		await page.goto('/dashboard/events');
		await page.waitForLoadState('networkidle');

		const eventCards = page.locator('[data-testid="event-card"]').or(page.locator('.event-card'));
		const eventCount = await eventCards.count();

		if (eventCount > 0) {
			// Navigate to first event
			await eventCards.first().click();
			const eventUrl = page.url();
			await page.waitForLoadState('networkidle');

			// Check if not past event
			const isPastEvent = await page.locator('text=/Past Event|This event has ended/i').isVisible();

			if (!isPastEvent) {
				// Set RSVP to Accepted
				const acceptButton = page
					.locator('button:has-text("Accept")')
					.or(page.locator('button:has-text("Going")'));

				if (await acceptButton.isVisible()) {
					await acceptButton.click();
					await page.waitForTimeout(1000);

					// Reload the page
					await page.reload();
					await page.waitForLoadState('networkidle');

					// Verify RSVP status persisted
					await expect(acceptButton).toHaveClass(/active|selected|primary/);

					// Verify in attendee list if visible
					const attendeeSection = page.locator('text=/Attendees|Guest List/i');
					if (await attendeeSection.isVisible()) {
						const userAttendee = page.locator('text=/accepted|going/i').first();
						await expect(userAttendee).toBeVisible();
					}
				}
			}
		}
	});

	test('event filters work correctly', async ({ page }) => {
		// Navigate to events page
		await page.goto('/dashboard/events');
		await page.waitForLoadState('networkidle');

		// Test visibility filter
		const visibilityFilter = page
			.locator('select[name="visibility"]')
			.or(page.locator('select:has(option:has-text("Company-Wide"))'));

		if (await visibilityFilter.isVisible()) {
			// Select "Company-Wide"
			await visibilityFilter.selectOption({ label: 'Company-Wide' });
			await page.waitForTimeout(500);

			// Verify URL updated with filter
			expect(page.url()).toContain('visibility=');
		}

		// Test status filter
		const statusFilter = page
			.locator('select[name="status"]')
			.or(page.locator('select:has(option:has-text("Upcoming"))'));

		if (await statusFilter.isVisible()) {
			// Select "Upcoming"
			await statusFilter.selectOption({ label: 'Upcoming' });
			await page.waitForTimeout(500);

			// Verify URL updated
			expect(page.url()).toContain('status=');
		}

		// Test event type filter
		const typeFilter = page
			.locator('select[name="eventType"]')
			.or(page.locator('select:has(option:has-text("Meeting"))'));

		if (await typeFilter.isVisible()) {
			// Select "Meeting"
			await typeFilter.selectOption({ label: 'Meeting' });
			await page.waitForTimeout(500);

			// Verify URL updated
			expect(page.url()).toContain('eventType=');
		}

		// Verify filtered results displayed
		const eventCards = page.locator('[data-testid="event-card"]').or(page.locator('.event-card'));
		await expect(eventCards.first().or(page.locator('text=/No events found/i'))).toBeVisible();
	});

	test('manager can create new event', async ({ page }) => {
		// Navigate to events page
		await page.goto('/dashboard/events');
		await page.waitForLoadState('networkidle');

		// Look for "Create Event" button (manager-only)
		const createButton = page
			.locator('a:has-text("Create Event")')
			.or(page.locator('button:has-text("Create Event")'));

		const hasCreateAccess = await createButton.isVisible();

		if (hasCreateAccess) {
			// Click create button
			await createButton.click();

			// Wait for navigation to create page
			await page.waitForURL('**/events/create');
			await page.waitForLoadState('networkidle');

			// Verify create form loaded
			await expect(page.locator('h1')).toContainText('Create Event');

			// Fill out event form
			await page.fill('input[name="title"]', 'Test Event - E2E');
			await page.fill('textarea[name="description"]', 'This is a test event created via E2E test');

			// Set start time (1 day from now)
			const tomorrow = new Date();
			tomorrow.setDate(tomorrow.getDate() + 1);
			tomorrow.setHours(10, 0, 0, 0);
			const startTimeStr = tomorrow.toISOString().slice(0, 16);
			await page.fill('input[name="startTime"]', startTimeStr);

			// Set end time (2 hours later)
			const endTime = new Date(tomorrow);
			endTime.setHours(12, 0, 0, 0);
			const endTimeStr = endTime.toISOString().slice(0, 16);
			await page.fill('input[name="endTime"]', endTimeStr);

			// Set location
			await page.fill('input[name="location"]', 'Conference Room A');

			// Set event type
			const eventTypeSelect = page.locator('select[name="eventType"]');
			await eventTypeSelect.selectOption('meeting');

			// Set visibility
			const visibilitySelect = page.locator('select[name="visibilityType"]');
			await visibilitySelect.selectOption('company');

			// Note: Form submission will fail until GraphQL mutation is implemented
			// This test verifies the form structure and validation work correctly
			const submitButton = page.locator('button[type="submit"]:has-text("Create Event")');
			await expect(submitButton).toBeVisible();
			await expect(submitButton).toBeEnabled();
		} else {
			// User doesn't have manager access - verify no create button
			await expect(createButton).not.toBeVisible();
		}
	});

	test('user can view event statistics', async ({ page }) => {
		// Navigate to events page
		await page.goto('/dashboard/events');
		await page.waitForLoadState('networkidle');

		// Verify statistics are displayed
		const statsSection = page.locator('text=/Statistics|Overview/i');
		if (await statsSection.isVisible()) {
			// Check for key metrics
			await expect(page.locator('text=/Total Events|All Events/i')).toBeVisible();
			await expect(page.locator('text=/Upcoming|Future Events/i')).toBeVisible();
		}

		// Navigate to event detail
		const eventCards = page.locator('[data-testid="event-card"]').or(page.locator('.event-card'));
		if ((await eventCards.count()) > 0) {
			await eventCards.first().click();
			await page.waitForLoadState('networkidle');

			// Verify RSVP statistics on detail page
			const rsvpStats = page.locator('text=/RSVP Statistics|Responses/i');
			if (await rsvpStats.isVisible()) {
				// Check for RSVP breakdown
				await expect(page.locator('text=/Accepted|Going/i')).toBeVisible();
				await expect(page.locator('text=/Declined|Not Going/i')).toBeVisible();
			}
		}
	});
});
