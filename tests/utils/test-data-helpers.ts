// Test Data Helpers
// Utilities for working with test data from Rust backend seed system
// Provides helpers for accessing known test users, employees, events, etc.

import type { Page } from 'puppeteer';

/**
 * Known test users from Rust backend seed data
 * These are created by the seed-data binary
 *
 * NOTE: The Rust backend seed data creates users with randomly generated names.
 * The password for ALL seeded users is "admin123" (bcrypt hash in user_builder.rs line 21-22)
 * Email pattern: firstname.lastname@mountainhr.dev
 *
 * For E2E tests, you should query the database after seeding to get actual user emails,
 * or use the first few users created by role assignment.
 *
 * IMPORTANT: These are placeholder values. Actual test users will vary based on seed data execution.
 * Consider querying users by role instead of hardcoding email addresses.
 */
export const TEST_USERS = {
	systemAdmin: {
		email: 'admin@mountainhr.dev',
		password: 'admin123',
		role: 'system_admin',
		firstName: 'System',
		lastName: 'Admin'
	},
	hrAdmin: {
		email: 'hr@mountainhr.dev',
		password: 'admin123',
		role: 'hr_admin',
		firstName: 'HR',
		lastName: 'Admin'
	},
	manager: {
		email: 'manager@mountainhr.dev',
		password: 'admin123',
		role: 'manager',
		firstName: 'Department',
		lastName: 'Manager'
	},
	employee: {
		email: 'employee@mountainhr.dev',
		password: 'admin123',
		role: 'employee',
		firstName: 'Regular',
		lastName: 'Employee'
	}
} as const;

/**
 * Login helper for test users
 */
export async function loginAsUser(
	page: Page,
	userType: keyof typeof TEST_USERS,
	baseUrl: string = 'http://localhost:5173'
): Promise<void> {
	const user = TEST_USERS[userType];

	// Navigate to login page
	await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle0' });

	// Fill login form
	await page.type('[data-testid="login-username-input"]', user.email);
	await page.type('[data-testid="login-password-input"]', user.password);

	// Submit form
	await Promise.all([
		page.waitForNavigation({ waitUntil: 'networkidle0' }),
		page.click('[data-testid="login-submit-button"]')
	]);
}

/**
 * Logout helper
 */
export async function logout(page: Page): Promise<void> {
	await page.click('[data-testid="logout-button"]');
	await page.waitForNavigation({ waitUntil: 'networkidle0' });
}

/**
 * Wait for GraphQL request to complete
 */
export async function waitForGraphQLQuery(
	page: Page,
	operationName: string,
	timeout: number = 10000
): Promise<any> {
	return page.waitForResponse(
		(response) => {
			const url = response.url();
			return url.includes('/graphql') && response.request().postData()?.includes(operationName);
		},
		{ timeout }
	);
}

/**
 * Intercept and capture GraphQL requests
 */
export async function captureGraphQLRequests(page: Page): Promise<
	Array<{
		operation: string;
		variables: any;
		response: any;
		timestamp: number;
	}>
> {
	const requests: Array<{
		operation: string;
		variables: any;
		response: any;
		timestamp: number;
	}> = [];

	page.on('response', async (response) => {
		const url = response.url();
		if (url.includes('/graphql')) {
			try {
				const postData = response.request().postData();
				if (postData) {
					const requestBody = JSON.parse(postData);
					const responseBody = await response.json();

					requests.push({
						operation: requestBody.operationName || 'unknown',
						variables: requestBody.variables || {},
						response: responseBody,
						timestamp: Date.now()
					});
				}
			} catch (error) {
				// Ignore parsing errors
			}
		}
	});

	return requests;
}

/**
 * Wait for element to be visible and contain text
 */
export async function waitForTextContent(
	page: Page,
	selector: string,
	expectedText: string,
	timeout: number = 10000
): Promise<void> {
	await page.waitForFunction(
		(sel, text) => {
			const element = document.querySelector(sel);
			return element && element.textContent?.includes(text);
		},
		{ timeout },
		selector,
		expectedText
	);
}

/**
 * Wait for multiple elements to be present
 */
export async function waitForElements(
	page: Page,
	selector: string,
	minCount: number,
	timeout: number = 10000
): Promise<void> {
	await page.waitForFunction(
		(sel, count) => {
			const elements = document.querySelectorAll(sel);
			return elements.length >= count;
		},
		{ timeout },
		selector,
		minCount
	);
}

/**
 * Get text content from element
 */
export async function getTextContent(page: Page, selector: string): Promise<string> {
	const element = await page.waitForSelector(selector);
	if (!element) {
		throw new Error(`Element not found: ${selector}`);
	}
	return page.evaluate((el) => el.textContent || '', element);
}

/**
 * Get all text contents from elements
 */
export async function getAllTextContents(page: Page, selector: string): Promise<string[]> {
	await page.waitForSelector(selector);
	return page.$$eval(selector, (elements) => elements.map((el) => el.textContent || ''));
}

/**
 * Check if element exists
 */
export async function elementExists(page: Page, selector: string): Promise<boolean> {
	try {
		await page.waitForSelector(selector, { timeout: 1000 });
		return true;
	} catch {
		return false;
	}
}

/**
 * Wait for loading spinner to disappear
 */
export async function waitForLoadingComplete(
	page: Page,
	timeout: number = 10000
): Promise<void> {
	try {
		// Wait for loading spinner to appear (if it does)
		await page.waitForSelector('[data-testid="loading-spinner"]', { timeout: 1000 });
	} catch {
		// No spinner appeared, that's fine
	}

	// Wait for spinner to disappear
	try {
		await page.waitForSelector('[data-testid="loading-spinner"]', {
			hidden: true,
			timeout
		});
	} catch {
		// Spinner may not exist, that's fine
	}
}

/**
 * Take screenshot with timestamp
 */
export async function takeTimestampedScreenshot(
	page: Page,
	testName: string,
	status: 'passed' | 'failed'
): Promise<void> {
	const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
	const filename = `test-results/screenshots/${testName}-${status}-${timestamp}.png`;

	await page.screenshot({ path: filename, fullPage: true });
}

/**
 * Clear browser storage
 */
export async function clearBrowserStorage(page: Page): Promise<void> {
	await page.evaluate(() => {
		localStorage.clear();
		sessionStorage.clear();
	});

	// Clear cookies
	const client = await page.createCDPSession();
	await client.send('Network.clearBrowserCookies');
	await client.send('Network.clearBrowserCache');
}

/**
 * Wait for URL to match pattern
 */
export async function waitForURL(
	page: Page,
	urlPattern: string | RegExp,
	timeout: number = 10000
): Promise<void> {
	await page.waitForFunction(
		(pattern) => {
			if (typeof pattern === 'string') {
				return window.location.href.includes(pattern);
			} else {
				return new RegExp(pattern).test(window.location.href);
			}
		},
		{ timeout },
		urlPattern instanceof RegExp ? urlPattern.source : urlPattern
	);
}

/**
 * Get count of elements matching selector
 */
export async function getElementCount(page: Page, selector: string): Promise<number> {
	return page.$$eval(selector, (elements) => elements.length);
}

/**
 * Check if page has errors
 */
export async function hasPageErrors(page: Page): Promise<boolean> {
	const errorSelector = '[data-testid="error-boundary"], [data-testid="form-validation-error"]';
	return elementExists(page, errorSelector);
}

/**
 * Wait for console log message
 */
export function waitForConsoleLog(
	page: Page,
	messagePattern: string | RegExp,
	timeout: number = 5000
): Promise<string> {
	return new Promise((resolve, reject) => {
		const timeoutId = setTimeout(() => {
			reject(new Error(`Console log not found within ${timeout}ms: ${messagePattern}`));
		}, timeout);

		const handler = (msg: any) => {
			const text = msg.text();
			const matches =
				typeof messagePattern === 'string'
					? text.includes(messagePattern)
					: messagePattern.test(text);

			if (matches) {
				clearTimeout(timeoutId);
				page.off('console', handler);
				resolve(text);
			}
		};

		page.on('console', handler);
	});
}
