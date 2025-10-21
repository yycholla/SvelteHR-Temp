/**
 * E2E Test: Event Capacity, Waitlist, and Auto-Promotion
 * Feature: 025-events-flesh-out
 *
 * Tests the complete user flow for event capacity management,
 * joining waitlist, and automatic promotion when spots open.
 */

import { test, expect } from '@playwright/test';

test.describe('Event Capacity and Waitlist Management', () => {
	test.beforeEach(async ({ page }) => {
		// Login as test user
		await page.goto('/login');
		await page.fill('input[name="email"]', 'test@example.com');
		await page.fill('input[name="password"]', 'password123');
		await page.click('button[type="submit"]');

		// Navigate to events page
		await page.goto('/dashboard/events');
	});

	test('should create event with capacity limit and waitlist enabled', async ({ page }) => {
		// Click create event button
		await page.click('button:has-text("Create Event")');

		// Fill in event details
		await page.fill('input[name="title"]', 'Limited Capacity Training');
		await page.fill('textarea[name="description"]', 'Advanced leadership workshop with limited seats');
		await page.fill('input[name="startTime"]', '2025-10-20T10:00');
		await page.fill('input[name="endTime"]', '2025-10-20T14:00');
		await page.selectOption('select[name="type"]', 'training');
		await page.selectOption('select[name="visibility"]', 'public');

		// Set capacity limit
		await page.check('input[name="hasCapacityLimit"]');
		await page.fill('input[name="maxCapacity"]', '5');

		// Enable waitlist
		await page.check('input[name="waitlistEnabled"]');

		// Submit form
		await page.click('button:has-text("Create Event")');

		// Verify success
		await expect(page.locator('.toast')).toContainText('Event created successfully');

		// Find the event and verify capacity indicator
		const eventCard = page.locator('.event-card:has-text("Limited Capacity Training")');
		await expect(eventCard.locator('.capacity-indicator')).toContainText('0/5 spots filled');
	});

	test('should show capacity progress as users RSVP', async ({ page }) => {
		// Find event with capacity limit
		const eventCard = page.locator('.event-card:has-text("Limited Capacity Training")');
		await eventCard.click();

		// RSVP as accepted
		await page.click('button:has-text("Accept")');

		// Verify capacity updated
		await expect(page.locator('.capacity-indicator')).toContainText('1/5 spots filled');

		// Verify progress bar
		const progressBar = page.locator('.capacity-progress');
		await expect(progressBar).toHaveAttribute('value', '20'); // 1/5 = 20%
	});

	test('should prevent RSVP when capacity is full', async ({ page, context }) => {
		// Simulate multiple users accepting until capacity is full
		// (In real scenario, this would be multiple browser contexts)

		const eventCard = page.locator('.event-card:has-text("Limited Capacity Training")');
		await eventCard.click();

		// Try to RSVP when event is full
		await page.click('button:has-text("Accept")');

		// Should show error message
		await expect(page.locator('.toast.error')).toContainText('Event capacity reached');

		// Should suggest joining waitlist
		await expect(page.locator('.toast')).toContainText('Join the waitlist');

		// Verify "Join Waitlist" button is visible
		await expect(page.locator('button:has-text("Join Waitlist")')).toBeVisible();
	});

	test('should join waitlist when event is full', async ({ page }) => {
		// Find full event
		const eventCard = page.locator('.event-card:has(.capacity-full-badge)').first();
		await eventCard.click();

		// Verify event is full
		await expect(page.locator('.capacity-indicator')).toContainText('5/5 spots filled');
		await expect(page.locator('.capacity-status')).toContainText('Full');

		// Click "Join Waitlist" button
		await page.click('button:has-text("Join Waitlist")');

		// Verify success message
		await expect(page.locator('.toast')).toContainText('Added to waitlist');

		// Verify waitlist position is shown
		await expect(page.locator('.waitlist-status')).toContainText('On waitlist (#1)');

		// Verify waitlist button changed to "Leave Waitlist"
		await expect(page.locator('button:has-text("On waitlist")')).toBeVisible();
	});

	test('should show waitlist position for multiple users', async ({ page, context }) => {
		// User 1 joins waitlist (already on from previous test)
		const eventCard = page.locator('.event-card:has(.capacity-full-badge)').first();
		await eventCard.click();
		await expect(page.locator('.waitlist-status')).toContainText('On waitlist (#1)');

		// Create second user context
		const user2Page = await context.newPage();
		await user2Page.goto('/login');
		await user2Page.fill('input[name="email"]', 'user2@example.com');
		await user2Page.fill('input[name="password"]', 'password123');
		await user2Page.click('button[type="submit"]');

		await user2Page.goto('/dashboard/events');
		const event2 = user2Page.locator('.event-card:has(.capacity-full-badge)').first();
		await event2.click();

		// User 2 joins waitlist
		await user2Page.click('button:has-text("Join Waitlist")');

		// Verify position #2
		await expect(user2Page.locator('.waitlist-status')).toContainText('On waitlist (#2)');
	});

	test('should leave waitlist', async ({ page }) => {
		// Find event where user is on waitlist
		const eventCard = page.locator('.event-card').first();
		await eventCard.click();

		// Verify on waitlist
		await expect(page.locator('.waitlist-status')).toContainText('On waitlist');

		// Click leave waitlist button (X icon on waitlist button)
		await page.click('button:has-text("On waitlist")');

		// Verify success message
		await expect(page.locator('.toast')).toContainText('Removed from waitlist');

		// Verify waitlist button changed back to "Join Waitlist"
		await expect(page.locator('button:has-text("Join Waitlist")')).toBeVisible();
		await expect(page.locator('.waitlist-status')).not.toBeVisible();
	});

	test('should auto-promote from waitlist when spot opens', async ({ page, context }) => {
		// Setup: Event is full, user is on waitlist at position #1
		const eventCard = page.locator('.event-card:has(.capacity-full-badge)').first();
		await eventCard.click();
		await page.click('button:has-text("Join Waitlist")');
		await expect(page.locator('.waitlist-status')).toContainText('On waitlist (#1)');

		// Create second user context who is currently attending
		const attendeePage = await context.newPage();
		await attendeePage.goto('/login');
		await attendeePage.fill('input[name="email"]', 'attendee@example.com');
		await attendeePage.fill('input[name="password"]', 'password123');
		await attendeePage.click('button[type="submit"]');

		await attendeePage.goto('/dashboard/events');
		const attendeeEvent = attendeePage.locator('.event-card:has-text("Limited Capacity Training")');
		await attendeeEvent.click();

		// Attendee declines (opens spot)
		await attendeePage.click('button:has-text("Decline")');

		// Wait for waitlist promotion notification on original page
		// (In real implementation, this would use WebSocket or polling)
		await page.waitForTimeout(1000); // Simulate WebSocket delay

		// Reload to see notification
		await page.reload();
		await page.goto('/dashboard/events');

		// Verify notification
		await expect(page.locator('.notification-bell .badge')).toContainText('1');

		// Open notifications
		await page.click('.notification-bell');

		// Verify waitlist promotion notification
		await expect(page.locator('.notification')).toContainText('A spot opened up');
		await expect(page.locator('.notification')).toContainText('Limited Capacity Training');

		// Open event details
		await page.goto('/dashboard/events');
		const event = page.locator('.event-card:has-text("Limited Capacity Training")');
		await event.click();

		// Verify user is now an attendee with pending RSVP status
		await expect(page.locator('.rsvp-status')).toContainText('Pending');

		// Verify no longer on waitlist
		await expect(page.locator('.waitlist-status')).not.toBeVisible();
	});

	test('should reorder waitlist positions after auto-promotion', async ({ page, context }) => {
		// Setup: 3 users on waitlist at positions #1, #2, #3
		// User #1 gets promoted (from previous test)

		// Create user #2 context
		const user2Page = await context.newPage();
		await user2Page.goto('/login');
		await user2Page.fill('input[name="email"]', 'user2@example.com');
		await user2Page.fill('input[name="password"]', 'password123');
		await user2Page.click('button[type="submit"]');

		await user2Page.goto('/dashboard/events');
		const event2 = user2Page.locator('.event-card:has-text("Limited Capacity Training")');
		await event2.click();

		// User #2 should now be at position #1 (moved up from #2)
		await expect(user2Page.locator('.waitlist-status')).toContainText('On waitlist (#1)');

		// Create user #3 context
		const user3Page = await context.newPage();
		await user3Page.goto('/login');
		await user3Page.fill('input[name="email"]', 'user3@example.com');
		await user3Page.fill('input[name="password"]', 'password123');
		await user3Page.click('button[type="submit"]');

		await user3Page.goto('/dashboard/events');
		const event3 = user3Page.locator('.event-card:has-text("Limited Capacity Training")');
		await event3.click();

		// User #3 should now be at position #2 (moved up from #3)
		await expect(user3Page.locator('.waitlist-status')).toContainText('On waitlist (#2)');
	});

	test('should show waitlist count in capacity indicator', async ({ page }) => {
		// Find event with waitlist
		const eventCard = page.locator('.event-card:has(.capacity-full-badge)').first();
		await eventCard.click();

		// Verify capacity indicator shows waitlist count
		await expect(page.locator('.capacity-indicator')).toContainText('5/5 spots filled');
		await expect(page.locator('.waitlist-info')).toContainText('2 on waitlist');
	});

	test('should not allow waitlist if waitlist is disabled', async ({ page }) => {
		// Create event without waitlist enabled
		await page.click('button:has-text("Create Event")');
		await page.fill('input[name="title"]', 'No Waitlist Event');
		await page.fill('input[name="startTime"]', '2025-10-25T10:00');
		await page.fill('input[name="endTime"]', '2025-10-25T11:00');
		await page.check('input[name="hasCapacityLimit"]');
		await page.fill('input[name="maxCapacity"]', '3');
		// Do NOT check waitlistEnabled
		await page.click('button:has-text("Create Event")');

		// Fill event to capacity (simulate)
		// ...

		// Try to access full event
		const eventCard = page.locator('.event-card:has-text("No Waitlist Event")');
		await eventCard.click();

		// Verify "Join Waitlist" button is NOT visible
		await expect(page.locator('button:has-text("Join Waitlist")')).not.toBeVisible();

		// Verify message about waitlist not available
		await expect(page.locator('.capacity-status')).toContainText('Event is full');
		await expect(page.locator('.waitlist-info')).toContainText('Waitlist not available');
	});
});
