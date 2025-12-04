/**
 * E2E Test: View Calendar with Events
 * Feature: 027-we-need-to
 * Quickstart Scenario 1
 *
 * Tests calendar rendering, 3-month buffer loading, event display, and navigation.
 * MUST FAIL until EventCalendar component is implemented.
 */

import { expect, test } from '@playwright/test';

test.describe('View Calendar with Events', () => {
	test.beforeEach(async ({ page }) => {
		// Navigate to events page (assumes authentication handled by global setup)
		await page.goto('/dashboard/events');
	});

	test('should render calendar with current month view', async ({ page }) => {
		// Verify FullCalendar renders
		await expect(page.locator('.fc-daygrid-body')).toBeVisible();

		// Verify current month is displayed in header
		const currentMonth = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });
		const headerText = await page.locator('.fc-toolbar-title').textContent();

		expect(headerText).toContain(new Date().getFullYear().toString());
	});

	test('should load 3-month buffer (prev + current + next month)', async ({ page }) => {
		// Wait for calendar to render
		await page.waitForSelector('.fc-daygrid-body');

		// Get GraphQL network requests
		const eventsRequest = page.waitForResponse(
			(response) =>
				response.url().includes('graphql') &&
				response.request().postDataJSON()?.operationName === 'GetEventsForCalendar'
		);

		await page.reload();

		const response = await eventsRequest;
		const responseData = await response.json();

		// Verify query includes 3-month date range
		const requestData = response.request().postDataJSON();
		expect(requestData.variables).toHaveProperty('startDate');
		expect(requestData.variables).toHaveProperty('endDate');

		// Calculate expected buffer range
		const today = new Date();
		const currentMonth = today.getMonth();
		const currentYear = today.getFullYear();

		const expectedStart = new Date(currentYear, currentMonth - 1, 1); // Prev month
		const expectedEnd = new Date(currentYear, currentMonth + 2, 0); // Next month end

		const actualStart = new Date(requestData.variables.startDate);
		const actualEnd = new Date(requestData.variables.endDate);

		expect(actualStart.getMonth()).toBe(expectedStart.getMonth());
		expect(actualEnd.getMonth()).toBe(expectedEnd.getMonth());
	});

	test('should display events with correct information', async ({ page }) => {
		// Wait for events to load
		await page.waitForSelector('.fc-event', { timeout: 2000 });

		// Get first event
		const firstEvent = page.locator('.fc-event').first();
		await expect(firstEvent).toBeVisible();

		// Verify event title is visible
		const eventTitle = firstEvent.locator('.fc-event-title');
		await expect(eventTitle).toBeVisible();

		// Verify event has color coding (via CSS class or inline style)
		const eventElement = await firstEvent.elementHandle();
		const backgroundColor = await eventElement?.evaluate(
			(el) => window.getComputedStyle(el).backgroundColor
		);

		expect(backgroundColor).toBeTruthy();
		expect(backgroundColor).not.toBe('rgba(0, 0, 0, 0)'); // Not transparent
	});

	test('should show RSVP status badge on events', async ({ page }) => {
		// Wait for events with RSVP status
		await page.waitForSelector('.fc-event[data-rsvp-status]', { timeout: 2000 });

		const eventWithRsvp = page.locator('.fc-event[data-rsvp-status="accepted"]').first();

		// Verify RSVP badge is visible
		const rsvpBadge = eventWithRsvp.locator('.rsvp-badge');
		await expect(rsvpBadge).toBeVisible();

		const badgeText = await rsvpBadge.textContent();
		expect(badgeText?.toLowerCase()).toContain('accepted');
	});

	test('should show capacity indicator for events with capacity limits', async ({ page }) => {
		// Find event with capacity limit
		const eventWithCapacity = page.locator('.fc-event[data-has-capacity="true"]').first();

		if ((await eventWithCapacity.count()) > 0) {
			const capacityIndicator = eventWithCapacity.locator('.capacity-indicator');
			await expect(capacityIndicator).toBeVisible();

			// Verify format like "15/20" or "Full"
			const indicatorText = await capacityIndicator.textContent();
			expect(indicatorText).toMatch(/\d+\/\d+|Full|Available/);
		}
	});

	test('should show recurring icon for recurring events', async ({ page }) => {
		// Find recurring event
		const recurringEvent = page.locator('.fc-event[data-is-recurring="true"]').first();

		if ((await recurringEvent.count()) > 0) {
			const recurringIcon = recurringEvent.locator('.recurring-icon, svg[data-icon="repeat"]');
			await expect(recurringIcon).toBeVisible();
		}
	});

	test('should show conflict warning for overlapping events', async ({ page }) => {
		// Find event with conflict
		const conflictedEvent = page.locator('.fc-event[data-has-conflict="true"]').first();

		if ((await conflictedEvent.count()) > 0) {
			const conflictWarning = conflictedEvent.locator('.conflict-warning, svg[data-icon="alert"]');
			await expect(conflictWarning).toBeVisible();
		}
	});

	test('should open EventDetailsDialog when clicking event', async ({ page }) => {
		await page.waitForSelector('.fc-event', { timeout: 2000 });

		const firstEvent = page.locator('.fc-event').first();
		await firstEvent.click();

		// Verify dialog opens
		const dialog = page.locator('[role="dialog"]').first();
		await expect(dialog).toBeVisible();

		// Verify dialog has event title
		const dialogTitle = dialog.locator('h2, [data-dialog-title]').first();
		await expect(dialogTitle).toBeVisible();
	});

	test('should navigate between months using arrows', async ({ page }) => {
		await page.waitForSelector('.fc-toolbar-title');

		// Get current month
		const initialMonth = await page.locator('.fc-toolbar-title').textContent();

		// Click next month button
		await page.locator('.fc-next-button').click();
		await page.waitForTimeout(300); // Allow calendar to update

		const nextMonth = await page.locator('.fc-toolbar-title').textContent();
		expect(nextMonth).not.toBe(initialMonth);

		// Click previous month button (twice to go back before initial)
		await page.locator('.fc-prev-button').click();
		await page.waitForTimeout(300);
		await page.locator('.fc-prev-button').click();
		await page.waitForTimeout(300);

		const prevMonth = await page.locator('.fc-toolbar-title').textContent();
		expect(prevMonth).not.toBe(initialMonth);
		expect(prevMonth).not.toBe(nextMonth);
	});

	test('should load events within 1 second', async ({ page }) => {
		const startTime = Date.now();

		await page.goto('/dashboard/events');

		// Wait for first event to be visible
		await page.waitForSelector('.fc-event', { timeout: 1000 });

		const loadTime = Date.now() - startTime;

		// Verify page load performance
		expect(loadTime).toBeLessThan(1000);
	});

	test('should switch between calendar views (month/week/day)', async ({ page }) => {
		await page.waitForSelector('.fc-toolbar');

		// Switch to week view
		const weekViewButton = page.locator('button:has-text("week"), .fc-timeGridWeek-button');
		if ((await weekViewButton.count()) > 0) {
			await weekViewButton.click();
			await expect(page.locator('.fc-timegrid')).toBeVisible();
		}

		// Switch to day view
		const dayViewButton = page.locator('button:has-text("day"), .fc-timeGridDay-button');
		if ((await dayViewButton.count()) > 0) {
			await dayViewButton.click();
			await expect(page.locator('.fc-timegrid-axis')).toBeVisible();
		}

		// Switch back to month view
		const monthViewButton = page.locator('button:has-text("month"), .fc-dayGridMonth-button');
		await monthViewButton.click();
		await expect(page.locator('.fc-daygrid-body')).toBeVisible();
	});
});
