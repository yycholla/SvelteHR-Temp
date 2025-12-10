/**
 * Vitest Setup for Security Tests
 * Configures environment for security-focused test suites
 */

import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest';
import puppeteer, { type Browser, type BrowserContext, type Page } from 'puppeteer';

// Global test state
let browser: Browser | null = null;
let context: BrowserContext | null = null;
let page: Page | null = null;

// Browser configuration for security tests
const BROWSER_OPTIONS = {
	headless: process.env.HEADED !== 'true',
	args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
};

// Setup browser before all security tests
beforeAll(async () => {
	try {
		browser = await puppeteer.launch(BROWSER_OPTIONS);
		console.log('[Security Tests] Browser launched successfully');
	} catch (error) {
		console.error('[Security Tests] Failed to launch browser:', error);
		throw error;
	}
});

// Create fresh context before each test
beforeEach(async () => {
	if (!browser) {
		throw new Error('[Security Tests] Browser not initialized');
	}

	try {
		context = await browser.createBrowserContext();
		page = await context.newPage();

		// Set default viewport
		await page.setViewport({ width: 1280, height: 720 });

		// Expose page to tests via global
		(global as any).__page = page;
		(global as any).__context = context;

		console.log('[Security Tests] Fresh browser context created');
	} catch (error) {
		console.error('[Security Tests] Failed to create context:', error);
		throw error;
	}
});

// Clean up after each test
afterEach(async () => {
	try {
		if (page) {
			await page.close();
			page = null;
		}
		if (context) {
			await context.close();
			context = null;
		}
		console.log('[Security Tests] Context cleaned up');
	} catch (error) {
		console.error('[Security Tests] Cleanup error:', error);
	}
});

// Cleanup browser after all tests
afterAll(async () => {
	try {
		if (browser) {
			await browser.close();
			browser = null;
			console.log('[Security Tests] Browser closed');
		}
	} catch (error) {
		console.error('[Security Tests] Browser cleanup error:', error);
	}
});

// Export helper to get current page
export function getPage(): Page {
	if (!page) {
		throw new Error('[Security Tests] Page not initialized - ensure test is inside describe block');
	}
	return page;
}

// Export helper to navigate to page
export async function gotoPage(path: string): Promise<void> {
	const currentPage = getPage();
	const baseUrl = process.env.BASE_URL || 'http://localhost:5173';
	const url = `${baseUrl}${path}`;
	await currentPage.goto(url, { waitUntil: 'networkidle2' });
}

// Export helper to login
export async function login(email: string, password: string): Promise<void> {
	const currentPage = getPage();
	await gotoPage('/login');

	// Wait for login form
	await currentPage.waitForSelector('[data-testid="login-form"]');

	// Fill in credentials
	await currentPage.type('[data-testid="login-username-input"]', email);
	await currentPage.type('[data-testid="login-password-input"]', password);

	// Submit form
	await currentPage.click('[data-testid="login-submit-button"]');

	// Wait for navigation
	await currentPage.waitForNavigation({ waitUntil: 'networkidle2' });
}
