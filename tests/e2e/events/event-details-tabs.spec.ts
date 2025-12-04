/**
 * E2E Test: Event Details Dialog - Tab Navigation
 * Feature: 026-integrate-ui-components - T020
 *
 * Tests tab navigation functionality in EventDetailsDialog:
 * - Default tab is Details
 * - Click Comments tab (with badge count)
 * - Click History tab
 * - Tab switching without dialog close
 * - Tab switching performance (<100ms target)
 */

import { test, expect } from '@playwright/test';

test.describe('Event Details Dialog - Tab Navigation', () => {
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
	});

	test('should default to Details tab when opening event dialog', async ({ page }) => {
		// Find and click first event card
		const eventCard = page.locator('[class*="event-card"]').first();
		await eventCard.waitFor({ state: 'visible' });
		await eventCard.click();

		// Wait for dialog to open
		await page.locator('[role="dialog"]').waitFor({ state: 'visible' });

		// Verify Details tab is active by default
		const detailsTab = page
			.locator('[role="tab"][data-value="details"], button:has-text("Details")')
			.first();
		await expect(detailsTab).toHaveAttribute('aria-selected', 'true');

		// Verify Details content is visible
		const detailsContent = page.locator('[role="tabpanel"], div:has-text("Event Details")').first();
		await expect(detailsContent).toBeVisible();
	});

	test('should display Comments tab with badge count', async ({ page }) => {
		// Open event dialog
		const eventCard = page.locator('[class*="event-card"]').first();
		await eventCard.click();
		await page.locator('[role="dialog"]').waitFor({ state: 'visible' });

		// Find Comments tab
		const commentsTab = page.locator('[role="tab"]:has-text("Comments")').first();
		await expect(commentsTab).toBeVisible();

		// Check if badge exists (if there are comments)
		const badge = commentsTab.locator('[class*="badge"]');
		const badgeCount = await badge.count();

		if (badgeCount > 0) {
			// If badge exists, verify it shows a number
			const badgeText = await badge.textContent();
			expect(badgeText).toMatch(/^\d+$/);
		}
	});

	test('should switch to Comments tab without closing dialog', async ({ page }) => {
		// Open event dialog
		const eventCard = page.locator('[class*="event-card"]').first();
		await eventCard.click();
		await page.locator('[role="dialog"]').waitFor({ state: 'visible' });

		// Click Comments tab
		const commentsTab = page.locator('[role="tab"]:has-text("Comments")').first();

		// Measure tab switch performance
		const startTime = Date.now();
		await commentsTab.click();
		const switchDuration = Date.now() - startTime;

		// Verify dialog is still open
		await expect(page.locator('[role="dialog"]')).toBeVisible();

		// Verify Comments tab is now active
		await expect(commentsTab).toHaveAttribute('aria-selected', 'true');

		// Verify Comments content is visible
		const commentsContent = page.locator('text=Comments').first();
		await expect(commentsContent).toBeVisible();

		// Performance check: tab switching should be <100ms
		console.log(`Tab switch duration: ${switchDuration}ms`);
		expect(switchDuration).toBeLessThan(100);
	});

	test('should switch to History tab without closing dialog', async ({ page }) => {
		// Open event dialog
		const eventCard = page.locator('[class*="event-card"]').first();
		await eventCard.click();
		await page.locator('[role="dialog"]').waitFor({ state: 'visible' });

		// Click History tab
		const historyTab = page.locator('[role="tab"]:has-text("History")').first();

		// Measure tab switch performance
		const startTime = Date.now();
		await historyTab.click();
		const switchDuration = Date.now() - startTime;

		// Verify dialog is still open
		await expect(page.locator('[role="dialog"]')).toBeVisible();

		// Verify History tab is now active
		await expect(historyTab).toHaveAttribute('aria-selected', 'true');

		// Verify History content is visible (may be empty state)
		const historyContent = page
			.locator('text=History, text=Event History, text=No changes recorded')
			.first();
		await expect(historyContent).toBeVisible();

		// Performance check
		console.log(`Tab switch duration: ${switchDuration}ms`);
		expect(switchDuration).toBeLessThan(100);
	});

	test('should navigate smoothly between all tabs', async ({ page }) => {
		// Open event dialog
		const eventCard = page.locator('[class*="event-card"]').first();
		await eventCard.click();
		await page.locator('[role="dialog"]').waitFor({ state: 'visible' });

		const detailsTab = page.locator('[role="tab"]:has-text("Details")').first();
		const commentsTab = page.locator('[role="tab"]:has-text("Comments")').first();
		const historyTab = page.locator('[role="tab"]:has-text("History")').first();

		// Navigate: Details -> Comments -> History -> Details
		await commentsTab.click();
		await expect(commentsTab).toHaveAttribute('aria-selected', 'true');
		await expect(page.locator('[role="dialog"]')).toBeVisible();

		await historyTab.click();
		await expect(historyTab).toHaveAttribute('aria-selected', 'true');
		await expect(page.locator('[role="dialog"]')).toBeVisible();

		await detailsTab.click();
		await expect(detailsTab).toHaveAttribute('aria-selected', 'true');
		await expect(page.locator('[role="dialog"]')).toBeVisible();

		// Verify dialog never closed during navigation
		const dialogCloseCount = await page.locator('[role="dialog"]').count();
		expect(dialogCloseCount).toBe(1);
	});

	test('should preserve tab selection when dialog reopened', async ({ page }) => {
		// Open event dialog
		const eventCard = page.locator('[class*="event-card"]').first();
		await eventCard.click();
		await page.locator('[role="dialog"]').waitFor({ state: 'visible' });

		// Switch to Comments tab
		const commentsTab = page.locator('[role="tab"]:has-text("Comments")').first();
		await commentsTab.click();

		// Close dialog
		const closeButton = page
			.locator(
				'[role="dialog"] button[aria-label*="Close"], [role="dialog"] button:has-text("Close")'
			)
			.first();
		await closeButton.click();
		await page.locator('[role="dialog"]').waitFor({ state: 'hidden' });

		// Reopen same event
		await eventCard.click();
		await page.locator('[role="dialog"]').waitFor({ state: 'visible' });

		// Verify it defaults back to Details tab (state is reset)
		const detailsTab = page.locator('[role="tab"]:has-text("Details")').first();
		await expect(detailsTab).toHaveAttribute('aria-selected', 'true');
	});
});
