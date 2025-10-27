// Vitest Browser E2E Test Helper Utilities for SvelteHR
// Helper functions for E2E testing with Vitest Browser Mode and WebDriverIO
// Created: 2025-10-27

import { page } from '@vitest/browser/context';
import { expect } from 'vitest';

// Configuration
export const BROWSER_CONFIG = {
	BASE_URL: import.meta.env.BASE_URL || 'http://localhost:5174',
	DEFAULT_TIMEOUT: 10000,
	NAVIGATION_TIMEOUT: 30000,
	NETWORK_IDLE_TIMEOUT: 5000
} as const;

/**
 * Navigate to a page within the application
 *
 * @example
 * await gotoPage('/dashboard');
 */
export async function gotoPage(path: string, options?: { waitUntil?: 'load' | 'networkidle' }) {
	const url = path.startsWith('http') ? path : `${BROWSER_CONFIG.BASE_URL}${path}`;

	await page.goto(url);

	// Wait for page to be ready
	if (options?.waitUntil === 'networkidle') {
		// Wait for network to be idle
		await page.waitForLoadState('networkidle');
	} else {
		// Default: wait for load event
		await page.waitForLoadState('load');
	}
}

/**
 * Click an element by selector or text
 *
 * @example
 * await clickElement('[data-testid="submit-btn"]');
 * await clickElement('button:has-text("Submit")');
 */
export async function clickElement(selector: string) {
	const element = await page.locator(selector);
	await element.click();
}

/**
 * Fill an input field
 *
 * @example
 * await fillInput('[name="email"]', 'test@example.com');
 */
export async function fillInput(selector: string, value: string) {
	const element = await page.locator(selector);
	await element.fill(value);
}

/**
 * Select an option from a dropdown
 *
 * @example
 * await selectOption('[name="department"]', 'Engineering');
 */
export async function selectOption(selector: string, value: string) {
	const element = await page.locator(selector);
	await element.selectOption(value);
}

/**
 * Check if an element is visible
 *
 * @example
 * const isVisible = await isElementVisible('[data-testid="success-message"]');
 */
export async function isElementVisible(selector: string): Promise<boolean> {
	try {
		const element = await page.locator(selector);
		return await element.isVisible();
	} catch {
		return false;
	}
}

/**
 * Wait for an element to be visible
 *
 * @example
 * await waitForElement('[data-testid="dashboard-summary"]');
 */
export async function waitForElement(
	selector: string,
	options?: { timeout?: number; state?: 'visible' | 'hidden' }
) {
	const element = await page.locator(selector);
	await element.waitFor({
		state: options?.state || 'visible',
		timeout: options?.timeout || BROWSER_CONFIG.DEFAULT_TIMEOUT
	});
}

/**
 * Get text content of an element
 *
 * @example
 * const text = await getElementText('[data-testid="employee-count"]');
 */
export async function getElementText(selector: string): Promise<string> {
	const element = await page.locator(selector);
	const text = await element.textContent();
	return text || '';
}

/**
 * Get attribute value of an element
 *
 * @example
 * const href = await getElementAttribute('a.link', 'href');
 */
export async function getElementAttribute(selector: string, attribute: string): Promise<string> {
	const element = await page.locator(selector);
	const value = await element.getAttribute(attribute);
	return value || '';
}

/**
 * Count elements matching a selector
 *
 * @example
 * const count = await countElements('[data-testid="event-card"]');
 */
export async function countElements(selector: string): Promise<number> {
	const elements = await page.locator(selector);
	return await elements.count();
}

/**
 * Check if page contains text
 *
 * @example
 * const hasError = await pageContainsText('Error: Invalid credentials');
 */
export async function pageContainsText(text: string): Promise<boolean> {
	const bodyText = await page.locator('body').textContent();
	return bodyText?.includes(text) || false;
}

/**
 * Login helper - navigate to login and authenticate
 *
 * @example
 * await login('admin', 'admin');
 */
export async function login(username: string, password: string) {
	await gotoPage('/login');

	// Fill username
	await fillInput('input[name="username"]', username);

	// Fill password
	await fillInput('input[name="password"]', password);

	// Click submit
	await clickElement('button[type="submit"]');

	// Wait for redirect to dashboard
	await page.waitForURL('**/dashboard**', { timeout: BROWSER_CONFIG.NAVIGATION_TIMEOUT });
}

/**
 * Wait for network to be idle
 *
 * @example
 * await waitForNetworkIdle();
 */
export async function waitForNetworkIdle(timeout: number = BROWSER_CONFIG.NETWORK_IDLE_TIMEOUT) {
	await page.waitForLoadState('networkidle', { timeout });
}

/**
 * Take a screenshot (useful for debugging)
 *
 * @example
 * await takeScreenshot('dashboard-view');
 */
export async function takeScreenshot(name: string) {
	await page.screenshot({ path: `test-results/screenshots/${name}.png`, fullPage: true });
}

/**
 * Reload the current page
 *
 * @example
 * await reloadPage();
 */
export async function reloadPage() {
	await page.reload();
	await page.waitForLoadState('load');
}

/**
 * Wait for a specific amount of time
 *
 * @example
 * await waitFor(1000); // Wait 1 second
 */
export async function waitFor(ms: number) {
	await page.waitForTimeout(ms);
}

/**
 * Get all elements matching a selector
 *
 * @example
 * const cards = await getAllElements('[data-testid="event-card"]');
 */
export async function getAllElements(selector: string) {
	return await page.locator(selector).all();
}

/**
 * Check if element has a specific class
 *
 * @example
 * const isActive = await elementHasClass('[data-testid="tab"]', 'active');
 */
export async function elementHasClass(selector: string, className: string): Promise<boolean> {
	const element = await page.locator(selector);
	const classes = await element.getAttribute('class');
	return classes?.split(' ').includes(className) || false;
}

/**
 * Press a key
 *
 * @example
 * await pressKey('Enter');
 */
export async function pressKey(key: string) {
	await page.keyboard.press(key);
}

/**
 * Hover over an element
 *
 * @example
 * await hoverElement('[data-testid="dropdown-trigger"]');
 */
export async function hoverElement(selector: string) {
	const element = await page.locator(selector);
	await element.hover();
}

/**
 * Assertion helpers - make expectations more readable
 */

export async function expectElementVisible(selector: string) {
	const element = await page.locator(selector);
	await expect.element(element).toBeVisible();
}

export async function expectElementHidden(selector: string) {
	const element = await page.locator(selector);
	await expect.element(element).not.toBeVisible();
}

export async function expectElementToHaveText(selector: string, text: string) {
	const element = await page.locator(selector);
	await expect.element(element).toHaveText(text);
}

export async function expectElementToContainText(selector: string, text: string) {
	const element = await page.locator(selector);
	const content = await element.textContent();
	expect(content).toContain(text);
}

export async function expectElementCount(selector: string, expectedCount: number) {
	const count = await countElements(selector);
	expect(count).toBe(expectedCount);
}

/**
 * Form helpers
 */

export async function submitForm(formSelector: string) {
	const form = await page.locator(formSelector);
	await form.evaluate((f: HTMLFormElement) => f.submit());
}

export async function clearInput(selector: string) {
	const element = await page.locator(selector);
	await element.clear();
}

export async function checkCheckbox(selector: string) {
	const element = await page.locator(selector);
	if (!(await element.isChecked())) {
		await element.check();
	}
}

export async function uncheckCheckbox(selector: string) {
	const element = await page.locator(selector);
	if (await element.isChecked()) {
		await element.uncheck();
	}
}

/**
 * Extract numbers from text
 *
 * @example
 * const count = extractNumber('45 employees'); // Returns 45
 */
export function extractNumber(text: string): number {
	const match = text.match(/\d+/);
	return match ? parseInt(match[0], 10) : 0;
}

/**
 * Check if URL matches a pattern
 *
 * @example
 * await expectURLMatch('/dashboard');
 */
export async function expectURLMatch(pattern: string) {
	const url = page.url();
	const regex = new RegExp(pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*'));
	expect(url).toMatch(regex);
}

/**
 * Console log capture for debugging
 */

export interface ConsoleMessage {
	type: 'log' | 'warn' | 'error' | 'info';
	text: string;
}

export function captureConsole(): {
	logs: ConsoleMessage[];
	warnings: ConsoleMessage[];
	errors: ConsoleMessage[];
} {
	const logs: ConsoleMessage[] = [];
	const warnings: ConsoleMessage[] = [];
	const errors: ConsoleMessage[] = [];

	page.on('console', (msg) => {
		const message: ConsoleMessage = {
			type: msg.type() as ConsoleMessage['type'],
			text: msg.text()
		};

		if (msg.type() === 'error') {
			errors.push(message);
		} else if (msg.type() === 'warn') {
			warnings.push(message);
		} else {
			logs.push(message);
		}
	});

	return { logs, warnings, errors };
}

/**
 * Default export for convenience
 */
export default {
	gotoPage,
	clickElement,
	fillInput,
	selectOption,
	isElementVisible,
	waitForElement,
	getElementText,
	getElementAttribute,
	countElements,
	pageContainsText,
	login,
	waitForNetworkIdle,
	takeScreenshot,
	reloadPage,
	waitFor,
	getAllElements,
	elementHasClass,
	pressKey,
	hoverElement,
	expectElementVisible,
	expectElementHidden,
	expectElementToHaveText,
	expectElementToContainText,
	expectElementCount,
	submitForm,
	clearInput,
	checkCheckbox,
	uncheckCheckbox,
	extractNumber,
	expectURLMatch,
	captureConsole,
	BROWSER_CONFIG
};
