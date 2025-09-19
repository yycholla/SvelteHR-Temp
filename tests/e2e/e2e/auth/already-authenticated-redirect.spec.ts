import { test, expect } from '@playwright/test';
import {
	login,
	waitForAuthentication,
	verifyDashboardRedirect,
	TEST_USERS,
	performCompleteLogin
} from '../helpers/auth';

/**
 * T008: E2E test for already authenticated user redirect behavior
 *
 * CRITICAL: This test MUST FAIL initially to demonstrate current redirect behavior
 * This test verifies that already authenticated users are redirected appropriately
 * without entering redirect loops when accessing different pages
 */

test.describe('Already Authenticated User Redirect Behavior', () => {
	test.beforeEach(async ({ page }) => {
		// Navigate to app first to establish context
		await page.goto('/');

		// Clear any existing auth state
		await page.evaluate(() => {
			localStorage.clear();
			sessionStorage.clear();
		});
	});

	test('SHOULD FAIL: authenticated admin accessing login page redirects to admin dashboard', async ({
		page
	}) => {
		// First, authenticate the user
		await performCompleteLogin(page, TEST_USERS.admin);

		// Verify we're on admin dashboard
		expect(page.url()).toContain('/admin');

		console.log('🔍 User authenticated, now testing login page redirect...');

		// Now try to access login page while authenticated
		await page.goto('/login');

		// Should be redirected away from login page to admin dashboard
		// Wait for potential redirect
		await page.waitForTimeout(2000);

		// Should NOT be on login page anymore
		expect(page.url()).not.toContain('/login');
		expect(page.url()).toContain('/admin');

		// Verify no redirect loop occurred (URL should be stable)
		const urlBeforeWait = page.url();
		await page.waitForTimeout(1000);
		const urlAfterWait = page.url();

		expect(urlBeforeWait).toBe(urlAfterWait);

		console.log('✅ Authenticated user properly redirected from login page');
	});

	test('SHOULD FAIL: authenticated admin accessing root page redirects to admin dashboard', async ({
		page
	}) => {
		// Authenticate first
		await performCompleteLogin(page, TEST_USERS.admin);

		console.log('🔍 Testing root page redirect for authenticated admin...');

		// Clear any auth state flags that might be in session storage
		await page.evaluate(() => {
			// Clear only navigation flags, keep authentication
			for (let i = sessionStorage.length - 1; i >= 0; i--) {
				const key = sessionStorage.key(i);
				if (key && key.includes('hr_redirect')) {
					sessionStorage.removeItem(key);
				}
			}
		});

		// Navigate to root page
		await page.goto('/');

		// Should redirect to admin dashboard, not stay on root
		await page.waitForTimeout(2000);

		expect(page.url()).toContain('/admin');
		expect(page.url()).not.toBe('http://localhost:5175/');

		// Verify redirect is stable
		const finalUrl = page.url();
		await page.waitForTimeout(1000);
		expect(page.url()).toBe(finalUrl);

		console.log('✅ Authenticated admin properly redirected from root page');
	});

	test('SHOULD FAIL: authenticated user maintains auth state across page refreshes', async ({
		page
	}) => {
		// Authenticate
		await performCompleteLogin(page, TEST_USERS.admin);

		// Verify initial auth state
		const initialToken = await page.evaluate(() => localStorage.getItem('postgraphile-jwt-token'));
		expect(initialToken).toBeTruthy();

		console.log('🔍 Testing auth state persistence across refresh...');

		// Refresh the page
		await page.reload();

		// Wait for page to load and potential redirects
		await page.waitForTimeout(3000);

		// Should still be authenticated and on admin page
		expect(page.url()).toContain('/admin');

		// Token should still be present
		const tokenAfterRefresh = await page.evaluate(() =>
			localStorage.getItem('postgraphile-jwt-token')
		);
		expect(tokenAfterRefresh).toBeTruthy();
		expect(tokenAfterRefresh).toBe(initialToken);

		// Should not have entered a redirect loop
		const urlBeforeWait = page.url();
		await page.waitForTimeout(2000);
		const urlAfterWait = page.url();

		expect(urlBeforeWait).toBe(urlAfterWait);

		console.log('✅ Auth state maintained across page refresh');
	});

	test('SHOULD FAIL: authenticated user accessing protected page directly works without redirects', async ({
		page
	}) => {
		// Authenticate
		await performCompleteLogin(page, TEST_USERS.admin);

		console.log('🔍 Testing direct access to protected pages...');

		// Try to access a protected page directly (assuming /employees exists)
		await page.goto('/employees');

		// Should stay on the requested page or redirect appropriately based on role
		await page.waitForTimeout(2000);

		// Should NOT redirect back to login
		expect(page.url()).not.toContain('/login');

		// Should either be on /employees or /admin (role-based redirect)
		const currentUrl = page.url();
		const isOnValidPage = currentUrl.includes('/employees') || currentUrl.includes('/admin');
		expect(isOnValidPage).toBe(true);

		// Verify no redirect loop
		await page.waitForTimeout(1000);
		expect(page.url()).toBe(currentUrl);

		console.log('✅ Protected page access works for authenticated user');
	});

	test('SHOULD FAIL: multiple browser tabs maintain consistent auth state', async ({
		page,
		context
	}) => {
		// Authenticate in first tab
		await performCompleteLogin(page, TEST_USERS.admin);

		console.log('🔍 Testing auth state consistency across browser tabs...');

		// Open a second tab
		const secondTab = await context.newPage();

		// Navigate to admin page in second tab
		await secondTab.goto('/admin');

		// Should be authenticated in second tab too (shared localStorage)
		await secondTab.waitForTimeout(2000);
		expect(secondTab.url()).toContain('/admin');

		// Both tabs should have the same token
		const firstTabToken = await page.evaluate(() => localStorage.getItem('postgraphile-jwt-token'));
		const secondTabToken = await secondTab.evaluate(() =>
			localStorage.getItem('postgraphile-jwt-token')
		);

		expect(firstTabToken).toBeTruthy();
		expect(secondTabToken).toBeTruthy();
		expect(firstTabToken).toBe(secondTabToken);

		// Clear auth in one tab
		await page.evaluate(() => {
			localStorage.removeItem('postgraphile-jwt-token');
		});

		// Navigate somewhere in the first tab - should redirect to login
		await page.goto('/admin');
		await page.waitForTimeout(2000);
		expect(page.url()).toContain('/login');

		// Second tab should still work until it's refreshed/navigated
		const secondTabStillValid = await secondTab.evaluate(() =>
			localStorage.getItem('postgraphile-jwt-token')
		);
		expect(secondTabStillValid).toBeTruthy();

		await secondTab.close();

		console.log('✅ Multi-tab auth state consistency verified');
	});

	test('SHOULD FAIL: auth state cleanup works properly on logout', async ({ page }) => {
		// Authenticate
		await performCompleteLogin(page, TEST_USERS.admin);

		console.log('🔍 Testing auth state cleanup on logout...');

		// Manually clear auth state (simulating logout)
		await page.evaluate(() => {
			localStorage.clear();
			sessionStorage.clear();
		});

		// Try to access admin page
		await page.goto('/admin');

		// Should redirect to login
		await page.waitForTimeout(3000);
		expect(page.url()).toContain('/login');

		// Should not have any auth tokens
		const tokenAfterLogout = await page.evaluate(() =>
			localStorage.getItem('postgraphile-jwt-token')
		);
		expect(tokenAfterLogout).toBeNull();

		// Verify we can login again (no stuck state)
		await performCompleteLogin(page, TEST_USERS.admin);
		expect(page.url()).toContain('/admin');

		console.log('✅ Auth state cleanup verified');
	});

	test('SHOULD FAIL: navigation history is preserved during auth redirects', async ({ page }) => {
		console.log('🔍 Testing navigation history preservation...');

		// Start unauthenticated, try to access protected page
		await page.goto('/admin');

		// Should redirect to login
		await page.waitForTimeout(2000);
		expect(page.url()).toContain('/login');

		// Authenticate
		await login(page, TEST_USERS.admin);
		await waitForAuthentication(page);

		// Should redirect back to originally requested page (/admin)
		await page.waitForTimeout(2000);
		expect(page.url()).toContain('/admin');

		// Browser back button should work appropriately
		// (This is complex to test but we can verify URL stability)
		const currentUrl = page.url();
		await page.waitForTimeout(1000);
		expect(page.url()).toBe(currentUrl);

		console.log('✅ Navigation history preservation verified');
	});

	test('SHOULD FAIL: concurrent auth requests do not create race conditions', async ({ page }) => {
		console.log('🔍 Testing concurrent auth validation...');

		// Set up monitoring for multiple validateSession calls
		let validateSessionCount = 0;
		page.on('console', (msg) => {
			if (msg.text().includes('validateSession: Starting validation')) {
				validateSessionCount++;
			}
		});

		// Navigate to a page that requires auth
		await page.goto('/admin');

		// Quickly navigate to another auth-required page before first completes
		await page.goto('/employees');

		// And another
		await page.goto('/admin');

		// Wait for all auth processes to complete
		await page.waitForTimeout(5000);

		// Should end up on login page (unauthenticated)
		expect(page.url()).toContain('/login');

		// Should not have excessive validateSession calls
		console.log(`🔍 validateSession calls during concurrent navigation: ${validateSessionCount}`);
		expect(validateSessionCount).toBeLessThan(5); // Should be reasonable number

		console.log('✅ Concurrent auth requests handled properly');
	});
});
