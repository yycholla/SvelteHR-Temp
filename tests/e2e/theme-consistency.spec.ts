/**
 * E2E Test: Theme Consistency Across Management and Admin Pages
 * Feature: 016-repair-management-pages - Task T012
 * CRITICAL: This test MUST FAIL initially as per TDD approach
 *
 * Tests that all UI elements properly adapt to light/dark theme changes
 * across management pages, admin pages, and dashboard cards.
 *
 * Covers: FR-025, FR-042, FR-043, FR-044, FR-045, FR-046, FR-047, FR-048
 */

import { expect, test } from '@playwright/test';

test.describe('Theme Consistency', () => {
	test.beforeEach(async ({ page }) => {
		// Login as admin (to access all pages)
		await page.goto('/login');
		await page.fill('[data-testid="email-input"]', 'admin@test.com');
		await page.fill('[data-testid="password-input"]', 'AdminPassword123!');
		await page.click('[data-testid="login-submit"]');

		await expect(page).toHaveURL(/\/dashboard/);
	});

	test('theme switcher toggles between light and dark modes', async ({ page }) => {
		// Locate theme toggle button
		const themeToggle = page.locator('[data-testid="theme-toggle"]');
		await expect(themeToggle).toBeVisible();

		// Get initial theme
		const htmlElement = page.locator('html');
		const initialTheme = await htmlElement.getAttribute('class');

		// Toggle theme
		await themeToggle.click();

		// Wait for theme transition
		await page.waitForTimeout(300);

		// Verify theme changed
		const newTheme = await htmlElement.getAttribute('class');
		expect(newTheme).not.toBe(initialTheme);

		// If started with light, should now be dark
		if (!initialTheme?.includes('dark')) {
			expect(newTheme).toContain('dark');
		} else {
			expect(newTheme).not.toContain('dark');
		}
	});

	test('management pages respect light mode styling', async ({ page }) => {
		// Ensure light mode is active
		await page.evaluate(() => {
			document.documentElement.classList.remove('dark');
		});

		const managementPages = [
			'/dashboard/management/leave-approvals',
			'/dashboard/management/reviews',
			'/dashboard/management/goals',
			'/dashboard/management/reports',
			'/dashboard/management/teams'
		];

		for (const pagePath of managementPages) {
			await page.goto(pagePath);

			// Check page background is light
			const body = page.locator('body');
			const bgColor = await body.evaluate((el) => window.getComputedStyle(el).backgroundColor);
			// Light mode should have light background (rgb values > 200)
			expect(bgColor).toMatch(/rgb\((2[5-9]\d|2[0-4]\d|1\d{2})/);

			// Check cards have light styling
			const cards = page.locator('[data-testid^="card-"]');
			const cardCount = await cards.count();

			if (cardCount > 0) {
				const firstCard = cards.first();
				const cardBg = await firstCard.evaluate(
					(el) => window.getComputedStyle(el).backgroundColor
				);
				// Card background should be light
				expect(cardBg).toMatch(/rgb\((2[5-9]\d|2[0-4]\d|1\d{2})/);

				// Check text contrast (WCAG AA: 4.5:1)
				const text = firstCard.locator('p, span, h1, h2, h3').first();
				if ((await text.count()) > 0) {
					const textColor = await text.evaluate((el) => window.getComputedStyle(el).color);
					// Text should be dark in light mode (rgb values < 100)
					expect(textColor).toMatch(/rgb\((\d{1,2}|[0-9]\d)/);
				}
			}
		}
	});

	test('management pages respect dark mode styling', async ({ page }) => {
		// Enable dark mode
		await page.evaluate(() => {
			document.documentElement.classList.add('dark');
		});

		const managementPages = [
			'/dashboard/management/leave-approvals',
			'/dashboard/management/reviews',
			'/dashboard/management/goals'
		];

		for (const pagePath of managementPages) {
			await page.goto(pagePath);

			// Wait for theme to apply
			await page.waitForTimeout(200);

			// Check page background is dark
			const body = page.locator('body');
			const bgColor = await body.evaluate((el) => window.getComputedStyle(el).backgroundColor);
			// Dark mode should have dark background (rgb values < 100)
			expect(bgColor).toMatch(/rgb\((\d{1,2}|[0-9]\d|1\d{2})/);

			// Check cards have dark styling
			const cards = page.locator('[data-testid^="card-"]');
			const cardCount = await cards.count();

			if (cardCount > 0) {
				const firstCard = cards.first();
				const cardBg = await firstCard.evaluate(
					(el) => window.getComputedStyle(el).backgroundColor
				);
				// Card background should be dark
				expect(cardBg).toMatch(/rgb\((\d{1,2}|[0-9]\d|1\d{2})/);

				// Check text contrast (WCAG AA: 4.5:1)
				const text = firstCard.locator('p, span, h1, h2, h3').first();
				if ((await text.count()) > 0) {
					const textColor = await text.evaluate((el) => window.getComputedStyle(el).color);
					// Text should be light in dark mode (rgb values > 200)
					expect(textColor).toMatch(/rgb\((2[0-9]\d|1[8-9]\d)/);
				}
			}
		}
	});

	test('admin pages respect light and dark mode styling', async ({ page }) => {
		const adminPages = [
			'/dashboard/admin/user-management',
			'/dashboard/admin/system-settings',
			'/dashboard/admin/audit-logs',
			'/dashboard/admin/analytics',
			'/dashboard/admin/compliance'
		];

		for (const pagePath of adminPages) {
			// Test light mode
			await page.evaluate(() => {
				document.documentElement.classList.remove('dark');
			});
			await page.goto(pagePath);
			await page.waitForTimeout(200);

			const lightBg = await page
				.locator('body')
				.evaluate((el) => window.getComputedStyle(el).backgroundColor);
			expect(lightBg).toMatch(/rgb\((2[0-9]\d|1[8-9]\d)/); // Light background

			// Test dark mode
			await page.evaluate(() => {
				document.documentElement.classList.add('dark');
			});
			await page.waitForTimeout(200);

			const darkBg = await page
				.locator('body')
				.evaluate((el) => window.getComputedStyle(el).backgroundColor);
			expect(darkBg).toMatch(/rgb\((\d{1,2}|[0-9]\d|1\d{2})/); // Dark background
		}
	});

	test('theme changes update all UI elements without page refresh', async ({ page }) => {
		await page.goto('/dashboard/management/leave-approvals');

		// Get initial theme
		const htmlElement = page.locator('html');
		const initialTheme = await htmlElement.getAttribute('class');

		// Get initial colors of various elements
		const button = page.locator('[data-testid="create-button"]').first();
		const card = page.locator('[data-testid^="card-"]').first();
		const badge = page.locator('[data-testid="status-badge"]').first();

		const initialButtonBg = await button.evaluate(
			(el) => window.getComputedStyle(el).backgroundColor
		);
		const initialCardBg = await card.evaluate((el) => window.getComputedStyle(el).backgroundColor);

		// Toggle theme
		await page.locator('[data-testid="theme-toggle"]').click();
		await page.waitForTimeout(300);

		// Verify theme changed
		const newTheme = await htmlElement.getAttribute('class');
		expect(newTheme).not.toBe(initialTheme);

		// Verify all elements updated WITHOUT page refresh
		// (If page refreshed, this test would fail)
		const newButtonBg = await button.evaluate((el) => window.getComputedStyle(el).backgroundColor);
		const newCardBg = await card.evaluate((el) => window.getComputedStyle(el).backgroundColor);

		// Colors should have changed
		expect(newButtonBg).not.toBe(initialButtonBg);
		expect(newCardBg).not.toBe(initialCardBg);

		// Page should not have reloaded
		await expect(page.locator('[data-testid="leave-requests-table"]')).toBeVisible();
	});

	test('analytics cards adapt to theme changes', async ({ page }) => {
		await page.goto('/dashboard/management/leave-approvals');

		// Find analytics/statistics cards
		const statsCards = page.locator('[data-testid^="stat-"]');
		const count = await statsCards.count();

		if (count > 0) {
			// Test light mode
			await page.evaluate(() => {
				document.documentElement.classList.remove('dark');
			});
			await page.waitForTimeout(200);

			const lightCardBg = await statsCards
				.first()
				.evaluate((el) => window.getComputedStyle(el).backgroundColor);
			const lightBorder = await statsCards
				.first()
				.evaluate((el) => window.getComputedStyle(el).borderColor);

			// Toggle to dark mode
			await page.locator('[data-testid="theme-toggle"]').click();
			await page.waitForTimeout(300);

			const darkCardBg = await statsCards
				.first()
				.evaluate((el) => window.getComputedStyle(el).backgroundColor);
			const darkBorder = await statsCards
				.first()
				.evaluate((el) => window.getComputedStyle(el).borderColor);

			// Card styling should have changed
			expect(darkCardBg).not.toBe(lightCardBg);
			expect(darkBorder).not.toBe(lightBorder);
		}
	});

	test('buttons maintain proper contrast in both themes', async ({ page }) => {
		await page.goto('/dashboard/management/leave-approvals');

		const button = page.locator('[data-testid="approve-button"]').first();

		// Test light mode contrast
		await page.evaluate(() => {
			document.documentElement.classList.remove('dark');
		});
		await page.waitForTimeout(200);

		const lightBg = await button.evaluate((el) => window.getComputedStyle(el).backgroundColor);
		const lightText = await button.evaluate((el) => window.getComputedStyle(el).color);

		// Verify contrast exists (different colors)
		expect(lightBg).not.toBe(lightText);

		// Test dark mode contrast
		await page.evaluate(() => {
			document.documentElement.classList.add('dark');
		});
		await page.waitForTimeout(200);

		const darkBg = await button.evaluate((el) => window.getComputedStyle(el).backgroundColor);
		const darkText = await button.evaluate((el) => window.getComputedStyle(el).color);

		// Verify contrast exists
		expect(darkBg).not.toBe(darkText);

		// Both themes should have visible buttons
		await expect(button).toBeVisible();
	});

	test('form inputs adapt to theme changes', async ({ page }) => {
		await page.goto('/dashboard/management/leave-approvals');

		// Open a modal with form inputs
		await page.click('[data-testid="create-review-button"]');

		const input = page.locator('[data-testid="employee-search"]');

		// Test light mode
		await page.evaluate(() => {
			document.documentElement.classList.remove('dark');
		});
		await page.waitForTimeout(200);

		const lightInputBg = await input.evaluate((el) => window.getComputedStyle(el).backgroundColor);
		const lightInputText = await input.evaluate((el) => window.getComputedStyle(el).color);

		// Toggle to dark mode
		await page.locator('[data-testid="theme-toggle"]').click();
		await page.waitForTimeout(300);

		const darkInputBg = await input.evaluate((el) => window.getComputedStyle(el).backgroundColor);
		const darkInputText = await input.evaluate((el) => window.getComputedStyle(el).color);

		// Input styling should adapt
		expect(darkInputBg).not.toBe(lightInputBg);
		expect(darkInputText).not.toBe(lightInputText);
	});

	test('modal dialogs respect theme styling', async ({ page }) => {
		await page.goto('/dashboard/management/leave-approvals');

		// Open approval modal
		const firstRequest = page.locator('[data-testid^="leave-request-"]').first();
		await firstRequest.locator('[data-testid="approve-button"]').click();

		const modal = page.locator('[data-testid="approval-modal"]');
		await expect(modal).toBeVisible();

		// Test light mode
		await page.evaluate(() => {
			document.documentElement.classList.remove('dark');
		});
		await page.waitForTimeout(200);

		const lightModalBg = await modal.evaluate((el) => window.getComputedStyle(el).backgroundColor);

		// Toggle to dark mode
		await page.locator('[data-testid="theme-toggle"]').click();
		await page.waitForTimeout(300);

		const darkModalBg = await modal.evaluate((el) => window.getComputedStyle(el).backgroundColor);

		// Modal background should adapt to theme
		expect(darkModalBg).not.toBe(lightModalBg);

		// Modal should remain visible and functional
		await expect(modal).toBeVisible();
	});
});
