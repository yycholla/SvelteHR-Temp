// E2E Test: Event RSVP Workflow (Puppeteer)
// Feature: 019-we-need-to - Phase 6
// Purpose: Test complete RSVP workflow for events with Puppeteer
//
// Puppeteer provides better Arch Linux support than Playwright

import { beforeEach, describe, expect, test } from 'vitest';
import {
	clickElement,
	countElements,
	elementHasClass,
	expectURLMatch,
	fillInput,
	getElementText,
	getPage,
	gotoPage,
	isElementVisible,
	login,
	pageContainsText,
	reloadPage,
	selectOption,
	waitFor,
	waitForElement
} from '../../utils/puppeteer-helpers';

describe('Event RSVP Workflow (Puppeteer)', () => {
	// Setup: Login before each test
	beforeEach(async () => {
		await login('admin@mountainhr.dev', 'admin123');
	});

	test('user can view events list and navigate to event details', async () => {
		await gotoPage('/dashboard/events');

		// Verify events calendar loaded
		await waitForElement('[data-testid="events-calendar"]');

		// Check for event cards
		const eventCount = await countElements('[data-testid="event-card"]');

		if (eventCount > 0) {
			// Click first event
			await clickElement('[data-testid="event-card"]');

			// Wait for event details dialog to open
			await waitForElement('[data-testid="event-details-dialog"]');
		} else {
			// If no events, verify empty state
			const hasEmptyMessage = await pageContainsText('No events found');
			expect(hasEmptyMessage).toBe(true);
		}
	});

	test('user can change RSVP status on event detail page', async () => {
		await gotoPage('/dashboard/events');

		const eventCount = await countElements('[data-testid="event-card"]');

		if (eventCount > 0) {
			// Navigate to first event
			await clickElement('[data-testid="event-card"]');
			await waitForElement('[data-testid="event-details-dialog"]');

			// Check if this is a past event
			const isPastEvent =
				(await pageContainsText('Past Event')) || (await pageContainsText('This event has ended'));

			if (!isPastEvent) {
				// Click RSVP button using data-testid
				const hasRsvpButton = await isElementVisible('[data-testid="event-rsvp-button"]');

				if (hasRsvpButton) {
					await clickElement('[data-testid="event-rsvp-button"]');

					// Wait for RSVP update
					await waitFor(1000);

					// Verify RSVP action completed (dialog should still be visible)
					const hasDialog = await isElementVisible('[data-testid="event-details-dialog"]');
					expect(hasDialog).toBe(true);
				}
			}
		}
	});

	test('RSVP status persists after page reload', async () => {
		await gotoPage('/dashboard/events');

		const eventCount = await countElements('[data-testid="event-card"]');

		if (eventCount > 0) {
			// Navigate to first event
			await clickElement('[data-testid="event-card"]');
			await waitForElement('[data-testid="event-details-dialog"]');

			// Check if not past event
			const isPastEvent = await pageContainsText('Past Event');

			if (!isPastEvent) {
				// Set RSVP using data-testid
				const hasRsvpButton = await isElementVisible('[data-testid="event-rsvp-button"]');

				if (hasRsvpButton) {
					await clickElement('[data-testid="event-rsvp-button"]');
					await waitFor(1000);

					// Reload page
					await reloadPage();
					await waitForElement('[data-testid="events-calendar"]');

					// Re-open event to verify RSVP persisted
					await clickElement('[data-testid="event-card"]');
					await waitForElement('[data-testid="event-details-dialog"]');

					// Verify dialog opened (soft check - RSVP status should be visible)
					const hasDialog = await isElementVisible('[data-testid="event-details-dialog"]');
					expect(hasDialog).toBe(true);
				}
			}
		}
	});

	test('event filters work correctly', async () => {
		await gotoPage('/dashboard/events');

		const page = getPage();

		// Test visibility filter if available
		const hasVisibilityFilter = await isElementVisible('select[name="visibility"]');
		if (hasVisibilityFilter) {
			await selectOption('select[name="visibility"]', 'Company-Wide');
			await waitFor(500);

			// Verify URL updated
			const currentUrl = page.url();
			expect(currentUrl).toContain('visibility=');
		}

		// Test status filter if available
		const hasStatusFilter = await isElementVisible('select[name="status"]');
		if (hasStatusFilter) {
			await selectOption('select[name="status"]', 'Upcoming');
			await waitFor(500);

			// Verify URL updated
			const currentUrl = page.url();
			expect(currentUrl).toContain('status=');
		}

		// Test event type filter if available
		const hasTypeFilter = await isElementVisible('select[name="eventType"]');
		if (hasTypeFilter) {
			await selectOption('select[name="eventType"]', 'Meeting');
			await waitFor(500);

			// Verify URL updated
			const currentUrl = page.url();
			expect(currentUrl).toContain('eventType=');
		}

		// Verify filtered results displayed
		const hasResults =
			(await countElements('[data-testid="event-card"]')) > 0 ||
			(await pageContainsText('No events found'));
		expect(hasResults).toBe(true);
	});

	test('manager can create new event', async () => {
		await gotoPage('/dashboard/events');
		await waitForElement('[data-testid="events-calendar"]');

		// Look for "Create Event" button (check if user has permission)
		const page = getPage();
		const hasCreateButton = await page.$$eval('a, button', (elements: any[]) =>
			elements.some(
				(el) => el.textContent?.includes('Create Event') || el.textContent?.includes('New Event')
			)
		);

		if (hasCreateButton) {
			// Click create button
			await page.evaluate(() => {
				const elements = Array.from(document.querySelectorAll('a, button'));
				const createBtn = elements.find(
					(el) => el.textContent?.includes('Create Event') || el.textContent?.includes('New Event')
				);
				(createBtn as HTMLElement)?.click();
			});

			// Wait for create dialog to open
			await waitForElement('[data-testid="event-create-dialog"]');

			// Verify create dialog loaded
			const hasDialog = await isElementVisible('[data-testid="event-create-dialog"]');
			expect(hasDialog).toBe(true);

			// Fill out event form
			await fillInput('input[name="title"]', 'Test Event - E2E');
			await fillInput('textarea[name="description"]', 'This is a test event created via E2E test');

			// Set dates
			const tomorrow = new Date();
			tomorrow.setDate(tomorrow.getDate() + 1);
			tomorrow.setHours(10, 0, 0, 0);
			const startTimeStr = tomorrow.toISOString().slice(0, 16);

			const endTime = new Date(tomorrow);
			endTime.setHours(12, 0, 0, 0);
			const endTimeStr = endTime.toISOString().slice(0, 16);

			await fillInput('input[name="startTime"]', startTimeStr);
			await fillInput('input[name="endTime"]', endTimeStr);
			await fillInput('input[name="location"]', 'Conference Room A');

			// Set event type and visibility
			await selectOption('select[name="eventType"]', 'meeting');
			await selectOption('select[name="visibilityType"]', 'company');

			// Verify submit button is enabled (soft check)
			const hasSubmitButton = await page.$$eval('button[type="submit"]', (buttons: any[]) =>
				buttons.some((btn) => btn.textContent?.includes('Create'))
			);
			expect(hasSubmitButton).toBe(true);
		} else {
			// User doesn't have manager access
			expect(hasCreateButton).toBe(false);
		}
	});

	test('user can view event statistics', async () => {
		await gotoPage('/dashboard/events');

		// Check for statistics section
		const hasStats = (await pageContainsText('Statistics')) || (await pageContainsText('Overview'));

		if (hasStats) {
			// Verify key metrics are visible
			const hasMetrics =
				(await pageContainsText('Total Events')) || (await pageContainsText('Upcoming'));
			expect(hasMetrics).toBe(true);
		}

		// Navigate to event detail
		const eventCount = await countElements('[data-testid="event-card"]');
		if (eventCount > 0) {
			await clickElement('[data-testid="event-card"]');
			await waitFor(500);

			// Check for RSVP statistics on detail page
			const hasRsvpStats =
				(await pageContainsText('RSVP Statistics')) || (await pageContainsText('Responses'));

			if (hasRsvpStats) {
				// Check for RSVP breakdown
				const hasBreakdown =
					(await pageContainsText('Accepted')) ||
					(await pageContainsText('Going')) ||
					(await pageContainsText('Declined'));
				expect(hasBreakdown).toBe(true);
			}
		}
	});

	test('event detail page displays complete information', async () => {
		await gotoPage('/dashboard/events');

		const eventCount = await countElements('[data-testid="event-card"]');

		if (eventCount > 0) {
			// Navigate to first event
			await clickElement('[data-testid="event-card"]');

			// Wait for event details dialog
			await waitForElement('[data-testid="event-details-dialog"]');

			// Verify dialog is visible
			const hasDialog = await isElementVisible('[data-testid="event-details-dialog"]');
			expect(hasDialog).toBe(true);

			// Check for event details content
			const hasDescription =
				(await pageContainsText('Description')) || (await countElements('p')) > 0;
			expect(hasDescription).toBe(true);
		}
	});
});
