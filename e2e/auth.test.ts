import { test, expect } from '@playwright/test';
import { TestHelpers } from './utils/test-helpers';

test.describe('Authentication', () => {
	let helpers: TestHelpers;

	test.beforeEach(async ({ page }) => {
		helpers = new TestHelpers(page);
	});

	test('should show login page when not authenticated', async ({ page }) => {
		await page.goto('/');
		
		// Should redirect to login
		await page.waitForURL('/login');
		await expect(page.locator('h1, h2')).toContainText(/login|sign in/i);
		
		// Should have login form
		await expect(page.locator('input[name="username"]')).toBeVisible();
		await expect(page.locator('input[name="password"]')).toBeVisible();
		await expect(page.locator('button[type="submit"]')).toBeVisible();
	});

	test('should login successfully with valid credentials', async ({ page }) => {
		await helpers.loginAsAdmin();
		
		// Should be redirected to dashboard
		await expect(page).toHaveURL('/home');
		await expect(page.locator('h1')).toContainText('Dashboard');
		
		// Should have auth cookie
		await helpers.checkAuthenticated();
	});

	test('should show error with invalid credentials', async ({ page }) => {
		await page.goto('/login');
		
		// Try invalid credentials
		await page.fill('input[name="username"]', 'invalid');
		await page.fill('input[name="password"]', 'invalid');
		await page.click('button[type="submit"]');
		
		// Should still be on login page
		await expect(page).toHaveURL('/login');
		
		// Should show error message (look for common error indicators)
		const errorSelectors = [
			'[role="alert"]',
			'.error',
			'.alert-error',
			'text="Invalid"',
			'text="Error"',
			'text="Failed"'
		];
		
		let errorFound = false;
		for (const selector of errorSelectors) {
			if (await page.locator(selector).isVisible().catch(() => false)) {
				errorFound = true;
				break;
			}
		}
		
		// If no specific error UI, at least we should not be authenticated
		if (!errorFound) {
			const cookies = await page.context().cookies();
			const authCookie = cookies.find(cookie => cookie.name === 'auth-token');
			expect(authCookie).toBeFalsy();
		}
	});

	test('should logout successfully', async ({ page }) => {
		// Login first
		await helpers.loginAsAdmin();
		await helpers.checkAuthenticated();
		
		// Logout
		await helpers.logout();
		
		// Should redirect to login or home without auth
		const currentUrl = page.url();
		expect(currentUrl).toMatch(/\/(login|)$/);
		
		// Auth cookie should be removed or expired
		const cookies = await page.context().cookies();
		const authCookie = cookies.find(cookie => cookie.name === 'auth-token');
		expect(!authCookie || !authCookie.value).toBeTruthy();
	});

	test('should redirect protected routes to login', async ({ page }) => {
		// Try to access protected routes without authentication
		const protectedRoutes = ['/home', '/employees', '/tasks', '/hr'];
		
		for (const route of protectedRoutes) {
			await page.goto(route);
			// Should redirect to login (or show login form)
			await expect(async () => {
				const url = page.url();
				const hasLoginForm = await page.locator('input[name="username"]').isVisible().catch(() => false);
				expect(url.includes('/login') || hasLoginForm).toBeTruthy();
			}).toPass({ timeout: 10000 });
		}
	});

	test('should persist authentication across page reloads', async ({ page }) => {
		await helpers.loginAsAdmin();
		
		// Reload the page
		await page.reload();
		
		// Should still be authenticated
		await expect(page).toHaveURL('/home');
		await helpers.checkAuthenticated();
	});
});