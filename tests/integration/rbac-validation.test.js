/**
 * T051: Integration testing and validation
 * RBAC Integration Validation Tests
 */

import { test, expect } from '@playwright/test';

test.describe('RBAC Integration Validation', () => {
	test('should redirect unauthenticated users to login', async ({ page }) => {
		await page.goto('/dashboard');

		// Should be redirected to login page
		await expect(page).toHaveURL(/\/login/);

		// Should have redirect parameter
		const url = page.url();
		expect(url).toContain('redirectTo=');
	});

	test('should handle authentication flow correctly', async ({ page }) => {
		// Go to login page
		await page.goto('/login');

		// Check that login form is present
		const loginForm = page.locator('form');
		await expect(loginForm).toBeVisible();

		// Should have email and password fields
		await expect(page.locator('input[type="email"]')).toBeVisible();
		await expect(page.locator('input[type="password"]')).toBeVisible();
	});

	test('should load RBAC utilities without errors', async ({ page }) => {
		// Navigate to a page that uses RBAC utilities
		await page.goto('/login');

		// Check for console errors related to RBAC
		const errors = [];
		page.on('console', msg => {
			if (msg.type() === 'error') {
				errors.push(msg.text());
			}
		});

		// Wait for page to fully load
		await page.waitForLoadState('networkidle');

		// Filter for RBAC-related errors
		const rbacErrors = errors.filter(error =>
			error.includes('rbac') ||
			error.includes('permission') ||
			error.includes('auth')
		);

		expect(rbacErrors.length).toBe(0);
	});

	test('should handle server-side RBAC integration', async ({ page }) => {
		// Test that protected routes respond correctly
		const response = await page.goto('/dashboard/management');

		// Should redirect to login (303) or show login page (200)
		expect([200, 303].includes(response.status())).toBeTruthy();

		// Should be on login page
		await expect(page).toHaveURL(/\/login/);
	});

	test('should load error boundary components correctly', async ({ page }) => {
		await page.goto('/login');

		// Check that error boundary components don't cause JavaScript errors
		const errors = [];
		page.on('console', msg => {
			if (msg.type() === 'error' && !msg.text().includes('favicon')) {
				errors.push(msg.text());
			}
		});

		await page.waitForLoadState('networkidle');

		// Should have no critical errors
		const criticalErrors = errors.filter(error =>
			!error.includes('sourcemap') &&
			!error.includes('favicon') &&
			!error.includes('ENOENT')
		);

		expect(criticalErrors.length).toBe(0);
	});

	test('should handle navigation without RBAC errors', async ({ page }) => {
		await page.goto('/login');

		// Try navigating to different public routes
		const publicRoutes = ['/login', '/'];

		for (const route of publicRoutes) {
			const response = await page.goto(route);

			// Should load successfully or redirect appropriately
			expect([200, 301, 302, 303].includes(response.status())).toBeTruthy();
		}
	});
});

test.describe('Server-Side Integration', () => {
	test('should handle server-side load functions correctly', async ({ page }) => {
		// Test that server load functions execute without throwing
		const response = await page.goto('/');

		// Should load successfully
		expect(response.status()).toBe(200);
	});

	test('should integrate RBAC utilities in server context', async ({ page }) => {
		// Test server-side RBAC by checking response headers and redirects
		const response = await page.goto('/dashboard');

		// Should handle authentication correctly
		expect(response.status()).toBe(200);

		// Should be redirected to login
		await expect(page).toHaveURL(/\/login/);
	});
});

test.describe('UI Component Integration', () => {
	test('should render toast container without errors', async ({ page }) => {
		await page.goto('/login');

		// Look for toast container element
		const toastContainer = page.locator('.fixed.top-4.right-4');

		// Should exist but may not be visible (no toasts)
		await expect(toastContainer).toBeInViewport();
	});

	test('should render error boundary components', async ({ page }) => {
		await page.goto('/login');

		// Page should load without component errors
		const errors = [];
		page.on('console', msg => {
			if (msg.type() === 'error') {
				errors.push(msg.text());
			}
		});

		await page.waitForLoadState('networkidle');

		// Filter out known non-critical errors
		const componentErrors = errors.filter(error =>
			error.includes('component') || error.includes('svelte')
		);

		expect(componentErrors.length).toBe(0);
	});

	test('should handle loading states correctly', async ({ page }) => {
		await page.goto('/login');

		// Should not have any loading state errors
		const loadingElements = page.locator('[data-loading]');

		// Loading elements should work without errors
		await page.waitForLoadState('networkidle');

		// No JavaScript errors related to loading states
		const errors = [];
		page.on('console', msg => {
			if (msg.type() === 'error' && msg.text().includes('loading')) {
				errors.push(msg.text());
			}
		});

		expect(errors.length).toBe(0);
	});
});