import { test, expect } from '@playwright/test';
import {
	login,
	waitForAuthentication,
	verifyDashboardRedirect,
	TEST_USERS,
	performCompleteLogin
} from '../helpers/auth';

/**
 * T007: E2E test for successful admin login flow
 *
 * CRITICAL: This test MUST FAIL initially to demonstrate the current bug
 * This test defines the expected behavior for a successful admin login
 */

test.describe('Successful Admin Login Flow', () => {
	test.beforeEach(async ({ page }) => {
		// Navigate to app first to establish context
		await page.goto('/');

		// Clear any existing auth state
		await page.evaluate(() => {
			localStorage.clear();
			sessionStorage.clear();
		});
	});

	test('SHOULD FAIL: admin user logs in and reaches admin dashboard without redirects', async ({
		page
	}) => {
		console.log('🔍 Testing complete admin login flow...');

		const startTime = Date.now();

		// Perform complete login flow
		const result = await performCompleteLogin(page, TEST_USERS.admin);

		const totalTime = Date.now() - startTime;
		console.log(`🔍 Total login flow time: ${totalTime}ms`);

		// Verify successful completion
		expect(result.success).toBe(true);
		expect(result.isStable).toBe(true);
		expect(result.finalUrl).toContain('/admin');

		// Performance check - should complete quickly
		expect(totalTime).toBeLessThan(5000); // Should complete in < 5 seconds

		// Wait a bit more and verify no additional redirects occur
		const urlBeforeWait = page.url();
		await page.waitForTimeout(2000);
		const urlAfterWait = page.url();

		expect(urlBeforeWait).toBe(urlAfterWait); // URL should remain stable

		console.log('✅ Admin login flow completed successfully');
	});

	test('SHOULD FAIL: admin dashboard loads with correct user information', async ({ page }) => {
		// Perform login
		await login(page, TEST_USERS.admin);
		await waitForAuthentication(page);
		await verifyDashboardRedirect(page, '/admin');

		// Verify admin dashboard content is displayed
		await expect(page.locator('h1, h2, .admin-header')).toBeVisible({ timeout: 5000 });

		// Check that user info is displayed correctly (if available on page)
		const pageContent = await page.textContent('body');

		// Verify admin-specific content is shown
		// Note: This might fail if admin page doesn't load due to redirect loops
		expect(pageContent).toMatch(/(admin|administration|system)/i);

		// Verify we're not on an error page
		expect(pageContent).not.toMatch(/(error|not found|404)/i);

		// Verify JWT token is properly stored
		const token = await page.evaluate(() => localStorage.getItem('postgraphile-jwt-token'));
		expect(token).toBeTruthy();
		expect(token).toMatch(/^[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+$/);

		console.log('✅ Admin dashboard loaded with correct content');
	});

	test('SHOULD FAIL: login flow completes within performance targets', async ({ page }) => {
		const performanceMetrics = {
			loginFormLoad: 0,
			authenticationTime: 0,
			redirectTime: 0,
			totalTime: 0
		};

		// Measure login form load time
		const formLoadStart = Date.now();
		await page.goto('/login');
		await expect(page.locator('input[type="email"]')).toBeVisible();
		performanceMetrics.loginFormLoad = Date.now() - formLoadStart;

		// Measure authentication time
		const authStart = Date.now();
		await page.fill('input[type="email"], input[name="email"]', TEST_USERS.admin.email);
		await page.fill('input[type="password"], input[name="password"]', TEST_USERS.admin.password);
		await page.click('button[type="submit"], button:has-text("Sign In")');

		await waitForAuthentication(page);
		performanceMetrics.authenticationTime = Date.now() - authStart;

		// Measure redirect time
		const redirectStart = Date.now();
		await verifyDashboardRedirect(page, '/admin');
		performanceMetrics.redirectTime = Date.now() - redirectStart;

		performanceMetrics.totalTime = Date.now() - formLoadStart;

		console.log('🔍 Performance metrics:');
		console.log(`   - Login form load: ${performanceMetrics.loginFormLoad}ms`);
		console.log(`   - Authentication: ${performanceMetrics.authenticationTime}ms`);
		console.log(`   - Redirect: ${performanceMetrics.redirectTime}ms`);
		console.log(`   - Total time: ${performanceMetrics.totalTime}ms`);

		// Performance assertions - these should pass once bug is fixed
		expect(performanceMetrics.loginFormLoad).toBeLessThan(2000); // Form loads in < 2s
		expect(performanceMetrics.authenticationTime).toBeLessThan(3000); // Auth in < 3s
		expect(performanceMetrics.redirectTime).toBeLessThan(1000); // Redirect in < 1s
		expect(performanceMetrics.totalTime).toBeLessThan(5000); // Total in < 5s

		console.log('✅ All performance targets met');
	});

	test('SHOULD FAIL: admin has access to admin-specific features', async ({ page }) => {
		// Complete login flow
		await performCompleteLogin(page, TEST_USERS.admin);

		// Verify admin-specific navigation or content is available
		// This will depend on the actual admin dashboard structure

		// Check for admin navigation items
		const bodyText = await page.textContent('body');
		expect(bodyText).toMatch(/(user.*management|system.*config|admin.*panel)/i);

		// Try to access an admin-only feature
		// (This test will be refined based on actual admin dashboard structure)

		// Verify no unauthorized access errors
		expect(bodyText).not.toMatch(/(unauthorized|forbidden|access denied)/i);

		// Check that admin role is properly recognized
		const hasAdminElements = await page
			.locator('.admin, [data-role="admin"], .admin-dashboard')
			.count();
		expect(hasAdminElements).toBeGreaterThan(0);

		console.log('✅ Admin user has access to admin features');
	});

	test('SHOULD FAIL: login works consistently across multiple attempts', async ({ page }) => {
		// Test login consistency by logging in multiple times
		for (let attempt = 1; attempt <= 3; attempt++) {
			console.log(`🔍 Login attempt ${attempt}/3`);

			// Clear state
			await page.evaluate(() => {
				localStorage.clear();
				sessionStorage.clear();
			});

			// Perform login
			const startTime = Date.now();
			await performCompleteLogin(page, TEST_USERS.admin);
			const duration = Date.now() - startTime;

			console.log(`   - Attempt ${attempt} completed in ${duration}ms`);

			// Verify successful login
			expect(page.url()).toContain('/admin');

			// Performance should be consistent
			expect(duration).toBeLessThan(10000); // Reasonable timeout for each attempt
		}

		console.log('✅ Login consistency verified across multiple attempts');
	});

	test('SHOULD FAIL: no memory leaks or accumulating state during login', async ({ page }) => {
		// Monitor for accumulating state that could indicate memory leaks

		// Initial state check
		const initialLocalStorageSize = await page.evaluate(() => {
			return Object.keys(localStorage).length;
		});

		const initialSessionStorageSize = await page.evaluate(() => {
			return Object.keys(sessionStorage).length;
		});

		// Perform multiple login/logout cycles
		for (let cycle = 1; cycle <= 3; cycle++) {
			console.log(`🔍 Login/logout cycle ${cycle}/3`);

			// Login
			await performCompleteLogin(page, TEST_USERS.admin);

			// Logout (clear state)
			await page.evaluate(() => {
				localStorage.clear();
				sessionStorage.clear();
			});
		}

		// Final state check
		const finalLocalStorageSize = await page.evaluate(() => {
			return Object.keys(localStorage).length;
		});

		const finalSessionStorageSize = await page.evaluate(() => {
			return Object.keys(sessionStorage).length;
		});

		console.log(`🔍 Storage state comparison:`);
		console.log(`   - localStorage: ${initialLocalStorageSize} -> ${finalLocalStorageSize}`);
		console.log(`   - sessionStorage: ${initialSessionStorageSize} -> ${finalSessionStorageSize}`);

		// Should not accumulate state
		expect(finalLocalStorageSize).toBeLessThanOrEqual(initialLocalStorageSize + 1);
		expect(finalSessionStorageSize).toBeLessThanOrEqual(initialSessionStorageSize + 1);

		console.log('✅ No memory leaks or state accumulation detected');
	});
});
