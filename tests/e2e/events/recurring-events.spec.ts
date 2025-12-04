/**
 * E2E Test: Recurring Events with RSVP Scope Selection
 * Feature: 025-events-flesh-out
 *
 * Tests the complete user flow for creating recurring events
 * and responding to them with scope selection.
 */

import { expect, test } from '@playwright/test';

test.describe('Recurring Events Management', () => {
	test.beforeEach(async ({ page }) => {
		// Login as test user
		await page.goto('/login');
		await page.fill('input[name="email"]', 'test@example.com');
		await page.fill('input[name="password"]', 'password123');
		await page.click('button[type="submit"]');

		// Navigate to events page
		await page.goto('/dashboard/events');
	});

	test('should create a weekly recurring event', async ({ page }) => {
		// Click create event button
		await page.click('button:has-text("Create Event")');

		// Fill in event details
		await page.fill('input[name="title"]', 'Weekly Team Standup');
		await page.fill('textarea[name="description"]', 'Daily team sync meeting');
		await page.fill('input[name="location"]', 'Conference Room A');

		// Set start and end times
		await page.fill('input[name="startTime"]', '2025-10-13T09:00');
		await page.fill('input[name="endTime"]', '2025-10-13T09:30');

		// Select meeting type
		await page.selectOption('select[name="type"]', 'meeting');

		// Select public visibility
		await page.selectOption('select[name="visibility"]', 'public');

		// Enable recurrence
		await page.check('input[name="isRecurring"]');

		// Configure recurrence: Weekly, every Monday, for 12 weeks
		await page.selectOption('select[name="frequency"]', 'WEEKLY');
		await page.fill('input[name="interval"]', '1');
		await page.check('input[value="MO"]'); // Monday
		await page.fill('input[name="count"]', '12');

		// Submit form
		await page.click('button:has-text("Create Event")');

		// Verify success message
		await expect(page.locator('.toast')).toContainText('Event created successfully');

		// Verify event appears in calendar
		await expect(page.locator('.event-card')).toContainText('Weekly Team Standup');

		// Verify recurrence indicator
		await expect(page.locator('.event-card .recurrence-badge')).toContainText('Weekly');
	});

	test('should RSVP to recurring event with scope selection - This Event Only', async ({
		page
	}) => {
		// Find a recurring event
		const recurringEvent = page.locator('.event-card:has(.recurrence-badge)').first();
		await recurringEvent.click();

		// Event details dialog should open
		await expect(page.locator('[role="dialog"]')).toBeVisible();
		await expect(page.locator('[role="dialog"] h2')).toContainText('Weekly Team Standup');

		// Verify recurring event indicator
		await expect(page.locator('[role="dialog"] .recurrence-info')).toBeVisible();

		// Click RSVP button (Accept)
		await page.click('button:has-text("Accept")');

		// Scope selection dialog should appear
		await expect(page.locator('[role="dialog"] h3')).toContainText('Recurring Event');

		// Select "This event only"
		await page.check('input[value="this_event"]');

		// Confirm selection
		await page.click('button:has-text("Confirm")');

		// Verify success message
		await expect(page.locator('.toast')).toContainText('RSVP updated');

		// Verify RSVP status changed to "Accepted"
		await expect(page.locator('.rsvp-status')).toContainText('Accepted');
	});

	test('should RSVP to recurring event with scope - This and Future Events', async ({ page }) => {
		// Find a recurring event
		const recurringEvent = page.locator('.event-card:has(.recurrence-badge)').first();
		await recurringEvent.click();

		// Click RSVP button (Tentative)
		await page.click('button:has-text("Tentative")');

		// Scope selection dialog should appear
		await expect(page.locator('[role="dialog"] h3')).toContainText('Recurring Event');

		// Select "This and future events"
		await page.check('input[value="this_and_future"]');

		// Confirm selection
		await page.click('button:has-text("Confirm")');

		// Verify success message
		await expect(page.locator('.toast')).toContainText('RSVP updated for this and future events');

		// Verify RSVP status changed
		await expect(page.locator('.rsvp-status')).toContainText('Tentative');
	});

	test('should RSVP to recurring event with scope - All Events', async ({ page }) => {
		// Find a recurring event
		const recurringEvent = page.locator('.event-card:has(.recurrence-badge)').first();
		await recurringEvent.click();

		// Click RSVP button (Decline)
		await page.click('button:has-text("Decline")');

		// Scope selection dialog should appear
		await expect(page.locator('[role="dialog"] h3')).toContainText('Recurring Event');

		// Select "All events in the series"
		await page.check('input[value="all_events"]');

		// Confirm selection
		await page.click('button:has-text("Confirm")');

		// Verify success message
		await expect(page.locator('.toast')).toContainText('RSVP updated for all events');

		// Verify RSVP status changed
		await expect(page.locator('.rsvp-status')).toContainText('Declined');
	});

	test('should edit recurring event with scope selection', async ({ page }) => {
		// Find a recurring event
		const recurringEvent = page.locator('.event-card:has(.recurrence-badge)').first();
		await recurringEvent.click();

		// Click edit button
		await page.click('button:has-text("Edit")');

		// Modify event title
		await page.fill('input[name="title"]', 'Updated Weekly Standup');

		// Submit changes
		await page.click('button:has-text("Save Changes")');

		// Scope selection dialog should appear
		await expect(page.locator('[role="dialog"] h3')).toContainText('Update Recurring Event');

		// Select "This and future events"
		await page.check('input[value="this_and_future"]');

		// Confirm
		await page.click('button:has-text("Confirm")');

		// Verify success
		await expect(page.locator('.toast')).toContainText('Event updated');

		// Verify title changed
		await expect(page.locator('.event-card')).toContainText('Updated Weekly Standup');
	});

	test('should view calendar with expanded recurring event instances', async ({ page }) => {
		// Navigate to calendar view
		await page.click('button:has-text("Calendar View")');

		// Wait for calendar to load
		await expect(page.locator('.fc-view')).toBeVisible();

		// Find recurring events in calendar (should show multiple instances)
		const eventInstances = page.locator('.fc-event:has-text("Weekly Team Standup")');
		const count = await eventInstances.count();

		// Should have multiple instances (at least 4 weeks visible)
		expect(count).toBeGreaterThan(3);

		// Click on one instance
		await eventInstances.first().click();

		// Verify event details dialog opens
		await expect(page.locator('[role="dialog"]')).toBeVisible();
		await expect(page.locator('[role="dialog"] h2')).toContainText('Weekly Team Standup');

		// Verify recurrence info
		await expect(page.locator('.recurrence-info')).toContainText('Weekly on Monday');
	});

	test('should handle RRULE validation errors', async ({ page }) => {
		// Click create event button
		await page.click('button:has-text("Create Event")');

		// Fill in basic details
		await page.fill('input[name="title"]', 'Invalid Recurring Event');
		await page.fill('input[name="startTime"]', '2025-10-13T09:00');
		await page.fill('input[name="endTime"]', '2025-10-13T09:30');

		// Enable recurrence
		await page.check('input[name="isRecurring"]');

		// Try to submit without configuring recurrence properly
		await page.click('button:has-text("Create Event")');

		// Should show validation error
		await expect(page.locator('.error-message')).toContainText(
			'Please configure recurrence settings'
		);
	});
});
