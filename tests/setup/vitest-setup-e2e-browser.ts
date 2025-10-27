// Vitest E2E Browser Environment Setup with WebDriverIO
// E2E browser testing configuration (avoiding Playwright issues on Arch Linux)
// Created: 2025-10-27

import { beforeAll, afterEach, afterAll } from 'vitest';
import { page } from '@vitest/browser/context';

let isSetupComplete = false;

beforeAll(async () => {
	console.log('Setting up E2E browser test environment with WebDriverIO...');

	// Mark setup as complete
	isSetupComplete = true;
	console.log('E2E browser test environment setup complete');
});

afterEach(async () => {
	// Clean up browser state after each test
	if (page && isSetupComplete) {
		try {
			// Clear local storage and session storage
			await page.evaluate(() => {
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
