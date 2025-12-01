// Vitest Browser Environment Setup with Playwright
// Browser-based component testing configuration
// Created: 2025-09-24

import { beforeAll, afterEach } from 'vitest';
import { page } from '@vitest/browser/context';
import type { Page as PuppeteerPage } from 'puppeteer'; // Import Puppeteer's Page type

beforeAll(async () => {
	console.log('Setting up browser test environment...');

	// Configure browser for component testing
	if (page) {
		try {
			// Cast page to PuppeteerPage to access its methods
			const puppeteerPage = page as unknown as PuppeteerPage;

			// Set consistent viewport
			await puppeteerPage.setViewport({ width: 1280, height: 720 });

			// Set timezone
			await puppeteerPage.emulateTimezone('UTC');

			// Set locale
			await puppeteerPage.setExtraHTTPHeaders({
				'Accept-Language': 'en-US,en;q=0.9'
			});

			// Navigate to test page
			await puppeteerPage.goto('about:blank');
		} catch (error) {
			console.error('Failed to setup browser test environment:', error);
			console.error('Failed operation:', (error as Error).message);
			// Rethrow to fail the test suite fast
			throw new Error(`Browser setup failed: ${(error as Error).message}`);
		}
	}
});

afterEach(async () => {
	// Clean up browser state after each test
	if (page) {
		// Cast page to PuppeteerPage to access its methods
		const puppeteerPage = page as unknown as PuppeteerPage;

		// Clear local storage
		await puppeteerPage.evaluate(() => {
			localStorage.clear();
			sessionStorage.clear();
		});

		// Clear cookies
		const context = puppeteerPage.browserContext();
		await context.clearCookies();

		// Navigate to blank page
		await puppeteerPage.goto('about:blank');
	}
});