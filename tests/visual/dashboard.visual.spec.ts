import { test, expect } from '@playwright/test';

/**
 * Visual Regression Tests for Dashboard
 *
 * These tests capture screenshots of key pages and compare them against
 * baseline images to detect unintended visual changes.
 *
 * To update baselines: npm run test:visual -- --update-snapshots
 */

test.describe('Dashboard Visual Regression', () => {
	test.beforeEach(async ({ page }) => {
		// Navigate to dashboard
		await page.goto('/dashboard');

		// Wait for page to be fully loaded
		await page.waitForLoadState('networkidle');
	});

	test('dashboard page matches snapshot', async ({ page }) => {
		// Wait for critical elements
		await page.waitForSelector('[data-testid="dashboard-container"]');

		// Take full page screenshot
		await expect(page).toHaveScreenshot('dashboard-full.png', {
			fullPage: true
		});
	});

	test('dashboard header matches snapshot', async ({ page }) => {
		const header = page.locator('header');
		await expect(header).toHaveScreenshot('dashboard-header.png');
	});

	test('dashboard main content matches snapshot', async ({ page }) => {
		const main = page.locator('main');
		await expect(main).toHaveScreenshot('dashboard-main.png');
	});

	test('dashboard with dark mode matches snapshot', async ({ page }) => {
		// Toggle dark mode
		await page.click('[data-testid="theme-toggle"]');
		await page.waitForTimeout(500); // Wait for theme transition

		await expect(page).toHaveScreenshot('dashboard-dark-mode.png', {
			fullPage: true
		});
	});
});

test.describe('Employee List Visual Regression', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/employees');
		await page.waitForLoadState('networkidle');
	});

	test('employee list page matches snapshot', async ({ page }) => {
		await page.waitForSelector('[data-testid="employee-table"]');
		await expect(page).toHaveScreenshot('employees-list.png', {
			fullPage: true
		});
	});

	test('employee card view matches snapshot', async ({ page }) => {
		// Switch to card view if available
		const cardViewButton = page.locator('[data-testid="view-card"]');
		if (await cardViewButton.isVisible()) {
			await cardViewButton.click();
			await page.waitForTimeout(300);
			await expect(page).toHaveScreenshot('employees-card-view.png');
		}
	});
});

test.describe('HR Portal Visual Regression', () => {
	test('time-off page matches snapshot', async ({ page }) => {
		await page.goto('/hr/time-off');
		await page.waitForLoadState('networkidle');
		await expect(page).toHaveScreenshot('hr-time-off.png', {
			fullPage: true
		});
	});

	test('performance reviews page matches snapshot', async ({ page }) => {
		await page.goto('/hr/performance');
		await page.waitForLoadState('networkidle');
		await expect(page).toHaveScreenshot('hr-performance.png', {
			fullPage: true
		});
	});
});

test.describe('Component Visual Regression', () => {
	test('modal dialog matches snapshot', async ({ page }) => {
		await page.goto('/dashboard');

		// Open a modal (adjust selector as needed)
		const openModalButton = page.locator('[data-testid="open-modal"]');
		if (await openModalButton.isVisible()) {
			await openModalButton.click();
			await page.waitForSelector('[role="dialog"]');

			const modal = page.locator('[role="dialog"]');
			await expect(modal).toHaveScreenshot('modal-dialog.png');
		}
	});

	test('notification toast matches snapshot', async ({ page }) => {
		await page.goto('/dashboard');

		// Trigger a notification (adjust as needed)
		const triggerButton = page.locator('[data-testid="trigger-toast"]');
		if (await triggerButton.isVisible()) {
			await triggerButton.click();
			await page.waitForSelector('[data-testid="toast"]');

			const toast = page.locator('[data-testid="toast"]');
			await expect(toast).toHaveScreenshot('notification-toast.png');
		}
	});
});
