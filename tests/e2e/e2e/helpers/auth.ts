import { Page, expect, BrowserContext } from '@playwright/test';

/**
 * Authentication helper utilities for Playwright tests
 * Used to test login flows, auth state, and redirect behavior
 */

export interface TestUser {
	email: string;
	password: string;
	role: string;
	roleLevel: number;
	expectedDashboard: string;
}

export const TEST_USERS = {
	admin: {
		email: 'admin@postgraphile-hr.com',
		password: 'admin123',
		role: 'hr_admin',
		roleLevel: 100,
		expectedDashboard: '/dashboard/admin'
	}
	// Add more test users as needed
	// employee: {
	//   email: 'employee@postgraphile-hr.com',
	//   password: 'employee123',
	//   role: 'employee',
	//   roleLevel: 20,
	//   expectedDashboard: '/dashboard'
	// }
} as const;

/**
 * Login helper that fills out the login form and submits it
 */
export async function login(page: Page, user: TestUser) {
	// Navigate to login page
	await page.goto('/login');

	// Wait for login form to be visible
	await expect(page.locator('form')).toBeVisible();

	// Fill out login form
	await page.fill('input[type="email"], input[name="email"]', user.email);
	await page.fill('input[type="password"], input[name="password"]', user.password);

	// Submit the form
	await page.click('button[type="submit"], button:has-text("Sign In")');
}

/**
 * Wait for and verify successful authentication
 */
export async function waitForAuthentication(page: Page, timeoutMs: number = 10000) {
	// Wait for JWT token to be stored in localStorage
	await page.waitForFunction(
		() => {
			const token = localStorage.getItem('postgraphile-jwt-token');
			return token && token.length > 0;
		},
		{ timeout: timeoutMs }
	);

	// Verify token exists and is valid format (basic check)
	const token = await page.evaluate(() => localStorage.getItem('postgraphile-jwt-token'));
	expect(token).toBeTruthy();
	expect(token).toMatch(/^[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+$/); // JWT format
}

/**
 * Check if user is on the expected dashboard page
 */
export async function verifyDashboardRedirect(
	page: Page,
	expectedPath: string,
	timeoutMs: number = 10000
) {
	await page.waitForURL(expectedPath, { timeout: timeoutMs });
	expect(page.url()).toContain(expectedPath);
}

/**
 * Clear authentication state (logout)
 */
export async function clearAuth(page: Page) {
	await page.evaluate(() => {
		localStorage.removeItem('postgraphile-jwt-token');
		// Clear any session storage flags
		Object.keys(sessionStorage).forEach((key) => {
			if (key.includes('hr_')) {
				sessionStorage.removeItem(key);
			}
		});
	});
}

/**
 * Set up authenticated state without going through login flow
 * Useful for tests that need to start with authenticated state
 */
export async function setupAuthenticatedState(page: Page, user: TestUser) {
	// First, login to get a real token
	await login(page, user);
	await waitForAuthentication(page);

	// Store the token for reuse
	const token = await page.evaluate(() => localStorage.getItem('postgraphile-jwt-token'));

	return token;
}

/**
 * Restore authenticated state from a saved token
 */
export async function restoreAuthenticatedState(page: Page, token: string) {
	await page.evaluate((savedToken) => {
		localStorage.setItem('postgraphile-jwt-token', savedToken);
	}, token);
}

/**
 * Monitor console logs for authentication-related messages
 */
export async function setupAuthLogging(page: Page) {
	const authLogs: string[] = [];

	page.on('console', (msg) => {
		const text = msg.text();
		if (
			text.includes('validateSession') ||
			text.includes('AuthGuard') ||
			text.includes('Admin layout') ||
			text.includes('Auth state')
		) {
			authLogs.push(`${msg.type()}: ${text}`);
		}
	});

	return authLogs;
}

/**
 * Wait for auth state to stabilize (no more validation calls)
 */
export async function waitForAuthStabilization(page: Page, timeoutMs: number = 5000) {
	let lastLogCount = 0;
	let stableCount = 0;
	const maxStableChecks = 10; // Check 10 times over 1 second

	for (let i = 0; i < maxStableChecks; i++) {
		await page.waitForTimeout(100); // Wait 100ms between checks

		// Count console messages related to auth
		const currentLogCount = await page.evaluate(() => {
			return (window as any).__authLogCount || 0;
		});

		if (currentLogCount === lastLogCount) {
			stableCount++;
			if (stableCount >= 3) {
				// 3 consecutive stable checks
				return true;
			}
		} else {
			stableCount = 0;
			lastLogCount = currentLogCount;
		}
	}

	return false; // Not stabilized within timeout
}

/**
 * Check for redirect loops by monitoring URL changes
 */
export async function detectRedirectLoop(page: Page, timeoutMs: number = 5000) {
	const urlHistory: { url: string; timestamp: number }[] = [];
	let redirectCount = 0;

	page.on('framenavigated', () => {
		const now = Date.now();
		const currentUrl = page.url();

		urlHistory.push({ url: currentUrl, timestamp: now });

		// Check for rapid redirects (more than 5 in 2 seconds)
		const recentUrls = urlHistory.filter((entry) => now - entry.timestamp < 2000);
		if (recentUrls.length > 5) {
			redirectCount = recentUrls.length;
		}
	});

	// Wait for the specified timeout
	await page.waitForTimeout(timeoutMs);

	return {
		hasLoop: redirectCount > 5,
		redirectCount,
		urlHistory: urlHistory.slice(-10) // Last 10 URLs
	};
}

/**
 * Verify auth state matches expected values
 */
export async function verifyAuthState(
	page: Page,
	expectedState: {
		isAuthenticated: boolean;
		hasUser: boolean;
		userRole?: string;
	}
) {
	const authState = await page.evaluate(() => {
		// This assumes the auth store is accessible globally for testing
		// In practice, we might need to navigate to a page that exposes this
		return {
			hasToken: !!localStorage.getItem('postgraphile-jwt-token')
			// These would need to be accessible via the app's testing interface
			// isAuthenticated: window.__authState?.isAuthenticated,
			// user: window.__authState?.user
		};
	});

	if (expectedState.isAuthenticated) {
		expect(authState.hasToken).toBe(true);
	} else {
		expect(authState.hasToken).toBe(false);
	}
}

/**
 * Test helper to perform a complete login flow and verify success
 */
export async function performCompleteLogin(page: Page, user: TestUser = TEST_USERS.admin) {
	// Start auth logging
	const authLogs = await setupAuthLogging(page);

	// Perform login
	await login(page, user);

	// Wait for authentication to complete
	await waitForAuthentication(page);

	// Verify redirect to expected dashboard
	await verifyDashboardRedirect(page, user.expectedDashboard);

	// Wait for auth state to stabilize
	const isStable = await waitForAuthStabilization(page);

	return {
		success: true,
		authLogs,
		isStable,
		finalUrl: page.url()
	};
}
