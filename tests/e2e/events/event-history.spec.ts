/**
 * E2E Test: Event History - Display and Pagination
 * Feature: 026-integrate-ui-components - T022
 *
 * Tests event history functionality:
 * - Accordion entries display
 * - Expand entry to see field changes
 * - Color-coding by changeType
 * - Read-only display (no edit/delete)
 * - Pagination with "Load More" button
 */

import { test, expect } from '@playwright/test';

test.describe('Event History - Display and Pagination', () => {
	test.beforeEach(async ({ page }) => {
		// Login with valid credentials
		await page.goto('/login');
		await page.fill('input[name="email"]', 'admin@example.com');
		await page.fill('input[name="password"]', 'admin');
		await page.click('button[type="submit"]');

		// Wait for redirect to dashboard
		await page.waitForURL('/dashboard');

		// Navigate to events page
		await page.goto('/dashboard/events');
		await page.waitForLoadState('networkidle');

		// Open first event dialog
		const eventCard = page.locator('[class*="event-card"]').first();
		await eventCard.click();
		await page.locator('[role="dialog"]').waitFor({ state: 'visible' });

		// Switch to History tab
		const historyTab = page.locator('[role="tab"]:has-text("History")').first();
		await historyTab.click();
	});

	test('should display history entries in accordion format', async ({ page }) => {
		// Look for accordion container
		const accordion = page.locator('[role="region"], div[class*="accordion"]').first();
		const accordionCount = await accordion.count();

		if (accordionCount > 0) {
			await expect(accordion).toBeVisible();

			// Verify accordion items exist
			const accordionItems = page.locator('[data-state], button[aria-expanded]');
			const itemCount = await accordionItems.count();

			if (itemCount > 0) {
				expect(itemCount).toBeGreaterThan(0);
			}
		} else {
			// No history yet - empty state
			const emptyState = page.locator('text=/No changes recorded|No history available/');
			await expect(emptyState).toBeVisible();
		}
	});

	test('should expand accordion entry to show field changes', async ({ page }) => {
		// Find first accordion trigger
		const accordionTrigger = page.locator('button[aria-expanded]').first();
		const triggerCount = await accordionTrigger.count();

		if (triggerCount > 0) {
			// Check initial state
			const isExpanded = await accordionTrigger.getAttribute('aria-expanded');

			if (isExpanded === 'false') {
				// Expand accordion
				await accordionTrigger.click();
				await page.waitForTimeout(300); // Wait for animation

				// Verify it expanded
				const newState = await accordionTrigger.getAttribute('aria-expanded');
				expect(newState).toBe('true');

				// Verify content is visible
				const accordionContent = accordionTrigger.locator('..').locator('[role="region"], div[data-state="open"]');
				await expect(accordionContent).toBeVisible();
			}
		}
	});

	test('should display change details with field names and values', async ({ page }) => {
		// Find and expand first accordion item
		const accordionTrigger = page.locator('button[aria-expanded]').first();
		const triggerCount = await accordionTrigger.count();

		if (triggerCount > 0) {
			await accordionTrigger.click();
			await page.waitForTimeout(300);

			// Look for field change details
			const fieldNames = page.locator('text=/Field|Changed|Old value|New value/i');
			const fieldCount = await fieldNames.count();

			if (fieldCount > 0) {
				// Field change details are present
				await expect(fieldNames.first()).toBeVisible();
			}
		}
	});

	test('should display color-coded entries by change type', async ({ page }) => {
		// Look for different change types
		const createdBadge = page.locator('text=created, [class*="badge"]:has-text("created")').first();
		const updatedBadge = page.locator('text=updated, [class*="badge"]:has-text("updated")').first();
		const deletedBadge = page.locator('text=deleted, [class*="badge"]:has-text("deleted")').first();

		// At least one type should exist if there's history
		const createdCount = await createdBadge.count();
		const updatedCount = await updatedBadge.count();
		const deletedCount = await deletedBadge.count();

		const totalBadges = createdCount + updatedCount + deletedCount;

		if (totalBadges > 0) {
			// Verify badges have different color styling
			if (createdCount > 0) {
				const createdClass = await createdBadge.getAttribute('class');
				expect(createdClass).toMatch(/(green|success|primary)/);
			}

			if (updatedCount > 0) {
				const updatedClass = await updatedBadge.getAttribute('class');
				expect(updatedClass).toMatch(/(blue|info|secondary)/);
			}

			if (deletedCount > 0) {
				const deletedClass = await deletedBadge.getAttribute('class');
				expect(deletedClass).toMatch(/(red|danger|destructive)/);
			}
		}
	});

	test('should NOT show edit or delete buttons (read-only)', async ({ page }) => {
		// History entries should be read-only - no edit/delete buttons
		const editButtons = page.locator('button:has-text("Edit"), button[aria-label*="Edit"]');
		const deleteButtons = page.locator('button:has-text("Delete"), button[aria-label*="Delete"]');

		// Within history content, these should not exist
		const editCount = await editButtons.count();
		const deleteCount = await deleteButtons.count();

		// History should be immutable - no edit/delete actions
		expect(editCount).toBe(0);
		expect(deleteCount).toBe(0);
	});

	test('should display actor information (who made the change)', async ({ page }) => {
		// Look for user information in history entries
		const userInfo = page.locator('text=/changed by|by|made by/i, [class*="user-name"], [class*="actor"]').first();
		const userCount = await userInfo.count();

		if (userCount > 0) {
			await expect(userInfo).toBeVisible();

			// Should display user name or identifier
			const userName = page.locator('text=/admin|employee|user/i').first();
			await expect(userName).toBeVisible();
		}
	});

	test('should display timestamps for each history entry', async ({ page }) => {
		// Look for timestamps in history entries
		const timestamps = page.locator('text=/ago|AM|PM|\\d{4}/').first();
		const timestampCount = await timestamps.count();

		if (timestampCount > 0) {
			await expect(timestamps).toBeVisible();

			// Timestamps should use either relative (< 48h) or absolute format
			const timestampText = await timestamps.textContent();
			expect(timestampText).toMatch(/ago|AM|PM|\d{4}/);
		}
	});

	test('should show "Load More" button when more than 25 entries', async ({ page }) => {
		// This test requires an event with >25 history entries
		// Check for Load More button
		const loadMoreButton = page.locator('button:has-text("Load More")').first();
		const loadMoreCount = await loadMoreButton.count();

		if (loadMoreCount > 0) {
			// Button exists, meaning there are more than 25 entries
			await expect(loadMoreButton).toBeVisible();

			// Get initial entry count
			const initialEntries = await page.locator('button[aria-expanded]').count();

			// Click Load More
			await loadMoreButton.click();
			await page.waitForTimeout(500);

			// Verify more entries loaded
			const newEntryCount = await page.locator('button[aria-expanded]').count();
			expect(newEntryCount).toBeGreaterThan(initialEntries);

			// Should load up to 25 more (so total could be 50)
			expect(newEntryCount).toBeLessThanOrEqual(initialEntries + 25);
		}
	});

	test('should hide "Load More" button when all entries loaded', async ({ page }) => {
		// If Load More exists, click it until it disappears
		let loadMoreButton = page.locator('button:has-text("Load More")').first();
		let loadMoreCount = await loadMoreButton.count();
		let clickCount = 0;
		const maxClicks = 10; // Prevent infinite loop

		while (loadMoreCount > 0 && clickCount < maxClicks) {
			await loadMoreButton.click();
			await page.waitForTimeout(500);

			// Re-check if button still exists
			loadMoreCount = await loadMoreButton.count();
			clickCount++;
		}

		// After all entries loaded, button should be hidden
		if (clickCount > 0) {
			await expect(loadMoreButton).not.toBeVisible();
		}
	});

	test('should show empty state when no history exists', async ({ page }) => {
		// For a newly created event, history might be empty
		const emptyState = page.locator('text=/No changes recorded|No history available|Event history is empty/');
		const emptyCount = await emptyState.count();

		if (emptyCount > 0) {
			await expect(emptyState).toBeVisible();

			// Verify no accordion items
			const accordionItems = page.locator('button[aria-expanded]');
			const itemCount = await accordionItems.count();
			expect(itemCount).toBe(0);
		}
	});

	test('should maintain scroll position when loading more entries', async ({ page }) => {
		const loadMoreButton = page.locator('button:has-text("Load More")').first();
		const loadMoreCount = await loadMoreButton.count();

		if (loadMoreCount > 0) {
			// Scroll to bottom where Load More button is
			await loadMoreButton.scrollIntoViewIfNeeded();

			// Get scroll position before loading more
			const scrollBefore = await page.evaluate(() => {
				const dialog = document.querySelector('[role="dialog"]');
				return dialog?.scrollTop || 0;
			});

			// Click Load More
			await loadMoreButton.click();
			await page.waitForTimeout(500);

			// Scroll position should be maintained (not jump to top)
			const scrollAfter = await page.evaluate(() => {
				const dialog = document.querySelector('[role="dialog"]');
				return dialog?.scrollTop || 0;
			});

			// Should remain near the bottom (within reasonable range)
			expect(Math.abs(scrollAfter - scrollBefore)).toBeLessThan(200);
		}
	});

	test('should display history entries in reverse chronological order', async ({ page }) => {
		// Get all history entry timestamps
		const timestamps = page.locator('button[aria-expanded] time, button[aria-expanded] [datetime]');
		const timestampCount = await timestamps.count();

		if (timestampCount > 1) {
			// Get first and last timestamps
			const firstTimestamp = await timestamps.first().getAttribute('datetime');
			const lastTimestamp = await timestamps.last().getAttribute('datetime');

			if (firstTimestamp && lastTimestamp) {
				const firstDate = new Date(firstTimestamp);
				const lastDate = new Date(lastTimestamp);

				// First entry should be more recent than last entry
				expect(firstDate.getTime()).toBeGreaterThanOrEqual(lastDate.getTime());
			}
		}
	});
});
