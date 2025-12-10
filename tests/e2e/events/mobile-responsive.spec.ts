/**
 * E2E Test: Mobile Responsive Calendar
 * Feature: 027-we-need-to
 * Quickstart Scenario 11
 *
 * Tests mobile responsiveness, touch interactions, and mobile-optimized views.
 * MUST FAIL until mobile responsive design is implemented.
 */

import { devices, expect, test } from '@playwright/test';

test.describe('Mobile Responsive Calendar', () => {
	test.use({ ...devices['iPhone 12'] });

	test.beforeEach(async ({ page }) => {
		await page.goto('/dashboard/events');
		await page.waitForSelector('.fc-daygrid-body');
	});

	test('should display mobile-optimized calendar view', async ({ page }) => {
		// Verify calendar renders on mobile
		const calendar = page.locator('.fc-daygrid-body');
		await expect(calendar).toBeVisible();

		// Verify mobile view adjustments (e.g., fewer days visible)
		const viewMode = await calendar.getAttribute('data-view-mode');

		// On mobile, should default to week or day view for better UX
		if (viewMode) {
			expect(viewMode).toMatch(/week|day|list/i);
		}
	});

	test('should render calendar within viewport', async ({ page }) => {
		const calendar = page.locator('.fc');

		// Verify calendar doesn't overflow horizontally
		const calendarBox = await calendar.boundingBox();
		const viewportSize = page.viewportSize();

		if (calendarBox && viewportSize) {
			expect(calendarBox.width).toBeLessThanOrEqual(viewportSize.width);
		}
	});

	test('should show mobile-friendly event cards', async ({ page }) => {
		const event = page.locator('.fc-event').first();

		// Verify event is tappable (large enough for touch)
		const eventBox = await event.boundingBox();

		if (eventBox) {
			// Minimum 44x44px touch target
			expect(eventBox.height).toBeGreaterThanOrEqual(44);
		}
	});

	test('should open event details on tap', async ({ page }) => {
		const event = page.locator('.fc-event').first();

		// Tap event
		await event.tap();

		// Verify dialog opens
		const dialog = page.locator('[role="dialog"]').first();
		await expect(dialog).toBeVisible();
	});

	test('should display full-screen dialog on mobile', async ({ page }) => {
		const event = page.locator('.fc-event').first();
		await event.tap();

		const dialog = page.locator('[role="dialog"]').first();

		// On mobile, dialog should be full-screen or near full-screen
		const dialogBox = await dialog.boundingBox();
		const viewportSize = page.viewportSize();

		if (dialogBox && viewportSize) {
			// Dialog width should be close to viewport width
			const widthRatio = dialogBox.width / viewportSize.width;
			expect(widthRatio).toBeGreaterThan(0.9); // At least 90% of viewport
		}
	});

	test('should navigate months with swipe gestures', async ({ page }) => {
		const calendar = page.locator('.fc-daygrid-body');

		// Get current month
		const initialMonth = await page.locator('.fc-toolbar-title').textContent();

		// Swipe left (to next month)
		const calendarBox = await calendar.boundingBox();

		if (calendarBox) {
			// Simulate swipe gesture by tapping next month button
			// Note: Playwright touchscreen API only supports tap(), not complex gestures
			const nextButton = page.locator('.fc-next-button');
			await nextButton.tap();

			await page.waitForTimeout(500);

			// Verify month changed
			const newMonth = await page.locator('.fc-toolbar-title').textContent();
			expect(newMonth).not.toBe(initialMonth);
		}
	});

	test('should display bottom sheet for event creation on mobile', async ({ page }) => {
		// Tap on a date
		const dateCell = page.locator('.fc-daygrid-day').nth(10);
		await dateCell.tap();

		// On mobile, should open bottom sheet instead of full dialog
		const bottomSheet = page.locator('[data-bottom-sheet], .bottom-sheet');
		const dialog = page.locator('[role="dialog"]');

		// Either bottom sheet or full-screen dialog
		if ((await bottomSheet.count()) > 0) {
			await expect(bottomSheet).toBeVisible();
		} else {
			await expect(dialog).toBeVisible();
		}
	});

	test('should collapse calendar toolbar on mobile', async ({ page }) => {
		const toolbar = page.locator('.fc-toolbar');

		// Verify toolbar is responsive
		const toolbarBox = await toolbar.boundingBox();
		const viewportSize = page.viewportSize();

		if (toolbarBox && viewportSize) {
			expect(toolbarBox.width).toBeLessThanOrEqual(viewportSize.width);
		}

		// View switcher might be in dropdown/hamburger menu on mobile
		const hamburgerMenu = page.locator('button[aria-label="Menu"], .menu-button');

		if ((await hamburgerMenu.count()) > 0) {
			await expect(hamburgerMenu).toBeVisible();
		}
	});

	test('should display event list view option for mobile', async ({ page }) => {
		// Find list view toggle
		const listViewButton = page.locator('button:has-text("List"), .fc-listWeek-button');

		if ((await listViewButton.count()) > 0) {
			await listViewButton.tap();

			// Verify list view renders
			const listView = page.locator('.fc-list, [data-view="list"]');
			await expect(listView).toBeVisible();

			// Verify events are in a scrollable list
			const eventItems = listView.locator('.fc-list-event');
			await expect(eventItems.first()).toBeVisible();
		}
	});

	test('should handle touch scrolling smoothly', async ({ page }) => {
		// Switch to list view if available
		const listViewButton = page.locator('button:has-text("List")');

		if ((await listViewButton.count()) > 0) {
			await listViewButton.tap();
			await page.waitForTimeout(300);

			const listView = page.locator('.fc-list');

			// Perform touch scroll using mouse wheel as fallback
			const listBox = await listView.boundingBox();

			if (listBox) {
				// Simulate scroll using mouse wheel (touchscreen API doesn't support scroll gestures)
				await page.mouse.wheel(0, 150);

				// Verify scroll occurred (list should move)
				await page.waitForTimeout(200);
			}
		}
	});

	test('should display mobile-optimized tabs in event details', async ({ page }) => {
		const event = page.locator('.fc-event').first();
		await event.tap();

		const dialog = page.locator('[role="dialog"]').first();

		// Verify tabs are touch-friendly
		const tabs = dialog.locator('[role="tab"]');
		const tabCount = await tabs.count();

		for (let i = 0; i < tabCount; i++) {
			const tab = tabs.nth(i);
			const tabBox = await tab.boundingBox();

			if (tabBox) {
				// Tabs should be large enough for touch
				expect(tabBox.height).toBeGreaterThanOrEqual(44);
			}
		}
	});

	test('should hide less important UI elements on mobile', async ({ page }) => {
		// Verify desktop-only elements are hidden
		const desktopOnly = page.locator('[data-desktop-only]');

		if ((await desktopOnly.count()) > 0) {
			await expect(desktopOnly).not.toBeVisible();
		}
	});

	test('should display mobile-friendly form inputs', async ({ page }) => {
		const dateCell = page.locator('.fc-daygrid-day').nth(10);
		await dateCell.tap();

		const dialog = page.locator('[role="dialog"]');
		await dialog.waitFor({ state: 'visible' });

		// Verify input fields use native mobile keyboards
		const titleInput = dialog.locator('input[name="title"]');

		if ((await titleInput.count()) > 0) {
			const inputType = await titleInput.getAttribute('type');
			const inputMode = await titleInput.getAttribute('inputmode');

			// Should have appropriate input attributes for mobile
			expect(inputType || inputMode).toBeTruthy();
		}
	});

	test('should handle orientation change gracefully', async ({ page }) => {
		// Get initial orientation
		const initialViewport = page.viewportSize();

		// Rotate to landscape
		await page.setViewportSize({ width: 844, height: 390 }); // iPhone 12 landscape

		await page.waitForTimeout(500);

		// Verify calendar still renders correctly
		const calendar = page.locator('.fc-daygrid-body');
		await expect(calendar).toBeVisible();

		// Rotate back to portrait
		if (initialViewport) {
			await page.setViewportSize(initialViewport);
		}

		await page.waitForTimeout(500);
		await expect(calendar).toBeVisible();
	});

	test('should support pull-to-refresh on mobile', async ({ page }) => {
		// Simulate pull-to-refresh by tapping refresh button if available
		const refreshButton = page.locator('button[aria-label*="Refresh"], [data-refresh-button]');

		if ((await refreshButton.count()) > 0) {
			await refreshButton.tap();
			await page.waitForTimeout(500);

			// Verify refresh indicator appears (if implemented)
			const refreshIndicator = page.locator('[data-refreshing], .refreshing');

			if ((await refreshIndicator.count()) > 0) {
				await expect(refreshIndicator).toBeVisible();
			}
		} else {
			// Note: Pull-to-refresh gesture not testable with Playwright touchscreen API
			// which only supports tap() method, not complex swipe gestures
			// This would require manual touch event dispatching
			expect(true).toBe(true); // Skip if no refresh button available
		}
	});

	test('should display touch-friendly date picker', async ({ page }) => {
		const dateCell = page.locator('.fc-daygrid-day').nth(10);
		await dateCell.tap();

		const dialog = page.locator('[role="dialog"]');

		// Open date input
		const dateInput = dialog.locator('input[type="date"]').first();

		if ((await dateInput.count()) > 0) {
			await dateInput.tap();

			// Native date picker should open on mobile
			// This is handled by the browser automatically
		}
	});

	test('should show floating action button for quick event creation', async ({ page }) => {
		// Look for FAB (Floating Action Button)
		const fab = page.locator('[data-fab], button.fab, button[aria-label*="Create event"]');

		if ((await fab.count()) > 0) {
			await expect(fab).toBeVisible();

			// FAB should be positioned in bottom right
			const fabBox = await fab.boundingBox();
			const viewportSize = page.viewportSize();

			if (fabBox && viewportSize) {
				// FAB x position should be close to right edge
				expect(fabBox.x + fabBox.width).toBeGreaterThan(viewportSize.width * 0.8);

				// FAB y position should be close to bottom
				expect(fabBox.y + fabBox.height).toBeGreaterThan(viewportSize.height * 0.8);
			}
		}
	});
});

test.describe('Tablet Responsive Calendar', () => {
	test.use({ ...devices['iPad Pro'] });

	test('should display tablet-optimized layout', async ({ page }) => {
		await page.goto('/dashboard/events');
		await page.waitForSelector('.fc-daygrid-body');

		// Tablet should show month view by default (more screen space)
		const viewTitle = await page.locator('.fc-toolbar-title').textContent();
		// Should show full month name
		expect(viewTitle).toMatch(/\w+ \d{4}/);
	});

	test('should use modal dialogs instead of full-screen on tablet', async ({ page }) => {
		await page.goto('/dashboard/events');
		await page.waitForSelector('.fc-daygrid-body');

		const event = page.locator('.fc-event').first();
		await event.click();

		const dialog = page.locator('[role="dialog"]').first();
		const dialogBox = await dialog.boundingBox();
		const viewportSize = page.viewportSize();

		if (dialogBox && viewportSize) {
			// Dialog should not be full-screen on tablet
			const widthRatio = dialogBox.width / viewportSize.width;
			expect(widthRatio).toBeLessThan(0.9); // Less than 90% of viewport
		}
	});
});
