// Puppeteer E2E Test Helper Utilities for SvelteHR
// Helper functions for E2E testing with Puppeteer
// Created: 2025-10-27

import type { Browser, KeyInput, Page } from 'puppeteer';
import { expect } from 'vitest';

// Configuration
export const PUPPETEER_CONFIG = {
	BASE_URL: process.env.BASE_URL || 'http://localhost:5173',
	DEFAULT_TIMEOUT: 10000,
	NAVIGATION_TIMEOUT: 30000,
	NETWORK_IDLE_TIMEOUT: 5000
} as const;

// Global browser and page instances (set by setup file)
let globalBrowser: Browser | null = null;
let globalPage: Page | null = null;

export function setBrowser(browser: Browser) {
	globalBrowser = browser;
}

export function setPage(page: Page) {
	globalPage = page;
}

export function getBrowser(): Browser {
	if (!globalBrowser) {
		throw new Error('Browser not initialized. Make sure setup file ran correctly.');
	}
	return globalBrowser;
}

export function getPage(): Page {
	if (!globalPage) {
		throw new Error('Page not initialized. Make sure setup file ran correctly.');
	}
	return globalPage;
}

/**
 * Navigate to a page within the application
 */
export async function gotoPage(
	path: string,
	options?: { waitUntil?: 'load' | 'networkidle0' | 'networkidle2' }
) {
	const page = getPage();
	const url = path.startsWith('http') ? path : `${PUPPETEER_CONFIG.BASE_URL}${path}`;

	await page.goto(url, {
		waitUntil: options?.waitUntil || 'networkidle2',
		timeout: PUPPETEER_CONFIG.NAVIGATION_TIMEOUT
	});
}

/**
 * Reload the current page
 */
export async function reloadPage() {
	const page = getPage();
	await page.reload({ waitUntil: 'networkidle2' });
}

/**
 * Check if URL matches a pattern
 */
export async function expectURLMatch(pattern: string) {
	const page = getPage();
	const url = page.url();
	const regex = new RegExp(pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*'));
	expect(url).toMatch(regex);
}

/**
 * Click an element
 */
export async function clickElement(selector: string) {
	const page = getPage();
	await page.waitForSelector(selector, { timeout: PUPPETEER_CONFIG.DEFAULT_TIMEOUT });
	await page.click(selector);
}

/**
 * Fill an input field
 */
export async function fillInput(selector: string, value: string) {
	const page = getPage();
	await page.waitForSelector(selector, { timeout: PUPPETEER_CONFIG.DEFAULT_TIMEOUT });
	await page.type(selector, value);
}

/**
 * Clear an input field
 */
export async function clearInput(selector: string) {
	const page = getPage();
	await page.waitForSelector(selector, { timeout: PUPPETEER_CONFIG.DEFAULT_TIMEOUT });
	await page.$eval(selector, (el: any) => {
		el.value = '';
	});
}

/**
 * Select an option in a dropdown
 */
export async function selectOption(selector: string, value: string | { index: number }) {
	const page = getPage();
	await page.waitForSelector(selector, { timeout: PUPPETEER_CONFIG.DEFAULT_TIMEOUT });

	if (typeof value === 'string') {
		await page.select(selector, value);
	} else {
		const options = await page.$$eval(`${selector} option`, (opts: any[]) =>
			opts.map((o) => o.value)
		);
		await page.select(selector, options[value.index]);
	}
}

/**
 * Check a checkbox
 */
export async function checkCheckbox(selector: string) {
	const page = getPage();
	await page.waitForSelector(selector, { timeout: PUPPETEER_CONFIG.DEFAULT_TIMEOUT });
	const isChecked = await page.$eval(selector, (el: any) => el.checked);
	if (!isChecked) {
		await page.click(selector);
	}
}

/**
 * Uncheck a checkbox
 */
export async function uncheckCheckbox(selector: string) {
	const page = getPage();
	await page.waitForSelector(selector, { timeout: PUPPETEER_CONFIG.DEFAULT_TIMEOUT });
	const isChecked = await page.$eval(selector, (el: any) => el.checked);
	if (isChecked) {
		await page.click(selector);
	}
}

/**
 * Press a keyboard key
 */
export async function pressKey(key: KeyInput) {
	const page = getPage();
	await page.keyboard.press(key);
}

/**
 * Hover over an element
 */
export async function hoverElement(selector: string) {
	const page = getPage();
	await page.waitForSelector(selector, { timeout: PUPPETEER_CONFIG.DEFAULT_TIMEOUT });
	await page.hover(selector);
}

/**
 * Get text content of an element
 */
export async function getElementText(selector: string): Promise<string> {
	const page = getPage();
	await page.waitForSelector(selector, { timeout: PUPPETEER_CONFIG.DEFAULT_TIMEOUT });
	const text = await page.$eval(selector, (el) => el.textContent || '');
	return text.trim();
}

/**
 * Get attribute value of an element
 */
export async function getElementAttribute(selector: string, attribute: string): Promise<string> {
	const page = getPage();
	await page.waitForSelector(selector, { timeout: PUPPETEER_CONFIG.DEFAULT_TIMEOUT });
	const value = await page.$eval(selector, (el, attr) => el.getAttribute(attr), attribute);
	return value || '';
}

/**
 * Check if element is visible
 */
export async function isElementVisible(selector: string): Promise<boolean> {
	const page = getPage();
	try {
		await page.waitForSelector(selector, { visible: true, timeout: 1000 });
		return true;
	} catch {
		return false;
	}
}

/**
 * Count elements matching selector
 */
export async function countElements(selector: string): Promise<number> {
	const page = getPage();
	const elements = await page.$$(selector);
	return elements.length;
}

/**
 * Get all elements matching selector
 */
export async function getAllElements(selector: string) {
	const page = getPage();
	return await page.$$(selector);
}

/**
 * Check if element has a class
 */
export async function elementHasClass(selector: string, className: string): Promise<boolean> {
	const page = getPage();
	await page.waitForSelector(selector, { timeout: PUPPETEER_CONFIG.DEFAULT_TIMEOUT });
	const classes = await page.$eval(selector, (el) => el.className);
	return classes.split(' ').includes(className);
}

/**
 * Wait for an element to appear
 */
export async function waitForElement(
	selector: string,
	options?: { timeout?: number; state?: 'visible' | 'hidden' }
) {
	const page = getPage();
	const timeout = options?.timeout || PUPPETEER_CONFIG.DEFAULT_TIMEOUT;

	if (options?.state === 'hidden') {
		await page.waitForSelector(selector, { hidden: true, timeout });
	} else {
		await page.waitForSelector(selector, { visible: true, timeout });
	}
}

/**
 * Wait for network to be idle
 */
export async function waitForNetworkIdle(timeout: number = PUPPETEER_CONFIG.NETWORK_IDLE_TIMEOUT) {
	const page = getPage();
	await page.waitForNetworkIdle({ timeout });
}

/**
 * Wait for a specific duration
 */
export async function waitFor(ms: number) {
	await new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Expect element to be visible
 */
export async function expectElementVisible(selector: string) {
	const isVisible = await isElementVisible(selector);
	expect(isVisible).toBe(true);
}

/**
 * Expect element to be hidden
 */
export async function expectElementHidden(selector: string) {
	const isVisible = await isElementVisible(selector);
	expect(isVisible).toBe(false);
}

/**
 * Expect element to have specific text
 */
export async function expectElementToHaveText(selector: string, text: string) {
	const elementText = await getElementText(selector);
	expect(elementText).toBe(text);
}

/**
 * Expect element to contain text
 */
export async function expectElementToContainText(selector: string, text: string) {
	const elementText = await getElementText(selector);
	expect(elementText).toContain(text);
}

/**
 * Expect a specific count of elements
 */
export async function expectElementCount(selector: string, expectedCount: number) {
	const count = await countElements(selector);
	expect(count).toBe(expectedCount);
}

/**
 * Check if page contains text
 */
export async function pageContainsText(text: string): Promise<boolean> {
	const page = getPage();
	const bodyText = await page.$eval('body', (el) => el.textContent || '');
	return bodyText.includes(text);
}

/**
 * Extract number from text
 */
export function extractNumber(text: string): number {
	const match = text.match(/\d+/);
	return match ? parseInt(match[0], 10) : 0;
}

/**
 * Login to the application
 * Note: The login form uses EMAIL addresses, not usernames
 * This function ensures a valid authenticated session is established
 */
export async function login(email: string, password: string) {
	const page = getPage();

	// Navigate to login page
	await gotoPage('/login');

	// Wait for login form to load
	await waitForElement('[data-testid="login-form"]');

	// Check if there are any existing error messages and clear them
	const existingError = await isElementVisible('[data-testid="login-error-message"]');
	if (existingError) {
		console.log('Clearing existing error message');
	}

	// Fill in credentials using data-testid selectors
	await fillInput('[data-testid="login-username-input"]', email);
	await fillInput('[data-testid="login-password-input"]', password);

	// Set up navigation promise before clicking submit
	const navigationPromise = page
		.waitForNavigation({
			waitUntil: 'networkidle2',
			timeout: 15000
		})
		.catch(() => {
			// Navigation might have already completed, ignore error
			return null;
		});

	// Submit the form
	await clickElement('[data-testid="login-submit-button"]');

	// Wait for navigation to complete
	await navigationPromise;

	// Give the auth system time to set cookies and establish session
	await waitFor(2000);

	// Verify we're on the dashboard
	const currentUrl = page.url();
	if (!currentUrl.includes('/dashboard')) {
		// Check for error messages
		const hasError = await isElementVisible('[data-testid="login-error-message"]');
		if (hasError) {
			const errorText = await getElementText('[data-testid="login-error-message"]');
			throw new Error(`Login failed with error: ${errorText}`);
		}
		throw new Error(`Login failed - not redirected to dashboard. Current URL: ${currentUrl}`);
	}

	// Verify cookies are set
	const cookies = await page.cookies();
	const hasSessionCookie = cookies.some(
		(cookie) =>
			cookie.name.includes('session') ||
			cookie.name.includes('token') ||
			cookie.name.includes('auth') ||
			cookie.name === 'hr_token'
	);

	if (!hasSessionCookie) {
		console.warn(
			'Warning: No session cookie found after login. Cookies:',
			cookies.map((c) => c.name)
		);
	}

	// Wait for page to fully load and auth state to be initialized
	await waitFor(1000);

	console.log(`✓ Login successful as ${email}, current URL: ${currentUrl}`);
}

/**
 * Capture console messages
 */
export function captureConsole() {
	const page = getPage();
	const logs: any[] = [];
	const warnings: any[] = [];
	const errors: any[] = [];

	page.on('console', (msg) => {
		const type = msg.type();
		const text = msg.text();

		if (type === 'log') {
			logs.push({ type, text });
		} else if (type === 'warn') {
			warnings.push({ type, text });
		} else if (type === 'error') {
			errors.push({ type, text });
		}
	});

	return { logs, warnings, errors };
}

/**
 * Take a screenshot
 */
export async function takeScreenshot(name: string) {
	const page = getPage();
	await page.screenshot({
		path: `./test-results/screenshots/${name}.png`,
		fullPage: true
	});
}

/**
 * Retry configuration
 */
export interface RetryOptions {
	maxAttempts?: number;
	delayMs?: number;
	backoff?: boolean;
	onRetry?: (attempt: number, error: Error) => void;
}

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
	maxAttempts: 3,
	delayMs: 1000,
	backoff: true,
	onRetry: () => {}
};

/**
 * Retry a function with exponential backoff
 * Implements FR-019: Automatic retry logic (2-3 attempts)
 */
export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
	const config = { ...DEFAULT_RETRY_OPTIONS, ...options };
	let lastError: Error | null = null;

	for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
		try {
			return await fn();
		} catch (error) {
			lastError = error as Error;

			if (attempt < config.maxAttempts) {
				// Calculate delay with optional exponential backoff
				const delay = config.backoff ? config.delayMs * Math.pow(2, attempt - 1) : config.delayMs;

				config.onRetry(attempt, lastError);
				await waitFor(delay);
			}
		}
	}

	throw new Error(`Failed after ${config.maxAttempts} attempts. Last error: ${lastError?.message}`);
}

/**
 * Retry clicking an element
 */
export async function clickElementWithRetry(
	selector: string,
	options?: RetryOptions
): Promise<void> {
	return withRetry(async () => {
		await clickElement(selector);
	}, options);
}

/**
 * Retry filling an input
 */
export async function fillInputWithRetry(
	selector: string,
	value: string,
	options?: RetryOptions
): Promise<void> {
	return withRetry(async () => {
		await fillInput(selector, value);
	}, options);
}

/**
 * Retry waiting for an element
 */
export async function waitForElementWithRetry(
	selector: string,
	waitOptions?: { timeout?: number; state?: 'visible' | 'hidden' },
	retryOptions?: RetryOptions
): Promise<void> {
	return withRetry(async () => {
		await waitForElement(selector, waitOptions);
	}, retryOptions);
}

/**
 * Retry navigating to a page
 */
export async function gotoPageWithRetry(
	path: string,
	options?: { waitUntil?: 'load' | 'networkidle0' | 'networkidle2' },
	retryOptions?: RetryOptions
): Promise<void> {
	return withRetry(async () => {
		await gotoPage(path, options);
	}, retryOptions);
}

/**
 * Retry getting element text
 */
export async function getElementTextWithRetry(
	selector: string,
	options?: RetryOptions
): Promise<string> {
	return withRetry(async () => {
		return await getElementText(selector);
	}, options);
}

/**
 * Retry checking element visibility
 */
export async function isElementVisibleWithRetry(
	selector: string,
	options?: RetryOptions
): Promise<boolean> {
	return withRetry(async () => {
		return await isElementVisible(selector);
	}, options);
}
