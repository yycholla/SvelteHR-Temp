// Vitest Browser Environment Setup with Playwright
// Browser-based component testing configuration
// Created: 2025-09-24

import { afterEach, beforeAll } from 'vitest';
import { page } from '@vitest/browser/context';
import type { BrowserContext, Page as PlaywrightPage } from '@playwright/test';

beforeAll(async () => {
	console.log('Setting up browser test environment...');

	// Configure browser for component testing
	if (page) {
		try {
			// Cast page to PlaywrightPage to access its methods
			const playwrightPage = page as unknown as PlaywrightPage;

			// Set consistent viewport
			await playwrightPage.setViewportSize({ width: 1280, height: 720 });

			// Set timezone
			// await playwrightPage.emulateTimezone('UTC'); // Not directly available on Playwright Page

			// Set locale
			await playwrightPage.setExtraHTTPHeaders({
				'Accept-Language': 'en-US,en;q=0.9'
			});

			await playwrightPage.goto('about:blank');
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
		// Cast page to PlaywrightPage to access its methods
		const playwrightPage = page as unknown as PlaywrightPage;

		// Clear local storage
		await playwrightPage.evaluate(() => {
			localStorage.clear();
			sessionStorage.clear();
		});

		// Clear cookies
		await playwrightPage.context().clearCookies();

		// Navigate to blank page
		await playwrightPage.goto('about:blank');
	}
});
