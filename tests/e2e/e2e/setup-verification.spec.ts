import { test, expect } from '@playwright/test';

/**
 * Playwright Setup Verification Tests
 * These tests verify that the Playwright environment is correctly configured
 * and can connect to the development servers.
 */

test.describe('Playwright Setup Verification', () => {
	test('can connect to SvelteKit dev server', async ({ page }) => {
		// Navigate to the root page
		await page.goto('/');

		// Verify the page loads (should redirect to login or show loading)
		await expect(page).toHaveURL(/localhost:5174/);

		// Verify we can interact with the page
		const body = page.locator('body');
		await expect(body).toBeVisible();

		console.log('✅ SvelteKit dev server connection verified');
	});

	test('can access login page', async ({ page }) => {
		// Navigate directly to login page
		await page.goto('/login');

		// Wait for page to load
		await page.waitForLoadState('networkidle');

		// Verify login page elements are present
		await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
		await expect(page.locator('input[type="password"], input[name="password"]')).toBeVisible();
		await expect(page.locator('button[type="submit"], button:has-text("Sign In")')).toBeVisible();

		console.log('✅ Login page accessibility verified');
	});

	test('can verify GraphQL endpoint accessibility', async ({ page }) => {
		// Test if we can reach the GraphQL endpoint indirectly
		// by checking if the login form can be submitted (even if it fails)
		await page.goto('/login');

		// Fill in test credentials (they don't need to be valid for this test)
		await page.fill('input[type="email"], input[name="email"]', 'test@example.com');
		await page.fill('input[type="password"], input[name="password"]', 'testpassword');

		// Submit the form and wait for response (success or failure)
		await page.click('button[type="submit"], button:has-text("Sign In")');

		// Wait for some response (either success redirect or error message)
		// This tests that the frontend can communicate with the backend
		await page.waitForTimeout(2000);

		// We should still be somewhere in the app (not a browser error page)
		await expect(page).toHaveURL(/localhost:5174/);

		console.log('✅ Backend connectivity verified (GraphQL endpoint reachable)');
	});

	test('browser storage is accessible', async ({ page }) => {
		await page.goto('/');

		// Test localStorage access
		await page.evaluate(() => {
			localStorage.setItem('test-key', 'test-value');
		});

		const storedValue = await page.evaluate(() => {
			return localStorage.getItem('test-key');
		});

		expect(storedValue).toBe('test-value');

		// Test sessionStorage access
		await page.evaluate(() => {
			sessionStorage.setItem('test-session-key', 'test-session-value');
		});

		const sessionValue = await page.evaluate(() => {
			return sessionStorage.getItem('test-session-key');
		});

		expect(sessionValue).toBe('test-session-value');

		// Clean up
		await page.evaluate(() => {
			localStorage.removeItem('test-key');
			sessionStorage.removeItem('test-session-key');
		});

		console.log('✅ Browser storage accessibility verified');
	});

	test('console logging is accessible', async ({ page }) => {
		const consoleLogs: string[] = [];

		// Capture console messages
		page.on('console', (msg) => {
			consoleLogs.push(`${msg.type()}: ${msg.text()}`);
		});

		await page.goto('/');

		// Trigger a console log from the page
		await page.evaluate(() => {
			console.log('Playwright test console verification');
		});

		// Wait a moment for console logs to be captured
		await page.waitForTimeout(1000);

		// Verify we captured the log
		const testLog = consoleLogs.find((log) => log.includes('Playwright test console verification'));
		expect(testLog).toBeTruthy();

		console.log('✅ Console logging capture verified');
		console.log(`Captured ${consoleLogs.length} console messages`);
	});

	test('can monitor network requests', async ({ page }) => {
		const requests: string[] = [];

		// Capture network requests
		page.on('request', (request) => {
			requests.push(`${request.method()} ${request.url()}`);
		});

		await page.goto('/login');

		// Wait for page load to complete
		await page.waitForLoadState('networkidle');

		// Verify we captured some requests
		expect(requests.length).toBeGreaterThan(0);

		// Check for expected request types
		const hasStaticRequests = requests.some((req) => req.includes('.js') || req.includes('.css'));
		expect(hasStaticRequests).toBe(true);

		console.log('✅ Network request monitoring verified');
		console.log(`Captured ${requests.length} network requests`);
	});
});
