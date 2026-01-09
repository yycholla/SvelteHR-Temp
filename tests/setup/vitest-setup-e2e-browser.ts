// Vitest E2E Browser Environment Setup with WebDriverIO
// E2E browser testing configuration (avoiding Playwright issues on Arch Linux)
// Created: 2025-10-27

import { afterAll, afterEach, beforeAll } from 'vitest';
import { page } from '@vitest/browser/context';
import type { Page as PuppeteerPage } from 'puppeteer'; // Import Puppeteer's Page type

let isSetupComplete = false;

beforeAll(async () => {
	console.log('Setting up E2E browser test environment with WebDriverIO...');

	// Configure browser for component testing
	if (page) {
		try {
			// Cast page to PuppeteerPage to access its methods
			const puppeteerPage = page as unknown as PuppeteerPage;

			// Example WebDriverIO usage (adjust as needed for actual WebDriverIO APIs)
			// These lines would typically involve WebDriverIO specific commands like:
			// await puppeteerPage.setWindowSize(1280, 720);
			// await puppeteerPage.setTimezone('UTC');
			// await puppeteerPage.navigateTo('about:blank');
		} catch (error) {
			console.error('Failed to setup E2E browser test environment:', error);
			// Rethrow to fail the test suite fast
			throw new Error(`E2E browser setup failed: ${(error as Error).message}`);
		}
	}

	// Mark setup as complete
	isSetupComplete = true;
	console.log('E2E browser test environment setup complete');
});

afterEach(async () => {
	// Clean up browser state after each test
	if (page && isSetupComplete) {
		try {
			// Cast page to PuppeteerPage to access its methods for evaluation
			const puppeteerPage = page as unknown as PuppeteerPage;

			// Clear local storage and session storage
			await puppeteerPage.evaluate(() => {
				localStorage.clear();
				sessionStorage.clear();
			});
		} catch (error) {
			console.warn('Error during E2E test cleanup:', error);
		}
	}
});

afterAll(async () => {
	console.log('Tearing down E2E browser test environment...');
	isSetupComplete = false;
});
