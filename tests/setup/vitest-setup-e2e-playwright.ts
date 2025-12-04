/**
 * Vitest Setup for Playwright E2E Tests
 * Configures Playwright for end-to-end testing
 */

import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { chromium, type Browser, type BrowserContext, type Page } from '@playwright/test';

// Global test state
let browser: Browser | null = null;
let context: BrowserContext | null = null;
let page: Page | null = null;

// Base URL from environment
const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

// Browser options
const BROWSER_OPTIONS = {
	headless: process.env.HEADED !== 'true'
};

// Context options for better security testing
const CONTEXT_OPTIONS = {
	viewport: { width: 1280, height: 720 },
	baseURL: BASE_URL,
	// Enable automatic artifact collection
	recordVideo: process.env.CI ? { dir: './test-results/videos' } : undefined,
	screenshot: 'only-on-failure' as const
};

// Setup browser before all tests
beforeAll(async () => {
	try {
		browser = await chromium.launch(BROWSER_OPTIONS);
		console.log('[Playwright E2E] Browser launched successfully');
	} catch (error) {
		console.error('[Playwright E2E] Failed to launch browser:', error);
		throw error;
	}
});

// Create fresh context before each test
beforeEach(async () => {
	if (!browser) {
		throw new Error('[Playwright E2E] Browser not initialized');
	}

	try {
		context = await browser.newContext(CONTEXT_OPTIONS);
		page = await context.newPage();

		// Expose page to tests via global
		(global as any).__page = page;
		(global as any).__context = context;
		(global as any).__browser = browser;

		console.log('[Playwright E2E] Fresh browser context created');
	} catch (error) {
		console.error('[Playwright E2E] Failed to create context:', error);
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
		console.log('[Playwright E2E] Context cleaned up');
	} catch (error) {
		console.error('[Playwright E2E] Cleanup error:', error);
	}
});

// Cleanup browser after all tests
afterAll(async () => {
	try {
		if (browser) {
			await browser.close();
			browser = null;
			console.log('[Playwright E2E] Browser closed');
		}
	} catch (error) {
		console.error('[Playwright E2E] Browser cleanup error:', error);
	}
});

// Export helper to get current page
export function getPage(): Page {
	if (!page) {
		throw new Error('[Playwright E2E] Page not initialized - ensure test is inside describe block');
	}
	return page;
}

// Export helper to navigate to page
export async function goto(path: string): Promise<void> {
	const currentPage = getPage();
	await currentPage.goto(path);
}
